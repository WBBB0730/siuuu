# Siuuu

[![npm version](https://img.shields.io/npm/v/siuuu.svg)](https://www.npmjs.com/package/siuuu)

A CLI to compress and convert PNG / JPEG / WebP images. Requires Node.js >= 20.

## Features

- High-quality compression that keeps files small
- No install needed — can run straight from `npx`
- Compress or convert between PNG / JPEG / WebP
- Parallel batch processing, at adjustable quality

## Usage

```bash
npx siuuu <files or directories...> [options]
```

## Options

- `-o, --out <filename>` — output filename for the input right before it (repeatable)
- `-d, --out-dir <dir>` — output directory (default: `siuuu/`; use `.` for the current directory)
- `-f, --format <format>` — output format: `png` / `jpeg` (`jpg`) / `webp`; repeatable to emit several at once (default: same as input)
- `-q, --quality <0-100>` — output quality for every format (default: PNG 85, JPEG 75, WebP 90)
- `-r, --recursive` — recurse into subdirectories for directory inputs
- `-h, --help` — show help
- `-v, --version` — show version

## Examples

```bash
# Keep each input's original format (default output dir: siuuu/)
npx siuuu a.png b.jpg c.webp  # → siuuu/a.png, siuuu/b.jpg, siuuu/c.webp

# Compress a folder, recursing into subfolders (omit -r for top level only)
npx siuuu photos/ -r  # → siuuu/<each image>, names flattened, original format

# Convert a directory to WebP and write it to a custom dir
npx siuuu photos/ -f webp -d dist/  # → dist/<each image>.webp

# Emit several formats at once (with -o, the extension follows each -f)
npx siuuu a.png -o pic -f png -f webp  # → siuuu/pic.png, siuuu/pic.webp

# Set output quality (0–100, applies to every format)
npx siuuu a.png -q 60  # → siuuu/a.png at quality 60

# Per-file output names (-o is a name inside the output dir)
npx siuuu a.png -o x.png b.png -o y.png  # → siuuu/x.png, siuuu/y.png
```

## Behavior

- Directories are scanned at the top level only; pass `-r` to recurse.
- With `-f`, `-o` sets only the base name — the extension follows the format.

## Skill

Install the agent [skill](https://skills.sh) for the `siuuu` CLI:

```bash
npx skills add WBBB0730/siuuu
```
