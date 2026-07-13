# Configurar o Codex usando somente D:\helper

## Estrutura final

Existe apenas um repositorio local:

```text
D:\helper
```

O GitHub continua sendo `vhonorato02/helper`, e os arquivos de configuracao das automacoes ficam dentro do proprio repositorio:

```text
D:\helper\.codex\
```

Nao e criado clone, copia, worktree, workspace adicional ou outra pasta de projeto.

## 1. Instalar os arquivos no repositorio

Extraia o ZIP em qualquer lugar temporario e execute:

```text
INSTALAR-EM-D-HELPER.cmd
```

O script:

- verifica se `D:\helper` existe e e um repositorio Git;
- verifica se o `origin` pertence a `vhonorato02/helper`;
- exige a branch `main`;
- interrompe se houver alteracoes locais;
- sincroniza com `origin/main` usando fast-forward;
- copia somente a pasta `.codex` para `D:\helper`;
- commita e envia essa configuracao para `main`.

Ele nao executa `git reset --hard`, `git clean`, force push ou clonagem.

Depois da instalacao, o ZIP extraido pode ser apagado. Tudo que as automacoes precisam permanecera dentro de `D:\helper` e no GitHub.

## 2. Abrir o projeto no Codex

1. Abra o aplicativo Codex para Windows.
2. Entre com a conta ChatGPT que possui Plus.
3. Adicione o projeto `D:\helper`.
4. Escolha **Local**.
5. Nao escolha Worktree ou Cloud.
6. Confirme que o projeto exibido e `D:\helper`.

A documentacao oficial define o modo Local como trabalho direto no diretorio atual do projeto. Automacoes de projeto exigem computador ligado, aplicativo Codex aberto e projeto disponivel no disco.

## 3. Permissoes

Use inicialmente as permissoes padrao limitadas ao projeto. A automacao precisa conseguir:

- editar arquivos dentro de `D:\helper`;
- executar instalacao, testes e build;
- usar rede para documentacao oficial, registros de pacotes e GitHub;
- gravar no `.git` para commit e push.

Se o Codex pedir aprovacoes durante o primeiro teste, conceda somente ao projeto e aos comandos necessarios. Evite acesso irrestrito ao restante do disco.

## 4. Criar as quatro automacoes

Dentro de uma conversa normal do projeto `D:\helper`, cole integralmente:

```text
D:\helper\.codex\CRIAR-AS-4-AUTOMACOES.txt
```

O Codex pode criar ou atualizar automacoes a partir de uma conversa normal quando recebe tarefa, agenda, projeto e tipo de execucao.

Confira no painel Automations:

| Horario | Automacao | Projeto | Modo |
|---|---|---|---|
| 01:10 | Helper 1 - Evolucao funcional | D:\helper | Local |
| 07:10 | Helper 2 - Revisao critica | D:\helper | Local |
| 13:10 | Helper 3 - UI e UX | D:\helper | Local |
| 19:10 | Helper 4 - Stack e manutencao | D:\helper | Local |

Se a criacao por conversa nao estiver disponivel na versao instalada, crie cada automacao manualmente no painel, escolhendo Standalone, projeto `D:\helper`, modo Local, agenda diaria e colando o arquivo de prompt correspondente.

## 5. Teste inicial

Execute manualmente a primeira automacao uma vez. Ela deve:

1. confirmar que esta em `D:\helper`;
2. interromper se houver arquivos locais alterados;
3. sincronizar `main` sem apagar nada;
4. analisar e modificar o codigo;
5. executar os testes disponiveis;
6. criar commit somente se tudo passar;
7. fazer push normal para `origin/main`;
8. nunca usar force push.

Execute depois:

```text
VALIDAR-D-HELPER.cmd
```

## 6. Regra para edicao manual

Como as automacoes trabalham no mesmo `D:\helper`, nao deixe alteracoes locais abertas nos horarios programados. Se houver qualquer arquivo alterado ou nao rastreado, os prompts mandam a automacao parar sem apagar nada.

## 7. Funcionamento diario

Para automacoes locais, o computador deve estar ligado, o Codex deve estar aberto e `D:\helper` deve continuar acessivel. O aplicativo registra os resultados no painel de automacoes e em Triage.

## 8. Deploy

Cada automacao envia o commit diretamente para `main`. O deploy automatico depende da integracao do repositorio com o provedor de producao, como a Vercel, e de `main` estar configurada como branch de producao.

## 9. Fontes oficiais

- https://developers.openai.com/codex/app/automations
- https://developers.openai.com/codex/app/features
- https://developers.openai.com/codex/app/windows
