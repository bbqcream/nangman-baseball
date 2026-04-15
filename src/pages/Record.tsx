import React, { useEffect, useState } from "react";
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import { db } from "../firebase/firebase";
import type { Player } from "../types/record-interface";

type Mode = "hitter" | "pitcher";

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

const HITTER_RANKS = [
    {
        key: "bWar",
        label: "WAR",
        desc: "종합 기여도",
        fmt: (v: number) => v.toFixed(2),
    },
    {
        key: "ops",
        label: "OPS",
        desc: "출루+장타",
        fmt: (v: number) => v.toFixed(3),
    },
    {
        key: "avg",
        label: "AVG",
        desc: "타율",
        fmt: (v: number) => v.toFixed(3),
    },
    {
        key: "obp",
        label: "OBP",
        desc: "출루율",
        fmt: (v: number) => v.toFixed(3),
    },
    {
        key: "slg",
        label: "SLG",
        desc: "장타율",
        fmt: (v: number) => v.toFixed(3),
    },
    { key: "hr", label: "HR", desc: "홈런", fmt: (v: number) => String(v) },
    { key: "rbi", label: "RBI", desc: "타점", fmt: (v: number) => String(v) },
    { key: "hits", label: "H", desc: "안타", fmt: (v: number) => String(v) },
    { key: "runs", label: "R", desc: "득점", fmt: (v: number) => String(v) },
    { key: "sb", label: "SB", desc: "도루", fmt: (v: number) => String(v) },
] as const;

const PITCHER_RANKS = [
    {
        key: "pWar",
        label: "WAR",
        desc: "종합 기여도",
        fmt: (v: number) => v.toFixed(2),
        asc: false,
    },
    {
        key: "era",
        label: "ERA",
        desc: "평균자책점",
        fmt: (v: number) => v.toFixed(2),
        asc: true,
    },
    {
        key: "whip",
        label: "WHIP",
        desc: "이닝당 출루",
        fmt: (v: number) => v.toFixed(2),
        asc: true,
    },
    {
        key: "ip",
        label: "IP",
        desc: "이닝",
        fmt: (v: number) => v.toFixed(1),
        asc: false,
    },
    {
        key: "so",
        label: "K",
        desc: "탈삼진",
        fmt: (v: number) => String(v),
        asc: false,
    },
    {
        key: "wins",
        label: "W",
        desc: "승",
        fmt: (v: number) => String(v),
        asc: false,
    },
    {
        key: "kper9",
        label: "K/9",
        desc: "9이닝당 탈삼",
        fmt: (v: number) => v.toFixed(2),
        asc: false,
    },
] as const;

type HitterRankKey = (typeof HITTER_RANKS)[number]["key"];
type PitcherRankKey = (typeof PITCHER_RANKS)[number]["key"];

const calcStats = (p: Player) => {
    const { batting: b, pitching: pi } = p;
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
    const era =
        pi.inningsPitched > 0 ? (pi.earnedRuns * 9) / pi.inningsPitched : 99.99;
    const whip =
        pi.inningsPitched > 0
            ? (((pi as any).walks || 0) + ((pi as any).hitsAllowed || 0)) /
              pi.inningsPitched
            : 99.99;
    const kper9 =
        pi.inningsPitched > 0 ? (pi.strikeouts * 9) / pi.inningsPitched : 0;
    const pWar =
        (pi.inningsPitched * 1.5 + pi.strikeouts * 0.5 - pi.earnedRuns * 1.2) /
        10;

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
        ip: pi.inningsPitched,
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

    // 필터링: 항상 용병(mercenary)을 제외하도록 고정합니다.
    const filteredPlayers = players.filter(
        (p) => (p.teamId as string) !== "mercenary",
    );

    const currentHRankInfo = HITTER_RANKS.find((r) => r.key === hRank)!;
    const currentPRankInfo = PITCHER_RANKS.find((r) => r.key === pRank)!;

    const sortedPlayers = [...filteredPlayers].sort((a, b) => {
        const sa = calcStats(a) as any;
        const sb = calcStats(b) as any;
        if (mode === "hitter") return sb[hRank] - sa[hRank];
        return currentPRankInfo.asc
            ? sa[pRank] - sb[pRank]
            : sb[pRank] - sa[pRank];
    });

    const selected = players.find((p) => p.id === selectedId) ?? null;
    const stats = selected ? calcStats(selected) : null;
    const labelCls =
        "text-[11px] font-medium uppercase tracking-[0.08em] text-slate-400 dark:text-slate-500";

    return (
        <div className="min-h-screen bg-[#f9f9f8] dark:bg-slate-950 p-6">
            <div className="max-w-6xl mx-auto">
                <div className="mb-6 flex justify-between items-end flex-wrap gap-3">
                    <div>
                        <p className="text-[11px] font-medium tracking-[0.12em] uppercase text-slate-400 mb-1">
                            Nangman Baseball League
                        </p>
                        <h1 className="text-2xl font-medium text-slate-900 dark:text-slate-100 tracking-tight">
                            시즌 기록실
                        </h1>
                    </div>
                    <div className="flex items-center gap-3">
                        {/* 용병 필터 버튼을 제거했습니다. */}
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
                </div>

                <div className="flex border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-slate-900 min-h-150">
                    <div className="w-64 shrink-0 border-r border-slate-200 dark:border-slate-800 flex flex-col">
                        <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
                            <span className={labelCls}>
                                {mode === "hitter"
                                    ? `타자 ${currentHRankInfo.label} 순위`
                                    : `투수 ${currentPRankInfo.label} 순위`}
                            </span>
                        </div>
                        <div className="flex flex-wrap gap-1 px-3 py-2 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20">
                            {(mode === "hitter"
                                ? HITTER_RANKS
                                : PITCHER_RANKS
                            ).map((r) => {
                                const active =
                                    mode === "hitter"
                                        ? hRank === r.key
                                        : pRank === r.key;
                                return (
                                    <button
                                        key={r.key}
                                        onClick={() =>
                                            mode === "hitter"
                                                ? setHRank(
                                                      r.key as HitterRankKey,
                                                  )
                                                : setPRank(
                                                      r.key as PitcherRankKey,
                                                  )
                                        }
                                        className={`px-2.5 py-1 text-[10px] font-bold rounded-md transition-all ${active ? "bg-slate-900 text-white" : "text-slate-400 hover:text-slate-700 hover:bg-slate-100"}`}
                                    >
                                        {r.label}
                                    </button>
                                );
                            })}
                        </div>
                        <div className="overflow-y-auto flex-1">
                            {sortedPlayers.map((p, index) => {
                                const s = calcStats(p) as any;
                                const rankVal =
                                    mode === "hitter"
                                        ? currentHRankInfo.fmt(s[hRank])
                                        : currentPRankInfo.fmt(s[pRank]);
                                return (
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
                                                {rankVal}
                                            </p>
                                        </div>
                                        <div
                                            className={`w-1.5 h-1.5 rounded-full ${TEAM_INFO[p.teamId]?.dot || "bg-slate-300"}`}
                                        />
                                    </div>
                                );
                            })}
                        </div>
                    </div>

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
                                    {mode === "hitter" ? (
                                        <section>
                                            <p className={`${labelCls} mb-4`}>
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
                                        <section>
                                            <p className={`${labelCls} mb-4`}>
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
                                                    label="이닝"
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
