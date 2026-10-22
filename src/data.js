// ============================================================================
// DATA: code catalogue, DRG table, doctors, wards, case templates, perks
// Codes follow ICD-10-GM / OPS conventions. DRG names, splits and relative
// weights are simplified for gameplay but follow the real G-DRG logic:
// principal diagnosis -> base DRG, procedures -> surgical/invasive DRGs,
// secondary diagnoses -> CCL -> PCCL -> severity split.
// ============================================================================

const BASE_RATE = 4300; // EUR per relative weight (fictional state base rate)

// kind: dx | proc | vent
// ccl: complication level of a secondary diagnosis (0-4)
// drg: base DRG when used as principal diagnosis
// sec: may only be coded as a secondary diagnosis
// surg: OR procedure -> {drg, mdc}
const CODES = {};
function C(code, name, kind, o = {}) { CODES[code] = Object.assign({ code, name, kind, ccl: 0 }, o); }

// ---- Respiratory (MDC 04)
C('J18.9', 'Pneumonia, unspecified', 'dx', { ccl: 3, drg: 'E77', note: 'Use when no organism is identified. If a culture names the germ, a more specific code wins.' });
C('J15.9', 'Bacterial pneumonia, unspecified', 'dx', { ccl: 3, drg: 'E77', note: 'Only if "bacterial" is documented but the germ is unknown.' });
C('J13', 'Pneumonia due to S. pneumoniae', 'dx', { ccl: 3, drg: 'E77', note: 'Pneumococcal pneumonia. The organism is already inside this code, so no extra B95.3.' });
C('J69.0', 'Aspiration pneumonia', 'dx', { ccl: 3, drg: 'E77', note: 'Pneumonia caused by inhaling food, drink or vomit.' });
C('B95.3', 'S. pneumoniae as cause of disease', 'dx', { sec: true, note: 'An "organism" add-on code. Never a principal. Redundant when the disease code already names the germ.' });
C('J44.1', 'COPD with acute exacerbation', 'dx', { ccl: 1, drg: 'E65', note: 'Chronic lung disease that suddenly got worse.' });
C('J44.9', 'COPD, stable', 'dx', { ccl: 1, drg: 'E65', note: 'Chronic lung disease, codable as secondary when it is treated (inhalers continued etc.).' });
C('J96.0', 'Acute respiratory failure', 'dx', { ccl: 3, drg: 'E64', note: 'Lungs cannot keep oxygen up or CO2 down. Needs a blood gas or ventilation support documented.' });
C('J90', 'Pleural effusion', 'dx', { ccl: 2, drg: 'E75', note: 'Fluid around the lung. Codable when it is treated, e.g. drained.' });
C('J80', 'Acute respiratory distress syndrome (ARDS)', 'dx', { ccl: 4, drg: 'E64', note: 'Severe lung failure, typically in the ICU.' });
C('R06.0', 'Dyspnoea (shortness of breath)', 'dx', { ccl: 0, drg: 'E75', note: 'A symptom. Not coded when the cause is known.' });
C('I26.9', 'Pulmonary embolism', 'dx', { ccl: 4, drg: 'E64', note: 'Blood clot in the lung arteries. Only code it if it was confirmed, never on suspicion alone once excluded.' });
C('R13.9', 'Dysphagia (swallowing disorder)', 'dx', { ccl: 2, drg: 'G67', note: 'Trouble swallowing. Codable when it causes extra work: speech therapy, texture-modified diet.' });

// ---- Circulatory (MDC 05)
C('I50.19', 'Left heart failure, NYHA unspecified', 'dx', { ccl: 2, drg: 'F62', note: 'Heart failure where the severity class was not documented.' });
C('I50.13', 'Left heart failure, NYHA III', 'dx', { ccl: 2, drg: 'F62', note: 'Breathless with light exertion.' });
C('I50.14', 'Left heart failure, NYHA IV', 'dx', { ccl: 3, drg: 'F62', note: 'Breathless even at rest. The most severe class.' });
C('I48.0', 'Atrial fibrillation, paroxysmal', 'dx', { ccl: 1, drg: 'F71', note: 'Irregular heartbeat that stops on its own (usually within 7 days).' });
C('I48.1', 'Atrial fibrillation, persistent', 'dx', { ccl: 1, drg: 'F71', note: 'Irregular heartbeat lasting more than 7 days or ended by cardioversion.' });
C('I48.2', 'Atrial fibrillation, permanent', 'dx', { ccl: 1, drg: 'F71', note: 'Irregular heartbeat that is accepted long term (rate control only).' });
C('I10.00', 'Essential hypertension', 'dx', { ccl: 0, drg: 'F67', note: 'High blood pressure, codable as secondary when it is treated.' });
C('I10.01', 'Hypertension with hypertensive crisis', 'dx', { ccl: 1, drg: 'F67', note: 'Dangerously high blood pressure needing urgent treatment.' });
C('I21.0', 'Acute transmural MI, anterior wall (STEMI)', 'dx', { ccl: 3, drg: 'F60', note: 'Heart attack with ST elevation on the ECG.' });
C('I21.4', 'Acute subendocardial MI (NSTEMI)', 'dx', { ccl: 3, drg: 'F60', note: 'Heart attack proven by rising troponin, no ST elevation.' });
C('I20.0', 'Unstable angina', 'dx', { ccl: 1, drg: 'F66', note: 'Chest pain from the heart, but troponin stays normal. Once troponin rises it is an MI.' });
C('I25.11', 'Coronary artery disease, 1 vessel', 'dx', { ccl: 0, drg: 'F66', note: 'Narrowed heart arteries: one vessel.' });
C('I25.12', 'Coronary artery disease, 2 vessels', 'dx', { ccl: 0, drg: 'F66', note: 'Narrowed heart arteries: two vessels.' });
C('I25.13', 'Coronary artery disease, 3 vessels', 'dx', { ccl: 1, drg: 'F66', note: 'Narrowed heart arteries: three vessels.' });
C('I44.2', 'Complete AV block (3rd degree)', 'dx', { ccl: 2, drg: 'F71', note: 'The electrical signal from the upper to lower heart chambers is fully blocked.' });
C('I44.1', 'AV block, 2nd degree', 'dx', { ccl: 1, drg: 'F71', note: 'Some beats are blocked, not all.' });
C('R57.0', 'Cardiogenic shock', 'dx', { ccl: 4, sec: true, note: 'The heart pumps too weakly to keep blood pressure up.' });
C('R57.2', 'Septic shock', 'dx', { ccl: 4, sec: true, note: 'Blood pressure collapses from infection despite fluids, vasopressors needed. Code the infection first.' });
C('R55', 'Syncope (fainting)', 'dx', { ccl: 0, drg: 'F73', note: 'A symptom. Once the cause is found, the cause becomes principal.' });
C('I95.1', 'Orthostatic hypotension', 'dx', { ccl: 1, drg: 'F73', note: 'Blood pressure drops on standing up. Needs a positive test.' });
C('R07.4', 'Chest pain, unspecified', 'dx', { ccl: 0, drg: 'F74', note: 'A symptom code. Replace it as soon as a diagnosis explains the pain.' });
C('I80.2', 'Deep vein thrombosis (leg)', 'dx', { ccl: 2, drg: 'F65', note: 'Blood clot in a deep leg vein. Only code a current, treated clot, not an old one.' });

// ---- Digestive / hepatobiliary (MDC 06/07)
C('K35.8', 'Acute appendicitis, uncomplicated', 'dx', { drg: 'G67', note: 'Inflamed appendix without peritonitis.' });
C('K35.3', 'Acute appendicitis, localised peritonitis', 'dx', { drg: 'G67', note: 'Inflammation spread to the nearby lining of the belly.' });
C('K35.2', 'Acute appendicitis, generalised peritonitis', 'dx', { drg: 'G67', note: 'Inflammation spread through the whole belly. Serious.' });
C('R10.3', 'Pain in lower abdomen', 'dx', { drg: 'G67', note: 'A symptom. Replace it once the cause is known.' });
C('K80.00', 'Gallstones with acute cholecystitis', 'dx', { drg: 'H64', note: 'Stones plus an acutely inflamed gallbladder.' });
C('K80.20', 'Gallstones without cholecystitis', 'dx', { drg: 'H64', note: 'Stones, no inflammation documented.' });
C('K40.90', 'Inguinal hernia, uncomplicated', 'dx', { drg: 'G67', note: 'Groin hernia, not trapped.' });
C('K40.30', 'Inguinal hernia, incarcerated', 'dx', { drg: 'G67', note: 'Groin hernia with trapped (obstructed) bowel.' });
C('K56.0', 'Paralytic ileus', 'dx', { ccl: 3, drg: 'G67', note: 'The bowel stops moving, often after surgery.' });
C('T81.4', 'Wound infection after a procedure', 'dx', { ccl: 3, drg: 'X64', note: 'Surgical site infection. Needs a doctor\'s diagnosis, not just "looks red".' });

