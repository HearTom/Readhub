'use client'

import { useState, useRef } from 'react'
import { Upload, FileText, ImageIcon, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { InlineError } from '@/components/ui/states'
import { cn } from '@/lib/utils'

const ACCEPTED_DOC_MIME = [
  'text/plain',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/pdf',
]
const MAX_DOC_MB = 10

export interface ArticleFormData {
  title: string
  document: File
  image: File
}

interface ArticleFormProps {
  onSubmit: (data: ArticleFormData) => Promise<void> | void
  onCancel?: () => void
  isLoading?: boolean
  error?: string | null
}

type FieldErrors = { title?: string; document?: string; image?: string }

export function ArticleForm({ onSubmit, onCancel, isLoading, error }: ArticleFormProps) {
  const [title, setTitle] = useState('')
  const [doc, setDoc] = useState<File | null>(null)
  const [image, setImage] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})

  const docRef = useRef<HTMLInputElement>(null)
  const imgRef = useRef<HTMLInputElement>(null)

  function handleDocSelect(file: File | null) {
    setDoc(file)
    setFieldErrors((p) => ({ ...p, document: undefined }))
  }

  function handleImageSelect(file: File | null) {
    if (!file) { setImage(null); setPreview(null); return }
    setImage(file)
    setFieldErrors((p) => ({ ...p, image: undefined }))
    const reader = new FileReader()
    reader.onloadend = () => setPreview(reader.result as string)
    reader.readAsDataURL(file)
  }

  function validate(): boolean {
    const errors: FieldErrors = {}
    if (!title.trim()) errors.title = 'El título es obligatorio'
    if (!doc) errors.document = 'Selecciona un documento'
    else if (!ACCEPTED_DOC_MIME.includes(doc.type)) errors.document = 'Formato inválido (TXT, DOCX o PDF)'
    else if (doc.size > MAX_DOC_MB * 1024 * 1024) errors.document = `El archivo supera los ${MAX_DOC_MB} MB`
    if (!image) errors.image = 'Selecciona una imagen de portada'
    else if (!image.type.startsWith('image/')) errors.image = 'El archivo debe ser una imagen'
    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate() || !doc || !image) return
    await onSubmit({ title, document: doc, image })
  }

  return (
    <Card className="shadow-card max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="text-xl sm:text-2xl font-bold">Publicar Artículo</CardTitle>
        <CardDescription>Completa los datos para publicar tu artículo en ReadHub</CardDescription>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit} noValidate className="space-y-5">
          {error && <InlineError message={error} />}

          {/* Title */}
          <div className="space-y-1.5">
            <Label htmlFor="article-title">Título del artículo</Label>
            <Input
              id="article-title"
              type="text"
              placeholder="Escribe un título descriptivo…"
              value={title}
              onChange={(e) => { setTitle(e.target.value); setFieldErrors((p) => ({ ...p, title: undefined })) }}
              aria-invalid={!!fieldErrors.title}
              disabled={isLoading}
              maxLength={200}
            />
            {fieldErrors.title && <p className="text-xs text-destructive">{fieldErrors.title}</p>}
          </div>

          {/* Document upload */}
          <div className="space-y-1.5">
            <Label>Documento</Label>
            <div
              role="button"
              tabIndex={0}
              onClick={() => docRef.current?.click()}
              onKeyDown={(e) => e.key === 'Enter' && docRef.current?.click()}
              className={cn('upload-zone', fieldErrors.document && 'border-destructive')}
            >
              {doc ? (
                <div className="flex items-center gap-3 w-full">
                  <FileText className="h-8 w-8 text-primary shrink-0" />
                  <div className="flex-1 text-left min-w-0">
                    <p className="text-sm font-medium truncate">{doc.name}</p>
                    <p className="text-xs text-muted-foreground">{(doc.size / 1024).toFixed(1)} KB</p>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); handleDocSelect(null) }}
                    className="p-1 rounded hover:bg-muted transition-colors shrink-0"
                    aria-label="Quitar documento"
                  >
                    <X className="h-4 w-4 text-muted-foreground" />
                  </button>
                </div>
              ) : (
                <>
                  <Upload className="h-8 w-8 text-muted-foreground" />
                  <p className="text-sm font-medium">Haz clic para seleccionar un documento</p>
                  <p className="text-xs text-muted-foreground">TXT, DOCX o PDF · máx. {MAX_DOC_MB} MB</p>
                </>
              )}
            </div>
            <input
              ref={docRef}
              type="file"
              accept=".txt,.doc,.docx,.pdf"
              className="sr-only"
              onChange={(e) => handleDocSelect(e.target.files?.[0] ?? null)}
              disabled={isLoading}
            />
            {fieldErrors.document && (
              <p className="text-xs text-destructive">{fieldErrors.document}</p>
            )}
          </div>

          {/* Image upload */}
          <div className="space-y-1.5">
            <Label>Imagen de portada</Label>
            <div
              role="button"
              tabIndex={0}
              onClick={() => imgRef.current?.click()}
              onKeyDown={(e) => e.key === 'Enter' && imgRef.current?.click()}
              className={cn('upload-zone', fieldErrors.image && 'border-destructive')}
            >
              {preview ? (
                <div className="relative w-full">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={preview}
                    alt="Vista previa"
                    className="rounded-lg object-cover w-full max-h-48"
                  />
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); handleImageSelect(null) }}
                    className="absolute top-2 right-2 p-1.5 rounded-full bg-background/80 hover:bg-background shadow transition-colors"
                    aria-label="Quitar imagen"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <>
                  <ImageIcon className="h-8 w-8 text-muted-foreground" />
                  <p className="text-sm font-medium">Haz clic para seleccionar una imagen</p>
                  <p className="text-xs text-muted-foreground">JPG, PNG, WebP</p>
                </>
              )}
            </div>
            <input
              ref={imgRef}
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={(e) => handleImageSelect(e.target.files?.[0] ?? null)}
              disabled={isLoading}
            />
            {fieldErrors.image && (
              <p className="text-xs text-destructive">{fieldErrors.image}</p>
            )}
          </div>

          {/* Actions — vertical en móvil, horizontal en sm+ */}
          <div className="flex flex-col-reverse sm:flex-row gap-3 pt-2">
            {onCancel && (
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                disabled={isLoading}
                className="w-full sm:flex-1"
              >
                Cancelar
              </Button>
            )}
            <Button type="submit" loading={isLoading} className="w-full sm:flex-1">
              Publicar Artículo
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
