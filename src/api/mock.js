/**
 * Mock 数据：useMock=true 时按 AGENT_ID 返回样例 JSON。
 * 用途：没有 API Key 也能完整联调 AI 页面 UI 与导入逻辑。
 * 接通真实 API 后（设置页关闭 Mock），本文件不再被调用。
 */
export function mockResponse(systemPrompt, userContent) {
  // 延迟模拟网络
  return new Promise((resolve) => {
    setTimeout(() => resolve(buildMock(systemPrompt, userContent)), 400)
  })
}

function buildMock(system, user) {
  if (system.includes('AGENT_ID: task_split')) {
    return {
      tasks: [
        { title: '梳理发布会核心卖点与大纲', estPomodoros: 2 },
        { title: '撰写演示文稿初稿', estPomodoros: 4 },
        { title: '制作产品演示视频脚本', estPomodoros: 3 },
        { title: '彩排并收集反馈', estPomodoros: 2 }
      ]
    }
  }
  if (system.includes('AGENT_ID: schedule')) {
    return {
      tip: '把最重要、需要深度专注的任务排在上午精力最好的时段。',
      schedule: [
        { time: '09:00', title: '撰写演示文稿初稿', estPomodoros: 4 },
        { time: '11:00', title: '制作产品演示视频脚本', estPomodoros: 3 },
        { time: '14:30', title: '彩排并收集反馈', estPomodoros: 2 }
      ]
    }
  }
  if (system.includes('AGENT_ID: review')) {
    return {
      summary: '本周整体节奏平稳，专注习惯正在形成，但下午时段完成率偏低。',
      highlights: ['累计完成 12 个番茄，比上周多 4 个', '周三连续完成 5 个番茄，状态最佳'],
      problems: ['下午 14:00-16:00 专注中断较多', '大任务拆解不充分，导致半途切换'],
      suggestions: ['把深度任务统一安排在上午', '大任务先让 AI 拆解再开始', '每完成 4 个番茄安排一次长休息']
    }
  }
  if (system.includes('AGENT_ID: focus')) {
    return {
      state: 'normal',
      score: 72,
      analysis: '最近 3 个番茄平均中断 1 次，属于正常波动；今天上午完成度高于下午。',
      advice: '下次专注前先清空手边干扰物，把手机放到视线之外；若连续走神 10 分钟，果断结束当前番茄去活动 2 分钟。'
    }
  }
  // 兜底
  return { result: 'ok' }
}
