/** Shared Host/browser contract for chat rendering preferences. */
export const SETTINGS_NAMESPACE = 'chat-performance'

export const INTRINSIC_SIZES = [64, 96, 128, 160] as const
export type IntrinsicSize = (typeof INTRINSIC_SIZES)[number]

export interface Config {
  /** Enable off-screen chat-node rendering containment. */
  enabled?: boolean
  /** Estimated block height used before an off-screen node is laid out. */
  intrinsicSize?: IntrinsicSize
}

export const DEFAULT_CONFIG: Readonly<Required<Config>> = Object.freeze({
  enabled: true,
  intrinsicSize: 96,
})

export function normalizeConfig(value: Config | undefined): Required<Config> {
  const enabled = value?.enabled ?? DEFAULT_CONFIG.enabled
  const intrinsicSize = INTRINSIC_SIZES.includes(value?.intrinsicSize ?? DEFAULT_CONFIG.intrinsicSize)
    ? (value?.intrinsicSize ?? DEFAULT_CONFIG.intrinsicSize)
    : DEFAULT_CONFIG.intrinsicSize
  return { enabled, intrinsicSize }
}
