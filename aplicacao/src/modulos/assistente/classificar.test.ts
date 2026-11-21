import { describe, expect, it } from 'vitest';
import { classificar } from './classificar.ts';
import { normalizar } from './normalizar.ts';
import { INTENCOES } from './frases.ts';

describe('normalizar', () => {
  it.each([
    ['NÃO!', 'nao'],
    ['naoo', 'nao'],
    ['  Prazos?? ', 'prazos'],
    ['O que você faz?', 'o que voce faz'],
    ['oq vc faz', 'o que voce faz'],
    ['o que tá vencido', 'o que esta vencido'],
    ['processo FIC-0001', 'proceso fic 0001'],
    ['', ''],
  ])('"%s" → "%s"', (entrada, esperado) => {
    expect(normalizar(entrada)).toBe(esperado);
  });
});

describe('classificar: frase → comando', () => {
  it.each([
    // comandos de antes continuam iguais
    ['prazos', 'prazos'],
    ['demanda', 'demanda'],
    ['esta demanda', 'demanda'],
    ['ajuda', 'ajuda'],
    // maiúsculas, acentos, pontuação e letras repetidas
    ['PRAZOS!', 'prazos'],
    ['prazos?', 'prazos'],
    ['prazoss', 'prazos'],
    ['Ajudaaa', 'ajuda'],
    // sinônimos e frases comuns
    ['o que tá vencido?', 'prazos'],
    ['quais estão atrasadas', 'prazos'],
    ['tem algo parado?', 'prazos'],
    ['o que faço primeiro?', 'prioridades'],
    ['por onde começo', 'prioridades'],
    ['prioridades do dia', 'prioridades'],
    ['fila do dia', 'prioridades'],
    ['o que é mais urgente', 'prioridades'],
    ['fala dessa demanda', 'demanda'],
    ['me ajuda', 'ajuda'],
    ['preciso de ajuda', 'ajuda'],
    ['o que você faz?', 'ajuda'],
    ['oq vc faz', 'ajuda'],
    ['comandos', 'ajuda'],
    ['help', 'ajuda'],
    ['?', 'ajuda'],
    // gatilho mais longo vence: "me ajuda" (2 palavras) ganha de "demanda" (1)
    ['me ajuda com a demanda', 'ajuda'],
  ])('"%s" → %s', (frase, esperado) => {
    expect(classificar(frase)?.id).toBe(esperado);
  });

  it.each(['', '   ', 'bloqueio', 'demandas123x', 'reprazos'])('"%s" não é reconhecido (palavra inteira, não pedaço)', (frase) => {
    expect(classificar(frase)).toBeNull();
  });

  it.each(['oi', 'olá', 'ola', 'Olá!', 'OLAAA', 'bom dia', 'Bom dia!', 'boa tarde', 'boa noite', 'e aí', 'e ai?', 'eai'])('"%s" é cumprimento', (frase) => {
    expect(classificar(frase)?.id).toBe('cumprimento');
  });

  it.each([
    ['bom dia, prioridades', 'prioridades'],
    ['oi, o que tá vencido?', 'prazos'],
    ['boa tarde me ajuda', 'ajuda'],
    ['ola fala dessa demanda', 'demanda'],
  ])('comando vence cumprimento, mesmo com o gatilho do cumprimento maior: "%s" → %s', (frase, esperado) => {
    expect(classificar(frase)?.id).toBe(esperado);
  });

  it('cumprimento não é comando: não está na tabela da ajuda', () => {
    expect(INTENCOES.some((i) => i.id === 'cumprimento')).toBe(false);
  });

  it('todo comando da tabela é reconhecido pelo próprio nome, pelo exemplo da ajuda e por todos os gatilhos', () => {
    for (const intencao of INTENCOES) {
      expect(classificar(intencao.comando)?.id).toBe(intencao.id);
      expect(classificar(intencao.exemplo)?.id).toBe(intencao.id);
      for (const g of intencao.gatilhos) expect(classificar(g)?.id, g).toBe(intencao.id);
    }
  });

  it.each(['buscar licença', 'procurar vistoria', 'procura embargo', 'achar contrato', 'cadê o parecer?'])('"%s" é uma busca', (frase) => {
    expect(classificar(frase)?.id).toBe('buscar');
  });

  it('frase que começa por buscar é busca mesmo com outro gatilho no termo ("buscar parada", "buscar prazos")', () => {
    expect(classificar('buscar parada')?.id).toBe('buscar');
    expect(classificar('buscar prazos')?.id).toBe('buscar');
    expect(classificar('prazos')?.id).toBe('prazos');
  });
});
