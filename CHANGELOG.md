# Changelog

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
