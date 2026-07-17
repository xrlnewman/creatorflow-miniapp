import './styles.css'

import { createApiClient } from './api.js'

const api = createApiClient()

const demoAppointments = [
  { id: 'CR-0716-082', patientId: 'CR-001', patient: '选题《城市夜行》', department: '短视频', doctor: '林编辑', scheduledAt: '今天 09:30', status: '待排期' },
  { id: 'CR-0716-079', patientId: 'CR-001', patient: '选题《一周好物》', department: '图文专栏', doctor: '沈编辑', scheduledAt: '今天 14:00', status: '待制作' },
  { id: 'CR-0715-031', patientId: 'CR-001', patient: '选题《品牌访谈》', department: '直播栏目', doctor: '赵编辑', scheduledAt: '07/23 10:30', status: '已发布' },
]

const demoFollowups = [
  { id: 'RV-0716-014', patientId: 'CR-001', patient: '选题《城市夜行》', summary: '标题与封面复核', dueAt: '今天 18:00', status: '待完成' },
  { id: 'RV-0715-006', patientId: 'CR-001', patient: '选题《一周好物》', summary: '素材版权检查', dueAt: '明天 10:00', status: '待完成' },
]

let appointments = [...demoAppointments]
let followups = [...demoFollowups]
let dataSource = '演示数据'
const busyActions = new Set()

const app = document.querySelector('#app')

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

function statusClass(status) {
  if (status === '已完成') return 'green'
  if (status === '待制作' || status === '制作中') return 'indigo'
  if (status === '已排期') return 'blue'
  if (status === '已取消') return 'muted'
  return 'coral'
}

