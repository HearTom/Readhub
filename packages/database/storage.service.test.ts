import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  uploadDocument,
  uploadImage,
  getPublicUrl,
  getImageUrl,
  getDocumentUrl,
  downloadDocumentText,
  deleteStorageFile,
  deleteArticleFiles,
  BUCKET_DOCUMENTS,
  BUCKET_IMAGES,
} from './storage.service'

function file(name: string, type: string, sizeBytes: number): File {
  return new File([new Uint8Array(sizeBytes)], name, { type })
}

function storageClient(overrides: Record<string, unknown> = {}) {
  const bucketApi = {
    upload: vi.fn().mockResolvedValue({ error: null }),
    download: vi.fn(),
    remove: vi.fn().mockResolvedValue({ error: null }),
    ...overrides,
  }
  return { storage: { from: vi.fn(() => bucketApi) }, __bucketApi: bucketApi } as any
}

describe('uploadDocument', () => {
  it('rechaza un MIME no permitido sin llamar a storage', async () => {
    const client = storageClient()
    const result = await uploadDocument(client, file('a.exe', 'application/x-msdownload', 10), 'u1')

    expect(result).toEqual({ data: null, error: 'Formato no permitido. Acepta TXT, DOCX o PDF.' })
    expect(client.storage.from).not.toHaveBeenCalled()
  })

  it('rechaza un archivo que excede 10 MB', async () => {
    const client = storageClient()
    const tooBig = file('a.pdf', 'application/pdf', 11 * 1024 * 1024)

    const result = await uploadDocument(client, tooBig, 'u1')

    expect(result).toEqual({ data: null, error: 'El documento supera el límite de 10 MB.' })
    expect(client.storage.from).not.toHaveBeenCalled()
  })

  it('sube el archivo válido al bucket documents con un path prefijado por userId', async () => {
    const client = storageClient()
    const result = await uploadDocument(client, file('doc.pdf', 'application/pdf', 100), 'user-42')

    expect(client.storage.from).toHaveBeenCalledWith(BUCKET_DOCUMENTS)
    expect(client.__bucketApi.upload).toHaveBeenCalledWith(
      expect.stringMatching(/^user-42\//),
      expect.anything(),
      { contentType: 'application/pdf', upsert: false }
    )
    expect(result.error).toBeNull()
    expect(result.data).toMatch(/^user-42\//)
  })

  it('propaga el error de storage', async () => {
    const client = storageClient({ upload: vi.fn().mockResolvedValue({ error: { message: 'storage caído' } }) })

    const result = await uploadDocument(client, file('doc.pdf', 'application/pdf', 100), 'u1')

    expect(result).toEqual({ data: null, error: 'storage caído' })
  })
})

describe('uploadImage', () => {
  it('rechaza un archivo que no es imagen', async () => {
    const client = storageClient()
    const result = await uploadImage(client, file('a.pdf', 'application/pdf', 10), 'u1')

    expect(result).toEqual({ data: null, error: 'El archivo debe ser una imagen.' })
  })

  it('rechaza una imagen que excede 5 MB', async () => {
    const client = storageClient()
    const tooBig = file('a.png', 'image/png', 6 * 1024 * 1024)

    const result = await uploadImage(client, tooBig, 'u1')

    expect(result).toEqual({ data: null, error: 'La imagen supera el límite de 5 MB.' })
  })

  it('sube la imagen válida al bucket images', async () => {
    const client = storageClient()
    const result = await uploadImage(client, file('cover.png', 'image/png', 100), 'user-1')

    expect(client.storage.from).toHaveBeenCalledWith(BUCKET_IMAGES)
    expect(result.error).toBeNull()
  })
})

describe('getPublicUrl / getImageUrl / getDocumentUrl', () => {
  const ORIGINAL_URL = process.env.NEXT_PUBLIC_SUPABASE_URL

  beforeEach(() => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://proyecto.supabase.co'
  })

  afterEach(() => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = ORIGINAL_URL
  })

  it('construye la URL pública combinando bucket y path', () => {
    expect(getPublicUrl('images', 'u1/foo.png')).toBe(
      'https://proyecto.supabase.co/storage/v1/object/public/images/u1/foo.png'
    )
  })

  it('getImageUrl usa el bucket de imágenes', () => {
    expect(getImageUrl('u1/foo.png')).toBe('https://proyecto.supabase.co/storage/v1/object/public/images/u1/foo.png')
  })

  it('getDocumentUrl usa el bucket de documentos', () => {
    expect(getDocumentUrl('u1/foo.pdf')).toBe(
      'https://proyecto.supabase.co/storage/v1/object/public/documents/u1/foo.pdf'
    )
  })
})

describe('downloadDocumentText', () => {
  it('devuelve el texto descargado', async () => {
    const blob = { text: vi.fn().mockResolvedValue('contenido del txt') }
    const client = storageClient({ download: vi.fn().mockResolvedValue({ data: blob, error: null }) })

    const result = await downloadDocumentText(client, 'u1/a.txt')

    expect(result).toEqual({ data: 'contenido del txt', error: null })
  })

  it('propaga el error de storage', async () => {
    const client = storageClient({ download: vi.fn().mockResolvedValue({ data: null, error: { message: 'no existe' } }) })

    const result = await downloadDocumentText(client, 'u1/a.txt')

    expect(result).toEqual({ data: null, error: 'no existe' })
  })

  it('devuelve un error genérico si .text() lanza', async () => {
    const blob = { text: vi.fn().mockRejectedValue(new Error('binario no legible')) }
    const client = storageClient({ download: vi.fn().mockResolvedValue({ data: blob, error: null }) })

    const result = await downloadDocumentText(client, 'u1/a.pdf')

    expect(result).toEqual({ data: null, error: 'No se pudo leer el contenido del documento.' })
  })
})

describe('deleteStorageFile', () => {
  it('propaga el error', async () => {
    const client = storageClient({ remove: vi.fn().mockResolvedValue({ error: { message: 'no encontrado' } }) })

    const result = await deleteStorageFile(client, BUCKET_IMAGES, 'u1/a.png')

    expect(result).toEqual({ data: null, error: 'no encontrado' })
  })
})

describe('deleteArticleFiles', () => {
  it('no llama a storage para paths null', async () => {
    const client = storageClient()

    const result = await deleteArticleFiles(client, null, null)

    expect(result).toEqual({ documentError: null, imageError: null })
    expect(client.storage.from).not.toHaveBeenCalled()
  })

  it('elimina documento e imagen en paralelo y agrega ambos errores', async () => {
    const client = storageClient({ remove: vi.fn().mockResolvedValue({ error: { message: 'falló' } }) })

    const result = await deleteArticleFiles(client, 'u1/doc.pdf', 'u1/img.png')

    expect(result).toEqual({ documentError: 'falló', imageError: 'falló' })
  })
})
