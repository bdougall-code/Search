/**
 * GP Consultation Assessment Criteria
 * Based on the Notes Audit framework
 */

export const assessmentCriteria = [
  {
    id: 1,
    title: "Are the notes coherent and well-structured and include all contacts?",
    ratings: {
      acceptable: "Consultation recorded logically and coherently using either appropriate fields or templates. All contacts recorded",
      concern: "Consultation recorded logically and coherently using either appropriate fields or templates but not all contacts recorded",
      unacceptable: "Consultation poorly recorded using neither appropriate fields nor templates. Key contacts and information missing"
    }
  },
  {
    id: 2,
    title: "Problem appropriately summarised and Read coded",
    ratings: {
      acceptable: "Problem appropriately summarised and Read coded",
      unacceptable: "Problem not appropriately summarised or Read coded"
    }
  },
  {
    id: 3,
    title: "Is there a record of the history of the presenting complaint with documentation of relevant positive features?",
    ratings: {
      acceptable: "Should be appropriate to the problem. The whole entry should be understandable without reliance on other entries.",
      concern: "Text difficult to follow or omits a key feature.",
      unacceptable: "No entry or omits key features likely to impact on patient care."
    }
  },
  {
    id: 4,
    title: "Is there a record of the history of the presenting complaint with documentation of relevant negative features?",
    ratings: {
      acceptable: "Should be appropriate to the problem. The whole entry should be understandable without reliance on other entries.",
      concern: "Text difficult to follow or omits a key feature.",
      unacceptable: "No entry or omits key features likely to impact on patient care."
    }
  },
  {
    id: 5,
    title: "Is there a record of any relevant clinical examination findings?",
    ratings: {
      acceptable: "Should be appropriate to the problem. The whole entry should be understandable without reliance on other entries.",
      concern: "Text difficult to follow or omits a key feature.",
      unacceptable: "No entry or omits key features likely to impact on patient care."
    }
  },
  {
    id: 6,
    title: "Makes appropriate diagnostic decisions based on the information acquired, including referral, with a recording of the working diagnosis",
    ratings: {
      acceptable: "Makes appropriate diagnostic and referral decisions based on the information acquired with a recording of the working diagnosis",
      concern: "Makes appropriate diagnostic and referral decisions based on the information acquired but fails to record the working diagnosis or consider alternatives",
      unacceptable: "Makes inappropriate diagnostic and referral decisions based on the information acquired with either no recording of the working diagnosis"
    }
  },
  {
    id: 7,
    title: "Is the prescribing for this consultation within current acceptable guidelines?",
    ratings: {
      acceptable: "Indication is clear and if prescribing is outside guidelines, then this is documented.",
      concern: "Choice of drug is in current guideline but not first line and no documentation present to support choice",
      unacceptable: "Drug choice is either outside current guidelines, is inappropriate to problem or is unsafe either in relation to co-prescribed drugs or within case setting. No documentation given to support choice."
    }
  },
  {
    id: 8,
    title: "Appropriate advice given regarding common side effects/interactions?",
    ratings: {
      acceptable: "Expected aspects all clearly recorded if and when appropriate.",
      concern: "Omits a key discussion point.",
      unacceptable: "No entry therefore likely to impact on patient management"
    }
  },
  {
    id: 9,
    title: "Has there been an up to date medicines review?",
    ratings: {
      acceptable: "Evidence that current medication is reviewed at the time of consultation",
      concern: "No evidence that current medication is reviewed at the time of consultation",
      unacceptable: "No evidence that current medication is reviewed at the time of consultation when a new medication is prescribed"
    }
  },
  {
    id: 10,
    title: "Follows formally agreed clinical practice guidelines & procedures (national & local) including appropriate referrals made?",
    ratings: {
      acceptable: "Follows recognised guidance and if outside guidelines, then this is documented.",
      concern: "Does not follow current guidelines but there is no or little risk to patient safety",
      unacceptable: "Does not follow current guidelines, is inappropriate to problem or is unsafe either in relation to the need for referral or other investigations required. No documentation given to support choice of pathway if outside guidance. Risk to patient safety."
    }
  },
  {
    id: 11,
    title: "Is there a record in sufficient detail of the continuing care arrangements and / or safety net plan?",
    ratings: {
      acceptable: "Appropriate management plan clearly recorded if and when appropriate.",
      concern: "Omits a key aspect of management plan",
      unacceptable: "No entry therefore likely to impact on patient management."
    }
  },
  {
    id: 12,
    title: "Have all the recent and relevant radiology and pathology results been acted on appropriately?",
    ratings: {
      acceptable: "Management in accordance with guidelines. Clear documentation of reasoning and diagnosis.",
      concern: "Management not in accordance with guidelines but unlikely to affect outcome",
      unacceptable: "No comment recorded or management plan evidenced"
    }
  }
];

/**
 * Calculate RAG rating based on percentage score
 * @param {number} percentage - Score percentage (0-100)
 * @returns {Object} RAG rating details
 */
export function calculateRAGRating(percentage) {
  if (percentage >= 90) {
    return {
      rating: "GREEN",
      score: percentage,
      description: "Excellent. Consultation notes are of a high standard.",
      action: "Clinician progresses to 3 monthly review"
    };
  } else if (percentage >= 70) {
    return {
      rating: "YELLOW",
      score: percentage,
      description: "Good. Minor errors/omissions are present but consultation notes are generally good and of an acceptable standard.",
      action: "Clinician progresses to 3 monthly review"
    };
  } else if (percentage >= 50) {
    return {
      rating: "AMBER",
      score: percentage,
      description: "Below Standards. Consultations contain more errors/omissions and generally need improvement. Clinicians will be provided with feedback and expected to show improvement for the next review.",
      action: "Clinician progresses to 1 month review. If no improvement in the next month (RAG yellow or above) face to face review with Partner."
    };
  } else {
    return {
      rating: "RED",
      score: percentage,
      description: "Unacceptable. Consultations are of a poor quality with poor/absent documentation",
      action: "Inform Management Partner / HR Lead. Face to face review with clinician. Consider additional training/support."
    };
  }
}

/**
 * Calculate score from criteria ratings
 * @param {Array} criteriaRatings - Array of ratings for each criterion
 * @returns {Object} Score details
 */
export function calculateScore(criteriaRatings) {
  let acceptableCount = 0;
  let concernCount = 0;
  let unacceptableCount = 0;
  let notRelevantCount = 0;
  
  criteriaRatings.forEach(rating => {
    if (rating === 'A' || rating === 'acceptable') acceptableCount++;
    else if (rating === 'C' || rating === 'concern') concernCount++;
    else if (rating === 'U' || rating === 'unacceptable') unacceptableCount++;
    else if (rating === 'N' || rating === 'not-relevant') notRelevantCount++;
  });
  
  // Exclude not-relevant from total when calculating score
  const totalRelevant = criteriaRatings.length - notRelevantCount;
  
  // Scoring: A=1, C=0.6 (partial credit), U=0, N=excluded
  const score = (acceptableCount * 1) + (concernCount * 0.6);
  const percentage = totalRelevant > 0 ? (score / totalRelevant) * 100 : 0;
  
  return {
    acceptable: acceptableCount,
    concern: concernCount,
    unacceptable: unacceptableCount,
    notRelevant: notRelevantCount,
    total: criteriaRatings.length,
    totalRelevant,
    score,
    percentage: Math.round(percentage * 100) / 100,
    ragRating: calculateRAGRating(percentage)
  };
}
