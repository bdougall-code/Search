import { assessmentService } from './assessmentService.js';
import { calculateScore } from './assessmentCriteria.js';
import { database } from './database.js';

/**
 * Medical Audit Service
 * Handles both Rapid Reviews (2 consultations) and Full Reviews (10+ consultations)
 */
class AuditService {
  constructor() {
    this.assessmentService = assessmentService;
    // Batch size for parallel processing - adjust based on API rate limits
    // Higher = faster but may hit rate limits, Lower = slower but more stable
    // 10 = Maximum speed for typical audits (~30-60s for 10 notes)
    // 5 = Balanced approach (safer for rate limits)
    // 3 = Conservative (best for slower connections)
    this.batchSize = 10; // Process 10 consultations at a time for maximum speed
    console.log('✓ Audit Service initialized with batch size:', this.batchSize);
  }

  /**
   * Parse consultation text in the format provided by the user
   * @param {string} consultationData - Raw consultation data
   * @returns {Array} Array of parsed consultation objects
   */
  parseConsultations(consultationData) {
    const consultations = [];
    const lines = consultationData.trim().split('\n');
    let currentConsultation = null;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Check if line starts with "Date" header (skip it)
      if (line.startsWith('Date') && line.includes('Consultation Text')) {
        continue;
      }
      
      // Check for UUID-prefixed format (UUID followed by date)
      // Format: UUID   DD-MMM-YYYY Face to face consultation...
      const uuidDateMatch = line.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\s+(\d{1,2}-[A-Za-z]{3}-\d{4})\s+(.+)/i);
      
