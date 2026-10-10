# Fast Code Skills

面向已有项目的小需求技能库：最小修改、精准验证、快速审查、逐条修复和选择性提交。使用标准 `SKILL.md` 格式，面向 Codex、Claude Code 及其他支持 Agent Skills 的工具。

## 技能列表

| 技能 | 用途 | 调用示例 |
| --- | --- | --- |
| [fast-small-task](skills/fast-small-task/SKILL.md) | 完成低风险小需求 | 隐藏这个页面的分享按钮，只跑相关检查 |
| [fast-small-review](skills/fast-small-review/SKILL.md) | 审查小改动，只报告可行动问题 | 快速审查刚才的改动，不修改代码 |
| [fast-review-fix](skills/fast-review-fix/SKILL.md) | 核实并修复具体 review findings | 修复刚才审查的 P2 问题，只做必要改动 |
| [fast-commit](skills/fast-commit/SKILL.md) | 选择性暂存并提交当前任务改动 | 提交这次任务，不带上无关文件 |

每个技能可以独立使用，也可以在同一对话中依次使用，复用目标、改动范围和验证结果。高风险任务会升级到适当的完整流程。

## 安装

### Skills CLI

仓库内容发布到 GitHub 后，在需要使用技能的项目根目录运行：

```bash
npx skills add heyanpeng/fast-code-skills
```

按安装器提示选择技能、目标工具和安装范围。个人全局安装：

```bash
npx skills add heyanpeng/fast-code-skills -g
```

CLI 需要 Node.js/npm 和网络。这些在线安装命令尚未在本仓库实测；以安装器当前提示为准。无需 CLI 的完整安装步骤见 [使用说明](docs/usage.md#手动安装)。

### 在当前仓库使用

`skills/` 是唯一维护源。Codex 的 `.agents/skills` 和 Claude Code 的 `.claude/skills` 均链接到该目录。Codex 也可按 [AGENTS.md](AGENTS.md) 中的指引读取技能。入口维护步骤见 [使用说明](docs/usage.md#在此仓库启用原生技能入口)。

建议先用自然语言点名技能，例如：

```text
使用 fast-small-task，完成这个小需求，并只运行直接相关的检查。
```

当前仓库已配置原生技能入口，Codex 可使用 `$fast-small-task`，Claude Code 可使用 `/fast-small-task`；实际发现及调用方式以所用工具版本为准。

## 兼容与行为

- 技能正文以中文编写；回答语言、提交格式遵循使用者和目标项目的约定。
- `apply_patch` 不可用时，允许宿主的等价局部编辑工具。
- 行级评论能力不可用时，输出包含文件和行号的普通文本。
- 完整审查技能不是必需依赖；需要升级时使用宿主现有能力继续审查。
- 开发、审查和修复技能不自动提交；`fast-commit` 仅在用户明确要求提交时执行，不自动推送。
- 这是流程指导，不包含测试运行器；验证依赖目标项目实际提供的工具。

兼容处理已写入技能，未声称所有宿主均完成端到端验证。其他工具应按其技能安装规范加载 `skills/<name>/`。

## 维护与许可

修改 `skills/<name>/SKILL.md`，再更新受影响的文档。个人安装目录是安装结果，更新前保存自己的定制内容。安装、更新、卸载和验证步骤见 [使用说明](docs/usage.md)。

本项目采用 [MIT License](LICENSE)，允许使用、修改和再分发，并要求保留版权及许可声明。
