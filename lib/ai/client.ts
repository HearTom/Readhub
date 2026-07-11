import { InferenceClient } from '@huggingface/inference'

// Singleton perezoso: falla solo cuando efectivamente se intenta generar un
// embedding (no al importar el módulo), para no romper flujos que importen
// este archivo transitivamente sin llegar a usarlo.
let client: InferenceClient | null = null

export function getHfClient(): InferenceClient {
  if (!client) {
    const token = process.env.HF_TOKEN
    if (!token) {
      throw new Error(
        'HF_TOKEN no está configurado. Agrégalo a .env.local (ver .env.example).'
      )
    }
    client = new InferenceClient(token)
  }
  return client
}
