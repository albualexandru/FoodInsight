require('dotenv').config();

const express = require('express');
const multer = require('multer');
const path = require('path');
const { GoogleGenAI } = require('@google/genai');

const PORT = process.env.PORT || 3000;
const GEMINI_MODEL = 'gemini-2.5-pro';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (!GEMINI_API_KEY) {
  console.warn(
    'WARNING: GEMINI_API_KEY environment variable is not set. ' +
      'Calorie estimation requests will fail until it is configured.'
  );
}

const ai = GEMINI_API_KEY ? new GoogleGenAI({ apiKey: GEMINI_API_KEY }) : null;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('Only image uploads are allowed.'));
    }
    cb(null, true);
  },
});

const app = express();
app.use(express.static(path.join(__dirname, 'public')));

const PROMPT = `You are a nutrition expert. Look at the photo of food and estimate the
total calories of everything visible. Respond ONLY with a compact JSON object
(no markdown, no code fences) in this exact shape:
{"foodName": "short description of the food", "calories": <integer estimate>, "notes": "short one-sentence explanation of the estimate"}
If the image does not contain food, set "calories" to 0 and explain in "notes".`;

function extractJson(text) {
  if (!text) return null;
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    return JSON.parse(match[0]);
  } catch (err) {
    return null;
  }
}

app.post('/api/estimate-calories', upload.single('photo'), async (req, res) => {
  try {
    if (!ai) {
      return res.status(500).json({
        error: 'Server is missing the GEMINI_API_KEY environment variable.',
      });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No photo was uploaded.' });
    }

    const base64Image = req.file.buffer.toString('base64');

    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: [
        {
          role: 'user',
          parts: [
            { text: PROMPT },
            {
              inlineData: {
                mimeType: req.file.mimetype,
                data: base64Image,
              },
            },
          ],
        },
      ],
    });

    const text = response.text;
    const parsed = extractJson(text);

    if (!parsed || typeof parsed.calories !== 'number') {
      return res.status(502).json({
        error: 'Could not understand the estimate returned by Gemini.',
        raw: text,
      });
    }

    return res.json({
      foodName: parsed.foodName || 'Unknown food',
      calories: Math.max(0, Math.round(parsed.calories)),
      notes: parsed.notes || '',
    });
  } catch (err) {
    console.error('Error estimating calories:', err);
    return res.status(500).json({ error: 'Failed to estimate calories. Please try again.' });
  }
});

app.use((err, req, res, next) => {
  if (err) {
    return res.status(400).json({ error: err.message || 'Request error.' });
  }
  next();
});

app.listen(PORT, () => {
  console.log(`FoodInsight server listening on port ${PORT}`);
});
