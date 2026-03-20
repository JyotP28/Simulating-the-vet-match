// src/generator.js

/**
 * Empirical distribution of internship and residency positions.
 * Weights are derived from historical VIRMP match target data.
 */
const INTERN_SPECIALTY_WEIGHTS = [
  { name: 'Rotating – Small Animal', count: 1295 },
  { name: 'Rotating - Equine', count: 150 },
  { name: 'Rotating - Large/Mixed Animal', count: 153 },
  { name: 'Surgery', count: 368 },
  { name: 'Internal Medicine', count: 165 },
  { name: 'Emergency', count: 172 },
  { name: 'Exotic/Wildlife/Zoo', count: 232 },
  { name: 'Cardiology', count: 81 },
  { name: 'Oncology', count: 107 },
  { name: 'Neurology', count: 98 },
  { name: 'Radiology', count: 104 },
  { name: 'Ophthalmology', count: 60 }
];

const RESIDENCY_SPECIALTY_WEIGHTS = [
  { name: 'Surgery - Small Animal', count: 298 },
  { name: 'Medicine - Small Animal', count: 130 },
  { name: 'Emergency Medicine/Critical Care', count: 120 },
  { name: 'Cardiology', count: 100 },
  { name: 'Oncology', count: 68 },
  { name: 'Neurology/Neurosurgery', count: 85 },
  { name: 'Radiology', count: 102 },
  { name: 'Anesthesia', count: 50 },
  { name: 'Equine', count: 182 }, 
  { name: 'Large Animal', count: 189 }, 
  { name: 'Zoological Medicine', count: 127 },
  { name: 'Laboratory Animal', count: 48 },
  { name: 'Ophthalmology', count: 66 },
  { name: 'Dermatology', count: 29 },
  { name: 'Dentistry', count: 18 }
];

/**
 * Historic applicant volume by veterinary institution.
 * Format: [Institution Name, Total Applicants, Withdrawn Applicants]
 */
const VET_SCHOOL_DATA = [
  ['Arizona', 34, 0], ['Auburn', 23, 1], ['California', 125, 6], ['Colorado', 89, 2],
  ['Florida', 67, 3], ['Georgia', 77, 5], ['Illinois', 50, 5], ['Iowa', 47, 2],
  ['Kansas', 35, 5], ['Lincoln Memorial', 17, 0], ['Long Island', 56, 2],
  ['Louisiana', 44, 0], ['Michigan State', 54, 2], ['Midwestern (AZ)', 49, 4],
  ['Minnesota', 58, 1], ['Mississippi State', 23, 2], ['Missouri', 33, 2],
  ['Montreal', 50, 0], ['Cornell', 89, 1], ['North Carolina', 48, 1],
  ['Ohio State', 66, 0], ['Oklahoma', 25, 2], ['Ontario (Guelph)', 42, 4],
  ['Oregon', 42, 1], ['Pennsylvania', 107, 10], ['Prince Edward Island', 25, 4],
  ['Purdue', 28, 2], ['Ross', 155, 13], ['Saskatchewan', 29, 2],
  ['St. George\'s', 88, 2], ['St. Matthew\'s', 5, 1], ['Tennessee', 32, 1],
  ['Texas A&M', 48, 0], ['Texas Tech', 4, 0], ['Tufts', 81, 4],
  ['Tuskegee', 27, 2], ['Calgary', 24, 2], ['Virginia-Maryland', 44, 2],
  ['Washington State', 34, 1], ['Western Health Sciences', 78, 6], ['Wisconsin', 52, 1],
  ['Alexandria University', 17, 0], ['Alfonso X el Sabio', 11, 1], ['Azad University', 11, 0],
  ['Budapest', 10, 0], ['Cairo University', 12, 0], ['Dublin', 22, 2],
  ['Edinburgh', 22, 2], ['Glasgow', 18, 1], ['Guru Angad Dev', 15, 1],
  ['Liège', 10, 1], ['Lyon', 12, 0], ['Maisons-Alfort', 12, 0],
  ['Mansoura University', 10, 0], ['Melbourne', 15, 1], ['National University of Mexico', 22, 1],
  ['Queensland', 11, 1], ['Royal Veterinary College', 81, 7], ['Seoul National', 14, 0],
  ['Sydney', 12, 1], ['Universidad Cardenal Herrera', 15, 1]
];

/**
 * Maps a veterinary school to its broad US geographic region.
 */
