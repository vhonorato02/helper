# Resolver problemas

## O Codex nao executou no horario

Confirme:

- computador ligado;
- Codex App aberto;
- usuario conectado;
- projeto presente em `%USERPROFILE%\Codex\helper-autopilot`;
- automacao habilitada;
- Windows no fuso horario correto;
- limite do Codex ainda disponivel.

## O Codex abre e fecha ou nao executa comandos

Este pacote nao usa o Agendador do Windows. Abra o Codex App diretamente e veja a execucao no painel Automations ou Triage.

No Windows nativo, o agente pode usar PowerShell internamente. Os prompts mandam preferir `npm.cmd`, `pnpm.cmd` e `npx.cmd` quando a politica de execucao bloquear scripts `.ps1`.

## Erro de npm.ps1 ou pnpm.ps1

Dentro do Codex, use:

```text
npm.cmd --version
pnpm.cmd --version
pnpm.cmd install --frozen-lockfile
```

Nao e necessario agendar PowerShell.

## Push negado

Execute:

```text
scripts\03-VALIDAR-AMBIENTE.cmd
```

Depois confira:

```text
gh auth status
gh auth setup-git
git push --dry-run origin main
```

A conta autenticada precisa ter permissao de escrita no repositorio.

## Branch protegida bloqueou o push direto

O repositorio pode ter regra exigindo pull request. Como o fluxo solicitado usa push direto em `main`, ajuste a regra no GitHub ou conceda bypass ao usuario autenticado. Isso reduz a protecao da branch. Faça apenas se a decisao for intencional.

## O Codex pediu aprovacao durante a automacao

1. Confirme que `.codex/config.toml` existe no projeto.
2. Confirme que o projeto esta confiavel.
3. Reinicie o Codex App.
4. Atualize o aplicativo.
5. Confira se a automacao aponta para o projeto Local correto.

## Perfil de permissao nao suportado

Os permission profiles podem mudar. Atualize o aplicativo. Se continuar falhando, use Full access somente na copia dedicada `%USERPROFILE%\Codex\helper-autopilot` e mantenha as restricoes dos prompts.

## Build falhou por falta de variavel de ambiente

Nao copie segredos para o repositorio. Configure um ambiente local seguro ou adapte os testes para usar valores de teste. Variaveis reais devem continuar na Vercel ou no gerenciador de segredos correspondente.

## Deploy nao ocorreu depois do push

Confira no provedor de deploy:

- repositorio conectado;
- branch de producao `main`;
- integracao GitHub ativa;
- build command correto;
- variaveis de ambiente presentes;
- logs do deploy.

## Duas automacoes entraram em conflito

A automacao deve abortar o push em caso de conflito. Aumente o intervalo entre horarios ou desative temporariamente a automacao mais recente. Nao habilite force push para contornar conflito.
