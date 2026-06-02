---
name: siuuu
description: Use the `siuuu` command-line tool to compress and convert PNG / JPEG / WebP images via WebAssembly codecs (imagequant + oxipng, mozjpeg, libwebp). Use this skill whenever the user wants to compress, shrink, optimize, or batch-convert image files from the terminal — e.g. "compress these PNGs", "make this image smaller", "convert a folder of images to WebP", or any request to reduce image file size or change an image's format on disk.
---

# siuuu

Compress and convert PNG / JPEG / WebP images from the command line using WebAssembly codecs. No install step needed — run it with `npx`. Requires Node.js >= 20.

## Run

```bash
npx siuuu <files or directories...> [options]
```

Pass any mix of image files and directories. Directories are scanned recursively for PNG / JPEG / WebP; multiple inputs are processed in parallel.

## Options

| Option | Description |
| --- | --- |
| `-o, --out <filename>` | Output filename for the input immediately before it (repeatable). |
| `-d, --out-dir <dir>` | Output directory (default: `siuuu/` in the current directory). |
| `-f, --format <png\|jpeg\|webp>` | Output format; default keeps each input's format. `jpg` is treated as `jpeg`. Repeatable — pass several times to emit each input in multiple formats at once. |
| `-h, --help` | Show help. |
| `-v, --version` | Show version. |

## Behavior

- Outputs go to the output directory — `siuuu/` by default, or `-d <dir>` (use `-d .` for the current directory). Without `-o`, each input keeps its original name there; `-o` only sets the name within that directory.
- Existing files are never overwritten — siuuu falls back to `name (n).ext`.
- `-f` is repeatable; with multiple `-f` each input is emitted once per format. When `-f` is given, `-o` provides the base name and the extension follows the format (e.g. `-o pic -f png -f webp` → `siuuu/pic.png` + `siuuu/pic.webp`).
- `-o` binds to the single input file right before it and cannot be applied to a directory input.
- Compression is fixed-quality: PNG high (quantize to ≤200 colors + oxipng), JPEG medium (mozjpeg 75), WebP high (libwebp 90).

## Examples

```bash
# Keep each input's original format (default output dir: siuuu/)
npx siuuu a.png b.jpg c.webp
# → siuuu/a.png, siuuu/b.jpg, siuuu/c.webp

# Recursively compress a directory (names are flattened into the output dir)
npx siuuu photos/
# → siuuu/<each image>, same format as the source

# Convert everything to WebP
npx siuuu photos/ -f webp
# → siuuu/<each image>.webp

# Emit each input in several formats at once
npx siuuu a.png -f png -f webp
# → siuuu/a.png, siuuu/a.webp

# With -f, -o sets the base name and the extension follows each format
npx siuuu a.png -o pic -f png -f webp
# → siuuu/pic.png, siuuu/pic.webp

# Per-file output names (-o is a name inside the output dir)
npx siuuu a.png -o x.png b.png -o y.png
# → siuuu/x.png, siuuu/y.png

# Custom output directory
npx siuuu imgs/ -d dist/
# → dist/<each image>, same format as the source
```
