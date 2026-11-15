// Executa as migrações num PostgreSQL de verdade (PGlite, dentro do Node, sem servidor nem conta)
// e confere a RLS com dois usuários fictícios. Uso: `cd backend/supabase && npm run testar`.
// O esquema `auth` e os papéis `anon` e `authenticated` imitam os do Supabase, só para o teste.

import { readdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { PGlite } from '@electric-sql/pglite';

const PASTA = fileURLToPath(new URL('../migrations/', import.meta.url));
const ANA = '00000000-0000-4000-8000-00000000000a'; // usuários fictícios
const BETO = '00000000-0000-4000-8000-00000000000b';

const IMITACAO_SUPABASE = `
  create schema auth;
  create table auth.users (id uuid primary key);
  create function auth.uid() returns uuid language sql stable
    as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  create role anon nologin;
  create role authenticated nologin;
  grant usage on schema public, auth to anon, authenticated;
  grant execute on function auth.uid() to anon, authenticated;
  insert into auth.users values ('${ANA}'), ('${BETO}');
`;

const db = new PGlite();
let falhas = 0;

function registrar(ok: boolean, nome: string, detalhe = '') {
  if (!ok) falhas++;
  console.log(`${ok ? 'PASSOU' : 'FALHOU'} · ${nome}${detalhe ? ` · ${detalhe}` : ''}`);
}

/** Entra como um usuário (ou anônimo), como o Supabase faz a cada requisição. */
async function como(usuario: string | null) {
  await db.exec('reset role');
  await db.query(`select set_config('request.jwt.claim.sub', $1, false)`, [usuario ?? '']);
  await db.exec(`set role ${usuario ? 'authenticated' : 'anon'}`);
}

async function deveFalhar(nome: string, sql: string, params: unknown[] = []) {
  try {
    await db.query(sql, params);
    registrar(false, nome, 'foi aceito');
  } catch (e) {
    registrar(true, nome, (e as Error).message.split('\n')[0]);
  }
}

async function linhas(sql: string, params: unknown[] = []) {
  return (await db.query(sql, params)).rows;
}

const DEMANDA = `insert into public.demandas (id, titulo, prioridade, status) values ($1, $2, 'Média', 'A Fazer')`;

await db.exec(IMITACAO_SUPABASE);
const arquivos = (await readdir(PASTA)).filter((a) => a.endsWith('.sql')).sort();
for (const arquivo of arquivos) {
  await db.exec(await readFile(PASTA + arquivo, 'utf8'));
  registrar(true, `migração aplicada: ${arquivo}`);
}

// --- Ana grava as dela ---
await como(ANA);
await db.query(DEMANDA, ['DEM-FIC-0001', 'Analisar processo FIC-0001']);
await db.query(`insert into public.eventos_demanda (demanda_id, acao, para) values ('DEM-FIC-0001', 'criada', 'A Fazer')`);
await db.query(`insert into public.configuracoes (dias_inatividade) values (5)`);
registrar((await linhas('select dono from public.demandas'))[0]?.dono === ANA, 'dono preenchido pela sessão (auth.uid)');

// --- Beto não enxerga nem mexe no que é da Ana ---
await como(BETO);
registrar((await linhas('select * from public.demandas')).length === 0, 'Beto não vê as demandas da Ana');
registrar((await linhas('select * from public.eventos_demanda')).length === 0, 'Beto não vê o histórico da Ana');
registrar((await linhas('select * from public.configuracoes')).length === 0, 'Beto não vê a configuração da Ana');
const alteradas = await db.query(`update public.demandas set titulo = 'Alterado pelo Beto' where id = 'DEM-FIC-0001'`);
registrar(alteradas.affectedRows === 0, 'Beto não altera a demanda da Ana (0 linhas)');
const apagadas = await db.query(`delete from public.demandas where id = 'DEM-FIC-0001'`);
registrar(apagadas.affectedRows === 0, 'Beto não apaga a demanda da Ana (0 linhas)');
await deveFalhar('Beto não grava demanda em nome da Ana', `insert into public.demandas (dono, id, titulo, prioridade, status) values ($1, 'X-1', 'Título válido', 'Média', 'A Fazer')`, [ANA]);
await deveFalhar('Beto não acrescenta evento na demanda da Ana', `insert into public.eventos_demanda (dono, demanda_id, acao) values ($1, 'DEM-FIC-0001', 'travou')`, [ANA]);
await db.query(DEMANDA, ['DEM-FIC-0001', 'Mesmo id, outra pessoa']);
registrar(true, 'o mesmo id pode existir para pessoas diferentes');

// --- Anônimo não vê nada ---
await como(null);
await deveFalhar('anônimo não lê demandas', 'select * from public.demandas');
await deveFalhar('anônimo não grava demandas', DEMANDA, ['ANON-1', 'Título válido']);

// --- Regras do modelo valem no banco ---
await como(ANA);
await deveFalhar('dado não fictício é recusado', `insert into public.demandas (id, titulo, prioridade, status, ficticio) values ('R-1', 'Título válido', 'Média', 'A Fazer', false)`);
await deveFalhar('título curto é recusado', DEMANDA, ['T-1', 'ab']);
await deveFalhar('status fora da lista é recusado', `insert into public.demandas (id, titulo, prioridade, status) values ('S-1', 'Título válido', 'Média', 'Arquivada')`);
await deveFalhar('coordenada pela metade é recusada', `insert into public.demandas (id, titulo, prioridade, status, coordenada_lat) values ('C-1', 'Título válido', 'Média', 'A Fazer', -15.5)`);
await deveFalhar('detalhe de bloqueio sem bloqueio é recusado', `insert into public.demandas (id, titulo, prioridade, status, bloqueio_detalhe) values ('B-1', 'Título válido', 'Média', 'A Fazer', 'texto')`);
await deveFalhar('concluída travada é recusada', `insert into public.demandas (id, titulo, prioridade, status, bloqueio_motivo, bloqueio_desde) values ('B-2', 'Título válido', 'Média', 'Concluída', 'campo', now())`);
await deveFalhar('limiar de inatividade fora de 1 a 365 é recusado', `update public.configuracoes set dias_inatividade = 0`);
await db.query(`insert into public.demandas (id, titulo, prioridade, status, coordenada_lat, coordenada_lon, bloqueio_motivo, bloqueio_desde, bloqueio_detalhe)
  values ('DEM-FIC-0002', 'Vistoria de campo FIC-0002', 'Alta', 'Em Andamento', -15.5, -55.5, 'documento', now(), 'Aguardando certidão (fictícia).')`);
registrar(true, 'demanda completa (coordenada e bloqueio com detalhe) é aceita');

// --- Histórico só acrescenta ---
await deveFalhar('histórico não pode ser alterado', `update public.eventos_demanda set acao = 'destravou'`);
await deveFalhar('histórico não pode ser apagado', `delete from public.eventos_demanda`);
await db.query(`delete from public.demandas where id = 'DEM-FIC-0001'`);
registrar((await linhas('select * from public.eventos_demanda')).length === 0, 'excluir a demanda leva junto o histórico dela');

await db.exec('reset role');
console.log(falhas === 0 ? '\nTODAS AS VERIFICAÇÕES PASSARAM' : `\n${falhas} VERIFICAÇÃO(ÕES) FALHARAM`);
process.exit(falhas === 0 ? 0 : 1);
