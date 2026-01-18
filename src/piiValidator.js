/**
 * PII (Personally Identifiable Information) Validator
 * Checks for patient identifiable information in consultation notes
 */

/**
 * Validate consultation data for patient identifiable information
 * @param {string} text - Consultation text to validate
 * @returns {Array} Array of validation issues found
 */
export function validateForPII(text) {
  const issues = [];
  
  // Check for NHS numbers (10 digits, may have spaces or dashes)
  const nhsNumberPattern = /\b\d{3}[\s-]?\d{3}[\s-]?\d{4}\b/g;
  const nhsMatches = text.match(nhsNumberPattern);
  if (nhsMatches) {
    issues.push({
      type: 'NHS_NUMBER',
      severity: 'HIGH',
      count: nhsMatches.length,
      message: `${nhsMatches.length} potential NHS number(s) detected (10-digit numbers)`
    });
  }

  // Check for patient name patterns (but exclude doctor names and common medical terms)
  const namePatterns = [
    /\bPatient[:\s]+([A-Z][a-z]+\s+[A-Z][a-z]+)/gi,
    /\bName[:\s]+([A-Z][a-z]+\s+[A-Z][a-z]+)/gi,
    /\bMr\.?\s+[A-Z][a-z]{2,}/gi,
    /\bMrs\.?\s+[A-Z][a-z]{2,}/gi,
    /\bMiss\.?\s+[A-Z][a-z]{2,}/gi,
    /\bMs\.?\s+[A-Z][a-z]{2,}/gi,
    // Check for full names (First Last) that appear to be proper names
    /\b[A-Z][a-z]{2,}\s+[A-Z][a-z]{2,}\b/g,
  ];
  
  // Common medical terms to exclude (not names)
  const excludeTerms = [
    'Blood Pressure', 'Heart Rate', 'Body Mass', 'White Cell', 'Red Cell',
    'Blood Sugar', 'Blood Test', 'Urine Test', 'Patient History', 'Medical History',
    'Side Effects', 'Drug Interaction', 'General Practice', 'Primary Care',
    'Health Check', 'Health Service', 'National Health', 'Practice Nurse',
    'District Nurse', 'Mental Health', 'Public Health', 'Social Care',
    'Care Home', 'Home Visit', 'Follow Up', 'Next Review', 'Last Seen',
    'First Line', 'Second Line', 'Third Line', 'First Choice', 'Drug Class',
    'Side Effect', 'Adverse Effect', 'Common Side', 'Main Side',
    'Safety Net', 'Safety Netting', 'Upper Respiratory', 'Lower Respiratory',
    'Tract Infection', 'Urinary Tract', 'Chest Pain', 'Chest Infection',
    'Ear Infection', 'Throat Infection', 'Deep Vein', 'High Blood',
    'Low Blood', 'Kidney Function', 'Liver Function', 'Lung Function'
  ];
  
  let nameCount = 0;
  const detectedNames = new Set();
  
  namePatterns.forEach(pattern => {
    const matches = text.match(pattern);
    if (matches) {
      matches.forEach(match => {
        // Clean up the match - remove title/prefix
        const cleanMatch = match.replace(/^(Patient|Name|Mr\.?|Mrs\.?|Miss\.?|Ms\.?)\s*/gi, '').trim();
        
        // Skip if it's directly an excluded medical term
        if (excludeTerms.some(term => term.toLowerCase() === cleanMatch.toLowerCase())) {
          return;
        }
        
        // Get the match index
        const matchIndex = text.indexOf(match);
        const afterMatch = text.substring(matchIndex + match.length, matchIndex + match.length + 15);
        
        // Skip if it's a doctor reference
        if (afterMatch.includes('(Dr)') || afterMatch.includes('Dr)') || afterMatch.includes('doctor')) {
          return;
        }
        
        // Skip single-word entries or very short words (but allow titles like Mr/Mrs)
        if (!cleanMatch.includes(' ') && cleanMatch.length < 6) {
          return;
        }
        
        // Skip if both words are lowercase or all uppercase (likely abbreviations)
        if (cleanMatch === cleanMatch.toLowerCase() || cleanMatch === cleanMatch.toUpperCase()) {
          return;
        }
        
        // Check if it's part of a medical phrase (but not after "Patient:" or "Name:")
        const beforeMatch = text.substring(Math.max(0, matchIndex - 20), matchIndex).toLowerCase();
        const isNameField = beforeMatch.includes('patient:') || beforeMatch.includes('name:');
        
        if (!isNameField) {
          // Only exclude if it's part of a medical term phrase
          const contextBefore = text.substring(Math.max(0, matchIndex - 30), matchIndex);
          const contextAfter = text.substring(matchIndex, matchIndex + match.length + 30);
          const fullContext = (contextBefore + contextAfter).toLowerCase();
          
          // Check if this is part of a known medical phrase
          if (excludeTerms.some(term => fullContext.includes(term.toLowerCase()))) {
            return;
          }
        }
        
        // Add to detected names
        if (!detectedNames.has(cleanMatch.toLowerCase())) {
          detectedNames.add(cleanMatch.toLowerCase());
          nameCount++;
        }
      });
    }
  });
  
  if (nameCount > 0) {
    issues.push({
      type: 'PATIENT_NAME',
      severity: 'HIGH',
      count: nameCount,
      message: `${nameCount} potential patient name(s) detected. Please ensure all names are removed before submitting.`
    });
  }

  // Check for date of birth patterns
  const dobPatterns = [
    /\bDOB[:\s]+\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}/gi,
    /\bDate of Birth[:\s]+\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}/gi,
    /\bBorn[:\s]+\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}/gi,
  ];
  
  let dobCount = 0;
  dobPatterns.forEach(pattern => {
    const matches = text.match(pattern);
    if (matches) {
      dobCount += matches.length;
    }
  });
  
  if (dobCount > 0) {
    issues.push({
      type: 'DATE_OF_BIRTH',
      severity: 'HIGH',
      count: dobCount,
      message: `${dobCount} date of birth reference(s) detected`
    });
  }

  // Check for UK postcodes (improved to reduce false positives)
  // Must have a space between parts to be a real postcode
  const postcodePattern = /\b[A-Z]{1,2}\d{1,2}[A-Z]?\s+\d[A-Z]{2}\b/g;
  const postcodeMatches = text.match(postcodePattern);
  
  // Filter out obvious false positives (vitamins, tests, etc.)
  const filteredPostcodes = postcodeMatches ? postcodeMatches.filter(match => {
    // Exclude single letter + number patterns (B12, D3, E45, etc.)
    const noSpace = match.replace(/\s+/g, '');
    return !/^[A-Z]\d+$/.test(noSpace);
  }) : [];
  
  if (filteredPostcodes && filteredPostcodes.length > 0) {
    issues.push({
      type: 'POSTCODE',
      severity: 'MEDIUM',
      count: filteredPostcodes.length,
      message: `${filteredPostcodes.length} potential postcode(s) detected`
    });
  }

  // Check for phone numbers
  const phonePattern = /\b0\d{2,4}[\s-]?\d{3,4}[\s-]?\d{4}\b/g;
  const phoneMatches = text.match(phonePattern);
  if (phoneMatches) {
    issues.push({
      type: 'PHONE_NUMBER',
      severity: 'MEDIUM',
      count: phoneMatches.length,
      message: `${phoneMatches.length} potential phone number(s) detected`
    });
  }

  // Check for email addresses
  const emailPattern = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
  const emailMatches = text.match(emailPattern);
  if (emailMatches) {
    issues.push({
      type: 'EMAIL',
      severity: 'MEDIUM',
      count: emailMatches.length,
      message: `${emailMatches.length} email address(es) detected`
    });
  }

  return issues;
}

/**
 * Check if validation issues contain high severity items
 * @param {Array} issues - Array of validation issues
 * @returns {boolean} True if high severity issues found
 */
export function hasHighSeverityIssues(issues) {
  return issues.some(issue => issue.severity === 'HIGH');
}

/**
 * Format validation issues for logging
 * @param {Array} issues - Array of validation issues
 * @returns {string} Formatted string of issues
 */
export function formatIssues(issues) {
  if (issues.length === 0) {
    return 'No PII detected';
  }
  
  return issues.map(issue => 
    `${issue.severity}: ${issue.message}`
  ).join('; ');
}
