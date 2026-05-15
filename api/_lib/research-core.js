import Anthropic from '@anthropic-ai/sdk';

export const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export const MODEL_RESEARCH = 'claude-sonnet-4-6';

export const WEB_SEARCH_TOOL = { type: 'web_search_20250305', name: 'web_search', max_uses: 5 };

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

// Runs a web_search-grounded research loop, then forces a no-tool JSON synthesis turn.
// - system: system prompt used for every turn
// - userMessage: the initial user message (research brief + field list)
// - synthesisMessage: appended after the loop to force the final JSON answer
// - maxRounds: number of tool-use rounds the model may take before synthesis
// Returns the parsed JSON object from the synthesis turn.
export async function runSearchLoop({ system, userMessage, synthesisMessage, maxRounds = 2, synthMaxTokens = 4096 }) {
  const messages = [{ role: 'user', content: userMessage }];
  let useWebSearch = true;

  for (let turn = 0; turn < maxRounds; turn++) {
    const t = Date.now();
    const tools = useWebSearch ? [WEB_SEARCH_TOOL] : [];

    let response;
    try {
      response = await client.messages.create({
        model: MODEL_RESEARCH,
        max_tokens: 4096,
        thinking: { type: 'disabled' },
        output_config: { effort: 'low' },
        system,
        tools,
        messages
      });
    } catch (err) {
      if (useWebSearch && isInvalidToolError(err)) {
        console.warn('web_search rejected — degrading to no-tool synthesis:', err.message);
        useWebSearch = false;
        break;
      }
      throw err;
    }
    console.log(`[research-core] turn ${turn + 1} took ${Date.now() - t}ms (stop_reason=${response.stop_reason})`);

    if (response.stop_reason === 'pause_turn') {
      messages.push({ role: 'assistant', content: response.content });
      continue;
    }

    const toolUses = response.content.filter(b => b.type === 'tool_use');
    messages.push({ role: 'assistant', content: response.content });
    if (toolUses.length === 0) break;
    // web_search is a server tool: results are injected by the API; just continue the loop.
  }

  messages.push({ role: 'user', content: synthesisMessage });

  const tSynth = Date.now();
  const synthResponse = await client.messages.create({
    model: MODEL_RESEARCH,
    max_tokens: synthMaxTokens,
    thinking: { type: 'adaptive' },
    output_config: { effort: 'medium' },
    system,
    messages
  });
  console.log(`[research-core] synthesis took ${Date.now() - tSynth}ms (stop_reason=${synthResponse.stop_reason})`);

  return parseStrictJson(synthResponse);
}
