# dsh-plugin-chat-performance

DeepSeek Harness 的独立客户端性能插件。第一阶段仅使用浏览器原生 `content-visibility`，降低长对话中屏幕外聊天节点的布局与绘制成本；不修改、复制或 monkey patch DSH 核心聊天组件。

## 兼容性

- 已对照：DSH Desktop 2.0.11
- 已对照：`@deepseek-ai/dsh` 0.1.5-rc.2
- 已对照：Electron 43.3.0
- 目标浏览器：支持 `content-visibility: auto` 的 Chromium/Electron
- 不支持该特性时：插件不注入优化样式，不改变原始行为

## 实现边界

插件只维护一个带 `data-plugin="dsh-plugin-chat-performance"` 的 `<style>`：

```css
@supports (content-visibility: auto) {
  [data-chat-flow-key] {
    content-visibility: auto;
    contain-intrinsic-size: auto 96px;
  }
}
```

`data-chat-flow-key` 是 DSH 0.1.5-rc.2 `ChatNodeSeat` 输出的稳定属性。插件不会：

- 使用构建后的 CSS 哈希类名；
- 设置固定高度、`display: none`、`contain: strict` 或 `overflow-anchor`；
- 删除或改写 `hidden="until-found"`；
- 扫描消息内容或保存聊天正文；
- 使用 MutationObserver 扫描全部节点；
- 修改 React、React Fiber 或核心 DOM；
- 替换现有 Markdown 渲染与高亮优化。

当前视口中的流式尾部节点仍会正常布局和绘制；当它在屏幕外时由浏览器决定跳过渲染工作。当前版本没有发现可稳定表达“正在流式输出”的独立 DOM 属性，因此没有使用脆弱的 `:last-child` 排除规则。

## 设置

在 DSH 设置的插件区域提供：

- `enabled`：默认 `true`；关闭后立即删除插件样式。
- `intrinsicSize`：默认 `96px`；可选 `64 / 96 / 128 / 160px`。

设置通过 DSH 正式 `settingsScope` 持久化。切换设置不需要重启 Host，也不需要刷新页面；插件卸载或 fiber dispose 时会移除样式和设置订阅。

## 本地开发

```powershell
npm install --no-audit --no-fund
npm run lint
npm run typecheck
npm run build
npm test
npm pack --dry-run --json
```

项目使用 TypeScript strict 模式。客户端 bundle 以 DSH 0.1.5 的 `window.__ModuleLoader__.load(...)` 格式生成；React 与 `react/jsx-runtime` 保持 external，不会打包第二份 React。

## 安装到 DSH Desktop

```powershell
dsh plugin add https://github.com/new-Beginner/dsh-plugin-chat-performance/releases/download/v0.1.0/dsh-plugin-chat-performance-0.1.0.tgz
```

安装后重启 DSH Desktop 一次以重建启动图。日常切换 enabled/高度设置不需要重启。

## 卸载与撤销

```powershell
dsh plugin remove dsh-plugin-chat-performance
```

卸载后下一次正常启动不再加载插件。运行期 dispose 会删除唯一的 style 标签；插件不写会话日志，不迁移数据，不清空缓存、Local Storage 或用户配置。

## HMR 与当前 GUI

客户端 HMR 只有在同一 DSH 源码 checkout 的 `pnpm run dev:web` 或等价 watcher 实际重建 `lib/client.js` 时有效。仅构建本独立目录不会让已运行的 Desktop 自动出现新插件；启动另一个 Vite 服务也不能验证 `http://127.0.0.1:43120`。

## 验证与性能结论

- 自动化契约与构建结果见 [COMMANDS.md](COMMANDS.md)。
- 当前 GUI 的动态验证和性能数据见 [PERFORMANCE_REPORT.md](PERFORMANCE_REPORT.md)。
- DSH 核心层根治设计见 [CORE_FIX_PLAN.md](CORE_FIX_PLAN.md)。

没有当前 GUI 的 CDP/Trace 数据时，不应把该优化描述为已证明提速。
