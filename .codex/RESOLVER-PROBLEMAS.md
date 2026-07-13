# Resolver problemas em D:\helper

## A automacao nao executou

Confirme:

- computador ligado;
- Codex aberto e autenticado;
- projeto `D:\helper` ainda adicionado;
- automacao habilitada;
- modo Local;
- horario e fuso do Windows corretos.

## A automacao parou por arquivos alterados

Isso e intencional. Revise, commite ou descarte conscientemente seu trabalho manual. A automacao nao executa reset ou limpeza destrutiva.

Use:

```text
cd /d D:\helper
git status
```

## O push falhou

Execute:

```text
VALIDAR-D-HELPER.cmd
```

Depois confira a autenticacao Git ja usada normalmente nesse repositorio. O pacote nao cria chave de API da OpenAI e nao altera credenciais do GitHub.

## A branch divergiu

O pacote nao usa force push. Resolva a divergencia conscientemente antes da proxima execucao. As automacoes devem parar quando nao puderem sincronizar por fast-forward ou rebase seguro.

## O Codex tentou criar worktree

Edite a automacao e confirme:

- projeto: `D:\helper`;
- modo: Local;
- prompt: arquivo correto em `.codex/automation-prompts`.

## Limite do Plus

Quatro execucoes profundas por dia podem consumir bastante uso. Se necessario, mantenha Evolucao e Revisao diarias e reduza UI/UX e Manutencao para dias alternados.
