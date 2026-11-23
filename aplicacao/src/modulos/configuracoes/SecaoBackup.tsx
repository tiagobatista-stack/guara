// Backup (exportar/importar com prévia) e os conteúdos ilegíveis guardados em quarentena.

import { useRef, useState, type ChangeEvent } from 'react';
import { baixar } from '../../compartilhado/baixar.ts';
import { plural } from '../../compartilhado/plural.ts';
import { usePreferenciasMascote } from '../../compartilhado/preferencias-mascote.ts';
import { useUltimoBackup } from '../../compartilhado/ultimo-backup.ts';
import { useArmazem, useEstadoDemandas } from '../demandas/armazem.ts';
import { lerDiasPadraoElaboracao, useOperacoes } from '../operacoes/armazem.ts';
import { removerDaQuarentena, useQuarentena } from '../operacoes/quarentena.ts';
import { aplicarBackup, analisarBackup, montarBackup, type Previa } from './backup.ts';

const dataBr = (iso: string) => (iso ? new Date(iso).toLocaleDateString('pt-BR') : 'data desconhecida');
const dia = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export function SecaoBackup({ agora = () => new Date() }: { agora?: () => Date }) {
  const armazem = useArmazem();
  const { demandas, diasInatividade } = useEstadoDemandas();
  const operacoes = useOperacoes();
  const mascote = usePreferenciasMascote();
  const ultimo = useUltimoBackup();
  const quarentena = useQuarentena();
  const [previa, setPrevia] = useState<Previa | null>(null);
  const [mensagem, setMensagem] = useState<{ erro: boolean; texto: string } | null>(null);
  const arquivo = useRef<HTMLInputElement>(null);

  const exportar = () => {
    const hoje = agora();
    baixar(`guara-backup-${dia(hoje)}.json`, montarBackup(hoje, demandas, diasInatividade, mascote, lerDiasPadraoElaboracao()));
    setMensagem({ erro: false, texto: `Backup gerado com ${plural(operacoes.length, 'operação', 'operações')} e ${plural(demandas.length, 'demanda', 'demandas')}.` });
  };

  const escolher = async (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    const r = analisarBackup(await f.text());
    if (!r.ok) { setPrevia(null); setMensagem({ erro: true, texto: `Importação recusada: ${r.erro} Nenhum dado foi alterado.` }); return; }
    setMensagem(null);
    setPrevia(r.previa);
  };

  const confirmar = () => {
    if (!previa) return;
    const r = aplicarBackup(previa, armazem, agora());
    setMensagem(r.ok ? { erro: false, texto: `Backup importado: ${plural(previa.operacoes, 'operação', 'operações')} e ${plural(previa.demandas, 'demanda', 'demandas')}.` } : { erro: true, texto: r.mensagem });
    setPrevia(null);
  };

  return (
    <section aria-labelledby="titulo-backup" className="cartao">
      <h2 id="titulo-backup"><strong>Backup dos dados</strong></h2>
      <p className="texto-suave texto-medio">
        Guarda operações, demandas, contatos, atalhos e feriados locais deste navegador em um arquivo. O arquivo contém as coordenadas dos pontos
        e os contatos: guarde-o com o cuidado de dados institucionais e não o envie a serviços externos nem a IA.
        A chave do GeoServer não vai no backup; preencha de novo após importar.
      </p>
      <p className="texto-pequeno" data-testid="ultimo-backup">Último backup: {ultimo ? dataBr(ultimo) : 'nunca exportado'}.</p>
      <div className="acoes">
        <button type="button" className="botao botao--primario" onClick={exportar}>Exportar backup (.json)</button>
        <button type="button" className="botao" onClick={() => arquivo.current?.click()}>Importar backup</button>
        <input ref={arquivo} type="file" accept="application/json,.json" hidden aria-label="Arquivo de backup" onChange={escolher} />
      </div>
      {previa && (
        <div className="aviso" role="alertdialog" aria-label="Prévia da importação" data-testid="previa-backup">
          <p>
            Backup de {dataBr(previa.exportadoEm)}: {plural(previa.operacoes, 'operação', 'operações')} ({plural(previa.pontos, 'ponto', 'pontos')}) e {plural(previa.demandas, 'demanda', 'demandas')}, {plural(previa.contatos, 'contato', 'contatos')}, {plural(previa.atalhos, 'atalho', 'atalhos')} e {plural(previa.feriados, 'ajuste de feriados', 'ajustes de feriados')}.
            {previa.ilegiveis > 0 && ` ${plural(previa.ilegiveis, 'operação do arquivo não abre e irá', 'operações do arquivo não abrem e irão')} para a quarentena.`}
          </p>
          <p>
            Importar SUBSTITUI os dados atuais ({plural(operacoes.length, 'operação', 'operações')} e {plural(demandas.length, 'demanda', 'demandas')}).
            Antes de aplicar, o estado atual é baixado como guara-antes-da-importacao-AAAA-MM-DD-HHMM.json.
            As operações atuais ficam também em quarentena e as demandas podem ser restauradas em Alertas › "Desfazer última importação".
          </p>
          <div className="acoes">
            <button type="button" className="botao botao--primario" onClick={confirmar}>Confirmar importação</button>
            <button type="button" className="botao" onClick={() => setPrevia(null)}>Cancelar</button>
          </div>
        </div>
      )}
      {mensagem && <p role={mensagem.erro ? 'alert' : 'status'} className={mensagem.erro ? 'aviso' : 'texto-pequeno'}>{mensagem.texto}</p>}

      {quarentena.length > 0 && (
        <>
          <h3 data-testid="titulo-quarentena"><strong>Dados ilegíveis guardados ({quarentena.length})</strong></h3>
          <p className="texto-pequeno texto-suave">Não foram apagados. Baixe antes de remover.</p>
          <ul className="lista-limpa">
            {quarentena.map((q, i) => (
              <li key={`${q.quando}-${i}`} className="texto-pequeno">
                {dataBr(q.quando)} · {q.motivo}{' '}
                <button type="button" className="botao botao--pequeno" onClick={() => baixar(`guara-quarentena-${i + 1}.json`, q.bruto)}>Baixar</button>{' '}
                <button type="button" className="botao botao--pequeno botao--perigo" onClick={() => { if (window.confirm('Remover este conteúdo da quarentena? Só faça isso depois de baixar.')) removerDaQuarentena(i); }}>Remover</button>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
