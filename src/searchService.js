import { database } from './database.js';
import { embeddingService } from './embeddingService.js';
import { assessmentService } from './assessmentService.js';

/**
 * Upload and assess a GP consultation
 * @param {Object} consultation - Consultation to assess {consultationText, metadata}
 * @returns {Promise<Object>} Complete assessment with RAG rating
 */
export async function assessConsultation(consultation) {
  try {
    const { consultationText, metadata = {} } = consultation;
    
    if (!consultationText) {
      throw new Error('Consultation text is required');
    }

    // Perform AI assessment
    const assessment = await assessmentService.assessConsultation(consultationText, metadata);
    
    // Generate embedding for searchability
    const embedding = await embeddingService.generateEmbedding(consultationText);
    
    const docToInsert = {
      type: 'gp_consultation_assessment',
      consultationText,
      assessment,
      embedding,
      metadata: assessment.metadata,
      ragRating: assessment.scoring.ragRating.rating,
      score: assessment.scoring.percentage,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const collection = database.getCollection();
    const result = await collection.insertOne(docToInsert);
    
    return {
      id: result.insertedId,
      ...docToInsert
    };
  } catch (error) {
    console.error('Error assessing consultation:', error);
    throw error;
  }
}

/**
 * Upload a new document with AI-generated embedding (legacy function for backward compatibility)
 * @param {Object} document - Document to upload {title, content, metadata}
 * @returns {Promise<Object>} Inserted document with ID
 */
export async function uploadDocument(document) {
  try {
    const { title, content, metadata = {} } = document;
    
    if (!content) {
      throw new Error('Content is required');
    }

    // Generate embedding for the content
    const embedding = await embeddingService.generateEmbedding(content);
    
    const docToInsert = {
      type: 'document',
      title: title || 'Untitled',
      content,
      embedding,
      metadata,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const collection = database.getCollection();
    const result = await collection.insertOne(docToInsert);
    
    return {
      id: result.insertedId,
      ...docToInsert
    };
  } catch (error) {
    console.error('Error uploading document:', error);
    throw error;
  }
}

/**
 * Search for similar documents using AI vector search
 * @param {string} query - Search query
 * @param {number} limit - Maximum number of results to return
 * @param {number} threshold - Minimum similarity score (0-1)
 * @returns {Promise<Array>} Array of matching documents with similarity scores
 */
export async function searchDocuments(query, limit = 10, threshold = 0.7) {
  try {
    if (!query) {
      throw new Error('Query is required');
    }

    // Generate embedding for the search query
    const queryEmbedding = await embeddingService.generateEmbedding(query);
    
    const collection = database.getCollection();
    
    // Get all documents (in production, you'd use MongoDB Atlas Vector Search)
    const allDocs = await collection.find({}).toArray();
    
    // Calculate similarity scores
    const results = allDocs.map(doc => ({
      ...doc,
      similarity: embeddingService.cosineSimilarity(queryEmbedding, doc.embedding)
    }))
    .filter(doc => doc.similarity >= threshold)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, limit)
    .map(doc => ({
      id: doc._id,
      title: doc.title,
      content: doc.content,
      metadata: doc.metadata,
      similarity: doc.similarity,
      createdAt: doc.createdAt
    }));

    return results;
  } catch (error) {
    console.error('Error searching documents:', error);
    throw error;
  }
}

/**
 * Get all documents (for listing purposes)
 * @param {number} limit - Maximum number of documents to return
 * @param {string} type - Filter by document type (optional)
 * @returns {Promise<Array>} Array of documents
 */
export async function getAllDocuments(limit = 50, type = null) {
  try {
    const collection = database.getCollection();
    const filter = type ? { type } : {};
    
    const documents = await collection
      .find(filter)
      .sort({ createdAt: -1 })
      .limit(limit)
      .project({ embedding: 0 }) // Exclude embedding from results
      .toArray();
    
    return documents.map(doc => ({
      id: doc._id,
      type: doc.type,
      title: doc.title,
      content: doc.content || doc.consultationText,
      metadata: doc.metadata,
      ragRating: doc.ragRating,
      score: doc.score,
      assessment: doc.assessment,
      createdAt: doc.createdAt
    }));
  } catch (error) {
    console.error('Error getting documents:', error);
    throw error;
  }
}

/**
 * Get assessment statistics
 * @returns {Promise<Object>} Statistics about assessments
 */
export async function getAssessmentStats() {
  try {
    const collection = database.getCollection();
    const assessments = await collection.find({ type: 'gp_consultation_assessment' }).toArray();
    
    const stats = {
      total: assessments.length,
      byRAG: {
        GREEN: 0,
        YELLOW: 0,
        AMBER: 0,
        RED: 0
      },
      averageScore: 0,
      recent: []
    };
    
    let totalScore = 0;
    assessments.forEach(doc => {
      if (doc.ragRating) {
        stats.byRAG[doc.ragRating]++;
      }
      if (doc.score) {
        totalScore += doc.score;
      }
    });
    
    if (assessments.length > 0) {
      stats.averageScore = Math.round((totalScore / assessments.length) * 100) / 100;
    }
    
    // Get 5 most recent assessments
    stats.recent = assessments
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 5)
      .map(doc => ({
        id: doc._id,
        date: doc.createdAt,
        ragRating: doc.ragRating,
        score: doc.score,
        patientRef: doc.metadata?.patientReference
      }));
    
    return stats;
  } catch (error) {
    console.error('Error getting assessment stats:', error);
    throw error;
  }
}

/**
 * Delete a document by ID
 * @param {string} documentId - Document ID to delete
 * @returns {Promise<boolean>} True if deleted successfully
 */
export async function deleteDocument(documentId) {
  try {
    const collection = database.getCollection();
    const result = await collection.deleteOne({ _id: documentId });
    return result.deletedCount > 0;
  } catch (error) {
    console.error('Error deleting document:', error);
    throw error;
  }
}
