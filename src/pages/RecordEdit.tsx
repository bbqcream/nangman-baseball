import React, { useEffect, useState } from "react";
import {
    collection,
    getDocs,
    doc,
    updateDoc,
    query,
    orderBy,
} from "firebase/firestore";
import { db } from "../firebase/firebase";
import type { Player } from "../types/record-interface";

const teamLabel = (teamId: string) =>
    teamId === "coupang" ? "쿠팡 일용직스" : "Daegu Yongkids";

const BATTING_FIELDS: {
    key: keyof Player["batting"];
    label: string;
    sub: string;
}[] = [
    { key: "atBats", label: "타수", sub: "AB" },
    { key: "hits", label: "안타", sub: "H" },
    { key: "doubles", label: "2루타", sub: "2B" },
    { key: "triples", label: "3루타", sub: "3B" },
    { key: "homeRuns", label: "홈런", sub: "HR" },
    { key: "walks", label: "볼넷", sub: "BB" },
    { key: "hbp", label: "사구", sub: "HBP" },
    { key: "rbi", label: "타점", sub: "RBI" },
    { key: "runs", label: "득점", sub: "R" },
    { key: "k", label: "삼진", sub: "K" },
];

const PITCHING_FIELDS: {
    key: keyof Player["pitching"];
    label: string;
    sub: string;
    step?: string;
}[] = [
    { key: "inningsPitched", label: "이닝", sub: "IP", step: "0.1" },
    { key: "earnedRuns", label: "자책점", sub: "ER" },
    { key: "strikeouts", label: "탈삼진", sub: "K" },
    { key: "wins", label: "승", sub: "W" },
    { key: "losses", label: "패", sub: "L" },
];

