// FICTÍCIO — dados sintéticos para desenvolvimento e autotestes.
// Números de processo com prefixo FIC- para não coincidir com registros reais.

export const DATA_REFERENCIA = '2026-11-13';

export interface DemandaFicticia {
  ficticio: true;
  id: string;
  processo: string;
  titulo: string;
  descricao: string;
  tipo: string;
  setor: string;
  prioridade: 'alta' | 'media' | 'baixa';
  situacao: 'aberta' | 'em-analise' | 'aguardando-revisao' | 'concluida';
  prazo: string;
  ultimaMovimentacao: string;
  documentos: string[];
}

export const demandasFicticias: DemandaFicticia[] = [
  {
    ficticio: true,
    id: 'DEM-FIC-0001',
    processo: 'FIC-2026-0001',
    titulo: 'Renovação de licença de operação — Piscicultura Rio Claro (FICTÍCIA)',
    descricao: 'Pedido de renovação de licença de operação para tanques escavados.',
    tipo: 'renovacao-licenca',
    setor: 'licenciamento',
    prioridade: 'alta',
    situacao: 'em-analise',
    prazo: '2026-11-18',
    ultimaMovimentacao: '2026-11-12',
    documentos: ['DOC-FIC-0001'],
  },
  {
    ficticio: true,
    id: 'DEM-FIC-0002',
    processo: 'FIC-2026-0002',
    titulo: 'Denúncia de desmate em área de reserva (FICTÍCIA)',
    descricao: 'Comunicação de possível supressão de vegetação sem autorização.',
    tipo: 'denuncia',
    setor: 'fiscalizacao',
    prioridade: 'alta',
    situacao: 'aberta',
    prazo: '2026-11-14',
    ultimaMovimentacao: '2026-11-01',
    documentos: [],
  },
  {
    ficticio: true,
    id: 'DEM-FIC-0003',
    processo: 'FIC-2026-0003',
    titulo: 'Atualização do cadastro de usuários do geoportal (FICTÍCIA)',
    descricao: 'Solicitação de ajuste de perfis de acesso no sistema interno.',
    tipo: 'suporte-sistema',
    setor: 'tecnologia',
    prioridade: 'baixa',
    situacao: 'aguardando-revisao',
    prazo: '2026-12-05',
    ultimaMovimentacao: '2026-11-03',
    documentos: [],
  },
  {
    ficticio: true,
    id: 'DEM-FIC-0004',
    processo: 'FIC-2026-0004',
    titulo: 'Licença prévia — Loteamento Vale Verde (FICTÍCIA)',
    descricao: 'Pedido de licença prévia para parcelamento do solo.',
    tipo: 'licenca-previa',
    setor: 'licenciamento',
    prioridade: 'media',
    situacao: 'concluida',
    prazo: '2026-11-10',
    ultimaMovimentacao: '2026-10-20',
    documentos: [],
  },
];
