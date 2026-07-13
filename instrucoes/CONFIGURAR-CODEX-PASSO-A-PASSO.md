# Configurar o Codex para executar o Helper automaticamente

## 1. O que este pacote resolve

A execucao nao depende do Agendador de Tarefas do Windows. O agendamento fica dentro do aplicativo Codex, usando sua sessao da conta ChatGPT Plus.

O Codex App executa automacoes de projeto apenas quando:

- o computador esta ligado;
- o Codex App esta aberto;
- o usuario continua autenticado;
- o projeto ainda existe no disco;
- a conexao com a internet esta funcionando.

## 2. Instale as ferramentas

Execute, nesta ordem:

```text
scripts\01-INSTALAR-FERRAMENTAS.cmd
scripts\02-PREPARAR-REPOSITORIO.cmd
scripts\03-VALIDAR-AMBIENTE.cmd
```

Os scripts sao arquivos CMD, nao PowerShell.

O primeiro instala ou atualiza:

- Codex App;
- Git;
- GitHub CLI;
- Node.js LTS.

O segundo:

- autentica o GitHub pelo navegador;
- clona o repositorio em `%USERPROFILE%\Codex\helper-autopilot`;
- instala pnpm quando necessario;
- instala as dependencias do projeto;
- copia os quatro prompts e a configuracao local do Codex;
- faz o commit inicial desses arquivos;
- envia o commit diretamente para `main`.

O terceiro verifica:

- autenticacao no GitHub;
- remote correto;
- branch `main`;
- permissao de push;
- Node, npm e pnpm;
- estado do repositorio.

## 3. Entre no Codex com o ChatGPT Plus

1. Abra o aplicativo Codex.
2. Escolha entrar com ChatGPT.
3. Use a mesma conta que possui o plano Plus.
4. Nao escolha API key.
5. Conclua o login no navegador.

O Codex reutiliza localmente a sessao autenticada. Nao copie, publique ou envie o arquivo de autenticacao do Codex para o GitHub.

## 4. Adicione o projeto certo

1. No Codex, escolha **Add project** ou pressione `Ctrl + O`.
2. Abra esta pasta:

```text
%USERPROFILE%\Codex\helper-autopilot
```

3. Selecione o modo **Local**.
4. Marque o projeto como confiavel quando solicitado.
5. Confirme que o remote exibido e:

```text
https://github.com/vhonorato02/helper.git
```

Use exclusivamente essa copia para as automacoes. Continue usando outra pasta para edicoes manuais, se precisar.

## 5. Permissoes usadas pelo pacote

O arquivo `.codex/config.toml` cria um perfil de permissao limitado ao projeto:

- pode editar os arquivos do repositorio;
- pode escrever em `.git` para commit e push;
- nao pode alterar a propria configuracao `.codex`;
- nao pode ler os principais arquivos `.env`;
- pode acessar a internet para GitHub, registros de pacotes, documentacao e testes;
- usa aprovacao automatica para nao parar uma automacao esperando clique.

Essa configuracao usa os permission profiles atuais do Codex. Eles ainda podem mudar em versoes futuras.

Se o Codex informar que o perfil nao e suportado:

1. Atualize o Codex App.
2. Reinicie o aplicativo.
3. Confirme que o projeto foi marcado como confiavel.
4. Como ultimo recurso, configure **Full access** apenas para esta copia dedicada do projeto. Nao use Full access em uma pasta que contenha documentos pessoais, outros repositorios ou segredos.

## 6. Crie as quatro automacoes

Abra uma conversa normal dentro desse projeto e cole todo o conteudo do arquivo:

```text
CRIAR-AS-4-AUTOMACOES.txt
```

O Codex deve criar quatro automacoes independentes:

| Horario local | Nome | Funcao |
|---|---|---|
| 01:10 | Helper 1 - Evolucao funcional | Implementa uma evolucao funcional completa |
| 07:10 | Helper 2 - Revisao critica | Procura e corrige falhas funcionais e de seguranca |
| 13:10 | Helper 3 - UI e UX | Revisa interface, textos, acessibilidade e responsividade |
| 19:10 | Helper 4 - Stack e manutencao | Atualiza dependencias estaveis e refatora com testes |

