import Anthropic from '@anthropic-ai/sdk';

export const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export const MODEL_RESEARCH = 'claude-sonnet-4-6';
export const MODEL_LIGHT = 'claude-haiku-4-5-20251001';

export const WEB_SEARCH_TOOL = { type: 'web_search_20250305', name: 'web_search', max_uses: 4 };

export function isInvalidToolError(err) {
  const msg = err && err.message ? String(err.message) : '';
  return /web_search|invalid.*tool|unsupported|unknown.*tool/i.test(msg) &&
         /400|invalid_request_error/i.test(msg);
}

export function parseStrictJson(response) {
  const text = response.content.map(b => b.text || '').join('');
  const cleaned = text.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim();
  try {
    return JSON.parse(cleaned);
  } catch (err) {
    const stopReason = response.stop_reason || 'unknown';
    const len = cleaned.length;
    const tail = cleaned.slice(Math.max(0, len - 300));
    console.error(`JSON parse failed. stop_reason=${stopReason} length=${len}. Last 300 chars:\n${tail}`);
    if (stopReason === 'max_tokens') {
      throw new Error(`Output hit max_tokens cap (${len} chars). Raise max_tokens or constrain the schema.`);
    }
    throw new Error(`Model returned invalid JSON (stop_reason=${stopReason}, ${len} chars). Likely an unescaped quote or stray character. Original parse error: ${err.message}`);
  }
}

// Single-request web-grounded JSON.
//
// web_search_20250305 is a SERVER-side tool: Anthropic runs the searches inside
// one messages.create request and the model returns its final answer in the same
// response. So there is no client-side tool loop and no separate synthesis turn —
// just one request (plus pause_turn continuations for long turns). This is what
// keeps each call well under the Vercel 60s cap.
//
// - model:          caller-chosen (Sonnet for heavy work, Haiku for light)
// - system:         system prompt
// - userMessage:    research brief / field list
// - instruction:    appended to the user turn — "after searching, output ONLY this JSON ..."
// - maxTokens:      output cap (small: these JSON payloads are short)
// - maxContinuations: how many pause_turn continuations to allow
//
// Returns the parsed JSON object.
export async function runGroundedJson({
  model = MODEL_RESEARCH,
  system,
  userMessage,
  instruction,
  maxTokens = 3000,
  maxContinuations = 3,
  searchMaxUses
}) {
  const messages = [{
    role: 'user',
    content: `${userMessage}\n\n${instruction}`
  }];

  const searchTool = { ...WEB_SEARCH_TOOL, max_uses: searchMaxUses ?? WEB_SEARCH_TOOL.max_uses };
  let useWebSearch = true;

  for (let attempt = 0; attempt <= maxContinuations; attempt++) {
    const t = Date.now();
    let response;
    try {
      response = await client.messages.create({
        model,
        max_tokens: maxTokens,
        thinking: { type: 'disabled' },
        output_config: { effort: 'low' },
        system,
        tools: useWebSearch ? [searchTool] : [],
        messages
      });
    } catch (err) {
      if (useWebSearch && isInvalidToolError(err)) {
        console.warn('web_search rejected — retrying once without tools:', err.message);
        useWebSearch = false;
        continue;
      }
      throw err;
    }
    console.log(`[research-core] ${model} turn ${attempt + 1} took ${Date.now() - t}ms (stop_reason=${response.stop_reason})`);

    if (response.stop_reason === 'pause_turn') {
      messages.push({ role: 'assistant', content: response.content });
      continue;
    }

    return parseStrictJson(response);
  }

  throw new Error(`runGroundedJson exhausted ${maxContinuations} continuations without a final answer`);
}
