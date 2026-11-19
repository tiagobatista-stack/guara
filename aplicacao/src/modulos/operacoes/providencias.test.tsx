// Providências sugeridas (CTF), referência legal, fonte da conferência prévia e embargos em pares, na tela do ponto.

import { fireEvent, render, screen, within } from '@testing-library/react';
import { ContextoArmazem, criarArmazem } from '../demandas/armazem.ts';
import { Operacoes } from './Operacoes.tsx';
import { alterarPonto, criarOperacao, incluirPontos, obterOperacoes } from './armazem.ts';
import { providenciasSugeridas, providenciasValidas } from './providencias.ts';
import { REFERENCIA_LEGAL } from './referencia-legal.ts';
import { validarListaOperacoes } from './regras.ts';

beforeEach(() => localStorage.clear());
const base = { municipio: 'Castanheira', notas: '', demandas: [] as string[], situacao: 'planejado' as const, tipoDano: 'Desmatamento químico', dataVistoria: '2026-10-07' };

function montar(extra: object = {}) {
  const r = criarOperacao({ nome: 'Brasnorte', inicio: '2026-10-05', fim: '2026-10-12', origem: '' }, '2026-09-01T00:00:00Z');
  if (!r.ok) throw new Error('operação não criada');
  incluirPontos(r.id, [{ ...base, numero: 1, coordenada: { lat: -12.1, lon: -58.2 }, ...extra } as never]);
  const armazem = criarArmazem(localStorage, { gerarId: () => 'x', exemplos: () => [] });
  render(<ContextoArmazem.Provider value={armazem}><Operacoes agora={() => new Date(2026, 10, 18, 10)} /></ContextoArmazem.Provider>);
  fireEvent.click(screen.getByRole('button', { name: 'Abrir Brasnorte' }));
  fireEvent.click(screen.getByRole('button', { name: 'Expandir todos' }));
  const p = obterOperacoes()[0].pontos[0];
  return { op: r.id, p, b: screen.getByTestId(`inspecao-${p.id}`) };
}

