import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: "",
});

import bolt from "@slack/bolt";
const { App } = bolt;
import { TextServiceClient } from "@google-ai/generativelanguage";
import { GoogleAuth } from "google-auth-library";

const MODEL_NAME = "models/text-bison-001";

const client = new TextServiceClient({
  authClient: new GoogleAuth().fromAPIKey(
    ""
  ),
});

const app = new App({
  token: "",
  signingSecret: "",
});

let lastRespondedTimestamp = "";

async function generateImage(prompt) {
  try {
    const response = await openai.images.generate({
      model: "dall-e-3",
      prompt: prompt,
      n: 1,
      size: "512x512",
    });
    const imageUrl = response.data[0].url; 
    return imageUrl;
  } catch (error) {
    console.error("Error generating image with DALL-E:", error);
    return "https://via.placeholder.com/150?text=Error+Generating+Image";
  }
}

async function fetchAndRespondWithLatestMessage(channelId) {
  try {
    const result = await app.client.conversations.history({
      channel: channelId,
      limit: 1,
    });

    if (result.messages && result.messages.length > 0) {
      const latestMessage = result.messages[0];
      const promptString = latestMessage.text;

      const botUserId = ""; 

      if (
        latestMessage.user !== botUserId &&
        latestMessage.ts !== lastRespondedTimestamp &&
        promptString.toLowerCase().includes("textbot")
      ) {
        lastRespondedTimestamp = latestMessage.ts;

        const textResult = await client.generateText({
          model: MODEL_NAME,
          temperature: 0.6,
          maxOutputTokens: 256,
          prompt: {
            text: `Generate a response to: "${promptString}"`,
          },
        });

        const output = textResult[0].candidates[0].output;

        await app.client.chat.postMessage({
          channel: channelId,
          text: output,
        });
      }
      
      if (
        latestMessage.user !== botUserId &&
        latestMessage.ts !== lastRespondedTimestamp &&
        promptString.toLowerCase().includes("imagebot")
      ) {
        lastRespondedTimestamp = latestMessage.ts;

        const imageUrl = await generateImage(promptString);

        await app.client.chat.postMessage({
          channel: channelId,
          text: "Here's your generated image", 
          blocks: [
            {
              type: "image",
              title: {
                type: "plain_text",
                text: "Generated Image",
              },
              image_url: imageUrl,
              alt_text: "Generated Image",
            },
          ],
        });
      }
    }
  } catch (error) {
    console.error(error);
  }
}

(async () => {
  await app.start(process.env.PORT || 3000);
  console.log("⚡️ Bolt app is running!");
  setInterval(() => fetchAndRespondWithLatestMessage(""), 5000);
})();
