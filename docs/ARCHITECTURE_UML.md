# Arquitetura do Sistema e Diagramas UML: SolveTechAi (Concent)

Este documento descreve a organização de pastas, os componentes de software e os diagramas UML do projeto SolveTechAi. A plataforma armazena dados clínicos longitudinais de pacientes com hipertensão arterial e diabetes mellitus para consulta médica e processamento futuro por modelos generativos.

## 1. Estrutura de Diretórios do Projeto

```text
SolveTechAi---Concent/
├── ai-agents-core/                  # Orquestração de agentes via Grafo Acíclico Direcionado (DAG)
│   ├── skills/
│   │   └── squad-builder/           # Ferramenta CLI para seleção e instalação de perfis de agentes
│   │       ├── scripts/squad.py     # Script de listagem, instalação (.squad/) e geração de workflow
│   │       └── SKILL.md             # Regras de operação do Squad Builder
│   ├── action.yml                   # Definição da GitHub Composite Action
│   ├── AI_INSTRUCTIONS.md           # Guia de configuração para assistentes
│   ├── main.py                      # Pipeline DAG (Notion -> Planner -> Dev -> Security -> Tester -> PR)
│   ├── requirements.txt             # Dependências Python do orquestrador
│   └── README.md                    # Instruções do módulo ai-agents-core
├── assets/                          # Arquivos estáticos (CSS e imagens)
├── backend/                         # Variáveis de ambiente de servidor
├── dataBase/                        # Arquivo local do banco SQLite (Lab.db, ignorado pelo Git)
├── docs/                            # Documentação técnica e modelagem
│   ├── DataBase_Model/
│   │   └── Conceitual_1.brM3        # Modelo conceitual original criado no brModelo
│   ├── ARCHITECTURE_UML.md          # Arquitetura e diagramas UML
│   └── WORKFLOW_GITHUB_AND_AGENTS.md# Fluxo de Git, Pull Requests e ativação de agentes
├── frontend/                        # Diretório reservado para a aplicação React + Vite + TailwindCSS
├── src/                             # Código-fonte da API Backend (Node.js + Express)
│   ├── config/
│   │   └── database.js              # Conexão SQLite e criação das 9 tabelas do sistema
│   ├── controllers/
│   │   ├── patientController.js     # Cadastro de pacientes e leitura do prontuário consolidado
│   │   ├── doctorController.js      # Cadastro e listagem de médicos
│   │   ├── appointmentController.js # Agendamento e listagem de consultas
│   │   └── clinicalDataController.js# Registro de sinais vitais e resultados de exames
│   ├── core/
│   │   └── logger.js                # Registro de logs no terminal com níveis de severidade
│   ├── routes/
│   │   └── index.js                 # Definição das rotas REST sob /api
│   ├── app.js                       # Configuração do aplicativo Express e middlewares
│   └── server.js                    # Inicialização do servidor HTTP
├── template/
│   └── index.html                   # Estrutura HTML inicial
├── .env                             # Variáveis de ambiente locais
├── .gitignore                       # Arquivos e pastas ignorados no controle de versão
└── package.json                     # Manifesto Node.js e scripts de execução
```

## 2. Diagrama de Componentes e Arquitetura Geral

O diagrama a seguir mostra a divisão entre interface, API Express, banco de dados e integração com o modelo generativo para apoio ao diagnóstico:

```mermaid
flowchart TB
    subgraph Client["Camada de Apresentação (Frontend)"]
        UI["Interface Médica e Paciente (React / Vite / Tailwind)"]
        Charts["Gráficos de Evolução (Pressão Arterial e Glicemia)"]
    end

    subgraph Server["Camada de Aplicação (Backend Node.js / Express)"]
        Router["Roteador REST (/api)"]
        PatCtrl["PatientController"]
        DocCtrl["DoctorController"]
        AppCtrl["AppointmentController"]
        ClinCtrl["ClinicalDataController"]
        AICtrl["AiDiagnosticService (Módulo Planejado)"]
        Log["Logger (picocolors)"]
    end

    subgraph Data["Camada de Persistência"]
        SQLite["SQLite Local (dataBase/Lab.db)"]
        Postgres["PostgreSQL / Supabase (Migração Futura)"]
    end

    subgraph ExternalAI["Serviço de Modelo Generativo"]
        GeminiClinical["Google Gemini API (Análise de Histórico Clínico)"]
    end

    UI --> Router
    Charts --> Router
    Router --> PatCtrl
    Router --> DocCtrl
    Router --> AppCtrl
    Router --> ClinCtrl
    Router --> AICtrl

    PatCtrl & DocCtrl & AppCtrl & ClinCtrl --> Log
    PatCtrl & DocCtrl & AppCtrl & ClinCtrl --> SQLite
    SQLite -. "Compatibilidade SQL" .-> Postgres

    AICtrl --> PatCtrl
    AICtrl --> GeminiClinical
    AICtrl --> SQLite
```

