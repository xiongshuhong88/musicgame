# 部署指南 (Cloudflare Pages)

本指南将协助您将《华语金曲歌舞厅》免费部署到全球最快的 CDN 网络 Cloudflare 上。

## 方法一：GitHub 自动部署（推荐）
最省心的方法。只要您更新 GitHub 代码，网站会自动更新。

### 1. 准备工作
- 确保您的代码已推送到 GitHub：[https://github.com/xiongshuhong88/musicgame](https://github.com/xiongshuhong88/musicgame)
- 注册/登录 Cloudflare: [https://dash.cloudflare.com/](https://dash.cloudflare.com/)

### 2. 创建项目
1. 登录 Cloudflare 控制台，点击左侧菜单的 **Workers & Pages**。
2. 点击蓝色按钮 **Create Application** (创建应用)。
3. 切换到 **Pages** 标签页，点击 **Connect to Git**。

### 3. 配置构建
1. 选择您的 GitHub 仓库 `musicgame`，点击 **Begin setup**。
2. **Project name**: 保持默认或自定义（这将决定您的免费域名，如 `musicgame.pages.dev`）。
3. **Framework preset** (框架预设): 选择 **Vite**。
4. 确认以下设置（通常会自动填好）：
   - **Build command**: `npm run build`
   - **Build output directory**: `dist`
5. 点击 **Save and Deploy**。

### 4. 等待上线
Cloudflare 会自动拉取代码、安装依赖并构建。
约 1 分钟后，您会看到 **Success!**，点击链接即可访问您的游戏 (https://xxxx.pages.dev)。

---

## 方法二：手动上传 (拖拽部署)
如果您不想绑定 GitHub，可以直接上传构建好的文件。

1. 在本地运行构建命令：
   \`\`\`bash
   npm run build
   \`\`\`
   这会在项目根目录生成一个 `dist` 文件夹。

2. 在 Cloudflare 控制台 -> **Workers & Pages** -> **Create Application** -> **Pages**。
3. 点击 **Upload assets** (上传资源)。
4. 将本地的 `dist` 文件夹直接拖进网页框内。
5. 点击 **Deploy site**。完成！

## 常见问题
- **Q: 为什么上传后背景图片/视频不显示？**
  - A: 请检查文件名大小写。Linux/Cloudflare 对大小写敏感。例如代码写的是 `Video.mp4` 但文件是 `video.mp4`，在本地 Mac 可能正常，但在服务器会报错。
  - A: 确保资源都在 `public` 文件夹内。
