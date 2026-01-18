# Not Relevant Scoring Feature

## Overview
Added a "Not Relevant" scoring tier that intelligently excludes criteria from assessment when they don't apply to the consultation type.

## Key Changes

### 1. New Rating Tier: "Not Relevant" (N)
- Added alongside the existing Acceptable (A), Concern (C), and Unacceptable (U) ratings
- Criteria marked as "Not Relevant" are **completely excluded** from scoring calculations
- Displayed with gray styling and reduced opacity in the UI

### 2. Automatic Detection & Exclusion

#### Telephone Consultations
- **Criterion 5 (Examination)** is automatically marked as "Not Relevant"
- Detection keywords: "telephone", "phone", "tel:", "phone call", etc.
- Rationale: Physical examination is not possible in telephone consultations

#### No Prescribing
- **Criteria 7, 8, 9** (Prescribing-related) are automatically marked as "Not Relevant" when nothing is prescribed
- Detection keywords: "prescribed", "prescription", "rx:", "medication:", "tablets", etc.
- Rationale: Prescribing criteria don't apply when no medication is issued

#### No Test Results
- **Criterion 12** (Test Results) automatically marked as "Not Relevant" when no test results are present
- Detection keywords: "blood test", "x-ray", "scan", "pathology", etc.
- Rationale: Can't assess test result management if no results exist

### 3. Score Calculation
The scoring system now:
- Counts "Not Relevant" criteria separately
- **Excludes them from the total when calculating percentage**
- Shows both "Total Criteria" (12) and "Scored Criteria" (e.g., 10 if 2 are not relevant)

**Formula:**
```
totalRelevant = total criteria - notRelevantCount
percentage = (acceptable + concern * 0.6) / totalRelevant * 100
```

### 4. UI Updates

All HTML pages updated to display:
- **Not Relevant count** in statistics
- **Scored Criteria** count (showing how many were actually assessed)
- **Gray styling** for not-relevant items with reduced opacity
- **Gray badge** for not-relevant ratings

Updated files:
- [index.html](public/index.html) - Explained the four-tier system
- [assessment.html](public/assessment.html) - Assessment form and results
- [result.html](public/result.html) - Individual assessment display
- [audit.html](public/audit.html) - Audit reports

### 5. AI Prompt Enhancement
The AI assessment prompt now:
- Includes "NOT RELEVANT (N)" as a rating option
- Provides guidance on when to use it
- Can intelligently determine if a criterion applies to the consultation context

## Example Scenarios

### Telephone Consultation
```
12 total criteria
- 1 marked as "Not Relevant" (Examination)
= 11 scored criteria
Score calculated based on 11 relevant criteria
```

### Telephone + No Prescribing + No Tests
```
12 total criteria
- 1 not relevant (Examination)
- 3 not relevant (Prescribing criteria 7, 8, 9)
- 1 not relevant (Test results)
= 7 scored criteria
Score calculated based on 7 relevant criteria
```

## Benefits

1. **Fair Assessment**: Doctors aren't penalized for criteria that don't apply
2. **Accurate Scoring**: Percentage reflects performance on applicable criteria only
3. **Transparent**: Clear visibility of what was assessed vs excluded
4. **Automatic**: Smart detection reduces manual effort
5. **Flexible**: AI can also manually mark criteria as not relevant based on context

## Technical Implementation

### Files Modified
- [assessmentCriteria.js](src/assessmentCriteria.js) - Updated `calculateScore()` function
- [assessmentService.js](src/assessmentService.js) - Added detection methods and auto-marking logic
- All HTML files in [public/](public/) - Updated UI components

### New Functions
- `isTelephoneConsultation()` - Detects telephone consultations
- `hasPrescribing()` - Detects if anything was prescribed
- Updated `assessSingleCriterion()` - Auto-marks not-relevant criteria
- Updated `calculateScore()` - Excludes not-relevant from calculations

## Testing Recommendations

1. Test with telephone consultation notes (should auto-exclude examination)
2. Test with consultations that have no prescribing (should auto-exclude criteria 7, 8, 9)
3. Test with consultations that have no test results (should auto-exclude criterion 12)
4. Verify percentage calculation is based on scored criteria only
5. Check UI displays not-relevant counts correctly
