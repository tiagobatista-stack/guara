"""Testes do hook PreToolUse. Executar a partir da raiz do projeto:

    python -m unittest testes/unidade/test_hook_verificar_comando.py -v

Os exemplos de segredo são montados por concatenação para que o próprio hook
não bloqueie a gravação deste arquivo.
"""
import json
import pathlib
import subprocess
import sys
import unittest

HOOK = pathlib.Path(__file__).resolve().parents[2] / ".claude" / "hooks" / "verificar_comando.py"


def rodar(dados) -> int:
    entrada = dados if isinstance(dados, str) else json.dumps(dados)
    r = subprocess.run([sys.executable, str(HOOK)], input=entrada, capture_output=True, text=True, encoding="utf-8")
    return r.returncode


class TestHook(unittest.TestCase):
    def test_permite_comandos_comuns(self):
        for cmd in ["npm run build", "git status", "git commit -m 'x'", "Get-ChildItem", "python --version"]:
            with self.subTest(cmd=cmd):
                self.assertEqual(rodar({"tool_name": "Bash", "tool_input": {"command": cmd}}), 0)

    def test_bloqueia_destrutivos_bash_e_powershell(self):
        casos = [
            ("Bash", "rm -rf aplicacao"),
            ("Bash", "rm -fr /"),
            ("Bash", "git reset --hard HEAD~1"),
            ("Bash", "git push origin main"),
            ("Bash", "git push --force"),
            ("Bash", "git clean -fd"),
            ("PowerShell", "Remove-Item -Path x -Recurse -Force"),
            ("PowerShell", "rmdir /s /q pasta"),
            ("Bash", "psql -c 'DROP TABLE demandas'"),
            ("Bash", "gh repo create guara --public"),
        ]
        for ferramenta, cmd in casos:
            with self.subTest(cmd=cmd):
                self.assertEqual(rodar({"tool_name": ferramenta, "tool_input": {"command": cmd}}), 2)

    def test_bloqueia_arquivo_env(self):
        self.assertEqual(rodar({"tool_name": "Write", "tool_input": {"file_path": "aplicacao/.env", "content": "X=1"}}), 2)
        self.assertEqual(rodar({"tool_name": "Write", "tool_input": {"file_path": "C:\\p\\.env.local", "content": "X=1"}}), 2)

    def test_permite_env_exemplo(self):
        self.assertEqual(rodar({"tool_name": "Write", "tool_input": {"file_path": "aplicacao/.env.exemplo", "content": "VITE_SUPABASE_URL="}}), 0)

    def test_bloqueia_conteudo_com_segredo(self):
        chave_privada = "-----BEGIN " + "RSA PRIVATE KEY-----"
        token_github = "gh" + "p_" + "a" * 36
        service_role = "service_role" + "=" + "eyJ" + "x" * 30
        for conteudo in [chave_privada, token_github, service_role]:
            with self.subTest(conteudo=conteudo[:12]):
                self.assertEqual(rodar({"tool_name": "Write", "tool_input": {"file_path": "a.ts", "content": conteudo}}), 2)
        self.assertEqual(rodar({"tool_name": "Edit", "tool_input": {"file_path": "a.ts", "old_string": "x", "new_string": token_github}}), 2)

    def test_permite_codigo_normal(self):
        self.assertEqual(rodar({"tool_name": "Write", "tool_input": {"file_path": "a.ts", "content": "export const x = 1;"}}), 0)

    def test_entrada_invalida_bloqueia_de_forma_conservadora(self):
        self.assertEqual(rodar("isto não é json"), 2)


if __name__ == "__main__":
    unittest.main()
