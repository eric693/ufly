import crypto from 'crypto'
import axios from 'axios'
import prisma from './prisma'

export async function triggerWebhooks(
  event: string,
  payload: object,
  enterpriseId?: string | null,
) {
  if (!enterpriseId) return

  const endpoints = await prisma.webhookEndpoint.findMany({
    where: { enterpriseId, active: true },
  })

  for (const ep of endpoints) {
    if (!ep.events.split(',').some(e => e.trim() === event || e.trim() === '*')) continue

    const body = JSON.stringify({ event, data: payload, timestamp: new Date().toISOString() })
    const sig  = crypto.createHmac('sha256', ep.secret).update(body).digest('hex')

    const delivery = await prisma.webhookDelivery.create({
      data: { id: crypto.randomUUID(), endpointId: ep.id, event, payload: body },
    })

    axios
      .post(ep.url, body, {
        headers: {
          'Content-Type': 'application/json',
          'X-Ufly-Signature': `sha256=${sig}`,
          'X-Ufly-Event': event,
        },
        timeout: 10_000,
      })
      .then((r: { status: number; data: unknown }) => {
        const raw = JSON.stringify(r.data)
        if (raw.length > 1000) console.warn(`[webhook] Response from ${ep.url} truncated (${raw.length} chars)`)
        return prisma.webhookDelivery.update({
          where: { id: delivery.id },
          data: { statusCode: r.status, response: raw.slice(0, 1000), deliveredAt: new Date() },
        })
      })
      .catch((e: { response?: { status?: number }; message: string }) =>
        prisma.webhookDelivery.update({
          where: { id: delivery.id },
          data: { statusCode: e.response?.status ?? 0, response: e.message.slice(0, 1000) },
        }),
      )
  }
}
