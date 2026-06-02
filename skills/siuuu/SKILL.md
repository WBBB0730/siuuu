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

Pass any mix of image files and directories. Directories are scanned at the top level for PNG / JPEG / WebP (pass `-r` to recurse into subdirectories); multiple inputs are processed in parallel.

## Options

| Option | Description |
| --- | --- |
| `-o, --out <filename>` | Output filename for the input immediately before it (repeatable). |
| `-d, --out-dir <dir>` | Output directory (default: `siuuu/` in the current directory). |
| `-f, --format <png\|jpeg\|webp>` | Output format; default keeps each input's format. `jpg` is treated as `jpeg`. Repeatable — pass several times to emit each input in multiple formats at once. |
| `-r, --recursive` | Recurse into subdirectories for directory inputs (default: top level only). |
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
npx siuuu a.png b.jpg c.webp  # → siuuu/a.png, siuuu/b.jpg, siuuu/c.webp

# Compress a folder, recursing into subfolders (omit -r for top level only)
npx siuuu photos/ -r  # → siuuu/<each image>, names flattened, original format

# Convert a directory to WebP and write it to a custom dir
npx siuuu photos/ -f webp -d dist/  # → dist/<each image>.webp

# Emit several formats at once (with -o, the extension follows each -f)
npx siuuu a.png -o pic -f png -f webp  # → siuuu/pic.png, siuuu/pic.webp

# Per-file output names (-o is a name inside the output dir)
npx siuuu a.png -o x.png b.png -o y.png  # → siuuu/x.png, siuuu/y.png
```
