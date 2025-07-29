const { OpenAI } = require("openai");
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function analyzeTranscript(transcript, pros = [], objections = []) {
  const prompt = `
Analyze the following sales call transcript:
1. Give a pitch score (0–10).
2. Identify any 1–2 missed USPs from this list: ${pros.join(", ") || "None"}
3. What was the customer's top objection (from: ${objections.join(", ") || "None"})?

Transcript:
${transcript}
`;

  try {
    const gptRes = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [{ role: "user", content: prompt }],
    });

    return gptRes.choices[0].message.content;
  } catch (err) {
    console.error("Transcript AI Error:", err);
    return null;
  }
}

module.exports = { analyzeTranscript };
