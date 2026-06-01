# Changelog

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
