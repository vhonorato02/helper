# Changelog

## Helper 0.2.0 - 2026-06-02

- Migra oficialmente para pnpm 11.5.1 com `packageManager`, `pnpm-lock.yaml`, CI e Vercel usando `pnpm install --frozen-lockfile`.
- Atualiza Node LTS para 24.16.0 e mantém a produção na linha LTS em vez de Node Current.
- Aplica patches estáveis em Next.js 16.2.7, React 19.2.7, React DOM 19.2.7, `@next/eslint-plugin-next` 16.2.7, `@types/react` 19.2.16 e `typescript-eslint` 8.60.1.
- Troca o E2E para `@playwright/test` como dependência direta compatível com pnpm.
- Revisa superfícies, cards, dialogs, menus e estados vazios para raio máximo de 8px e sombras menos decorativas.
- Endurece CSP de produção removendo `unsafe-eval` e adiciona cache control explícito para service worker e manifesto.
- Força `postcss 8.5.15` no lock pnpm para remover vulnerabilidade transitiva de `postcss <8.5.10`.
- Atualiza PWA para cache `helper-static-v7`.
- Atualiza README, STACK, MEMORY, `.env.example`, CI e Vercel para a operação 0.2.0 com pnpm.

## Helper 0.1.6 - 2026-06-01

- Adiciona fila de Entrada externa no dashboard, reunindo tickets públicos e reservas públicas de Chromebooks pendentes.
- Substitui o card "Top resolvedores" por lembretes operacionais com fila pública, Chromebooks pendentes, atrasadas, aguardando e atenção.
- Torna contato obrigatório nos formulários públicos para melhorar retorno, confirmação e triagem.
- Envia notificação interna para administradores quando uma reserva pública de Chromebook é criada.
- Melhora a página pública de solicitações com protocolo, contato e triagem explícitos.
- Adiciona `MEMORY.md` e `STACK.md` para orientar próximas versões, revisão visual e stack técnica.
- Atualiza metadados de versão para Helper 0.1.6.

## Helper 0.1.5 - 2026-06-01

- Melhora o fluxo público de solicitações com validação compartilhada de agendamento, erro inline e contador de descrição antes de enviar.
- Melhora a reserva pública de Chromebooks com data mínima, validação imediata de período, erro inline e contador de observações.
- Corrige a edição interna de reservas de Chromebooks para preservar contato do solicitante e exibir contato/protocolo na lista administrativa.
- Adiciona um resumo operacional mobile no dashboard para que fila, resoluções e área mais carregada não dependam apenas dos gráficos escondidos em telas pequenas.
- Faz ações em lote de tickets notificarem autores e responsáveis nos mesmos cenários importantes das ações individuais.
- Corrige o status administrativo do sistema para refletir falha real de banco em vez de retornar `ok` sempre verdadeiro.
- Adiciona testes unitários para a validação pública de agendamento.

- Atualiza o produto para Helper 0.1.5 em package, metadados e documentação.
- Atualiza dependências diretas para versões estáveis atuais: Tailwind CSS 4.3, `date-fns` 4.4, `react-hook-form` 7.77, ESLint 10.4.1 e `tsx` 4.22.4.
- Migra Tailwind para o plugin `@tailwindcss/postcss`, tema CSS-first em `globals.css` e variante `dark` baseada na classe `.dark`.
- Remove `tailwind.config.js`, `autoprefixer` e `@radix-ui/react-popover`, que ficaram sem uso após a migração.
- Restringe o runtime a Node.js 24.x (`>=24.14.0 <25`) e ativa `engine-strict` para evitar builds em runtime que gera warnings de depreciação.
- Torna o envio de notificações internas best-effort com log estruturado, impedindo que falha de notificação transforme uma criação ou atualização já salva em erro para o usuário.
- Atualiza o service worker para `helper-static-v6`, forçando limpeza do cache estático antigo.
- Valida build local em Node 24.14.0 sem warnings após a migração.

## Helper 0.1.4 - 2026-05-28

- Remove a dependência beta de autenticação e substitui por sessão própria com cookie HTTP-only e JWT assinado.
- Atualiza a versão do produto para Helper 0.1.4 em metadados, package e documentação.
- Atualiza dependências diretas mantidas e remove pacotes sem uso ou conflitantes.
- Mantém Tailwind CSS 3.4.19 como linha estável validada para build sem warnings.
- Corrige o smoke test para refletir as rotas reais do Helper.
- Reforça as reservas de Chromebooks com validação backend de total configurado, status ativo, aprovação e lock persistido.
- Garante que reservas canceladas não consumam disponibilidade.
- Revalida conflitos de sala e capacidade também no fluxo de aprovação.
- Corrige criação da tabela de lock para drivers que não aceitam múltiplas instruções SQL no mesmo execute.
- Reescreve o README como manual de instalação, operação, manutenção, deploy, banco, PWA, segurança e troubleshooting.
