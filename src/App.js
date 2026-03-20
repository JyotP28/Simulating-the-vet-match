// src/App.js
import React, { useState, useEffect } from 'react';
import Papa from 'papaparse';
import { generateSimulationData } from './generator';
import { runDoubleMatch } from './matcher';

function App() {
  const [availablePrograms, setAvailablePrograms] = useState([]);
  const [userStats, setUserStats] = useState({ lorStrength: 8.5, interview: 7.0, cvAndStatement: 8.0, classRank: 2 });
  const [programWeights, setProgramWeights] = useState({ lor: 45, interview: 35, gpa: 20 });
  const [userRankList, setUserRankList] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [explorerSearch, setExplorerSearch] = useState(''); 
  const [matchResults, setMatchResults] = useState(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [loadingCsv, setLoadingCsv] = useState(true);
  const [showDisclaimer, setShowDisclaimer] = useState(true);

  const [draggedItemIndex, setDraggedItemIndex] = useState(null);
  const [dragOverItemIndex, setDragOverItemIndex] = useState(null);

  const [explorerMode, setExplorerMode] = useState('programs'); 
  const [viewedProgram, setViewedProgram] = useState(null);
  const [viewedSchool, setViewedSchool] = useState(null);
  const [viewedApplicant, setViewedApplicant] = useState(null);

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

          const lowerInst = inst.toLowerCase();
          const isInst = lowerInst.includes('university') || lowerInst.includes('college') || lowerInst.includes('school') || lowerInst.includes('vth');

          return { 
            id, 
            title: `${title} - ${inst}`, 
            institution: inst,
            type, 
            locationType: isInst ? 'Institution' : 'Private Practice', 
            positions: pos 
          };
        }).filter(p => p.positions > 0 && p.title);

        setAvailablePrograms(loaded);
        setLoadingCsv(false);
      },
      error: () => {
        alert("Csv error. Ensure virmp.csv is in the public folder.");
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
      const userProfile = { 
        id: 'USER', 
        name: 'You (The User)', 
        vetSchool: 'My University', 
        track: 'Internship', 
        specialtyGoal: 'Rotating – Small Animal', 
        stats: userStats, 
        rankList: userRankList, 
        matchedProgram: null 
      };
      const generatedData = generateSimulationData(userProfile, availablePrograms, programWeights);
      const results = runDoubleMatch(generatedData.applicants, generatedData.programs);
      setMatchResults(results);
      setIsSimulating(false);
    }, 500);
  };

  const explorerPrograms = matchResults 
    ? matchResults.matchedPrograms.filter(p => p.title.toLowerCase().includes(explorerSearch.toLowerCase())) 
    : [];

  const uniqueSchools = matchResults 
    ? [...new Set(matchResults.matchedApplicants.map(a => a.vetSchool).filter(Boolean))].sort() 
    : [];

  const schoolApplicants = matchResults && viewedSchool 
    ? matchResults.matchedApplicants.filter(a => a.vetSchool === viewedSchool) 
    : [];

  const renderStatistics = () => {
    if (!matchResults) return null;
    const apps = matchResults.matchedApplicants;
    const progs = matchResults.matchedPrograms;
    const matchedApps = apps.filter(a => a.matchedProgram);
    const resPool = apps.filter(a => a.track === 'Residency' || a.track === 'Both');
    const resMatches = matchedApps.filter(a => {
        const p = progs.find(prog => prog.id === a.matchedProgram);
        return p?.type === 'Residency';
    });
    const intPool = apps.filter(a => a.track === 'Internship' || a.track === 'Both');
    const intMatches = matchedApps.filter(a => {
        const p = progs.find(prog => prog.id === a.matchedProgram);
        return p?.type === 'Internship';
    });

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
      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #f1f5f9' }}>
        <span style={{ fontWeight: '500', color: '#475569' }}>{label}</span>
        <div style={{ display: 'flex', gap: '30px', width: '200px', justifyContent: 'flex-end' }}>
          <span style={{ color: color || '#0f172a', fontWeight: 'bold' }}>{simVal}</span>
          <span style={{ color: '#94a3b8', width: '60px', textAlign: 'right' }}>{targetVal}</span>
        </div>
      </div>
    );

    return (
      <div style={{ background: '#fff', padding: '25px', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '30px', boxShadow: '0 4px 6px rgba(0,0,0,0.02)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '20px' }}>
          <h2 style={{ margin: 0, fontSize: '20px' }}>Simulation vs. 2026 Target Accuracy</h2>
          <div style={{ display: 'flex', gap: '30px', width: '200px', justifyContent: 'flex-end', fontSize: '12px', fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase' }}>
            <span>Simulated</span>
            <span style={{ width: '60px', textAlign: 'right' }}>Target</span>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '40px' }}>
          <div>
            <h3 style={{ fontSize: '14px', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '10px' }}>Applicant Match Rates</h3>
            <StatRow label="Overall Match Rate (By Account)" simVal={calcRate(matchedApps.length, apps.length + apps.filter(a => a.track === 'Both').length)} targetVal="47.96%" color="#0ea5e9" />
            <StatRow label="Human Applicant Match Rate" simVal={calcRate(matchedApps.length, apps.length)} targetVal="60.67%" color="#3b82f6" />
            <StatRow label="Internship Match Rate" simVal={calcRate(intMatches.length, intPool.length)} targetVal="56.18%" color="#10b981" />
            <StatRow label="Residency Match Rate" simVal={calcRate(resMatches.length, resPool.length)} targetVal="34.80%" color="#8b5cf6" />
            <StatRow label="Total Applicants Matched" simVal={matchedApps.length} targetVal="1,753" />
            <StatRow label="Total Applicants in Pool" simVal={apps.length} targetVal="2,889" />
          </div>
          <div>
            <h3 style={{ fontSize: '14px', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '10px' }}>Position Fill Rates</h3>
            <StatRow label="Overall Fill Rate" simVal={calcRate(filledPos, totalPos)} targetVal="83.56%" color="#f59e0b" />
            <StatRow label="Internship Fill Rate" simVal={calcRate(intFilledPos, intTotalPos)} targetVal="82.56%" color="#10b981" />
            <StatRow label="Residency Fill Rate" simVal={calcRate(resFilledPos, resTotalPos)} targetVal="86.24%" color="#8b5cf6" />
            <StatRow label="Total Positions Filled" simVal={filledPos} targetVal="1,753" />
            <StatRow label="Total Positions Available" simVal={totalPos} targetVal="2,098" />
          </div>
        </div>
      </div>
    );
  };

  if (loadingCsv) return <div style={{ padding: '50px', fontSize: '24px' }}>Loading Match Data...</div>;

  const userApp = matchResults?.matchedApplicants.find(a => a.id === 'USER');
  const userMatchedProgram = userApp?.matchedProgram ? availablePrograms.find(p => p.id === userApp.matchedProgram) : null;
  const userRankIndex = userApp?.matchedProgram ? userApp.rankList.indexOf(userApp.matchedProgram) + 1 : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', padding: '30px', fontFamily: 'system-ui', maxWidth: '1200px', margin: '0 auto', color: '#333' }}>
      
      {/* DISCLAIMER MODAL */}
      {showDisclaimer && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '20px' }}>
          <div style={{ backgroundColor: 'white', padding: '40px', borderRadius: '16px', maxWidth: '500px', textAlign: 'center', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)' }}>
            <h2 style={{ color: '#1e293b', marginBottom: '15px' }}>Simulation Disclaimer</h2>
            <p style={{ color: '#64748b', lineHeight: '1.6', marginBottom: '25px' }}>
              This tool is a <strong>mathematical simulation</strong> designed for educational and evaluation purposes. 
              While it emulates the veterinary match mechanics, it is <strong>not</strong> indicative of your actual chances of matching. 
              Real-world factors like specific letter content, niche reputation, and subjective hospital needs cannot be perfectly modeled. 
              Enjoy this tool as a simulation to explore how matching algorithms function!
            </p>
            <button 
              onClick={() => setShowDisclaimer(false)} 
              style={{ padding: '12px 30px', backgroundColor: '#10b981', color: 'white', border: 'none', borderRadius: '8px', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer', transition: 'background 0.2s' }}
            >
              I Understand & Enter
            </button>
          </div>
        </div>
      )}

      <div style={{ flex: 1 }}>
        <header style={{ marginBottom: '40px' }}>
          <h1 style={{ margin: 0 }}>VIRMP Match Simulator</h1>
          <p style={{ color: '#666' }}>2026 Empirical Evaluation Modeling</p>
        </header>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
          <div style={{ background: '#fff', padding: '25px', borderRadius: '12px', border: '1px solid #e1e4e8', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
            <h2 style={{ marginTop: 0 }}>1. Your Attributes</h2>
            {['lorStrength', 'interview', 'cvAndStatement'].map(key => (
              <div key={key} style={{ marginBottom: '15px' }}>
                <label style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold' }}>
                  {key === 'lorStrength' ? 'Letters of Rec' : key === 'cvAndStatement' ? 'CV/Statement' : 'Interview'} 
                  <span style={{ color: '#007bff' }}>{userStats[key]}</span>
                </label>
                <input type="range" min="1" max="10" step="0.1" value={userStats[key]} style={{ width: '100%' }} onChange={e => setUserStats({...userStats, [key]: parseFloat(e.target.value)})} />
              </div>
            ))}
            <div style={{ marginTop: '15px' }}>
              <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>Class Rank</label>
              <select style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }} value={userStats.classRank} onChange={e => setUserStats({...userStats, classRank: parseInt(e.target.value)})}>
                <option value="1">Q1 (Top 25%)</option>
                <option value="2">Q2</option>
                <option value="3">Q3</option>
                <option value="4">Q4</option>
              </select>
            </div>
          </div>

          <div style={{ background: '#f8fafc', padding: '25px', borderRadius: '12px', border: '1px solid #cbd5e1', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.02)' }}>
            <h2 style={{ marginTop: 0, color: '#334155' }}>2. Program Priorities (The Algorithm)</h2>
            <p style={{ fontSize: '13px', color: '#64748b', marginTop: '-10px', marginBottom: '20px' }}>Adjust how the simulated programs evaluate and score all 2,889 applicants.</p>
            {Object.keys(programWeights).map(key => (
              <div key={key} style={{ marginBottom: '20px' }}>
                <label style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', color: '#475569' }}>
                  {key === 'lor' ? 'Letters of Recommendation' : key === 'interview' ? 'Interview Score' : 'Class Rank / GPA'} 
                  <span style={{ color: '#0ea5e9' }}>{programWeights[key]}</span>
                </label>
                <input type="range" min="0" max="100" step="1" value={programWeights[key]} style={{ width: '100%', accentColor: '#0ea5e9' }} onChange={e => setProgramWeights({...programWeights, [key]: parseInt(e.target.value)})} />
              </div>
            ))}
            <div style={{ fontSize: '11px', textAlign: 'center', color: '#94a3b8' }}>Weights do not need to equal 100. The algorithm will automatically normalize them.</div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '30px' }}>
          <div style={{ background: '#fff', padding: '25px', borderRadius: '12px', border: '1px solid #e1e4e8', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
            <h2 style={{ marginTop: 0 }}>3. Search Programs</h2>
            <input type="text" placeholder="Search (e.g. Surgery)..." style={{ width: '100%', padding: '12px', marginBottom: '15px', border: '1px solid #ccc', borderRadius: '6px' }} onChange={e => setSearchTerm(e.target.value)} />
            <div style={{ height: '300px', overflowY: 'auto', border: '1px solid #eee', padding: '10px' }}>
              {availablePrograms.filter(p => p.title.toLowerCase().includes(searchTerm.toLowerCase())).map(p => (
                <div key={p.id} style={{ padding: '8px 0', borderBottom: '1px solid #f1f1f1' }}>
                  <label style={{ cursor: 'pointer', display: 'flex', alignItems: 'flex-start' }}>
                    <input type="checkbox" style={{ marginRight: '10px', marginTop: '4px' }} checked={userRankList.includes(p.id)} onChange={() => setUserRankList(userRankList.includes(p.id) ? userRankList.filter(id => id !== p.id) : [...userRankList, p.id])} />
                    <span style={{ fontSize: '14px', lineHeight: '1.4' }}>{p.title} <br/><small style={{ color: '#0ea5e9', fontWeight: '500' }}>{p.positions} spots ({p.type}) • {p.region}</small></span>
                  </label>
                </div>
              ))}
            </div>
          </div>

          <div style={{ background: '#fff', padding: '25px', borderRadius: '12px', border: '1px solid #e1e4e8', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
            <h2 style={{ marginTop: 0 }}>4. Rank Order List</h2>
            <p style={{ fontSize: '13px', color: '#666', marginTop: '-10px', marginBottom: '15px' }}>Drag and drop to reorder your rankings.</p>
            <div style={{ height: '300px', overflowY: 'auto', border: '1px solid #eee', padding: '10px', background: '#f8fafc', borderRadius: '6px' }}>
              {userRankList.length === 0 && <p style={{ color: '#94a3b8', textAlign: 'center', marginTop: '100px' }}>No programs selected yet.</p>}
              {userRankList.map((progId, index) => {
                const p = availablePrograms.find(pr => pr.id === progId);
                return (
                  <div key={progId} draggable onDragStart={() => handleDragStart(index)} onDragEnter={() => handleDragEnter(index)} onDragEnd={handleDragEnd} onDragOver={handleDragOver} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px', background: dragOverItemIndex === index ? '#e0f2fe' : '#fff', border: '1px solid #e2e8f0', borderRadius: '6px', marginBottom: '8px', boxShadow: '0 1px 2px rgba(0,0,0,0.02)', cursor: 'grab', opacity: draggedItemIndex === index ? 0.5 : 1 }}>
                    <div style={{ flex: 1, fontSize: '13px', lineHeight: '1.4', pointerEvents: 'none' }}>
                      <strong style={{ color: '#10b981', fontSize: '15px' }}>#{index + 1}</strong> &nbsp; {p?.title}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '30px', color: '#94a3b8', fontSize: '18px' }}>≡</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <button onClick={executeSimulation} disabled={userRankList.length === 0 || isSimulating} style={{ width: '100%', padding: '20px', background: userRankList.length === 0 ? '#cbd5e1' : '#10b981', color: '#fff', border: 'none', borderRadius: '12px', fontSize: '20px', fontWeight: 'bold', cursor: userRankList.length === 0 ? 'not-allowed' : 'pointer', boxShadow: userRankList.length === 0 ? 'none' : '0 4px 6px rgba(16, 185, 129, 0.2)' }}>
          {isSimulating ? 'Matching 2,889 Applicants...' : 'Run Match Simulation'}
        </button>

        {matchResults && (
          <div style={{ marginTop: '20px', padding: '20px', background: userMatchedProgram ? '#ecfdf5' : '#fef2f2', border: `1px solid ${userMatchedProgram ? '#10b981' : '#ef4444'}`, borderRadius: '12px', textAlign: 'center' }}>
            <h2 style={{ margin: '0 0 10px 0', color: userMatchedProgram ? '#065f46' : '#991b1b' }}>Your Simulation Result</h2>
            {userMatchedProgram ? (
              <p style={{ margin: 0, fontSize: '18px', color: '#047857' }}>Congratulations! You matched at your <strong>#{userRankIndex} choice</strong>: <br/> <strong>{userMatchedProgram.title}</strong></p>
            ) : (
              <p style={{ margin: 0, fontSize: '18px', color: '#b91c1c' }}>You did not match in this simulation. You may need to expand your rank list, reorder it, or improve your stats.</p>
            )}
          </div>
        )}

        {matchResults && (
          <div style={{ marginTop: '40px' }}>
            {renderStatistics()}
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid #eee', paddingBottom: '10px', marginBottom: '20px' }}>
              <h2 style={{ margin: 0 }}>Match Explorer</h2>
              <div style={{ display: 'flex', gap: '10px', background: '#f1f5f9', padding: '5px', borderRadius: '8px' }}>
                <button onClick={() => setExplorerMode('programs')} style={{ padding: '8px 16px', background: explorerMode === 'programs' ? '#fff' : 'transparent', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>By Program</button>
                <button onClick={() => setExplorerMode('schools')} style={{ padding: '8px 16px', background: explorerMode === 'schools' ? '#fff' : 'transparent', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>By School</button>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '20px', height: '600px' }}>
              <div style={{ flex: 1, border: '1px solid #e2e8f0', background: '#fff', borderRadius: '8px', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                <div style={{ padding: '15px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                  <h3 style={{ margin: 0 }}>{explorerMode === 'programs' ? 'Programs' : 'Schools'}</h3>
                  {explorerMode === 'programs' && <input type="text" placeholder="Filter..." style={{ width: '100%', marginTop: '10px', padding: '8px', borderRadius: '4px', border: '1px solid #ccc', boxSizing: 'border-box' }} onChange={e => setExplorerSearch(e.target.value)} />}
                </div>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, overflowY: 'auto', flex: 1 }}>
                  {explorerMode === 'programs' ? (
                    explorerPrograms.map(p => (
                      <li key={p.id} onClick={() => setViewedProgram(p)} style={{ padding: '15px', borderBottom: '1px solid #f1f5f9', cursor: 'pointer', background: viewedProgram?.id === p.id ? '#eff6ff' : 'transparent' }}>
                        <strong style={{ display: 'block', fontSize: '13px' }}>{p.title}</strong>
                        <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#64748b' }}>{p.matchedApplicants?.length || 0}/{p.positions} Filled</span>
                      </li>
                    ))
                  ) : (
                    uniqueSchools.map(school => (
                      <li key={school} onClick={() => setViewedSchool(school)} style={{ padding: '15px', borderBottom: '1px solid #f1f5f9', cursor: 'pointer', background: viewedSchool === school ? '#eff6ff' : 'transparent' }}>{school}</li>
                    ))
                  )}
                </ul>
              </div>
              <div style={{ flex: 1, border: '1px solid #e2e8f0', background: '#fff', borderRadius: '8px', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                <h3 style={{ margin: 0, padding: '15px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>Applicants</h3>
                <div style={{ padding: '15px', overflowY: 'auto', flex: 1 }}>
                  {explorerMode === 'programs' && viewedProgram ? (
                    viewedProgram.rankList.map((appId, i) => {
                      const app = matchResults.matchedApplicants.find(a => a.id === appId);
                      const matched = viewedProgram.matchedApplicants.includes(appId);
                      return <div key={appId} onClick={() => setViewedApplicant(app)} style={{ padding: '10px', cursor: 'pointer', background: viewedApplicant?.id === appId ? '#f1f5f9' : '#fff', borderBottom: '1px solid #eee', fontSize: '13px' }}>{i+1}. {app?.name} {matched && '✅'}</div>;
                    })
                  ) : explorerMode === 'schools' && viewedSchool ? (
                    schoolApplicants.map(app => (
                      <div key={app.id} onClick={() => setViewedApplicant(app)} style={{ padding: '10px', cursor: 'pointer', background: viewedApplicant?.id === app.id ? '#f1f5f9' : '#fff', borderBottom: '1px solid #eee', fontSize: '13px' }}>{app.name} {app.matchedProgram ? '✅' : '❌'}</div>
                    ))
                  ) : <p style={{ color: '#94a3b8', textAlign: 'center', marginTop: '50px' }}>Select an item</p>}
                </div>
              </div>
              <div style={{ flex: 1, border: '1px solid #e2e8f0', background: '#fff', borderRadius: '8px', padding: '20px', overflowY: 'auto' }}>
                {viewedApplicant ? (
                  <>
                    <h3 style={{ margin: '0 0 5px 0' }}>{viewedApplicant.name}</h3>
                    <p style={{ color: '#0ea5e9', fontWeight: 'bold', margin: '0 0 15px 0' }}>{viewedApplicant.vetSchool}</p>
                    <div style={{ background: '#f8fafc', padding: '10px', borderRadius: '8px', marginBottom: '15px', fontSize: '13px', color: '#475569' }}>
                      <strong>Goal:</strong> {viewedApplicant.specialtyGoal} <br/>
                      <strong>Track:</strong> {viewedApplicant.track} 
                      {viewedApplicant.id !== 'USER' && <><br/><strong>Prefers:</strong> {viewedApplicant.preferredRegion}</>}
                    </div>
                    <div style={{ background: '#eff6ff', padding: '10px', borderRadius: '8px', marginBottom: '15px', fontSize: '13px', border: '1px solid #bfdbfe', color: '#1e3a8a' }}>
                      <strong style={{ color: '#1d4ed8', fontSize: '14px' }}>Applicant Stats:</strong> <br/>
                      <strong>Class Rank:</strong> Quartile {viewedApplicant.stats.classRank} <br/>
                      <strong>LOR Strength:</strong> {viewedApplicant.stats.lorStrength.toFixed(1)} / 10 <br/>
                      <strong>CV/Statement:</strong> {viewedApplicant.stats.cvAndStatement.toFixed(1)} / 10 <br/>
                      <strong>Interview:</strong> {viewedApplicant.stats.interview.toFixed(1)} / 10
                    </div>
                    <strong>Rank Order List:</strong>
                    <div style={{ marginTop: '10px' }}>
                      {viewedApplicant.rankList.length === 0 && <span style={{color: '#94a3b8', fontSize: '12px'}}>No programs ranked.</span>}
                      {viewedApplicant.rankList.map((pid, idx) => {
                        const p = availablePrograms.find(pr => pr.id === pid);
                        const isMatch = viewedApplicant.matchedProgram === pid;
                        return <div key={pid} style={{ fontSize: '11px', padding: '8px', background: isMatch ? '#ecfdf5' : '#f8fafc', border: isMatch ? '1px solid #34d399' : '1px solid #e2e8f0', borderRadius: '4px', marginBottom: '4px', color: '#334155' }}>{idx + 1}. {p?.title || "Unknown Program"} {isMatch && '✅'}</div>;
                      })}
                    </div>
                  </>
                ) : <p style={{ color: '#94a3b8', textAlign: 'center', marginTop: '50px' }}>Select an applicant to view their details</p>}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* NEW FOOTER */}
      <footer style={{ marginTop: '60px', padding: '30px 0', borderTop: '1px solid #e2e8f0', textAlign: 'center', color: '#64748b' }}>
        <p style={{ margin: '0 0 10px 0', fontSize: '14px' }}>
          Developed as an interactive simulation of the Veterinary Match Process.
        </p>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', alignItems: 'center' }}>
          <a 
            href="https://www.linkedin.com/in/jyotpatel28/" // REPLACE WITH YOUR ACTUAL LINK
            target="_blank" 
            rel="noopener noreferrer" 
            style={{ color: '#0ea5e9', textDecoration: 'none', fontWeight: 'bold', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '5px' }}
          >
            Connect on LinkedIn →
          </a>
        </div>
      </footer>
    </div>
  );
}

export default App;