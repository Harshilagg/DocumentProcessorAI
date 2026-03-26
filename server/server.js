require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const { S3Client, PutObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const axios = require('axios');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

// Firebase Admin Setup
const serviceAccount = {
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
};

initializeApp({
    credential: cert(serviceAccount)
});

const db = getFirestore();

// AWS S3 Setup
const s3Client = new S3Client({
    region: process.env.AWS_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
});

const upload = multer({ storage: multer.memoryStorage() });

// POST /upload - Upload to S3 and create Firestore doc
app.post('/upload', upload.array('files'), async (req, res) => {
    try {
        const files = req.files;
        if (!files || files.length === 0) {
            return res.status(400).json({ error: 'No files uploaded' });
        }

        const uploadPromises = files.map(async (file) => {
            const fileKey = `uploads/${Date.now()}-${file.originalname}`;
            const params = {
                Bucket: process.env.AWS_BUCKET_NAME,
                Key: fileKey,
                Body: file.buffer,
                ContentType: file.mimetype,
            };

            await s3Client.send(new PutObjectCommand(params));
            const fileUrl = `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${fileKey}`;

            // Create Firestore document
            const docRef = await db.collection('documents').add({
                fileUrl,
                fileName: file.originalname,
                status: 'uploaded',
                createdAt: FieldValue.serverTimestamp(),
            });

            return { id: docRef.id, fileUrl, fileName: file.originalname };
        });

        const results = await Promise.all(uploadPromises);
        res.json({ message: 'Files uploaded successfully', documents: results });
    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({ error: error.message });
    }
});

// POST /trigger - Call Python service to process document
app.post('/trigger', async (req, res) => {
    const { docId, fileUrl } = req.body;
    if (!docId || !fileUrl) {
        return res.status(400).json({ error: 'docId and fileUrl are required' });
    }

    try {
        // Update status to processing
        await db.collection('documents').doc(docId).update({ status: 'processing' });
        console.log(`[Server] Triggering Python service for doc: ${docId}`);
        console.log(`[Server] Python URL: ${process.env.PYTHON_SERVICE_URL}/process`);

        // Call Python FastAPI service (asynchronous)
        axios.post(`${process.env.PYTHON_SERVICE_URL}/process`, {
            docId,
            fileUrl
        }).then(response => {
            console.log(`[Server] ✅ Python service accepted doc ${docId}:`, response.data);

            // SECURITY TIMEOUT: If AI Service crashes (OOM), it won't ever update Firestore.
            // We set a 3-minute safety net to auto-fail it.
            setTimeout(async () => {
                try {
                    const docSnap = await db.collection('documents').doc(docId).get();
                    if (docSnap.exists && docSnap.data().status === 'processing') {
                        console.log(`[Server] ⏳ TIMEOUT for doc ${docId}. Marking as failed.`);
                        await db.collection('documents').doc(docId).update({
                            status: 'failed',
                            error: 'AI Analysis timed out. (This usually happens if the server runs out of memory on Render Free Tier).'
                        });
                    }
                } catch (timeoutErr) {
                    console.error(`[Server] Error in timeout logic:`, timeoutErr);
                }
            }, 300000); // 5 minutes

        }).catch(err => {
            console.error(`[Server] ❌ Python service error for doc ${docId}:`, err.message);
            if (err.response) {
                console.error(`[Server] Response status:`, err.response.status);
                console.error(`[Server] Response data:`, JSON.stringify(err.response.data));
            }
        });

        res.json({ message: 'Processing triggered' });
    } catch (error) {
        console.error('Trigger error:', error);
        res.status(500).json({ error: error.message });
    }
});

// GET /view/:docId - Generate a presigned URL for secure viewing
app.get('/documents/:docId/view', async (req, res) => {
    const { docId } = req.params;
    try {
        const docSnap = await db.collection('documents').doc(docId).get();
        if (!docSnap.exists) {
            return res.status(404).json({ error: 'Document not found' });
        }

        const data = docSnap.data();
        const fileUrl = data.fileUrl;

        const urlParts = new URL(fileUrl);
        const key = urlParts.pathname.substring(1);

        const command = new GetObjectCommand({
            Bucket: process.env.AWS_BUCKET_NAME,
            Key: key,
        });

        // Generate URL that expires in 7 days (604,800 seconds)
        const presignedUrl = await getSignedUrl(s3Client, command, { expiresIn: 604800 });
        res.json({ presignedUrl, fileName: data.fileName });
    } catch (error) {
        console.error('Presigned URL error:', error);
        res.status(500).json({ error: error.message });
    }
});

const PORT = process.env.PORT || 5001;
const server = app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
        console.error(`[Server] Port ${PORT} is already in use. Please kill the process on that port or use a different PORT.`);
    } else {
        console.error('[Server] Critical survival error:', err);
    }
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('[Server] Unhandled Rejection at:', promise, 'reason:', reason);
});
