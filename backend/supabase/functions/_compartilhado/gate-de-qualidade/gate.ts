// Gate de qualidade (padrão F): o resultado só é liberado se esquemas, fontes
// e revisão independente forem aprovados. Não pode ser desativado.

export interface EntradaGate {
  etapasOk: boolean;
  revisaoAprovada: boolean;
  minutaARevisar: boolean;
  autorMinuta: string;
  revisor: string;
}

export interface VerificacaoGate {
  nome: string;
  aprovado: boolean;
}

export interface SaidaGate {
  aprovado: boolean;
  verificacoes: VerificacaoGate[];
}

export const GATE_DESATIVAVEL = false;

export function avaliarGate(e: EntradaGate): SaidaGate {
  const verificacoes: VerificacaoGate[] = [
    { nome: 'Todas as etapas executadas e com saída válida no esquema', aprovado: e.etapasOk },
    { nome: 'Evidências aprovadas pelo revisor', aprovado: e.revisaoAprovada },
    { nome: 'Minuta marcada como "a revisar"', aprovado: e.minutaARevisar },
    { nome: 'Revisor diferente do autor da minuta', aprovado: e.autorMinuta !== e.revisor },
  ];
  return { aprovado: verificacoes.every((v) => v.aprovado), verificacoes };
}
