import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    cli: 'src/cli.ts',
    worker: 'src/worker.ts',
  },
  platform: 'node',
  dts: {
    tsgo: true,
  },
  exports: true,
  // ...config options
})
