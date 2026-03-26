---
title: DocuAI Intelligence Service
emoji: 🧠
colorFrom: indigo
colorTo: blue
sdk: docker
app_port: 7860
python_version: 3.10
pinned: false
---

# DocuAI Intelligence Service (Hugging Face Space)

This Space hosts the **AI Analysis Core** for the DocuAI Intelligent Document Processor.

## 🚀 Features
- **High RAM**: Running on a 16GB RAM environment for stable OCR.
- **PaddleOCR**: State-of-the-art text detection and recognition.
- **FastAPI**: Asynchronous high-performance API endpoints.

## ⚙️ Configuration
This Space is built using the `Dockerfile` at the repository root. It listens on port `7860`.

## 🔒 Security
All environment variables (AWS, Firebase, Groq) are managed via Hugging Face **Secrets**.