## 3. Diagrama de Classes UML (Domínio e Controladores)

O diagrama de classes representa as entidades persistidas no banco (incluindo a especialização de `Person` em `Patient` e `Doctor`) e os controladores responsáveis pelas regras de negócio:

```mermaid
classDiagram
    class Person {
        +int id_person
        +string name
        +string cpf
        +char biological_sex
        +date birth_date
        +datetime created_at
    }

    class Login {
        +int id_login
        +int id_person
        +string email
        +string password_hash
        +boolean situation
        +datetime created_at
    }

    class Phone {
        +int id_phone
        +int id_person
        +int ddd
        +string phone
    }

    class Patient {
        +int id_patient
        +int id_person
        +string blood_type
        +string emergency_contact_name
        +string emergency_phone
        +string allergies
        +string chronic_conditions
    }

    class Doctor {
        +int id_doctor
        +int id_person
        +string crm
        +string crm_uf
        +string speciality
    }

    class Appointment {
        +int id_appointment
        +int id_patient
        +int id_doctor
        +datetime date_time
        +string status
        +string notes
        +datetime created_at
    }

    class VitalSign {
        +int id_vital
        +int id_patient
        +int systolic_bp
        +int diastolic_bp
        +int heart_rate
        +float blood_glucose
        +string glucose_context
        +float weight_kg
        +datetime measured_at
        +string notes
    }

    class ExamResult {
        +int id_exam
        +int id_patient
        +int id_appointment
        +string exam_type
        +json parameters_json
        +string lab_reference
        +date exam_date
        +string observations
        +datetime created_at
    }

    class AiDiagnosticInsight {
        +int id_insight
        +int id_patient
        +int id_doctor
        +json context_snapshot
        +string ai_analysis
        +string risk_level
        +string doctor_feedback
        +datetime created_at
    }

    class Logger {
        -string className
        -log(level, messages) void
        +debug(message) void
        +info(message) void
        +warning(message) void
        +error(message) void
    }

    class PatientController {
        +create(req, res) Response
        +listAll(req, res) Response
        +getClinicalDossier(req, res) Response
    }

    class DoctorController {
        +create(req, res) Response
        +listAll(req, res) Response
    }

    class AppointmentController {
        +create(req, res) Response
        +listAll(req, res) Response
    }

    class ClinicalDataController {
        +recordVitalSign(req, res) Response
        +recordExamResult(req, res) Response
    }

    Person <|-- Patient : Especialização
    Person <|-- Doctor : Especialização
    Person "1" *-- "1" Login : possui
    Person "1" *-- "0..*" Phone : possui
    Patient "1" --> "0..*" Appointment : agenda
    Doctor "1" --> "0..*" Appointment : realiza
    Patient "1" *-- "0..*" VitalSign : monitora
    Patient "1" *-- "0..*" ExamResult : realiza
    Patient "1" *-- "0..*" AiDiagnosticInsight : recebe análise
    Doctor "0..1" --> "0..*" AiDiagnosticInsight : valida

    PatientController ..> Patient : gerencia
    PatientController ..> Logger : utiliza
    DoctorController ..> Doctor : gerencia
    DoctorController ..> Logger : utiliza
    AppointmentController ..> Appointment : gerencia
    AppointmentController ..> Logger : utiliza
    ClinicalDataController ..> VitalSign : registra
    ClinicalDataController ..> ExamResult : registra
    ClinicalDataController ..> Logger : utiliza
```

## 4. Diagrama Entidade-Relacionamento (DER Físico)

