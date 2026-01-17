/**
 * Sample Data Generator for Full Review Testing
 * 
 * This generates 10 sample consultations for testing the Full Review feature.
 * You can customize these to match your actual consultation formats.
 */

const sampleConsultations = [
  {
    date: "17-Dec-2024 09:15",
    type: "Face to face consultation (City Square Medical Group)",
    doctor: "IBE, Geoffrey (Dr)",
    problem: "Hypertension review (Follow-up)",
    history: `Regular medication review
      BP readings at home averaging 135/85
      Compliant with medication
      No side effects reported
      Diet improvements noted
      Regular exercise 3x per week`,
    examination: `BP: 132/84 mmHg
      Heart rate: 72 bpm regular
      Chest clear
      No peripheral oedema`,
    plan: `Continue current medication
      Repeat BP in 3 months
      Advised to continue lifestyle modifications
      Discussed QRISK score - stable`
  },
  {
    date: "17-Dec-2024 10:30",
    type: "Telephone consultation (City Square Medical Group)",
    doctor: "IBE, Geoffrey (Dr)",
    problem: "Upper respiratory tract infection (First)",
    history: `3 days sore throat, runny nose
      Low grade fever yesterday (37.8C)
      Cough - productive, yellow sputum
      No breathlessness
      No chest pain
      Non-smoker`,
    examination: `Not examined - telephone consultation
      Voice sounds clear
      No respiratory distress audible`,
    plan: `Reassurance - likely viral URTI
      Self-care advice given
      Adequate fluids and rest
      Paracetamol for fever
      Safety net - contact if worsening or not improving in 7 days`
  },
  {
    date: "17-Dec-2024 11:45",
    type: "Face to face consultation (City Square Medical Group)",
    doctor: "IBE, Geoffrey (Dr)",
    problem: "Type 2 Diabetes Mellitus - annual review (Follow-up)",
    history: `Annual diabetes review
      Metformin 500mg BD - good compliance
      Home glucose monitoring - fasting 6-7 mmol/L
      Diet - trying to reduce carbs
      Exercise - walking daily
      No hypoglycemic episodes
      Feet - no numbness or pain
      Vision - unchanged`,
    examination: `Weight: 82kg (BMI 28.5)
      BP: 138/82
      Feet examined - normal sensation, pulses present
      Eyes - no obvious abnormality`,
    testRequest: `HbA1c
      Renal function (U&E)
      Lipid profile
      ACR (albumin:creatinine ratio)`,
    plan: `Continue current medication
      Results review in 2 weeks
      Referred to dietitian
      Annual retinal screening due - booked`
  },
  {
    date: "17-Dec-2024 14:15",
    type: "Face to face consultation (City Square Medical Group)",
    doctor: "IBE, Geoffrey (Dr)",
    problem: "Pityriasis versicolor (First)",
    history: `Itchy scalp and discolouration in central scalp and peripheral regions
      No red flags or skin breaks`,
    medication: `Clotrimazole 2% cream Apply Twice A Day 40 gram
      Ketoconazole 2% shampoo Apply two times per week for 4 weeks. Leave preparation on scalp for 3-5 mins before rinsing 240 ml`
  },
  {
    date: "17-Dec-2024 14:33",
    type: "Face to face consultation (City Square Medical Group)",
    doctor: "IBE, Geoffrey (Dr)",
    problem: "O/E - dry/cracked lips (First)",
    history: `With parents
      Concern about cracked lips of 2 months duration
      No history of bowel disorders or malabsorption
      Diet limited at present to a few veges, no balanced diet`,
    examination: `Minor cracks, otherwise healthy oral cavity`,
    testRequest: `Coeliac Screen (tTG)
      Ferritin
      Serum Folate
      B12
      Renal Profile
      Vitamin E
      25 OH Vitamin D
      Full Blood Count`,
    comment: `Increase hydration
      Regular vaseline use
      Increase fruit and veg consumption
      Blood tests for vitamin deficiency including B12`
  },
  {
    date: "17-Dec-2024 15:20",
    type: "Face to face consultation (City Square Medical Group)",
    doctor: "IBE, Geoffrey (Dr)",
    problem: "Asthma review (Follow-up)",
    history: `Routine asthma review
      Using Salbutamol inhaler - 2-3 times per week
      No recent exacerbations
      No night symptoms
      Exercise tolerance good
      Peak flow diary reviewed - stable`,
    examination: `Chest clear, good air entry bilaterally
      Peak flow: 420 L/min (predicted 450)
      Inhaler technique checked - correct`,
    plan: `Asthma well controlled
      Continue current treatment
      Review in 6 months
      Advised to use preventer regularly
      Written asthma action plan provided`
  },
  {
    date: "17-Dec-2024 16:00",
    type: "Face to face consultation (City Square Medical Group)",
    doctor: "IBE, Geoffrey (Dr)",
    problem: "Ankle sprain (First)",
    history: `Twisted left ankle yesterday playing football
      Immediate pain and swelling
      Unable to weight bear initially
      Can now walk with limp
      RICE treatment started at home
      No previous ankle injuries`,
    examination: `Left ankle: moderate swelling lateral aspect
      Tenderness over lateral ligament
      No bony tenderness
      Able to weight bear with pain
      Good range of movement
      Ottawa ankle rules - low probability fracture`,
    plan: `Diagnosed as Grade 2 ankle sprain
      Continue RICE protocol
      Prescribed Ibuprofen 400mg TDS for 5 days
      Ankle support provided
      Physiotherapy referral if not improving in 2 weeks
      Return if unable to weight bear`
  },
  {
    date: "18-Dec-2024 09:30",
    type: "Telephone consultation (City Square Medical Group)",
    doctor: "IBE, Geoffrey (Dr)",
    problem: "Depression - follow up (Follow-up)",
    history: `Review 4 weeks after starting Sertraline 50mg
      Mood improved significantly
      Sleep pattern better
      Able to cope with work
      No suicidal thoughts
      Some initial nausea - now settled
      Engaged with counselling`,
    plan: `Continue Sertraline 50mg
      PHQ-9 score improved from 18 to 9
      Review in 8 weeks
      Continue counselling
      Discussed long-term treatment (6-12 months minimum)
      Safety net advice given`
  },
  {
    date: "18-Dec-2024 10:45",
    type: "Face to face consultation (City Square Medical Group)",
    doctor: "IBE, Geoffrey (Dr)",
    problem: "Eczema (First)",
    history: `Itchy rash on flexor surfaces for 3 weeks
      Worse at night
      No known triggers
      Tried over-counter moisturizer - minimal effect
      Family history of atopy
      No wheezing or hay fever symptoms`,
    examination: `Dry, scaly patches on antecubital and popliteal fossae
      Some excoriation from scratching
      No signs of infection
      Otherwise skin normal`,
    medication: `Emollient cream - apply liberally TDS and after washing
      Hydrocortisone 1% cream - apply BD to affected areas for 7 days
      Advised on trigger avoidance
      Avoid soap - use emollient as soap substitute`,
    plan: `Review in 2 weeks
      Safety net - return if signs of infection
      Patient information leaflet provided`
  },
  {
    date: "18-Dec-2024 11:30",
    type: "Face to face consultation (City Square Medical Group)",
    doctor: "IBE, Geoffrey (Dr)",
    problem: "Contraception discussion (First)",
    history: `Request for contraception advice
      Currently using condoms
      Wants more reliable method
      Regular cycles
      No contraindications to hormonal contraception
      Non-smoker
      No history of VTE
      Discussed options: COCP, POP, implant, IUD`,
    examination: `BP: 118/74
      BMI: 23
      General examination normal`,
    plan: `Patient opted for combined oral contraceptive pill
      Prescribed Microgynon 30 - 3 months supply
      Explained how to take, missed pill rules
      Discussed side effects
      STI screening offered - accepted
      Follow up in 3 months or sooner if problems`
  }
];

