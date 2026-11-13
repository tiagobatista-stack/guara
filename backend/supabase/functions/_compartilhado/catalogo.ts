// Catálogo único de agentes, habilidades e ferramentas (seções 9.2, 9.3 e 9.5).
// É o mesmo catálogo lido pela tela Saúde do sistema, pelos testes e pela função `saude`.

import type { ContratoAgente, Habilidade } from './tipos.ts';

import { agente as triagem } from './agentes/triagem/agente.ts';
import { agente as documental } from './agentes/documental/agente.ts';
import { agente as analista } from './agentes/analista/agente.ts';
import { agente as prazos } from './agentes/prazos/agente.ts';
import { agente as redator } from './agentes/redator/agente.ts';
import { agente as revisor } from './agentes/revisor/agente.ts';

import { contrato as cRegistrar } from './habilidades/registrar-demanda/contrato.ts';
import { registrarDemanda } from './habilidades/registrar-demanda/implementacao.ts';
import { autoteste as tRegistrar } from './habilidades/registrar-demanda/autoteste.ts';
import { contrato as cClassificar } from './habilidades/classificar-demanda/contrato.ts';
import { classificarDemanda } from './habilidades/classificar-demanda/implementacao.ts';
import { autoteste as tClassificar } from './habilidades/classificar-demanda/autoteste.ts';
import { contrato as cExtrair } from './habilidades/extrair-documento/contrato.ts';
import { extrairDocumento } from './habilidades/extrair-documento/implementacao.ts';
import { autoteste as tExtrair } from './habilidades/extrair-documento/autoteste.ts';
import { contrato as cMontar } from './habilidades/montar-checklist/contrato.ts';
import { montarChecklist } from './habilidades/montar-checklist/implementacao.ts';
import { autoteste as tMontar } from './habilidades/montar-checklist/autoteste.ts';
import { contrato as cConferir } from './habilidades/conferir-requisitos/contrato.ts';
import { conferirRequisitos } from './habilidades/conferir-requisitos/implementacao.ts';
import { autoteste as tConferir } from './habilidades/conferir-requisitos/autoteste.ts';
import { contrato as cPrazos } from './habilidades/avaliar-prazos/contrato.ts';
import { avaliarPrazos } from './habilidades/avaliar-prazos/implementacao.ts';
import { autoteste as tPrazos } from './habilidades/avaliar-prazos/autoteste.ts';
import { contrato as cMinuta } from './habilidades/redigir-minuta/contrato.ts';
import { redigirMinuta } from './habilidades/redigir-minuta/implementacao.ts';
import { autoteste as tMinuta } from './habilidades/redigir-minuta/autoteste.ts';
import { contrato as cEvidencias } from './habilidades/validar-evidencias/contrato.ts';
import { validarEvidencias } from './habilidades/validar-evidencias/implementacao.ts';
import { autoteste as tEvidencias } from './habilidades/validar-evidencias/autoteste.ts';
import { contrato as cRelatorio } from './habilidades/relatorio-executivo/contrato.ts';
import { relatorioExecutivo } from './habilidades/relatorio-executivo/implementacao.ts';
import { autoteste as tRelatorio } from './habilidades/relatorio-executivo/autoteste.ts';
import { contrato as cPds } from './habilidades/validar-pds/contrato.ts';
import { validarPds } from './habilidades/validar-pds/implementacao.ts';
import { autoteste as tPds } from './habilidades/validar-pds/autoteste.ts';

// deno-lint-ignore no-explicit-any
export type HabilidadeRegistrada = Habilidade<any, any>;

export const agentes: readonly ContratoAgente[] = [triagem, documental, analista, prazos, redator, revisor];

export const habilidades: readonly HabilidadeRegistrada[] = [
  { contrato: cRegistrar, executar: registrarDemanda, autoteste: tRegistrar },
  { contrato: cClassificar, executar: classificarDemanda, autoteste: tClassificar },
  { contrato: cExtrair, executar: extrairDocumento, autoteste: tExtrair },
  { contrato: cMontar, executar: (e) => montarChecklist(e), autoteste: tMontar },
  { contrato: cConferir, executar: conferirRequisitos, autoteste: tConferir },
  { contrato: cPrazos, executar: avaliarPrazos, autoteste: tPrazos },
  { contrato: cMinuta, executar: redigirMinuta, autoteste: tMinuta },
  { contrato: cEvidencias, executar: validarEvidencias, autoteste: tEvidencias },
  { contrato: cRelatorio, executar: relatorioExecutivo, autoteste: tRelatorio },
  { contrato: cPds, executar: validarPds, autoteste: tPds },
];

export function buscarHabilidade(id: string): HabilidadeRegistrada | undefined {
  return habilidades.find((h) => h.contrato.id === id);
}

export function buscarAgente(id: string): ContratoAgente | undefined {
  return agentes.find((a) => a.id === id);
}
