# Architecture

Craon Studio is a local TypeScript CLI prototype for prompt-led video trimming. It does not render final video yet. It turns a natural language edit request into a flexible trim intent, structured edit decisions, a timeline, readiness feedback, and handoff files that a video renderer or editor could consume.

## Runtime shape

- `src/index.ts` is the command entry point.
- `src/cli.ts` parses commands, validates user input, and coordinates project state.
- `src/storage.ts` reads and writes `.craon/project.json`.
- `src/llama.ts` calls a local llama.cpp server for AI intent parsing.
- `src/planner.ts` normalizes trim intent and creates edit decisions.
- `src/timeline.ts` converts a prompt run into source and output cuts.
- `src/review.ts` scores whether the project is ready to hand off.
- `src/exporter.ts` writes the final handoff package.
- `src/samples.ts` generates the 20 prompt sample outputs.

## Prompt interpretation

The engine is intent-first. It does not try to add a new command for every possible edit request. A prompt is mapped into `TrimIntent`, which captures:

- Objective
- Platform
- Aspect ratio
- Pace
- Tone
- Target duration
- Preserve constraints
- Remove constraints
- Semantic priorities
- Operations
- Custom directives
- Confidence

When `ask` runs with `--ai`, `src/llama.ts` sends the prompt and clip summaries to a local llama.cpp server. The model returns JSON in the `TrimIntent` shape. If the server is offline, slow, or returns invalid JSON, the CLI falls back to the heuristic intent parser and includes a planner note in the output.

When `ask` runs without `--ai`, the same `TrimIntent` shape is filled by a deterministic fallback. That fallback extracts explicit numbers, aspect ratios, platform hints, pacing words, preserve and remove phrases, and custom clauses.

This gives the prototype two useful properties:

- It can use a local LLM for requests the code has never seen before.
- It stays runnable and testable without a model server.

## Edit decision model

Each prompt run creates an ordered set of decisions:

1. Resolve trimming intent.
2. Arrange the story arc.
3. Trim around useful motion.
4. Set pace.
5. Add optional color, audio, and caption passes.
6. Prepare delivery for the selected platform.

The planner selects clips by role, mood match, and whether the source duration fits the target. It then orders selected clips by narrative role: hook, proof, texture, broll, and cta. Unknown user needs are not discarded. They are kept in `customDirectives` and exported in the edit plan so a renderer or human editor can honor the closest possible interpretation.

## Prototype limits

The current prototype creates edit instructions and files. A production version would connect the same manifest to ffmpeg, a non-linear editor API, or a media agent that performs scene detection, speech transcription, visual scoring, and final render operations.
