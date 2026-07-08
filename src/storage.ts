import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, relative } from "node:path";
import type { ExportManifest, Project } from "./types.js";

const workspaceDirectory = ".craon";
const projectFile = "project.json";

export function getProjectPath(cwd: string) {
  return join(cwd, workspaceDirectory, projectFile);
}

export function getProjectDirectory(cwd: string) {
  return join(cwd, workspaceDirectory);
}

export async function loadProject(cwd: string) {
  try {
    const data = await readFile(getProjectPath(cwd), "utf8");
    return JSON.parse(data) as Project;
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      return undefined;
    }
    throw error;
  }
}

export async function ensureProject(cwd: string) {
  const project = await loadProject(cwd);
  if (!project) {
    throw new Error("No Craon project found. Run npm run cli -- init first.");
  }
  return project;
}

export async function saveProject(cwd: string, project: Project) {
  const path = getProjectPath(cwd);
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(project, null, 2)}\n`, "utf8");
}

export async function createProject(cwd: string, name: string, brief: string) {
  const now = new Date().toISOString();
  const project: Project = {
    name,
    brief,
    createdAt: now,
    updatedAt: now,
    clips: [],
    runs: [],
    exports: []
  };
  await saveProject(cwd, project);
  return project;
}

export async function writeExportFiles(cwd: string, manifest: ExportManifest, files: Record<string, string>) {
  const directory = join(cwd, manifest.directory);
  await mkdir(directory, { recursive: true });
  await Promise.all(
    Object.entries(files).map(([file, content]) => writeFile(join(directory, file), content, "utf8"))
  );
}

export function relativeToWorkspace(cwd: string, path: string) {
  return relative(cwd, path) || ".";
}
