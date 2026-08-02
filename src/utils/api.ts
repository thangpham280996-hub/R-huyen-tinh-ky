// src/utils/api.ts
// Helper gọi API dùng chung cho cả GGStudio/local (Express server.ts)
// và Netlify (Netlify Functions qua redirect trong netlify.toml).

export async function callApi(endpoint: string, data: any) {
  const url = `/api/${endpoint}`;

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  const text = await response.text();

  // Kiểm tra nếu trả về HTML (lỗi redirect)
  if (text.trim().startsWith("<!DOCTYPE") || text.trim().startsWith("<html")) {
    throw new Error(
      `API "${endpoint}" trả về HTML thay vì JSON. Kiểm tra lại redirect "/api/${endpoint}" trong netlify.toml ` +
      `hoặc file netlify/functions/${endpoint}.ts đã được deploy chưa.`
    );
  }

  let parsed: any;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error(`API "${endpoint}" trả về dữ liệu không phải JSON hợp lệ: ${text.substring(0, 200)}`);
  }

  if (!response.ok) {
    throw new Error(parsed?.error || `API "${endpoint}" lỗi HTTP ${response.status}`);
  }

  // 👈 THÊM: chuẩn hóa Unicode cho field text nếu có
  if (parsed && typeof parsed.text === 'string') {
    parsed.text = parsed.text.normalize('NFC');
  }

  return parsed;
}