// ---- Musculoskeletal / injuries
C('S72.00', 'Femoral neck fracture', 'dx', { drg: 'I76', note: 'Broken hip (neck of the thigh bone).' });
C('S72.10', 'Pertrochanteric fracture', 'dx', { drg: 'I76', note: 'Broken hip, but lower down. Only if the X-ray says so.' });
C('S06.0', 'Concussion', 'dx', { ccl: 1, drg: 'B80', note: 'Brain concussion. Must be diagnosed, a bump on the head is not enough.' });
C('R29.6', 'Tendency to fall', 'dx', { ccl: 1, drg: 'B63', note: 'Repeated falls. Codable when it leads to fall-prevention work.' });

// ---- Kidney / urinary (MDC 11)
C('N39.0', 'Urinary tract infection', 'dx', { ccl: 2, drg: 'L63', note: 'Bladder or urinary infection, site not specified.' });
C('N10', 'Acute pyelonephritis', 'dx', { ccl: 2, drg: 'L63', note: 'Kidney infection. More specific than N39.0, needs imaging or clinical proof.' });
C('N30.0', 'Acute cystitis', 'dx', { ccl: 1, drg: 'L63', note: 'Bladder infection.' });
C('B96.2', 'E. coli as cause of disease', 'dx', { sec: true, note: 'Organism add-on code. Added next to an infection code when the germ is known.' });
C('N17.9', 'Acute kidney injury', 'dx', { ccl: 3, drg: 'L60', note: 'Kidney function drops suddenly. Needs creatinine rise + doctor\'s diagnosis.' });
C('N18.3', 'Chronic kidney disease, stage 3', 'dx', { ccl: 1, drg: 'L60', note: 'Long-term reduced kidney function (eGFR 30-59).' });
C('N18.4', 'Chronic kidney disease, stage 4', 'dx', { ccl: 2, drg: 'L60', note: 'Severely reduced kidney function (eGFR 15-29).' });
C('R33', 'Urinary retention', 'dx', { ccl: 1, drg: 'L64', note: 'Unable to empty the bladder. Codable when a catheter is needed.' });

// ---- Endocrine / metabolic (MDC 10)
C('E86', 'Volume depletion (dehydration)', 'dx', { ccl: 1, drg: 'K62', note: 'Too little fluid. Codable when IV fluids are given for it.' });
C('E87.1', 'Hyponatraemia', 'dx', { ccl: 2, drg: 'K62', note: 'Low sodium. Codable when treated or monitored, not as a lone lab value.' });
C('E87.6', 'Hypokalaemia', 'dx', { ccl: 1, drg: 'K62', note: 'Low potassium. Codable only when it is treated (e.g. potassium given).' });
C('E11.90', 'Type 2 diabetes, no complications', 'dx', { ccl: 0, drg: 'K60', note: 'Diabetes on stable medication.' });
C('E11.91', 'Type 2 diabetes, derailed', 'dx', { ccl: 2, drg: 'K60', note: 'Diabetes out of control, needing treatment changes ("entgleist").' });
C('E43', 'Severe protein-energy malnutrition', 'dx', { ccl: 3, drg: 'K62', note: 'Severe malnutrition. Needs a documented assessment (BMI, weight loss).' });
C('E44.0', 'Moderate protein-energy malnutrition', 'dx', { ccl: 2, drg: 'K62', note: 'Moderate malnutrition with a documented assessment and treatment.' });

// ---- Blood (MDC 16)
C('D62', 'Acute posthaemorrhagic anaemia', 'dx', { ccl: 2, drg: 'Q60', note: 'Anaemia from acute blood loss, e.g. after surgery. Typically shown by a transfusion.' });
C('D64.9', 'Anaemia, unspecified', 'dx', { ccl: 1, drg: 'Q60', note: 'Low haemoglobin without a documented cause. Needs treatment to be codable.' });

// ---- Infections (MDC 18)
C('A41.9', 'Sepsis, unspecified organism', 'dx', { ccl: 4, drg: 'T60', note: 'Life-threatening body-wide reaction to infection.' });
C('A41.51', 'Sepsis due to E. coli', 'dx', { ccl: 4, drg: 'T60', note: 'Sepsis with E. coli proven in the blood culture.' });
C('U80.00', 'MRSA (multi-resistant S. aureus)', 'dx', { ccl: 2, sec: true, note: 'Resistant germ carried by the patient. Secondary-only code.' });

// ---- Nervous system / mental (MDC 01/19)
C('F05.0', 'Delirium, not on top of dementia', 'dx', { ccl: 2, drg: 'B63', note: 'Acute confusion in a patient without dementia.' });
C('F05.1', 'Delirium superimposed on dementia', 'dx', { ccl: 2, drg: 'B63', note: 'Acute confusion in a patient who already has dementia.' });
C('F03', 'Dementia, unspecified', 'dx', { ccl: 1, drg: 'B63', note: 'Long-term memory and thinking decline.' });
C('R41.0', 'Disorientation (confusion), unspecified', 'dx', { ccl: 0, drg: 'B63', note: 'A symptom. Code the diagnosis behind it (e.g. delirium) once documented.' });

// ---- Skin
C('L89.14', 'Pressure ulcer category 2, sacrum', 'dx', { ccl: 2, drg: 'J61', note: 'Open sore on the lower back from lying. Category 2 = skin broken, shallow.' });
C('L89.24', 'Pressure ulcer category 3, sacrum', 'dx', { ccl: 3, drg: 'J61', note: 'Deep pressure sore down into fat tissue.' });

// ---- Procedures (OPS)
C('5-470.1', 'Appendectomy, laparoscopic', 'proc', { surg: { drg: 'G23', mdc: 'G' }, note: 'Keyhole removal of the appendix.' });
C('5-470.0', 'Appendectomy, open', 'proc', { surg: { drg: 'G23', mdc: 'G' }, note: 'Removal of the appendix through an open cut.' });
C('5-511.11', 'Cholecystectomy, laparoscopic', 'proc', { surg: { drg: 'H08', mdc: 'H' }, note: 'Keyhole gallbladder removal.' });
C('5-511.01', 'Cholecystectomy, open', 'proc', { surg: { drg: 'H07', mdc: 'H' }, note: 'Open gallbladder removal. Only if the OR report says open (or converted).' });
C('5-530.3', 'Inguinal hernia repair with mesh', 'proc', { surg: { drg: 'G24', mdc: 'G' }, note: 'Groin hernia closed with a plastic mesh.' });
C('5-820.41', 'Hip hemiarthroplasty, cemented', 'proc', { surg: { drg: 'I47', mdc: 'I' }, note: 'Half-hip replacement (only the ball side).' });
C('5-820.00', 'Total hip replacement', 'proc', { surg: { drg: 'I47', mdc: 'I', big: true }, note: 'Both ball and socket replaced. Check the OR report.' });
C('5-377.30', 'Pacemaker implant, dual-chamber', 'proc', { surg: { drg: 'F12', mdc: 'F' }, note: 'Pacemaker with leads in two heart chambers.' });
C('1-275.0', 'Coronary angiography', 'proc', { invasive: 'cath', note: 'Diagnostic heart catheter: dye shows the heart arteries.' });
C('8-837.m0', 'PCI with 1 drug-eluting stent', 'proc', { invasive: 'pci', note: 'Balloon + stent that opens a blocked heart artery.' });
C('8-837.00', 'PCI, balloon only', 'proc', { invasive: 'pci', note: 'Balloon dilation without a stent.' });
C('8-640.0', 'Electrical cardioversion', 'proc', { note: 'A synchronised shock that resets the heart rhythm.' });
C('8-152.1', 'Pleural puncture (drainage)', 'proc', { note: 'Fluid drained from around the lung with a needle.' });
C('8-800.c0', 'Red cell transfusion, 1-5 units', 'proc', { note: 'Blood transfusion.' });
C('8-550.0', 'Geriatric early rehab, min. 7 days', 'proc', { geri: 1, note: 'Geriatric team treatment: at least 7 treatment days and 10 therapy units, with team meetings.' });
C('8-550.1', 'Geriatric early rehab, min. 14 days', 'proc', { geri: 2, note: 'Geriatric team treatment: at least 14 treatment days and 20 therapy units. Big DRG impact, so auditors check the minimums.' });
C('8-987.11', 'MRSA isolation complex treatment, 7-13 days', 'proc', { complex: true, note: 'Strict isolation with documented extra effort for a resistant germ.' });
C('8-854.2', 'Haemodialysis, intermittent', 'proc', { complex: true, note: 'Blood washing for failed kidneys.' });
C('8-980.0', 'ICU complex treatment, up to 184 points', 'proc', { note: 'Intensive care basic procedure, low points total.' });
C('8-980.1', 'ICU complex treatment, 185-552 points', 'proc', { complex: true, icu: true, note: 'Intensive care basic procedure. The points come from daily severity scores, only final at discharge.' });
C('8-701', 'Endotracheal intubation', 'proc', { note: 'Breathing tube placed in the windpipe.' });
C('8-831.0', 'Central venous catheter', 'proc', { note: 'A large IV line into a central vein.' });
C('8-020.8', 'Systemic thrombolysis', 'proc', { note: 'Clot-dissolving drug through the vein.' });
C('3-200', 'CT of the head', 'proc', { note: 'Imaging procedure. Coded for completeness, does not change the DRG.' });
C('3-222', 'CT of the chest with contrast', 'proc', { note: 'Imaging procedure. Coded for completeness.' });
C('3-052', 'Transoesophageal echocardiography', 'proc', { note: 'Heart ultrasound through the gullet.' });
C('VENT24', 'Mechanical ventilation 24-95 h', 'vent', { note: 'Ventilation hours are counted from intubation to extubation. 24 to 95 hours.' });
C('VENT96', 'Mechanical ventilation 96+ h', 'vent', { note: 'Ventilation of 96 hours or more moves the case into the expensive pre-MDC DRG A13. Count the hours exactly!' });

