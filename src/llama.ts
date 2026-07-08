import { createPromptRun, inferTrimIntent, trimIntentFromPromptIntent } from "./planner.js";
import type { AspectRatio, Clip, ClipMood, Platform, PromptIntent, PromptRun, TrimIntent } from "./types.js";

type RuntimeEnv = Record<string, string | undefined>;

type LlamaChatOutput = {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
};

type LlamaCompletionOutput = {
  content?: string;
};

const platforms = new Set<Platform>(["shorts", "reels", "youtube", "linkedin", "cinematic"]);
const aspects = new Set<AspectRatio>(["9:16", "16:9", "1:1", "4:5"]);
const paces = new Set<PromptIntent["pace"]>(["cut fast", "steady", "slow burn"]);
const tones = new Set<ClipMood>(["raw", "warm", "urgent", "cinematic", "quiet", "playful", "focused"]);

export async function planPromptWithLlama(prompt: string, clips: Clip[], env: RuntimeEnv): Promise<PromptRun> {
  try {
    const trimIntent = await interpretPromptWithLlama(prompt, clips, env);
    return createPromptRun(prompt, clips, trimIntent, "llama.cpp", `Server: ${llamaBaseUrl(env)}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : "llama.cpp planner failed";
    return createPromptRun(prompt, clips, inferTrimIntent(prompt), "heuristic", `llama.cpp fallback: ${message}`);
  }
}

export async function checkLlama(env: RuntimeEnv) {
  const response = await fetch(`${llamaBaseUrl(env)}/v1/models`, {
    signal: AbortSignal.timeout(1200)
  });
  if (!response.ok) {
    throw new Error(`llama.cpp status failed with ${response.status}`);
  }
  return response.json() as Promise<unknown>;
}

async function interpretPromptWithLlama(prompt: string, clips: Clip[], env: RuntimeEnv) {
  const fallback = inferTrimIntent(prompt);
  const response = await fetch(`${llamaBaseUrl(env)}/completion`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    signal: AbortSignal.timeout(Number(env.LLAMA_CPP_TIMEOUT_MS ?? 5000)),
    body: JSON.stringify({
      prompt: createCompletionPrompt(prompt, clips, fallback),
      temperature: 0.15,
      n_predict: Number(env.LLAMA_CPP_MAX_TOKENS ?? 180),
      stop: ["\n\n"]
    })
  });
  if (!response.ok) {
    throw new Error(`llama.cpp request failed with ${response.status}`);
  }
  const data = (await response.json()) as LlamaCompletionOutput;
  return normalizeTrimIntent(extractJson(data), fallback);
}

function createCompletionPrompt(prompt: string, clips: Clip[], fallback: TrimIntent) {
  return [
    "Return only minified JSON for a video trim intent.",
    "Keys: objective, platform, aspectRatio, pace, tone, targetSeconds, preserve, remove, semanticPriorities, operations, customDirectives, confidence.",
    "Allowed platform: shorts, reels, youtube, linkedin, cinematic.",
    "Allowed aspectRatio: 9:16, 16:9, 1:1, 4:5.",
    "Allowed pace: cut fast, steady, slow burn.",
    "Allowed tone: raw, warm, urgent, cinematic, quiet, playful, focused.",
    `Prompt: ${prompt}`,
    `Clips: ${JSON.stringify(clips.map((clip) => ({ label: clip.label, role: clip.role, mood: clip.mood, duration: clip.duration })))}`,
    `Fallback: ${JSON.stringify(fallback)}`,
    "JSON:"
  ].join("\n");
}

function extractJson(data: LlamaCompletionOutput | LlamaChatOutput) {
  const text = isCompletionOutput(data) ? data.content ?? "" : data.choices?.[0]?.message?.content ?? "";
  const trimmed = text.trim();
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start < 0 || end < start) {
    throw new Error("llama.cpp response did not contain JSON");
  }
  return JSON.parse(trimmed.slice(start, end + 1)) as Partial<TrimIntent>;
}

function isCompletionOutput(data: LlamaCompletionOutput | LlamaChatOutput): data is LlamaCompletionOutput {
  return Object.prototype.hasOwnProperty.call(data, "content");
}

function normalizeTrimIntent(value: Partial<TrimIntent>, fallback: TrimIntent): TrimIntent {
  const partialIntent: PromptIntent = {
    platform: pick(value.platform, platforms, fallback.platform),
    aspectRatio: pick(value.aspectRatio, aspects, fallback.aspectRatio),
    pace: pick(value.pace, paces, fallback.pace),
    tone: pick(value.tone, tones, fallback.tone),
    targetSeconds: normalizeSeconds(value.targetSeconds, fallback.targetSeconds),
    wantsCaptions: normalizeList(value.operations).includes("captions"),
    wantsMusic: normalizeList(value.operations).includes("music"),
    wantsColorGrade: normalizeList(value.operations).includes("color grade")
  };
  const base = trimIntentFromPromptIntent(typeof value.objective === "string" ? value.objective : fallback.objective, partialIntent);
  return {
    ...base,
    objective: typeof value.objective === "string" && value.objective.trim() ? value.objective.trim() : fallback.objective,
    preserve: chooseList(value.preserve, fallback.preserve),
    remove: chooseList(value.remove, fallback.remove),
    semanticPriorities: chooseList(value.semanticPriorities, fallback.semanticPriorities),
    operations: chooseList(value.operations, fallback.operations),
    customDirectives: chooseList(value.customDirectives, fallback.customDirectives),
    confidence: normalizeConfidence(value.confidence, fallback.confidence)
  };
}

function llamaBaseUrl(env: RuntimeEnv) {
  const raw = env.LLAMA_CPP_URL || "http://127.0.0.1:8080";
  return raw.replace(/\/v1\/chat\/completions\/?$/, "").replace(/\/$/, "");
}

function pick<T extends string>(value: unknown, allowed: Set<T>, fallback: T) {
  return typeof value === "string" && allowed.has(value as T) ? (value as T) : fallback;
}

function chooseList(value: unknown, fallback: string[]) {
  const normalized = normalizeList(value);
  return normalized.length ? normalized : fallback;
}

function normalizeList(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }
  return [...new Set(value.filter((item): item is string => typeof item === "string").map((item) => item.trim()).filter(Boolean))].slice(0, 8);
}

function normalizeSeconds(value: unknown, fallback: number) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return fallback;
  }
  return Math.min(600, Math.max(5, Math.round(value)));
}

function normalizeConfidence(value: unknown, fallback: number) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return fallback;
  }
  return Math.min(1, Math.max(0, value));
}
