import dotenv from 'dotenv';

dotenv.config();

export const config = {
  mongodb: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017',
    database: process.env.MONGODB_DATABASE || 'ai_search_db',
    collection: 'documents'
  },
  // OpenAI (for cloud deployment like Railway)
  openai: {
    apiKey: process.env.OPENAI_API_KEY,
    model: process.env.OPENAI_MODEL || 'text-embedding-3-small',
    dimensions: 1536
  },
  // Ollama (for local development)
  ollama: {
    baseUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
    model: process.env.OLLAMA_MODEL || 'nomic-embed-text',
    dimensions: 768
  },
  server: {
    port: process.env.PORT || 3000
  }
};
