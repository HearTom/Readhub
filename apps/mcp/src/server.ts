import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'

// Nombre y versión que el servidor anuncia al cliente MCP durante el
// handshake de inicialización (capabilities negotiation).
export const SERVER_NAME = 'readhub-mcp'
export const SERVER_VERSION = '0.0.1'

// Punto de creación único del McpServer. Deliberadamente sin Tools,
// Resources ni Prompts registrados todavía -- eso se agrega en una fase
// posterior, registrando cada uno desde su propia carpeta (./tools,
// ./resources, ./prompts) para mantener este archivo como el único lugar
// que conoce la identidad del servidor.
export function createServer(): McpServer {
  return new McpServer({
    name: SERVER_NAME,
    version: SERVER_VERSION,
  })
}
