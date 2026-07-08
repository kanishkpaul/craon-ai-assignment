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
    expect(csv).toContain("Opening motion establishes the edit");
  });

  it("keeps unselected clips out of the generated timeline", () => {
    const project = createDemoProject();
    project.clips.push(
      {
        id: "clip-extra-one",
        path: "extra-one.mov",
        label: "Extra one",
        duration: 20,
        role: "broll",
        mood: "raw",
        notes: ""
      },
      {
        id: "clip-extra-two",
        path: "extra-two.mov",
        label: "Extra two",
        duration: 20,
        role: "broll",
        mood: "raw",
        notes: ""
      }
    );
    const run = planPrompt("Make a 30 second reel", project.clips);
    const timeline = buildTimeline(project, run);
    expect(timeline.length).toBeLessThan(project.clips.length);
  });
});
