import React, { useEffect, useState } from "react";
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import { db } from "../firebase/firebase";
import type { Player } from "../types/record-interface";

type Mode = "hitter" | "pitcher";

// 야구 이닝(ex: 2.1)을 실제 계산용 수치(ex: 2.333)로 변환하는 유틸리티
const convertToRealInnings = (ip: number): number => {
    const innings = Math.floor(ip);
    const outs = Math.round((ip - innings) * 10); // 소수점 첫째 자리 추출
    return innings + outs / 3;
};

const formatSide = (side?: string) => {
    if (side === "좌") return "L";
    if (side === "우") return "R";
    return side || "-";
};

const TEAM_INFO: Record<
    string,
    { label: string; dot: string; bg: string; text: string }
> = {
    coupang: {
        label: "쿠팡 일용직스",
        dot: "bg-amber-400",
        bg: "bg-amber-100",
        text: "text-amber-700",
    },
    yongkids: {
        label: "대구 용키스",
        dot: "bg-blue-500",
        bg: "bg-blue-100",
        text: "text-blue-700",
    },
    mercenary: {
        label: "용병 (Mercenary)",
        dot: "bg-slate-400",
        bg: "bg-slate-100",
        text: "text-slate-600",
    },
};

const HITTER_RANKS = [
    { key: "bWar", label: "WAR", fmt: (v: number) => v.toFixed(2) },
    { key: "ops", label: "OPS", fmt: (v: number) => v.toFixed(3) },
    { key: "avg", label: "AVG", fmt: (v: number) => v.toFixed(3) },
    { key: "obp", label: "OBP", fmt: (v: number) => v.toFixed(3) },
    { key: "slg", label: "SLG", fmt: (v: number) => v.toFixed(3) },
    { key: "hr", label: "HR", fmt: (v: number) => String(v) },
    { key: "rbi", label: "RBI", fmt: (v: number) => String(v) },
    { key: "hits", label: "H", fmt: (v: number) => String(v) },
    { key: "runs", label: "R", fmt: (v: number) => String(v) },
    { key: "sb", label: "SB", fmt: (v: number) => String(v) },
] as const;

const PITCHER_RANKS = [
    { key: "pWar", label: "WAR", fmt: (v: number) => v.toFixed(2), asc: false },
    { key: "era", label: "ERA", fmt: (v: number) => v.toFixed(2), asc: true },
    { key: "whip", label: "WHIP", fmt: (v: number) => v.toFixed(2), asc: true },
    { key: "ip", label: "IP", fmt: (v: number) => v.toFixed(1), asc: false },
    { key: "so", label: "K", fmt: (v: number) => String(v), asc: false },
    { key: "wins", label: "W", fmt: (v: number) => String(v), asc: false },
    {
        key: "kper9",
        label: "K/9",
        fmt: (v: number) => v.toFixed(2),
        asc: false,
    },
] as const;

type HitterRankKey = (typeof HITTER_RANKS)[number]["key"];
type PitcherRankKey = (typeof PITCHER_RANKS)[number]["key"];

const calcStats = (p: Player) => {
    const { batting: b, pitching: pi } = p;

    // 타자 계산 로직
    const avg = b.atBats > 0 ? b.hits / b.atBats : 0;
    const obp =
        b.atBats + b.walks + b.hbp > 0
            ? (b.hits + b.walks + b.hbp) / (b.atBats + b.walks + b.hbp)
            : 0;
    const singles = b.hits - (b.doubles + b.triples + b.homeRuns);
    const slg =
        b.atBats > 0
            ? (singles + b.doubles * 2 + b.triples * 3 + b.homeRuns * 4) /
              b.atBats
            : 0;
    const ops = obp + slg;
    const bWar =
        (b.rbi * 1.2 +
            b.runs * 1.0 +
            b.hits * 0.5 +
            b.homeRuns * 2.5 -
            (b.k || 0) * 0.15) /
        10;

    // 투수 계산 로직 (이닝 보정 적용)
    const realInnings = convertToRealInnings(pi.inningsPitched);

    const era = realInnings > 0 ? (pi.earnedRuns * 9) / realInnings : 99.99;
    const whip =
        realInnings > 0
            ? (((pi as any).walks || 0) + ((pi as any).hitsAllowed || 0)) /
              realInnings
            : 99.99;
    const kper9 = realInnings > 0 ? (pi.strikeouts * 9) / realInnings : 0;

    // pWar도 보정된 이닝으로 계산하는 것이 정확합니다.
    const pWar =
        (realInnings * 1.5 + pi.strikeouts * 0.5 - pi.earnedRuns * 1.2) / 10;

    return {
        avg,
        obp,
        slg,
        ops,
        bWar,
        hr: b.homeRuns,
        rbi: b.rbi,
        hits: b.hits,
        runs: b.runs,
        sb: (b as any).sb || 0,
        era,
        whip,
        ip: pi.inningsPitched, // 화면 표시용은 원래 2.1 형태 유지
        so: pi.strikeouts,
        wins: pi.wins,
        kper9,
        pWar,
    };
};

