import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ContextoArmazem, criarArmazem } from '../demandas/armazem.ts';
import { PainelAssistente } from '../assistente/PainelAssistente.tsx';
import { limparConversa } from '../assistente/conversa.ts';
import { Agenda } from './Agenda.tsx';
import { criarCompromisso, obterCompromissos, obterRascunho } from './compromissos.ts';

// Sábado, 21/11/2026, 10h (horário local).
let instante = new Date(2026, 10, 21, 10, 0);
const agora = () => instante;
const armazemVazio = () => criarArmazem(localStorage, { gerarId: () => 'x', exemplos: () => [] });

function montarAgenda() {
  render(<ContextoArmazem.Provider value={armazemVazio()}><Agenda agora={agora} /></ContextoArmazem.Provider>);
}
function montarPainel() {
  render(<ContextoArmazem.Provider value={armazemVazio()}><PainelAssistente agora={agora} /></ContextoArmazem.Provider>);
}
const enviar = (comando: string) => {
  fireEvent.change(screen.getByLabelText('Mensagem ao assistente'), { target: { value: comando } });
  fireEvent.click(screen.getByRole('button', { name: 'Enviar' }));
};
const preencher = (rotulo: RegExp, valor: string) => fireEvent.change(screen.getByLabelText(rotulo), { target: { value: valor } });

beforeEach(() => {
  localStorage.clear();
  limparConversa();
  instante = new Date(2026, 10, 21, 10, 0);
  window.location.hash = '#/agenda';
});
afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });

