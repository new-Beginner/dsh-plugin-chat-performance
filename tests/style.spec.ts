// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Config } from '../src/settings.ts'
import {
  installPerformanceStyle,
  renderPerformanceCss,
  STYLE_ID,
  type SettingsSource,
} from '../src/client/style.ts'

function source(initial: Config = {}) {
  let value = initial
  const listeners = new Set<() => void>()
  const settings: SettingsSource = {
    getSnapshot: () => ({ value }),
    subscribe(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
  }
  return {
    settings,
    update(next: Config) {
      value = next
      for (const listener of listeners) listener()
    },
    listenerCount: () => listeners.size,
  }
}

afterEach(() => {
  document.head.replaceChildren()
  document.body.replaceChildren()
  vi.unstubAllGlobals()
})

describe('reversible content-visibility style', () => {
  it('uses only stable chat data attributes and low-risk declarations', () => {
    const css = renderPerformanceCss(96)
    expect(css).toContain('[data-chat-flow-key]')
    expect(css).toContain('content-visibility: auto')
    expect(css).toContain('contain-intrinsic-size: auto 96px')
    expect(css).not.toContain('display: none')
    expect(css).not.toContain('contain: strict')
    expect(css).not.toContain('overflow-anchor')
  })

  it('updates settings live and removes all owned state on disable or unload', () => {
    vi.stubGlobal('CSS', { supports: () => true })
    const hidden = document.createElement('div')
    hidden.dataset.chatFlowKey = 'tool-result'
    hidden.setAttribute('hidden', 'until-found')
    document.body.appendChild(hidden)
    const state = source({ enabled: true, intrinsicSize: 96 })

    const dispose = installPerformanceStyle(document, state.settings)
    const selector = `style[data-plugin-css="${STYLE_ID}"]`
    expect(document.querySelector(selector)?.textContent).toContain('auto 96px')
    expect(hidden.getAttribute('hidden')).toBe('until-found')
    expect(state.listenerCount()).toBe(1)

    state.update({ enabled: true, intrinsicSize: 160 })
    expect(document.querySelector(selector)?.textContent).toContain('auto 160px')

    state.update({ enabled: false, intrinsicSize: 160 })
    expect(document.querySelector(selector)).toBeNull()
    expect(hidden.getAttribute('hidden')).toBe('until-found')

    state.update({ enabled: true, intrinsicSize: 64 })
    expect(document.querySelector(selector)?.textContent).toContain('auto 64px')
    dispose()
    expect(document.querySelector(selector)).toBeNull()
    expect(state.listenerCount()).toBe(0)
  })

  it('safely does nothing when the browser lacks content-visibility', () => {
    vi.stubGlobal('CSS', { supports: () => false })
    const state = source({ enabled: true, intrinsicSize: 96 })
    const dispose = installPerformanceStyle(document, state.settings)
    expect(document.querySelector('style[data-plugin-css]')).toBeNull()
    dispose()
  })
})
