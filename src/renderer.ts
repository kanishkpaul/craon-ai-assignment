import { access, mkdir } from "node:fs/promises";
import { constants } from "node:fs";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { dirname, join, resolve } from "node:path";
import { buildTimeline } from "./timeline.js";
import type { Project, PromptRun } from "./types.js";

const runFile = promisify(execFile);

export type RenderPlan = {
  output: string;
  args: string[];
};

export async function renderRun(cwd: string, project: Project, run: PromptRun) {
  const output = join(cwd, ".craon", "renders", `${run.id}.mp4`);
  const plan = createRenderPlan(cwd, project, run, output);
  await assertExecutable("ffmpeg");
  await assertInputs(plan);
  await mkdir(dirname(output), { recursive: true });
  await runFile("ffmpeg", plan.args, { cwd });
  return output;
}

export function createRenderPlan(cwd: string, project: Project, run: PromptRun, output: string): RenderPlan {
  const timeline = buildTimeline(project, run);
  if (!timeline.length) {
    throw new Error("No timeline segments to render.");
  }
  const dimensions = renderDimensions(run.intent.aspectRatio);
  const inputs = timeline.flatMap((segment) => [
    "-ss",
    String(segment.sourceIn),
    "-t",
    String(segment.duration),
    "-i",
    resolve(cwd, segment.path)
  ]);
  const filters = timeline.map((_, index) => {
    return `[${index}:v]scale=${dimensions.width}:${dimensions.height}:force_original_aspect_ratio=decrease,pad=${dimensions.width}:${dimensions.height}:(ow-iw)/2:(oh-ih)/2,setsar=1[v${index}]`;
  });
  const concatInputs = timeline.map((_, index) => `[v${index}]`).join("");
  const filterComplex = [...filters, `${concatInputs}concat=n=${timeline.length}:v=1:a=0[outv]`].join(";");
  return {
    output,
    args: [
      "-y",
      ...inputs,
      "-filter_complex",
      filterComplex,
      "-map",
      "[outv]",
      "-an",
      "-c:v",
      "libx264",
      "-preset",
      "veryfast",
      "-pix_fmt",
      "yuv420p",
      output
    ]
  };
}

function renderDimensions(aspectRatio: PromptRun["intent"]["aspectRatio"]) {
  if (aspectRatio === "16:9") {
    return { width: 1280, height: 720 };
  }
  if (aspectRatio === "1:1") {
    return { width: 1080, height: 1080 };
  }
  if (aspectRatio === "4:5") {
    return { width: 1080, height: 1350 };
  }
  return { width: 720, height: 1280 };
}

async function assertExecutable(name: string) {
  try {
    await runFile(name, ["-version"]);
  } catch {
    throw new Error(`${name} is required for rendering.`);
  }
}

async function assertInputs(plan: RenderPlan) {
  const paths = plan.args.filter((arg, index, args) => args[index - 1] === "-i");
  await Promise.all(paths.map((path) => access(path, constants.R_OK)));
}
