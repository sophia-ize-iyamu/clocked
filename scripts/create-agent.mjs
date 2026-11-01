// Creates the Clocked interviewer: the update_meter client tool, then the agent that uses it.
// Run: npm run create-agent (reads ELEVENLABS_API_KEY). Prints the new agent ID and, if the
// local env file exists with an empty ELEVENLABS_AGENT_ID line, fills that line in.
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { PROMPT, TOOL } from "./agent-config.mjs";

const KEY = process.env.ELEVENLABS_API_KEY;
const ENV_FILE =
  process.env.ENV_FILE ??
  fileURLToPath(new URL("../../../../Activities/Events/LarpHacks/clocked.env", import.meta.url));
const API = "https://api.elevenlabs.io/v1/convai";

if (!KEY) {
  console.error("ELEVENLABS_API_KEY is empty. Add it to the env file first.");
  process.exit(1);
}


async function call(path, body) {
  const r = await fetch(`${API}${path}`, {
    method: "POST",
    headers: { "xi-api-key": KEY, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(`${path} returned ${r.status}: ${JSON.stringify(json.detail ?? json).slice(0, 800)}`);
  return json;
}

const prompt = { prompt: PROMPT };
try {
  const tool = await call("/tools", { tool_config: TOOL });
  prompt.tool_ids = [tool.id];
  console.log(`tool created: ${tool.id}`);
} catch (err) {
  console.log(`Tools API failed, attaching the tool inline instead. ${err.message}`);
  prompt.tools = [TOOL];
}

const agent = await call("/agents/create", {
  name: "Clocked panel",
  conversation_config: {
    agent: {
      first_message: "{{role_title}}, is it? Walk me through your last day on the job.",
      language: "en",
      prompt,
      dynamic_variables: {
        dynamic_variable_placeholders: { role: "neurosurgeon", role_title: "Neurosurgeon", posting: "none" },
      },
    },
    conversation: { max_duration_seconds: 75 },
  },
  platform_settings: {
    auth: { enable_auth: true },
    data_collection: {
      bluff_report: {
        type: "string",
        description:
          "A short report for the user on where they bluffed. Up to 3 moments, one per line. Format each line exactly as: - \"<short quote of what they said>\": <the tell that gave them away>. <One sentence on what an actual professional in the role would have said.> If they never bluffed, write one line on what made them convincing.",
      },
      bluff_count: {
        type: "integer",
        description: "How many of the user's answers were bluffs: vague, buzzword-heavy, wrong or evasive.",
      },
    },
  },
});

console.log(`ELEVENLABS_AGENT_ID=${agent.agent_id}`);
if (existsSync(ENV_FILE)) {
  const text = readFileSync(ENV_FILE, "utf8");
  if (/^ELEVENLABS_AGENT_ID=\s*$/m.test(text)) {
    writeFileSync(ENV_FILE, text.replace(/^ELEVENLABS_AGENT_ID=\s*$/m, `ELEVENLABS_AGENT_ID=${agent.agent_id}`));
    console.log("Agent ID saved to the env file.");
  }
}
