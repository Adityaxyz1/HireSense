const { OpenAI } = require('openai');
require('dotenv').config();

const openai = new OpenAI({
    apiKey: process.env.OPENAI_KEY,
});

async function analyzeResume(resumeText) {
    try {
        const response = await openai.chat.completions.create({
            model: "gpt-4-turbo",
            messages: [
                {
                    role: "system",
                    content: `You are an expert HR AI analyst. Extract and analyze the candidate's resume. 
                    Format the output as JSON with the following fields: 
                    "candidate_name", "role", "match_score" (integer 0-100), "risk_level" (Low, Medium, High).`
                },
                {
                    role: "user",
                    content: resumeText.substring(0, 4000) // limit tokens
                }
            ],
            response_format: { type: "json_object" }
        });

        return JSON.parse(response.choices[0].message.content);
    } catch (error) {
        console.error("Error analyzing resume with OpenAI:", error);
        throw error;
    }
}

async function generateEmbedding(text) {
    try {
        const response = await openai.embeddings.create({
            model: "text-embedding-3-small",
            input: text.substring(0, 8000), // restrict length
        });
        return response.data[0].embedding;
    } catch (error) {
        console.error("Error generating embedding:", error);
        throw error;
    }
}

module.exports = {
    analyzeResume,
    generateEmbedding
};
