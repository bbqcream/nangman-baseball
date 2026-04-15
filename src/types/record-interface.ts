// src/types.ts

// 타자 기록
export interface BattingStats {
    atBats: number; // 타수
    hits: number; // 안타
    doubles: number; // 2루타
    triples: number; // 3루타
    homeRuns: number; // 홈런
    walks: number; // 볼넷
    hbp: number; // 사구
    k: number; // 희생플라이
    rbi: number; // 타점
    runs: number; // 득점
}

// 투수 기록 타입
export interface PitchingStats {
    inningsPitched: number; // 이닝 (예: 5.2이닝 -> 5.666... 으로 저장하거나 17아웃으로 저장 후 프론트에서 변환)
    earnedRuns: number; // 자책점
    strikeouts: number; // 탈삼진
    wins: number; // 승리
    losses: number; // 패배
}

// 선수 타입 (투타 겸업)
export type TeamId = "coupang" | "yongkids";

export interface Player {
    id: string;
    teamId: TeamId;
    name: string;
    isManager: boolean;
    batting: BattingStats;
    pitching: PitchingStats;
    batSide: "좌" | "우" | "양"; 
    throwSide: "좌" | "우";
}

// 팀 누적 스탯 타입
export interface TeamStats {
    wins: number;
    ties: number;
    losses: number;
    runsScored: number; // 총 득점
    runsAllowed: number; // 총 실점
    earnedRuns: number; // 총 자책점
    inningsPitched: number;
}

// 팀 타입
export interface Team {
    id: string;
    name: string;
    color: string;
    logoUrl: string;
    stats: TeamStats;
}
