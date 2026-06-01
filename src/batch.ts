import { mkdir, readdir, readFile, stat, writeFile } from 'node:fs/promises'
import * as os from 'node:os'
import { dirname, extname, isAbsolute, join, relative, resolve } from 'node:path'
import { Worker } from 'node:worker_threads'

import { compress } from './index'
import { t } from './i18n'

import type { ImageFormat } from './types'

export const IMAGE_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.webp'])
export const OUTPUT_EXTENSION: Record<ImageFormat, string> = { png: 'png', jpeg: 'jpg', webp: 'webp' }

export function formatSize(bytes: number): string {
  if (bytes < 1024)
    return `${bytes} B`
  if (bytes < 1024 * 1024)
    return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`
}

export function isImage(path: string): boolean {
  return IMAGE_EXTENSIONS.has(extname(path).toLowerCase())
}

export async function isDirectory(path: string): Promise<boolean> {
  try {
    return (await stat(path)).isDirectory()
  }
  catch {
    return false
  }
}

export async function exists(path: string): Promise<boolean> {
  try {
    await stat(path)
    return true
  }
  catch {
    return false
  }
}

// file 是否位于 dir 之内（含相等）。
export function isInside(file: string, dir: string): boolean {
  const rel = relative(resolve(dir), resolve(file))
  return rel === '' || (!rel.startsWith('..') && !isAbsolute(rel))
}

// 递归列出目录下所有图片。
export async function listImages(dir: string): Promise<string[]> {
  const names = await readdir(dir, { recursive: true })
  return names
    .filter(name => isImage(name))
    .map(name => join(dir, name))
    .sort()
}

// 把文件 / 目录参数展开成图片文件列表，跳过位于 excludeDir 内的文件。
export async function expandInputs(inputs: string[], excludeDir?: string): Promise<string[]> {
  const files: string[] = []
  for (const input of inputs) {
    if (await isDirectory(input)) {
      for (const file of await listImages(input)) {
        if (!excludeDir || !isInside(file, excludeDir))
          files.push(file)
      }
    }
    else {
      files.push(input)
    }
  }
  return files
}

interface WorkerResult {
  id: number
  ok: boolean
  format?: ImageFormat
  before?: number
  data?: ArrayBuffer
  error?: string
}

export interface BatchJob {
  source: string
  // 目标输出格式，undefined 表示与输入一致（不转换）。
  format?: ImageFormat
}

export interface BatchHandlers<J extends BatchJob> {
  // 由调用方决定每个任务的输出路径（在主线程串行调用，可安全做去重 / 不覆盖等）。
  resolveOutPath: (job: J, format: ImageFormat) => string | Promise<string>
  onWritten?: (job: J, info: { before: number, after: number, outPath: string }) => void
  onFailed?: (job: J, message: string) => void
  concurrency?: number
}

// 同一份逻辑下，dist 用 ./worker.mjs，tsx 跑源码时用 ./worker.ts。
const workerUrl = new URL(import.meta.url.endsWith('.ts') ? './worker.ts' : './worker.mjs', import.meta.url)

interface WorkerTask {
  id: number
  source: string
  format?: ImageFormat
}

// 把 worker 的一次「请求 — 应答」包装成 Promise：正常应答即 resolve；
// worker 抛错或异常退出（OOM 被杀、原生崩溃等）则 reject，由调用方就地重建 worker 或交主线程兜底。
function compressOnWorker(worker: Worker, task: WorkerTask): Promise<WorkerResult> {
  return new Promise((resolve, reject) => {
    const cleanup = (): void => {
      worker.off('message', onMessage)
      worker.off('error', onError)
      worker.off('exit', onExit)
    }
    const onMessage = (msg: WorkerResult): void => { cleanup(); resolve(msg) }
    const onError = (error: Error): void => { cleanup(); reject(error) }
    const onExit = (code: number): void => { cleanup(); reject(new Error(t('workerExit', { code }))) }
    worker.on('message', onMessage)
    worker.on('error', onError)
    worker.on('exit', onExit)
    worker.postMessage(task)
  })
}

// 并行压缩一批图片：解码/编码在 worker 线程并行执行，命名 / 写盘仍由主线程按完成顺序串行处理（避免竞态）。
// 单个 worker 崩溃（OOM 被杀、原生崩溃等）只会让那一张失败并就地重建 worker，整池永不中断；
// 若环境根本不支持 worker，未完成的任务自动落到主线程串行兜底——这也是 concurrency ≤ 1 的默认路径。
export async function runBatch<J extends BatchJob>(jobs: J[], handlers: BatchHandlers<J>): Promise<void> {
  const done = new Set<number>()

  // 写出单个结果文件并触发 onWritten；worker 与主线程两条路径都经此持久化。
  const persist = async (id: number, format: ImageFormat, data: Uint8Array, before: number): Promise<void> => {
    const outPath = await handlers.resolveOutPath(jobs[id], format)
    await mkdir(dirname(outPath), { recursive: true })
    await writeFile(outPath, data)
    handlers.onWritten?.(jobs[id], { before, after: data.length, outPath })
  }

  // resolveOutPath / writeFile 必须串行（去重、不覆盖），用一条 Promise 链把所有结果按完成顺序串起来；
  // run 抛错即视为该任务失败转交 onFailed，完成后记入 done 供主线程兜底时跳过。
  let writes: Promise<void> = Promise.resolve()
  const write = (id: number, run: () => Promise<void>): Promise<void> => {
    writes = writes.then(async () => {
      try {
        await run()
      }
      catch (error) {
        handlers.onFailed?.(jobs[id], (error as Error).message)
      }
      done.add(id)
    })
    return writes
  }

  // worker 池：所有 worker 共享游标领任务，压一张回传一张；崩溃则就地重建、只让那一张失败，整池不中断。
  // 传 execArgv 让 worker 继承当前运行环境（如 tsx 的 TS 加载器），dist 与 tsx 下都能工作。
  const spawn = (): Worker => new Worker(workerUrl, { execArgv: process.execArgv })
  let next = 0
  let proven = false // 是否有 worker 成功产出过结果——以此区分「环境不支持」与「单张图压崩了 worker」
  const consume = async (): Promise<void> => {
    let worker: Worker | null = null
    for (let id = next++; id < jobs.length; id = next++) {
      if (!worker) {
        try {
          worker = spawn()
        }
        catch {
          return // 连 worker 都创建不出来：把这些任务留给主线程兜底
        }
      }
      try {
        const result = await compressOnWorker(worker, { id, source: jobs[id].source, format: jobs[id].format })
        proven = true
        await write(id, () => result.ok
          ? persist(id, result.format!, new Uint8Array(result.data!), result.before!)
          : Promise.reject(new Error(result.error)))
      }
      catch (crash) {
        await worker.terminate().catch(() => {})
        worker = null
        if (!proven)
          return // 还没有任何 worker 成功过 → 判定环境不支持 worker，留给主线程兜底
        // 环境已被证明可用 → 归因于这张图：标记失败，但不在主线程重试（原生崩溃可能波及主进程）。
        await write(id, () => Promise.reject(crash as Error))
      }
    }
    await worker?.terminate().catch(() => {})
  }

  // 主线程串行压缩所有尚未完成的任务：concurrency ≤ 1 时是全部，并行时仅是 worker 没能覆盖的余量。
  const runOnMain = async (): Promise<void> => {
    for (let id = 0; id < jobs.length; id++) {
      if (done.has(id))
        continue
      await write(id, async () => {
        const data = await readFile(jobs[id].source)
        const result = await compress(new Uint8Array(data), { format: jobs[id].format })
        await persist(id, result.format, result.data, data.length)
      })
    }
  }

  const parallelism = os.availableParallelism?.() ?? os.cpus().length
  const concurrency = handlers.concurrency ?? Math.min(jobs.length, Math.max(1, parallelism))
  if (concurrency > 1) {
    await Promise.all(Array.from({ length: concurrency }, consume))
    await writes.catch(() => {})
    const leftover = jobs.length - done.size
    if (leftover > 0)
      console.warn(t('parallelFallback', { count: leftover }))
  }
  await runOnMain()
}
