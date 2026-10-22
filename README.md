<img width="960" height="540" alt="image-blaster-1" src="https://github.com/user-attachments/assets/d294e420-eb48-4f00-b6a8-13005442d1a8" />

## `image-blaster`
Creates 3D environments, SFX, and meshes from a single image using Claude skills, World Labs, and FAL. 

Can take you from an image to a fully meshed 3D environment in < 5 minutes, great for jumpstarting 3D work. Go full blast.


## Windows fork

This is a Windows-adapted fork of [`neilsonnn/image-blaster`](https://github.com/neilsonnn/image-blaster) by Neilson Koerner-Safrata. The concept, the skills, the prompts and the asset pipeline are all his. This branch changes only what stood between the repo and a working run on Windows, and keeps the MIT licence and copyright notice untouched.

### What was broken on Windows

The headline one is not in the Quickstart and produces no error message:

| # | Problem | Fix |
|---|---|---|
| 1 | **Every CLI script silently did nothing.** Each of the 15 entrypoints guards `main()` by comparing `import.meta.url` against `file://` prepended to `process.argv[1]`. On Windows `process.argv[1]` is a backslash path like `C:\Users\...`, so that comparison is always false: `main()` never runs, nothing prints, and the script exits `0`. It looks like a successful no-op. | Compare `import.meta.url` against `pathToFileURL(process.argv[1]).href`. |
| 2 | `lsof -i :5173` does not exist on Windows, so the viewer step in the blast order could not tell whether the dev server was already up. | Added `.claude/scripts/project/check-port.mjs`, a plain-Node TCP probe that prints `IN_USE`/`FREE` on any platform. |
| 3 | Root scripts ran `bun --cwd=app`, requiring a Bun install. | Switched to `npm run <script> --workspace app`. The repo already declares `workspaces: ["app"]`, so this needs nothing extra. Bun users can still run `bun run dev` inside `app/`. |
| 4 | SFX shells out to `ffmpeg`/`ffprobe` by bare name, and `assertAudioTools()` only ran when post-processing was on, while `analyzeAudio()` needs both tools on **every** SFX path including loops. A missing FFmpeg surfaced as a raw `ENOENT` deep inside a parallel block, after the paid request. | Added `resolve-binary.mjs`: honours `FFMPEG_PATH`/`FFPROBE_PATH`, then PATH, then standard Windows install dirs; validates that `loudnorm`/`silencedetect`/`volumedetect` exist; and the check now runs before any request is submitted. |
| 5 | `.claude/hooks/*.sh` check out as CRLF under the default `core.autocrlf=true`, because `.gitattributes` only had `* text=auto`. Git Bash tolerated it here, but a CRLF shebang is a portability trap. | Pinned `*.sh` and `*.mjs` to `eol=lf`. |

### Quickstart (Windows)

1. `git clone https://github.com/LiliLIN0324/image-blaster-windows`
2. `cd image-blaster-windows`
3. `claude` (Claude Code installs natively on Windows; Git for Windows is required for the hook scripts)
4. Copy `.env.example` to `.env` and paste your [World Labs](https://platform.worldlabs.ai/) and [FAL](https://fal.ai/) keys.
5. If `ffmpeg -version` does not work in a plain terminal, set `FFMPEG_PATH` and `FFPROBE_PATH` in `.env`. **Point them at `ffmpeg.exe`, not a `.cmd` wrapper** — Node cannot `execFile` a `.cmd`, and the resolver will reject it with an explanation.
6. Drop an image in `input/` and ask Claude to `blast it and confirm each step with me`.

### Verified / not verified

Verified on Windows 11 with Node 24: all 23 scripts parse, the guard fix makes `project-state.mjs` and the SFX CLI actually execute, the resolver's five failure and success paths behave as described, the port probe reports real listeners, and the SFX CLI now fails on `FAL_KEY` rather than on a missing FFmpeg.

**Not verified: an actual generation run.** No World Labs or FAL request was made, so the 3D, world, image-edit and SFX output has not been exercised end to end, and the React viewer was never started. Treat those as untested on this branch.

## Original quickstart


1. Open a Terminal, enter `git clone https://github.com/neilsonnn/image-blaster`
2. Enter the directory with `cd image-blaster`
3. Run `claude` (install with `curl -fsSL https://claude.ai/install.sh | bash`)
4. Say hello to Claude, and give them your API key for [World Labs](https://platform.worldlabs.ai/) and [FAL](https://fal.ai/).
5. Put an image into `input/` directory and ask Claude to `blast it and confirm each step with me`.

### Description

By default `image-blaster` will use your input image to create:

1. 3D models (`.glb`, `.obj`) of all *dynamic* objects
2. Gaussian splat (`.spz`) of the *static* environment,
3. Ambient looping sound and object specific physics SFX (`.mp3`)

### Extensions

You can embed `image-blaster` under the assets of *any game engine, DCC software, or web app*.

1. Unity, Unreal, or Godot game engine
2. Blender, 3DS Max, or Maya or other DCC software
3. Three.js web app or Electron app

## Advanced

IMAGE-BLASTER uses a few generation models:

- `marble-1.1` - World Labs Marble model creates the explorable environment.
- `nano-banana` - default image edit preference for source cleanup, clean plates, and object reference images.
- `gpt-image-2` - alternate image edit provider when the edit skill is asked to prefer it.
- `hunyuan-3d` - Hunyuan 3D model creates 3D object models through FAL.
- `elevenlabs-sfx` - ElevenLabs sound effects model creates ambient and object-specific sounds.

3D model creation supports these Hunyuan parameters:

- `--face-count <40000-1500000>`: target face count. IMAGE-BLASTER defaults to `50000`; Hunyuan's API default is `500000`.
- `--enable-pbr true|false`: enable PBR material generation. Defaults to `true`.
- `--generate-type Normal|LowPoly|Geometry`: `Normal` creates a textured model, `LowPoly` applies polygon reduction, and `Geometry` creates a white geometry-only model. Defaults to `Normal`.
- `--polygon-type triangle|quadrilateral`: polygon type for `LowPoly`. Defaults to `triangle`.

### Examples

- Video game level concepts? `IMAGE-BLAST` it.
- Your childhood bedroom? `IMAGE-BLAST` it.
- Need an environment for a robot? `IMAGE-BLAST` it.
- A film location scout? `IMAGE-BLAST` it.
- An architectural rendering? `IMAGE-BLAST` it.

### Development

- remove `/app` from the `.claudeignore` file to give Claude the ability to change the React viewer.
