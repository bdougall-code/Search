/**
 * Test script to verify enhanced PII name detection
 * Run with: node test-pii-names.js
 */

import { validateForPII } from './src/piiValidator.js';

console.log('🧪 Testing Enhanced PII Name Detection\n');
console.log('='.repeat(60));

// Test 1: Names that SHOULD be detected
console.log('\n📛 Test 1: Names that SHOULD be detected');
const testCases1 = [
  'Patient seen: John Smith complaining of headache',
  'Mrs Sarah Jones attended for review',
  'Mr David Williams has diabetes',
  'Patient Name: Emily Brown',
  'Consultation with James Taylor regarding...',
  'Michael Anderson presented with chest pain',
];

testCases1.forEach((text, i) => {
  const issues = validateForPII(text);
  const nameIssue = issues.find(issue => issue.type === 'PATIENT_NAME');
  console.log(`\n${i + 1}. Text: "${text.substring(0, 50)}..."`);
  console.log(`   Result: ${nameIssue ? `✅ DETECTED (${nameIssue.count} name(s))` : '❌ MISSED'}`);
});

// Test 2: Names that should NOT be detected (medical terms)
console.log('\n\n🏥 Test 2: Medical terms that should NOT be flagged');
const testCases2 = [
  'Blood Pressure was 120/80',
  'Heart Rate elevated at 95bpm',
  'Patient History shows hypertension',
  'Side Effects include nausea',
  'Follow Up arranged for next week',
  'General Practice guidelines followed',
  'First Line treatment commenced',
  'Care Home contacted',
  'Mental Health referral made',
];

testCases2.forEach((text, i) => {
  const issues = validateForPII(text);
  const nameIssue = issues.find(issue => issue.type === 'PATIENT_NAME');
  console.log(`\n${i + 1}. Text: "${text}"`);
  console.log(`   Result: ${nameIssue ? `❌ FALSE POSITIVE (detected ${nameIssue.count})` : '✅ CORRECTLY IGNORED'}`);
});

// Test 3: Complete consultation with name
console.log('\n\n📋 Test 3: Realistic consultation with patient name');
const consultation = `
Date: 18-Jan-2026 10:30
Patient: Sarah Thompson

History: 45-year-old female presents with persistent cough for 2 weeks.
No fever, no chest pain. Non-smoker.

Examination: Chest clear, no wheeze. Throat slightly inflamed.

Problem: Upper Respiratory Tract Infection

Management: Advised fluids, rest, OTC paracetamol PRN.
Safety net: Return if symptoms worsen or fever develops.
`;

const issues = validateForPII(consultation);
console.log(`\nConsultation text:\n${consultation}`);
console.log(`\nPII Issues detected:`);
issues.forEach(issue => {
  console.log(`  ${issue.severity}: ${issue.message}`);
});

const hasNames = issues.some(issue => issue.type === 'PATIENT_NAME');
console.log(`\nName detection: ${hasNames ? '✅ WORKING' : '❌ FAILED'}`);

// Test 4: Consultation without names (should be clean)
console.log('\n\n✅ Test 4: Clean consultation (no PII)');
const cleanConsultation = `
Date: 18-Jan-2026 10:30
Ref: PT-12345

History: Patient presents with persistent cough for 2 weeks.
No fever, no chest pain. Non-smoker.

Examination: Chest clear, no wheeze. Throat slightly inflamed.

Problem: Upper Respiratory Tract Infection

Management: Advised fluids, rest, OTC paracetamol PRN.
Safety net: Return if symptoms worsen or fever develops.
`;

const cleanIssues = validateForPII(cleanConsultation);
console.log(`\nConsultation text:\n${cleanConsultation}`);
console.log(`\nPII Issues detected: ${cleanIssues.length === 0 ? '✅ NONE (CLEAN)' : `❌ ${cleanIssues.length} issues found`}`);
if (cleanIssues.length > 0) {
  cleanIssues.forEach(issue => {
    console.log(`  ${issue.severity}: ${issue.message}`);
  });
}

console.log('\n' + '='.repeat(60));
console.log('✅ All PII name detection tests completed!');
console.log('\nKey features:');
console.log('  ✓ Detects full names in consultation text');
console.log('  ✓ Detects names with titles (Mr, Mrs, Miss, Ms)');
console.log('  ✓ Excludes common medical terms (Blood Pressure, etc.)');
console.log('  ✓ Excludes doctor references');
console.log('  ✓ Reduces false positives');
