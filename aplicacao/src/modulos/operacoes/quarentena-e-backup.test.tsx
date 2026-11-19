// Proteção de dados digitados: o que não pode ser lido vai para a quarentena (ponto ou global), nunca é descartado;
// backup exportar → limpar → importar devolve tudo igual; lembrete do mascote com backup velho.

import { fireEvent, render, screen } from '@testing-library/react';
import { ContextoArmazem, criarArmazem } from '../demandas/armazem.ts';
import { avisoDeBackup } from '../assistente/avisos.ts';
import { SecaoBackup } from '../configuracoes/SecaoBackup.tsx';
import { Operacoes } from './Operacoes.tsx';
import { criarOperacao, incluirPontos, obterOperacoes, alterarPonto } from './armazem.ts';
import { CHAVE_OPERACOES } from './modelo.ts';
import { CHAVE_QUARENTENA, lerQuarentena } from './quarentena.ts';
import { lerUltimoBackup } from '../../compartilhado/ultimo-backup.ts';
import { CHAVE_AUTHKEY } from './sugestao-vegetacao.ts';
import { CHAVE_FERIADOS } from '../alertas/feriados-locais.ts';
import { incluirAtalho, obterAtalhos } from '../atalhos/atalhos.ts';
import { incluirContato, obterContatos } from '../atalhos/contatos.ts';
import { nomeDaCopia } from '../configuracoes/backup.ts';

const COORD = { lat: -12.5, lon: -58.7 };
const clicar = (nome: string | RegExp) => fireEvent.click(screen.getByRole('button', { name: nome }));

beforeEach(() => { localStorage.clear(); vi.restoreAllMocks(); vi.spyOn(console, 'warn').mockImplementation(() => {}); });

function operacaoComPonto(nome = 'Brasnorte') {
  const r = criarOperacao({ nome, inicio: '', fim: '', origem: '' }, '2026-09-01T00:00:00Z');
  if (!r.ok) throw new Error('operação');
  incluirPontos(r.id, [{ coordenada: COORD, municipio: nome, notas: 'nota do campo', demandas: [], situacao: 'planejado' }]);
  return r.id;
}

/** Regrava o JSON como se tivesse sido gravado por outra versão ou corrompido. */
function adulterar(f: (lista: any[]) => void) {
  const lista = JSON.parse(localStorage.getItem(CHAVE_OPERACOES)!);
  f(lista);
  localStorage.setItem(CHAVE_OPERACOES, JSON.stringify(lista));
}

describe('dados digitados inválidos: ponto abre, conteúdo vai para a quarentena do ponto', () => {
  it('POP corrompido não derruba a operação e fica recuperável; as outras partes do ponto seguem normais', () => {
    operacaoComPonto();
    const pop = { 'A-1': { quebrado: true }, 'ZZ-9': 'x' };
    adulterar((l) => { l[0].pontos[0].caracterizacao = pop; l[0].pontos[0].observacao = 'x'.repeat(5000); });
    const [op] = obterOperacoes();
    expect(op).toBeDefined();
    const p = op.pontos[0];
    expect(p.caracterizacao).toBeUndefined();
    expect(p.observacao).toBeUndefined();
    expect(p.quarentena).toEqual({ caracterizacao: pop, observacao: 'x'.repeat(5000) });
    expect(p.notas).toBe('nota do campo');
    // continua editável, e a quarentena sobrevive à próxima gravação
    expect(alterarPonto(op.id, p.id, { notas: 'outra nota' })).toBeNull();
    const salvo = JSON.parse(localStorage.getItem(CHAVE_OPERACOES)!)[0].pontos[0];
    expect(salvo.quarentena.caracterizacao).toEqual(pop);
    expect(salvo.notas).toBe('outra nota');
  });

  it('notas, resultado, anotações e bloqueio inválidos também vão para a quarentena', () => {
    operacaoComPonto();
    adulterar((l) => {
      Object.assign(l[0].pontos[0], { notas: 42, resultado: 'inventado', anotacoes: 'lixo', bloqueio: { motivo: 'x' } });
    });
    const p = obterOperacoes()[0].pontos[0];
    expect(p.notas).toBe('');
    expect(Object.keys(p.quarentena ?? {}).sort()).toEqual(['anotacoes', 'bloqueio', 'notas', 'resultado']);
    expect(p.quarentena?.notas).toBe(42);
  });

  it('a tela mostra "Há dados que não puderam ser lidos" e o Ver/recuperar exibe o conteúdo bruto', () => {
    operacaoComPonto();
    adulterar((l) => { l[0].pontos[0].caracterizacao = { 'A-1': { quebrado: true } }; });
    const armazem = criarArmazem(localStorage, { gerarId: () => 'x', exemplos: () => [] });
    render(<ContextoArmazem.Provider value={armazem}><Operacoes agora={() => new Date(2026, 10, 18, 10)} /></ContextoArmazem.Provider>);
    clicar('Abrir Brasnorte');
    expect(screen.getByText(/Há dados que não puderam ser lidos: caracterizacao/)).toBeInTheDocument();
    clicar('Ver/recuperar');
    const area = screen.getByLabelText(/Conteúdo não lido: caracterizacao/) as HTMLTextAreaElement;
    expect(JSON.parse(area.value)).toEqual({ 'A-1': { quebrado: true } });
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    clicar('Descartar');
    expect(obterOperacoes()[0].pontos[0].quarentena).toBeUndefined();
  });
});

