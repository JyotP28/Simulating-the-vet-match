import React, { useState, useEffect } from 'react';
import Papa from 'papaparse';
import { generateSimulationData } from './generator';
import { runDoubleMatch } from './matcher';

/**
 * StableVet Simulator
 * Comprehensive clinical placement engine with mobile-responsive UI.
 */
function App() {
  // --- Core State ---
  const [availablePrograms, setAvailablePrograms] = useState([]);
  const [loadingCsv, setLoadingCsv] = useState(true);
  const [showDisclaimer, setShowDisclaimer] = useState(true);
  
  // --- Applicant Attributes ---
  const [userStats, setUserStats] = useState({ 
    lorStrength: 8.5, 
    interview: 7.0, 
    cvAndStatement: 8.0, 
    classRank: 2 
  });
  
  // --- Institutional Priorities ---
  const [programWeights, setProgramWeights] = useState({ 
    lor: 45, 
    interview: 35, 
    gpa: 20 
  });
  
  // --- User Selection ---
  const [userRankList, setUserRankList] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  
  // --- Match Engine State ---
  const [matchResults, setMatchResults] = useState(null);
  const [isSimulating, setIsSimulating] = useState(false);

  // --- UI/Explorer State ---
  const [draggedItemIndex, setDraggedItemIndex] = useState(null);
  const [dragOverItemIndex, setDragOverItemIndex] = useState(null);
  const [explorerSearch, setExplorerSearch] = useState(''); 
  const [explorerMode, setExplorerMode] = useState('programs'); 
  const [viewedProgram, setViewedProgram] = useState(null);
  const [viewedSchool, setViewedSchool] = useState(null);
  const [viewedApplicant, setViewedApplicant] = useState(null);

  const tokens = {
    colors: {
      primary: '#10b981',
      heading: '#0f172a',
      text: '#334155',
      subtext: '#64748b',
      border: '#e2e8f0',
      accent: '#f8fafc',
      darkCard: '#0f172a',
      white: '#ffffff'
    },
    fonts: {
      display: "'Plus Jakarta Sans', sans-serif",
      body: "'Inter', sans-serif"
    }
  };

  /**
   * Responsive CSS Injection
   * This handles stacking grids on mobile and expanding them on desktop.
   */
  const responsiveStyles = `
    .app-container { padding: 20px 16px; max-width: 1280px; margin: 0 auto; background-color: #fcfcfd; min-height: 100vh; }
    .main-title { font-size: 28px; letter-spacing: -0.02em; margin: 0 0 8px 0; font-weight: 800; }
    
    .grid-2, .grid-3, .stat-grid { display: grid; gap: 24px; align-items: stretch; }
    .grid-2 { grid-template-columns: 1fr; margin-bottom: 24px; }
    .grid-3 { grid-template-columns: 1fr; }
    .stat-grid { grid-template-columns: 1fr; }

    .responsive-card { padding: 24px; border-radius: 20px; display: flex; flex-direction: column; }
    .scroll-box { height: 280px; overflow-y: auto; }
    .explorer-box { height: 350px; overflow-y: auto; }

    @media (min-width: 768px) {
      .app-container { padding: 40px 20px; }
      .main-title { font-size: 42px; letter-spacing: -0.04em; }
      .grid-2 { grid-template-columns: 1fr 1fr; gap: 32px; margin-bottom: 32px; }
      .stat-grid { grid-template-columns: 1fr 1fr; gap: 60px; }
      .responsive-card { padding: 40px; border-radius: 24px; }
      .scroll-box { height: 400px; }
    }

    @media (min-width: 1024px) {
      .grid-3 { grid-template-columns: 1fr 1fr 1fr; gap: 24px; }
      .explorer-box { height: 680px; }
    }
  `;

  useEffect(() => {
    Papa.parse('/virmp.csv', {
      download: true, header: true, skipEmptyLines: true,
      complete: (results) => {
        const loaded = results.data.map((row, index) => {
          const getVal = (keys) => {
            const foundKey = Object.keys(row).find(k => keys.includes(k.toLowerCase().trim()));
            return row[foundKey];
          };
          const title = getVal(['programtitle', 'program title', 'title', 'program_title']);
          const inst = getVal(['institutionname', 'institution name', 'institution', 'institution_name']) || "Unknown Hospital";
          const pos = parseInt(getVal(['positions', 'num positions', 'no_positions', 'positions_available']), 10) || 0;
          const type = (getVal(['programtype', 'type', 'program_type']) || "").includes('R') ? 'Residency' : 'Internship';
          const id = getVal(['programid', 'id', 'program_id']) || `PROG_${index}`;
          return { id, title: `${title} - ${inst}`, institution: inst, type, region: getVal(['region']) || 'North America', positions: pos };
        }).filter(p => p.positions > 0 && p.title);
        setAvailablePrograms(loaded);
        setLoadingCsv(false);
      }
    });
  }, []);

  const handleDragStart = (index) => setDraggedItemIndex(index);
  const handleDragEnter = (index) => setDragOverItemIndex(index);
  const handleDragOver = (e) => e.preventDefault();
  const handleDragEnd = () => {
    if (draggedItemIndex !== null && dragOverItemIndex !== null && draggedItemIndex !== dragOverItemIndex) {
      const newList = [...userRankList];
      const draggedItem = newList[draggedItemIndex];
      newList.splice(draggedItemIndex, 1);
      newList.splice(dragOverItemIndex, 0, draggedItem);
      setUserRankList(newList);
    }
    setDraggedItemIndex(null);
    setDragOverItemIndex(null);
  };

  const executeSimulation = () => {
    setIsSimulating(true);
    setTimeout(() => {
      const userProfile = { id: 'USER', name: 'You (The User)', vetSchool: 'My University', track: 'Internship', specialtyGoal: 'Rotating – Small Animal', stats: userStats, rankList: userRankList, matchedProgram: null };
      const generatedData = generateSimulationData(userProfile, availablePrograms, programWeights);
      const results = runDoubleMatch(generatedData.applicants, generatedData.programs);
      setMatchResults(results);
      setIsSimulating(false);
    }, 600);
  };

  const explorerPrograms = matchResults ? matchResults.matchedPrograms.filter(p => p.title.toLowerCase().includes(explorerSearch.toLowerCase())) : [];
  const uniqueSchools = matchResults ? [...new Set(matchResults.matchedApplicants.map(a => a.vetSchool).filter(Boolean))].sort() : [];
  const schoolApplicants = matchResults && viewedSchool ? matchResults.matchedApplicants.filter(a => a.vetSchool === viewedSchool) : [];

  const renderStatistics = () => {
    if (!matchResults) return null;
    const apps = matchResults.matchedApplicants;
    const progs = matchResults.matchedPrograms;
    const matchedApps = apps.filter(a => a.matchedProgram);
    
    const resPool = apps.filter(a => a.track === 'Residency' || a.track === 'Both');
    const resMatches = matchedApps.filter(a => progs.find(p => p.id === a.matchedProgram)?.type === 'Residency');

    const intPool = apps.filter(a => a.track === 'Internship' || a.track === 'Both');
    const intMatches = matchedApps.filter(a => progs.find(p => p.id === a.matchedProgram)?.type === 'Internship');

    const totalPos = progs.reduce((sum, p) => sum + p.positions, 0);
    const filledPos = progs.reduce((sum, p) => sum + (p.matchedApplicants?.length || 0), 0);

    const intProgs = progs.filter(p => p.type === 'Internship');
    const intTotalPos = intProgs.reduce((s, p) => s + p.positions, 0);
    const intFilledPos = intProgs.reduce((s, p) => s + (p.matchedApplicants?.length || 0), 0);

    const resProgs = progs.filter(p => p.type === 'Residency');
    const resTotalPos = resProgs.reduce((s, p) => s + p.positions, 0);
    const resFilledPos = resProgs.reduce((s, p) => s + (p.matchedApplicants?.length || 0), 0);

    const calcRate = (num, den) => den > 0 ? ((num / den) * 100).toFixed(2) + "%" : "0.00%";

    const StatRow = ({ label, simVal, targetVal, color }) => (
      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: `1px solid ${tokens.colors.border}` }}>
        <span style={{ fontWeight: '500', color: tokens.colors.text, fontSize: '14px' }}>{label}</span>
        <div style={{ display: 'flex', gap: '20px', width: '180px', justifyContent: 'flex-end', fontFamily: tokens.fonts.body }}>
          <span style={{ color: color || tokens.colors.heading, fontWeight: '700' }}>{simVal}</span>
          <span style={{ color: tokens.colors.subtext, width: '50px', textAlign: 'right', fontSize: '12px' }}>{targetVal}</span>
        </div>
      </div>
    );

    return (
      <div className="responsive-card" style={{ background: tokens.colors.white, border: `1px solid ${tokens.colors.border}`, marginBottom: '40px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.04)' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ margin: 0, fontSize: '22px', fontFamily: tokens.fonts.display, letterSpacing: '-0.02em' }}>Simulation vs. 2026 Targets</h2>
          </div>
          <div style={{ display: 'flex', gap: '20px', width: '180px', alignSelf: 'flex-end', fontSize: '11px', fontWeight: '800', color: tokens.colors.subtext, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            <span>Simulated</span>
            <span style={{ width: '50px', textAlign: 'right' }}>Target</span>
          </div>
        </div>
        <div className="stat-grid">
          <div>
            <h3 style={{ fontSize: '12px', color: tokens.colors.primary, textTransform: 'uppercase', marginBottom: '16px', fontWeight: '800' }}>Applicant Match Rates</h3>
            <StatRow label="Overall Match Rate" simVal={calcRate(matchedApps.length, apps.length + apps.filter(a => a.track === 'Both').length)} targetVal="47.96%" color="#0ea5e9" />
            <StatRow label="Human Applicant Match" simVal={calcRate(matchedApps.length, apps.length)} targetVal="60.67%" color="#3b82f6" />
            <StatRow label="Internship Match Rate" simVal={calcRate(intMatches.length, intPool.length)} targetVal="56.18%" color="#10b981" />
            <StatRow label="Residency Match Rate" simVal={calcRate(resMatches.length, resPool.length)} targetVal="34.80%" color="#8b5cf6" />
            <StatRow label="Total Matched" simVal={matchedApps.length.toLocaleString()} targetVal="1,753" />
            <StatRow label="Total Applicants" simVal={apps.length.toLocaleString()} targetVal="2,889" />
          </div>
          <div>
            <h3 style={{ fontSize: '12px', color: tokens.colors.primary, textTransform: 'uppercase', marginBottom: '16px', fontWeight: '800' }}>Position Fill Rates</h3>
            <StatRow label="Overall Fill Rate" simVal={calcRate(filledPos, totalPos)} targetVal="83.56%" color="#f59e0b" />
            <StatRow label="Internship Fill Rate" simVal={calcRate(intFilledPos, intTotalPos)} targetVal="82.56%" color="#10b981" />
            <StatRow label="Residency Fill Rate" simVal={calcRate(resFilledPos, resTotalPos)} targetVal="86.24%" color="#8b5cf6" />
            <StatRow label="Positions Filled" simVal={filledPos.toLocaleString()} targetVal="1,753" />
            <StatRow label="Positions Available" simVal={totalPos.toLocaleString()} targetVal="2,098" />
          </div>
        </div>
      </div>
    );
  };

  if (loadingCsv) return <div style={{ display: 'flex', height: '100vh', justifyContent: 'center', alignItems: 'center', fontFamily: tokens.fonts.display, fontWeight: '700', color: tokens.colors.subtext }}>Calibrating Simulation Engine...</div>;

  const userApp = matchResults?.matchedApplicants.find(a => a.id === 'USER');
  const userRankIndex = userApp?.matchedProgram ? userApp.rankList.indexOf(userApp.matchedProgram) + 1 : null;
  const userMatchedProgram = userApp?.matchedProgram ? availablePrograms.find(p => p.id === userApp.matchedProgram) : null;

  return (
    <div className="app-container" style={{ fontFamily: tokens.fonts.body, color: tokens.colors.heading }}>
      <style>{responsiveStyles}</style>

      {showDisclaimer && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(15, 23, 42, 0.9)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, backdropFilter: 'blur(10px)', padding: '20px' }}>
          <div style={{ backgroundColor: 'white', padding: '32px', borderRadius: '24px', maxWidth: '500px', textAlign: 'center', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)' }}>
            <h2 style={{ fontFamily: tokens.fonts.display, color: tokens.colors.heading, fontSize: '24px', marginBottom: '16px' }}>Simulation Disclaimer</h2>
            <p style={{ color: tokens.colors.subtext, lineHeight: '1.6', marginBottom: '24px', fontSize: '14px' }}>This tool is an independent mathematical simulation designed to explore matching heuristics. It is not indicative of real-world outcomes.</p>
            <button onClick={() => setShowDisclaimer(false)} style={{ padding: '16px 32px', width: '100%', backgroundColor: tokens.colors.heading, color: 'white', border: 'none', borderRadius: '12px', fontSize: '16px', fontWeight: '700', cursor: 'pointer', fontFamily: tokens.fonts.display }}>Enter Simulator</button>
          </div>
        </div>
      )}

      <div style={{ flex: 1 }}>
        <header style={{ marginBottom: '40px', textAlign: 'center' }}>
          <h1 className="main-title" style={{ fontFamily: tokens.fonts.display }}>StableVet Simulator</h1>
          <p style={{ color: tokens.colors.subtext, fontSize: '16px', fontWeight: '500', margin: 0 }}>Empirical Evaluation Modeling for 2026</p>
        </header>

        {/* --- ROW 1: Inputs --- */}
        <div className="grid-2">
          
          <div className="responsive-card" style={{ background: tokens.colors.white, border: `1px solid ${tokens.colors.border}`, boxShadow: '0 4px 6px -1px rgba(0,0,0,0.03)' }}>
            <h2 style={{ marginTop: 0, fontFamily: tokens.fonts.display, fontSize: '20px', marginBottom: '24px' }}>1. Applicant Profile</h2>
            <div style={{ flex: 1 }}>
              {['lorStrength', 'interview', 'cvAndStatement'].map(key => (
                <div key={key} style={{ marginBottom: '24px' }}>
                  <label style={{ display: 'flex', justifyContent: 'space-between', fontWeight: '600', fontSize: '13px', color: tokens.colors.text, marginBottom: '8px' }}>
                    {key === 'lorStrength' ? 'Letters of Recommendation' : key === 'cvAndStatement' ? 'CV & Statement' : 'Interview Performance'} 
                    <span style={{ color: tokens.colors.primary, fontWeight: '800' }}>{userStats[key]}</span>
                  </label>
                  <input type="range" min="1" max="10" step="0.1" value={userStats[key]} style={{ width: '100%', accentColor: tokens.colors.primary }} onChange={e => setUserStats({...userStats, [key]: parseFloat(e.target.value)})} />
                </div>
              ))}
            </div>
            <div style={{ marginTop: 'auto', paddingTop: '16px' }}>
              <label style={{ fontWeight: '700', display: 'block', marginBottom: '12px', fontSize: '13px' }}>Academic Class Rank</label>
              <select style={{ width: '100%', padding: '16px', borderRadius: '12px', border: `1px solid ${tokens.colors.border}`, backgroundColor: tokens.colors.accent, fontFamily: tokens.fonts.body, fontWeight: '600' }} value={userStats.classRank} onChange={e => setUserStats({...userStats, classRank: parseInt(e.target.value)})}>
                <option value="1">Q1 (Top 25%)</option>
                <option value="2">Q2</option>
                <option value="3">Q3</option>
                <option value="4">Q4</option>
              </select>
            </div>
          </div>

          <div className="responsive-card" style={{ background: tokens.colors.darkCard, color: 'white', boxShadow: '0 20px 25px -5px rgba(15, 23, 42, 0.2)' }}>
            <h2 style={{ marginTop: 0, fontFamily: tokens.fonts.display, fontSize: '20px', marginBottom: '12px', color: 'white' }}>2. Institutional Priorities</h2>
            <p style={{ fontSize: '13px', color: '#94a3b8', marginBottom: '32px', lineHeight: '1.5' }}>Adjust the global weights used by the simulated programs to rank candidates.</p>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              {Object.keys(programWeights).map(key => (
                <div key={key} style={{ marginBottom: '32px' }}>
                  <label style={{ display: 'flex', justifyContent: 'space-between', fontWeight: '600', fontSize: '12px', color: '#cbd5e1', marginBottom: '12px' }}>
                    {key === 'lor' ? 'Letters / Reputation' : key === 'interview' ? 'Interview Impressions' : 'GPA / Class Rank'} 
                    <span style={{ color: tokens.colors.primary, fontWeight: '800' }}>{programWeights[key]}%</span>
                  </label>
                  <input type="range" min="0" max="100" step="1" value={programWeights[key]} style={{ width: '100%', accentColor: tokens.colors.primary }} onChange={e => setProgramWeights({...programWeights, [key]: parseInt(e.target.value)})} />
                </div>
              ))}
            </div>
            <div style={{ fontSize: '11px', textAlign: 'center', color: '#64748b', marginTop: 'auto' }}>Weights are normalized automatically to ensure consistency.</div>
          </div>
        </div>

        {/* --- ROW 2: Search & Rank --- */}
        <div className="grid-2">
          
          <div className="responsive-card" style={{ background: tokens.colors.white, border: `1px solid ${tokens.colors.border}` }}>
            <h2 style={{ marginTop: 0, fontFamily: tokens.fonts.display, fontSize: '20px', marginBottom: '16px' }}>3. Program Search</h2>
            <input type="text" placeholder="Search by hospital..." style={{ width: '100%', padding: '14px', marginBottom: '16px', border: `1px solid ${tokens.colors.border}`, borderRadius: '12px', fontSize: '14px' }} onChange={e => setSearchTerm(e.target.value)} />
            <div className="scroll-box">
              {availablePrograms.filter(p => p.title.toLowerCase().includes(searchTerm.toLowerCase())).map(p => (
                <div key={p.id} style={{ padding: '14px 0', borderBottom: `1px solid ${tokens.colors.accent}` }}>
                  <label style={{ cursor: 'pointer', display: 'flex', gap: '14px' }}>
                    <input type="checkbox" style={{ marginTop: '4px', accentColor: tokens.colors.primary }} checked={userRankList.includes(p.id)} onChange={() => setUserRankList(userRankList.includes(p.id) ? userRankList.filter(id => id !== p.id) : [...userRankList, p.id])} />
                    <div style={{ fontSize: '14px' }}>
                      <div style={{ fontWeight: '600' }}>{p.title}</div>
                      <div style={{ fontSize: '12px', color: tokens.colors.subtext }}>{p.positions} spots • {p.type}</div>
                    </div>
                  </label>
                </div>
              ))}
            </div>
          </div>

          <div className="responsive-card" style={{ background: tokens.colors.white, border: `1px solid ${tokens.colors.border}` }}>
            <h2 style={{ marginTop: 0, fontFamily: tokens.fonts.display, fontSize: '20px', marginBottom: '4px' }}>4. Rank Order List</h2>
            <p style={{ fontSize: '12px', color: tokens.colors.subtext, marginBottom: '16px' }}>Drag handles to reorder your matching hierarchy.</p>
            <div className="scroll-box" style={{ padding: '12px', background: tokens.colors.accent, borderRadius: '16px' }}>
              {userRankList.length === 0 && <div style={{ color: tokens.colors.subtext, textAlign: 'center', marginTop: '100px' }}>No programs selected.</div>}
              {userRankList.map((progId, index) => {
                const p = availablePrograms.find(pr => pr.id === progId);
                return (
                  <div key={progId} draggable onDragStart={() => handleDragStart(index)} onDragEnter={() => handleDragEnter(index)} onDragEnd={handleDragEnd} onDragOver={handleDragOver} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: dragOverItemIndex === index ? '#e0f2fe' : 'white', border: `1px solid ${dragOverItemIndex === index ? tokens.colors.primary : tokens.colors.border}`, borderRadius: '12px', marginBottom: '8px', cursor: 'grab', opacity: draggedItemIndex === index ? 0.4 : 1 }}>
                    <div style={{ fontSize: '13px', fontWeight: '600' }}>
                      <span style={{ color: tokens.colors.primary, marginRight: '12px', fontWeight: '800' }}>{index + 1}</span> {p?.title}
                    </div>
                    <div style={{ color: tokens.colors.border, fontSize: '18px' }}>⠿</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <button onClick={executeSimulation} disabled={userRankList.length === 0 || isSimulating} style={{ width: '100%', padding: '20px', background: userRankList.length === 0 ? '#cbd5e1' : `linear-gradient(135deg, ${tokens.colors.primary} 0%, #059669 100%)`, color: 'white', border: 'none', borderRadius: '16px', fontSize: '18px', fontFamily: tokens.fonts.display, fontWeight: '800', cursor: 'pointer' }}>
          {isSimulating ? 'Processing Match...' : 'Run Simulation Match'}
        </button>

        {/* RESULTS SUMMARY */}
        {matchResults && (
          <div style={{ marginTop: '32px', padding: '24px', background: userMatchedProgram ? '#f0fdf4' : '#fef2f2', border: `2px solid ${userMatchedProgram ? tokens.colors.primary : '#f87171'}`, borderRadius: '20px', textAlign: 'center' }}>
            <h2 style={{ margin: '0 0 8px 0', fontFamily: tokens.fonts.display, fontSize: '22px' }}>Your Simulation Result</h2>
            {userMatchedProgram ? (
              <p style={{ margin: 0, fontSize: '16px', fontWeight: '600' }}>Success! Matched choice #{userRankIndex}: <br/> <span style={{fontSize: '20px', fontWeight: '800', display: 'block', marginTop: '12px'}}>{userMatchedProgram.title}</span></p>
            ) : (
              <p style={{ margin: 0, fontSize: '16px', fontWeight: '600' }}>No match found. Expand your rank list or adjust priorities.</p>
            )}
          </div>
        )}

        {/* DATA EXPLORER */}
        {matchResults && (
          <div style={{ marginTop: '60px' }}>
            {renderStatistics()}
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
              <h2 style={{ margin: 0, fontFamily: tokens.fonts.display, fontSize: '24px' }}>Data Explorer</h2>
              <div style={{ display: 'flex', gap: '8px', background: tokens.colors.accent, padding: '6px', borderRadius: '14px', alignSelf: 'flex-start' }}>
                <button onClick={() => setExplorerMode('programs')} style={{ padding: '10px 20px', background: explorerMode === 'programs' ? 'white' : 'transparent', border: 'none', borderRadius: '10px', fontSize: '14px', fontWeight: '700', cursor: 'pointer' }}>Programs</button>
                <button onClick={() => setExplorerMode('schools')} style={{ padding: '10px 20px', background: explorerMode === 'schools' ? 'white' : 'transparent', border: 'none', borderRadius: '10px', fontSize: '14px', fontWeight: '700', cursor: 'pointer' }}>Schools</button>
              </div>
            </div>
            
            <div className="grid-3">
              <div className="responsive-card explorer-box" style={{ background: 'white', border: `1px solid ${tokens.colors.border}`, padding: 0 }}>
                <div style={{ padding: '20px', borderBottom: `1px solid ${tokens.colors.border}` }}>
                  <input type="text" placeholder="Quick filter..." style={{ width: '100%', padding: '12px', borderRadius: '10px', border: `1px solid ${tokens.colors.border}`, boxSizing: 'border-box' }} onChange={e => setExplorerSearch(e.target.value)} />
                </div>
                <div style={{ overflowY: 'auto', flex: 1 }}>
                  {explorerMode === 'programs' ? (
                    explorerPrograms.map(p => (
                      <div key={p.id} onClick={() => setViewedProgram(p)} style={{ padding: '16px 20px', borderBottom: `1px solid ${tokens.colors.accent}`, cursor: 'pointer', background: viewedProgram?.id === p.id ? '#eff6ff' : 'transparent' }}>
                        <div style={{ fontWeight: '700', fontSize: '13px' }}>{p.title}</div>
                        <div style={{ fontSize: '11px', color: tokens.colors.subtext, marginTop: '4px' }}>{p.matchedApplicants?.length || 0} / {p.positions} Filled</div>
                      </div>
                    ))
                  ) : (
                    uniqueSchools.map(school => (
                      <div key={school} onClick={() => setViewedSchool(school)} style={{ padding: '16px 20px', borderBottom: `1px solid ${tokens.colors.accent}`, cursor: 'pointer', fontWeight: '600', fontSize: '13px', background: viewedSchool === school ? '#eff6ff' : 'transparent' }}>{school}</div>
                    ))
                  )}
                </div>
              </div>

              <div className="responsive-card explorer-box" style={{ background: 'white', border: `1px solid ${tokens.colors.border}`, padding: 0 }}>
                <div style={{ padding: '20px', borderBottom: `1px solid ${tokens.colors.border}`, fontWeight: '800', fontSize: '11px', textTransform: 'uppercase', color: tokens.colors.subtext }}>Applicant Pool</div>
                <div style={{ overflowY: 'auto', flex: 1 }}>
                  {explorerMode === 'programs' && viewedProgram ? (
                    viewedProgram.rankList.map((appId, i) => {
                      const app = matchResults.matchedApplicants.find(a => a.id === appId);
                      const matched = viewedProgram.matchedApplicants.includes(appId);
                      return <div key={appId} onClick={() => setViewedApplicant(app)} style={{ padding: '16px 20px', cursor: 'pointer', background: viewedApplicant?.id === appId ? tokens.colors.accent : 'transparent', borderBottom: `1px solid ${tokens.colors.accent}`, fontSize: '13px', fontWeight: matched ? '700' : '400' }}>{i+1}. {app?.name} {matched && '✅'}</div>;
                    })
                  ) : explorerMode === 'schools' && viewedSchool ? (
                    schoolApplicants.map(app => (
                      <div key={app.id} onClick={() => setViewedApplicant(app)} style={{ padding: '16px 20px', cursor: 'pointer', background: viewedApplicant?.id === app.id ? tokens.colors.accent : 'transparent', borderBottom: `1px solid ${tokens.colors.accent}`, fontSize: '13px', fontWeight: app.matchedProgram ? '700' : '400' }}>{app.name} {app.matchedProgram ? '✅' : '❌'}</div>
                    ))
                  ) : <div style={{ textAlign: 'center', marginTop: '100px', color: tokens.colors.subtext }}>Select an item to view data.</div>}
                </div>
              </div>

              <div className="responsive-card explorer-box" style={{ background: 'white', border: `1px solid ${tokens.colors.border}`, padding: '24px' }}>
                {viewedApplicant ? (
                  <>
                    <h3 style={{ margin: '0 0 6px 0', fontFamily: tokens.fonts.display, fontSize: '20px' }}>{viewedApplicant.name}</h3>
                    <p style={{ color: tokens.colors.primary, fontWeight: '800', fontSize: '14px', margin: '0 0 20px 0' }}>{viewedApplicant.vetSchool}</p>
                    <div style={{ background: tokens.colors.accent, padding: '16px', borderRadius: '12px', marginBottom: '20px', fontSize: '13px', lineHeight: '1.6' }}>
                      <strong>Goal:</strong> {viewedApplicant.specialtyGoal} <br/>
                      <strong>Track:</strong> {viewedApplicant.track}
                      {viewedApplicant.id !== 'USER' && <><br/><strong>Region:</strong> {viewedApplicant.preferredRegion}</>}
                    </div>
                    <div style={{ background: '#eff6ff', padding: '16px', borderRadius: '12px', marginBottom: '20px', border: '1px solid #bfdbfe' }}>
                      <strong style={{ fontSize: '11px', textTransform: 'uppercase', color: '#1e3a8a', display: 'block', marginBottom: '12px' }}>Evaluation Metrics</strong>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                        <div><div style={{ fontSize: '18px', fontWeight: '800', color: '#1d4ed8' }}>{viewedApplicant.stats.lorStrength.toFixed(1)}</div><div style={{ fontSize: '10px', color: '#1e3a8a' }}>LOR Score</div></div>
                        <div><div style={{ fontSize: '18px', fontWeight: '800', color: '#1d4ed8' }}>{viewedApplicant.stats.interview.toFixed(1)}</div><div style={{ fontSize: '10px', color: '#1e3a8a' }}>Interview</div></div>
                      </div>
                    </div>
                    <strong style={{ fontSize: '13px', display: 'block', marginBottom: '12px' }}>Rank Order List</strong>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {viewedApplicant.rankList.map((pid, idx) => {
                        const p = availablePrograms.find(pr => pr.id === pid);
                        const isMatch = viewedApplicant.matchedProgram === pid;
                        return <div key={pid} style={{ fontSize: '11px', padding: '10px', background: isMatch ? '#f0fdf4' : tokens.colors.accent, border: isMatch ? `1px solid ${tokens.colors.primary}` : 'none', borderRadius: '8px', color: tokens.colors.text }}>{idx + 1}. {p?.title} {isMatch && '✅'}</div>;
                      })}
                    </div>
                  </>
                ) : <div style={{ textAlign: 'center', marginTop: '100px', color: tokens.colors.subtext }}>Applicant Details</div>}
              </div>
            </div>
          </div>
        )}
      </div>

      <footer style={{ marginTop: '80px', padding: '40px 0', borderTop: `1px solid ${tokens.colors.border}`, textAlign: 'center' }}>
        <p style={{ margin: '0 0 20px 0', fontSize: '14px', color: tokens.colors.subtext, fontWeight: '500' }}>Developed as an interactive simulation of veterinary match mechanics.</p>
        <a href="https://www.linkedin.com/in/jyotpatel28/" target="_blank" rel="noopener noreferrer" style={{ color: tokens.colors.heading, textDecoration: 'none', fontWeight: '800', border: `2px solid ${tokens.colors.heading}`, padding: '12px 24px', borderRadius: '12px', fontSize: '14px' }}>Connect on LinkedIn</a>
      </footer>
    </div>
  );
}

export default App;