import express from "express";
import fetch from "node-fetch";

const app = express();
app.use(express.json());

// Тестовый эндпоинт
app.get("/health", (req, res) => {
  res.json({ ok: true });
});

// Чат с ИИ
app.post("/chat", async (req, res) => {
  const { history = [], systemPrompt = "" } = req.body;

  try {
    const messages = [];
    if (systemPrompt) messages.push({ role: "system", content: systemPrompt });
    for (const m of history) {
      if (m?.role && m?.content) messages.push(m);
    }

    const r = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages,
        temperature: 0.7,
      }),
    });

    const data = await r.json();
    const text = data?.choices?.[0]?.message?.content || "Ошибка";

    res.json({ ok: true, text });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on ${PORT}`));
