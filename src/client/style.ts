import { normalizeConfig, type Config } from '../settings.ts'
import baseCss from './chat-performance.css?raw'

export const PLUGIN_ID = 'dsh-plugin-chat-performance'
export const STYLE_ID = `${PLUGIN_ID}/chat-performance.css`

export interface SettingsSnapshot {
  readonly value: Config | undefined
}

export interface SettingsSource {
  getSnapshot(): SettingsSnapshot
  subscribe(listener: () => void): () => void
}

export function renderPerformanceCss(intrinsicSize: number): string {
  return baseCss.replace('contain-intrinsic-size: auto 96px', `contain-intrinsic-size: auto ${intrinsicSize}px`)
}

function ownedStyle(document: Document): HTMLStyleElement | undefined {
  return [...document.querySelectorAll<HTMLStyleElement>('style[data-plugin-css]')].find(
    (style) => style.dataset.pluginCss === STYLE_ID && style.dataset.plugin === PLUGIN_ID,
  )
}

function removeOwnedStyle(document: Document): void {
  ownedStyle(document)?.remove()
}

export function installPerformanceStyle(
  document: Document,
  settings: SettingsSource,
): () => void {
  let disposed = false

  const sync = (): void => {
    if (disposed) return
    const config = normalizeConfig(settings.getSnapshot().value)
    if (
      !config.enabled ||
      typeof CSS === 'undefined' ||
      !CSS.supports('content-visibility', 'auto')
    ) {
      removeOwnedStyle(document)
      return
    }

    let style = ownedStyle(document)
    if (style === undefined) {
      style = document.createElement('style')
      style.dataset.plugin = PLUGIN_ID
      style.dataset.pluginCss = STYLE_ID
      document.head.appendChild(style)
    }
    style.textContent = renderPerformanceCss(config.intrinsicSize)
  }

  const unsubscribe = settings.subscribe(sync)
  sync()
  return () => {
    if (disposed) return
    disposed = true
    unsubscribe()
    removeOwnedStyle(document)
  }
}