// ============================================================================
// DRG TABLE. Splits are tested in order; first match wins.
// ctx: {pccl, pdx, sdx:Set, procs:Set, complex:bool, geri:0|1|2}
// ============================================================================
const DRGS = {};
function D(base, name, splits) { DRGS[base] = { base, name, splits }; }
const P = n => c => c.pccl >= n;
const always = () => true;

D('A13', 'Ventilation > 95 hours', [['A', 5.10, c => c.icu && c.pccl >= 4, 'ICU complex + PCCL ≥ 4'], ['B', 4.05, c => c.icu || c.pccl >= 4, 'ICU complex or PCCL ≥ 4'], ['C', 3.20, always, 'base']]);
D('E77', 'Pneumonia & respiratory infections', [['A', 1.85, c => c.pccl >= 4 || c.complex, 'PCCL ≥ 4'], ['B', 1.23, P(3), 'PCCL ≥ 3'], ['C', 0.93, P(2), 'PCCL ≥ 2'], ['D', 0.72, always, 'no relevant CC']]);
D('E65', 'COPD', [['A', 1.12, c => c.pccl >= 3 || c.sdx.has('J96.0'), 'PCCL ≥ 3 or resp. failure'], ['B', 0.82, P(1), 'PCCL ≥ 1'], ['C', 0.64, always, 'no relevant CC']]);
D('E64', 'Respiratory failure & embolism', [['A', 1.38, P(3), 'PCCL ≥ 3'], ['B', 0.92, always, 'base']]);
D('E75', 'Other respiratory diseases', [['A', 1.05, P(3), 'PCCL ≥ 3'], ['B', 0.62, always, 'base']]);
D('E40', 'Respiratory disease, ventilation > 24 h', [['A', 2.60, P(3), 'PCCL ≥ 3'], ['B', 1.85, always, 'base']]);
D('E42', 'Geriatric early rehab, respiratory', [['A', 2.45, c => c.geri >= 2 && c.pccl >= 3, '14+ days & PCCL ≥ 3'], ['B', 2.05, c => c.geri >= 2, '14+ days'], ['C', 1.55, always, '7+ days']]);
D('F12', 'Pacemaker implantation', [['A', 2.60, P(3), 'PCCL ≥ 3'], ['B', 1.78, always, 'base']]);
D('F24', 'PCI with stent for acute MI', [['A', 2.05, P(3), 'PCCL ≥ 3'], ['B', 1.42, always, 'base']]);
D('F58', 'PCI without acute MI', [['A', 1.30, P(3), 'PCCL ≥ 3'], ['B', 0.96, always, 'base']]);
D('F41', 'Acute MI with invasive diagnostics', [['A', 1.45, P(3), 'PCCL ≥ 3'], ['B', 1.02, always, 'base']]);
D('F49', 'Invasive cardiac diagnostics', [['A', 1.02, P(3), 'PCCL ≥ 3'], ['B', 0.61, always, 'base']]);
D('F43', 'Circulatory disease, ventilation > 24 h', [['A', 3.10, P(4), 'PCCL ≥ 4'], ['B', 2.30, always, 'base']]);
D('F48', 'Geriatric early rehab, circulatory', [['A', 2.40, c => c.geri >= 2 && c.pccl >= 3, '14+ days & PCCL ≥ 3'], ['B', 2.00, c => c.geri >= 2, '14+ days'], ['C', 1.50, always, '7+ days']]);
D('F60', 'Acute MI without invasive cardiology', [['A', 1.25, P(3), 'PCCL ≥ 3'], ['B', 0.88, always, 'base']]);
D('F62', 'Heart failure & shock', [['A', 1.48, c => c.pccl >= 4 || c.complex, 'PCCL ≥ 4'], ['B', 1.08, c => c.pccl >= 3 || (c.pdx === 'I50.14' && c.pccl >= 2), 'PCCL ≥ 3 or NYHA IV + PCCL ≥ 2'], ['C', 0.84, c => c.pccl >= 1 || c.pdx === 'I50.14', 'PCCL ≥ 1 or NYHA IV'], ['D', 0.66, always, 'no relevant CC']]);
D('F65', 'Peripheral vascular disease', [['A', 0.98, P(3), 'PCCL ≥ 3'], ['B', 0.62, always, 'base']]);
D('F66', 'Coronary atherosclerosis', [['A', 0.95, P(3), 'PCCL ≥ 3'], ['B', 0.58, always, 'base']]);
D('F67', 'Hypertension', [['A', 0.85, P(3), 'PCCL ≥ 3'], ['B', 0.52, always, 'base']]);
D('F71', 'Cardiac arrhythmia', [['A', 0.96, P(3), 'PCCL ≥ 3'], ['B', 0.66, c => c.pccl >= 1 || c.procs.has('8-640.0'), 'PCCL ≥ 1 or cardioversion'], ['C', 0.47, always, 'base']]);
D('F73', 'Syncope & collapse', [['A', 0.80, P(3), 'PCCL ≥ 3'], ['B', 0.52, always, 'base']]);
D('F74', 'Chest pain', [['Z', 0.38, always, 'single split']]);
D('G14', 'Geriatric early rehab, digestive', [['A', 2.30, c => c.geri >= 2, '14+ days'], ['B', 1.50, always, '7+ days']]);
D('G23', 'Appendectomy', [['A', 1.12, c => c.pdx === 'K35.2' || c.pccl >= 3, 'gen. peritonitis or PCCL ≥ 3'], ['B', 0.92, c => c.pdx === 'K35.3', 'localised peritonitis'], ['C', 0.76, always, 'uncomplicated']]);
D('G24', 'Hernia repair', [['A', 0.98, c => c.pccl >= 3 || c.pdx === 'K40.30', 'incarcerated or PCCL ≥ 3'], ['B', 0.63, always, 'base']]);
D('G67', 'Digestive diseases, medical', [['A', 0.88, P(3), 'PCCL ≥ 3'], ['B', 0.55, always, 'base']]);
D('H07', 'Open cholecystectomy', [['A', 1.95, P(3), 'PCCL ≥ 3'], ['B', 1.40, always, 'base']]);
D('H08', 'Laparoscopic cholecystectomy', [['A', 1.25, P(3), 'PCCL ≥ 3'], ['B', 0.92, c => c.pdx === 'K80.00', 'acute cholecystitis'], ['C', 0.74, always, 'base']]);
D('H64', 'Gallbladder disease, medical', [['A', 0.98, P(3), 'PCCL ≥ 3'], ['B', 0.62, always, 'base']]);
D('I34', 'Geriatric early rehab with hip surgery', [['A', 3.95, P(3), 'PCCL ≥ 3'], ['B', 3.40, always, 'base']]);
D('I41', 'Geriatric early rehab, musculoskeletal', [['A', 2.30, c => c.geri >= 2, '14+ days'], ['B', 1.45, always, '7+ days']]);
D('I47', 'Hip arthroplasty', [['A', 2.75, c => c.pccl >= 4 || c.big, 'PCCL ≥ 4'], ['B', 2.25, P(3), 'PCCL ≥ 3'], ['C', 1.88, always, 'base']]);
D('I76', 'Musculoskeletal, medical', [['A', 1.10, P(3), 'PCCL ≥ 3'], ['B', 0.70, always, 'base']]);
D('J61', 'Skin ulcers', [['A', 1.55, P(3), 'PCCL ≥ 3'], ['B', 0.95, always, 'base']]);
D('K44', 'Geriatric early rehab, metabolic', [['A', 2.20, c => c.geri >= 2, '14+ days'], ['B', 1.40, always, '7+ days']]);
D('K60', 'Diabetes mellitus', [['A', 1.08, P(3), 'PCCL ≥ 3'], ['B', 0.68, always, 'base']]);
D('K62', 'Metabolic & nutritional disorders', [['A', 1.00, P(3), 'PCCL ≥ 3'], ['B', 0.62, always, 'base']]);
D('L44', 'Geriatric early rehab, urinary', [['A', 2.30, c => c.geri >= 2 && c.pccl >= 3, '14+ days & PCCL ≥ 3'], ['B', 1.95, c => c.geri >= 2, '14+ days'], ['C', 1.40, always, '7+ days']]);
D('L60', 'Kidney failure', [['A', 2.05, c => c.procs.has('8-854.2') || c.pccl >= 4, 'dialysis or PCCL ≥ 4'], ['B', 1.28, P(3), 'PCCL ≥ 3'], ['C', 0.88, always, 'base']]);
D('L63', 'Urinary tract infections', [['A', 0.98, P(3), 'PCCL ≥ 3'], ['B', 0.70, P(1), 'PCCL ≥ 1'], ['C', 0.52, always, 'base']]);
D('L64', 'Other urinary disorders', [['A', 0.80, P(3), 'PCCL ≥ 3'], ['B', 0.48, always, 'base']]);
D('Q60', 'Anaemia', [['A', 0.95, P(3), 'PCCL ≥ 3'], ['B', 0.58, always, 'base']]);
D('T44', 'Geriatric early rehab, infections', [['A', 2.50, c => c.geri >= 2, '14+ days'], ['B', 1.60, always, '7+ days']]);
D('T60', 'Sepsis', [['A', 3.25, c => c.sdx.has('R57.2') && (c.icu || c.pccl >= 4), 'septic shock + ICU/PCCL ≥ 4'], ['B', 2.30, c => c.sdx.has('R57.2') || c.pccl >= 4, 'septic shock or PCCL ≥ 4'], ['C', 1.62, P(3), 'PCCL ≥ 3'], ['D', 1.20, always, 'base']]);
D('B44', 'Geriatric early rehab, nervous system', [['A', 2.30, c => c.geri >= 2, '14+ days'], ['B', 1.50, always, '7+ days']]);
D('B63', 'Dementia & confusion', [['A', 1.05, P(3), 'PCCL ≥ 3'], ['B', 0.72, always, 'base']]);
D('B80', 'Other head injuries', [['A', 0.70, P(3), 'PCCL ≥ 3'], ['B', 0.42, always, 'base']]);
D('X64', 'Complications of treatment', [['A', 1.05, P(3), 'PCCL ≥ 3'], ['B', 0.60, always, 'base']]);
D('901', 'OR procedure unrelated to principal dx', [['D', 2.40, always, 'error DRG, auditors love these']]);
D('960', 'Ungroupable: no principal diagnosis', [['Z', 0, always, '']]);
D('961', 'Invalid principal diagnosis', [['Z', 0, always, '']]);