Estrutura das 9 tabelas definidas em [`src/config/database.js`](file:///c:/Users/jvnno/Documents/GitHub/SolveTechAi---Concent/src/config/database.js):

```mermaid
erDiagram
    person ||--o| login : "1:1"
    person ||--o{ phone : "1:N"
    person ||--o| patient : "Herança/1:1"
    person ||--o| doctor : "Herança/1:1"
    patient ||--o{ appointment : "0:N"
    doctor ||--o{ appointment : "0:N"
    patient ||--o{ vital_signs : "0:N"
    patient ||--o{ exam_results : "0:N"
    appointment |o--o{ exam_results : "0:N"
    patient ||--o{ ai_diagnostic_insights : "0:N"
    doctor |o--o{ ai_diagnostic_insights : "0:N"

    person {
        INTEGER id_person PK
        VARCHAR name
        VARCHAR cpf UK
        VARCHAR biological_sex
        DATE birth_date
        DATETIME created_at
    }

    login {
        INTEGER id_login PK
        INTEGER id_person FK_UK
        VARCHAR email UK
        VARCHAR password_hash
        BOOLEAN situation
        DATETIME created_at
    }

    phone {
        INTEGER id_phone PK
        INTEGER id_person FK
        INTEGER ddd
        VARCHAR phone
    }

    patient {
        INTEGER id_patient PK
        INTEGER id_person FK_UK
        VARCHAR blood_type
        VARCHAR emergency_contact_name
        VARCHAR emergency_phone
        TEXT allergies
        TEXT chronic_conditions
    }

    doctor {
        INTEGER id_doctor PK
        INTEGER id_person FK_UK
        VARCHAR crm UK
        VARCHAR crm_uf
        VARCHAR speciality
    }

    appointment {
        INTEGER id_appointment PK
        INTEGER id_patient FK
        INTEGER id_doctor FK
        DATETIME date_time
        VARCHAR status
        VARCHAR notes
        DATETIME created_at
    }

    vital_signs {
        INTEGER id_vital PK
        INTEGER id_patient FK
        INTEGER systolic_bp
        INTEGER diastolic_bp
        INTEGER heart_rate
        REAL blood_glucose
        VARCHAR glucose_context
        REAL weight_kg
        DATETIME measured_at
        TEXT notes
    }

    exam_results {
        INTEGER id_exam PK
        INTEGER id_patient FK
        INTEGER id_appointment FK
        VARCHAR exam_type
        TEXT parameters_json
        VARCHAR lab_reference
        DATE exam_date
        TEXT observations
        DATETIME created_at
    }

    ai_diagnostic_insights {
        INTEGER id_insight PK
        INTEGER id_patient FK
        INTEGER id_doctor FK
        TEXT context_snapshot
        TEXT ai_analysis
        VARCHAR risk_level
        TEXT doctor_feedback
        DATETIME created_at
    }
```

## 5. Diagrama de Sequência UML: Atendimento Médico e Auxílio Diagnóstico por IA

O fluxo abaixo mostra a leitura do prontuário consolidado (`dossier`), a inserção de novos exames e aferições, e o acionamento planejado do módulo de IA para identificar tendências no histórico do paciente:

```mermaid
sequenceDiagram
    autonumber
    actor Medico as Médico
    participant UI as Frontend (Dashboard Clínico)
    participant API as Backend Express (/api)
    participant DB as SQLite (Lab.db)
    participant GenAI as Motor IA Generativa (Gemini)

    Medico->>UI: Abre prontuário do Paciente
    UI->>API: GET /api/patients/:id/dossier
    API->>DB: Consulta person, patient, vital_signs, exam_results, appointments e ai_insights
    DB-->>API: Retorna histórico longitudinal completo
    API-->>UI: 200 OK (Dossier JSON)
    UI-->>Medico: Exibe linha do tempo, curvas de pressão/glicemia e exames passados

    opt Registro de Novos Dados na Consulta
        Medico->>UI: Insere aferição (PA 150/95, Glicemia 180 mg/dL) e exame (HbA1c)
        UI->>API: POST /api/clinical/vital-signs e POST /api/clinical/exams
        API->>DB: INSERT INTO vital_signs e exam_results
        DB-->>API: Confirmação (id_vital, id_exam)
        API-->>UI: 201 Created
    end

    Medico->>UI: Solicita análise preditiva e correlação de exames (IA)
    UI->>API: POST /api/patients/:id/ai-assist (Endpoint Planejado)
    API->>DB: Lê histórico atualizado de exames passados e sinais vitais
    DB-->>API: Série histórica do paciente
    API->>GenAI: Envia prompt estruturado com histórico clínico anonimizado
    GenAI-->>API: Retorna correlações, estimativa de risco e sugestões de acompanhamento
    API->>DB: INSERT INTO ai_diagnostic_insights (context_snapshot, ai_analysis, risk_level)
    API-->>UI: 200 OK (Parecer da IA e nível de risco)
    UI-->>Medico: Apresenta análise para avaliação médica
```

## 6. Diagrama de Estados UML: Ciclo de Monitoramento e Consulta

```mermaid
stateDiagram-v2
    [*] --> Cadastrado : POST /api/patients
    Cadastrado --> EmMonitoramento : Registro de Sinais Vitais / Exames
    EmMonitoramento --> ConsultaAgendada : POST /api/appointments (SCHEDULED)
    ConsultaAgendada --> EmAtendimento : Médico acessa Dossier Clínico
    EmAtendimento --> AnalisePreditivaIA : Solicitação de Auxílio Diagnóstico GenAI
    AnalisePreditivaIA --> CondutaDefinida : Médico revisa parecer e registra conduta
    EmAtendimento --> CondutaDefinida : Conduta registrada sem uso de IA
    CondutaDefinida --> EmMonitoramento : Acompanhamento contínuo (Hipertensão/Diabetes)
    ConsultaAgendada --> Cancelada : Cancelamento (CANCELLED)
    Cancelada --> EmMonitoramento
```
