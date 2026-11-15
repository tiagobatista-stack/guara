-- GUARÁ: confere a RLS da migração 20261114180000_demandas.sql no Supabase de verdade.
-- Uso: colar inteiro no SQL Editor do projeto de DESENVOLVIMENTO e rodar, depois da migração.
--
-- Não deixa rastro: tudo roda num único bloco que termina com um ERRO PROPOSITAL.
-- O erro desfaz tudo (usuários fictícios, demandas e eventos), e a mensagem dele é o relatório:
--   "GUARÁ RLS: N PASSOU, 0 FALHOU (erro proposital: nada foi gravado)" seguido de uma linha por verificação.
--
-- Usa dois usuários fictícios (Ana e Beto, os mesmos UUIDs do teste local em testar-migracoes.ts).
-- Se a inserção em auth.users for recusada por permissão, o relatório mostra isso logo no começo.
-- Espelha testar-migracoes.ts, com duas diferenças do Supabase real: o auth.uid() lê
-- request.jwt.claims (JSON) e há conferência dos privilégios padrão do esquema public.

do $guara$
declare
  ana constant uuid := '00000000-0000-4000-8000-00000000000a';
  beto constant uuid := '00000000-0000-4000-8000-00000000000b';
  -- Cada verificação: quem, nome, comando e o esperado:
  --   'falha'  → o comando precisa ser recusado;
  --   'aceita' → o comando precisa passar;
  --   número   → select: quantas linhas devem aparecer; update/delete: quantas linhas devem mudar.
  verificacoes constant text[][] := array[
    -- Ana grava as dela
    ['ana', 'Ana cria demanda', $$insert into public.demandas (id, titulo, prioridade, status) values ('DEM-FIC-0001', 'Analisar processo FIC-0001', 'Média', 'A Fazer')$$, 'aceita'],
    ['ana', 'Ana acrescenta evento', $$insert into public.eventos_demanda (demanda_id, acao, para) values ('DEM-FIC-0001', 'criada', 'A Fazer')$$, 'aceita'],
    ['ana', 'Ana grava configuração', $$insert into public.configuracoes (dias_inatividade) values (5)$$, 'aceita'],
    ['ana', 'dono preenchido pela sessão (auth.uid)', $$select 1 from public.demandas where dono = '00000000-0000-4000-8000-00000000000a'$$, '1'],
    -- Beto não enxerga nem mexe no que é da Ana
    ['beto', 'Beto não vê as demandas da Ana', $$select 1 from public.demandas$$, '0'],
    ['beto', 'Beto não vê o histórico da Ana', $$select 1 from public.eventos_demanda$$, '0'],
    ['beto', 'Beto não vê a configuração da Ana', $$select 1 from public.configuracoes$$, '0'],
    ['beto', 'Beto não altera a demanda da Ana (0 linhas)', $$update public.demandas set titulo = 'Alterado pelo Beto' where id = 'DEM-FIC-0001'$$, '0'],
    ['beto', 'Beto não apaga a demanda da Ana (0 linhas)', $$delete from public.demandas where id = 'DEM-FIC-0001'$$, '0'],
    ['beto', 'Beto não grava demanda em nome da Ana', $$insert into public.demandas (dono, id, titulo, prioridade, status) values ('00000000-0000-4000-8000-00000000000a', 'X-1', 'Título válido', 'Média', 'A Fazer')$$, 'falha'],
    ['beto', 'Beto não acrescenta evento na demanda da Ana', $$insert into public.eventos_demanda (dono, demanda_id, acao) values ('00000000-0000-4000-8000-00000000000a', 'DEM-FIC-0001', 'travou')$$, 'falha'],
    ['beto', 'o mesmo id pode existir para pessoas diferentes', $$insert into public.demandas (id, titulo, prioridade, status) values ('DEM-FIC-0001', 'Mesmo id, outra pessoa', 'Média', 'A Fazer')$$, 'aceita'],
    -- Anônimo não vê nada
    ['anon', 'anônimo não lê demandas', $$select 1 from public.demandas$$, 'falha'],
    ['anon', 'anônimo não grava demandas', $$insert into public.demandas (id, titulo, prioridade, status) values ('ANON-1', 'Título válido', 'Média', 'A Fazer')$$, 'falha'],
    -- Regras do modelo valem no banco
    ['ana', 'dado não fictício é recusado', $$insert into public.demandas (id, titulo, prioridade, status, ficticio) values ('R-1', 'Título válido', 'Média', 'A Fazer', false)$$, 'falha'],
    ['ana', 'título curto é recusado', $$insert into public.demandas (id, titulo, prioridade, status) values ('T-1', 'ab', 'Média', 'A Fazer')$$, 'falha'],
    ['ana', 'status fora da lista é recusado', $$insert into public.demandas (id, titulo, prioridade, status) values ('S-1', 'Título válido', 'Média', 'Arquivada')$$, 'falha'],
    ['ana', 'coordenada pela metade é recusada', $$insert into public.demandas (id, titulo, prioridade, status, coordenada_lat) values ('C-1', 'Título válido', 'Média', 'A Fazer', -15.5)$$, 'falha'],
    ['ana', 'detalhe de bloqueio sem bloqueio é recusado', $$insert into public.demandas (id, titulo, prioridade, status, bloqueio_detalhe) values ('B-1', 'Título válido', 'Média', 'A Fazer', 'texto')$$, 'falha'],
    ['ana', 'concluída travada é recusada', $$insert into public.demandas (id, titulo, prioridade, status, bloqueio_motivo, bloqueio_desde) values ('B-2', 'Título válido', 'Média', 'Concluída', 'campo', now())$$, 'falha'],
    ['ana', 'limiar de inatividade fora de 1 a 365 é recusado', $$update public.configuracoes set dias_inatividade = 0$$, 'falha'],
    ['ana', 'demanda completa (coordenada e bloqueio com detalhe) é aceita', $$insert into public.demandas (id, titulo, prioridade, status, coordenada_lat, coordenada_lon, bloqueio_motivo, bloqueio_desde, bloqueio_detalhe) values ('DEM-FIC-0002', 'Vistoria de campo FIC-0002', 'Alta', 'Em Andamento', -15.5, -55.5, 'documento', now(), 'Aguardando certidão (fictícia).')$$, 'aceita'],
    -- Histórico só acrescenta
    ['ana', 'histórico não pode ser alterado', $$update public.eventos_demanda set acao = 'destravou'$$, 'falha'],
    ['ana', 'histórico não pode ser apagado', $$delete from public.eventos_demanda$$, 'falha'],
    ['ana', 'Ana apaga a própria demanda', $$delete from public.demandas where id = 'DEM-FIC-0001'$$, '1'],
    ['ana', 'excluir a demanda leva junto o histórico dela', $$select 1 from public.eventos_demanda$$, '0']
  ];
  relatorio text[] := '{}';
  passou int := 0;
  falhou int := 0;
  quem text; nome text; comando text; esperado text;
  obtido text; ok boolean; n bigint; tabela text;

  -- (sem subfunções: o bloco precisa ser um só para o erro final desfazer tudo)