function displayTime(value) {
  const text = String(value ?? '')
  if (!text.includes('T')) return text
  const date = new Date(text)
  if (Number.isNaN(date.getTime())) return text
  return new Intl.DateTimeFormat('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).format(date)
}

function appointmentAction(status) {
  switch (status) {
    case '待排期': return { action: 'checkin', label: '加入排期' }
    case '已排期': return { action: 'waiting', label: '确认排期' }
    case '待制作': return { action: 'serving', label: '开始制作' }
    case '制作中': return { action: 'complete-appointment', label: '完成制作' }
    default: return null
  }
}

function renderAppointment(appointment) {
  const action = appointmentAction(appointment.status)
  const actionButton = action
    ? `<button class="visit-action" data-action="${action.action}" data-id="${escapeHtml(appointment.id)}">${action.label}　→</button>`
    : `<span class="visit-note">${appointment.status === '已完成' ? '服务已完成' : '选题已取消'}</span>`

  return `<article class="visit">
    <div class="visit-top"><span class="tag ${statusClass(appointment.status)}">${escapeHtml(appointment.status)}</span><span>${escapeHtml(displayTime(appointment.scheduledAt))}</span></div>
    <h4>${escapeHtml(appointment.department)}</h4>
    <p>${escapeHtml(appointment.doctor)} · 上海静安联合创作</p>
    ${actionButton}
  </article>`
}

function renderFollowup(followup) {
  const completed = followup.status === '已完成'
  return `<article class="reminder ${completed ? 'done' : 'warm'}">
    <span>${completed ? '✓' : '!'}</span>
    <div><strong>${escapeHtml(followup.summary)}</strong><p>${escapeHtml(followup.dueAt)} · ${completed ? '已完成' : '待完成'}</p></div>
    ${completed ? '<b class="done-mark">已完成</b>' : `<button data-action="complete-followup" data-id="${escapeHtml(followup.id)}">完成</button>`}
  </article>`
}

function render() {
  app.innerHTML = `<main class="app">
    <header>
      <div><p>CREATORFLOW / 2026</p><h1>把灵感交给<br><b>值得信赖的团队</b></h1></div>
      <div class="header-side"><span class="source-badge">${dataSource}</span><span class="avatar">许</span></div>
    </header>
    <section class="hero"><span>创作工作台</span><h2>今天也要稳定出片</h2><p>排期 · 制作 · 复盘<br>每一步都有清晰提醒</p><div class="sun">✚</div></section>
    <section class="quick">
      <button data-action="create-appointment"><b>＋</b><span>新建选题</span></button>
      <button data-action="refresh"><b>◷</b><span>刷新制作队列</span></button>
      <button data-action="create-followup"><b>♡</b><span>新建复盘</span></button>
    </section>
    <div class="section-head"><h3>我的选题 <small>${appointments.length} 条</small></h3><a data-action="refresh">同步 →</a></div>
    <section class="visits">${appointments.length ? appointments.map(renderAppointment).join('') : '<div class="empty">暂时没有选题，点击上方新建一条</div>'}</section>
    <div class="section-head"><h3>复盘任务 <small class="coral">${followups.filter((item) => item.status !== '已完成').length} 条待办</small></h3><a data-action="refresh">查看 →</a></div>
    <section class="reminders">${followups.length ? followups.slice(0, 3).map(renderFollowup).join('') : '<div class="empty">暂无复盘任务</div>'}</section>
    <nav><button class="active">⌂<small>首页</small></button><button data-action="create-appointment">＋<small>选题</small></button><button data-action="refresh">◷<small>制作</small></button><button data-action="create-followup">♡<small>我的</small></button></nav>
    <div class="toast" hidden></div>
  </main>`
  bindActions()
}

function showToast(message) {
  const toast = document.querySelector('.toast')
  if (!toast) return
  toast.textContent = message
  toast.hidden = false
  window.clearTimeout(showToast.timer)
  showToast.timer = window.setTimeout(() => { toast.hidden = true }, 2200)
}

function updateAppointment(id, updater) {
  appointments = appointments.map((item) => item.id === id ? updater(item) : item)
}

function updateFollowup(id, updater) {
  followups = followups.map((item) => item.id === id ? updater(item) : item)
}

function localAppointment() {
  return {
    id: `CR-DEMO-${Date.now().toString().slice(-6)}`,
    patientId: 'CR-001', patient: '选题《城市夜行》', department: '短视频', doctor: '林编辑',
    scheduledAt: '明天 09:30', status: '待排期',
  }
}

function localFollowup() {
  return {
    id: `RV-DEMO-${Date.now().toString().slice(-6)}`,
    patientId: 'CR-001', patient: '选题《城市夜行》', summary: '标题与封面复核', dueAt: '明天 18:00', status: '待完成',
  }
}

async function refreshFromApi() {
  const results = await Promise.allSettled([
    api.listAppointments({ page: 1, pageSize: 20 }),
    api.listFollowups({ page: 1, pageSize: 20 }),
  ])
  let synced = 0
  const appointmentsResult = results[0]
  if (appointmentsResult.status === 'fulfilled' && Array.isArray(appointmentsResult.value?.list)) {
    appointments = appointmentsResult.value.list
    synced += 1
  }
  const followupsResult = results[1]
  if (followupsResult.status === 'fulfilled' && Array.isArray(followupsResult.value?.list)) {
    followups = followupsResult.value.list
    synced += 1
  }
  dataSource = synced ? '接口数据' : '演示数据'
  render()
  showToast(synced ? '已同步最新选题与复盘' : '服务暂不可用，继续使用演示数据')
}

async function createAppointment() {
  const input = {
    patientId: 'CR-001', patient: '选题《城市夜行》', department: '短视频', doctor: '林编辑',
    scheduledAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  }
  try {
    const created = await api.createAppointment(input)
    appointments = [created, ...appointments]
    dataSource = '接口数据'
    render()
    showToast('选题已提交，等待创作确认')
  } catch {
    appointments = [localAppointment(), ...appointments]
    dataSource = '演示数据'
    render()
    showToast('接口暂不可用，已保留演示选题')
  }
}

async function createFollowup() {
  const input = { patientId: 'CR-001', patient: '选题《城市夜行》', summary: '标题与封面复核', dueAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() }
  try {
    const created = await api.createFollowup(input)
    followups = [created, ...followups]
    dataSource = '接口数据'
    render()
    showToast('复盘任务已创建')
  } catch {
    followups = [localFollowup(), ...followups]
    dataSource = '演示数据'
    render()
    showToast('接口暂不可用，已保留演示复盘')
  }
}

async function transitionAppointment(id, action) {
  const current = appointments.find((item) => item.id === id)
  if (!current) return
  const statusByAction = { waiting: '待制作', serving: '制作中', 'complete-appointment': '已发布' }
  try {
    const updated = action === 'checkin'
      ? await api.checkinAppointment(id)
      : await api.updateAppointmentStatus(id, statusByAction[action], '创作者端')
    updateAppointment(id, () => updated)
    dataSource = '接口数据'
    render()
    showToast(action === 'checkin' ? '排期成功，已进入制作队列' : `状态已更新为${updated.status}`)
  } catch {
    const fallbackStatus = action === 'checkin' ? '已排期' : statusByAction[action]
    updateAppointment(id, (item) => ({ ...item, status: fallbackStatus }))
    dataSource = '演示数据'
    render()
    showToast('接口暂不可用，已在演示数据中推进')
  }
}

async function completeFollowup(id) {
  try {
    const updated = await api.completeFollowup(id)
    updateFollowup(id, () => updated)
    dataSource = '接口数据'
    render()
    showToast('复盘已完成，感谢你的反馈')
  } catch {
    updateFollowup(id, (item) => ({ ...item, status: '已完成' }))
    dataSource = '演示数据'
    render()
    showToast('接口暂不可用，已在演示数据中标记完成')
  }
}

async function handleAction(action, id) {
  const key = `${action}:${id ?? ''}`
  if (busyActions.has(key)) return
  busyActions.add(key)
  const button = [...document.querySelectorAll('[data-action]')].find((item) => item.dataset.action === action && (id === undefined || item.dataset.id === id))
  if (button) { button.disabled = true; button.dataset.busy = 'true'; button.textContent = '处理中…' }
  try {
    if (action === 'refresh') await refreshFromApi()
    if (action === 'create-appointment') await createAppointment()
    if (action === 'create-followup') await createFollowup()
    if (['checkin', 'waiting', 'serving', 'complete-appointment'].includes(action)) await transitionAppointment(id, action)
    if (action === 'complete-followup') await completeFollowup(id)
  } finally {
    busyActions.delete(key)
  }
}

function bindActions() {
  document.querySelectorAll('[data-action]').forEach((element) => {
    element.addEventListener('click', () => handleAction(element.dataset.action, element.dataset.id))
  })
}

render()
void refreshFromApi()
