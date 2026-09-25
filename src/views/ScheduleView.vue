<template>
  <div class="schedule-page">
    <!-- 顶栏（WakeUp 式大标题 + 周导航 + 导入/设置） -->
    <div class="sched-topbar">
      <div>
        <div class="top-title">第 {{ viewWeek }} 周 <span class="top-dow">周{{ dowChar }}</span></div>
        <div class="top-date">{{ todayFull }}</div>
      </div>
      <div class="top-actions">
        <button class="icon-btn" type="button" title="导入 / 分享课表" @click="openImport">⤓</button>
        <button class="icon-btn" type="button" title="学期设置" @click="openMeta">⚙</button>
      </div>
    </div>

    <div class="sched-toolbar">
      <button class="week-btn" type="button" :disabled="viewWeek <= 1" @click="shiftWeek(-1)">‹</button>
      <div class="week-mid" role="button" @click="gotoCurrentWeek">
        <div class="week-range">{{ weekRangeLabel(viewWeek, meta.semesterStart, meta.totalWeeks) }}</div>
      </div>
      <button class="week-btn" type="button" :disabled="viewWeek >= meta.totalWeeks" @click="shiftWeek(1)">›</button>
      <button class="today-btn" type="button" @click="gotoCurrentWeek">今天</button>
    </div>

    <!-- 课表：表头 + 主体（全天节次常显，对标 WakeUp：左侧节次时间、实色课程块白字） -->
    <div class="sched-wrap">
      <div class="sched-header">
        <div class="grid-corner"></div>
        <div v-for="day in gridDays" :key="'h' + day.dow" class="day-head" :class="{ today: day.isToday }">
          <div>{{ day.label }}</div>
          <div class="day-date">{{ dayDate(day.date) }}</div>
        </div>
      </div>

      <div class="sched-body">
        <!-- 节次时间列：全天节次常显（节次序号 + 开始时间，对标 WakeUp 左列） -->
        <div class="time-col">
          <div v-for="sec in fullSections" :key="'t' + sec.index" class="time-cell">
            <span class="t-num">{{ sec.index }}</span>
            <span class="t-start">{{ sec.start }}</span>
          </div>
        </div>
        <!-- 星期列：背景节次线 + 课程块 -->
        <div
          v-for="day in gridDays"
          :key="'d' + day.dow"
          class="day-col"
          :class="{ 'col-today': day.isToday }"
        >
          <div v-for="sec in fullSections" :key="'l' + sec.index" class="cell-line"></div>
          <div
            v-for="c in coursesOf(day.dow)"
            :key="c.id"
            class="course-block"
            :class="{ 'course-today': todayDow === day.dow }"
            :style="blockStyle(c)"
            @click="openEdit(c)"
          >
            <div class="course-name">{{ c.name }}</div>
            <div v-if="c.location" class="course-loc">@{{ c.location }}</div>
            <div v-if="c.teacher" class="course-teacher">{{ c.teacher }}</div>
          </div>
        </div>
      </div>
    </div>

    <p v-if="!courses.length" class="empty-hint">
      还没有课程——点右下角 ＋ 添加第一门课（支持每周/单双周/自定义周次）
    </p>

    <!-- 悬浮新建按钮 -->
    <button class="fab" type="button" @click="openCreate">＋</button>

    <!-- 课程编辑弹窗（新建/编辑共用） -->
    <n-modal
      v-model:show="editShow"
      preset="card"
      :title="editing ? '编辑课程' : '新建课程'"
      :bordered="false"
      style="width: 340px"
    >
      <div class="form">
        <n-input v-model:value="form.name" placeholder="课程名称（必填）" />
        <div class="row2">
          <n-input v-model:value="form.location" placeholder="地点，如 A-101" />
          <n-input v-model:value="form.teacher" placeholder="教师" />
        </div>
        <div class="field-row">
          <span class="f-label">星期</span>
          <div class="day-picks">
            <button
              v-for="d in 7"
              :key="d"
              type="button"
              class="day-pick"
              :class="{ on: form.dayOfWeek === d }"
              @click="form.dayOfWeek = d"
            >
              {{ '一二三四五六日'[d - 1] }}
            </button>
          </div>
        </div>
        <div class="field-row">
          <span class="f-label">节次</span>
          <n-select
            v-model:value="form.startSection"
            :options="sectionOptions"
            placeholder="开始"
            style="width: 100px"
          />
          <span class="f-sep">至</span>
          <n-select
            v-model:value="form.endSection"
            :options="sectionOptions"
            placeholder="结束"
            style="width: 100px"
          />
        </div>
        <div class="field-row">
          <span class="f-label">周次</span>
          <n-radio-group v-model:value="form.weekRule.type" size="small">
            <n-radio-button value="every">每周</n-radio-button>
            <n-radio-button value="odd">单周</n-radio-button>
            <n-radio-button value="even">双周</n-radio-button>
            <n-radio-button value="custom">指定</n-radio-button>
          </n-radio-group>
        </div>
        <div v-if="form.weekRule.type === 'custom'" class="field-row">
          <span class="f-label"></span>
          <n-select
            v-model:value="form.weekRule.weeks"
            multiple
            :options="weekOptions"
            placeholder="选择周次（可多选）"
            style="width: 220px"
          />
        </div>
        <div class="field-row">
          <span class="f-label">颜色</span>
          <div class="swatches">
            <button
              v-for="c in COURSE_COLORS"
              :key="c"
              type="button"
              class="swatch"
              :class="{ on: form.color === c }"
              :style="{ background: c }"
              @click="form.color = c"
            ></button>
          </div>
        </div>
        <n-alert v-if="formConflicts.length" type="warning" :bordered="false">
          ⚠ 与「{{ conflictNames }}」时间冲突（同一天同一节次且周次重叠），保存时将再次确认
        </n-alert>
      </div>
      <template #footer>
        <div class="modal-actions">
          <n-popconfirm
            v-if="editing"
            positive-text="删除"
            negative-text="取消"
            :positive-button-props="{ type: 'error' }"
            @positive-click="handleDelete"
          >
            <template #trigger>
              <n-button type="error" quaternary>删除课程</n-button>
            </template>
            删除「{{ form.name }}」？
          </n-popconfirm>
          <div class="spacer"></div>
          <n-button @click="editShow = false">取消</n-button>
          <n-button type="primary" :disabled="!form.name.trim()" @click="handleSave">
            保存
          </n-button>
        </div>
      </template>
    </n-modal>

    <!-- 导入 / 分享课表弹窗（纯本地：HTML 教务表格粘贴 或 TA1 分享口令，不上传） -->
    <n-modal
      v-model:show="importShow"
      preset="card"
      title="导入 / 分享课表"
      :bordered="false"
      style="width: 330px"
    >
      <div class="form">
        <div class="field-row">
          <n-button size="small" quaternary @click="genShare">生成分享口令（一键复制）</n-button>
          <span class="meta-hint">同学粘贴 TA1: 口令即可导入你的课表</span>
        </div>
        <n-input
          v-model:value="importText"
          type="textarea"
          :rows="7"
          placeholder="粘贴教务系统课表 HTML 或 TA1: 分享口令"
        />
        <div class="btn-row">
          <n-button size="small" @click="clearImportText">清空</n-button>
          <n-button
            size="small"
            type="primary"
            :disabled="!importText.trim()"
            :loading="importParsing"
            @click="previewImport"
          >
            解析预览
          </n-button>
        </div>
        <div v-if="importPreview" class="import-result">
          <div class="import-count">
            可导入 {{ importPreview.fresh.length }} 门课程
            <span v-if="importPreview.duplicates.length > 0">（{{ importPreview.duplicates.length }} 门与现有课程重复，将跳过）</span>
            <span v-if="importPreview.skipped > 0">（忽略无效 {{ importPreview.skipped }} 条）</span>
          </div>
          <div v-for="(c, i) in importPreview.fresh.slice(0, 5)" :key="i" class="import-line">
            {{ c.name }} · 周{{ '一二三四五六日'[c.dayOfWeek - 1] }} 第{{ c.startSection }}-{{ c.endSection }}节
          </div>
          <div v-if="importPreview.fresh.length > 5" class="import-more">
            另有 {{ importPreview.fresh.length - 5 }} 门…
          </div>
          <div v-if="importPreview.duplicates.length" class="field-row">
            <n-switch v-model:value="importAll" size="small" />
            <span class="meta-hint">仍导入重复项</span>
          </div>
          <n-button type="primary" :disabled="!importPreview.fresh.length && !importAll" @click="confirmImport">
            确认导入
          </n-button>
        </div>
      </div>
    </n-modal>

    <!-- 学期设置弹窗 -->
    <n-modal
      v-model:show="metaModalShow"
      preset="card"
      title="学期设置"
      :bordered="false"
      style="width: 300px"
    >
      <div class="form">
        <div class="field-row">
          <span class="f-label">学期起始</span>
          <n-date-picker
            v-model:value="metaForm.startTs"
            type="date"
            :clearable="false"
            style="width: 160px"
          />
        </div>
        <p class="meta-hint">起始日所在周一为第 1 周；周次据此推算</p>
        <div class="field-row">
          <span class="f-label">总周数</span>
          <n-input-number v-model:value="metaForm.totalWeeks" :min="4" :max="30" style="width: 100px" />
        </div>
        <div class="field-row">
          <span class="f-label">周末</span>
          <n-switch v-model:value="metaForm.showWeekend" />
          <span class="meta-hint">关闭后仅显示周一至周五</span>
        </div>

        <!-- 节次时间表（P1 自定义） -->
        <div class="sections-head">
          <span class="f-label">节次时间</span>
          <n-button size="tiny" quaternary @click="resetSectionTimes">恢复默认</n-button>
        </div>
        <div class="sections-editor">
          <div v-for="sec in metaForm.sections" :key="sec.index" class="sec-edit-row">
            <span class="sec-idx">{{ sec.index }}</span>
            <n-time-picker v-model:value="sec.start" format="HH:mm" size="small" style="width: 88px" />
            <span class="f-sep">至</span>
            <n-time-picker v-model:value="sec.end" format="HH:mm" size="small" style="width: 88px" />
          </div>
        </div>
      </div>
      <template #footer>
        <div class="modal-actions">
          <n-button @click="metaModalShow = false">取消</n-button>
          <n-button type="primary" @click="handleSaveMeta">保存</n-button>
        </div>
      </template>
    </n-modal>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useMessage, useDialog } from 'naive-ui'
