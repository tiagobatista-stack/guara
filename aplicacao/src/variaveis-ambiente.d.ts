// Variáveis públicas lidas pelo Vite (prefixo VITE_). Só a URL e a chave PÚBLICA do Supabase;
// segredos (service_role, segredo do Google) nunca entram aqui nem no navegador.
interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_ANON_KEY?: string;
}
