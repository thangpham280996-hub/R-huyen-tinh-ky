import type { Handler } from "@netlify/functions";
import { GoogleGenAI } from "@google/genai";

function isAntigravityKey(key: string): boolean {
  return key.startsWith("ag-") || key.startsWith("sk-ag") || key.startsWith("sk-");
}

function isCatieCliKey(key: string): boolean {
  return key.startsWith("cat-");
}

function isOpenAICompatible(provider: string): boolean {
  return (
    provider === "openai" ||
    provider === "claude" ||
    provider === "grok" ||
    provider === "antigravity" ||
    provider === "catiecli"
  );
}

export const handler: Handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: JSON.stringify({ error: "Method not allowed" }) };
  }

  try {
    const {
      prompt,
      systemInstruction,
      customApiKey,
      provider,
      customEndpoint,
      customModel,
    } = JSON.parse(event.body || "{}");

    // Xác định API Key
    let apiKey = process.env.GEMINI_API_KEY || "";
    if (customApiKey && customApiKey.trim() !== "") {
      apiKey = customApiKey.trim();
    }

    if (!apiKey) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Chưa cấu hình API Key. Hãy thêm key tại Trang chủ." }),
      };
    }

    const fullInstruction = systemInstruction || "";

    // --- NHÁNH 1: OpenAI-compatible ---
    const useOpenAICompat =
      isOpenAICompatible(provider) ||
      isAntigravityKey(apiKey) ||
      isCatieCliKey(apiKey) ||
      (customEndpoint && customEndpoint.trim() !== "");

    if (useOpenAICompat) {
      let endpoint = customEndpoint?.trim() || "";
      if (!endpoint) {
        if (provider === "catiecli" || isCatieCliKey(apiKey)) {
          endpoint = "https://catiecli.sukaka.top/v1/chat/completions";
        } else {
          endpoint = "https://ag.beijixingxing.com/v1/chat/completions";
        }
      }

      const isCatieCliEndpoint = endpoint.includes("catiecli.sukaka.top");

      const CATIECLI_MODELS = ["gemini-3-flash-preview", "gemini-3.1-pro-preview"];
      const AG_MODELS = [
        "gemini-3-flash-preview",
        "gemini-3-pro-preview",
        "gemini-3-pro-low",
        "gemini-3-pro-high",
        "gemini-3.1-pro-low",
        "gemini-3.1-pro-high",
        "gemini-2.5-flash",
        "gemini-2.5-pro",
        "claude-sonnet-4-5",
        "claude-opus-4-6",
      ];
      const DEFAULT_MODELS = isCatieCliEndpoint ? CATIECLI_MODELS : AG_MODELS;

      const messages: { role: string; content: string }[] = [];
      if (fullInstruction) {
        messages.push({ role: "system", content: fullInstruction });
      }
      const userContent = Array.isArray(prompt)
        ? prompt.map((p: any) => (typeof p === "string" ? p : p.text || "")).join("\n")
        : String(prompt);
      messages.push({ role: "user", content: userContent });

      // 👈 Chỉ thử 1 model duy nhất, không vòng lặp
      const model = customModel?.trim() || DEFAULT_MODELS[0];

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages,
          max_tokens: 16000, // 👈 Tăng từ 8192 lên 16000
          temperature: 0.9,
          stream: false,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const text = data?.choices?.[0]?.message?.content || data?.choices?.[0]?.text || "";
        if (text) {
          return { statusCode: 200, body: JSON.stringify({ text, model_used: model }) };
        }
      }

      const errText = await response.text().catch(() => "");
      return {
        statusCode: response.status,
        body: JSON.stringify({
          error: `Model ${model}: HTTP ${response.status}. ${errText.substring(0, 200)}`,
        }),
      };
    }

    // --- NHÁNH 2: Gemini SDK ---
    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: { headers: { "User-Agent": "aistudio-build" } },
    });

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        systemInstruction: fullInstruction,
        temperature: 0.9,
        safetySettings: [
          { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT" as any, threshold: "BLOCK_NONE" as any },
          { category: "HARM_CATEGORY_HARASSMENT" as any, threshold: "BLOCK_NONE" as any },
          { category: "HARM_CATEGORY_HATE_SPEECH" as any, threshold: "BLOCK_NONE" as any },
          { category: "HARM_CATEGORY_DANGEROUS_CONTENT" as any, threshold: "BLOCK_NONE" as any },
        ],
      },
    });

    const text = response.text || "";
    return { statusCode: 200, body: JSON.stringify({ text }) };
  } catch (error: any) {
    console.error("API Error:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: error.message || "Lỗi không xác định khi gọi AI. Vui lòng kiểm tra lại API Key hoặc quota.",
      }),
    };
  }
};