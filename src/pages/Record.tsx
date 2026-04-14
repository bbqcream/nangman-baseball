import React, { useEffect, useState } from "react";
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import { db } from "../firebase/firebase";
import type { Player } from "../types/record-interface";

type Mode = "hitter" | "pitcher";

// 팀 정보 공통 관리
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
        label: "대구 용키즈",
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

const Record: React.FC = () => {
    const [players, setPlayers] = useState<Player[]>([]);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [mode, setMode] = useState<Mode>("hitter");

    useEffect(() => {
        const q = query(collection(db, "players"), orderBy("name", "asc"));
        getDocs(q).then((snap) =>
            setPlayers(
                snap.docs.map((d) => ({ id: d.id, ...d.data() })) as Player[],
            ),
        );
    }, []);

    const calcStats = (p: Player) => {
        const { batting, pitching } = p;
        const avg = batting.atBats > 0 ? batting.hits / batting.atBats : 0;
        const obp =
            batting.atBats + batting.walks + batting.hbp > 0
                ? (batting.hits + batting.walks + batting.hbp) /
                  (batting.atBats + batting.walks + batting.hbp)
                : 0;
        const singles =
            batting.hits -
            (batting.doubles + batting.triples + batting.homeRuns);
        const slg =
            batting.atBats > 0
                ? (singles +
                      batting.doubles * 2 +
                      batting.triples * 3 +
                      batting.homeRuns * 4) /
                  batting.atBats
                : 0;
        const ops = obp + slg;
        const bWar =
            (batting.rbi * 1.2 +
                batting.runs * 1.0 +
                batting.hits * 0.5 +
                batting.homeRuns * 2.5 -
                (batting.k || 0) * 0.15) /
            10;
        const era =
            pitching.inningsPitched > 0
                ? (pitching.earnedRuns * 9) / pitching.inningsPitched
                : 0;
        const pWar =
            (pitching.inningsPitched * 1.5 +
                pitching.strikeouts * 0.5 -
                pitching.earnedRuns * 1.2) /
            10;

        return { avg, obp, slg, ops, era, bWar, pWar };
    };

    const sortedPlayers = [...players].sort((a, b) => {
        const statA = calcStats(a);
        const statB = calcStats(b);
        return mode === "hitter"
            ? statB.bWar - statA.bWar
            : statB.pWar - statA.pWar;
    });

    const selected = players.find((p) => p.id === selectedId) ?? null;
    const stats = selected ? calcStats(selected) : null;
    const labelCls =
        "text-[11px] font-medium uppercase tracking-[0.08em] text-slate-400 dark:text-slate-500";

    return (
        <div className="min-h-screen bg-[#f9f9f8] dark:bg-slate-950 p-6">
            <div className="max-w-6xl mx-auto">
                <div className="mb-6 flex justify-between items-end">
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

                <div className="flex border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-slate-900 min-h-[600px]">
                    {/* 사이드바 */}
                    <div className="w-64 shrink-0 border-r border-slate-200 dark:border-slate-800 flex flex-col">
                        <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
                            <span className={labelCls}>
                                {mode === "hitter"
                                    ? "타자 WAR 순위"
                                    : "투수 WAR 순위"}
                            </span>
                        </div>
                        <div className="overflow-y-auto flex-1">
                            {sortedPlayers.map((p, index) => (
                                <div
                                    key={p.id}
                                    onClick={() => setSelectedId(p.id)}
                                    className={`flex items-center gap-3 px-4 py-3 cursor-pointer border-b border-slate-100 dark:border-slate-800/60 last:border-0 transition-colors ${selectedId === p.id ? "bg-slate-50 dark:bg-slate-800/50" : "hover:bg-slate-50/70 dark:hover:bg-slate-800/30"}`}
                                >
                                    <span
                                        className={`text-[11px] font-black w-4 ${index < 3 ? "text-blue-600" : "text-slate-300"}`}
                                    >
                                        {index + 1}
                                    </span>
                                    <div className="min-w-0 flex-1">
                                        <p className="text-[13px] font-medium text-slate-800 dark:text-slate-200 truncate">
                                            {p.name}
                                        </p>
                                        <p className="text-[10px] text-slate-400">
                                            WAR{" "}
                                            {(mode === "hitter"
                                                ? calcStats(p).bWar
                                                : calcStats(p).pWar
                                            ).toFixed(2)}
                                        </p>
                                    </div>
                                    <div
                                        className={`w-1.5 h-1.5 rounded-full ${TEAM_INFO[p.teamId]?.dot || "bg-slate-300"}`}
                                    />
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* 메인 상세 */}
                    <div className="flex-1 flex flex-col min-w-0">
                        {selected && stats ? (
                            <>
                                <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
                                    <div className="flex items-center gap-3">
                                        <div
                                            className={`w-9 h-9 rounded-full flex items-center justify-center text-[12px] font-bold ${TEAM_INFO[selected.teamId]?.bg} ${TEAM_INFO[selected.teamId]?.text}`}
                                        >
                                            {selected.name[0]}
                                        </div>
                                        <div>
                                            <p className="text-[15px] font-bold text-slate-900 dark:text-slate-100">
                                                {selected.name}
                                            </p>
                                            <p className="text-[11px] text-slate-500">
                                                {
                                                    TEAM_INFO[selected.teamId]
                                                        ?.label
                                                }
                                            </p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className={labelCls}>Season WAR</p>
                                        <p className="text-xl font-black text-blue-600">
                                            {(mode === "hitter"
                                                ? stats.bWar
                                                : stats.pWar
                                            ).toFixed(2)}
                                        </p>
                                    </div>
                                </div>
                                <div className="p-6 overflow-y-auto flex-1">
                                    {/* ... StatCard 및 MiniCard 렌더링 부분 (기존과 동일) ... */}
                                    {mode === "hitter" ? (
                                        <section>
                                            <p className={`${labelCls} mb-4`}>
                                                Batting Analysis (타격)
                                            </p>
                                            <div className="grid grid-cols-4 gap-3 mb-8">
                                                <StatCard
                                                    label="OPS"
                                                    value={stats.ops.toFixed(3)}
                                                    highlight
                                                />
                                                <StatCard
                                                    label="AVG"
                                                    value={stats.avg.toFixed(3)}
                                                />
                                                <StatCard
                                                    label="OBP"
                                                    value={stats.obp.toFixed(3)}
                                                />
                                                <StatCard
                                                    label="SLG"
                                                    value={stats.slg.toFixed(3)}
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
                                        <section>
                                            <p className={`${labelCls} mb-4`}>
                                                Pitching Analysis (투구)
                                            </p>
                                            <div className="grid grid-cols-3 gap-3 mb-8">
                                                <StatCard
                                                    label="ERA"
                                                    value={stats.era.toFixed(2)}
                                                    highlight
                                                />
                                                <StatCard
                                                    label="Innings"
                                                    value={
                                                        selected.pitching
                                                            .inningsPitched
                                                    }
                                                />
                                                <StatCard
                                                    label="Strikeouts"
                                                    value={
                                                        selected.pitching
                                                            .strikeouts
                                                    }
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
                                                    label="패"
                                                    value={
                                                        selected.pitching.losses
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

// StatCard, MiniCard 하단 컴포넌트는 기존과 동일하게 유지...
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

export default Record;
