# SolveTechAi: Concent

O SolveTechAi é uma plataforma de monitoramento clínico e auxílio diagnóstico voltada para o acompanhamento de hipertensão arterial e diabetes mellitus. O sistema reúne sinais vitais, histórico de consultas e resultados de exames laboratoriais em uma base estruturada para apoiar a análise médica e alimentar rotinas de previsão com modelos generativos.

## Documentação Técnica e Arquitetura

A especificação técnica do sistema, os diagramas UML e as regras de versionamento estão disponíveis no diretório `docs/`:

- [Arquitetura e Diagramas UML (`docs/ARCHITECTURE_UML.md`)](./docs/ARCHITECTURE_UML.md): estrutura de diretórios, diagrama de componentes, diagrama de classes (domínio, herança e controladores), diagrama entidade-relacionamento com 9 tabelas, diagrama de sequência do atendimento clínico e diagrama de estados.
- [Fluxo GitHub e Orquestração de Agentes (`docs/WORKFLOW_GITHUB_AND_AGENTS.md`)](./docs/WORKFLOW_GITHUB_AND_AGENTS.md): política de branches (`main`, `feature/*`, `fix/*`, `feature/squad-*`), formato de commits, ciclo de revisão de Pull Requests, provisionamento via `squad.py` e execução do pipeline DAG em `ai-agents-core/main.py`.

## Execução Local

### Pré-requisitos
- Node.js 20 ou superior (testado em Node.js 24)
- Python 3.11 ou superior (necessário apenas para o módulo `ai-agents-core`)

### Inicialização da API Backend
```bash
# 1. Instalar dependências Node.js
npm install --ignore-scripts

# 2. Iniciar o servidor em modo de desenvolvimento
npm run dev
```

O servidor HTTP escuta por padrão em `http://localhost:3000`. Na primeira execução, o módulo de configuração cria o arquivo SQLite em `dataBase/Lab.db` e valida as 9 tabelas do schema.

## Endpoints da API REST (`/api`)

| Método | Rota | Descrição |
| :--- | :--- | :--- |
| `GET` | `/api/health` | Verificação de disponibilidade do serviço. |
| `POST` | `/api/patients` | Cadastro transacional de paciente (`person`, `phone` e `patient`). |
| `GET` | `/api/patients` | Listagem de pacientes cadastrados. |
| `GET` | `/api/patients/:id/dossier` | Consulta consolidada do prontuário: dados cadastrais, sinais vitais, exames passados, consultas e registros de análise de IA. |
| `POST` | `/api/doctors` | Cadastro transacional de médico (`person` e `doctor` com CRM/UF). |
| `GET` | `/api/doctors` | Listagem de médicos cadastrados. |
| `POST` | `/api/appointments` | Agendamento de consulta médica. |
| `GET` | `/api/appointments` | Listagem de consultas registradas. |
| `POST` | `/api/clinical/vital-signs` | Registro de aferições clínicas (pressão arterial sistólica e diastólica, glicemia, frequência cardíaca e peso). |
| `POST` | `/api/clinical/exams` | Registro de resultados de exames laboratoriais com parâmetros em JSON. |
