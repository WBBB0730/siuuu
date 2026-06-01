#!/usr/bin/env node
import { createRequire } from 'node:module'
import { basename, dirname, extname, join, resolve } from 'node:path'
import { parseArgs } from 'node:util'

import pc from 'picocolors'

import { exists, formatSize, isDirectory, isInside, listImages, OUTPUT_EXTENSION, runBatch } from './batch'
import { t } from './i18n'

import type { ImageFormat } from './types'

const require = createRequire(import.meta.url)
const pkg = require('../package.json') as { name: string, version: string }

const DEFAULT_OUT_DIR = 'siuuu'

function help(): string {
  return t('help', { name: pkg.name, version: pkg.version, dir: DEFAULT_OUT_DIR })
}

function parseFormat(value: string): ImageFormat | undefined {
  const v = value.toLowerCase()
  if (v === 'png' || v === 'jpeg' || v === 'webp')
    return v
  if (v === 'jpg')
    return 'jpeg'
  return undefined
}

// 把路径的扩展名替换成 ext（保留目录与文件名主体）。
function withExt(p: string, ext: string): string {
  return join(dirname(p), `${basename(p, extname(p))}.${ext}`)
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
        'format': { type: 'string', short: 'f', multiple: true },
        'help': { type: 'boolean', short: 'h' },
        'version': { type: 'boolean', short: 'v' },
      },
    })
  }
  catch (error) {
    console.error(`${t('argError', { message: (error as Error).message })}\n`)
    process.stdout.write(`${help()}\n`)
    process.exitCode = 1
    return
  }

  const { values, positionals, tokens } = parsed
  if (values.version) {
    console.log(pkg.version)
    return
  }
  if (values.help || positionals.length === 0) {
    process.stdout.write(`${help()}\n`)
    if (positionals.length === 0 && !values.help)
      process.exitCode = 1
    return
  }

  // -f 可多次：解析、校验、去重；为空表示保持每个输入的原格式。
  const formats: ImageFormat[] = []
  for (const raw of values.format ?? []) {
    const f = parseFormat(raw)
    if (!f) {
      console.error(t('unsupportedFormat', { format: raw }))
      process.exitCode = 1
      return
    }
    if (!formats.includes(f))
      formats.push(f)
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
        console.error(t('outMustFollowInput'))
        process.exitCode = 1
        return
      }
      last.output = token.value
    }
  }

  // 把文件 / 目录参数展开成任务列表；指定多个 -f 时，每个输入按每种格式各生成一个任务。
  const jobs: CliJob[] = []
  const pushJobs = (source: string, output?: string): void => {
    if (formats.length === 0)
      jobs.push({ source, output })
    else
      for (const f of formats) jobs.push({ source, format: f, output })
  }
  for (const spec of specs) {
    if (await isDirectory(spec.input)) {
      if (spec.output !== undefined) {
        console.error(t('dirNoOut', { input: spec.input }))
        process.exitCode = 1
        return
      }
      for (const file of await listImages(spec.input)) {
        if (!isInside(file, resolve(outDir)))
          pushJobs(file)
      }
    }
    else {
      pushJobs(spec.input, spec.output)
    }
  }

  if (jobs.length === 0) {
    console.error(t('noImages'))
    process.exitCode = 1
    return
  }

  // 美化输出：开头一行标题，逐个文件流式打印（文件映射在前），结尾汇总。
  process.stdout.write(`\n${pc.bold(pkg.name)} ${pc.dim(`v${pkg.version}`)}\n\n`)

  const used = new Set<string>()
  // 文件映射列对齐宽度：按各输入名估一个稳定列宽，过长的名字自然溢出。
  const mapWidth = Math.min(60, Math.max(20, jobs.reduce((m, j) => Math.max(m, j.source.length), 0) + 16))
  let okCount = 0
  let failCount = 0
  let totalBefore = 0
  let totalAfter = 0

  await runBatch(jobs, {
    // -o 指定的文件名按原样使用；否则按原名 + 目标格式扩展名输出到 outDir，并避免覆盖。
    // 指定了 -f（job.format 有值）时，-o 文件名改用该格式的扩展名；否则 -o 原样使用，无 -o 则按原名输出到 outDir 并去重。
    resolveOutPath: (job, fmt) => {
      if (job.output !== undefined)
        return job.format !== undefined ? withExt(job.output, OUTPUT_EXTENSION[fmt]) : job.output
      return uniqueOutPath(outDir, `${basename(job.source, extname(job.source))}.${OUTPUT_EXTENSION[fmt]}`, used)
    },
    onWritten: (job, { before, after, outPath }) => {
      okCount++
      totalBefore += before
      totalAfter += after
      const ratio = before > 0 ? Math.round((1 - after / before) * 100) : 0
      const mapping = `${job.source} → ${outPath}`
      const pad = ' '.repeat(Math.max(2, mapWidth - mapping.length))
      const sizes = `${formatSize(before)} ${pc.dim('→')} ${formatSize(after)}`
      const ratioText = ratio >= 0 ? pc.green(`-${ratio}%`) : pc.yellow(`+${-ratio}%`)
      console.log(`  ${pc.green('✓')} ${job.source} ${pc.dim('→')} ${pc.cyan(outPath)}${pad}${sizes}   ${ratioText}`)
    },
    onFailed: (job, message) => {
      failCount++
      console.error(`  ${pc.red('✗')} ${job.source}   ${pc.red(message)}`)
    },
  })

  const percent = totalBefore > 0 ? Math.round((1 - totalAfter / totalBefore) * 100) : 0
  const summary = t('summary', {
    files: jobs.length,
    ok: pc.green(String(okCount)),
    failed: failCount > 0 ? pc.red(String(failCount)) : '0',
    percent,
    before: formatSize(totalBefore),
    after: formatSize(totalAfter),
  })
  console.log(`\n  ${summary}`)

  if (failCount > 0)
    process.exitCode = 1
}

main()
