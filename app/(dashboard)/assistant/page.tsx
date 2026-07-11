import { ChatWindow } from '@/components/chat/ChatWindow'

export default function AssistantPage() {
  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-4 sm:mb-6">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Asistente IA</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Pregunta sobre los artículos publicados en ReadHub y recibe respuestas fundamentadas con
          sus fuentes.
        </p>
      </div>
      <ChatWindow />
    </div>
  )
}
