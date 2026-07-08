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
  | "intent"
  | "arrange"
  | "trim"
  | "caption"
  | "grade"
  | "audio"
  | "pace"
  | "export";

export type Platform = "shorts" | "reels" | "youtube" | "linkedin" | "cinematic";

export type AspectRatio = "9:16" | "16:9" | "1:1" | "4:5";

export type PlannerMode = "llama.cpp" | "heuristic";

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

export type TrimIntent = {
  objective: string;
  platform: Platform;
  aspectRatio: AspectRatio;
  pace: PromptIntent["pace"];
  tone: ClipMood;
  targetSeconds: number;
  preserve: string[];
  remove: string[];
  semanticPriorities: string[];
  operations: string[];
  customDirectives: string[];
  confidence: number;
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
  planner: PlannerMode;
  plannerNote?: string;
  trimIntent: TrimIntent;
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

export type TimelineSegment = {
  index: number;
  clipId: string;
  label: string;
  path: string;
  role: ClipRole;
  sourceIn: number;
  sourceOut: number;
  timelineIn: number;
  timelineOut: number;
  duration: number;
  rationale: string;
};

export type ReviewStatus = "pass" | "warn" | "fail";

export type ReviewItem = {
  status: ReviewStatus;
  title: string;
  detail: string;
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
