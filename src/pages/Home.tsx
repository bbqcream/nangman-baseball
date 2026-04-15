import React, { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase/firebase";
import type { Player } from "../types/record-interface";

type Filter = "all" | "coupang" | "yongkids" | "mercenary";

const TEAM_CONFIG: Record<
    string,
    { label: string; color: string; bar: string; bg: string; text: string }
> = {
    coupang: {
        label: "쿠팡 일용직스",
        color: "bg-amber-500",
        bar: "bg-amber-500",
        bg: "bg-amber-50",
        text: "text-amber-800",
    },
    yongkids: {
        label: "Daegu Yongkids",
        color: "bg-blue-500",
        bar: "bg-blue-500",
        bg: "bg-blue-50",
        text: "text-blue-800",
    },
    mercenary: {
        label: "용병 (Mercenary)",
        color: "bg-slate-500",
        bar: "bg-slate-500",
        bg: "bg-slate-100",
        text: "text-slate-600",
    },
};

const getAvg = (p: Player) =>
    (p.batting.hits / (p.batting.atBats || 1)).toFixed(3);

const getEra = (p: Player) =>
    ((p.pitching.earnedRuns * 9) / (p.pitching.inningsPitched || 1)).toFixed(2);

const BatThrowBadge = ({ player }: { player: Player }) => {
    const bat = (player as any).batSide;
    const thr = (player as any).throwSide;
    if (!bat && !thr) return null;
    return (
        <span className="ml-1.5 text-[10px] font-bold text-slate-400">
            {bat ? `${bat}타` : ""}
            {bat && thr ? "/" : ""}
            {thr ? `${thr}투` : ""}
        </span>
    );
};

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
        filter === "all"
            ? [...players].sort((a, b) => {
                  const priority: Record<string, number> = {
                      coupang: 1,
                      yongkids: 2,
                      mercenary: 3,
                  };
                  return (
                      (priority[a.teamId] || 99) - (priority[b.teamId] || 99)
                  );
              })
            : players.filter((p) => p.teamId === filter);

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

                <div className="flex flex-col md:flex-row border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-slate-900">
                    <div className="flex-1 min-w-0 border-b md:border-b-0 md:border-r border-slate-200 dark:border-slate-800">
                        <div className="flex flex-wrap items-center justify-between px-5 py-3 border-b border-slate-200 dark:border-slate-800 gap-3">
                            <span className="text-[13px] font-medium text-slate-900 dark:text-slate-100">
                                선수 목록
                            </span>
                            <div className="flex gap-1.5">
                                {(
                                    [
                                        "all",
                                        "coupang",
                                        "yongkids",
                                        "mercenary",
                                    ] as Filter[]
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
                                        {f === "all"
                                            ? "전체"
                                            : f === "coupang"
                                              ? "쿠팡"
                                              : f === "yongkids"
                                                ? "Yongkids"
                                                : "용병"}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full border-collapse min-w-125">
                                <thead>
                                    <tr className="border-b border-slate-100 dark:border-slate-800">
                                        {[
                                            "선수",
                                            "팀",
                                            "투타",
                                            "AVG",
                                            "ERA",
                                            "타율 분포",
                                        ].map((h, i) => (
                                            <th
                                                key={h}
                                                className={`text-[11px] font-medium uppercase text-slate-400 px-5 py-2.5 ${i >= 3 ? "text-right" : "text-left"}`}
                                            >
                                                {h}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {filtered.map((player) => {
                                        const config =
                                            TEAM_CONFIG[player.teamId] ||
                                            TEAM_CONFIG.mercenary;
                                        const a =
                                            player.batting.hits /
                                            (player.batting.atBats || 1);
                                        const pct = Math.round(
                                            (a / (maxAvg || 1)) * 100,
                                        );
                                        const isSelected =
                                            selected === player.id;
                                        const bat = (player as any).batSide;
                                        const thr = (player as any).throwSide;

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
                                                            className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold ${config.bg} ${config.text}`}
                                                        >
                                                            {player.name[0]}
                                                        </div>
                                                        <span className="text-[13px] font-medium">
                                                            {player.name}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-5 py-3 text-[10px] text-slate-500">
                                                    {config.label.split(" ")[0]}
                                                </td>
                                                <td className="px-5 py-3">
                                                    {bat || thr ? (
                                                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-500">
                                                            {bat ?? "-"}타/
                                                            {thr ?? "-"}투
                                                        </span>
                                                    ) : (
                                                        <span className="text-[10px] text-slate-300">
                                                            —
                                                        </span>
                                                    )}
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
                                                                className={`h-full ${config.bar}`}
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
    const config = TEAM_CONFIG[player.teamId] || TEAM_CONFIG.mercenary;
    const bat = (player as any).batSide;
    const thr = (player as any).throwSide;
    return (
        <div className="p-5">
            <p className="font-bold text-lg mb-1">{player.name}</p>
            <div className="flex items-center gap-2 mb-4 flex-wrap">
                <span
                    className={`text-xs font-bold px-2 py-1 rounded inline-block ${config.bg} ${config.text}`}
                >
                    {config.label}
                </span>
                {(bat || thr) && (
                    <span className="text-xs font-bold px-2 py-1 rounded bg-slate-100 text-slate-600">
                        {bat ?? "-"}타 / {thr ?? "-"}투
                    </span>
                )}
            </div>
            <div className="grid grid-cols-2 gap-2">
                <div className="bg-white p-3 rounded shadow-sm border border-slate-100">
                    <p className="text-[10px] text-slate-400 uppercase">AVG</p>
                    <p className="font-bold">{getAvg(player)}</p>
                </div>
                <div className="bg-white p-3 rounded shadow-sm border border-slate-100">
                    <p className="text-[10px] text-slate-400 uppercase">ERA</p>
                    <p className="font-bold">{getEra(player)}</p>
                </div>
            </div>
        </div>
    );
};

export default Home;
