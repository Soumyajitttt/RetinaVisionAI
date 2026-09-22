const mongoose = require("mongoose");
const { labelForGrade } = require("../utils/gradeLabels");

const patientSchema = new mongoose.Schema(
  {
    // Human-facing ID shown throughout the UI (e.g. "P-1024"), distinct from
    // Mongo's internal _id so URLs/screens don't need to change.
    patientId: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true, trim: true },
    age: { type: Number, required: true },
    gender: { type: String, required: true },
    village: { type: String, default: "Unassigned PHC Center" },
    screenDate: { type: String, required: true },
    // No default grade — a patient is "not analysed" until an AnalysisResult
    // exists for them (see patientController's getPatients/getPatientById,
    // which merge the real grade in from the AnalysisResult schema).
    grade: { type: Number, min: 0, max: 4, default: null },
    gradeText: { type: String },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);

patientSchema.pre("validate", function setGradeText(next) {
  if (this.grade != null) this.gradeText = labelForGrade(this.grade);
  next();
});

// Shape the API response to match what the frontend already expects
// ({ id, name, age, ... }) instead of Mongo's { _id, patientId, ... }.
patientSchema.set("toJSON", {
  transform: (_doc, ret) => {
    ret.id = ret.patientId;
    delete ret._id;
    delete ret.patientId;
    delete ret.__v;
    delete ret.createdBy;
    return ret;
  },
});

module.exports = mongoose.model("Patient", patientSchema);
