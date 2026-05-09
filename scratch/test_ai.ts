import { google } from '@ai-sdk/google';
import { generateText } from 'ai';

async function test() {
  try {
    const { text } = await generateText({
      model: google('gemini-2.0-flash'),
      prompt: 'Say hello!',
    });
    console.log('AI Response:', text);
  } catch (error) {
    console.error('AI Error:', error);
  }
}

test();
