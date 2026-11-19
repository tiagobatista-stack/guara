/** Baixa um texto como arquivo (JSON por padrão). */
export function baixar(nome: string, conteudo: string, tipo = 'application/json;charset=utf-8'): void {
  const url = URL.createObjectURL(new Blob([conteudo], { type: tipo }));
  const a = document.createElement('a');
  a.href = url;
  a.download = nome;
  a.click();
  URL.revokeObjectURL(url);
}
