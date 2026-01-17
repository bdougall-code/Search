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
    // Special handling for criterion 12 - check if there are any test results mentioned
    if (criterion.id === 12) {
      const hasTestResults = this.checkForTestResults(consultationText);
      if (!hasTestResults) {
        return {
          criterionId: criterion.id,
          criterionTitle: criterion.title,
          rating: 'acceptable',
          explanation: 'No radiology or pathology results were present in this consultation that required action. This criterion is rated as acceptable when no test results are applicable.',
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
            content: 'You are an expert medical auditor assessing GP consultation notes according to established clinical documentation standards. Apply rigorous professional standards and be thorough in your assessments. Documentation must clearly demonstrate safe clinical practice and comprehensive record-keeping. Missing or inadequate documentation should be highlighted even if it does not pose immediate safety risk. Only rate as "acceptable" when documentation clearly meets professional standards. When uncertain between ratings, apply the more critical assessment to encourage higher documentation standards.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.4, // Slightly higher for more nuanced assessments
        max_tokens: 500
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
- Rate as "Unacceptable" for clear patient safety concerns or major documentation failures
- Rate as "Concern" for missing information, inadequate detail, or documentation that falls short of best practice
- Rate as "Acceptable" only when documentation clearly meets comprehensive professional standards
- When deciding between two ratings, apply the more critical assessment to encourage higher standards
- Brief notes are acceptable only for truly routine matters with no complexity
- Documentation should demonstrate clear clinical reasoning and comprehensive care

Please provide your assessment in the following format:

RATING: [A/C/U]
EXPLANATION: [Detailed explanation of why you gave this rating, with specific evidence from the consultation note. Be thorough and identify areas for improvement.]

Be specific and quote relevant parts of the consultation note where appropriate.`;
  }

  /**
   * Extract rating from AI response
   */
  extractRating(aiResponse) {
    const ratingMatch = aiResponse.match(/RATING:\s*([ACU])/i);
    if (ratingMatch) {
      const rating = ratingMatch[1].toUpperCase();
      if (rating === 'A') return 'acceptable';
      if (rating === 'C') return 'concern';
      if (rating === 'U') return 'unacceptable';
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
    const issues = criteriaAssessments.filter(
      a => a.rating === 'concern' || a.rating === 'unacceptable'
    );
    
    if (issues.length === 0) {
      return ['Excellent work. Continue maintaining high documentation standards.'];
    }
    
    const recommendations = issues.map(issue => {
      const priority = issue.rating === 'unacceptable' ? 'HIGH PRIORITY' : 'IMPORTANT';
      return `[${priority}] ${issue.criterionTitle}: ${issue.explanation}`;
    });
    
    return recommendations;
  }
}

export const assessmentService = new AssessmentService();
