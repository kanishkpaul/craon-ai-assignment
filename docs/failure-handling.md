# Edge Cases And Failure Handling

The prototype handles the common failure modes directly in the CLI and surfaces softer issues through `review`.

## Hard failures

| Case | Handling |
| --- | --- |
| Project missing | Commands that need state fail with `No Craon project found`. |
| Duplicate init | `init` returns the existing project name instead of overwriting state. |
| Missing clip path | `add` fails with `Missing clip path`. |
| Invalid role | `add` fails unless role is `hook`, `proof`, `texture`, `cta`, or `broll`. |
| Invalid mood | `add` fails unless mood is one of the supported tone values. |
| Bad duration | `add` fails if duration is not a positive number. |
| Empty prompt | `ask` fails with `Missing prompt`. |
| No footage | `ask` fails until at least one clip exists. |
| No prompt run | `plan`, `timeline`, and `export` explain that a prompt run is needed. |
| ffmpeg unavailable | `render` fails with `ffmpeg is required for rendering`. |
| Source file missing | `render` fails before writing output if a timeline input is unreadable. |
| llama.cpp unavailable | `ask --ai` falls back to the heuristic planner and includes the failure reason. |
| Invalid llama.cpp JSON | `ask --ai` falls back to the heuristic planner instead of blocking the workflow. |

## Soft failures

| Case | Handling |
| --- | --- |
| No hook clip | `review` warns that the first beat may be weak. |
| No proof clip | `review` warns that the edit may not earn belief. |
| No close clip | `review` warns that the asset may feel unfinished. |
| No captions requested | `review` warns because short-form channels often need semantic captions. |
| Timeline misses target | `review` warns when the planned duration drifts too far from the prompt target. |
| No export package | `review` warns until `export` has produced handoff files. |

## Ambiguous prompts

Ambiguity is handled by the trim intent schema. llama.cpp can infer intent for new phrasing, and the fallback parser uses stable defaults:

- Default platform is Reels.
- Default aspect ratio is 9:16.
- Default pace is steady.
- Default tone is focused.
- Default target duration is 30 seconds unless the platform implies a longer format.

## Conflicting prompts

When prompts contain multiple platform or tone hints, the parser counts matching signals and chooses the strongest group. If scores tie, the earlier configured signal wins, which keeps behavior stable and testable.

## New prompt types

If the user asks for an edit shape that is not explicitly supported, llama.cpp is asked to produce the closest `TrimIntent`. Unsupported ideas are preserved in `customDirectives`, while known fields like pace, duration, remove constraints, and preserve constraints still drive the trim. The fallback parser also preserves longer clauses as custom directives, so the system does not silently drop new user intent.

## Safety of generated outputs

The exporter writes text manifests instead of destructive media operations. A production renderer can consume `timeline.csv` and `ffmpeg-plan.txt`, but this prototype does not overwrite source footage or mutate external files.
