import { basename, dirname, extname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

import { expandInputs, formatSize, isDirectory, OUTPUT_EXTENSION, runBatch } from '../src/batch'

import type { ImageFormat } from '../src/types'

const root = fileURLToPath(new URL('..', import.meta.url))
const INPUT_DIR = join(root, 'playground/input')
const OUTPUT_DIR = join(root, 'playground/output')

const FORMATS: ImageFormat[] = ['png', 'jpeg', 'webp']

interface PlayJob {
  source: string
  format: ImageFormat
  // 相对 INPUT_DIR 的去扩展名路径，用于在 OUTPUT_DIR 下保留子目录结构。
  stem: string
}

async function main(): Promise<void> {
  if (!(await isDirectory(INPUT_DIR))) {
    console.error(`找不到输入目录：${relative(root, INPUT_DIR)}`)
    process.exitCode = 1
    return
  }

  // 直接把 input 目录交给统一的展开逻辑，而不是手动遍历。
  const files = await expandInputs([INPUT_DIR])
  if (files.length === 0) {
    console.log(`${relative(root, INPUT_DIR)} 下没有可处理的图片（支持 png / jpg / webp）`)
    return
  }

  // 每张图 × 三种格式，作为一批一起并行压缩。
  const jobs: PlayJob[] = files.flatMap((source) => {
    const rel = relative(INPUT_DIR, source)
    const stem = join(dirname(rel), basename(rel, extname(rel)))
    return FORMATS.map(format => ({ source, format, stem }))
  })

  let failed = 0
  await runBatch(jobs, {
    resolveOutPath: (job, fmt) => join(OUTPUT_DIR, `${job.stem}.${OUTPUT_EXTENSION[fmt]}`),
    onWritten: (job, { before, after, outPath }) => {
      const ratio = before > 0 ? Math.round((1 - after / before) * 100) : 0
      const label = OUTPUT_EXTENSION[job.format].padEnd(4)
      console.log(`${relative(INPUT_DIR, job.source)}  → ${label} ${formatSize(after).padStart(9)}  (-${ratio}%)  ${relative(root, outPath)}`)
    },
    onFailed: (job, message) => {
      failed++
      console.error(`${relative(INPUT_DIR, job.source)}  → ${job.format} 失败：${message}`)
    },
  })

  if (failed > 0)
    process.exitCode = 1
}

main()