describe('Agenda: compromissos', () => {
  it('mostra o compromisso do dia escolhido, com hora e tipo, junto das outras coisas', () => {
    criarCompromisso({ tipo: 'reunião', data: '2026-11-21', hora: '14:30', assunto: 'licenciamento' }, instante.toISOString());
    criarCompromisso({ tipo: 'curso', data: '2026-11-21', assunto: 'georreferenciamento' }, instante.toISOString());
    montarAgenda();
    const dia = screen.getByTestId('agenda-dia-escolhido');
    expect(dia).toHaveTextContent('Dia todo · Curso — georreferenciamento');
    expect(dia).toHaveTextContent('14:30 · Reunião — licenciamento');
    expect(screen.getByTestId('dia-2026-11-21')).toHaveTextContent('14:30 Reunião — licenciamento');
  });

  it('cria pelo formulário; erro de validação não grava', () => {
    montarAgenda();
    fireEvent.click(screen.getByRole('button', { name: 'Novo compromisso ou lembrete' }));
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Informe o assunto.');
    expect(obterCompromissos()).toEqual([]);
    preencher(/^Tipo/, 'palestra');
    preencher(/^Data de início/, '2026-11-25');
    fireEvent.click(screen.getByLabelText('Dia inteiro'));
    preencher(/^Hora/, '09:15');
    preencher(/^Assunto/, 'fiscalização');
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));
    expect(obterCompromissos()).toMatchObject([{ tipo: 'palestra', data: '2026-11-25', hora: '09:15', assunto: 'fiscalização' }]);
    expect(screen.queryByTestId('formulario-compromisso')).toBeNull();
    expect(screen.getByRole('status')).toHaveTextContent('Compromisso anotado.');
  });

  it('edita um compromisso existente', () => {
    criarCompromisso({ tipo: 'reunião', data: '2026-11-21', assunto: 'velho' }, instante.toISOString());
    montarAgenda();
    fireEvent.click(screen.getByRole('button', { name: 'Editar' }));
    expect(screen.getByLabelText(/^Assunto/)).toHaveValue('velho');
    preencher(/^Assunto/, 'novo');
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));
    expect(obterCompromissos()[0].assunto).toBe('novo');
  });

  it('excluir pede confirmação: recusar mantém, aceitar exclui só aquele', () => {
    criarCompromisso({ tipo: 'reunião', data: '2026-11-21', assunto: 'um' }, instante.toISOString());
    criarCompromisso({ tipo: 'reunião', data: '2026-11-21', assunto: 'dois' }, instante.toISOString());
    montarAgenda();
    fireEvent.click(screen.getAllByRole('button', { name: 'Editar' })[0]);
    const confirmar = vi.spyOn(window, 'confirm').mockReturnValueOnce(false).mockReturnValueOnce(true);
    fireEvent.click(screen.getByRole('button', { name: 'Excluir' }));
    expect(obterCompromissos()).toHaveLength(2);
    fireEvent.click(screen.getByRole('button', { name: 'Excluir' }));
    expect(confirmar).toHaveBeenCalledTimes(2);
    expect(obterCompromissos().map((c) => c.assunto)).toEqual(['dois']);
  });

  it('concluir risca o item e reabrir desfaz', () => {
    criarCompromisso({ tipo: 'reunião', data: '2026-11-21', assunto: 'um' }, instante.toISOString());
    montarAgenda();
    fireEvent.click(screen.getByRole('button', { name: 'Concluir' }));
    expect(screen.getByTestId('agenda-dia-escolhido')).toHaveTextContent('(concluído)');
    fireEvent.click(screen.getByRole('button', { name: 'Reabrir' }));
    expect(obterCompromissos()[0].concluido).toBeUndefined();
  });

  it('evento de vários dias aparece em todos os dias do intervalo, com "Dia n de total"', () => {
    criarCompromisso({ tipo: 'curso', data: '2026-11-24', dataFim: '2026-11-26', assunto: 'geoprocessamento' }, instante.toISOString());
    montarAgenda();
    expect(screen.getByTestId('dia-2026-11-23')).not.toHaveTextContent('geoprocessamento');
    expect(screen.getByTestId('dia-2026-11-24')).toHaveTextContent('Curso — geoprocessamento (1/3)');
    expect(screen.getByTestId('dia-2026-11-25')).toHaveTextContent('(2/3)');
    expect(screen.getByTestId('dia-2026-11-26')).toHaveTextContent('(3/3)');
    expect(screen.getByTestId('dia-2026-11-27')).not.toHaveTextContent('geoprocessamento');
    fireEvent.click(screen.getByTestId('dia-2026-11-25'));
    expect(screen.getByTestId('agenda-dia-escolhido')).toHaveTextContent('Dia todo · Curso — geoprocessamento · Dia 2 de 3');
  });

  it('série semanal aparece em cada semana, e concluir uma ocorrência não conclui as outras', () => {
    criarCompromisso({ tipo: 'reunião', data: '2026-11-23', hora: '09:00', assunto: 'alinhamento', repeticao: 'semanal' }, instante.toISOString());
    montarAgenda();
    expect(screen.getByTestId('dia-2026-11-23')).toHaveTextContent('09:00 ↻ Reunião — alinhamento');
    expect(screen.getByTestId('dia-2026-11-30')).toHaveTextContent('↻ Reunião — alinhamento');
    expect(screen.getByTestId('dia-2026-11-24')).not.toHaveTextContent('alinhamento');
    fireEvent.click(screen.getByTestId('dia-2026-11-30'));
    expect(screen.getByTestId('agenda-dia-escolhido')).toHaveTextContent('↻ toda segunda');
    fireEvent.click(screen.getByRole('button', { name: 'Concluir' }));
    expect(obterCompromissos()[0]).toMatchObject({ concluidasEm: ['2026-11-30'] });
    expect(obterCompromissos()[0].concluido).toBeUndefined();
    expect(screen.getByTestId('agenda-dia-escolhido')).toHaveTextContent('(concluído)');
    fireEvent.click(screen.getByTestId('dia-2026-11-23'));
    expect(screen.getByTestId('agenda-dia-escolhido')).not.toHaveTextContent('(concluído)');
    fireEvent.click(screen.getByTestId('dia-2026-11-30'));
    fireEvent.click(screen.getByRole('button', { name: 'Reabrir' }));
    expect(obterCompromissos()[0].concluidasEm).toBeUndefined();
  });

  it('a série respeita "repetir até" e continua nos meses seguintes ao navegar', () => {
    criarCompromisso({ tipo: 'lembrete', data: '2026-11-23', assunto: 'ponto', repeticao: 'semanal', repetirAte: '2026-12-07' }, instante.toISOString());
    montarAgenda();
    expect(screen.getByTestId('dia-2026-11-30')).toHaveTextContent('ponto');
    fireEvent.click(screen.getByRole('button', { name: 'Próximo mês' }));
    expect(screen.getByTestId('dia-2026-12-07')).toHaveTextContent('ponto');
    expect(screen.getByTestId('dia-2026-12-14')).not.toHaveTextContent('ponto');
  });

  it('formulário: a data de fim acompanha a de início até ser editada; dia inteiro esconde a hora', () => {
    montarAgenda();
    fireEvent.click(screen.getByRole('button', { name: 'Novo compromisso ou lembrete' }));
    expect(screen.queryByLabelText(/^Hora/)).toBeNull();
    preencher(/^Data de início/, '2026-12-01');
    expect(screen.getByLabelText(/^Data de fim/)).toHaveValue('2026-12-01');
    preencher(/^Data de fim/, '2026-12-03');
    preencher(/^Data de início/, '2026-12-02');
    expect(screen.getByLabelText(/^Data de fim/)).toHaveValue('2026-12-03');
    expect(screen.getByTestId('formulario-semana-do-mes')).toHaveTextContent('1ª semana de dez');
    preencher(/^Assunto/, 'curso');
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));
    expect(obterCompromissos()).toMatchObject([{ data: '2026-12-02', dataFim: '2026-12-03', assunto: 'curso' }]);
  });

  it('formulário: repetição semanal com "repetir até"; fim antes do início dá erro', () => {
    montarAgenda();
    fireEvent.click(screen.getByRole('button', { name: 'Novo compromisso ou lembrete' }));
    preencher(/^Assunto/, 'ponto');
    preencher(/^Data de início/, '2026-12-07');
    preencher(/^Repetição/, 'semanal');
    preencher(/^Repetir até/, '2026-12-28');
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));
    expect(obterCompromissos()).toMatchObject([{ data: '2026-12-07', repeticao: 'semanal', repetirAte: '2026-12-28' }]);
  });

  it('formulário: vários dias com hora e repetição é recusado', () => {
    montarAgenda();
    fireEvent.click(screen.getByRole('button', { name: 'Novo compromisso ou lembrete' }));
    preencher(/^Assunto/, 'x');
    preencher(/^Data de início/, '2026-12-07');
    preencher(/^Data de fim/, '2026-12-09');
    fireEvent.click(screen.getByLabelText('Dia inteiro'));
    preencher(/^Hora/, '09:00');
    preencher(/^Repetição/, 'diaria');
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));
    expect(screen.getByRole('alert')).toHaveTextContent('vários dias com hora não pode se repetir');
    expect(obterCompromissos()).toEqual([]);
  });

  it('série: "Excluir a série" e "Encerrar a série antes de" pedem confirmação', () => {
    criarCompromisso({ tipo: 'reunião', data: '2026-11-23', assunto: 'alinhamento', repeticao: 'semanal' }, instante.toISOString());
    montarAgenda();
    fireEvent.click(screen.getByTestId('dia-2026-11-30'));
    fireEvent.click(screen.getByRole('button', { name: /Editar/ }));
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    fireEvent.click(screen.getByRole('button', { name: 'Encerrar a série antes de 30/11/2026' }));
    expect(obterCompromissos()[0].repetirAte).toBeUndefined();
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    fireEvent.click(screen.getByRole('button', { name: 'Encerrar a série antes de 30/11/2026' }));
    expect(obterCompromissos()[0]).toMatchObject({ repetirAte: '2026-11-29' });
    fireEvent.click(screen.getByTestId('dia-2026-11-23'));
    fireEvent.click(screen.getByRole('button', { name: /Editar/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Excluir a série' }));
    expect(obterCompromissos()).toEqual([]);
  });

  it('mostra a semana do mês do dia escolhido', () => {
    montarAgenda();
    expect(screen.getByTestId('agenda-semana-do-mes')).toHaveTextContent('3ª semana de nov');
    fireEvent.click(screen.getByTestId('dia-2026-11-30'));
    expect(screen.getByTestId('agenda-semana-do-mes')).toHaveTextContent('5ª semana de nov');
  });

  it('"Corrigir" do assistente abre o formulário já preenchido e limpa o endereço e o rascunho', () => {
    montarPainel();
    enviar('reunião dia 10/12 às 9h sobre licenciamento');
    expect(obterRascunho()).not.toBeNull();
    const rota = screen.getByRole('button', { name: 'Corrigir' });
    expect(rota).toBeInTheDocument();
    // O botão navega para a rota; aqui basta aplicá-la ao endereço, como o navegador faria.
    const partes = ['reunião', '2026-12-10', '09:00', '', 'licenciamento'].join('|');
    window.location.hash = `#/agenda?novo=${encodeURIComponent(partes)}`;
    montarAgenda();
    expect(screen.getByTestId('formulario-compromisso')).toBeInTheDocument();
    expect(screen.getByLabelText(/^Data de início/)).toHaveValue('2026-12-10');
    expect(screen.getByLabelText(/^Hora/)).toHaveValue('09:00');
    expect(screen.getByLabelText(/^Assunto/)).toHaveValue('licenciamento');
    expect(window.location.hash).toBe('#/agenda');
    expect(obterRascunho()).toBeNull();
    expect(obterCompromissos()).toEqual([]);
  });
});

describe('conversa: do pedido à gravação (cliques reais nos botões)', () => {
  it('Confirmar grava em guara:compromissos:v1 e o compromisso aparece na Agenda em 10/12/2026', () => {
    montarPainel();
    enviar('reunião dia 10/12 sobre licenciamento');
    expect(screen.getByText(/Vou anotar: Reunião — licenciamento · quinta, 10\/12\/2026 · dia todo\./)).toBeInTheDocument();
    expect(screen.getByText(/inferência · fonte: interpretação da frase por regras; confira/)).toBeInTheDocument();
    expect(localStorage.getItem('guara:compromissos:v1')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar' }));
    expect(JSON.parse(localStorage.getItem('guara:compromissos:v1')!)).toMatchObject([{ tipo: 'reunião', data: '2026-12-10', assunto: 'licenciamento' }]);
    expect(screen.getByText(/Anotado: Reunião — licenciamento/)).toBeInTheDocument();
    // O botão não pode ter virado texto de conversa classificado como outro comando.
    expect(screen.queryByText(/Nada marcado/)).toBeNull();
    expect(screen.queryByText('confirmar compromisso')).toBeNull();
    cleanup();
    instante = new Date(2026, 11, 10, 10, 0);
    montarAgenda();
    expect(screen.getByTestId('agenda-dia-escolhido')).toHaveTextContent('Reunião — licenciamento');
  });

  it('o Confirmar não depende do texto do botão: vale mesmo se o texto do comando fosse outro', () => {
    montarPainel();
    enviar('reunião dia 10/12 sobre licenciamento');
    const guardada = JSON.parse(localStorage.getItem('guara:conversa:v1')!);
    const confirmar = JSON.stringify(guardada).includes('"acao":{"tipo":"confirmar-compromisso"');
    expect(confirmar).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar' }));
    expect(obterCompromissos()).toHaveLength(1);
  });

  it('Cancelar não grava nada e limpa o rascunho', () => {
    montarPainel();
    enviar('curso amanhã');
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(localStorage.getItem('guara:compromissos:v1')).toBeNull();
    expect(obterRascunho()).toBeNull();
    expect(screen.getByText('Cancelado. Nada foi gravado.')).toBeInTheDocument();
  });

  it('Corrigir abre o formulário da Agenda já preenchido, sem gravar', () => {
    montarPainel();
    enviar('reunião dia 10/12 às 9h sobre licenciamento');
    fireEvent.click(screen.getByRole('button', { name: 'Corrigir' }));
    expect(window.location.hash).toMatch(/^#\/agenda\?novo=/);
    expect(obterCompromissos()).toEqual([]);
    cleanup();
    montarAgenda();
    expect(screen.getByTestId('formulario-compromisso')).toBeInTheDocument();
    expect(screen.getByLabelText(/^Data de início/)).toHaveValue('2026-12-10');
    expect(screen.getByLabelText(/^Hora/)).toHaveValue('09:00');
    expect(screen.getByLabelText(/^Assunto/)).toHaveValue('licenciamento');
    expect(obterCompromissos()).toEqual([]);
  });

  it('Corrigir de uma repetição com fim abre o formulário com repetição e "repetir até"', () => {
    montarPainel();
    enviar('reunião toda segunda até 20/12 sobre alinhamento');
    fireEvent.click(screen.getByRole('button', { name: 'Corrigir' }));
    expect(window.location.hash).toMatch(/&rep=semanal&ate=2026-12-20$/);
    cleanup();
    montarAgenda();
    expect(screen.getByLabelText(/^Data de início/)).toHaveValue('2026-11-23');
    expect(screen.getByLabelText(/^Repetição/)).toHaveValue('semanal');
    expect(screen.getByLabelText(/^Repetir até/)).toHaveValue('2026-12-20');
    expect(obterCompromissos()).toEqual([]);
  });

  it('o comando "o que tenho hoje" lista os compromissos', () => {
    criarCompromisso({ tipo: 'reunião', data: '2026-11-21', hora: '14:30', assunto: 'licenciamento' }, instante.toISOString());
    montarPainel();
    enviar('o que tenho hoje?');
    expect(screen.getByText(/Agenda hoje:/)).toHaveTextContent('• 14:30 Reunião — licenciamento');
  });
});

describe('aviso no dia (relógio controlado)', () => {
  const aba = () => fireEvent.click(screen.getByRole('tab', { name: /^Avisos/ }));

  it('aparece às 8h do dia, sozinho, e some com Concluído', () => {
    vi.useFakeTimers();
    instante = new Date(2026, 11, 10, 7, 59, 40);
    vi.setSystemTime(instante);
    criarCompromisso({ tipo: 'reunião', data: '2026-12-10', assunto: 'licenciamento' }, instante.toISOString());
    montarPainel();
    aba();
    expect(screen.queryByTestId(/^compromisso-/)).toBeNull();
    act(() => { instante = new Date(2026, 11, 10, 8, 0, 10); vi.setSystemTime(instante); vi.advanceTimersByTime(30_000); });
    const aviso = screen.getByTestId(/^compromisso-/);
    expect(aviso).toHaveTextContent('Compromisso: Reunião — licenciamento · hoje · dia todo');
    expect(aviso).toHaveClass('aviso-compromisso');
    expect(screen.getByRole('tab', { name: /^Avisos/ })).toHaveAccessibleName(/1/);
    fireEvent.click(within(aviso).getByRole('button', { name: 'Concluído' }));
    expect(screen.queryByTestId(/^compromisso-/)).toBeNull();
    expect(obterCompromissos()[0].concluido).toBe(true);
  });

  it('com hora marcada: "Ciente" some até a hora; "Em 2 horas" volta depois', () => {
    vi.useFakeTimers();
    instante = new Date(2026, 11, 10, 9, 0);
    vi.setSystemTime(instante);
    criarCompromisso({ tipo: 'palestra', data: '2026-12-10', hora: '14:30', assunto: 'fiscalização' }, instante.toISOString());
    montarPainel();
    aba();
    fireEvent.click(within(screen.getByTestId(/^compromisso-/)).getByRole('button', { name: 'Ciente' }));
    expect(screen.queryByTestId(/^compromisso-/)).toBeNull();
    act(() => { instante = new Date(2026, 11, 10, 14, 30, 5); vi.setSystemTime(instante); vi.advanceTimersByTime(30_000); });
    const aviso = screen.getByTestId(/^compromisso-/);
    expect(aviso).toHaveTextContent('Palestra — fiscalização · hoje às 14:30');
    fireEvent.click(within(aviso).getByRole('button', { name: 'Em 2 horas' }));
    expect(screen.queryByTestId(/^compromisso-/)).toBeNull();
    act(() => { instante = new Date(2026, 11, 10, 16, 31); vi.setSystemTime(instante); vi.advanceTimersByTime(30_000); });
    expect(screen.getByTestId(/^compromisso-/)).toBeInTheDocument();
  });
});
