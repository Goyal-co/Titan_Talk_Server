require('dotenv').config();
const { OpenAI } = require('openai');

async function testOpenAI() {
  try {
    console.log('Testing OpenAI API connection...');
    
    const openai = new OpenAI({ 
      apiKey: process.env.OPENAI_API_KEY 
    });

    // Test chat completion
    const chatResponse = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "user",
          content: "Say this is a test!"
        }
      ],
      max_tokens: 100,
    });

    console.log('✅ OpenAI Chat API Response:', chatResponse.choices[0].message);
    
    // Test transcription with a simple audio file if available
    // const audioResponse = await openai.audio.transcriptions.create({
    //   file: fs.createReadStream("test-audio.mp3"),
    //   model: "whisper-1"
    // });
    // console.log('✅ OpenAI Whisper Response:', audioResponse);
    
  } catch (error) {
    console.error('❌ Error testing OpenAI API:', error);
    if (error.response) {
      console.error('Error details:', error.response.data);
    }
  }
}

testOpenAI();
