# Fluxo de Desenvolvimento no GitHub e Governanca do Scrum Master (11.07): SolveTechAi

Este documento especifica as quatro regras de negocio, o fluxo de branches e Pull Requests no GitHub e a arquitetura das duas esteiras de agentes (7 especialistas instalados em `.squad/`).

## 1. Regras de Negocio e Governanca Obrigatoria

1. **Interacao Exclusiva via Scrum Master (`11.07` Senior Project Manager)**:
   - O usuario conversa apenas com o **Senior Project Manager (`11.07` - `project-manager-senior`)**, que atua como Scrum Master do projeto.
   - Os demais 6 agentes (`3.35`, `14.02`, `18.06`, `16.42`, `16.45` e `3.10`) nao interagem diretamente com o usuario e sao acionados exclusivamente pelo Scrum Master por meio de gatilhos formais.
2. **Rastreabilidade e Vinculo no Notion**:
   - O Scrum Master (`11.07`) extrai as tasks do Notion (`NOTION_TASK_ID`), garante o registro de data (`YYYY-MM-DD`), vincula o responsavel ao nome do usuario (**João Vitor Novaes**) e correlaciona cada item ao projeto `SolveTechAi---Concent`.
3. **Protecao da Branch `main`, Fluxo `feat/...` e Autorizacao Humana**:
   - E proibido desenvolver ou commitar diretamente na branch `main`.
   - Todo desenvolvimento ocorre em uma nova branch com nomenclatura padronizada (`feat/<escopo>`, `fix/<escopo>`, `refactor/<escopo>` ou `docs/<escopo>`).
   - O esquadrao nao opera de forma 100% autonoma. O Scrum Master solicita autorizacao explicita do usuario nos Gates de controle antes de executar acoes.
   - Concluido o desenvolvimento e validada a suite (`4. Valida Suite`), o Scrum Master abre um Pull Request no qual **apenas João Vitor Novaes** possui autoridade para aprovar e realizar o merge.
4. **Ordem Cronologica Estrita e Recomendacao de Tasks**:
   - As tasks do Notion sao processadas em ordem crescente de data (`date ASC`), restringindo a implementacao ao escopo exato da task.
   - Caso o `11.07` ou o `16.42` identifiquem uma nova demanda ou debito tecnico, o Scrum Master consulta primeiro a opiniao do usuario e, somente mediante aprovacao, cadastra a task no Notion datada, vinculada a **João Vitor Novaes** e correlacionada ao projeto `SolveTechAi---Concent`.

## 2. Diagrama Oficial das Duas Esteiras de Agentes

O diagrama abaixo reproduz a topologia dos 7 agentes do projeto:

```mermaid
flowchart TD
    subgraph Esteira1["Esteira 1: Ciclo de Execução de Tasks e Notion"]
        PM["Senior Project Manager (11.07) - Quebra de Tasks & Gestão do Notion"]
        MCE["Minimal Change Engineer (3.35) - Desenvolvimento Modular & CRUD"]
        ASE["AppSec Engineer (14.02) - Políticas RLS & Prevenção IDOR"]
        TAE["Test Automation Engineer (18.06) - Testes Unitários & Mocks de CI"]

        PM -- "1. Especifica Task" --> MCE
        MCE -- "2. Implementa" --> ASE
        ASE -- "3. Valida Segurança" --> TAE
        TAE -- "4. Valida Suíte" --> PM
    end

    subgraph Esteira2["Esteira 2: Auditoria, Documentação e Onboarding"]
        CA["Codebase Archaeologist (16.42) - Auditoria de Código & Débito Técnico"]
        DG["Document Generator (16.45) - Relatórios Executivos & ADRs"]
        OE["Onboarding Engineer (3.10) - Guias Práticos & Modelos Mentais"]

        CA -- "Audita Legado" --> DG
        DG -- "Formaliza Specs" --> OE
    end
```

### Catalogo de Agentes do Projeto (`.squad/squad-config.yml`)

| Codigo | Slug no Catalogo | Papel e Escopo | Esteira |
| :--- | :--- | :--- | :--- |
| `11.07` | `project-manager-senior` | Quebra de Tasks, Gestao do Notion e Ponto Unico de Contato (Scrum Master) | Esteira 1 |
| `3.35` | `engineering-minimal-change-engineer` | Desenvolvimento Modular e CRUD | Esteira 1 |
| `14.02` | `security-appsec-engineer` | Politicas RLS, Prevencao IDOR e Auditoria OWASP | Esteira 1 |
| `18.06` | `testing-test-automation-engineer` | Testes Unitarios e Mocks de CI | Esteira 1 |
| `16.42` | `specialized-codebase-archaeologist` | Auditoria de Codigo e Debito Tecnico | Esteira 2 |
| `16.45` | `specialized-document-generator` | Relatorios Executivos e ADRs | Esteira 2 |
| `3.10` | `engineering-codebase-onboarding-engineer` | Guias Praticos e Modelos Mentais | Esteira 2 |

## 3. Diagrama de Sequencia UML: Esteira 1 (Loop Fechado `11.07 -> 3.35 -> 14.02 -> 18.06 -> 11.07`)

