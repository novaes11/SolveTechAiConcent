const fs = require('fs');
const path = require('path');
const Logger = require('../core/logger');

const logger = new Logger('Database');

// Garante que o diretório dataBase exista antes de instanciar o arquivo SQLite
const dbDir = path.resolve(__dirname, '../../dataBase');
if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
}

const dbPath = path.join(dbDir, 'Lab.db');

/**
 * Cria uma instância do banco SQLite utilizando 'better-sqlite3' caso o binário C++
 * esteja compilado para a versão atual do Node, ou faz fallback transparente para o
 * módulo nativo 'node:sqlite' (DatabaseSync do Node.js 22+/24+) mantendo a mesma API.
 */
function createDatabaseConnection(filePath) {
    try {
        const BetterSqlite3 = require('better-sqlite3');
        const instance = new BetterSqlite3(filePath);
        logger.info('Conectado ao SQLite via better-sqlite3.');
        return instance;
    } catch (_) {
        const { DatabaseSync } = require('node:sqlite');
        const rawDb = new DatabaseSync(filePath);
        logger.info('Conectado ao SQLite via módulo nativo node:sqlite (DatabaseSync).');

        return {
            exec: (sql) => rawDb.exec(sql),
            pragma: (pragmaStr) => rawDb.exec(`PRAGMA ${pragmaStr};`),
            prepare: (sql) => {
                const stmt = rawDb.prepare(sql);
                if (typeof stmt.setAllowBareNamedParameters === 'function') {
                    stmt.setAllowBareNamedParameters(true);
                }
                return {
                    run: (...args) => stmt.run(...args),
                    get: (...args) => {
                        const row = stmt.get(...args);
                        return row ? { ...row } : undefined;
                    },
                    all: (...args) => stmt.all(...args).map((row) => ({ ...row }))
                };
            },
            transaction: (fn) => {
                return (...args) => {
                    rawDb.exec('BEGIN');
                    try {
                        const result = fn(...args);
                        rawDb.exec('COMMIT');
                        return result;
                    } catch (err) {
                        rawDb.exec('ROLLBACK');
                        throw err;
                    }
                };
            }
        };
    }
}

const db = createDatabaseConnection(dbPath);

// Habilita chaves estrangeiras no SQLite
db.pragma('foreign_keys = ON');

// 1. Tabela base de Pessoas (person)
const createPersonSQL = `
    CREATE TABLE IF NOT EXISTS person (
        id_person INTEGER PRIMARY KEY AUTOINCREMENT,
        name VARCHAR(200) NOT NULL,
        cpf VARCHAR(14) NOT NULL UNIQUE,
        biological_sex VARCHAR(1) NOT NULL,
        birth_date DATE NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
`;

// 2. Tabela de Credenciais de Acesso (login) - Relacionamento 1:1 com person
const createLoginSQL = `
    CREATE TABLE IF NOT EXISTS login (
        id_login INTEGER PRIMARY KEY AUTOINCREMENT,
        id_person INTEGER NOT NULL UNIQUE,
        email VARCHAR(100) NOT NULL UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        situation BOOLEAN NOT NULL DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT fk_login_person FOREIGN KEY (id_person) REFERENCES person(id_person) ON DELETE CASCADE
    );
`;

// 3. Tabela de Telefones (phone) - Relacionamento 1:N com person
const createPhoneSQL = `
    CREATE TABLE IF NOT EXISTS phone (
        id_phone INTEGER PRIMARY KEY AUTOINCREMENT,
        id_person INTEGER NOT NULL,
        ddd INTEGER NOT NULL,
        phone VARCHAR(15) NOT NULL,
        CONSTRAINT fk_phone_person FOREIGN KEY (id_person) REFERENCES person(id_person) ON DELETE CASCADE
    );
`;

// 4. Especialização: Pacientes (patient)
const createPatientSQL = `
    CREATE TABLE IF NOT EXISTS patient (
        id_patient INTEGER PRIMARY KEY AUTOINCREMENT,
        id_person INTEGER NOT NULL UNIQUE,
        blood_type VARCHAR(5),
        emergency_contact_name VARCHAR(200),
        emergency_phone VARCHAR(20),
        allergies TEXT,
        chronic_conditions TEXT,
        CONSTRAINT fk_patient_person FOREIGN KEY (id_person) REFERENCES person(id_person) ON DELETE CASCADE
    );
`;

