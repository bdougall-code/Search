import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { database } from './database.js';
import { config } from './config.js';
import { uploadDocument, searchDocuments, getAllDocuments, deleteDocument, assessConsultation, getAssessmentStats } from './searchService.js';
import auditService from './auditService.js';
import { validateForPII, hasHighSeverityIssues, formatIssues } from './piiValidator.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files from the public directory
app.use(express.static(path.join(__dirname, '../public')));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

// Upload a new document
app.post('/api/documents', async (req, res) => {
  try {
    const { title, content, metadata } = req.body;
    
    if (!content) {
      return res.status(400).json({ error: 'Content is required' });
    }

    const document = await uploadDocument({ title, content, metadata });
    res.status(201).json({
      success: true,
      message: 'Document uploaded successfully',
      document
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Failed to upload document', details: error.message });
  }
});

// Search documents
app.post('/api/search', async (req, res) => {
  try {
    const { query, limit = 10, threshold = 0.7 } = req.body;
    
    if (!query) {
      return res.status(400).json({ error: 'Query is required' });
    }

    const results = await searchDocuments(query, parseInt(limit), parseFloat(threshold));
    res.json({
      success: true,
      query,
      resultCount: results.length,
      results
    });
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ error: 'Failed to search documents', details: error.message });
  }
});

// Get all documents
app.get('/api/documents', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const documents = await getAllDocuments(limit);
    res.json({
      success: true,
      count: documents.length,
      documents
    });
  } catch (error) {
    console.error('Get documents error:', error);
    res.status(500).json({ error: 'Failed to get documents', details: error.message });
  }
});

// Delete a document
app.delete('/api/documents/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await deleteDocument(id);
    
    if (deleted) {
      res.json({ success: true, message: 'Document deleted successfully' });
    } else {
      res.status(404).json({ error: 'Document not found' });
    }
  } catch (error) {
    console.error('Delete error:', error);
    res.status(500).json({ error: 'Failed to delete document', details: error.message });
  }
});

// NEW: Assess a GP consultation
app.post('/api/assessments', async (req, res) => {
  try {
    const { consultationText, metadata } = req.body;
    
    if (!consultationText) {
      return res.status(400).json({ error: 'Consultation text is required' });
    }

    console.log('Assessing consultation...');
    const assessment = await assessConsultation({ consultationText, metadata });
    
    res.status(201).json({
      success: true,
      message: 'Consultation assessed successfully',
      assessment
    });
  } catch (error) {
    console.error('Assessment error:', error);
    res.status(500).json({ error: 'Failed to assess consultation', details: error.message });
  }
});

// NEW: Get all assessments
app.get('/api/assessments', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const assessments = await getAllDocuments(limit, 'gp_consultation_assessment');
    res.json({
      success: true,
      count: assessments.length,
      assessments
    });
  } catch (error) {
    console.error('Get assessments error:', error);
    res.status(500).json({ error: 'Failed to get assessments', details: error.message });
  }
});

// NEW: Get assessment statistics (MUST come before /:id route)
app.get('/api/assessments/stats', async (req, res) => {
  try {
    console.log('Getting assessment stats...');
    const stats = await getAssessmentStats();
    console.log('Stats retrieved successfully:', stats);
    res.json({
      success: true,
      stats
    });
  } catch (error) {
    console.error('Get stats error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ error: 'Failed to get assessment statistics', details: error.message });
  }
});

// NEW: Get single assessment by ID
app.get('/api/assessments/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const collection = database.getCollection();
    const { ObjectId } = await import('mongodb');
    
    // Validate ObjectId format
    if (!id || !/^[0-9a-fA-F]{24}$/.test(id)) {
      return res.status(400).json({ error: 'Invalid assessment ID format' });
    }
    
    const assessment = await collection.findOne(
      { _id: new ObjectId(id), type: 'gp_consultation_assessment' },
      { projection: { embedding: 0 } }
    );
    
    if (!assessment) {
      return res.status(404).json({ error: 'Assessment not found' });
    }
    
    res.json({
      success: true,
      assessment: {
        id: assessment._id,
        ...assessment
      }
    });
  } catch (error) {
    console.error('Get assessment error:', error);
    res.status(500).json({ error: 'Failed to get assessment', details: error.message });
  }
});