// Generate formatted output
function generateFormattedConsultations() {
  let output = '';
  
  sampleConsultations.forEach((consultation, index) => {
    output += 'Date\t\tConsultation Text\n';
    output += `${consultation.date}\t\t${consultation.type}  ${consultation.doctor}\n`;
    
    if (consultation.problem) {
      output += `Problem\t\t${consultation.problem}\n\t\t\n`;
    }
    
    if (consultation.history) {
      output += `History\t\t${consultation.history}\n\t\t\n`;
    }
    
    if (consultation.examination) {
      output += `Examination\t\t${consultation.examination}\n\t\t\n`;
    }
    
    if (consultation.testRequest) {
      output += `Test Request\t\t${consultation.testRequest}\n\t\t\n`;
    }
    
    if (consultation.medication) {
      output += `Medication\t\t${consultation.medication}\n\t\t\n`;
    }
    
    if (consultation.comment) {
      output += `Comment\t\t${consultation.comment}\n\t\t\n`;
    }
    
    if (consultation.plan) {
      output += `Plan\t\t${consultation.plan}\n\t\t\n`;
    }
    
    if (index < sampleConsultations.length - 1) {
      output += '\n';
    }
  });
  
  return output;
}

// Write to file
import fs from 'fs';
const formattedData = generateFormattedConsultations();
fs.writeFileSync('sample-consultations-full.txt', formattedData);

console.log('✓ Generated sample-consultations-full.txt with 10 consultations');
console.log('  You can use this file to test the Full Review feature');
