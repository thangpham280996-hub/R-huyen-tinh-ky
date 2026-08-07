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

// ─── FIX VIETNAMESE TEXT ────────────────────────────────────────────────────
function fixVietnameseText(text: string): string {
  if (!text) return text;

  const strayToCombining: Record<string, string> = {
    '\u0060': '\u0300',
    '\u00B4': '\u0301',
    '\u02C6': '\u0302',
    '\u02DC': '\u0303',
    '\u02D9': '\u0323',
  };

  let fixed = text;
  fixed = fixed.replace(/[\u0060\u00B4\u02C6\u02DC\u02D9]/g, (m) => strayToCombining[m] || '');
  fixed = fixed.normalize('NFC');
  fixed = fixed.replace(/[\u0300-\u036f]/g, '');

  return fixed;
}

// ─── HELPER: Parse data URL ────────────────────────────────────────────────
function parseDataUrl(dataUrl: string): { mimeType: string; data: string } | null {
  const match = dataUrl.match(/^data:(image\/\w+);base64,(.+)$/);
  if (!match) return null;
  return { mimeType: match[1], data: match[2] };
}

// ─── HELPER: Danh sách model hỗ trợ vision ────────────────────────────────
const VISION_MODELS = [
  'gemini-2.5-flash',
  'gemini-2.5-pro',
  'gemini-3-flash-preview',
  'gemini-3-pro-preview',
  'claude-sonnet-4-5',
  'claude-opus-4-6',
];

function isVisionModel(model: string): boolean {
  const normalize = (s: string) => s.toLowerCase().replace(/-/g, '');
  return VISION_MODELS.some(vm => normalize(model).includes(normalize(vm)));
}

// ─── HELPER: Lấy danh sách model mặc định ──────────────────────────────────
function getDefaultModels(isCatieCli: boolean): string[] {
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
  return isCatieCli ? CATIECLI_MODELS : AG_MODELS;
}

export const handler: Handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { 
      statusCode: 405, 
      body: JSON.stringify({ error: "Method not allowed" }) 
    };
  }

  try {
    const {
      prompt,
      systemInstruction,
      customApiKey,
      provider,
      customEndpoint,
      customModel,
      image,
    } = JSON.parse(event.body || "{}");

    // Xác định API Key
    let apiKey = process.env.GEMINI_API_KEY || "";
    if (customApiKey && customApiKey.trim() !== "") {
      apiKey = customApiKey.trim();
    }

    if (!apiKey) {
      return {
        statusCode: 400,
        body: JSON.stringify({ 
          error: "Chưa cấu hình API Key. Hãy thêm key tại Trang chủ." 
        }),
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
      const isCatieCli = provider === "catiecli" || isCatieCliKey(apiKey);
      
      if (!endpoint) {
        if (isCatieCli) {
          endpoint = "https://catiecli.sukaka.top/v1/chat/completions";
        } else {
          endpoint = "https://ag.beijixingxing.com/v1/chat/completions";
        }
      }

      const isCatieCliEndpoint = endpoint.includes("catiecli.sukaka.top");
      const DEFAULT_MODELS = getDefaultModels(isCatieCliEndpoint);

      // Nếu có ảnh, ép dùng model hỗ trợ vision
      let selectedModel = customModel?.trim() || DEFAULT_MODELS[0];
      if (image && !isVisionModel(selectedModel)) {
        selectedModel = "gemini-2.5-flash";
      }

      const messages: { role: string; content: any }[] = [];
      if (fullInstruction) {
        messages.push({ role: "system", content: fullInstruction });
      }

      const userContent = Array.isArray(prompt)
        ? prompt.map((p: any) => (typeof p === "string" ? p : p.text || "")).join("\n")
        : String(prompt);

      if (image) {
        messages.push({
          role: "user",
          content: [
            { type: "text", text: userContent },
            { type: "image_url", image_url: { url: image } },
          ],
        });
      } else {
        messages.push({ role: "user", content: userContent });
      }

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: selectedModel,
          messages,
          max_tokens: 16000,
          temperature: 0.9,
          stream: false,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const text = data?.choices?.[0]?.message?.content || data?.choices?.[0]?.text || "";
        if (text) {
          return { 
            statusCode: 200, 
            body: JSON.stringify({ 
              text: fixVietnameseText(text), 
              model_used: selectedModel 
            }) 
          };
        }
      }

      const errText = await response.text().catch(() => "");
      return {
        statusCode: response.status,
        body: JSON.stringify({
          error: `Model ${selectedModel}: HTTP ${response.status}. ${errText.substring(0, 200)}`,
        }),
      };
    }

    // --- NHÁNH 2: Gemini SDK ---
    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: { headers: { "User-Agent": "aistudio-build" } },
    });

    let geminiContents: any = prompt;

    if (image) {
      const parsed = parseDataUrl(image);
      if (parsed) {
        geminiContents = [
          {
            role: "user",
            parts: [
              { text: String(prompt) },
              { inlineData: { mimeType: parsed.mimeType, data: parsed.data } },
            ],
          },
        ];
      }
    }

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: geminiContents,
      config: {
        systemInstruction: fullInstruction,
        temperature: 0.9,
        safetySettings: [
          { 
            category: "HARM_CATEGORY_SEXUALLY_EXPLICIT" as any, 
            threshold: "BLOCK_NONE" as any 
          },
          { 
            category: "HARM_CATEGORY_HARASSMENT" as any, 
            threshold: "BLOCK_NONE" as any 
          },
          { 
            category: "HARM_CATEGORY_HATE_SPEECH" as any, 
            threshold: "BLOCK_NONE" as any 
          },
          { 
            category: "HARM_CATEGORY_DANGEROUS_CONTENT" as any, 
            threshold: "BLOCK_NONE" as any 
          },
        ],
      },
    });

    const text = response.text || "";
    return { 
      statusCode: 200, 
      body: JSON.stringify({ text: fixVietnameseText(text) }) 
    };
    
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