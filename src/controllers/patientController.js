const db = require('../config/database');
const Logger = require('../core/logger');

const logger = new Logger('PatientController');

const createPatientTransaction = db.transaction((data) => {
    const insertPerson = db.prepare(`
        INSERT INTO person (name, cpf, biological_sex, birth_date)
        VALUES (@name, @cpf, @biological_sex, @birth_date)
    `);

    const personResult = insertPerson.run({
        name: data.name,
        cpf: data.cpf,
        biological_sex: data.biological_sex,
        birth_date: data.birth_date
    });

    const id_person = personResult.lastInsertRowid;

    if (data.phone && data.ddd) {
        const insertPhone = db.prepare(`
            INSERT INTO phone (id_person, ddd, phone)
            VALUES (@id_person, @ddd, @phone)
        `);
        insertPhone.run({
            id_person,
            ddd: data.ddd,
            phone: data.phone
        });
    }

    const insertPatient = db.prepare(`
        INSERT INTO patient (
            id_person,
            blood_type,
            emergency_contact_name,
            emergency_phone,
            allergies,
            chronic_conditions
        ) VALUES (
            @id_person,
            @blood_type,
            @emergency_contact_name,
            @emergency_phone,
            @allergies,
            @chronic_conditions
        )
    `);

    const patientResult = insertPatient.run({
        id_person,
        blood_type: data.blood_type || null,
        emergency_contact_name: data.emergency_contact_name || null,
        emergency_phone: data.emergency_phone || null,
        allergies: data.allergies || null,
        chronic_conditions: data.chronic_conditions || null
    });

    return {
        id_patient: patientResult.lastInsertRowid,
        id_person
    };
});

class PatientController {
    static create(req, res) {
        try {
            const { name, cpf, biological_sex, birth_date } = req.body;

            if (!name || !cpf || !biological_sex || !birth_date) {
                return res.status(400).json({
                    error: 'Campos obrigatórios ausentes: name, cpf, biological_sex, birth_date.'
                });
            }

            const result = createPatientTransaction(req.body);
            logger.info(`Paciente cadastrado com sucesso (id_patient: ${result.id_patient})`);

            return res.status(201).json({
                message: 'Paciente cadastrado com sucesso.',
                ...result
            });
        } catch (error) {
            logger.error(`Erro ao cadastrar paciente: ${error.message}`);
            if (error.message.includes('UNIQUE constraint failed')) {
                return res.status(409).json({ error: 'CPF já cadastrado no sistema.' });
            }
            return res.status(500).json({ error: 'Erro interno ao cadastrar paciente.' });
        }
    }

    static listAll(req, res) {
        try {
            const patients = db.prepare(`
                SELECT 
                    pat.id_patient,
                    per.id_person,
                    per.name,
                    per.cpf,
                    per.biological_sex,
                    per.birth_date,
                    pat.blood_type,
                    pat.emergency_contact_name,
                    pat.emergency_phone,
                    pat.allergies,
                    pat.chronic_conditions
                FROM patient pat
                INNER JOIN person per ON pat.id_person = per.id_person
                ORDER BY per.name ASC
            `).all();

            return res.status(200).json(patients);
        } catch (error) {
            logger.error(`Erro ao listar pacientes: ${error.message}`);
            return res.status(500).json({ error: 'Erro interno ao listar pacientes.' });
        }
    }

    /**
     * Retorna o prontuário longitudinal completo do paciente (perfil, sinais vitais, exames passados,
     * consultas e insights de IA). Serve tanto para o dashboard médico quanto como contexto estruturado
     * para a futura feature de IA Generativa de auxílio diagnóstico.
     */
    static getClinicalDossier(req, res) {
        try {
            const patientId = Number.parseInt(req.params.id, 10);
            if (Number.isNaN(patientId) || patientId <= 0) {
                return res.status(400).json({ error: 'Identificador de paciente invalido.' });
            }

            const patient = db.prepare(`
                SELECT 
                    pat.id_patient,
                    per.id_person,
                    per.name,
                    per.cpf,
                    per.biological_sex,
                    per.birth_date,
                    pat.blood_type,
                    pat.emergency_contact_name,
                    pat.emergency_phone,
                    pat.allergies,
                    pat.chronic_conditions
                FROM patient pat
                INNER JOIN person per ON pat.id_person = per.id_person
                WHERE pat.id_patient = ?
            `).get(patientId);

            if (!patient) {
                return res.status(404).json({ error: 'Paciente não encontrado.' });
            }

            const vitalSigns = db.prepare(`
                SELECT * FROM vital_signs
                WHERE id_patient = ?
                ORDER BY measured_at DESC
            `).all(patientId);

            const rawExams = db.prepare(`
                SELECT * FROM exam_results
                WHERE id_patient = ?
                ORDER BY exam_date DESC
            `).all(patientId);

            const examResults = rawExams.map((exam) => {
                let parsedParameters = exam.parameters_json;
                try {
                    parsedParameters = JSON.parse(exam.parameters_json);
                } catch (_) {
                    // Mantém string caso não seja um JSON válido
                }
                return {
                    ...exam,
                    parameters: parsedParameters
                };
            });

            const appointments = db.prepare(`
                SELECT 
                    app.*,
                    doc_per.name AS doctor_name,
                    doc.crm,
                    doc.speciality
                FROM appointment app
                INNER JOIN doctor doc ON app.id_doctor = doc.id_doctor
                INNER JOIN person doc_per ON doc.id_person = doc_per.id_person
                WHERE app.id_patient = ?
                ORDER BY app.date_time DESC
            `).all(patientId);

            const aiInsights = db.prepare(`
                SELECT * FROM ai_diagnostic_insights
                WHERE id_patient = ?
                ORDER BY created_at DESC
            `).all(patientId);

            return res.status(200).json({
                patient,
                vital_signs: vitalSigns,
                exam_results: examResults,
                appointments,
                ai_diagnostic_insights: aiInsights
            });
        } catch (error) {
            logger.error(`Erro ao buscar prontuário do paciente: ${error.message}`);
            return res.status(500).json({ error: 'Erro interno ao buscar prontuário clínico.' });
        }
    }
}

module.exports = PatientController;
