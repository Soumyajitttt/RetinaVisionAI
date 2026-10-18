# RetinaVision AI

**AI-assisted diabetic retinopathy screening for rural India: simple, fast, and explainable.**

RetinaVision AI turns any Primary Health Centre (PHC) into a diabetic retinopathy (DR) screening point. A health worker uploads a retina (fundus) photo, even one taken on a smartphone, and the system grades the disease, shows *why* it made that decision, and refers high-risk patients to a specialist in one click.

Demo video -> https://youtu.be/7Pvx6oEvqRg?si=dKT32cT2UV1CgszA

---

## The Problem

In rural India there is roughly one eye doctor for every 100,000 people. It is not possible to detect symptoms early without medical assistance, so patients reach a specialist only after irreversible vision loss, even though this blindness is preventable with timely screening.

## Our Solution

- **Screen at the PHC:** health workers do first-line screening, so doctors are no longer the only line of screening.
- **AI grading:** each scan is graded from Normal to Proliferative DR with a confidence score.
- **Explainable by design:** heatmaps show what the model looked at, so doctors can verify results instead of trusting a black box.
- **Triage:** healthy patients are cleared at the PHC; high-risk patients are referred with a full report, so a specialist's time goes only to the cases that need it.

---

## Features

| Area | What it does |
|---|---|
| **Image validation** | Fast pre-check rejects non-fundus uploads (screenshots, random photos) in about a second, before the heavy pipeline runs |
| **Quality assessment** | Checks sharpness, brightness, contrast and field of view; enhances usable images (CLAHE, illumination normalization, denoising) |
| **Lesion detection** | Segments the optic disc and vessels; counts microaneurysms, hemorrhages and hard exudates |
| **DR grading** | CNN classifier predicts severity (Grade 0 to 4) with a confidence score |
| **Explainability suite** | Grad-CAM, Multi-Layer CAM, Cross-Method verification (Grad-CAM vs Occlusion vs LIME) and layer Activations |
| **Reports** | Auto-generated clinical report with all explainability images, printable as PDF |
| **Referrals** | One-click referral to a specialist by email with the PDF attached, plus a searchable referral history |
| **Doctor workspace** | Separate doctor role with a "My Patients" inbox and in-app case discussions (chat room and video call) with the full report attached |
| **Cloud image storage** | MATLAB outputs are compressed and stored on Cloudinary; local job folders are cleaned up automatically |

---

## Architecture

```
┌────────────┐   HTTP/JSON    ┌──────────────────┐   matlab -batch   ┌────────────────────┐
│  Frontend  │ ─────────────▶ │     Backend      │ ────────────────▶ │   MATLAB Pipeline  │
│ React+Vite │ ◀───────────── │ Node/Express +   │ ◀──────────────── │ (quality, segment, │
│            │                │ MongoDB          │    result.json    │  classify, explain)│
└────────────┘                └────────┬─────────┘                   └────────────────────┘
                                       │
                           Cloudinary (images) · Nodemailer (referral email)
```

**Request flow:** upload → JS pre-check → MATLAB pipeline → images uploaded to Cloudinary → result saved in MongoDB → shown in the UI.

---

## Tech Stack

- **Model / pipeline:** MATLAB (Image Processing Toolbox, Deep Learning Toolbox)
- **Backend:** Node.js, Express, MongoDB (Mongoose), JWT auth, Multer, Sharp, Nodemailer, Socket.io, Cloudinary
- **Frontend:** React, Vite, Tailwind CSS, React Router

---

## Project Structure

