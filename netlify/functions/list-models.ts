import type { Handler } from "@netlify/functions";

// ─── HELPER: Kiểm tra key CatieCli ────────────────────────────────────────
function isCatieCliKey(key: string): boolean {
  return key.startsWith("cat-");
}

// ─── HELPER: Tạo endpoint models từ chat endpoint ────────────────────────
function deriveModelsEndpoint(rawEndpoint: string): string {
  let ep = rawEndpoint.trim().replace(/\/+$/, "");
  
  // Nếu đã là /models thì giữ nguyên
  if (ep.endsWith("/models")) return ep;
  
  // Nếu là /chat/completions thì đổi thành /models
  if (ep.endsWith("/chat/completions")) {
    return ep.replace(/\/chat\/completions$/, "/models");
  }
  
  // Thêm /v1 nếu chưa có
  if (!/\/v\d+$/.test(ep)) {
    if (!ep.includes("/v1")) ep = ep + "/v1";
  }
  
  return ep + "/models";
}

// ─── HELPER: Lấy endpoint mặc định ────────────────────────────────────────
function getDefaultEndpoint(apiKey: string, provider?: string): string {
  if (provider === "catiecli" || isCatieCliKey(apiKey)) {
    return "https://catiecli.sukaka.top/v1/chat/completions";
  }
  return "https://ag.beijixingxing.com/v1/chat/completions";
}

// ─── HELPER: Parse models từ response ────────────────────────────────────
function parseModels(data: any): string[] {
  if (Array.isArray(data?.data)) {
    return data.data.map((m: any) => m.id || m.name).filter(Boolean);
  }
  
  if (Array.isArray(data?.models)) {
    return data.models
      .map((m: any) => (typeof m === "string" ? m : m.id || m.name))
      .filter(Boolean);
  }
  
  return [];
}

export const handler: Handler = async (event) => {
  // ─── METHOD CHECK ──────────────────────────────────────────────────────
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: "Method not allowed" }),
    };
  }

  try {
    // ─── PARSE REQUEST ──────────────────────────────────────────────────
    const { customApiKey, provider, customEndpoint } = JSON.parse(event.body || "{}");

    // ─── VALIDATE API KEY ──────────────────────────────────────────────
    if (!customApiKey || !customApiKey.trim()) {
      return {
        statusCode: 400,
        body: JSON.stringify({ 
          error: "Cần nhập API Key trước khi lấy danh sách model." 
        }),
      };
    }

    // ─── BUILD ENDPOINT ─────────────────────────────────────────────────
    let chatEndpoint = customEndpoint?.trim() || "";
    if (!chatEndpoint) {
      chatEndpoint = getDefaultEndpoint(customApiKey, provider);
    }
    
    const modelsEndpoint = deriveModelsEndpoint(chatEndpoint);

    // ─── FETCH MODELS ──────────────────────────────────────────────────
    const response = await fetch(modelsEndpoint, {
      method: "GET",
      headers: { 
        Authorization: `Bearer ${customApiKey.trim()}`,
        "Content-Type": "application/json",
      },
    });

    // ─── HANDLE ERROR RESPONSE ─────────────────────────────────────────
    if (!response.ok) {
      const errText = await response.text().catch(() => "");
      return {
        statusCode: response.status,
        body: JSON.stringify({
          error: `Không lấy được danh sách model (HTTP ${response.status}). ${errText.substring(0, 200)}`,
        }),
      };
    }

    // ─── PARSE RESPONSE ─────────────────────────────────────────────────
    const data = await response.json();
    const models = parseModels(data);

    // ─── VALIDATE MODELS ────────────────────────────────────────────────
    if (models.length === 0) {
      return {
        statusCode: 502,
        body: JSON.stringify({ 
          error: "Endpoint trả về nhưng không có model nào trong dữ liệu." 
        }),
      };
    }

    // ─── SUCCESS RESPONSE ──────────────────────────────────────────────
    return { 
      statusCode: 200, 
      body: JSON.stringify({ 
        models, 
        endpoint: modelsEndpoint 
      }) 
    };
    
  } catch (error: any) {
    console.error("List Models Error:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        error: error.message || "Lỗi không xác định khi lấy danh sách model." 
      }),
    };
  }
};