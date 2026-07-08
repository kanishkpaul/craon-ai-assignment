import { join } from "node:path";
import { createId } from "./ids.js";
import { writeExportFiles } from "./storage.js";
import { buildTimeline, timelineToCsv } from "./timeline.js";
import type { ExportManifest, Project, PromptRun } from "./types.js";

export async function exportRun(cwd: string, project: Project, run: PromptRun) {
  const id = createId("export", run.id);
  const directory = join(".craon", "exports", id);
  const manifest: ExportManifest = {
    id,
    runId: run.id,
    createdAt: new Date().toISOString(),
    directory,
    files: ["edit-plan.json", "captions.srt", "rundown.md", "timeline.csv", "ffmpeg-plan.txt"]
  };
  const timeline = buildTimeline(project, run);
  await writeExportFiles(cwd, manifest, {
    "edit-plan.json": `${JSON.stringify({ project: project.name, run, timeline }, null, 2)}\n`,
    "captions.srt": createCaptions(timeline),
    "rundown.md": createRundown(project, run),
    "timeline.csv": timelineToCsv(timeline),
    "ffmpeg-plan.txt": createFfmpegPlan(run)
  });
  return manifest;
}

function createCaptions(timeline: ReturnType<typeof buildTimeline>) {
  const captionLines = timeline
    .slice(0, 6)
    .map((segment) => {
      const start = formatTime(segment.timelineIn);
      const end = formatTime(segment.timelineOut);
      return `${segment.index}\n${start} --> ${end}\n${segment.label}\n`;
    })
    .join("\n");
  return `${captionLines}\n`;
}

function formatTime(seconds: number) {
  const date = new Date(seconds * 1000);
  const value = date.toISOString().slice(11, 23).replace(".", ",");
  return value;
}

function createRundown(project: Project, run: PromptRun) {
  const decisions = run.decisions.map((decision, index) => `${index + 1}. ${decision.title}: ${decision.reason}`).join("\n");
  const timeline = buildTimeline(project, run)
    .map((segment) => `${segment.index}. ${segment.timelineIn}s to ${segment.timelineOut}s: ${segment.label}`)
    .join("\n");
  return [
    `# ${project.name}`,
    "",
    `Prompt: ${run.prompt}`,
    `Platform: ${run.intent.platform}`,
    `Aspect: ${run.intent.aspectRatio}`,
    `Target seconds: ${run.intent.targetSeconds}`,
    "",
    "## Edit Decisions",
    "",
    decisions,
    "",
    "## Timeline",
    "",
    timeline,
    ""
  ].join("\n");
}

function createFfmpegPlan(run: PromptRun) {
  return [
    `target=${run.intent.targetSeconds}`,
    `aspect=${run.intent.aspectRatio}`,
    `pace=${run.intent.pace}`,
    `platform=${run.intent.platform}`,
    "Use timeline.csv as the edit decision source.",
    "Normalize speech first, duck music under dialogue, then apply captions and color."
  ].join("\n");
}
