// Backup do item 14: a agenda (guara:compromissos:v1) vai no JSON exportado, volta na importação
// e o "Desfazer última importação" restaura a agenda anterior. Sem isso, quem exporta e importa perde a agenda.

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ContextoArmazem, criarArmazem } from '../demandas/armazem.ts';
import type { Demanda } from '../demandas/modelo.ts';
import { CHAVE_BACKUP_COMPROMISSOS, CHAVE_COMPROMISSOS, criarCompromisso, obterCompromissos } from '../agenda/compromissos.ts';
import { exportarDados, validarImportacao } from './dados-portaveis.ts';
import { Alertas } from './Alertas.tsx';

const AGORA = new Date('2026-11-13T12:00:00.000Z');
const DEMANDA: Demanda = {
  id: 'velha', titulo: 'Demanda fictícia', descricao: '', responsavel: 'Equipe', prioridade: 'Alta',
  status: 'Em Andamento', criadaEm: '2026-11-01T00:00:00.000Z', ultimaAcaoRelevante: '2026-11-12T12:00:00.000Z',
};
const arquivo = (conteudo: string) => new File([conteudo], 'guara-dados.json', { type: 'application/json' });

function montar() {
  const armazem = criarArmazem(localStorage, { agora: () => AGORA, exemplos: () => [{ ...DEMANDA }] });
  render(<ContextoArmazem.Provider value={armazem}><Alertas agora={() => AGORA} /></ContextoArmazem.Provider>);
  return armazem;
}
const importar = async (conteudo: string, esperado: RegExp) => {
  vi.spyOn(window, 'confirm').mockReturnValueOnce(true);
  fireEvent.change(screen.getByLabelText('Arquivo JSON para importar'), { target: { files: [arquivo(conteudo)] } });
  await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent(esperado));
};

beforeEach(() => { localStorage.clear(); vi.restoreAllMocks(); });

describe('backup com compromissos', () => {
  it('o arquivo exportado leva a agenda, e a leitura devolve os mesmos compromissos', () => {
    criarCompromisso({ tipo: 'reunião', data: '2026-12-10', hora: '09:00', assunto: 'licenciamento', demanda: 'DEM-FIC-0003' }, AGORA.toISOString());
    criarCompromisso({ tipo: 'lembrete', data: '2026-12-11', assunto: 'ligar para o João' }, AGORA.toISOString());
    const texto = exportarDados([DEMANDA], 3, AGORA, undefined, undefined, null, obterCompromissos());
    expect(JSON.parse(texto).compromissos).toHaveLength(2);
    const lido = validarImportacao(texto);
    expect(lido.ok && lido.dados.compromissos).toEqual(obterCompromissos());
  });

  it('arquivo antigo (sem o campo) continua válido e não traz compromissos', () => {
    const lido = validarImportacao(exportarDados([DEMANDA], 3, AGORA));
    expect(lido.ok && lido.dados.compromissos).toBeUndefined();
  });

  it('compromisso inválido ou id repetido no arquivo recusa o arquivo inteiro', () => {
    const base = JSON.parse(exportarDados([DEMANDA], 3, AGORA));
    const bom = { id: 'c1', criadoEm: AGORA.toISOString(), tipo: 'reunião', data: '2026-12-10', assunto: 'x' };
    expect(validarImportacao(JSON.stringify({ ...base, compromissos: [bom, { ...bom, id: 'c2', data: '2026-02-31' }] }))).toMatchObject({ ok: false });
    expect(validarImportacao(JSON.stringify({ ...base, compromissos: [bom, bom] }))).toMatchObject({ ok: false });
    expect(validarImportacao(JSON.stringify({ ...base, compromissos: 'lixo' }))).toMatchObject({ ok: false });
  });

  it('ida e volta pela tela: exporta, "troca de navegador", importa e a agenda volta; desfazer restaura a anterior', async () => {
    // Navegador A: tem dois compromissos e exporta.
    criarCompromisso({ tipo: 'reunião', data: '2026-12-10', assunto: 'licenciamento' }, AGORA.toISOString());
    criarCompromisso({ tipo: 'curso', data: '2026-12-12', hora: '14:00', assunto: 'georreferenciamento' }, AGORA.toISOString());
    const baixar = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:x');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    montar();
    fireEvent.click(screen.getByRole('button', { name: /Exportar/ }));
    const exportado = await (baixar.mock.calls[0][0] as Blob).text();
    const dadosA = obterCompromissos();
    expect(JSON.parse(exportado).compromissos).toHaveLength(2);

    // Navegador B: agenda diferente (um compromisso próprio).
    document.body.innerHTML = '';
    localStorage.clear();
    criarCompromisso({ tipo: 'palestra', data: '2026-12-20', assunto: 'só do navegador B' }, AGORA.toISOString());
    const antesDeB = obterCompromissos();
    montar();

    await importar(exportado, /2 compromisso\(s\) importado\(s\)/);
    expect(obterCompromissos()).toEqual(dadosA);
    expect(localStorage.getItem(CHAVE_BACKUP_COMPROMISSOS)).not.toBeNull();

    vi.spyOn(window, 'confirm').mockReturnValueOnce(true);
    fireEvent.click(screen.getByRole('button', { name: 'Desfazer última importação' }));
    expect(screen.getByRole('status')).toHaveTextContent('Agenda anterior restaurada');
    expect(obterCompromissos()).toEqual(antesDeB);
    expect(localStorage.getItem(CHAVE_BACKUP_COMPROMISSOS)).toBeNull();
  });

  it('importar arquivo antigo não apaga a agenda e invalida um backup de agenda mais velho', async () => {
    criarCompromisso({ tipo: 'reunião', data: '2026-12-10', assunto: 'minha agenda' }, AGORA.toISOString());
    const minha = obterCompromissos();
    localStorage.setItem(CHAVE_BACKUP_COMPROMISSOS, JSON.stringify({ salvoEm: 'x', compromissos: [] }));
    montar();
    await importar(exportarDados([{ ...DEMANDA, id: 'nova1' }], 3, AGORA), /1 demanda importada/);
    expect(obterCompromissos()).toEqual(minha);
    expect(localStorage.getItem(CHAVE_BACKUP_COMPROMISSOS)).toBeNull();
    vi.spyOn(window, 'confirm').mockReturnValueOnce(true);
    fireEvent.click(screen.getByRole('button', { name: 'Desfazer última importação' }));
    expect(obterCompromissos()).toEqual(minha);
  });

  it('arquivo com lista vazia de compromissos limpa a agenda, e desfazer traz de volta', async () => {
    criarCompromisso({ tipo: 'reunião', data: '2026-12-10', assunto: 'minha agenda' }, AGORA.toISOString());
    const minha = obterCompromissos();
    montar();
    await importar(exportarDados([{ ...DEMANDA, id: 'nova1' }], 3, AGORA, undefined, undefined, null, []), /0 compromisso/);
    expect(obterCompromissos()).toEqual([]);
    vi.spyOn(window, 'confirm').mockReturnValueOnce(true);
    fireEvent.click(screen.getByRole('button', { name: 'Desfazer última importação' }));
    expect(obterCompromissos()).toEqual(minha);
  });

  it('a chave da agenda é a documentada', () => {
    expect(CHAVE_COMPROMISSOS).toBe('guara:compromissos:v1');
  });
});
