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

  // Check for patient name patterns (but exclude doctor names)
  const namePatterns = [
    /\bPatient[:\s]+([A-Z][a-z]+\s+[A-Z][a-z]+)/gi,
    /\bName[:\s]+([A-Z][a-z]+\s+[A-Z][a-z]+)/gi,
    /\bMr\.?\s+[A-Z][a-z]+(?!\s*\(Dr)/gi,
    /\bMrs\.?\s+[A-Z][a-z]+(?!\s*\(Dr)/gi,
    /\bMiss\.?\s+[A-Z][a-z]+(?!\s*\(Dr)/gi,
    /\bMs\.?\s+[A-Z][a-z]+(?!\s*\(Dr)/gi,
  ];
  
  let nameCount = 0;
  namePatterns.forEach(pattern => {
    const matches = text.match(pattern);
    if (matches) {
      // Filter out doctor names (those followed by "(Dr)" or "Dr)")
      const filtered = matches.filter(match => {
        const index = text.indexOf(match);
        const afterMatch = text.substring(index + match.length, index + match.length + 10);
        return !afterMatch.includes('(Dr)') && !afterMatch.includes('Dr)');
      });
      nameCount += filtered.length;
    }
  });
  
  if (nameCount > 0) {
    issues.push({
      type: 'PATIENT_NAME',
      severity: 'HIGH',
      count: nameCount,
      message: `${nameCount} potential patient name(s) detected`
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