const GERI_DRG = { E: 'E42', F: 'F48', G: 'G14', H: 'G14', I: 'I41', K: 'K44', L: 'L44', T: 'T44', B: 'B44', Q: 'K44', J: 'I41', X: 'B44' };
const VENT24_DRG = { E: 'E40', F: 'F43' };

// ============================================================================
// DOCTORS
// ============================================================================
const DOCTORS = {
  okafor: { id: 'okafor', name: 'Dr. Okafor', trait: 'Quick replier', delay: 0.22, color: '#3b8a5a', hair: '#1b1410', skin: '#7a4a2e', desc: 'Answers fast and friendly.' },
  brandt: { id: 'brandt', name: 'Dr. Brandt', trait: 'Grumpy surgeon', delay: 0.9, refuse: 0.3, color: '#8a3b3b', hair: '#b9b4a8', skin: '#e8b48a', desc: 'Slow, and sometimes just "in the OR".' },
  weiss: { id: 'weiss', name: 'Dr. Weiss', trait: 'Thorough', delay: 0.55, all: true, color: '#3b5a8a', hair: '#e2c46a', skin: '#f0c49a', desc: 'Takes a while, but tells you everything at once.' },
  novak: { id: 'novak', name: 'Dr. Novak', trait: 'Junior resident', delay: 0.15, vague: 0.4, color: '#6a3b8a', hair: '#5a3218', skin: '#e9b98f', desc: 'Lightning fast, but answers are often vague.' },
  sato: { id: 'sato', name: 'Dr. Sato', trait: 'Night owl', delay: 0.4, night: true, color: '#2a7a8a', hair: '#141418', skin: '#e6bf98', desc: 'Sluggish in the morning, sharp at night.' },
};

// ============================================================================
// PERKS
// ============================================================================
const PERKS = {
  speed: { name: 'Speed Reader', icon: 'book', desc: 'Clues show up 25% sooner.' },
  whisper: { name: 'Doctor Whisperer', icon: 'steth', desc: 'Asking a doctor costs 2 energy instead of 3. Doctors answer 30% faster and never refuse.' },
  espresso: { name: 'Double Espresso', icon: 'cup', desc: 'Coffee refills your energy completely and only takes 2 seconds.' },
  chaser: { name: 'Paper Chaser', icon: 'paper', desc: 'Chasing documentation costs 1 energy and comes back twice as fast.' },
  bedmgr: { name: 'Bed Manager', icon: 'bed', desc: 'Patients stay 0.4 days longer before discharge.' },
  sixth: { name: 'Sixth Sense', icon: 'eye', desc: 'Beds glow purple while the doctor still knows something that is not in the chart.' },
  armor: { name: 'Audit Armor', icon: 'shield', desc: 'Start every MD audit with 2 extra hearts.' },
  stamina: { name: 'Night Shift Veteran', icon: 'bolt', desc: 'Maximum energy +3.' },
  binder: { name: 'Evidence Binder', icon: 'binder', desc: 'Audit challenges give you 8 extra seconds.' },
};

// ============================================================================
// NAMES
// ============================================================================
const NAMES_F = ['Erna Huber', 'Ingrid Novak', 'Fatma Yilmaz', 'Maria Rossi', 'Agnes Kowalski', 'Hilde Brenner', 'Grace Mensah', 'Lotte Svensson', 'Rosa Alvarez', 'Elif Demir', 'Margarete Vogel', 'Anna Lindqvist', 'Mei Chen', 'Irene Papadakis', 'Gisela Wolf', 'Olga Petrova', 'Sofia Marino', 'Helga Schmitt', 'Amara Okoye', 'Ruth Becker', 'Johanna Krause', 'Priya Sharma', 'Ewa Nowak', 'Clara Dubois'];
const NAMES_M = ['Werner Schulz', 'Ahmet Kaya', 'Heinz Bauer', 'Jan de Vries', 'Kofi Asante', 'Dieter Lang', 'Marco Bianchi', 'Lars Eriksen', 'Tomasz Zielinski', 'Hans Richter', 'Yusuf Arslan', 'Pieter Jansen', 'Kenji Tanaka', 'Rafael Costa', 'Gerhard Neumann', 'Ivan Horvat', 'Samuel Adeyemi', 'Klaus Fischer', 'Mehmet Ozturk', 'Paul Hoffmann', 'Ole Hansen', 'Arjun Mehta', 'Luca Ferrari', 'Bernd Wagner'];

// ============================================================================
// CASE TEMPLATES
//  Clue markup: {visible text|CODE,CODE} = highlighted term with candidate cards.
//  Clue fields: f (fraction of stay), src, text, sup (supports), pdx (sets
//  principal), drop (superseded / excluded codes), vague {text, sup, pdx},
//  hidden (only revealed by asking the doctor), hint (lab finding that
//  needs a doctor's word), if / ifnot (variant flags).
// ============================================================================
const TEMPLATES = [];
function T(o) { TEMPLATES.push(o); }

// ---------------------------------------------------------------- MEDICINE
T({
  id: 'pneu', wards: ['med', 'geri'], dx: 'Pneumonia', age: [58, 91], los: [3, 4.4],
  flags: { culture: 0.5, hypona: 0.45, resp: 0.3, dm: 0.6, oldDvt: 0.5 },
  clues: [
    { f: 0, src: 'ADM', text: 'Fever 39.1 °C and cough for 3 days. Suspected {pneumonia|J18.9,J15.9,J13}, chest X-ray ordered. Known {high blood pressure|I10.00,I10.01}, ramipril continued.', sup: ['I10.00'] },
    { f: 0, src: 'ADM', if: 'oldDvt', text: 'Past history: {deep vein thrombosis|I80.2} in 2009, fully healed, no current treatment.' },
    { f: 0.1, src: 'RAD', text: 'Chest X-ray: new infiltrate in the right lower lobe, consistent with {pneumonia|J18.9,J15.9,J13,J69.0}. Antibiotics started.', sup: ['J18.9'], pdx: 'J18.9' },
    { f: 0.2, src: 'LAB', if: 'dm', text: 'Blood glucose 382 mg/dl (very high). HbA1c 9.8 %.', hint: true },
    { f: 0, src: 'DOC', if: 'dm', hidden: true, text: '"Oh, and her {type 2 diabetes|E11.91,E11.90} was completely off the rails. We switched her to insulin. Forgot to write that down."', sup: ['E11.91'] },
    { f: 0.28, src: 'DOC', if: 'resp', text: 'O2 saturation 84 % despite 4 l oxygen. Blood gas confirms {acute respiratory failure|J96.0,R06.0}. Non-invasive ventilation mask started.', sup: ['J96.0'] },
    { f: 0.45, src: 'LAB', if: 'culture', text: 'Sputum culture: {Streptococcus pneumoniae|J13,B95.3} (pneumococcus).', pdx: 'J13', drop: ['J18.9'] },
    { f: 0.5, src: 'NURSE', if: 'hypona', text: 'Sodium 126 mmol/l. Doctor ordered fluid restriction and sodium checks twice daily: {hyponatraemia|E87.1}.', sup: ['E87.1'] },
  ],
});

