# Helper Codex, main direto, commit e push

Use os `.cmd`.

## O que faz

- Trabalha em `D:\helper`
- Usa `main`
- Não cria branch
- Não cria PR
- Não cria worktree
- Não cria workspace
- Faz `git fetch origin main`
- Faz `git pull --rebase origin main`
- Roda Codex
- Gera patch em `D:\helper\.codex-patches`
- Atualiza `CHANGELOG.md`
- Atualiza patch version do `package.json` quando o Codex não tiver atualizado
- Faz `git commit`
- Faz `git pull --rebase origin main`
- Faz `git push origin main`

## Scripts

```text
01_ABRIR_REPARO_PROFUNDO.cmd
02_ABRIR_REVISAO_FEATURES.cmd
03_ABRIR_REVISAO_UI_UX.cmd
04_ABRIR_FEATURE_NOVA.cmd
```

## Comando Codex usado

```powershell
codex exec -C D:\helper --model gpt-5.5 --dangerously-bypass-approvals-and-sandbox -c "web_search=""live""" -
```

## Logs e patches

```text
D:\helper\.codex-runs
D:\helper\.codex-patches
```

## Sobre pull request

Este pacote não cria PR porque PR exige branch. Como a regra é trabalhar direto na `main`, ele faz commit e push direto na `main`.
