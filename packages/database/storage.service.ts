import type { createClient } from './client'
import type { ServiceResult } from './types'

type Client = ReturnType<typeof createClient>

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTES
// ─────────────────────────────────────────────────────────────────────────────

export const BUCKET_DOCUMENTS = 'documents'
export const BUCKET_IMAGES = 'images'

const MAX_DOCUMENT_BYTES = 10 * 1024 * 1024 //  10 MB
const MAX_IMAGE_BYTES    =  5 * 1024 * 1024 //   5 MB

const ACCEPTED_DOC_MIME = new Set([
  'text/plain',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/pdf',
])

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS INTERNOS
// ─────────────────────────────────────────────────────────────────────────────

function uniqueFilePath(userId: string, originalName: string): string {
  const ext = originalName.split('.').pop() ?? ''
  const uniquePart = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  const fileName = ext ? `${uniquePart}.${ext}` : uniquePart
  return `${userId}/${fileName}`
}

// ─────────────────────────────────────────────────────────────────────────────
// UPLOAD DOCUMENT
// Sube al bucket `documents` y retorna la ruta dentro del bucket.
// ─────────────────────────────────────────────────────────────────────────────

export async function uploadDocument(
  client: Client,
  file: File,
  userId: string
): Promise<ServiceResult<string>> {
  if (!ACCEPTED_DOC_MIME.has(file.type)) {
    return { data: null, error: 'Formato no permitido. Acepta TXT, DOCX o PDF.' }
  }
  if (file.size > MAX_DOCUMENT_BYTES) {
    return { data: null, error: 'El documento supera el límite de 10 MB.' }
  }

  const path = uniqueFilePath(userId, file.name)
  const { error } = await client.storage
    .from(BUCKET_DOCUMENTS)
    .upload(path, file, { contentType: file.type, upsert: false })

  if (error) return { data: null, error: error.message }
  return { data: path, error: null }
}

// ─────────────────────────────────────────────────────────────────────────────
// UPLOAD IMAGE
// Sube al bucket `images` y retorna la ruta dentro del bucket.
// ─────────────────────────────────────────────────────────────────────────────

export async function uploadImage(
  client: Client,
  file: File,
  userId: string
): Promise<ServiceResult<string>> {
  if (!file.type.startsWith('image/')) {
    return { data: null, error: 'El archivo debe ser una imagen.' }
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return { data: null, error: 'La imagen supera el límite de 5 MB.' }
  }

  const path = uniqueFilePath(userId, file.name)
  const { error } = await client.storage
    .from(BUCKET_IMAGES)
    .upload(path, file, { contentType: file.type, upsert: false })

  if (error) return { data: null, error: error.message }
  return { data: path, error: null }
}

// ─────────────────────────────────────────────────────────────────────────────
// GET PUBLIC URL — función síncrona, no requiere cliente autenticado
// ─────────────────────────────────────────────────────────────────────────────

export function getPublicUrl(bucket: string, path: string): string {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  return `${supabaseUrl}/storage/v1/object/public/${bucket}/${path}`
}

export function getImageUrl(imagePath: string): string {
  return getPublicUrl(BUCKET_IMAGES, imagePath)
}

export function getDocumentUrl(documentPath: string): string {
  return getPublicUrl(BUCKET_DOCUMENTS, documentPath)
}

// ─────────────────────────────────────────────────────────────────────────────
// DOWNLOAD DOCUMENT TEXT
// Descarga el contenido del documento como texto plano.
// Funciona perfectamente con TXT. Para PDF/DOCX el contenido es binario;
// en producción se usaría un parser, aquí se devuelve el texto raw.
// ─────────────────────────────────────────────────────────────────────────────

export async function downloadDocumentText(
  client: Client,
  documentPath: string
): Promise<ServiceResult<string>> {
  const { data, error } = await client.storage
    .from(BUCKET_DOCUMENTS)
    .download(documentPath)

  if (error) return { data: null, error: error.message }

  try {
    const text = await data.text()
    return { data: text, error: null }
  } catch {
    return { data: null, error: 'No se pudo leer el contenido del documento.' }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// DELETE FILE
// ─────────────────────────────────────────────────────────────────────────────

export async function deleteStorageFile(
  client: Client,
  bucket: string,
  path: string
): Promise<ServiceResult<null>> {
  const { error } = await client.storage.from(bucket).remove([path])

  if (error) return { data: null, error: error.message }
  return { data: null, error: null }
}

// ─────────────────────────────────────────────────────────────────────────────
// DELETE ARTICLE FILES — elimina documento e imagen en paralelo
// ─────────────────────────────────────────────────────────────────────────────

export async function deleteArticleFiles(
  client: Client,
  documentPath: string | null,
  imagePath: string | null
): Promise<{ documentError: string | null; imageError: string | null }> {
  const [docResult, imgResult] = await Promise.all([
    documentPath
      ? deleteStorageFile(client, BUCKET_DOCUMENTS, documentPath)
      : Promise.resolve({ data: null as null, error: null as null }),
    imagePath
      ? deleteStorageFile(client, BUCKET_IMAGES, imagePath)
      : Promise.resolve({ data: null as null, error: null as null }),
  ])

  return {
    documentError: docResult.error,
    imageError: imgResult.error,
  }
}
