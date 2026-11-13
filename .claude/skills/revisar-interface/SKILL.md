---
name: revisar-interface
description: Revisa a interface do GUARÁ quanto a acessibilidade (WCAG 2.1 AA como meta), responsividade (smartphone, tablet e desktop) e regressão visual do layout em três áreas. Use após mudanças em aplicacao/src.
---
# Revisar interface

1. Suba o app com `npm run dev` em `aplicacao/` (host 127.0.0.1). Sem Node, registre **NÃO TESTADO** e pare.
2. Abra o app no navegador nas larguras 375 px (smartphone), 768 px (tablet) e 1280 px ou mais (desktop). Confira:
   - **Smartphone:** barra inferior com até 5 itens, menu completo em gaveta, botão flutuante do assistente e blocos em uma coluna.
   - **Tablet:** menu lateral recolhido, só com ícones e com `title`.
   - **Desktop:** menu completo, área central e painel do assistente à direita.
3. Acessibilidade:
   - navegação por teclado (Tab) com foco visível;
   - "Pular para o conteúdo";
   - `aria-label` nos botões só com ícone;
   - estados com texto e símbolo, não apenas cor;
   - contraste no modo claro e no escuro;
   - áreas de toque de pelo menos 44 px.
4. Na tela Saúde do sistema, confira:
   - a faixa "Modo local, sem Supabase" está visível;
   - o estado inicial é NÃO TESTADO;
   - depois de "Executar verificação", os estados refletem a execução real.
5. Registre em `metodologia/evidencias/` o que foi visto, com capturas de tela quando possível, marcando PASSOU, FALHOU ou NÃO TESTADO por item.
6. Não reproduza marca, ícones ou avatares da imagem de referência (seção 7.4).
