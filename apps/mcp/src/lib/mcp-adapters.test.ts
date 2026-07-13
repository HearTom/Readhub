import { describe, it, expect } from 'vitest'
import {
  serviceResultToToolResult,
  serviceResultToResourceContent,
  jsonResourceContent,
  firstTemplateValue,
} from './mcp-adapters'
import type { ServiceResult } from '@readhub/database'

describe('serviceResultToToolResult', () => {
  it('mapea un resultado exitoso a content con el data serializado', () => {
    const result: ServiceResult<{ id: string }> = { data: { id: '1' }, error: null }
    expect(serviceResultToToolResult(result)).toEqual({
      content: [{ type: 'text', text: JSON.stringify({ id: '1' }, null, 2) }],
    })
  })

  it('mapea un error a isError:true en vez de lanzar', () => {
    const result: ServiceResult<null> = { data: null, error: 'algo falló' }
    expect(serviceResultToToolResult(result)).toEqual({
      isError: true,
      content: [{ type: 'text', text: 'Error: algo falló' }],
    })
  })
})

describe('serviceResultToResourceContent', () => {
  it('mapea un resultado exitoso a contents con el data serializado', () => {
    const result: ServiceResult<{ id: string }> = { data: { id: '1' }, error: null }
    expect(serviceResultToResourceContent('readhub://articles/1', result)).toEqual({
      contents: [
        { uri: 'readhub://articles/1', mimeType: 'application/json', text: JSON.stringify({ id: '1' }, null, 2) },
      ],
    })
  })

  it('lanza un Error (no lo envuelve) cuando el ServiceResult trae error', () => {
    const result: ServiceResult<null> = { data: null, error: 'no encontrado' }
    expect(() => serviceResultToResourceContent('readhub://articles/1', result)).toThrow('no encontrado')
  })
})

describe('jsonResourceContent', () => {
  it('envuelve datos arbitrarios (no provenientes de un ServiceResult)', () => {
    expect(jsonResourceContent('readhub://info', { name: 'ReadHub' })).toEqual({
      contents: [
        { uri: 'readhub://info', mimeType: 'application/json', text: JSON.stringify({ name: 'ReadHub' }, null, 2) },
      ],
    })
  })
})

describe('firstTemplateValue', () => {
  it('devuelve el string tal cual cuando no es un array', () => {
    expect(firstTemplateValue('abc-123')).toBe('abc-123')
  })

  it('devuelve el primer elemento cuando es un array', () => {
    expect(firstTemplateValue(['first', 'second'])).toBe('first')
  })
})
