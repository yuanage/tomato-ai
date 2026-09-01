<template>
  <div class="tasks">
    <!-- 新增任务 -->
    <div class="add-row">
      <n-input
        v-model:value="draftTitle"
        placeholder="添加一个任务，回车确认"
        style="flex: 1"
        @keyup.enter="handleAdd"
      />
      <n-button type="primary" :disabled="!draftTitle.trim()" @click="handleAdd">添加</n-button>
    </div>

    <!-- 进行中 / 已完成概览 -->
    <div v-if="tasks.length" class="list-summary">
      进行中 {{ activeCount }} · 已完成 {{ doneCount }}
    </div>

    <!-- 空态 -->
    <n-empty
      v-if="tasks.length === 0"
      description="还没有任务，先添加一个吧"
      style="margin-top: 48px"
    />

    <!-- 任务列表 -->
    <div v-else class="task-list">
      <div
        v-for="task in sortedTasks"
        :key="task.id"
        class="task-row"
        :class="{ done: task.done }"
      >
        <n-checkbox
          :checked="task.done"
          @update:checked="() => handleToggleDone(task.id)"
        />
        <span class="task-title">{{ task.title }}</span>
        <span v-if="task.estPomodoros" class="task-est">
          🍅{{ task.consumedPomodoros ?? 0 }}/{{ task.estPomodoros }}
        </span>

        <div class="task-actions">
          <n-button
            quaternary
            size="tiny"
            title="开始专注此任务"
            :disabled="task.done"
            @click="startFocusFor(task.id)"
          >
            <i class="act-icon" :style="actStyle(actPlay)"></i>
          </n-button>
          <n-button
            quaternary
            size="tiny"
            class="pin-btn"
            :class="{ pinned: task.pinned }"
            :title="task.pinned ? '取消置顶' : '置顶'"
            @click="togglePin(task.id)"
          >
            <i class="act-icon" :style="actStyle(actPin)"></i>
          </n-button>
          <n-button quaternary size="tiny" title="编辑" @click="openEdit(task)">
            <i class="act-icon" :style="actStyle(actPencil)"></i>
          </n-button>
          <n-popconfirm
            positive-text="删除"
            negative-text="取消"
            :positive-button-props="{ type: 'error' }"
            @positive-click="handleRemove(task.id)"
          >
            <template #trigger>
              <n-button quaternary size="tiny" title="删除" type="error">
                <i class="act-icon" :style="actStyle(actTrash)"></i>
              </n-button>
            </template>
            确定删除「{{ task.title }}」？
          </n-popconfirm>
        </div>
      </div>
    </div>

    <!-- 编辑任务弹窗 -->
    <n-modal
      v-model:show="editModalShow"
      preset="card"
      title="编辑任务"
      :bordered="false"
      style="width: 320px"
    >
      <div class="edit-form">
        <n-input v-model:value="editTitle" placeholder="任务标题" />
        <n-input-number
          v-model:value="editEst"
          :min="0"
          :max="99"
          placeholder="预估番茄数（可选）"
          style="width: 100%"
        />
        <n-input-number
          v-model:value="editConsumed"
          :min="0"
          :max="999"
          placeholder="已消耗番茄数（修正用）"
          style="width: 100%"
        />
        <div class="edit-actions">
          <n-button @click="editModalShow = false">取消</n-button>
          <n-button type="primary" :disabled="!editTitle.trim()" @click="handleSaveEdit">
            保存
          </n-button>
        </div>
      </div>
    </n-modal>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useMessage } from 'naive-ui'
import { useTasks, pendingFocusTaskId } from '../composables/useTasks'
import actPlay from '../assets/icons/act-play.png'
import actPin from '../assets/icons/act-pin.png'
import actPencil from '../assets/icons/act-pencil.png'
import actTrash from '../assets/icons/act-trash.png'

// 蒙版图标：颜色跟随按钮文字色（删除钮 error 色自动生效）
function actStyle(url) {
  return {
    WebkitMaskImage: `url(${url})`,
    maskImage: `url(${url})`
  }
}

