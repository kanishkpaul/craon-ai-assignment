import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { createDemoProject } from "./demo.js";
import { planPrompt } from "./planner.js";
import { buildTimeline } from "./timeline.js";

export const samplePrompts = [
  "Make a punchy 30 second reel with captions, warm color, and a restrained music bed",
  "Create a cinematic 60 second founder story with soft pacing and film color",
  "Cut a 25 second TikTok that opens with the editing pain and ends on Try Craon",
  "Make a LinkedIn launch demo for founders in 75 seconds with clean captions",
  "Turn this into a YouTube intro with steady pacing and product proof",
  "Build a quiet reflective cut about why manual editing slows creators down",
  "Make a raw honest 20 second short with no polish, just the strongest idea",
  "Create a playful Instagram reel with music and bright creator energy",
  "Make a precise technical product demo in 45 seconds for agencies",
  "Cut a 15 second ad that feels urgent and conversion focused",
  "Make a square 1:1 product teaser with captions and warm grade",
  "Create a 4:5 social cut for mobile feeds with proof before CTA",
  "Make a 16:9 cinematic trailer with music and high contrast",
  "Cut a founder-led product walkthrough for LinkedIn with steady pacing",
  "Make a fast viral short that shows before and after editing workflow",
  "Create a calm product explainer with subtitles and minimal cuts",
  "Make a launch recap for YouTube with proof clips and creator reaction",
  "Cut a 10 second hook-only teaser with sharp captions",
  "Make a 90 second agency sales asset with clear proof and export notes",
  "Create a warm human story about creators getting time back"
];

export function formatSampleOutputs() {
  const sections = samplePrompts.map((prompt, index) => {
    const project = createDemoProject();
    const run = planPrompt(prompt, project.clips);
    const timeline = buildTimeline(project, run);
    const decisions = run.decisions.map((decision, decisionIndex) => `${decisionIndex + 1}. ${decision.title}`).join("\n");
    const segments = timeline
      .map((segment) => `${segment.index}. ${segment.timelineIn}s to ${segment.timelineOut}s: ${segment.label}`)
      .join("\n");
    return [
      `## ${index + 1}. ${prompt}`,
      "",
      `Intent: ${run.intent.platform}, ${run.intent.aspectRatio}, ${run.intent.pace}, ${run.intent.tone}, ${run.intent.targetSeconds}s`,
      `Objective: ${run.trimIntent.objective}`,
      `Directives: ${run.trimIntent.customDirectives.join("; ") || "none"}`,
      "",
      "Decisions:",
      "",
      decisions,
      "",
      "Timeline:",
      "",
      segments
    ].join("\n");
  });
  return [
    "# Sample Prompt Outputs",
    "",
    "Generated from the demo footage set with the offline planner. llama.cpp mode uses the same TrimIntent schema at runtime.",
    "",
    ...sections,
    ""
  ].join("\n");
}

export async function writeSampleOutputs(cwd: string) {
  const path = join(cwd, "samples", "prompt-outputs.md");
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, formatSampleOutputs(), "utf8");
  return path;
}
