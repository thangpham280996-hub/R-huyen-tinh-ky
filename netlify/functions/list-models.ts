import type { Handler } from "@netlify/functions";

function isCatieCliKey(key: string): boolean {
  return key.startsWith("cat-");
}

function deriveModelsEndpoint(rawEndpoint: string): string {
  let ep = rawEndpoint.trim().replace(/\/+$/, "");
  if (ep.endsWith("/models")) return ep;
  if (ep.endsWith("/chat/completions")) return ep.replace(/\/chat\/completions$/, "/models");
  if (!/\/v\d+$/.test(ep)) {
    if (!ep.includes("/v1")) ep = ep + "/v1";
  }
  return ep + "/models";
}

export const handler: Handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: JSON.stringify({ error: "Method not allowed" }) };
  }

  try {
    const { customApiKey, provider, customEndpoint } = JSON.parse(event.body || "{}");

    if (!customApiKey || !customApiKey.trim()) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Cần nhập API Key trước khi lấy danh sách model." }),
      };
    }

    let chatEndpoint = customEndpoint?.trim() || "";
    if (!chatEndpoint) {
      if (provider === "catiecli" || isCatieCliKey(customApiKey)) {
        chatEndpoint = "https://catiecli.sukaka.top/v1/chat/completions";
      } else {
        chatEndpoint = "https://ag.beijixingxing.com/v1/chat/completions";
      }
    }
    const modelsEndpoint = deriveModelsEndpoint(chatEndpoint);

    const response = await fetch(modelsEndpoint, {
      method: "GET",
      headers: { Authorization: `Bearer ${customApiKey.trim()}` },
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => "");
      return {
        statusCode: response.status,
        body: JSON.stringify({
          error: `Không lấy được danh sách model (HTTP ${response.status}). ${errText.substring(0, 200)}`,
        }),
      };
    }

    const data = await response.json();
    let models: string[] = [];
    if (Array.isArray(data?.data)) {
      models = data.data.map((m: any) => m.id || m.name).filter(Boolean);
    } else if (Array.isArray(data?.models)) {
      models = data.models.map((m: any) => (typeof m === "string" ? m : m.id || m.name)).filter(Boolean);
    }

    if (models.length === 0) {
      return {
        statusCode: 502,
        body: JSON.stringify({ error: "Endpoint trả về nhưng không có model nào trong dữ liệu." }),
      };
    }

    return { statusCode: 200, body: JSON.stringify({ models, endpoint: modelsEndpoint }) };
  } catch (error: any) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message || "Lỗi không xác định khi lấy danh sách model." }),
    };
  }
};