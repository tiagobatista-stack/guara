// Relatório (texto): montado só com as frases fixas. A caracterização abaixo é fictícia (ponto FIC-), pensada para exercitar
// as pendências (A-5.1, A-7.1, A-12, A-24.1) e os 5 grupos.

import { ORIGENS_ALERTA, type Operacao, type Ponto } from './modelo.ts';
import { ITENS_POP, type Caracterizacao } from './pop-supressao.ts';
import { chavesSobrando, dataPorExtenso, listaComE, revisar, textoDoRelatorio } from './relatorio.ts';
import { validarListaOperacoes } from './regras.ts';

const AGORA = '2026-10-22T13:00:00.000Z';
const PROTEGIDA = 'Espaços especialmente protegidos (RL, APP, área de uso restrito, UC ou TI)';

function montar(ponto: Partial<Ponto> = {}, operacao: Partial<Operacao> = {}): { op: Operacao; p: Ponto } {
  const p: Ponto = {
    id: 'p1', numero: 1, codigo: 'FIC-001', coordenada: { lat: -12.5, lon: -58.7 }, municipio: 'Juína', notas: '', demandas: [], situacao: 'planejado',
    dataVistoria: '2026-10-21', resultado: 'sim', tipoDano: 'Supressão de vegetação nativa', viagem: 'v1', ...ponto,
  };
  const op: Operacao = {
    id: 'o1', nome: 'Operação Teste', inicio: '2026-10-19', fim: '2026-10-23', setor: 'DUDJUÍNA/SEMA-MT', origemAlerta: { tipo: 'planet' }, criadaEm: AGORA,
    viagens: [{
      id: 'v1', equipe: 'A', integrantes: ['Ana Souza', 'Bruno Lima', 'Carlos Dias'], veiculos: ['D-1'], notas: '', motorista: 'Carlos Dias',
      pessoas: { 'Ana Souza': { cargo: 'Analista Ambiental', lotacao: 'DUDJUÍNA/SEMA-MT' } },
    }],
    pontos: [p], ...operacao,
  };
  return { op, p };
}

const CARACTERIZACAO = {
  'A-1': 'Amazônia', 'A-2': 'Floresta Ombrófila Densa (Floresta Amazônica ou Floresta Atlântica)', 'A-3': 'inicial', 'A-3.1': 'Análise de imagens', 'A-4': 'Não',
  'A-5': ['Nascentes', 'Trechos de cursos dágua (rios, igarapés, córregos, riachos, arroios, regatos)'], 'A-5.2': 'Verificação por imagem', 'A-6': PROTEGIDA,
  'A-7': 'Sim (açude, represa, cacimba, barragem de captação etc.)', 'A-8': 'Corte raso', 'A-9': 'Sim', 'A-10': 'Não', 'A-11': 'Sim', 'A-12': 'Outros recursos',
  'A-13': 'Sim, constatada visualmente', 'A-14': 'Sim, constatada visualmente', 'A-15': ['Arraste'], 'A-16': 'Sim, houve preparo', 'A-17': 'Não, não houve preparo',
  'A-18': 'Sem vegetação', 'A-19': 'Sim', 'A-20': 'Laminar', 'A-21': 'Criação extensiva', 'A-21.1': ['Bovino'], 'A-22': 'Área com sinais de pastoreio',
  'A-23': 'Não', 'A-24': ['Rodovias', 'Outras'], 'B-1': 'Privado', 'B-3': 'Sim', 'B-4': 'Não',
};

