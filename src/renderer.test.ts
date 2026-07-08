import { describe, expect, it } from "vitest";
import { createDemoProject } from "./demo.js";
import { planPrompt } from "./planner.js";
import { createRenderPlan } from "./renderer.js";

describe("createRenderPlan", () => {
  it("creates an ffmpeg concat plan from the latest prompt run", () => {
    const project = createDemoProject();
    const run = planPrompt("Make a 10 second reel", project.clips);
    const plan = createRenderPlan(process.cwd(), project, run, "/tmp/out.mp4");
    expect(plan.args).toContain("-filter_complex");
    expect(plan.args.join(" ")).toContain("concat=n=5");
    expect(plan.args.join(" ")).toContain("720:1280");
  });

  it("uses wide dimensions for cinematic output", () => {
    const project = createDemoProject();
    const run = planPrompt("Make a cinematic 16:9 trailer", project.clips);
    const plan = createRenderPlan(process.cwd(), project, run, "/tmp/out.mp4");
    expect(plan.args.join(" ")).toContain("1280:720");
  });
});