describe('quarentena global: operação ilegível não se perde', () => {
  it('estrutura básica inválida: a operação não abre, mas o bruto fica guardado e sobrevive a gravações', () => {
    operacaoComPonto('Boa');
    const ruim = { id: 'op-ruim', nome: '', pontos: 'não é lista', criadaEm: 'ontem' };
    adulterar((l) => l.push(ruim));
    expect(obterOperacoes().map((o) => o.nome)).toEqual(['Boa']);
    expect(lerQuarentena()).toHaveLength(1);
    expect(JSON.parse(lerQuarentena()[0].bruto)).toEqual(ruim);
    operacaoComPonto('Outra'); // a gravação reescreve a lista sem a ruim
    expect(JSON.parse(localStorage.getItem(CHAVE_OPERACOES)!).some((o: { id: string }) => o.id === 'op-ruim')).toBe(false);
    expect(JSON.parse(lerQuarentena()[0].bruto)).toEqual(ruim);
    expect(lerQuarentena()).toHaveLength(1); // sem duplicar a cada leitura
  });

  it('JSON ilegível: o texto bruto vai para a quarentena antes de ser sobrescrito', () => {
    localStorage.setItem(CHAVE_OPERACOES, '{"quebrado": [');
    expect(obterOperacoes()).toEqual([]);
    expect(lerQuarentena()[0].bruto).toBe('{"quebrado": [');
    expect(JSON.parse(localStorage.getItem(CHAVE_QUARENTENA)!)).toHaveLength(1);
  });
});

