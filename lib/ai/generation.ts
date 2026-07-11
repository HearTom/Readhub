import { getHfClient } from './client'

// Único lugar del proyecto que conoce el modelo de generación concreto.
// Sustituir de proveedor (p. ej. por Claude en el futuro) implica editar
// únicamente este archivo y client.ts — chat.service.ts nunca importa
// @huggingface/inference directamente.
export const GENERATION_MODEL = 'meta-llama/Llama-3.1-8B-Instruct'

// Sin streaming en esta fase (restricción explícita) — respuesta completa
// de una sola vez vía chatCompletion (no chatCompletionStream).
export async function generateAnswer(prompt: string): Promise<string> {
  const hf = getHfClient()

  const response = await hf.chatCompletion({
    model: GENERATION_MODEL,
    messages: [{ role: 'user', content: prompt }],
    max_tokens: 512,
    temperature: 0.3,
  })

  return response.choices?.[0]?.message?.content ?? ''
}
