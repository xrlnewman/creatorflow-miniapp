# CreatorFlow Miniapp

内容排期与创作者协同移动端，覆盖选题创建、排期、制作状态、创作者档案和复盘任务。演示数据均为虚构，不涉及支付或真实创作者隐私。

## 本地运行

```bash
npm install
npm run dev
```

开发服务器默认把 `/api/*` 代理到 `http://localhost:8080`，与同目录的 `creatorflow-admin/server` 默认端口一致。也可以通过环境变量修改：

```bash
VITE_API_PROXY_TARGET=http://localhost:8088 npm run dev
```

## API 与状态同步

页面默认请求 `/api/v1`，生产环境可通过 `VITE_API_BASE_URL` 指向独立的 CreatorFlow API 服务。所有写操作会自动生成 `Idempotency-Key`，避免重复选题、重复签到和重复完成复盘。

- 选题：`GET/POST /api/v1/appointments`
- 签到：`POST /api/v1/appointments/:id/checkin`
- 状态流转：`POST /api/v1/appointments/:id/status`，支持“已排期→待制作→制作中→已发布”
- 复盘：`GET/POST /api/v1/followups`、`POST /api/v1/followups/:id/complete`

接口不可用或返回错误时，移动端会保留并继续展示内置演示数据，同时标记当前数据来源，方便离线预览。

## 验证

```bash
npm test
npm run build
```
