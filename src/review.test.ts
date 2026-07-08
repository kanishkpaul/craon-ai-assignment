import { describe, expect, it } from "vitest";
import { createDemoProject } from "./demo.js";
import { planPrompt } from "./planner.js";
import { reviewProject } from "./review.js";

describe("reviewProject", () => {
  it("marks an empty project as not ready", () => {
    const project = createDemoProject();
    project.clips = [];
    const review = reviewProject(project);
    expect(review.some((item) => item.status === "fail")).toBe(true);
  });

  it("recognizes a planned demo project as mostly ready", () => {
    const project = createDemoProject();
    project.runs.push(planPrompt("Make a punchy 30 second reel with captions", project.clips));
    const review = reviewProject(project);
    expect(review.filter((item) => item.status === "pass").length).toBeGreaterThan(4);
  });
});
