import './styles.css'
import './content-pipeline.css'

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

const demoContentItems = [
  { id: 'CF-0718-001', title: '城市夜行：下班后的十五分钟', channel: '短视频', owner: '林编辑', plannedAt: '2026-07-18T09:00:00+08:00', status: '待选题' },
  { id: 'CF-0718-002', title: '一周好物：把桌面整理成工作流', channel: '图文专栏', owner: '沈编辑', plannedAt: '2026-07-18T10:00:00+08:00', status: '写作中', script: { body: '开场钩子、三段主体和结尾行动号召。' } },
  { id: 'CF-0718-003', title: '品牌访谈：小店如何留住老客', channel: '直播栏目', owner: '赵编辑', plannedAt: '2026-07-18T14:00:00+08:00', status: '制作中', script: { body: '开场钩子、三段主体和结尾行动号召。' } },
  { id: 'CF-0718-004', title: '夏日直播：创作者增长公开课', channel: '品牌合作', owner: '周编辑', plannedAt: '2026-07-18T16:00:00+08:00', status: '待审核', script: { body: '公开课流程、嘉宾串词与观众互动问题。' } },
  { id: 'CF-0718-005', title: '通勤装备：轻量化出行清单', channel: '短视频', owner: '林编辑', plannedAt: '2026-07-18T18:00:00+08:00', status: '已发布', publish: { publishedAt: '2026-07-18T18:00:00+08:00', actor: '主编' }, metrics: { views: 18200, likes: 920, comments: 61, shares: 140 } },
  { id: 'CF-0718-006', title: '一张图读懂内容复盘', channel: '图文专栏', owner: '沈编辑', plannedAt: '2026-07-19T09:00:00+08:00', status: '已复盘', publish: { publishedAt: '2026-07-18T18:00:00+08:00', actor: '主编' }, metrics: { views: 12480, likes: 892, comments: 67, shares: 141 } },
]

