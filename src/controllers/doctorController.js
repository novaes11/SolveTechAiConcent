const db = require('../config/database');
const Logger = require('../core/logger');

const logger = new Logger('DoctorController');

const createDoctorTransaction = db.transaction((data) => {
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

    const insertDoctor = db.prepare(`
        INSERT INTO doctor (id_person, crm, crm_uf, speciality)
        VALUES (@id_person, @crm, @crm_uf, @speciality)
    `);

    const doctorResult = insertDoctor.run({
        id_person,
        crm: data.crm,
        crm_uf: data.crm_uf,
        speciality: data.speciality
    });

    return {
        id_doctor: doctorResult.lastInsertRowid,
        id_person
    };
});

class DoctorController {
    static create(req, res) {
        try {
            const { name, cpf, biological_sex, birth_date, crm, crm_uf, speciality } = req.body;

            if (!name || !cpf || !biological_sex || !birth_date || !crm || !crm_uf || !speciality) {
                return res.status(400).json({
                    error: 'Campos obrigatórios: name, cpf, biological_sex, birth_date, crm, crm_uf, speciality.'
                });
            }

            const result = createDoctorTransaction(req.body);
            logger.info(`Médico cadastrado com sucesso (id_doctor: ${result.id_doctor}, CRM: ${crm}/${crm_uf})`);

            return res.status(201).json({
                message: 'Médico cadastrado com sucesso.',
                ...result
            });
        } catch (error) {
            logger.error(`Erro ao cadastrar médico: ${error.message}`);
            if (error.message.includes('UNIQUE constraint failed')) {
                return res.status(409).json({ error: 'CPF ou CRM já cadastrado no sistema.' });
            }
            return res.status(500).json({ error: 'Erro interno ao cadastrar médico.' });
        }
    }

    static listAll(req, res) {
        try {
            const doctors = db.prepare(`
                SELECT 
                    doc.id_doctor,
                    per.id_person,
                    per.name,
                    per.cpf,
                    doc.crm,
                    doc.crm_uf,
                    doc.speciality
                FROM doctor doc
                INNER JOIN person per ON doc.id_person = per.id_person
                ORDER BY per.name ASC
            `).all();

            return res.status(200).json(doctors);
        } catch (error) {
            logger.error(`Erro ao listar médicos: ${error.message}`);
            return res.status(500).json({ error: 'Erro interno ao listar médicos.' });
        }
    }
}

module.exports = DoctorController;
