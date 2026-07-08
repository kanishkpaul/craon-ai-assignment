import { buildTimeline } from "./timeline.js";
import type { Project, ReviewItem } from "./types.js";

export function reviewProject(project: Project) {
  const items: ReviewItem[] = [];
  items.push(project.clips.length ? pass("Footage loaded", `${project.clips.length} clips available.`) : fail("No footage", "Add at least one clip before planning an edit."));
  items.push(project.clips.some((clip) => clip.role === "hook") ? pass("Hook present", "The plan has opening material.") : warn("No hook", "Mark one clip as hook for a stronger first beat."));
  items.push(project.clips.some((clip) => clip.role === "proof") ? pass("Proof present", "The plan has evidence material.") : warn("No proof", "Add proof footage so the edit can earn belief."));
  items.push(project.clips.some((clip) => clip.role === "cta") ? pass("Close present", "The plan has a next step.") : warn("No close", "Add a cta clip if this needs to ship as a complete asset."));
  const latest = project.runs.at(-1);
  items.push(latest ? pass("Prompt run ready", latest.prompt) : fail("No prompt run", "Run ask with a concrete edit prompt."));
  if (latest) {
    const duration = round(buildTimeline(project, latest).reduce((total, segment) => total + segment.duration, 0));
    const delta = Math.abs(duration - latest.intent.targetSeconds);
    items.push(delta <= 3 ? pass("Timeline matches target", `${duration}s planned for ${latest.intent.targetSeconds}s target.`) : warn("Timeline needs tuning", `${duration}s planned for ${latest.intent.targetSeconds}s target.`));
    items.push(latest.intent.wantsCaptions ? pass("Caption strategy present", "Captions are part of the prompt run.") : warn("No captions requested", "Short-form channels usually need semantic captions."));
  }
  items.push(project.exports.length ? pass("Export package exists", project.exports.at(-1)?.directory ?? "") : warn("No export yet", "Run export when the plan is ready to hand off."));
  return items;
}

function pass(title: string, detail: string): ReviewItem {
  return { status: "pass", title, detail };
}

function warn(title: string, detail: string): ReviewItem {
  return { status: "warn", title, detail };
}

function fail(title: string, detail: string): ReviewItem {
  return { status: "fail", title, detail };
}

function round(value: number) {
  return Math.round(value * 10) / 10;
}