function getSchoolRegion(school) {
  const s = school.toLowerCase();
  if (s.match(/california|colorado|arizona|oregon|washington|western|midwestern/)) return 'West';
  if (s.match(/illinois|iowa|kansas|michigan|minnesota|missouri|ohio|purdue|wisconsin/)) return 'Midwest';
  if (s.match(/auburn|florida|georgia|lincoln|louisiana|mississippi|carolina|oklahoma|tennessee|texas|tuskegee|virginia/)) return 'South';
  if (s.match(/cornell|long island|pennsylvania|tufts/)) return 'Northeast';
  return 'International'; 
}

/**
 * Infers the geographical region of a program based on its title and institution string.
 */
function getProgramRegion(title, inst) {
  const str = (title + " " + inst).toLowerCase();
  if (str.match(/california|colorado|arizona|oregon|washington|nevada|utah|idaho|new mexico|davis|angeles|diego|francisco|pacific|west/)) return 'West';
  if (str.match(/illinois|iowa|kansas|michigan|minnesota|missouri|ohio|indiana|purdue|wisconsin|midwest|chicago/)) return 'Midwest';
  if (str.match(/auburn|florida|georgia|louisiana|mississippi|carolina|oklahoma|tennessee|texas|virginia|alabama|arkansas|kentucky|south/)) return 'South';
  if (str.match(/cornell|pennsylvania|tufts|york|boston|angell|amc|massachusetts|connecticut|jersey|maine|northeast/)) return 'Northeast';
  
  const usRegions = ['West', 'Midwest', 'South', 'Northeast'];
  return usRegions[Math.floor(Math.random() * usRegions.length)];
}

/**
 * Standardizes raw VIRMP program titles into standardized specialty categories.
 */
function guessCategoryFromTitle(title, type) {
  const t = (title || "").toLowerCase();
  
  if (type === 'Residency') {
    if (t.includes('equine')) return 'Equine';
    if (t.includes('large animal') || t.includes('food') || t.includes('bovine')) return 'Large Animal';
    if (t.includes('exotic') || t.includes('zoo') || t.includes('wild') || t.includes('avian')) return 'Zoological Medicine';
    if (t.includes('anesth')) return 'Anesthesia';
    if (t.includes('lab') || t.includes('comparative')) return 'Laboratory Animal';
    if (t.includes('ophth')) return 'Ophthalmology';
    if (t.includes('derm')) return 'Dermatology';
    if (t.includes('dent')) return 'Dentistry';
    
    if (t.includes('surg')) return 'Surgery - Small Animal';
    if (t.includes('medicin') || t.includes('feline')) return 'Medicine - Small Animal';
    if (t.includes('emerg') || t.includes('crit')) return 'Emergency Medicine/Critical Care';
    if (t.includes('cardio')) return 'Cardiology';
    if (t.includes('onco')) return 'Oncology';
    if (t.includes('neuro')) return 'Neurology/Neurosurgery';
    if (t.includes('radio') || t.includes('imag')) return 'Radiology';
    
    return 'Medicine - Small Animal'; 
  } else {
    if (t.includes('equine')) return 'Rotating - Equine';
    if (t.includes('large animal') || t.includes('food') || t.includes('farm') || t.includes('bovine') || t.includes('mixed')) return 'Rotating - Large/Mixed Animal';
    if (t.includes('exotic') || t.includes('zoo') || t.includes('wild') || t.includes('avian')) return 'Exotic/Wildlife/Zoo';
    if (t.includes('ophth')) return 'Ophthalmology';

    if (t.includes('rotat')) return 'Rotating – Small Animal';
    if (t.includes('surg')) return 'Surgery'; 
    if (t.includes('medicin') || t.includes('feline')) return 'Internal Medicine';
    if (t.includes('emerg') || t.includes('crit')) return 'Emergency';
    if (t.includes('cardio')) return 'Cardiology';
    if (t.includes('onco')) return 'Oncology';
    if (t.includes('neuro')) return 'Neurology';
    if (t.includes('radio') || t.includes('imag')) return 'Radiology';
    
    return 'Rotating – Small Animal';
  }
}

/**
 * Returns a specialty category based on the empirical probability distribution.
 */
function getWeightedSpecialty(specialtyList) {
  const total = specialtyList.reduce((sum, s) => sum + s.count, 0);
  let rand = Math.random() * total;
  for (const s of specialtyList) {
    if (rand < s.count) return s.name;
    rand -= s.count;
  }
  return specialtyList[0].name;
}

/**
 * Box-Muller transform to generate normally distributed statistical scores.
 * Bounded between 1 and 10.
 */
