# DSH 核心长对话渲染根治方案

## 范围与原则

本方案面向 DSH 核心源码后续演进，不在第一阶段插件中实施。目标是同时控制 DOM/React 挂载规模、历史加载规模和折叠内容成本；保留现有增量 Markdown、冻结块、末尾重解析、增量高亮与视口内高亮能力。

原则：稳定 key、可测量、可回退、先保持语义再优化实现。不能把 `order.map` 简单替换成虚拟列表后即宣称完成。

## 1. ChatNodeList 动态虚拟化

### 1.1 组件边界

在 `ChatNodeList` 与 `ChatNodeSeat` 之间引入项目内统一的虚拟窗口层，优先复用已使用的 `@tanstack/react-virtual`：

- `count = order.length`；
- `getItemKey(index) = order[index]`，必须保持 stable `nodeKey`；
- `estimateSize` 使用按 node kind/历史测量分桶的估算值；
- `measureElement` 读取真实动态高度；
- DOM row 继续输出 `data-chat-flow-key/kind/turn`；
- 非虚拟化实现保留为 feature flag/故障回退。

虚拟容器只负责位置与测量，`ChatNodeSeat` 继续负责节点订阅、process 展示和 slot dispatch，避免复制业务逻辑。

### 1.2 动态高度与重新测量

- 每个挂载 row 绑定 `virtualizer.measureElement`。
- 工具结果展开、折叠、Markdown 稳定块追加、图片 load/error、字体加载后触发该 row 的重新测量。
- 不为每个 row 创建独立全局 MutationObserver；由已知业务事件调用 `measureElement`，必要时在虚拟层使用一个集中式 ResizeObserver。
- 高度缓存以 `nodeKey + presentationRevision` 为键；内容形态改变时递增 revision 或显式失效。

### 1.3 Overscan

- 初始建议按视口高度的 1–2 倍或 6–12 个节点，而不是固定大数量。
- 快速滚动时可适度提高前进方向 overscan；流式输出时底部方向优先。
- 记录挂载 row 数、空白帧和长任务，再调参；不要仅按主观滚动感调整。

### 1.4 Prepend 历史记录与锚点

加载更早前捕获：

```ts
{ anchorNodeKey, offsetFromScrollportTop }
```

prepend 完成并测量新 rows 后：

1. 找到相同 `anchorNodeKey`；
2. 计算其新 top；
3. 调整 scrollTop，使相对 top offset 保持不变；
4. 若 anchor 不在当前窗口，先让 virtualizer 定位到该 key，再做一次精调；
5. 仅在用户没有主动滚动时应用补偿。

不得只使用“新增总高度”估算，因为动态节点和图片会继续改变高度。

### 1.5 流式消息与跟随底部

把“是否跟随底部”建模为显式状态，而不是每次高度变化都滚到底：

- `followBottom = distanceToBottom <= threshold` 或用户点击回到底部；
- 用户向上滚动立即关闭 follow；
- 流式 row 高度变化时，仅在 follow=true 时滚到末端；
- follow=false 时累计 unseen 标记并显示回到底部按钮；
- pending bubble、composer seat 不参与“最后聊天节点”的脆弱选择器判断。

流式尾部 row 始终保持在 overscan/挂载区；完成后才允许按普通策略淘汰。

### 1.6 Turn 跳转与 loadThrough

维护 `nodeKey -> orderIndex` 与 `turn -> nodeKey range` 索引：

- 已加载目标：`scrollToIndex` 后待测量完成再 `scrollToOffset` 精调；
- 未加载目标：调用 `loadThrough(turn)`，合并结果、刷新索引后再定位；
- 目标轮部分加载：先显示 loading/incomplete 状态，完成必要片段后定位；
- 导航请求使用 generation/token，取消过期请求，防止后到请求抢滚动位置。

### 1.7 工具结果和图片

- 工具结果展开/折叠后显式重新测量所属 row。
- 图片在已知宽度时先写 aspect-ratio 占位；未知比例在 load 后重新测量。
- 锚点补偿只对当前 reader anchor 之上的高度变化生效；底部 follow 模式直接维持 bottom。
- 限制一次 frame 内重复测量，批量放入 requestAnimationFrame。

### 1.8 页面内搜索

原生 Ctrl+F 无法搜索未挂载 DOM，必须把策略作为产品功能而非虚拟列表附注：

1. 为已加载节点维护纯文本搜索索引（不依赖 DOM）；
2. Ctrl+F 可保留浏览器行为，同时提供 DSH 会话搜索面板或拦截到等价可访问搜索；
3. 命中未挂载节点时先 `scrollToIndex`/挂载，再聚焦和高亮；
4. 命中未加载历史时提供“继续加载并搜索”；
5. 对折叠未挂载的详细内容，索引仍保存可搜索摘要/全文映射；
6. 保留 `beforematch` 作为已挂载 hidden 子树的兼容路径，但不能把它当作未挂载内容的搜索方案。

### 1.9 无障碍与焦点

- DOM 顺序保持会话顺序；视觉 transform 不改变语义顺序。
- 被虚拟化移除前若含焦点，先把焦点停靠到列表/对应摘要，再决定卸载。
- Turn 导航完成后提供可选焦点移动与 live announcement，避免无提示跳转。
- 屏幕阅读器需要可感知“已加载区间/还有更早内容”；不要伪造错误的 `aria-setsize`。
- 键盘导航不能依赖所有 row 同时存在。

### 1.10 验收指标

