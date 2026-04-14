import React, { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase/firebase";
import type { Player } from "../types/record-interface";

type Filter = "all" | "coupang" | "yongkids";

const teamLabel = (teamId: string) =>
    teamId === "coupang" ? "쿠팡 일용직스" : "Daegu Yongkids";

const getAvg = (p: Player) =>
    (p.batting.hits / (p.batting.atBats || 1)).toFixed(3);

const getEra = (p: Player) =>
    ((p.pitching.earnedRuns * 9) / (p.pitching.inningsPitched || 1)).toFixed(2);

const Home: React.FC = () => {
    const [players, setPlayers] = useState<Player[]>([]);
    const [selected, setSelected] = useState<string | null>(null);
    const [filter, setFilter] = useState<Filter>("all");

    useEffect(() => {
        getDocs(collection(db, "players")).then((snap) => {
            setPlayers(
                snap.docs.map((doc) => ({
                    id: doc.id,
                    ...doc.data(),
                })) as Player[],
            );
        });
    }, []);

    const filtered =
        filter === "all" ? players : players.filter((p) => p.teamId === filter);

    const maxAvg = Math.max(
        ...players.map((p) => p.batting.hits / (p.batting.atBats || 1)),
    );

    const selectedPlayer = players.find((p) => p.id === selected) ?? null;

    return (
        <div className="min-h-screen bg-(--color-background-tertiary,#f9f9f8) p-6">
            <div className="max-w-6xl mx-auto">
                {/* 페이지 타이틀 */}
                <div className="mb-5">
                    <p className="text-[11px] font-medium tracking-[0.12em] uppercase text-slate-400 mb-1">
                        Nangman Baseball League
                    </p>
                    <h1 className="text-2xl font-medium text-slate-900 dark:text-slate-100 tracking-tight">
                        2026 시즌 로스터
                    </h1>
                </div>

                {/* 메인 패널 */}
                <div className="flex border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-slate-900">
                    {/* 좌측: 테이블 */}
                    <div className="flex-1 min-w-0 border-r border-slate-200 dark:border-slate-800">
                        {/* 상단 바 */}
                        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200 dark:border-slate-800">
                            <span className="text-[13px] font-medium text-slate-900 dark:text-slate-100">
                                선수 목록
                            </span>
                            <div className="flex gap-1.5">
                                {(
                                    ["all", "coupang", "yongkids"] as Filter[]
                                ).map((f) => (
                                    <button
                                        key={f}
                                        onClick={() => {
                                            setFilter(f);
                                            setSelected(null);
                                        }}
                                        className={[
                                            "text-[11px] px-3 py-1 rounded-full border transition-colors",
                                            filter === f
                                                ? "bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-slate-100"
                                                : "border-slate-200 dark:border-slate-800 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800/50",
                                        ].join(" ")}
                                    >
                                        {
                                            {
                                                all: "전체",
                                                coupang: "쿠팡",
                                                yongkids: "Yongkids",
                                            }[f]
                                        }
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* 테이블 */}
                        <table className="w-full border-collapse">
                            <thead>
                                <tr className="border-b border-slate-100 dark:border-slate-800">
                                    {[
                                        "선수",
                                        "팀",
                                        "AVG",
                                        "ERA",
                                        "타율 분포",
                                    ].map((h, i) => (
                                        <th
                                            key={h}
                                            className={[
                                                "text-[11px] font-medium uppercase tracking-[0.07em] text-slate-400 px-5 py-2.5",
                                                i >= 2
                                                    ? "text-right"
                                                    : "text-left",
                                            ].join(" ")}
                                        >
                                            {h}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map((player) => {
                                    const isCoupang =
                                        player.teamId === "coupang";
                                    const a =
                                        player.batting.hits /
                                        (player.batting.atBats || 1);
                                    const pct = Math.round((a / maxAvg) * 100);
                                    const isSelected = selected === player.id;

                                    return (
                                        <tr
                                            key={player.id}
                                            onClick={() =>
                                                setSelected(player.id)
                                            }
                                            className={[
                                                "border-b border-slate-100 dark:border-slate-800/60 cursor-pointer transition-colors",
                                                isSelected
                                                    ? "bg-slate-50 dark:bg-slate-800/50"
                                                    : "hover:bg-slate-50/70 dark:hover:bg-slate-800/30",
                                            ].join(" ")}
                                        >
                                            {/* 선수명 */}
                                            <td className="px-5 py-3">
                                                <div className="flex items-center gap-2.5">
                                                    <div
                                                        className={[
                                                            "w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-medium shrink-0",
                                                            isCoupang
                                                                ? "bg-amber-50 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                                                                : "bg-blue-50 text-blue-800 dark:bg-blue-950 dark:text-blue-300",
                                                        ].join(" ")}
                                                    >
                                                        {player.name[0]}
                                                    </div>
                                                    <span className="text-[13px] font-medium text-slate-800 dark:text-slate-200">
                                                        {player.name}
                                                    </span>
                                                    {player.isManager && (
                                                        <span className="w-1.5 h-1.5 rounded-full bg-teal-500 inline-block" />
                                                    )}
                                                </div>
                                            </td>

                                            {/* 팀 */}
                                            <td className="px-5 py-3">
                                                <span
                                                    className={[
                                                        "text-[10px] font-medium px-2 py-1 rounded",
                                                        isCoupang
                                                            ? "bg-amber-50 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                                                            : "bg-blue-50 text-blue-800 dark:bg-blue-950 dark:text-blue-300",
                                                    ].join(" ")}
                                                >
                                                    {isCoupang
                                                        ? "쿠팡"
                                                        : "Yongkids"}
                                                </span>
                                            </td>

                                            {/* AVG */}
                                            <td className="px-5 py-3 text-right text-[13px] tabular-nums text-slate-700 dark:text-slate-300">
                                                {getAvg(player)}
                                            </td>

                                            {/* ERA */}
                                            <td className="px-5 py-3 text-right text-[13px] tabular-nums text-slate-700 dark:text-slate-300">
                                                {getEra(player)}
                                            </td>

                                            {/* 바 차트 */}
                                            <td className="px-5 py-3">
                                                <div className="flex items-center gap-2">
                                                    <div className="flex-1 h-0.75 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                                        <div
                                                            className={`h-full rounded-full ${isCoupang ? "bg-amber-500" : "bg-blue-500"}`}
                                                            style={{
                                                                width: `${pct}%`,
                                                            }}
                                                        />
                                                    </div>
                                                    <span className="text-[11px] text-slate-400 tabular-nums w-10 text-right">
                                                        {getAvg(player)}
                                                    </span>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    {/* 우측: 디테일 패널 */}
                    <div className="w-72 shrink-0">
                        {selectedPlayer ? (
                            <DetailPanel player={selectedPlayer} />
                        ) : (
                            <div className="h-full flex items-center justify-center text-[13px] text-slate-400">
                                ← 선수를 선택하세요
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

const DetailPanel: React.FC<{ player: Player }> = ({ player }) => {
    const isCoupang = player.teamId === "coupang";

    const batting = [
        ["타수", player.batting.atBats],
        ["안타", player.batting.hits],
        ["타점", player.batting.rbi],
        ["홈런", player.batting.homeRuns],
    ];

    const pitching = [
        ["이닝", player.pitching.inningsPitched],
        ["자책점", player.pitching.earnedRuns],
        ["탈삼진", player.pitching.strikeouts],
    ];

    return (
        <div>
            {/* 헤더 */}
            <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-3 mb-1">
                    <div
                        className={[
                            "w-9 h-9 rounded-full flex items-center justify-center text-[13px] font-medium shrink-0",
                            isCoupang
                                ? "bg-amber-50 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                                : "bg-blue-50 text-blue-800 dark:bg-blue-950 dark:text-blue-300",
                        ].join(" ")}
                    >
                        {player.name[0]}
                    </div>
                    <div>
                        <p className="text-[15px] font-medium text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                            {player.name}
                            {player.isManager && (
                                <span className="text-[11px] font-normal text-teal-500">
                                    매니저
                                </span>
                            )}
                        </p>
                        <p className="text-[12px] text-slate-500 dark:text-slate-400">
                            {teamLabel(player.teamId)}
                        </p>
                    </div>
                </div>
            </div>

            <div className="p-5">
                {/* KPI 4개 */}
                <div className="grid grid-cols-2 gap-2 mb-5">
                    {[
                        { label: "Batting AVG", val: getAvg(player) },
                        { label: "ERA", val: getEra(player) },
                        { label: "홈런", val: player.batting.homeRuns },
                        { label: "탈삼진", val: player.pitching.strikeouts },
                    ].map(({ label, val }) => (
                        <div
                            key={label}
                            className="bg-slate-50 dark:bg-slate-800/60 rounded-lg p-3"
                        >
                            <p className="text-[10px] font-medium uppercase tracking-[0.08em] text-slate-400 mb-1">
                                {label}
                            </p>
                            <p className="text-[20px] font-medium text-slate-900 dark:text-slate-100 leading-none tabular-nums">
                                {val}
                            </p>
                        </div>
                    ))}
                </div>

                {/* 타격 상세 */}
                <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-slate-400 mb-2">
                    타격
                </p>
                <div className="mb-4">
                    {batting.map(([k, v]) => (
                        <div
                            key={k}
                            className="flex justify-between items-center py-1.5 border-b border-slate-100 dark:border-slate-800 last:border-0"
                        >
                            <span className="text-[12px] text-slate-500 dark:text-slate-400">
                                {k}
                            </span>
                            <span className="text-[12px] font-medium text-slate-800 dark:text-slate-200">
                                {v}
                            </span>
                        </div>
                    ))}
                </div>

                {/* 투구 상세 */}
                <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-slate-400 mb-2">
                    투구
                </p>
                <div>
                    {pitching.map(([k, v]) => (
                        <div
                            key={k}
                            className="flex justify-between items-center py-1.5 border-b border-slate-100 dark:border-slate-800 last:border-0"
                        >
                            <span className="text-[12px] text-slate-500 dark:text-slate-400">
                                {k}
                            </span>
                            <span className="text-[12px] font-medium text-slate-800 dark:text-slate-200">
                                {v}
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default Home;
