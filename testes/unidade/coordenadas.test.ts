// Coordenada da demanda (ideia do TOCA): leitura de vários formatos, gravação em graus decimais.
// Coordenadas fictícias, em números redondos, sem relação com imóveis ou registros reais.

import { coordenadaValida, formatarDecimal, formatarGms, lerCoordenada } from '../../aplicacao/src/modulos/demandas/coordenadas.ts';
import { criarDemanda, editarDemanda, ehDemandaValida, paraEntrada } from '../../aplicacao/src/modulos/demandas/regras.ts';
import { montarResumo } from '../../aplicacao/src/modulos/demandas/resumo.ts';
import { exportarDados, validarImportacao } from '../../aplicacao/src/modulos/alertas/dados-portaveis.ts';

const valor = (texto: string) => {
  const r = lerCoordenada(texto);
  if (!r.ok) throw new Error(`${texto}: ${r.erro}`);
  return r.valor;
};

describe('lerCoordenada: formatos aceitos', () => {
  it.each([
    ['-15.5, -55.5', 'decimal'],
    ['-15,5; -55,5', 'decimal'],
    ['-15,5 -55,5', 'decimal'],
    ['-15.5,-55.5', 'decimal'],
    ['15.5 S, 55.5 W', 'decimal'],
    ['15.5S 55.5W', 'decimal'],
    ['S 15.5 O 55.5', 'decimal'],
    ['15° 30\' 0" S, 55° 30\' 0" W', 'gms'],
    ['15º 30’ 0” S 55º 30’ 0” O', 'gms'],
    ['-15° 30\' 0", -55° 30\' 0"', 'gms'],
    ['S 15° 30\' W 55° 30\'', 'gm'],
    ['15° 30,0\' S, 55° 30,0\' W', 'gm'],
    ['15 30 0 S 55 30 0 W', 'decimal'],
    ['55° 30\' W, 15° 30\' S', 'gm'],
  ])('«%s» vira -15.5, -55.5 (%s)', (texto, formato) => {
    const r = lerCoordenada(texto);
    expect(r).toMatchObject({ ok: true, valor: { lat: -15.5, lon: -55.5 }, formato, avisos: [] });
  });

  it('segundos com decimais e vírgula', () => {
    expect(valor('15° 30\' 36,72" S, 55° 30\' 18" W')).toEqual({ lat: -15.5102, lon: -55.505 });
  });

  it('com letra, a ordem não importa; sem letra, é latitude e longitude', () => {
    expect(valor('55.5 W 15.5 S')).toEqual({ lat: -15.5, lon: -55.5 });
    expect(valor('-15.5, -55.5')).toEqual({ lat: -15.5, lon: -55.5 });
  });
});

describe('lerCoordenada: erros e avisos', () => {
  it.each([
    ['', 'Coordenada vazia.'],
    ['-15.5', 'Informe a latitude e a longitude.'],
    ['21L 512345 8712345', 'UTM ainda não é aceito: informe em graus (ex.: -15.5, -55.5).'],
    ['15° 75\' S, 55° 30\' W', 'Minutos e segundos precisam ser menores que 60.'],
    ['15.5 S, 55.5 S', 'Os dois valores são do mesmo tipo: informe uma latitude e uma longitude.'],
    ['-155.5, -15.5', 'Latitude -155.5 fora de -90 a 90: parece que a ordem está trocada (longitude, latitude).'],
    ['-15.5, -255.5', 'Longitude -255.5 fora de -180 a 180.'],
    ['15 30 0 55 30 0', 'Sem letra de hemisfério nem °, informe só dois números em graus decimais (latitude, longitude).'],
    ['perto do rio', 'Não entendi parte do texto da coordenada.'],
  ])('«%s» é recusado: %s', (texto, erro) => {
    expect(lerCoordenada(texto)).toEqual({ ok: false, erro });
  });

  it('ordem trocada dentro do Brasil vira aviso com sugestão de troca, não erro', () => {
    expect(lerCoordenada('-55.5, -15.5')).toMatchObject({
      ok: true, valor: { lat: -55.5, lon: -15.5 }, trocaSugerida: true, avisos: ['Parece que a ordem está trocada (longitude, latitude).'],
    });
  });

  it('fora do Brasil é aviso, não erro', () => {
    expect(lerCoordenada('40.5, 10.5')).toMatchObject({ ok: true, trocaSugerida: false, avisos: ['Fica fora do Brasil: confira os sinais e a ordem.'] });
  });
});