const TXT_DO_POP = `Caracterização do dano (POP IBAMA (Portaria Ibama nº 83/2022), Anexo I):
A-1. Bioma: Amazônia
A-2. Fitofisionomia da vegetação suprimida: Floresta Ombrófila Densa (Floresta Amazônica ou Floresta Atlântica)
A-3. Estágio sucessional da vegetação suprimida: em regeneração
A-3.1. Forma de obtenção da informação acerca do estágio sucessional: Material lenhoso remanescente
A-4. Foi constatado corte ou queima de espécies declaradas por lei como imunes de corte?: Não
A-5. Tipos de corpos hídricos e áreas úmidas na área: Trechos de cursos dágua (rios, igarapés, córregos, riachos, arroios, regatos); Nascentes
A-5.2. Fonte das informações: Verificação em campo
A-6. Indique a proteção legal da área: Espaços especialmente protegidos (RL, APP, área de uso restrito, UC ou TI)
A-7. Há presença de reservatórios artificiais?: Sim (açude, represa, cacimba, barragem de captação etc.)
A-8. Indique o tipo de exploração: Corte raso
A-9. Há presença ou indícios de equipamentos/maquinário no local?: Sim
A-10. Houve ocorrência de fogo recente ou indícios?: Não
A-11. Há solo exposto na área?: Sim
A-12. Indique o tipo de alteração da camada superficial do solo: Outros recursos
A-13. Houve destoca?: Sim, constatada visualmente
A-14. Houve enleiramento?: Sim, constatada visualmente
A-15. Houve limpeza da área?: Arraste
A-16. Houve preparo físico do solo (subsolagem, aração e gradagem)?: Não, não houve preparo
A-18. Indique o tipo de cobertura do solo com vegetação na área degradada/alterada no momento da ação fiscalizatória: Implantação de cultura agrícola, pastagem ou silvicultura na maior parte (> 50%) da área degradada/alterada
A-19. Há processo erosivo na área?: Não
A-21. Há presença de animais de criação na área?: Não
A-23. Há conectividade e fluxos da paisagem?: Sim, mais de 50% do perímetro limítrofe com fragmento de vegetação nativa
A-23.1. Fonte das informações: Verificação por imagem
A-24. Há ameaças externas, devido à presença ou proximidade da área degradada/alterada com: (pode marcar mais de 1 alternativa): Áreas com atividades agropecuárias (uso indiscriminado de queimadas, agrotóxicos etc.)
B-1. Tipo de imóvel onde está inserida a área fiscalizada: Privado
B-3. O imóvel possui Cadastro Ambiental Rural (CAR)?: Não
B-4. Houve supressão de vegetação em área de ocorrência de espécies ameaçadas de extinção, constantes em lista oficial?: Não identificado`;

/** Lê o TXT exportado ("A-1. <pergunta>: <resposta>") de volta para o objeto do POP; marcas múltiplas separadas por "; ". */
function lerTxtDoPop(txt: string): Caracterizacao {
  const r: Caracterizacao = {};
  for (const linha of txt.split('\n').slice(1)) {
    const id = linha.slice(0, linha.indexOf('. '));
    const item = ITENS_POP.find((i) => i.id === id);
    if (!item) throw new Error(`item desconhecido: ${id}`);
    const resposta = linha.slice(`${id}. ${item.texto}: `.length);
    r[id] = item.tipo === 'multipla' ? resposta.split('; ') : resposta;
  }
  return r;
}

const semRepeticao = (t: string) => expect(t.match(/(?<!\p{L})(\p{L}+)[ \t]+\1(?![\p{L}])/giu)).toBeNull();

