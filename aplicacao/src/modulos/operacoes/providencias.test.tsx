// Providências sugeridas (CTF), referência legal, fonte da conferência prévia e embargos em pares, na tela do ponto.

import { fireEvent, render, screen, within } from '@testing-library/react';
import { ContextoArmazem, criarArmazem } from '../demandas/armazem.ts';
import { Operacoes } from './Operacoes.tsx';
import { alterarPonto, criarOperacao, incluirPontos, obterOperacoes } from './armazem.ts';
import { lavradosValidos, providenciasSugeridas, providenciasValidas } from './providencias.ts';
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

describe('regra do CTF (lembretes de procedimento, sem base legal)', () => {
  it('inscrito sem certificado atualizado: notificar (24 h), antes da autuação', () => {
    const s = providenciasSugeridas({ conferenciaPrevia: { 'C-2.2': 'Sim', 'C-2.2.3': 'Não' } });
    expect(s.map((x) => x.id)).toEqual(['ctf-notificacao']);
    expect(s[0].texto).toBe('Notificar para apresentação do certificado de regularidade do CTF (prazo 24 h), antes da autuação.');
  });

  it('sem inscrição no CTF: avaliar autuação no SIGA Autuação; inscrito e regular ou sem resposta: nada; campo prevalece sobre a prévia', () => {
    expect(providenciasSugeridas({ conferenciaPrevia: { 'C-2.2': 'Não' } }).map((x) => x.texto)).toEqual(['Avaliar autuação no SIGA Autuação.']);
    expect(providenciasSugeridas({ conferenciaPrevia: { 'C-2.2': 'Sim', 'C-2.2.3': 'Sim' } })).toEqual([]);
    expect(providenciasSugeridas({})).toEqual([]);
    expect(providenciasSugeridas({ conferenciaPrevia: { 'C-2.2': 'Não' }, inspecao: { 'C-2.2': 'Sim' } })).toEqual([]);
  });

  it('nenhuma providência cita norma, artigo ou valor', () => {
    for (const c of [{ 'C-2.2': 'Não' }, { 'C-2.2': 'Sim', 'C-2.2.3': 'Não' }] as Record<string, string>[]) {
      for (const pv of providenciasSugeridas({ conferenciaPrevia: c })) expect(JSON.stringify(pv)).not.toMatch(/R\$|art\.|Decreto|Lei n/);
    }
  });

  it('validação: estados por providência; lavrados são listas de números de auto, notificacao e embargo', () => {
    expect(providenciasValidas({ 'ctf-auto': 'autuado', 'ctf-notificacao': 'nao-aplicavel' })).toBe(true);
    expect(providenciasValidas({ 'ctf-auto': 'nao-autuado' })).toBe(true);
    expect(providenciasValidas({ 'ctf-auto': 'feito' })).toBe(false);
    expect(providenciasValidas({ 'ctf-notificacao': 'autuado' })).toBe(false);
    expect(providenciasValidas({ 'ctf-auto': 'talvez' })).toBe(false);
    expect(providenciasValidas({ outra: 'feito' })).toBe(false);
    expect(lavradosValidos({ notificacao: ['1'], auto: ['2', '3'], embargo: ['4'] })).toBe(true);
    expect(lavradosValidos({ multa: ['1'] })).toBe(false);
    expect(lavradosValidos({ auto: '2' })).toBe(false);
    expect(lavradosValidos({ auto: [] })).toBe(false);
    expect(lavradosValidos({ auto: [''] })).toBe(false);
  });
});

describe('tela', () => {
  it('providências aparecem em campo quando o CTF é "Não"; o fiscal marca feito / não aplicável e grava no ponto', () => {
    const { b, op, p } = montar();
    alterarPonto(op, p.id, { conferenciaPrevia: { 'C-2.2': 'Não' } });
    fireEvent.click(within(b).getByRole('button', { name: 'Em campo' }));
    const prov = within(b).getByTestId('providencias');
    expect(prov).toHaveTextContent('Avaliar autuação no SIGA Autuação.');
    expect(prov).toHaveTextContent('Enquadramento e multa ficam no SIGA Autuação');
    expect(prov.textContent).not.toMatch(/R\$|art\.|Decreto|Lei n/);
    const auto = within(b).getByTestId('providencia-ctf-auto');
    expect(within(auto).queryByRole('button', { name: 'Feito' })).toBeNull();
    fireEvent.click(within(auto).getByRole('button', { name: 'Autuado' }));
    expect(obterOperacoes()[0].pontos[0].providencias).toEqual({ 'ctf-auto': 'autuado' });
    fireEvent.click(within(auto).getByRole('button', { name: 'Não autuado' }));
    expect(obterOperacoes()[0].pontos[0].providencias).toEqual({ 'ctf-auto': 'nao-autuado' });
    fireEvent.click(within(auto).getByRole('button', { name: 'Não aplicável' }));
    expect(obterOperacoes()[0].pontos[0].providencias).toEqual({ 'ctf-auto': 'nao-aplicavel' });
    fireEvent.click(within(auto).getByRole('button', { name: 'Não aplicável' })); // clicar de novo desmarca
    expect(obterOperacoes()[0].pontos[0].providencias).toBeUndefined();
    expect(validarListaOperacoes(JSON.parse(JSON.stringify(obterOperacoes())))).toHaveLength(1);
  });

  it('documentos lavrados são do ponto: editados junto do resultado, vários n.º por tipo; vazio apaga', () => {
    montar();
    fireEvent.click(screen.getByRole('button', { name: 'Registrar resultado do Ponto 1' }));
    const form = screen.getByRole('form', { name: 'Resultado do Ponto 1' });
    fireEvent.change(within(form).getByLabelText('Resultado (fiscalizado/autuado)'), { target: { value: 'sim' } });
    fireEvent.change(within(form).getByLabelText('Auto(s) de infração: n.º'), { target: { value: '77; 78/2026' } });
    fireEvent.change(within(form).getByLabelText('Termo(s) de embargo: n.º'), { target: { value: '5' } });
    fireEvent.click(within(form).getByRole('button', { name: 'Salvar resultado' }));
    expect(obterOperacoes()[0].pontos[0].lavrados).toEqual({ auto: ['77', '78/2026'], embargo: ['5'] });
    expect(validarListaOperacoes(JSON.parse(JSON.stringify(obterOperacoes())))).toHaveLength(1);
    fireEvent.click(screen.getByRole('button', { name: 'Editar resultado do Ponto 1' }));
    const f2 = screen.getByRole('form', { name: 'Resultado do Ponto 1' });
    expect(within(f2).getByLabelText('Auto(s) de infração: n.º')).toHaveValue('77; 78/2026');
    fireEvent.change(within(f2).getByLabelText('Auto(s) de infração: n.º'), { target: { value: '' } });
    fireEvent.change(within(f2).getByLabelText('Termo(s) de embargo: n.º'), { target: { value: '' } });
    fireEvent.click(within(f2).getByRole('button', { name: 'Salvar resultado' }));
    expect(obterOperacoes()[0].pontos[0].lavrados).toBeUndefined();
  });

  it('sem CTF = Não não há providências', () => {
    const { b } = montar();
    fireEvent.click(within(b).getByRole('button', { name: 'Em campo' }));
    expect(within(b).queryByTestId('providencia-ctf-auto')).toBeNull();
    expect(within(b).queryByTestId('providencia-ctf-notificacao')).toBeNull();
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
