import { describe, expect, it } from "vitest";
import { createDemoProject } from "./demo.js";
import { planPrompt } from "./planner.js";
import { buildTimeline, timelineToCsv } from "./timeline.js";

describe("buildTimeline", () => {
  it("orders clips by planned story role and stays near target", () => {
    const project = createDemoProject();
    const run = planPrompt("Make a punchy 30 second reel with captions", project.clips);
    const timeline = buildTimeline(project, run);
    const duration = timeline.reduce((total, segment) => total + segment.duration, 0);
    expect(timeline[0]?.role).toBe("hook");
    expect(timeline.at(-1)?.role).toBe("cta");
    expect(duration).toBeLessThanOrEqual(30.5);
  });

  it("serializes timeline rows as csv", () => {
    const project = createDemoProject();
    const run = planPrompt("Make a 30 second reel", project.clips);
    const csv = timelineToCsv(buildTimeline(project, run));
    expect(csv).toContain("index,clip_id,label");
    expect(csv).toContain("Founder names the editing bottleneck");
  });
});