import {
  DEFAULT_SECTIONS,
  COURSE_COLORS,
  courseInWeek,
  buildWeekDays,
  weekRangeLabel,
  fmtDate,
  normalizeSections,
  findConflicts
} from '../utils/schedule'
import {
  sniffImport,
  parseHtmlCourseTable,
  decodeShareFull,
  encodeShare,
  sanitizeImport,
  dedupeAgainst
} from '../utils/importSchedule'
import { useSchedule } from '../composables/useSchedule'

const message = useMessage()
const dialog = useDialog()
const {
  courses,
  meta,
  currentWeek,
  ensureLoaded,
  addCourse,
  updateCourse,
  removeCourse,
  updateMeta
} = useSchedule()

const ROW_H = 48 // 每节行高（px），课程块定位依据
/** 生效节次表（P1 自定义：meta.sections 优先，回退内置 12 节） */
const fullSections = computed(() => normalizeSections(meta.value.sections))

// ---------- 周次导航 ----------
const viewWeek = ref(1)
const todayDow = new Date().getDay() === 0 ? 7 : new Date().getDay()

function gotoCurrentWeek() {
  viewWeek.value = Math.min(currentWeek.value, meta.value.totalWeeks)
}

/** 顶部大标题：周几字符与今天完整日期（WakeUp 式） */
const dowChar = '一二三四五六日'[todayDow - 1]
const todayFull = (() => {
  const d = new Date()
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}/${p(d.getMonth() + 1)}/${p(d.getDate())}`
})()

function shiftWeek(delta) {
  const next = viewWeek.value + delta
  if (next >= 1 && next <= meta.value.totalWeeks) viewWeek.value = next
}

const weekDays = computed(() => buildWeekDays(viewWeek.value, meta.value.semesterStart))
/** 网格列：可按设置隐藏周末（P1） */
const gridDays = computed(() =>
  meta.value.showWeekend === false ? weekDays.value.filter((d) => d.dow <= 5) : weekDays.value
)
const visibleCourses = computed(() =>
  courses.value.filter((c) => courseInWeek(c, viewWeek.value))
)

function dayDate(ts) {
  return String(new Date(ts).getDate()).padStart(2, '0')
}

function coursesOf(dow) {
  return visibleCourses.value.filter((c) => c.dayOfWeek === dow)
}

function blockStyle(course) {
  const top = (course.startSection - 1) * ROW_H + 3
  const height = (course.endSection - course.startSection + 1) * ROW_H - 6
  return {
    top: `${top}px`,
    height: `${height}px`,
    background: course.color
  }
}

// ---------- 课程表单 ----------
const editShow = ref(false)
const editing = ref(null) // null=新建
/** 节次选项随自定义时间表联动 */
const sectionOptions = computed(() =>
  fullSections.value.map((s) => ({
    label: `${s.index} 节 ${s.start}-${s.end}`,
    value: s.index
  }))
)
const weekOptions = computed(() =>
  Array.from({ length: meta.value.totalWeeks }, (_, i) => ({ label: `第 ${i + 1} 周`, value: i + 1 }))
)

/** 表单实时冲突检测（保存时二次确认） */
const formConflicts = computed(() => {
  if (!form.value.name.trim()) return []
  return findConflicts(
    { ...form.value, id: editing.value?.id ?? undefined },
    courses.value,
    meta.value.totalWeeks
  )
})
const conflictNames = computed(() => formConflicts.value.map((c) => c.course.name).join('、'))

const emptyForm = () => ({
  name: '',
  location: '',
  teacher: '',
  dayOfWeek: new Date().getDay() === 0 ? 7 : new Date().getDay(),
  startSection: 1,
  endSection: 2,
  weekRule: { type: 'every', weeks: [] },
  color: COURSE_COLORS[courses.value.length % COURSE_COLORS.length]
})
const form = ref(emptyForm())

function openCreate() {
  editing.value = null
  form.value = emptyForm()
  editShow.value = true
}

function openEdit(course) {
  editing.value = course
  form.value = {
    name: course.name,
    location: course.location || '',
    teacher: course.teacher || '',
    dayOfWeek: course.dayOfWeek,
    startSection: course.startSection,
    endSection: course.endSection,
    weekRule: { ...course.weekRule, weeks: [...(course.weekRule?.weeks || [])] },
    color: course.color
  }
  editShow.value = true
}

async function handleSave() {
  if (formConflicts.value.length) {
    dialog.warning({
      title: '课程时间冲突',
      content: `与「${conflictNames.value}」在同一天、同一节次且周次重叠，仍要保存吗？`,
      positiveText: '仍要保存',
      negativeText: '返回修改',
      onPositiveClick: () => doSave()
    })
    return
  }
  await doSave()
}

async function doSave() {
  try {
    const input = {
      ...form.value,
      dayOfWeek: Number(form.value.dayOfWeek),
      startSection: Math.min(Number(form.value.startSection) || 1, fullSections.value.length),
      endSection: Math.min(Number(form.value.endSection) || 1, fullSections.value.length)
    }
    if (editing.value) {
      await updateCourse(editing.value.id, input)
      message.success('已保存')
    } else {
      await addCourse(input)
      message.success('课程已添加')
    }
    editShow.value = false
  } catch {
    message.error('保存失败，请重试')
  }
}

async function handleDelete() {
  try {
    await removeCourse(editing.value.id)
    message.success('课程已删除')
    editShow.value = false
  } catch {
    message.error('删除失败，请重试')
  }
}

// ---------- 导入 / 分享 ----------
const importShow = ref(false)
const importText = ref('')
const importParsing = ref(false)
const importAll = ref(false) // 仍导入重复项（默认跳过重复）
const importPreview = ref(null) // { fresh, duplicates, skipped }

function openImport() {
  importShow.value = true
  importPreview.value = null
}

function clearImportText() {
  importText.value = ''
  importPreview.value = null
}

async function previewImport() {
  importParsing.value = true
  try {
    const kind = sniffImport(importText.value)
    if (kind === 'unknown') {
      message.error('未识别内容：请粘贴教务课表 HTML，或以 TA1: 开头的分享口令')
      importPreview.value = null
      return
    }
    const rawItems = kind === 'share' ? decodeShareFull(importText.value)?.courses ?? null : parseHtmlCourseTable(importText.value)
    if (!rawItems || !rawItems.length) {
      message.error('未解析到课程：请把这段 HTML 发我适配（支持列式与矩阵式课表）')
      importPreview.value = null
      return
    }
    // v2 完整备份口令：同步应用学期设置
    const shareMeta = kind === 'share' ? decodeShareFull(importText.value)?.meta ?? null : null
    if (shareMeta && typeof shareMeta.semesterStart === 'string') {
      await updateMeta({
        semesterStart: shareMeta.semesterStart,
        totalWeeks: Number(shareMeta.totalWeeks) || meta.value.totalWeeks,
        showWeekend: shareMeta.showWeekend !== false,
        ...(Array.isArray(shareMeta.sections) && shareMeta.sections.length ? { sections: shareMeta.sections } : {})
      })
      message.info('学期设置已随口令同步（起始日/总周数/节次表）')
    }
    // 补色（按现有课程数递增，避免全同色）
    const valid = sanitizeImport(rawItems, COURSE_COLORS, courses.value.length)
    if (!valid.length) {
      message.error('未识别出有效课程（需包含课程名/星期）')
      importPreview.value = null
      return
    }
    const { fresh, duplicates } = dedupeAgainst(courses.value, valid)
    importPreview.value = { fresh, duplicates, skipped: rawItems.length - valid.length }
  } finally {
    importParsing.value = false
  }
}

async function confirmImport() {
  if (!importPreview.value) return
  const items = importAll.value
    ? [...importPreview.value.fresh, ...importPreview.value.duplicates]
    : importPreview.value.fresh
  if (!items.length) {
    message.info('没有需要导入的课程（全部与现有课程重复）')
    importShow.value = false
    return
  }
  let ok = 0
  for (const c of items) {
    try {
      await addCourse(c)
      ok++
    } catch {
      /* 单条失败跳过 */
    }
  }
  message.success(`已导入 ${ok} 门课程到课表`)
  importShow.value = false
  importPreview.value = null
  importText.value = ''
}

async function genShare() {
  try {
    const share = encodeShare(courses.value, meta.value) // v2 完整备份：含学期设置
    await navigator.clipboard.writeText(share)
    message.success('完整备份口令已复制（含学期设置），发送给同学粘贴导入即可')
  } catch {
    importShow.value = true
    importText.value = encodeShare(courses.value, meta.value)
    message.error('自动复制失败，口令已填入输入框，请手动复制')
  }
}

// ---------- 学期设置（P1：起始日/总周数/隐藏周末/节次时间自定义） ----------
const metaModalShow = ref(false)
const metaForm = ref({ startTs: Date.now(), totalWeeks: 20, showWeekend: true, sections: [] })

function openMeta() {
  const [y, m, d] = meta.value.semesterStart.split('-').map(Number)
  metaForm.value = {
    startTs: new Date(y, m - 1, d).getTime(),
    totalWeeks: meta.value.totalWeeks,
    showWeekend: meta.value.showWeekend !== false,
    sections: normalizeSections(meta.value.sections).map((s) => ({ ...s }))
  }
  metaModalShow.value = true
}

function resetSectionTimes() {
  metaForm.value.sections = DEFAULT_SECTIONS.map((s) => ({ ...s }))
}

async function handleSaveMeta() {
  const sections = metaForm.value.sections
    .filter((s) => /^\d{2}:\d{2}$/.test(s.start) && /^\d{2}:\d{2}$/.test(s.end))
    .map((s) => ({ index: Number(s.index), start: s.start, end: s.end }))
  if (!sections.length) {
    message.error('节次时间格式不正确')
    return
  }
  try {
    await updateMeta({
      semesterStart: fmtDate(metaForm.value.startTs),
      totalWeeks: metaForm.value.totalWeeks,
      showWeekend: metaForm.value.showWeekend,
      sections
    })
    message.success('学期设置已保存')
    metaModalShow.value = false
  } catch {
    message.error('保存失败，请重试')
  }
}

onMounted(async () => {
  try {
    await ensureLoaded()
  } catch {
    /* 读取失败：空课程 + 默认学期 */
  }
  // 数据就绪后定位当前周（meta 恢复前先默认）
  gotoCurrentWeek()
})

// 学期设置变更后回到有效范围内
watch(meta, () => {
  if (viewWeek.value > meta.value.totalWeeks) viewWeek.value = meta.value.totalWeeks
})
</script>

<style scoped>
.schedule-page {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

/* 顶栏（WakeUp 式大标题） */
.sched-topbar {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  padding: 2px 2px 0;
}

.top-title {
  font-size: 24px;
  font-weight: 700;
  color: var(--text-primary);
  line-height: 1.2;
}

.top-dow {
  font-size: 15px;
  font-weight: 600;
  color: var(--primary);
  margin-left: 4px;
}

.top-date {
  font-size: 12px;
  color: var(--text-tertiary);
  margin-top: 2px;
  font-variant-numeric: tabular-nums;
}

.top-actions {
  display: flex;
  gap: 8px;
}

.icon-btn {
  width: 34px;
  height: 34px;
  border: 1px solid var(--outline);
  background: var(--surface);
  border-radius: 50%;
  color: var(--text-secondary);
  font-size: 15px;
  line-height: 1;
  cursor: pointer;
}

/* 周导航 */
.sched-toolbar {
  display: flex;
  align-items: center;
  gap: 6px;
}

.week-btn,
.today-btn,
.gear-btn {
  border: 1px solid var(--outline);
  background: var(--surface);
  border-radius: var(--radius-s);
  color: var(--text-secondary);
  font-size: 15px;
  line-height: 1;
  padding: 8px 10px;
  cursor: pointer;
  flex-shrink: 0;
}

.week-btn:disabled {
  opacity: 0.35;
}

.week-mid {
  flex: 1;
  text-align: center;
  cursor: pointer;
  user-select: none;
}

.week-range {
  font-size: 11px;
  color: var(--text-tertiary);
  font-variant-numeric: tabular-nums;
}

.today-btn {
  font-size: 12px;
  padding: 8px;
}

/* 网格：表头与主体列宽对齐（corner/时间列固定宽，其余等分） */
.sched-wrap {
  border: 1px solid var(--outline);
  border-radius: var(--radius-m);
  background: var(--surface);
  overflow: hidden;
  overflow-x: auto;
}

.sched-header {
  display: flex;
  min-width: 460px;
  position: sticky;
  top: 0;
  z-index: 5;
}

.grid-corner {
  width: 48px;
  flex-shrink: 0;
  background: var(--surface-variant);
  border-bottom: 1px solid var(--outline);
}

.day-head {
  flex: 1;
  min-width: 0;
  height: 40px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1px;
  font-size: 12px;
  font-weight: 500;
  color: var(--text-secondary);
  background: var(--surface-variant);
  border-bottom: 1px solid var(--outline);
  border-left: 1px solid var(--outline);
}

.day-head.today {
  color: var(--primary);
  background: var(--primary-container);
  font-weight: 700;
}

.day-date {
  font-size: 10px;
  opacity: 0.85;
  font-variant-numeric: tabular-nums;
}

.sched-body {
  display: flex;
  min-width: 460px;
}

.time-col {
  width: 48px;
  flex-shrink: 0;
  background: var(--surface-variant);
}

.time-cell {
  height: 48px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  border-bottom: 1px solid var(--outline);
}

.t-num {
  font-size: 12px;
  font-weight: 700;
  color: var(--text-secondary);
  font-variant-numeric: tabular-nums;
}

.t-start {
  font-size: 10px;
  color: var(--text-tertiary);
  font-variant-numeric: tabular-nums;
}

.day-col {
  flex: 1;
  min-width: 0;
  position: relative;
  border-left: 1px solid var(--outline);
}

.col-today {
  background: var(--surface-variant);
}

.cell-line {
  height: 48px;
  border-bottom: 1px solid var(--outline);
}

/* 课程块：WakeUp 风格——实色圆角色块 + 白字 */
.course-block {
  position: absolute;
  z-index: 2;
  left: 3px;
  width: calc(100% - 6px);
  border-radius: 8px;
  padding: 5px 6px;
  overflow: hidden;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  gap: 2px;
  box-shadow: 0 1px 3px rgba(31, 31, 31, 0.18);
}

.course-name {
  font-size: 12.5px;
  font-weight: 700;
  line-height: 1.3;
  color: #ffffff;
  word-break: break-all;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.18);
}

.course-loc,
.course-teacher {
  font-size: 10px;
  color: rgba(255, 255, 255, 0.92);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.course-today {
  outline: 2px solid var(--primary);
  outline-offset: 1px;
}

.empty-hint {
  font-size: 13px;
  color: var(--text-tertiary);
  text-align: center;
  margin: 24px 12px;
  line-height: 1.7;
}

/* 悬浮新建 */
.fab {
  position: fixed;
  right: max(20px, calc(50% - 220px));
  bottom: calc(96px + env(safe-area-inset-bottom));
  width: 52px;
  height: 52px;
  border-radius: 50%;
  border: none;
  background: var(--primary);
  color: #fff;
  font-size: 26px;
  line-height: 1;
  box-shadow: 0 4px 14px rgba(31, 31, 31, 0.25);
  cursor: pointer;
  z-index: 20;
}

/* 表单 */
.form {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.row2 {
  display: flex;
  gap: 8px;
}

.row2 > * {
  flex: 1;
}

.field-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.f-label {
  width: 34px;
  font-size: 13px;
  color: var(--text-secondary);
  flex-shrink: 0;
}

.f-sep {
  font-size: 12px;
  color: var(--text-tertiary);
}

.swatches {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.swatch {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  border: 2px solid transparent;
  cursor: pointer;
  padding: 0;
}

.swatch.on {
  border-color: var(--text-primary);
  transform: scale(1.12);
}

.modal-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.spacer {
  flex: 1;
}

.meta-hint {
  font-size: 12px;
  color: var(--text-tertiary);
  margin: 0;
  line-height: 1.6;
}

/* P1：节次时间自定义编辑区 */
.sections-head {
  display: flex;
  align-items: center;
  gap: 8px;
}

.sections-editor {
  max-height: 240px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 8px;
  border: 1px solid var(--outline);
  border-radius: var(--radius-s);
  background: var(--surface);
}

.sec-edit-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.sec-idx {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: var(--surface-variant);
  color: var(--text-secondary);
  font-size: 11px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

/* 冲突提示间距 */
.sections-editor + .field-row,
.conflict-alert {
  margin-top: 2px;
}

/* 星期自绘按钮组（7 枚可控换行，避免撑破弹窗） */
.day-picks {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.day-pick {
  width: 32px;
  height: 30px;
  border: 1px solid var(--outline);
  border-radius: var(--radius-s);
  background: var(--surface);
  color: var(--text-secondary);
  font-size: 12px;
  cursor: pointer;
  padding: 0;
}

.day-pick.on {
  background: var(--primary);
  border-color: var(--primary);
  color: #fff;
}

/* 导入预览 */
.import-result {
  display: flex;
  flex-direction: column;
  gap: 6px;
  border-top: 1px dashed var(--outline);
  padding-top: 8px;
}

.import-count {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
}

.import-line {
  font-size: 12px;
  color: var(--text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.import-more {
  font-size: 11px;
  color: var(--text-tertiary);
}
</style>
