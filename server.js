import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// API endpoint to analyze assignments
app.post('/api/analyze', async (req, res) => {
  try {
    const { assignmentText, gradeLevel, courseType, focusArea } = req.body;

    if (!assignmentText) {
      return res.status(400).json({ error: 'Assignment text is required' });
    }

    const contextPrompt = `
Grade Level: ${gradeLevel || 'college'}
Course Type: ${courseType || 'general'}
Focus Area: ${focusArea === 'all' ? 'All equity dimensions' : focusArea}
    `.trim();

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.VITE_OPENROUTER_API_KEY}`,
        'HTTP-Referer': process.env.APP_URL || 'http://localhost:3000',
        'X-Title': 'DIKE AI - Educational Equity Analyzer',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'meta-llama/llama-3.3-70b-instruct:free',
        messages: [
          { 
            role: 'system', 
            content: `You are an expert educational equity analyst specializing in identifying barriers to educational access. Analyze assignments for: SOCIOECONOMIC BARRIERS, DIGITAL ACCESS, TIME/SCHEDULING, CULTURAL ASSUMPTIONS, ACCESSIBILITY, LANGUAGE/LITERACY. 

CRITICAL RESPONSE QUALITY STANDARDS:
- Be SPECIFIC and ACTIONABLE: Avoid vague statements like "may create barriers" - identify exact barriers and concrete solutions
- Be EDUCATOR-FOCUSED: Provide insights that educators can immediately implement
- Be EVIDENCE-BASED: Reference specific research findings, not just general principles
- Be COMPREHENSIVE: Go deep into each barrier with nuanced analysis
- Be PRACTICAL: Suggest realistic alternatives that maintain academic rigor

ANALYSIS DEPTH REQUIREMENTS:
1. For each barrier: Identify the EXACT element causing inequity (e.g., "11:59 PM Friday deadline disadvantages students working evening retail jobs")
2. For impact: Explain WHO specifically is affected and HOW (e.g., "First-generation students without home printers must travel to campus, adding 2+ hours")
3. For suggestions: Provide 2-3 CONCRETE alternatives with implementation details (e.g., "Offer 3 submission windows across different time zones, OR extend deadline to Sunday midnight with no penalty")
4. For research: Cite specific findings, not just general frameworks (e.g., "Students with jobs are 23% more likely to miss tight deadlines (Smith, 2021)")

CRITICAL FORMATTING RULES:
1. Return ONLY valid JSON, no other text
2. Write professional, clear text without emojis or special characters
3. For researchBasis: Provide a descriptive research topic/keyword (e.g., "digital divide education", "universal design learning", "socioeconomic barriers education")
4. DO NOT include researchLink field - it will be generated automatically
5. The researchBasis should be 2-5 keywords that describe the research area for this barrier
6. For strengths and recommendations: Each item MUST be ONE concise sentence (max 100 characters)
7. Make strengths and recommendations UNIQUE and SPECIFIC to this exact assignment - avoid generic statements

IMPORTANT: 
- researchBasis should be search keywords, not a full citation
- Format like: "educational technology access equity" or "culturally responsive teaching"
- These will be used to search Google Scholar automatically
- DO NOT generate URLs or links
- Strengths must be brief, specific, and fit on one line
- Recommendations must be brief, actionable, and fit on one line
- NEVER repeat generic phrases - tailor to the specific assignment details

SCORING METHODOLOGY:
- Overall score (0-100) is calculated based on: Number of barriers identified (weighted by severity: High=-15, Medium=-10, Low=-5), accessibility features present (+5 each), and overall equity design
- Start at 100, deduct points for each barrier, add points for equity strengths
- Scores: 85-100 (Excellent equity), 70-84 (Good with minor issues), 50-69 (Moderate concerns), Below 50 (Significant barriers)

Use this exact structure:
{"overallScore": number, "summary": "text", "barriers": [{"category": "text", "severity": "High|Medium|Low", "issue": "text", "impact": "text", "suggestions": ["text"], "researchBasis": "keyword search terms"}], "strengths": ["text"], "recommendations": ["text"]}` 
          },
          { 
            role: 'user', 
            content: `Analyze this assignment for equity concerns with SPECIFIC, ACTIONABLE insights:

Context: ${contextPrompt}

Assignment: "${assignmentText}"

Provide comprehensive analysis with:
- SPECIFIC barriers (not general statements)
- EXACT impact on particular student populations
- CONCRETE, implementable suggestions
- Real research citations with direct article links (prefer DOI links)

Return ONLY valid JSON, no markdown formatting, no explanations.` 
          }
        ],
        temperature: 0.7,
        max_tokens: 2000
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('OpenRouter API Error:', errorData);
      return res.status(response.status).json({ 
        error: errorData.error?.message || `API Error: ${response.status}` 
      });
    }

    const data = await response.json();
    res.json(data);

  } catch (error) {
    console.error('Server error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.listen(PORT, () => {
  console.log(`Backend server running on port ${PORT}`);
});
