import { describe, expect, it } from 'vitest';
import { respostaDeAjuda, respostaDeCumprimento } from './ajuda.ts';
import { INTENCOES, type Intencao } from './frases.ts';

const TODOS = INTENCOES.map((i) => i.comando);

describe('resposta do cumprimento', () => {
  it('é fato do sistema, diz o que sabe fazer e traz os atalhos', () => {
    const r = respostaDeCumprimento();
    expect(r).toMatchObject({ natureza: 'fato', fonte: 'sistema' });
    expect(r.texto).toMatch(/^Olá!/);
    expect(r.acoes?.map((a) => a.comando)).toEqual(['prioridades', 'prazos', 'ajuda']);
  });
});

describe('resposta da ajuda', () => {
  it('lista todos os comandos da tabela, um por linha, com descrição e exemplo', () => {
    const r = respostaDeAjuda(TODOS);
    const linhas = r.texto.split('\n');
    expect(linhas[0]).toBe('Comandos disponíveis: "prazos", "prioridades", "demanda", "lembrar", "prorrogar", "buscar", "operações" e "ajuda".');
    expect(linhas).toContain('• prazos — lista as demandas vencidas, com prazo próximo e paradas (ou "o que tá vencido?")');
    expect(linhas).toHaveLength(INTENCOES.length + 2);
    expect(r.natureza).toBe('fato');
  });

  it('sem botões quando todos os comandos já estão nos atalhos', () => {
    const r = respostaDeAjuda(TODOS);
    expect(r.acoes).toBeUndefined();
    expect(r.texto).toContain('Os atalhos abaixo enviam esses comandos.');
  });

  it('comando fora dos atalhos ganha botão, e só ele', () => {
    const extra: Intencao = { id: 'ajuda', comando: 'agenda', rotulo: 'Ver agenda', descricao: 'mostra a agenda', exemplo: 'o que tenho hoje?', gatilhos: ['agenda'] };
    const r = respostaDeAjuda(TODOS, [...INTENCOES, extra]);
    expect(r.acoes).toEqual([{ rotulo: 'Ver agenda', comando: 'agenda' }]);
    expect(r.texto).toContain('Toque num comando abaixo para usá-lo.');
  });
});
