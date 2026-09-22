import { readFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import type { UserConfig } from 'tsdown'

const PACKAGE_NAME = 'dsh-plugin-chat-performance'
const RAW_CSS_SUFFIX = '.css?raw'
const RAW_CSS_PREFIX = '\0dsh-chat-performance-css:'
const RAW_CSS_VIRTUAL_SUFFIX = '.mjs'

function rawCssPlugin() {
  return {
    name: 'dsh-chat-performance-raw-css',
    resolveId(source: string, importer: string | undefined) {
      if (!source.endsWith(RAW_CSS_SUFFIX)) return null
      const request = source.slice(0, -'?raw'.length)
      const file = importer === undefined ? request : resolve(dirname(importer), request)
      return RAW_CSS_PREFIX + file + RAW_CSS_VIRTUAL_SUFFIX
    },
    async load(virtualId: string) {
      if (!virtualId.startsWith(RAW_CSS_PREFIX) || !virtualId.endsWith(RAW_CSS_VIRTUAL_SUFFIX)) {
        return null
      }
      const file = virtualId.slice(RAW_CSS_PREFIX.length, -RAW_CSS_VIRTUAL_SUFFIX.length)
      this.addWatchFile(file)
      const css = await readFile(file, 'utf8')
      return `export default ${JSON.stringify(css)};`
    },
  }
}

const config: UserConfig[] = [
  {
    name: PACKAGE_NAME,
    entry: ['src/index.ts'],
    outDir: 'lib',
    format: 'esm',
    platform: 'node',
    target: 'es2024',
    fixedExtension: false,
    dts: false,
    clean: false,
  },
  {
    name: `${PACKAGE_NAME}/client`,
    entry: { client: 'src/client/index.ts' },
    outDir: 'lib',
    format: 'cjs',
    platform: 'browser',
    target: 'es2022',
    dts: false,
    sourcemap: true,
    clean: false,
    deps: {
      neverBundle: ['react', 'react/jsx-runtime'],
    },
    plugins: [rawCssPlugin()],
    outputOptions: {
      entryFileNames: 'client.js',
      banner: `window.__ModuleLoader__.load({ id: ${JSON.stringify(PACKAGE_NAME)}, factory: (require) => {`,
      footer: 'return module.exports; } });',
      intro: 'var module = { exports: {} }; var exports = module.exports;',
    },
  },
]

export default config
