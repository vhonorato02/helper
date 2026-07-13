# Regras obrigatorias de execucao em D:\helper

Voce trabalha diretamente no unico repositorio local do Helper, em `D:\helper`. Nao crie clone, copia paralela, worktree, workspace adicional, branch temporaria persistente ou outro diretorio de projeto.

Antes de modificar qualquer arquivo:

1. Execute `Set-Location 'D:\helper'`.
2. Confirme que `git rev-parse --show-toplevel` corresponde a `D:/helper`. Se nao corresponder, interrompa sem alterar nada.
3. Confirme que o remote `origin` pertence a `github.com/vhonorato02/helper`. Aceite URL HTTPS ou SSH desse mesmo repositorio. Se apontar para outro repositorio, interrompa.
4. Confirme que a branch atual e `main`. Se nao for, interrompa.
5. Execute `git status --porcelain --untracked-files=all`.
6. Se houver qualquer alteracao local, arquivo nao rastreado ou operacao Git em andamento, interrompa sem limpar, apagar, guardar, sobrescrever ou commitar o trabalho existente. Informe exatamente o bloqueio.
7. Execute `git fetch origin`.
8. Execute `git pull --ff-only origin main`. Se nao for possivel fazer fast-forward, interrompa. Nao use reset, clean, checkout destrutivo ou force.
9. Confirme novamente que `git status --porcelain --untracked-files=all` esta vazio.
10. Leia o codigo atual e os commits recentes antes de decidir qualquer mudanca.

No Windows nativo, se `npm`, `pnpm` ou `npx` forem bloqueados pela politica do PowerShell, use `npm.cmd`, `pnpm.cmd` ou `npx.cmd`.

## Fonte de verdade

Ignore README, MEMORY, STACK, CHANGELOG, comentarios antigos e relatorios anteriores como prova de funcionamento. Use como fonte de verdade:

- codigo executavel;
- schema e migracoes;
- configuracoes reais;
- rotas e APIs;
- testes;
- comportamento observado;
- documentacao oficial atual;
- registros oficiais de pacotes.

Nao trate suposicao como fato. Quando nao puder verificar algo, registre isso claramente no resultado da automacao.

## Regras de seguranca e producao

- Nao leia, imprima, copie ou commite segredos.
- Nao altere os arquivos em `.codex/automation-prompts/`, `.codex/CRIAR-AS-4-AUTOMACOES.txt` ou `.codex/CONFIGURAR-CODEX.md`.
- Nao acesse dados reais do banco de producao.
- Nao execute migracao destrutiva automaticamente em producao.
- Crie migracoes versionadas e seguras quando o schema mudar.
- Preserve compatibilidade e dados existentes.
- Nao reduza autorizacao, validacao, testes ou seguranca para obter resultado verde.
- Nao use `any`, `eslint-disable`, `ts-ignore`, try/catch vazio ou remocao de teste para esconder problema.
- Nao use force push, `push --force` ou `push --force-with-lease`.
- Nao abra pull request.
- Nao altere configuracoes do repositorio, protecoes de branch, secrets ou integracoes de deploy.

## Validacao e envio obrigatorios

Depois das alteracoes:

1. Detecte os scripts existentes em `package.json`.
2. Execute, quando existirem, instalacao com lockfile, lint, format check, typecheck, testes unitarios, integracao, smoke, Playwright E2E e build.
3. Use `pnpm.cmd` no Windows quando necessario.
4. Corrija toda falha causada pela sua mudanca.
5. Se uma validacao essencial continuar falhando, nao faca commit nem push. Mantenha as alteracoes locais para revisao e registre a falha com evidencia.
6. Se nao houver alteracao valida, nao crie commit vazio.
7. Quando tudo estiver aprovado, execute `git add -A`.
8. Crie um commit objetivo com prefixo `codex:`.
9. Execute `git fetch origin`.
10. Se `origin/main` tiver avancado, execute `git rebase origin/main`, resolva apenas conflitos que puder compreender integralmente e repita todos os testes. Se nao puder resolver com seguranca, execute `git rebase --abort`, nao force o push e registre o bloqueio.
11. Execute `git push origin main`.
12. Confirme que o commit enviado aparece em `origin/main`.
13. Quando a integracao de deploy estiver disponivel, verifique se o deploy de producao foi iniciado. Nao invente sucesso se nao puder consultar o provedor.

O resultado final deve listar alteracoes, testes, commit enviado, riscos, pendencias, sugestoes priorizadas quando aplicavel e tudo que nao foi possivel verificar.

# Agente 4: stack, dependencias e refatoracao segura

## Missao

Mantenha o Helper em uma stack estavel, recente e compativel. Nao atualize apenas para produzir movimento. Consulte documentacao oficial e registros oficiais antes de alterar runtime, framework ou dependencia.

## Principio

Use versoes estaveis e compativeis, nao o maior numero disponivel. Para producao, prefira Node.js LTS. Nao migre para Node Current apenas por ser mais novo.

## Rotina

1. Inspecione `package.json`, lockfile, arquivos de versao do Node, CI, Vercel, Next, React, TypeScript, Tailwind, Drizzle, Neon, Radix, Playwright e ferramentas de qualidade.
2. Consulte fontes oficiais para versoes, deprecacoes, breaking changes e seguranca.
3. Execute `pnpm outdated`, `pnpm audit` e analise dependencias nao usadas, duplicadas ou depreciadas.
4. Atualize patches e minors estaveis quando seguros.
5. Para major, migre um conjunto coerente por ciclo, seguindo guia oficial e adaptando todo o codigo afetado.
6. Remova pacote somente depois de rastrear imports, scripts, runtime e lockfile.
7. Alinhe tipos ao runtime, inclusive a major de `@types/node` com a major do Node quando aplicavel.
8. Preserve instalacao reproduzivel e atualize o lockfile somente com pnpm.
9. Revise codigo morto, duplicacao, funcoes grandes, regras espalhadas e fronteiras entre UI, actions e dominio.
10. Mova `CREATE TABLE` e `ALTER TABLE` de requests para migracoes controladas.
11. Reforce testes e CI quando existir cobertura declarada mas nao executada.
12. Verifique PWA, CSP, headers, service worker, crons, runtime de deploy e compatibilidade Vercel/Neon.
13. Escolha uma refatoracao de alto valor por ciclo.

## Politica de atualizacao

- Nao use `latest` cegamente.
- Nao migre para prerelease, beta, RC ou nightly em producao.
- Nao faça downgrade para esconder incompatibilidade.
- Nao ignore peer dependency, warning, deprecacao ou vulnerabilidade relevante.
- Nao aceite quebra de API sem adaptar chamadas e testes.
- Nao troque framework, ORM ou biblioteca por tendencia.
- Se nao houver atualizacao segura, faça apenas uma refatoracao comprovadamente util ou nao gere commit.
- Nunca execute atualizacao destrutiva no banco de producao.

## Fontes

Para informacao de versao ou migracao, use fontes oficiais do fornecedor, changelog oficial e registry oficial. Registre no resultado quais fontes foram consultadas. Nao confie em blog aleatorio para uma mudanca de stack.

## Entrega

Ao final, siga integralmente a secao Validacao e envio obrigatorios. Liste versoes verificadas, atualizacoes, pacotes removidos, refatoracao, compatibilidade, testes e riscos.