describe('relatório (texto)', () => {
  it('POP completo: 5 grupos, pendências condicionais, equipe sem o motorista, sem {...} e sem palavra repetida', () => {
    const { op, p } = montar({ caracterizacao: CARACTERIZACAO, car: 'MT123' });
    const t = textoDoRelatorio(op, p, { completo: true });
    expect(t.startsWith('EQUIPE TÉCNICA\n')).toBe(true);
    expect(t).toContain('Ana Souza – Analista Ambiental – DUDJUÍNA/SEMA-MT');
    expect(t).toContain('Bruno Lima – [PENDENTE: cargo de Bruno Lima] – DUDJUÍNA/SEMA-MT'); // lotação = unidade da operação
    expect(t).not.toContain('Carlos Dias –'); // motorista fora da equipe técnica
    expect(t).toContain('No dia 21 de outubro de 2026, nos dirigimos ao imóvel para fiscalização pelo Sistema de Alertas Planet, no escopo da Operação Teste');
    expect(t.split('\n').filter((l) => l.startsWith('· '))).toHaveLength(7); // abertura + ponto/consultas + 5 grupos
    expect(t).toContain('[PENDENTE: dimensões estimadas dos corpos hídricos (A-5.1)]');
    expect(t).toContain('[PENDENTE: dimensões estimadas dos reservatórios artificiais (A-7.1)]');
    expect(t).toContain('[PENDENTE: especificar outros recursos (A-12)]');
    expect(t).toContain('[PENDENTE: especificar outras ameaças externas (A-24.1)]');
    expect(t).toContain('destoca e enleiramento'); // A-13/A-14 fundidos
    expect(t).toContain('Não houve constatação de corte ou queima de espécies imunes de corte.');
    expect(t).toContain('Não houve constatação de indícios de fogo recente e indícios de preparo químico do solo.');
    expect(t).toContain('n.º MT123');
    expect(t.trimEnd().endsWith('Rascunho gerado pelo GUARÁ — revisar antes de juntar ao processo.')).toBe(true);
    expect(chavesSobrando(t)).toEqual([]);
    semRepeticao(t);
  });

  it('ponto sem consultas: [CONSULTA NÃO REALIZADA] em todas as bases e nenhum "não identificado" inventado', () => {
    const { op, p } = montar({ caracterizacao: CARACTERIZACAO });
    const t = textoDoRelatorio(op, p, { completo: true });
    expect(t).toContain('[CONSULTAS NÃO REALIZADAS: bioma, vegetação IBGE, CAR/SIMCAR, embargos SEMA-MT, autos de infração SEMA-MT, terras indígenas, unidades de conservação e zonas de amortecimento (TI/UC)]');
    expect(t).not.toContain('[CONSULTA NÃO REALIZADA:'); // 2 ou mais ausentes: um marcador só
    expect(t).not.toContain('Não foi identificad');
    expect(t).not.toContain('Consultas realizadas em');
    expect(chavesSobrando(t)).toEqual([]);
  });

  it('consultas registradas: achou, vazio, TI/UC/amortecimento juntos, fecho com datas e divergência campo × base', () => {
    const base = { fonte: 'manual' as const, quando: '2026-10-20T12:00:00.000Z' };
    const { op, p } = montar({
      caracterizacao: { ...CARACTERIZACAO, 'B-3': 'Não', 'A-1': 'Cerrado', 'A-6.1': 'Terra Indígena Enawenê-Nawê' },
      geo: { bioma: 'Amazônia', legenda: 'Dse - Floresta Estacional Semidecidual', quando: '2026-10-21T12:00:00.000Z' },
      consultas: {
        car: { ...base, estado: 'encontrado', detalhe: 'MT-123456/2020' }, embargos: { ...base, estado: 'vazio' }, autos: { ...base, estado: 'falha', detalhe: 'sem rede' },
        ti: { ...base, estado: 'vazio' }, uc: { ...base, estado: 'vazio' }, amortecimento: { ...base, estado: 'vazio' },
      },
    });
    const t = textoDoRelatorio(op, p, { completo: true });
    expect(t).toContain('A área está inserida no bioma Amazônia.');
    expect(t).toContain('vegetação do tipo "Floresta Estacional Semidecidual"');
    expect(t).toContain('Cadastro Ambiental Rural (CAR) n.º MT-123456/2020');
    expect(t).toContain('Não foi identificada sobreposição com termos de embargo');
    expect(t).toContain('[CONSULTA NÃO REALIZADA: Autos de infração SEMA-MT]'); // falha ≠ vazio
    expect(t).toContain('A área não possui sobreposição com Terras Indígenas, Unidades de Conservação ou com as respectivas zonas');
    expect(t).toContain('Consultas realizadas em 20/10/2026 a 21/10/2026 nas bases do Geoportal da SEMA-MT (Bioma, ');
    expect(t).toContain('[DIVERGÊNCIA: bioma — em campo: Cerrado; na base: Amazônia]');
    expect(t).toContain('[DIVERGÊNCIA: Cadastro Ambiental Rural (CAR) — em campo: não possui CAR; na base: CAR identificado]');
    expect(t).toContain('[DIVERGÊNCIA: proteção legal — em campo: Terra Indígena Enawenê-Nawê; na base: sem sobreposição com Terras Indígenas]');
    expect(chavesSobrando(t)).toEqual([]);
  });

  it('origem do alerta, apoio e requisição; sem equipe, data ou unidade vira pendência', () => {
    const { op, p } = montar({ dataVistoria: undefined }, { origemAlerta: { tipo: 'requisicao', detalhe: 'Ministério Público' }, apoio: 'Polícia Militar', setor: undefined, viagens: [] });
    const t = textoDoRelatorio(op, p, { completo: true });
    expect(t).toContain('[PENDENTE: equipe técnica da viagem]');
    expect(t).toContain('No dia [PENDENTE: data da vistoria]');
    expect(t).toContain('em atendimento a requisição de Ministério Público');
    expect(t).toContain('por meio da [PENDENTE: unidade], com o apoio da Polícia Militar.');
    expect(Object.keys(ORIGENS_ALERTA)).toContain('requisicao');
  });

  it('sem A-6.1 não há divergência; A-6.1 sem citar UC/TI também não; sem resultado há aviso no topo; número com dois dígitos', () => {
    const base = { fonte: 'manual' as const, quando: '2026-10-20T12:00:00.000Z', estado: 'vazio' as const };
    const consultas = { ti: base, uc: base, amortecimento: base };
    const { op, p } = montar({ caracterizacao: { ...CARACTERIZACAO, 'A-6.1': 'APP do córrego' }, consultas, resultado: undefined, numero: 6 });
    const t = textoDoRelatorio(op, p, { completo: true });
    expect(t).not.toContain('[DIVERGÊNCIA: proteção legal');
    expect(t).toContain('(APP do córrego).');
    expect(t.startsWith('[ATENÇÃO: o ponto ainda não tem resultado registrado.]\n\nEQUIPE TÉCNICA')).toBe(true);
    expect(t).toContain('Ponto de Vistoria n.º 06,');
    const sem = montar({ caracterizacao: CARACTERIZACAO, consultas });
    expect(textoDoRelatorio(sem.op, sem.p, { completo: true })).not.toContain('[DIVERGÊNCIA: proteção legal');
  });

  it('POP não iniciado: um marcador único, sem pendentes item a item', () => {
    const { op, p } = montar({ caracterizacao: undefined });
    const t = textoDoRelatorio(op, p, { completo: true });
    expect(t).toContain('[PENDENTE: caracterização do dano (POP) não preenchida]');
    expect(t.match(/\[PENDENTE: /g)?.length).toBe(1 + (t.match(/\[PENDENTE: (cargo|lotação)/g)?.length ?? 0));
    expect(t.split('\n').filter((l) => l.startsWith('· '))).toHaveLength(3);
  });

  it('fixture real (TXT exportado do POP): pendentes A-5.1, A-7.1 e A-12, A-13/A-14 fundidas, negativa do solo e sem divergência de A-6', () => {
    const resp = lerTxtDoPop(TXT_DO_POP);
    const { op, p } = montar({ caracterizacao: resp, numero: 6 });
    const t = textoDoRelatorio(op, p, { completo: true });
    expect(t).toContain('[PENDENTE: dimensões estimadas dos corpos hídricos (A-5.1)]');
    expect(t).toContain('[PENDENTE: dimensões estimadas dos reservatórios artificiais (A-7.1)]');
    expect(t).toContain('[PENDENTE: especificar outros recursos (A-12)]');
    expect(t).not.toContain('DIVERGÊNCIA');
    expect(t).toContain('Constatou-se visualmente a ocorrência de destoca e enleiramento.');
    expect(t).toContain('Não houve constatação de indícios de fogo recente, preparo físico do solo e processo erosivo.');
    expect(t).toContain('A área foi caracterizada, em campo, como pertencente ao bioma Amazônia.');
    expect(t.split('\n').filter((l) => l.startsWith('· '))).toHaveLength(7);
    expect(chavesSobrando(t)).toEqual([]);
    semRepeticao(t);
  });

  it('ajudantes: data por extenso, lista com "e", revisão', () => {
    expect(dataPorExtenso('2026-03-05')).toBe('5 de março de 2026');
    expect(listaComE(['a', 'b', 'c'])).toBe('a, b e c');
    expect(listaComE(['a'])).toBe('a');
    expect(revisar('área  área  protegida ,  fim..')).toBe('área protegida, fim.');
  });

  it('armazenamento: cargo/lotação, origem, apoio e consultas sobrevivem à validação; consulta inválida é descartada sem derrubar a operação', () => {
    const { op } = montar({ consultas: { car: { estado: 'vazio', quando: AGORA, fonte: 'manual' } } }, { apoio: 'PM' });
    const lido = validarListaOperacoes(JSON.parse(JSON.stringify([op])));
    expect(lido[0].viagens[0].pessoas?.['Ana Souza']?.cargo).toBe('Analista Ambiental');
    expect(lido[0].origemAlerta?.tipo).toBe('planet');
    expect(lido[0].apoio).toBe('PM');
    expect(lido[0].pontos[0].consultas?.car?.estado).toBe('vazio');
    const ruim = JSON.parse(JSON.stringify([op]));
    ruim[0].pontos[0].consultas.car.estado = 'talvez';
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const aberta = validarListaOperacoes(ruim);
    expect(aberta).toHaveLength(1);
    expect(aberta[0].pontos[0].consultas?.car).toBeUndefined();
  });
});
