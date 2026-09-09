import { ref, computed } from 'vue'
import {
  getCourses,
  saveCourses,
  getScheduleMeta,
  saveScheduleMeta,
  genId
} from '../utils/storage'
import { defaultMeta, weekNumberFor, COURSE_COLORS } from '../utils/schedule'

/**
 * 课程表状态（模块级单例，对齐 useTasks 模式）
 * 写透式：每次变更立即双写落库（IndexedDB + 文件镜像）
 */

const courses = ref([])
const meta = ref(defaultMeta())
let loadPromise = null

/** 确保课程与学期元数据已加载（共享 Promise：并发调用只读一次库） */
function ensureLoaded() {
  if (!loadPromise) {
    loadPromise = Promise.all([getCourses(), getScheduleMeta()])
      .then(([list, savedMeta]) => {
        courses.value = list
        if (savedMeta && typeof savedMeta.semesterStart === 'string') {
          meta.value = { ...defaultMeta(), ...savedMeta }
        }
      })
      .catch((e) => {
        loadPromise = null
        throw e
      })
  }
  return loadPromise
}

/** 当前周次（由学期起始日推算；数据未就绪时为第 1 周） */
const currentWeek = computed(() => weekNumberFor(Date.now(), meta.value.semesterStart))

/** 新增课程，返回课程对象 */
export async function addCourse(input) {
  const name = String(input?.name ?? '').trim()
  if (!name) return null
  await ensureLoaded()
  const course = {
    id: genId(),
    name,
    location: String(input.location ?? '').trim(),
    teacher: String(input.teacher ?? '').trim(),
    dayOfWeek: Number(input.dayOfWeek) || 1, // 1=周一 … 7=周日
    startSection: Number(input.startSection) || 1,
    endSection: Math.max(Number(input.startSection) || 1, Number(input.endSection) || 1),
    weekRule: input.weekRule || { type: 'every', weeks: [] },
    color: input.color || defaultColor(),
    createdAt: Date.now()
  }
  courses.value.push(course)
  await saveCourses(courses.value)
  return course
}

/** 色盘自动分配：按课程序号取模（调用方也可显式传 color） */
function defaultColor() {
  return COURSE_COLORS[courses.value.length % COURSE_COLORS.length]
}

/** 局部更新课程 */
export async function updateCourse(id, patch) {
  await ensureLoaded()
  const c = courses.value.find((x) => x.id === id)
  if (!c) return
  Object.assign(c, patch)
  if (typeof c.name === 'string') c.name = c.name.trim()
  await saveCourses(courses.value)
}

/** 删除课程 */
export async function removeCourse(id) {
  await ensureLoaded()
  courses.value = courses.value.filter((x) => x.id !== id)
  await saveCourses(courses.value)
}

/** 更新学期元数据（起始日/总周数） */
export async function updateMeta(patch) {
  await ensureLoaded()
  meta.value = { ...meta.value, ...patch }
  await saveScheduleMeta(meta.value)
}

export function useSchedule() {
  return {
    courses,
    meta,
    currentWeek,
    ensureLoaded,
    addCourse,
    updateCourse,
    removeCourse,
    updateMeta
  }
}
