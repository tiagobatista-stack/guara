import type { CasoAutoteste } from '../../tipos.ts';
import type { EntradaMontarChecklist, ItemChecklist, SaidaMontarChecklist } from './contrato.ts';

export const itensRenovacaoEsperados: ItemChecklist[] = [
  { id: 'RL-01', descricao: 'Número do processo identificado', campoEvidencia: 'processo' },
  { id: 'RL-02', descricao: 'Interessado identificado', campoEvidencia: 'interessado' },
  { id: 'RL-03', descricao: 'Validade da licença anterior informada', campoEvidencia: 'validadeLicencaAnterior' },
  { id: 'RL-04', descricao: 'Responsável técnico indicado', campoEvidencia: 'responsavelTecnico' },
  { id: 'RL-05', descricao: 'Outorga de uso da água apresentada', campoEvidencia: 'outorgaAgua' },
  { id: 'RL-06', descricao: 'Vistoria de campo realizada', campoEvidencia: null },
];

export const autoteste: CasoAutoteste<EntradaMontarChecklist, SaidaMontarChecklist> = {
  descricao: 'Monta o checklist do tipo fictício renovacao-licenca',
  entrada: { tipo: 'renovacao-licenca' },
  saidaEsperada: { tipo: 'renovacao-licenca', configurado: true, itens: itensRenovacaoEsperados },
};
