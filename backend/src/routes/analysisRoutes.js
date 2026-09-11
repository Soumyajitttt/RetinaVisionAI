const express = require("express");
const upload = require("../middlewares/upload");
const { getAnalysisForPatient, uploadAndAnalyze } = require("../controllers/analysisController");

const router = express.Router();

router.get("/:patientId", getAnalysisForPatient);
router.post("/:patientId/upload", upload.single("image"), uploadAndAnalyze);

router.post("/", upload.single("image"), uploadAndAnalyze);

module.exports = router;
