export interface Player {
  id: string;
  name: string;
  photoData?: string; // Base64 string for local storage
  matches: number;
  runs: number;
  ballsFaced: number;
  wickets: number;
  oversBowled: number;
  runsConceded: number;
}

export interface Team {
  id: string;
  name: string;
  players: Player[];
}

export interface BallEvent {
  runs: number;
  isWide: boolean;
  isNoBall: boolean;
  isWicket: boolean;
  wicketType?: 'bowled' | 'caught' | 'lbw' | 'runout' | 'stumped' | 'other';
  bowlerId: string;
  strikerId: string;
  nonStrikerId: string;
  commentary?: string;
}

export interface Match {
  id: string;
  teamAId: string;
  teamBId: string;
  battingTeamId: string;
  bowlingTeamId: string;
  totalOvers: number;
  currentOver: number;
  currentBallInOver: number; // 0-5 (usually)
  score: number;
  wickets: number;
  extras: number;
  balls: BallEvent[];
  strikerId: string | null;
  nonStrikerId: string | null;
  currentBowlerId: string | null;
  isCompleted: boolean;
  status: 'not_started' | 'live' | 'completed';
  date: string;
}

export interface AppState {
  teams: Team[];
  activeMatch: Match | null;
  view: 'home' | 'match' | 'teams' | 'stats' | 'live_view';
}
