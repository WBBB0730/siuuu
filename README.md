# Siuuu

[![npm version](https://img.shields.io/npm/v/siuuu.svg)](https://www.npmjs.com/package/siuuu)

Compress images (PNG / JPEG / WebP) with WebAssembly codecs (imagequant + oxipng, mozjpeg, libwebp).

## Usage

```bash
npx siuuu <files or directories...> [options]
```

Options:

- `-o, --out <filename>` — output filename for the input right before it (repeatable)
- `-d, --out-dir <dir>` — output directory (default: `siuuu/`; use `.` for the current directory)
- `-f, --format <format>` — output format: `png` / `jpeg` / `webp`; repeatable to emit several at once (default: same as input)
- `-r, --recursive` — recurse into subdirectories for directory inputs
- `-h, --help` — show help
- `-v, --version` — show version

Same-name outputs are never overwritten — they fall back to `name (n)`.

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

## Skill

Install the agent [skill](https://skills.sh) for the `siuuu` CLI:

```bash
npx skills add WBBB0730/siuuu
```
