// src/utils/api.ts
// Helper gọi API dùng chung cho cả GGStudio/local (Express server.ts)
// và Netlify (Netlify Functions qua redirect trong netlify.toml).

// ─── Cấu hình retry ──────────────────────────────────────────────────────────
const RETRY_CONFIG = {
  maxRetries: 2,           // Tổng số lần thử lại tối đa (chưa tính lần đầu)
  baseDelay: 1500,         // Delay cơ bản (ms)
  maxDelay: 15000,         // Delay tối đa (ms)
  backoffMultiplier: 2,    // Hệ số nhân exponential backoff
};

// ─── Hàm kiểm tra lỗi có thể retry ──────────────────────────────────────────
function isRetryableError(error: any): boolean {
  const message = error?.message?.toLowerCase() || '';
  const status = error?.status || error?.response?.status || 0;

  // Các lỗi có thể retry:
  // - 429: Rate limit
  // - 500, 502, 503, 504: Server errors
  // - Network errors (không có status)
  // - Cold start (timeout/connection)
  // - "ECONNRESET", "ETIMEDOUT", "ENOTFOUND"
  // - Netlify trả về HTML (index.html fallback) thay vì JSON — thường xảy ra
  //   ở lần gọi đầu khi function chưa "ấm" (cold start), status vẫn là 200
  //   nên phải bắt riêng theo nội dung message, không dựa vào status.
  return (
    status === 429 ||
    status === 500 ||
    status === 502 ||
    status === 503 ||
    status === 504 ||
    status === 0 ||
    !status ||
    message.includes('timeout') ||
    message.includes('network') ||
    message.includes('connection') ||
    message.includes('econnreset') ||
    message.includes('etimedout') ||
    message.includes('enotfound') ||
    message.includes('fetch') ||
    message.includes('failed to fetch') ||
    message.includes('network error') ||
    message.includes('html thay vì json') ||
    message.includes('không phải json hợp lệ')
  );
}

// ─── Hàm retry với exponential backoff ──────────────────────────────────────
async function callApiWithRetry(
  endpoint: string,
  body: any,
  options?: {
    maxRetries?: number;
    baseDelay?: number;
    maxDelay?: number;
    backoffMultiplier?: number;
    retryCondition?: (error: any) => boolean;
  }
) {
  const {
    maxRetries = RETRY_CONFIG.maxRetries,
    baseDelay = RETRY_CONFIG.baseDelay,
    maxDelay = RETRY_CONFIG.maxDelay,
    backoffMultiplier = RETRY_CONFIG.backoffMultiplier,
    retryCondition = isRetryableError,
  } = options || {};

  let lastError: any;
  let attempt = 0;

  while (attempt <= maxRetries) {
    try {
      // Nếu là lần thử lại (attempt > 0), hiển thị log để debug
      if (attempt > 0) {
        console.warn(`🔁 Retry API "${endpoint}" lần ${attempt}/${maxRetries}...`);
      }

      const result = await callApi(endpoint, body);

      // Nếu thành công, log số lần thử (nếu có retry)
      if (attempt > 0) {
        console.log(`✅ API "${endpoint}" thành công sau ${attempt} lần thử lại`);
      }

      return result;
    } catch (err) {
      lastError = err;

      // Kiểm tra xem lỗi có retry được không
      if (!retryCondition(err) || attempt >= maxRetries) {
        break;
      }

      // Tính delay với exponential backoff + jitter
      const delay = Math.min(
        baseDelay * Math.pow(backoffMultiplier, attempt),
        maxDelay
      );
      // Thêm jitter ngẫu nhiên ±20% để tránh thundering herd
      const jitter = delay * (0.8 + 0.4 * Math.random());
      
      console.warn(
        `⏳ API "${endpoint}" lỗi (${err?.message || 'unknown'}), thử lại sau ${Math.round(jitter)}ms...`
      );

      await new Promise(resolve => setTimeout(resolve, jitter));
      attempt++;
    }
  }

  // Nếu hết số lần retry hoặc lỗi không retry được
  throw lastError;
}

// ─── Hàm gọi API chính (giữ nguyên interface cũ để tương thích ngược) ──────
export async function callApi(endpoint: string, data: any) {
  const url = `/api/${endpoint}`;

  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
  } catch (fetchError: any) {
    // Lỗi network (fetch failed) — ném ra với status 0 để retry xử lý
    const networkError = new Error(fetchError?.message || 'Network error');
    (networkError as any).status = 0;
    throw networkError;
  }

  const text = await response.text();

  // Kiểm tra nếu trả về HTML (lỗi redirect)
  if (text.trim().startsWith("<!DOCTYPE") || text.trim().startsWith("<html")) {
    const htmlError = new Error(
      `API "${endpoint}" trả về HTML thay vì JSON. Kiểm tra lại redirect "/api/${endpoint}" trong netlify.toml ` +
      `hoặc file netlify/functions/${endpoint}.ts đã được deploy chưa.`
    );
    (htmlError as any).status = response.status;
    throw htmlError;
  }

  let parsed: any;
  try {
    parsed = JSON.parse(text);
  } catch {
    const jsonError = new Error(
      `API "${endpoint}" trả về dữ liệu không phải JSON hợp lệ: ${text.substring(0, 200)}`
    );
    (jsonError as any).status = response.status;
    throw jsonError;
  }

  if (!response.ok) {
    const apiError = new Error(parsed?.error || `API "${endpoint}" lỗi HTTP ${response.status}`);
    (apiError as any).status = response.status;
    (apiError as any).response = parsed;
    throw apiError;
  }

  // Chuẩn hóa Unicode cho field text nếu có
  if (parsed && typeof parsed.text === 'string') {
    parsed.text = parsed.text.normalize('NFC');
  }

  return parsed;
}

// ─── EXPORT: callApiWithRetry (dùng cho các component cần retry) ──────────
export { callApiWithRetry };

// ─── FORMAT: Hàm tiện ích để parse lỗi API ─────────────────────────────────
export function getApiErrorMessage(error: any): string {
  if (error?.message) return error.message;
  if (typeof error === 'string') return error;
  return 'Lỗi không xác định khi gọi API';
}

// ─── FORMAT: Kiểm tra lỗi có phải do rate limit không ──────────────────────
export function isRateLimitError(error: any): boolean {
  return error?.status === 429 || error?.message?.toLowerCase()?.includes('rate limit');
}

// ─── FORMAT: Kiểm tra lỗi có phải do server không ──────────────────────────
export function isServerError(error: any): boolean {
  const status = error?.status || 0;
  return status >= 500 && status < 600;
}