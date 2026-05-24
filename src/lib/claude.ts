interface ExtractedPhrase {
  sr_latin: string;
  sr_cyrillic: string;
  en: string;
  context: string;
  notes?: string;
}

interface ExtractedContent {
  title: string;
  phrases: ExtractedPhrase[];
}

export async function extractContent(
  text: string,
  apiKey: string
): Promise<ExtractedContent> {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      messages: [
        {
          role: 'user',
          content: `Analyze this Serbian text and extract useful phrases for a language learner. For each phrase, provide:
- sr_latin: the phrase in Serbian Latin script
- sr_cyrillic: the phrase in Serbian Cyrillic script
- en: English translation
- context: when/how to use this phrase
- notes: any grammar or cultural notes (optional)

Also give the extracted content a short title.

Return ONLY valid JSON in this exact format:
{
  "title": "Title of the content",
  "phrases": [
    {
      "sr_latin": "...",
      "sr_cyrillic": "...",
      "en": "...",
      "context": "...",
      "notes": "..."
    }
  ]
}

Text to analyze:
${text}`,
        },
      ],
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`API error: ${response.status} - ${err}`);
  }

  const data = await response.json();
  const content = data.content?.[0]?.text ?? '';

  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('Could not parse response as JSON');
  }

  return JSON.parse(jsonMatch[0]) as ExtractedContent;
}
