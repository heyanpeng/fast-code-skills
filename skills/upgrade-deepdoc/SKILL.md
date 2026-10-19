---
name: upgrade-deepdoc
description: 按用户指定版本升级 pptultra_com_fe 工作区的 DeepDoc 转换 SDK，同步桌面端直接依赖的平台引擎、两个转换包、锁文件和文档，完成依赖安装与针对性验证。适用于 DeepDoc SDK 和引擎版本升级，不用于其他依赖升级或转换功能开发。
---

# Upgrade DeepDoc

用户只需提供一个明确版本，例如 `$upgrade-deepdoc 1.3.5`。将其视为本次 SDK 的目标版本，不自行选择 latest。版本缺失时询问版本；已有版本则直接执行升级、安装和验证。

## 定位与版本确认

- 以当前工作区的 pnpm 根目录为准，确认存在下表中的三个使用方。工作区不匹配时先说明，不对其他项目套用此流程。
- 读取相关 `AGENTS.md`、`git status --short` 和目标文件的 diff，保留用户已有改动；本 skill 不依赖其他 workflow skill。
- 使用项目 `packageManager` 指定的 pnpm 和项目 `.npmrc` 中的 registry。不要输出认证配置。
- 修改前查询真实元数据：`pnpm view @q/deepdoc-convert-electron@目标版本 version engines peerDependencies optionalDependencies scripts --json`。版本不存在、无访问权限或元数据缺失时报告阻塞，不伪造锁文件或改用其他版本。
- 引擎版本以该 SDK 的 `optionalDependencies` 为准；通常与 SDK 同版本，但不能仅凭 SDK 版本猜测。必要时查询对应引擎的元数据。

## 必须同步的文件

| 文件 | 更新内容 |
| --- | --- |
| `apps/desktop/package.json` | `dependencies` 中的 `@q/deepdoc-convert-electron`；**同时更新本文件自己的 `optionalDependencies` 中三个平台引擎** |
| `packages/deepdoc-html2pptx/package.json` | SDK 版本，必须与桌面端使用**相同的精确目标版本**，禁止保留或引入 `^`、`~` 等范围前缀 |
| `packages/deepdoc-pptx2html/package.json` | SDK 版本，必须与桌面端使用相同的精确目标版本 |
| 两个转换包各自的 `README.md` | 同步当前 SDK 版本说明；无需改写历史记录或无关示例 |
| `pnpm-workspace.yaml` | 若已有 DeepDoc 的 `minimumReleaseAgeExclude` 条目，沿用其写法补充目标 SDK 和对应引擎版本，避免重复；保留已有例外和其他配置 |
| `pnpm-lock.yaml` | 由 pnpm 同步三个 importer 的 SDK、桌面端三个引擎、包解析和依赖快照 |

桌面端直接声明的引擎名称：

```text
@q/deepdoc-convert-engine-darwin-arm64
@q/deepdoc-convert-engine-darwin-x64
@q/deepdoc-convert-engine-win32-x64
```

SDK 内部依赖正确不代表桌面端直接依赖正确；两层都要处理。不要直接编辑 `node_modules` 中的 `package.json` 或手动改链接。

三个使用方的源 manifest 必须满足以下一致性契约：

```text
apps/desktop.dependencies[@q/deepdoc-convert-electron] === 目标版本
packages/deepdoc-html2pptx.dependencies[@q/deepdoc-convert-electron] === 目标版本
packages/deepdoc-pptx2html.dependencies[@q/deepdoc-convert-electron] === 目标版本
```

不要根据升级前的写法保留 `^旧版本`；本项目的包边界测试要求三个依赖字符串完全相等，范围依赖会导致测试失败并允许运行时版本漂移。

## 安装与锁文件

更新源配置后执行针对性安装，通常使用：

```bash
pnpm --filter @apps/desktop --filter @packages/deepdoc-html2pptx --filter @packages/deepdoc-pptx2html install --ignore-scripts --prefer-offline
```

- 先确认升级的 SDK 和引擎是否新增必要的安装脚本；有必要的初始化脚本时调整安装方式，不盲目跳过。
- `--prefer-offline` 优先缓存，缺失时仍可联网。只有已确认所需依赖可从缓存获得时才用 `--offline`；离线缺包时允许按项目 registry 正常联网安装，不把修改 manifest 当作已安装。
- 版本范围可能解析出比目标更高的 SDK。安装后核对三个 importer 的**实际锁定版本**，必要时用定向更新锁定用户指定版本；不要把更高版本当作完成。
- 检查最终 diff，只保留本次 SDK、引擎及其必要依赖的更新；不要升级无关依赖、切换包管理器或更改 registry。发现无法安全隔离的无关改动时说明原因。
- 文件系统、缓存目录或网络受限时使用宿主提供的授权机制，不用清空整个 `node_modules`、强制重装或改链接绕过限制。未能安装时明确报告未完成。

## 验收与精准验证

安装完成后逐项核对；不能只读 manifest 或只检查 SDK 内部路径：

1. 三个使用方源 manifest 和锁文件中的 SDK 与目标版本一致；版本范围的起始版本正确。
2. 三个使用方各自 `node_modules/@q/deepdoc-convert-electron/package.json` 的实际版本都是目标版本。
3. 桌面端 manifest 和锁文件中的三个引擎版本符合新 SDK 的 `optionalDependencies`。
4. 对当前系统配置支持安装的引擎，直接读取 `apps/desktop/node_modules/@q/deepdoc-convert-engine-平台/package.json`，核对真实版本及符号链接目标。
5. 使用 `createRequire` 从已安装 SDK 的实际路径解析对应引擎，确认内部解析到的版本与桌面端直接路径一致。当前项目在 macOS 配置安装 arm64、x64 两种引擎，两处都应检查。
6. 当前系统不安装的平台引擎检查 manifest 和锁文件即可，报告中注明未进行该平台的实机验证。

若相关命令和测试仍存在，运行：

```bash
pnpm --filter @packages/deepdoc-html2pptx --filter @packages/deepdoc-pptx2html typecheck
pnpm --filter @packages/deepdoc-html2pptx test
pnpm --filter @apps/desktop test tests/deepdocPptxConverter.test.ts tests/deepDocRuntimeVerification.test.ts
pnpm --filter @apps/desktop test tests/pptx2htmlPackageBoundaries.test.ts
git diff --check
```

还应调用现有 `apps/desktop/scripts/verify-package.mjs` 导出的 `verifyDeepDocRuntime`，针对已安装的每个 macOS 引擎目录检查版本和二进制文件存在性；这不等于运行了真实转换或完整打包。

优先复用同一对话内与最终 diff 仍匹配的验证结果；新增改动使覆盖失效时补跑对应检查。测试路径变化时只查找直接相关替代项。检查失败时区分升级兼容性问题与环境/已有失败，不声称升级验证通过。若包边界测试失败，优先检查三个 manifest 的依赖字符串是否完全等于目标版本，不得以“升级前已有范围形式”为理由忽略。

默认不运行全量测试、完整构建、打包或真实转换集成测试；出现具体兼容性风险或用户要求时再扩大验证。

## 交付

简要汇报目标 SDK 版本、对应引擎版本、修改文件、实际安装状态、已运行/复用的验证、未运行项和未解决问题，便于后续 review 或 commit 复用。

默认不创建 commit、不 push、不创建 PR。用户另有明确提交指令时按项目 Git 规范处理，提交信息使用英文前缀和中文说明，例如 `chore: 升级 DeepDoc 转换 SDK 和引擎至 目标版本`。