T({
  id: 'uti', wards: ['med', 'geri'], dx: 'Urinary tract infection', age: [66, 93], los: [2.6, 4],
  flags: { pyelo: 0.4, dehyd: 0.6, aki: 0.35, delir: 0.45, ckd: 0.5 },
  clues: [
    { f: 0, src: 'ADM', text: 'Burning when passing urine, fever 38.6 °C. Urine dipstick: leukocytes +++, nitrite positive. Working diagnosis {urinary tract infection|N39.0,N30.0,N10}, antibiotics started.', sup: ['N39.0'], pdx: 'N39.0' },
    { f: 0, src: 'ADM', if: 'ckd', text: 'Known {chronic kidney disease stage 3|N18.3,N18.4} (eGFR 44). Antibiotic dose adjusted to kidney function.', sup: ['N18.3'] },
    { f: 0.1, src: 'NURSE', if: 'dehyd', text: 'Dry mouth, drinks hardly anything. 2 litres of IV fluids per day ordered for {dehydration|E86}.', sup: ['E86'] },
    { f: 0.25, src: 'RAD', if: 'pyelo', text: 'Kidney ultrasound: swollen right kidney, tender flank: {acute pyelonephritis|N10,N39.0} (the infection has reached the kidney).', pdx: 'N10', drop: ['N39.0'] },
    { f: 0.4, src: 'LAB', text: 'Urine culture: {Escherichia coli|B96.2,A41.51} > 10^5/ml, sensitive to the current antibiotic.', sup: ['B96.2'] },
    { f: 0.45, src: 'NURSE', if: 'delir', vague: { text: 'Physician addendum: {delirium|F05.0,F05.1,R41.0} without known dementia. Low-dose haloperidol at night.', sup: ['F05.0'] }, text: 'Patient seems a bit confused at night and keeps trying to get up.' },
    { f: 0.55, src: 'LAB', if: 'aki', text: 'Creatinine up from 0.9 to 2.4 mg/dl. Nephrology consult: {acute kidney injury|N17.9,N18.3}, metformin paused.', sup: ['N17.9'] },
  ],
});

T({
  id: 'hf', wards: ['med', 'cardio', 'geri'], dx: 'Heart failure', age: [62, 92], los: [3.2, 4.8],
  flags: { af: 0.6, effusion: 0.5, hypok: 0.5, ckd4: 0.35, nyha: 0.6, pneuRO: 0.4 },
  clues: [
    { f: 0, src: 'ADM', text: 'Breathless, swollen legs, +4 kg in a week. Decompensated {left heart failure|I50.19,I50.13,I50.14}, IV furosemide started.', sup: ['I50.19'], pdx: 'I50.19' },
    { f: 0, src: 'ADM', if: 'af', text: 'ECG: {atrial fibrillation|I48.0,I48.1,I48.2}, known for years and accepted long term (permanent). Apixaban continued.', sup: ['I48.2'] },
    { f: 0, src: 'ADM', if: 'ckd4', text: 'Known {chronic kidney disease stage 4|N18.4,N18.3} (eGFR 22). Diuretics dosed with nephrology.', sup: ['N18.4'] },
    { f: 0.12, src: 'RAD', if: 'pneuRO', text: 'Rule out {pneumonia|J18.9}: chest X-ray ordered.' },
    { f: 0.2, src: 'RAD', if: 'effusion', text: 'Chest X-ray: large right {pleural effusion|J90}. 1.2 litres drained by {pleural puncture|8-152.1}.', sup: ['J90', '8-152.1'] },
    { f: 0.32, src: 'RAD', if: 'pneuRO', ifnot: 'effusion', text: 'Chest X-ray: congestion only. No infiltrate, pneumonia excluded.' },
    { f: 0.32, src: 'RAD', if: 'pneuRO', and: 'effusion', text: 'Radiology addendum: no infiltrate. Pneumonia excluded.' },
    { f: 0.3, src: 'NURSE', if: 'nyha', vague: { text: 'Physician addendum: breathless at rest, {NYHA class IV|I50.14,I50.13}.', sup: ['I50.14'], pdx: 'I50.14', drop: ['I50.19'] }, text: 'Patient gets very short of breath. Not sure how much.' },
    { f: 0.4, src: 'LAB', if: 'hypok', text: 'Potassium 3.0 mmol/l (low).', hint: true },
    { f: 0, src: 'DOC', if: 'hypok', hidden: true, text: '"The potassium? Yes, we gave IV potassium for the {hypokalaemia|E87.6} for two days."', sup: ['E87.6'] },
  ],
});

T({
  id: 'copd', wards: ['med'], dx: 'COPD exacerbation', age: [55, 84], los: [2.8, 4.2],
  flags: { resp: 0.5, dm: 0.5, mal: 0.5, htn: 0.6 },
  clues: [
    { f: 0, src: 'ADM', text: 'Long-time smoker. Increasing cough and wheezing for 5 days: {COPD exacerbation|J44.1,J44.9,J18.9}. Steroids and inhalers.', sup: ['J44.1'], pdx: 'J44.1' },
    { f: 0, src: 'ADM', if: 'dm', text: '{Type 2 diabetes|E11.90,E11.91}, well controlled on metformin, continued.', sup: ['E11.90'] },
    { f: 0, src: 'ADM', if: 'htn', text: 'Takes amlodipine for {hypertension|I10.00,I10.01}.', sup: ['I10.00'] },
    { f: 0.15, src: 'LAB', if: 'resp', text: 'Blood gas: pCO2 68 mmHg, pH 7.29: {hypercapnic respiratory failure|J96.0}. Night-time mask ventilation.', sup: ['J96.0'] },
    { f: 0.3, src: 'LAB', text: 'Blood glucose 168 mg/dl after steroids. No treatment change needed.' },
    { f: 0.4, src: 'NURSE', if: 'mal', vague: { text: 'Nutrition team: BMI 16.8, 11 % weight loss in 3 months. {Moderate malnutrition|E44.0,E43}, protein drinks started.', sup: ['E44.0'] }, text: 'Patient looks very thin and anxious, barely touches meals.' },
  ],
});

T({
  id: 'hypona', wards: ['med', 'geri'], dx: 'Hyponatraemia', age: [70, 94], los: [2.6, 3.8],
  flags: { fall: 0.6, uti: 0.55, dehyd: 0.5 },
  clues: [
    { f: 0, src: 'ADM', text: 'Weak and dizzy, sodium 118 mmol/l. Thiazide diuretic stopped, slow sodium correction: {hyponatraemia|E87.1,E86}.', sup: ['E87.1'], pdx: 'E87.1' },
    { f: 0, src: 'ADM', if: 'fall', text: 'Fell at home, bumped her head. {CT of the head|3-200,S06.0} ordered.', sup: [] },
    { f: 0.1, src: 'RAD', if: 'fall', text: 'CT head: no bleeding, no fracture, no {concussion|S06.0} signs. ({CT head|3-200} done)', sup: ['3-200'] },
    { f: 0.15, src: 'NURSE', if: 'dehyd', text: 'Very dry skin, low urine output. IV saline for {volume depletion|E86}.', sup: ['E86'] },
    { f: 0.3, src: 'LAB', if: 'uti', text: 'Urine dipstick positive for leukocytes and nitrite.', hint: true },
    { f: 0, src: 'DOC', if: 'uti', hidden: true, text: '"Right, the urine! I started fosfomycin for a {urinary tract infection|N39.0,N30.0}. I thought I had written that."', sup: ['N39.0'] },
  ],
});

T({
  id: 'dm', wards: ['med'], dx: 'Derailed diabetes', age: [45, 80], los: [2.4, 3.6],
  flags: { aki: 0.4, hypokOK: 0.6, dehyd: 0.7 },
  clues: [
    { f: 0, src: 'ADM', text: 'Blood sugar 540 mg/dl, very thirsty, peeing a lot. {Type 2 diabetes, derailed|E11.91,E11.90}. Insulin infusion.', sup: ['E11.91'], pdx: 'E11.91' },
    { f: 0.05, src: 'NURSE', if: 'dehyd', text: '3 litres IV fluids on day one for {dehydration|E86}.', sup: ['E86'] },
    { f: 0.3, src: 'LAB', if: 'hypokOK', text: 'Potassium 3.4 mmol/l, slightly low. Will recheck, no treatment needed ({hypokalaemia|E87.6}?).' },
    { f: 0.45, src: 'LAB', if: 'aki', text: 'Creatinine 2.1 mg/dl (was 1.0). Doctor: {acute kidney injury|N17.9} from dehydration, fluids adjusted.', sup: ['N17.9'] },
  ],
});

// ---------------------------------------------------------------- SURGERY
T({
  id: 'appy', wards: ['surg'], dx: 'Appendicitis', age: [16, 52], los: [2.4, 3.6],
  flags: { perit: 0.45, ileus: 0.25, wound: 0.25 },
  clues: [
    { f: 0, src: 'ADM', text: 'Pain in the lower right belly since yesterday, fever. {Lower abdominal pain|R10.3,K35.8}, suspected appendicitis.', sup: ['R10.3'], pdx: 'R10.3' },
    { f: 0.08, src: 'RAD', text: 'Ultrasound: thickened appendix 11 mm: {acute appendicitis|K35.8,K35.3,K35.2}.', pdx: 'K35.8', drop: ['R10.3'] },
    { f: 0.18, src: 'OR', text: 'OR report: {laparoscopic appendectomy|5-470.1,5-470.0}. Appendix inflamed.', sup: ['5-470.1'] },
    { f: 0.19, src: 'OR', if: 'perit', text: 'OR report addendum: pus around the appendix, {localised peritonitis|K35.3,K35.2}, area rinsed.', pdx: 'K35.3', drop: ['K35.8'] },
    { f: 0.5, src: 'DOC', if: 'ileus', text: 'Day 2 after surgery: bloated belly, no bowel sounds. {Paralytic ileus|K56.0}, nasogastric tube.', sup: ['K56.0'] },
    { f: 0.6, src: 'NURSE', if: 'wound', vague: { text: 'Surgeon\'s note: {wound infection|T81.4} at the navel port, wound opened, antibiotics.', sup: ['T81.4'] }, text: 'The wound at the belly button looks a bit red.' },
    { f: 0.7, src: 'PATH', text: 'Pathology: acute phlegmonous appendicitis.' },
  ],
});