const RecordEdit: React.FC = () => {
    const [players, setPlayers] = useState<Player[]>([]);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [batting, setBatting] = useState<Player["batting"] | null>(null);
    const [pitching, setPitching] = useState<Player["pitching"] | null>(null);
    const [battingStr, setBattingStr] = useState<Record<string, string>>({});
    const [pitchingStr, setPitchingStr] = useState<Record<string, string>>({});
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);

    useEffect(() => {
        fetchPlayers();
    }, []);

    const fetchPlayers = async () => {
        const q = query(collection(db, "players"), orderBy("name", "asc"));
        const snap = await getDocs(q);
        setPlayers(
            snap.docs.map((d) => ({ id: d.id, ...d.data() })) as Player[],
        );
    };

    const handleSelect = (player: Player) => {
        setSelectedId(player.id);
        setBatting({ ...player.batting });
        setPitching({ ...player.pitching });
        setBattingStr(
            Object.fromEntries(
                Object.entries(player.batting).map(([k, v]) => [k, String(v)]),
            ),
        );
        setPitchingStr(
            Object.fromEntries(
                Object.entries(player.pitching).map(([k, v]) => [k, String(v)]),
            ),
        );
        setSaved(false);
    };

    const handleSave = async () => {
        if (!selectedId || !batting || !pitching) return;
        setSaving(true);
        await updateDoc(doc(db, "players", selectedId), { batting, pitching });
        setSaving(false);
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
        fetchPlayers();
    };

    const selected = players.find((p) => p.id === selectedId) ?? null;
    const avg = selected
        ? (selected.batting.hits / (selected.batting.atBats || 1)).toFixed(3)
        : null;
    const era = selected
        ? (
              (selected.pitching.earnedRuns * 9) /
              (selected.pitching.inningsPitched || 1)
          ).toFixed(2)
        : null;

    const labelCls =
        "text-[11px] font-medium uppercase tracking-[0.08em] text-slate-400 dark:text-slate-500";
    const inputCls =
        "w-full bg-transparent border-none outline-none text-[20px] font-medium text-slate-900 dark:text-slate-100 tabular-nums [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none";

    return (
        <div className="min-h-screen bg-[#f9f9f8] dark:bg-slate-950 p-6">
            <div className="max-w-6xl mx-auto">
                <div className="mb-6">
                    <p className="text-[11px] font-medium tracking-[0.12em] uppercase text-slate-400 mb-1">
                        Nangman Baseball League
                    </p>
                    <h1 className="text-2xl font-medium text-slate-900 dark:text-slate-100 tracking-tight">
                        기록 수정
                    </h1>
                </div>

                <div className="flex border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-slate-900 min-h-[600px]">
                    {/* 사이드바 */}
                    <div className="w-56 flex-shrink-0 border-r border-slate-200 dark:border-slate-800 flex flex-col">
                        <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                            <span className={labelCls}>선수</span>
                            <span className="text-[11px] text-slate-400">
                                {players.length}명
                            </span>
                        </div>
                        <div className="overflow-y-auto flex-1">
                            {players.map((p) => {
                                const isCoupang = p.teamId === "coupang";
                                return (
                                    <div
                                        key={p.id}
                                        onClick={() => handleSelect(p)}
                                        className={[
                                            "flex items-center gap-3 px-4 py-3 cursor-pointer border-b border-slate-100 dark:border-slate-800/60 last:border-0 transition-colors",
                                            selectedId === p.id
                                                ? "bg-slate-50 dark:bg-slate-800/50"
                                                : "hover:bg-slate-50/70 dark:hover:bg-slate-800/30",
                                        ].join(" ")}
                                    >
                                        <div
                                            className={[
                                                "w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-medium flex-shrink-0",
                                                isCoupang
                                                    ? "bg-amber-50 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                                                    : "bg-blue-50 text-blue-800 dark:bg-blue-950 dark:text-blue-300",
                                            ].join(" ")}
                                        >
                                            {p.name[0]}
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-[13px] font-medium text-slate-800 dark:text-slate-200 truncate flex items-center gap-1.5">
                                                {p.name}
                                                {p.isManager && (
                                                    <span className="w-1.5 h-1.5 rounded-full bg-teal-500 flex-shrink-0" />
                                                )}
                                            </p>
                                            <p className="text-[11px] text-slate-400 truncate">
                                                {isCoupang
                                                    ? "쿠팡"
                                                    : "Yongkids"}
                                            </p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* 메인 */}
                    <div className="flex-1 flex flex-col min-w-0">
                        <div className="px-6 py-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center gap-3">
                            {selected ? (
                                <>
                                    <div
                                        className={[
                                            "w-8 h-8 rounded-full flex items-center justify-center text-[12px] font-medium flex-shrink-0",
                                            selected.teamId === "coupang"
                                                ? "bg-amber-50 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                                                : "bg-blue-50 text-blue-800 dark:bg-blue-950 dark:text-blue-300",
                                        ].join(" ")}
                                    >
                                        {selected.name[0]}
                                    </div>
                                    <div>
                                        <p className="text-[14px] font-medium text-slate-900 dark:text-slate-100">
                                            {selected.name}
                                        </p>
                                        <p className="text-[11px] text-slate-400">
                                            {teamLabel(selected.teamId)} · AVG{" "}
                                            {avg} / ERA {era}
                                        </p>
                                    </div>
                                </>
                            ) : (
                                <span className="text-[13px] text-slate-400">
                                    선수를 선택하세요
                                </span>
                            )}
                        </div>

                        {batting && pitching ? (
                            <div className="p-6 overflow-y-auto flex-1">
                                <p className={`${labelCls} mb-3`}>타격 기록</p>
                                <div className="grid grid-cols-5 gap-2 mb-6">
                                    {BATTING_FIELDS.map(
                                        ({ key, label, sub }) => (
                                            <div
                                                key={key}
                                                className="bg-slate-50 dark:bg-slate-800/60 rounded-lg p-3"
                                            >
                                                <p
                                                    className={`${labelCls} mb-1.5`}
                                                >
                                                    {label}
                                                </p>
                                                <input
                                                    type="number"
                                                    min={0}
                                                    className={inputCls}
                                                    value={
                                                        battingStr[key] ?? ""
                                                    }
                                                    onChange={(e) => {
                                                        setBattingStr(
                                                            (prev) => ({
                                                                ...prev,
                                                                [key]: e.target
                                                                    .value,
                                                            }),
                                                        );
                                                        setBatting((prev) => ({
                                                            ...prev!,
                                                            [key]:
                                                                parseFloat(
                                                                    e.target
                                                                        .value,
                                                                ) || 0,
                                                        }));
                                                    }}
                                                    onFocus={(e) =>
                                                        e.target.select()
                                                    }
                                                />
                                                <p className="text-[10px] text-slate-400 mt-1">
                                                    {sub}
                                                </p>
                                            </div>
                                        ),
                                    )}
                                </div>

                                <hr className="border-slate-100 dark:border-slate-800 mb-6" />

                                <p className={`${labelCls} mb-3`}>투구 기록</p>
                                <div className="grid grid-cols-5 gap-2 mb-6">
                                    {PITCHING_FIELDS.map(
                                        ({ key, label, sub, step }) => (
                                            <div
                                                key={key}
                                                className="bg-slate-50 dark:bg-slate-800/60 rounded-lg p-3"
                                            >
                                                <p
                                                    className={`${labelCls} mb-1.5`}
                                                >
                                                    {label}
                                                </p>
                                                <input
                                                    type="number"
                                                    min={0}
                                                    step={step ?? "1"}
                                                    className={inputCls}
                                                    value={
                                                        pitchingStr[key] ?? ""
                                                    }
                                                    onChange={(e) => {
                                                        setPitchingStr(
                                                            (prev) => ({
                                                                ...prev,
                                                                [key]: e.target
                                                                    .value,
                                                            }),
                                                        );
                                                        setPitching((prev) => ({
                                                            ...prev!,
                                                            [key]:
                                                                parseFloat(
                                                                    e.target
                                                                        .value,
                                                                ) || 0,
                                                        }));
                                                    }}
                                                    onFocus={(e) =>
                                                        e.target.select()
                                                    }
                                                />
                                                <p className="text-[10px] text-slate-400 mt-1">
                                                    {sub}
                                                </p>
                                            </div>
                                        ),
                                    )}
                                </div>

                                <hr className="border-slate-100 dark:border-slate-800 mb-4" />

                                <div className="flex items-center justify-between">
                                    <span
                                        className={`text-[12px] font-medium text-teal-500 transition-opacity duration-300 ${saved ? "opacity-100" : "opacity-0"}`}
                                    >
                                        저장 완료
                                    </span>
                                    <button
                                        onClick={handleSave}
                                        disabled={saving}
                                        className="px-5 py-2 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-[13px] font-medium rounded-lg hover:opacity-80 transition-opacity disabled:opacity-30"
                                    >
                                        {saving ? "저장 중..." : "기록 저장"}
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="flex-1 flex items-center justify-center text-[13px] text-slate-400">
                                ← 좌측에서 선수를 선택하세요
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default RecordEdit;
