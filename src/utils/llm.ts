
import { getPref } from "./prefs";

export async function callLLM(text: string): Promise<string> {
  const endpoint = getPref("llm.endpoint") as string;
  const apiKey = getPref("llm.apiKey") as string;

  if (!endpoint || !apiKey) {
    throw new Error("LLM endpoint or API key not configured.");
  }

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-3.5-turbo", // Or any other compatible model
      messages: [
        {
          role: "user",
          content: `Explain the following text:

${text}`,
        },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const data = (await response.json()) as unknown as {
    choices: [{ message: { content: string } }];
  };
  return data.choices[0].message.content;
}
