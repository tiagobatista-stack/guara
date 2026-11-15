-- GUARÁ: demandas, histórico e configuração, com RLS por usuário (planejamento, seções 9.5, 11 e 12).
-- Espelha o modelo do app (planejamento/PLANO.md §2). Cada pessoa só vê e altera o que é dela;
-- a regra mora no banco, não na interface. A chave service_role ignora a RLS e nunca vai ao navegador.
-- Até haver autorização institucional, só dados fictícios: `ficticio` é obrigatoriamente verdadeiro.

-- ---------- Demandas ----------

create table public.demandas (
  dono uuid not null default auth.uid() references auth.users (id) on delete cascade,
  id text not null check (length(id) between 1 and 100),
  titulo text not null check (length(btrim(titulo)) between 3 and 120),
  descricao text not null default '' check (length(descricao) <= 2000),
  responsavel text not null default '' check (length(btrim(responsavel)) <= 80),
  prioridade text not null check (prioridade in ('Alta', 'Média', 'Baixa')),
  status text not null check (status in ('A Fazer', 'Em Andamento', 'Em Validação', 'Concluída')),
  criada_em timestamptz not null default now(),
  prazo date,
  ultima_acao_relevante timestamptz not null default now(),
  -- Bloqueio (demanda travada): motivo por categoria, desde quando e detalhe livre opcional.
  bloqueio_motivo text check (bloqueio_motivo in ('documento', 'setor', 'campo', 'outro')),
  bloqueio_desde timestamptz,
  bloqueio_detalhe text check (bloqueio_detalhe is null or (btrim(bloqueio_detalhe) <> '' and length(bloqueio_detalhe) <= 300)),
  -- Os três números, já normalizados pelo app (o formato é conferido lá).
  processo text check (processo is null or length(processo) between 1 and 60),
  simp text check (simp is null or length(simp) between 1 and 60),
  judicial text check (judicial is null or length(judicial) between 1 and 60),
  tipo text check (tipo in ('campo', 'gabinete')),
  natureza text check (natureza in ('demanda', 'comum')),
  -- Graus decimais, SIRGAS 2000. Pode identificar um imóvel.
  coordenada_lat numeric(9, 6) check (coordenada_lat between -90 and 90),
  coordenada_lon numeric(9, 6) check (coordenada_lon between -180 and 180),
  ficticio boolean not null default true check (ficticio),
  primary key (dono, id),
  constraint bloqueio_completo check (
    (bloqueio_motivo is null) = (bloqueio_desde is null) and (bloqueio_motivo is not null or bloqueio_detalhe is null)
  ),
  constraint concluida_sem_bloqueio check (status <> 'Concluída' or bloqueio_motivo is null),
  constraint coordenada_completa check ((coordenada_lat is null) = (coordenada_lon is null))
);

comment on table public.demandas is 'Demandas do GUARÁ, uma linha por demanda e por dono (RLS). Só dados fictícios até autorização institucional.';

-- ---------- Histórico: status e bloqueio ao longo do tempo (só acrescenta) ----------

create table public.eventos_demanda (
  id bigint generated always as identity primary key,
  dono uuid not null default auth.uid(),
  demanda_id text not null,
  quando timestamptz not null default now(),
  acao text not null check (acao in ('criada', 'status', 'travou', 'bloqueio-alterado', 'ainda-travada', 'destravou', 'bloqueio-encerrado')),
  de text check (de in ('A Fazer', 'Em Andamento', 'Em Validação', 'Concluída')),
  para text check (para in ('A Fazer', 'Em Andamento', 'Em Validação', 'Concluída')),
  motivo text check (motivo in ('documento', 'setor', 'campo', 'outro')),
  detalhe text check (detalhe is null or (btrim(detalhe) <> '' and length(detalhe) <= 300)),
  foreign key (dono, demanda_id) references public.demandas (dono, id) on delete cascade
);

create index eventos_demanda_por_demanda on public.eventos_demanda (dono, demanda_id, quando);

comment on table public.eventos_demanda is 'Histórico da demanda. Sem update nem delete para usuários: some só com a exclusão da própria demanda.';

-- ---------- Configuração por pessoa ----------

create table public.configuracoes (
  dono uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  dias_inatividade integer not null default 3 check (dias_inatividade between 1 and 365),
  feriados jsonb not null default '{"extras": [], "remover": [], "facultativos": false}' check (jsonb_typeof(feriados) = 'object'),
  mascote jsonb check (mascote is null or jsonb_typeof(mascote) = 'object'),
  atualizado_em timestamptz not null default now()
);

comment on table public.configuracoes is 'Limiar de inatividade, feriados locais e preferências do mascote, uma linha por pessoa.';

-- ---------- Acesso: nada para anônimos; cada pessoa só o que é dela ----------

alter table public.demandas enable row level security;
alter table public.eventos_demanda enable row level security;
alter table public.configuracoes enable row level security;

revoke all on public.demandas, public.eventos_demanda, public.configuracoes from anon;
revoke all on public.demandas, public.eventos_demanda, public.configuracoes from authenticated;

grant select, insert, update, delete on public.demandas to authenticated;
grant select, insert, update, delete on public.configuracoes to authenticated;
-- Histórico: ler e acrescentar, nunca alterar nem apagar.
grant select, insert on public.eventos_demanda to authenticated;

create policy demandas_do_dono on public.demandas
  for all to authenticated
  using (dono = (select auth.uid()))
  with check (dono = (select auth.uid()));

create policy configuracoes_do_dono on public.configuracoes
  for all to authenticated
  using (dono = (select auth.uid()))
  with check (dono = (select auth.uid()));

create policy eventos_ler_do_dono on public.eventos_demanda
  for select to authenticated
  using (dono = (select auth.uid()));

create policy eventos_acrescentar_do_dono on public.eventos_demanda
  for insert to authenticated
  with check (dono = (select auth.uid()));
