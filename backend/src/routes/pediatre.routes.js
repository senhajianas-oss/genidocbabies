const express = require("express");
const router = express.Router();

const { auth } = require("../middleware/auth");
const { requireRole } = require("../middleware/role");
const pediatreController = require("../controllers/pediatre.controller");
const upload = require("../middleware/upload");

// Onboarding
router.post("/onboarding/step1", auth, requireRole("PEDIATRE"), pediatreController.step1);
router.post("/onboarding/step2", auth, requireRole("PEDIATRE"), upload.array("documents"), pediatreController.step2);
router.post("/onboarding/step3", auth, requireRole("PEDIATRE"), pediatreController.step3);

// Patients
router.get("/patients", auth, requireRole("PEDIATRE"), pediatreController.getPatients);
router.get("/patients/:id", auth, requireRole("PEDIATRE"), pediatreController.getPatientDetails);
router.get("/patients/:id/growth", auth, requireRole("PEDIATRE"), pediatreController.getGrowthData);
router.get("/patients/:id/schedule", auth, requireRole("PEDIATRE"), pediatreController.getVaccinationSchedule);

// Actions médicales
router.post("/patients/vitals", auth, requireRole("PEDIATRE"), pediatreController.addVital);
router.post("/patients/consultations", auth, requireRole("PEDIATRE"), pediatreController.addConsultation);
router.post("/patients/vaccinations", auth, requireRole("PEDIATRE"), pediatreController.addVaccination);
router.get("/catalog/vaccins", auth, requireRole("PEDIATRE"), pediatreController.getVaccinCatalog);

module.exports = router;
