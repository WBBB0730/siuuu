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
  help: `{{name}} v{{version}} — compress and convert PNG / JPEG / WebP images

Usage:
  npx {{name}} <files or directories...> [options]

Options:
  -o, --out <filename>   output filename for the input right before it (repeatable)
  -d, --out-dir <dir>    output directory (default: {{dir}}/; use . for the current directory)
  -f, --format <format>  output format: png / jpeg (jpg) / webp; repeatable to emit several at once (default: same as input)
  -q, --quality <0-100>  output quality for every format (default: PNG 85, JPEG 75, WebP 90)
  -r, --recursive        recurse into subdirectories for directory inputs
  -h, --help             show help
  -v, --version          show version

Examples:
  npx {{name}} a.png b.jpg c.webp           # keep original format → {{dir}}/a.png, b.jpg, c.webp
  npx {{name}} photos/ -r                   # recurse into subfolders
  npx {{name}} photos/ -f webp -d dist/     # convert a folder to webp into dist/
  npx {{name}} a.png -o pic -f png -f webp  # emit several formats → {{dir}}/pic.png, pic.webp
  npx {{name}} a.png -q 60                  # set quality (0–100)
  npx {{name}} a.png -o x.png b.png -o y.png # per-file output names

Behavior:
  Directories are scanned at the top level only; pass -r to recurse.
  With -f, -o sets only the base name — the extension follows the format.`,
  argError: 'Argument error: {{message}}',
  unsupportedFormat: 'Error: unsupported format "{{format}}", choose png / jpeg / webp',
  invalidQuality: 'Error: invalid quality "{{value}}", expected a number (0–100)',
  outMustFollowInput: 'Error: -o must follow an input file',
  dirNoOut: 'Error: directory input {{input}} cannot take a single output name via -o',
  noImages: 'No images found to compress',
  summary: '{{files}} files · {{ok}} ok · {{failed}} failed · saved {{percent}}% ({{before}} → {{after}})',
  unrecognizedFormat: 'Unrecognized image format; only PNG / JPEG / WebP are supported',
  workerExit: 'Worker exited unexpectedly (code {{code}})',
  parallelFallback: 'Parallel compression unavailable; fell back to serial processing for {{count}} image(s)',
}

const zh: typeof en = {
  help: `{{name}} v{{version}} — 压缩并转换 PNG / JPEG / WebP 图片

用法:
  npx {{name}} <文件或目录...> [选项]

选项:
  -o, --out <文件名>     为紧邻的前一个输入单独指定输出文件名（可多次）
  -d, --out-dir <目录>   输出目录（默认：当前目录下的 {{dir}}/，用 . 表示当前目录）
  -f, --format <格式>    输出格式 png / jpeg (jpg) / webp，可重复指定一次导出多种（默认与输入一致）
  -q, --quality <0-100>  所有格式的输出画质（默认：PNG 85、JPEG 75、WebP 90）
  -r, --recursive        目录输入时递归子目录
  -h, --help             显示帮助
  -v, --version          显示版本

示例:
  npx {{name}} a.png b.jpg c.webp           # 保持原格式 → {{dir}}/a.png、b.jpg、c.webp
  npx {{name}} photos/ -r                   # 递归压缩子目录
  npx {{name}} photos/ -f webp -d dist/     # 把目录转 webp 输出到 dist/
  npx {{name}} a.png -o pic -f png -f webp  # 一次导出 pic.png 和 pic.webp
  npx {{name}} a.png -q 60                  # 以画质 60 压缩（0–100）
  npx {{name}} a.png -o x.png b.png -o y.png # 分别指定输出文件名

说明:
  目录输入只压缩顶层，加 -r 才递归子目录。
  指定 -f 时，-o 只决定基础文件名，扩展名跟随格式。`,
  argError: '参数错误：{{message}}',
  unsupportedFormat: '错误：不支持的格式「{{format}}」，可选 png / jpeg / webp',
  invalidQuality: '错误：无效的画质「{{value}}」，应为数字（0–100）',
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
