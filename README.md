# DocuAI - Intelligent Document Processor

DocuAI is a powerful, multi-service application designed to process and analyze identity documents (like Passports and ID cards) using AI. It features a hybrid extraction pipeline that automatically switches between direct digital text extraction and high-precision OCR (Optical Character Recognition) for scanned images.

## 🚀 Key Features

- **Hybrid Extraction Pipeline**: Seamlessly handles both digital PDFs and scanned images/photos.
- **AI-Powered Structured Data**: Uses **Groq (LLaMA 3 70B)** to extract structured JSON data (Name, DOB, ID Number) from unstructured text.
- **PII Detection**: Automatically scans for and identifies Personally Identifiable Information (PII) to ensure data privacy.
- **Real-time Monitoring**: Built-in status tracking and real-time updates via Firebase Firestore.
- **Robust Hosting Support**: Optimized for Docker-based deployment (Render, AWS, etc.) with health checks and safety timeouts.

## 🏗️ Architecture

The project consists of three main components:

1.  **Frontend (React/Vite)**: A premium, glassmorphic UI for uploading and viewing document analysis.
2.  **Backend (Node.js/Express)**: Orchestrates file uploads to AWS S3 and manages document status in Firebase.
3.  **AI Service (Python/FastAPI)**: The intelligence core using **PaddleOCR** for text extraction and **Groq LLM** for semantic analysis.

## 🛠️ Tech Stack

- **Frontend**: React, Vite, Tailwind CSS, Firebase Client SDK, Axios
- **Backend**: Node.js, Express, Firebase Admin SDK, AWS SDK (@aws-sdk/client-s3)
- **AI Service**: Python 3.10, FastAPI, PaddleOCR, PyMuPDF (fitz), Groq Cloud API
- **Storage**: AWS S3 (Files), Google Firebase Firestore (Metadata/Results)

---

## 💻 Local Setup & Installation

### Prerequisites
- Node.js (v16+)
- Python (v3.10+)
- AWS Account (S3 Bucket)
- Firebase Project (Firestore & Service Account)
- Groq Cloud API Key

### 1. Clone the Repository
```bash
git clone https://github.com/Harshilagg/DocumentProcessorAI.git
cd DocumentProcessorAI
```

### 2. Configure Environment Variables
You will need to create `.env` files in each service directory.

#### AI Service (`ai-service/.env`)
```env
AWS_ACCESS_KEY_ID=your_id
AWS_SECRET_ACCESS_KEY=your_secret
AWS_REGION=your_region
AWS_BUCKET_NAME=your_bucket
FIREBASE_PROJECT_ID=your_id
FIREBASE_CLIENT_EMAIL=your_email
FIREBASE_PRIVATE_KEY="your_private_key"
GROQ_API_KEY=your_groq_key
```

#### Backend Server (`server/.env`)
```env
AWS_ACCESS_KEY_ID=your_id
AWS_SECRET_ACCESS_KEY=your_secret
AWS_REGION=your_region
AWS_BUCKET_NAME=your_bucket
FIREBASE_PROJECT_ID=your_id
FIREBASE_CLIENT_EMAIL=your_email
FIREBASE_PRIVATE_KEY="your_private_key"
PYTHON_SERVICE_URL=http://localhost:8000
```

#### Frontend Client (`client/.env`)
```env
VITE_API_URL=http://localhost:5001
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
```

---

### 3. Run the Services (3 Terminal Windows)

#### Terminal 1: AI Service (Python)
```bash
cd ai-service
# Recommended: Create a virtual environment
python -m venv venv
source venv/bin/activate # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

#### Terminal 2: Backend Server (Node.js)
```bash
cd server
npm install
node server.js
```

#### Terminal 3: Frontend Client (React)
```bash
cd client
npm install
npm run dev
```

The application will be available at `http://localhost:5173`.

---

## 🐳 Docker Support
The AI service is Docker-ready for deployment:
```bash
cd ai-service
docker build -t ai-service .
docker run -p 8000:8000 --env-file .env ai-service
```

## 📝 License
This project is for educational/assignment purposes.