describe('backup: exportar → limpar → importar', () => {
  function montar() {
    const armazem = criarArmazem(localStorage, { gerarId: () => 'x', exemplos: () => [] });
    const r = armazem.criar({ titulo: 'Demanda A', descricao: '', responsavel: 'Ana', prioridade: 'Média', status: 'A Fazer', prazo: '2026-12-01', processo: 'FIC-001/2026' });
    if (!r.ok) throw new Error(JSON.stringify(r));
    return armazem;
  }

  it('devolve operações e demandas iguais; a prévia diz o que vai entrar; backup antigo é lembrado', async () => {
    const armazem = montar();
    const id = operacaoComPonto();
    adulterar((l) => { l[0].pontos[0].caracterizacao = { lixo: 1 }; }); // quarentena do ponto também volta
    const opsAntes = JSON.parse(JSON.stringify(obterOperacoes()));
    const demandasAntes = JSON.parse(JSON.stringify(armazem.obter().demandas));
    expect(demandasAntes).toHaveLength(1);

    let conteudo = '';
    const original = Blob;
    vi.stubGlobal('Blob', class extends original { constructor(partes: BlobPart[], o?: BlobPropertyBag) { super(partes, o); conteudo = String(partes[0]); } });
    URL.createObjectURL = vi.fn(() => 'blob:x');
    URL.revokeObjectURL = vi.fn();
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    const { unmount } = render(<ContextoArmazem.Provider value={armazem}><SecaoBackup agora={() => new Date(2026, 10, 18, 10)} /></ContextoArmazem.Provider>);
    expect(screen.getByTestId('ultimo-backup')).toHaveTextContent('nunca exportado');
    clicar('Exportar backup (.json)');
    expect(conteudo).toContain('"formato": "guara-backup"');
    expect(lerUltimoBackup()).toBe(new Date(2026, 10, 18, 10).toISOString());
    unmount();
    vi.unstubAllGlobals();

    localStorage.clear(); // "limpar"
    expect(obterOperacoes()).toEqual([]);
    const limpo = criarArmazem(localStorage, { gerarId: () => 'y', exemplos: () => [] });
    expect(limpo.obter().demandas).toEqual([]);

    render(<ContextoArmazem.Provider value={limpo}><SecaoBackup agora={() => new Date(2026, 10, 18, 10)} /></ContextoArmazem.Provider>);
    const arquivo = new File([conteudo], 'guara-backup.json', { type: 'application/json' });
    await fireEvent.change(screen.getByLabelText('Arquivo de backup'), { target: { files: [arquivo] } });
    const previa = await screen.findByTestId('previa-backup');
    expect(previa).toHaveTextContent('1 operação (1 ponto) e 1 demanda');
    expect(previa).toHaveTextContent('SUBSTITUI');
    clicar('Confirmar importação');

    expect(JSON.parse(JSON.stringify(obterOperacoes()))).toEqual(opsAntes);
    expect(obterOperacoes()[0].id).toBe(id);
    expect(JSON.parse(JSON.stringify(limpo.obter().demandas))).toEqual(demandasAntes);
  });

  it('arquivo que não é backup é recusado sem alterar nada; operação ilegível do arquivo vai para a quarentena', async () => {
    const armazem = montar();
    operacaoComPonto('Atual');
    render(<ContextoArmazem.Provider value={armazem}><SecaoBackup /></ContextoArmazem.Provider>);
    const enviar = async (texto: string) => fireEvent.change(screen.getByLabelText('Arquivo de backup'), { target: { files: [new File([texto], 'x.json')] } });
    await enviar('{"formato":"outra-coisa"}');
    expect(await screen.findByText(/Importação recusada: Não é um backup do GUARÁ/)).toBeInTheDocument();
    expect(obterOperacoes().map((o) => o.nome)).toEqual(['Atual']);

    const dados = JSON.parse(JSON.stringify({ formato: 'guara-dados', versao: 1, ficticio: true, exportadoEm: '', configuracao: { diasInatividade: 3 }, demandas: [] }));
    const ruim = { id: 'op-x', nome: '' };
    await enviar(JSON.stringify({ formato: 'guara-backup', versao: 1, exportadoEm: '2026-11-01T12:00:00Z', operacoes: [ruim], quarentena: [], dados }));
    expect(await screen.findByTestId('previa-backup')).toHaveTextContent('1 operação do arquivo não abre');
    clicar('Confirmar importação');
    expect(obterOperacoes()).toEqual([]);
    const guardados = lerQuarentena().map((q) => JSON.parse(q.bruto));
    expect(guardados).toContainEqual(ruim); // a ilegível do arquivo
    expect(guardados.some((g) => Array.isArray(g) && g[0]?.nome === 'Atual')).toBe(true); // as atuais, antes de serem trocadas
  });
});

