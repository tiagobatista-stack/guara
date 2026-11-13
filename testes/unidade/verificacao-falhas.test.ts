// Prova que a verificação consegue FALHAR: uma habilidade quebrada não pode
// aparecer como OK (seção 9.7, "nada é aprovado por suposição").

import { agentes, habilidades, type HabilidadeRegistrada } from '../../backend/supabase/functions/_compartilhado/catalogo.ts';
import { executarAutoteste, executarVerificacao } from '../../backend/supabase/functions/_compartilhado/verificacao-saude.ts';

const original = habilidades.find((h) => h.contrato.id === 'classificar-demanda')!;

describe('detecção de falhas', () => {
  it('saída divergente do esperado resulta em FALHA', () => {
    const quebrada: HabilidadeRegistrada = {
      ...original,
      executar: () => ({ tipo: 'denuncia', setor: 'fiscalizacao', prioridade: 'baixa', regraAplicada: 'R1-fiscalizacao', sugestao: true }),
    };
    const r = executarAutoteste(quebrada);
    expect(r.estado).toBe('FALHA');
    expect(r.detalhe).toContain('prioridade');
  });

  it('saída fora do esquema resulta em FALHA', () => {
    const quebrada: HabilidadeRegistrada = { ...original, executar: () => ({ tipo: 1 }) };
    expect(executarAutoteste(quebrada).estado).toBe('FALHA');
  });

  it('exceção na habilidade resulta em FALHA', () => {
    const quebrada: HabilidadeRegistrada = {
      ...original,
      executar: () => {
        throw new Error('falha simulada');
      },
    };
    const r = executarAutoteste(quebrada);
    expect(r.estado).toBe('FALHA');
    expect(r.detalhe).toContain('falha simulada');
  });

  it('agente com habilidade quebrada fica em FALHA', () => {
    const catalogo = habilidades.map((h) =>
      h.contrato.id === 'classificar-demanda' ? { ...h, executar: () => ({}) } : h,
    );
    const rel = executarVerificacao(catalogo, agentes);
    expect(rel.agentes.triagem.estado).toBe('FALHA');
    expect(rel.agentes.documental.estado).toBe('OK');
    expect(rel.resumo.falha).toBe(1);
  });

  it('habilidade desativada fica em ATENÇÃO e não é dada como OK', () => {
    const rel = executarVerificacao(habilidades, agentes, 'local', new Set(['avaliar-prazos']));
    expect(rel.habilidades['avaliar-prazos'].estado).toBe('ATENÇÃO');
    expect(rel.habilidades['avaliar-prazos'].executadoEm).toBeNull();
    expect(rel.agentes.prazos.estado).toBe('ATENÇÃO');
  });

  it('composição inconsistente (habilidade de outro agente) resulta em FALHA', () => {
    const intruso = { ...agentes[0], id: 'intruso', habilidades: ['redigir-minuta'] };
    const rel = executarVerificacao(habilidades, [...agentes, intruso]);
    expect(rel.agentes.intruso.estado).toBe('FALHA');
  });
});
