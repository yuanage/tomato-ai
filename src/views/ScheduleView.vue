<template>
  <div class="schedule-page">
    <!-- 顶栏：周导航 + 学期设置 -->
    <div class="sched-toolbar">
      <button class="week-btn" type="button" :disabled="viewWeek <= 1" @click="shiftWeek(-1)">‹</button>
      <div class="week-mid" role="button" @click="gotoCurrentWeek">
        <div class="week-no">第 {{ viewWeek }} 周</div>
        <div class="week-range">{{ weekRangeLabel(viewWeek, meta.semesterStart, meta.totalWeeks) }}</div>
      </div>
      <button class="week-btn" type="button" :disabled="viewWeek >= meta.totalWeeks" @click="shiftWeek(1)">›</button>
      <button class="today-btn" type="button" @click="gotoCurrentWeek">今天</button>
      <button class="gear-btn" type="button" title="学期设置" @click="metaModalShow = true">⚙</button>
    </div>

    <!-- 课表：表头 + 主体（全天节次常显，对标 WakeUp：左侧节次时间、实色课程块白字） -->
    <div class="sched-wrap">
      <div class="sched-header">
        <div class="grid-corner"></div>
        <div v-for="day in weekDays" :key="'h' + day.dow" class="day-head" :class="{ today: day.isToday }">
          <div>{{ day.label }}</div>
          <div class="day-date">{{ dayDate(day.date) }}</div>
        </div>
      </div>

      <div class="sched-body">
        <!-- 节次时间列：全天 12 节常显（含真实时间） -->
        <div class="time-col">
          <div v-for="sec in fullSections" :key="'t' + sec.index" class="time-cell">
            <span class="t-start">{{ sec.start }}</span>
            <span class="t-end">{{ sec.end }}</span>
          </div>
        </div>
        <!-- 星期列：背景节次线 + 课程块 -->
        <div
          v-for="day in weekDays"
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
            <div v-if="c.location" class="course-loc">{{ c.location }}</div>
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
          <n-radio-group v-model:value="form.dayOfWeek" size="small">
            <n-radio-button v-for="d in 7" :key="d" :value="d">周{{ '一二三四五六日'[d - 1] }}</n-radio-button>
          </n-radio-group>
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
import { useMessage } from 'naive-ui'
import {
  DEFAULT_SECTIONS,
  COURSE_COLORS,
  courseInWeek,
  buildWeekDays,
  weekRangeLabel,
  fmtDate
} from '../utils/schedule'
import { useSchedule } from '../composables/useSchedule'

const message = useMessage()
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
/** 全天节次常显（对标 WakeUp：表始终为完整一天，不随课程收缩） */
const fullSections = DEFAULT_SECTIONS

// ---------- 周次导航 ----------
const viewWeek = ref(1)
const todayDow = new Date().getDay() === 0 ? 7 : new Date().getDay()

function gotoCurrentWeek() {
  viewWeek.value = Math.min(currentWeek.value, meta.value.totalWeeks)
}

function shiftWeek(delta) {
  const next = viewWeek.value + delta
  if (next >= 1 && next <= meta.value.totalWeeks) viewWeek.value = next
}

const weekDays = computed(() => buildWeekDays(viewWeek.value, meta.value.semesterStart))
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
const sectionOptions = DEFAULT_SECTIONS.map((s) => ({
  label: `${s.index} 节 ${s.start}-${s.end}`,
  value: s.index
}))
const weekOptions = computed(() =>
  Array.from({ length: meta.value.totalWeeks }, (_, i) => ({ label: `第 ${i + 1} 周`, value: i + 1 }))
)

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
  try {
    const input = {
      ...form.value,
      dayOfWeek: Number(form.value.dayOfWeek),
      startSection: Math.min(Number(form.value.startSection) || 1, DEFAULT_SECTIONS.length),
      endSection: Math.min(Number(form.value.endSection) || 1, DEFAULT_SECTIONS.length)
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

// ---------- 学期设置 ----------
const metaModalShow = ref(false)
const metaForm = ref({ startTs: Date.now(), totalWeeks: 20 })

function openMeta() {
  const [y, m, d] = meta.value.semesterStart.split('-').map(Number)
  metaForm.value = {
    startTs: new Date(y, m - 1, d).getTime(),
    totalWeeks: meta.value.totalWeeks
  }
  metaModalShow.value = true
}

async function handleSaveMeta() {
  try {
    await updateMeta({ semesterStart: fmtDate(metaForm.value.startTs), totalWeeks: metaForm.value.totalWeeks })
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

/* 顶栏 */
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

.week-no {
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary);
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
  gap: 1px;
  border-bottom: 1px solid var(--outline);
}

.t-start {
  font-size: 11px;
  font-weight: 600;
  color: var(--text-secondary);
  font-variant-numeric: tabular-nums;
}

.t-end {
  font-size: 9px;
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
</style>
