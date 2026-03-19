# 🎨 MoodSpace 前端侧 (React + Vite)

本仓库是 MoodSpace 平台向用户开放的“门面”。
它不仅包含了极简风格的首页和画廊，还内置了与后端强交互的单页应用核心：**全配置可视化页面建造机 (Builder)**。

---

## 🏗️ 核心技术栈
在设计时，我们秉承了极致的“Mobile First (移动优先)”思想和极简高颜值的路线：
- **前台框架**: React + Vite (构建飞快)
- **样式方案**: Vanilla CSS (极轻量现代风格，弃用臃肿的框架，手揉极致阴影与毛玻璃)
- **页面路由**: React Router v6
- **全局图库**: Lucide React
- **登录状态**: Supabase Auth

---

## 🗺️ 关键页面与路由分配

这里列出了前台的访问骨架，如果你想自己增加新的子页面，请沿用此规范。

| 访问虚拟路由 | 功能说明 | 核心组件 |
|---|---|---|
| `/` | **主站落地页** / 默认就是所有模版平铺图库 | `Gallery.jsx` |
| `/builder` | **页面建造机中心**，用户在这里自由配置他们自己的网页 | `Builder.jsx` |
| `/myspace` | **用户中心面板**，登录后管理属于自己的纪念网页，查看系统下发的“额度” | `MySpace.jsx` |
| `/admin` | **上帝视角面板**（隐藏），拥有管理员密码才能进入，在此强制刷新黑名单或拉取底层 GitHub 的新模板 | `Admin.jsx` |

---

## 💻 开发者：本地运行指南

如果你克隆下了代码打算本地自己改改前台：

1. **克隆并进入库**：
   ```bash
   git clone https://github.com/XShen-Jason/MoodSpace-Frontend.git
   cd MoodSpace-Frontend
   ```
2. **装好依赖包**：
   ```bash
   npm install
   ```
2. **准备环境变量**：
   ```bash
   cp .env.example .env
   ```
   **修改 `.env` 文件**：将 `VITE_API_BASE_URL` 改成你本地正在运行的后端地址：`http://localhost:3000`。
   这样本地的前台就会去调本地的后台获取数据，不污染线上！
3. **点火热力发跑**：
   ```bash
   npm run dev
   ```

---

## ⚙️ 环境变量保姆级配置详解 (.env)

当你在 VPS 上拉取了这套前端代码准备上线时，你面临的第一步也是配置环境。
新手请一定要清楚这里每一项是去哪里找的：

- `VITE_APP_NAME=Mood Space`
  - 这是个“虚拟项目名”，你想让你搭建的网站名片显示什么，这里就填什么，不用修改代码。
- `VITE_API_BASE_URL=https://api.moodspace.xyz`
  - 万能 API 插槽。你的前端要和你的全网后端交互，这个地址就是后端的公网入口。必须是 `https`，且指向你在 CF 绑定的那个提供后台服务的域名。
- `VITE_SUPABASE_URL=（你的 Project URL，形如 https://xxx.supabase.co）`
  - 去你创建的 Supabase 项目的 `Project Settings -> API` 里找。
- `VITE_SUPABASE_ANON_KEY=eyJhbGciOiJI...`
  - **⚠️ 核心保命警告**：同样在那个页面，找到标有 `anon/public` 的这一串短密钥！如果你在这填了那串极长的 `service_role` 密钥你的系统就拥有了终极毁灭的安全漏洞！

---

## 🚀 生产环境全景部署 (VPS) 与 Nginx 救世级排坑

### 1. 构建出最终极速版 HTML
当配置好 VPS 上的 `.env` 后
```bash
sudo npm run build
```
这一步不仅压缩了你满屏幕的代码，还将其打碎揉成了最紧致的结构。所有的成品都会塞进根目录那个叫 `dist/` 的文件夹里。

### 2. Nginx 配置：单页路由与跨域终结者
对于像 MoodSpace 这种将前后端装在同一个服务器的应用，最怕的就是各种跨域和 404！请打开你的 `/etc/nginx/sites-available/default` 或专用配置文件，**必须这么写**：

```nginx
server {
    listen 80;
    server_name www.moodspace.xyz moodspace.xyz;  # 你的用户访问域名

    # 【防单页死循环机制】
    # 解析你打包出来的 dist 文件夹
    location / {
        root /opt/MoodSpace-Frontend/dist;
        index index.html;
        # 这一句是 React 单页应用的命门！
        # 每当访问 /builder 时如果找不到真实文件夹，就强行退回入口的 index.html 给 React 路由器自我处理！
        try_files $uri $uri/ /index.html;
    }

    # 【后台路径与前端资源的绝佳融合处理】
    # 因为用户预览时需要加载后台存下的“模板素材”(如 assets/模板.jpg) 
    # 所以我们得写个双保险：如果本前台 dist 里拿不到这个图，就踢到后台代理 (3000端口) 让他去找模板库要！
    location /assets/ {
        root /opt/MoodSpace-Frontend/dist;
        try_files $uri @backend_assets;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }
    location @backend_assets { proxy_pass http://127.0.0.1:3000; }
    
    # 【将后端所有服务通过主站入口进行同门代理，彻底干掉跨域】
    location /api/ { proxy_pass http://127.0.0.1:3000; }
}
```

### 3. Let's Encrypt 证书申请 (关键！)
1. 第一回合，你的 Cloudflare 里的这个主域名必须调成 **☁️ 灰色 (DNS Only)**！
2. 然后在 VPS 敲入 `sudo certbot --nginx -d www.moodspace.xyz -d moodspace.xyz`
3. 第二回合，拿到神圣的小绿锁后，火速切回 Cloudflare 面板，把它调成 **🟠 橙云 (Proxied)**！
只有这样，你的这个庞大的前台应用才会自动被 CF 那全球几千个边缘节点缓存！不管哪个国家访问都是瞬间打开，且你的真实 VPS 不受任何攻击！

---

## 🔄 如果你想偷懒：一行触发自动化更新？

我们早就想好了。参照后端的做法，如果你以后在本地改好了代码推送到 GitHub 主支（`master` 或者 `main`），可以写个自动拉过去打包的指令流：
在 `.github/workflows/deploy.yml` 里：
```yaml
name: Deploy Mood Space Frontend
on:
  push:
    branches: [master]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: appleboy/ssh-action@master
        with:
          host: ${{ secrets.SSH_HOST }}
          username: ${{ secrets.SSH_USER }}
          key: ${{ secrets.SSH_KEY }}
          script: |
            cd /opt/MoodSpace-Frontend
            git pull origin master
            npm install
            npm run build
```
（并在 Github 配置好那 3 个密钥即可，大功告成，连重启都不用，因为 Nginx 会直接去读 `dist` 最新的变化）
