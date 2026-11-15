// Tela Operações: criar, importar CSV com prévia, encaixar equipe e data, local já visitado, criar e ligar demanda.

import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { ContextoArmazem, criarArmazem } from '../demandas/armazem.ts';
import { Operacoes } from './Operacoes.tsx';
import { criarOperacao, incluirPontos, obterOperacoes } from './armazem.ts';
import { Painel } from '../painel/Painel.tsx';

function montar() {
  let n = 0;
  const armazem = criarArmazem(localStorage, { gerarId: () => `id-${++n}`, exemplos: () => [] });
  render(
    <ContextoArmazem.Provider value={armazem}>
      <Operacoes />
    </ContextoArmazem.Provider>,
  );
  return armazem;
}

const CSV = [
  'N_PONTO;EQUIPE;COORD_X;COORD_Y;MUNICIPIO;DAT_SAIDA;DAT_RETOR;NOT_PLANEJ',
  '1;Equipe A;58.5 W;11.5 S;Município Fictício;2026-09-18;2026-09-22;Hot spot',
  '2;;58.5003 W;11.5 S;Município Fictício;;;Mesmo local, quase',
  '3;Equipe B;58.4 W;11.4 S;Outro;2026-09-22;2026-09-18;Datas invertidas',
].join('\n');

function criarEAbrir() {
  fireEvent.change(screen.getByLabelText('Nome *'), { target: { value: 'Operação fictícia' } });
  fireEvent.change(screen.getByLabelText('Início (opcional)'), { target: { value: '2026-09-18' } });
  fireEvent.change(screen.getByLabelText('Fim (opcional)'), { target: { value: '2026-09-25' } });
  fireEvent.click(screen.getByRole('button', { name: 'Criar operação' }));
}

beforeEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});

