// Tela Alertas (P06; cenário 10): demanda com última ação há 5 dias e limiar 3
// gera alerta; uma ação relevante (mudança de status) remove o alerta.
// Importação inválida e cancelada não alteram os dados.

import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { CHAVE_BACKUP, ContextoArmazem, criarArmazem, criarArmazenamentoEmMemoria } from '../demandas/armazem.ts';
import { CHAVE_DEMANDAS, type Demanda } from '../demandas/modelo.ts';
import { exportarDados } from './dados-portaveis.ts';
import { Alertas } from './Alertas.tsx';

const AGORA = new Date('2026-11-13T12:00:00.000Z');
const ANTIGA: Demanda = {
  id: 'velha', titulo: 'Demanda parada (fictícia)', descricao: '', responsavel: 'Equipe', prioridade: 'Alta',
  status: 'Em Andamento', criadaEm: '2026-11-01T00:00:00.000Z', ultimaAcaoRelevante: '2026-11-08T12:00:00.000Z',
};

function montar(armazenamento: Storage = localStorage) {
  const armazem = criarArmazem(armazenamento, { agora: () => AGORA, exemplos: () => [{ ...ANTIGA }] });
  render(
    <ContextoArmazem.Provider value={armazem}>
      <Alertas agora={() => AGORA} />
    </ContextoArmazem.Provider>,
  );
  return armazem;
}

const arquivo = (conteudo: string) => new File([conteudo], 'guara-dados.json', { type: 'application/json' });

beforeEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});

