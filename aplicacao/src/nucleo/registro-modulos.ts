// Registro de módulos (seção 8.3): o núcleo conhece só o contrato público.
import type { NomeIcone } from '../compartilhado/Icone.tsx';

export interface ContratoModulo {
  id: string;
  versao: string;
  rotulo: string;
  icone: NomeIcone;
  /** Aparece na barra inferior do smartphone (4 ou 5 principais). */
  principal: boolean;
  ativo: boolean;
  implementado: boolean;
}

export const modulos: ContratoModulo[] = [
  { id: 'painel', versao: '0.2.0', rotulo: 'Dashboard', icone: 'painel', principal: true, ativo: true, implementado: true },
  { id: 'demandas', versao: '0.2.0', rotulo: 'Demandas', icone: 'demandas', principal: true, ativo: true, implementado: true },
  { id: 'kanban', versao: '0.1.0', rotulo: 'Kanban', icone: 'kanban', principal: true, ativo: true, implementado: true },
  { id: 'alertas', versao: '0.1.0', rotulo: 'Alertas', icone: 'sino', principal: false, ativo: true, implementado: true },
  { id: 'operacoes', versao: '0.1.0', rotulo: 'Operações', icone: 'local', principal: false, ativo: true, implementado: true },
  { id: 'documentos', versao: '0.0.0', rotulo: 'Documentos', icone: 'documentos', principal: false, ativo: true, implementado: false },
  { id: 'agenda', versao: '0.1.0', rotulo: 'Agenda', icone: 'agenda', principal: false, ativo: true, implementado: true },
  { id: 'conhecimento', versao: '0.0.0', rotulo: 'Conhecimento', icone: 'conhecimento', principal: false, ativo: true, implementado: false },
  { id: 'atalhos', versao: '0.2.0', rotulo: 'Atalhos e contatos', icone: 'link', principal: false, ativo: true, implementado: true },
  { id: 'configuracoes', versao: '0.1.0', rotulo: 'Configurações', icone: 'configuracoes', principal: false, ativo: true, implementado: true },
  { id: 'saude-do-sistema', versao: '0.1.0', rotulo: 'Saúde do sistema', icone: 'saude', principal: true, ativo: true, implementado: true },
];

export function moduloDaRota(hash: string): string {
  const id = hash.replace(/^#\/?/, '');
  return modulos.some((m) => m.id === id && m.ativo) ? id : 'painel';
}