T({
  id: 'chole', wards: ['surg'], dx: 'Gallstones', age: [35, 78], los: [2.6, 3.8],
  flags: { acute: 0.6, af: 0.35, bleed: 0.3, mrsa: 0.12 },
  clues: [
    { f: 0, src: 'ADM', text: 'Colicky pain upper right belly after fatty food. Ultrasound: {gallstones|K80.20,K80.00}, gallbladder wall slightly thickened.', sup: ['K80.20'], pdx: 'K80.20' },
    { f: 0, src: 'ADM', if: 'af', text: '{Atrial fibrillation|I48.0,I48.1,I48.2} lasting for months (persistent). Anticoagulation paused and bridged with heparin.', sup: ['I48.1'] },
    { f: 0.05, src: 'LAB', if: 'mrsa', text: 'Admission swab: {MRSA|U80.00} in the nose. Strict isolation, decolonisation.', sup: ['U80.00'] },
    { f: 0.22, src: 'OR', text: 'OR report: {laparoscopic cholecystectomy|5-511.11,5-511.01}, no complications.', sup: ['5-511.11'] },
    { f: 0.4, src: 'LAB', if: 'bleed', text: 'Haemoglobin dropped 13.1 → 7.9 g/dl after surgery. 2 units given ({red cell transfusion|8-800.c0}). {Acute blood-loss anaemia|D62,D64.9}.', sup: ['D62', '8-800.c0'] },
    { f: 0.75, src: 'PATH', if: 'acute', text: 'Pathology: gallstones with {acute cholecystitis|K80.00,K80.20} (acutely inflamed gallbladder).', pdx: 'K80.00', drop: ['K80.20'] },
    { f: 0.75, src: 'PATH', ifnot: 'acute', text: 'Pathology: gallstones, chronic changes only. No acute inflammation.' },
    { f: 0.85, src: 'NURSE', if: 'mrsa', text: 'Isolation complex treatment documented for 8 days: {MRSA complex treatment|8-987.11}.', sup: ['8-987.11'] },
  ],
});

T({
  id: 'hernia', wards: ['surg'], dx: 'Groin hernia', age: [30, 85], los: [1.8, 3],
  flags: { incarc: 0.35, retention: 0.4, copd: 0.4 },
  clues: [
    { f: 0, src: 'ADM', text: 'Bulge in the right groin, painful when lifting: {inguinal hernia|K40.90,K40.30}.', sup: ['K40.90'], pdx: 'K40.90' },
    { f: 0, src: 'ADM', if: 'copd', text: '{COPD|J44.9,J44.1}, stable. Inhalers continued, physio for breathing exercises.', sup: ['J44.9'] },
    { f: 0.15, src: 'OR', text: 'OR report: {hernia repair with mesh (Lichtenstein)|5-530.3}.', sup: ['5-530.3'] },
    { f: 0.16, src: 'OR', if: 'incarc', text: 'OR finding: bowel loop was trapped in the hernia ({incarcerated|K40.30,K40.90}), but still viable.', pdx: 'K40.30', drop: ['K40.90'] },
    { f: 0.4, src: 'NURSE', if: 'retention', text: 'Could not pass urine after surgery, bladder scan 700 ml, catheter placed: {urinary retention|R33}.', sup: ['R33'] },
  ],
});

T({
  id: 'hip', wards: ['surg', 'geri'], dx: 'Hip fracture', age: [72, 96], los: [3.4, 5],
  flags: { anemia: 0.5, delir: 0.55, dementia: 0.5, uti: 0.3, hypona: 0.4, days14: 0.55 },
  derive: (f, ward) => { f.geri = ward === 'geri'; },
  clues: [
    { f: 0, src: 'ADM', text: 'Fell at home, can\'t stand up, leg shortened and turned out. X-ray: {femoral neck fracture|S72.00,S72.10}.', sup: ['S72.00'], pdx: 'S72.00' },
    { f: 0, src: 'ADM', if: 'dementia', text: 'Known {dementia|F03,F05.1}, lives in a care home.', sup: ['F03'] },
    { f: 0.12, src: 'OR', text: 'OR report: {cemented hip hemiarthroplasty|5-820.41,5-820.00} (ball side only replaced).', sup: ['5-820.41'] },
    { f: 0.3, src: 'LAB', if: 'anemia', text: 'Haemoglobin 7.2 g/dl after surgery. 2 units of blood ({transfusion|8-800.c0}): {acute blood-loss anaemia|D62,D64.9}.', sup: ['D62', '8-800.c0'] },
    { f: 0.4, src: 'NURSE', if: 'delir', vague: { text: 'Geriatric consult: {delirium|F05.1,F05.0,R41.0} — on top of dementia if known, otherwise new. Haloperidol, sitter at night.', dyn: 'delir' }, text: 'Pulled out her IV at night, doesn\'t know where she is.' },
    { f: 0.35, src: 'LAB', if: 'hypona', text: 'Sodium 127 mmol/l (low).', hint: true },
    { f: 0, src: 'DOC', if: 'hypona', hidden: true, text: '"Her sodium, yes. Fluid restriction, daily checks. That\'s a treated {hyponatraemia|E87.1}."', sup: ['E87.1'] },
    { f: 0.55, src: 'LAB', if: 'uti', text: 'Urine culture: {E. coli|B96.2} — {urinary tract infection|N39.0} treated with antibiotics.', sup: ['N39.0', 'B96.2'] },
    { f: 0.88, src: 'THER', if: 'geri', vague: { text: 'Geriatric team report: early rehab, {16 treatment days, 24 therapy units|8-550.1,8-550.0}, weekly team meetings.', sup: ['8-550.1'], alt: { text: 'Geriatric team report: early rehab, {9 treatment days, 13 therapy units|8-550.0,8-550.1}, weekly team meetings.', sup: ['8-550.0'] } }, text: 'Physio: "We did loads of exercises with her, she\'s walking again!"' },
  ],
});

// ---------------------------------------------------------------- CARDIOLOGY
T({
  id: 'nstemi', wards: ['cardio'], dx: 'Chest pain', age: [48, 86], los: [2.4, 3.8],
  flags: { pci: 0.7, dm: 0.5, af: 0.3, aki: 0.3 },
  clues: [
    { f: 0, src: 'ADM', text: 'Pressure on the chest for 2 hours. ECG without ST elevation. {Chest pain|R07.4,I20.0}, troponin pending.', sup: ['R07.4'], pdx: 'R07.4' },
    { f: 0, src: 'ADM', if: 'dm', text: '{Type 2 diabetes|E11.90,E11.91} on metformin, paused before the catheter.', sup: ['E11.90'] },
    { f: 0.1, src: 'LAB', text: 'Troponin rising: 14 → 386 ng/l. Diagnosis: {NSTEMI (heart attack)|I21.4,I21.0,I20.0}.', pdx: 'I21.4', drop: ['R07.4'] },
    { f: 0.22, src: 'CATH', text: '{Coronary angiography|1-275.0}: narrowing in {two vessels|I25.12,I25.11,I25.13}.', sup: ['1-275.0', 'I25.12'] },
    { f: 0.24, src: 'CATH', if: 'pci', text: 'Culprit lesion opened with {PCI and 1 drug-eluting stent|8-837.m0,8-837.00}.', sup: ['8-837.m0'] },
    { f: 0.5, src: 'DOC', if: 'af', text: 'New {atrial fibrillation|I48.0,I48.1}, converted back by itself after 6 hours on amiodarone (paroxysmal).', sup: ['I48.0'] },
    { f: 0.6, src: 'LAB', if: 'aki', text: 'Creatinine up after the contrast dye. Nephrology: {acute kidney injury|N17.9}, IV fluids.', sup: ['N17.9'] },
  ],
});

