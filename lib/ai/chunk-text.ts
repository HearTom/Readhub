// Fragmenta un texto largo en trozos aptos para generar un embedding por
// fragmento. Empaqueta por párrafos (separados por línea en blanco) para no
// cortar ideas a la mitad; si un párrafo individual supera maxChars, lo
// divide directamente conservando un solapamiento entre fragmentos
// consecutivos para no perder contexto en el límite de cada corte.
export function chunkText(text: string, maxChars = 800, overlapChars = 100): string[] {
  const trimmed = text.trim()
  if (trimmed.length === 0) return []
  if (trimmed.length <= maxChars) return [trimmed]

  const paragraphs = trimmed
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean)

  const chunks: string[] = []
  let current = ''

  for (const paragraph of paragraphs) {
    if (paragraph.length > maxChars) {
      if (current) {
        chunks.push(current)
        current = ''
      }
      let start = 0
      while (start < paragraph.length) {
        let end = Math.min(start + maxChars, paragraph.length)
        if (end < paragraph.length) {
          // Evitar cortar a mitad de palabra: retroceder hasta el último
          // espacio dentro del límite, si existe uno razonablemente cerca.
          const lastSpace = paragraph.lastIndexOf(' ', end)
          if (lastSpace > start) end = lastSpace
        }
        chunks.push(paragraph.slice(start, end).trim())
        if (end >= paragraph.length) break

        let nextStart = Math.max(end - overlapChars, start + 1)
        // Igual que al cerrar el chunk: no arrancar el siguiente a mitad de
        // palabra — avanzar al próximo espacio dentro del rango ya cubierto.
        const nextSpace = paragraph.indexOf(' ', nextStart)
        if (nextSpace !== -1 && nextSpace < end) nextStart = nextSpace + 1
        start = nextStart
      }
      continue
    }

    const candidate = current ? `${current}\n\n${paragraph}` : paragraph
    if (candidate.length > maxChars) {
      if (current) chunks.push(current)
      current = paragraph
    } else {
      current = candidate
    }
  }

  if (current) chunks.push(current)
  return chunks
}
