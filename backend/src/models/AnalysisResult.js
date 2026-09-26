const mongoose = require("mongoose");

const analysisResultSchema = new mongoose.Schema(
  {
    patientId: { type: String, required: true, unique: true, index: true },
    status: { type: String, default: "pending" },
    grade: { type: Number },
    gradeText: { type: String },
    confidence: { type: Number },
    maCount: { type: Number },
    hemCount: { type: Number },
    exudateCount: { type: Number },
    gradcam_url: { type: String, default: null },
    enhanced_url: { type: String, default: null },
    // Extra explainability views (see src/explainability/generate*.m).
    // Optional by design: an older AnalysisResult, or a MATLAB run that
    // didn't produce these files, simply omits them - the frontend treats
    // a missing URL as "tab not available" rather than an error.
    multilayer_url: { type: String, default: null },
    crossmethod_url: { type: String, default: null },
    activations_url: { type: String, default: null },
    quality: {
      fieldQualityScore: Number,
      illumination: String,
      macularCentering: String
    },
    recommendation: { type: String },
    // Set when status === "error": a MATLAB-side pipeline failure (e.g.
    // the classification model file couldn't be loaded) rather than a
    // rejected (non-fundus) image. Lets the UI show a clear "analysis
    // failed, here's why" message instead of a raw MATLAB stack trace.
    errorMessage: { type: String, default: null }
  },
  { timestamps: true }
);

analysisResultSchema.set("toJSON", {
  transform: (_doc, ret) => {
    delete ret._id;
    delete ret.__v;
    delete ret.patientId;
    return ret;
  }
});

module.exports = mongoose.model("AnalysisResult", analysisResultSchema);