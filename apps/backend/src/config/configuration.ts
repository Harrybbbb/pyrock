import type { EnvConfig } from "./env.validation";

export interface AppConfig {
  env: EnvConfig["NODE_ENV"];
  port: number;
  corsOrigin: string;
  mongoUri: string;
  openai: {
    apiKey: string;
    model: string;
    timeoutMs: number;
  };
  extraction: {
    confidenceThreshold: number;
  };
}

export default (): { app: AppConfig } => {
  const env = process.env as unknown as EnvConfig;
  return {
    app: {
      env: env.NODE_ENV,
      port: Number(env.PORT),
      corsOrigin: env.CORS_ORIGIN,
      mongoUri: env.MONGODB_URI,
      openai: {
        apiKey: env.OPENAI_API_KEY,
        model: env.OPENAI_MODEL,
        timeoutMs: Number(env.OPENAI_TIMEOUT_MS),
      },
      extraction: {
        confidenceThreshold: Number(env.EXTRACTION_CONFIDENCE_THRESHOLD),
      },
    },
  };
};
