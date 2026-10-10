# 仓库维护约定

本仓库分发四个 fast 技能，正式源文件位于 `skills/<name>/SKILL.md`。修改源文件，工具入口链接复用源文件；不直接修改个人安装目录或复制出的安装结果。

用户点名 fast 技能，或任务符合其适用范围时，先读取对应文件再按其流程执行：

| 技能 | 文件 | 适用范围 |
| --- | --- | --- |
| fast-small-task | `skills/fast-small-task/SKILL.md` | 低风险小需求开发 |
| fast-small-review | `skills/fast-small-review/SKILL.md` | 小改动审查，只报告问题 |
| fast-review-fix | `skills/fast-review-fix/SKILL.md` | 核实和修复具体 findings |
| fast-commit | `skills/fast-commit/SKILL.md` | 用户要求提交当前任务 |

保持标准 `SKILL.md` frontmatter 和目录名一致。公共技能遵循使用者及目标项目的语言和提交规范；宿主专用工具必须有等价工具或文本回退。不要引入未随仓库分发的必需技能依赖。

技能变更后检查结构、相对链接和改动格式；新增脚本时实际运行有代表性的输入。安装或调用方式变化时同步更新 `README.md` 与 `docs/usage.md`。

这是技能库自身的维护规则；安装到其他项目时仅安装技能目录。提交、推送和其他外部操作依照用户授权执行。
