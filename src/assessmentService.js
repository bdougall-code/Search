import OpenAI from 'openai';
import { config } from './config.js';
import { assessmentCriteria, calculateScore } from './assessmentCriteria.js';

class AssessmentService {
  constructor() {
    if (!config.openai.apiKey) {
      throw new Error('OpenAI API key is required for GP consultation assessments');
    }
    this.openai = new OpenAI({ apiKey: config.openai.apiKey });
    console.log('✓ Assessment Service initialized with OpenAI');
  }

  /**
   * Assess a GP consultation transcript against all criteria
   * @param {string} consultationText - The GP consultation transcript
   * @param {Object} metadata - Additional metadata (patient ref, date, etc)
   * @returns {Promise<Object>} Complete assessment with ratings and RAG score
   */
  async assessConsultation(consultationText, metadata = {}) {
    try {
      console.log('Starting AI assessment of consultation...');
      const startTime = Date.now();
      
      // Assess all criteria in parallel for much faster processing
      const assessmentPromises = assessmentCriteria.map(criterion => 
        this.assessSingleCriterion(consultationText, criterion)
      );
      
      const criteriaAssessments = await Promise.all(assessmentPromises);
      
      console.log(`✓ Completed ${criteriaAssessments.length} criteria assessments in ${((Date.now() - startTime) / 1000).toFixed(1)}s`);
      
      // Extract just the ratings for score calculation
      const ratings = criteriaAssessments.map(a => a.rating);
      const scoreData = calculateScore(ratings);
      
      // Generate overall summary (done separately as it needs the results)
      const overallSummary = await this.generateOverallSummary(
        consultationText, 
        criteriaAssessments, 
        scoreData
      );
      
      const result = {
        metadata: {
          ...metadata,
          assessmentDate: new Date().toISOString(),
          consultationType: metadata.consultationType || 'Surgery consultation (new)'
        },
        consultationText,
        criteriaAssessments,
        scoring: scoreData,
        overallSummary,
        recommendations: await this.generateRecommendations(criteriaAssessments, scoreData)
      };
      
      console.log(`✓ Assessment complete. RAG Rating: ${scoreData.ragRating.rating} (${scoreData.percentage}%) - Total time: ${((Date.now() - startTime) / 1000).toFixed(1)}s`);
      
      return result;
      
    } catch (error) {
      console.error('Error assessing consultation:', error);
      throw error;
    }
  }

