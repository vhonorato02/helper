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


# Agente 1: evolucao funcional diaria

## Missao

Implemente exatamente uma evolucao funcional de alto valor, completa de ponta a ponta, pequena o bastante para ser entregue com seguranca neste ciclo e grande o bastante para melhorar de verdade o produto. Nao crie recurso decorativo, duplicado ou sem uso operacional claro.

## Prioridade obrigatoria enquanto cada item nao estiver realmente concluido

1. Corrigir definitivamente usuarios, cargos, areas operacionais e atribuicao de responsaveis.
   - Cargo e area nao podem ser sinonimos ocultos.
   - Um usuario pode participar de nenhuma, uma ou varias areas.
   - Deve existir configuracao administrativa explicita de responsavel primario por TI, Marketing e Por Fora.
   - Nunca escolher responsavel por ordem alfabetica.
   - Nunca atribuir demanda de TI a usuario nao habilitado para TI.
   - Validar atribuicao automatica, manual, publica, interna, em lote e importada.
   - Migrar dados contraditorios sem perda e adicionar testes de regressao.
2. Reorganizar conta propria e administracao de usuarios.
   - Criar area de conta acessivel a todo usuario autenticado.
   - Separar Minha conta de Administracao de usuarios.
   - Exibir identidade, cargo, areas, permissoes, preferencias, seguranca e integracoes com semantica clara.
   - Restringir alteracoes administrativas a administradores.
3. Concluir notificacoes PWA reais.
   - Solicitar permissao por gesto do usuario.
   - Persistir PushSubscription por usuario e dispositivo.
   - Implementar VAPID no servidor, Web Push, remocao de endpoints expirados e evento `push` no service worker.
   - Separar inbox interna, e-mail e push.
   - Cobrir permissao negada, indisponivel, ativa e expirada.
4. Integrar com Google Tasks.
   - OAuth 2.0 server-side, state, PKCE quando aplicavel, refresh token protegido e menor escopo possivel.
   - Permitir escolha da lista do Google Tasks.
   - Sincronizacao explicita e idempotente com IDs externos persistidos e prevencao de loops.
   - Nao usar senha Google e nao expor Client Secret ou refresh token ao navegador.
   - Quando credenciais manuais forem necessarias, implemente o codigo, documente as variaveis e deixe o fluxo pronto sem inventar valores.
5. Depois desses itens, selecione a proxima lacuna real por impacto, frequencia, risco e esforco.

## Metodo

1. Leia todas as camadas relacionadas antes de editar.
2. Identifique causa raiz e criterios de aceitacao.
3. Confirme se o recurso ja existe parcialmente para completar, nao duplicar.
4. Implemente UI, dominio, persistencia, autorizacao, validacao, mensagens, acessibilidade e observabilidade necessarias.
5. Mova DDL de requests e Server Actions para migracoes controladas.
6. Preserve dados existentes e inclua estrategia de rollback quando apropriado.
7. Adicione testes unitarios, de integracao e Playwright para os fluxos alterados.
8. Nao produza diff artificial. Se o sistema estiver bloqueado por defeito grave, corrija primeiro o bloqueio e explique.

## Entrega

Implemente um lote coerente por ciclo. Nao redesenhe toda a aplicacao neste agente. Ao final, siga integralmente a secao Validacao e envio obrigatorios.
