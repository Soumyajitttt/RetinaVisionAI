require("dotenv").config();

module.exports = {
  port: process.env.PORT || 5000,
  clientOrigin: process.env.CLIENT_ORIGIN || "http://localhost:5173",
  mongodbUri: process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/dr-screening",
  jwt: {
    secret: process.env.JWT_SECRET || "dev-secret-change-me",
    expiresIn: process.env.JWT_EXPIRES_IN || "8h"
  },
  email: {
    service: process.env.EMAIL_SERVICE || "gmail",
    user: process.env.EMAIL_USER || "",
    pass: process.env.EMAIL_PASS || "",
    from: process.env.EMAIL_FROM || "RetinaVision AI <no-reply@retinavision.ai>",
    demoOverride: process.env.DEMO_REFERRAL_EMAIL || ""
  },
  matlab: {
    exePath: process.env.MATLAB_EXE || "",
    projectRoot: process.env.MATLAB_PROJECT_ROOT || ""
  },
  // Cloudinary hosts the MATLAB-generated enhanced/Grad-CAM images so the
  // local uploads/ folder can be deleted after every job instead of
  // growing forever. Leave blank to keep the old local-disk behaviour.
  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME || "",
    apiKey: process.env.CLOUDINARY_API_KEY || "",
    apiSecret: process.env.CLOUDINARY_API_SECRET || ""
  }
};