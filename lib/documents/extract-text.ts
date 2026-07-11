// Extracción de texto plano server-side a partir de los formatos aceptados
// por services/storage.service.ts (TXT, DOC, DOCX, PDF). Usa librerías Node
// (pdf-parse, mammoth) — solo debe importarse desde código server-side
// (Services/Route Handlers), nunca desde un Client Component.

const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
const DOC_MIME = 'application/msword'

export async function extractText(buffer: Buffer, mimeType: string): Promise<string> {
  if (mimeType === 'text/plain') {
    return buffer.toString('utf-8')
  }

  if (mimeType === 'application/pdf') {
    const { default: pdfParse } = await import('pdf-parse')
    const result = await pdfParse(buffer)
    return result.text
  }

  if (mimeType === DOCX_MIME || mimeType === DOC_MIME) {
    const mammoth = await import('mammoth')
    const result = await mammoth.extractRawText({ buffer })
    return result.value
  }

  throw new Error(`Formato de documento no soportado para extracción: ${mimeType}`)
}
