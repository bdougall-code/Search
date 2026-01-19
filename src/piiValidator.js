import OpenAI from 'openai';
import { config } from './config.js';

/**
 * PII (Personally Identifiable Information) Validator
 * Checks for patient identifiable information in consultation notes
 */

let openaiClient = null;

/**
 * Initialize OpenAI client for name detection
 */
function getOpenAIClient() {
  if (!openaiClient && config.openai.apiKey) {
    openaiClient = new OpenAI({ apiKey: config.openai.apiKey });
  }
  return openaiClient;
}

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

/**
 * Detect person names in text using AI (excluding medication and condition names)
 * @param {string} text - Text to analyze
 * @returns {Promise<Array>} Array of detected names with positions
 */
export async function detectPersonNames(text) {
  const client = getOpenAIClient();
  if (!client) {
    console.warn('OpenAI client not available for name detection');
    return [];
  }

  try {
    console.log('Detecting person names in text...');
    
    const prompt = `Analyze the following medical consultation text and identify ANY person names (patients, doctors, relatives, staff, etc.).

IMPORTANT EXCLUSIONS - DO NOT flag these:
- Medication names (e.g., Metformin, Aspirin, Paracetamol)
- Medical condition names (e.g., Diabetes, Hypertension)
- Medical terminology
- Anatomical terms
- Procedure names
- Hospital/clinic names

INCLUDE:
- Patient names
- Doctor/clinician names
- Family member names
- Any other person names

TEXT TO ANALYZE:
"""
${text.substring(0, 3000)}
"""

Return a JSON array of objects with this exact structure:
[
  {"name": "John Smith", "type": "person"},
  {"name": "Dr. Johnson", "type": "person"}
]

If NO person names are found, return an empty array: []

Return ONLY valid JSON, no other text.`;

    const response = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a medical text analyzer that identifies person names while excluding medication and condition names. Return only valid JSON.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.1,
      max_tokens: 500
    });

    const content = response.choices[0].message.content.trim();
    
    // Extract JSON from response (handle potential markdown code blocks)
    let jsonContent = content;
    if (content.includes('```')) {
      const match = content.match(/```(?:json)?\s*(\[[\s\S]*?\])\s*```/);
      if (match) {
        jsonContent = match[1];
      }
    }
    
    const names = JSON.parse(jsonContent);
    console.log(`✓ Detected ${names.length} person name(s)`);
    
    return Array.isArray(names) ? names : [];
    
  } catch (error) {
    console.error('Error detecting person names:', error);
    return [];
  }
}

/**
 * Convert a name to initials (e.g., "John Smith" -> "JS")
 * @param {string} name - Name to convert
 * @returns {string} Initials
 */
function nameToInitials(name) {
  return name
    .split(/\s+/)
    .filter(part => part.length > 0)
    .map(part => part[0].toUpperCase())
    .join('');
}

/**
 * Anonymize person names in text by replacing with initials
 * @param {string} text - Text to anonymize
 * @param {Array} names - Array of name objects from detectPersonNames
 * @returns {Object} {anonymizedText, replacements: [{original, replacement}]}
 */
export function anonymizeNames(text, names) {
  if (!names || names.length === 0) {
    return {
      anonymizedText: text,
      replacements: []
    };
  }

  let anonymizedText = text;
  const replacements = [];

  // Sort names by length (longest first) to avoid partial replacements
  const sortedNames = [...names].sort((a, b) => b.name.length - a.name.length);

  for (const nameObj of sortedNames) {
    const originalName = nameObj.name;
    const initials = nameToInitials(originalName);
    
    // Create case-insensitive regex to match the name
    // Use word boundaries to avoid partial matches
    const regex = new RegExp(`\\b${originalName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
    
    if (regex.test(anonymizedText)) {
      anonymizedText = anonymizedText.replace(regex, initials);
      replacements.push({
        original: originalName,
        replacement: initials
      });
    }
  }

  return {
    anonymizedText,
    replacements
  };
}

/**
 * Validate and anonymize consultation data
 * @param {string} text - Text to validate and anonymize
 * @returns {Promise<Object>} {issues, anonymizedText, nameReplacements}
 */
export async function validateAndAnonymize(text) {
  const issues = validateForPII(text);
  
  // Detect person names using AI
  const detectedNames = await detectPersonNames(text);
  
  // Anonymize names if found
  const { anonymizedText, replacements } = anonymizeNames(text, detectedNames);
  
  // Add names to issues list if found
  if (replacements.length > 0) {
    issues.push({
      type: 'PERSON_NAMES',
      severity: 'HIGH',
      count: replacements.length,
      message: `${replacements.length} person name(s) detected and replaced with initials`,
      replacements
    });
  }
  
  return {
    issues,
    anonymizedText,
    nameReplacements: replacements,
    hasNames: replacements.length > 0
  };
}
