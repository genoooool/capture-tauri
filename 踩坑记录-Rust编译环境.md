# 踩坑记录：Windows Tauri + Rust 编译环境问题

**日期：** 2026-03-06/07  
**项目：** D:\Project\capture\capture（截图美化工具）

---

## 问题背景

Claude Code 生成了完整的 Tauri + React + TypeScript 项目代码，前端代码和 Rust 框架代码均正常，但 Rust 编译阶段遇到系统性问题。

---

## 踩坑记录

### 坑 1：Rust 1.92 / 1.94 — const 求值 ICE

**症状：**
```
error: internal compiler error: scalar size mismatch
rustc 1.92.0 / 1.94.0 running on x86_64-pc-windows-msvc
```

**原因：** rustc 1.92-1.94 在 Windows MSVC 上有已知的 const 求值 ICE bug，影响 `zmij`、`version_check`、`windows-sys` 等多个 crate。

**尝试：** 升级到 1.94 → 问题依然存在，换 crate。

---

### 坑 2：windows-sys 0.59.0 / 0.61.x — 间接依赖 ICE

**症状：**
```
error[E0080]: scalar size mismatch: expected 0 bytes but got 4 bytes instead
error: could not compile `windows-sys`
```

**原因：** `windows-sys 0.59.0` 被 `webview2-com-sys` 等 Tauri 深层依赖强制拉入，无法通过降版自身 `windows` crate 解决。

**尝试：** 降低 Cargo.toml 中 `windows` 版本（0.58 → 0.52）→ 无效，间接依赖仍带入问题版本。

---

### 坑 3：Rust 1.81 — edition2024 不支持

**症状：**
```
feature `edition2024` is required
The package requires the Cargo feature called `edition2024`, but that feature is not stabilized in this version of Cargo (1.81.0)
```

**原因：** `edition2024` 在 Rust 1.85 才稳定，1.81 太旧。

---

### 坑 4：Rust 1.85 — time crate 版本要求

**症状：**
```
error: rustc 1.85.0 is not supported by the following packages:
  time@0.3.47 requires rustc 1.88.0
  time-core@0.1.8 requires rustc 1.88.0
```

**原因：** Tauri 依赖的 `time` crate 新版要求 Rust ≥1.88，而 1.88+ 又有 ICE，完美夹在中间。

**缓解：** 手动降级 time 到 0.3.36 → `cargo update time@0.3.47 --precise 0.3.36`

---

### 坑 5：混合 Rust 版本编译缓存 — LNK1103

**症状：**
```
fatal error LNK1103: debugging information corrupt; recompile module
```

**原因：** 多次切换 Rust 版本（1.92 → 1.94 → 1.81 → 1.85 → nightly），编译缓存混用导致 `.rlib` 调试信息冲突。

**解决：** `cargo clean`（清理 ~3GB target 目录）

---

### 坑 6：Vite 端口 EACCES — Windows Hyper-V 端口保留

**症状：**
```
Error: listen EACCES: permission denied 127.0.0.1:1420
Error: listen EACCES: permission denied 127.0.0.1:1430
Error: listen EACCES: permission denied 127.0.0.1:3000
```

**原因：** Windows Hyper-V 预留了大范围端口，包括 1251-1450、2065-2379 等。Tauri 默认的 1420 和常用端口 3000 都在保留范围内。

**查询命令：**
```bash
netsh interface ipv4 show excludedportrange protocol=tcp
```

**解决：** 使用端口 7000（不在保留范围内）  
修改 `vite.config.ts`（port: 7000）和 `tauri.conf.json`（devUrl: http://localhost:7000）

---

### 坑 7：nightly Rust — softbuffer STATUS_ACCESS_VIOLATION

**症状：**
```
error: could not compile `softbuffer` (lib)
Caused by:
  process didn't exit successfully: (exit code: 0xc0000005, STATUS_ACCESS_VIOLATION)
```

**原因：** nightly 1.96.0 在编译 `softbuffer` crate 时编译器内存访问违例，可能是当前机器 Visual Studio Build Tools 版本（14.50.35717，预览版）与 nightly 不兼容。

---

### 坑 8：stable Rust + VS 2026 预览版 — moxcms STATUS_ACCESS_VIOLATION

**症状：**
```
error: could not compile `moxcms` (lib)
Caused by:
  process didn't exit successfully: `rustc.exe ...` (exit code: 0xc0000005, STATUS_ACCESS_VIOLATION)
```

**发现时间：** 2026-03-07

**根本原因：** 这是 rustc 在 **Windows + VS Build Tools 2026（预览版 18.x）+ 特定 crate（moxcms、softbuffer 等）** 上的编译器 bug（ICE），不是代码问题，也不是安装损坏。是版本组合本身不兼容导致。

**已验证环境：**
- Windows 10 + Hyper-V
- VS Build Tools 2026（18.2.1，预览版）+ VS Community 2022（17.14，稳定版）共存
- Rust stable（x86_64-pc-windows-msvc）
- Tauri 2.x 依赖链

**结论：** 本地 Windows 环境无法可靠编译，需要绕开本机编译器。

---

## 根本原因分析

这台机器存在以下特殊情况：
1. **Hyper-V 启用** → 大量端口被保留
2. **Visual Studio Build Tools 14.50.35717（预览版）** → 与多个 Rust 版本不兼容
3. **Tauri 2.x 依赖链复杂** → `windows-sys` 多版本共存，const 求值敏感

---

## 已完成状态

| 组件 | 状态 |
|---|---|
| 前端代码（React + TypeScript） | ✅ 完整，dist/ 已构建 |
| Rust 后端代码 | ✅ 完整，`cargo check` 通过（nightly） |
| Rust 编译（cargo build） | ❌ 环境问题，未完成 |
| Vite 开发服务器 | ✅ 端口 7000 可用 |

---

## 待解决方案（下次尝试）

### 方案 A（已尝试，失败）：重装 / 切换 Visual Studio Build Tools
- VS Community 2022（17.x 稳定版）已存在，但 VS 2026 预览版（18.x）同时存在并干扰 MSVC 工具链
- cargo +stable build 仍触发 STATUS_ACCESS_VIOLATION（moxcms crate）
- 结论：版本共存问题复杂，短期难以干净解决

### 方案 B（已尝试，未完成）：WSL2 编译
- Ubuntu-22.04 apt 损坏 → 重装 Ubuntu-22.04 成功
- Rust 1.94 + 编译依赖已安装
- 项目在 /mnt/d（Windows 盘），跨文件系统 I/O 极慢，预计编译 30-60 分钟
- 可行但耗时

### 方案 C（当前推荐）：GitHub Actions CI 编译
- 把项目推到 GitHub public 仓库
- 配 GitHub Actions workflow，在 windows-latest runner 上 cargo build
- 编译产物通过 CI artifact 下载
- 优点：干净的 Windows 环境，完全绕过本机编译器问题；免费 runner

### 方案 D（备用）：等 Rust / VS 修复
- 跟踪 rustc ICE issue，等稳定版修复后升级

---

## 关键文件路径

- 项目：`D:\Project\capture\capture\`
- Rust toolchain override：`D:\Project\capture\capture\src-tauri\` → nightly
- 修改过的文件：
  - `src-tauri/Cargo.toml`（windows 版本降级，image features 裁剪，time 版本锁定）
  - `src-tauri/src/lib.rs`（API 修复：Emitter、MouseButton、PngEncoder、HiDpi）
  - `vite.config.ts`（端口改为 7000）
  - `tauri.conf.json`（devUrl 改为 localhost:7000）
