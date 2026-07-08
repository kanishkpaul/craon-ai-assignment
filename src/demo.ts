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

function createDemoClips(): Clip[] {
  return [
    {
      id: createId("clip", "founder hook"),
      path: "footage/founder-hook.mov",
      label: "Founder names the editing bottleneck",
      duration: 16,
      role: "hook",
      mood: "focused",
      notes: "Strong opening claim with direct camera energy"
    },
    {
      id: createId("clip", "timeline mess"),
      path: "footage/timeline-mess.mov",
      label: "Timeline shows manual editing drag",
      duration: 22,
      role: "proof",
      mood: "raw",
      notes: "Screen capture of cuts, captions, and color work taking too long"
    },
    {
      id: createId("clip", "prompt result"),
      path: "footage/prompt-result.mov",
      label: "Prompt turns into a clean sequence",
      duration: 19,
      role: "proof",
      mood: "cinematic",
      notes: "Shows chat-driven changes landing in the edit"
    },
    {
      id: createId("clip", "creator reaction"),
      path: "footage/creator-reaction.mov",
      label: "Creator reacts to final cut",
      duration: 11,
      role: "texture",
      mood: "warm",
      notes: "Human signal after the workflow shift"
    },
    {
      id: createId("clip", "try craon"),
      path: "footage/try-craon.mov",
      label: "Try Craon call to action",
      duration: 7,
      role: "cta",
      mood: "focused",
      notes: "Simple close with product name"
    }
  ];
}
