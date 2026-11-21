import { describe, expect, it } from 'vitest';
import { validarConversa } from './conversa.ts';

describe('conversa gravada: botões das falas', () => {
  it('guarda ações válidas e descarta as inválidas', () => {
    const [m] = validarConversa([{
      autor: 'assistente', texto: 'Comandos', natureza: 'fato', fonte: 'x',
      acoes: [{ rotulo: 'Ver prazos', comando: 'prazos' }, { rotulo: '', comando: 'x' }, { rotulo: 'sem comando' }, 'lixo', null],
    }]);
    expect(m.acoes).toEqual([{ rotulo: 'Ver prazos', comando: 'prazos' }]);
  });

  it('sem nenhuma ação válida, a fala fica sem o campo', () => {
    const [m] = validarConversa([{ autor: 'assistente', texto: 'Oi', acoes: [{ rotulo: 1, comando: 2 }] }]);
    expect(m).toEqual({ autor: 'assistente', texto: 'Oi' });
  });
});
