import { checkRateLimit, getClientIp } from './_rateLimit.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Rate limit check
  const ip = getClientIp(req);
  const paidToken = req.body?.paidToken || req.headers['x-paid-token'] || null;
  const { allowed, remaining, retryAfterHours } = checkRateLimit(ip, paidToken);
  if (!allowed) {
    return res.status(429).json({
      error: 'rate_limit',
      message: `You've used all 3 free previews for today. Please try again in ${retryAfterHours} hour(s).`,
      message_de: `Du hast heute alle 3 kostenlosen Vorschauen verbraucht. Bitte versuche es in ${retryAfterHours} Stunde(n) erneut.`,
      retryAfterHours
    });
  }

  const { prompt } = req.body;
  if (!prompt) {
    return res.status(400).json({ error: 'No prompt provided' });
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5',
        max_tokens: 8000,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    const data = await response.json();
    if (!response.ok) {
      return res.status(500).json({ error: 'API error', details: data });
    }

    const text = data.content?.[0]?.text || 'Kein Plan erhalten.';
    return res.status(200).json({ result: text, remaining });

  } catch (error) {
    return res.status(500).json({ error: 'Server error', details: error.message });
  }
}
