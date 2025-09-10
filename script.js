import express from "express";
import cors from "cors";
import OpenAI from "openai";
import dotenv from "dotenv";
dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// store conversations in memory (per session / per user)
// in production, you'd store this in a DB with user IDs
let conversationHistory = {};

app.post("/chat", async (req, res) => {
  try {
    const { message, userId } = req.body;

    // create new conversation if not exists
    if (!conversationHistory[userId]) {
      conversationHistory[userId] = [
        {
          role: "system",
          content: "Give a very short answer for VIP Payamat, a 25-year-old Islamic matrimony site.",
        },
      ];
    }

    // add user message
    conversationHistory[userId].push({ role: "user", content: message });

    // send chat completion
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: conversationHistory[userId],
      max_tokens: 70, // limit cost
    });

    const botReply = response.choices[0].message.content;

    // add bot response to history
    conversationHistory[userId].push({ role: "assistant", content: botReply });

    res.json({ reply: botReply });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Something went wrong" });
  }
});

app.listen(5000, () => console.log("Server running on port 5000"));
