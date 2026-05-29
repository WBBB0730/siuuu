import { readFile } from 'node:fs/promises'
import { parentPort } from 'node:worker_threads'

import { compress } from './index'

import type { ImageFormat } from './types'

interface Task {
  id: number
  source: string
  format?: ImageFormat
}

const port = parentPort
if (!port)
  throw new Error('worker.ts 必须在 worker 线程中运行')

// 读取并压缩单张图片，把结果（连同原始大小）回传主线程；buffer 用 transfer 避免拷贝。
port.on('message', async (task: Task) => {
  try {
    const data = await readFile(task.source)
    const result = await compress(new Uint8Array(data), { format: task.format })
    const view = result.data
    const buffer = (view.buffer as ArrayBuffer).slice(view.byteOffset, view.byteOffset + view.byteLength)
    port.postMessage({ id: task.id, ok: true, format: result.format, before: data.length, data: buffer }, [buffer])
  }
  catch (error) {
    port.postMessage({ id: task.id, ok: false, error: (error as Error).message })
  }
})