const message = useMessage()
const router = useRouter()
const { tasks, sortedTasks, ensureLoaded, addTask, toggleDone, togglePin, updateTask, removeTask } =
  useTasks()

onMounted(ensureLoaded)

// ---------- 概览 ----------
const activeCount = computed(() => tasks.value.filter((t) => !t.done).length)
const doneCount = computed(() => tasks.value.filter((t) => t.done).length)

// ---------- 【联动】快捷专注：携带任务跳转专注页 ----------
function startFocusFor(id) {
  pendingFocusTaskId.value = id
  router.push('/')
}

// ---------- 新增 ----------
const draftTitle = ref('')

async function handleAdd(e) {
  // 拦截中文输入法选字时的回车（isComposing 为 true 时不提交）
  if (e?.isComposing) return
  const title = draftTitle.value.trim()
  if (!title) return
  try {
    // await 落库完成再清空输入：杀进程前写入已提交，杜绝"添加了却丢了"
    await addTask(title)
  } catch {
    message.error('保存失败，请重试')
    return
  }
  draftTitle.value = ''
}

// ---------- 完成 / 删除 ----------
async function handleToggleDone(id) {
  const t = tasks.value.find((x) => x.id === id)
  await toggleDone(id)
  if (t && !t.done) message.success('任务完成 🎉')
}

async function handleRemove(id) {
  await removeTask(id)
  message.info('任务已删除')
}

// ---------- 编辑 ----------
const editModalShow = ref(false)
const editingId = ref(null)
const editTitle = ref('')
const editEst = ref(null)
const editConsumed = ref(0)

function openEdit(task) {
  editingId.value = task.id
  editTitle.value = task.title
  editEst.value = task.estPomodoros ?? null
  editConsumed.value = task.consumedPomodoros ?? 0
  editModalShow.value = true
}

async function handleSaveEdit() {
  const title = editTitle.value.trim()
  if (!title) return
  await updateTask(editingId.value, {
    title,
    estPomodoros: editEst.value || null,
    consumedPomodoros: editConsumed.value || 0
  })
  editModalShow.value = false
  message.success('已保存')
}
</script>

<style scoped>
.tasks {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.add-row {
  display: flex;
  gap: 10px;
}

/* 列表概览：进行中/已完成计数 */
.list-summary {
  font-size: 12px;
  font-weight: 500;
  color: var(--text-tertiary);
  letter-spacing: 0.3px;
}

.task-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

/* Material 列表项：白面 + 低阴影 + 按压反馈 */
.task-row {
  display: flex;
  align-items: center;
  gap: 12px;
  background: var(--surface);
  border-radius: var(--radius-m);
  padding: 14px 16px;
  box-shadow: var(--shadow-1);
  transition: box-shadow 0.2s ease;
}

.task-row:active {
  box-shadow: var(--shadow-2);
}

.task-title {
  flex: 1;
  font-size: 15px;
  color: var(--text-primary);
  word-break: break-all;
}

/* 已完成：划线置灰 */
.task-row.done .task-title {
  text-decoration: line-through;
  color: var(--text-tertiary);
}

/* 预估番茄徽标：容器色胶囊 */
.task-est {
  font-size: 12px;
  font-weight: 500;
  color: var(--primary);
  background: var(--primary-container);
  border-radius: var(--radius-pill);
  padding: 2px 8px;
  flex-shrink: 0;
}

.task-actions {
  display: flex;
  gap: 2px;
  flex-shrink: 0;
}

/* 蒙版操作图标：颜色跟随按钮文字色（置顶/删除状态色自动生效） */
.act-icon {
  display: inline-block;
  width: 15px;
  height: 15px;
  background-color: currentColor;
  -webkit-mask-repeat: no-repeat;
  mask-repeat: no-repeat;
  -webkit-mask-position: center;
  mask-position: center;
  -webkit-mask-size: contain;
  mask-size: contain;
}

/* 置顶按钮：未置顶弱化、置顶后强调色 */
.pin-btn {
  color: var(--text-tertiary);
}

.pin-btn.pinned {
  color: var(--primary);
}

.edit-form {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.edit-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}
</style>
