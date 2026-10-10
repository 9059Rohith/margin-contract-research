import { z } from 'zod';

const schema = z.object({
  DATA_DIR: z.string().default('./data'),
  LLM_API_KEY: z.string().optional(),
  LLM_BASE_URL: z.string().url().default('https://openrouter.ai/api/v1'),
  LLM_MODEL: z.string().default('openai/gpt-4o-mini'),
  MAX_UPLOAD_MB: z.coerce.number().int().min(1).max(200).default(40),
  MAX_PAGES: z.coerce.number().int().min(1).max(1000).default(400),
  AGENT_MAX_ROUNDS: z.coerce.number().int().min(1).max(20).default(8),
  AGENT_MAX_TOKENS_BUDGET: z.coerce.number().int().min(1000).max(200000).default(20000),
  AGENT_TIMEOUT_MS: z.coerce.number().int().min(5000).max(300000).default(90000),
  APP_ORIGIN: z.string().url().default('http://localhost:3000')
});

export const env = schema.parse(process.env);
