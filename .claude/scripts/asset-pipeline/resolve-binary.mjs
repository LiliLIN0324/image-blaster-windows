#!/usr/bin/env node
import { execFile } from "node:child_process";
import { readdir, stat } from "node:fs/promises";
import path from "node:path";
import os from "node:os";

const IS_WINDOWS = process.platform === "win32";
const MAX_SEARCH_DEPTH = 3;
const resolved = new Map();

function executableName(name) {
  return IS_WINDOWS ? `${name}.exe` : name;
}

// Node's execFile cannot run .cmd/.bat shims without a shell, so only accept real
// executables when resolving from disk.
async function isExecutableFile(filePath) {
  try {
    const info = await stat(filePath);
    if (!info.isFile()) return false;
    return !IS_WINDOWS || filePath.toLowerCase().endsWith(".exe");
  } catch {
    return false;
  }
}

function searchDirectories(name) {
  const home = os.homedir();
  if (!IS_WINDOWS) {
    return ["/opt/homebrew/bin", "/usr/local/bin", "/usr/bin"];
  }

  const programFiles = process.env.ProgramFiles || "C:\\Program Files";
  const programFilesX86 = process.env["ProgramFiles(x86)"] || "C:\\Program Files (x86)";
  const localAppData = process.env.LOCALAPPDATA || path.join(home, "AppData", "Local");

  return [
    "C:\\ffmpeg\\bin",
    path.join(programFiles, "ffmpeg", "bin"),
    path.join(programFilesX86, "ffmpeg", "bin"),
    path.join(localAppData, "Microsoft", "WinGet", "Links"),
    path.join(localAppData, "Microsoft", "WinGet", "Packages"),
    path.join(home, "scoop", "shims"),
    path.join(home, "scoop", "apps", name, "current", "bin"),
    "C:\\ProgramData\\chocolatey\\bin"
  ];
}

// Portable unpackers bury the binary under versioned folders, e.g.
// WinGet\Packages\Gyan.FFmpeg_<src>\ffmpeg-7.1-win64\bin\ffmpeg.exe.
async function findUnder(root, name, depth) {
  const direct = path.join(root, executableName(name));
  if (await isExecutableFile(direct)) return direct;
  if (depth >= MAX_SEARCH_DEPTH) return undefined;

  let entries;
  try {
    entries = await readdir(root, { withFileTypes: true });
  } catch {
    return undefined;
  }

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const found = await findUnder(path.join(root, entry.name), name, depth + 1);
    if (found) return found;
  }
  return undefined;
}

async function findInSearchDirectories(name) {
  for (const dir of searchDirectories(name)) {
    const found = await findUnder(dir, name, 0);
    if (found) return found;
  }
  return undefined;
}

function runVersion(command) {
  return new Promise((resolve) => {
    execFile(command, ["-version"], { windowsHide: true, timeout: 15000 }, (error) => {
      resolve(!error);
    });
  });
}

export async function resolveBinary(name, options = {}) {
  const envVar = options.envVar ?? `${name.toUpperCase()}_PATH`;
  const key = `${name}:${envVar}`;
  if (resolved.has(key)) return resolved.get(key);

  const override = process.env[envVar];
  let command;

  if (override) {
    const expanded = path.resolve(override.replace(/^~(?=[/\\]|$)/, os.homedir()));
    if (!(await isExecutableFile(expanded))) {
      throw new Error(
        `${envVar} is set to "${override}" but that is not a runnable executable. ` +
          (IS_WINDOWS
            ? `On Windows it must point at ${executableName(name)}, not a .cmd wrapper.`
            : "Point it at the real binary.") +
          " Unset it to search PATH instead."
      );
    }
    command = expanded;
  } else if (await runVersion(name)) {
    command = name;
  } else {
    command = await findInSearchDirectories(name);
  }

  if (!command || !(await runVersion(command))) {
    throw new Error(
      `Could not run "${name}". Install it and either put it on PATH, set ${envVar} to the ` +
        `executable, or extend searchDirectories() in ${path.relative(process.cwd(), import.meta.filename)}.` +
        (IS_WINDOWS
          ? `\nA .cmd wrapper will not work: set ${envVar} to ${executableName(name)} directly.`
          : "")
    );
  }

  resolved.set(key, command);
  return command;
}

export async function resolveFFmpeg() {
  return resolveBinary("ffmpeg", { envVar: "FFMPEG_PATH" });
}

export async function resolveFFprobe() {
  return resolveBinary("ffprobe", { envVar: "FFPROBE_PATH" });
}
