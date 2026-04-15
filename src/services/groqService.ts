export async function generateKeywords(
  sentence: string,
  excluded: string[] = []
): Promise<string[]> {
  const exclusionLine =
    excluded.length > 0
      ? `\nDo NOT suggest any of: ${excluded.map(k => `"${k}"`).join(', ')}.`
      : ''

  const response = await fetch(
    'https://api.groq.com/openai/v1/chat/completions',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${import.meta.env.VITE_GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        max_tokens: 200,
        // Keep the model grounded to the sentence. Higher temperatures
        // make it drift toward unrelated "generic" b-roll.
        temperature: 0.2,
        messages: [
          {
            role: 'user',
            content: `You are a stock footage search expert.
Read this narration sentence carefully and generate exactly 4
search keywords that VISUALLY DEPICT what the sentence describes.

Rules:
- Each keyword MUST be exactly 2 words.
- Keywords MUST be directly grounded in the subjects, actions,
  objects, places, or emotions present in the sentence. Do NOT
  invent unrelated generic b-roll.
- Prefer visually concrete nouns + adjective/verb pairings that
  a stock footage library (Pexels) would actually index.
- Keep them common enough to return results, but they MUST stay
  faithful to the sentence's meaning.${exclusionLine}

Return ONLY a JSON array of strings, no explanation.
Example format: ["city street", "people walking", "market crowd", "desert landscape"]

Sentence: "${sentence}"`,
          },
        ],
      }),
    }
  )

  if (!response.ok) {
    throw new Error(
      `Groq request failed: ${response.status} ${response.statusText}`
    )
  }

  const data = await response.json()
  const text = data?.choices?.[0]?.message?.content

  if (typeof text !== 'string') {
    throw new Error('Groq returned unexpected response shape')
  }

  try {
    const parsed = JSON.parse(text)
    return Array.isArray(parsed) ? parsed.filter(k => typeof k === 'string') : []
  } catch {
    return []
  }
}
