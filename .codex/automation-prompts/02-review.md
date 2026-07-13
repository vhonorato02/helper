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

# Agente 2: revisao critica e correcao profunda

## Missao

Analise o Helper como engenheiro principal responsavel pela confiabilidade. Revise o sistema inteiro de forma critica, mas corrija neste ciclo um conjunto coerente de maior severidade com testes completos.

## Escopo minimo da revisao

- autenticacao, sessao, cookies, autorizacao e troca de senha;
- usuarios, conta propria, cargos, areas, administrador, ativacao e exclusao;
- abertura publica e interna de demandas;
- atribuicao automatica e manual;
- tickets, historico, comentarios, mencoes, tarefas e respostas rapidas;
- Kanban, filtros, busca, acoes em lote e concorrencia;
- agenda, lembretes, gravacoes, marketing e calendario editorial;
- reservas de Chromebooks, disponibilidade e conflitos;
- notificacoes internas, e-mail, PWA, crons e preferencias;
- APIs, rate limit, logs, erros e validacoes;
- schema, SQL, indices, integridade e migracoes;
- testes, build, smoke e E2E;
- seguranca, privacidade, acessibilidade e responsividade.

## Problema prioritario

Investigue e corrija a causa da atribuicao invertida em que uma demanda de TI pode ser enviada a usuario configurado como marketing.

Criterios:

1. Cargo e area operacional possuem semanticas distintas.
2. Combinacoes contraditorias nao sao gravadas silenciosamente.
3. A selecao automatica usa responsavel primario explicito e auditavel.
4. Atribuicao manual valida elegibilidade.
5. Ausencia de responsavel produz estado claro, sem fallback arbitrario.
6. Todos os fluxos compartilham a mesma regra de dominio.
7. Testes cobrem TI, Marketing, Por Fora, usuario inativo, responsavel ausente e dados legados contraditorios.

Se esse problema ja estiver comprovadamente resolvido no checkout atual, escolha o proximo defeito de maior risco com base em evidencia.

## Metodo

1. Rastreie cada fluxo da interface ate persistencia e notificacao.
2. Procure autorizacao ausente, estado impossivel, race condition, divergencia UI/backend, codigo morto, duplicacao, acao sem feedback e integridade fraca.
3. Classifique mentalmente os achados por severidade e probabilidade.
4. Corrija o lote de maior risco que caiba neste ciclo.
5. Centralize regras duplicadas em funcoes de dominio testaveis.
6. Nao faça refatoracao cosmetica enquanto houver defeito funcional mais grave.
7. Nao declare correcao sem teste de regressao ou prova equivalente.
8. Nao grave relatorios crescentes no repositorio. Use o resultado da automacao no Triage como relatorio do ciclo.

## Analise critica e sugestoes

Alem das correcoes implementadas, apresente no resultado da automacao uma lista curta e priorizada de melhorias futuras, separando: critica, alta, media e baixa prioridade. Cada sugestao deve citar evidencia concreta do codigo ou comportamento observado. Nao crie arquivos de relatorio diarios apenas para registrar sugestoes.

## Entrega

Ao final, siga integralmente a secao Validacao e envio obrigatorios. Descreva achados criticos, correcoes, testes e riscos restantes.