let appointments = [...demoAppointments]
let followups = [...demoFollowups]
let dataSource = '演示数据'
const busyActions = new Set()
let contentItems = demoContentItems.map((item) => ({ ...item }))
let selectedContentId = contentItems[2].id
const contentEventsById = new Map()

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
    ${renderContentPipeline()}
    <div class="section-head"><h3>复盘任务 <small class="coral">${followups.filter((item) => item.status !== '已完成').length} 条待办</small></h3><a data-action="refresh">查看 →</a></div>
    <section class="reminders">${followups.length ? followups.slice(0, 3).map(renderFollowup).join('') : '<div class="empty">暂无复盘任务</div>'}</section>
    <nav><button class="active">⌂<small>首页</small></button><button data-action="create-appointment">＋<small>选题</small></button><button data-action="refresh">◷<small>制作</small></button><button data-action="create-followup">♡<small>我的</small></button></nav>
    <div class="toast" hidden></div>
  </main>`
  bindActions()
}

function contentStatusClass(status) {
  if (status === '已复盘') return 'green'
  if (status === '已发布') return 'blue'
  if (status === '待审核') return 'amber'
  if (status === '制作中') return 'indigo'
  return 'coral'
}

function renderContentPipeline() {
  const selected = contentItems.find((item) => item.id === selectedContentId) || contentItems[0]
  if (!selected) return ''
  const events = contentEventsById.get(selected.id) || selected.events || []
  const scriptForm = ['待选题', '写作中', '制作中'].includes(selected.status) ? `<section class="content-form"><h4>脚本编辑</h4><textarea data-content-script placeholder="补充分镜、口播与行动号召">${escapeHtml(selected.script?.body || '')}</textarea><div class="content-actions"><button data-content-action="save-script" data-content-id="${escapeHtml(selected.id)}">保存脚本</button>${selected.status === '制作中' ? `<button data-content-action="submit-review" data-content-id="${escapeHtml(selected.id)}">提交审核</button>` : ''}</div></section>` : ''
  const publishForm = selected.status === '待审核' ? `<section class="content-form"><h4>发布确认</h4><input data-content-published-at value="2026-07-18T18:00:00+08:00" /><input data-content-actor value="主编" /><button data-content-action="publish" data-content-id="${escapeHtml(selected.id)}">确认发布</button></section>` : ''
  const metricForm = ['已发布', '已复盘'].includes(selected.status) ? `<section class="content-form"><h4>指标卡</h4><div class="content-metrics"><label>阅读量<input type="number" min="0" data-content-metric="views" value="${selected.metrics?.views || 0}" /></label><label>点赞<input type="number" min="0" data-content-metric="likes" value="${selected.metrics?.likes || 0}" /></label><label>评论<input type="number" min="0" data-content-metric="comments" value="${selected.metrics?.comments || 0}" /></label><label>分享<input type="number" min="0" data-content-metric="shares" value="${selected.metrics?.shares || 0}" /></label></div><button data-content-action="metrics" data-content-id="${escapeHtml(selected.id)}">记录复盘</button></section>` : ''
  return `<section class="content-pipeline"><div class="section-head"><h3>内容流水线 <small>${contentItems.length} 条</small></h3><button class="content-create" data-content-action="create">＋ 新建选题</button></div><div class="content-list">${contentItems.map((item) => `<button class="content-item ${item.id === selected.id ? 'selected' : ''}" data-content-action="select" data-content-id="${escapeHtml(item.id)}"><span class="tag ${contentStatusClass(item.status)}">${escapeHtml(item.status)}</span><strong>${escapeHtml(item.title)}</strong><small>${escapeHtml(item.channel)} · ${escapeHtml(item.owner)}</small></button>`).join('')}</div><article class="content-detail"><div class="content-detail-head"><div><span class="tag ${contentStatusClass(selected.status)}">${escapeHtml(selected.status)}</span><h4>${escapeHtml(selected.title)}</h4><p>${escapeHtml(selected.channel)} · ${escapeHtml(selected.owner)} · ${escapeHtml(selected.plannedAt)}</p></div><small>${escapeHtml(selected.id)}</small></div>${scriptForm}${publishForm}${metricForm}<section class="content-timeline"><h4>事件时间线</h4><ol>${events.map((event) => `<li><time>${escapeHtml(event.createdAt || event.time || '--')}</time><span><strong>${escapeHtml(event.toStatus || event.status || event.action)}</strong><small>${escapeHtml(event.action || '')} · ${escapeHtml(event.actor || '系统')}</small></span></li>`).join('')}</ol></section></article></section>`
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

function updateContent(id, updated) {
  contentItems = contentItems.map((item) => item.id === id ? { ...item, ...updated } : item)
}

async function refreshContentEvents(id) {
  const result = await api.listContentEvents(id)
  const events = Array.isArray(result?.list) ? result.list : []
  contentEventsById.set(id, events)
  updateContent(id, { events })
  return events
}

async function refreshContent() {
  try {
    const result = await api.listContentItems({ page: 1, pageSize: 20 })
    if (Array.isArray(result?.list) && result.list.length) {
      contentItems = result.list
      selectedContentId = contentItems.find((item) => item.id === selectedContentId)?.id || contentItems[0].id
      dataSource = '接口数据'
      await refreshContentEvents(selectedContentId)
      render()
    }
  } catch {
    // Keep the synthetic content list available for offline demos.
  }
}

async function createContent() {
  const input = { title: '夜班人的补给站', channel: '短视频', owner: '林编辑', plannedAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() }
  try {
    const created = await api.createContentItem(input)
    contentItems = [created, ...contentItems]
    selectedContentId = created.id
    await refreshContentEvents(created.id)
    dataSource = '接口数据'
    render()
    showToast('选题已创建，进入写作队列')
  } catch {
    const local = { ...input, id: `CF-DEMO-${Date.now().toString().slice(-6)}`, status: '待选题' }
    contentItems = [local, ...contentItems]
    selectedContentId = local.id
    render()
    showToast('服务暂不可用，已保留演示选题')
  }
}

async function contentAction(action, id) {
  if (action === 'select') {
    selectedContentId = id
    render()
    try {
      const detail = await api.getContentItem(id)
      updateContent(id, detail)
      await refreshContentEvents(id)
      render()
    } catch {
      // Keep local detail when offline.
    }
    return
  }
  if (action === 'create') return createContent()
  const item = contentItems.find((entry) => entry.id === id)
  if (!item) return
  try {
    if (action === 'save-script') {
      const body = document.querySelector('[data-content-script]')?.value?.trim()
      if (!body) return showToast('请先填写脚本内容')
      updateContent(id, await api.saveContentScript(id, { body }))
      await refreshContentEvents(id)
      showToast('脚本已保存，状态已推进')
    } else if (action === 'submit-review') {
      updateContent(id, await api.submitContentReview(id, '主编'))
      await refreshContentEvents(id)
      showToast('已提交审核队列')
    } else if (action === 'publish') {
      const publishedAt = document.querySelector('[data-content-published-at]')?.value?.trim()
      const actor = document.querySelector('[data-content-actor]')?.value?.trim()
      if (!publishedAt || !actor) return showToast('发布时间和审核人不能为空')
      updateContent(id, await api.publishContent(id, { publishedAt, actor }))
      await refreshContentEvents(id)
      showToast('内容已发布，等待数据复盘')
    } else if (action === 'metrics') {
      const metrics = Object.fromEntries([...document.querySelectorAll('[data-content-metric]')].map((input) => [input.dataset.contentMetric, Number(input.value)]))
      if (Object.values(metrics).some((value) => !Number.isFinite(value) || value < 0)) return showToast('指标不能为负数')
      updateContent(id, await api.recordContentMetrics(id, metrics))
      await refreshContentEvents(id)
      showToast('复盘指标已记录')
    }
    dataSource = '接口数据'
  } catch {
    showToast('服务暂不可用，请稍后重试')
  }
  render()
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
  document.querySelectorAll('[data-content-action]').forEach((element) => {
    element.addEventListener('click', () => contentAction(element.dataset.contentAction, element.dataset.contentId))
  })
  document.querySelectorAll('[data-action]').forEach((element) => {
    element.addEventListener('click', () => handleAction(element.dataset.action, element.dataset.id))
  })
}

render()
void refreshFromApi()
void refreshContent()
