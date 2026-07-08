import { createId } from "./ids.js";
import { createDemoProject } from "./demo.js";
import { exportRun } from "./exporter.js";
import { formatClip, formatHelp, formatProjectStatus, formatReview, formatRun, formatTimeline } from "./format.js";
import { checkLlama, planPromptWithLlama } from "./llama.js";
import { planPrompt } from "./planner.js";
import { renderRun } from "./renderer.js";
import { reviewProject } from "./review.js";
import { formatSampleOutputs, writeSampleOutputs } from "./samples.js";
import { createProject, ensureProject, loadProject, saveProject } from "./storage.js";
import { buildTimeline } from "./timeline.js";
import type { Clip, ClipMood, ClipRole, Project } from "./types.js";

type ParsedArgs = {
  command: string;
  values: string[];
  flags: Map<string, string | true>;
};

const roles = new Set<ClipRole>(["hook", "proof", "texture", "cta", "broll"]);
const moods = new Set<ClipMood>(["raw", "warm", "urgent", "cinematic", "quiet", "playful", "focused"]);

export async function runCli(args: string[], cwd: string) {
  return runCliWithEnv(args, cwd, process.env);
}

export async function runCliWithEnv(args: string[], cwd: string, env: Record<string, string | undefined>) {
  const parsed = parseArgs(args);
  const output = await dispatch(parsed, cwd, env);
  return output;
}

async function dispatch(parsed: ParsedArgs, cwd: string, env: Record<string, string | undefined>) {
  if (!parsed.command || parsed.command === "help") {
    return formatHelp();
  }
  if (parsed.command === "init") {
    return initCommand(parsed, cwd);
  }
  if (parsed.command === "add") {
    return addCommand(parsed, cwd);
  }
  if (parsed.command === "ask") {
    return askCommand(parsed, cwd, env);
  }
  if (parsed.command === "plan") {
    return planCommand(cwd);
  }
  if (parsed.command === "timeline") {
    return timelineCommand(cwd);
  }
  if (parsed.command === "export") {
    return exportCommand(cwd);
  }
  if (parsed.command === "render") {
    return renderCommand(cwd);
  }
  if (parsed.command === "review") {
    return reviewCommand(cwd);
  }
  if (parsed.command === "status") {
    return statusCommand(cwd);
  }
  if (parsed.command === "brief") {
    return briefCommand(parsed, cwd);
  }
  if (parsed.command === "demo") {
    return demoCommand(cwd);
  }
  if (parsed.command === "samples") {
    return samplesCommand(parsed, cwd);
  }
  if (parsed.command === "llama") {
    return llamaCommand(env);
  }
  throw new Error(`Unknown command: ${parsed.command}`);
}

function parseArgs(args: string[]): ParsedArgs {
  const [command = "help", ...rest] = args;
  const flags = new Map<string, string | true>();
  const values: string[] = [];
  for (let index = 0; index < rest.length; index += 1) {
    const item = rest[index];
    if (item.startsWith("--")) {
      const key = item.slice(2);
      const next = rest[index + 1];
      if (next && !next.startsWith("--")) {
        flags.set(key, next);
        index += 1;
      } else {
        flags.set(key, true);
      }
    } else {
      values.push(item);
    }
  }
  return { command, values, flags };
}

async function initCommand(parsed: ParsedArgs, cwd: string) {
  const existing = await loadProject(cwd);
  if (existing) {
    return `Project already exists: ${existing.name}`;
  }
  const name = parsed.values.join(" ") || "Craon Studio";
  const brief = getFlag(parsed, "brief", "");
  const project = await createProject(cwd, name, brief);
  return `Created project: ${project.name}`;
}

async function addCommand(parsed: ParsedArgs, cwd: string) {
  const project = await ensureProject(cwd);
  const path = parsed.values[0];
  if (!path) {
    throw new Error("Missing clip path.");
  }
  const role = parseRole(getFlag(parsed, "role", "broll"));
  const mood = parseMood(getFlag(parsed, "mood", "focused"));
  const duration = Number(getFlag(parsed, "duration", "12"));
  if (!Number.isFinite(duration) || duration <= 0) {
    throw new Error("Duration must be a positive number.");
  }
  const clip: Clip = {
    id: createId("clip", path),
    path,
    label: getFlag(parsed, "label", path),
    duration,
    role,
    mood,
    notes: getFlag(parsed, "notes", "")
  };
  project.clips.push(clip);
  touch(project);
  await saveProject(cwd, project);
  return `Added clip: ${formatClip(clip)}`;
}

