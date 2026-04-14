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
  const data = await response.json()
  console.log('Groq response:', data)
  try {
    const text = data.choices[0].message.content
    return JSON.parse(text)
  } catch {
    console.error('Failed to parse keywords:', data)
    return []
  }
}