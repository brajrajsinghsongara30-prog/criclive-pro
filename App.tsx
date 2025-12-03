import React, { useState, useEffect } from 'react';
import { Team, Player, Match, BallEvent } from './types';
import * as Storage from './services/storage';
import { generateCommentary } from './services/geminiService';
import { IconBat, IconBall, IconPlus, IconLive, IconHome, IconList, IconUser, IconX, IconArrowRight, IconChevronLeft, IconCheck, IconGraph } from './components/Icons';
import { PlayerCard } from './components/PlayerCard';

function App() {
  // --- State ---
  const [view, setView] = useState<'home' | 'match' | 'teams' | 'stats' | 'live' | 'summary'>('home');
  const [teams, setTeams] = useState<Team[]>([]);
  const [activeMatch, setActiveMatch] = useState<Match | null>(null);
  const [matchHistory, setMatchHistory] = useState<Match[]>([]);
  const [summaryMatch, setSummaryMatch] = useState<Match | null>(null);
  
  // Forms State
  const [newTeamName, setNewTeamName] = useState('');
  const [newPlayerName, setNewPlayerName] = useState('');
  const [selectedTeamId, setSelectedTeamId] = useState<string>('');
  const [editingTeamName, setEditingTeamName] = useState(''); // State for renaming
  const [playerPhoto, setPlayerPhoto] = useState<string | undefined>(undefined);
  
  // Match Setup Modal State
  const [isSetupModalOpen, setIsSetupModalOpen] = useState(false);
  const [setupStep, setSetupStep] = useState(1); // 1: Teams & Overs, 2: Players
  const [setupError, setSetupError] = useState<string | null>(null);
  const [quickAddPlayerName, setQuickAddPlayerName] = useState('');

  // Wicket Modal State
  const [isWicketModalOpen, setIsWicketModalOpen] = useState(false);
  const [wicketType, setWicketType] = useState('caught');
  const [whoGotOut, setWhoGotOut] = useState<'striker' | 'non_striker'>('striker');
  const [newBatterId, setNewBatterId] = useState('');
  const [fielderName, setFielderName] = useState('');

  // Setup Selections
  const [teamASelect, setTeamASelect] = useState('');
  const [teamBSelect, setTeamBSelect] = useState('');
  const [oversSelect, setOversSelect] = useState(5);
  const [battingTeamId, setBattingTeamId] = useState('');
  const [strikerId, setStrikerId] = useState('');
  const [nonStrikerId, setNonStrikerId] = useState('');
  const [bowlerId, setBowlerId] = useState('');

  // Live Commentary
  const [lastCommentary, setLastCommentary] = useState<string>("Match ready to start!");

  // Stats View State
  const [statsTab, setStatsTab] = useState<'players' | 'history'>('players');

  // --- Effects ---
  useEffect(() => {
    const loadedTeams = Storage.getTeams();
    setTeams(loadedTeams);
    const savedMatch = Storage.getActiveMatch();
    if (savedMatch) {
      setActiveMatch(savedMatch);
      // Auto-redirect to match if live
      if (savedMatch.status === 'live') setView('match');
    }
    const history = Storage.getMatchHistory();
    setMatchHistory(history);
  }, []);

  useEffect(() => {
    Storage.saveTeams(teams);
  }, [teams]);

  useEffect(() => {
    Storage.saveActiveMatch(activeMatch);
  }, [activeMatch]);

  // --- Actions: Teams & Players ---

  const handleCreateTeam = () => {
    if (!newTeamName.trim()) return;
    const newTeam: Team = {
      id: Date.now().toString(),
      name: newTeamName,
      players: []
    };
    setTeams([...teams, newTeam]);
    setNewTeamName('');
  };

  const handleUpdateTeamName = () => {
    if (!selectedTeamId || !editingTeamName.trim()) return;
    const updatedTeams = teams.map(t => {
      if (t.id === selectedTeamId) {
        return { ...t, name: editingTeamName };
      }
      return t;
    });
    setTeams(updatedTeams);
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPlayerPhoto(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddPlayer = () => {
    if (!newPlayerName.trim() || !selectedTeamId) return;
    
    const updatedTeams = teams.map(team => {
      if (team.id === selectedTeamId) {
        return {
          ...team,
          players: [
            ...team.players,
            {
              id: Date.now().toString(),
              name: newPlayerName,
              photoData: playerPhoto,
              matches: 0,
              runs: 0,
              ballsFaced: 0,
              wickets: 0,
              oversBowled: 0,
              runsConceded: 0
            }
          ]
        };
      }
      return team;
    });

    setTeams(updatedTeams);
    setNewPlayerName('');
    setPlayerPhoto(undefined);
  };

  // Helper for Modal Quick Add
  const handleQuickAddPlayer = (teamId: string) => {
    if (!quickAddPlayerName.trim()) return;
    const updatedTeams = teams.map(t => {
        if (t.id === teamId) {
            return {
                ...t,
                players: [
                    ...t.players,
                    {
                        id: Date.now().toString(),
                        name: quickAddPlayerName,
                        matches: 0,
                        runs: 0,
                        ballsFaced: 0,
                        wickets: 0,
                        oversBowled: 0,
                        runsConceded: 0
                    }
                ]
            };
        }
        return t;
    });
    setTeams(updatedTeams);
    setQuickAddPlayerName('');
    setSetupError(null); // Clear errors as adding a player might fix validation
  };

  // --- Actions: Match Control ---

  const openMatchSetup = () => {
    // Reset Setup State
    setTeamASelect('');
    setTeamBSelect('');
    setOversSelect(5);
    setBattingTeamId('');
    setStrikerId('');
    setNonStrikerId('');
    setBowlerId('');
    setSetupStep(1);
    setSetupError(null);
    setIsSetupModalOpen(true);
  };

  const handleSetupNext = () => {
    setSetupError(null);

    if (!teamASelect || !teamBSelect) {
      setSetupError("Please select both teams.");
      return;
    }
    if (teamASelect === teamBSelect) {
      setSetupError("Teams must be different.");
      return;
    }
    
    const teamA = teams.find(t => t.id === teamASelect);
    const teamB = teams.find(t => t.id === teamBSelect);

    if (!teamA || !teamB) {
        setSetupError("Invalid team selection.");
        return;
    }

    if (teamA.players.length < 2) {
       setSetupError(`${teamA.name} needs at least 2 players.`);
       return;
    }
    
    if (teamB.players.length < 2) {
       setSetupError(`${teamB.name} needs at least 2 players.`);
       return;
    }

    // Default batting team to Team A initially
    setBattingTeamId(teamASelect);
    setSetupStep(2);
  };

  const startMatch = () => {
    if (!strikerId || !nonStrikerId || !bowlerId) {
      setSetupError("Please select the opening players.");
      return;
    }

    if (strikerId === nonStrikerId) {
       setSetupError("Striker and Non-Striker must be different players.");
       return;
    }

    const battingTeam = teams.find(t => t.id === battingTeamId);
    const bowlingTeamId = battingTeamId === teamASelect ? teamBSelect : teamASelect;
    const bowlingTeam = teams.find(t => t.id === bowlingTeamId);

    if (!battingTeam || !bowlingTeam) return;

    const newMatch: Match = {
      id: Date.now().toString(),
      teamAId: teamASelect,
      teamBId: teamBSelect,
      battingTeamId: battingTeamId,
      bowlingTeamId: bowlingTeamId,
      totalOvers: oversSelect,
      currentOver: 0,
      currentBallInOver: 0,
      score: 0,
      wickets: 0,
      extras: 0,
      balls: [],
      strikerId: strikerId,
      nonStrikerId: nonStrikerId,
      currentBowlerId: bowlerId,
      isCompleted: false,
      status: 'live',
      date: new Date().toISOString()
    };

    setActiveMatch(newMatch);
    setIsSetupModalOpen(false);
    setView('match');
    setLastCommentary("The match is about to begin!");
  };

  const handleEndMatch = () => {
    if (!activeMatch) return;
    
    if (confirm("Are you sure you want to end this match?")) {
      const completedMatch: Match = {
        ...activeMatch,
        status: 'completed',
        isCompleted: true
      };

      // Save to history
      Storage.saveMatchToHistory(completedMatch);
      setMatchHistory(prev => [completedMatch, ...prev]);

      // Update teams to increment match count
      const updatedTeams = teams.map(t => {
          if (t.id === completedMatch.teamAId || t.id === completedMatch.teamBId) {
              return {
                  ...t,
                  players: t.players.map(p => {
                      return { ...p, matches: p.matches + 1 };
                  })
              }
          }
          return t;
      });
      setTeams(updatedTeams);

      // Clear active match & Redirect to Summary
      setActiveMatch(null);
      setSummaryMatch(completedMatch);
      setView('summary');
    }
  };

  const handleWicketClick = () => {
    if (!activeMatch) return;
    setWhoGotOut('striker');
    setWicketType('caught');
    setNewBatterId('');
    setFielderName('');
    setIsWicketModalOpen(true);
  };

  const handleConfirmWicket = () => {
      if (!newBatterId) {
          alert("Please select the new batsman.");
          return;
      }
      handleScore(0, false, false, true); // Runs 0, not wide, not noball, IS WICKET
      setIsWicketModalOpen(false);
  };

  const handleScore = async (runs: number, isWide: boolean, isNoBall: boolean, isWicket: boolean) => {
    if (!activeMatch || activeMatch.status !== 'live') return;

    let extraRuns = 0;
    if (isWide || isNoBall) extraRuns = 1;

    const totalRunsForBall = runs + extraRuns;
    
    // Ensure ids are present (they should be for live match)
    if (!activeMatch.currentBowlerId || !activeMatch.strikerId || !activeMatch.nonStrikerId) return;

    const newBall: BallEvent = {
      runs: runs,
      isWide,
      isNoBall,
      isWicket,
      wicketType: isWicket ? (wicketType as any) : undefined,
      bowlerId: activeMatch.currentBowlerId,
      strikerId: activeMatch.strikerId,
      nonStrikerId: activeMatch.nonStrikerId
    };

    // Calculate new state
    const isLegalDelivery = !isWide && !isNoBall;
    let nextOver = activeMatch.currentOver;
    let nextBallInOver = activeMatch.currentBallInOver;

    if (isLegalDelivery) {
      nextBallInOver++;
      if (nextBallInOver >= 6) {
        nextOver++;
        nextBallInOver = 0;
      }
    }

    // Determine Commentary
    let eventDesc = `${runs} runs`;
    if (isWicket) eventDesc = `WICKET! ${whoGotOut === 'striker' ? 'Striker' : 'Non-striker'} out (${wicketType})`;
    else if (isWide) eventDesc = "Wide Ball";
    else if (runs === 4) eventDesc = "FOUR!";
    else if (runs === 6) eventDesc = "SIX!";

    const batter = teams.find(t => t.id === activeMatch.battingTeamId)?.players.find(p => p.id === activeMatch.strikerId)?.name || "Batter";
    const bowler = teams.find(t => t.id === activeMatch.bowlingTeamId)?.players.find(p => p.id === activeMatch.currentBowlerId)?.name || "Bowler";

    // Call Gemini
    generateCommentary(eventDesc, batter, bowler, `${activeMatch.score + totalRunsForBall}/${activeMatch.wickets + (isWicket ? 1 : 0)}`)
      .then(setLastCommentary);

    // Update match state
    setActiveMatch(prev => {
      if (!prev) return null;
      let newStrikerId = prev.strikerId;
      let newNonStrikerId = prev.nonStrikerId;

      // Handle Wicket Player Swaps
      if (isWicket) {
          const dismissedId = whoGotOut === 'striker' ? prev.strikerId : prev.nonStrikerId;
          
          if (whoGotOut === 'striker') {
              newStrikerId = newBatterId;
          } else {
              newNonStrikerId = newBatterId;
          }
      }

      // Rotate strike on odd runs
      if (runs % 2 !== 0) {
        const temp = newStrikerId;
        newStrikerId = newNonStrikerId;
        newNonStrikerId = temp;
      }

      // Rotate strike at end of over (if legal ball caused over end)
      // Exception: If a wicket fell, new batsman is usually on strike depending on cross.
      // For simplicity in this app: We stick to standard rotation logic + explicit wicket replacement.
      if (isLegalDelivery && prev.currentBallInOver === 5) {
         const temp = newStrikerId;
         newStrikerId = newNonStrikerId;
         newNonStrikerId = temp;
      }
      
      let currentWickets = prev.wickets;
      if (isWicket) {
        currentWickets++;
      }

      return {
        ...prev,
        score: prev.score + totalRunsForBall,
        wickets: currentWickets,
        extras: prev.extras + extraRuns,
        balls: [...prev.balls, newBall],
        currentOver: nextOver,
        currentBallInOver: nextBallInOver,
        strikerId: newStrikerId,
        nonStrikerId: newNonStrikerId
      };
    });
    
    // Update player stats for this session
    setTeams(prevTeams => prevTeams.map(t => {
      const isBatting = t.id === activeMatch.battingTeamId;
      const isBowling = t.id === activeMatch.bowlingTeamId;
      
      return {
        ...t,
        players: t.players.map(p => {
          // Update Batting Stats
          if (isBatting) {
              // Only update balls faced if legal delivery
              if (p.id === activeMatch.strikerId) {
                  return { 
                      ...p, 
                      runs: p.runs + runs, 
                      ballsFaced: p.ballsFaced + (isLegalDelivery ? 1 : 0) 
                  };
              }
          }
          // Update Bowling Stats
          if (isBowling && p.id === activeMatch.currentBowlerId) {
             return { 
                 ...p, 
                 runsConceded: p.runsConceded + totalRunsForBall, 
                 wickets: p.wickets + (isWicket ? 1 : 0),
                 oversBowled: isLegalDelivery ? p.oversBowled + (1/6) : p.oversBowled
             };
          }
          return p;
        })
      };
    }));
  };

  // --- Views Components ---

  const Navbar = () => (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex justify-around p-3 z-50 safe-area-pb">
      <button onClick={() => setView('home')} className={`flex flex-col items-center ${view === 'home' ? 'text-cricket-green' : 'text-gray-400'}`}>
        <IconHome />
        <span className="text-xs mt-1">Home</span>
      </button>
      <button onClick={() => setView('teams')} className={`flex flex-col items-center ${view === 'teams' ? 'text-cricket-green' : 'text-gray-400'}`}>
        <IconUser />
        <span className="text-xs mt-1">Teams</span>
      </button>
       <button onClick={() => setView('match')} className={`flex flex-col items-center transform -translate-y-4 bg-cricket-green text-white p-3 rounded-full shadow-lg border-4 border-gray-100 ${view === 'match' ? 'ring-2 ring-cricket-accent' : ''}`}>
        <IconBat />
      </button>
      <button onClick={() => setView('live')} className={`flex flex-col items-center ${view === 'live' ? 'text-cricket-green' : 'text-gray-400'}`}>
        <IconLive />
        <span className="text-xs mt-1">Live</span>
      </button>
      <button onClick={() => setView('stats')} className={`flex flex-col items-center ${view === 'stats' ? 'text-cricket-green' : 'text-gray-400'}`}>
        <IconList />
        <span className="text-xs mt-1">Stats</span>
      </button>
    </nav>
  );

  const MatchSetupModal = () => {
      if (!isSetupModalOpen) return null;

      const teamA = teams.find(t => t.id === teamASelect);
      const teamB = teams.find(t => t.id === teamBSelect);
      
      const battingTeam = teams.find(t => t.id === battingTeamId);
      const bowlingTeam = teams.find(t => t.id === (battingTeamId === teamASelect ? teamBSelect : teamASelect));

      const TeamSelectionRow = ({ label, selectedId, onChange, team }: { label: string, selectedId: string, onChange: (e: any) => void, team?: Team }) => (
          <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
              <label className="block text-sm font-bold text-gray-700 mb-2">{label}</label>
              <select 
                className="w-full p-3 bg-white rounded-lg border focus:ring-2 focus:ring-cricket-green outline-none mb-2"
                value={selectedId}
                onChange={onChange}
              >
                <option value="">Select Team</option>
                {teams.map(t => <option key={t.id} value={t.id} disabled={t.id === (label === "Team A" ? teamBSelect : teamASelect)}>{t.name}</option>)}
              </select>
              
              {selectedId && team && (
                  <div className="mt-2">
                      <div className="flex justify-between items-center text-xs mb-2">
                          <span className={`font-semibold ${team.players.length < 2 ? 'text-red-500' : 'text-green-600'}`}>
                              {team.players.length} Players {team.players.length < 2 && "(Min 2 req)"}
                          </span>
                      </div>
                      <div className="flex gap-2">
                          <input 
                              type="text" 
                              placeholder="Add Player Name" 
                              className="flex-1 p-2 text-sm border rounded"
                              value={quickAddPlayerName}
                              onChange={(e) => setQuickAddPlayerName(e.target.value)}
                              onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleQuickAddPlayer(selectedId);
                              }}
                          />
                          <button 
                              onClick={() => handleQuickAddPlayer(selectedId)}
                              className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-3 py-1 rounded text-sm font-bold"
                          >
                              +
                          </button>
                      </div>
                  </div>
              )}
          </div>
      );

      return (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                  <div className="bg-cricket-green text-white p-4 flex justify-between items-center shrink-0">
                      <h3 className="font-bold text-lg">Match Setup</h3>
                      <button onClick={() => setIsSetupModalOpen(false)} className="opacity-80 hover:opacity-100 p-1"><IconX /></button>
                  </div>
                  
                  <div className="p-6 overflow-y-auto flex-1">
                      {setupError && (
                          <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100 flex items-center gap-2 animate-pulse">
                              <span className="font-bold">!</span> {setupError}
                          </div>
                      )}

                      {setupStep === 1 ? (
                          <div className="space-y-4">
                              <TeamSelectionRow 
                                  label="Team A" 
                                  selectedId={teamASelect} 
                                  onChange={(e) => setTeamASelect(e.target.value)}
                                  team={teamA}
                              />
                              <TeamSelectionRow 
                                  label="Team B" 
                                  selectedId={teamBSelect} 
                                  onChange={(e) => setTeamBSelect(e.target.value)}
                                  team={teamB}
                              />
                              <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                                  <label className="block text-sm font-bold text-gray-700 mb-2">Overs per Innings</label>
                                  <div className="flex gap-4 items-center">
                                      <button 
                                        className="w-10 h-10 bg-white border rounded-lg font-bold hover:bg-gray-100"
                                        onClick={() => setOversSelect(Math.max(1, oversSelect - 1))}
                                      >-</button>
                                      <input 
                                        type="number" 
                                        min="1"
                                        max="50"
                                        className="w-20 p-2 bg-white rounded-lg border text-center font-bold text-lg"
                                        value={oversSelect}
                                        onChange={(e) => setOversSelect(parseInt(e.target.value) || 0)}
                                      />
                                      <button 
                                        className="w-10 h-10 bg-white border rounded-lg font-bold hover:bg-gray-100"
                                        onClick={() => setOversSelect(oversSelect + 1)}
                                      >+</button>
                                  </div>
                              </div>
                          </div>
                      ) : (
                          <div className="space-y-6">
                              <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                                  <label className="block text-xs font-bold text-blue-500 uppercase mb-2">Who is Batting First?</label>
                                  <div className="flex bg-white rounded-lg shadow-sm overflow-hidden border border-blue-100">
                                      <button 
                                        onClick={() => setBattingTeamId(teamASelect)}
                                        className={`flex-1 py-3 text-sm font-bold transition-colors ${battingTeamId === teamASelect ? 'bg-blue-500 text-white' : 'text-gray-600 hover:bg-gray-50'}`}
                                      >
                                          {teamA?.name}
                                      </button>
                                      <div className="w-px bg-gray-200"></div>
                                      <button 
                                        onClick={() => setBattingTeamId(teamBSelect)}
                                        className={`flex-1 py-3 text-sm font-bold transition-colors ${battingTeamId === teamBSelect ? 'bg-blue-500 text-white' : 'text-gray-600 hover:bg-gray-50'}`}
                                      >
                                          {teamB?.name}
                                      </button>
                                  </div>
                              </div>
                              
                              <div className="space-y-4">
                                  <div>
                                      <h4 className="font-bold text-gray-800 mb-2 text-sm flex items-center gap-2">Opening Batters ({battingTeam?.name})</h4>
                                      <div className="grid grid-cols-2 gap-3">
                                          <div>
                                              <label className="text-xs text-gray-500 mb-1 block">Striker</label>
                                              <select 
                                                className="w-full p-2 border rounded-lg text-sm bg-white"
                                                value={strikerId}
                                                onChange={(e) => setStrikerId(e.target.value)}
                                              >
                                                  <option value="">Select</option>
                                                  {battingTeam?.players.map(p => <option key={p.id} value={p.id} disabled={p.id === nonStrikerId}>{p.name}</option>)}
                                              </select>
                                          </div>
                                          <div>
                                              <label className="text-xs text-gray-500 mb-1 block">Non-Striker</label>
                                              <select 
                                                className="w-full p-2 border rounded-lg text-sm bg-white"
                                                value={nonStrikerId}
                                                onChange={(e) => setNonStrikerId(e.target.value)}
                                              >
                                                  <option value="">Select</option>
                                                  {battingTeam?.players.map(p => <option key={p.id} value={p.id} disabled={p.id === strikerId}>{p.name}</option>)}
                                              </select>
                                          </div>
                                      </div>
                                  </div>
                                  <div className="pt-2 border-t border-dashed">
                                      <h4 className="font-bold text-gray-800 mb-2 text-sm flex items-center gap-2">Opening Bowler ({bowlingTeam?.name})</h4>
                                      <select 
                                        className="w-full p-2 border rounded-lg text-sm bg-white"
                                        value={bowlerId}
                                        onChange={(e) => setBowlerId(e.target.value)}
                                      >
                                          <option value="">Select Bowler</option>
                                          {bowlingTeam?.players.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                      </select>
                                  </div>
                              </div>
                          </div>
                      )}
                  </div>
                  
                  <div className="p-4 bg-gray-50 border-t flex justify-between items-center shrink-0">
                      {setupStep === 2 ? (
                          <button onClick={() => setSetupStep(1)} className="px-4 py-2 text-gray-600 font-medium hover:text-gray-800 flex items-center gap-1"><IconChevronLeft /> Back</button>
                      ) : (
                          <button onClick={() => setIsSetupModalOpen(false)} className="px-4 py-2 text-gray-500 font-medium hover:text-gray-800">Cancel</button>
                      )}
                      {setupStep === 1 ? (
                          <button onClick={handleSetupNext} className="bg-cricket-green text-white px-6 py-2 rounded-lg font-bold flex items-center gap-2 shadow-lg hover:bg-cricket-dark transition">
                              Next <IconArrowRight />
                          </button>
                      ) : (
                          <button onClick={startMatch} className="bg-cricket-accent text-cricket-dark px-8 py-2 rounded-lg font-bold shadow-lg hover:bg-yellow-400 transition">
                              Start Match
                          </button>
                      )}
                  </div>
              </div>
          </div>
      );
  };

  const WicketModal = () => {
      if (!isWicketModalOpen) return null;
      if (!activeMatch) return null;

      const battingTeam = teams.find(t => t.id === activeMatch.battingTeamId);
      const playedIds = [activeMatch.strikerId, activeMatch.nonStrikerId, ...activeMatch.balls.map(b => b.strikerId), ...activeMatch.balls.map(b => b.nonStrikerId)]; 
      const availableBatters = battingTeam?.players.filter(p => !playedIds.includes(p.id)) || [];

      const strikerName = battingTeam?.players.find(p => p.id === activeMatch.strikerId)?.name;
      const nonStrikerName = battingTeam?.players.find(p => p.id === activeMatch.nonStrikerId)?.name;

      return (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden animate-[scaleIn_0.2s_ease-out]">
                  <div className="bg-red-600 text-white p-4 text-center">
                      <h3 className="font-black text-xl tracking-wide uppercase">Wicket!</h3>
                  </div>
                  <div className="p-5 space-y-4">
                      {/* Who Got Out */}
                      <div>
                          <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Who is Out?</label>
                          <div className="grid grid-cols-2 gap-2">
                              <button 
                                onClick={() => setWhoGotOut('striker')}
                                className={`p-3 rounded-lg border font-bold text-sm ${whoGotOut === 'striker' ? 'bg-red-50 border-red-500 text-red-600 ring-2 ring-red-200' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
                              >
                                  {strikerName}
                              </button>
                              <button 
                                onClick={() => setWhoGotOut('non_striker')}
                                className={`p-3 rounded-lg border font-bold text-sm ${whoGotOut === 'non_striker' ? 'bg-red-50 border-red-500 text-red-600 ring-2 ring-red-200' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
                              >
                                  {nonStrikerName}
                              </button>
                          </div>
                      </div>

                      {/* How */}
                      <div>
                          <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Dismissal Type</label>
                          <select 
                            value={wicketType} 
                            onChange={(e) => setWicketType(e.target.value)}
                            className="w-full p-2 border rounded-lg bg-gray-50 font-medium"
                          >
                              <option value="caught">Caught</option>
                              <option value="bowled">Bowled</option>
                              <option value="lbw">LBW</option>
                              <option value="runout">Run Out</option>
                              <option value="stumped">Stumped</option>
                              <option value="hitwicket">Hit Wicket</option>
                          </select>
                      </div>

                      {/* Fielder (if applicable) */}
                      {(wicketType === 'caught' || wicketType === 'runout' || wicketType === 'stumped') && (
                         <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Fielder Name (Optional)</label>
                            <input 
                                type="text" 
                                className="w-full p-2 border rounded-lg" 
                                value={fielderName}
                                onChange={(e) => setFielderName(e.target.value)}
                                placeholder="Enter fielder name"
                            />
                         </div>
                      )}

                      {/* New Batter */}
                      <div>
                          <label className="block text-xs font-bold text-gray-500 uppercase mb-2">New Batsman</label>
                          <select 
                             value={newBatterId}
                             onChange={(e) => setNewBatterId(e.target.value)}
                             className="w-full p-3 border-2 border-cricket-green rounded-lg bg-white font-bold"
                          >
                              <option value="">Select Next Player</option>
                              {availableBatters.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                          </select>
                      </div>
                  </div>
                  <div className="p-4 bg-gray-50 flex gap-3">
                      <button onClick={() => setIsWicketModalOpen(false)} className="flex-1 py-3 text-gray-500 font-bold hover:bg-gray-200 rounded-lg">Cancel</button>
                      <button onClick={handleConfirmWicket} className="flex-1 py-3 bg-red-600 text-white font-bold rounded-lg shadow-lg shadow-red-500/30 hover:bg-red-700">Confirm OUT</button>
                  </div>
              </div>
          </div>
      )
  }

  const MatchSummaryView = () => {
    if (!summaryMatch) return null;

    const battingTeam = teams.find(t => t.id === summaryMatch.battingTeamId);
    const bowlingTeam = teams.find(t => t.id === summaryMatch.bowlingTeamId);
    const teamA = teams.find(t => t.id === summaryMatch.teamAId);
    const teamB = teams.find(t => t.id === summaryMatch.teamBId);

    // Calculate detailed stats from balls
    const batterStats: Record<string, { runs: number, balls: number, fours: number, sixes: number, isOut: boolean, dismissal?: string }> = {};
    const bowlerStats: Record<string, { balls: number, runs: number, wickets: number }> = {};
    
    // Graph Data Generation
    const graphData: { over: number, runs: number }[] = [];
    let cumulativeRuns = 0;
    
    if(summaryMatch.strikerId) batterStats[summaryMatch.strikerId] = { runs: 0, balls: 0, fours: 0, sixes: 0, isOut: false };
    if(summaryMatch.nonStrikerId) batterStats[summaryMatch.nonStrikerId] = { runs: 0, balls: 0, fours: 0, sixes: 0, isOut: false };

    summaryMatch.balls.forEach((ball, index) => {
        // Init stats if missing
        if (!batterStats[ball.strikerId]) batterStats[ball.strikerId] = { runs: 0, balls: 0, fours: 0, sixes: 0, isOut: false };
        if (!batterStats[ball.nonStrikerId]) batterStats[ball.nonStrikerId] = { runs: 0, balls: 0, fours: 0, sixes: 0, isOut: false };
        if (!bowlerStats[ball.bowlerId]) bowlerStats[ball.bowlerId] = { balls: 0, runs: 0, wickets: 0 };

        const batter = batterStats[ball.strikerId];
        const bowler = bowlerStats[ball.bowlerId];

        // Process Ball
        const extras = (ball.isWide || ball.isNoBall) ? 1 : 0;
        const totalRuns = ball.runs + extras;
        cumulativeRuns += totalRuns;

        // Graph Point (Push at end of every over or last ball)
        const isOverEnd = (index + 1) % 6 === 0; // Rough approximation of over end
        if (isOverEnd || index === summaryMatch.balls.length - 1) {
            graphData.push({ over: graphData.length + 1, runs: cumulativeRuns });
        }

        // Stats Logic
        if (!ball.isWide && !ball.isNoBall) {
            batter.runs += ball.runs;
            batter.balls += 1;
            if (ball.runs === 4) batter.fours++;
            if (ball.runs === 6) batter.sixes++;
        } else {
            batter.runs += ball.runs; 
        }
        
        if (ball.isWicket) {
            batter.isOut = true;
            batter.dismissal = ball.wicketType;
            bowler.wickets++;
        }

        bowler.runs += totalRuns;
        if (!ball.isWide && !ball.isNoBall) {
            bowler.balls++;
        }
    });

    // --- Chart Generation ---
    const maxRuns = Math.max(...graphData.map(d => d.runs), 10);
    const maxOvers = Math.max(graphData.length, summaryMatch.totalOvers);
    const chartHeight = 100;
    const chartWidth = 300;
    
    const polylinePoints = graphData.map((d, i) => {
        const x = (d.over / maxOvers) * chartWidth;
        const y = chartHeight - ((d.runs / maxRuns) * chartHeight);
        return `${x},${y}`;
    }).join(' ');

    return (
        <div className="bg-gray-50 min-h-screen pb-20">
            {/* Header */}
            <div className="bg-cricket-green text-white p-4 pb-12 rounded-b-3xl shadow-lg relative">
                 <div className="flex items-center justify-between mb-4">
                     <button onClick={() => setView('stats')} className="p-2 bg-white/10 rounded-full hover:bg-white/20">
                         <IconChevronLeft />
                     </button>
                     <h2 className="font-bold text-lg">Match Summary</h2>
                     <div className="w-10"></div> {/* Spacer */}
                 </div>
                 <div className="text-center">
                     <div className="text-sm opacity-80 mb-1">{new Date(summaryMatch.date).toLocaleDateString()}</div>
                     <h1 className="text-xl font-bold">{teamA?.name} vs {teamB?.name}</h1>
                     <div className="mt-4 flex flex-col items-center">
                         <span className="text-5xl font-bold tracking-tighter">{summaryMatch.score}/{summaryMatch.wickets}</span>
                         <span className="text-sm opacity-90 mt-1">({summaryMatch.currentOver}.{summaryMatch.currentBallInOver} Overs)</span>
                     </div>
                 </div>
            </div>

            <div className="p-4 -mt-8 space-y-4">
                
                {/* Run Graph Card */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden p-4">
                    <div className="flex items-center gap-2 mb-4">
                        <div className="p-1.5 bg-blue-50 text-blue-500 rounded-lg"><IconGraph /></div>
                        <h3 className="font-bold text-gray-800">Run Progression</h3>
                    </div>
                    {graphData.length > 0 ? (
                        <div className="relative h-32 w-full border-l border-b border-gray-200">
                             <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="overflow-visible w-full h-full">
                                 {/* Grid Lines */}
                                 <line x1="0" y1={chartHeight/2} x2={chartWidth} y2={chartHeight/2} stroke="#f3f4f6" strokeDasharray="4" />
                                 {/* Plot */}
                                 <polyline 
                                    points={`0,${chartHeight} ${polylinePoints}`} 
                                    fill="none" 
                                    stroke="#006a4e" 
                                    strokeWidth="3" 
                                    strokeLinecap="round" 
                                    strokeLinejoin="round" 
                                 />
                                 {/* Dots */}
                                 {graphData.map((d, i) => {
                                      const x = (d.over / maxOvers) * chartWidth;
                                      const y = chartHeight - ((d.runs / maxRuns) * chartHeight);
                                      return <circle key={i} cx={x} cy={y} r="3" fill="white" stroke="#006a4e" strokeWidth="2" />
                                 })}
                             </svg>
                             {/* Axis Labels */}
                             <div className="absolute top-0 right-0 text-[10px] text-gray-400 bg-white/80 px-1">{maxRuns} Runs</div>
                             <div className="absolute bottom-0 right-0 translate-y-full text-[10px] text-gray-400">{maxOvers} Ov</div>
                        </div>
                    ) : (
                        <div className="text-center text-gray-400 text-sm py-4">Not enough data for graph</div>
                    )}
                </div>

                {/* Batting Card */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="bg-gray-50 p-3 border-b flex justify-between items-center">
                        <h3 className="font-bold text-gray-800 flex items-center gap-2"><IconBat /> Batting</h3>
                        <span className="text-xs font-bold text-gray-500 uppercase">{battingTeam?.name}</span>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-gray-50 text-gray-500 text-xs uppercase font-semibold">
                                <tr>
                                    <th className="p-3">Batter</th>
                                    <th className="p-3 text-center">R</th>
                                    <th className="p-3 text-center">B</th>
                                    <th className="p-3 text-center">4s</th>
                                    <th className="p-3 text-center">6s</th>
                                    <th className="p-3 text-center">SR</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {Object.entries(batterStats).map(([id, stats]) => {
                                    const player = battingTeam?.players.find(p => p.id === id);
                                    if (!player) return null;
                                    const sr = stats.balls > 0 ? ((stats.runs / stats.balls) * 100).toFixed(0) : '0';
                                    return (
                                        <tr key={id}>
                                            <td className="p-3 font-medium text-gray-800">
                                                <div>{player.name} {!stats.isOut && <span className="text-cricket-green ml-1">*</span>}</div>
                                                {stats.isOut && <div className="text-[10px] text-red-500 uppercase font-bold">{stats.dismissal || 'OUT'}</div>}
                                            </td>
                                            <td className="p-3 text-center font-bold">{stats.runs}</td>
                                            <td className="p-3 text-center text-gray-500">{stats.balls}</td>
                                            <td className="p-3 text-center text-gray-400 text-xs">{stats.fours}</td>
                                            <td className="p-3 text-center text-gray-400 text-xs">{stats.sixes}</td>
                                            <td className="p-3 text-center text-gray-500 text-xs">{sr}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Bowling Card */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="bg-gray-50 p-3 border-b flex justify-between items-center">
                        <h3 className="font-bold text-gray-800 flex items-center gap-2"><IconBall /> Bowling</h3>
                        <span className="text-xs font-bold text-gray-500 uppercase">{bowlingTeam?.name}</span>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-gray-50 text-gray-500 text-xs uppercase font-semibold">
                                <tr>
                                    <th className="p-3">Bowler</th>
                                    <th className="p-3 text-center">O</th>
                                    <th className="p-3 text-center">R</th>
                                    <th className="p-3 text-center">W</th>
                                    <th className="p-3 text-center">Econ</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {Object.entries(bowlerStats).map(([id, stats]) => {
                                    const player = bowlingTeam?.players.find(p => p.id === id);
                                    if (!player) return null;
                                    const overs = Math.floor(stats.balls / 6) + (stats.balls % 6) / 10;
                                    const econ = stats.balls > 0 ? (stats.runs / (stats.balls / 6)).toFixed(1) : '0.0';
                                    return (
                                        <tr key={id}>
                                            <td className="p-3 font-medium text-gray-800">{player.name}</td>
                                            <td className="p-3 text-center text-gray-600">{overs}</td>
                                            <td className="p-3 text-center font-bold">{stats.runs}</td>
                                            <td className="p-3 text-center font-bold text-cricket-green">{stats.wickets}</td>
                                            <td className="p-3 text-center text-gray-500 text-xs">{econ}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
  };

  const HomeView = () => (
    <div className="p-6 pb-24 space-y-6">
      <div className="bg-cricket-green text-white p-6 rounded-2xl shadow-xl">
        <h1 className="text-3xl font-bold mb-2">CricLive Pro</h1>
        <p className="opacity-90">Local Scoring & Live Analysis</p>
      </div>
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col items-center text-center space-y-4">
        <div className="w-16 h-16 bg-cricket-light rounded-full flex items-center justify-center text-cricket-green mb-2">
            <IconBat />
        </div>
        <div>
            <h2 className="text-xl font-bold text-gray-800">Ready to Play?</h2>
            <p className="text-gray-500 text-sm mt-1">Start a new match, track runs, and get AI commentary.</p>
        </div>
        <button 
            onClick={openMatchSetup}
            className="w-full py-3 bg-cricket-accent text-cricket-dark font-bold rounded-xl hover:bg-yellow-400 transition shadow-lg shadow-yellow-200"
        >
            Start New Match
        </button>
      </div>
      {activeMatch && activeMatch.status === 'live' ? (
        <div className="bg-white p-4 rounded-xl border-l-4 border-red-500 shadow-sm flex justify-between items-center cursor-pointer hover:shadow-md transition" onClick={() => setView('match')}>
            <div>
                <p className="text-xs text-red-500 font-bold uppercase tracking-wide flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span> Live Now</p>
                <p className="font-bold text-gray-800 mt-1">
                    {teams.find(t=>t.id===activeMatch.teamAId)?.name} <span className="text-gray-400 font-normal">vs</span> {teams.find(t=>t.id===activeMatch.teamBId)?.name}
                </p>
                <p className="text-sm text-gray-600 mt-1">{activeMatch.score}/{activeMatch.wickets} <span className="opacity-60">({activeMatch.currentOver}.{activeMatch.currentBallInOver})</span></p>
            </div>
            <div className="h-10 w-10 bg-red-50 rounded-full flex items-center justify-center text-red-500">
                <IconLive />
            </div>
        </div>
      ) : (
          <div className="space-y-3">
              <h3 className="font-bold text-gray-700 ml-1">Quick Stats</h3>
              <div className="grid grid-cols-2 gap-3">
                  <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                      <span className="block text-2xl font-bold text-cricket-green">{teams.length}</span>
                      <span className="text-xs text-gray-500 font-medium uppercase">Teams</span>
                  </div>
                  <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                      <span className="block text-2xl font-bold text-cricket-green">{teams.reduce((acc, t) => acc + t.players.length, 0)}</span>
                      <span className="text-xs text-gray-500 font-medium uppercase">Players</span>
                  </div>
              </div>
          </div>
      )}
    </div>
  );

  const TeamsView = () => (
    <div className="p-6 pb-24 space-y-6">
      <h2 className="text-2xl font-bold text-gray-800">Teams</h2>
      <div className="flex gap-2">
        <input 
          type="text" 
          placeholder="New Team Name" 
          value={newTeamName}
          onChange={(e) => setNewTeamName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleCreateTeam()}
          className="flex-1 p-3 rounded-lg border focus:border-cricket-green outline-none"
        />
        <button onClick={handleCreateTeam} className="bg-cricket-green text-white p-3 rounded-lg">
          <IconPlus />
        </button>
      </div>
      <div className="space-y-4">
        {teams.map(team => (
          <div key={team.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div 
              className={`p-4 flex justify-between items-center cursor-pointer ${selectedTeamId === team.id ? 'bg-cricket-light' : ''}`}
              onClick={() => {
                  if (selectedTeamId === team.id) {
                      setSelectedTeamId('');
                  } else {
                      setSelectedTeamId(team.id);
                      setEditingTeamName(team.name);
                  }
              }}
            >
              <h3 className="font-bold text-lg">{team.name}</h3>
              <span className="text-sm text-gray-500">{team.players.length} Players</span>
            </div>
            {selectedTeamId === team.id && (
              <div className="p-4 bg-gray-50 border-t">
                {/* Rename Section */}
                <div className="mb-4 bg-white p-3 rounded-lg border border-gray-100 shadow-sm">
                    <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Team Name</label>
                    <div className="flex gap-2">
                        <input 
                            type="text" 
                            value={editingTeamName}
                            onChange={(e) => setEditingTeamName(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleUpdateTeamName()}
                            className="flex-1 p-2 text-sm border rounded focus:border-cricket-green outline-none font-bold"
                        />
                        <button 
                            onClick={handleUpdateTeamName}
                            disabled={editingTeamName === team.name}
                            className={`px-3 py-1 rounded text-xs font-bold uppercase transition flex items-center gap-1 ${editingTeamName === team.name ? 'bg-gray-100 text-gray-400' : 'bg-cricket-green text-white shadow-sm hover:bg-cricket-dark'}`}
                        >
                            <span className="hidden sm:inline">Save</span> <IconCheck />
                        </button>
                    </div>
                </div>

                <div className="mb-4 space-y-3">
                   <input 
                      type="text" 
                      placeholder="Player Name" 
                      value={newPlayerName}
                      onChange={(e) => setNewPlayerName(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleAddPlayer()}
                      className="w-full p-2 rounded border"
                   />
                   <div className="flex items-center gap-2">
                     <label className="flex-1 cursor-pointer bg-white border border-dashed border-gray-400 p-2 rounded text-center text-sm text-gray-600 hover:bg-gray-50">
                        {playerPhoto ? "Photo Selected" : "Upload Photo"}
                        <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
                     </label>
                     <button onClick={handleAddPlayer} className="bg-cricket-green text-white px-4 py-2 rounded">Add</button>
                   </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {team.players.map(player => (
                    <div key={player.id} className="relative">
                       <PlayerCard player={player} variant="small" />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );

  const MatchView = () => {
    if (!activeMatch) return <div className="p-10 text-center">No active match</div>;

    const battingTeam = teams.find(t => t.id === activeMatch.battingTeamId);
    const bowlingTeam = teams.find(t => t.id === activeMatch.bowlingTeamId);
    const striker = battingTeam?.players.find(p => p.id === activeMatch.strikerId);
    const nonStriker = battingTeam?.players.find(p => p.id === activeMatch.nonStrikerId);
    const bowler = bowlingTeam?.players.find(p => p.id === activeMatch.currentBowlerId);

    const thisOverBalls = activeMatch.balls.slice(-activeMatch.currentBallInOver || -6).slice(-6); 

    return (
      <div className="flex flex-col h-screen bg-gray-50">
        {/* Top Scoreboard Area */}
        <div className="bg-gradient-to-br from-cricket-dark to-cricket-green text-white shadow-xl relative overflow-hidden z-10 rounded-b-[2rem]">
            {/* Background decoration */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-3xl -mr-10 -mt-10"></div>
            
            <div className="p-6 pb-8">
                {/* Header: Team Names & End Match */}
                <div className="flex justify-between items-start mb-6">
                    <div>
                        <h2 className="font-bold text-lg leading-tight">{battingTeam?.name}</h2>
                        <div className="text-xs text-cricket-light opacity-80 mt-1">vs {bowlingTeam?.name}</div>
                    </div>
                    <button onClick={handleEndMatch} className="bg-red-500/20 text-red-100 hover:bg-red-500 hover:text-white px-3 py-1 rounded-full text-xs font-bold transition backdrop-blur-sm border border-red-500/30">
                        End Match
                    </button>
                </div>

                {/* Main Score Display */}
                <div className="flex justify-between items-end">
                    <div>
                        <div className="text-6xl font-black tracking-tighter leading-none shadow-black/10 drop-shadow-lg">
                            {activeMatch.score}/{activeMatch.wickets}
                        </div>
                        <div className="text-sm font-medium opacity-80 mt-2 flex gap-3">
                             <span>Over {activeMatch.currentOver}.{activeMatch.currentBallInOver}</span>
                             <span>CRR {((activeMatch.score / (Math.max(1, (activeMatch.currentOver * 6 + activeMatch.currentBallInOver)) / 6)).toFixed(2))}</span>
                        </div>
                    </div>
                    
                    {/* Current Over Bubbles (Last 6 balls) */}
                    <div className="flex flex-col items-end gap-2">
                        <span className="text-[10px] uppercase font-bold opacity-60 tracking-wider">This Over</span>
                        <div className="flex gap-1.5">
                             {Array.from({length: 6}).map((_, i) => {
                                const ball = thisOverBalls[i];
                                let bgClass = "bg-white/10 text-white/40";
                                if (ball) {
                                    if (ball.isWicket) bgClass = "bg-red-500 text-white shadow-lg shadow-red-500/50 scale-110";
                                    else if (ball.runs === 4) bgClass = "bg-blue-500 text-white shadow-lg shadow-blue-500/50";
                                    else if (ball.runs === 6) bgClass = "bg-cricket-accent text-cricket-dark shadow-lg shadow-yellow-500/50 scale-110";
                                    else if (ball.isWide || ball.isNoBall) bgClass = "bg-orange-500 text-white";
                                    else bgClass = "bg-white text-cricket-green font-bold";
                                }
                                return (
                                    <div key={i} className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] transition-all ${bgClass}`}>
                                        {ball ? (ball.isWicket ? 'W' : ball.runs + (ball.isWide ? 'wd' : '') + (ball.isNoBall ? 'nb' : '')) : ''}
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                </div>
            </div>
        </div>

        {/* Middle Scrollable Section: Players */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
             {/* Batsmen Card */}
             <div className="bg-white rounded-2xl shadow-[0_2px_8px_rgb(0,0,0,0.04)] border border-gray-100 overflow-hidden">
                <div className="bg-gray-50/50 px-4 py-2 border-b border-gray-100 flex justify-between items-center">
                    <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Batting</span>
                    <span className="text-[10px] text-gray-400">Runs (Balls)</span>
                </div>
                <div className="p-2">
                    {/* Striker */}
                    <div className={`flex items-center p-2 rounded-xl transition-colors ${striker ? 'bg-cricket-green/5 border border-cricket-green/10' : ''}`}>
                         <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden mr-3 border border-white shadow-sm">
                             {striker?.photoData ? <img src={striker.photoData} className="w-full h-full object-cover" /> : <IconUser />}
                         </div>
                         <div className="flex-1">
                             <div className="flex items-center gap-2">
                                 <span className="font-bold text-gray-800">{striker?.name || "Select Batsman"}</span>
                                 <span className="text-[10px] bg-cricket-accent text-cricket-dark px-1.5 rounded font-bold">STR</span>
                             </div>
                         </div>
                         <div className="text-right">
                             <div className="text-xl font-bold text-gray-800">{striker?.runs || 0}</div>
                             <div className="text-xs text-gray-500">{striker?.ballsFaced || 0}</div>
                         </div>
                    </div>
                    {/* Non Striker */}
                    <div className="flex items-center p-2 rounded-xl mt-1 opacity-80">
                         <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden mr-3 border border-white">
                             {nonStriker?.photoData ? <img src={nonStriker.photoData} className="w-full h-full object-cover" /> : <IconUser />}
                         </div>
                         <div className="flex-1">
                             <div className="font-semibold text-gray-600">{nonStriker?.name || "Select Non-Striker"}</div>
                         </div>
                         <div className="text-right">
                             <div className="text-xl font-semibold text-gray-600">{nonStriker?.runs || 0}</div>
                             <div className="text-xs text-gray-400">{nonStriker?.ballsFaced || 0}</div>
                         </div>
                    </div>
                </div>
             </div>

             {/* Bowler Card */}
             <div className="bg-white rounded-2xl shadow-[0_2px_8px_rgb(0,0,0,0.04)] border border-gray-100 p-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden border border-white shadow-sm">
                        {bowler?.photoData ? <img src={bowler.photoData} className="w-full h-full object-cover" /> : <IconBall />}
                    </div>
                    <div>
                        <div className="text-xs text-gray-400 font-bold uppercase tracking-wider">Bowling</div>
                        <div className="font-bold text-gray-800">{bowler?.name || "Select Bowler"}</div>
                    </div>
                </div>
                <div className="text-right">
                    <div className="text-lg font-bold text-gray-800">{bowler?.wickets || 0}<span className="text-gray-400 mx-0.5">/</span>{bowler?.runsConceded || 0}</div>
                    <div className="text-xs text-gray-500">{bowler?.oversBowled.toFixed(1) || 0} Overs</div>
                </div>
             </div>

             {/* Commentary Bubble */}
             <div className="bg-gray-800 rounded-xl p-3 shadow-md border-l-4 border-cricket-accent">
                 <div className="text-[10px] text-gray-400 uppercase font-bold mb-1">AI Commentary</div>
                 <p className="text-sm text-white font-medium italic">"{lastCommentary}"</p>
             </div>
        </div>

        {/* Bottom Control Pad */}
        <div className="bg-white pb-6 shadow-[0_-4px_20px_rgb(0,0,0,0.05)] z-20 rounded-t-[1.5rem]">
            <div className="p-4 grid grid-cols-4 gap-3">
                <button onClick={() => handleScore(0, false, false, false)} className="h-14 rounded-2xl bg-gray-50 hover:bg-gray-100 text-gray-600 font-bold text-xl transition active:scale-95 border border-gray-200">0</button>
                <button onClick={() => handleScore(1, false, false, false)} className="h-14 rounded-2xl bg-gray-50 hover:bg-gray-100 text-gray-800 font-bold text-xl transition active:scale-95 border border-gray-200">1</button>
                <button onClick={() => handleScore(2, false, false, false)} className="h-14 rounded-2xl bg-gray-50 hover:bg-gray-100 text-gray-800 font-bold text-xl transition active:scale-95 border border-gray-200">2</button>
                <button onClick={() => handleScore(3, false, false, false)} className="h-14 rounded-2xl bg-gray-50 hover:bg-gray-100 text-gray-800 font-bold text-xl transition active:scale-95 border border-gray-200">3</button>
                
                <button onClick={() => handleScore(4, false, false, false)} className="h-14 rounded-2xl bg-blue-500 text-white font-black text-xl transition active:scale-95 shadow-lg shadow-blue-500/20">4</button>
                <button onClick={() => handleScore(6, false, false, false)} className="h-14 rounded-2xl bg-cricket-accent text-cricket-dark font-black text-xl transition active:scale-95 shadow-lg shadow-yellow-500/20">6</button>
                <button onClick={() => handleScore(1, true, false, false)} className="h-14 rounded-2xl bg-orange-100 text-orange-600 font-bold text-lg transition active:scale-95 border border-orange-200">WD</button>
                <button onClick={() => handleScore(1, false, true, false)} className="h-14 rounded-2xl bg-orange-100 text-orange-600 font-bold text-lg transition active:scale-95 border border-orange-200">NB</button>
                
                <button onClick={handleWicketClick} className="col-span-4 h-12 rounded-xl bg-red-500 text-white font-bold text-lg tracking-widest uppercase transition active:scale-95 shadow-lg shadow-red-500/20 mt-1">OUT</button>
            </div>
        </div>
      </div>
    );
  };

  const LiveView = () => {
      if (!activeMatch) return <div className="flex flex-col items-center justify-center h-screen text-gray-500"><IconLive /><p className="mt-2">No Live Match</p></div>;
      
      const battingTeam = teams.find(t => t.id === activeMatch.battingTeamId);
      
      return (
        <div className="min-h-screen bg-gray-900 text-white p-6 pb-24 flex flex-col items-center justify-center text-center">
            <div className="animate-pulse bg-red-600 text-xs px-3 py-1 rounded-full mb-6">LIVE BROADCAST</div>
            
            <h1 className="text-4xl font-bold mb-2">{teams.find(t => t.id === activeMatch.teamAId)?.name} vs {teams.find(t => t.id === activeMatch.teamBId)?.name}</h1>
            <div className="text-8xl font-black text-cricket-accent my-8">
                {activeMatch.score}/{activeMatch.wickets}
            </div>
            <div className="text-2xl text-gray-400 mb-8">
                Overs: {activeMatch.currentOver}.{activeMatch.currentBallInOver}
            </div>
            
            <div className="w-full max-w-md bg-gray-800 rounded-xl p-6">
                <p className="text-gray-400 text-sm mb-2">LAST DELIVERY COMMENTARY</p>
                <p className="text-xl font-medium">"{lastCommentary}"</p>
            </div>

            <div className="mt-8 flex gap-4">
                 <div className="bg-gray-800 p-4 rounded-lg">
                    <span className="block text-2xl font-bold text-cricket-accent">{battingTeam?.players.find(p => p.id === activeMatch.strikerId)?.runs || 0}</span>
                    <span className="text-xs text-gray-400">Striker</span>
                 </div>
                 <div className="bg-gray-800 p-4 rounded-lg">
                    <span className="block text-2xl font-bold text-cricket-accent">{((activeMatch.score / (activeMatch.currentOver + (activeMatch.currentBallInOver/6))) || 0).toFixed(1)}</span>
                    <span className="text-xs text-gray-400">Run Rate</span>
                 </div>
            </div>
        </div>
      )
  };

  const StatsView = () => (
    <div className="p-6 pb-24 space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">Statistics</h2>
        <div className="bg-gray-200 rounded-lg p-1 flex text-sm font-medium">
          <button 
            className={`px-4 py-1.5 rounded-md transition ${statsTab === 'players' ? 'bg-white shadow text-gray-900' : 'text-gray-500'}`}
            onClick={() => setStatsTab('players')}
          >
            Players
          </button>
          <button 
            className={`px-4 py-1.5 rounded-md transition ${statsTab === 'history' ? 'bg-white shadow text-gray-900' : 'text-gray-500'}`}
            onClick={() => setStatsTab('history')}
          >
            Matches
          </button>
        </div>
      </div>

      {statsTab === 'players' ? (
        <div className="space-y-6">
            {teams.map(team => (
                <div key={team.id}>
                    <h3 className="text-lg font-bold text-cricket-green mb-3 border-b pb-1">{team.name}</h3>
                    <div className="grid grid-cols-1 gap-4">
                        {team.players.map(player => (
                            <div key={player.id} className="flex bg-white p-3 rounded-lg shadow-sm gap-4">
                                <div className="w-16 h-16 bg-gray-200 rounded-full overflow-hidden flex-shrink-0">
                                    {player.photoData ? <img src={player.photoData} className="w-full h-full object-cover" alt={player.name} /> : <div className="w-full h-full flex items-center justify-center"><IconUser /></div>}
                                </div>
                                <div className="flex-1">
                                    <h4 className="font-bold">{player.name}</h4>
                                    <div className="text-sm text-gray-600 mt-1 flex gap-4">
                                        <span><b>{player.runs}</b> Runs</span>
                                        <span><b>{player.wickets}</b> Wkts</span>
                                        <span><b>{player.matches}</b> Mat</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            ))}
        </div>
      ) : (
        <div className="space-y-4">
          {matchHistory.length === 0 && <p className="text-gray-500 text-center py-10">No completed matches yet.</p>}
          {matchHistory.map(match => {
            const teamA = teams.find(t => t.id === match.teamAId);
            const teamB = teams.find(t => t.id === match.teamBId);
            const battingTeam = teams.find(t => t.id === match.battingTeamId);
            return (
              <div 
                key={match.id} 
                className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 cursor-pointer hover:shadow-md transition active:scale-[0.99]"
                onClick={() => { setSummaryMatch(match); setView('summary'); }}
              >
                <div className="flex justify-between items-start mb-2">
                   <div className="text-xs text-gray-500 font-bold bg-gray-100 px-2 py-0.5 rounded">
                     {new Date(match.date).toLocaleDateString()}
                   </div>
                   <span className="text-xs text-gray-400">Completed &gt;</span>
                </div>
                <div className="text-lg font-bold text-gray-800">
                  {teamA?.name || 'Unknown'} <span className="text-gray-400 font-normal text-sm">vs</span> {teamB?.name || 'Unknown'}
                </div>
                <div className="mt-2 text-sm text-gray-600">
                  {battingTeam?.name} scored:
                </div>
                <div className="text-2xl font-black text-cricket-green">
                  {match.score}/{match.wickets} <span className="text-sm font-medium text-gray-500 ml-1">({match.currentOver}.{match.currentBallInOver})</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  return (
    <div className="font-sans text-gray-900 bg-gray-50 min-h-screen">
      {view === 'home' && <HomeView />}
      {view === 'teams' && <TeamsView />}
      {view === 'match' && <MatchView />}
      {view === 'live' && <LiveView />}
      {view === 'stats' && <StatsView />}
      {view === 'summary' && <MatchSummaryView />}
      
      <MatchSetupModal />
      <WicketModal />
      
      <Navbar />
    </div>
  );
}

export default App;