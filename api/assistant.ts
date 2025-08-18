// Vercel serverless function: /api/assistant
// Supports OpenAI-compatible chat completions for simple JSON action plans

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  try {
    const { prompt, context } = req.body || {}
    if (!prompt) {
      res.status(400).json({ error: 'Missing prompt' })
      return
    }

    const apiKey = process.env.OPENAI_API_KEY || process.env.OPENROUTER_API_KEY
    if (!apiKey) {
      res.status(500).json({ error: 'Missing API key (OPENAI_API_KEY or OPENROUTER_API_KEY)' })
      return
    }

    const isOpenRouter = Boolean(process.env.OPENROUTER_API_KEY)
    const endpoint = isOpenRouter ? 'https://openrouter.ai/api/v1/chat/completions' : 'https://api.openai.com/v1/chat/completions'
    const model = process.env.LLM_MODEL || (isOpenRouter ? 'openai/gpt-4o-mini' : 'gpt-4o-mini')

    const system = `You are an assistant for a financial simulation app. Return ONLY valid JSON with fields { analysis: string, actions: Action[] }.
Action = { type: string, target: string, value?: number|string, range?: [number, number] }.
Allowed action types and targets:
- set_input: target in ["evalPrice","avgPayout","evalPassRate","simFundedRate","activationFee","useActivationFee"]; value is number (percent for pass/funded) or boolean for useActivationFee.
- set_axis: target in ["x","y"]; value in ["evalPrice","avgPayout","purchaseToPayoutRate","activationFee"].
- set_range: target in ["x","y"]; range is [min,max] numbers (PTR range is in percent).
- set_target: target = "margin"; value is percent number.
Do not include commentary outside JSON. Consider provided context to propose sensible actions.`

    const body = {
      model,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: JSON.stringify({ prompt, context }) }
      ],
      temperature: 0.2,
      response_format: { type: 'json_object' as const }
    }

    const resp = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        ...(isOpenRouter ? { 'HTTP-Referer': process.env.SITE_URL || 'http://localhost', 'X-Title': 'ContourMargins' } : {})
      },
      body: JSON.stringify(body)
    })

    if (!resp.ok) {
      const text = await resp.text()
      res.status(500).json({ error: 'LLM request failed', detail: text })
      return
    }

    const data = await resp.json()
    const content = data?.choices?.[0]?.message?.content || '{}'
    let parsed
    try { parsed = JSON.parse(content) } catch { parsed = { analysis: content, actions: [] } }
    res.status(200).json(parsed)
  } catch (e: any) {
    res.status(500).json({ error: 'Unexpected error', detail: String(e?.message || e) })
  }
}


