// Dados da capa do SIGA: coordenada no formato do SIGA, atividade e objetivo sugeridos, equipe sem lotação.

import { atividadeSugerida, coordenadaSiga, equipeSiga, objetivoSugerido } from './siga.ts';

describe('coordenadaSiga', () => {
  it('sinal + G:MM:SS,ss, com os exemplos do SIGA', () => {
    expect(coordenadaSiga(-10 - 38 / 3600)).toBe('-10:00:38,00');
    expect(coordenadaSiga(-60 - 15 / 60 - 49 / 3600)).toBe('-60:15:49,00');
  });

  it('zeros à esquerda em minutos, segundos e centésimos; grau sem zero', () => {
    expect(coordenadaSiga(5 + 3 / 60 + 7.05 / 3600)).toBe('5:03:07,05');
    expect(coordenadaSiga(0)).toBe('0:00:00,00');
  });

  it('arredonda a 2 casas; 60 s vira minuto e 60 min vira grau', () => {
    expect(coordenadaSiga(10 + 59 / 3600 + 59.996 / 3600 - 59 / 3600)).toBe('10:01:00,00'); // 59,996 s -> 60,00 s -> 1 min
    expect(coordenadaSiga(11.99999999)).toBe('12:00:00,00'); // 59 min 59,99999 s -> 12 graus
    expect(coordenadaSiga(1 + 1 / 360000)).toBe('1:00:00,01');
    expect(coordenadaSiga(1 + 0.4 / 360000)).toBe('1:00:00,00');
  });

  it('valor negativo que arredonda para zero não leva sinal', () => {
    expect(coordenadaSiga(-0.0000001)).toBe('0:00:00,00');
    expect(coordenadaSiga(-12.1)).toBe('-12:06:00,00');
  });
});

describe('atividade, objetivo e equipe', () => {
  it('atividade sugerida pelo tipo de dano', () => {
    expect(atividadeSugerida('Desmatamento')).toBe('Supressão');
    expect(atividadeSugerida('Desmatamento químico')).toBe('Supressão por desmatamento químico');
    expect(atividadeSugerida('Queimada')).toBe('Queimada');
    expect(atividadeSugerida('Aplicação irregular de agrotóxico')).toBe('Aplicação de agrotóxico');
    expect(atividadeSugerida('Cerca')).toBe('');
    expect(atividadeSugerida(undefined)).toBe('');
  });

  it('objetivo em maiúsculas: FISCALIZAÇÃO DE ALERTAS DE {TIPO} {ORIGEM} {OPERAÇÃO}', () => {
    expect(objetivoSugerido({ nome: 'Brasnorte', origemAlerta: { tipo: 'planet' } }, { tipoDano: 'Desmatamento químico' })).toBe('FISCALIZAÇÃO DE ALERTAS DE DESMATAMENTO QUÍMICO PLANET BRASNORTE');
    expect(objetivoSugerido({ nome: 'Op 3', origemAlerta: { tipo: 'requisicao', detalhe: 'Ministério Público' } }, { tipoDano: 'Queimada' })).toBe('FISCALIZAÇÃO DE ALERTAS DE QUEIMADA REQUISIÇÃO MINISTÉRIO PÚBLICO OP 3');
    expect(objetivoSugerido({ nome: 'Op 3' }, {})).toBe('FISCALIZAÇÃO DE ALERTAS DE OP 3');
  });

  it('equipe: nome e cargo, sem motorista e sem lotação', () => {
    const v = { integrantes: ['Ana', 'Bia', 'Caio'], motorista: 'Caio', pessoas: { Ana: { cargo: 'Fiscal', lotacao: 'DUDJUINA' } } };
    expect(equipeSiga(v as never)).toEqual([{ nome: 'Ana', cargo: 'Fiscal' }, { nome: 'Bia', cargo: '' }]);
    expect(equipeSiga(undefined)).toEqual([]);
  });
});
