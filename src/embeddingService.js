import { config } from './config.js';
import OpenAI from 'openai';

class EmbeddingService {
  constructor() {
    // Detect which service to use based on environment
    this.useOpenAI = !!config.openai.apiKey;
    
    if (this.useOpenAI) {
      this.openai = new OpenAI({ apiKey: config.openai.apiKey });
      this.model = config.openai.model;
      this.dimensions = config.openai.dimensions;
      console.log(`✓ Using OpenAI embeddings (${this.model}) - Cloud mode`);
    } else {
      this.baseUrl = config.ollama.baseUrl;
      this.model = config.ollama.model;
      this.dimensions = config.ollama.dimensions;
      console.log(`✓ Using Ollama embeddings (${this.model}) - Local mode`);
    }
  }

  /**
   * Generate embedding vector for text using either Ollama or OpenAI
   * @param {string} text - Text to generate embedding for
   * @returns {Promise<number[]>} Embedding vector
   */
  async generateEmbedding(text) {
    if (this.useOpenAI) {
      return this.generateOpenAIEmbedding(text);
    } else {
      return this.generateOllamaEmbedding(text);
    }
  }

  /**
   * Generate embedding using OpenAI API
   * @param {string} text 
   * @returns {Promise<number[]>}
   */
  async generateOpenAIEmbedding(text) {
    try {
      const response = await this.openai.embeddings.create({
        model: this.model,
        input: text,
      });
      
      return response.data[0].embedding;
    } catch (error) {
      console.error('Error generating OpenAI embedding:', error);
      throw error;
    }
  }

  /**
   * Generate embedding using Ollama
   * @param {string} text 
   * @returns {Promise<number[]>}
   */
  async generateOllamaEmbedding(text) {
    try {
      const response = await fetch(`${this.baseUrl}/api/embeddings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: this.model,
          prompt: text
        })
      });

      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      return data.embedding;
    } catch (error) {
      console.error('Error generating Ollama embedding:', error);
      throw error;
    }
  }

  /**
   * Calculate cosine similarity between two vectors
   * @param {number[]} vecA 
   * @param {number[]} vecB 
   * @returns {number} Similarity score (0-1)
   */
  cosineSimilarity(vecA, vecB) {
    const dotProduct = vecA.reduce((sum, a, i) => sum + a * vecB[i], 0);
    const magnitudeA = Math.sqrt(vecA.reduce((sum, a) => sum + a * a, 0));
    const magnitudeB = Math.sqrt(vecB.reduce((sum, b) => sum + b * b, 0));
    return dotProduct / (magnitudeA * magnitudeB);
  }
}

export const embeddingService = new EmbeddingService();
