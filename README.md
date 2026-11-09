# 🐻 一起养只熊 · Bear Together

> 隔着屏幕，也住进同一间小屋。
>
> 一个只有两个人在线的共同养熊小游戏：一起喂它、陪它玩、摸摸它的头，顺便说几句悄悄话，或者下一盘井字棋。

![大厅](docs/preview-lobby.jpg)

![小屋与井字棋](docs/preview-game.jpg)

## 这是什么

我从原来的单机养成原型（喂食、商店、休息、升级）改成了一个 **双人实时联机** 的小屋：

- 两个人用同一个 **4 位房间号** 进入同一间小屋；
- 小熊的饱腹、心情、精力、亲密度由服务端统一计算，两个屏幕同步；
- 可以一起照顾小熊、发快捷表情、聊悄悄话；
- 还有一个双人井字棋，带比分和轮换先手；
- 断线 / 刷新后会自动回到原来的座位。

整个项目只有一个 Node 进程 + 一个 WebSocket 服务，不依赖数据库，适合自己部署或者临时开隧道和 TA 玩。

## 功能

| 功能 | 说明 |
| --- | --- |
| 双人房间 | 创建 4 位房间号，最多两个座位，第三人会被拒绝 |
| 共同养熊 | 喂蜂蜜、玩毛线、抱一抱、哄睡；点击小熊还能摸摸头 |
| 实时同步 | 所有状态在服务端计算，通过 WebSocket 广播 |
| 亲密度 | 互动和「两个人都在线」都会慢慢增加亲密度，分 5 个等级 |
| 悄悄话 | 文字聊天、6 个快捷表情、聊天气泡会出现在小熊头顶 |
| 井字棋 | 三子连珠、比分、每局轮换先手、再来一局 |
| 断线重连 | token + 房间号存在 localStorage，刷新自动回座；座位保留 5 分钟 |
| 陪伴机制 | 两个人都在线时心情更稳定、亲密度增长；没人时小熊打盹，数值暂停衰减 |
| 移动端 | 手机 / 平板响应式布局，支持触屏 |
| 小细节 | 音效开关、房间号一键复制、动作冷却、上线提示、离线提示 |

## 快速开始

需要 Node.js **20+**。

```bash
npm install
npm run dev
```

打开 <http://localhost:5173>。`npm run dev` 会同时启动：

- Vite 前端：<http://localhost:5173>
- WebSocket / API 服务：<http://localhost:8787>

### 生产方式运行

```bash
npm run build
npm start
```

打开 <http://localhost:8787>。生产模式下 Node 会同时托管 `dist` 静态页面和 `/ws` WebSocket。

## 怎么和 TA 远程一起玩

> 两个人不在同一个 Wi-Fi 下时，必须让其中一方把服务暴露到公网，或者部署到云上。仅在本机 `localhost` 运行，对方是打不开的。

### 方式一：临时公网隧道（最快，适合今晚就玩）

先在本机把游戏跑起来：

```bash
npm run build
npm start
```

再用 Cloudflare Tunnel 开一个临时公网地址（需要先安装 `cloudflared`）：

```bash
# macOS
brew install cloudflared

# 保持 npm start 运行，另开一个终端：
cloudflared tunnel --url http://localhost:8787
```

终端会输出一个 `https://xxxx.trycloudflare.com` 地址，把它和房间号一起发给 TA 即可。

也可以用 ngrok：

```bash
ngrok http 8787
```

注意：

- 隧道开着的时候，任何拿到链接的人都能访问大厅；房间本身有 4 位房间号，且最多两个人。
- 不要把房间号发到公开群聊里。
- 关闭终端后链接就失效了。

### 方式二：部署到 Render（免费档，适合长期玩）

