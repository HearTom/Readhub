import { describe, it, expect } from 'vitest'
import { chunkText } from './chunk-text'

describe('chunkText', () => {
  it('devuelve [] para un texto vacío', () => {
    expect(chunkText('')).toEqual([])
  })

  it('devuelve [] para un texto que es solo espacios en blanco', () => {
    expect(chunkText('   \n\n   ')).toEqual([])
  })

  it('devuelve el texto recortado como único chunk si cabe bajo maxChars', () => {
    expect(chunkText('  short text  ', 800)).toEqual(['short text'])
  })

  it('separa párrafos que no caben juntos en un chunk cada uno', () => {
    const text = ['A'.repeat(10), 'B'.repeat(10), 'C'.repeat(10)].join('\n\n')
    // combinar dos párrafos (10 + separador 2 + 10 = 22) excede maxChars=20
    expect(chunkText(text, 20)).toEqual(['A'.repeat(10), 'B'.repeat(10), 'C'.repeat(10)])
  })

  it('empaqueta varios párrafos en un mismo chunk mientras quepan', () => {
    const text = ['A'.repeat(10), 'B'.repeat(10), 'C'.repeat(10)].join('\n\n')
    // A+separador+B = 22 <= 25; agregar C (22+2+10=34) excede 25
    expect(chunkText(text, 25)).toEqual([`${'A'.repeat(10)}\n\n${'B'.repeat(10)}`, 'C'.repeat(10)])
  })

  it('divide un párrafo único más largo que maxChars sin cortar palabras, con solapamiento', () => {
    const paragraph = 'one two three four five six seven'
    expect(chunkText(paragraph, 15, 5)).toEqual(['one two three', 'three four five', 'five six seven'])
  })

  it('usa los valores por defecto de maxChars/overlapChars cuando no se especifican', () => {
    const short = 'contenido breve sin necesidad de fragmentar'
    expect(chunkText(short)).toEqual([short])
  })

  it('nunca deja un chunk con solo espacios en blanco', () => {
    const text = `${'X'.repeat(10)}\n\n   \n\n${'Y'.repeat(10)}`
    const chunks = chunkText(text, 20)
    for (const chunk of chunks) {
      expect(chunk.trim().length).toBeGreaterThan(0)
    }
  })
})
