// file: src/memory/embedding_service.ts
// description: Embedding generation for semantic search using OpenAI
// reference: src/memory/store.ts, OpenAI text-embedding-3-small

import OpenAI from 'openai';

export interface IEmbeddingService {
  generate(text: string): Promise<number[]>;
  generate_batch(texts: string[]): Promise<number[][]>;
}

export class OpenAIEmbeddingService implements IEmbeddingService {
  private client: OpenAI;
  private model = 'text-embedding-3-small'; // 1536 dimensions, matches Qdrant

  constructor(api_key?: string) {
    this.client = new OpenAI({
      apiKey: api_key || process.env.OPENAI_API_KEY || 'dummy-key-for-testing',
    });
  }

  async generate(text: string): Promise<number[]> {
    if (!text || text.trim().length === 0) {
      throw new Error('Cannot generate embedding for empty text');
    }

    try {
      const response = await this.client.embeddings.create({
        model: this.model,
        input: text,
        encoding_format: 'float',
      });

      const embedding = response.data[0]?.embedding;
      if (!embedding) {
        throw new Error('No embedding returned from OpenAI');
      }

      return embedding;
    } catch (error) {
      if (error instanceof OpenAI.APIError) {
        console.error('[Embedding] OpenAI API error:', error.message, error.status);
        throw new Error(`Embedding generation failed: ${error.message}`);
      }
      throw error;
    }
  }

  async generate_batch(texts: string[]): Promise<number[][]> {
    if (texts.length === 0) {
      return [];
    }

    // Filter out empty strings
    const valid_texts = texts.filter((t) => t && t.trim().length > 0);
    if (valid_texts.length === 0) {
      throw new Error('No valid texts to embed');
    }

    try {
      const response = await this.client.embeddings.create({
        model: this.model,
        input: valid_texts,
        encoding_format: 'float',
      });

      return response.data.map((item) => item.embedding);
    } catch (error) {
      if (error instanceof OpenAI.APIError) {
        console.error('[Embedding] Batch OpenAI API error:', error.message);
        throw new Error(`Batch embedding generation failed: ${error.message}`);
      }
      throw error;
    }
  }
}

// Factory function for dependency injection
export function create_embedding_service(): IEmbeddingService {
  return new OpenAIEmbeddingService();
}
