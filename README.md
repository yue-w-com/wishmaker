# ☆ for, ever — Ever Given Wish Board ⚓︎

A cute black & white live wish board for the play *for, ever*.

| Page | URL | Who |
|---|---|---|
| **Client** | `/` (`index.html`) | Audience phones: name + wish → "Tell Captain Oh" |
| **Viewer** | `/viewer.html` | Stage projector (4:3): wishes scroll in a slow loop |
| **Setting** | `/setting.html` | Operator: lines on screen, scroll speed, delete / clear wishes |

Static site (GitHub Pages) + Firebase Realtime Database (free Spark plan). New wishes and setting changes appear on the Viewer instantly, with no refresh. The free plan does not sleep. Audience phones send wishes with one plain request and never keep a live connection, so they do not count toward the plan's 100-connection limit; only Viewer and Setting stay connected.

---

## 一次性设置（约 10 分钟）

### 1. 创建 Firebase 项目
1. 打开 <https://console.firebase.google.com> → **Add project**（可以关闭 Google Analytics）。
2. 左侧 **Build → Realtime Database → Create Database**：地区任选（亚洲观众可选 `asia-southeast1`），选择 **Start in locked mode**。
3. 打开 **Rules** 标签，把本仓库 `database.rules.json` 的全部内容粘贴进去，点 **Publish**。

### 2. 创建管理员账号（Setting 页面登录用）
1. **Build → Authentication → Get started → Sign-in method**：启用 **Email/Password**。
2. **Users → Add user**：填入你的邮箱和密码。
3. 复制这个用户的 **User UID**。
4. 回到 **Realtime Database → Data**：在根节点点 **+**，添加：
   - key: `admins`
   - 在其下添加 key = 你的 UID，value = `true`（布尔值）

   （也可以先直接登录 Setting 页面，页面会显示你的 UID。）
5. 建议：**Authentication → Settings → User actions**，取消勾选 *Enable create (sign-up)*，这样别人无法自行注册账号。

### 3. 填写网页配置
1. **Project settings（齿轮）→ General → Your apps → Web (`</>`)** 注册一个 Web App（不需要勾选 Hosting）。
2. 把显示的 `firebaseConfig` 中的值填入 `js/firebase-config.js`（注意 `databaseURL` 要和 Realtime Database 页面顶部显示的网址一致）。
3. 提交并推送到 GitHub。

> 这些配置值本来就是公开的（每个访客的浏览器都会拿到）。安全性由数据库规则保证：
> 任何人只能**新增**愿望（名字 ≤40 字、愿望 ≤200 字、时间戳由服务器生成），不能修改或删除；
> 只有 `admins` 中的账号能修改设置、删除或清空愿望。

### 4. 开启 GitHub Pages
仓库 **Settings → Pages → Build and deployment**：Source 选 *Deploy from a branch*，选择分支（如 `main`）和 `/ (root)` → Save。
几分钟后网址为 `https://<用户名>.github.io/wishmaker/`。（免费账号需要仓库为 public。）

---

## 演出当天 ✧
- **投影电脑**：打开 `…/viewer.html`，**双击或按 F 全屏**。画面固定为 4:3，屏幕比例不同时会自动加黑边。
- **观众**：把 `…/` 做成二维码贴在剧场里或投影出来。
- **后台**：手机或电脑打开 `…/setting.html` 并登录：
  - *Lines on screen*：屏幕上大约显示几行字（默认 5；数字越小字越大）
  - *Scroll speed*：1–100（默认 30）
  - 点 **Apply ✧** 后 Viewer 立即生效；每条愿望旁的 ✕ 可以删除单条（应对不合适的内容）；**Clear all wishes** 一键清空。
- 愿望少、一屏放得下时静止居中显示；超过一屏时自动循环向上滚动。
- 断网后 Viewer 会自动重连，并在底部提示。

## 本地测试（可选）
需要 Node.js 和 Java：
```bash
npx firebase-tools emulators:start --project demo-wishmaker   # 数据库 + 登录模拟器
python3 -m http.server 8080
```
然后在网址后加 `?emulator`，例如 `http://127.0.0.1:8080/viewer.html?emulator`。
模拟器中的管理员需要通过 Auth 模拟器创建，并用 `Authorization: Bearer owner` 写入 `admins/<uid>`。

## 文件
```
index.html / setting.html / viewer.html   三个页面
css/style.css                             黑白萌系样式
js/client.js  js/setting.js  js/viewer.js 页面逻辑
js/env.js                                 共享设置（SDK 版本、限制、模拟器切换）
js/firebase-config.js                     ← 填写你的 Firebase 配置
database.rules.json                       数据库安全规则
firebase.json                             模拟器 / CLI 配置
```
