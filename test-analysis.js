require('dotenv').config();
const { OpenAI } = require('openai');

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Test ChatGPT analysis directly
async function testChatGPTAnalysis() {
  const transcript = `Hi, this is Pratham from Goyal & Co. I'm calling to tell you about Orchid Platinum.
  It's located in Whitefield, close to Nexus Mall. We have 3 & 3.5 BHK options starting from ₹2.2 Cr.
  Possession is in 2028. Would you be interested in a site visit?
  
  Customer: That sounds interesting, but the price seems a bit high for our budget.
  
  Salesperson: I understand your concern about the price. Let me explain the value proposition. The location in Whitefield is prime real estate, and being near Nexus Mall adds convenience. Plus, we're offering flexible payment plans.
  
  Customer: What about 2 BHK options? We don't need such a large space.
  
  Salesperson: Currently we only have 3 & 3.5 BHK units available. However, the 3 BHK is quite reasonably sized and offers great value for the location.`;

  const analysisPrompt = `
You are an expert sales call analyst. Analyze the following sales call transcript and provide a comprehensive evaluation.

TRANSCRIPT:
${transcript}

Please analyze this sales call and provide:

1. OVERALL SCORE (0-100): Rate the sales performance
2. KEY STRENGTHS: What the salesperson did well
3. AREAS FOR IMPROVEMENT: What could be better
4. MISSED OPPORTUNITIES: Important selling points not mentioned
5. OBJECTION HANDLING: How well objections were addressed
6. CLOSING EFFECTIVENESS: Quality of closing attempts
7. CUSTOMER ENGAGEMENT: Level of customer interest and engagement
8. NEXT STEPS: Recommended follow-up actions

Format your response as a structured analysis with clear sections.

Focus on:
- Communication skills
- Product knowledge demonstration
- Needs assessment
- Objection handling
- Closing techniques
- Overall professionalism

Provide specific examples from the transcript to support your analysis.`;

  try {
    console.log('🔍 Testing ChatGPT Analysis...');
    console.log('📝 API Key configured:', !!process.env.OPENAI_API_KEY);
    
    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: "You are an expert sales trainer and call analyst with 20+ years of experience in sales coaching and performance evaluation."
        },
        {
          role: "user",
          content: analysisPrompt
        }
      ],
      max_tokens: 1500,
      temperature: 0.3,
    });

    const analysis = response.choices[0].message.content;
    console.log('✅ ChatGPT Analysis Result:');
    console.log('==========================================');
    console.log(analysis);
    console.log('==========================================');
    
    // Test score extraction
    const scoreMatch = analysis.match(/(?:OVERALL SCORE|SCORE)[:\s]*([0-9]+)/i);
    const extractedScore = scoreMatch ? parseInt(scoreMatch[1]) : 0;
    console.log('📊 Extracted Score:', extractedScore);
    
    // Test missed opportunities extraction
    const missedSection = analysis.match(/MISSED OPPORTUNITIES[:\s]*([\s\S]*?)(?=\n\d+\.|\n[A-Z]+:|$)/i);
    let missedCount = 0;
    if (missedSection) {
      const opportunities = missedSection[1].split('\n').filter(line => line.trim().length > 0);
      missedCount = opportunities.length;
    }
    console.log('📈 Missed Opportunities Count:', missedCount);
    
    // Test objection extraction
    const objectionMatch = analysis.match(/(?:OBJECTION|CONCERN)[:\s]*([^\n]+)/i);
    const topObjection = objectionMatch ? objectionMatch[1].trim() : "None identified";
    console.log('🎯 Top Objection:', topObjection);
    
  } catch (error) {
    console.error('❌ ChatGPT Analysis Error:', error.message);
    if (error.response) {
      console.error('API Response:', error.response.data);
    }
  }
}

// Run the test
testChatGPTAnalysis().catch(console.error);
