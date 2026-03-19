# Mood Space — Frontend

用户侧 Web 应用，基于 React + Vite，部署在 VPS 上。

---

## Tech Stack

- **React + Vite** — 前端框架
- **Vanilla CSS** — 样式（现代/高级风格）
- **React Router** — 页面路由
- **React Hooks** — 状态管理
- **Lucide React** — 图标库

## Key Pages

| 路由 | 说明 |
|---|---|
| `/` | 落地页 / 模板目录 |
| `/gallery` | 模板展示 |
| `/builder` | 核心定制引擎 |
| `/myspace` | 用户项目管理 |
| `/admin` | 管理控制台 |

---

## 本地开发

```bash
npm install
cp .env.example .env
# 编辑 .env，设置 VITE_API_BASE_URL=http://localhost:3000
npm run dev
```

---

## VPS 生产部署

### 1. 环境依赖

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y git curl build-essential nginx certbot python3-certbot-nginx
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
```

### 2. 克隆代码

```bash
cd /opt
git clone https://github.com/<你的用户名>/RomanceSpace-Frontend.git MoodSpace-Frontend
cd MoodSpace-Frontend
```

### 3. 配置 .env

```bash
cp .env.example .env
nano .env
```

```ini
VITE_APP_NAME=Mood Space
VITE_API_BASE_URL=https://api.moodspace.xyz
VITE_SUPABASE_URL=https://你的项目.supabase.co
VITE_SUPABASE_ANON_KEY=eyJh...
```

### 4. 构建

```bash
npm install
npm run build
# 产物输出到 dist/
```

### 5. 配置 Nginx

在 CF Dashboard 中，将 `www.moodspace.xyz` 的 A 记录暂时设为**灰云**（仅 DNS），然后申请证书：

```bash
sudo certbot --nginx -d www.moodspace.xyz
```

编辑 Nginx 配置：

```bash
sudo nano /etc/nginx/sites-available/default
```

找到 `server_name www.moodspace.xyz;` 的块，修改为：

```nginx
root /opt/MoodSpace-Frontend/dist;
index index.html;

location / {
    try_files $uri $uri/ /index.html;
}

# 静态资源强缓存
location /assets/ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}
```

```bash
sudo systemctl restart nginx
```

证书申请成功后，将 CF 中 `www.moodspace.xyz` 的 DNS 记录改为**橙云**（Proxied）。

### 6. 验证

```bash
curl -I https://www.moodspace.xyz
# 期望: HTTP/2 200
```

---

## 后续更新代码

```bash
cd /opt/MoodSpace-Frontend
git pull
npm run build
# Nginx 自动读取新 dist/，无需重启
```

### 自动化更新（可选）

参照 Backend 的 `deploy.yml`，为 Frontend 仓库创建 `.github/workflows/deploy.yml`：

```yaml
name: Deploy Mood Space Frontend to VPS

on:
  push:
    branches: [master]
  workflow_dispatch:

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

在 GitHub 仓库 **Settings → Secrets → Actions** 中添加 `SSH_HOST`、`SSH_USER`、`SSH_KEY`。

---

## 更换项目名时修改

| 文件 / 位置 | 修改内容 |
|---|---|
| `index.html` | `<title>新品牌名 💕</title>` |
| `package.json` | `"name"` 字段 |
| VPS `.env` | `VITE_APP_NAME=新品牌名` |
| VPS 操作 | `npm run build` 重新构建 |

## 更换域名时修改

| 文件 / 位置 | 修改内容 |
|---|---|
| VPS `.env` | `VITE_API_BASE_URL=https://api.新域名` |
| Nginx 配置 | `server_name www.新域名;` |
| VPS 重新申请证书 | `sudo certbot --nginx -d www.新域名` |
| VPS 操作 | `npm run build` 重新构建 |

---

## Guidelines

- **No Hardcoding**: API 地址、品牌名一律走 `.env` 环境变量
- **Mobile First**: 所有 UI 组件必须适配移动端
- **Premium Feel**: 保持高品质视觉设计风格
