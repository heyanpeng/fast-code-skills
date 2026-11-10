# 使用说明

## 目录与维护源

```text
fast-code-skills/
├── skills/
│   ├── fast-task/SKILL.md
│   ├── fast-feature-replica/SKILL.md
│   ├── fast-review/SKILL.md
│   ├── fast-fix/SKILL.md
│   ├── fast-commit/SKILL.md
│   ├── fast-l3-ai-native/SKILL.md
│   └── fast-upgrade-deepdoc/SKILL.md
├── .agents/skills -> ../skills
├── .claude/skills -> ../skills
├── AGENTS.md
├── CLAUDE.md
├── README.md
└── LICENSE
```

技能的正式源文件在 `skills/`。工具入口通过相对链接复用这些文件，不维护第二份正文。个人全局安装目录不随仓库编辑自动更新。

## 手动安装

先在合适的位置克隆仓库，下面命令以当前目录为克隆目标：

```bash
git clone https://github.com/heyanpeng/fast-code-skills.git
```

然后进入需要使用技能的目标项目。将下方路径改成实际克隆目录。项目级安装示例（macOS/Linux，或提供对应命令的 shell）：

```bash
mkdir -p .agents/skills .claude/skills
cp -R /path/to/fast-code-skills/skills/* .agents/skills/
cp -R /path/to/fast-code-skills/skills/* .claude/skills/
```

这里只复制技能目录，不复制技能库自身的 `AGENTS.md` 或 `CLAUDE.md`，避免改变目标项目的维护规则。

个人全局安装示例：

```bash
mkdir -p "$HOME/.codex/skills" "$HOME/.claude/skills"
cp -R /path/to/fast-code-skills/skills/* "$HOME/.codex/skills/"
cp -R /path/to/fast-code-skills/skills/* "$HOME/.claude/skills/"
```

Codex 设置了 `CODEX_HOME` 时，将全局目标改为该目录下的 `skills/`。其他工具使用自身规定的项目或全局技能目录，不应假定都读取同一目录。

首次复制前确认目标没有同名技能；已经安装或自定义过时，先备份并比较，再决定更新。Windows 可以通过文件管理器或 PowerShell 将这七个目录复制到目标技能目录；不需要保留符号链接。

安装后重新打开会话，并检查工具的技能列表是否出现七个名称。出现同名项目和全局技能时，核对工具实际加载的路径，避免误用旧版本。

## 在此仓库启用原生技能入口

本仓库已配置 `.agents/skills -> ../skills`，当前 Codex 会话可发现七个仓库技能。Codex 也可通过 `AGENTS.md` 读取 `skills/`。以下命令仅供入口缺失时在仓库根目录恢复使用：

```bash
mkdir -p .agents
ln -s ../skills .agents/skills
```

确认 `.agents/skills` 尚不存在后再执行；已有目录或链接时先检查内容，不直接覆盖。

Claude Code 已有 `.claude/skills -> ../skills`，并通过 `CLAUDE.md` 读取仓库维护约定。

如果系统不支持符号链接，改用上节的项目级复制安装。此时两份安装结果需要在源文件修改后更新；`skills/` 仍是唯一维护源。

## 调用与配合

可直接用自然语言点名技能：

```text
使用 fast-task，把按钮提示改成“保存草稿”，保持现有行为。
使用 fast-feature-replica，根据本地参考项目复刻设置页弹窗，包括 hover、按下、点击后的样式和打开/关闭交互。
使用 fast-review，检查刚才的改动，只报告有证据的问题。
使用 fast-fix，逐条核实并修复上述 findings，或处理已定位的日常问题。
使用 fast-commit，只提交本次任务相关的文件。
使用 fast-l3-ai-native，按 L3 方法把这个需求从探索推进到上线。
使用 fast-upgrade-deepdoc，按指定版本升级 DeepDoc SDK 和引擎。
```

