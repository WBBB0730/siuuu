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

- Inputs without their own `-o` are written into the output directory under their original name.
- Existing files are never overwritten — siuuu falls back to `name (n).ext`.
- `-f` is repeatable; with multiple `-f` each input is emitted once per format. When `-f` is given, `-o` provides the base name and the extension follows the format (e.g. `-o pic -f png -f webp` → `pic.png` + `pic.webp`).
- `-o` binds to the single input file right before it and cannot be applied to a directory input.
- Compression is fixed-quality: PNG high (quantize to ≤200 colors + oxipng), JPEG medium (mozjpeg 75), WebP high (libwebp 90).

## Examples

```bash
# Compress files into ./siuuu/ keeping original names
npx siuuu a.png b.jpg c.webp

# Recursively compress every image in a directory
npx siuuu photos/

# Convert everything to WebP
npx siuuu photos/ -f webp

# Emit each input in several formats at once
npx siuuu a.png -f png -f webp

# Per-file output names (-o binds to the preceding input)
npx siuuu a.png -o x.png b.png -o y.png

# Write outputs to a custom directory
npx siuuu imgs/ -d dist/
```
