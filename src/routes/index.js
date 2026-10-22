const express = require('express');
const PatientController = require('../controllers/patientController');
const DoctorController = require('../controllers/doctorController');
const AppointmentController = require('../controllers/appointmentController');
const ClinicalDataController = require('../controllers/clinicalDataController');

const router = express.Router();

// Healthcheck da API
router.get('/health', (req, res) => {
    res.status(200).json({
        status: 'ok',
        service: 'SolveTechAi Clinical API',
        timestamp: new Date().toISOString()
    });
});

// Rotas de Pacientes e Prontuário Longitudinal (Contexto para Médico e futura IA)
router.post('/patients', PatientController.create);
router.get('/patients', PatientController.listAll);
router.get('/patients/:id/dossier', PatientController.getClinicalDossier);

// Rotas de Médicos
router.post('/doctors', DoctorController.create);
router.get('/doctors', DoctorController.listAll);

// Rotas de Consultas
router.post('/appointments', AppointmentController.create);
router.get('/appointments', AppointmentController.listAll);

// Rotas de Monitoramento Clínico (Sinais Vitais e Exames Laboratoriais)
router.post('/clinical/vital-signs', ClinicalDataController.recordVitalSign);
router.post('/clinical/exams', ClinicalDataController.recordExamResult);

module.exports = router;
