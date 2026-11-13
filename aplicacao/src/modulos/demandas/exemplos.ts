// Exemplos FICTÍCIOS do app, derivados da mesma fonte usada pelos autotestes
// (dados-ficticios/demandas.ts), para não haver dois conjuntos divergentes.

import { demandasFicticias } from '@dados/demandas.ts';
import type { Demanda, Prioridade, Status } from './modelo.ts';

const STATUS_DE: Record<string, Status> = {
  aberta: 'A Fazer',
  'em-analise': 'Em Andamento',
  'aguardando-revisao': 'Em Validação',
  concluida: 'Concluída',
};
const PRIORIDADE_DE: Record<string, Prioridade> = { alta: 'Alta', media: 'Média', baixa: 'Baixa' };
const EQUIPE_DE: Record<string, string> = {
  licenciamento: 'Equipe Licenciamento (fictícia)',
  fiscalizacao: 'Equipe Fiscalização (fictícia)',
  tecnologia: 'Equipe Tecnologia (fictícia)',
};

export function demandasExemplo(): Demanda[] {
  return demandasFicticias.map((d) => ({
    id: d.id,
    titulo: d.titulo,
    descricao: `${d.descricao} Processo ${d.processo}.`,
    responsavel: EQUIPE_DE[d.setor] ?? 'Equipe (fictícia)',
    prioridade: PRIORIDADE_DE[d.prioridade],
    status: STATUS_DE[d.situacao],
    criadaEm: `${d.ultimaMovimentacao}T09:00:00.000Z`,
    prazo: d.prazo,
    ultimaAcaoRelevante: `${d.ultimaMovimentacao}T12:00:00.000Z`,
  }));
}