function randomNormal(mean, stdDev) {
  let u = 0, v = 0;
  while(u === 0) u = Math.random(); 
  while(v === 0) v = Math.random();
  let num = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  num = num * stdDev + mean;
  return Math.max(1, Math.min(10, num)); 
}

/**
 * Generates the full matching environment including the simulated applicant pool 
 * and program constraints.
 * 
 * @param {Object} userProfile - The current user's applicant profile and rank list.
 * @param {Array} rawPrograms - The parsed program data from the CSV.
 * @param {Object} programWeights - The global evaluation criteria configured by the user.
 */
export function generateSimulationData(userProfile, rawPrograms, programWeights) {
  const usRegions = ['West', 'Midwest', 'South', 'Northeast'];
  
  // Normalize evaluation weights to ensure scale consistency
  const totalW = programWeights.lor + programWeights.interview + programWeights.gpa;
  const wLor = totalW > 0 ? programWeights.lor / totalW : 0;
  const wInt = totalW > 0 ? programWeights.interview / totalW : 0;
  const wGpa = totalW > 0 ? programWeights.gpa / totalW : 0;

  // Initialize Programs
  const programs = rawPrograms.map((p) => {
    const titleLower = (p.title || "").toLowerCase();
    const instLower = (p.institution || "").toLowerCase();
    const isInstitution = titleLower.includes('university') || titleLower.includes('college') || titleLower.includes('state') || instLower.includes('university');

    return {
      ...p,
      category: guessCategoryFromTitle(p.title, p.type),
      isInstitution,
      region: getProgramRegion(p.title, p.institution),
      rankList: [],
      matchedApplicants: []
    };
  });

  const applicants = [userProfile];

  // Generate Applicant Pool based on empirical school data
  VET_SCHOOL_DATA.forEach(([schoolName, totalCount, withdrawnCount]) => {
    const activeInMatch = totalCount - withdrawnCount;
    for (let i = 0; i < activeInMatch; i++) {
      const rt = Math.random();
      // Track probabilities: ~26.5% apply to both, ~22.1% residency only, ~51.4% internship only
      let track = (rt < 0.265) ? 'Both' : (rt > 0.779 ? 'Residency' : 'Internship');
      
      const specialtyGoal = (track === 'Residency' || track === 'Both') 
        ? getWeightedSpecialty(RESIDENCY_SPECIALTY_WEIGHTS) 
        : getWeightedSpecialty(INTERN_SPECIALTY_WEIGHTS);

      const homeRegion = getSchoolRegion(schoolName);
      let preferredRegion = homeRegion;
      
      if (homeRegion === 'International' || Math.random() < 0.15) {
          preferredRegion = usRegions[Math.floor(Math.random() * usRegions.length)];
      }

      applicants.push({
        id: `APP_${schoolName}_${i}`,
        name: `Applicant ${schoolName} #${i + 1}`,
        vetSchool: schoolName,
        track,
        specialtyGoal,
        preferredRegion,
        stats: {
          lorStrength: randomNormal(7.6, 1.2),      
          interview: randomNormal(7.3, 1.5),      
          cvAndStatement: randomNormal(7.7, 0.9), 
          classRank: Math.floor(Math.random() * 4) + 1            
        },
        rankList: [],
        matchedProgram: null
      });
    }
  });

  // Pad the remaining applicant pool to meet the exact 2026 target volume (2,889)
  let extraCounter = 0;
  while (applicants.length < 2889) {
    const t = Math.random() < 0.26 ? 'Both' : 'Internship';
    applicants.push({
      id: `APP_EXTRA_${extraCounter}`,
      name: `Applicant (Misc) #${extraCounter + 1}`,
      vetSchool: 'Other International',
      track: t,
      specialtyGoal: t === 'Both' ? getWeightedSpecialty(RESIDENCY_SPECIALTY_WEIGHTS) : getWeightedSpecialty(INTERN_SPECIALTY_WEIGHTS),
      preferredRegion: usRegions[Math.floor(Math.random() * usRegions.length)],
      stats: { lorStrength: 7.2, interview: 7.0, cvAndStatement: 7.2, classRank: 3 },
      rankList: [],
      matchedProgram: null
    });
    extraCounter++;
  }

  // Generate Rank Order Lists for simulated applicants
  applicants.forEach(app => {
    if (app.id === 'USER') return;

    let potRes = [];
    let potInt = [];

    if (app.track === 'Residency') {
      potRes = programs.filter(p => p.type === 'Residency' && p.category === app.specialtyGoal);
    } else if (app.track === 'Internship') {
      potInt = programs.filter(p => p.type === 'Internship' && p.category === app.specialtyGoal);
    } else if (app.track === 'Both') {
      potRes = programs.filter(p => p.type === 'Residency' && p.category === app.specialtyGoal);
      
      // Fallback mapping for applicants applying to both tracks
      let internGoal = app.specialtyGoal;
      if (internGoal === 'Surgery - Small Animal') internGoal = 'Surgery';
      if (internGoal === 'Medicine - Small Animal') internGoal = 'Internal Medicine';
      if (internGoal === 'Emergency Medicine/Critical Care') internGoal = 'Emergency';
      if (internGoal === 'Neurology/Neurosurgery') internGoal = 'Neurology';
      if (internGoal === 'Equine') internGoal = 'Rotating - Equine';
      if (internGoal === 'Large Animal') internGoal = 'Rotating - Large/Mixed Animal';
      if (internGoal === 'Zoological Medicine') internGoal = 'Exotic/Wildlife/Zoo';
      
      const validInternships = ['Surgery', 'Internal Medicine', 'Emergency', 'Neurology', 'Cardiology', 'Oncology', 'Radiology', 'Rotating - Equine', 'Rotating - Large/Mixed Animal', 'Exotic/Wildlife/Zoo', 'Ophthalmology'];
      if (!validInternships.includes(internGoal)) {
         internGoal = 'Rotating – Small Animal';
      }

      potInt = programs.filter(p => p.type === 'Internship' && p.category === internGoal);
    }

    const appGpaScore = (5 - app.stats.classRank) * 2.5; 
    const appStrength = (app.stats.lorStrength * wLor) + (app.stats.interview * wInt) + (appGpaScore * wGpa);

    // Score available programs based on applicant preference heuristics
    const scoreGroup = (group) => {
      return group.map(p => {
        const capacityBonus = Math.sqrt(p.positions || 1) * 12.0; 
        const prestige = p.isInstitution ? 8.0 : 0; 
        
        let geoBonus = 0;
        if (p.region === app.preferredRegion) {
           geoBonus = p.type === 'Residency' ? 20.0 : 45.0; 
        }

        let safetyBonus = 0;
        if (appStrength < 7.5 && !p.isInstitution && p.positions <= 3) {
            safetyBonus = 50.0; 
        }

        const noise = Math.random() * 120.0; 
        
        return { id: p.id, appeal: capacityBonus + prestige + geoBonus + safetyBonus + noise };
      }).sort((a, b) => b.appeal - a.appeal);
    };

    let finalIds = [];
    const tierRoll = Math.random();
    
    // Determine Rank List length based on track and ambition tier
    if (app.track === 'Both') {
      const resLimit = (tierRoll < 0.64) ? 10 : (tierRoll < 0.93 ? 20 : 45); 
      const intLimit = (tierRoll < 0.85) ? 10 : (tierRoll < 0.97 ? 20 : 45); 
      
      const rankedRes = scoreGroup(potRes).map(s => s.id).slice(0, resLimit);
      const rankedInt = scoreGroup(potInt).map(s => s.id).slice(0, intLimit);
      
      finalIds = [...rankedRes, ...rankedInt];
    } else if (app.track === 'Residency') {
      const resLimit = (tierRoll < 0.64) ? 10 : (tierRoll < 0.93 ? 20 : 45);
      finalIds = scoreGroup(potRes).map(s => s.id).slice(0, resLimit);
    } else {
      const intLimit = (tierRoll < 0.85) ? 10 : (tierRoll < 0.97 ? 20 : 45);
      finalIds = scoreGroup(potInt).map(s => s.id).slice(0, intLimit);
    }

    app.rankList = Array.from(new Set(finalIds));
  });

  // Evaluate and compile Program Rank Order Lists
  programs.forEach(prog => {
    const interestedApps = applicants.filter(a => a.rankList.includes(prog.id));
    const rankedApps = interestedApps.map(app => {
      const gpaScore = (5 - app.stats.classRank) * 2.5; 
      const programFit = Math.random() * 3.0; 
      
      // Calculate applicant competitive score based on the global Institutional Priority weights
      const score = (app.stats.lorStrength * wLor) + (app.stats.interview * wInt) + (gpaScore * wGpa) + programFit;
      
      return { id: app.id, score };
    });
    
    rankedApps.sort((a, b) => b.score - a.score);

    // Limit the maximum number of applicants a program is willing to rank
    const rankLimit = (prog.positions || 1) * 60; 
    prog.rankList = rankedApps.slice(0, rankLimit).map(a => a.id);
  });

  return { applicants, programs };
}