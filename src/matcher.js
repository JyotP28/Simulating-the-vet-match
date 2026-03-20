// src/matcher.js

function galeShapley(applicants, programs) {
  applicants.forEach(a => {
    a.activeRankList = [...a.rankList];
  });

  let freeApplicants = applicants.filter(a => a.activeRankList.length > 0 && !a.matchedProgram);
  
  while (freeApplicants.length > 0) {
    let applicant = freeApplicants[0];
    
    let topChoiceId = applicant.activeRankList.shift(); 
    let program = programs.find(p => p.id === topChoiceId);

    if (!program) {
        freeApplicants = applicants.filter(a => a.activeRankList.length > 0 && !a.matchedProgram);
        continue;
    }

    if (!program.rankList.includes(applicant.id)) {
        freeApplicants = applicants.filter(a => a.activeRankList.length > 0 && !a.matchedProgram);
        continue; 
    }

    if (program.matchedApplicants.length < program.positions) {
      program.matchedApplicants.push(applicant.id);
      applicant.matchedProgram = program.id;
    } else {
      let newAppRank = program.rankList.indexOf(applicant.id);
      let worstMatchId = program.matchedApplicants[0];
      let worstMatchRank = program.rankList.indexOf(worstMatchId);

      for (let i = 1; i < program.matchedApplicants.length; i++) {
        let currentId = program.matchedApplicants[i];
        let currentRank = program.rankList.indexOf(currentId);
        if (currentRank > worstMatchRank) {
          worstMatchRank = currentRank;
          worstMatchId = currentId;
        }
      }

      if (newAppRank < worstMatchRank) {
        let dumpedApplicant = applicants.find(a => a.id === worstMatchId);
        dumpedApplicant.matchedProgram = null;
        
        program.matchedApplicants = program.matchedApplicants.filter(id => id !== worstMatchId);
        program.matchedApplicants.push(applicant.id);
        applicant.matchedProgram = program.id;
      }
    }
    freeApplicants = applicants.filter(a => a.activeRankList.length > 0 && !a.matchedProgram);
  }
}

export function runDoubleMatch(originalApplicants, originalPrograms) {
  let apps = JSON.parse(JSON.stringify(originalApplicants));
  let progs = JSON.parse(JSON.stringify(originalPrograms));

  // ROUND 1: RESIDENCY
  let resApps = apps.filter(a => a.track === 'Residency' || a.track === 'Both');
  let resProgs = progs.filter(p => p.type === 'Residency');
  
  resApps.forEach(a => {
    a.rankList = originalApplicants.find(orig => orig.id === a.id).rankList.filter(id => resProgs.find(p => p.id === id));
  });

  galeShapley(resApps, resProgs);

  resApps.forEach(ra => {
    if (ra.matchedProgram) {
      let mainApp = apps.find(a => a.id === ra.id);
      mainApp.matchedProgram = ra.matchedProgram;
    }
  });

  // ROUND 2: INTERNSHIP
  let intApps = apps.filter(a => a.track === 'Internship' || (a.track === 'Both' && !a.matchedProgram));
  let intProgs = progs.filter(p => p.type === 'Internship');

  intApps.forEach(a => {
    a.rankList = originalApplicants.find(orig => orig.id === a.id).rankList.filter(id => intProgs.find(p => p.id === id));
  });

  galeShapley(intApps, intProgs);

  // Restore the FULL, original rank lists back to the applicants for the UI.
  apps.forEach(a => {
    a.rankList = originalApplicants.find(orig => orig.id === a.id).rankList;
  });

  let finalPrograms = progs.map(p => {
    let resMatch = resProgs.find(rp => rp.id === p.id);
    let intMatch = intProgs.find(ip => ip.id === p.id);
    return resMatch || intMatch || p;
  });

  return { matchedApplicants: apps, matchedPrograms: finalPrograms };
}