import { describe, expect, it } from "vitest";
import { inferIntent, planPrompt } from "./planner.js";
import type { Clip } from "./types.js";

const clips: Clip[] = [
  {
    id: "clip-hook",
    path: "hook.mov",
    label: "Hook",
    duration: 8,
    role: "hook",
    mood: "focused",
    notes: ""
  },
  {
    id: "clip-proof",
    path: "proof.mov",
    label: "Proof",
    duration: 15,
    role: "proof",
    mood: "warm",
    notes: ""
  },
  {
    id: "clip-cta",
    path: "cta.mov",
    label: "CTA",
    duration: 5,
    role: "cta",
    mood: "focused",
    notes: ""
  }
];

describe("inferIntent", () => {
  it("maps social prompts into vertical short-form delivery", () => {
    const intent = inferIntent("Make a fast 25 second reel with captions and music");
    expect(intent.platform).toBe("reels");
    expect(intent.aspectRatio).toBe("9:16");
    expect(intent.targetSeconds).toBe(25);
    expect(intent.pace).toBe("cut fast");
    expect(intent.wantsCaptions).toBe(true);
    expect(intent.wantsMusic).toBe(true);
  });

  it("keeps cinematic prompts wide and slower", () => {
    const intent = inferIntent("Make a cinematic founder story with warm color");
    expect(intent.platform).toBe("cinematic");
    expect(intent.aspectRatio).toBe("16:9");
    expect(intent.pace).toBe("slow burn");
    expect(intent.wantsColorGrade).toBe(true);
  });
});

describe("planPrompt", () => {
  it("creates a complete edit plan with ordered decisions", () => {
    const run = planPrompt("Make a punchy 30 second reel with captions", clips);
    expect(run.decisions.length).toBeGreaterThanOrEqual(5);
    expect(run.decisions[0]?.kind).toBe("arrange");
    expect(run.decisions.some((decision) => decision.kind === "caption")).toBe(true);
    expect(run.decisions.at(-1)?.kind).toBe("export");
  });
});
