require('dotenv').config();
const { getOpenAIForHunyuan } = require('../src/utils/openai-hunyuan');

(async () => {
  try {
    const openai = getOpenAIForHunyuan();
    const res = await openai.chat.completions.create({
      model: 'hunyuan-turbos-latest',
      messages: [
        { role: 'user', content: 'Hello from Hunyuan OpenAI-compatible API' },
      ],
      temperature: 0.2,
      max_tokens: 50,
    });
    console.log('Output:', res.choices?.[0]?.message?.content);
  } catch (e) {
    console.error('Test failed:', e);
    process.exit(1);
  }
})();