T({
  id: 'stemi', wards: ['cardio', 'icu'], dx: 'STEMI', age: [44, 82], los: [2.4, 3.6],
  flags: { shock: 0.25, hf: 0.45, htn: 0.6 },
  clues: [
    { f: 0, src: 'ADM', text: 'Crushing chest pain, ECG: ST elevation in the front leads. {Anterior STEMI|I21.0,I21.4}. Straight to the cath lab.', sup: ['I21.0'], pdx: 'I21.0' },
    { f: 0, src: 'ADM', if: 'htn', text: 'Known {hypertension|I10.00}, on bisoprolol.', sup: ['I10.00'] },
    { f: 0.05, src: 'CATH', text: '{Coronary angiography|1-275.0} with {PCI and 1 drug-eluting stent|8-837.m0,8-837.00} to the LAD. {One-vessel disease|I25.11,I25.12}.', sup: ['1-275.0', '8-837.m0', 'I25.11'] },
    { f: 0.15, src: 'ICU', if: 'shock', text: 'Blood pressure 72/40 despite fluids, noradrenaline started: {cardiogenic shock|R57.0}.', sup: ['R57.0'] },
    { f: 0.45, src: 'DOC', if: 'hf', text: 'Echo: pump function 35 %. Breathless climbing one flight of stairs: {heart failure NYHA III|I50.13,I50.14}.', sup: ['I50.13'] },
  ],
});

T({
  id: 'afib', wards: ['cardio'], dx: 'Atrial fibrillation', age: [52, 86], los: [1.8, 2.8],
  flags: { hf: 0.4, htn: 0.7, hypok: 0.4 },
  clues: [
    { f: 0, src: 'ADM', text: 'Racing, irregular heartbeat for 10 days: {atrial fibrillation|I48.0,I48.1,I48.2}. Note: lasting more than 7 days means persistent.', sup: ['I48.1'], pdx: 'I48.1' },
    { f: 0, src: 'ADM', if: 'htn', text: '{Hypertension|I10.00,I10.01} on ramipril.', sup: ['I10.00'] },
    { f: 0.2, src: 'CARD', text: '{Transoesophageal echo|3-052}: no clot in the heart. Then {electrical cardioversion|8-640.0} → normal rhythm.', sup: ['3-052', '8-640.0'] },
    { f: 0.3, src: 'DOC', if: 'hf', text: 'Breathless on light exertion, ankles swollen: {heart failure NYHA III|I50.13,I50.19}, diuretics started.', sup: ['I50.13'] },
    { f: 0.35, src: 'LAB', if: 'hypok', text: 'Potassium 3.1 mmol/l (low).', hint: true },
    { f: 0, src: 'DOC', if: 'hypok', hidden: true, text: '"We always top up potassium before a cardioversion. Yes, {hypokalaemia|E87.6} treated."', sup: ['E87.6'] },
  ],
});

T({
  id: 'pacer', wards: ['cardio', 'geri'], dx: 'Syncope', age: [68, 92], los: [2.4, 3.6],
  flags: { ckd: 0.4, dm: 0.4, orthoRO: 0.6 },
  clues: [
    { f: 0, src: 'ADM', text: 'Collapsed at the supermarket, was out for a minute. {Syncope (fainting)|R55,I95.1}, on the heart monitor.', sup: ['R55'], pdx: 'R55' },
    { f: 0, src: 'ADM', if: 'ckd', text: 'Known {chronic kidney disease stage 3|N18.3}, medication doses adjusted.', sup: ['N18.3'] },
    { f: 0.05, src: 'NURSE', if: 'orthoRO', text: 'Standing test for {orthostatic hypotension|I95.1}: blood pressure stable. Test negative.' },
    { f: 0.15, src: 'ICU', text: 'Monitor alarm: heart rate 32, {complete AV block|I44.2,I44.1} (signal fully blocked between upper and lower heart).', pdx: 'I44.2', drop: ['R55'] },
    { f: 0.35, src: 'OR', text: '{Dual-chamber pacemaker implanted|5-377.30}. Lead position fine.', sup: ['5-377.30'] },
    { f: 0.4, src: 'LAB', if: 'dm', text: '{Type 2 diabetes|E11.90}, metformin restarted after the procedure.', sup: ['E11.90'] },
  ],
});

// ---------------------------------------------------------------- GERIATRICS
T({
  id: 'gerifall', wards: ['geri'], dx: 'Falls & infection', age: [80, 97], los: [4.2, 5.6],
  flags: { mal: 0.6, ulcer: 0.45, dementia: 0.6, htn: 0.7, days14: 0.55, anemia: 0.35 },
  clues: [
    { f: 0, src: 'ADM', text: 'Third fall this month. Fever, cloudy urine: {urinary tract infection|N39.0,N10} treated with antibiotics. {Repeated falls|R29.6}, fall-prevention plan.', sup: ['N39.0', 'R29.6'], pdx: 'N39.0' },
    { f: 0, src: 'ADM', if: 'dementia', text: 'Known {dementia|F03}, needs help with daily activities.', sup: ['F03'] },
    { f: 0, src: 'ADM', if: 'htn', text: '{Hypertension|I10.00}, medication reduced because of the falls.', sup: ['I10.00'] },
    { f: 0.2, src: 'NURSE', if: 'ulcer', vague: { text: 'Wound expert: {pressure ulcer category 2, sacrum|L89.14,L89.24}. Special mattress, dressing changes twice a day.', sup: ['L89.14'] }, text: 'Red spot on the lower back, skin looks broken.' },
    { f: 0.3, src: 'NURSE', if: 'mal', vague: { text: 'Nutrition assessment: BMI 17.2, 14 % weight loss. {Severe malnutrition|E43,E44.0}, tube feeding discussed, supplements given.', sup: ['E43'] }, text: 'She hardly eats, food tray comes back almost full.' },
    { f: 0.4, src: 'LAB', if: 'anemia', text: 'Haemoglobin 8.1 g/dl.', hint: true },
    { f: 0, src: 'DOC', if: 'anemia', hidden: true, text: '"We gave iron through the drip for the {anaemia|D64.9,D62}. No bleeding found."', sup: ['D64.9'] },
    { f: 0.85, src: 'THER', vague: { text: 'Geriatric team report: early rehab, {15 treatment days, 22 therapy units|8-550.1,8-550.0}, weekly team meetings documented.', sup: ['8-550.1'], alt: { text: 'Geriatric team report: early rehab, {10 treatment days, 14 therapy units|8-550.0,8-550.1}, weekly team meetings documented.', sup: ['8-550.0'] }, altFlag: 'days14' }, text: 'Physio: "Lots of training sessions, she\'s much steadier now."' },
  ],
});

T({
  id: 'aspir', wards: ['geri'], dx: 'Aspiration pneumonia', age: [78, 96], los: [4, 5.4],
  flags: { dementia: 0.7, mal: 0.5, delir: 0.4, days14: 0.5 },
  clues: [
    { f: 0, src: 'ADM', text: 'Coughs while eating, now fever. X-ray: infiltrate right lower lobe after choking on food: {aspiration pneumonia|J69.0,J18.9}.', sup: ['J69.0'], pdx: 'J69.0' },
    { f: 0, src: 'ADM', if: 'dementia', text: 'Known {dementia|F03}.', sup: ['F03'] },
    { f: 0.15, src: 'THER', text: 'Speech therapy: {swallowing disorder|R13.9}. Thickened fluids, pureed diet.', sup: ['R13.9'] },
    { f: 0.3, src: 'NURSE', if: 'delir', vague: { text: 'Physician addendum: {delirium|F05.1,F05.0}, treated with low-dose quetiapine.', dyn: 'delir' }, text: 'Very restless today, calling out at night.' },
    { f: 0.4, src: 'NURSE', if: 'mal', vague: { text: 'Nutrition assessment: BMI 17.8, 9 % weight loss. {Moderate malnutrition|E44.0,E43}, supplements.', sup: ['E44.0'] }, text: 'Seems to be losing weight.' },
    { f: 0.86, src: 'THER', vague: { text: 'Geriatric team report: early rehab, {14 treatment days, 21 therapy units|8-550.1,8-550.0}.', sup: ['8-550.1'], alt: { text: 'Geriatric team report: early rehab, {8 treatment days, 12 therapy units|8-550.0,8-550.1}.', sup: ['8-550.0'] }, altFlag: 'days14' }, text: 'Physio and OT say she\'s done well with the program.' },
  ],
});

T({
  id: 'delir', wards: ['geri'], dx: 'Acute confusion', age: [79, 95], los: [3.6, 5],
  flags: { dehyd: 0.6, hypona: 0.4, ulcer: 0.3, days14: 0.45 },
  clues: [
    { f: 0, src: 'ADM', text: 'Family says he has been {confused|R41.0,F05.1,F05.0} for 3 days, known {dementia|F03}. Work-up started.', sup: ['R41.0', 'F03'], pdx: 'R41.0' },
    { f: 0.1, src: 'NURSE', if: 'dehyd', text: 'Barely drinking, IV fluids started for {dehydration|E86}.', sup: ['E86'] },
    { f: 0.2, src: 'DOC', text: 'Assessment (CAM test positive): {delirium on top of dementia|F05.1,F05.0}. Main reason for this stay.', pdx: 'F05.1', drop: ['R41.0'] },
    { f: 0.3, src: 'LAB', if: 'hypona', text: 'Sodium 125 mmol/l, fluid restriction: {hyponatraemia|E87.1}.', sup: ['E87.1'] },
    { f: 0.45, src: 'NURSE', if: 'ulcer', vague: { text: 'Wound expert: deep sore, {pressure ulcer category 3, sacrum|L89.24,L89.14}. Daily dressing, special mattress.', sup: ['L89.24'] }, text: 'Sore on his bottom, quite deep?' },
    { f: 0.86, src: 'THER', vague: { text: 'Geriatric team: early rehab, {15 treatment days, 20 therapy units|8-550.1,8-550.0}.', sup: ['8-550.1'], alt: { text: 'Geriatric team: early rehab, {7 treatment days, 11 therapy units|8-550.0,8-550.1}.', sup: ['8-550.0'] }, altFlag: 'days14' }, text: 'Therapists finished their sessions.' },
  ],
});

