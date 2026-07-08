import { join } from "node:path";
import { createId } from "./ids.js";
import { writeExportFiles } from "./storage.js";
import type { ExportManifest, Project, PromptRun } from "./types.js";

export async function exportRun(cwd: string, project: Project, run: PromptRun) {
  const id = createId("export", run.id);
  const directory = join(".craon", "exports", id);
  const manifest: ExportManifest = {
    id,
    runId: run.id,
    createdAt: new Date().toISOString(),
    directory,
    files: ["edit-plan.json", "captions.srt", "rundown.md"]
  };
  await writeExportFiles(cwd, manifest, {
    "edit-plan.json": `${JSON.stringify({ project: project.name, run }, null, 2)}\n`,
    "captions.srt": createCaptions(run),
    "rundown.md": createRundown(project, run)
  });
  return manifest;
}

function createCaptions(run: PromptRun) {
  const captionLines = run.decisions
    .slice(0, 4)
    .map((decision, index) => {
      const start = formatTime(index * 4);
      const end = formatTime(index * 4 + 3);
      return `${index + 1}\n${start} --> ${end}\n${decision.title}\n`;
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
    ""
  ].join("\n");
}
