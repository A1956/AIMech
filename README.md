# AIMech 仿生机械设计智能学习平台

面向机械与机器人专业的**仿生机械设计**智能学习平台。以案例机理、参数表、答题智测、智慧方案推荐与班级智能学情及教学形成闭环。

## 作品定位与价值

- **原创 Web 应用**：由团队面向机械与机器人专业学习场景设计，提供 PC 与移动端自适应的仿生机械设计学习体验。
- **AI 是核心能力**：AI 助教结合案例检索与可选的大模型问答；智慧方案推荐、学习路径和班级学情分析共同支持“学、练、教、评”闭环。远程大模型不可用时，助教可回退到本地案例引擎。
- **社会价值与落地潜力**：帮助学生理解仿生结构与设计原理，为教师提供学习过程与班级学情参考；可作为课程辅助工具继续试点和迭代。当前版本以本地开发演示为主，正式落地前仍需接入生产级数据库、认证与访问控制。

## 技术架构

- **Web 前端**：Vue 3、Vue Router、Pinia 与 Vite，提供响应式学习界面和模块路由。
- **学习与分析功能**：案例库、答题智测、AI 助教、方案推荐、学习路径及教师学情分析；相关业务逻辑在 `src/` 中组织。
- **本地数据与 AI 服务**：json-server 使用 `mock/db.json` 提供开发数据；Node.js 代理可选地将对话转发至 DeepSeek。开发代理仅用于本机运行，不是生产后端。
- **主要依赖与命令**：详见下方技术栈、`package.json` 及启动步骤。

## 团队信息

- 团队：**智勇双全队**
- 成员及分工：待补充

## 运行与部署策略

- **当前阶段**：Vite / json-server 绑定 `127.0.0.1`。
- `mock/db.json` 是本地开发数据；上线前需迁移到服务端数据库，并由后端负责数据校验与访问控制。
- **部署能力**：`npm run build` 产出 `dist/`；大模型变量见 `.env.example`，密钥不入库。

## 功能命名（当前）

| 模块 | 名称 |
|------|------|
| 0 产品 | AIMech 智能学习平台 |
| 1 | 首页 |
| 2 | AI助教 |
| 3 | 案例库（智慧搜索） |
| 4 | 答题智测 |
| 5 | 智慧方案推荐 |
| 6 | 智能学习路径（学生端） |
| 7 | 智能教学路径（教师端） |
| 8 | 我的智慧档案 |
| 9 | 智能教学台（智能教学路径、案例管理） |
| 10 教师侧栏案例入口 / 教学台案例标签  | 案例智库 / 案例管理 |

## 主题

- **默认 Light Mode**：浅底 + 青绿主色 + 琥珀辅色，层次更丰富
- 可在侧栏 / 顶栏切换 **深色 Night**，偏好写入 `localStorage`（`bio-theme`）

## 素材说明

- 导航图标与 Hero 插画为项目内 SVG（`src/assets/icons`、`src/assets/illustrations`）
- 品牌 logo 为 `src/assets/logo.png`（512→256 缩放，圆形白底、圆外透明），统一由 `BrandLogo` 组件引用；站点图标为 `public/favicon.ico`、`favicon-32.png`、`favicon-16.png`、`apple-touch-icon.png`
- 若有已授权的 VCG 图片，放入 `public/media/hero.jpg`（或 `.png`），登录页与首页会自动优先使用；详见 `public/media/README.md`
- 不依赖 iconfont / VCG 在线 CDN，避免版权与外链风险

**素材来源与许可**


- 案例可改为「片头 + 实拍片段」（如 `kingfisher`）：`sources.json` 中把后两帧换成一项 `kind: "footage"`，脚本会自动缩放裁切、去音轨并接 0.5 秒交叉淡化。
- 只用 Pexels 免费许可照片，排除付费 / 赞助 / 仅限编辑用途素材；不下载、不使用带水印版本。
- 作品页、作者、许可链接记录在 `public/media/cases/sources.json`，详情页「查看素材来源与许可」可直接跳转。
- 署名仅用于来源追溯，不表示作者为本项目或课程背书；照片不做显微化、实验化等误导性改写。
- 原始照片留在 `public/media/cases/stills/`；实拍源片放 `scripts/footage/`（已 gitignore，不进站点），成片统一在 `public/media/cases/`。

**展示与交互**

- 默认只显示封面与「播放」按钮，不自动播放、不预加载视频本体（`preload="metadata"`）。
- 点击后在原位切换为播放器：原生控件提供进度与全屏；点击画面暂停/继续；`Esc` 或「关闭视频」停止并复位到 0 秒。
- 播放结束出现「重播」；关闭后焦点回到播放按钮，键盘可完整操作。
- 移动端按 16:9 自适应，容器预留比例避免布局跳动；视频无音轨，因此不依赖字幕即可理解。
- 清单加载失败时静默隐藏视频入口，案例正文与参数表不受影响。

## 技术栈

- Vue 3.5 + `<script setup>` · Vite 5 · Vue Router 4 · Pinia + LLM · RAG
- Axios · Element Plus · ECharts 5 · json-server · Tailwind CSS

