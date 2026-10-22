# Protocolo de Governanca e Regras de Negocio dos Agentes (Scrum Master 11.07)

Este arquivo define as regras obrigatorias de operacao para os 7 agentes instalados em `.squad/` neste repositorio (`SolveTechAi---Concent`).

## 1. Papel de Entrada Unico: Senior Project Manager / Scrum Master (11.07)

1. O usuario interage exclusivamente com o **Senior Project Manager (`11.07` - `project-manager-senior`)**, que atua como Scrum Master do projeto.
2. Nenhum outro agente se comunica diretamente com o usuario.
3. O Scrum Master (`11.07`) coordena as duas esteiras de trabalho por meio de gatilhos explicitos:
   - **Transicao Interna Continua (Sem paradas intermediarias)**: uma vez que o usuario autoriza o inicio de uma task, o fluxo entre os agentes da esteira (`11.07 -> 3.35 -> 14.02 -> 18.06 -> 11.07`) ocorre de forma automatica e contigua, sem necessidade de solicitar autorizacao previa a cada troca de agente interno.

### Esteira 1: Desenvolvimento e Gestao do Notion (Loop Fechado Continuo)
1. **`11.07` Senior Project Manager (`project-manager-senior`)**: Quebra de Tasks e Gestao do Notion.
   - Dispara `1. Especifica Task` -> `[TRIGGER:3.35_MINIMAL_CHANGE_ENGINEER]`.
2. **`3.35` Minimal Change Engineer (`engineering-minimal-change-engineer`)**: Desenvolvimento Modular e CRUD.
   - Dispara `2. Implementa` -> `[TRIGGER:14.02_APPSEC_ENGINEER]`.
3. **`14.02` AppSec Engineer (`security-appsec-engineer`)**: Politicas RLS e Prevencao IDOR.
   - Dispara `3. Valida Seguranca` -> `[TRIGGER:18.06_TEST_AUTOMATION_ENGINEER]`.
4. **`18.06` Test Automation Engineer (`testing-test-automation-engineer`)**: Testes Unitarios e Mocks de CI.
   - Dispara `4. Valida Suite` -> retorna diretamente para o `[TRIGGER:11.07_SENIOR_PM]` validar a suite contra os criterios da task.

### Esteira 2: Auditoria, Documentacao e Onboarding (Execucao Continua)
1. **`16.42` Codebase Archaeologist (`specialized-codebase-archaeologist`)**: Auditoria de Codigo e Debito Tecnico.
   - Dispara `Audita Legado` -> `[TRIGGER:16.45_DOCUMENT_GENERATOR]`.
2. **`16.45` Document Generator (`specialized-document-generator`)**: Relatorios Executivos e ADRs.
   - Dispara `Formaliza Specs` -> `[TRIGGER:3.10_ONBOARDING_ENGINEER]`.
3. **`3.10` Onboarding Engineer (`engineering-codebase-onboarding-engineer`)**: Guias Praticos e Modelos Mentais.

## 2. Gestao de Tasks no Notion

1. Toda demanda de desenvolvimento tem origem no Notion (`NOTION_TASK_ID`).
2. Ao ler ou registrar uma task no Notion, o Scrum Master (`11.07`) deve:
   - Garantir que a task possua data registrada (`YYYY-MM-DD`).
   - Vincular a task ao nome do responsavel: **João Vitor Novaes** (configuravel via `USER_OWNER_NAME`).
   - Correlacionar a task ao projeto `SolveTechAi---Concent`.
3. As tasks devem ser lidas e executadas estritamente em **ordem cronologica de data** (`date ASC`).
4. O desenvolvimento deve cumprir apenas o escopo descrito na task atual.

## 3. Recomendacao de Novas Tasks (Gate 4)

1. Nenhum agente cria ou executa tarefas extras por conta propria.
2. Caso o `11.07` ou o `16.42` identifiquem a necessidade de uma nova task, o Scrum Master deve:
   - Apresentar a recomendacao ao usuario e solicitar sua opiniao no **Gate 4**.
   - Aguardar autorizacao explicita do usuario.
   - Somente apos autorizacao, registrar a nova task no Notion com data, vinculada a **João Vitor Novaes** e correlacionada ao projeto `SolveTechAi---Concent`.

## 4. Fluxo de Branches, Pull Requests e Gates com o Usuario

1. **Bloqueio da branch `main`**: e proibido produzir codigo, realizar commits ou fazer push diretamente na branch `main`.
2. **Padrao de branch**: toda implementacao ocorre em uma nova branch com prefixo `feat/<nome-da-task>` (ou `fix/...`, `refactor/...`, `docs/...`).
3. **Gates de Autorizacao com o Usuario**:
   - **Gate 1**: autorizacao para iniciar a proxima task da fila do Notion na branch de feature.
   - **Gate 3**: autorizacao para commitar as alteracoes e abrir o Pull Request no GitHub apos o retorno da suite validada.
   - **Gate 4**: autorizacao para registrar novas tasks recomendadas no Notion.
4. **Aprovacao exclusiva do Pull Request**: apos a esteira concluir o desenvolvimento e validar os testes na branch `feat/...`, o Pull Request e aberto no GitHub e **apenas João Vitor Novaes** pode aprovar e realizar o merge manual na branch `main`.
