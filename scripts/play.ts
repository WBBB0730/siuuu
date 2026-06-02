import { spawnSync } from 'node:child_process'
import { rmSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

// play 先 build（见 package.json）再用打包好的 dist/cli.mjs 跑一遍，确保看到的就是终端用户的真实输出。
const root = fileURLToPath(new URL('..', import.meta.url))
const cli = join(root, 'dist/cli.mjs')
const playground = join(root, 'playground')

// 清空输出目录：CLI 不覆盖已有文件，重复跑会堆「名称 (n)」。
rmSync(join(playground, 'output'), { recursive: true, force: true })

// 以 playground 为工作目录，传相对路径，用真实 CLI 一次性把每张图导出成 png / jpeg / webp。
const result = spawnSync(
  process.execPath,
  [cli, 'input', '-f', 'png', '-f', 'jpeg', '-f', 'webp', '-d', 'output'],
  { stdio: 'inherit', cwd: playground },
)
process.exit(result.status ?? 1)
