# Privacy and Security Enhancements

## Overview
This document describes the privacy and security enhancements made to the Medical Consultation Audit System to protect patient information and ensure compliance with data protection regulations.

## Changes Implemented

### 1. AI-Powered Name Detection and Anonymization

**Location**: `src/piiValidator.js`

**What Changed**:
- Added `detectPersonNames()` function that uses OpenAI GPT-4o-mini to intelligently identify person names in consultation text
- Excludes medication names and medical condition names from detection
- Only detects actual person names (patients, doctors, family members, staff)

**Features**:
- Converts detected names to initials (e.g., "John Doe" → "JD")
- Provides detailed reporting of all replacements made
- Automatic processing during audit submission

### 2. Consultation Text Privacy Protection

**Location**: `src/auditService.js`

**What Changed**:
- Modified `conductRapidReview()` and `conductFullReview()` to exclude full consultation text from API responses
- Added `createExcerpts()` function to extract only relevant snippets for validation purposes
- Full consultation text is still saved in the database for record-keeping, but not returned in online responses

**How it Works**:
- Excerpts are created for criteria rated as "concern" or "unacceptable"
- Each excerpt includes ~100 characters of context around the issue
- Only evidence needed to support the assessment is included

### 3. Consultation Limit Enforcement

**Location**: `src/auditService.js`

**What Changed**:
- Full Reviews now analyze a maximum of 20 consultations
- If more than 20 consultations are provided, the excess are automatically excluded
- Clear notification provided to users about excluded consultations

**Implementation**:
```javascript
const MAX_CONSULTATIONS = 20;
const consultations = allConsultations.slice(0, MAX_CONSULTATIONS);
const excludedCount = allConsultations.length - consultations.length;
```

### 4. Enhanced PII Validation

**Location**: `src/server.js`

**What Changed**:
- Integrated `validateAndAnonymize()` into both rapid and full review endpoints
- Automatic name anonymization before processing
- Non-name PII (NHS numbers, addresses, etc.) still trigger warnings/errors as before

**Process Flow**:
1. User submits consultation data
2. System detects person names using AI
3. Names are automatically replaced with initials
4. Standard PII validation runs (NHS numbers, postcodes, etc.)
5. Anonymized data is processed for assessment
6. Results include anonymization report

### 5. Frontend User Notifications

**Location**: `public/audit.html`

**What Changed**:
- Added prominent privacy protection notices in results display
- Shows which names were replaced and with what initials
- Displays consultation limit notifications
- Updated download reports to include anonymization information
- Replaces full consultation text display with excerpts or privacy notice

**Visual Features**:
- 🔒 Privacy Protection notice (yellow banner)
- ℹ️ Consultation Limit notice (blue banner)
- Collapsible list of name replacements
- Evidence excerpts section instead of full text

## User Experience Changes

### Before
- Full consultation text visible in online results and downloads
- No name detection or anonymization
- All consultations processed regardless of count
- Risk of exposing patient identifiable information

### After
- Only assessment summaries and evidence excerpts shown online
- Automatic name detection and anonymization with user notification
- Maximum 20 consultations analyzed (clear notification if limit exceeded)
- Multi-layer privacy protection with full transparency to users

## Technical Details

### Name Detection Algorithm
- Uses OpenAI GPT-4o-mini with specialized prompt
- Temperature: 0.1 (for consistent results)
- Analyzes first 3000 characters of text
- Returns structured JSON with detected names
- Excludes medical terminology automatically

### Anonymization Process
```javascript
// Example
Input:  "Patient John Smith complained of headache. Dr. Jane Doe prescribed..."
Output: "Patient JS complained of headache. Dr. JD prescribed..."
Replacements: [
  {original: "John Smith", replacement: "JS"},
  {original: "Jane Doe", replacement: "JD"}
]
```

### Database vs. API Response
- **Database**: Full consultation text stored for complete records
- **API Response**: Only excerpts and summaries (privacy-protected)
- **Downloads**: Include summaries, excerpts, and anonymization report

## Benefits

1. **GDPR/Data Protection Compliance**: Automatic redaction of identifiable information
2. **Audit Trail**: All replacements are logged and reported
3. **Transparency**: Users are informed exactly what was changed
4. **Usability**: Automatic processing requires no extra user effort
5. **Evidence Preservation**: Excerpts still provide validation for assessments
6. **Scalability**: 20-consultation limit prevents system overload

## Testing Recommendations

1. Test with consultations containing various name formats
2. Verify medication/condition names are NOT flagged
3. Test with 25+ consultations to verify limit enforcement
4. Check downloaded reports include anonymization details
5. Verify excerpts are properly extracted and displayed

## Future Enhancements

Potential improvements for consideration:
- Allow users to configure consultation limit (10-30 range)
- Add manual name detection for edge cases
- Support for other languages
- Enhanced excerpt extraction algorithms
- Configurable anonymization format (initials vs. pseudonyms)

## Support and Maintenance

For questions or issues related to these privacy enhancements:
- Check system logs for AI detection issues
- Review the anonymization report in results
- Consult `src/piiValidator.js` for detection logic
- Verify OpenAI API key is configured correctly

---

**Last Updated**: January 19, 2026
**Version**: 1.0
