# 随处 · 网页定位

一个运行在 Windows 本机的浏览器定位模拟工具。用地图选点或搜索地点改变专用 Edge 浏览器中网页读取到的坐标，也可以绘制路线，让坐标按指定速度持续移动。

项目由 [zoe2026test](https://github.com/zoe2026test) 开发和维护。

## 下载与第一次使用

**当前是本机运行的源码版，还没有在线即用网站或免安装 EXE。**

[下载源码 ZIP](https://github.com/zoe2026test/suichu-browser-location/archive/refs/heads/main.zip) · [报告问题](https://github.com/zoe2026test/suichu-browser-location/issues/new?labels=bug&title=%5BBug%5D%20) · [提出建议](https://github.com/zoe2026test/suichu-browser-location/issues/new?title=%5B建议%5D%20)

1. 下载并解压源码 ZIP；不要直接在压缩包内运行。
2. 安装 [Microsoft Edge](https://www.microsoft.com/edge/download)、[Node.js 22 或更新版](https://nodejs.org/en/download)；地点搜索还需 [Python 3](https://www.python.org/downloads/windows/)。
3. 在解压后的文件夹找到 **启动网页定位.vbs** 并双击。找不到文件时，可在文件资源管理器里开启“查看 → 显示 → 文件扩展名”。
4. 程序会自动打开专用 Edge 和控制台。定位或选路线后，在这个专用浏览器中另开标签页访问目标网页，并允许网站获取位置。

**仅在普通 Edge 中打开本项目的 GitHub 页面或 `console.html`，不能启用定位。** 必须启动配套本地程序；下面有详细操作和路线说明。

### 反馈问题或建议

点击上方反馈链接，在 GitHub 登录后提交。请写明 Windows / Edge 版本、操作步骤、预期结果和实际结果；截图请遮住账户等个人信息。

### 为什么 Releases 和 Packages 为空？

当前只发布了源码，尚未发布正式 Release 下载版本。GitHub Packages 是开发用软件包的托管区，不是普通 Windows 安装包的下载按钮；本项目目前没有发布此类包。上面的源码 ZIP 链接现在即可使用，但仍需先安装运行环境。

## 功能

- 搜索“城市 + 地点名称”，按回车定位，支持同名地点候选。
- 点击地图选位置，或直接输入 WGS84 经纬度。
- 地图依次添加路点，显示路线连线和编号，支持撤销、清空。
- 按 0.1–300 km/h 播放路线，支持播放时调速、暂停、继续、停止和循环。
- 定位同步至专用 Edge 内已连接的网页，并自动配置新页面。
- 验证网页实际读取的坐标；可暂停模拟或复制坐标。

## 安装与启动（Windows）

1. 安装 Microsoft Edge、Node.js 22 或更新版本、Python 3（Python 用于地点搜索）。Node 和 Python 需要可从命令行调用；无需安装 npm 或 Python 第三方依赖。
2. 点击 GitHub 的 **Code → Download ZIP**，解压到固定文件夹。
3. 双击 `启动网页定位.vbs`，或在该文件夹运行 `npm start` / `node launch.cjs`。
4. 工具会打开专用 Edge 和本地控制台。在同一专用浏览器里打开要测试的网页，并允许该网站访问位置。

创建桌面入口：在 Windows 文件资源管理器中右键 `启动网页定位.vbs`，选择“显示更多选项 → 发送到 → 桌面快捷方式”。移动项目文件夹后需要重建快捷方式。

启动脚本优先寻找标准安装路径中的 Node，也兼容本机已有的 Codex 缓存运行时。如运行时装在其他位置，可设置 `SUICHU_NODE`、`SUICHU_PYTHON` 和 `SUICHU_EDGE` 环境变量。可选 `SUICHU_PROFILE` 指定专用浏览器数据目录。首次运行使用仓库中的默认示例地点；之后记住最后一次手动选择的地点。

## 播放路线

1. 先搜索目标区域或拖动、缩放地图。
2. 点击 **开始选路线**，按顺序单击地图添加至少两个路点。拖动地图只平移底图。
3. 输入速度（km/h），点击 **开始移动**。
4. 可随时修改速度、暂停或继续。停止后停留在最后的模拟位置。
5. “循环播放”在终点跳回起点；若希望闭合路线，请将最后一个路点选回起点附近。

路点之间按直线插值，不会自动贴合道路、计算绕行或避开建筑。需要转弯时增加路点。运动计算在本地控制服务运行，不依赖网页计时器；电脑休眠会中断更新。关闭所有专用 Edge 窗口会结束本次模拟，重启不会自动播放路线。

暂停模拟会恢复浏览器正常定位并暂停正在播放的路线；恢复模拟后，如需继续移动，再点击“继续路线”。手动定位到新地点会停止正在播放的路线。

## 原理与结构

```text
控制网页（地图 / 搜索 / 路线）
             ↓ 本机 HTTP API（127.0.0.1）
Node.js 控制服务 + 路线引擎
             ↓ Chrome DevTools Protocol
专用 Edge 页面的 Geolocation API
```

- `console.html`：无框架界面、地图瓦片、路线绘制和状态同步。
- `console-controller.cjs`：本机服务、请求校验、CDP 会话管理和坐标广播。
- `route.cjs`：球面距离计算、按时间推进、分段插值、暂停与循环。
- `runtime.cjs` / `launch.cjs`：运行时寻找、专用浏览器启动与服务复用。
- `search_places.py` / `geo.cjs`：地点查询与百度坐标转 WGS84。

默认每 500 ms 更新一次坐标，使用单调时钟按实际经过时间计算移动距离。仅改变专用浏览器中网页的 Geolocation 返回值；不改变 IP、Windows 系统位置或手机定位。依赖 IP 定位或自行校验位置的网站可能不会采用这些坐标。

本机接口绑定回环地址，写操作校验随机令牌和请求来源。浏览器个人资料及登录状态保存在本机，均不应提交 Git。独立下载的版本默认使用 `.local/edge-profile`；从原始工作目录运行时会兼容已有的专用配置目录。

## 测试

运行 `npm test`。单元测试覆盖按速度移动、暂停时间排除、途中调速、到达终点、循环、重复路点及无效输入。

开发时另做了真实 Edge 验证：地图点击添加路点、另一页面的 `watchPosition` 连续获取变化坐标、暂停保持坐标、调速继续，以及非法请求拒绝。自动化 CI 执行路线单元测试与主要脚本语法检查，不宣称覆盖第三方网站兼容性。

## 外部服务与许可

- 项目代码采用 [MIT 许可证](LICENSE)。
- `geo.cjs` 的坐标转换改编自 [hujiulong/gcoord](https://github.com/hujiulong/gcoord)，保留 [其 MIT 声明](GCOORD-LICENSE.txt)。
- 底图来自 OpenStreetMap，界面保留版权标注；地图数据、瓦片服务不适用本项目的 MIT 许可。
- 地点搜索依赖百度地图的公开查询端点，未使用收费密钥；其服务可用性和返回格式可能改变。不可用时仍能输入坐标或地图选点。
