# Windows 单文件 EXE 构建

在 Windows 上使用内置 .NET Framework C# 编译器构建，不需要额外的 .NET SDK。

```powershell
./scripts/build-windows.ps1
```

脚本下载官方 Node.js 24.22.1 Windows x64 ZIP，并对照固定 SHA256 验证。EXE 内嵌运行时、Node 许可证和应用代码；不会在用户首次打开时再下载运行环境。

启动器以普通用户权限运行，将文件准备到 `%LOCALAPPDATA%\Suichu\application\1.2.1`。每次启动核对文件清单与 SHA256，使用互斥量避免同时解压；启动隐藏的内置 Node 服务，再由服务打开系统 Edge。目标位置、浏览器资料和日志保存在版本目录之外，升级时可继续使用。

搜索通过 EXE 的 `--search-http` 内部操作使用 Windows HTTPS，不依赖 Python、PowerShell 搜索脚本或用户安装的 Node。只接受 HTTPS 输入，响应大小和超时均有限制。

`SUICHU_DATA_DIR` 可用于独立测试配置；`SUICHU_TEST_NO_DIALOG=1` 仅在自动测试时关闭错误弹窗。CI 使用 `SUICHU_HEADLESS=1` 验证浏览器功能，用户正常启动不会使用无界面浏览器。

构建后可以执行 `scripts/smoke-windows.ps1`：清除该测试进程 PATH 中的 Node/Python，双击方式启动 EXE，验证重复启动、定位、路线和退出。外部搜索实测可额外设置 `SUICHU_QA_EXTERNAL_SEARCH=1`。

当前构建产物未使用代码签名证书。GitHub Releases 同时提供 SHA256SUMS.txt；构建目录与运行数据均不提交到 Git。
