const express = require('express');
const multer = require('multer');
const pdfParse = require('pdf-parse');
const { v4: uuidv4 } = require('uuid');
const { supabase } = require('../supabaseClient');
const { analyzeResume, generateEmbedding } = require('../services/aiService');

const router = express.Router();

// Setup Multer to store the uploaded file in memory
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB
});

router.post('/upload', upload.single('resume'), async (req, res) => {
    try {
        const file = req.file;
        const { user_id } = req.body;

        if (!file) {
            return res.status(400).json({ error: 'No resume file provided' });
        }
        if (!user_id) {
            return res.status(400).json({ error: 'Missing user_id parameter' });
        }

        console.log(`Processing upload for user: ${user_id}`);

        // 1. Extract text from PDF
        const pdfData = await pdfParse(file.buffer);
        const extractedText = pdfData.text.replace(/\0/g, ''); // Clean null bytes just in case

        // 2. Upload raw PDF to Supabase Storage bucket 'resumes'
        const fileExt = file.originalname.split('.').pop();
        const fileName = `${uuidv4()}.${fileExt}`;
        const filePath = `${user_id}/${fileName}`;

        const { data: storageData, error: storageError } = await supabase.storage
            .from('resumes')
            .upload(filePath, file.buffer, {
                contentType: file.mimetype,
                upsert: false
            });

        if (storageError) {
            console.error("Supabase Storage Error:", storageError);
            throw new Error(`Failed to upload to storage: ${storageError.message}`);
        }

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
            .from('resumes')
            .getPublicUrl(filePath);

        // 3. Insert metadata into 'resumes' table
        const { data: resumeRecord, error: dbError } = await supabase
            .from('resumes')
            .insert([{
                user_id: user_id,
                file_url: publicUrl,
                extracted_text: extractedText
            }])
            .select()
            .single();

        if (dbError) {
            console.error("Supabase DB Insert Error:", dbError);
            throw new Error(`Failed to insert metadata into database: ${dbError.message}`);
        }

        console.log("Resume metadata inserted successfully", resumeRecord.id);

        // 4. Run AI Analysis & Embeddings (Awaiting OpenAI keys, mock for now if missing)
        let analysisData = null;
        let embedding = null;

        if (process.env.OPENAI_KEY && process.env.OPENAI_KEY !== "YOUR_OPENAI_API_KEY") {
            analysisData = await analyzeResume(extractedText);
            embedding = await generateEmbedding(extractedText);

            // 5. Insert results into 'analysis_results' table
            const { error: analysisError } = await supabase
                .from('analysis_results')
                .insert([{
                    resume_id: resumeRecord.id, // Assuming relation
                    analysis_json: analysisData,
                    embedding: embedding
                }]);
            if (analysisError) console.error("Could not insert analysis:", analysisError);
        } else {
            console.warn("OpenAI Key not set, skipping AI analysis step.");
        }

        res.status(200).json({
            message: 'Upload processed successfully',
            resumeId: resumeRecord.id,
            analysis: analysisData || 'Skipped due to missing OpenAI key'
        });

    } catch (error) {
        console.error("Upload Route Error:", error);
        res.status(500).json({ error: error.message || 'Internal server error' });
    }
});

module.exports = router;
