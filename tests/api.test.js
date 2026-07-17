import test from 'node:test'
import assert from 'node:assert/strict'

import { createApiClient } from '../src/api.js'

function response(data, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    async json() {
      return { code: 0, message: 'ok', data }
    },
  }
}

test('默认请求 /api/v1 并为选题写操作注入幂等键', async () => {
  const requests = []
  const client = createApiClient({
    fetchImpl: async (url, init) => {
      requests.push({ url, init })
      return response({ id: 'CR-0716-082', status: '待排期' })
    },
  })

  const appointment = await client.createAppointment({
    patientId: 'CR-001',
    patient: '选题《城市夜行》',
    department: '短视频',
    doctor: '林编辑',
    scheduledAt: '2026-07-17T09:30:00+08:00',
  })

  assert.equal(appointment.id, 'CR-0716-082')
  assert.equal(requests[0].url, '/api/v1/appointments')
  assert.equal(requests[0].init.method, 'POST')
  assert.match(requests[0].init.headers['Idempotency-Key'], /^cf-/)
  assert.equal(requests[0].init.headers['Content-Type'], 'application/json')
})

test('列表请求保留查询参数，配置了完整 API 地址时不重复拼接路径', async () => {
  const urls = []
  const client = createApiClient({
    baseUrl: 'http://localhost:8088/api/v1/',
    fetchImpl: async (url) => {
      urls.push(url)
      return response({ list: [], total: 0, page: 1, pageSize: 20 })
    },
  })

  await client.listAppointments({ page: 1, pageSize: 20, status: '待制作' })
  await client.listFollowups({ page: 1, pageSize: 10, status: '待完成' })

  assert.deepEqual(urls, [
    'http://localhost:8088/api/v1/appointments?page=1&pageSize=20&status=%E5%BE%85%E5%88%B6%E4%BD%9C',
    'http://localhost:8088/api/v1/followups?page=1&pageSize=10&status=%E5%BE%85%E5%AE%8C%E6%88%90',
  ])
})

test('选题生命周期和复盘完成操作走后端契约', async () => {
  const calls = []
  const client = createApiClient({
    fetchImpl: async (url, init) => {
      calls.push({ url, init })
      return response({ id: 'ok' })
    },
  })

  await client.checkinAppointment('CR-1')
  await client.updateAppointmentStatus('CR-1', '待制作')
  await client.updateAppointmentStatus('CR-1', '制作中')
  await client.updateAppointmentStatus('CR-1', '已发布')
  await client.completeFollowup('FW-1')

  assert.deepEqual(calls.map(({ url }) => url), [
    '/api/v1/appointments/CR-1/checkin',
    '/api/v1/appointments/CR-1/status',
    '/api/v1/appointments/CR-1/status',
    '/api/v1/appointments/CR-1/status',
    '/api/v1/followups/FW-1/complete',
  ])
  for (const { init } of calls) {
    assert.match(init.headers['Idempotency-Key'], /^cf-/)
  }
})

test('非零响应会抛错，调用方可以保留演示数据', async () => {
  const client = createApiClient({
    fetchImpl: async () => ({
      ok: false,
      status: 409,
      async json() {
        return { code: 409, message: '状态不可推进', data: null }
      },
    }),
  })

  await assert.rejects(() => client.updateAppointmentStatus('CR-1', '待制作'), /状态不可推进/)
})

test('内容流水线客户端支持选题、脚本、审核、发布和指标复盘', async () => {
  const calls = []
  const client = createApiClient({
    fetchImpl: async (url, init) => {
      calls.push({ url, init })
      return response({ id: 'CF-1', status: '已复盘' })
    },
  })

  await client.listContentItems({ status: '待审核', owner: '林编辑' })
  await client.getContentItem('CF-1')
  await client.listContentEvents('CF-1')
  await client.createContentItem({ title: '城市夜行', channel: '短视频', owner: '林编辑', plannedAt: '2026-07-18' })
  await client.saveContentScript('CF-1', { body: '脚本' })
  await client.submitContentReview('CF-1', '主编')
  await client.publishContent('CF-1', { publishedAt: '2026-07-18T18:00:00+08:00', actor: '主编' })
  await client.recordContentMetrics('CF-1', { views: 100, likes: 12, comments: 3, shares: 4 })

  assert.deepEqual(calls.map(({ url }) => url), [
    '/api/v1/content-items?status=%E5%BE%85%E5%AE%A1%E6%A0%B8&owner=%E6%9E%97%E7%BC%96%E8%BE%91',
    '/api/v1/content-items/CF-1',
    '/api/v1/content-items/CF-1/events',
    '/api/v1/content-items',
    '/api/v1/content-items/CF-1/script',
    '/api/v1/content-items/CF-1/submit-review',
    '/api/v1/content-items/CF-1/publish',
    '/api/v1/content-items/CF-1/metrics',
  ])
})
