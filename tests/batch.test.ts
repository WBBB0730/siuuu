import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { basename, join } from 'node:path'

import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { detectFormat } from '../src'
import { runBatch } from '../src/batch'
import { encode } from '../src/codecs'

import type { RawImage } from '../src/types'

function gradient(width = 32, height = 32): RawImage {
  const data = new Uint8ClampedArray(width * height * 4)
  for (let i = 0; i < data.length; i += 4) {
    data[i] = i % 256
    data[i + 1] = (i * 3) % 256
    data[i + 2] = (i * 7) % 256
    data[i + 3] = 255
  }
  return { data, width, height }
}

describe('runBatch', () => {
  let dir: string
  let png: string
  let jpeg: string
  let webp: string
  let broken: string

  beforeAll(async () => {
    dir = await mkdtemp(join(tmpdir(), 'siuuu-batch-'))
    png = join(dir, 'a.png')
    jpeg = join(dir, 'b.jpg')
    webp = join(dir, 'c.webp')
    broken = join(dir, 'bad.png')
    const raw = gradient()
    await writeFile(png, await encode(raw, 'png'))
    await writeFile(jpeg, await encode(raw, 'jpeg'))
    await writeFile(webp, await encode(raw, 'webp'))
    await writeFile(broken, new Uint8Array([1, 2, 3, 4]))
  })

  afterAll(async () => {
    await rm(dir, { recursive: true, force: true })
  })

  it('压缩整批图片，逐个写出且仍是有效图片', async () => {
    const jobs = [{ source: png }, { source: jpeg }, { source: webp }]
    const written = new Map<string, { before: number, after: number, outPath: string }>()
    // resolveOutPath 必须由主线程串行调用，这里检测是否出现并发重入。
    let inFlight = 0
    let maxInFlight = 0

    await runBatch(jobs, {
      concurrency: 2,
      resolveOutPath: async (job) => {
        inFlight++
        maxInFlight = Math.max(maxInFlight, inFlight)
        await Promise.resolve()
        inFlight--
        return join(dir, 'out', basename(job.source))
      },
      onWritten: (job, info) => {
        written.set(job.source, info)
      },
    })

    expect(written.size).toBe(3)
    expect(maxInFlight).toBe(1)
    for (const job of jobs) {
      const info = written.get(job.source)!
      expect(info.before).toBeGreaterThan(0)
      const data = await readFile(info.outPath)
      expect(data.length).toBeGreaterThan(0)
      expect(detectFormat(new Uint8Array(data))).toBeDefined()
    }
  })

  it('单张无法解码时调用 onFailed，且不影响其余图片', async () => {
    const jobs = [{ source: png }, { source: broken }, { source: webp }]
    const ok: string[] = []
    const failed: { source: string, message: string }[] = []

    await runBatch(jobs, {
      concurrency: 2,
      resolveOutPath: job => join(dir, 'out-fail', basename(job.source)),
      onWritten: job => ok.push(job.source),
      onFailed: (job, message) => failed.push({ source: job.source, message }),
    })

    expect(ok.toSorted()).toEqual([png, webp].toSorted())
    expect(failed).toHaveLength(1)
    expect(failed[0].source).toBe(broken)
    expect(failed[0].message).toBeTruthy()
  })

  it('concurrency 为 1 时串行处理，结果与并行一致', async () => {
    const jobs = [{ source: png }, { source: jpeg }]
    const ok: string[] = []

    await runBatch(jobs, {
      concurrency: 1,
      resolveOutPath: job => join(dir, 'out-serial', basename(job.source)),
      onWritten: job => ok.push(job.source),
    })

    expect(ok.toSorted()).toEqual([png, jpeg].toSorted())
  })
})