describe('lembrete do mascote', () => {
  const agora = new Date(2026, 10, 18, 12);
  const diasAtras = (n: number) => new Date(agora.getTime() - n * 86_400_000).toISOString();
  it('só depois de 7 dias; nunca exportado vale quando há dados; sem dados não avisa', () => {
    expect(avisoDeBackup(diasAtras(7), true, agora, 7)).toBeNull();
    expect(avisoDeBackup(diasAtras(8), true, agora, 7)?.texto).toContain('O último backup tem 8 dias');
    expect(avisoDeBackup(null, true, agora, 7)?.texto).toContain('ainda não exportou');
    expect(avisoDeBackup(null, false, agora, 7)).toBeNull();
    expect(avisoDeBackup(diasAtras(30), true, agora, 7)?.tipo).toBe('backup');
  });
});

describe('backup completo e cópia automática antes de importar', () => {
  const agora = new Date(2026, 10, 18, 9, 5);

  /** Captura os arquivos "baixados" (nome pelo atributo download, conteúdo pelo Blob) na ordem em que saem. */
  function capturarDownloads() {
    const arquivos: { nome: string; conteudo: string; operacoesNoMomento: number }[] = [];
    let ultimoConteudo = '';
    const original = Blob;
    vi.stubGlobal('Blob', class extends original { constructor(partes: BlobPart[], o?: BlobPropertyBag) { super(partes, o); ultimoConteudo = String(partes[0]); } });
    URL.createObjectURL = vi.fn(() => 'blob:x');
    URL.revokeObjectURL = vi.fn();
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      arquivos.push({ nome: this.download, conteudo: ultimoConteudo, operacoesNoMomento: obterOperacoes().length });
    });
    return arquivos;
  }

  const montarArmazem = () => criarArmazem(localStorage, { gerarId: () => 'x', exemplos: () => [] });
  const entrar = async (texto: string) => fireEvent.change(screen.getByLabelText('Arquivo de backup'), { target: { files: [new File([texto], 'b.json')] } });

  it('o backup leva contatos, atalhos e feriados locais, e NÃO leva a chave do GeoServer; o aviso diz isso', async () => {
    localStorage.setItem(CHAVE_AUTHKEY, 'chave-secreta-123');
    expect(incluirContato({ nome: 'Beto', instituicao: 'MPMT', setor: '', email: '', celular: '', observacoes: '' })).toBeNull();
    expect(incluirAtalho('Geoportal', 'https://geoportal.exemplo.gov.br')).toBeNull();
    localStorage.setItem(CHAVE_FERIADOS, JSON.stringify({ extras: [{ data: '2026-12-08', nome: 'Padroeira', anual: true }], remover: [], facultativos: false }));
    const armazem = montarArmazem();
    const arquivos = capturarDownloads();
    render(<ContextoArmazem.Provider value={armazem}><SecaoBackup agora={() => agora} /></ContextoArmazem.Provider>);
    expect(screen.getByText(/A chave do GeoServer não vai no backup; preencha de novo após importar\./)).toBeInTheDocument();
    clicar('Exportar backup (.json)');
    const texto = arquivos[0].conteudo;
    expect(texto).not.toContain('chave-secreta-123');
    expect(texto).not.toContain(CHAVE_AUTHKEY);
    const b = JSON.parse(texto);
    expect(b.extras.contatos[0].nome).toBe('Beto');
    expect(b.extras.atalhos.some((a: { nome: string }) => a.nome === 'Geoportal')).toBe(true);
    expect(b.extras.feriados.extras[0].nome).toBe('Padroeira');
  });

  it('importar: baixa antes o estado atual (nome com data e hora) e só então substitui; contatos, atalhos e feriados voltam; a chave não é tocada', async () => {
    // Backup de origem: um estado com 1 operação, 1 contato, 1 atalho e 1 feriado.
    operacaoComPonto('Do backup');
    incluirContato({ nome: 'Beto', instituicao: '', setor: '', email: '', celular: '', observacoes: '' });
    incluirAtalho('Geoportal', 'https://geoportal.exemplo.gov.br');
    localStorage.setItem(CHAVE_FERIADOS, JSON.stringify({ extras: [{ data: '2026-12-08', nome: 'Padroeira', anual: true }], remover: [], facultativos: false }));
    const origem = montarArmazem();
    let arquivos = capturarDownloads();
    const { unmount } = render(<ContextoArmazem.Provider value={origem}><SecaoBackup agora={() => agora} /></ContextoArmazem.Provider>);
    clicar('Exportar backup (.json)');
    const backup = arquivos[0].conteudo;
    unmount();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    vi.spyOn(console, 'warn').mockImplementation(() => {});

    // Estado diferente no navegador: outra operação, outros contatos e atalhos, outra chave.
    localStorage.clear();
    localStorage.setItem(CHAVE_AUTHKEY, 'chave-que-fica');
    operacaoComPonto('Atual 1');
    operacaoComPonto('Atual 2');
    incluirContato({ nome: 'Carla', instituicao: '', setor: '', email: '', celular: '', observacoes: '' });
    const atual = montarArmazem();
    arquivos = capturarDownloads();
    render(<ContextoArmazem.Provider value={atual}><SecaoBackup agora={() => new Date(2026, 10, 20, 14, 30)} /></ContextoArmazem.Provider>);
    await entrar(backup);
    const previa = await screen.findByTestId('previa-backup');
    expect(previa).toHaveTextContent('1 contato');
    expect(previa).toHaveTextContent('guara-antes-da-importacao-AAAA-MM-DD-HHMM.json');
    clicar('Confirmar importação');

    // A cópia saiu antes da troca, com o estado de antes.
    expect(arquivos).toHaveLength(1);
    expect(arquivos[0].nome).toBe('guara-antes-da-importacao-2026-11-20-1430.json');
    expect(arquivos[0].operacoesNoMomento).toBe(2); // as 2 operações atuais ainda estavam lá
    const copia = JSON.parse(arquivos[0].conteudo);
    expect(copia.operacoes.map((o: { nome: string }) => o.nome)).toEqual(['Atual 1', 'Atual 2']);
    expect(copia.extras.contatos[0].nome).toBe('Carla');
    expect(arquivos[0].conteudo).not.toContain('chave-que-fica');
    expect(lerUltimoBackup()).toBeNull(); // a cópia automática não conta como backup feito

    // Depois da troca: tudo do backup, e a chave continua como estava.
    expect(obterOperacoes().map((o) => o.nome)).toEqual(['Do backup']);
    expect(obterContatos().map((c) => c.nome)).toEqual(['Beto']);
    expect(obterAtalhos().some((a) => a.nome === 'Geoportal')).toBe(true);
    expect(JSON.parse(localStorage.getItem(CHAVE_FERIADOS)!).extras[0].nome).toBe('Padroeira');
    expect(localStorage.getItem(CHAVE_AUTHKEY)).toBe('chave-que-fica');
  });

  it('se a cópia automática não puder ser gerada, nada é importado', async () => {
    operacaoComPonto('Atual');
    const armazem = montarArmazem();
    const origem = JSON.stringify({ formato: 'guara-backup', versao: 1, exportadoEm: '2026-11-01T12:00:00Z', operacoes: [], quarentena: [], dados: { formato: 'guara-dados', versao: 1, ficticio: true, exportadoEm: '', configuracao: { diasInatividade: 3 }, demandas: [] } });
    const { aplicarBackup, analisarBackup } = await import('../configuracoes/backup.ts');
    const r = analisarBackup(origem);
    if (!r.ok) throw new Error(r.erro);
    const resultado = aplicarBackup(r.previa, armazem, agora, () => { throw new Error('sem download'); });
    expect(resultado).toEqual({ ok: false, mensagem: 'Não foi possível gerar a cópia dos dados atuais; nada foi importado.' });
    expect(obterOperacoes().map((o) => o.nome)).toEqual(['Atual']);
  });

  it('nome da cópia: AAAA-MM-DD-HHMM com zeros à esquerda', () => {
    expect(nomeDaCopia(new Date(2026, 0, 3, 7, 4))).toBe('guara-antes-da-importacao-2026-01-03-0704.json');
  });
});
