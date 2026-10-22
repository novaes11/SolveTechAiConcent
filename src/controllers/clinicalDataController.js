const db = require('../config/database');
const Logger = require('../core/logger');

const logger = new Logger('ClinicalDataController');

class ClinicalDataController {
    /**
     * Registra sinais vitais do paciente (Pressão Arterial, Glicemia, Frequência Cardíaca, Peso).
     */
    static recordVitalSign(req, res) {
        try {
            const {
                id_patient,
                systolic_bp,
                diastolic_bp,
                heart_rate,
                blood_glucose,
                glucose_context,
                weight_kg,
                measured_at,
                notes
            } = req.body;

            const patientId = Number.parseInt(id_patient, 10);
            if (Number.isNaN(patientId) || patientId <= 0) {
                return res.status(400).json({ error: 'O campo id_patient deve ser um numero inteiro positivo.' });
            }

            const patientExists = db.prepare('SELECT id_patient FROM patient WHERE id_patient = ?').get(patientId);
            if (!patientExists) {
                return res.status(404).json({ error: 'Paciente informado nao foi encontrado.' });
            }

            const stmt = db.prepare(`
                INSERT INTO vital_signs (
                    id_patient,
                    systolic_bp,
                    diastolic_bp,
                    heart_rate,
                    blood_glucose,
                    glucose_context,
                    weight_kg,
                    measured_at,
                    notes
                ) VALUES (
                    @id_patient,
                    @systolic_bp,
                    @diastolic_bp,
                    @heart_rate,
                    @blood_glucose,
                    @glucose_context,
                    @weight_kg,
                    COALESCE(@measured_at, CURRENT_TIMESTAMP),
                    @notes
                )
            `);

            const result = stmt.run({
                id_patient,
                systolic_bp: systolic_bp ?? null,
                diastolic_bp: diastolic_bp ?? null,
                heart_rate: heart_rate ?? null,
                blood_glucose: blood_glucose ?? null,
                glucose_context: glucose_context ?? null,
                weight_kg: weight_kg ?? null,
                measured_at: measured_at ?? null,
                notes: notes ?? null
            });

            logger.info(`Sinal vital registrado para paciente ${id_patient} (id_vital: ${result.lastInsertRowid})`);

            return res.status(201).json({
                message: 'Sinais vitais registrados com sucesso.',
                id_vital: result.lastInsertRowid
            });
        } catch (error) {
            logger.error(`Erro ao registrar sinais vitais: ${error.message}`);
            return res.status(500).json({ error: 'Erro interno ao registrar sinais vitais.' });
        }
    }

    /**
     * Registra resultados de exames laboratoriais ou clínicos do paciente.
     * Os parâmetros do exame são armazenados de forma estruturada (JSON) para compor o contexto
     * histórico que a IA Generativa utilizará no auxílio diagnóstico.
     */
    static recordExamResult(req, res) {
        try {
            const {
                id_patient,
                id_appointment,
                exam_type,
                parameters,
                lab_reference,
                exam_date,
                observations
            } = req.body;

            if (!id_patient || !exam_type || !parameters || !exam_date) {
                return res.status(400).json({
                    error: 'Campos obrigatórios: id_patient, exam_type, parameters, exam_date.'
                });
            }

            const patientId = Number.parseInt(id_patient, 10);
            if (Number.isNaN(patientId) || patientId <= 0) {
                return res.status(400).json({ error: 'O campo id_patient deve ser um numero inteiro positivo.' });
            }

            const patientExists = db.prepare('SELECT id_patient FROM patient WHERE id_patient = ?').get(patientId);
            if (!patientExists) {
                return res.status(404).json({ error: 'Paciente informado nao foi encontrado.' });
            }

            const parameters_json = typeof parameters === 'string'
                ? parameters
                : JSON.stringify(parameters);

            const stmt = db.prepare(`
                INSERT INTO exam_results (
                    id_patient,
                    id_appointment,
                    exam_type,
                    parameters_json,
                    lab_reference,
                    exam_date,
                    observations
                ) VALUES (
                    @id_patient,
                    @id_appointment,
                    @exam_type,
                    @parameters_json,
                    @lab_reference,
                    @exam_date,
                    @observations
                )
            `);

            const result = stmt.run({
                id_patient,
                id_appointment: id_appointment ?? null,
                exam_type,
                parameters_json,
                lab_reference: lab_reference ?? null,
                exam_date,
                observations: observations ?? null
            });

            logger.info(`Exame '${exam_type}' registrado para paciente ${id_patient} (id_exam: ${result.lastInsertRowid})`);

            return res.status(201).json({
                message: 'Resultado de exame registrado com sucesso.',
                id_exam: result.lastInsertRowid
            });
        } catch (error) {
            logger.error(`Erro ao registrar resultado de exame: ${error.message}`);
            return res.status(500).json({ error: 'Erro interno ao registrar exame.' });
        }
    }
}

module.exports = ClinicalDataController;
