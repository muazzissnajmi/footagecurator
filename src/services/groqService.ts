export async function generateKeywords(
  sentence: string
): Promise<string[]> {
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
        messages: [
          {
            role: 'user',
            content: `You are a stock footage search expert.
Given this narration sentence, generate exactly 4
search keywords, each MUST be exactly 2 words.
Optimized for finding stock footage on Pexels.
Use COMMON, GENERIC visual concepts.
Return ONLY a JSON array of strings, no explanation.
Example: ["city street", "people walking",
          "market crowd", "desert landscape"]

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
