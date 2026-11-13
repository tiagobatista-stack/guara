import type { EntradaClassificarDemanda, SaidaClassificarDemanda } from './contrato.ts';

export function classificarDemanda(entrada: EntradaClassificarDemanda): SaidaClassificarDemanda {
  const texto = `${entrada.titulo} ${entrada.descricao}`.toLowerCase();

  if (/den[uú]ncia|desmate|infra[cç][aã]o/.test(texto)) {
    return { tipo: 'denuncia', setor: 'fiscalizacao', prioridade: 'alta', regraAplicada: 'R1-fiscalizacao', sugestao: true };
  }
  if (/licen[cç]a|renova/.test(texto)) {
    const tipo = /renova/.test(texto) ? 'renovacao-licenca' : /pr[eé]via/.test(texto) ? 'licenca-previa' : 'licenciamento-outros';
    return { tipo, setor: 'licenciamento', prioridade: 'media', regraAplicada: 'R2-licenciamento', sugestao: true };
  }
  if (/sistema|cadastro|acesso|geoportal/.test(texto)) {
    return { tipo: 'suporte-sistema', setor: 'tecnologia', prioridade: 'baixa', regraAplicada: 'R3-tecnologia', sugestao: true };
  }
  return { tipo: 'nao-classificada', setor: 'triagem-humana', prioridade: 'media', regraAplicada: 'R0-sem-regra', sugestao: true };
}
