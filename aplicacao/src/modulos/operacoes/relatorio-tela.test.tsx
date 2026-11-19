// Tela: ficha do integrante (cargo e lotação, com autocomplete do último uso), origem/apoio da operação e "Relatório (texto)".

import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { ContextoArmazem, criarArmazem } from '../demandas/armazem.ts';
import { Operacoes } from './Operacoes.tsx';
import { alterarPonto, criarOperacao, criarViagem, incluirPontos, obterOperacoes } from './armazem.ts';

beforeEach(() => { localStorage.clear(); vi.restoreAllMocks(); });
const clicar = (nome: string | RegExp) => fireEvent.click(screen.getByRole('button', { name: nome }));

function abrir(nome: string) {
  const armazem = criarArmazem(localStorage, { gerarId: () => 'x', exemplos: () => [] });
  render(<ContextoArmazem.Provider value={armazem}><Operacoes agora={() => new Date(2026, 10, 18, 10)} /></ContextoArmazem.Provider>);
  clicar(`Abrir ${nome}`);
}

describe('equipe técnica na viagem', () => {
  it('ficha abre cargo e lotação; nome já usado volta com cargo e lotação do último uso; lotação nova = unidade da operação', () => {
    const a = criarOperacao({ nome: 'Antiga', inicio: '', fim: '', origem: '', setor: 'DUDCUIABA' }, '2026-01-01T00:00:00Z');
    const b = criarOperacao({ nome: 'Nova', inicio: '', fim: '', origem: '', setor: 'DUDJUINA' }, '2026-02-01T00:00:00Z');
    if (!a.ok || !b.ok) throw new Error('operação');
    const v = criarViagem(a.id, { equipe: 'A', integrantes: ['Ana Souza'], veiculos: [], saida: '', retorno: '', notas: '', pessoas: { 'Ana Souza': { cargo: 'Analista', lotacao: 'DUDCUIABA/SEMA-MT' } } });
    expect(v.ok).toBe(true);
    const nova = criarViagem(b.id, { equipe: 'B', integrantes: [], veiculos: [], saida: '', retorno: '', notas: '' });
    if (!nova.ok) throw new Error('viagem');
    abrir('Nova');
    clicar(/Editar viagem/);
    const incluir = (nome: string) => {
      fireEvent.change(screen.getByLabelText('Incluir em integrantes'), { target: { value: nome } });
      clicar('Confirmar inclusão em integrantes');
    };
    incluir('Ana Souza');
    incluir('Bia Lima');
    clicar('Cargo e lotação de Ana Souza');
    expect(screen.getByLabelText('Cargo de Ana Souza')).toHaveValue('Analista');
    expect(screen.getByLabelText('Lotação de Ana Souza')).toHaveValue('DUDCUIABA/SEMA-MT');
    clicar('Cargo e lotação de Bia Lima');
    expect(screen.getByLabelText('Cargo de Bia Lima')).toHaveValue('');
    expect(screen.getByLabelText('Lotação de Bia Lima')).toHaveValue('DUDJUINA');
    fireEvent.change(screen.getByLabelText('Cargo de Bia Lima'), { target: { value: 'Fiscal' } });
    clicar('Salvar viagem');
    expect(obterOperacoes().find((o) => o.id === b.id)?.viagens[0].pessoas?.['Bia Lima']).toEqual({ cargo: 'Fiscal', lotacao: 'DUDJUINA' });
  });
});

describe('origem do alerta, apoio e relatório', () => {
  it('salva origem/apoio, registra consulta manual e gera o texto com pendências e marcadores', () => {
    const r = criarOperacao({ nome: 'Brasnorte', inicio: '2026-10-05', fim: '2026-10-12', origem: '', setor: 'DUDJUINA' }, '2026-09-01T00:00:00Z');
    if (!r.ok) throw new Error('operação');
    incluirPontos(r.id, [{ coordenada: { lat: -12.1, lon: -58.2 }, municipio: 'Brasnorte', notas: '', demandas: [], situacao: 'planejado', tipoDano: 'Supressão de vegetação nativa', popAtivo: true, dataVistoria: '2026-10-07' }]);
    abrir('Brasnorte');

    fireEvent.change(screen.getByLabelText('Origem do alerta'), { target: { value: 'requisicao' } });
    fireEvent.change(screen.getByLabelText('Órgão que requisitou'), { target: { value: 'Ministério Público' } });
    fireEvent.change(screen.getByLabelText('Apoio (opcional)'), { target: { value: 'Polícia Militar' } });
    clicar('Salvar origem e apoio');
    expect(obterOperacoes()[0].origemAlerta).toEqual({ tipo: 'requisicao', detalhe: 'Ministério Público' });
    expect(obterOperacoes()[0].apoio).toBe('Polícia Militar');

    clicar('Expandir todos');
    const caixa = screen.getByTestId(/^relatorio-texto-/);
    fireEvent.click(within(caixa).getByRole('button', { name: 'Ver' }));
    clicar('+ Registrar consulta manual');
    fireEvent.change(within(caixa).getByLabelText('Base consultada'), { target: { value: 'car' } });
    fireEvent.change(within(caixa).getByLabelText('Resultado'), { target: { value: 'encontrado' } });
    clicar('Registrar consulta (Geoportal, QGIS…)');
    expect(within(caixa).getByRole('alert')).toHaveTextContent('Informe o que foi encontrado'); // encontrado exige o valor
    fireEvent.change(within(caixa).getByLabelText(/O que foi encontrado/), { target: { value: 'MT-1/2020' } });
    clicar('Registrar consulta (Geoportal, QGIS…)');
    expect(obterOperacoes()[0].pontos[0].consultas?.car).toMatchObject({ estado: 'encontrado', fonte: 'manual', detalhe: 'MT-1/2020' });

    act(() => { alterarPonto(r.id, obterOperacoes()[0].pontos[0].id, { caracterizacao: { 'A-1': 'Cerrado' } }); });
    fireEvent.click(within(caixa).getByRole('button', { name: 'Gerar texto do relatório' }));
    const texto = (within(caixa).getByLabelText(/^Relatório \(texto\) do/) as HTMLTextAreaElement).value;
    expect(texto).toContain('em atendimento a requisição de Ministério Público, no escopo da Brasnorte');
    expect(texto).toContain('com o apoio da Polícia Militar');
    expect(texto).toContain('Cadastro Ambiental Rural (CAR) n.º MT-1/2020');
    expect(texto).toContain('[CONSULTAS NÃO REALIZADAS: bioma, vegetação IBGE, embargos SEMA-MT');
    expect(texto).toContain('[PENDENTE: equipe técnica da viagem]');
    expect(within(caixa).getByRole('button', { name: 'Baixar .txt' })).toBeInTheDocument();
  });
});
