export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { songs, duration, people, budget, accommodation, lang } = req.body;

  if (!songs || songs.length === 0) {
    return res.status(400).json({ error: 'No songs provided' });
  }

  const isDE = lang === 'de';
  const musicList = songs.join(', ');

  const prompt = `You are an expert travel planner and music analyst.
The user's favourite artists/songs are: ${musicList}
Analyse the musical genres, energy, cultural origins, moods and vibes of this music.
Then select the PERFECT travel destination that matches this musical identity and personality.
Explain WHY this destination matches their music taste in the intro.
Duration: ${duration || 'flexible'} | Travelers: ${people || 'flexible'} | Budget: ${budget || 'flexible'} | Accommodation: ${accommodation || 'flexible'}

Use EXACTLY this format:
- 2-3 enthusiastic intro sentences explaining the music-destination connection
- For EACH day: DAY [N]: [Creative title] / Morning: / Lunch: / Afternoon: / Evening: / Tip:
- Weave in musical references naturally (e.g. a flamenco bar for a flamenco fan)
- Add Google Maps links: PlaceName 🗺️ [Maps](https://maps.google.com/?q=PlaceName+City+Country)
- NO markdown symbols (* ** # ##) at line starts
- Language: ${isDE ? 'German' : 'English'}`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1500,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(500).json({ error: 'API error', details: data });
    }

    const text = data.content?.[0]?.text || 'No plan received.';
    return res.status(200).json({ result: text });

  } catch (error) {
    return res.status(500).json({ error: 'Server error', details: error.message });
  }
}
