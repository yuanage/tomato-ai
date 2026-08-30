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

/** 模拟模式下的 AI 思考过程样例（按 AGENT_ID 返回，多行文本） */
export function mockReasoning(systemPrompt) {
  if (systemPrompt.includes('AGENT_ID: task_split')) {
    return [
      '1. 解析任务目标与范围，确认最终交付物',
      '2. 识别可独立执行的子任务边界，避免相互依赖过强',
      '3. 按 1~2 个番茄（25 分钟）的粒度切分每个子任务',
      '4. 为每项预估番茄数，并按执行顺序排序输出'
    ].join('\n')
  }
  if (systemPrompt.includes('AGENT_ID: schedule')) {
    return [
      '1. 读取今日任务清单与各自预估时长',
      '2. 按精力曲线把深度任务排布到上午时段',
      '3. 任务之间插入 5~10 分钟缓冲与休息',
      '4. 校验全天安排不超载后输出时间轴'
    ].join('\n')
  }
  if (systemPrompt.includes('AGENT_ID: review')) {
    return [
      '1. 汇总本周番茄总量、专注时长与任务完成率',
      '2. 对比近 7 天趋势，定位异常波动日',
      '3. 提炼亮点与问题，生成下周可执行建议'
    ].join('\n')
  }
  if (systemPrompt.includes('AGENT_ID: focus')) {
    return [
      '1. 分析今日专注完成量与放弃/暂停记录',
      '2. 结合用户自述判断状态区间（好/一般/走神）',
      '3. 生成一条可立即执行的具体建议'
    ].join('\n')
  }
  return ''
}
