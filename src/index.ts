import { runCli } from "./cli.js";

try {
  const output = await runCli(process.argv.slice(2), process.cwd());
  if (output) {
    process.stdout.write(`${output}\n`);
  }
} catch (error) {
  const message = error instanceof Error ? error.message : "Unknown error";
  process.stderr.write(`${message}\n`);
  process.exitCode = 1;
}
