// Referência legal da Inspeção de agrotóxicos: dados, separados das perguntas. Texto e valores transcritos de
// documentacao/questionario-agrotoxicos.md (recebido em 19/11/2026). NÃO foram conferidos na fonte oficial: `conferidaEm` fica vazio
// até alguém conferir no `link` e registrar a data aqui. O sistema não calcula multa: a faixa é só referência, a decisão é do agente.

export interface FaixaDeMulta { quando: string; valor: string }
export interface NormaReferida {
  id: string;
  norma: string;
  artigo: string;
  /** Texto da descrição (da infração ou da obrigação), como no questionário. */
  texto: string;
  multa?: FaixaDeMulta[];
  /** AAAA-MM-DD da última conferência na fonte oficial; vazio = ainda não conferida. */
  conferidaEm?: string;
  link: string;
}

export const REFERENCIA_LEGAL: readonly NormaReferida[] = [
  {
    id: 'decreto-6514-art-76',
    norma: 'Decreto nº 6.514/2008',
    artigo: 'art. 76',
    texto: 'Deixar de inscrever-se no Cadastro Técnico Federal de que trata o art. 17 da Lei nº 6.938/1981.',
    multa: [
      { quando: 'pessoa física', valor: 'R$ 50,00' }, { quando: 'microempresa', valor: 'R$ 150,00' }, { quando: 'empresa de pequeno porte', valor: 'R$ 900,00' },
      { quando: 'empresa de médio porte', valor: 'R$ 1.800,00' }, { quando: 'empresa de grande porte', valor: 'R$ 9.000,00' },
    ],
    link: 'https://www.planalto.gov.br/ccivil_03/_ato2007-2010/2008/decreto/d6514.htm',
  },
  {
    id: 'lei-6938-art-17',
    norma: 'Lei nº 6.938/1981',
    artigo: 'art. 17',
    texto: 'Instituído, sob a administração do IBAMA, o Cadastro Técnico Federal de Atividades e Instrumentos de Defesa Ambiental e o Cadastro Técnico Federal de Atividades Potencialmente Poluidoras ou Utilizadoras de Recursos Ambientais, de registro obrigatório.',
    link: 'https://www.planalto.gov.br/ccivil_03/leis/l6938.htm',
  },
];