describe('tela Alertas', () => {
  it('alerta aparece com 5 dias e limiar 3, e some após ação relevante', () => {
    const armazem = montar();
    expect(screen.getByTestId('inativa-velha')).toHaveTextContent('há 5 dia(s)');
    act(() => { armazem.mudarStatus('velha', 'Em Validação'); });
    expect(screen.queryByTestId('inativa-velha')).toBeNull();
    expect(screen.getByText(/Nenhuma demanda inativa/)).toBeInTheDocument();
  });

  it('limiar maior remove o alerta e fica gravado', () => {
    const armazem = montar();
    fireEvent.change(screen.getByLabelText(/quantos dias corridos/), { target: { value: '7' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar limiar' }));
    expect(screen.getByRole('status')).toHaveTextContent('7 dia(s)');
    expect(screen.queryByTestId('inativa-velha')).toBeNull();
    expect(armazem.obter().diasInatividade).toBe(7);
  });

  it('importação inválida é recusada sem alterar dados', async () => {
    const armazem = montar();
    fireEvent.change(screen.getByLabelText('Arquivo JSON para importar'), { target: { files: [arquivo('{ruim')] } });
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Importação recusada'));
    expect(armazem.obter().demandas.map((d) => d.id)).toEqual(['velha']);
  });

  it('importação válida pede confirmação; cancelar não altera, confirmar substitui com backup', async () => {
    const armazem = montar();
    const novo = exportarDados([{ ...ANTIGA, id: 'nova1' }, { ...ANTIGA, id: 'nova2' }], 3, AGORA);

    vi.spyOn(window, 'confirm').mockReturnValueOnce(false);
    fireEvent.change(screen.getByLabelText('Arquivo JSON para importar'), { target: { files: [arquivo(novo)] } });
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Importação cancelada'));
    expect(armazem.obter().demandas.map((d) => d.id)).toEqual(['velha']);

    vi.spyOn(window, 'confirm').mockReturnValueOnce(true);
    fireEvent.change(screen.getByLabelText('Arquivo JSON para importar'), { target: { files: [arquivo(novo)] } });
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Importadas 2'));
    expect(armazem.obter().demandas.map((d) => d.id)).toEqual(['nova1', 'nova2']);
    expect(screen.getByRole('button', { name: 'Desfazer última importação' })).toBeEnabled();
  });

  it('desfazer importação volta o campo de limiar ao valor restaurado', async () => {
    const armazem = montar();
    const novo = exportarDados([{ ...ANTIGA, id: 'nova1' }], 10, AGORA);

    vi.spyOn(window, 'confirm').mockReturnValueOnce(true);
    fireEvent.change(screen.getByLabelText('Arquivo JSON para importar'), { target: { files: [arquivo(novo)] } });
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Importadas 1'));
    expect(screen.getByLabelText(/quantos dias corridos/)).toHaveValue(10);

    vi.spyOn(window, 'confirm').mockReturnValueOnce(true);
    fireEvent.click(screen.getByRole('button', { name: 'Desfazer última importação' }));
    expect(screen.getByRole('status')).toHaveTextContent('restaurados');
    expect(armazem.obter().diasInatividade).toBe(3);
    expect(screen.getByLabelText(/quantos dias corridos/)).toHaveValue(3);
  });

  it('desfazer com falha e reversão parcial: o campo de limiar acompanha o estado', async () => {
    // Depois de ativado, falham a N-ésima escrita (setItem ou removeItem) e todas as seguintes.
    const base = criarArmazenamentoEmMemoria();
    const ctrl = { falharDesde: null as number | null, escritas: 0 };
    const escrever = (f: () => void) => {
      if (ctrl.falharDesde !== null && ++ctrl.escritas >= ctrl.falharDesde) throw new Error('QuotaExceededError simulado');
      f();
    };
    const armazenamento: Storage = {
      get length() { return base.length; },
      clear: () => base.clear(),
      key: (i: number) => base.key(i),
      getItem: (k: string) => base.getItem(k),
      removeItem: (k: string) => escrever(() => base.removeItem(k)),
      setItem: (k: string, v: string) => escrever(() => base.setItem(k, v)),
    };
    const armazem = montar(armazenamento);
    const novo = exportarDados([{ ...ANTIGA, id: 'nova1' }], 10, AGORA);

    vi.spyOn(window, 'confirm').mockReturnValueOnce(true);
    fireEvent.change(screen.getByLabelText('Arquivo JSON para importar'), { target: { files: [arquivo(novo)] } });
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Importadas 1'));
    expect(screen.getByLabelText(/quantos dias corridos/)).toHaveValue(10);

    // Desfazer: demandas e limiar gravam; a remoção do backup e toda a reversão falham.
    ctrl.falharDesde = 3;
    vi.spyOn(window, 'confirm').mockReturnValueOnce(true);
    fireEvent.click(screen.getByRole('button', { name: 'Desfazer última importação' }));
    expect(screen.getByRole('alert')).toHaveTextContent('recusou a gravação');
    expect(armazem.obter().diasInatividade).toBe(3);
    expect(screen.getByLabelText(/quantos dias corridos/)).toHaveValue(armazem.obter().diasInatividade);
  });
  describe('ressalvas C e D: importação sobre armazenamento corrompido', () => {
    const novo = () => exportarDados([{ ...ANTIGA, id: 'nova1' }], 3, AGORA);
    const importarArquivo = () =>
      fireEvent.change(screen.getByLabelText('Arquivo JSON para importar'), { target: { files: [arquivo(novo())] } });

    it('D: com armazenamento normal, a confirmação promete o desfazer', async () => {
      montar();
      const confirmar = vi.spyOn(window, 'confirm').mockReturnValueOnce(false);
      importarArquivo();
      await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Importação cancelada'));
      expect(confirmar.mock.calls[0][0]).toContain('será gravado antes e poderá ser restaurado');
    });

    it('D: com armazenamento corrompido, a confirmação não promete restaurar e sugere baixar antes', async () => {
      localStorage.setItem(CHAVE_DEMANDAS, '{corrompido');
      montar();
      const confirmar = vi.spyOn(window, 'confirm').mockReturnValueOnce(false);
      importarArquivo();
      await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Importação cancelada'));
      const texto = confirmar.mock.calls[0][0] as string;
      expect(texto).not.toContain('será gravado antes e poderá ser restaurado');
      expect(texto).toContain('corrompido');
      expect(texto).toContain('NÃO poderá ser restaurado');
      expect(texto).toContain('Baixar conteúdo bruto');
      expect(localStorage.getItem(CHAVE_DEMANDAS)).toBe('{corrompido');
    });

    it('C: depois de importar, o conteúdo corrompido pode ser baixado e o desfazer fica desabilitado', async () => {
      localStorage.setItem(CHAVE_DEMANDAS, '{corrompido');
      montar();
      vi.spyOn(window, 'confirm').mockReturnValueOnce(true);
      importarArquivo();
      await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Importadas 1'));

      expect(screen.getByRole('button', { name: 'Desfazer última importação' })).toBeDisabled();
      const baixarBackup = screen.queryByRole('button', { name: 'Baixar conteúdo do backup' });
      expect(baixarBackup).not.toBeNull();
      expect(screen.getByText(/backup contém demandas ilegíveis/)).toBeInTheDocument();

      // Download: captura o Blob entregue ao navegador.
      const blobs: Blob[] = [];
      const criarUrl = vi.fn((b: Blob) => { blobs.push(b); return 'blob:teste'; });
      const urlOriginal = { criar: URL.createObjectURL, revogar: URL.revokeObjectURL };
      URL.createObjectURL = criarUrl as unknown as typeof URL.createObjectURL;
      URL.revokeObjectURL = vi.fn();
      const clicar = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
      try {
        fireEvent.click(baixarBackup!);
      } finally {
        URL.createObjectURL = urlOriginal.criar;
        URL.revokeObjectURL = urlOriginal.revogar;
      }
      expect(clicar).toHaveBeenCalledTimes(1);
      expect(blobs).toHaveLength(1);
      expect(await blobs[0].text()).toBe('{corrompido');
    });

    it('C: nova importação com backup ilegível avisa que ele será sobrescrito; cancelar mantém o backup', async () => {
      localStorage.setItem(CHAVE_DEMANDAS, '{corrompido');
      montar();
      vi.spyOn(window, 'confirm').mockReturnValueOnce(true);
      importarArquivo();
      await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Importadas 1'));
      const backup = localStorage.getItem(CHAVE_BACKUP);

      const confirmar = vi.spyOn(window, 'confirm').mockReturnValueOnce(false);
      importarArquivo();
      await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Importação cancelada'));
      const texto = confirmar.mock.calls.at(-1)?.[0] as string;
      expect(texto).toContain('SOBRESCREVER');
      expect(texto).toContain('Baixar conteúdo do backup');
      expect(localStorage.getItem(CHAVE_BACKUP)).toBe(backup);
    });
  });
});
