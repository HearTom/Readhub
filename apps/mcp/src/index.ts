#!/usr/bin/env node
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { createServer } from './server.js'
import { registerAllTools } from './tools/index.js'
import { registerAllResources } from './resources/index.js'
import { registerAllPrompts } from './prompts/index.js'

// El transporte STDIO usa stdout exclusivamente para los mensajes
// JSON-RPC del protocolo MCP -- cualquier log de diagnóstico debe ir a
// stderr (console.error), nunca a console.log, o corrompe el stream.
async function main(): Promise<void> {
  const server = createServer()

  // Registrar Tools/Resources/Prompts antes de connect(): deben estar
  // listos antes de que el cliente MCP pueda listarlos/llamarlos.
  const toolNames = registerAllTools(server)
  const resourceUris = registerAllResources(server)
  const promptNames = registerAllPrompts(server)

  const transport = new StdioServerTransport()
  await server.connect(transport)
  console.error('[readhub-mcp] Servidor iniciado (transporte stdio).')
  console.error(`[readhub-mcp] ${toolNames.length} tools registradas: ${toolNames.join(', ')}`)
  console.error(`[readhub-mcp] ${resourceUris.length} resources registrados: ${resourceUris.join(', ')}`)
  console.error(`[readhub-mcp] ${promptNames.length} prompts (skills) registrados: ${promptNames.join(', ')}`)
}

main().catch((error) => {
  console.error('[readhub-mcp] Error fatal al iniciar el servidor:', error)
  process.exit(1)
})
