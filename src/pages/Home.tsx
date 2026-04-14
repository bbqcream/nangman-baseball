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
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 md:p-6">
            <div className="max-w-6xl mx-auto">
                <div className="mb-5">
                    <p className="text-[11px] font-medium tracking-[0.12em] uppercase text-slate-400 mb-1">
                        Nangman Baseball League
                    </p>
                    <h1 className="text-2xl font-medium text-slate-900 dark:text-slate-100 tracking-tight">
                        2026 시즌 로스터
                    </h1>
                </div>

                {/* 반응형 컨테이너: 모바일(세로) -> 데스크탑(가로) */}
                <div className="flex flex-col md:flex-row border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-slate-900">
                    {/* 테이블 영역 */}
                    <div className="flex-1 min-w-0 border-b md:border-b-0 md:border-r border-slate-200 dark:border-slate-800">
                        <div className="flex flex-wrap items-center justify-between px-5 py-3 border-b border-slate-200 dark:border-slate-800 gap-3">
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

                        {/* 모바일 가로 스크롤 대응 */}
                        <div className="overflow-x-auto">
                            <table className="w-full border-collapse min-w-125">
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
                                                className={`text-[11px] font-medium uppercase text-slate-400 px-5 py-2.5 ${i >= 2 ? "text-right" : "text-left"}`}
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
                                        const pct = Math.round(
                                            (a / (maxAvg || 1)) * 100,
                                        );
                                        const isSelected =
                                            selected === player.id;

                                        return (
                                            <tr
                                                key={player.id}
                                                onClick={() =>
                                                    setSelected(player.id)
                                                }
                                                className={`border-b border-slate-100 cursor-pointer transition-colors ${isSelected ? "bg-slate-50 dark:bg-slate-800/50" : "hover:bg-slate-50/70"}`}
                                            >
                                                <td className="px-5 py-3">
                                                    <div className="flex items-center gap-2.5">
                                                        <div
                                                            className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-medium ${isCoupang ? "bg-amber-50 text-amber-800" : "bg-blue-50 text-blue-800"}`}
                                                        >
                                                            {player.name[0]}
                                                        </div>
                                                        <span className="text-[13px] font-medium">
                                                            {player.name}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-5 py-3 text-[10px]">
                                                    {isCoupang
                                                        ? "쿠팡"
                                                        : "Yongkids"}
                                                </td>
                                                <td className="px-5 py-3 text-right text-[13px] tabular-nums">
                                                    {getAvg(player)}
                                                </td>
                                                <td className="px-5 py-3 text-right text-[13px] tabular-nums">
                                                    {getEra(player)}
                                                </td>
                                                <td className="px-5 py-3">
                                                    <div className="flex items-center gap-2">
                                                        <div className="flex-1 h-1 bg-slate-100 rounded-full overflow-hidden">
                                                            <div
                                                                className={`h-full ${isCoupang ? "bg-amber-500" : "bg-blue-500"}`}
                                                                style={{
                                                                    width: `${pct}%`,
                                                                }}
                                                            />
                                                        </div>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* 우측 디테일 패널 */}
                    <div className="w-full md:w-72 shrink-0 border-t md:border-t-0 border-slate-200 dark:border-slate-800 bg-slate-50/30">
                        {selectedPlayer ? (
                            <DetailPanel player={selectedPlayer} />
                        ) : (
                            <div className="h-48 md:h-full flex items-center justify-center text-[13px] text-slate-400">
                                선수를 선택하세요
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

const DetailPanel: React.FC<{ player: Player }> = ({ player }) => {
    // ... DetailPanel 로직은 동일하게 유지하되, 필요시 패딩 조정 ...
    return (
        <div className="p-5">
            {/* ... 내부 상세 내용 ... */}
            <p className="font-bold text-lg mb-2">{player.name}</p>
            <p className="text-sm text-slate-500 mb-4">
                {teamLabel(player.teamId)}
            </p>
            <div className="grid grid-cols-2 gap-2">
                <div className="bg-white p-3 rounded shadow-sm border border-slate-100">
                    <p className="text-[10px] text-slate-400">AVG</p>
                    <p className="font-bold">{getAvg(player)}</p>
                </div>
                <div className="bg-white p-3 rounded shadow-sm border border-slate-100">
                    <p className="text-[10px] text-slate-400">ERA</p>
                    <p className="font-bold">{getEra(player)}</p>
                </div>
            </div>
        </div>
    );
};

export default Home;
