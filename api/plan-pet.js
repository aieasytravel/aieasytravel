export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { imageBase64, imageType, petName, duration, people, wishes, lang } = req.body;

  if (!imageBase64) {
    return res.status(400).json({ error: 'No image provided' });
  }

  // Accept explicit type from frontend, fallback to jpeg
  const mediaType = imageType || 'image/jpeg';
  const isDE = lang === 'de';

  const systemPrompt = `You are an expert travel planner specialising in pet-friendly travel.
The user will send you an image of their pet. Analyse the animal (species, breed, size, energy level, apparent temperament) and use this to create a vivid, enthusiastic, perfectly tailored travel plan.
Choose a destination that fits this specific animal's needs and personality.
Use EXACTLY this format:
- Start with 2-3 enthusiastic intro sentences mentioning the pet by name and why this destination suits them.
- For EACH day: DAY [N]: [Creative title] / Morning: / Lunch: / Afternoon: / Evening: / Tip:
- Highlight pet-friendly spots, parks, beaches, cafes, and accommodation.
- Add Google Maps links: PlaceName 🗺️ [Maps](https://maps.google.com/?q=PlaceName+City+Country)
- NO markdown symbols (* ** # ##) at line starts
- Language: ${isDE ? 'German' : 'English'}`;

  const userMsg = `My pet's name is "${petName || 'my pet'}". Duration: ${duration || 'flexible'}. Travelers: ${people || 'flexible'}. Special wishes: ${wishes || 'none'}. Please analyse my pet in the photo and create the perfect travel plan!`;

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
        max_tokens: 1500,
        system: systemPrompt,
        messages: [{
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: mediaType,
                data: imageBase64
              }
            },
            { type: 'text', text: userMsg }
          ]
        }]
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Anthropic API error:', JSON.stringify(data));
      return res.status(500).json({ error: 'API error', details: data });
    }

    const text = data.content?.[0]?.text || 'No plan received.';
    return res.status(200).json({ result: text });

  } catch (error) {
    return res.status(500).json({ error: 'Server error', details: error.message });
  }
}