原生入口启用后，Codex 的显式调用通常为 `$fast-task`、`$fast-feature-replica` 或 `$fast-upgrade-deepdoc 1.3.5`，Claude Code 为 `/fast-task`。如果工具未发现技能，检查安装路径与 `SKILL.md`，并重开会话；也可明确要求读取对应文件后按其流程执行。

`fast-feature-replica` 需要参考项目本地路径和明确的页面或功能描述；目标项目默认为当前工作区。它复刻可观察的视觉和交互状态，包括 hover、focus、按下、点击后的持久样式、弹窗/菜单以及关闭方式，数据仅使用目标项目现有能力或 UI mock，不实现后端逻辑。

最少输入参考项目路径和复刻目标；可以补充要覆盖的交互状态：

```text
使用 fast-feature-replica
参考项目：/absolute/path/to/reference-app
复刻目标：设置页中的通知弹窗
交互范围：按钮 hover 和点击样式、弹窗打开与关闭
```

同一对话中，`fast-task` 在完成实现和精准验证后默认调用 `fast-review`；后续技能复用目标、修改文件和验证结果。只有 diff 变化、验证覆盖失效或风险升级时才补充检查。用户可以明确要求跳过默认 review。独立使用审查技能时，可以指定 staged、unstaged、文件、commit 或审查基准。

`fast-commit` 遵循用户和项目的提交格式；默认排除无关改动，在保护分支、归属不明或验证失败等情况下停止并说明。它不会自动推送。

`fast-l3-ai-native` 在用户授权 push 后等待 GitLab CI 时，使用技能目录中的 `scripts/wait-gitlab-pipeline.mjs`。提前设置只读 API Token 和项目配置：

```bash
export GITLAB_BASE_URL=https://wisgit.qihoo.net
export GITLAB_PROJECT_PATH=sofe/pptultra_com_fe
export GITLAB_TOKEN='在环境中提供，不要写入仓库或日志'
node skills/fast-l3-ai-native/scripts/wait-gitlab-pipeline.mjs \
  --sha "$COMMIT_SHA" \
  --ref "$BRANCH_NAME"
```

脚本按 commit SHA 和分支精确匹配流水线，轮询至 `success`、`failed`、`blocked` 或超时，并输出一行 JSON；缺少 Token、找不到流水线、API/网络错误或超时都不能报告为 CI 通过。

## 更新与卸载

CLI 安装的技能可使用：

```bash
npx skills check
npx skills update
```

`update` 可能更新安装器管理的其他技能，执行前查看其提示并保存本地定制。CLI 的网络操作尚未实测。

手动安装时，先更新克隆仓库，再比较并重新复制七个技能目录。链接到本仓库源文件的入口随源文件更新，不需要复制。

卸载时只移除安装到目标位置的七个本仓库技能目录；不要删除整个技能目录，也不要删除其他技能。使用链接入口时，只移除相应入口链接即可。

## 本地验证

检查每个技能的 YAML frontmatter 中存在 `name` 和 `description`，并确认目录名与 `name` 一致。若已安装 Codex 的 `skill-creator` 校验器，可逐个运行（路径按实际环境调整）：

```bash
python3 /path/to/skill-creator/scripts/quick_validate.py skills/fast-task
python3 /path/to/skill-creator/scripts/quick_validate.py skills/fast-feature-replica
python3 /path/to/skill-creator/scripts/quick_validate.py skills/fast-review
python3 /path/to/skill-creator/scripts/quick_validate.py skills/fast-fix
python3 /path/to/skill-creator/scripts/quick_validate.py skills/fast-commit
python3 /path/to/skill-creator/scripts/quick_validate.py skills/fast-l3-ai-native
python3 /path/to/skill-creator/scripts/quick_validate.py skills/fast-upgrade-deepdoc
```

校验器依赖 PyYAML；它验证结构，不证明技能的实际执行行为。另需检查文档相对链接和工具入口，并运行 `git diff --check`。首次添加尚未暂存的文件时，Git diff 不包含这些文件，需要额外检查新文件格式。

在线安装、远端仓库公开状态和各宿主的端到端加载需要在可联网的对应环境实际验证。
