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

Outputs go to the output directory — `siuuu/` by default, or `-d <dir>` (use `-d .` for the current directory). Without `-o`, each file keeps its original name there and existing files are never overwritten (falls back to `name (n)`); `-o` sets the name within that directory. `-f` is repeatable — pass it several times to emit each input in multiple formats at once; when `-f` is given, `-o` provides the base name and the extension follows each format (e.g. `-o pic -f png -f webp` → `siuuu/pic.png` + `siuuu/pic.webp`).

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

## Skill

Teach your AI agent to use the `siuuu` CLI — install the bundled [skill](https://skills.sh) with [`npx skills`](https://github.com/vercel-labs/skills):

```bash
npx skills add WBBB0730/siuuu
```
