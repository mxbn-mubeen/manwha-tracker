/**
 * Bot API HTTP helpers.
 * All outbound Telegram messages go through sendText (plain, safe for any
 * content) or sendHtml (HTML parse_mode, caller must escapeHtml all dynamic parts).
 */

const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
if (!TOKEN) {
  console.warn('[bot] TELEGRAM_BOT_TOKEN is not set. Bot features will be disabled.');
}

export const API = TOKEN ? `https://api.telegram.org/bot${TOKEN}` : '';

import https from 'https';

export async function apiCall<T = any>(
  method: string,
  body?: Record<string, unknown>,
  signal?: AbortSignal,
): Promise<T> {
  return new Promise((resolve, reject) => {
    // If we're already shutting down, don't even open the socket.
    if (signal?.aborted) {
      reject(new Error('Aborted'));
      return;
    }

    const data = body ? JSON.stringify(body) : '';
    const url = new URL(`${API}/${method}`);
    
    const req = https.request(url, {
      method: body ? 'POST' : 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(body ? { 'Content-Length': Buffer.byteLength(data) } : {}),
      },
    }, (res) => {
      let chunks = '';
      res.on('data', (chunk) => { chunks += chunk; });
      res.on('end', () => {
        try {
          const json = JSON.parse(chunks) as { ok: boolean; result: T; description?: string };
          if (!json.ok) {
            reject(new Error(`Bot API error in ${method}: ${json.description}`));
          } else {
            resolve(json.result);
          }
        } catch (err) {
          reject(new Error(`Failed to parse response in ${method}: ${err instanceof Error ? err.message : String(err)}`));
        }
      });
    });

    req.on('error', (err) => {
      reject(new Error(`Network error in ${method}: ${err.message}`));
    });

    // 35s timeout on the socket itself (Bot API long-polling uses 30s)
    req.setTimeout(35000, () => {
      req.destroy();
      reject(new Error(`Timeout in ${method}`));
    });

    // Let callers (e.g. the poll loop on SIGTERM) cut a long-poll getUpdates
    // request short instead of waiting out the full 30s timeout.
    const onAbort = () => {
      req.destroy();
      reject(new Error('Aborted'));
    };
    signal?.addEventListener('abort', onAbort, { once: true });
    req.on('close', () => signal?.removeEventListener('abort', onAbort));

    if (body) {
      req.write(data);
    }
    req.end();
  });
}

/** Plain text — no parse_mode. Safe for any content including user-provided strings. */
export async function sendText(chatId: number | string, text: string) {
  return apiCall('sendMessage', {
    chat_id: chatId,
    text,
    link_preview_options: { is_disabled: true },
  });
}

/**
 * HTML-formatted message. Only call with strings whose dynamic parts have
 * been passed through escapeHtml() — caller is responsible.
 */
export async function sendHtml(chatId: number | string, html: string) {
  return apiCall('sendMessage', {
    chat_id: chatId,
    text: html,
    parse_mode: 'HTML',
    link_preview_options: { is_disabled: true },
  });
}

/** Escape user-provided content for insertion into HTML messages. */
export function escapeHtml(s: string): string {
  if (s == null) return '';
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** Split at line boundaries — never in the middle of a word or HTML tag. */
export function splitSafe(text: string, maxLen: number): string[] {
  if (text.length <= maxLen) return [text];
  const chunks: string[] = [];
  const lines = text.split('\n');
  let current = '';
  for (const line of lines) {
    const candidate = current ? current + '\n' + line : line;
    if (candidate.length > maxLen) {
      if (current) chunks.push(current);
      current = '';
      for (let i = 0; i < line.length; i += maxLen) {
        chunks.push(line.slice(i, i + maxLen));
      }
    } else {
      current = candidate;
    }
  }
  if (current) chunks.push(current);
  return chunks.length > 0 ? chunks : [text];
}

export function sleep(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms));
}
