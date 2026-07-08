import { createId } from "./ids.js";
import type { Clip, ClipMood, EditDecision, Platform, PromptIntent, PromptRun, TrimIntent } from "./types.js";

const platformSignals: Array<[Platform, string[]]> = [
  ["shorts", ["short", "shorts", "tiktok", "viral"]],
  ["reels", ["reel", "reels", "instagram"]],
  ["youtube", ["youtube", "long", "episode"]],
  ["linkedin", ["linkedin", "founder", "launch", "demo"]],
  ["cinematic", ["cinematic", "film", "story"]]
];

const toneSignals: Array<[ClipMood, string[]]> = [
  ["urgent", ["urgent", "fast", "sharp", "punchy", "deadline"]],
  ["cinematic", ["cinematic", "film", "dramatic", "moody"]],
  ["quiet", ["quiet", "calm", "soft", "reflective"]],
  ["playful", ["playful", "fun", "bright", "creator"]],
  ["focused", ["clean", "precise", "technical", "product"]],
  ["warm", ["warm", "human", "emotional", "founder"]],
  ["raw", ["raw", "unedited", "honest"]]
];

export function planPrompt(prompt: string, clips: Clip[]) {
  const trimIntent = inferTrimIntent(prompt);
  return createPromptRun(prompt, clips, trimIntent, "heuristic");
}

export function createPromptRun(
  prompt: string,
  clips: Clip[],
  trimIntent: TrimIntent,
  planner: PromptRun["planner"],
  plannerNote?: string
) {
  const intent = promptIntentFromTrimIntent(trimIntent);
  const selected = selectClips(clips, intent);
  const runId = createId("run", prompt);
  const decisions = createDecisions(runId, prompt, trimIntent, selected);
  const run: PromptRun = {
    id: runId,
    prompt,
    createdAt: new Date().toISOString(),
    planner,
    plannerNote,
    trimIntent,
    intent,
    decisions
  };
  return run;
}

export function inferTrimIntent(prompt: string): TrimIntent {
  const intent = inferIntent(prompt);
  return trimIntentFromPromptIntent(prompt, intent);
}

export function inferIntent(prompt: string): PromptIntent {
  const text = prompt.toLowerCase();
  const platform = findSignal(text, platformSignals) ?? "reels";
  const tone = findSignal(text, toneSignals) ?? "focused";
  const targetSeconds = inferTargetSeconds(text, platform);
  return {
    platform,
    aspectRatio: inferAspectRatio(text, platform),
    pace: inferPace(text),
    tone,
    targetSeconds,
    wantsCaptions: /\b(caption|captions|subtitle|subtitles|text)\b/.test(text),
    wantsMusic: /\b(music|beat|sound|audio|score)\b/.test(text),
    wantsColorGrade: /\b(color|grade|cinematic|warm|contrast|film)\b/.test(text)
  };
}

function findSignal<T extends string>(text: string, signals: Array<[T, string[]]>) {
  const matches = signals
    .map(([value, words]) => ({
      value,
      score: words.filter((word) => text.includes(word)).length
    }))
    .filter((match) => match.score > 0)
    .sort((left, right) => right.score - left.score);
  return matches[0]?.value;
}

