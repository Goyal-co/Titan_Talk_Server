require('dotenv').config();
const { OpenAI } = require('openai');

console.log('🔍 Testing OpenAI API Connection...');
console.log('📝 API Key exists:', !!process.env.OPENAI_API_KEY);
console.log('📝 API Key length:', process.env.OPENAI_API_KEY?.length || 0);

const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY 
});

async function testSimpleAPI() {
  try {
    console.log('🚀 Making simple API call...');
    
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo", // Use cheaper model for testing
      messages: [
        {
          role: "user",
          content: "Rate this sales call on a scale of 1-100: 'Hello, I'm calling about our new product. It costs $100. Are you interested?' Customer: 'Sounds good, I'll take it.'"
        }
      ],
      max_tokens: 100,
      temperature: 0.3,
    });

    console.log('✅ API Response received!');
    console.log('📄 Response:', response.choices[0].message.content);
    
    // Test score extraction
    const content = response.choices[0].message.content;
    const scoreMatch = content.match(/(\d+)/);
    const score = scoreMatch ? parseInt(scoreMatch[1]) : 0;
    console.log('📊 Extracted Score:', score);
    
  } catch (error) {
    console.error('❌ API Error:', error.message);
    console.error('❌ Error Code:', error.code);
    console.error('❌ Error Type:', error.type);
  }
}

testSimpleAPI();
