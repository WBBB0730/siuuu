#!/usr/bin/env node
import { createRequire } from 'node:module'
import { basename, extname, join, resolve } from 'node:path'
import { parseArgs } from 'node:util'

import { exists, formatSize, isDirectory, isInside, listImages, OUTPUT_EXTENSION, runBatch } from './batch'

import type { ImageFormat } from './types'

const require = createRequire(import.meta.url)
const pkg = require('../package.json') as { name: string, version: string }

const DEFAULT_OUT_DIR = 'siuuu-output'

const HELP = `${pkg.name} v${pkg.version} — 压缩 PNG / JPEG / WebP 图片

用法:
  npx ${pkg.name} <文件或目录...> [选项]

选项:
  -o, --out <文件名>     为紧邻的前一个输入单独指定输出文件名（可多次）
  -d, --out-dir <目录>   全局输出目录（默认：当前目录下的 ${DEFAULT_OUT_DIR}/）
  -f, --format <格式>    输出格式 png | jpeg | webp（默认与输入一致，不做转换）
  -h, --help             显示帮助
  -v, --version          显示版本

说明:
  传入目录时会递归压缩其中所有 PNG / JPEG / WebP，多文件时自动用多线程并行。
  未用 -o 单独命名的，按原文件名输出到输出目录；同名不覆盖，自动改用「名称 (n)」。
  指定 -f 后所有输出都转为该格式；-o 只决定文件名，不影响格式。
  压缩参数：PNG 高画质（量化 ≤200 色 + oxipng）、JPEG 中画质（mozjpeg 75）、WebP 高画质（libwebp 90）。

示例:
  npx ${pkg.name} a.png b.jpg                  # 压缩到 ${DEFAULT_OUT_DIR}/a.png、${DEFAULT_OUT_DIR}/b.jpg
  npx ${pkg.name} photos/ -f webp              # 递归压缩 photos/ 并全部转 webp
  npx ${pkg.name} a.png -o x.png b.png -o y.png # 分别指定输出文件名
  npx ${pkg.name} imgs/ -d dist/               # 输出到 dist/
`

function parseFormat(value: string): ImageFormat | undefined {
  const v = value.toLowerCase()
  if (v === 'png' || v === 'jpeg' || v === 'webp')
    return v
  if (v === 'jpg')
    return 'jpeg'
  return undefined
}

// 在输出目录里为 filename 找一个不冲突的路径，已占用则改用「名称 (n)」。
async function uniqueOutPath(dir: string, filename: string, used: Set<string>): Promise<string> {
  const ext = extname(filename)
  const base = basename(filename, ext)
  let candidate = join(dir, filename)
  let n = 1
  while (used.has(candidate) || await exists(candidate)) {
    candidate = join(dir, `${base} (${n})${ext}`)
    n++
  }
  used.add(candidate)
  return candidate
}

interface CliJob {
  source: string
  format?: ImageFormat
  // 通过紧跟其后的 -o 指定的单独输出文件名（按原样使用）。
  output?: string
}

async function main(): Promise<void> {
  let parsed
  try {
    parsed = parseArgs({
      allowPositionals: true,
      tokens: true,
      options: {
        'out': { type: 'string', short: 'o', multiple: true },
        'out-dir': { type: 'string', short: 'd' },
        'format': { type: 'string', short: 'f' },
        'help': { type: 'boolean', short: 'h' },
        'version': { type: 'boolean', short: 'v' },
      },
    })
  }
  catch (error) {
    console.error(`参数错误：${(error as Error).message}\n`)
    process.stdout.write(HELP)
    process.exitCode = 1
    return
  }

  const { values, positionals, tokens } = parsed
  if (values.version) {
    console.log(pkg.version)
    return
  }
  if (values.help || positionals.length === 0) {
    process.stdout.write(HELP)
    if (positionals.length === 0 && !values.help)
      process.exitCode = 1
    return
  }

  let format: ImageFormat | undefined
  if (values.format !== undefined) {
    format = parseFormat(values.format)
    if (!format) {
      console.error(`错误：不支持的格式「${values.format}」，可选 png / jpeg / webp`)
      process.exitCode = 1
      return
    }
  }

  const outDir = values['out-dir'] ?? DEFAULT_OUT_DIR

  // 按 token 顺序把每个 -o 绑定到它前面的那个输入。
  const specs: { input: string, output?: string }[] = []
  for (const token of tokens) {
    if (token.kind === 'positional') {
      specs.push({ input: token.value })
    }
    else if (token.kind === 'option' && token.name === 'out') {
      const last = specs[specs.length - 1]
      if (!last) {
        console.error('错误：-o 必须跟在某个输入文件之后')
        process.exitCode = 1
        return
      }
      last.output = token.value
    }
  }

  // 把文件 / 目录参数展开成任务列表；目录递归且跳过输出目录自身。
  const jobs: CliJob[] = []
  for (const spec of specs) {
    if (await isDirectory(spec.input)) {
      if (spec.output !== undefined) {
        console.error(`错误：目录输入 ${spec.input} 不能用 -o 指定单个输出文件名`)
        process.exitCode = 1
        return
      }
      for (const file of await listImages(spec.input)) {
        if (!isInside(file, resolve(outDir)))
          jobs.push({ source: file, format })
      }
    }
    else {
      jobs.push({ source: spec.input, format, output: spec.output })
    }
  }

  if (jobs.length === 0) {
    console.error('没有找到可压缩的图片')
    process.exitCode = 1
    return
  }

  const used = new Set<string>()
  let failed = 0
  await runBatch(jobs, {
    // -o 指定的文件名按原样使用；否则按原名 + 目标格式扩展名输出到 outDir，并避免覆盖。
    resolveOutPath: (job, fmt) => job.output
      ?? uniqueOutPath(outDir, `${basename(job.source, extname(job.source))}.${OUTPUT_EXTENSION[fmt]}`, used),
    onWritten: (job, { before, after, outPath }) => {
      const ratio = before > 0 ? Math.round((1 - after / before) * 100) : 0
      console.log(`${job.source}  ${formatSize(before)} → ${formatSize(after)}  (-${ratio}%)  → ${outPath}`)
    },
    onFailed: (job, message) => {
      failed++
      console.error(`${job.source}  失败：${message}`)
    },
  })

  if (failed > 0)
    process.exitCode = 1
}

main()
