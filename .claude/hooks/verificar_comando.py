"""Hook PreToolUse do GUARÁ (seções 9.6 e 20.7).

Bloqueia, antes da execução:
- comandos destrutivos em Bash/PowerShell (exclusão recursiva, formatação,
  reset/clean forçado do Git, push forçado, DROP/TRUNCATE de banco);
- gravação de arquivos .env / credenciais e de conteúdo com aparência de segredo
  (chaves privadas, service_role, tokens de API) via Write/Edit.

Saída 0 = permitido; saída 2 = bloqueado (mensagem em stderr para o Claude).
Em caso de erro inesperado, bloqueia de forma conservadora.
Hooks não substituem validação no backend e no banco (seção 11).
"""
import json
import re
import sys

COMANDOS_DESTRUTIVOS = [
    # Sentinela inofensiva da apostila (P11): prova que o bloqueio vem do hook.
    (r"GUARA_HOOK_TEST_BLOCK", "sentinela GUARA_HOOK_TEST_BLOCK"),
    (r"\brm\s+(-[a-zA-Z]*r[a-zA-Z]*f|-[a-zA-Z]*f[a-zA-Z]*r)\b", "rm -rf"),
    (r"\brm\s+-r\b", "rm -r"),
    (r"\bRemove-Item\b.*-Recurse", "Remove-Item -Recurse"),
    (r"\b(rd|rmdir)\s+/s\b", "rmdir /s"),
    (r"\bdel\s+/[sq]\b", "del /s"),
    (r"\bformat(-volume)?\s+[a-zA-Z]:", "formatação de disco"),
    (r"\bgit\s+reset\s+--hard\b", "git reset --hard"),
    (r"\bgit\s+clean\s+-[a-zA-Z]*f", "git clean -f"),
    (r"\bgit\s+push\b.*(--force|-f\b)", "git push --force"),
    (r"\bgit\s+push\b", "git push (exige autorização do responsável)"),
    (r"\bgh\s+repo\s+(create|delete)\b", "criação/exclusão de repositório GitHub"),
    (r"\bdrop\s+(table|database|schema)\b", "DROP de banco"),
    (r"\btruncate\s+table\b", "TRUNCATE"),
    (r"\bsupabase\s+db\s+reset\b", "supabase db reset"),
]

ARQUIVOS_SENSIVEIS = re.compile(r"(^|[\\/])(\.env(\.[^\\/]*)?|.*\.pem|.*\.key|id_rsa[^\\/]*|credenciais[^\\/]*\.json)$", re.I)
EXCECOES_ARQUIVO = re.compile(r"\.env\.exemplo$", re.I)

PADROES_SEGREDO = [
    (r"-----BEGIN [A-Z ]*PRIVATE KEY-----", "chave privada"),
    (r"(?i)service_role[\"']?\s*[:=]\s*[\"']?eyJ", "chave service_role do Supabase"),
    (r"\beyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{10,}", "JWT/token"),
    (r"\bsk-[A-Za-z0-9_-]{20,}", "chave de API (sk-)"),
    (r"\bgh[pousr]_[A-Za-z0-9]{30,}", "token do GitHub"),
    (r"\bAKIA[0-9A-Z]{16}\b", "chave AWS"),
    (r"\bAIza[0-9A-Za-z_-]{35}\b", "chave de API Google"),
]


def avaliar(dados: dict) -> str | None:
    """Devolve o motivo do bloqueio, ou None se permitido."""
    ferramenta = dados.get("tool_name", "")
    entrada = dados.get("tool_input", {}) or {}

    if ferramenta in ("Bash", "PowerShell"):
        comando = entrada.get("command", "")
        for padrao, nome in COMANDOS_DESTRUTIVOS:
            if re.search(padrao, comando, re.I):
                return f"Comando bloqueado ({nome}). Exige revisão e autorização humana."
        return None

    if ferramenta in ("Write", "Edit", "MultiEdit", "NotebookEdit"):
        caminho = entrada.get("file_path", "") or entrada.get("notebook_path", "")
        if ARQUIVOS_SENSIVEIS.search(caminho) and not EXCECOES_ARQUIVO.search(caminho):
            return f"Gravação bloqueada: '{caminho}' é arquivo de segredo/credencial e não deve ser criado pelo agente."
        conteudo = " ".join(
            str(entrada.get(k, "")) for k in ("content", "new_string", "new_source")
        )
        for edicao in entrada.get("edits", []) or []:
            conteudo += " " + str(edicao.get("new_string", ""))
        for padrao, nome in PADROES_SEGREDO:
            if re.search(padrao, conteudo):
                return f"Gravação bloqueada: conteúdo parece conter {nome}. Use o cofre de segredos (supabase secrets)."
    return None


def main() -> int:
    # No Windows o padrão é cp1252; o Claude Code envia e lê UTF-8.
    for fluxo in (sys.stdin, sys.stderr):
        if hasattr(fluxo, "reconfigure"):
            fluxo.reconfigure(encoding="utf-8")
    try:
        dados = json.load(sys.stdin)
        motivo = avaliar(dados)
    except Exception as exc:  # conservador: na dúvida, bloqueia
        print(f"Hook falhou de forma conservadora: {exc}", file=sys.stderr)
        return 2
    if motivo:
        print(motivo, file=sys.stderr)
        return 2
    return 0


if __name__ == "__main__":
    sys.exit(main())