describe('tela Operações', () => {
  it('exige o nome ao criar e abre a operação criada', () => {
    montar();
    fireEvent.click(screen.getByRole('button', { name: 'Criar operação' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Informe o nome da operação.');
    criarEAbrir();
    expect(screen.getByRole('heading', { level: 2, name: 'Operação fictícia' })).toBeInTheDocument();
    expect(screen.getByTestId('resumo-operacao')).toHaveTextContent('0 ponto(s)');
  });

  it('importa o CSV com prévia: mostra a linha com problema e só grava as válidas', () => {
    montar();
    criarEAbrir();
    fireEvent.change(screen.getByLabelText('Ou cole o conteúdo'), { target: { value: CSV } });
    fireEvent.click(screen.getByRole('button', { name: 'Conferir' }));
    const previa = screen.getByTestId('previa-importacao');
    expect(previa).toHaveTextContent('2 ponto(s) pronto(s) para importar');
    expect(previa).toHaveTextContent('Linha 4: O retorno é anterior à saída.');
    expect(obterOperacoes()[0].pontos).toHaveLength(0); // nada gravado antes de confirmar
    fireEvent.click(screen.getByRole('button', { name: 'Importar 2 ponto(s)' }));
    expect(screen.getByTestId('mensagem-importacao')).toHaveTextContent('2 ponto(s) importado(s).');
    expect(obterOperacoes()[0].pontos).toHaveLength(2);
    expect(screen.getByTestId('resumo-operacao')).toHaveTextContent('1 sem equipe');
    expect(screen.getByTestId('resumo-operacao')).toHaveTextContent('1 sem data');
  });

  it('avisa que o local já aparece em outro ponto e deixa encaixar equipe e data', () => {
    montar();
    criarEAbrir();
    fireEvent.change(screen.getByLabelText('Ou cole o conteúdo'), { target: { value: CSV } });
    fireEvent.click(screen.getByRole('button', { name: 'Conferir' }));
    fireEvent.click(screen.getByRole('button', { name: 'Importar 2 ponto(s)' }));
    const [p1, p2] = obterOperacoes()[0].pontos;
    expect(screen.getByTestId(`proximos-${p2.id}`)).toHaveTextContent('Equipe A, planejado, 22/09/2026');

    fireEvent.click(screen.getByRole('button', { name: 'Editar Ponto 2' }));
    const form = screen.getByRole('form', { name: 'Editar Ponto 2' });
    fireEvent.change(within(form).getByLabelText('Equipe'), { target: { value: 'Equipe C' } });
    fireEvent.change(within(form).getByLabelText('Saída'), { target: { value: '2026-09-19' } });
    fireEvent.change(within(form).getByLabelText('Grupo'), { target: { value: 'Fazenda X' } });
    fireEvent.click(within(form).getByRole('button', { name: 'Salvar ponto' }));
    expect(screen.getByTestId(`equipe-${p2.id}`)).toHaveTextContent('Equipe C');
    expect(screen.getByTestId(`grupo-${p2.id}`)).toHaveTextContent('Fazenda X');
    expect(screen.getByTestId('resumo-operacao')).toHaveTextContent('0 sem equipe');
    expect(screen.getByTestId('resumo-operacao')).toHaveTextContent('0 sem data');
    expect(obterOperacoes()[0].pontos.find((p) => p.id === p1.id)?.equipe).toBe('Equipe A');
  });

  it('recusa data fora do período ao editar o ponto', () => {
    montar();
    criarEAbrir();
    fireEvent.change(screen.getByLabelText('Ou cole o conteúdo'), { target: { value: CSV } });
    fireEvent.click(screen.getByRole('button', { name: 'Conferir' }));
    fireEvent.click(screen.getByRole('button', { name: 'Importar 2 ponto(s)' }));
    fireEvent.click(screen.getByRole('button', { name: 'Editar Ponto 2' }));
    fireEvent.change(screen.getByLabelText('Saída'), { target: { value: '2026-12-01' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar ponto' }));
    expect(screen.getByRole('alert')).toHaveTextContent('A data de saída fica fora do período da operação.');
  });

  it('cria uma demanda de campo a partir do ponto, já ligada e com a vistoria marcada', () => {
    const armazem = montar();
    criarEAbrir();
    fireEvent.change(screen.getByLabelText('Ou cole o conteúdo'), { target: { value: CSV } });
    fireEvent.click(screen.getByRole('button', { name: 'Conferir' }));
    fireEvent.click(screen.getByRole('button', { name: 'Importar 2 ponto(s)' }));
    fireEvent.click(screen.getByRole('button', { name: 'Criar demanda a partir do Ponto 1' }));
    const d = armazem.obter().demandas[0];
    expect(d).toMatchObject({ tipo: 'campo', natureza: 'demanda', coordenada: { lat: -11.5, lon: -58.5 }, vistoria: { data: '2026-09-18' } });
    expect(d.titulo).toBe('Vistoria em Município Fictício (ponto 1 de Operação fictícia)');
    expect(obterOperacoes()[0].pontos[0].demandas).toEqual([d.id]);
    expect(screen.getAllByTestId(/^ligada-/)[0]).toHaveTextContent(d.titulo);
  });

  it('liga e desliga uma demanda existente; a demanda com coordenada próxima aparece como aviso', () => {
    const armazem = montar();
    act(() => {
      armazem.criar({ titulo: 'Demanda fictícia ao lado', descricao: '', responsavel: '', prioridade: 'Média', status: 'A Fazer', prazo: '', coordenada: '-11.5, -58.5' });
    });
    criarEAbrir();
    fireEvent.change(screen.getByLabelText('Ou cole o conteúdo'), { target: { value: CSV } });
    fireEvent.click(screen.getByRole('button', { name: 'Conferir' }));
    fireEvent.click(screen.getByRole('button', { name: 'Importar 2 ponto(s)' }));
    const [p1] = obterOperacoes()[0].pontos;
    expect(screen.getByTestId(`proximos-${p1.id}`)).toHaveTextContent('Demanda Demanda fictícia ao lado');

    fireEvent.change(screen.getByLabelText('Ligar a uma demanda existente (Ponto 1)'), { target: { value: armazem.obter().demandas[0].id } });
    fireEvent.click(screen.getByRole('button', { name: 'Ligar demanda ao Ponto 1' }));
    expect(screen.getByTestId(`ligada-${p1.id}`)).toHaveTextContent('Demanda fictícia ao lado');
    expect(screen.queryByTestId(`proximos-${p1.id}`)?.textContent ?? '').not.toContain('Demanda fictícia ao lado');
    fireEvent.click(screen.getByRole('button', { name: 'Desligar Demanda fictícia ao lado' }));
    expect(obterOperacoes()[0].pontos[0].demandas).toEqual([]);
  });

  it('exclui o ponto e a operação só com confirmação', () => {
    montar();
    criarEAbrir();
    fireEvent.change(screen.getByLabelText('Ou cole o conteúdo'), { target: { value: CSV } });
    fireEvent.click(screen.getByRole('button', { name: 'Conferir' }));
    fireEvent.click(screen.getByRole('button', { name: 'Importar 2 ponto(s)' }));
    const confirmar = vi.spyOn(window, 'confirm').mockReturnValueOnce(false).mockReturnValue(true);
    fireEvent.click(screen.getByRole('button', { name: 'Excluir Ponto 1' }));
    expect(obterOperacoes()[0].pontos).toHaveLength(2);
    fireEvent.click(screen.getByRole('button', { name: 'Excluir Ponto 1' }));
    expect(obterOperacoes()[0].pontos).toHaveLength(1);
    fireEvent.click(screen.getByRole('button', { name: 'Voltar às operações' }));
    fireEvent.click(screen.getByRole('button', { name: 'Excluir Operação fictícia' }));
    expect(obterOperacoes()).toHaveLength(0);
    expect(confirmar).toHaveBeenCalledTimes(3);
  });
});

describe('período opcional e tirado do arquivo', () => {
  const nomear = () => fireEvent.change(screen.getByLabelText('Nome *'), { target: { value: 'Operação sem datas' } });
  const colar = (csv: string) => {
    fireEvent.change(screen.getByLabelText('Ou cole o conteúdo'), { target: { value: csv } });
    fireEvent.click(screen.getByRole('button', { name: 'Conferir' }));
  };

  it('cria só com o nome; o período vem do arquivo e a prévia avisa antes de gravar', () => {
    montar();
    nomear();
    fireEvent.click(screen.getByRole('button', { name: 'Criar operação' }));
    expect(screen.getByTestId('periodo-operacao')).toHaveTextContent('sem período definido');
    colar(CSV);
    // A linha 4 tem retorno antes da saída: não conta para o período.
    expect(screen.getByTestId('periodo-do-arquivo')).toHaveTextContent('Período tirado do arquivo: 18/09/2026 a 22/09/2026.');
    expect(obterOperacoes()[0].inicio).toBeUndefined();
    fireEvent.click(screen.getByRole('button', { name: 'Importar 2 ponto(s)' }));
    expect(obterOperacoes()[0]).toMatchObject({ inicio: '2026-09-18', fim: '2026-09-22' });
    expect(screen.getByTestId('periodo-operacao')).toHaveTextContent('18/09/2026 a 22/09/2026');
  });

  it('o período informado vale: não é trocado e a data fora dele continua acusada', () => {
    montar();
    nomear();
    fireEvent.change(screen.getByLabelText('Início (opcional)'), { target: { value: '2026-09-20' } });
    fireEvent.change(screen.getByLabelText('Fim (opcional)'), { target: { value: '2026-09-25' } });
    fireEvent.click(screen.getByRole('button', { name: 'Criar operação' }));
    colar(CSV);
    expect(screen.queryByTestId('periodo-do-arquivo')).toBeNull();
    expect(screen.getByTestId('previa-importacao')).toHaveTextContent('Linha 2: A data de saída fica fora do período da operação.');
  });

  it('só um lado informado: o outro vem do arquivo', () => {
    montar();
    nomear();
    fireEvent.change(screen.getByLabelText('Início (opcional)'), { target: { value: '2026-09-10' } });
    fireEvent.click(screen.getByRole('button', { name: 'Criar operação' }));
    colar(CSV);
    expect(screen.getByTestId('periodo-do-arquivo')).toHaveTextContent('10/09/2026 a 22/09/2026');
    fireEvent.click(screen.getByRole('button', { name: 'Importar 2 ponto(s)' }));
    expect(obterOperacoes()[0]).toMatchObject({ inicio: '2026-09-10', fim: '2026-09-22' });
  });

  it('CSV sem datas e sem período: nada é preenchido e não há erro', () => {
    montar();
    nomear();
    fireEvent.click(screen.getByRole('button', { name: 'Criar operação' }));
    colar('LAT;LON\n-11.5;-58.5');
    expect(screen.queryByTestId('periodo-do-arquivo')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Importar 1 ponto(s)' }));
    expect(screen.getByTestId('periodo-operacao')).toHaveTextContent('sem período definido');
  });

  it('define o período depois, pelo detalhe, e recusa fim antes do início', () => {
    montar();
    nomear();
    fireEvent.click(screen.getByRole('button', { name: 'Criar operação' }));
    const form = screen.getByRole('form', { name: 'Período da operação' });
    fireEvent.change(within(form).getByLabelText('Início do período'), { target: { value: '2026-09-25' } });
    fireEvent.change(within(form).getByLabelText('Fim do período'), { target: { value: '2026-09-18' } });
    fireEvent.click(within(form).getByRole('button', { name: 'Salvar período' }));
    expect(within(form).getByRole('alert')).toHaveTextContent('O fim da operação não pode ser antes do início.');
    fireEvent.change(within(form).getByLabelText('Início do período'), { target: { value: '2026-09-18' } });
    fireEvent.change(within(form).getByLabelText('Fim do período'), { target: { value: '2026-09-25' } });
    fireEvent.click(within(form).getByRole('button', { name: 'Salvar período' }));
    expect(screen.getByTestId('periodo-operacao')).toHaveTextContent('18/09/2026 a 25/09/2026');
  });
});

describe('exportação dos pontos', () => {
  it('botões ficam desabilitados sem pontos e baixam CSV e GeoJSON com o nome e o tipo certos', async () => {
    montar();
    criarEAbrir();
    expect(screen.getByRole('button', { name: 'Exportar CSV' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Exportar GeoJSON (QGIS)' })).toBeDisabled();
    fireEvent.change(screen.getByLabelText('Ou cole o conteúdo'), { target: { value: CSV } });
    fireEvent.click(screen.getByRole('button', { name: 'Conferir' }));
    fireEvent.click(screen.getByRole('button', { name: 'Importar 2 ponto(s)' }));
    expect(screen.getByTestId('mensagem-importacao')).toHaveTextContent('exporte a lista atualizada');

    const blobs: Blob[] = [];
    const criarUrl = vi.fn((b: Blob) => { blobs.push(b); return 'blob:x'; });
    const original = { criar: URL.createObjectURL, revogar: URL.revokeObjectURL };
    URL.createObjectURL = criarUrl as unknown as typeof URL.createObjectURL;
    URL.revokeObjectURL = vi.fn();
    const nomes: string[] = [];
    const clique = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) { nomes.push(this.download); });
    try {
      fireEvent.click(screen.getByRole('button', { name: 'Exportar CSV' }));
      fireEvent.click(screen.getByRole('button', { name: 'Exportar GeoJSON (QGIS)' }));
    } finally {
      URL.createObjectURL = original.criar;
      URL.revokeObjectURL = original.revogar;
      clique.mockRestore();
    }
    expect(nomes).toHaveLength(2);
    expect(nomes[0]).toMatch(/^operacao-ficticia-pontos-\d{4}-\d{2}-\d{2}\.csv$/);
    expect(nomes[1]).toMatch(/\.geojson$/);
    expect(blobs[0].type).toContain('text/csv');
    expect(blobs[1].type).toContain('application/geo+json');
    // Blob.text() descarta o BOM ao decodificar: confere os bytes.
    const bytes = new Uint8Array(await blobs[0].arrayBuffer());
    expect([...bytes.slice(0, 3)]).toEqual([0xef, 0xbb, 0xbf]);
    expect(new TextDecoder().decode(bytes.slice(3)).startsWith('N_PONTO,EQUIPE,COORD_X,COORD_Y')).toBe(true);
    expect(JSON.parse(await blobs[1].text()).features).toHaveLength(2);
  });
});

describe('aviso no Painel', () => {
  it('conta os pontos planejados sem equipe ou sem data', () => {
    const armazem = criarArmazem(localStorage, { gerarId: () => 'id', exemplos: () => [] });
    const r = criarOperacao({ nome: 'Op', inicio: '2026-09-18', fim: '2026-09-25', origem: '' }, 'x');
    if (!r.ok) throw new Error();
    const base = { coordenada: { lat: -11.5, lon: -58.5 }, municipio: '', notas: '', demandas: [], situacao: 'planejado' as const };
    incluirPontos(r.id, [base, { ...base, equipe: 'Equipe A', saida: '2026-09-18' }]);
    render(<ContextoArmazem.Provider value={armazem}><Painel /></ContextoArmazem.Provider>);
    expect(screen.getByTestId('pontos-pendentes')).toHaveTextContent('1 ponto de operação está sem equipe ou sem data.');
  });
});

describe('Painel: demanda encaixada numa operação não conta como "falta encaixar"', () => {
  it('a contagem cai quando a demanda de campo é ligada a um ponto', () => {
    const armazem = criarArmazem(localStorage, { gerarId: () => 'dem-1', exemplos: () => [] });
    act(() => {
      armazem.criar({ titulo: 'Campo fictícia', descricao: '', responsavel: '', prioridade: 'Média', status: 'A Fazer', prazo: '', tipo: 'campo', vistoria: 'aberta' });
    });
    const r = criarOperacao({ nome: 'Op', inicio: '', fim: '', origem: '' }, 'x');
    if (!r.ok) throw new Error();
    render(<ContextoArmazem.Provider value={armazem}><Painel /></ContextoArmazem.Provider>);
    expect(screen.getByTestId('sem-vistoria')).toHaveTextContent('1 demanda de campo ainda não foi encaixada');
    act(() => {
      incluirPontos(r.id, [{ coordenada: { lat: -11.5, lon: -58.5 }, municipio: '', notas: '', demandas: ['dem-1'], situacao: 'planejado' }]);
    });
    expect(screen.queryByTestId('sem-vistoria')).toBeNull();
  });
});
