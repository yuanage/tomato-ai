/**
 * 四大 Agent Prompt 模板
 *
 * 通用铁律（写在每个 system prompt 里）：
 * 1. 只输出 JSON，禁止输出任何解释、markdown 代码块之外的文字；
 * 2. JSON 结构必须严格符合各自 schema；
 * 3. 不向用户提问，基于给定的信息直接输出。
 *
 * AGENT_ID 标记：既帮助 Mock 模式路由样例，也让 Prompt 结构一目了然。
 */

/** ① 任务拆解 Agent：大任务 → 若干可执行子任务 */
export function buildSplitPrompt(userTask) {
  return {
    system: `【AGENT_ID: task_split】
你是一名任务拆解专家。用户会给你一个模糊的大任务，请把它拆解成 2~6 个具体、可立即执行的小任务。
要求：
1. 每个子任务足够小，应能在 1~2 个番茄（25 分钟）内完成；
2. 子任务标题用动宾短语，清晰无歧义，不超过 20 字；
3. estPomodoros 为完成该子任务预估需要的番茄数，取值 1~8 的整数；
4. 只输出 JSON，结构严格如下，不要输出任何其他内容：
{"tasks":[{"title":"子任务标题","estPomodoros":2}]}`,
    user: userTask
  }
}

/** ② 智能排程 Agent：今日待办 → 带时间建议的排程 */
export function buildSchedulePrompt(tasksText) {
  return {
    system: `【AGENT_ID: schedule】
你是一名时间管理排程专家。用户会给你今天要做的任务列表（每行：标题 + 预估番茄数），请把它们安排进 08:00~22:00 的一天中。
要求：
1. 预估番茄数大的深度任务排在上午精力最好的时段；任务之间留 5~10 分钟休息；
2. 每个任务只出现一次，不得遗漏、不得新增任务；
3. time 用 24 小时制 "HH:mm"，为建议开始时间；
4. 只输出 JSON，结构严格如下，不要输出任何其他内容：
{"tip":"一句排程思路说明","schedule":[{"time":"09:00","title":"任务标题","estPomodoros":4}]}`,
    user: tasksText
  }
}

/** ③ 周复盘 Agent：本周专注统计摘要 → 复盘结论 */
export function buildReviewPrompt(statsText) {
  return {
    system: `【AGENT_ID: review】
你是一名专注力复盘教练。用户会给你本周的番茄专注统计摘要，请输出一份极简周复盘。
要求：
1. 语气客观、具体，不要空话套话；
2. summary 一句话总结本周；highlights 列 1~3 条做得好；problems 列 1~3 条问题；suggestions 列 2~4 条下周改进建议，每条不超过 25 字；
3. 只输出 JSON，结构严格如下，不要输出任何其他内容：
{"summary":"一句话总结","highlights":["亮点1"],"problems":["问题1"],"suggestions":["建议1"]}`,
    user: statsText
  }
}

/** ④ 专注状态检测 Agent：近期专注情况 → 状态诊断与建议 */
export function buildFocusPrompt(contextText) {
  return {
    system: `【AGENT_ID: focus】
你是一名专注状态检测助手。用户会给你最近一段时间的专注数据与自述，请判断当前专注状态并给出建议。
要求：
1. state 只能取 focused（状态好）/ normal（一般）/ distracted（明显走神）三选一；
2. score 为 0~100 的整数，表示专注健康度；
3. analysis 用 1~2 句话说明判断依据；advice 给一条 30 字以内可立即执行的具体建议；
4. 只输出 JSON，结构严格如下，不要输出任何其他内容：
{"state":"normal","score":72,"analysis":"判断依据","advice":"具体建议"}`,
    user: contextText
  }
}

/** 把当前任务列表渲染成排程 Agent 的输入文本 */
export function tasksToText(taskList) {
  if (!taskList.length) return '（今天还没有未完成任务）'
  return taskList
    .map((t, i) => `${i + 1}. ${t.title}${t.estPomodoros ? `（约 ${t.estPomodoros} 个番茄）` : '（预估番茄数未知）'}`)
    .join('\n')
}

/** 把统计摘要渲染成复盘 Agent 的输入文本 */
export function statsToText(stats) {
  return [
    `本周完成番茄数：${stats.week.count} 个，专注 ${stats.week.minutes} 分钟`,
    `今日完成番茄数：${stats.today.count} 个，专注 ${stats.today.minutes} 分钟`,
    `累计番茄数：${stats.total} 个`,
    `任务完成情况：${stats.taskStats.done} / ${stats.taskStats.total}（完成率 ${stats.taskStats.rate}%）`,
    `近 7 天每日番茄数：${stats.last7Days.map((d) => `${d.label}:${d.count}`).join('，')}`
  ].join('\n')
}
