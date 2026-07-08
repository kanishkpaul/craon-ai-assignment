# Prompt To Edit Pipeline

The pipeline is designed to make the trimming reasoning inspectable. Every stage leaves a structured artifact instead of hiding the decision inside a black box.

## Pipeline stages

1. Project setup
   The user creates a project with `init` or uses `demo`.

2. Footage registration
   The user adds clips with role, mood, duration, and notes. The demo uses one sample MP4 as stand-in footage and treats it as several logical clips.

3. Intent parsing
   The `ask` command maps the prompt into `TrimIntent`. With `--ai`, a local llama.cpp server performs that mapping. Without `--ai`, the fallback parser fills the same schema.

4. Clip selection
   The planner ranks clips by story role, tone match, duration fit, preserve constraints, remove constraints, and semantic priorities.

5. Edit planning
   The planner emits decisions for intent, arrangement, trim, pace, optional caption, optional audio, optional grade, and export.

6. Timeline construction
   The `timeline` command turns selected clips into source in and source out ranges, then maps them into a target output duration.

7. Readiness review
   The `review` command checks footage, hook, proof, close, prompt run, timeline target, captions, and export state.

8. Export
   The `export` command writes:
   - `edit-plan.json`
   - `captions.srt`
   - `rundown.md`
   - `timeline.csv`
   - `ffmpeg-plan.txt`

## Data flow

```text
Prompt
TrimIntent
Clip ranking
Edit decisions
Timeline segments
Readiness review
Export package
```

## Why this structure

The assignment is about prompt-led trimming, so the important part is not only that a prompt creates output. The important part is that the system can explain how it understood the prompt, why it selected clips, what edits it would make, and what remains risky before export.
