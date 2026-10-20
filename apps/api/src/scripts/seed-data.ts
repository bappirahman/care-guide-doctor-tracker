import type { Specialization } from '@doctor-tracker/shared';

export const HOSPITALS = [
  { name: 'Square Hospitals Ltd.', domain: 'square' },
  { name: 'Evercare Hospital Dhaka', domain: 'evercare' },
  { name: 'United Hospital Limited', domain: 'united' },
  { name: 'Labaid Specialized Hospital', domain: 'labaid' },
  { name: 'Ibn Sina Hospital Dhanmondi', domain: 'ibnsina' },
  { name: 'BIRDEM General Hospital', domain: 'birdem' },
  { name: 'Dhaka Medical College Hospital', domain: 'dmch' },
  { name: 'Popular Medical College Hospital', domain: 'popular' },
  { name: 'Green Life Medical College Hospital', domain: 'greenlife' },
  { name: 'Anwer Khan Modern Medical College Hospital', domain: 'akmmch' },
  { name: 'Holy Family Red Crescent Medical College Hospital', domain: 'holyfamily' },
  { name: 'Delta Medical College & Hospital', domain: 'delta' },
  { name: 'National Heart Foundation Hospital', domain: 'nhf' },
  { name: 'Asgar Ali Hospital', domain: 'asgarali' },
] as const;

type NamePool = { male: string[]; female: string[]; family: string[]; femaleFamily?: string[] };

const MUSLIM_NAMES: NamePool = {
  male: [
    'Tanvir',
    'Imran',
    'Sakib',
    'Arif',
    'Fahim',
    'Nafis',
    'Rafiq',
    'Mahmud',
    'Shahriar',
    'Zubair',
    'Tahmid',
    'Ashraf',
    'Habib',
    'Kamrul',
    'Mizanur',
    'Shafiqul',
    'Rezaul',
    'Sajid',
    'Raihan',
    'Nayeem',
    'Mehedi',
    'Jahid',
    'Rakib',
    'Asif',
    'Sohel',
    'Monir',
    'Nazmul',
    'Rashed',
    'Faisal',
    'Ataur',
  ],
  female: [
    'Nusrat',
    'Farhana',
    'Tasnim',
    'Sadia',
    'Nadia',
    'Ayesha',
    'Fatema',
    'Sharmin',
    'Rumana',
    'Shirin',
    'Taslima',
    'Jannatul',
    'Mahjabin',
    'Sumaiya',
    'Rokeya',
    'Lamia',
    'Tahmina',
    'Nasrin',
    'Sabrina',
    'Afroza',
    'Maliha',
    'Fariha',
    'Nabila',
    'Sanjida',
    'Rehana',
  ],
  family: [
    'Rahman',
    'Hossain',
    'Ahmed',
    'Islam',
    'Chowdhury',
    'Khan',
    'Haque',
    'Uddin',
    'Sarker',
    'Talukder',
    'Siddiqui',
    'Kabir',
    'Karim',
    'Alam',
    'Bhuiyan',
    'Mahmud',
    'Hasan',
    'Miah',
    'Sheikh',
    'Molla',
  ],
  femaleFamily: ['Akter', 'Begum', 'Sultana', 'Khatun', 'Jahan', 'Parvin'],
};

const HINDU_NAMES: NamePool = {
  male: [
    'Subrata',
    'Pranab',
    'Dipankar',
    'Sourav',
    'Amit',
    'Partha',
    'Debashis',
    'Animesh',
    'Sujan',
    'Tapan',
    'Bishwajit',
    'Ratan',
  ],
  female: [
    'Priya',
    'Moumita',
    'Shampa',
    'Ananya',
    'Sraboni',
    'Mitali',
    'Rupa',
    'Tanushree',
    'Sathi',
    'Joya',
  ],
  family: ['Das', 'Saha', 'Roy', 'Ghosh', 'Paul', 'Dey', 'Majumder', 'Barua', 'Sen', 'Biswas'],
};

export const NAME_POOLS = [
  { weight: 0.85, pool: MUSLIM_NAMES },
  { weight: 0.15, pool: HINDU_NAMES },
] as const;

// Grameenphone, Banglalink, Robi, Airtel and Teletalk mobile prefixes.
export const MOBILE_PREFIXES = ['013', '014', '015', '016', '017', '018', '019'] as const;

