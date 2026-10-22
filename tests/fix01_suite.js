const assert = require('assert');
const app = require('../src/app');

async function runTests() {
    console.log('[TEST 18.06] Iniciando bateria de testes automatizados para FIX-01...');

    const server = app.listen(0);
    const port = server.address().port;
    const baseUrl = `http://localhost:${port}/api`;

    try {
        // 1. Healthcheck
        const healthRes = await fetch(`${baseUrl}/health`);
        assert.strictEqual(healthRes.status, 200, 'Healthcheck status deve ser 200');
        const healthData = await healthRes.json();
        assert.strictEqual(healthData.status, 'ok', 'Health status deve ser ok');
        console.log('✓ Healthcheck [GET /api/health]: OK (200)');

        // 2. Cadastro de Paciente (Validacao com sucesso)
        const uniqueCpf = `999${Math.floor(10000000 + Math.random() * 90000000)}`;
        const createPatRes = await fetch(`${baseUrl}/patients`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: 'Paciente Teste FIX01',
                cpf: uniqueCpf,
                biological_sex: 'M',
                birth_date: '1975-08-20',
                ddd: 11,
                phone: '988887777',
                blood_type: 'A+',
                allergies: 'Nenhuma',
                chronic_conditions: 'Hipertensao Estagio 1'
            })
        });
        assert.strictEqual(createPatRes.status, 201, 'Criacao de paciente deve retornar 201');
        const patData = await createPatRes.json();
        const patientId = patData.id_patient;
        assert(patientId > 0, 'id_patient deve ser maior que zero');
        console.log(`✓ Cadastro de Paciente [POST /api/patients]: OK (id_patient: ${patientId})`);

        // 3. Listagem de Pacientes
        const listPatRes = await fetch(`${baseUrl}/patients`);
        assert.strictEqual(listPatRes.status, 200, 'Listagem de pacientes deve retornar 200');
        const listPatData = await listPatRes.json();
        assert(Array.isArray(listPatData), 'Resposta deve ser um array');
        assert(listPatData.some((p) => p.id_patient === patientId), 'Paciente criado deve constar na listagem');
        console.log(`✓ Listagem de Pacientes [GET /api/patients]: OK (${listPatData.length} registros)`);

        // 4. Cadastro de Medico
        const uniqueCrm = `CRM${Math.floor(10000 + Math.random() * 90000)}`;
        const createDocRes = await fetch(`${baseUrl}/doctors`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: 'Dr. Roberto Cardiologista',
                cpf: `888${Math.floor(10000000 + Math.random() * 90000000)}`,
                biological_sex: 'M',
                birth_date: '1980-03-15',
                crm: uniqueCrm,
                crm_uf: 'PR',
                speciality: 'Cardiologia'
            })
        });
        assert.strictEqual(createDocRes.status, 201, 'Criacao de medico deve retornar 201');
        const docData = await createDocRes.json();
        const doctorId = docData.id_doctor;
        console.log(`✓ Cadastro de Medico [POST /api/doctors]: OK (id_doctor: ${doctorId})`);

        // 5. Agendamento de Consulta
        const createAppointmentRes = await fetch(`${baseUrl}/appointments`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                id_patient: patientId,
                id_doctor: doctorId,
                date_time: '2026-11-01 14:30:00',
                notes: 'Consulta inicial de acompanhamento'
            })
        });
        assert.strictEqual(createAppointmentRes.status, 201, 'Agendamento deve retornar 201');
        console.log('✓ Agendamento de Consulta [POST /api/appointments]: OK');

        // 6. Registro de Sinais Vitais
        const recordVitalRes = await fetch(`${baseUrl}/clinical/vital-signs`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                id_patient: patientId,
                systolic_bp: 135,
                diastolic_bp: 88,
                heart_rate: 74,
                blood_glucose: 125.0,
                glucose_context: 'JEJUM',
                weight_kg: 82.5,
                notes: 'Pressao controlada em repouso'
            })
        });
        assert.strictEqual(recordVitalRes.status, 201, 'Registro de vitais deve retornar 201');
        console.log('✓ Registro de Sinais Vitais [POST /api/clinical/vital-signs]: OK');

        // 7. Registro de Exames Laboratoriais
        const recordExamRes = await fetch(`${baseUrl}/clinical/exams`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                id_patient: patientId,
                exam_type: 'Perfil Lipidico',
                parameters: { colesterol_total: 198, hdl: 48, ldl: 122, triglicerideos: 140 },
                lab_reference: 'Colesterol Total < 190 desejavel',
                exam_date: '2026-10-18',
                observations: 'Acompanhar em 6 meses'
            })
        });
        assert.strictEqual(recordExamRes.status, 201, 'Registro de exame deve retornar 201');
        console.log('✓ Registro de Exame [POST /api/clinical/exams]: OK');

        // 8. Consulta do Prontuario Longitudinal (Dossier)
        const dossierRes = await fetch(`${baseUrl}/patients/${patientId}/dossier`);
        assert.strictEqual(dossierRes.status, 200, 'Dossier deve retornar 200');
        const dossierData = await dossierRes.json();
        assert(dossierData.patient, 'Dossier deve conter dados do paciente');
        assert(dossierData.vital_signs.length >= 1, 'Dossier deve listar vitais');
        assert(dossierData.exam_results.length >= 1, 'Dossier deve listar exames');
        assert(dossierData.appointments.length >= 1, 'Dossier deve listar consultas');
        console.log('✓ Consulta Prontuario Longitudinal [GET /api/patients/:id/dossier]: OK');

        // 9. Validacao AppSec IDOR (ID inexistente ou invalido)
        const invalidDossierRes = await fetch(`${baseUrl}/patients/9999999/dossier`);
        assert.strictEqual(invalidDossierRes.status, 404, 'Dossier de ID inexistente deve retornar 404');
        const badIdRes = await fetch(`${baseUrl}/patients/abc/dossier`);
        assert.strictEqual(badIdRes.status, 400, 'Dossier com ID nao numerico deve retornar 400');
        console.log('✓ Validacoes de Seguranca AppSec (IDOR / Input invalido): OK');

        console.log('\n[TEST 18.06] Todos os 9 cenarios foram executados com 100% de sucesso.');
        server.close();
    } catch (err) {
        console.error('[TEST 18.06] Falha na execucao da suite de testes:', err.message);
        server.close();
        process.exitCode = 1;
    }
}

runTests();