1. 把这个仓库推到 GitHub；
2. 在 [Render](https://render.com/) 新建 **Web Service**，连接这个仓库；
3. 构建命令：`npm ci --include=dev && npm run build`
4. 启动命令：`npm start`
5. 环境变量：`NODE_VERSION=20.19.0`（或任意 Node 20+）

仓库里已经带了 `render.yaml`，也可以直接用 Blueprint 部署。Render 免费实例在一段时间没人访问后会休眠，第一次打开会慢几秒；服务重启后内存里的房间会清空（见下方「已知限制」）。

### 方式三：Docker

```bash
docker build -t bear-together .
docker run -p 8787:8787 bear-together
```

打开 <http://localhost:8787>。

### 方式四：任意支持 WebSocket 的 Node 托管

平台需要满足：

- 能运行一个长期存活的 Node 进程；
- 支持 WebSocket（反向代理要转发 `/ws` 的 Upgrade）；
- 把平台注入的 `PORT` 传给进程（服务端已读取 `process.env.PORT`）。

## 怎么玩

1. 一个人填写名字，点「开一间两个人的小屋」，拿到 4 位房间号；
2. 把房间号 / 链接发给 TA；
3. TA 在首页填名字和房间号，点「加入」；
4. 两个人都在线后，小熊头顶会显示「你们都在 · 陪伴加成中」；
5. 点下面的动作按钮照顾小熊，或者直接点小熊摸摸头；
6. 右侧「悄悄话」聊天，「一起玩」下井字棋。

井字棋规则：X 先手，三子连珠获胜；赢的人负责明天的早餐（UI 是这么说的）。

## 设计说明

- **服务端权威**：所有数值、冷却、棋局都在 `server/game.js` 里计算，前端只渲染快照，避免两个人各算一套导致不同步。
- **没人时不掉状态**：只有至少一个人在线时小熊才会饿 / 累；两个人都离开后房间进入打盹状态，避免回来看到一只饿坏的小熊。
- **重连优先于踢人**：刷新页面会用同一个 token 回到原座位；真正的「离开」按钮才会释放座位。
- **房间码即钥匙**：没有账号系统，4 位房间号 + 两个座位。适合情侣 / 朋友，不适合存放敏感内容。
- **数据在内存里**：房间、聊天、棋局、亲密度都在 Node 进程内存中。重启服务会清空；房间空置 12 小时后自动回收。

## 脚本

| 命令 | 做了什么 |
| --- | --- |
| `npm run dev` | 同时启动 Node 服务和 Vite 前端 |
| `npm run dev:client` | 只启动 Vite 前端（需要另开 `npm run server`） |
| `npm run server` | 只启动 Node 服务（`--watch` 自动重启） |
| `npm run build` | 构建前端到 `dist/` |
| `npm start` | 生产模式：Node 托管 `dist` + WebSocket |
| `npm test` | 服务端房间 / 小熊 / 井字棋单元测试 |
| `npm run lint` | ESLint 检查前端和服务端 |
| `npm run preview` | Vite 预览构建结果（不含 WebSocket，不建议用来联机） |

## 目录

```text
.
├── server/
│   ├── index.js        # HTTP 静态服务 + WebSocket 房间网关
│   ├── game.js         # 纯逻辑：房间、小熊数值、聊天、井字棋
│   └── game.test.js    # node:test 单元测试
├── src/
│   ├── components/     # Bear / Scene / CarePanel / ChatPanel / GamePanel ...
│   ├── context/        # RoomContext：连接、重连、房间状态
│   ├── pages/          # Lobby / RoomPage
│   ├── utils/sound.js  # WebAudio 小音效
│   ├── gameConfig.js
│   ├── theme.js
│   └── index.css
├── scripts/dev.mjs     # 一条命令同时跑前后端
├── docs/               # README 截图
├── Dockerfile
├── render.yaml
└── vite.config.js      # 开发时把 /ws 代理到 8787
```

## 测试

```bash
npm test        # 10 个服务端逻辑测试
npm run lint
npm run build
```

服务端测试覆盖：座位分配、重连、满房拒绝、动作效果与冷却、数值衰减与暂停、井字棋胜负 / 平局 / 换先手、聊天限流、快照不泄露 token。

## 已知限制 / 还可以加什么

- 房间只存在内存里，服务重启就没了；想长期保留可以加 SQLite / Redis；
- 没有账号，房间码就是唯一凭证；
- 目前只有一个实时小游戏（井字棋），后面可以加你画我猜、双人翻牌、合作接星星；
- 可以加一个「共同日记」：每天留一句话，第二天对方进来才能看到；
- 可以做成 PWA，手机上像 App 一样打开；
- 如果想要更省服务器，可以改成 WebRTC 点对点，但仍然需要一个信令服务。

---

为两个人做的小屋。祝你们玩得开心。🐻