```mermaid
sequenceDiagram
    autonumber
    actor User as Usuário (João Vitor Novaes)
    participant PM as Senior PM / Scrum Master (11.07)
    participant Notion as Notion API
    participant MCE as Minimal Change Eng (3.35)
    participant ASE as AppSec Engineer (14.02)
    participant TAE as Test Automation Eng (18.06)
    participant GitHub as GitHub API (Branch feat/...)

    User->>PM: Solicita andamento da fila de tasks
    PM->>Notion: Extrai tasks e ordena por data crescente (date ASC)
    PM->>Notion: Registra data e vincula a João Vitor Novaes (SolveTechAi---Concent)
    Notion-->>PM: Retorna fila cronológica de tasks

    loop Para cada Task em ordem de data
        PM->>User: [Gate 1] Apresenta a Task datada e solicita autorização para iniciar
        User-->>PM: Autoriza início da Task

        PM->>PM: 1. Especifica Task (TaskSpecificationOutput)
        PM->>User: [Gate 2] Apresenta especificação e pede autorização para acionar a esteira
        User-->>PM: Autoriza execução dos gatilhos

        PM->>MCE: 1. Especifica Task -> [TRIGGER:3.35_MINIMAL_CHANGE_ENGINEER]
        MCE-->>PM: 2. Implementa (MinimalChangeOutput: código modular & CRUD)

        PM->>ASE: 2. Implementa -> [TRIGGER:14.02_APPSEC_ENGINEER]
        ASE-->>PM: 3. Valida Segurança (AppSecValidationOutput: políticas RLS & prevenção IDOR)

        PM->>TAE: 3. Valida Segurança -> [TRIGGER:18.06_TEST_AUTOMATION_ENGINEER]
        TAE-->>PM: 4. Valida Suíte (TestAutomationOutput: testes unitários & mocks de CI)

        PM->>PM: Valida suíte entregue pelo 18.06 contra critérios da Task (SuiteValidationOutput)

        opt Recomendação de Nova Task Identificada
            PM->>User: [Gate 4] Solicita opinião sobre nova Task recomendada
            User-->>PM: Autoriza inclusão da nova Task
            PM->>Notion: Adiciona Task datada, vinculada a João Vitor Novaes e correlacionada ao projeto
        end

        PM->>User: [Gate 3] Solicita autorização para criar branch feat/... e abrir Pull Request
        User-->>PM: Autoriza envio ao GitHub
        PM->>GitHub: Cria branch feat/<task> (bloqueio contra escrita na main)
        PM->>GitHub: Realiza commits ("feat: ..." e "test: ...")
        PM->>GitHub: Abre Pull Request para aprovação exclusiva de João Vitor Novaes
        GitHub-->>User: PR aguarda revisão e merge manual pelo Usuário
    end
```

## 4. Diagrama de Sequencia UML: Esteira 2 (`16.42 -> 16.45 -> 3.10`)

```mermaid
sequenceDiagram
    autonumber
    actor User as Usuário (João Vitor Novaes)
    participant PM as Senior PM / Scrum Master (11.07)
    participant CA as Codebase Archaeologist (16.42)
    participant DG as Document Generator (16.45)
    participant OE as Onboarding Engineer (3.10)
    participant Notion as Notion API

    User->>PM: Solicita auditoria de legado e formalização de documentação
    PM->>User: [Gate Esteira 2] Solicita confirmação para disparar Esteira 2
    User-->>PM: Autoriza execução

    PM->>CA: [TRIGGER:16.42_CODEBASE_ARCHAEOLOGIST]
    CA-->>PM: Audita Legado (CodebaseAuditOutput: relatório de débito técnico)

    PM->>DG: Audita Legado -> [TRIGGER:16.45_DOCUMENT_GENERATOR]
    DG-->>PM: Formaliza Specs (DocumentGeneratorOutput: relatórios executivos & ADRs)

    PM->>OE: Formaliza Specs -> [TRIGGER:3.10_ONBOARDING_ENGINEER]
    OE-->>PM: Guias Práticos & Modelos Mentais (OnboardingGuidesOutput)

    opt Débitos Técnicos Recomendados como Tasks
        PM->>User: [Gate 4] Solicita opinião para transformar débitos em Tasks no Notion
        User-->>PM: Autoriza registro
        PM->>Notion: Cadastra Tasks com data, vinculadas a João Vitor Novaes e ao projeto
    end
```

## 5. Fluxo de Branches e Pull Requests no GitHub

```mermaid
stateDiagram-v2
    [*] --> TaskNoNotion : Ordenação por Data (date ASC)
    TaskNoNotion --> VinculadaAoUsuario : 11.07 data e vincula a João Vitor Novaes
    VinculadaAoUsuario --> Gate1 : Autorização do Usuário para iniciar Task
    Gate1 --> Especificacao_11_07 : 1. Especifica Task (11.07)
    Especificacao_11_07 --> Gate2 : Autorização do Usuário para implementar
    Gate2 --> Implementacao_3_35 : 2. Implementa (3.35 Minimal Change Engineer)
    Implementacao_3_35 --> Seguranca_14_02 : 3. Valida Segurança (14.02 AppSec Engineer)
    Seguranca_14_02 --> Testes_18_06 : Testes Unitários & Mocks CI (18.06)
    Testes_18_06 --> ValidacaoSuite_11_07 : 4. Valida Suíte (Retorno ao 11.07)
    ValidacaoSuite_11_07 --> Gate3 : Autorização para abrir branch feat/... e PR
    Gate3 --> PullRequestAberto : Branch feat/... criada e PR submetido
    PullRequestAberto --> RevisaoExclusivaUsuario : Aguardando aprovação de João Vitor Novaes
    RevisaoExclusivaUsuario --> Implementacao_3_35 : Ajustes solicitados pelo Usuário
    RevisaoExclusivaUsuario --> MergeadoNaMain : Usuário aprova e realiza Merge
    MergeadoNaMain --> [*]
```
