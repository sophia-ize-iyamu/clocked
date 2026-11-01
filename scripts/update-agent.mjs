// Pushes the current prompt from agent-config.mjs to the existing agent, keeping its tool attached.
// Run: node --env-file=<env file> scripts/update-agent.mjs
import { PROMPT } from "./agent-config.mjs";

const { ELEVENLABS_API_KEY: KEY, ELEVENLABS_AGENT_ID: AGENT } = process.env;
const url = `https://api.elevenlabs.io/v1/convai/agents/${AGENT}`;
const current = await (await fetch(url, { headers: { "xi-api-key": KEY } })).json();
const toolIds = current.conversation_config?.agent?.prompt?.tool_ids ?? [];
const r = await fetch(url, {
  method: "PATCH",
  headers: { "xi-api-key": KEY, "Content-Type": "application/json" },
  body: JSON.stringify({ conversation_config: { agent: { prompt: { prompt: PROMPT, tool_ids: toolIds } } } }),
});
const a = await r.json();
const p = a.conversation_config?.agent?.prompt ?? {};
console.log(r.status, "| tool_ids kept:", JSON.stringify(p.tool_ids), "| verdict cue in prompt:", (p.prompt ?? "").includes("[VERDICT]"));