// AUDIT ENDPOINTS
// Rapid Review (2 consultations)
app.post('/api/audit/rapid-review', async (req, res) => {
  try {
    const { consultationData, doctorInitials, referenceNumber } = req.body;
    
    if (!consultationData) {
      return res.status(400).json({ error: 'Consultation data is required' });
    }

    // Validate for PII
    const piiIssues = validateForPII(consultationData);
    if (piiIssues.length > 0) {
      console.warn(`⚠️ PII Validation Issues: ${formatIssues(piiIssues)}`);
      
      if (hasHighSeverityIssues(piiIssues)) {
        return res.status(400).json({ 
          error: 'Patient identifiable information detected. Please anonymize the data before submitting.',
          piiIssues: piiIssues
        });
      }
    }

    console.log(`Starting Rapid Review${doctorInitials ? ` for Dr. ${doctorInitials}` : ''}...`);
    const results = await auditService.conductRapidReview(consultationData);
    
    // Add doctor initials and reference number to results
    if (doctorInitials) {
      results.doctorInitials = doctorInitials;
    }
    if (referenceNumber) {
      results.referenceNumber = referenceNumber;
    }
    
    res.status(200).json(results);
  } catch (error) {
    console.error('Rapid Review error:', error);
    res.status(500).json({ error: error.message || 'Failed to conduct rapid review' });
  }
});

// Full Review (10+ consultations)
app.post('/api/audit/full-review', async (req, res) => {
  try {
    const { consultationData, doctorInitials, referenceNumber } = req.body;
    
    if (!consultationData) {
      return res.status(400).json({ error: 'Consultation data is required' });
    }

    // Validate for PII
    const piiIssues = validateForPII(consultationData);
    if (piiIssues.length > 0) {
      console.warn(`⚠️ PII Validation Issues: ${formatIssues(piiIssues)}`);
      
      if (hasHighSeverityIssues(piiIssues)) {
        return res.status(400).json({ 
          error: 'Patient identifiable information detected. Please anonymize the data before submitting.',
          piiIssues: piiIssues
        });
      }
    }

    console.log(`Starting Full Review${doctorInitials ? ` for Dr. ${doctorInitials}` : ''}...`);
    const results = await auditService.conductFullReview(consultationData);
    
    // Add doctor initials and reference number to results
    if (doctorInitials) {
      results.doctorInitials = doctorInitials;
    }
    if (referenceNumber) {
      results.referenceNumber = referenceNumber;
    }
    
    res.status(200).json(results);
  } catch (error) {
    console.error('Full Review error:', error);
    res.status(500).json({ error: error.message || 'Failed to conduct full review' });
  }
});

// Start server
async function startServer() {
  try {
    // Connect to database
    await database.connect();
    
    // Start listening
    app.listen(config.server.port, () => {
      console.log(`Server running on http://localhost:${config.server.port}`);
      console.log(`API endpoints:`);
      console.log(`  POST   /api/audit/rapid-review - Conduct rapid review (2 consultations)`);
      console.log(`  POST   /api/audit/full-review  - Conduct full review (10+ consultations)`);
      console.log(`  POST   /api/assessments     - Assess a GP consultation`);
      console.log(`  GET    /api/assessments     - Get all assessments`);
      console.log(`  GET    /api/assessments/stats - Get assessment statistics`);
      console.log(`  POST   /api/documents       - Upload a new document`);
      console.log(`  POST   /api/search          - Search documents`);
      console.log(`  GET    /api/documents       - Get all documents`);
      console.log(`  DELETE /api/documents/:id   - Delete a document`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\nShutting down gracefully...');
  await database.close();
  process.exit(0);
});

startServer();