async function askCommand(parsed: ParsedArgs, cwd: string, env: Record<string, string | undefined>) {
  const project = await ensureProject(cwd);
  const prompt = parsed.values.join(" ").trim();
  if (!prompt) {
    throw new Error("Missing prompt.");
  }
  if (!project.clips.length) {
    throw new Error("Add at least one clip before planning an edit.");
  }
  const run = await planPromptForCommand(prompt, project.clips, parsed, env);
  project.runs.push(run);
  touch(project);
  await saveProject(cwd, project);
  return formatRun(run);
}

async function planPromptForCommand(prompt: string, clips: Clip[], parsed: ParsedArgs, env: Record<string, string | undefined>) {
  if (parsed.flags.has("no-ai")) {
    return planPrompt(prompt, clips);
  }
  if (parsed.flags.has("ai") || env.LLAMA_CPP_ENABLED === "1") {
    return planPromptWithLlama(prompt, clips, env);
  }
  return planPrompt(prompt, clips);
}

async function planCommand(cwd: string) {
  const project = await ensureProject(cwd);
  const run = project.runs.at(-1);
  if (!run) {
    return "No prompt run yet. Run npm run cli -- ask \"your edit prompt\".";
  }
  return formatRun(run);
}

async function timelineCommand(cwd: string) {
  const project = await ensureProject(cwd);
  const run = project.runs.at(-1);
  if (!run) {
    return "No prompt run yet. Run npm run cli -- ask \"your edit prompt\".";
  }
  return formatTimeline(buildTimeline(project, run));
}

async function exportCommand(cwd: string) {
  const project = await ensureProject(cwd);
  const run = project.runs.at(-1);
  if (!run) {
    return "No prompt run to export.";
  }
  const manifest = await exportRun(cwd, project, run);
  project.exports.push(manifest);
  touch(project);
  await saveProject(cwd, project);
  return [`Exported run: ${run.id}`, `Directory: ${manifest.directory}`, `Files: ${manifest.files.join(", ")}`].join("\n");
}

async function renderCommand(cwd: string) {
  const project = await ensureProject(cwd);
  const run = project.runs.at(-1);
  if (!run) {
    return "No prompt run to render.";
  }
  const output = await renderRun(cwd, project, run);
  return `Rendered video: ${output}`;
}

async function reviewCommand(cwd: string) {
  const project = await ensureProject(cwd);
  return formatReview(reviewProject(project));
}

async function statusCommand(cwd: string) {
  const project = await ensureProject(cwd);
  const clips = project.clips.length ? project.clips.map(formatClip).join("\n") : "No clips yet";
  return `${formatProjectStatus(project)}\n\nClips:\n${clips}`;
}

async function briefCommand(parsed: ParsedArgs, cwd: string) {
  const project = await ensureProject(cwd);
  const brief = parsed.values.join(" ").trim();
  if (!brief) {
    throw new Error("Missing brief text.");
  }
  project.brief = brief;
  touch(project);
  await saveProject(cwd, project);
  return `Updated brief: ${project.brief}`;
}

async function demoCommand(cwd: string) {
  const existing = await loadProject(cwd);
  if (existing) {
    return `Project already exists: ${existing.name}`;
  }
  const project = createDemoProject();
  const run = planPrompt("Make a punchy 30 second reel with captions, warm color, and a restrained music bed", project.clips);
  project.runs.push(run);
  project.updatedAt = new Date().toISOString();
  await saveProject(cwd, project);
  return [`Created demo project: ${project.name}`, "", formatRun(run)].join("\n");
}

async function samplesCommand(parsed: ParsedArgs, cwd: string) {
  if (parsed.flags.has("write")) {
    const path = await writeSampleOutputs(cwd);
    return `Wrote sample outputs: ${path}`;
  }
  return formatSampleOutputs();
}

async function llamaCommand(env: Record<string, string | undefined>) {
  try {
    await checkLlama(env);
    return "llama.cpp server reachable";
  } catch (error) {
    const message = error instanceof Error ? error.message : "llama.cpp server unreachable";
    return `llama.cpp server unavailable: ${message}`;
  }
}

function getFlag(parsed: ParsedArgs, key: string, fallback: string) {
  const value = parsed.flags.get(key);
  if (typeof value === "string") {
    return value;
  }
  return fallback;
}

function parseRole(value: string) {
  if (!roles.has(value as ClipRole)) {
    throw new Error(`Invalid role: ${value}`);
  }
  return value as ClipRole;
}

function parseMood(value: string) {
  if (!moods.has(value as ClipMood)) {
    throw new Error(`Invalid mood: ${value}`);
  }
  return value as ClipMood;
}

function touch(project: Project) {
  project.updatedAt = new Date().toISOString();
}
