import React, { useState, useEffect } from 'react';
import Papa from 'papaparse';
import { generateSimulationData } from './generator';
import { runDoubleMatch } from './matcher';

/**
 * StableVet Simulator
 * Comprehensive clinical placement engine with symmetrical UI alignment.
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
    classRank: 2,
    track: 'Both'
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
   * Data Loading
   */
  useEffect(() => {
    Papa.parse('/virmp.csv', {
      download: true,
      header: true,
      skipEmptyLines: true,
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
          return { 
            id, 
            title: `${title} - ${inst}`, 
            institution: inst, 
            type, 
            region: getVal(['region']) || 'North America', 
            positions: pos 
          };
        }).filter(p => p.positions > 0 && p.title);
        setAvailablePrograms(loaded);
        setLoadingCsv(false);
      }
    });
  }, []);

  // --- Handlers ---
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

  /**
   * Execute Algorithm
   */
  const executeSimulation = () => {
    setIsSimulating(true);
    setTimeout(() => {
      const userProfile = { 
        id: 'USER', 
        name: 'You (The User)', 
        vetSchool: 'My University', 
        track: userStats.track,
        specialtyGoal: 'Manual Selection', // Placeholder for the engine since user manually ranks
        stats: userStats, 
        rankList: userRankList, 
        matchedProgram: null 
      };
      const generatedData = generateSimulationData(userProfile, availablePrograms, programWeights);
      const results = runDoubleMatch(generatedData.applicants, generatedData.programs);
      setMatchResults(results);
      setIsSimulating(false);
    }, 600);
  };

  // --- UI Helpers ---
  const explorerPrograms = matchResults ? matchResults.matchedPrograms.filter(p => p.title.toLowerCase().includes(explorerSearch.toLowerCase())) : [];
  const uniqueSchools = matchResults ? [...new Set(matchResults.matchedApplicants.map(a => a.vetSchool).filter(Boolean))].sort() : [];
  const schoolApplicants = matchResults && viewedSchool ? matchResults.matchedApplicants.filter(a => a.vetSchool === viewedSchool) : [];

  /**
   * Analytics Section
   */
  const renderStatistics = () => {
    if (!matchResults) return null;
    const apps = matchResults.matchedApplicants;
    const progs = matchResults.matchedPrograms;
    const matchedCount = apps.filter(a => a.matchedProgram).length;
    const totalPos = progs.reduce((sum, p) => sum + p.positions, 0);
    const filledPos = progs.reduce((sum, p) => sum + (p.matchedApplicants?.length || 0), 0);
    
    // Calculate Internship vs Residency specifics
    const resPool = apps.filter(a => a.track === 'Residency' || a.track === 'Both');
    const resMatches = apps.filter(a => a.matchedProgram && progs.find(p => p.id === a.matchedProgram)?.type === 'Residency');
    const intPool = apps.filter(a => a.track === 'Internship' || a.track === 'Both');
    const intMatches = apps.filter(a => a.matchedProgram && progs.find(p => p.id === a.matchedProgram)?.type === 'Internship');
    
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
        <div style={{ display: 'flex', gap: '30px', width: '220px', justifyContent: 'flex-end', fontFamily: tokens.fonts.body }}>
          <span style={{ color: color || tokens.colors.heading, fontWeight: '700' }}>{simVal}</span>
          <span style={{ color: tokens.colors.subtext, width: '60px', textAlign: 'right', fontSize: '12px' }}>{targetVal}</span>
        </div>
      </div>
    );

    return (
      <div style={{ background: tokens.colors.white, padding: '32px', borderRadius: '24px', border: `1px solid ${tokens.colors.border}`, marginBottom: '40px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.04)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h2 style={{ margin: 0, fontSize: '22px', fontFamily: tokens.fonts.display, letterSpacing: '-0.02em' }}>Simulation vs. 2026 Target Accuracy</h2>
          <div style={{ display: 'flex', gap: '30px', width: '220px', justifyContent: 'flex-end', fontSize: '11px', fontWeight: '800', color: tokens.colors.subtext, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            <span>Simulated</span>
            <span style={{ width: '60px', textAlign: 'right' }}>Target</span>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '60px' }}>
          <div>
            <h3 style={{ fontSize: '12px', color: tokens.colors.primary, textTransform: 'uppercase', marginBottom: '16px', fontWeight: '800' }}>Applicant Match Rates</h3>
            <StatRow label="Overall Match Rate" simVal={calcRate(matchedCount, apps.length)} targetVal="47.96%" color="#0ea5e9" />
            <StatRow label="Internship Match Rate" simVal={calcRate(intMatches.length, intPool.length)} targetVal="56.18%" color="#10b981" />
            <StatRow label="Residency Match Rate" simVal={calcRate(resMatches.length, resPool.length)} targetVal="34.80%" color="#8b5cf6" />
            <StatRow label="Total Applicants Matched" simVal={matchedCount.toLocaleString()} targetVal="1,753" />
            <StatRow label="Total Applicants in Pool" simVal={apps.length.toLocaleString()} targetVal="2,889" />
          </div>
          <div>
            <h3 style={{ fontSize: '12px', color: tokens.colors.primary, textTransform: 'uppercase', marginBottom: '16px', fontWeight: '800' }}>Position Fill Rates</h3>
            <StatRow label="Overall Fill Rate" simVal={calcRate(filledPos, totalPos)} targetVal="83.56%" color="#f59e0b" />
            <StatRow label="Internship Fill Rate" simVal={calcRate(intFilledPos, intTotalPos)} targetVal="82.56%" color="#10b981" />
            <StatRow label="Residency Fill Rate" simVal={calcRate(resFilledPos, resTotalPos)} targetVal="86.24%" color="#8b5cf6" />
            <StatRow label="Total Positions Filled" simVal={filledPos.toLocaleString()} targetVal="1,753" />
            <StatRow label="Total Positions Available" simVal={totalPos.toLocaleString()} targetVal="2,098" />
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
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', padding: '40px 20px', fontFamily: tokens.fonts.body, maxWidth: '1280px', margin: '0 auto', color: tokens.colors.heading, backgroundColor: '#fcfcfd' }}>
      
      {showDisclaimer && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(15, 23, 42, 0.9)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, backdropFilter: 'blur(10px)', padding: '20px' }}>
          <div style={{ backgroundColor: 'white', padding: '48px', borderRadius: '32px', maxWidth: '540px', textAlign: 'center', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)' }}>
            <h2 style={{ fontFamily: tokens.fonts.display, color: tokens.colors.heading, fontSize: '28px', marginBottom: '16px' }}>Simulation Disclaimer</h2>
            <p style={{ color: tokens.colors.subtext, lineHeight: '1.7', marginBottom: '32px', fontSize: '15px' }}>This tool is an independent mathematical simulation designed to explore matching heuristics. It is not indicative of real-world outcomes.</p>
            <button onClick={() => setShowDisclaimer(false)} style={{ padding: '16px 40px', backgroundColor: tokens.colors.heading, color: 'white', border: 'none', borderRadius: '14px', fontSize: '16px', fontWeight: '700', cursor: 'pointer', fontFamily: tokens.fonts.display }}>Enter Simulator</button>
          </div>
        </div>
      )}

      <div style={{ flex: 1 }}>
        <header style={{ marginBottom: '56px', textAlign: 'center' }}>
          <h1 style={{ margin: '0 0 8px 0', fontFamily: tokens.fonts.display, fontSize: '42px', fontWeight: '800', letterSpacing: '-0.04em' }}>Veterinary Match Simulator</h1>
          <p style={{ color: tokens.colors.subtext, fontSize: '18px', fontWeight: '500' }}>Using 2026 match data</p>
        </header>

        {/* --- ROW 1: Symmetrical Input Boxes --- */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px', marginBottom: '32px', alignItems: 'stretch' }}>
          
          {/* 1. Applicant Profile */}
          <div style={{ display: 'flex', flexDirection: 'column', background: tokens.colors.white, padding: '40px', borderRadius: '24px', border: `1px solid ${tokens.colors.border}`, boxShadow: '0 4px 6px -1px rgba(0,0,0,0.03)' }}>
            <h2 style={{ marginTop: 0, fontFamily: tokens.fonts.display, fontSize: '20px', marginBottom: '32px' }}>1. Applicant Profile</h2>
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
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ fontWeight: '700', display: 'block', marginBottom: '8px', fontSize: '11px', textTransform: 'uppercase', color: tokens.colors.subtext }}>Class Rank</label>
                  <select style={{ width: '100%', padding: '12px', borderRadius: '10px', border: `1px solid ${tokens.colors.border}`, backgroundColor: tokens.colors.accent, fontFamily: tokens.fonts.body, fontWeight: '600', fontSize: '13px' }} value={userStats.classRank} onChange={e => setUserStats({...userStats, classRank: parseInt(e.target.value)})}>
                    <option value="1">Q1 (Top 25%)</option>
                    <option value="2">Q2</option>
                    <option value="3">Q3</option>
                    <option value="4">Q4</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontWeight: '700', display: 'block', marginBottom: '8px', fontSize: '11px', textTransform: 'uppercase', color: tokens.colors.subtext }}>Match Track</label>
                  <select style={{ width: '100%', padding: '12px', borderRadius: '10px', border: `1px solid ${tokens.colors.border}`, backgroundColor: tokens.colors.accent, fontFamily: tokens.fonts.body, fontWeight: '600', fontSize: '13px' }} value={userStats.track} onChange={e => setUserStats({...userStats, track: e.target.value})}>
                    <option value="Internship">Internship Only</option>
                    <option value="Residency">Residency Only</option>
                    <option value="Both">Both (Int + Res)</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* 2. Institutional Priorities */}
          <div style={{ display: 'flex', flexDirection: 'column', background: tokens.colors.darkCard, padding: '40px', borderRadius: '24px', color: 'white', boxShadow: '0 20px 25px -5px rgba(15, 23, 42, 0.2)' }}>
            <h2 style={{ marginTop: 0, fontFamily: tokens.fonts.display, fontSize: '20px', marginBottom: '12px', color: 'white' }}>2. Institutional Priorities</h2>
            <p style={{ fontSize: '13px', color: '#94a3b8', marginBottom: '40px', lineHeight: '1.5' }}>Adjust the global weights used by the simulated programs to rank 2,800+ candidates.</p>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              {Object.keys(programWeights).map(key => (
                <div key={key} style={{ marginBottom: '40px' }}>
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

        {/* --- ROW 2: Symmetrical Search & Rank --- */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px', marginBottom: '40px', alignItems: 'stretch' }}>
          
          <div style={{ display: 'flex', flexDirection: 'column', background: tokens.colors.white, padding: '40px', borderRadius: '24px', border: `1px solid ${tokens.colors.border}` }}>
            <h2 style={{ marginTop: 0, fontFamily: tokens.fonts.display, fontSize: '20px', marginBottom: '24px' }}>3. Program Search</h2>
            <input type="text" placeholder="Search by hospital or specialty..." style={{ width: '100%', padding: '16px', marginBottom: '24px', border: `1px solid ${tokens.colors.border}`, borderRadius: '12px', fontSize: '14px' }} onChange={e => setSearchTerm(e.target.value)} />
            <div style={{ height: '400px', overflowY: 'auto' }}>
              {availablePrograms.filter(p => p.title.toLowerCase().includes(searchTerm.toLowerCase())).map(p => (
                <div key={p.id} style={{ padding: '14px 0', borderBottom: `1px solid ${tokens.colors.accent}` }}>
                  <label style={{ cursor: 'pointer', display: 'flex', gap: '14px' }}>
                    <input type="checkbox" style={{ marginTop: '4px', width: '18px', height: '18px', accentColor: tokens.colors.primary }} checked={userRankList.includes(p.id)} onChange={() => setUserRankList(userRankList.includes(p.id) ? userRankList.filter(id => id !== p.id) : [...userRankList, p.id])} />
                    <div style={{ fontSize: '14px' }}>
                      <div style={{ fontWeight: '600' }}>{p.title}</div>
                      <div style={{ fontSize: '12px', color: tokens.colors.subtext }}>{p.positions} spots • {p.type}</div>
                    </div>
                  </label>
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', background: tokens.colors.white, padding: '40px', borderRadius: '24px', border: `1px solid ${tokens.colors.border}` }}>
            <h2 style={{ marginTop: 0, fontFamily: tokens.fonts.display, fontSize: '20px', marginBottom: '4px' }}>4. Rank Order List</h2>
            <p style={{ fontSize: '12px', color: tokens.colors.subtext, marginBottom: '24px' }}>Drag handles to reorder your matching hierarchy.</p>
            <div style={{ flex: 1, overflowY: 'auto', padding: '14px', background: tokens.colors.accent, borderRadius: '16px', minHeight: '400px' }}>
              {userRankList.length === 0 && <div style={{ color: tokens.colors.subtext, textAlign: 'center', marginTop: '140px' }}>No programs selected.</div>}
              {userRankList.map((progId, index) => {
                const p = availablePrograms.find(pr => pr.id === progId);
                return (
                  <div key={progId} draggable onDragStart={() => handleDragStart(index)} onDragEnter={() => handleDragEnter(index)} onDragEnd={handleDragEnd} onDragOver={handleDragOver} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 18px', background: dragOverItemIndex === index ? '#e0f2fe' : 'white', border: `1px solid ${dragOverItemIndex === index ? tokens.colors.primary : tokens.colors.border}`, borderRadius: '12px', marginBottom: '12px', cursor: 'grab', opacity: draggedItemIndex === index ? 0.4 : 1, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                    <div style={{ fontSize: '13px', fontWeight: '600' }}>
                      <span style={{ color: tokens.colors.primary, marginRight: '14px', fontWeight: '800' }}>{index + 1}</span> {p?.title}
                    </div>
                    <div style={{ color: tokens.colors.border, fontSize: '18px' }}>⠿</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <button onClick={executeSimulation} disabled={userRankList.length === 0 || isSimulating} style={{ width: '100%', padding: '24px', background: userRankList.length === 0 ? '#cbd5e1' : `linear-gradient(135deg, ${tokens.colors.primary} 0%, #059669 100%)`, color: 'white', border: 'none', borderRadius: '20px', fontSize: '20px', fontFamily: tokens.fonts.display, fontWeight: '800', cursor: 'pointer', boxShadow: userRankList.length === 0 ? 'none' : '0 20px 25px -5px rgba(16, 185, 129, 0.3)' }}>
          {isSimulating ? 'Processing Stable Matching Engine...' : 'Run Simulation Match'}
        </button>

        {/* PERSONAL RESULTS BOX */}
        {matchResults && (
          <div style={{ marginTop: '40px', padding: '40px', background: userMatchedProgram ? '#f0fdf4' : '#fef2f2', border: `2px solid ${userMatchedProgram ? tokens.colors.primary : '#f87171'}`, borderRadius: '28px', textAlign: 'center' }}>
            <h2 style={{ margin: '0 0 12px 0', fontFamily: tokens.fonts.display, fontSize: '26px', color: userMatchedProgram ? '#065f46' : '#991b1b' }}>Your Simulation Result</h2>
            {userMatchedProgram ? (
              <p style={{ margin: 0, fontSize: '20px', fontWeight: '600' }}>Success! Matched with choice #{userRankIndex}: <br/> <span style={{fontSize: '28px', fontWeight: '800', display: 'block', marginTop: '12px'}}>{userMatchedProgram.title}</span></p>
            ) : (
              <p style={{ margin: 0, fontSize: '20px', fontWeight: '600' }}>No Match in this simulation. Consider broadening your rank list or adjusting the priority weights.</p>
            )}
          </div>
        )}

        {/* DATA EXPLORER & ANALYTICS */}
        {matchResults && (
          <div style={{ marginTop: '80px' }}>
            {renderStatistics()}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
              <h2 style={{ margin: 0, fontFamily: tokens.fonts.display, fontSize: '24px' }}>Data Explorer</h2>
              <div style={{ display: 'flex', gap: '8px', background: tokens.colors.accent, padding: '6px', borderRadius: '14px' }}>
                <button onClick={() => setExplorerMode('programs')} style={{ padding: '12px 28px', background: explorerMode === 'programs' ? 'white' : 'transparent', border: 'none', borderRadius: '10px', fontSize: '14px', fontWeight: '700', cursor: 'pointer', boxShadow: explorerMode === 'programs' ? '0 4px 6px rgba(0,0,0,0.05)' : 'none' }}>Programs</button>
                <button onClick={() => setExplorerMode('schools')} style={{ padding: '12px 28px', background: explorerMode === 'schools' ? 'white' : 'transparent', border: 'none', borderRadius: '10px', fontSize: '14px', fontWeight: '700', cursor: 'pointer', boxShadow: explorerMode === 'schools' ? '0 4px 6px rgba(0,0,0,0.05)' : 'none' }}>Schools</button>
              </div>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '24px', height: '680px' }}>
              <div style={{ background: 'white', border: `1px solid ${tokens.colors.border}`, borderRadius: '24px', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                <div style={{ padding: '24px', borderBottom: `1px solid ${tokens.colors.border}` }}>
                  <input type="text" placeholder="Quick filter..." style={{ width: '100%', padding: '14px', borderRadius: '12px', border: `1px solid ${tokens.colors.border}`, boxSizing: 'border-box', fontSize: '13px' }} onChange={e => setExplorerSearch(e.target.value)} />
                </div>
                <div style={{ overflowY: 'auto', flex: 1 }}>
                  {explorerMode === 'programs' ? (
                    explorerPrograms.map(p => (
                      <div key={p.id} onClick={() => setViewedProgram(p)} style={{ padding: '18px 24px', borderBottom: `1px solid ${tokens.colors.accent}`, cursor: 'pointer', background: viewedProgram?.id === p.id ? '#eff6ff' : 'transparent' }}>
                        <div style={{ fontWeight: '700', fontSize: '13px' }}>{p.title}</div>
                        <div style={{ fontSize: '11px', color: tokens.colors.subtext, marginTop: '4px' }}>{p.matchedApplicants?.length || 0} / {p.positions} Filled</div>
                      </div>
                    ))
                  ) : (
                    uniqueSchools.map(school => (
                      <div key={school} onClick={() => setViewedSchool(school)} style={{ padding: '18px 24px', borderBottom: `1px solid ${tokens.colors.accent}`, cursor: 'pointer', fontWeight: '600', fontSize: '13px', background: viewedSchool === school ? '#eff6ff' : 'transparent' }}>{school}</div>
                    ))
                  )}
                </div>
              </div>

              <div style={{ background: 'white', border: `1px solid ${tokens.colors.border}`, borderRadius: '24px', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                <div style={{ padding: '20px 24px', borderBottom: `1px solid ${tokens.colors.border}`, fontWeight: '800', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.1em', color: tokens.colors.subtext }}>Applicant Pool</div>
                <div style={{ overflowY: 'auto', flex: 1 }}>
                  {explorerMode === 'programs' && viewedProgram ? (
                    viewedProgram.rankList.map((appId, i) => {
                      const app = matchResults.matchedApplicants.find(a => a.id === appId);
                      const matched = viewedProgram.matchedApplicants.includes(appId);
                      return <div key={appId} onClick={() => setViewedApplicant(app)} style={{ padding: '16px 24px', cursor: 'pointer', background: viewedApplicant?.id === appId ? tokens.colors.accent : 'transparent', borderBottom: `1px solid ${tokens.colors.accent}`, fontSize: '13px', fontWeight: matched ? '700' : '400' }}>{i+1}. {app?.name} {matched && '✅'}</div>;
                    })
                  ) : explorerMode === 'schools' && viewedSchool ? (
                    schoolApplicants.map(app => (
                      <div key={app.id} onClick={() => setViewedApplicant(app)} style={{ padding: '16px 24px', cursor: 'pointer', background: viewedApplicant?.id === app.id ? tokens.colors.accent : 'transparent', borderBottom: `1px solid ${tokens.colors.accent}`, fontSize: '13px', fontWeight: app.matchedProgram ? '700' : '400' }}>{app.name} {app.matchedProgram ? '✅' : '❌'}</div>
                    ))
                  ) : <div style={{ textAlign: 'center', marginTop: '120px', color: tokens.colors.subtext, fontSize: '13px' }}>Select an item to view data.</div>}
                </div>
              </div>

              <div style={{ background: 'white', border: `1px solid ${tokens.colors.border}`, borderRadius: '24px', padding: '32px', overflowY: 'auto' }}>
                {viewedApplicant ? (
                  <>
                    <h3 style={{ margin: '0 0 6px 0', fontFamily: tokens.fonts.display, fontSize: '24px' }}>{viewedApplicant.name}</h3>
                    <p style={{ color: tokens.colors.primary, fontWeight: '800', fontSize: '14px', margin: '0 0 28px 0' }}>{viewedApplicant.vetSchool}</p>
                    <div style={{ background: tokens.colors.accent, padding: '20px', borderRadius: '16px', marginBottom: '28px', fontSize: '13px', lineHeight: '1.6' }}>
                      <strong>Goal:</strong> {viewedApplicant.id === 'USER' ? 'Manual Selection' : viewedApplicant.specialtyGoal} <br/>
                      <strong>Track:</strong> {viewedApplicant.track}
                      {viewedApplicant.id !== 'USER' && <><br/><strong>Region:</strong> {viewedApplicant.preferredRegion}</>}
                    </div>
                    <div style={{ background: '#eff6ff', padding: '24px', borderRadius: '18px', marginBottom: '28px', border: '1px solid #bfdbfe' }}>
                      <strong style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#1e3a8a', display: 'block', marginBottom: '16px' }}>Evaluation Metrics</strong>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                        <div><div style={{ fontSize: '22px', fontWeight: '800', color: '#1d4ed8' }}>{viewedApplicant.stats.lorStrength.toFixed(1)}</div><div style={{ fontSize: '10px', color: '#1e3a8a' }}>LOR Score</div></div>
                        <div><div style={{ fontSize: '22px', fontWeight: '800', color: '#1d4ed8' }}>{viewedApplicant.stats.interview.toFixed(1)}</div><div style={{ fontSize: '10px', color: '#1e3a8a' }}>Interview</div></div>
                      </div>
                    </div>
                    <strong style={{ fontSize: '13px', display: 'block', marginBottom: '16px' }}>Rank Order List</strong>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {viewedApplicant.rankList.map((pid, idx) => {
                        const p = availablePrograms.find(pr => pr.id === pid);
                        const isMatch = viewedApplicant.matchedProgram === pid;
                        return <div key={pid} style={{ fontSize: '11px', padding: '12px', background: isMatch ? '#f0fdf4' : tokens.colors.accent, border: isMatch ? `1px solid ${tokens.colors.primary}` : 'none', borderRadius: '10px', color: tokens.colors.text }}>{idx + 1}. {p?.title} {isMatch && '✅'}</div>;
                      })}
                    </div>
                  </>
                ) : <div style={{ textAlign: 'center', marginTop: '240px', color: tokens.colors.subtext, fontSize: '13px' }}>Applicant Details</div>}
              </div>
            </div>
          </div>
        )}
      </div>

      <footer style={{ marginTop: '120px', padding: '64px 0', borderTop: `1px solid ${tokens.colors.border}`, textAlign: 'center' }}>
        <p style={{ margin: '0 0 20px 0', fontSize: '15px', color: tokens.colors.subtext, fontWeight: '500' }}>Developed as an interactive simulation of veterinary match mechanics.</p>
        <a href="https://www.linkedin.com/in/jyotpatel28/" target="_blank" rel="noopener noreferrer" style={{ color: tokens.colors.heading, textDecoration: 'none', fontWeight: '800', border: `2px solid ${tokens.colors.heading}`, padding: '14px 32px', borderRadius: '14px', fontSize: '14px', transition: 'all 0.2s' }}>Connect on LinkedIn</a>
      </footer>
    </div>
  );
}

export default App;