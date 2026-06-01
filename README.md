# Siuuu

[![npm version](https://img.shields.io/npm/v/siuuu.svg)](https://www.npmjs.com/package/siuuu)

Compress images (PNG / JPEG / WebP) with WebAssembly codecs (imagequant + oxipng, mozjpeg, libwebp).

## Usage

```bash
npx siuuu <files or directories...> [options]
```

Options:

- `-o, --out <filename>` — output filename for the input right before it (repeatable)
- `-d, --out-dir <dir>` — output directory (default: `siuuu-output/` in the current directory)
- `-f, --format <format>` — output format: `png` / `jpeg` / `webp` (default: same as input)
- `-h, --help` — show help
- `-v, --version` — show version

Inputs without an explicit `-o` are written to the output directory under their original name; existing files are never overwritten (falls back to `name (n)`). With `-f`, every output is converted to that format; `-o` only sets the filename, not the format.

## Examples

```bash
# Compress one or more files (default: ./siuuu-output/, original names)
npx siuuu a.png b.jpg c.webp

# Recursively compress all images in a directory
npx siuuu photos/

# Convert everything to WebP
npx siuuu photos/ -f webp

# Per-file output names (-o binds to the input before it)
npx siuuu a.png -o x.png b.png -o y.png

# Custom output directory
npx siuuu imgs/ -d dist/
```
