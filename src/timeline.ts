import type { Clip, Project, PromptRun, TimelineSegment } from "./types.js";

export function buildTimeline(project: Project, run: PromptRun) {
  const ordered = orderedClips(project.clips, run);
  const target = run.intent.targetSeconds;
  const available = ordered.reduce((total, clip) => total + clip.duration, 0);
  const scale = available > target ? target / available : 1;
  let cursor = 0;
  return ordered.map((clip, index) => {
    const planned = round(Math.max(1.5, clip.duration * scale));
    const remaining = Math.max(0, target - cursor);
    const duration = index === ordered.length - 1 ? round(Math.min(planned, remaining || planned)) : round(Math.min(planned, remaining));
    const sourceIn = sourceStart(clip);
    const sourceOut = round(Math.min(clip.duration, sourceIn + duration));
    const segment: TimelineSegment = {
      index: index + 1,
      clipId: clip.id,
      label: clip.label,
      path: clip.path,
      role: clip.role,
      sourceIn,
      sourceOut,
      timelineIn: round(cursor),
      timelineOut: round(cursor + duration),
      duration,
      rationale: rationaleForRole(clip.role)
    };
    cursor = round(cursor + duration);
    return segment;
  });
}

export function timelineToCsv(segments: TimelineSegment[]) {
  const header = ["index", "clip_id", "label", "role", "source_in", "source_out", "timeline_in", "timeline_out", "duration", "path"];
  const rows = segments.map((segment) =>
    [
      segment.index,
      segment.clipId,
      segment.label,
      segment.role,
      segment.sourceIn,
      segment.sourceOut,
      segment.timelineIn,
      segment.timelineOut,
      segment.duration,
      segment.path
    ]
      .map(csvCell)
      .join(",")
  );
  return `${[header.join(","), ...rows].join("\n")}\n`;
}

function orderedClips(clips: Clip[], run: PromptRun) {
  const clipMap = new Map(clips.map((clip) => [clip.id, clip]));
  const arrange = run.decisions.find((decision) => decision.kind === "arrange");
  const order = Array.isArray(arrange?.payload.order) ? arrange.payload.order : run.decisions.flatMap((decision) => decision.clipIds);
  const ordered = order.map((id) => clipMap.get(id)).filter((clip): clip is Clip => Boolean(clip));
  const seen = new Set(ordered.map((clip) => clip.id));
  const rest = clips.filter((clip) => !seen.has(clip.id));
  return [...ordered, ...rest];
}

function sourceStart(clip: Clip) {
  if (clip.role === "hook" || clip.duration <= 6) {
    return 0;
  }
  return round(Math.min(1.2, clip.duration * 0.12));
}

function rationaleForRole(role: Clip["role"]) {
  if (role === "hook") {
    return "Start with the strongest belief shift.";
  }
  if (role === "proof") {
    return "Show evidence before asking for trust.";
  }
  if (role === "texture") {
    return "Add human signal and visual breath.";
  }
  if (role === "cta") {
    return "Close only after the idea has earned it.";
  }
  return "Fill continuity without diluting the core argument.";
}

function round(value: number) {
  return Math.round(value * 10) / 10;
}

function csvCell(value: string | number) {
  const text = String(value);
  if (text.includes(",") || text.includes("\"") || text.includes("\n")) {
    return `"${text.replaceAll("\"", "\"\"")}"`;
  }
  return text;
}
