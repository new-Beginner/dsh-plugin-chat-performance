import type { Context } from '@deepseek-ai/cordis'
import { describe, expect, it, vi } from 'vitest'
import {
  apply,
  Config,
  DEFAULT_CONFIG,
  inject,
  SETTINGS_NAMESPACE,
} from '../src/index.ts'

describe('host settings contract', () => {
  it('uses safe defaults and rejects unsupported intrinsic sizes', () => {
    expect(Config({})).toEqual(DEFAULT_CONFIG)
    expect(Config({ enabled: false, intrinsicSize: 160 })).toEqual({
      enabled: false,
      intrinsicSize: 160,
    })
    expect(() => Config({ intrinsicSize: 80 })).toThrow()
  })

  it('installs one durable settings namespace without chat services', () => {
    const installSection = vi.fn()
    const ctx = { settings: { installSection } } as unknown as Context
    apply(ctx, { intrinsicSize: 128 })

    expect(inject).toEqual(['settings'])
    expect(installSection).toHaveBeenCalledOnce()
    expect(installSection.mock.calls[0]?.[1]).toBe(SETTINGS_NAMESPACE)
    expect(installSection.mock.calls[0]?.[3]).toEqual({ intrinsicSize: 128 })
  })
})
