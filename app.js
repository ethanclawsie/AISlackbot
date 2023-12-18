const { App } = require("@slack/bolt");
const { TextServiceClient } = require("@google-ai/generativelanguage");
const { GoogleAuth } = require("google-auth-library");

const MODEL_NAME = "models/text-bison-001";
const API_KEY = "Insert Key Here";

const client = new TextServiceClient({
  authClient: new GoogleAuth().fromAPIKey(API_KEY),
});

const app = new App({
  token: "App Token Here",
  signingSecret: "Signing Secret Here",
});

let lastRespondedTimestamp = "";

async function fetchAndRespondWithLatestMessage(channelId) {
  try {
    const result = await app.client.conversations.history({
      channel: channelId,
      limit: 1,
    });

    if (result.messages && result.messages.length > 0) {
      const latestMessage = result.messages[0];
      const promptString = latestMessage.text;

      const botUserId = "Bot User Id Here";

      // Check for yapbot keyword
      if (
        latestMessage.user !== botUserId &&
        latestMessage.ts !== lastRespondedTimestamp &&
        promptString.toLowerCase().includes("Slackbot")
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
    }
  } catch (error) {
    console.error(error);
  }
}

(async () => {
  await app.start(process.env.PORT || 3000);
  console.log("⚡️ Bolt app is running!");
  setInterval(() => fetchAndRespondWithLatestMessage("Channel Id Here"), 5000);
})();