const StatCard = ({ label, value, highlight = false }: any) => (
    <div
        className={`p-4 rounded-xl border ${highlight ? "bg-slate-900 border-slate-900 text-white" : "bg-slate-50 dark:bg-slate-800/60 border-slate-100 dark:border-slate-800 text-slate-900 dark:text-slate-100"}`}
    >
        <p className="text-[10px] font-bold uppercase mb-1 text-slate-400">
            {label}
        </p>
        <p className="text-2xl font-black tabular-nums">{value}</p>
    </div>
);

const MiniCard = ({ label, value, isBad = false }: any) => (
    <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-lg p-3 text-center">
        <p className="text-[10px] text-slate-400 mb-1">{label}</p>
        <p
            className={`text-lg font-bold tabular-nums ${isBad ? "text-red-500" : "text-slate-700 dark:text-slate-300"}`}
        >
            {value}
        </p>
    </div>
);

const Record: React.FC = () => {
    const [players, setPlayers] = useState<Player[]>([]);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [mode, setMode] = useState<Mode>("hitter");
    const [hRank, setHRank] = useState<HitterRankKey>("bWar");
    const [pRank, setPRank] = useState<PitcherRankKey>("pWar");

    useEffect(() => {
        const q = query(collection(db, "players"), orderBy("name", "asc"));
        getDocs(q).then((snap) =>
            setPlayers(
                snap.docs.map((d) => ({ id: d.id, ...d.data() })) as Player[],
            ),
        );
    }, []);

    const filteredPlayers = players.filter(
        (p) => (p.teamId as string) !== "mercenary",
    );
    const sortedPlayers = [...filteredPlayers].sort((a, b) => {
        const sa = calcStats(a) as any;
        const sb = calcStats(b) as any;
        if (mode === "hitter") return sb[hRank] - sa[hRank];
        const info = PITCHER_RANKS.find((r) => r.key === pRank)!;
        return info.asc ? sa[pRank] - sb[pRank] : sb[pRank] - sa[pRank];
    });

    const selected = players.find((p) => p.id === selectedId) ?? null;
    const stats = selected ? calcStats(selected) : null;

    return (
        <div className="min-h-screen bg-[#f9f9f8] dark:bg-slate-950 p-6">
            <div className="max-w-6xl mx-auto">
                {/* 헤더 및 모드 전환 로직 (기존과 동일) */}
                <div className="mb-6 flex justify-between items-end flex-wrap gap-3">
                    <div>
                        <p className="text-[11px] font-medium tracking-[0.12em] uppercase text-slate-400 mb-1">
                            Nangman Baseball League
                        </p>
                        <h1 className="text-2xl font-medium text-slate-900 dark:text-slate-100 tracking-tight">
                            시즌 기록실
                        </h1>
                    </div>
                    <div className="flex bg-white dark:bg-slate-900 p-1 rounded-lg border border-slate-200 dark:border-slate-800">
                        {(["hitter", "pitcher"] as const).map((m) => (
                            <button
                                key={m}
                                onClick={() => {
                                    setMode(m);
                                    setSelectedId(null);
                                }}
                                className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${mode === m ? "bg-slate-900 text-white shadow-sm" : "text-slate-400 hover:text-slate-600"}`}
                            >
                                {m === "hitter" ? "타자 순위" : "투수 순위"}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="flex border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-slate-900 min-h-150">
                    {/* 사이드바 랭킹 리스트 */}
                    <div className="w-64 shrink-0 border-r border-slate-200 dark:border-slate-800 flex flex-col">
                        <div className="flex flex-wrap gap-1 px-3 py-2 bg-slate-50/50 dark:bg-slate-800/20 border-b border-slate-100">
                            {(mode === "hitter"
                                ? HITTER_RANKS
                                : PITCHER_RANKS
                            ).map((r) => (
                                <button
                                    key={r.key}
                                    onClick={() =>
                                        mode === "hitter"
                                            ? setHRank(r.key as HitterRankKey)
                                            : setPRank(r.key as PitcherRankKey)
                                    }
                                    className={`px-2.5 py-1 text-[10px] font-bold rounded-md transition-all ${(mode === "hitter" ? hRank : pRank) === r.key ? "bg-slate-900 text-white" : "text-slate-400"}`}
                                >
                                    {r.label}
                                </button>
                            ))}
                        </div>
                        <div className="overflow-y-auto flex-1">
                            {sortedPlayers.map((p, index) => (
                                <div
                                    key={p.id}
                                    onClick={() => setSelectedId(p.id)}
                                    className={`flex items-center gap-3 px-4 py-3 cursor-pointer border-b border-slate-100 transition-colors ${selectedId === p.id ? "bg-slate-50" : "hover:bg-slate-50/70"}`}
                                >
                                    <span
                                        className={`text-[11px] font-black w-4 ${index < 3 ? "text-blue-600" : "text-slate-300"}`}
                                    >
                                        {index + 1}
                                    </span>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-[13px] font-medium text-slate-800 truncate">
                                            {p.name}
                                        </p>
                                        <p className="text-[10px] text-slate-400">
                                            {mode === "hitter"
                                                ? HITTER_RANKS.find(
                                                      (r) => r.key === hRank,
                                                  )!.fmt(
                                                      (calcStats(p) as any)[
                                                          hRank
                                                      ],
                                                  )
                                                : PITCHER_RANKS.find(
                                                      (r) => r.key === pRank,
                                                  )!.fmt(
                                                      (calcStats(p) as any)[
                                                          pRank
                                                      ],
                                                  )}
                                        </p>
                                    </div>
                                    <div
                                        className={`w-1.5 h-1.5 rounded-full ${TEAM_INFO[p.teamId]?.dot || "bg-slate-300"}`}
                                    />
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* 메인 상세 페이지 */}
                    <div className="flex-1 flex flex-col min-w-0">
                        {selected && stats ? (
                            <>
                                <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center">
                                    <div className="flex items-center gap-3">
                                        <div
                                            className={`w-9 h-9 rounded-full flex items-center justify-center text-[12px] font-bold ${TEAM_INFO[selected.teamId]?.bg} ${TEAM_INFO[selected.teamId]?.text}`}
                                        >
                                            {selected.name[0]}
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <p className="text-[15px] font-bold text-slate-900">
                                                    {selected.name}
                                                </p>
                                                <span className="text-[10px] font-black px-2 py-0.5 rounded bg-blue-50 text-blue-600 border border-blue-100 uppercase">
                                                    {formatSide(
                                                        (selected as any)
                                                            .batSide,
                                                    )}
                                                    타 /{" "}
                                                    {formatSide(
                                                        (selected as any)
                                                            .throwSide,
                                                    )}
                                                    투
                                                </span>
                                            </div>
                                            <p className="text-[11px] text-slate-500">
                                                {
                                                    TEAM_INFO[selected.teamId]
                                                        ?.label
                                                }
                                            </p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[11px] font-medium uppercase text-slate-400">
                                            Season WAR
                                        </p>
                                        <p className="text-xl font-black text-blue-600">
                                            {(mode === "hitter"
                                                ? stats.bWar
                                                : stats.pWar
                                            ).toFixed(2)}
                                        </p>
                                    </div>
                                </div>

                                <div className="p-6 overflow-y-auto flex-1">
                                    {mode === "hitter" ? (
                                        // 타자 섹션 (생략 가능)
                                        <section>
                                            <p className="text-[11px] font-medium uppercase text-slate-400 mb-4">
                                                Batting Analysis (타격)
                                            </p>
                                            <div className="grid grid-cols-3 gap-3 mb-3">
                                                <StatCard
                                                    label="OPS"
                                                    value={stats.ops.toFixed(3)}
                                                    highlight
                                                />
                                                <StatCard
                                                    label="OBP 출루율"
                                                    value={stats.obp.toFixed(3)}
                                                />
                                                <StatCard
                                                    label="SLG 장타율"
                                                    value={stats.slg.toFixed(3)}
                                                />
                                            </div>
                                            <div className="grid grid-cols-2 gap-3 mb-6">
                                                <StatCard
                                                    label="AVG 타율"
                                                    value={stats.avg.toFixed(3)}
                                                />
                                                <StatCard
                                                    label="WAR"
                                                    value={stats.bWar.toFixed(
                                                        2,
                                                    )}
                                                />
                                            </div>
                                            <div className="grid grid-cols-5 gap-2">
                                                <MiniCard
                                                    label="타수"
                                                    value={
                                                        selected.batting.atBats
                                                    }
                                                />
                                                <MiniCard
                                                    label="안타"
                                                    value={
                                                        selected.batting.hits
                                                    }
                                                />
                                                <MiniCard
                                                    label="홈런"
                                                    value={
                                                        selected.batting
                                                            .homeRuns
                                                    }
                                                />
                                                <MiniCard
                                                    label="타점"
                                                    value={selected.batting.rbi}
                                                />
                                                <MiniCard
                                                    label="삼진"
                                                    value={
                                                        selected.batting.k || 0
                                                    }
                                                    isBad
                                                />
                                            </div>
                                        </section>
                                    ) : (
                                        // 투수 섹션
                                        <section>
                                            <p className="text-[11px] font-medium uppercase text-slate-400 mb-4">
                                                Pitching Analysis (투구)
                                            </p>
                                            <div className="grid grid-cols-3 gap-3 mb-3">
                                                <StatCard
                                                    label="ERA 평균자책"
                                                    value={stats.era.toFixed(2)}
                                                    highlight
                                                />
                                                <StatCard
                                                    label="WHIP"
                                                    value={stats.whip.toFixed(
                                                        2,
                                                    )}
                                                />
                                                <StatCard
                                                    label="K/9"
                                                    value={stats.kper9.toFixed(
                                                        2,
                                                    )}
                                                />
                                            </div>
                                            <div className="grid grid-cols-2 gap-3 mb-6">
                                                <StatCard
                                                    label="이닝"
                                                    value={stats.ip.toFixed(1)}
                                                />
                                                <StatCard
                                                    label="WAR"
                                                    value={stats.pWar.toFixed(
                                                        2,
                                                    )}
                                                />
                                            </div>
                                            <div className="grid grid-cols-4 gap-2">
                                                <MiniCard
                                                    label="승"
                                                    value={
                                                        selected.pitching.wins
                                                    }
                                                />
                                                <MiniCard
                                                    label="탈삼진"
                                                    value={
                                                        selected.pitching
                                                            .strikeouts
                                                    }
                                                />
                                                <MiniCard
                                                    label="자책점"
                                                    value={
                                                        selected.pitching
                                                            .earnedRuns
                                                    }
                                                    isBad
                                                />
                                                <MiniCard
                                                    label="기록 이닝"
                                                    value={
                                                        selected.pitching
                                                            .inningsPitched
                                                    }
                                                />
                                            </div>
                                        </section>
                                    )}
                                </div>
                            </>
                        ) : (
                            <div className="flex-1 flex flex-col items-center justify-center text-slate-300">
                                <span className="text-4xl mb-2">📈</span>
                                <p className="text-[13px] font-medium italic">
                                    좌측 랭킹에서 선수를 선택하세요
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Record;