- 挂载 ChatNodeSeat 数量随视口/overscan 有界，而非随 loaded order 线性增长。
- 快速滚动无持续空白；prepend anchor 偏差有明确阈值。
- 流式 follow/unfollow、工具展开、图片加载、Turn 跳转、Ctrl+F/会话搜索均有 E2E。
- 记录 React commit、Long Task、Layout/Paint 和内存，至少 3 次中位数。

## 2. 双重/多重分页预算

### 2.1 新预算合同

```ts
interface HistoryBudget {
  maxMessages: number        // 例如 50
  maxEvents: number          // 例如 300
  maxPayloadBytes: number    // 例如 2 * 1024 * 1024
}
```

向前扩展时任一预算达到即停止。payload byte 应按持久化/传输的 UTF-8 字节或稳定序列化字节计算，不用 JS 字符数近似。

### 2.2 原子加载单元

预算裁剪不能任意截断 event。引入加载分段：

- message boundary；
- turn boundary；
- tool exchange group（call + result）；
- assistant streaming completion group。

默认以完整 turn 为原子单元向前加入；加入下一单元会超预算时停止，并返回 continuation metadata。

### 2.3 单轮自身超限

一个 turn 可能单独超过预算，不能永久无法打开。策略：

1. 允许“超大单轮”以分块模式进入；
2. 首块必须包含 turn 头、message 骨架和每个工具 exchange 的边界元数据；
3. 大 payload 采用 lazy body/摘要占位；
4. 返回 `turnCompleteness: partial`、已加载 event/byte 范围和 continuation token；
5. 用户展开或导航到缺失内容时按 exchange/body 定向加载，而不是再次加载整个历史窗。

### 2.4 连续性与 tool 配对

- 分页边界若落在 tool/call 与 tool/result 之间，向前或向后扩展到完整 exchange；预算可为保证配对小幅软超限，并记录原因。
- 若 result 本身超大，保留 call + result header，result body 作为独立 lazy payload。
- assistant message、tool call、tool result 的因果顺序保持；不可把后一个 result 误归到相邻 turn。
- continuation token 包含稳定 event cursor 与 turn identity，不能只依赖数组偏移。

### 2.5 loadThrough 与 Turn 导航

`loadThrough(targetTurn)` 使用目标导向预算：

- 先加载包含目标 turn 的索引/元数据区间；
- 再加载目标 turn 的可呈现最小闭包；
- 对中间大量 payload 允许摘要/未物化状态；
- 返回 `reachedTarget`、`targetCompleteness`、`hasEarlier`、`hasMoreWithinTurn`；
- UI 在部分轮次上显示“本轮尚未完整加载”，并提供继续加载。

### 2.6 观测与兼容

- 旧调用只传 `maxMessages` 时映射到默认 event/byte 上限，避免无界。
- 记录每次响应三种预算消耗、停止原因、软超限原因、最大单轮大小。
- 灰度开关允许回退到旧分页，但监控超大响应和失败导航。

## 3. 折叠过程节点轻量化

### 3.1 摘要占位模型

折叠后不再保留完整 React 子树，而保留稳定 summary row：

- turn/node identity；
- 工具数量、状态、耗时、错误摘要；
- 可访问名称与展开按钮；
- 详细内容的加载/挂载状态。

展开时按需挂载详细节点；关闭时卸载细节并保留摘要。

### 3.2 状态保存

把需要跨卸载保存的状态提升到 key-value store：

- 展开状态；
- 工具视图内部选项；
- 代码块复制/折行偏好；
- 可恢复的焦点目标；
- 已加载 lazy payload token。

状态键使用稳定 nodeKey/toolCallId，不保存 DOM 或组件实例。临时视觉状态可在卸载时丢弃。

### 3.3 搜索覆盖

- Projection 阶段同时产出可搜索纯文本或索引 token；
- 未挂载详情的命中会展开/加载对应 summary，再定位具体子项；
- 索引只保留搜索所需文本，避免重复持有巨型原始 payload；超大结果可存规范化摘要与按需后端搜索引用；
- 搜索结果明确标识“内容未加载/需加载”。

### 3.4 与 hidden=until-found 的兼容

迁移期可采用两层：

- 已挂载但视觉折叠：继续 `hidden="until-found"`，保留 beforematch；
- 已卸载详情：summary 不隐藏，搜索索引负责命中与重新挂载；
- beforematch 触发时统一调用 expand action，不在 DOM 层直接改业务状态；
- 最终是否保留 hidden 路径由浏览器搜索 E2E 决定。

## 4. 分阶段实施

1. **测量与开关**：加入核心指标、feature flag、基准会话夹具。
2. **预算分页**：先限制输入规模并保留旧渲染；验证连续性。
3. **折叠轻量化**：减少已加载但折叠的子树。
4. **动态虚拟化**：在有界数据与轻量折叠之上实现。
5. **搜索/无障碍收口**：在默认开启前完成。

每阶段都必须支持快速回退，不与 Markdown 增量优化捆绑重写。

## 5. 核心测试矩阵

- 单元：预算边界、超大单轮、call/result 配对、key/index、锚点补偿数学。
- 组件：动态测量、ResizeObserver 批处理、展开/图片后 remeasure、focus parking。
- 集成：prepend、loadThrough、流式 follow/unfollow、会话切换。
- E2E：14 个用户场景，Chromium/Electron，至少 3 次性能采样。
- 回归：Markdown 冻结块、代码高亮、页面搜索、屏幕阅读器、减少动画模式。
