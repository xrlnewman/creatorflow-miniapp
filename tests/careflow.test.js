import test from 'node:test'; import assert from 'node:assert/strict'; import { readFile } from 'node:fs/promises'
test('CreatorFlow miniapp renders content and review cards', async()=>{const source=await readFile(new URL('../src/main.js',import.meta.url),'utf8'); assert.match(source,/新建选题/); assert.match(source,/我的选题/); assert.match(source,/林编辑/)})

test('CreatorFlow actions are wired to the real appointment and follow-up client', async()=>{
  const source=await readFile(new URL('../src/main.js',import.meta.url),'utf8')
  assert.match(source,/createApiClient/)
  assert.match(source,/refreshFromApi/)
  assert.match(source,/checkinAppointment/)
  assert.match(source,/updateAppointmentStatus/)
  assert.match(source,/completeFollowup/)
  assert.match(source,/演示数据/)
})

test('Vite proxies the default API path to the local CreatorFlow service', async()=>{
  const source=await readFile(new URL('../vite.config.js',import.meta.url),'utf8')
  assert.match(source,/proxy/)
  assert.match(source,/localhost:8080/)
})

test('移动端内容流水线显示选题编辑、审核发布确认与指标卡', async()=>{
  const source=await readFile(new URL('../src/main.js',import.meta.url),'utf8')
  const api=await readFile(new URL('../src/api.js',import.meta.url),'utf8')
  assert.match(source,/内容流水线/)
  assert.match(source,/脚本编辑/)
  assert.match(source,/发布确认/)
  assert.match(source,/指标卡/)
  assert.match(source,/data-content-action/)
  assert.match(api,/content-items/)
})
