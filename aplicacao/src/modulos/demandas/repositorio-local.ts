// Persistência em localStorage (um navegador, uma origem; não é multiusuário).
// Armazenamento corrompido nunca é apagado nem sobrescrito em silêncio.

import { CHAVE_DEMANDAS, type Demanda } from './modelo.ts';
import { ehDemandaValida } from './regras.ts';

export type Carga =
  | { tipo: 'vazio' }
  | { tipo: 'ok'; demandas: Demanda[] }
  | { tipo: 'corrompido'; motivo: string; bruto: string };

interface EnvelopeArmazenado {
  versao: 1;
  demandas: Demanda[];
}

export class RepositorioLocal {
  private readonly armazenamento: Storage;
  private readonly chave: string;

  constructor(armazenamento: Storage, chave = CHAVE_DEMANDAS) {
    this.armazenamento = armazenamento;
    this.chave = chave;
  }

  carregar(): Carga {
    const bruto = this.armazenamento.getItem(this.chave);
    if (bruto === null) return { tipo: 'vazio' };
    let dados: unknown;
    try {
      dados = JSON.parse(bruto);
    } catch {
      return { tipo: 'corrompido', motivo: 'conteúdo não é JSON válido', bruto };
    }
    const env = dados as Partial<EnvelopeArmazenado>;
    if (typeof dados !== 'object' || dados === null || env.versao !== 1 || !Array.isArray(env.demandas)) {
      return { tipo: 'corrompido', motivo: 'formato desconhecido', bruto };
    }
    const invalida = env.demandas.findIndex((d) => !ehDemandaValida(d));
    if (invalida >= 0) return { tipo: 'corrompido', motivo: `demanda inválida na posição ${invalida + 1}`, bruto };
    const ids = new Set(env.demandas.map((d) => d.id));
    if (ids.size !== env.demandas.length) return { tipo: 'corrompido', motivo: 'IDs duplicados', bruto };
    return { tipo: 'ok', demandas: env.demandas };
  }

  /** Grava a lista inteira. Lança erro se o navegador recusar (cota, modo privado). */
  salvar(demandas: readonly Demanda[]): void {
    const env: EnvelopeArmazenado = { versao: 1, demandas: [...demandas] };
    this.armazenamento.setItem(this.chave, JSON.stringify(env));
  }
}
