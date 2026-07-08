import { createId } from "./ids.js";
import type { Clip, Project } from "./types.js";

export function createDemoProject(): Project {
  const now = new Date().toISOString();
  return {
    name: "Craon Studio Demo",
    brief: "Turn rough creator footage into a publishable edit plan through prompts.",
    createdAt: now,
    updatedAt: now,
    clips: createDemoClips(),
    runs: [],
    exports: []
  };
}

const sampleVideo = "assets/footage/sample-road-360p.mp4";

function createDemoClips(): Clip[] {
  return [
    {
      id: createId("clip", "founder hook"),
      path: sampleVideo,
      label: "Opening motion establishes the edit",
      duration: 5.7,
      role: "hook",
      mood: "focused",
      notes: "Sample footage used as the first attention beat"
    },
    {
      id: createId("clip", "timeline mess"),
      path: sampleVideo,
      label: "Movement provides proof of source material",
      duration: 5.7,
      role: "proof",
      mood: "raw",
      notes: "Same sample asset treated as a second logical clip"
    },
    {
      id: createId("clip", "prompt result"),
      path: sampleVideo,
      label: "Cutaway supports the prompt result",
      duration: 5.7,
      role: "proof",
      mood: "cinematic",
      notes: "Sample clip stands in for generated edit proof"
    },
    {
      id: createId("clip", "creator reaction"),
      path: sampleVideo,
      label: "Visual breath before the close",
      duration: 5.7,
      role: "texture",
      mood: "warm",
      notes: "Texture beat for pacing and transition"
    },
    {
      id: createId("clip", "try craon"),
      path: sampleVideo,
      label: "Final motion lands the call to action",
      duration: 5.7,
      role: "cta",
      mood: "focused",
      notes: "Closing beat for handoff output"
    }
  ];
}