function inferTargetSeconds(text: string, platform: Platform) {
  const seconds = text.match(/\b(\d{1,3})\s?(s|sec|second|seconds)\b/);
  if (seconds) {
    return clamp(Number(seconds[1]), 5, 600);
  }
  if (platform === "youtube") {
    return 180;
  }
  if (platform === "linkedin") {
    return 75;
  }
  if (platform === "cinematic") {
    return 60;
  }
  return 30;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function inferAspectRatio(text: string, platform: Platform) {
  if (text.includes("16:9") || platform === "youtube" || platform === "cinematic") {
    return "16:9";
  }
  if (text.includes("1:1") || text.includes("square")) {
    return "1:1";
  }
  if (text.includes("4:5")) {
    return "4:5";
  }
  return "9:16";
}

function inferPace(text: string): PromptIntent["pace"] {
  if (/\b(fast|snappy|punchy|viral|tight)\b/.test(text)) {
    return "cut fast";
  }
  if (/\b(slow|calm|quiet|patient|cinematic)\b/.test(text)) {
    return "slow burn";
  }
  return "steady";
}

function selectClips(clips: Clip[], intent: PromptIntent) {
  const roleWeight = new Map([
    ["hook", 6],
    ["proof", 5],
    ["texture", 4],
    ["broll", 3],
    ["cta", 2]
  ]);
  return [...clips]
    .sort((left, right) => scoreClip(right, intent, roleWeight) - scoreClip(left, intent, roleWeight))
    .slice(0, Math.max(3, Math.min(6, clips.length)));
}

function scoreClip(clip: Clip, intent: PromptIntent, roleWeight: Map<string, number>) {
  const roleScore = roleWeight.get(clip.role) ?? 1;
  const moodScore = clip.mood === intent.tone ? 3 : 0;
  const durationScore = clip.duration <= intent.targetSeconds ? 2 : 0;
  return roleScore + moodScore + durationScore;
}

function createDecisions(runId: string, prompt: string, trimIntent: TrimIntent, clips: Clip[]) {
  const intent = promptIntentFromTrimIntent(trimIntent);
  const clipIds = clips.map((clip) => clip.id);
  const decisions: EditDecision[] = [
    decision(runId, 1, "intent", "Resolve trimming intent", trimIntent.objective, clipIds, {
      preserve: trimIntent.preserve,
      remove: trimIntent.remove,
      priorities: trimIntent.semanticPriorities,
      operations: trimIntent.operations,
      directives: trimIntent.customDirectives
    }),
    decision(runId, 2, "arrange", "Build a visible reasoning arc", "Open with the clearest hook, move through proof, then land on a direct next step.", clipIds, {
      order: arrangeClipIds(clips),
      prompt
    }),
    decision(runId, 3, "trim", "Compress around useful motion", "Remove setup lag and keep only the beats that change viewer belief.", clipIds, {
      targetSeconds: intent.targetSeconds,
      maxSilenceMs: intent.pace === "cut fast" ? 280 : 520,
      preserve: trimIntent.preserve,
      remove: trimIntent.remove
    }),
    decision(runId, 4, "pace", `Set pacing to ${intent.pace}`, "Match cut density to platform attention without flattening the idea.", clipIds, {
      pace: intent.pace,
      averageShotSeconds: intent.pace === "cut fast" ? 1.8 : intent.pace === "steady" ? 3.4 : 5.2
    }),
    decision(runId, 5, "export", `Prepare ${intent.platform} delivery`, "Make the output ready for the channel instead of leaving it as a generic sequence.", clipIds, {
      platform: intent.platform,
      aspectRatio: intent.aspectRatio
    })
  ];
  if (intent.wantsCaptions) {
    decisions.splice(4, 0, decision(runId, 6, "caption", "Add sparse semantic captions", "Caption the argument, not every filler word.", clipIds, {
      style: "high contrast lower third",
      maxWordsPerLine: 7
    }));
  }
  if (intent.wantsMusic) {
    decisions.splice(4, 0, decision(runId, 7, "audio", "Place a restrained music bed", "Use audio as momentum while preserving speech clarity.", clipIds, {
      duckingDb: -14,
      bed: intent.tone
    }));
  }
  if (intent.wantsColorGrade) {
    decisions.splice(4, 0, decision(runId, 8, "grade", "Apply a controlled color pass", "Give the video a finished signal without hiding source texture.", clipIds, {
      contrast: intent.tone === "cinematic" ? "medium high" : "medium",
      temperature: intent.tone === "warm" ? "warm" : "neutral"
    }));
  }
  return decisions.map((item, index) => ({
    ...item,
    id: `${runId}-${String(index + 1).padStart(2, "0")}`
  }));
}

function arrangeClipIds(clips: Clip[]) {
  const rank = new Map([
    ["hook", 1],
    ["proof", 2],
    ["texture", 3],
    ["broll", 4],
    ["cta", 5]
  ]);
  return [...clips].sort((left, right) => (rank.get(left.role) ?? 9) - (rank.get(right.role) ?? 9)).map((clip) => clip.id);
}

function decision(
  runId: string,
  order: number,
  kind: EditDecision["kind"],
  title: string,
  reason: string,
  clipIds: string[],
  payload: Record<string, string | number | boolean | string[]>
) {
  return {
    id: `${runId}-${String(order).padStart(2, "0")}`,
    kind,
    title,
    reason,
    clipIds,
    payload
  };
}

export function trimIntentFromPromptIntent(prompt: string, intent: PromptIntent): TrimIntent {
  const lower = prompt.toLowerCase();
  return {
    objective: objectiveFromPrompt(prompt),
    platform: intent.platform,
    aspectRatio: intent.aspectRatio,
    pace: intent.pace,
    tone: intent.tone,
    targetSeconds: intent.targetSeconds,
    preserve: extractList(lower, ["keep", "preserve", "retain", "include"]),
    remove: extractList(lower, ["remove", "cut", "drop", "skip", "avoid"]),
    semanticPriorities: inferPriorities(lower),
    operations: inferOperations(lower),
    customDirectives: inferCustomDirectives(prompt),
    confidence: 0.68
  };
}

export function promptIntentFromTrimIntent(trimIntent: TrimIntent): PromptIntent {
  return {
    platform: trimIntent.platform,
    aspectRatio: trimIntent.aspectRatio,
    pace: trimIntent.pace,
    tone: trimIntent.tone,
    targetSeconds: trimIntent.targetSeconds,
    wantsCaptions: trimIntent.operations.includes("captions"),
    wantsMusic: trimIntent.operations.includes("music"),
    wantsColorGrade: trimIntent.operations.includes("color grade")
  };
}

function objectiveFromPrompt(prompt: string) {
  const trimmed = prompt.trim();
  if (!trimmed) {
    return "Produce the closest useful trim from available footage.";
  }
  return `Produce the closest possible edit for: ${trimmed}`;
}

function extractList(text: string, verbs: string[]) {
  const results = verbs.flatMap((verb) => {
    const pattern = new RegExp(`\\b${verb}\\b\\s+([^.,;]+)`, "g");
    return [...text.matchAll(pattern)].map((match) => match[1]?.trim() ?? "");
  });
  return unique(results.filter(Boolean)).slice(0, 6);
}

function inferPriorities(text: string) {
  const priorities: Array<[string, string[]]> = [
    ["hook", ["hook", "opening", "first", "start"]],
    ["proof", ["proof", "evidence", "before and after", "demo", "workflow"]],
    ["emotion", ["human", "warm", "creator", "story", "reaction"]],
    ["clarity", ["clear", "precise", "technical", "explain", "walkthrough"]],
    ["conversion", ["cta", "ad", "sales", "launch", "try"]]
  ];
  return unique(priorities.filter(([, words]) => words.some((word) => text.includes(word))).map(([name]) => name));
}

function inferOperations(text: string) {
  const operations: Array<[string, string[]]> = [
    ["captions", ["caption", "captions", "subtitle", "subtitles", "text"]],
    ["music", ["music", "beat", "audio", "sound", "score"]],
    ["color grade", ["color", "grade", "film", "contrast", "warm"]],
    ["tight trim", ["trim", "tight", "cut down", "compress"]],
    ["story reorder", ["story", "arc", "before and after", "proof before"]]
  ];
  return unique(operations.filter(([, words]) => words.some((word) => text.includes(word))).map(([name]) => name));
}

function inferCustomDirectives(prompt: string) {
  const clauses = prompt
    .split(/\b(?:with|for|that|while|but|and)\b/i)
    .map((part) => part.trim())
    .filter((part) => part.length > 12);
  return unique(clauses).slice(0, 6);
}

function unique(values: string[]) {
  return [...new Set(values)];
}
