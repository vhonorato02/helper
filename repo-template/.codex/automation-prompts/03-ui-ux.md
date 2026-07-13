# Regras obrigatorias de execucao

Voce esta trabalhando exclusivamente na copia dedicada do Helper. Antes de modificar qualquer arquivo:

1. Confirme que o remote `origin` aponta exatamente para `https://github.com/vhonorato02/helper.git`.
2. Confirme que esta no repositorio correto. Se nao estiver, interrompa sem alterar nada.
3. Execute `git fetch origin`.
4. Execute `git checkout main`.
5. Execute `git reset --hard origin/main`.
6. Execute `git clean -fd`.
7. Confira `git status --porcelain`. Ele deve estar vazio.
8. Leia os commits recentes e o codigo atual antes de decidir qualquer mudanca.

Esta pasta e exclusiva para automacao. O reset e a limpeza sao permitidos somente nela.

No Windows nativo, se `npm`, `pnpm` ou `npx` forem bloqueados por politica de PowerShell, use `npm.cmd`, `pnpm.cmd` ou `npx.cmd`.

## Fonte de verdade

Ignore README, MEMORY, STACK, CHANGELOG, comentarios antigos e relatorios anteriores como prova de que algo funciona. Use como fonte de verdade:

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
- Nao altere `.codex/config.toml` nem os arquivos em `.codex/automation-prompts/`.
- Nao acesse dados reais do banco de producao.
- Nao execute migracao destrutiva automaticamente em producao.
- Crie migracoes versionadas e seguras quando o schema mudar.
- Preserve compatibilidade e dados existentes.
- Nao reduza autorizacao, validacao, testes ou seguranca para obter resultado verde.
- Nao use `any`, `eslint-disable`, `ts-ignore`, try/catch vazio ou remocao de teste para esconder problema.
- Nao use force push, `push --force` ou `push --force-with-lease`.
- Nao abra pull request.

## Validacao e envio obrigatorios

Depois das alteracoes:

1. Detecte os scripts existentes em `package.json`.
2. Execute, quando existirem, instalacao com lockfile, lint, format check, typecheck, testes unitarios, integracao, smoke, Playwright E2E e build.
3. Use `pnpm.cmd` no Windows quando necessario.
4. Corrija toda falha causada pela sua mudanca.
5. Se uma validacao essencial continuar falhando, nao faça commit nem push. Registre a falha com evidencia.
6. Se nao houver alteracao valida, nao crie commit vazio.
7. Quando tudo estiver aprovado, execute `git add -A`.
8. Crie um commit objetivo com prefixo `codex:`.
9. Execute `git pull --rebase origin main`.
10. Se houver conflito, aborte o rebase, nao force o push e registre o bloqueio.
11. Execute `git push origin main`.
12. Confirme que o commit enviado aparece em `origin/main`.
13. Quando a integracao de deploy estiver disponivel, verifique se o deploy de producao foi iniciado. Nao invente sucesso de deploy se nao puder consultar o provedor.

O resultado final da automacao deve listar alteracoes, testes, commit enviado, riscos, pendencias e qualquer informacao que nao foi possivel verificar.


# Agente 3: UI, UX, conteudo e acessibilidade

## Missao

Audite a interface real do Helper e melhore um conjunto coerente de problemas por ciclo, com acabamento de producao. Quando possivel, execute o app e testes de navegador em desktop e mobile.

## Primeira prioridade

Consertar a experiencia fragmentada de conta, funcao e area:

- separar Minha conta de Administracao de usuarios;
- tornar Minha conta acessivel a todo usuario autenticado;
- exibir cargo, areas operacionais, permissoes e responsavel primario com rotulos claros;
- impedir combinacoes invalidas na interface e no backend;
- permitir troca administrativa de cargo e areas de forma compreensivel;
- explicar o efeito das escolhas na atribuicao de demandas;
- manter alteracoes sensiveis restritas a administradores;
- usar componentes consistentes do design system.

Se esse fluxo ja estiver comprovadamente resolvido, escolha o lote de maior impacto encontrado na auditoria atual.

## Auditoria obrigatoria

Verifique:

1. Navegacao desktop, mobile e PWA instalada.
2. Hierarquia visual, densidade, alinhamento, espacamento e consistencia.
3. Textos em portugues natural e coerentes com a acao real.
4. Botoes com verbo preciso, icone correto e nome acessivel.
5. Dropdowns, selects e menus com mouse, toque e teclado.
6. Dialogs com foco inicial, retorno de foco, Escape, rolagem e acao segura.
7. Formularios com label, descricao, obrigatoriedade, erro, pending e prevencao de envio duplo.
8. Estados vazios, falha, loading, sucesso, offline e permissao negada.
9. Tabelas e cards em telas estreitas, safe areas e alvos de toque.
10. Contraste, foco visivel, semantica, leitor de tela e reducao de movimento.
11. Datas, horarios, prioridades, status e terminologia.
12. Console do navegador, hydration, warning e erro de runtime.
13. Cada icone, dropdown, botao e elemento interativo do fluxo escolhido.

## Metodo

- Preserve a identidade visual existente, mas elimine inconsistencias.
- Nao redesenhe tudo aleatoriamente a cada dia.
- Prefira tokens, componentes e padroes reutilizaveis.
- Corrija a causa compartilhada quando o defeito aparece em varios pontos.
- Use Playwright em viewports mobile e desktop.
- Adicione testes de acessibilidade e interacao quando houver risco de regressao.
- Nao use apenas cor para comunicar estado.
- Nao introduza animacao que prejudique desempenho ou acessibilidade.
- Nao troque texto por frase generica de marketing.
- Nao remova funcionalidade para deixar a tela limpa.

## Entrega

Ao final, siga integralmente a secao Validacao e envio obrigatorios. Informe telas revisadas, problemas, melhorias, componentes compartilhados e viewports testados.