// 5. Especialização: Médicos (doctor)
const createDoctorSQL = `
    CREATE TABLE IF NOT EXISTS doctor (
        id_doctor INTEGER PRIMARY KEY AUTOINCREMENT,
        id_person INTEGER NOT NULL UNIQUE,
        crm VARCHAR(20) NOT NULL UNIQUE,
        crm_uf VARCHAR(2) NOT NULL,
        speciality VARCHAR(100) NOT NULL,
        CONSTRAINT fk_doctor_person FOREIGN KEY (id_person) REFERENCES person(id_person) ON DELETE CASCADE
    );
`;

// 6. Consultas Médicas (appointment)
const createAppointmentSQL = `
    CREATE TABLE IF NOT EXISTS appointment (
        id_appointment INTEGER PRIMARY KEY AUTOINCREMENT,
        id_patient INTEGER NOT NULL,
        id_doctor INTEGER NOT NULL,
        date_time DATETIME NOT NULL,
        status VARCHAR(30) NOT NULL DEFAULT 'SCHEDULED',
        notes VARCHAR(1000),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT fk_appointment_patient FOREIGN KEY (id_patient) REFERENCES patient(id_patient) ON DELETE CASCADE,
        CONSTRAINT fk_appointment_doctor FOREIGN KEY (id_doctor) REFERENCES doctor(id_doctor) ON DELETE CASCADE
    );
`;

// 7. Sinais Vitais e Monitoramento Contínuo (vital_signs) - Foco em Hipertensão e Diabetes
const createVitalSignsSQL = `
    CREATE TABLE IF NOT EXISTS vital_signs (
        id_vital INTEGER PRIMARY KEY AUTOINCREMENT,
        id_patient INTEGER NOT NULL,
        systolic_bp INTEGER,
        diastolic_bp INTEGER,
        heart_rate INTEGER,
        blood_glucose REAL,
        glucose_context VARCHAR(50),
        weight_kg REAL,
        measured_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        notes TEXT,
        CONSTRAINT fk_vital_patient FOREIGN KEY (id_patient) REFERENCES patient(id_patient) ON DELETE CASCADE
    );
`;

// 8. Resultados de Exames Passados (exam_results) - Base histórica para análise longitudinal e IA
const createExamResultsSQL = `
    CREATE TABLE IF NOT EXISTS exam_results (
        id_exam INTEGER PRIMARY KEY AUTOINCREMENT,
        id_patient INTEGER NOT NULL,
        id_appointment INTEGER,
        exam_type VARCHAR(100) NOT NULL,
        parameters_json TEXT NOT NULL,
        lab_reference VARCHAR(200),
        exam_date DATE NOT NULL,
        observations TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT fk_exam_patient FOREIGN KEY (id_patient) REFERENCES patient(id_patient) ON DELETE CASCADE,
        CONSTRAINT fk_exam_appointment FOREIGN KEY (id_appointment) REFERENCES appointment(id_appointment) ON DELETE SET NULL
    );
`;

// 9. Pareceres e Previsões da IA Generativa (ai_diagnostic_insights) - Auxílio diagnóstico ao médico
const createAiDiagnosticInsightsSQL = `
    CREATE TABLE IF NOT EXISTS ai_diagnostic_insights (
        id_insight INTEGER PRIMARY KEY AUTOINCREMENT,
        id_patient INTEGER NOT NULL,
        id_doctor INTEGER,
        context_snapshot TEXT NOT NULL,
        ai_analysis TEXT NOT NULL,
        risk_level VARCHAR(20) DEFAULT 'MODERATE',
        doctor_feedback TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT fk_insight_patient FOREIGN KEY (id_patient) REFERENCES patient(id_patient) ON DELETE CASCADE,
        CONSTRAINT fk_insight_doctor FOREIGN KEY (id_doctor) REFERENCES doctor(id_doctor) ON DELETE SET NULL
    );
`;

function initializeDatabase() {
    try {
        db.exec(createPersonSQL);
        db.exec(createLoginSQL);
        db.exec(createPhoneSQL);
        db.exec(createPatientSQL);
        db.exec(createDoctorSQL);
        db.exec(createAppointmentSQL);
        db.exec(createVitalSignsSQL);
        db.exec(createExamResultsSQL);
        db.exec(createAiDiagnosticInsightsSQL);

        logger.info('Banco de dados SQLite inicializado e 9 tabelas validadas com sucesso.');
    } catch (error) {
        logger.error(`Erro ao inicializar o banco de dados: ${error.message}`);
        throw error;
    }
}

initializeDatabase();

module.exports = db;
