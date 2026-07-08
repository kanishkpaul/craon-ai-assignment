# Craon AI Assignment

Prompt-led video editing CLI built as a product assignment for Craon.

## Run

```bash
npm install
npm run build
npm run cli -- demo
npm run cli -- status
npm run cli -- timeline
npm run cli -- review
npm run cli -- export
```

## Commands

- `init` creates a local `.craon/project.json`.
- `add` registers source footage with duration, role, mood, and notes.
- `ask` turns an edit prompt into an ordered plan.
- `timeline` prints the planned source and output cuts.
- `review` checks whether the project is ready to hand off.
- `export` writes an edit plan, captions, rundown, timeline CSV, and implementation notes.
