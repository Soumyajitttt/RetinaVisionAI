const Patient = require("../models/Patient");
const AnalysisResult = require("../models/AnalysisResult");
const asyncHandler = require("../utils/asyncHandler");

// A patient document no longer carries a meaningful default grade — the
// AnalysisResult schema is the source of truth for whether/how a patient has
// been graded. This merges the real grade/gradeText in (or leaves them null,
// i.e. "Not analysed", if no analysis exists yet).
async function withAnalysedGrade(patients) {
  const ids = patients.map((p) => p.patientId);
  const results = await AnalysisResult.find({ patientId: { $in: ids } });
  const resultByPatientId = new Map(results.map((r) => [r.patientId, r]));

  return patients.map((patient) => {
    const json = patient.toJSON();
    const analysis = resultByPatientId.get(patient.patientId);
    if (analysis && analysis.grade != null) {
      json.grade = analysis.grade;
      json.gradeText = analysis.gradeText;
    } else {
      json.grade = null;
      json.gradeText = null;
    }
    return json;
  });
}

// GET /api/patients?search=&grade=
const getPatients = asyncHandler(async (req, res) => {
  const { search = "", grade } = req.query;
  const filter = {};

  if (search.trim()) {
    const q = search.trim();
    filter.$or = [
      { name: { $regex: q, $options: "i" } },
      { patientId: { $regex: q, $options: "i" } },
      { village: { $regex: q, $options: "i" } },
    ];
  }

  const patients = await Patient.find(filter).sort({ createdAt: -1 });
  let withGrades = await withAnalysedGrade(patients);

  // Filtering by grade has to happen after merging in the real,
  // analysis-derived grade rather than as a Mongo query on Patient.grade.
  if (grade !== undefined && grade !== "all") {
    const g = Number(grade);
    withGrades = withGrades.filter((p) => p.grade === g);
  }

  res.json(withGrades);
});

// GET /api/patients/:id
const getPatientById = asyncHandler(async (req, res) => {
  const patient = await Patient.findOne({ patientId: req.params.id });
  if (!patient) {
    return res
      .status(404)
      .json({ error: `Patient ${req.params.id} not found` });
  }
  const [withGrade] = await withAnalysedGrade([patient]);
  res.json(withGrade);
});

// POST /api/patients
const createPatient = asyncHandler(async (req, res) => {
  const { name, age, gender, village, grade } = req.body;
  if (!name || !age || !gender) {
    return res.status(400).json({ error: "name, age and gender are required" });
  }

  const count = await Patient.countDocuments();
  const patientId = `P-${1024 + count}`;

  const patient = await Patient.create({
    patientId,
    name,
    age: Number(age),
    gender,
    village: village || "Unassigned PHC Center",
    screenDate: new Date().toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }),
    grade: grade != null ? Number(grade) : null,
  });

  res.status(201).json(patient);
});

module.exports = { getPatients, getPatientById, createPatient };
