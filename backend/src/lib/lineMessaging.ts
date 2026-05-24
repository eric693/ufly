import axios from 'axios'

const TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN

export async function sendLineMessage(lineUserId: string, text: string) {
  if (!TOKEN || !lineUserId) return
  try {
    await axios.post(
      'https://api.line.me/v2/bot/message/push',
      { to: lineUserId, messages: [{ type: 'text', text }] },
      { headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' } }
    )
  } catch (e: any) {
    console.error('LINE push failed:', e?.response?.data || e.message)
  }
}
