import { execSync } from 'node:child_process'

import i18next from 'i18next'

export type Lang = 'en' | 'zh'

function run(cmd: string): string {
  try {
    return execSync(cmd, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], timeout: 1000 }).trim()
  }
  catch {
    return ''
  }
}

// 读取操作系统的界面语言（设备系统语言，而非 shell 的 locale）。
function systemLocale(): string {
  if (process.platform === 'darwin') {
    // macOS 首选语言列表，如 ("zh-Hans-CN")；首项才是系统界面语言（AppleLocale 只是区域格式）。
    const matched = run('defaults read -g AppleLanguages').match(/[A-Za-z]{2,3}(?:-[A-Za-z0-9]+)*/)
    if (matched)
      return matched[0]
  }
  else if (process.platform === 'win32') {
    // Windows 用户界面语言，如 zh-CN。
    const ui = run('powershell -NoProfile -Command "(Get-UICulture).Name"')
    if (ui)
      return ui
  }
  // Linux 及兜底：系统语言由 locale 环境变量表达，再退到 Intl。
  const env = process.env.LC_ALL || process.env.LC_MESSAGES || process.env.LANG
  if (env)
    return env
  try {
    return Intl.DateTimeFormat().resolvedOptions().locale
  }
  catch {
    return ''
  }
}

// 探测一次并缓存到环境变量：worker 线程继承父进程 env，避免每个 worker 重复探测系统语言。
function detectLang(): Lang {
  const cached = process.env.SIUUU_RESOLVED_LANG
  if (cached === 'zh' || cached === 'en')
    return cached
  const result: Lang = systemLocale().toLowerCase().split(/[-_]/)[0] === 'zh' ? 'zh' : 'en'
  process.env.SIUUU_RESOLVED_LANG = result
  return result
}

export const lang: Lang = detectLang()

const en = {
  help: `{{name}} v{{version}} — compress PNG / JPEG / WebP images

Usage:
  npx {{name}} <files or directories...> [options]

Options:
  -o, --out <filename>   output filename for the input right before it (repeatable)
  -d, --out-dir <dir>    output directory (default: {{dir}}/ in the current directory)
  -f, --format <format>  output format: png | jpeg | webp; repeatable to emit several at once (default: same as input)
  -r, --recursive        recurse into subdirectories for directory inputs
  -h, --help             show help
  -v, --version          show version

Details:
  Directory inputs are scanned at the top level for PNG / JPEG / WebP; pass -r to recurse. Multiple files run in parallel.
  Inputs without -o keep their original name in the output directory; existing files are never overwritten (falls back to "name (n)").
  With -f every output is converted to that format; -o only sets the filename, not the format.
  Compression: PNG high (quantize ≤200 colors + oxipng), JPEG medium (mozjpeg 75), WebP high (libwebp 90).

Examples:
  npx {{name}} a.png b.jpg                  # compress into {{dir}}/a.png, {{dir}}/b.jpg
  npx {{name}} photos/ -f webp              # recursively compress photos/ and convert all to webp
  npx {{name}} a.png -f png -f webp         # emit both a.png and a.webp at once
  npx {{name}} a.png -o x.png b.png -o y.png # set output filenames individually
  npx {{name}} imgs/ -d dist/               # write outputs to dist/`,
  argError: 'Argument error: {{message}}',
  unsupportedFormat: 'Error: unsupported format "{{format}}", choose png / jpeg / webp',
  outMustFollowInput: 'Error: -o must follow an input file',
  dirNoOut: 'Error: directory input {{input}} cannot take a single output name via -o',
  noImages: 'No images found to compress',
  summary: '{{files}} files · {{ok}} ok · {{failed}} failed · saved {{percent}}% ({{before}} → {{after}})',
  unrecognizedFormat: 'Unrecognized image format; only PNG / JPEG / WebP are supported',
  workerExit: 'Worker exited unexpectedly (code {{code}})',
  parallelFallback: 'Parallel compression unavailable; fell back to serial processing for {{count}} image(s)',
}

const zh: typeof en = {
  help: `{{name}} v{{version}} — 压缩 PNG / JPEG / WebP 图片

用法:
  npx {{name}} <文件或目录...> [选项]

选项:
  -o, --out <文件名>     为紧邻的前一个输入单独指定输出文件名（可多次）
  -d, --out-dir <目录>   全局输出目录（默认：当前目录下的 {{dir}}/）
  -f, --format <格式>    输出格式 png | jpeg | webp，可重复指定一次导出多种（默认与输入一致）
  -r, --recursive        目录输入时递归子目录
  -h, --help             显示帮助
  -v, --version          显示版本

说明:
  传入目录时只压缩顶层的 PNG / JPEG / WebP，加 -r 才递归子目录；多文件时自动多线程并行。
  未用 -o 单独命名的，按原文件名输出到输出目录；同名不覆盖，自动改用「名称 (n)」。
  指定 -f 后所有输出都转为该格式；-o 只决定文件名，不影响格式。
  压缩参数：PNG 高画质（量化 ≤200 色 + oxipng）、JPEG 中画质（mozjpeg 75）、WebP 高画质（libwebp 90）。

示例:
  npx {{name}} a.png b.jpg                  # 压缩到 {{dir}}/a.png、{{dir}}/b.jpg
  npx {{name}} photos/ -f webp              # 递归压缩 photos/ 并全部转 webp
  npx {{name}} a.png -f png -f webp         # 同时导出 a.png 和 a.webp
  npx {{name}} a.png -o x.png b.png -o y.png # 分别指定输出文件名
  npx {{name}} imgs/ -d dist/               # 输出到 dist/`,
  argError: '参数错误：{{message}}',
  unsupportedFormat: '错误：不支持的格式「{{format}}」，可选 png / jpeg / webp',
  outMustFollowInput: '错误：-o 必须跟在某个输入文件之后',
  dirNoOut: '错误：目录输入 {{input}} 不能用 -o 指定单个输出文件名',
  noImages: '没有找到可压缩的图片',
  summary: '{{files}} 个文件 · {{ok}} 成功 · {{failed}} 失败 · 节省 {{percent}}%（{{before}} → {{after}}）',
  unrecognizedFormat: '无法识别的图片格式，仅支持 PNG / JPEG / WebP',
  workerExit: 'worker 异常退出（code {{code}}）',
  parallelFallback: '并行压缩不可用，已回退主线程串行处理 {{count}} 张',
}

// initAsync: false 让 i18next 在 import 时同步完成初始化，使 t 在主进程与 worker 线程中都能即取即用。
void i18next.init({
  lng: lang,
  fallbackLng: 'en',
  initAsync: false,
  resources: { en: { translation: en }, zh: { translation: zh } },
  interpolation: { escapeValue: false }, // CLI 文本，不做 HTML 转义
})

export function t(key: keyof typeof en, params?: Record<string, unknown>): string {
  return i18next.t(key, params) as string
}