type SpecializationProfile = {
  // Relative share of doctors with this specialization.
  doctorWeight: number;
  ageRange: [number, number];
  // Probability that a patient is female; undefined means an even split.
  femaleShare?: number;
  notes: string[];
};

export const SPECIALIZATION_PROFILES: Record<Specialization, SpecializationProfile> = {
  Cardiology: {
    doctorWeight: 5,
    ageRange: [38, 84],
    femaleShare: 0.38,
    notes: [
      'Admitted with chest pain. Serial troponins negative, kept for observation and stress test.',
      'Post-PCI day 2 after LAD stenting. On dual antiplatelet therapy, ambulating well.',
      'Hypertensive urgency on arrival, BP now controlled on oral amlodipine and losartan.',
      'Known heart failure with reduced EF, admitted with fluid overload. Responding to IV furosemide.',
      'New-onset atrial fibrillation with rapid ventricular rate. Rate controlled, anticoagulation started.',
    ],
  },
  Dermatology: {
    doctorWeight: 2,
    ageRange: [12, 70],
    notes: [
      'Extensive plaque psoriasis flare. Started on methotrexate after baseline LFTs.',
      'Cellulitis of the left lower limb, on IV flucloxacillin. Erythema receding.',
      'Severe urticaria with angioedema, settled after antihistamines and a short steroid course.',
    ],
  },
  Endocrinology: {
    doctorWeight: 3,
    ageRange: [22, 78],
    notes: [
      'Type 2 diabetes with HbA1c 11.2%. Transitioning to basal-bolus insulin.',
      'Diabetic ketoacidosis resolved. Switched from insulin infusion to subcutaneous regimen.',
      'Thyrotoxicosis with palpitations. Started on carbimazole and propranolol.',
      'Recurrent hypoglycaemia on sulfonylurea. Medication review and CGM planned.',
    ],
  },
  ENT: {
    doctorWeight: 2,
    ageRange: [6, 72],
    notes: [
      'Post-tonsillectomy day 1. Tolerating soft diet, no bleeding.',
      'Acute mastoiditis, on IV ceftriaxone. CT temporal bone reviewed.',
      'Peritonsillar abscess drained under local anaesthesia. Pain improving.',
    ],
  },
  Gastroenterology: {
    doctorWeight: 3,
    ageRange: [20, 80],
    notes: [
      'Upper GI bleed from duodenal ulcer, endoscopic haemostasis done. On IV pantoprazole.',
      'Decompensated chronic liver disease with ascites. Diagnostic tap sent, on diuretics.',
      'Acute pancreatitis, likely gallstone related. Pain controlled, oral feeds reintroduced.',
      'Acute gastroenteritis with dehydration. Rehydrated, electrolytes normalised.',
    ],
  },
  'General Surgery': {
    doctorWeight: 4,
    ageRange: [16, 78],
    notes: [
      'Laparoscopic appendicectomy yesterday. Afebrile, wound clean.',
      'Laparoscopic cholecystectomy for symptomatic gallstones. Planned discharge tomorrow.',
      'Incarcerated inguinal hernia repaired with mesh. Mobilising.',
      'Diabetic foot ulcer debrided. Daily dressings, vascular review requested.',
    ],
  },
  'Gynecology & Obstetrics': {
    doctorWeight: 4,
    ageRange: [18, 45],
    femaleShare: 1,
    notes: [
      'Elective caesarean section at 38 weeks. Mother and baby stable.',
      'Pre-eclampsia at 34 weeks. On magnesium sulphate, BP monitored hourly.',
      'Hyperemesis gravidarum at 10 weeks, on IV fluids and antiemetics.',
      'Laparoscopic ovarian cystectomy. Recovery uneventful.',
    ],
  },
  Hematology: {
    doctorWeight: 1,
    ageRange: [8, 70],
    notes: [
      'Thalassaemia major, admitted for scheduled transfusion. On iron chelation.',
      'Dengue with platelets at 28,000. Monitoring for warning signs, oral fluids encouraged.',
      'Severe iron-deficiency anaemia, Hb 6.1. Two units transfused, IV iron given.',
    ],
  },
  'Internal Medicine': {
    doctorWeight: 5,
    ageRange: [18, 88],
    notes: [
      'Dengue fever day 4, haematocrit rising. Under close fluid monitoring.',
      'Community-acquired pneumonia, on IV ceftriaxone and azithromycin. Fever settling.',
      'Enteric fever, blood culture positive for S. Typhi. On IV ceftriaxone.',
      'Urinary tract infection with sepsis in an elderly patient. Improving on IV antibiotics.',
      'Hyponatraemia with confusion, sodium corrected slowly. Cause under evaluation.',
    ],
  },
  Nephrology: {
    doctorWeight: 2,
    ageRange: [25, 80],
    notes: [
      'CKD stage 5, started on maintenance haemodialysis via temporary catheter.',
      'Acute kidney injury from dehydration. Creatinine trending down with fluids.',
      'Nephrotic syndrome with generalised oedema. Started on prednisolone, renal biopsy planned.',
    ],
  },
  Neurology: {
    doctorWeight: 3,
    ageRange: [30, 85],
    notes: [
      'Acute ischaemic stroke with right-sided weakness. Outside thrombolysis window, on aspirin and statin.',
      'Breakthrough seizures after missed doses. Levetiracetam restarted, EEG booked.',
      'Guillain-Barre syndrome, on IVIG. Respiratory function monitored every 6 hours.',
      'Severe migraine refractory to oral therapy, settled after IV treatment.',
    ],
  },
  Oncology: {
    doctorWeight: 2,
    ageRange: [30, 80],
    notes: [
      'Breast cancer, admitted for cycle 3 of adjuvant chemotherapy. Tolerating well.',
      'Febrile neutropenia after chemotherapy. On IV piperacillin-tazobactam.',
      'Carcinoma lung with malignant pleural effusion. Therapeutic tap done, breathing easier.',
    ],
  },
  Ophthalmology: {
    doctorWeight: 2,
    ageRange: [40, 85],
    notes: [
      'Phacoemulsification with IOL implant, right eye. Vision improving.',
      'Diabetic retinopathy, admitted for pan-retinal photocoagulation sessions.',
      'Acute angle-closure glaucoma, pressure reduced. Laser iridotomy done.',
    ],
  },
  Orthopedics: {
    doctorWeight: 4,
    ageRange: [12, 85],
    notes: [
      'Road traffic accident with closed tibial shaft fracture. Intramedullary nailing done.',
      'Intertrochanteric femur fracture after a fall. Fixed with DHS, physiotherapy started.',
      'Total knee replacement for osteoarthritis. Weight bearing with walker.',
      'Lumbar disc prolapse with radiculopathy. Conservative management, MRI reviewed.',
    ],
  },
  Pediatrics: {
    doctorWeight: 4,
    ageRange: [0, 15],
    notes: [
      'Bronchiolitis, on oxygen via nasal cannula. Feeding better today.',
      'Acute watery diarrhoea with some dehydration. On ORS and zinc.',
      'Febrile seizure, now afebrile and alert. Parents counselled.',
      'Severe acute malnutrition, on therapeutic feeding protocol.',
      'Pneumonia, on IV ampicillin and gentamicin. Respiratory rate improving.',
    ],
  },
  Psychiatry: {
    doctorWeight: 1,
    ageRange: [16, 70],
    notes: [
      'Major depressive episode with suicidal ideation. On close observation, sertraline started.',
      'Acute manic episode. Started on olanzapine and lithium, sleeping better.',
      'Alcohol withdrawal, managed on a reducing chlordiazepoxide regimen.',
    ],
  },
  Pulmonology: {
    doctorWeight: 3,
    ageRange: [25, 85],
    femaleShare: 0.35,
    notes: [
      'COPD exacerbation, on nebulised bronchodilators and steroids. Weaning oxygen.',
      'Acute severe asthma, responding to nebulisers and IV hydrocortisone.',
      'Pulmonary tuberculosis, sputum positive. Started on category I DOTS regimen.',
      'Pleural effusion under evaluation. Diagnostic tap sent for analysis.',
    ],
  },
  Rheumatology: {
    doctorWeight: 1,
    ageRange: [20, 75],
    femaleShare: 0.7,
    notes: [
      'Rheumatoid arthritis flare with polyarthritis. IV methylprednisolone given.',
      'Lupus nephritis, admitted for cyclophosphamide induction.',
      'Acute gout of the right knee. Aspirated, colchicine started.',
    ],
  },
  Urology: {
    doctorWeight: 2,
    ageRange: [25, 85],
    femaleShare: 0.25,
    notes: [
      'Right ureteric stone, 7 mm. URS with laser lithotripsy done, stent in situ.',
      'Benign prostatic hyperplasia with retention. Catheterised, TURP planned.',
      'Pyelonephritis, on IV antibiotics. Ultrasound shows no obstruction.',
    ],
  },
};
