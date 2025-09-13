// server.js
import express from "express";
import fetch from "node-fetch";

const app = express();
app.use(express.json());

// --- утилита для единообразных ответов ---
function sendJson(res, code, payload) {
  res.status(code).json(payload);
}

// health-check
app.get("/health", (_req, res) => sendJson(res, 200, { ok: true }));

// чат
app.post("/chat", async (req, res) => {
  const { history = [], systemPrompt = "", temperature = 0.7, model = "gpt-4o-mini" } = req.body || {};

  try {
    // собираем сообщения
    const messages = [];
    if (systemPrompt) messages.push({ role: "system", content: systemPrompt });
    for (const m of history) if (m?.role && m?.content) messages.push({ role: m.role, content: m.content });

    // базовая валидация
    if (!process.env.OPENAI_API_KEY) {
      return sendJson(res, 500, { ok: false, error: { message: "OPENAI_API_KEY не задан в переменных окружения" } });
    }
    if (!messages.length) {
      return sendJson(res, 400, { ok: false, error: { message: "Пустая история сообщений" } });
    }

    // запрос в OpenAI
    const r = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({ model, messages, temperature }),
    });

    const data = await r.json().catch(() => ({}));

    // если OpenAI вернул ошибку в теле
    if (!r.ok || data?.error) {
      const errPayload = {
        ok: false,
        error: {
          status: r.status,
          type: data?.error?.type,
          code: data?.error?.code,
          message: data?.error?.message || `OpenAI returned HTTP ${r.status}`,
        },
      };
      // лог в консоль (видно в Render → Logs)
      console.error("[OPENAI_ERROR]", JSON.stringify(errPayload));
      return sendJson(res, r.status || 500, errPayload);
    }

    const text = data?.choices?.[0]?.message?.content?.trim();
    if (!text) {
      console.warn("[OPENAI_EMPTY_CHOICE]", JSON.stringify(data).slice(0, 500));
      return sendJson(res, 200, { ok: true, text: "Пустой ответ от модели" });
    }

    return sendJson(res, 200, { ok: true, text });
  } catch (e) {
    console.error("[SERVER_ERROR]", e);
    return sendJson(res, 500, { ok: false, error: { message: e.message || "Internal error" } });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on ${PORT}`));
