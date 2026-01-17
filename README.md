# GP Consultation Assessment System

An AI-powered system for assessing GP consultation documentation against clinical standards using OpenAI GPT-4. This application automatically evaluates consultation notes across 12 criteria and provides detailed feedback with RAG (Red/Amber/Yellow/Green) ratings.

## Features

- 🏥 **AI-Powered Assessment** - Uses OpenAI GPT-4 to evaluate consultation notes
- 📋 **12 Clinical Criteria** - Based on UK GP best practice standards
- 🎯 **RAG Rating System** - Automatic scoring with Green/Yellow/Amber/Red ratings
- 📊 **Detailed Feedback** - Criterion-by-criterion analysis with explanations
- 💾 **MongoDB Storage** - Secure storage of assessments and results
- 🔍 **Searchable History** - Vector search to find similar consultations
- 📈 **Statistics Dashboard** - Track performance trends over time

## Assessment Criteria

The system evaluates consultations against 12 key criteria:

1. Notes coherence and structure
2. Problem summarization and Read coding
3. History of presenting complaint (positive features)
4. History of presenting complaint (negative features)
5. Clinical examination findings
6. Diagnostic decisions and working diagnosis
7. Prescribing within guidelines
8. Side effects/interactions advice
9. Medicines review
10. Clinical practice guidelines adherence
11. Continuing care arrangements
12. Results actioning

## RAG Rating Scale

- **GREEN (90-100%)**: Excellent documentation - 3 monthly review
- **YELLOW (70-89%)**: Good with minor issues - 3 monthly review  
- **AMBER (50-69%)**: Below standard - 1 month review required
- **RED (<50%)**: Unacceptable - Immediate management review

## Prerequisites

- Node.js 18+ 
- MongoDB instance (local or cloud)
- **OpenAI API Key** ([Get one here](https://platform.openai.com/api-keys))

## Installation

1. Install dependencies:
```bash
npm install
```

2. Configure environment variables in `.env`:

```env
# MongoDB Connection (required)
MONGODB_URI=your_mongodb_uri
MONGODB_DATABASE=gp_assessment_db

# OpenAI API (required)
OPENAI_API_KEY=your_openai_api_key
OPENAI_MODEL=gpt-4o-mini

# Server Configuration
PORT=3000
```

## Usage

1. Start the server:
```bash
npm start
```

2. Open your browser to `http://localhost:3000`

3. Submit a consultation:
   - Click "New Assessment"
   - Enter patient reference and consultation details
   - Paste the consultation notes
   - Click "Assess Consultation"
   - Review the AI-generated assessment with RAG rating

## API Endpoints

### Assessment Endpoints

**POST /api/assessments** - Assess a GP consultation
```json
{
  "consultationText": "Patient presented with...",
  "metadata": {
    "patientReference": "PT-12345",
    "consultationDate": "2026-01-17",
    "consultationType": "Surgery consultation (new)"
  }
}
```

**GET /api/assessments** - Get all assessments
- Query params: `limit` (default: 50)

**GET /api/assessments/stats** - Get assessment statistics
- Returns: Total count, RAG distribution, average score, recent assessments

### Legacy Document Endpoints

**POST /api/documents** - Upload a document
**GET /api/documents** - Get all documents
**POST /api/search** - Search documents
**DELETE /api/documents/:id** - Delete a document

## Project Structure

```
src/
├── assessmentCriteria.js   # 12 assessment criteria definitions
├── assessmentService.js     # OpenAI-powered assessment logic
├── embeddingService.js      # Vector embeddings for search
├── searchService.js         # Assessment and search functions
├── database.js              # MongoDB connection
├── config.js                # Configuration management
└── server.js                # Express API server

public/
├── index.html               # Homepage
├── assessment.html          # Assessment submission page
└── search.html             # Assessment history viewer
```

## Deployment to Railway

1. Push your code to GitHub
2. Connect to Railway and add environment variables:
   - `MONGODB_URI`
   - `OPENAI_API_KEY`
3. Deploy automatically

## Cost Estimation

OpenAI GPT-4-mini pricing (as of 2026):
- ~$0.10 per assessment (12 criteria analyzed)
- Text-embedding-3-small: $0.02 per 1M tokens (for search)

For 100 assessments/month: ~$10/month

## Development

```bash
# Install dependencies
npm install

# Start development server
npm start

# The server will run on http://localhost:3000
```

## License

MIT

## Support

For issues or questions, please open an issue on GitHub.

