
import { getPref } from './prefs';
import { ChatModel, EngineCreateOpts, LlmEngine, Message, igniteEngine, loadModels } from 'multi-llm-ts'

export async function callLLM(text: string): Promise<string> {
  const endpoint = getPref("llm.ENGINE") as string;
  const prefKey = `llm.` + endpoint + `.API_KEY` as any;
  const apiKey = getPref(prefKey) as string;

  if (!endpoint || !apiKey) {
    ztoolkit.log("LLM engine or api key not configured", endpoint, prefKey, apiKey)
    throw new Error("LLM ENGINE or API key not configured.")
  }

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: getPref("llm.MODEL_NAME"), // Or any other compatible model
      messages: [
        {
          role: "user",
          content: `Explain the following text: \n\n ${text}`,
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
