const express = require('express');
const dotenv = require('dotenv');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const {
    GoogleGenerativeAI,
    imageToGenerativePart // ✅ fungsi ini tersedia mulai versi 0.7.0
} = require('@google/generative-ai');

dotenv.config();
const app = express();
app.use(express.json());

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({
    model: 'gemini-1.5-flash'
});
const upload = multer({
    dest: 'uploads/'
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running at port ${PORT}`);
});

app.post('/generate-text', async (req, res) => {
    const {
        prompt
    } = req.body;

    if (!prompt) {
        return res.status(400).json({
            error: 'Prompt is required'
        });
    }

    try {
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text(); // ✅ ambil teks saja
        res.json({
            text
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            error: error.message
        });
    }
});

app.post('/generate-from-image', upload.single('image'), async (req, res) => {
    const prompt = req.body.prompt;
    const image = imageToGenerativePart(req.file.path);

    try {
        const result = await model.generateContent([prompt, image]);
        const response = await result.response;
        res.json({
            text: response.text()
        });
    } catch (error) {
        res.status(500).json({
            error: error.message
        });
    } finally {
        fs.unlinkSync(req.file.path)
    }
});

app.post('/generate-from-document', upload.single('document'), async (req, res) => {

    const filePath = req.file.path;
    const Buffer = fs.readFileSync(filePath);
    const base64Data = Buffer.toString('base64');
    const mimeType = req.file.mimetype;

    try {
        const documentPart = {
            inlineData: {
                mimeType: mimeType,
                data: base64Data,
            }
        };

        const result = await model.generateContent(['Analysis this Document ', documentPart]);
        const response = await result.response;
        const text = response.text(); // ✅ ambil teks saja
        res.json({
            text
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            error: error.message
        });
    } finally {
        fs.unlinkSync(req.file.path);
    }
});


app.post('/generate-from-audio', upload.single('audio'), async (req, res) => {
    const audioBuffer = fs.readFileSync(req.file.path);
    const base64Audio = audioBuffer.toString('base64');
    const audioPart = {
        inlineData: {
            mimeType: 'audio/mpeg',
            data: base64Audio,
        }
    };

    try {
        const result = await model.generateContent(['Transcribe or Analize this Audio ', audioPart]);
        const response = await result.response;
        const text = response.text();
        res.json({
            text
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            error: error.message
        });
    } finally {
        fs.unlinkSync(req.file.path);
    }
});