describe('formatos de saída e validação', () => {
  it('decimal com seis casas e GMS no estilo do QGIS', () => {
    const c = { lat: -15.5102, lon: -55.505 };
    expect(formatarDecimal(c)).toBe('-15.510200, -55.505000');
    expect(formatarGms(c)).toBe('15° 30\' 36,72" S, 55° 30\' 18" W');
    expect(valor(formatarGms(c))).toEqual(c);
    expect(valor(formatarDecimal(c))).toEqual(c);
  });

  it('coordenada gravada: só lat e lon numéricos e dentro dos limites', () => {
    expect(coordenadaValida({ lat: -15.5, lon: -55.5 })).toBe(true);
    expect(coordenadaValida({ lat: 95, lon: -55.5 })).toBe(false);
    expect(coordenadaValida({ lat: '-15.5', lon: -55.5 })).toBe(false);
    expect(coordenadaValida({ lat: -15.5, lon: -55.5, nome: 'x' })).toBe(false);
    expect(coordenadaValida(null)).toBe(false);
  });
});

describe('coordenada na demanda', () => {
  const ENTRADA = {
    titulo: 'Vistoria de campo FIC-0005', descricao: '', responsavel: 'Equipe (fictícia)', prioridade: 'Média' as const,
    status: 'A Fazer' as const, prazo: '',
  };
  const T0 = '2026-11-13T12:00:00.000Z';

  it('criar grava em graus decimais; texto inválido é recusado com a mensagem do leitor', () => {
    const r = criarDemanda({ ...ENTRADA, coordenada: '15° 30\' S, 55° 30\' W' }, T0, () => 'd1');
    expect(r.ok && r.valor.coordenada).toEqual({ lat: -15.5, lon: -55.5 });
    expect(criarDemanda({ ...ENTRADA, coordenada: '21L 512345 8712345' }, T0, () => 'd2')).toEqual({
      ok: false, erros: { coordenada: 'UTM ainda não é aceito: informe em graus (ex.: -15.5, -55.5).' },
    });
    const sem = criarDemanda({ ...ENTRADA, coordenada: '  ' }, T0, () => 'd3');
    expect(sem.ok && sem.valor).not.toHaveProperty('coordenada');
  });

  it('editar: mesma coordenada em outro formato não é mudança; apagar remove; paraEntrada devolve decimal', () => {
    const r = criarDemanda({ ...ENTRADA, coordenada: '-15.5, -55.5' }, T0, () => 'd1');
    if (!r.ok) throw new Error('entrada inválida');
    const d = r.valor;
    expect(paraEntrada(d).coordenada).toBe('-15.500000, -55.500000');
    expect(editarDemanda(d, { ...paraEntrada(d), coordenada: '15.5 S 55.5 W' }, '2026-11-14T12:00:00.000Z')).toEqual({ ok: true, valor: d });
    const apagada = editarDemanda(d, { ...paraEntrada(d), coordenada: '' }, '2026-11-14T12:00:00.000Z');
    expect(apagada.ok && apagada.valor).not.toHaveProperty('coordenada');
  });

  it('validação da gravada, importação e fora da tela compartilhada', () => {
    const r = criarDemanda({ ...ENTRADA, coordenada: '-15.5, -55.5' }, T0, () => 'd1');
    if (!r.ok) throw new Error('entrada inválida');
    expect(ehDemandaValida(r.valor)).toBe(true);
    expect(ehDemandaValida({ ...r.valor, coordenada: { lat: -95, lon: -55.5 } })).toBe(false);
    expect(ehDemandaValida({ ...r.valor, coordenada: '-15.5, -55.5' })).toBe(false);
    const importado = validarImportacao(exportarDados([r.valor], 3, new Date(T0)));
    expect(importado.ok && importado.dados.demandas[0].coordenada).toEqual({ lat: -15.5, lon: -55.5 });
    expect(JSON.stringify(montarResumo(r.valor, new Date(T0)))).not.toContain('55.5');
  });
});