begin
  -- 1. Estrutura: RLS ligada, políticas presentes, anônimo sem nenhum privilégio
  foreach tabela in array array['demandas', 'eventos_demanda', 'configuracoes'] loop
    ok := coalesce((select c.relrowsecurity from pg_class c join pg_namespace s on s.oid = c.relnamespace
                    where s.nspname = 'public' and c.relname = tabela), false);
    relatorio := relatorio || format('%s · RLS ligada em %s', case when ok then 'PASSOU' else 'FALHOU' end, tabela);
    if ok then passou := passou + 1; else falhou := falhou + 1; end if;

    ok := not (has_table_privilege('anon', 'public.' || tabela, 'select')
            or has_table_privilege('anon', 'public.' || tabela, 'insert')
            or has_table_privilege('anon', 'public.' || tabela, 'update')
            or has_table_privilege('anon', 'public.' || tabela, 'delete'));
    relatorio := relatorio || format('%s · anônimo sem privilégio em %s', case when ok then 'PASSOU' else 'FALHOU' end, tabela);
    if ok then passou := passou + 1; else falhou := falhou + 1; end if;
  end loop;

  n := (select count(*) from pg_policies where schemaname = 'public'
        and policyname in ('demandas_do_dono', 'configuracoes_do_dono', 'eventos_ler_do_dono', 'eventos_acrescentar_do_dono'));
  ok := n = 4;
  relatorio := relatorio || format('%s · 4 políticas presentes (encontradas: %s)', case when ok then 'PASSOU' else 'FALHOU' end, n);
  if ok then passou := passou + 1; else falhou := falhou + 1; end if;

  ok := not (has_table_privilege('authenticated', 'public.eventos_demanda', 'update')
          or has_table_privilege('authenticated', 'public.eventos_demanda', 'delete'));
  relatorio := relatorio || format('%s · histórico sem update/delete para authenticated', case when ok then 'PASSOU' else 'FALHOU' end);
  if ok then passou := passou + 1; else falhou := falhou + 1; end if;

  -- 2. Usuários fictícios (desfeitos pelo erro final)
  begin
    insert into auth.users (id, aud, role, email)
    values (ana, 'authenticated', 'authenticated', 'ana.ficticia@exemplo.invalid'),
           (beto, 'authenticated', 'authenticated', 'beto.ficticio@exemplo.invalid');
  exception when others then
    raise exception 'GUARÁ RLS: não consegui criar os usuários fictícios em auth.users (%). Nada foi gravado.', sqlerrm;
  end;

  -- 3. Comportamento: cada verificação entra como Ana, Beto ou anônimo, como uma requisição do app
  for i in 1 .. array_length(verificacoes, 1) loop
    quem := verificacoes[i][1]; nome := verificacoes[i][2]; comando := verificacoes[i][3]; esperado := verificacoes[i][4];
    begin
      if quem = 'anon' then
        perform set_config('request.jwt.claims', '{"role":"anon"}', true);
        set local role anon;
      else
        perform set_config('request.jwt.claims',
          json_build_object('sub', case quem when 'ana' then ana else beto end, 'role', 'authenticated')::text, true);
        set local role authenticated;
      end if;

      if comando ilike 'select%' then
        execute format('select count(*) from (%s) q', comando) into n;
      else
        execute comando;
        get diagnostics n = row_count;
      end if;
      reset role;

      if esperado = 'falha' then ok := false; obtido := 'foi aceito';
      elsif esperado = 'aceita' then ok := true; obtido := '';
      else ok := n = esperado::bigint; obtido := format('%s linha(s)', n);
      end if;
    exception when others then
      -- o subbloco desfaz o comando e a troca de papel
      ok := esperado = 'falha';
      obtido := sqlerrm;
    end;
    reset role;
    relatorio := relatorio || format('%s · %s%s', case when ok then 'PASSOU' else 'FALHOU' end, nome,
                                     case when obtido <> '' then ' · ' || obtido else '' end);
    if ok then passou := passou + 1; else falhou := falhou + 1; end if;
  end loop;

  -- 4. Erro proposital: desfaz tudo e entrega o relatório
  raise exception E'GUARÁ RLS: % PASSOU, % FALHOU (erro proposital: nada foi gravado)\n%',
    passou, falhou, array_to_string(relatorio, E'\n');
end
$guara$;
