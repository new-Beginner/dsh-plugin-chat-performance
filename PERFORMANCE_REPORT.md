# 长对话渲染性能报告

## 结论摘要

插件已完成静态证据核对、严格类型检查、构建和自动化生命周期测试。**本次没有取得当前 Electron renderer 的 CDP 连接，因此没有采集 DSH GUI 启用前/后的 DOM、Heap、Long Task、Layout 或 Paint 数据，也不宣称性能已提升。**

## 测试环境

| 项目 | 实际值 |
|---|---|
| DSH Desktop | 2.0.11 |
| DSH 核心包 | 0.1.5-rc.2 |
| Electron | 43.3.0（运行进程命令行） |
| Node.js | v24.19.0 |
| npm | 12.0.2 |
| GUI | `http://127.0.0.1:43120` |
| 插件目录 | `D:\deepseek-harness\dsh-plugin-chat-performance` |
| dev:web watcher | 未发现 |

## 代表性会话规模

以下规模来自任务提供的既有排查结论，本次没有读取或输出会话正文：

- 会话：`session-b7645b60-be2a-476a-8a27-99b3f0b7c8c5`
- 日志事件：约 299
- assistant 消息：约 45
- 工具调用：约 71
- 工具结果：约 70
- 解压日志：约 1.17 MB
- 最大单个工具结果：约 50 KB

## 测量方法与可用性

### 已完成

1. 只读检查已安装 `@deepseek-ai/dsh-client-ui-chat` 0.1.5-rc.2：
   - `ChatNodeList` 为 `order.map(ChatNodeSeat)`；
   - 每个 seat 输出 `data-chat-flow-key`、`data-chat-flow-kind`、`data-chat-turn`；
   - `useSearchableHidden` 使用 `hidden="until-found"`；
   - reader-anchor 查询会读取 `[data-chat-flow] > [data-chat-flow-key]`。
2. 检查 HMR：未发现 `pnpm run dev:web`、Vite 或等价 watcher。
3. 检查现有 GUI/CDP：
   - 43120 的无认证外部请求返回 HTTP 403；
   - 9222、9223、9229 未提供可用 CDP endpoint；
   - 按任务约束，没有重启 Electron、添加远程调试参数或启动替代服务。
4. 自动化验证真实构建 bundle 的 DSH loader 注册、设置切换、样式删除和浏览器不支持时退化。
5. 使用 Desktop 官方 `desktop-cli.js` 安装到 `C:\Users\32057\.dsh\profiles\desktop`；`--dump-config` 已发现 `dsh-plugin-chat-performance:plugin`。当前 Host 在安装前已启动，且无 watcher，因此插件需下次正常启动才会进入运行中的客户端图。

### 未完成/受阻

无法附着到当前已登录 Electron renderer，故以下指标未采集：

| 指标 | 启用前 | 启用后 | 状态 |
|---|---:|---:|---|
| DOM 节点总数 | — | — | BLOCKED：无 CDP |
| `[data-chat-flow-key]` 数量 | — | — | BLOCKED：无 CDP |
| JS Heap | — | — | BLOCKED：无 CDP |
| 滚动 Long Tasks | — | — | BLOCKED：无 CDP |
| Layout 耗时 | — | — | BLOCKED：无 CDP |
| Paint 耗时 | — | — | BLOCKED：无 CDP |
| 流式输出主线程占用 | — | — | BLOCKED：无 CDP |
| 三次运行中位数 | — | — | NOT RUN |

因此不存在可报告的“未改善或变差指标”；这些指标是未测量，而不是零变化。

## 自动化验证结果

`npm test` 实际结果：4 个测试文件、8 个测试全部通过。

覆盖点：

- DSH package manifest 与 `cordis.patch.yml` 契约；
- Host 设置 schema 默认值和非法高度拒绝；
- `enabled`/`intrinsicSize` 的客户端实时更新；
- 唯一 style 标签的创建、禁用删除和 dispose 删除；
- 设置订阅在 dispose 后归零；
- `hidden="until-found"` 保持不变；
- 不使用 `display:none`、`contain: strict`、`overflow-anchor`；
- 不使用 MutationObserver、React internals 或 ReactDOM patch；
- 不支持 `content-visibility` 时不注入样式；
- 构建产物可被 `window.__ModuleLoader__` 注册并物化。

## 14 个 GUI 场景状态

| # | 场景 | 状态 |
|---:|---|---|
| 1 | 短会话布局 | BLOCKED：当前 renderer 无 CDP |
| 2 | 长会话连续快速滚动 | BLOCKED |
| 3 | 底部发送消息/流式输出 | BLOCKED |
| 4 | 自动跟随底部 | BLOCKED |
| 5 | 手动上滚不强拉底部 | BLOCKED |
| 6 | 回到底部 | BLOCKED |
| 7 | 加载更早位置保持 | BLOCKED |
| 8 | 轮次导航 | BLOCKED |
| 9 | 工具结果展开/折叠 | BLOCKED |
| 10 | 代码、表格、图片回答 | BLOCKED |
| 11 | Ctrl+F 屏幕外文字 | BLOCKED；核心虚拟化设计另列策略 |
| 12 | 切换会话再返回 | BLOCKED |
| 13 | 插件关闭恢复原行为 | 自动化 PASS；当前 GUI 手测 BLOCKED |
| 14 | 不支持 content-visibility | 自动化 PASS |

## 风险观察

- `contain-intrinsic-size: auto <size>` 会在浏览器记录真实尺寸后复用；首次遇到高度差异大的节点仍可能有滚动条估算变化。
- 96px 只是低风险默认值，不是从当前会话采样得出的最优值；因此提供 64/96/128/160 四档。
- 插件不更改滚动锚点。图片异步加载仍由现有 DSH 滚动/anchor 逻辑处理。
- `hidden="until-found"` 与 `content-visibility:auto` 都是浏览器原生机制；源码级测试确认插件不删除 hidden，但 Ctrl+F 的端到端组合行为仍需当前 GUI 验证。
- 安装新 bundle 需要 Desktop 下次正常启动重建启动图；本次遵守“不重启 Desktop”。插件已安装，但当前运行 GUI 尚未加载它。
- Desktop 自带 `dsh.cmd` 包装器指向不存在的 `resources\app.asar\lib\desktop-cli.js`；本次未修改该包装器，而是用相同 executable/env 调用实际存在的官方 `resources\app\lib\desktop-cli.js` 完成安装。

## 继续动态测量所需条件

用户可在未来一次受控运行中为现有 Electron renderer 开启 CDP，或提供 DSH 官方可附着的调试入口。届时应保持同一会话、窗口尺寸、滚动位置和加载窗口，每组至少 3 次，报告中位数，并同时记录变差指标。不要为测量启动替代 Web 服务。