// ---------------------------------------------------------------- ICU
T({
  id: 'sepsis', wards: ['icu'], dx: 'Sepsis', age: [52, 88], los: [2.6, 4],
  flags: { shock: 0.6, aki: 0.5, highpts: 0.6 },
  derive: (f, ward, rng) => { f.dialysis = f.aki && rng() < 0.5; },
  clues: [
    { f: 0, src: 'ADM', text: 'Fever 39.8 °C, BP 78/40, confused. {Sepsis|A41.9,A41.51} from a {urinary tract infection|N39.0,N10}. Fluids, broad antibiotics.', sup: ['A41.9', 'N39.0'], pdx: 'A41.9' },
    { f: 0.04, src: 'ICU', text: '{Central line|8-831.0} placed for medication.', sup: ['8-831.0'] },
    { f: 0.1, src: 'ICU', if: 'shock', text: 'Noradrenaline needed despite 4 litres of fluid: {septic shock|R57.2,R57.0}.', sup: ['R57.2'] },
    { f: 0.2, src: 'LAB', text: 'Blood culture: {E. coli|A41.51,B96.2} in 2 of 2 bottles.', pdx: 'A41.51', drop: ['A41.9'] },
    { f: 0.3, src: 'LAB', if: 'aki', text: 'Creatinine 3.8 mg/dl, hardly any urine: {acute kidney injury|N17.9}.', sup: ['N17.9'] },
    { f: 0.36, src: 'ICU', if: 'dialysis', text: 'Started {intermittent haemodialysis|8-854.2}.', sup: ['8-854.2'] },
    { f: 0.9, src: 'ICU', if: 'highpts', text: 'ICU score summary: 312 effort points → {ICU complex treatment|8-980.1,8-980.0}.', sup: ['8-980.1'] },
    { f: 0.9, src: 'ICU', ifnot: 'highpts', text: 'ICU score summary: 156 effort points → {ICU complex treatment|8-980.0,8-980.1}.', sup: ['8-980.0'] },
  ],
});

T({
  id: 'ards', wards: ['icu'], dx: 'Severe pneumonia', age: [40, 80], los: [3, 4.2],
  flags: { long: 0.55, af: 0.35, culture: 0.4 },
  clues: [
    { f: 0, src: 'ADM', text: 'Severe {pneumonia|J18.9,J13}, oxygen 78 %. {Intubated|8-701} in the emergency room on Monday 06:00.', sup: ['J18.9', '8-701'], pdx: 'J18.9' },
    { f: 0.08, src: 'ICU', text: 'Both lungs white on X-ray, oxygen ratio 120: {ARDS|J80,J96.0}.', sup: ['J80'] },
    { f: 0.25, src: 'ICU', text: 'Day 2 on the ventilator. Prone positioning.' },
    { f: 0.35, src: 'LAB', if: 'culture', text: 'Bronchial culture: {Streptococcus pneumoniae|J13,B95.3}.', pdx: 'J13', drop: ['J18.9'] },
    { f: 0.45, src: 'ICU', text: 'Day 3 on the ventilator, improving.' },
    { f: 0.5, src: 'DOC', if: 'af', text: 'New {atrial fibrillation|I48.0}, back in rhythm with amiodarone after a few hours.', sup: ['I48.0'] },
    { f: 0.75, src: 'ICU', if: 'long', text: 'Extubated Friday 10:00. Ventilation from Monday 06:00 = {100 hours|VENT96,VENT24}.', sup: ['VENT96'] },
    { f: 0.75, src: 'ICU', ifnot: 'long', text: 'Extubated Wednesday 20:00. Ventilation from Monday 06:00 = {62 hours|VENT24,VENT96}.', sup: ['VENT24'] },
    { f: 0.9, src: 'ICU', text: 'ICU score summary: 288 effort points → {ICU complex treatment|8-980.1,8-980.0}.', sup: ['8-980.1'] },
  ],
});

T({
  id: 'pe', wards: ['icu', 'med'], dx: 'Pulmonary embolism', age: [35, 82], los: [2.4, 3.6],
  flags: { dvt: 0.6, resp: 0.4, lysis: 0.5 },
  clues: [
    { f: 0, src: 'ADM', text: 'Sudden breathlessness after a long flight. {CT chest with contrast|3-222}: {pulmonary embolism|I26.9,R06.0} in both lungs.', sup: ['3-222', 'I26.9'], pdx: 'I26.9' },
    { f: 0.06, src: 'ICU', if: 'lysis', text: 'Right heart strain, blood pressure falling: {systemic thrombolysis|8-020.8} given.', sup: ['8-020.8'] },
    { f: 0.15, src: 'ICU', if: 'resp', text: 'Blood gas: pO2 52 mmHg: {acute respiratory failure|J96.0}, high-flow oxygen.', sup: ['J96.0'] },
    { f: 0.3, src: 'RAD', if: 'dvt', text: 'Leg ultrasound: {deep vein thrombosis|I80.2} in the left calf, the source of the clot.', sup: ['I80.2'] },
    { f: 0.3, src: 'RAD', ifnot: 'dvt', text: 'Leg ultrasound: no {thrombosis|I80.2} found.' },
  ],
});

T({
  id: 'postop', wards: ['icu', 'surg'], dx: 'Perforated appendix', age: [55, 85], los: [3, 4.2],
  flags: { sepsis: 0.5, ileus: 0.4, vent: 0.4 },
  clues: [
    { f: 0, src: 'ADM', text: 'Rock-hard belly, fever. CT: burst appendix with {generalised peritonitis|K35.2,K35.3}.', sup: ['K35.2'], pdx: 'K35.2' },
    { f: 0.05, src: 'OR', text: 'Emergency {open appendectomy|5-470.0,5-470.1}, whole belly rinsed.', sup: ['5-470.0'] },
    { f: 0.12, src: 'ICU', if: 'vent', text: 'Kept on the ventilator after surgery, {intubated|8-701} since 22:00 Monday.', sup: ['8-701'] },
    { f: 0.2, src: 'ICU', if: 'sepsis', vague: { text: 'Intensivist: criteria met for {sepsis|A41.9}, but the appendicitis remains the reason for admission. Code sepsis as secondary.', sup: ['A41.9'] }, text: 'High lactate and fever, looks septic?' },
    { f: 0.45, src: 'ICU', if: 'vent', text: 'Extubated Wednesday 08:00 → {34 hours ventilated|VENT24,VENT96}.', sup: ['VENT24'] },
    { f: 0.55, src: 'DOC', if: 'ileus', text: 'Belly distended, no bowel movement: {paralytic ileus|K56.0}, stomach tube.', sup: ['K56.0'] },
  ],
});

// ============================================================================
// WARDS
// ============================================================================
const WARDS = {
  med: { id: 'med', name: 'Internal Medicine', short: 'MED', station: 'Ward 3B', beds: 6, doctors: ['okafor', 'brandt', 'novak'], color: '#4fb39a', theme: 'Pneumonia, infections, heart failure. A gentle start.', week: 1 },
  surg: { id: 'surg', name: 'General Surgery', short: 'SURG', station: 'Ward 5A', beds: 6, doctors: ['brandt', 'okafor', 'sato'], color: '#e0a03c', theme: 'Procedures change everything. Watch the OR and pathology reports.', week: 2 },
  cardio: { id: 'cardio', name: 'Cardiology', short: 'CARD', station: 'Ward 2C', beds: 6, doctors: ['weiss', 'novak', 'okafor'], color: '#e0566a', theme: 'Symptoms turn into heart attacks. Code early, update often.', week: 3 },
  geri: { id: 'geri', name: 'Geriatrics', short: 'GERI', station: 'Ward 7', beds: 6, doctors: ['weiss', 'sato', 'brandt'], color: '#a77fd6', theme: 'Many overlapping conditions and vague notes. Chase that paperwork.', week: 4 },
  icu: { id: 'icu', name: 'Intensive Care', short: 'ICU', station: 'ICU 1', beds: 5, doctors: ['novak', 'sato', 'weiss'], color: '#3fa8e0', theme: 'Fast and expensive. Count those ventilation hours.', week: 5, icu: true },
  mix: { id: 'mix', name: 'Whole Hospital', short: 'ALL', station: 'Float Pool', beds: 7, doctors: ['okafor', 'brandt', 'weiss', 'novak', 'sato'], color: '#d8d8e8', theme: 'Every ward at once. For veterans.', week: 6 },
};
const WARD_ORDER = ['med', 'surg', 'cardio', 'geri', 'icu', 'mix'];

const SRC_LABEL = { ADM: 'Admission note', LAB: 'Lab result', RAD: 'Radiology', NURSE: 'Nursing note', OR: 'OR report', PATH: 'Pathology', DOC: 'Physician note', CATH: 'Cath lab', CARD: 'Cardiology', ICU: 'ICU chart', THER: 'Therapy report' };
