import { HttpError } from "./http.js";

const GROQ_MODEL_DEFAULT = "llama-3.3-70b-versatile";

export async function callGroq({ prompt, system }) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new HttpError(500, "GROQ_API_KEY is not configured");

  const messages = [
    ...(system ? [{ role: "system", content: system }] : []),
    { role: "user", content: prompt ?? "" },
  ];

  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: process.env.GROQ_MODEL || GROQ_MODEL_DEFAULT,
      messages,
    }),
  });

  const body = await res.json();
  if (!res.ok) {
    throw new Error(`Groq API error (${res.status}): ${JSON.stringify(body)}`);
  }
  return body.choices?.[0]?.message?.content ?? "";
}