describe('regra do CTF', () => {
  it('CTF = Não: notificação de 24 h e auto de infração, com o texto do questionário', () => {
    const s = providenciasSugeridas({ conferenciaPrevia: { 'C-2.2': 'Não' } });
    expect(s.map((x) => x.id)).toEqual(['ctf-notificacao', 'ctf-auto']);
    expect(s[0]).toMatchObject({ tipo: 'Notificação', prazo: '24 horas', descricao: 'Apresentar Certificado de Regularidade do Cadastro Técnico Federal, de que trata o art. 17 da Lei nº 6.938/1981.' });
    expect(s[1]).toMatchObject({ tipo: 'Auto de infração', norma: 'decreto-6514-art-76', descricao: 'Deixar de se inscrever no Cadastro Técnico Federal de que trata o art. 17 da Lei nº 6.938/1981 – atividade código ___.' });
  });

  it('inscrito mas sem certificado atualizado: só a notificação; inscrito e regular: nada; campo prevalece sobre a prévia', () => {
    expect(providenciasSugeridas({ conferenciaPrevia: { 'C-2.2': 'Sim', 'C-2.2.3': 'Não' } }).map((x) => x.id)).toEqual(['ctf-notificacao']);
    expect(providenciasSugeridas({ conferenciaPrevia: { 'C-2.2': 'Sim', 'C-2.2.3': 'Sim' } })).toEqual([]);
    expect(providenciasSugeridas({})).toEqual([]);
    expect(providenciasSugeridas({ conferenciaPrevia: { 'C-2.2': 'Não' }, inspecao: { 'C-2.2': 'Sim' } })).toEqual([]);
  });

  it('a referência legal traz norma, artigo, texto, link e faixa de multa; sem data de conferência, a conferência não foi feita', () => {
    const art76 = REFERENCIA_LEGAL.find((n) => n.id === 'decreto-6514-art-76')!;
    expect(art76).toMatchObject({ norma: 'Decreto nº 6.514/2008', artigo: 'art. 76' });
    expect(art76.multa!.map((m) => m.valor)).toEqual(['R$ 50,00', 'R$ 150,00', 'R$ 900,00', 'R$ 1.800,00', 'R$ 9.000,00']);
    for (const n of REFERENCIA_LEGAL) { expect(n.link).toMatch(/^https:\/\//); expect(n.conferidaEm).toBeUndefined(); }
  });

  it('validação: só ids conhecidos e estados feito / nao-aplicavel', () => {
    expect(providenciasValidas({ 'ctf-auto': 'feito', 'ctf-notificacao': 'nao-aplicavel' })).toBe(true);
    expect(providenciasValidas({ 'ctf-auto': 'talvez' })).toBe(false);
    expect(providenciasValidas({ outra: 'feito' })).toBe(false);
  });
});

describe('tela', () => {
  it('providências aparecem em campo quando o CTF é "Não"; o fiscal marca feito / não aplicável e grava no ponto', () => {
    const { b, op, p } = montar();
    alterarPonto(op, p.id, { conferenciaPrevia: { 'C-2.2': 'Não' } });
    fireEvent.click(within(b).getByRole('button', { name: 'Em campo' }));
    const prov = within(b).getByTestId('providencias');
    expect(prov).toHaveTextContent('Notificação (prazo de 24 horas)');
    expect(prov).toHaveTextContent('Multa prevista, só como referência: R$ 50,00 (pessoa física)');
    expect(prov).toHaveTextContent('O sistema não lavra nada nem calcula multa');
    const auto = within(b).getByTestId('providencia-ctf-auto');
    fireEvent.click(within(auto).getByRole('button', { name: 'Feito' }));
    expect(obterOperacoes()[0].pontos[0].providencias).toEqual({ 'ctf-auto': 'feito' });
    fireEvent.click(within(auto).getByRole('button', { name: 'Não aplicável' }));
    expect(obterOperacoes()[0].pontos[0].providencias).toEqual({ 'ctf-auto': 'nao-aplicavel' });
    fireEvent.click(within(auto).getByRole('button', { name: 'Não aplicável' })); // clicar de novo desmarca
    expect(obterOperacoes()[0].pontos[0].providencias).toBeUndefined();
    expect(validarListaOperacoes(JSON.parse(JSON.stringify(obterOperacoes())))).toHaveLength(1);
  });

  it('sem CTF = Não não há providências', () => {
    const { b } = montar();
    fireEvent.click(within(b).getByRole('button', { name: 'Em campo' }));
    expect(within(b).queryByTestId('providencias')).toBeNull();
  });

  it('fonte da conferência: lista fechada, "Outra" abre o texto; só na fase prévia e só depois de responder', () => {
    const { b } = montar();
    expect(within(b).queryByLabelText(/^C-2\.2@fonte\./)).toBeNull();
    fireEvent.change(within(b).getByLabelText(/^C-2\.2\. A propriedade/), { target: { value: 'Não' } });
    const fonte = within(b).getByLabelText(/^C-2\.2@fonte\. Fonte da conferência/);
    expect([...(fonte as HTMLSelectElement).options].map((o) => o.text).filter((t) => t !== 'Sem resposta')).toEqual(['SIGA', 'SIMCAR', 'Geoportal SEMA-MT', 'Consulta pública CTF/IBAMA', 'SISDEV/INDEA', 'Sistema de outorga', 'Outra (especificar)']);
    fireEvent.change(fonte, { target: { value: 'Outra (especificar)' } });
    fireEvent.change(within(b).getByLabelText(/^C-2\.2@fonte\.outra\./), { target: { value: 'ofício 12/2026' } });
    expect(obterOperacoes()[0].pontos[0].conferenciaPrevia).toEqual({ 'C-2.2': 'Não', 'C-2.2@fonte': 'Outra (especificar)', 'C-2.2@fonte.outra': 'ofício 12/2026' });
    fireEvent.click(within(b).getByRole('button', { name: 'Em campo' }));
    expect(within(b).queryByLabelText(/@fonte/)).toBeNull();
  });

  it('embargos em pares: um par de início; "+ Adicionar embargo" abre o seguinte, até 10; "Outro" pede o texto', () => {
    const { b } = montar();
    fireEvent.click(within(b).getByRole('button', { name: 'Em campo' }));
    expect(within(b).queryByRole('button', { name: '+ Adicionar embargo' })).toBeNull();
    fireEvent.change(within(b).getByLabelText(/^C-2\.13\. Embargos/), { target: { value: 'Sim' } });
    expect(within(b).getByLabelText(/^C-2\.13\.1\.1\./)).toBeInTheDocument();
    expect(within(b).queryByLabelText(/^C-2\.13\.2\.1\./)).toBeNull();
    fireEvent.change(within(b).getByLabelText(/^C-2\.13\.1\.2\./), { target: { value: 'Outro' } });
    expect(within(b).getByLabelText(/^C-2\.13\.1\.3\./)).toBeInTheDocument();
    for (let k = 2; k <= 10; k++) {
      fireEvent.click(within(b).getByRole('button', { name: '+ Adicionar embargo' }));
      expect(within(b).getByLabelText(new RegExp(`^C-2\\.13\\.${k}\\.1\\.`))).toBeInTheDocument();
    }
    expect(within(b).getByRole('button', { name: '+ Adicionar embargo' })).toBeDisabled();
    fireEvent.change(within(b).getByLabelText(/^C-2\.13\.10\.1\./), { target: { value: '99/2026' } });
    expect(obterOperacoes()[0].pontos[0].inspecao).toMatchObject({ 'C-2.13.1.2': 'Outro', 'C-2.13.10.1': '99/2026' });
  });

  it('pares já respondidos aparecem ao reabrir a inspeção', () => {
    const { b, op, p } = montar();
    alterarPonto(op, p.id, { inspecao: { 'C-2.13': 'Sim', 'C-2.13.1.1': '1', 'C-2.13.1.2': 'IBAMA', 'C-2.13.3.1': '3' } });
    fireEvent.click(within(b).getByRole('button', { name: 'Em campo' }));
    expect(within(b).getByLabelText(/^C-2\.13\.3\.1\./)).toBeInTheDocument();
  });
});
