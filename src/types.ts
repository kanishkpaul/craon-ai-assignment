export type ClipRole = "hook" | "proof" | "texture" | "cta" | "broll";

export type ClipMood =
  | "raw"
  | "warm"
  | "urgent"
  | "cinematic"
  | "quiet"
  | "playful"
  | "focused";

export type EditKind =
  | "arrange"
  | "trim"
  | "caption"
  | "grade"
  | "audio"
  | "pace"
  | "export";

export type Platform = "shorts" | "reels" | "youtube" | "linkedin" | "cinematic";

export type AspectRatio = "9:16" | "16:9" | "1:1" | "4:5";

export type Clip = {
  id: string;
  path: string;
  label: string;
  duration: number;
  role: ClipRole;
  mood: ClipMood;
  notes: string;
};

export type PromptIntent = {
  platform: Platform;
  aspectRatio: AspectRatio;
  pace: "cut fast" | "steady" | "slow burn";
  tone: ClipMood;
  targetSeconds: number;
  wantsCaptions: boolean;
  wantsMusic: boolean;
  wantsColorGrade: boolean;
};

export type EditDecision = {
  id: string;
  kind: EditKind;
  title: string;
  reason: string;
  clipIds: string[];
  payload: Record<string, string | number | boolean | string[]>;
};

export type PromptRun = {
  id: string;
  prompt: string;
  createdAt: string;
  intent: PromptIntent;
  decisions: EditDecision[];
};

export type ExportManifest = {
  id: string;
  runId: string;
  createdAt: string;
  directory: string;
  files: string[];
};

export type Project = {
  name: string;
  brief: string;
  createdAt: string;
  updatedAt: string;
  clips: Clip[];
  runs: PromptRun[];
  exports: ExportManifest[];
};
