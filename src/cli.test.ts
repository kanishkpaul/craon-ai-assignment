import { mkdtemp, readFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { afterEach, describe, expect, it } from "vitest";
import { runCliWithEnv } from "./cli.js";

const directories: string[] = [];

afterEach(async () => {
  await Promise.all(directories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })));
});

describe("runCli", () => {
  it("runs a full demo, review, export workflow", async () => {
    const cwd = await tempProject();
    const demo = await runCliWithEnv(["demo"], cwd, {});
    expect(demo).toContain("Created demo project");
    const timeline = await runCliWithEnv(["timeline"], cwd, {});
    expect(timeline).toContain("Opening motion establishes the edit");
    const exportOutput = await runCliWithEnv(["export"], cwd, {});
    expect(exportOutput).toContain("timeline.csv");
    const review = await runCliWithEnv(["review"], cwd, {});
    expect(review).toContain("Readiness: 16/16");
    const project = await readFile(join(cwd, ".craon", "project.json"), "utf8");
    expect(project).toContain("\"exports\"");
  });

  it("supports init, add, ask, and brief commands", async () => {
    const cwd = await tempProject();
    await runCliWithEnv(["init", "LaunchCut", "--brief", "Initial brief"], cwd, {});
    await runCliWithEnv(["add", "clip.mov", "--label", "Founder hook", "--duration", "10", "--role", "hook", "--mood", "focused"], cwd, {});
    const plan = await runCliWithEnv(["ask", "Make a sharp 10 second reel with captions"], cwd, {});
    expect(plan).toContain("Target: 10s");
    const brief = await runCliWithEnv(["brief", "New sharper brief"], cwd, {});
    expect(brief).toContain("New sharper brief");
  });

  it("rejects planning before footage exists", async () => {
    const cwd = await tempProject();
    await runCliWithEnv(["init", "Empty"], cwd, {});
    await expect(runCliWithEnv(["ask", "Make a reel"], cwd, {})).rejects.toThrow("Add at least one clip");
  });

  it("prints at least 20 sample outputs", async () => {
    const cwd = await tempProject();
    const output = await runCliWithEnv(["samples"], cwd, {});
    expect(output.match(/^## /gm)?.length).toBeGreaterThanOrEqual(20);
    expect(output).toContain("Intent:");
  });

  it("falls back when llama is requested without a server", async () => {
    const cwd = await tempProject();
    await runCliWithEnv(["init", "Fallback"], cwd, {});
    await runCliWithEnv(["add", "clip.mov", "--duration", "8", "--role", "hook", "--mood", "focused"], cwd, {});
    const output = await runCliWithEnv(["ask", "Make a reel", "--ai"], cwd, {
      LLAMA_CPP_URL: "http://127.0.0.1:1",
      LLAMA_CPP_TIMEOUT_MS: "100"
    });
    expect(output).toContain("Planner: heuristic");
    expect(output).toContain("llama.cpp fallback");
  });
});

async function tempProject() {
  const directory = await mkdtemp(join(tmpdir(), "craon-cli-"));
  directories.push(directory);
  return directory;
}
