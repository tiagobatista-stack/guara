// Ponta a ponta com as três planilhas de teste (dados fictícios): outubro (vencida), dezembro e janeiro (futuras).

import { fireEvent, render, screen } from '@testing-library/react';
import { ContextoArmazem, criarArmazem } from '../demandas/armazem.ts';
import { Operacoes } from './Operacoes.tsx';
import { obterOperacoes } from './armazem.ts';
import { pontoVencido, situacaoDoPonto } from './regras.ts';
import { itensDoMapa } from '../mapa/regras.ts';
import outubro from './__fixtures__/operacao-1-outubro-2026-vencida.csv?raw';
import dezembro from './__fixtures__/operacao-2-dezembro-2026-futura.csv?raw';
import janeiro from './__fixtures__/operacao-3-janeiro-2027-futura.csv?raw';

beforeEach(() => localStorage.clear());

// O File do jsdom não tem arrayBuffer(); o navegador tem.
function importar(texto: string) {
  const arquivo = new File([texto], 'planilha.csv', { type: 'text/csv' });
  Object.defineProperty(arquivo, 'arrayBuffer', { value: async () => new TextEncoder().encode(texto).buffer });
  fireEvent.change(screen.getByTestId('arquivo-nova-operacao'), { target: { files: [arquivo] } });
}

async function criarPelaPlanilha(texto: string, nomeEsperado: string, pontos: number) {
  importar(texto);
  await screen.findByTestId('previa-nova-operacao');
  expect(screen.getByLabelText('Nome *')).toHaveValue(nomeEsperado);
  fireEvent.click(screen.getByRole('button', { name: `Criar operação com ${pontos} ponto(s)` }));
  expect(screen.getByRole('heading', { level: 2, name: nomeEsperado })).toBeInTheDocument();
  expect(screen.getByTestId('resumo-operacao')).toHaveTextContent(`${pontos} ponto(s)`);
}

describe('importação das planilhas de teste', () => {
  it('outubro, dezembro e janeiro: nome, pontos e aviso de local repetido', async () => {
    const armazem = criarArmazem(localStorage, { gerarId: () => 'x', exemplos: () => [] });
    render(<ContextoArmazem.Provider value={armazem}><Operacoes /></ContextoArmazem.Provider>);
    const voltar = () => fireEvent.click(screen.getByRole('button', { name: 'Voltar às operações' }));

    await criarPelaPlanilha(outubro, 'Operação Juína – out/2026', 6);
    voltar();
    await criarPelaPlanilha(dezembro, 'Operação Castanheira – dez/2026', 5);
    voltar();
    // Com outubro já cadastrada, o ponto 5 de janeiro cai a ~64 m do ponto 4 de outubro.
    await criarPelaPlanilha(janeiro, 'Operação Aripuanã – jan/2027', 6);

    const [out, dez, jan] = obterOperacoes();
    expect(dez.pontos.every((p) => p.situacao === 'planejado')).toBe(true);
    expect(out.pontos.map((p) => p.numero)).toEqual([1, 2, 3, 4, 5, 6]);
    // Resultado e campos pós-campo entram no ponto; a situação é derivada (01, 02, 03, 05 finalizado; 04 a reprogramar; 06 planejado e vencido).
    const porNumero = (n: number) => out.pontos.find((p) => p.numero === n)!;
    expect(out.setor).toBe('DUDJUINA');
    expect(porNumero(1)).toMatchObject({ resultado: 'sim', protocolo: 'PROT-TESTE-0001', observacao: 'Auto lavrado no local', tipoDano: 'Desmatamento', codigo: 'JUINA202610-01' });
    expect(porNumero(2)).toMatchObject({ resultado: 'fiscalizado-nao-autuado', motivo: 'Infrator não localizado' });
    expect(porNumero(3)).toMatchObject({ resultado: 'nao-cabe-atuacao', motivo: 'Outros' });
    expect(porNumero(4)).toMatchObject({ resultado: 'nao', motivo: 'Área sem acesso' });
    expect(out.pontos.map((p) => situacaoDoPonto(p))).toEqual(['finalizado', 'finalizado', 'finalizado', 'a-reprogramar', 'finalizado', 'planejado']);
    const hoje = '2026-11-18';
    expect(out.pontos.map((p) => pontoVencido(out, p, hoje))).toEqual([false, false, false, false, false, true]);
    expect(pontoVencido(out, porNumero(6), '2026-10-09')).toBe(false); // retorno em 09/10: só vence depois dele
    const noMapa = itensDoMapa([], [out], hoje).noMapa;
    expect(noMapa.map((i) => [i.situacao, i.vencido])).toEqual([['elaboracao', false], ['elaboracao', false], ['elaboracao', false], ['a-reprogramar', false], ['elaboracao', false], ['planejado', true]]);
    const ponto5 = jan.pontos.find((p) => p.numero === 5)!;
    expect(screen.getByTestId(`proximos-${ponto5.id}`)).toHaveTextContent(/out\/2026.*a 6\d m/);
    const ponto1 = jan.pontos.find((p) => p.numero === 1)!;
    expect(screen.queryByTestId(`proximos-${ponto1.id}`)).toBeNull();
  });
});
