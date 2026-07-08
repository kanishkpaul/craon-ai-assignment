# Craon AI Assignment

Prompt-led video editing CLI built as a product assignment for Craon.

## Take-home coverage

- Working prototype: run the CLI locally with demo footage, llama.cpp intent parsing, timeline output, review scoring, and export files.
- Architecture: see [docs/architecture.md](docs/architecture.md).
- Prompt to edit pipeline: see [docs/pipeline.md](docs/pipeline.md).
- Edge cases and failure handling: see [docs/failure-handling.md](docs/failure-handling.md).
- Sample outputs for 20 prompts: see [samples/prompt-outputs.md](samples/prompt-outputs.md).

## Run

```bash
npm install
npm run build
npm run cli -- demo
npm run cli -- status
npm run cli -- timeline
npm run cli -- review
npm run cli -- export
npm run cli -- render
npm run samples
```

The demo uses `assets/footage/sample-road-360p.mp4`, a small H.264 MP4 downloaded from Samplelib for prototype testing.

## llama.cpp mode

Start a local llama.cpp server with any instruction-tuned GGUF model:

```bash
llama-server -m /path/to/model.gguf --host 127.0.0.1 --port 8080
npm run build
npm run llama
npm run cli -- ask "Make a fast launch reel, keep the strongest proof, remove dead air, and add captions" --ai
```

Environment variables:

- `LLAMA_CPP_URL` defaults to `http://127.0.0.1:8080`.
- `LLAMA_CPP_MODEL` defaults to `local-model`.
- `LLAMA_CPP_TIMEOUT_MS` defaults to `5000`.
- `LLAMA_CPP_MAX_TOKENS` defaults to `240`.

## Commands

- `init` creates a local `.craon/project.json`.
- `add` registers source footage with duration, role, mood, and notes.
- `ask` turns an edit prompt into an ordered plan.
- `timeline` prints the planned source and output cuts.
- `review` checks whether the project is ready to hand off.
- `export` writes an edit plan, captions, rundown, timeline CSV, and implementation notes.
- `render` uses ffmpeg to create an MP4 from the latest timeline.
- `samples --write` regenerates the 20 prompt sample output artifact.
- `llama` checks whether the local llama.cpp server is reachable.
