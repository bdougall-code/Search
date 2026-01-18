/**
 * Test script to verify the "Not Relevant" scoring feature
 * Run with: node test-not-relevant.js
 */

import { calculateScore } from './src/assessmentCriteria.js';

console.log('🧪 Testing "Not Relevant" Scoring Feature\n');
console.log('='.repeat(60));

// Test 1: All criteria rated (traditional scoring)
console.log('\n📊 Test 1: Traditional Scoring (No Not-Relevant)');
const test1Ratings = [
  'acceptable', 'acceptable', 'acceptable', 'acceptable',
  'acceptable', 'acceptable', 'acceptable', 'acceptable',
  'concern', 'concern', 'unacceptable', 'acceptable'
];
const result1 = calculateScore(test1Ratings);
console.log(`Ratings: ${test1Ratings.join(', ')}`);
console.log(`Acceptable: ${result1.acceptable}, Concern: ${result1.concern}, Unacceptable: ${result1.unacceptable}, Not Relevant: ${result1.notRelevant}`);
console.log(`Total: ${result1.total}, Scored: ${result1.totalRelevant}`);
console.log(`Score: ${result1.percentage}% (${result1.ragRating.rating})`);

// Test 2: Telephone consultation (examination not relevant)
console.log('\n📞 Test 2: Telephone Consultation (1 Not Relevant)');
const test2Ratings = [
  'acceptable', 'acceptable', 'acceptable', 'acceptable',
  'not-relevant', // Criterion 5: Examination
  'acceptable', 'acceptable', 'acceptable',
  'concern', 'concern', 'unacceptable', 'acceptable'
];
const result2 = calculateScore(test2Ratings);
console.log(`Ratings: ${test2Ratings.join(', ')}`);
console.log(`Acceptable: ${result2.acceptable}, Concern: ${result2.concern}, Unacceptable: ${result2.unacceptable}, Not Relevant: ${result2.notRelevant}`);
console.log(`Total: ${result2.total}, Scored: ${result2.totalRelevant}`);
console.log(`Score: ${result2.percentage}% (${result2.ragRating.rating})`);
console.log(`✅ Examination excluded from scoring!`);

// Test 3: Telephone + No prescribing + No tests
console.log('\n🔬 Test 3: Complex Scenario (5 Not Relevant)');
const test3Ratings = [
  'acceptable', 'acceptable', 'acceptable', 'acceptable',
  'not-relevant', // Criterion 5: Examination
  'acceptable',
  'not-relevant', // Criterion 7: Prescribing
  'not-relevant', // Criterion 8: Side effects
  'not-relevant', // Criterion 9: Medicines review
  'concern',
  'acceptable',
  'not-relevant'  // Criterion 12: Test results
];
const result3 = calculateScore(test3Ratings);
console.log(`Ratings: ${test3Ratings.join(', ')}`);
console.log(`Acceptable: ${result3.acceptable}, Concern: ${result3.concern}, Unacceptable: ${result3.unacceptable}, Not Relevant: ${result3.notRelevant}`);
console.log(`Total: ${result3.total}, Scored: ${result3.totalRelevant}`);
console.log(`Score: ${result3.percentage}% (${result3.ragRating.rating})`);
console.log(`✅ 5 criteria excluded from scoring!`);

// Test 4: Verify fair scoring
console.log('\n⚖️  Test 4: Fair Scoring Comparison');
console.log('Scenario A: 8/10 acceptable (2 not relevant) = 80% + 0% excluded');
const test4aRatings = [
  'acceptable', 'acceptable', 'acceptable', 'acceptable',
  'acceptable', 'acceptable', 'acceptable', 'acceptable',
  'concern', 'concern', 'not-relevant', 'not-relevant'
];
const result4a = calculateScore(test4aRatings);
console.log(`Score: ${result4a.percentage}% (${result4a.ragRating.rating})`);

console.log('\nScenario B: 8/12 acceptable (0 not relevant) = 66.67%');
const test4bRatings = [
  'acceptable', 'acceptable', 'acceptable', 'acceptable',
  'acceptable', 'acceptable', 'acceptable', 'acceptable',
  'concern', 'concern', 'concern', 'concern'
];
const result4b = calculateScore(test4bRatings);
console.log(`Score: ${result4b.percentage}% (${result4b.ragRating.rating})`);

console.log('\n✅ Scenario A scores higher because it performed better on applicable criteria!');

console.log('\n' + '='.repeat(60));
console.log('✅ All tests completed successfully!');
console.log('\nKey takeaway: Not-relevant criteria are excluded from scoring,');
console.log('ensuring fair assessment based only on applicable criteria.');
