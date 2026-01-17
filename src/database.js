import { MongoClient } from 'mongodb';
import { config } from './config.js';

class Database {
  constructor() {
    this.client = null;
    this.db = null;
  }

  async connect() {
    try {
      this.client = new MongoClient(config.mongodb.uri, {
        tlsAllowInvalidCertificates: true,
        tlsAllowInvalidHostnames: true,
        serverSelectionTimeoutMS: 5000
      });
      await this.client.connect();
      this.db = this.client.db(config.mongodb.database);
      console.log('Connected to MongoDB');
      
      // Create vector search index if it doesn't exist
      await this.createVectorSearchIndex();
    } catch (error) {
      console.error('MongoDB connection error:', error);
      throw error;
    }
  }

  async createVectorSearchIndex() {
    try {
      const collection = this.db.collection(config.mongodb.collection);
      
      // Check if index already exists
      const indexes = await collection.listIndexes().toArray();
      const vectorIndexExists = indexes.some(index => index.name === 'vector_index');
      
      if (!vectorIndexExists) {
        // Create vector search index
        await collection.createIndex(
          { embedding: '2dsphere' },
          { name: 'vector_index' }
        );
        console.log('Vector search index created');
      }
    } catch (error) {
      console.error('Error creating vector index:', error);
    }
  }

  getCollection() {
    return this.db.collection(config.mongodb.collection);
  }

  async close() {
    if (this.client) {
      await this.client.close();
      console.log('MongoDB connection closed');
    }
  }
}

export const database = new Database();
