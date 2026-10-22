const db = require('../config/database');
const Logger = require('../core/logger');

const logger = new Logger('AppointmentController');

class AppointmentController {
    static create(req, res) {
        try {
            const { id_patient, id_doctor, date_time, status, notes } = req.body;

            if (!id_patient || !id_doctor || !date_time) {
                return res.status(400).json({
                    error: 'Campos obrigatórios: id_patient, id_doctor, date_time.'
                });
            }

            const stmt = db.prepare(`
                INSERT INTO appointment (id_patient, id_doctor, date_time, status, notes)
                VALUES (@id_patient, @id_doctor, @date_time, @status, @notes)
            `);

            const result = stmt.run({
                id_patient,
                id_doctor,
                date_time,
                status: status || 'SCHEDULED',
                notes: notes || null
            });

            logger.info(`Consulta agendada (id_appointment: ${result.lastInsertRowid})`);

            return res.status(201).json({
                message: 'Consulta agendada com sucesso.',
                id_appointment: result.lastInsertRowid
            });
        } catch (error) {
            logger.error(`Erro ao agendar consulta: ${error.message}`);
            return res.status(500).json({ error: 'Erro interno ao agendar consulta.' });
        }
    }

    static listAll(req, res) {
        try {
            const appointments = db.prepare(`
                SELECT 
                    app.id_appointment,
                    app.date_time,
                    app.status,
                    app.notes,
                    pat.id_patient,
                    pat_per.name AS patient_name,
                    doc.id_doctor,
                    doc_per.name AS doctor_name,
                    doc.speciality
                FROM appointment app
                INNER JOIN patient pat ON app.id_patient = pat.id_patient
                INNER JOIN person pat_per ON pat.id_person = pat_per.id_person
                INNER JOIN doctor doc ON app.id_doctor = doc.id_doctor
                INNER JOIN person doc_per ON doc.id_person = doc_per.id_person
                ORDER BY app.date_time DESC
            `).all();

            return res.status(200).json(appointments);
        } catch (error) {
            logger.error(`Erro ao listar consultas: ${error.message}`);
            return res.status(500).json({ error: 'Erro interno ao listar consultas.' });
        }
    }
}

module.exports = AppointmentController;
