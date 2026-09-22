/** Host half: owns the durable settings namespace; no chat data is read here. */
import type { Context } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'
import type {} from '@deepseek-ai/dsh-settings'
import {
  DEFAULT_CONFIG,
  SETTINGS_NAMESPACE,
  type Config as ConfigShape,
} from './settings.ts'

export type Config = ConfigShape
export type { IntrinsicSize } from './settings.ts'
export { DEFAULT_CONFIG, INTRINSIC_SIZES, SETTINGS_NAMESPACE } from './settings.ts'

export const name = 'dsh-plugin-chat-performance'
export const inject = ['settings']

/** Plugin configuration and durable user-settings schema. */
export const Config: z<ConfigShape> = z.object({
  enabled: z.boolean().default(DEFAULT_CONFIG.enabled),
  intrinsicSize: z
    .union([z.const(64), z.const(96), z.const(128), z.const(160)])
    .default(DEFAULT_CONFIG.intrinsicSize),
})

export function apply(ctx: Context, config: ConfigShape = {}): void {
  ctx.settings.installSection(ctx, SETTINGS_NAMESPACE, Config, config, {
    setSource: () => {},
    onChange: () => {},
  })
}