      if (uuidDateMatch) {
        // Save previous consultation if exists
        if (currentConsultation) {
          consultations.push(currentConsultation);
        }
        
        // Start new consultation (UUID format without time, use 00:00 as default)
        currentConsultation = {
          date: uuidDateMatch[1] + ' 00:00',
          text: uuidDateMatch[2],
          fullText: line
        };
      } else {
        // Check for standard date pattern (DD-MMM-YYYY HH:MM)
        const dateMatch = line.match(/^(\d{1,2}-[A-Za-z]{3}-\d{4}\s+\d{1,2}:\d{2})\s+(.+)/);
        
        if (dateMatch) {
          // Save previous consultation if exists
          if (currentConsultation) {
            consultations.push(currentConsultation);
          }
          
          // Start new consultation
          currentConsultation = {
            date: dateMatch[1],
            text: dateMatch[2],
            fullText: line
          };
        } else if (currentConsultation && line) {
          // Continue building current consultation text
          currentConsultation.text += '\n' + line;
          currentConsultation.fullText += '\n' + line;
        }
      }
    }
    
    // Add the last consultation
    if (currentConsultation) {
      consultations.push(currentConsultation);
    }
    
    return consultations;
  }

  /**
   * Conduct a Rapid Review (2 consultations)
   * @param {string} consultationData - Raw consultation text with 2 consultations
   * @param {Object} auditMetadata - Metadata for the audit (doctorInitials, referenceNumber)
   * @returns {Promise<Object>} Rapid review results
   */
  async conductRapidReview(consultationData, auditMetadata = {}) {
    console.log('\n=== STARTING RAPID REVIEW (2 Consultations) ===\n');
    const startTime = Date.now();
    
    // Parse the consultations
    const consultations = this.parseConsultations(consultationData);
    
    if (consultations.length !== 2) {
      throw new Error(`Rapid Review requires exactly 2 consultations. Found: ${consultations.length}`);
    }
    
    // Assess all consultations in parallel for maximum speed
    console.log(`\nAssessing ${consultations.length} consultations in parallel...`);
    
    const assessmentPromises = consultations.map((consultation, i) => {
      console.log(`Queued: Consultation ${i + 1} (${consultation.date})`);
      return this.assessmentService.assessConsultation(
        consultation.fullText,
        {
          consultationNumber: i + 1,
          consultationDate: consultation.date,
          reviewType: 'Rapid Review',
          doctorInitials: auditMetadata.doctorInitials,
          referenceNumber: auditMetadata.referenceNumber,
          auditDate: new Date().toISOString()
        }
      ).then(assessment => ({
        consultationNumber: i + 1,
        consultationDate: consultation.date,
        consultationText: consultation.fullText,
        assessment
      }));
    });
    
    const individualAssessments = await Promise.all(assessmentPromises);
    console.log(`\n✓ All ${consultations.length} consultations assessed`);
    
    // Save each assessment to database
    await this.saveAssessmentsToDatabase(individualAssessments);
    
    // Calculate summary statistics
    const summary = this.calculateReviewSummary(individualAssessments);
    
    const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`\n✓ Rapid Review complete in ${totalTime}s`);
    console.log(`Overall Score: ${summary.averageScore.toFixed(1)}%`);
    console.log(`RAG Rating: ${summary.overallRAG}`);
    
    return {
      reviewType: 'Rapid Review',
      totalConsultations: consultations.length,
      completedAt: new Date().toISOString(),
      processingTime: totalTime,
      individualAssessments,
      summary
    };
  }

  /**
   * Conduct a Full Review (10+ consultations)
   * @param {string} consultationData - Raw consultation text with 10+ consultations
   * @param {Object} auditMetadata - Metadata for the audit (doctorInitials, referenceNumber)
   * @returns {Promise<Object>} Full review results
   */
  async conductFullReview(consultationData, auditMetadata = {}) {
    console.log('\n=== STARTING FULL REVIEW (10+ Consultations) ===\n');
    const startTime = Date.now();
    
    // Parse the consultations
    const consultations = this.parseConsultations(consultationData);
    
    if (consultations.length < 10) {
      throw new Error(`Full Review requires at least 10 consultations. Found: ${consultations.length}`);
    }
    
    console.log(`Found ${consultations.length} consultations to review\n`);
    
    // Process consultations in parallel batches to avoid overwhelming the API
    // Batch size of 5 consultations at a time is a good balance
    const batchSize = this.batchSize;
    const individualAssessments = [];
    
    for (let batchStart = 0; batchStart < consultations.length; batchStart += batchSize) {
      const batchEnd = Math.min(batchStart + batchSize, consultations.length);
      const batch = consultations.slice(batchStart, batchEnd);
      
      console.log(`\nProcessing batch: Consultations ${batchStart + 1}-${batchEnd}...`);
      
      const batchPromises = batch.map((consultation, i) => {
        const consultationNumber = batchStart + i + 1;
        console.log(`  Queued: Consultation ${consultationNumber} (${consultation.date})`);
        return this.assessmentService.assessConsultation(
          consultation.fullText,
          {
            consultationNumber,
            consultationDate: consultation.date,
            reviewType: 'Full Review',
            doctorInitials: auditMetadata.doctorInitials,
            referenceNumber: auditMetadata.referenceNumber,
            auditDate: new Date().toISOString()
          }
        ).then(assessment => ({
          consultationNumber,
          consultationDate: consultation.date,
          consultationText: consultation.fullText,
          assessment
        }));
      });
      
      const batchResults = await Promise.all(batchPromises);
      individualAssessments.push(...batchResults);
      console.log(`  ✓ Batch complete (${batchResults.length} consultations)`);
    }
    
    console.log(`\n✓ All ${consultations.length} consultations assessed`);
    
    // Save each assessment to database
    await this.saveAssessmentsToDatabase(individualAssessments);
    
    // Calculate comprehensive summary statistics
    const summary = this.calculateReviewSummary(individualAssessments);
    
    // Generate detailed analysis for full review
    const detailedAnalysis = this.generateDetailedAnalysis(individualAssessments);
    
    const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`\n✓ Full Review complete in ${totalTime}s`);
    console.log(`Overall Score: ${summary.averageScore.toFixed(1)}%`);
    console.log(`RAG Rating: ${summary.overallRAG}`);
    
    return {
      reviewType: 'Full Review',
      totalConsultations: consultations.length,
      completedAt: new Date().toISOString(),
      processingTime: totalTime,
      individualAssessments,
      summary,
      detailedAnalysis
    };
  }

  /**
   * Save assessments to database for history tracking
   * @param {Array} individualAssessments - Array of individual consultation assessments
   */
  async saveAssessmentsToDatabase(individualAssessments) {
    try {
      const collection = database.getCollection();
      const documentsToInsert = individualAssessments.map(item => ({
        type: 'gp_consultation_assessment',
        consultationText: item.assessment.consultationText,
        metadata: item.assessment.metadata,
        ragRating: item.assessment.scoring.ragRating.rating,
        score: item.assessment.scoring.percentage,
        assessment: item.assessment,
        createdAt: new Date(),
        updatedAt: new Date()
      }));
      
      if (documentsToInsert.length > 0) {
        await collection.insertMany(documentsToInsert);
        console.log(`✓ Saved ${documentsToInsert.length} assessments to database`);
      }
    } catch (error) {
      console.error('Error saving assessments to database:', error);
      // Don't throw - assessment results are still valid even if save fails
    }
  }

  /**
   * Calculate summary statistics across all consultations
   * @param {Array} individualAssessments - Array of individual consultation assessments
   * @returns {Object} Summary statistics
   */
  calculateReviewSummary(individualAssessments) {
    const scores = individualAssessments.map(a => a.assessment.scoring.percentage);
    const averageScore = scores.reduce((sum, score) => sum + score, 0) / scores.length;
    
    // Count RAG ratings
    const ragCounts = {
      GREEN: 0,
      YELLOW: 0,
      AMBER: 0,
      RED: 0
    };
    
    individualAssessments.forEach(a => {
      const rag = a.assessment.scoring.ragRating.rating;
      ragCounts[rag]++;
    });
    
    // Determine overall RAG based on average score
    let overallRAG;
    if (averageScore >= 90) overallRAG = 'GREEN';
    else if (averageScore >= 70) overallRAG = 'YELLOW';
    else if (averageScore >= 50) overallRAG = 'AMBER';
    else overallRAG = 'RED';
    
    // Calculate criteria-level statistics
    const criteriaStats = this.calculateCriteriaStatistics(individualAssessments);
    
    return {
      averageScore: Math.round(averageScore * 100) / 100,
      overallRAG,
      ragDistribution: ragCounts,
      highestScore: Math.max(...scores),
      lowestScore: Math.min(...scores),
      criteriaStats
    };
  }

  /**
   * Calculate statistics for each criterion across all consultations
   * @param {Array} individualAssessments 
   * @returns {Array} Criteria statistics
   */
  calculateCriteriaStatistics(individualAssessments) {
    const criteriaMap = new Map();
    
    individualAssessments.forEach(assessment => {
      assessment.assessment.criteriaAssessments.forEach(criteria => {
        if (!criteriaMap.has(criteria.criterionId)) {
          criteriaMap.set(criteria.criterionId, {
            criterionId: criteria.criterionId,
            criterionTitle: criteria.criterionTitle,
            acceptable: 0,
            concern: 0,
            unacceptable: 0,
            total: 0
          });
        }
        
        const stats = criteriaMap.get(criteria.criterionId);
        stats.total++;
        
        if (criteria.rating === 'acceptable') stats.acceptable++;
        else if (criteria.rating === 'concern') stats.concern++;
        else if (criteria.rating === 'unacceptable') stats.unacceptable++;
      });
    });
    
    // Convert to array and calculate percentages
    return Array.from(criteriaMap.values()).map(stat => ({
      ...stat,
      acceptablePercentage: Math.round((stat.acceptable / stat.total) * 100),
      concernPercentage: Math.round((stat.concern / stat.total) * 100),
      unacceptablePercentage: Math.round((stat.unacceptable / stat.total) * 100)
    }));
  }

  /**
   * Generate detailed analysis for full review
   * @param {Array} individualAssessments 
   * @returns {Object} Detailed analysis
   */
  generateDetailedAnalysis(individualAssessments) {
    const scores = individualAssessments.map(a => a.assessment.scoring.percentage);
    
    // Find best and worst consultations
    const bestConsultation = individualAssessments.reduce((best, current) => 
      current.assessment.scoring.percentage > best.assessment.scoring.percentage ? current : best
    );
    
    const worstConsultation = individualAssessments.reduce((worst, current) => 
      current.assessment.scoring.percentage < worst.assessment.scoring.percentage ? current : worst
    );
    
    // Identify common areas of concern
    const concernAreas = this.identifyCommonConcerns(individualAssessments);
    
    // Identify strengths
    const strengths = this.identifyStrengths(individualAssessments);
    
    return {
      bestPerforming: {
        consultationNumber: bestConsultation.consultationNumber,
        date: bestConsultation.consultationDate,
        score: bestConsultation.assessment.scoring.percentage,
        rag: bestConsultation.assessment.scoring.ragRating.rating
      },
      worstPerforming: {
        consultationNumber: worstConsultation.consultationNumber,
        date: worstConsultation.consultationDate,
        score: worstConsultation.assessment.scoring.percentage,
        rag: worstConsultation.assessment.scoring.ragRating.rating
      },
      concernAreas,
      strengths,
      recommendations: this.generateOverallRecommendations(concernAreas, strengths)
    };
  }

  /**
   * Identify common areas of concern across consultations
   * @param {Array} individualAssessments 
   * @returns {Array} Common concern areas
   */
  identifyCommonConcerns(individualAssessments) {
    const concernMap = new Map();
    
    individualAssessments.forEach(assessment => {
      assessment.assessment.criteriaAssessments.forEach(criteria => {
        if (criteria.rating === 'concern' || criteria.rating === 'unacceptable') {
          const key = criteria.criterionId;
          if (!concernMap.has(key)) {
            concernMap.set(key, {
              criterionTitle: criteria.criterionTitle,
              count: 0,
              occurrences: []
            });
          }
          
          const concern = concernMap.get(key);
          concern.count++;
          concern.occurrences.push({
            consultationNumber: assessment.consultationNumber,
            rating: criteria.rating
          });
        }
      });
    });
    
    // Convert to array and sort by count
    return Array.from(concernMap.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 5); // Top 5 concerns
  }

  /**
   * Identify strengths across consultations
   * @param {Array} individualAssessments 
   * @returns {Array} Strengths
   */
  identifyStrengths(individualAssessments) {
    const strengthMap = new Map();
    
    individualAssessments.forEach(assessment => {
      assessment.assessment.criteriaAssessments.forEach(criteria => {
        if (criteria.rating === 'acceptable') {
          const key = criteria.criterionId;
          if (!strengthMap.has(key)) {
            strengthMap.set(key, {
              criterionTitle: criteria.criterionTitle,
              count: 0
            });
          }
          strengthMap.get(key).count++;
        }
      });
    });
    
    // Find criteria with high acceptable rates (>80%)
    const totalConsultations = individualAssessments.length;
    return Array.from(strengthMap.values())
      .filter(s => (s.count / totalConsultations) >= 0.8)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5); // Top 5 strengths
  }

  /**
   * Generate overall recommendations based on analysis
   * @param {Array} concernAreas 
   * @param {Array} strengths 
   * @returns {Array} Recommendations
   */
  generateOverallRecommendations(concernAreas, strengths) {
    const recommendations = [];
    
    if (concernAreas.length > 0) {
      recommendations.push({
        priority: 'HIGH',
        area: 'Areas requiring immediate attention',
        details: concernAreas.map(c => c.criterionTitle)
      });
    }
    
    if (strengths.length > 0) {
      recommendations.push({
        priority: 'POSITIVE',
        area: 'Consistent strengths to maintain',
        details: strengths.map(s => s.criterionTitle)
      });
    }
    
    return recommendations;
  }
}

export { AuditService };
export default new AuditService();
