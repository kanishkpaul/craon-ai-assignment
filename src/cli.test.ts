import { mkdtemp, readFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { afterEach, describe, expect, it } from "vitest";
import { runCli } from "./cli.js";

const directories: string[] = [];

afterEach(async () => {
  await Promise.all(directories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })));
});

describe("runCli", () => {
  it("runs a full demo, review, export workflow", async () => {
    const cwd = await tempProject();
    const demo = await runCli(["demo"], cwd);
    expect(demo).toContain("Created demo project");
    const timeline = await runCli(["timeline"], cwd);
    expect(timeline).toContain("Founder names the editing bottleneck");
    const exportOutput = await runCli(["export"], cwd);
    expect(exportOutput).toContain("timeline.csv");
    const review = await runCli(["review"], cwd);
    expect(review).toContain("Readiness: 16/16");
    const project = await readFile(join(cwd, ".craon", "project.json"), "utf8");
    expect(project).toContain("\"exports\"");
  });

  it("supports init, add, ask, and brief commands", async () => {
    const cwd = await tempProject();
    await runCli(["init", "LaunchCut", "--brief", "Initial brief"], cwd);
    await runCli(["add", "clip.mov", "--label", "Founder hook", "--duration", "10", "--role", "hook", "--mood", "focused"], cwd);
    const plan = await runCli(["ask", "Make a sharp 10 second reel with captions"], cwd);
    expect(plan).toContain("Target: 10s");
    const brief = await runCli(["brief", "New sharper brief"], cwd);
    expect(brief).toContain("New sharper brief");
  });
});

async function tempProject() {
  const directory = await mkdtemp(join(tmpdir(), "craon-cli-"));
  directories.push(directory);
  return directory;
}
