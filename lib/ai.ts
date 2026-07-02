import OpenAI from "openai";

type Provider = "groq" | "openai" | "ollama";

function detectProvider(): Provider {
  const explicit = process.env.AI_PROVIDER as Provider | undefined;
  if (explicit && ["groq", "openai", "ollama"].includes(explicit)) return explicit;
  if (process.env.OPENAI_API_KEY && !process.env.GROQ_API_KEY) return "openai";
  if (process.env.OLLAMA_HOST && !process.env.GROQ_API_KEY) return "ollama";
  return "groq";
}

function createClient(): { client: OpenAI; model: string } {
  const provider = detectProvider();

  if (provider === "openai") {
    return {
      client: new OpenAI({ apiKey: process.env.OPENAI_API_KEY }),
      model: process.env.AI_MODEL || "gpt-4o-mini",
    };
  }

  if (provider === "ollama") {
    const base = (process.env.OLLAMA_HOST || "http://localhost:11434").replace(/\/$/, "");
    return {
      client: new OpenAI({ baseURL: `${base}/v1`, apiKey: "ollama" }),
      model: process.env.AI_MODEL || "llama3.2",
    };
  }

  // Default: Groq via OpenAI-compatible endpoint
  return {
    client: new OpenAI({
      baseURL: "https://api.groq.com/openai/v1",
      apiKey: process.env.GROQ_API_KEY,
    }),
    model: process.env.AI_MODEL || "llama-3.3-70b-versatile",
  };
}

const { client, model } = createClient();
export const ai = client;
export const MODEL = model;