```
RetinaVisionAI/
├── backend/                  # Express API
│   └── src/
│       ├── controllers/      # analysis, auth, patient, specialist, referral, discussion
│       ├── models/           # Mongoose schemas
│       ├── routes/
│       ├── middlewares/      # auth, role gates, upload
│       └── utils/            # MATLAB runner, JS pre-check, cloud storage, mailer, PDF
├── frontend/                 # React app
│   └── src/
│       ├── pages/
│       ├── components/
│       ├── context/
│       └── api/
├── models/                   # drNet.mat (trained CNN, see Setup)
├── src/                      # MATLAB source
│   ├── quality/              # assessQuality.m
│   ├── segmentation/         # optic disc, vessels, lesions, exudates
│   ├── explainability/       # Grad-CAM, Multi-Layer CAM, Cross-Method, Activations
│   └── simulink/
├── runPipelineForWeb.m       # MATLAB entry point called by the backend
├── main_pipeline.m           # standalone pipeline run
└── trainClassifier.m         # CNN training script
```

---

## Getting Started

### Prerequisites

| Tool | Notes |
|---|---|
| Node.js 20+ | `node -v` |
| MongoDB 6+ | Local install or a free MongoDB Atlas cluster |
| MATLAB R2024a+ | For Image Processing Toolbox and Deep Learning Toolbox |

### 1. Install dependencies

```bash
cd backend && npm install
cd ../frontend && npm install
```

### 2. Create `backend/.env`

```bash
PORT=5001
CLIENT_ORIGIN=http://localhost:5173
MONGODB_URI=mongodb://127.0.0.1:27017/dr-screening
JWT_SECRET=change-this-to-a-long-random-string
JWT_EXPIRES_IN=8h

# MATLAB 
MATLAB_EXE=/Applications/MATLAB_R2026a.app/bin/matlab
MATLAB_PROJECT_ROOT=/absolute/path/to/RetinaVisionAI   # folder containing runPipelineForWeb.m

# Cloudinary (image hosting)
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=

# Email for referrals (Gmail needs an App Password). Blank = dry run (logs only)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=
EMAIL_PASS=
EMAIL_FROM=
EMAIL_DEMO_RECIPIENT=
```

> `PORT` must match the proxy target in `frontend/vite.config.js`, otherwise you will see `socket hang up` / `ECONNREFUSED` errors in the Vite terminal.
> `MATLAB_PROJECT_ROOT` must point to the project copy you are actually editing. A stale path runs old MATLAB code with no error.

### 3. Add the trained model

`models/drNet.mat` (the trained CNN) is excluded from regular git tracking. Get it from the team and place it at `models/drNet.mat`.

### 4. Run

```bash
# Terminal 1
cd backend && npm run dev

# Terminal 2
cd frontend && npm run dev
```

Open **http://localhost:5173**.

### 6. Log in

On first run the backend seeds demo data (only into empty collections):

```
Clinician ID: PHC-RAMPUR-102
Password:     password123
```

Doctor accounts are created through the in-app registration flow.

---

## Usage

1. **Patient Database:** pick a patient.
2. **Screening & Analysis:** upload a fundus image.
3. **Result / Grading:** view grade, confidence, lesion counts, and the explainability views (Original, Grad-CAM, Multi-Layer CAM, Cross-Method, Activations).
4. **Report Preview:** review and download the PDF report.
5. **Specialists:** send the report to a doctor by email; track it under **Referral History**.
6. **Doctor login:** see referred patients under **My Patients** and start **Discussions** via chat and video call with other doctors.

---

## Notes

- **First MATLAB run is slow** (cold start). Later runs are faster. The backend timeout is configurable via `MATLAB_TIMEOUT_MS`.
- **Trial vs licensed MATLAB:** a trial license is fine for development but not for deployment. Use a licensed copy on the machine that runs the backend.
- **Uploads folder:** `nodemon.json` ignores `backend/src/uploads/**` so image uploads do not restart the dev server mid-request. Do not delete it.
- **Deployment:** the backend needs a persistent server (not serverless) because it spawns MATLAB. Host the frontend as static files and use MongoDB Atlas for the database.

---

## Disclaimer

RetinaVision AI is a **decision-support and screening aid**, not a replacement for a qualified ophthalmologist. All results should be reviewed by a medical professional before any clinical decision.
