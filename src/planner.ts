import { createId } from "./ids.js";
import type { Clip, ClipMood, EditDecision, Platform, PromptIntent, PromptRun } from "./types.js";

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
  const intent = inferIntent(prompt);
  const selected = selectClips(clips, intent);
  const runId = createId("run", prompt);
  const decisions = createDecisions(runId, prompt, intent, selected);
  const run: PromptRun = {
    id: runId,
    prompt,
    createdAt: new Date().toISOString(),
    intent,
    decisions
  };
  return run;
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
    return Number(seconds[1]);
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

function createDecisions(runId: string, prompt: string, intent: PromptIntent, clips: Clip[]) {
  const clipIds = clips.map((clip) => clip.id);
  const decisions: EditDecision[] = [
    decision(runId, 1, "arrange", "Build a visible reasoning arc", "Open with the clearest hook, move through proof, then land on a direct next step.", clipIds, {
      order: arrangeClipIds(clips),
      prompt
    }),
    decision(runId, 2, "trim", "Compress around useful motion", "Remove setup lag and keep only the beats that change viewer belief.", clipIds, {
      targetSeconds: intent.targetSeconds,
      maxSilenceMs: intent.pace === "cut fast" ? 280 : 520
    }),
    decision(runId, 3, "pace", `Set pacing to ${intent.pace}`, "Match cut density to platform attention without flattening the idea.", clipIds, {
      pace: intent.pace,
      averageShotSeconds: intent.pace === "cut fast" ? 1.8 : intent.pace === "steady" ? 3.4 : 5.2
    }),
    decision(runId, 4, "export", `Prepare ${intent.platform} delivery`, "Make the output ready for the channel instead of leaving it as a generic sequence.", clipIds, {
      platform: intent.platform,
      aspectRatio: intent.aspectRatio
    })
  ];
  if (intent.wantsCaptions) {
    decisions.splice(3, 0, decision(runId, 5, "caption", "Add sparse semantic captions", "Caption the argument, not every filler word.", clipIds, {
      style: "high contrast lower third",
      maxWordsPerLine: 7
    }));
  }
  if (intent.wantsMusic) {
    decisions.splice(3, 0, decision(runId, 6, "audio", "Place a restrained music bed", "Use audio as momentum while preserving speech clarity.", clipIds, {
      duckingDb: -14,
      bed: intent.tone
    }));
  }
  if (intent.wantsColorGrade) {
    decisions.splice(3, 0, decision(runId, 7, "grade", "Apply a controlled color pass", "Give the video a finished signal without hiding source texture.", clipIds, {
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
