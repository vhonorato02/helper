# Rotinas Codex CLI do Helper, direto na main

Projeto alvo:

```powershell
D:\helper
```

## O que mudou nesta versão

- Não cria branch.
- Não cria worktree.
- Não cria workspace.
- Não clona nada.
- Trabalha direto na pasta `D:\helper`.
- Usa a branch `main`.
- Faz `fetch`, `pull --rebase` e `push origin main`.
- Se houver alteração local antes da rotina, ela é versionada antes.
- Cada rotina gera um patch em `.codex-patches`.
- Cada rotina comita direto na `main`.
- Cada rotina atualiza `CHANGELOG.md`.
- Se houver alteração e o `package.json` ainda não tiver sido versionado pelo Codex, o script sobe o patch version automaticamente.

## Comando usado pelos scripts

```powershell
codex exec -C D:\helper --model gpt-5.5 --dangerously-bypass-approvals-and-sandbox -c 'web_search="live"' -
```

## Scripts

```powershell
.\01_reparo_profundo_main.ps1
.\02_revisao_features_main.ps1
.\03_revisao_ui_ux_main.ps1
.\04_feature_nova_main.ps1
```

## Sugestão de horários

| Horário | Script |
|---:|---|
| 03h | `01_reparo_profundo_main.ps1` |
| 09h | `04_feature_nova_main.ps1` |
| 14h | `02_revisao_features_main.ps1` |
| Fim do dia | `03_revisao_ui_ux_main.ps1` |

## Logs e patches

Logs:

```text
D:\helper\.codex-runs
```

Patches:

```text
D:\helper\.codex-patches
```

## Observação

Esse pacote faz exatamente o modo direto na main. Não há rede de segurança de branch. Confira o diff/commit no GitHub depois de cada execução.


# Se o .ps1 não abrir

Use os arquivos `.cmd`:

```text
01_ABRIR_reparo_profundo_main.cmd
02_ABRIR_revisao_features_main.cmd
03_ABRIR_revisao_ui_ux_main.cmd
04_ABRIR_feature_nova_main.cmd
```

Eles chamam o PowerShell com:

```powershell
-ExecutionPolicy Bypass
-NoExit
```

Assim a janela fica aberta e o Windows não bloqueia o `.ps1` tão facilmente.


## Correção incluída

Esta versão corrige o erro de parser do PowerShell em:

```powershell
"$CommitPrefix: $RoutineTitle $Timestamp"
```

Agora usa:

```powershell
"${CommitPrefix}: $RoutineTitle $Timestamp"
```

Também inclui:

```text
00_CORRIGIR_SCRIPTS_JA_COPIADOS_EM_D_HELPER.cmd
```

Use esse arquivo se você já copiou os scripts antigos para `D:\helper` e quiser corrigir lá sem extrair tudo de novo.