  /**
   * Assess a single criterion against the consultation
   * @param {string} consultationText 
   * @param {Object} criterion 
   * @returns {Promise<Object>}
   */
  async assessSingleCriterion(consultationText, criterion) {
    // Check for DNA/Failed encounter first - mark most criteria as not-relevant
    const isDNAorFailed = this.isDNAorFailedEncounter(consultationText);
    if (isDNAorFailed) {
      // For DNA/Failed encounters, only safety netting (criterion 11) is relevant
      // All other criteria should be marked as not-relevant
      if (criterion.id !== 11) {
        return {
          criterionId: criterion.id,
          criterionTitle: criterion.title,
          rating: 'not-relevant',
          explanation: 'This is a Did Not Attend (DNA) or failed encounter. Most clinical criteria are not applicable, but safety netting should still be assessed.',
          evidence: this.extractEvidence(consultationText, criterion)
        };
      }
      // Criterion 11 (safety netting) will continue to be assessed normally for DNA
    }
    
    // Special handling for criterion 2 - Read coding
    if (criterion.id === 2) {
      const hasReadCode = this.checkForReadCode(consultationText);
      if (hasReadCode) {
        return {
          criterionId: criterion.id,
          criterionTitle: criterion.title,
          rating: 'acceptable',
          explanation: 'Problem is appropriately documented and coded. "Problem:" field is present with a diagnosis.',
          evidence: this.extractEvidence(consultationText, criterion)
        };
      }
    }
    
    // Special handling for criterion 5 - examination
    // Mark as not-relevant for telephone consultations
    if (criterion.id === 5) {
      const isTelephone = this.isTelephoneConsultation(consultationText);
      if (isTelephone) {
        return {
          criterionId: criterion.id,
          criterionTitle: criterion.title,
          rating: 'not-relevant',
          explanation: 'This is a telephone consultation where physical examination is not possible. This criterion is not relevant and is excluded from scoring.',
          evidence: this.extractEvidence(consultationText, criterion)
        };
      }
    }
    
    // Special handling for criterion 7, 8, 9 - prescribing-related criteria
    // Mark as not-relevant if nothing was prescribed
    if ([7, 8, 9].includes(criterion.id)) {
      const hasPrescription = this.hasPrescribing(consultationText);
      if (!hasPrescription) {
        return {
          criterionId: criterion.id,
          criterionTitle: criterion.title,
          rating: 'not-relevant',
          explanation: 'No prescription was issued during this consultation. This prescribing criterion is not relevant and is excluded from scoring.',
          evidence: this.extractEvidence(consultationText, criterion)
        };
      }
    }
    
    // Special handling for criterion 12 - check if there are any test results mentioned
    if (criterion.id === 12) {
      const hasTestResults = this.checkForTestResults(consultationText);
      if (!hasTestResults) {
        return {
          criterionId: criterion.id,
          criterionTitle: criterion.title,
          rating: 'not-relevant',
          explanation: 'No radiology or pathology results were present in this consultation that required action. This criterion is not relevant and is excluded from scoring.',
          evidence: this.extractEvidence(consultationText, criterion)
        };
      }
    }

    const prompt = this.buildCriterionPrompt(consultationText, criterion);
    
    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are an expert medical auditor with a highly supportive and pragmatic approach. Assess GP consultation notes with the understanding that clinical excellence is demonstrated through safe patient care, not perfect documentation. GPs work under extreme time pressure and document what is essential. Rate as "acceptable" whenever patient safety is maintained and basic clinical information is present, regardless of how brief or informal the documentation. Assume good clinical practice and sound decision-making unless there is explicit evidence of risk. When uncertain, always choose the more favorable rating. Only rate as "concern" if there is obvious concern about patient care, and only "unacceptable" if there is clear danger to the patient. Give full credit for standard clinical practice even when not documented. Interpret documentation generously and assume missing details were appropriately considered by the clinician.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.4, // Slightly higher for more nuanced assessments
        max_tokens: 300 // Reduced from 500 for faster responses
      });
      
      const aiResponse = response.choices[0].message.content;
      const rating = this.extractRating(aiResponse);
      const explanation = this.extractExplanation(aiResponse);
      
      return {
        criterionId: criterion.id,
        criterionTitle: criterion.title,
        rating,
        explanation,
        evidence: this.extractEvidence(consultationText, criterion)
      };
      
    } catch (error) {
      console.error(`Error assessing criterion ${criterion.id}:`, error);
      throw error;
    }
  }

  /**
   * Check if consultation mentions test results that need action
   */
  checkForTestResults(consultationText) {
    const testKeywords = [
      'blood test', 'blood result', 'lab result', 'laboratory', 
      'x-ray', 'xray', 'scan', 'mri', 'ct scan', 'ultrasound',
      'radiology', 'pathology', 'biopsy', 'culture',
      'test result', 'investigation result', 'ecg', 'ekg'
    ];
    
    const lowerText = consultationText.toLowerCase();
    return testKeywords.some(keyword => lowerText.includes(keyword));
  }

  /**
   * Check if this is a telephone consultation
   */
  isTelephoneConsultation(consultationText) {
    const telephoneKeywords = [
      'telephone', 'phone', 'tel:', 'telephon', 'phone call',
      'spoke to patient', 'called patient', 'patient called',
      'telephone consultation', 'phone consultation'
    ];
    
    const lowerText = consultationText.toLowerCase();
    return telephoneKeywords.some(keyword => lowerText.includes(keyword));
  }

  /**
   * Check if consultation is a DNA (Did Not Attend) or failed encounter
   */
  isDNAorFailedEncounter(consultationText) {
    const dnaKeywords = [
      'did not attend', 'dna', 'did not show', 'failed to attend',
      'patient did not attend', 'no show', 'didn\'t attend',
      'failed encounter', 'failed appointment', 'missed appointment',
      'unable to contact', 'no answer', 'failed to answer'
    ];
    
    const lowerText = consultationText.toLowerCase();
    return dnaKeywords.some(keyword => lowerText.includes(keyword));
  }

  /**
   * Check if anything was prescribed in the consultation
   */
  hasPrescribing(consultationText) {
    const prescribingKeywords = [
      'prescribed', 'prescription', 'rx:', 'medication:', 'drug:',
      'treatment:', 'dispense', 'supply', 'mg', 'ml', 'tablets',
      'capsules', 'dose', 'dosage', 'once daily', 'twice daily',
      'bd', 'tds', 'qds', 'prn'
    ];
    
    const lowerText = consultationText.toLowerCase();
    return prescribingKeywords.some(keyword => lowerText.includes(keyword));
  }

  /**
   * Check if consultation has Read code - looks for "Problem:" followed by a diagnosis
   */
  checkForReadCode(consultationText) {
    // Check for "Problem:" or "Problem" followed by text (diagnosis)
    const problemPattern = /Problem:?\s+([A-Za-z][A-Za-z0-9\s,.-]+)/i;
    const match = consultationText.match(problemPattern);
    
    if (match && match[1].trim().length > 2) {
      // Found "Problem:" followed by actual text (diagnosis)
      return true;
    }
    
    return false;
  }

  /**
   * Build the prompt for assessing a single criterion
   */
  buildCriterionPrompt(consultationText, criterion) {
    let ratingsText = '';
    if (criterion.ratings.acceptable) {
      ratingsText += `\n- ACCEPTABLE (A): ${criterion.ratings.acceptable}`;
    }
    if (criterion.ratings.concern) {
      ratingsText += `\n- CAUSE FOR CONCERN (C): ${criterion.ratings.concern}`;
    }
    if (criterion.ratings.unacceptable) {
      ratingsText += `\n- UNACCEPTABLE (U): ${criterion.ratings.unacceptable}`;
    }
    ratingsText += `\n- NOT RELEVANT (N): This criterion is not applicable to this consultation type and should be excluded from assessment`;

    return `You are assessing a GP consultation note against the following criterion:

CRITERION ${criterion.id}: ${criterion.title}

RATING DEFINITIONS:${ratingsText}

CONSULTATION NOTE TO ASSESS:
"""
${consultationText}
"""

ASSESSMENT GUIDANCE:
- Apply rigorous professional documentation standards
- Assess what IS documented but also critically evaluate gaps and omissions
- Consider clinical context but maintain high standards for documentation quality
- Use NOT RELEVANT (N) when a criterion genuinely doesn't apply to the consultation (e.g., prescribing when nothing prescribed, examination for telephone consultations)
- Rate as "Unacceptable" for clear patient safety concerns or major documentation failures
- Rate as "Concern" for missing information, inadequate detail, or documentation that falls short of best practice
- Rate as "Acceptable" only when documentation clearly meets comprehensive professional standards
- When deciding between two ratings, apply the more critical assessment to encourage higher standards
- Brief notes are acceptable only for truly routine matters with no complexity
- Documentation should demonstrate clear clinical reasoning and comprehensive care

Please provide your assessment in the following format:

RATING: [A/C/U/N]
EXPLANATION: [Detailed explanation of why you gave this rating, with specific evidence from the consultation note. Be thorough and identify areas for improvement.]

Be specific and quote relevant parts of the consultation note where appropriate.`;
  }

  /**
   * Extract rating from AI response
   */
  extractRating(aiResponse) {
    const ratingMatch = aiResponse.match(/RATING:\s*([ACUN])/i);
    if (ratingMatch) {
      const rating = ratingMatch[1].toUpperCase();
      if (rating === 'A') return 'acceptable';
      if (rating === 'C') return 'concern';
      if (rating === 'U') return 'unacceptable';
      if (rating === 'N') return 'not-relevant';
    }
    // Default to concern if unclear
    return 'concern';
  }

  /**
   * Extract explanation from AI response
   */
  extractExplanation(aiResponse) {
    const explanationMatch = aiResponse.match(/EXPLANATION:\s*(.+?)(?=\n\n|$)/is);
    return explanationMatch ? explanationMatch[1].trim() : aiResponse;
  }

  /**
   * Extract relevant evidence from consultation text
   */
  extractEvidence(consultationText, criterion) {
    // Return a snippet of the consultation for context
    return consultationText.length > 200 
      ? consultationText.substring(0, 200) + '...' 
      : consultationText;
  }

  /**
   * Generate overall summary of the consultation assessment
   */
  async generateOverallSummary(consultationText, criteriaAssessments, scoreData) {
    const concernsAndUnacceptable = criteriaAssessments.filter(
      a => a.rating === 'concern' || a.rating === 'unacceptable'
    );
    
    const prompt = `Based on this GP consultation assessment:

CONSULTATION NOTE:
"""
${consultationText.substring(0, 500)}...
"""

SCORE: ${scoreData.percentage}% (${scoreData.ragRating.rating})
- Acceptable: ${scoreData.acceptable}/${scoreData.total}
- Concern: ${scoreData.concern}/${scoreData.total}
- Unacceptable: ${scoreData.unacceptable}/${scoreData.total}

KEY ISSUES IDENTIFIED:
${concernsAndUnacceptable.map(a => `- ${a.criterionTitle}: ${a.explanation}`).join('\n')}

Provide a brief overall assessment summary (2-3 sentences) highlighting the main strengths and areas for improvement.`;

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are an expert medical auditor providing constructive feedback on GP consultation documentation.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.5,
        max_tokens: 300
      });
      
      return response.choices[0].message.content.trim();
    } catch (error) {
      console.error('Error generating summary:', error);
      return 'Overall assessment summary unavailable.';
    }
  }

  /**
   * Generate specific recommendations for improvement
   */
  async generateRecommendations(criteriaAssessments, scoreData) {
    // Recommendations removed as they duplicate the detailed criteria assessment
    return [];
  }
}

export const assessmentService = new AssessmentService();
