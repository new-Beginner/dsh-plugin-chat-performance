// @vitest-environment jsdom
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import * as React from 'react'
import * as jsxRuntime from 'react/jsx-runtime'
import { afterEach, describe, expect, it, vi } from 'vitest'

interface ClientHandoff {
  readonly id: string
  readonly factory: (require: (id: string) => unknown) => unknown
}

afterEach(() => {
  document.head.replaceChildren()
  vi.unstubAllGlobals()
})

describe('published browser artifact', () => {
  it('registers through the DSH loader and cleans its style on disposal', async () => {
    vi.stubGlobal('CSS', { supports: () => true })
    let handoff: ClientHandoff | undefined
    ;(window as unknown as { __ModuleLoader__: { load(value: ClientHandoff): void } }).__ModuleLoader__ = {
      load: (value) => {
        handoff = value
      },
    }

    const artifact = pathToFileURL(resolve('lib/client.js'))
    await import(/* @vite-ignore */ `${artifact.href}?test=${String(Date.now())}`)
    expect(handoff?.id).toBe('dsh-plugin-chat-performance')

    const shared: Record<string, unknown> = {
      react: React,
      'react/jsx-runtime': jsxRuntime,
    }
    const client = handoff?.factory((id) => {
      if (!(id in shared)) throw new Error(`unexpected shared module: ${id}`)
      return shared[id]
    }) as { apply(ctx: unknown): () => void; inject: string[] }
    expect(client.inject).toEqual(['slots', 'settingsScope'])

    const listeners = new Set<() => void>()
    const settings = {
      getSnapshot: () => ({ status: 'ready', writable: true, value: { enabled: true, intrinsicSize: 128 } }),
      subscribe(listener: () => void) {
        listeners.add(listener)
        return () => listeners.delete(listener)
      },
      set: vi.fn(async () => {}),
    }
    let registration: unknown
    const ctx = {
      settingsScope: { bind: () => settings },
      slots: {
        inject: (_name: string, register: () => unknown) => register(),
        register: (options: unknown) => {
          registration = options
          return () => {}
        },
      },
    }

    const dispose = client.apply(ctx)
    expect(registration).toBeDefined()
    expect(document.querySelector('style[data-plugin="dsh-plugin-chat-performance"]')?.textContent).toContain(
      'auto 128px',
    )
    dispose()
    expect(document.querySelector('style[data-plugin="dsh-plugin-chat-performance"]')).toBeNull()
    expect(listeners.size).toBe(0)
  })
})
