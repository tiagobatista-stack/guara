// Tela Operações: criar, importar CSV com prévia, viagens do cronograma, encaixe em lote, local já visitado, criar e ligar demanda.

import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { ContextoArmazem, criarArmazem } from '../demandas/armazem.ts';
import { Operacoes } from './Operacoes.tsx';
import { criarOperacao, incluirPontos, obterOperacoes, registrarRelatorio, registrarResultado } from './armazem.ts';
import { Painel } from '../painel/Painel.tsx';

function montar() {
  let n = 0;
  const armazem = criarArmazem(localStorage, { gerarId: () => `id-${++n}`, exemplos: () => [] });
  render(
    <ContextoArmazem.Provider value={armazem}>
      <Operacoes />
    </ContextoArmazem.Provider>,
  );
  fireEvent.click(screen.getByRole('button', { name: 'ou criar sem planilha' })); // os testes antigos criam pelo formulário
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
    expect(screen.getByTestId('resumo-operacao')).toHaveTextContent('0 pontos');
  });

  it('importa o CSV com prévia: mostra a linha com problema e só grava as válidas', () => {
    montar();
    criarEAbrir();
    fireEvent.change(screen.getByLabelText('Ou cole o conteúdo'), { target: { value: CSV } });
    fireEvent.click(screen.getByRole('button', { name: 'Conferir' }));
    const previa = screen.getByTestId('previa-importacao');
    expect(previa).toHaveTextContent('2 pontos prontos para importar');
    expect(previa).toHaveTextContent('Linha 4: O retorno é anterior à saída.');
    expect(obterOperacoes()[0].pontos).toHaveLength(0); // nada gravado antes de confirmar
    fireEvent.click(screen.getByRole('button', { name: 'Importar 2 pontos' }));
    fireEvent.click(screen.getByRole('button', { name: 'Expandir todos' }));
    expect(screen.getByTestId('mensagem-importacao')).toHaveTextContent('2 pontos importados.');
    expect(obterOperacoes()[0].pontos).toHaveLength(2);
    // A linha 2 (Equipe A, 18 a 22/09) vira uma viagem; a linha 3, sem equipe nem datas, fica sem viagem.
    expect(screen.getByTestId('resumo-operacao')).toHaveTextContent('1 sem viagem');
    expect(screen.getByTestId('resumo-operacao')).toHaveTextContent('1 viagem');
    expect(obterOperacoes()[0].viagens).toMatchObject([{ equipe: 'Equipe A', saida: '2026-09-18', retorno: '2026-09-22' }]);
  });

  it('avisa que o local já aparece em outro ponto e deixa encaixar o ponto numa viagem pelo Editar', () => {
    montar();
    criarEAbrir();
    fireEvent.change(screen.getByLabelText('Ou cole o conteúdo'), { target: { value: CSV } });
    fireEvent.click(screen.getByRole('button', { name: 'Conferir' }));
    fireEvent.click(screen.getByRole('button', { name: 'Importar 2 pontos' }));
    fireEvent.click(screen.getByRole('button', { name: 'Expandir todos' }));
    const [p1, p2] = obterOperacoes()[0].pontos;
    expect(screen.getByTestId(`proximos-${p2.id}`)).toHaveTextContent('Equipe A, planejado, 22/09/2026');

    expect(screen.getByTestId(`viagem-ponto-${p2.id}`)).toHaveTextContent('sem viagem');

    fireEvent.click(screen.getByRole('button', { name: 'Editar planejamento do Ponto 2' }));
    const form = screen.getByRole('form', { name: 'Editar planejamento do Ponto 2' });
    fireEvent.change(within(form).getByLabelText('Viagem'), { target: { value: p1.viagem } });
    fireEvent.change(within(form).getByLabelText('Grupo'), { target: { value: 'Fazenda X' } });
    fireEvent.click(within(form).getByRole('button', { name: 'Salvar ponto' }));
    expect(screen.getByTestId(`viagem-ponto-${p2.id}`)).toHaveTextContent('Equipe A · 18/09/2026 a 22/09/2026');
    expect(screen.getByTestId(`grupo-${p2.id}`)).toHaveTextContent('Fazenda X');
    expect(screen.getByTestId('resumo-operacao')).not.toHaveTextContent('sem viagem');
  });

  it('o Editar parte do ponto como está agora: não desfaz o grupo dado em lote', () => {
    montar();
    criarEAbrir();
    fireEvent.change(screen.getByLabelText('Ou cole o conteúdo'), { target: { value: CSV } });
    fireEvent.click(screen.getByRole('button', { name: 'Conferir' }));
    fireEvent.click(screen.getByRole('button', { name: 'Importar 2 pontos' }));
    fireEvent.click(screen.getByRole('button', { name: 'Expandir todos' }));
    fireEvent.click(screen.getByLabelText('Selecionar Ponto 2'));
    fireEvent.change(screen.getByLabelText('Nome do grupo'), { target: { value: 'Fazenda X' } });
    fireEvent.click(screen.getByRole('button', { name: 'Agrupar selecionados' }));
    fireEvent.click(screen.getByRole('button', { name: 'Editar planejamento do Ponto 2' }));
    const form = screen.getByRole('form', { name: 'Editar planejamento do Ponto 2' });
    expect(within(form).getByLabelText('Grupo')).toHaveValue('Fazenda X');
    fireEvent.click(within(form).getByRole('button', { name: 'Salvar ponto' }));
    expect(obterOperacoes()[0].pontos[1].grupo).toBe('Fazenda X');
  });

  it('viagem fora do período: o mascote pergunta; ampliar o período grava a viagem e o histórico', () => {
    montar();
    criarEAbrir();
    fireEvent.click(screen.getByRole('button', { name: 'Nova viagem' }));
    const form = screen.getByRole('form', { name: 'Nova viagem' });
    fireEvent.change(within(form).getByLabelText('Saída'), { target: { value: '2026-09-24' } });
    fireEvent.change(within(form).getByLabelText('Retorno'), { target: { value: '2026-09-28' } });
    fireEvent.click(within(form).getByRole('button', { name: 'Salvar viagem' }));
    expect(within(form).getByRole('alert')).toHaveTextContent('A viagem (24/09/2026 a 28/09/2026) fica fora do período cadastrado na operação (18/09/2026 a 25/09/2026).');
    expect(obterOperacoes()[0].viagens).toHaveLength(0);
    expect(within(form).getByLabelText('Ampliar para incluir os dois: 18/09/2026 a 28/09/2026')).toBeChecked();
    fireEvent.click(within(form).getByRole('button', { name: 'Atualizar o período' }));
    const o = obterOperacoes()[0];
    expect(o).toMatchObject({ inicio: '2026-09-18', fim: '2026-09-28' });
    expect(o.viagens).toMatchObject([{ saida: '2026-09-24', retorno: '2026-09-28' }]);
    expect(o.historico?.at(-1)).toMatchObject({ acao: 'periodo', para: { inicio: '2026-09-18', fim: '2026-09-28' } });
    expect(screen.queryByRole('form', { name: 'Nova viagem' })).toBeNull();
  });

  it('cria uma demanda de campo a partir do ponto, já ligada e com a vistoria marcada', () => {
    const armazem = montar();
    criarEAbrir();
    fireEvent.change(screen.getByLabelText('Ou cole o conteúdo'), { target: { value: CSV } });
    fireEvent.click(screen.getByRole('button', { name: 'Conferir' }));
    fireEvent.click(screen.getByRole('button', { name: 'Importar 2 pontos' }));
    fireEvent.click(screen.getByRole('button', { name: 'Expandir todos' }));
    fireEvent.click(screen.getByRole('button', { name: 'Converter Ponto 1 em demanda' }));
    const d = armazem.obter().demandas[0];
    expect(d).toMatchObject({ tipo: 'campo', natureza: 'demanda', coordenada: { lat: -11.5, lon: -58.5 }, vistoria: { data: '2026-09-18' } });
    expect(d.titulo).toBe('Vistoria em Município Fictício (ponto 1 de Operação fictícia)');
    expect(obterOperacoes()[0].pontos[0].demandas).toEqual([d.id]);
    expect(screen.getAllByTestId(/^ligada-/)[0]).toHaveTextContent(d.titulo);
    // Não cria a mesma demanda duas vezes.
    expect(screen.getByRole('button', { name: 'Converter Ponto 1 em demanda' })).toBeDisabled();
    expect(armazem.obter().demandas).toHaveLength(1);
  });

  it('liga e desliga uma demanda existente; a demanda com coordenada próxima aparece como aviso', () => {
    const armazem = montar();
    act(() => {
      armazem.criar({ titulo: 'Demanda fictícia ao lado', descricao: '', responsavel: '', prioridade: 'Média', status: 'A Fazer', prazo: '', coordenada: '-11.5, -58.5' });
    });
    criarEAbrir();
    fireEvent.change(screen.getByLabelText('Ou cole o conteúdo'), { target: { value: CSV } });
    fireEvent.click(screen.getByRole('button', { name: 'Conferir' }));
    fireEvent.click(screen.getByRole('button', { name: 'Importar 2 pontos' }));
    fireEvent.click(screen.getByRole('button', { name: 'Expandir todos' }));
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
    fireEvent.click(screen.getByRole('button', { name: 'Importar 2 pontos' }));
    fireEvent.click(screen.getByRole('button', { name: 'Expandir todos' }));
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
    fireEvent.click(screen.getByRole('button', { name: 'Importar 2 pontos' }));
    fireEvent.click(screen.getByRole('button', { name: 'Expandir todos' }));
    expect(obterOperacoes()[0]).toMatchObject({ inicio: '2026-09-18', fim: '2026-09-22' });
    expect(screen.getByTestId('periodo-operacao')).toHaveTextContent('18/09/2026 a 22/09/2026');
  });

  const criarComPeriodo = () => {
    montar();
    nomear();
    fireEvent.change(screen.getByLabelText('Início (opcional)'), { target: { value: '2026-09-20' } });
    fireEvent.change(screen.getByLabelText('Fim (opcional)'), { target: { value: '2026-09-25' } });
    fireEvent.click(screen.getByRole('button', { name: 'Criar operação' }));
    colar(CSV);
  };

  it('datas da planilha fora do período: o mascote pergunta e a importação espera a resposta', () => {
    criarComPeriodo();
    expect(screen.queryByTestId('periodo-do-arquivo')).toBeNull();
    const pergunta = screen.getByTestId('pergunta-periodo-importacao');
    expect(pergunta).toHaveTextContent('As datas da planilha (18/09/2026 a 22/09/2026) são diferentes do período cadastrado na operação (20/09/2026 a 25/09/2026). A operação mudou de data?');
    expect(pergunta).toHaveTextContent('1 de 2 linhas fica fora do período cadastrado.');
    // Erro de verdade continua por linha; o período não vira erro por linha.
    expect(screen.getByTestId('previa-importacao')).toHaveTextContent('Linha 4: O retorno é anterior à saída.');
    expect(screen.getByTestId('previa-importacao')).not.toHaveTextContent(/Linha \d+: [^.]*fora do período/);
    expect(screen.getByRole('button', { name: 'Importar 2 pontos' })).toBeDisabled();
  });

  it('"Não, manter": o período não muda e a viagem entra sem as datas da planilha', () => {
    criarComPeriodo();
    fireEvent.click(screen.getByRole('button', { name: 'Não, manter 20/09/2026 a 25/09/2026' }));
    expect(screen.getByTestId('aviso-manter-periodo')).toHaveTextContent('entra sem as datas');
    fireEvent.click(screen.getByRole('button', { name: 'Importar 2 pontos' }));
    fireEvent.click(screen.getByRole('button', { name: 'Expandir todos' }));
    const o = obterOperacoes()[0];
    expect(o).toMatchObject({ inicio: '2026-09-20', fim: '2026-09-25' });
    expect(o.viagens).toHaveLength(1);
    expect(o.viagens[0].equipe).toBe('Equipe A');
    expect(o.viagens[0]).not.toHaveProperty('saida');
    expect(o.historico?.map((e) => e.acao)).toEqual(['criada']);
  });

  it('"Sim, atualizar": amplia o período com motivo, registra no histórico do pedido e libera a importação', () => {
    criarComPeriodo();
    fireEvent.click(screen.getByRole('button', { name: 'Sim, atualizar o período' }));
    expect(screen.getByLabelText('Usar o período novo: 18/09/2026 a 22/09/2026')).toBeChecked();
    fireEvent.click(screen.getByLabelText('Ampliar para incluir os dois: 18/09/2026 a 25/09/2026'));
    fireEvent.change(screen.getByLabelText('Motivo da mudança (opcional)'), { target: { value: 'prorrogada' } });
    fireEvent.click(screen.getByRole('button', { name: 'Atualizar o período' }));
    const o = obterOperacoes()[0];
    expect(o).toMatchObject({ inicio: '2026-09-18', fim: '2026-09-25' });
    expect(o.historico?.[1]).toMatchObject({ acao: 'periodo', de: { inicio: '2026-09-20', fim: '2026-09-25' }, para: { inicio: '2026-09-18', fim: '2026-09-25' }, motivo: 'prorrogada' });
    expect(screen.queryByTestId('pergunta-periodo-importacao')).toBeNull();
    expect(screen.getByTestId('periodo-operacao')).toHaveTextContent('18/09/2026 a 25/09/2026');
    expect(screen.getByLabelText('Início do período')).toHaveValue('2026-09-18');
    expect(screen.getByTestId('historico-pedido')).toHaveTextContent('período alterado: 20/09/2026 a 25/09/2026 → 18/09/2026 a 25/09/2026 (prorrogada)');
    fireEvent.click(screen.getByRole('button', { name: 'Importar 2 pontos' }));
    fireEvent.click(screen.getByRole('button', { name: 'Expandir todos' }));
    expect(obterOperacoes()[0].viagens[0]).toMatchObject({ equipe: 'Equipe A', saida: '2026-09-18', retorno: '2026-09-22' });
  });

  it('só um lado informado: o outro vem do arquivo', () => {
    montar();
    nomear();
    fireEvent.change(screen.getByLabelText('Início (opcional)'), { target: { value: '2026-09-10' } });
    fireEvent.click(screen.getByRole('button', { name: 'Criar operação' }));
    colar(CSV);
    expect(screen.getByTestId('periodo-do-arquivo')).toHaveTextContent('10/09/2026 a 22/09/2026');
    fireEvent.click(screen.getByRole('button', { name: 'Importar 2 pontos' }));
    fireEvent.click(screen.getByRole('button', { name: 'Expandir todos' }));
    expect(obterOperacoes()[0]).toMatchObject({ inicio: '2026-09-10', fim: '2026-09-22' });
  });

  it('CSV sem datas e sem período: nada é preenchido e não há erro', () => {
    montar();
    nomear();
    fireEvent.click(screen.getByRole('button', { name: 'Criar operação' }));
    colar('LAT;LON\n-11.5;-58.5');
    expect(screen.queryByTestId('periodo-do-arquivo')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Importar 1 ponto' }));
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
    expect(screen.getByRole('button', { name: 'Exportar CSV (QGIS)' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Exportar planilha da SEMA' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Exportar GeoJSON (QGIS)' })).toBeDisabled();
    fireEvent.change(screen.getByLabelText('Ou cole o conteúdo'), { target: { value: CSV } });
    fireEvent.click(screen.getByRole('button', { name: 'Conferir' }));
    fireEvent.click(screen.getByRole('button', { name: 'Importar 2 pontos' }));
    fireEvent.click(screen.getByRole('button', { name: 'Expandir todos' }));
    expect(screen.getByTestId('mensagem-importacao')).toHaveTextContent('exporte a lista atualizada');

    const blobs: Blob[] = [];
    const criarUrl = vi.fn((b: Blob) => { blobs.push(b); return 'blob:x'; });
    const original = { criar: URL.createObjectURL, revogar: URL.revokeObjectURL };
    URL.createObjectURL = criarUrl as unknown as typeof URL.createObjectURL;
    URL.revokeObjectURL = vi.fn();
    const nomes: string[] = [];
    const clique = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) { nomes.push(this.download); });
    try {
      fireEvent.click(screen.getByRole('button', { name: 'Exportar CSV (QGIS)' }));
      fireEvent.click(screen.getByRole('button', { name: 'Exportar GeoJSON (QGIS)' }));
      fireEvent.click(screen.getByRole('button', { name: 'Exportar planilha da SEMA' }));
    } finally {
      URL.createObjectURL = original.criar;
      URL.revokeObjectURL = original.revogar;
      clique.mockRestore();
    }
    expect(nomes).toHaveLength(3);
    expect(nomes[2]).toMatch(/^operacao-ficticia-planilha-sema-\d{4}-\d{2}-\d{2}\.csv$/);
    const sema = new TextDecoder().decode(new Uint8Array(await blobs[2].arrayBuffer()).slice(3));
    expect(sema.startsWith('MES_PPROG;CODIGO_PONTO;NUMERO_DO_PONTO;EQUIPE;COORD_X')).toBe(true);
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

describe('agrupar pontos', () => {
  const importar = () => {
    montar();
    criarEAbrir();
    fireEvent.change(screen.getByLabelText('Ou cole o conteúdo'), { target: { value: CSV } });
    fireEvent.click(screen.getByRole('button', { name: 'Conferir' }));
    fireEvent.click(screen.getByRole('button', { name: 'Importar 2 pontos' }));
    fireEvent.click(screen.getByRole('button', { name: 'Expandir todos' }));
    return obterOperacoes()[0].pontos;
  };

  it('seleciona vários pontos, agrupa de uma vez e mostra a lista por grupo, com título, quantidade e equipes', () => {
    const [p1, p2] = importar();
    expect(screen.getByRole('button', { name: 'Agrupar selecionados' })).toBeDisabled();
    fireEvent.click(screen.getByLabelText('Selecionar Ponto 1'));
    fireEvent.click(screen.getByLabelText('Selecionar Ponto 2'));
    expect(screen.getByTestId('contagem-selecionados')).toHaveTextContent('2 pontos selecionados');
    expect(screen.getByRole('button', { name: 'Agrupar selecionados' })).toBeDisabled(); // falta o nome
    fireEvent.change(screen.getByLabelText('Nome do grupo'), { target: { value: 'Fazenda X' } });
    fireEvent.click(screen.getByRole('button', { name: 'Agrupar selecionados' }));
    fireEvent.change(screen.getByLabelText('Organizar a lista por'), { target: { value: 'grupo' } });
    expect(screen.getByTestId('aviso-grupo')).toHaveTextContent('Pontos agrupados em "Fazenda X".');
    expect(obterOperacoes()[0].pontos.map((p) => p.grupo)).toEqual(['Fazenda X', 'Fazenda X']);
    const secao = screen.getByTestId('secao-grupo-Fazenda X');
    expect(secao).toHaveTextContent('Fazenda X');
    expect(secao).toHaveTextContent('2 pontos');
    expect(secao).toHaveTextContent('Equipe A');
    expect(within(secao).getByTestId(`ponto-${p1.id}`)).toBeInTheDocument();
    expect(within(secao).getByTestId(`ponto-${p2.id}`)).toBeInTheDocument();
    expect(screen.getByTestId('contagem-selecionados')).toHaveTextContent('0 pontos selecionados');
  });

  it('tira um ponto do grupo e ele passa para "Sem grupo"; o filtro por grupo funciona', () => {
    const [p1, p2] = importar();
    fireEvent.click(screen.getByLabelText('Selecionar Ponto 1'));
    fireEvent.click(screen.getByLabelText('Selecionar Ponto 2'));
    fireEvent.change(screen.getByLabelText('Nome do grupo'), { target: { value: 'Fazenda X' } });
    fireEvent.click(screen.getByRole('button', { name: 'Agrupar selecionados' }));
    fireEvent.click(screen.getByLabelText('Selecionar Ponto 2'));
    fireEvent.click(screen.getByRole('button', { name: 'Tirar do grupo' }));
    fireEvent.change(screen.getByLabelText('Organizar a lista por'), { target: { value: 'grupo' } });
    expect(obterOperacoes()[0].pontos.find((p) => p.id === p2.id)).not.toHaveProperty('grupo');
    expect(within(screen.getByTestId('secao-grupo-sem')).getByTestId(`ponto-${p2.id}`)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Grupo'), { target: { value: 'Fazenda X' } });
    expect(screen.getByTestId(`ponto-${p1.id}`)).toBeInTheDocument();
    expect(screen.queryByTestId(`ponto-${p2.id}`)).toBeNull();
    fireEvent.change(screen.getByLabelText('Grupo'), { target: { value: 'sem' } });
    expect(screen.queryByTestId(`ponto-${p1.id}`)).toBeNull();
    expect(screen.getByTestId(`ponto-${p2.id}`)).toBeInTheDocument();
  });

  it('seleciona todos os visíveis e limpa a seleção; sem grupo nenhum a lista segue simples', () => {
    importar();
    expect(screen.queryByTestId('secao-grupo-sem')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Selecionar todos os visíveis' }));
    expect(screen.getByTestId('contagem-selecionados')).toHaveTextContent('2 pontos selecionados');
    fireEvent.click(screen.getByRole('button', { name: 'Limpar seleção' }));
    expect(screen.getByTestId('contagem-selecionados')).toHaveTextContent('0 pontos selecionados');
  });
});

describe('aviso no Painel', () => {
  it('conta os pontos planejados sem viagem ou com viagem sem data', () => {
    const armazem = criarArmazem(localStorage, { gerarId: () => 'id', exemplos: () => [] });
    const r = criarOperacao({ nome: 'Op', inicio: '2026-09-18', fim: '2026-09-25', origem: '' }, 'x');
    if (!r.ok) throw new Error();
    const base = { coordenada: { lat: -11.5, lon: -58.5 }, municipio: '', notas: '', demandas: [], situacao: 'planejado' as const };
    incluirPontos(r.id, [base, { ...base, equipe: 'Equipe A', saida: '2026-09-18' }]);
    render(<ContextoArmazem.Provider value={armazem}><Painel /></ContextoArmazem.Provider>);
    expect(screen.getByTestId('pontos-pendentes')).toHaveTextContent('1 ponto de operação está sem viagem ou com viagem sem data de saída.');
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

describe('nova operação: importar primeiro, nomear depois', () => {
  const CSV_DEZ = [
    'N_PONTO;EQUIPE;COORD_X;COORD_Y;MUNICIPIO;DAT_SAIDA;DAT_RETOR;NOT_PLANEJ;MES_PPROG;FISCALIZADO_AUTUADO',
    '1;Equipe A;58.5 W;11.5 S;Castanheira;2026-12-07;2026-12-11;;202612;',
    '2;Equipe A;58.6 W;11.6 S;Castanheira;2026-12-07;2026-12-11;;202612;',
    '3;Equipe B;58.7 W;11.7 S;Castanheira;2026-12-08;2026-12-11;;202612;',
    '4;Equipe B;58.8 W;11.8 S;Juína;2026-12-08;2026-12-11;;202612;Sim',
  ].join('\n');
  // O File do jsdom não tem arrayBuffer(); o navegador tem.
  const escolher = (texto: string) => {
    const arquivo = new File([texto], 'pontos.csv', { type: 'text/csv' });
    Object.defineProperty(arquivo, 'arrayBuffer', { value: async () => new TextEncoder().encode(texto).buffer });
    fireEvent.change(screen.getByTestId('arquivo-nova-operacao'), { target: { files: [arquivo] } });
  };

  it('importa, sugere o nome, deixa editar e cria a operação com os pontos de uma vez', async () => {
    montar();
    escolher(CSV_DEZ);
    await screen.findByTestId('previa-nova-operacao');
    expect(screen.getByLabelText('Nome *')).toHaveValue('Operação Castanheira – dez/2026');
    expect(screen.getByTestId('previa-nova-operacao')).toHaveTextContent('4 pontos prontos');
    expect(obterOperacoes()).toHaveLength(0); // nada é gravado antes da confirmação
    fireEvent.change(screen.getByLabelText('Nome *'), { target: { value: 'Operação de dezembro' } });
    fireEvent.click(screen.getByRole('button', { name: 'Criar operação com 4 pontos' }));
    expect(screen.getByRole('heading', { level: 2, name: 'Operação de dezembro' })).toBeInTheDocument();
    expect(screen.getByTestId('resumo-operacao')).toHaveTextContent('4 pontos');
    fireEvent.click(screen.getByRole('button', { name: 'Voltar às operações' }));
    expect(screen.getByText('Operação de dezembro')).toBeInTheDocument();
    expect(obterOperacoes()[0]).toMatchObject({ inicio: '2026-12-07', fim: '2026-12-11' });
  });

  it('exige o nome e "Cancelar" descarta tudo', async () => {
    montar();
    escolher(CSV_DEZ);
    await screen.findByTestId('previa-nova-operacao');
    fireEvent.change(screen.getByLabelText('Nome *'), { target: { value: '  ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Criar operação com 4 pontos' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Informe o nome da operação.');
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(screen.queryByTestId('previa-nova-operacao')).toBeNull();
    expect(obterOperacoes()).toHaveLength(0);
  });

  it('sem nenhuma linha válida: mostra os erros e não oferece criar', async () => {
    montar();
    escolher('N_PONTO;COORD_X;COORD_Y;MUNICIPIO\n1;abc;def;Lugar');
    expect(await screen.findByText(/Linha 2:/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Criar operação com/ })).toBeNull();
    expect(screen.queryByLabelText('Nome *')).toBeNull();
  });
});

describe('viagens do cronograma', () => {
  const importar = () => {
    montar();
    criarEAbrir();
    fireEvent.change(screen.getByLabelText('Ou cole o conteúdo'), { target: { value: CSV } });
    fireEvent.click(screen.getByRole('button', { name: 'Conferir' }));
    fireEvent.click(screen.getByRole('button', { name: 'Importar 2 pontos' }));
    fireEvent.click(screen.getByRole('button', { name: 'Expandir todos' }));
    return obterOperacoes()[0];
  };
  const incluir = (form: HTMLElement, campo: 'integrantes' | 'veículos', nome: string) => {
    fireEvent.change(within(form).getByLabelText(`Incluir em ${campo}`), { target: { value: nome } });
    fireEvent.click(within(form).getByRole('button', { name: `Confirmar inclusão em ${campo}` }));
  };

  it('a viagem vinda do CSV aparece incompleta até ter integrantes e veículo', () => {
    const o = importar();
    const v = o.viagens[0];
    expect(screen.getByTestId(`incompleta-${v.id}`)).toHaveTextContent('integrantes (mínimo 2)');
    fireEvent.click(screen.getByRole('button', { name: 'Editar viagem Equipe A · 18/09/2026 a 22/09/2026' }));
    const form = screen.getByRole('form', { name: 'Editar viagem Equipe A · 18/09/2026 a 22/09/2026' });
    incluir(form, 'integrantes', 'Fulano Fictício');
    incluir(form, 'integrantes', 'Beltrana Fictícia');
    incluir(form, 'veículos', 'Hilux FIC-0001');
    expect(within(form).getByRole('list', { name: 'Integrantes' })).toHaveTextContent('Fulano Fictício');
    fireEvent.click(within(form).getByRole('button', { name: 'Remover Beltrana Fictícia' }));
    incluir(form, 'integrantes', 'Ciclana Fictícia');
    fireEvent.click(within(form).getByRole('button', { name: 'Salvar viagem' }));
    expect(obterOperacoes()[0].viagens[0]).toMatchObject({ integrantes: ['Fulano Fictício', 'Ciclana Fictícia'], veiculos: ['Hilux FIC-0001'] });
    expect(screen.queryByTestId(`incompleta-${v.id}`)).toBeNull();
  });

  it('cria uma viagem e põe os pontos selecionados nela de uma vez; a lista passa a mostrar a viagem', () => {
    const o = importar();
    fireEvent.click(screen.getByRole('button', { name: 'Nova viagem' }));
    const form = screen.getByRole('form', { name: 'Nova viagem' });
    fireEvent.change(within(form).getByLabelText('Equipe'), { target: { value: 'Equipe B' } });
    fireEvent.change(within(form).getByLabelText('Saída'), { target: { value: '2026-09-23' } });
    fireEvent.change(within(form).getByLabelText('Retorno'), { target: { value: '2026-09-25' } });
    fireEvent.click(within(form).getByRole('button', { name: 'Salvar viagem' }));
    const nova = obterOperacoes()[0].viagens.find((v) => v.equipe === 'Equipe B')!;
    expect(nova).toMatchObject({ saida: '2026-09-23', retorno: '2026-09-25' });

    fireEvent.click(screen.getByRole('button', { name: 'Selecionar todos os visíveis' }));
    fireEvent.change(screen.getByLabelText('Viagem dos selecionados'), { target: { value: nova.id } });
    fireEvent.click(screen.getByRole('button', { name: 'Pôr na viagem' }));
    expect(screen.getByTestId('aviso-grupo')).toHaveTextContent('Pontos encaixados em Equipe B · 23/09/2026 a 25/09/2026.');
    expect(obterOperacoes()[0].pontos.every((p) => p.viagem === nova.id)).toBe(true);
    expect(within(screen.getByTestId(`secao-viagem-${nova.id}`)).getByTestId(`ponto-${o.pontos[0].id}`)).toBeInTheDocument();
    expect(screen.getByTestId('resumo-operacao')).not.toHaveTextContent('sem viagem');
  });

  it('exclui a viagem só com confirmação e os pontos ficam sem viagem', () => {
    const o = importar();
    const confirmar = vi.spyOn(window, 'confirm').mockReturnValue(true);
    fireEvent.click(screen.getByRole('button', { name: 'Excluir viagem Equipe A · 18/09/2026 a 22/09/2026' }));
    expect(confirmar).toHaveBeenCalledTimes(1);
    expect(obterOperacoes()[0].viagens).toHaveLength(0);
    expect(obterOperacoes()[0].pontos).toHaveLength(2);
    expect(screen.getByTestId(`viagem-ponto-${o.pontos[0].id}`)).toHaveTextContent('sem viagem');
  });

  it('avisa conflito de agenda quando a mesma pessoa está em viagens sobrepostas', () => {
    importar();
    const criar = (equipe: string, saida: string, retorno: string, pessoa: string) => {
      fireEvent.click(screen.getByRole('button', { name: 'Nova viagem' }));
      const form = screen.getByRole('form', { name: 'Nova viagem' });
      fireEvent.change(within(form).getByLabelText('Equipe'), { target: { value: equipe } });
      fireEvent.change(within(form).getByLabelText('Saída'), { target: { value: saida } });
      fireEvent.change(within(form).getByLabelText('Retorno'), { target: { value: retorno } });
      incluir(form, 'integrantes', pessoa);
      fireEvent.click(within(form).getByRole('button', { name: 'Salvar viagem' }));
    };
    criar('Equipe C', '2026-09-19', '2026-09-20', 'Fulano Fictício');
    criar('Equipe D', '2026-09-20', '2026-09-21', 'fulano ficticio');
    const [c] = obterOperacoes()[0].viagens.filter((v) => v.equipe === 'Equipe C');
    expect(screen.getByTestId(`conflito-${c.id}`)).toHaveTextContent('Fulano Fictício também está em Equipe D · 20/09/2026 a 21/09/2026 (operação Operação fictícia)');
  });
});

describe('etapa 2: código, resultado e acompanhamento', () => {
  const AGORA = () => new Date(2026, 10, 15, 10, 0);
  const montarEm = () => {
    const armazem = criarArmazem(localStorage, { gerarId: () => 'id-x', exemplos: () => [] });
    render(<ContextoArmazem.Provider value={armazem}><Operacoes agora={AGORA} /></ContextoArmazem.Provider>);
    fireEvent.click(screen.getByRole('button', { name: 'ou criar sem planilha' }));
    return armazem;
  };
  const importar = () => {
    montarEm();
    criarEAbrir();
    fireEvent.change(screen.getByLabelText('Ou cole o conteúdo'), { target: { value: CSV } });
    fireEvent.click(screen.getByRole('button', { name: 'Conferir' }));
    fireEvent.click(screen.getByRole('button', { name: 'Importar 2 pontos' }));
    fireEvent.click(screen.getByRole('button', { name: 'Expandir todos' }));
    return obterOperacoes()[0].pontos;
  };

  it('mostra o código gerado (MUNICIPIO+AAAAMM-NN) e a situação de cada ponto', () => {
    const [p1, p2] = importar();
    expect(screen.getByTestId(`codigo-${p1.id}`)).toHaveTextContent('MUNICIPIOFICTICIO202609-01');
    expect(screen.getByTestId(`codigo-${p2.id}`)).toHaveTextContent('MUNICIPIOFICTICIO202609-02');
    expect(screen.getByTestId(`situacao-${p1.id}`)).toHaveTextContent('planejado');
  });

  it('o Editar muda número, município e tipo de dano; o código continua o mesmo', () => {
    const [, p2] = importar();
    fireEvent.click(screen.getByRole('button', { name: 'Editar planejamento do Ponto 2' }));
    const form = screen.getByRole('form', { name: 'Editar planejamento do Ponto 2' });
    fireEvent.change(within(form).getByLabelText('Município'), { target: { value: 'Castanheira' } });
    fireEvent.change(within(form).getByLabelText('Tipo de dano'), { target: { value: 'Desmatamento' } });
    fireEvent.click(within(form).getByRole('button', { name: 'Salvar ponto' }));
    expect(screen.getByTestId(`tipo-dano-${p2.id}`)).toHaveTextContent('Desmatamento');
    expect(obterOperacoes()[0].pontos[1]).toMatchObject({ municipio: 'Castanheira', codigo: 'MUNICIPIOFICTICIO202609-02' });
  });

  it('registra o resultado: motivo obrigatório no "Não"; o ponto fica a reprogramar e o mascote avisa', () => {
    const [p1] = importar();
    // A viagem da Equipe A voltou em 22/09: o mascote avisa o ponto sem resultado.
    expect(screen.getByTestId('pendencias-operacao')).toHaveTextContent('1 ponto sem resultado depois do retorno da viagem');
    fireEvent.click(screen.getByRole('button', { name: 'Registrar resultado do Ponto 1' }));
    const form = screen.getByRole('form', { name: 'Resultado do Ponto 1' });
    fireEvent.change(within(form).getByLabelText('Resultado (fiscalizado/autuado)'), { target: { value: 'nao' } });
    fireEvent.click(within(form).getByRole('button', { name: 'Salvar resultado' }));
    expect(within(form).getByRole('alert')).toHaveTextContent('Informe o motivo de não fiscalizar ou não autuar.');
    fireEvent.change(within(form).getByLabelText('Motivo de não fiscalizar/autuar *'), { target: { value: 'Área sem acesso' } });
    fireEvent.click(within(form).getByRole('button', { name: 'Salvar resultado' }));
    expect(screen.getByTestId(`situacao-${p1.id}`)).toHaveTextContent('a reprogramar');
    expect(screen.getByTestId(`resultado-${p1.id}`)).toHaveTextContent('Não · Área sem acesso');
    expect(screen.getByTestId('pendencias-operacao')).toHaveTextContent('1 ponto não fiscalizado a reprogramar');
    expect(screen.getByTestId('resumo-operacao')).toHaveTextContent('1 a reprogramar');
  });

  it('finaliza com "Sim" e protocolo; cancelando o outro ponto, o campo encerra; a operação só encerra com o relatório enviado', () => {
    const [p1] = importar();
    fireEvent.click(screen.getByRole('button', { name: 'Registrar resultado do Ponto 1' }));
    const form = screen.getByRole('form', { name: 'Resultado do Ponto 1' });
    fireEvent.change(within(form).getByLabelText('Resultado (fiscalizado/autuado)'), { target: { value: 'sim' } });
    fireEvent.change(within(form).getByLabelText('Protocolo (demanda e/ou auto)'), { target: { value: 'FIC-AUTO-0001' } });
    fireEvent.change(within(form).getByLabelText('Data da vistoria'), { target: { value: '2026-09-20' } });
    fireEvent.click(within(form).getByRole('button', { name: 'Salvar resultado' }));
    expect(screen.getByTestId(`situacao-${p1.id}`)).toHaveTextContent('em elaboração');
    expect(screen.queryByTestId('operacao-encerrada')).toBeNull();
    expect(screen.getByTestId(`fase-${p1.id}`)).toHaveTextContent('Em elaboração');
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar vistoria do Ponto 2' }));
    fireEvent.change(screen.getByLabelText('Motivo do cancelamento'), { target: { value: 'área inacessível' } });
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar cancelamento' }));
    expect(screen.queryByTestId('operacao-encerrada')).toBeNull();
    expect(screen.getByTestId('campo-encerrado')).toHaveTextContent('Campo encerrado · 1 em elaboração');
    expect(screen.queryByTestId('pendencias-operacao')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Registrar relatório no SIGA do Ponto 1' }));
    const envio = screen.getByRole('form', { name: 'Envio do relatório do Ponto 1' });
    fireEvent.change(within(envio).getByLabelText('Data de envio no SIGA-MT'), { target: { value: '2026-11-14' } });
    fireEvent.change(within(envio).getByLabelText('Número no SIGA-MT (opcional)'), { target: { value: 'FIC-SIGA-1' } });
    fireEvent.click(within(envio).getByRole('button', { name: 'Salvar envio' }));
    if (screen.queryByTestId('confirma-conclusao')) fireEvent.click(screen.getByRole('button', { name: 'Concluir' }));
    expect(screen.getByTestId(`fase-${p1.id}`)).toHaveTextContent('Concluído em 14/11/2026 · SIGA nº FIC-SIGA-1');
    expect(screen.getByTestId('operacao-encerrada')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Reativar Ponto 2' }));
    expect(screen.queryByTestId('operacao-encerrada')).toBeNull();
  });

  it('relatório: data futura é recusada e data em branco desfaz o envio', () => {
    const [p1] = importar();
    act(() => { registrarResultado(obterOperacoes()[0].id, p1.id, { resultado: 'sim', motivo: '', protocolo: '', observacao: '', dataVistoria: '' }, '2026-11-15'); });
    fireEvent.click(screen.getByRole('button', { name: 'Registrar relatório no SIGA do Ponto 1' }));
    const envio = screen.getByRole('form', { name: 'Envio do relatório do Ponto 1' });
    fireEvent.change(within(envio).getByLabelText('Data de envio no SIGA-MT'), { target: { value: '2026-11-16' } });
    fireEvent.click(within(envio).getByRole('button', { name: 'Salvar envio' }));
    if (screen.queryByTestId('confirma-conclusao')) fireEvent.click(screen.getByRole('button', { name: 'Concluir' }));
    expect(within(envio).getByRole('alert')).toHaveTextContent('não pode ser futura');
    fireEvent.change(within(envio).getByLabelText('Data de envio no SIGA-MT'), { target: { value: '' } });
    fireEvent.click(within(envio).getByRole('button', { name: 'Salvar envio' }));
    if (screen.queryByTestId('confirma-conclusao')) fireEvent.click(screen.getByRole('button', { name: 'Concluir' }));
    expect(screen.getByTestId(`fase-${p1.id}`)).toHaveTextContent('Em elaboração');
  });

  it('data da vistoria: botões com os dias da viagem, destaque do escolhido e aviso fora do período (sem bloquear)', () => {
    importar();
    fireEvent.click(screen.getByRole('button', { name: 'Registrar resultado do Ponto 1' }));
    const form = screen.getByRole('form', { name: 'Resultado do Ponto 1' });
    const campo = within(form).getByLabelText('Data da vistoria') as HTMLInputElement;
    expect(campo.value).toBe(''); // nunca vem preenchido sozinho
    expect(within(within(form).getByRole('group', { name: 'Dias da viagem' })).getAllByRole('button').map((b) => b.textContent)).toEqual(['sex 18/09', 'sáb 19/09', 'dom 20/09', 'seg 21/09', 'ter 22/09']);
    fireEvent.click(within(form).getByRole('button', { name: 'sáb 19/09' }));
    expect(campo.value).toBe('2026-09-19');
    expect(within(form).getByRole('button', { name: 'sáb 19/09' })).toHaveAttribute('aria-pressed', 'true');
    expect(within(form).getByRole('button', { name: 'dom 20/09' })).toHaveAttribute('aria-pressed', 'false');
    expect(within(form).queryByText(/Fora do período/)).toBeNull();
    fireEvent.change(campo, { target: { value: '2026-09-25' } });
    expect(within(form).getByText('Fora do período da viagem (18/09 a 22/09/2026) — confira.')).toBeInTheDocument();
    fireEvent.change(within(form).getByLabelText('Resultado (fiscalizado/autuado)'), { target: { value: 'sim' } });
    fireEvent.click(within(form).getByRole('button', { name: 'Salvar resultado' })); // não bloqueia
    expect(obterOperacoes()[0].pontos[0].dataVistoria).toBe('2026-09-25');
  });

  it('na lista de operações, o mascote mostra os pontos a reprogramar e leva o ponto para outra operação', () => {
    const a = criarOperacao({ nome: 'Outubro fictícia', inicio: '2026-10-05', fim: '2026-10-12', origem: '' }, '2026-09-01T00:00:00Z');
    const b = criarOperacao({ nome: 'Novembro fictícia', inicio: '2026-11-20', fim: '2026-11-27', origem: '' }, '2026-09-01T00:00:00Z');
    if (!a.ok || !b.ok) throw new Error();
    incluirPontos(a.id, [{ coordenada: { lat: -11.5, lon: -58.5 }, municipio: 'Juína', notas: '', demandas: [], situacao: 'planejado', numero: 1 }]);
    const p = obterOperacoes()[0].pontos[0];
    registrarResultado(a.id, p.id, { resultado: 'nao', motivo: 'Infrator não localizado', protocolo: '', observacao: '', dataVistoria: '' }, '2026-11-15');
    montarEm();
    // Na lista, o aviso agrupa por operação (sem listar os pontos); o ponto se reprograma no detalhe da operação.
    expect(screen.getByTestId('pendencias-campo')).toHaveTextContent('Pendências pós-campo');
    expect(screen.getByTestId(`pendencia-${a.id}`)).toHaveTextContent('Outubro fictícia1 a reprogramar');
    expect(screen.getByTestId(`pendencia-${a.id}`)).not.toHaveTextContent('Operação Operação');
    expect(screen.queryByTestId(`a-reprogramar-${p.id}`)).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Abrir Outubro fictícia (pendências)' }));
    const item = screen.getByTestId(`a-reprogramar-${p.id}`);
    expect(item).toHaveTextContent('JUINA202610-01 (Outubro fictícia; Infrator não localizado)');
    fireEvent.change(within(item).getByLabelText('Operação para reprogramar JUINA202610-01'), { target: { value: b.id } });
    fireEvent.click(within(item).getByRole('button', { name: 'Reprogramar JUINA202610-01' }));
    expect(screen.queryByTestId('pendencias-operacao')).toBeNull();
    expect(obterOperacoes()[1].pontos[0]).toMatchObject({ codigo: 'JUINA202611-01', situacao: 'planejado' });
    expect(obterOperacoes()[0].pontos[0].reprogramado).toEqual({ operacao: b.id, ponto: obterOperacoes()[1].pontos[0].id });
  });

  it('lista: selo, progresso e ordem (pendente, em andamento, planejada, encerrada)', () => {
    const mk = (nome: string, inicio: string, saida: string, retorno: string, resultado?: 'sim') => {
      const r = criarOperacao({ nome, inicio, fim: retorno, origem: '' }, '2026-09-01T00:00:00Z');
      if (!r.ok) throw new Error();
      incluirPontos(r.id, [
        { coordenada: { lat: -11.5, lon: -58.5 }, municipio: 'Juína', notas: '', demandas: [], situacao: 'planejado', equipe: 'A', saida, retorno },
        { coordenada: { lat: -11.6, lon: -58.5 }, municipio: 'Juína', notas: '', demandas: [], situacao: 'planejado', equipe: 'A', saida, retorno },
      ]);
      if (resultado) for (const p of obterOperacoes().find((o) => o.id === r.id)!.pontos) { registrarResultado(r.id, p.id, { resultado, motivo: '', protocolo: '', observacao: '', dataVistoria: '' }, '2026-11-15'); registrarRelatorio(r.id, p.id, { enviadoEm: '2026-11-15', protocoloSiga: '', notas: '' }, '2026-11-15'); }
      return r.id;
    };
    const futura = mk('Futura', '2026-12-01', '2026-12-01', '2026-12-05');
    const encerrada = mk('Feita', '2026-09-01', '2026-09-01', '2026-09-05', 'sim');
    const andando = mk('Andando', '2026-11-14', '2026-11-14', '2026-11-20');
    const pendente = mk('Vencida', '2026-10-05', '2026-10-05', '2026-10-09');
    montarEm();
    const itens = within(screen.getByRole('list', { name: 'Lista de operações' })).getAllByRole('listitem').map((li) => li.getAttribute('data-testid'));
    expect(itens).toEqual([pendente, andando, futura, encerrada].map((id) => `operacao-${id}`));
    expect(screen.getByTestId(`selo-${pendente}`)).toHaveTextContent('Pós-campo');
    expect(screen.getByTestId(`selo-${andando}`)).toHaveTextContent('Em campo');
    expect(screen.getByTestId(`selo-${encerrada}`)).toHaveTextContent('Concluída');
    expect(screen.getByTestId(`selo-${futura}`)).toHaveTextContent('Planejada');
    expect(screen.getByTestId(`progresso-${encerrada}`)).toHaveTextContent('Campo2 de 2Relatório2 de 2');
    expect(screen.getByTestId(`progresso-${pendente}`)).toHaveTextContent('Campo0 de 2· 2 vencidosRelatório0 de 2');
    expect(within(screen.getByTestId(`progresso-${pendente}`)).getAllByRole('progressbar').map((b) => b.getAttribute('max'))).toEqual(['2', '2']);
    expect(screen.getByTestId(`operacao-${futura}`)).not.toHaveTextContent('sem viagem');
  });

  it('Painel: avisa ponto sem resultado depois do retorno e ponto a reprogramar', () => {
    const armazem = criarArmazem(localStorage, { gerarId: () => 'id', exemplos: () => [] });
    const r = criarOperacao({ nome: 'Op', inicio: '2026-09-18', fim: '2026-09-25', origem: '' }, 'x');
    if (!r.ok) throw new Error();
    const base = { coordenada: { lat: -11.5, lon: -58.5 }, municipio: '', notas: '', demandas: [], situacao: 'planejado' as const, equipe: 'Equipe A', saida: '2026-09-18', retorno: '2026-09-22' };
    incluirPontos(r.id, [base, base]);
    registrarResultado(r.id, obterOperacoes()[0].pontos[1].id, { resultado: 'nao', motivo: 'Área sem acesso', protocolo: '', observacao: '', dataVistoria: '' }, '2026-11-15');
    render(<ContextoArmazem.Provider value={armazem}><Painel agora={AGORA} /></ContextoArmazem.Provider>);
    expect(screen.getByTestId('pontos-sem-resultado')).toHaveTextContent('1 ponto de operação está sem resultado depois do retorno da viagem.');
    expect(screen.getByTestId('pontos-a-reprogramar')).toHaveTextContent('1 ponto não fiscalizado precisa ser reprogramado');
  });
});

describe('etapa 3: planilha da SEMA de volta', () => {
  it('reimportar a planilha preenchida atualiza o ponto pelo código, sem duplicar, e o planejamento do sistema prevalece', () => {
    montar();
    criarEAbrir();
    const colar = (texto: string) => {
      fireEvent.change(screen.getByLabelText('Ou cole o conteúdo'), { target: { value: texto } });
      fireEvent.click(screen.getByRole('button', { name: 'Conferir' }));
    };
    colar(CSV);
    fireEvent.click(screen.getByRole('button', { name: 'Importar 2 pontos' }));
    fireEvent.click(screen.getByRole('button', { name: 'Expandir todos' }));
    const [p1] = obterOperacoes()[0].pontos;
    expect(p1.codigo).toBe('MUNICIPIOFICTICIO202609-01');
    colar([
      'CODIGO_PONTO;NUMERO_DO_PONTO;EQUIPE;COORD_X;COORD_Y;MUNICIPIO;DATA_SAIDA;FISCALIZADO_AUTUADO;MOTIVO DE NÃO FISCALIZAR/AUTUAR;NUM_PROTOCOLO;AG_FISCALIZACAO',
      'MUNICIPIOFICTICIO202609-01;1;Equipe Z;58.5 W;11.5 S;Município Fictício;2026-09-18;Fiscalizado não autuado;Infrator não localizado;FIC-0009;DUDFICTICIA',
    ].join('\n'));
    expect(screen.getByTestId('previa-importacao')).toHaveTextContent('0 pontos prontos para importar, 1 já na operação (atualização)');
    const item = screen.getByTestId(`atualizacao-${p1.id}`);
    expect(item).toHaveTextContent('resultado: Fiscalizado não autuado; motivo: Infrator não localizado; protocolo: FIC-0009');
    expect(item).toHaveTextContent('Diferente na planilha (mantido o do sistema): equipe: planilha Equipe Z, sistema Equipe A');
    expect(screen.getByTestId('setor-do-arquivo')).toHaveTextContent('DUDFICTICIA');
    fireEvent.click(screen.getByRole('button', { name: 'Importar 0 pontos e atualizar 1' }));
    expect(screen.getByTestId('mensagem-importacao')).toHaveTextContent('0 pontos importados e 1 atualizado');
    const o = obterOperacoes()[0];
    expect(o.pontos).toHaveLength(2);
    expect(o.pontos[0]).toMatchObject({ resultado: 'fiscalizado-nao-autuado', motivo: 'Infrator não localizado', protocolo: 'FIC-0009', situacao: 'vistoriado' });
    expect(o.viagens.map((v) => v.equipe)).toEqual(['Equipe A']);
    expect(o.setor).toBe('DUDFICTICIA');
    expect(screen.getByTestId(`situacao-${p1.id}`)).toHaveTextContent('em elaboração');
  });
});
