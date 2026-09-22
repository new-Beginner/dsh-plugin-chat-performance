/** Browser half: binds settings, owns one reversible style tag, and adds a settings card. */
import type { Context as ClientContext } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-client-ui-settings/client'
import type {} from '@deepseek-ai/dsh-client-ui-settings-plugins/client'
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'
import type {} from '@deepseek-ai/dsh-client-ui-slots'
import { PerformanceSettingsCard } from './PerformanceSettingsCard.tsx'
import { installPerformanceStyle } from './style.ts'
import { SETTINGS_NAMESPACE, type Config, type IntrinsicSize } from '../settings.ts'

export const inject = ['slots', 'settingsScope']

export function apply(ctx: ClientContext): () => void {
  const settings = ctx.settingsScope.bind<Config>({ namespace: SETTINGS_NAMESPACE })
  const disposeStyle = installPerformanceStyle(document, settings)

  ctx.slots.inject('settings.plugin.item', () =>
    ctx.slots.register(
      {
        name: 'settings.plugin.item',
        key: SETTINGS_NAMESPACE,
        priority: -90,
        inject: () => ({
          hooks: { chatPerformanceSettings: settings },
          setEnabled: (value: boolean) => settings.set('enabled', value),
          setIntrinsicSize: (value: IntrinsicSize) => settings.set('intrinsicSize', value),
        }),
      },
      PerformanceSettingsCard,
    ),
  )

  return disposeStyle
}
