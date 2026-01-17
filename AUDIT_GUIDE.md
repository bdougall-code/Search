# Medical Consultation Audit System

## Overview

A comprehensive AI-powered audit system for reviewing GP consultation notes. The system supports two types of audits:

1. **Rapid Review** - Analysis of exactly 2 consultations for quick quality assurance
2. **Full Review** - Comprehensive analysis of 10+ consultations with detailed statistics and recommendations

## Features

### Rapid Review (2 Consultations)
- Individual assessment of each consultation against 12 clinical documentation criteria
- Separate scoring and RAG rating for each consultation
- Overall summary with average scores
- RAG distribution analysis
- Criteria-level statistics across both consultations

### Full Review (10+ Consultations)
All features from Rapid Review, plus:
- Best and worst performing consultation identification
- Common areas of concern across all consultations
- Identified strengths and consistent good practices
- Detailed recommendations based on patterns
- Comprehensive criteria statistics showing percentage performance
- Downloadable text report

## Assessment Criteria

Each consultation is assessed against 12 key criteria:

1. Notes coherence and structure
2. Problem summarization and coding
3. History - positive features
4. History - negative features
5. Clinical examination findings
6. Diagnostic decisions and working diagnosis
7. Prescribing within guidelines
8. Advice on side effects/interactions
9. Medicines review
10. Following clinical guidelines
11. Continuing care arrangements/safety net
12. Action on radiology/pathology results

## Rating System

Each criterion is rated as:
- **Acceptable (A)** - Meets standards (1.0 points)
- **Concern (C)** - Minor issues (0.6 points)
- **Unacceptable (U)** - Below standards (0 points)

### RAG Ratings

Overall performance is categorized:
- **GREEN (90-100%)** - Excellent documentation
- **YELLOW (70-89%)** - Good with minor issues
- **AMBER (50-69%)** - Needs improvement
- **RED (<50%)** - Unacceptable quality

## How to Use

### 1. Access the Audit Interface

Open your browser and navigate to: `http://localhost:3000/audit.html`

### 2. Select Audit Type

Choose between:
- **Rapid Review** - For exactly 2 consultations
- **Full Review** - For 10 or more consultations

### 3. Prepare Your Data

Format your consultation notes as follows:

```
Date		Consultation Text
17-Dec-2024 14:15		Face to face consultation (City Square Medical Group)...
		Problem		...
		History		...
		Medication		...

Date		Consultation Text
17-Dec-2024 14:33		Face to face consultation (City Square Medical Group)...
		History		...
		Test Request		...
		Problem		...
```

### 4. Paste and Submit

1. Paste your formatted consultation data into the text area
2. Click "Start Audit"
3. Wait for the AI assessment to complete (typically 30-60 seconds per consultation)

### 5. Review Results

The system provides:
- Overall score and RAG rating
- RAG distribution across all consultations
- Individual consultation assessments (expandable)
- Detailed criteria ratings with explanations
- Recommendations for improvement
- For Full Reviews: Additional analytics and patterns

### 6. Download Report

Click "Download Report" to save a text version of the complete audit results.

## Sample Data

A sample file with 2 consultations is provided: `sample-consultations-rapid.txt`

You can copy this data to test the Rapid Review functionality.

## API Endpoints

### Rapid Review
```
POST /api/audit/rapid-review
Content-Type: application/json

{
  "consultationData": "Date\t\tConsultation Text\n17-Dec-2024 14:15..."
}
```

### Full Review
```
POST /api/audit/full-review
Content-Type: application/json

{
  "consultationData": "Date\t\tConsultation Text\n17-Dec-2024 14:15..."
}
```

## Response Format

Both endpoints return:

```json
{
  "reviewType": "Rapid Review" | "Full Review",
  "totalConsultations": 2,
  "completedAt": "2024-12-17T14:30:00.000Z",
  "processingTime": "45.2",
  "individualAssessments": [
    {
      "consultationNumber": 1,
      "consultationDate": "17-Dec-2024 14:15",
      "assessment": {
        "metadata": {...},
        "consultationText": "...",
        "criteriaAssessments": [...],
        "scoring": {
          "acceptable": 10,
          "concern": 2,
          "unacceptable": 0,
          "percentage": 91.67,
          "ragRating": {...}
        },
        "overallSummary": "...",
        "recommendations": [...]
      }
    }
  ],
  "summary": {
    "averageScore": 85.42,
    "overallRAG": "YELLOW",
    "ragDistribution": {
      "GREEN": 1,
      "YELLOW": 1,
      "AMBER": 0,
      "RED": 0
    },
    "highestScore": 91.67,
    "lowestScore": 79.17,
    "criteriaStats": [...]
  },
  "detailedAnalysis": {...}  // Only in Full Review
}
```

## Technical Details

### Processing Time
- Rapid Review (2 notes): ~30-60 seconds
- Full Review (10 notes): ~2-5 minutes
- Full Review (20 notes): ~4-10 minutes

All criteria are assessed in parallel for maximum efficiency.

### AI Model
- Uses GPT-4o-mini for cost-effective, high-quality assessments
- Each criterion assessed independently
- Consistent, evidence-based ratings

## Requirements

- Node.js server running
- OpenAI API key configured
- MongoDB database connection
- Modern web browser (Chrome, Firefox, Safari, Edge)

## Troubleshooting

### Error: "Rapid Review requires exactly 2 consultations"
- Check your data format
- Ensure you have exactly 2 date/time stamps
- Each consultation must start with "Date\t\tConsultation Text"

### Error: "Full Review requires at least 10 consultations"
- Verify you have 10 or more consultations in your data
- Check formatting of each consultation

### Slow Processing
- This is normal for larger reviews
- Each consultation is thoroughly assessed against 12 criteria
- Progress is shown in the loading screen

## Best Practices

1. **Data Quality**: Ensure consultation notes are complete and properly formatted
2. **Batch Size**: For Full Reviews, 10-20 consultations is optimal
3. **Regular Audits**: Use Rapid Reviews for regular spot checks, Full Reviews quarterly
4. **Review Results**: Take time to read individual criterion explanations
5. **Action Plans**: Use recommendations to create improvement plans

## Future Enhancements

- Export to PDF
- Comparison across multiple audits
- Trend analysis over time
- Custom criteria sets
- Automated scheduling
- Integration with practice management systems
