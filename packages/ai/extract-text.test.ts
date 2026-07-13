import { describe, it, expect, vi } from 'vitest'

vi.mock('pdf-parse', () => ({ default: vi.fn() }))
vi.mock('mammoth', () => ({ extractRawText: vi.fn() }))

import pdfParse from 'pdf-parse'
import * as mammoth from 'mammoth'
import { extractText } from './extract-text'

describe('extractText', () => {
  it('text/plain: decodifica el buffer como utf-8 sin usar librerías externas', async () => {
    const buffer = Buffer.from('hola mundo', 'utf-8')
    expect(await extractText(buffer, 'text/plain')).toBe('hola mundo')
    expect(pdfParse).not.toHaveBeenCalled()
    expect(mammoth.extractRawText).not.toHaveBeenCalled()
  })

  it('application/pdf: delega en pdf-parse y devuelve result.text', async () => {
    vi.mocked(pdfParse).mockResolvedValue({ text: 'texto del pdf' } as any)
    const buffer = Buffer.from('contenido binario')

    const result = await extractText(buffer, 'application/pdf')

    expect(pdfParse).toHaveBeenCalledWith(buffer)
    expect(result).toBe('texto del pdf')
  })

  it('docx: delega en mammoth.extractRawText y devuelve result.value', async () => {
    vi.mocked(mammoth.extractRawText).mockResolvedValue({ value: 'texto del docx' } as any)
    const buffer = Buffer.from('contenido binario')

    const result = await extractText(
      buffer,
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    )

    expect(mammoth.extractRawText).toHaveBeenCalledWith({ buffer })
    expect(result).toBe('texto del docx')
  })

  it('doc (formato antiguo): también delega en mammoth', async () => {
    vi.mocked(mammoth.extractRawText).mockResolvedValue({ value: 'texto del doc' } as any)
    const buffer = Buffer.from('contenido binario')

    const result = await extractText(buffer, 'application/msword')

    expect(result).toBe('texto del doc')
  })

  it('lanza un error para un MIME type no soportado', async () => {
    const buffer = Buffer.from('x')
    await expect(extractText(buffer, 'application/zip')).rejects.toThrow(
      'Formato de documento no soportado para extracción: application/zip'
    )
  })
})
