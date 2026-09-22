import { readFile } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'

describe('DSH package contract', () => {
  it('declares a web client and reversible profile bundle', async () => {
    const manifest = JSON.parse(await readFile('package.json', 'utf8')) as {
      exports: Record<string, unknown>
      dsh: { bundle: { patch: string }; client: { platform: string; inject: string[] } }
    }
    expect(manifest.exports['./client']).toBeDefined()
    expect(manifest.dsh.bundle.patch).toBe('./cordis.patch.yml')
    expect(manifest.dsh.client.platform).toBe('web')
    expect(manifest.dsh.client.inject).toContain('@deepseek-ai/dsh-client-ui-settings')
  })

  it('contains no DOM scanning or React monkey patch in source', async () => {
    const client = await readFile('src/client/index.ts', 'utf8')
    const style = await readFile('src/client/style.ts', 'utf8')
    expect(client + style).not.toContain('MutationObserver')
    expect(client + style).not.toContain('__SECRET_INTERNALS')
    expect(client + style).not.toContain('ReactDOM')
  })
})
