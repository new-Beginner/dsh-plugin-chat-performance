import { readFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { defineConfig } from 'vitest/config'

const RAW_CSS_PREFIX = '\0test-raw-css:'
const RAW_CSS_SUFFIX = '.mjs'

export default defineConfig({
  plugins: [
    {
      name: 'test-raw-css',
      enforce: 'pre',
      resolveId(source: string, importer: string | undefined) {
        if (!source.endsWith('.css?raw')) return null
        const request = source.slice(0, -'?raw'.length)
        const file = importer === undefined ? request : resolve(dirname(importer), request)
        return RAW_CSS_PREFIX + file + RAW_CSS_SUFFIX
      },
      async load(virtualId: string) {
        if (!virtualId.startsWith(RAW_CSS_PREFIX) || !virtualId.endsWith(RAW_CSS_SUFFIX)) {
          return null
        }
        const file = virtualId.slice(RAW_CSS_PREFIX.length, -RAW_CSS_SUFFIX.length)
        return `export default ${JSON.stringify(await readFile(file, 'utf8'))};`
      },
    },
  ],
  test: {
    include: ['tests/**/*.spec.ts'],
    restoreMocks: true,
  },
})
