import type { Clip, Project, PromptRun, ReviewItem, TimelineSegment } from "./types.js";

export function formatProjectStatus(project: Project) {
  const latest = project.runs.at(-1);
  return [
    `Project: ${project.name}`,
    `Brief: ${project.brief || "No brief set"}`,
    `Clips: ${project.clips.length}`,
    `Prompt runs: ${project.runs.length}`,
    `Exports: ${project.exports.length}`,
    latest ? `Latest run: ${latest.id}` : "Latest run: none"
  ].join("\n");
}

export function formatClip(clip: Clip) {
  return `${clip.id} | ${clip.role} | ${clip.duration}s | ${clip.label}`;
}

export function formatRun(run: PromptRun) {
  const header = [
    `Run: ${run.id}`,
    `Platform: ${run.intent.platform}`,
    `Aspect: ${run.intent.aspectRatio}`,
    `Pace: ${run.intent.pace}`,
    `Tone: ${run.intent.tone}`,
    `Target: ${run.intent.targetSeconds}s`
  ];
  const decisions = run.decisions.map((decision, index) => {
    const clips = decision.clipIds.length ? decision.clipIds.join(", ") : "no clips";
    return `${index + 1}. ${decision.title}\n   ${decision.reason}\n   Clips: ${clips}`;
  });
  return [...header, "", ...decisions].join("\n");
}

export function formatTimeline(segments: TimelineSegment[]) {
  if (!segments.length) {
    return "No timeline segments. Add clips and run ask first.";
  }
  return segments
    .map((segment) => {
      return `${segment.index}. ${segment.timelineIn}s to ${segment.timelineOut}s | ${segment.role} | ${segment.label}\n   Source: ${segment.path} ${segment.sourceIn}s to ${segment.sourceOut}s\n   ${segment.rationale}`;
    })
    .join("\n");
}

export function formatReview(items: ReviewItem[]) {
  const score = items.reduce((total, item) => total + (item.status === "pass" ? 2 : item.status === "warn" ? 1 : 0), 0);
  const possible = items.length * 2;
  const lines = items.map((item) => `${item.status.toUpperCase()} | ${item.title}: ${item.detail}`);
  return [`Readiness: ${score}/${possible}`, "", ...lines].join("\n");
}

export function formatHelp() {
  return [
    "Craon Studio CLI",
    "",
    "Commands:",
    "  init [name] --brief <text>",
    "  add <path> --label <text> --duration <seconds> --role <role> --mood <mood> --notes <text>",
    "  ask <prompt>",
    "  plan",
    "  timeline",
    "  export",
    "  review",
    "  status",
    "  brief <text>",
    "  demo",
    "",
    "Examples:",
    "  npm run cli -- init LaunchCut --brief \"Turn raw founder footage into publishable edits\"",
    "  npm run cli -- add ./clip.mov --label \"Founder explains the shift\" --duration 18 --role hook --mood focused",
    "  npm run cli -- ask \"Make a punchy 30 second reel with captions and warm color\""
  ].join("\n");
}
