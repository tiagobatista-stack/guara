import type { CasoAutoteste } from '../../tipos.ts';
import type { EntradaClassificarDemanda, SaidaClassificarDemanda } from './contrato.ts';
import { demandasFicticias } from '../../../../../../dados-ficticios/demandas.ts';

const d = demandasFicticias[1];

export const autoteste: CasoAutoteste<EntradaClassificarDemanda, SaidaClassificarDemanda> = {
  descricao: 'Classifica a denúncia fictícia DEM-FIC-0002',
  entrada: { titulo: d.titulo, descricao: d.descricao },
  saidaEsperada: { tipo: 'denuncia', setor: 'fiscalizacao', prioridade: 'alta', regraAplicada: 'R1-fiscalizacao', sugestao: true },
};
