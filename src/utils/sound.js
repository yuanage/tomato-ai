/**
 * 提示音：WebAudio 双音短促提示（A5 → D6，正弦波衰减）
 * 零音频资源文件、离线可用；环境不支持或用户未交互时静默失败。
 */
let ctx = null

export function playCompleteSound() {
  try {
    ctx = ctx || new (window.AudioContext || window.webkitAudioContext)()
    if (ctx.state === 'suspended') ctx.resume()
    const now = ctx.currentTime
    const notes = [880, 1174.66]
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      const t = now + i * 0.18
      osc.type = 'sine'
      osc.frequency.value = freq
      gain.gain.setValueAtTime(0.0001, t)
      gain.gain.linearRampToValueAtTime(0.25, t + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.16)
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start(t)
      osc.stop(t + 0.2)
    })
  } catch {
    /* 静默失败：音效缺失不影响计时主流程 */
  }
}
