import { useState } from 'react'
import type {
  SettingsScope,
  SettingsScopeSnapshot,
} from '@deepseek-ai/dsh-client-ui-settings/client'
import type { InjectFace, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import {
  DEFAULT_CONFIG,
  INTRINSIC_SIZES,
  type Config,
  type IntrinsicSize,
} from '../settings.ts'

export interface PerformanceSettingsCardInjected {
  hooks: { chatPerformanceSettings: SettingsScope<Config> }
  setEnabled(value: boolean): Promise<void>
  setIntrinsicSize(value: IntrinsicSize): Promise<void>
}

export type PerformanceSettingsCardProps = PropsRuntime<'settings.plugin.item'> &
  InjectFace<PerformanceSettingsCardInjected>

const cardStyle = {
  listStyle: 'none',
  border: '1px solid var(--dsw-alias-border-l2, #e5e7eb)',
  borderRadius: 12,
  padding: 16,
} as const

const rowStyle = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 16,
  padding: '10px 0',
} as const

export function PerformanceSettingsCard({
  useChatPerformanceSettings,
  setEnabled,
  setIntrinsicSize,
}: PerformanceSettingsCardProps) {
  const snapshot = useChatPerformanceSettings((value: SettingsScopeSnapshot<Config>) => value)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(false)
  if (snapshot.status !== 'ready') return null

  const enabled = snapshot.value?.enabled ?? DEFAULT_CONFIG.enabled
  const intrinsicSize = snapshot.value?.intrinsicSize ?? DEFAULT_CONFIG.intrinsicSize
  const writable = snapshot.writable && !saving

  const save = async (operation: () => Promise<void>): Promise<void> => {
    setSaving(true)
    setError(false)
    try {
      await operation()
    } catch {
      setError(true)
    } finally {
      setSaving(false)
    }
  }

  return (
    <li data-dsh-chat-performance-settings="" style={cardStyle}>
      <div>
        <strong>长对话渲染优化</strong>
        <p style={{ margin: '4px 0 10px', color: 'var(--dsw-alias-label-secondary, #68707d)' }}>
          使用浏览器原生 content-visibility 跳过屏幕外聊天节点的布局与绘制。
        </p>
      </div>
      <div style={rowStyle}>
        <label htmlFor="dsh-chat-performance-enabled">启用优化</label>
        <input
          id="dsh-chat-performance-enabled"
          type="checkbox"
          checked={enabled}
          disabled={!writable}
          onChange={() => void save(() => setEnabled(!enabled))}
        />
      </div>
      <div style={rowStyle}>
        <label htmlFor="dsh-chat-performance-size">屏幕外节点预估高度</label>
        <select
          id="dsh-chat-performance-size"
          value={intrinsicSize}
          disabled={!writable}
          onChange={(event) => {
            const value = Number(event.currentTarget.value) as IntrinsicSize
            void save(() => setIntrinsicSize(value))
          }}
        >
          {INTRINSIC_SIZES.map((value) => (
            <option key={value} value={value}>
              {value}px
            </option>
          ))}
        </select>
      </div>
      {!snapshot.writable ? <p>当前 Host 设置为只读。</p> : null}
      {error ? <p role="alert">保存失败；设置值已由 Host 重新同步。</p> : null}
    </li>
  )
}
