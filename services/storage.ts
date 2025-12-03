import { Team, Match, Player } from '../types';
import { STORAGE_KEYS } from '../constants';

export const saveTeams = (teams: Team[]) => {
  try {
    localStorage.setItem(STORAGE_KEYS.TEAMS, JSON.stringify(teams));
  } catch (e) {
    console.error("Storage limit reached", e);
    alert("Storage full! Try removing some player photos.");
  }
};

export const getTeams = (): Team[] => {
  const data = localStorage.getItem(STORAGE_KEYS.TEAMS);
  return data ? JSON.parse(data) : [];
};

export const saveActiveMatch = (match: Match | null) => {
  if (match) {
    localStorage.setItem(STORAGE_KEYS.ACTIVE_MATCH, JSON.stringify(match));
  } else {
    localStorage.removeItem(STORAGE_KEYS.ACTIVE_MATCH);
  }
};

export const getActiveMatch = (): Match | null => {
  const data = localStorage.getItem(STORAGE_KEYS.ACTIVE_MATCH);
  return data ? JSON.parse(data) : null;
};

export const saveMatchToHistory = (match: Match) => {
  const history = getMatchHistory();
  // Add new match to the beginning of the list
  history.unshift(match);
  try {
    localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(history));
  } catch (e) {
    console.error("History storage limit reached", e);
    // Optional: remove oldest match if full
  }
};

export const getMatchHistory = (): Match[] => {
  const data = localStorage.getItem(STORAGE_KEYS.HISTORY);
  return data ? JSON.parse(data) : [];
};

// Helper to update player stats efficiently
export const updatePlayerStats = (teams: Team[], match: Match) => {
    // In a real app, we would process the match balls to update aggregate stats
    // For this demo, we assume stats are updated live or at end of match
    saveTeams(teams);
};