Use o horario local do Windows. Mantenha o fuso horario como `America/Sao_Paulo`.

### Configuracoes de cada automacao

- Tipo: standalone automation, com execucao nova a cada ciclo.
- Projeto: somente `helper-autopilot`.
- Execucao: Local project.
- Nao usar worktree para estas quatro automacoes.
- Frequencia: todos os dias.
- Raciocinio: alto.
- Modelo: melhor modelo de programacao disponivel no seu plano, sem fixar um nome antigo.

A separacao de seis horas reduz a chance de duas automacoes alterarem a mesma branch simultaneamente.

## 7. Confira o painel Automations

No painel lateral do Codex:

1. Abra **Automations**.
2. Confirme que existem exatamente quatro automacoes do Helper.
3. Abra cada uma e confira horario, projeto e prompt.
4. Confirme que nenhuma esta configurada para outro repositorio.
5. Execute manualmente a primeira uma unica vez para validar o fluxo.
6. Veja o resultado no painel **Triage**.

## 8. Teste inicial recomendado

Na primeira execucao, observe se o Codex consegue:

1. executar `git fetch origin`;
2. sincronizar `main`;
3. instalar dependencias;
4. rodar lint, typecheck, testes e build;
5. criar um commit somente quando houver mudanca valida;
6. executar `git push origin main`;
7. mostrar o commit no GitHub;
8. iniciar o deploy de producao pelo provedor conectado ao GitHub.

Se o push falhar, execute novamente:

```text
scripts\03-VALIDAR-AMBIENTE.cmd
```

## 9. Producao e Vercel

O pacote envia diretamente para `main`. Para deploy automatico, o projeto da Vercel deve estar conectado ao repositorio e usar `main` como Production Branch.

Verifique uma unica vez no painel da Vercel:

1. Project Settings.
2. Git.
3. Repositorio `vhonorato02/helper` conectado.
4. Production Branch configurada como `main`.
5. Variaveis de ambiente de producao presentes.

O Codex nao deve imprimir, copiar ou commitar segredos.

## 10. Google Tasks

A integracao exige uma configuracao manual unica no Google Cloud:

- projeto Google Cloud;
- Google Tasks API habilitada;
- tela de consentimento OAuth;
- Client ID;
- Client Secret;
- redirect URI de producao e desenvolvimento;
- variaveis de ambiente configuradas na Vercel.

O agente funcional deve implementar a integracao com OAuth 2.0, refresh token protegido, revogacao, escolha da lista e sincronizacao idempotente. Ele deve deixar instrucoes exatas das variaveis necessarias. A autorizacao da sua conta Google precisara ser feita por voce no navegador.

## 11. Limites do plano Plus

Quatro analises profundas por dia podem consumir bastante do limite do Codex. Se as execucoes comecarem a falhar por limite de uso, nao duplique automacoes. Primeiro reduza a frequencia:

- Evolucao funcional: diaria.
- Revisao critica: diaria.
- UI e UX: segunda, quarta e sexta.
- Stack e manutencao: terca, quinta e sabado.

Os quatro prompts permanecem os mesmos.

## 12. Como pausar ou remover

1. Abra o painel **Automations**.
2. Desative a chave da automacao desejada.
3. Para remover tudo, exclua as quatro automacoes.
4. Nao apague a pasta do projeto enquanto uma execucao estiver ativa.

## 13. O que nao fazer

- Nao configure force push.
- Nao execute duas automacoes na mesma hora.
- Nao use a pasta dedicada para trabalhos manuais inacabados.
- Nao conceda acesso a todo o disco quando o perfil do projeto funcionar.
- Nao coloque Client Secret, tokens, cookies, `.env` ou credenciais no Git.
- Nao permita migracao destrutiva automatica do banco de producao.
