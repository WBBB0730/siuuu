# Siuuu

[![npm version](https://img.shields.io/npm/v/siuuu.svg)](https://www.npmjs.com/package/siuuu)

Compress images (PNG / JPEG / WebP) with WebAssembly codecs (imagequant + oxipng, mozjpeg, libwebp).

## Usage

```bash
npx siuuu <files or directories...> [options]
```

Options:

- `-o, --out <filename>` — output filename for the input right before it (repeatable)
- `-d, --out-dir <dir>` — output directory (default: `siuuu/` in the current directory)
- `-f, --format <format>` — output format: `png` / `jpeg` / `webp`; repeatable to emit several at once (default: same as input)
- `-h, --help` — show help
- `-v, --version` — show version

Inputs without an explicit `-o` are written to the output directory under their original name; existing files are never overwritten (falls back to `name (n)`). `-f` is repeatable — pass it several times to emit each input in multiple formats at once. When `-f` is given, `-o` provides the base name and the extension follows the format (e.g. `-o pic -f png -f webp` → `pic.png` + `pic.webp`).

## Examples

```bash
# Compress one or more files (default: ./siuuu/, original names)
npx siuuu a.png b.jpg c.webp

# Recursively compress all images in a directory
npx siuuu photos/

# Convert everything to WebP
npx siuuu photos/ -f webp

# Emit each input in several formats at once
npx siuuu a.png -f png -f webp

# Per-file output names (-o binds to the input before it)
npx siuuu a.png -o x.png b.png -o y.png

# Custom output directory
npx siuuu imgs/ -d dist/
```

## Skill

This repo ships an [agent skill](https://skills.sh) that teaches AI coding agents (Claude Code, Cursor, Codex, …) how to drive the `siuuu` CLI. Install it with [`npx skills`](https://github.com/vercel-labs/skills):

```bash
# Install into the current project
npx skills add WBBB0730/siuuu

# Or install globally (available across all projects)
npx skills add WBBB0730/siuuu --global
```

Preview the skills in this repo first with `npx skills add WBBB0730/siuuu --list`.