## 代码规范与协作记录

- 按功能组织 Vue 单文件组件、API、composables、stores 与 utils；遵循项目现有命名和格式约定，复杂业务逻辑应补充必要注释。
- 使用 ESLint 检查 JavaScript 与 Vue 文件：`npm run lint`；使用 `npm run build` 验证生产构建。
- 保留真实、连续的 Git 提交历史，提交应反映实际开发工作，不为评审伪造或重写开发记录。

## 大模型接入（DeepSeek）

AI 助教「小智」的远程回答由 DeepSeek 提供，官方文档 `https://api-docs.deepseek.com/`。采用 OpenAI 兼容的 `/chat/completions` 接口，流式（SSE）返回。

- 调用链：浏览器将 system（人设 + 案例库）与多轮历史发给本机 `/llm/chat/completions` → 服务端代理添加凭据并请求 DeepSeek → 浏览器解析流式响应。
- 浏览器端只使用 `VITE_DEEPSEEK_ENABLED` 开关和超时配置；密钥、上游地址和模型只由 Node 服务端读取。
- 未启用远程功能时使用本地案例检索引擎。启用后，当前问题和最近 12 条对话会发送到 DeepSeek；不要输入个人或敏感信息。
- 降级顺序固定：**DeepSeek 大模型 → 本地案例引擎**；失败/超时/额度不足时回退本地，原因显示在回答下方。
- 多轮上下文由本地消息列表驱动，最多发送最近 12 条历史消息。

本地开发（Node.js 20.6+）：

```powershell
# 首次使用时创建本机配置；已存在时不要覆盖，手动合并示例中的非秘密设置。
Copy-Item .env.example .env.local
Copy-Item .env.server.example .env.server.local
```

在 `.env.server.local` 中填写 `DEEPSEEK_API_KEY`；不要使用 `VITE_` 前缀，也不要提交该文件。需要远程回答时，在 `.env.local` 设置 `VITE_DEEPSEEK_ENABLED=true`，然后启动代理：

```powershell
npm run llm:proxy
```

代理默认只监听 `127.0.0.1`。部署时不能把 Vite 开发代理当成生产后端；应部署受认证、限流保护的服务端代理，并仅在服务端配置密钥。AI 请求会把聊天文本发送给 DeepSeek。

可选的 OpenAI 兼容 TTS 同样通过服务端代理：在 `.env.server.local` 配置 `TTS_BASE_URL` 和（如需）`TTS_API_KEY`，前端仅设置 `VITE_TTS_PROVIDER=openai`。语音合成文本会发送至配置的 TTS 服务。`baidu` 模式也会把文本发送至百度；默认 `browser` 语音不使用远程 TTS。

## 启动步骤

```bash
# 终端 1
npm install
npm run mock

# 终端 2
npm run dev

# 终端 3（可选；启用远程 DeepSeek 时运行）
npm run llm:proxy
```

浏览器：`http://127.0.0.1:5280`

## 预置账号

| 角色 | 账号 | 密码 | 默认页 |
|------|------|------|--------|
| 学生 | `stu` | `MechDemo!26A` | `/` 首页 |
| 教师 | `teach` | `MechDemo!26A` | `/admin` 智能教学台 |

另有 `stu2` / `stu3`（密码同上）用于班级学情示例。智能学情预置 120 名虚构学生数据；新增账号采用“年份+班级+两位序号”的纯数字格式（如 `20260101`）。

**预置账号和口令是公开的开发数据，不是安全凭据，禁止用于真实账户。**

## GitHub 发布前检查

- **托管平台：GitHub**。提交评审前须将仓库设为 Public，或向评审者提供访问权限。
- `node_modules/` 和 `dist/` 已忽略；提交 `package.json` 与 `package-lock.json`，不要提交依赖目录。
- `.env.*` 本地配置、`.cursorrules` 和 `.rules` 文件已忽略；只提交 `.env.example` 与 `.env.server.example` 等不含密钥的模板。
- 不要把真实 API Key、令牌、数据库连接串或真实用户数据放入前端 `VITE_` 变量、源码或 mock 数据。
- `.env.example` 与 `.env.server.example` 提供环境变量模板；`package.json` 和 `package-lock.json` 分别记录项目依赖范围与锁定版本。
- 若密钥曾推送到远端，先在服务商处撤销/轮换，再从 Git 历史移除（例如使用 `git filter-repo` 并强制更新远端）；仅删除当前文件不足以清除历史泄露。

## 脚本

| 命令 | 说明 |
|------|------|
| `npm run dev` | 本机开发 |
| `npm run mock` | json-server :3001 |
| `npm run llm:proxy` | 本机 DeepSeek / OpenAI 兼容 TTS 服务端代理 |
| `npm run test:proxy` | 测试代理的密钥转发、来源限制与流式响应 |
| `npm run db:check` | 检查本地数据库主键、唯一账号、关联引用和试卷成绩 |
| `npm run build` | 生产构建（部署） |
| `npm run preview` | 本机预览 |
| `npm run lint` | ESLint |
