# 从下载到第一次定位

## 普通用户：下载一个 EXE 即可

1. 打开[下载页](https://github.com/zoe2026test/suichu-browser-location/releases/latest)。
2. 在 Assets 中选择 **Suichu-v1.2.1-win-x64.exe**，保存到固定位置并双击。
3. 等待第一次准备本机文件，程序会自动打开专用 Edge 和定位控制台。
4. 选好位置或路线后，在同一专用 Edge 中另开标签，访问待测试网页并允许位置权限。

**无需安装 Node.js 或 Python。** 支持 Windows 10 / 11 x64，继续使用系统已安装的 Microsoft Edge。不是手机应用，也不会修改手机或微信小程序定位。

EXE 已包含运行环境，首次启动不下载运行环境。地图和地点搜索仍需要联网；当前 EXE 未做商业代码签名，Windows 可能显示发布者未知。请核对项目来源和发布页的 SHA256 校验值。

## 设置位置与播放路线

- 搜索：输入“城市 + 地点名称”，回车或选择候选结果。搜索结果覆盖取决于地图数据。
- 地图：拖动浏览、滚轮缩放，单击选点。
- 坐标：展开“直接输入经纬度”，使用 WGS84 纬度和经度。
- 路线：点击“开始选路线”，按顺序添加至少两个点，设置速度并点击“开始移动”。

播放过程中可以调速、暂停、继续或停止。连线是直线，不自动贴合道路。循环会从终点跳回起点，闭环请手动把末点选回起点附近。

界面显示“网页已读取到这个位置”，只表示控制台读到了相应坐标。其他网站必须在同一专用浏览器内打开并允许位置权限，部分网站可能使用其他定位方式。

## 退出与本机文件

点击“暂停模拟”可恢复正常定位并暂停路线。关闭所有专用 Edge 窗口结束本次模拟，重启不会自动播放路线。

程序在 `%LOCALAPPDATA%\Suichu` 保存运行文件、专用浏览器资料、最后一次手动位置和诊断文件。请勿把整个目录上传到 GitHub 或反馈表单。

桌面入口：右键下载的 EXE → 显示更多选项 → 发送到 → 桌面快捷方式。移动 EXE 后需重建快捷方式。

## 常见问题

**找不到下载？** 选择 Assets 中以 `.exe` 结尾的文件。Source code 是开发者源码，不是给普通用户的启动程序。

**提示找不到 Edge？** 安装 [Microsoft Edge](https://www.microsoft.com/edge/download)，然后重新双击 EXE。

**地点搜索不可用？** 试试“城市 + 地点”，或使用地图选点、经纬度输入及内置快捷地点。服务可能暂时不可用；不需要为此安装 Python。

**启动失败？** 查看 `%LOCALAPPDATA%\Suichu` 中的 `launcher-error.txt` 或 `launch-error.txt`，通过[Bug 表单](https://github.com/zoe2026test/suichu-browser-location/issues/new?template=bug_report.yml)反馈。日志请先遮住个人路径等信息。

**已有旧源码版怎么办？** 旧源码版仍可独立使用，EXE 默认使用自己的本机资料目录。它不会导入旧浏览器的登录数据。

## 开发者：运行源码

下载源码 ZIP 并解压，安装 Node.js 22+ 和 Microsoft Edge。执行 `node launch.cjs` 或使用源码包中的启动文件。不再需要 Python。

源码可用 `SUICHU_EDGE` 指定 Edge 路径、`SUICHU_PROFILE` 指定专用浏览器资料、`SUICHU_DATA_DIR` 指定状态目录。搜索可用 `SUICHU_SEARCH_URL` 指定兼容 Photon 的服务地址。
