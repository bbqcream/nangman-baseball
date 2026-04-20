import React, { useEffect, useState, useMemo } from "react";
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
    key: keyof Player["batting"] | "sf";
    label: string;
    sub: string;
}[] = [
    { key: "atBats", label: "타수", sub: "AB" },
    { key: "hits", label: "안타", sub: "H" },
    { key: "doubles", label: "2루타", sub: "2B" },
    { key: "triples", label: "3루타", sub: "3B" },
    { key: "homeRuns", label: "홈런", sub: "HR" },
    { key: "rbi", label: "타점", sub: "RBI" },
    { key: "runs", label: "득점", sub: "R" },
    { key: "walks", label: "볼넷", sub: "BB" },
    { key: "hbp", label: "사구", sub: "HBP" },
    { key: "k", label: "삼진", sub: "K" },
    { key: "sf" as any, label: "희플", sub: "SF" },
];

const PITCHING_FIELDS: {
    key: keyof Player["pitching"] | "hitsAllowed" | "walks" | "hbp";
    label: string;
    sub: string;
    step?: string;
}[] = [
    { key: "inningsPitched", label: "이닝", sub: "IP", step: "0.1" },
    { key: "wins", label: "승", sub: "W" },
    { key: "losses", label: "패", sub: "L" },
    { key: "earnedRuns", label: "자책점", sub: "ER" },
    { key: "strikeouts", label: "탈삼진", sub: "K" },
    { key: "hitsAllowed" as any, label: "피안타", sub: "H" },
    { key: "walks" as any, label: "볼넷", sub: "BB" },
    { key: "hbp" as any, label: "사구", sub: "HBP" },
];

// 야구 이닝(ex: 2.1)을 실제 계산용 수치(ex: 2.333)로 변환
const convertToRealInnings = (ip: number): number => {
    const innings = Math.floor(ip);
    const outs = Math.round((ip - innings) * 10);
    return innings + outs / 3;
};

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

        const bItems: Record<string, string> = {};
        Object.entries(player.batting).forEach(
            ([k, v]) => (bItems[k] = String(v ?? 0)),
        );
        setBattingStr(bItems);

        const pItems: Record<string, string> = {};
        Object.entries(player.pitching).forEach(
            ([k, v]) => (pItems[k] = String(v ?? 0)),
        );
        setPitchingStr(pItems);
        setSaved(false);
    };

    const handleSave = async () => {
        if (!selectedId || !batting || !pitching) return;
        setSaving(true);
        try {
            await updateDoc(doc(db, "players", selectedId), {
                batting,
                pitching,
            });
            setSaved(true);
            setTimeout(() => setSaved(false), 2000);
            fetchPlayers();
        } catch (e) {
            console.error(e);
            alert("저장 실패");
        } finally {
            setSaving(false);
        }
    };

    // 실시간 계산 로직
    const currentAvg = useMemo(() => {
        if (!batting || batting.atBats <= 0) return "0.000";
        return (batting.hits / batting.atBats).toFixed(3);
    }, [batting]);

    const currentEra = useMemo(() => {
        if (!pitching || pitching.inningsPitched <= 0) return "0.00";
        const realInnings = convertToRealInnings(pitching.inningsPitched);
        return ((pitching.earnedRuns * 9) / realInnings).toFixed(2);
    }, [pitching]);

    const handlePitchingChange = (key: string, val: string) => {
        let numVal = parseFloat(val) || 0;
        let displayVal = val;

        // 이닝 입력 시 아웃카운트(소수점) 보정 로직
        if (key === "inningsPitched") {
            const innings = Math.floor(numVal);
            const outs = Math.round((numVal - innings) * 10);

            // .3 아웃 이상 입력 시 1이닝으로 올림
            if (outs >= 3) {
                numVal = innings + 1;
                displayVal = String(numVal);
            }
        }

        setPitchingStr((prev) => ({ ...prev, [key]: displayVal }));
        setPitching((prev) => ({
            ...prev!,
            [key]: numVal,
        }));
    };

    const labelCls =
        "text-[11px] font-medium uppercase tracking-[0.08em] text-slate-400 dark:text-slate-500";
    const inputCls =
        "w-full bg-transparent border-none outline-none text-[20px] font-medium text-slate-900 dark:text-slate-100 tabular-nums [appearance:textfield]";

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

                <div className="flex border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-slate-900 min-h-150">
                    {/* 사이드바 */}
                    <div className="w-56 shrink-0 border-r border-slate-200 dark:border-slate-800 flex flex-col">
                        <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                            <span className={labelCls}>선수</span>
                            <span className="text-[11px] text-slate-400">
                                {players.length}명
                            </span>
                        </div>
                        <div className="overflow-y-auto flex-1">
                            {players.map((p) => (
                                <div
                                    key={p.id}
                                    onClick={() => handleSelect(p)}
                                    className={`flex items-center gap-3 px-4 py-3 cursor-pointer border-b border-slate-100 dark:border-slate-800/60 last:border-0 transition-colors ${
                                        selectedId === p.id
                                            ? "bg-slate-50 dark:bg-slate-800/50"
                                            : "hover:bg-slate-50/70 dark:hover:bg-slate-800/30"
                                    }`}
                                >
                                    <div
                                        className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-medium shrink-0 ${p.teamId === "coupang" ? "bg-amber-50 text-amber-800" : "bg-blue-50 text-blue-800"}`}
                                    >
                                        {p.name[0]}
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-[13px] font-medium text-slate-800 dark:text-slate-200 truncate flex items-center gap-1.5">
                                            {p.name}
                                            {p.isManager && (
                                                <span className="w-1.5 h-1.5 rounded-full bg-teal-500 shrink-0" />
                                            )}
                                        </p>
                                        <p className="text-[11px] text-slate-400 truncate">
                                            {teamLabel(p.teamId)}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* 메인 에디터 */}
                    <div className="flex-1 flex flex-col min-w-0">
                        {selectedId && batting && pitching ? (
                            <>
                                <div className="px-6 py-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div
                                            className={`w-8 h-8 rounded-full flex items-center justify-center text-[12px] font-medium shrink-0 ${players.find((p) => p.id === selectedId)?.teamId === "coupang" ? "bg-amber-50 text-amber-800" : "bg-blue-50 text-blue-800"}`}
                                        >
                                            {
                                                players.find(
                                                    (p) => p.id === selectedId,
                                                )?.name[0]
                                            }
                                        </div>
                                        <div>
                                            <p className="text-[14px] font-medium text-slate-900 dark:text-slate-100">
                                                {
                                                    players.find(
                                                        (p) =>
                                                            p.id === selectedId,
                                                    )?.name
                                                }
                                            </p>
                                            <p className="text-[11px] text-slate-400">
                                                실시간 AVG {currentAvg} / ERA{" "}
                                                {currentEra}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="p-6 overflow-y-auto flex-1">
                                    <p className={`${labelCls} mb-3`}>
                                        타격 기록
                                    </p>
                                    <div className="grid grid-cols-5 gap-2 mb-8">
                                        {BATTING_FIELDS.map(
                                            ({ key, label, sub }) => (
                                                <div
                                                    key={key}
                                                    className="bg-slate-50 dark:bg-slate-800/60 rounded-lg p-3 border border-transparent focus-within:border-slate-200 transition-all"
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
                                                            battingStr[
                                                                key as string
                                                            ] ?? ""
                                                        }
                                                        onChange={(e) => {
                                                            const val =
                                                                e.target.value;
                                                            setBattingStr(
                                                                (prev) => ({
                                                                    ...prev,
                                                                    [key as string]:
                                                                        val,
                                                                }),
                                                            );
                                                            setBatting(
                                                                (prev) => ({
                                                                    ...prev!,
                                                                    [key]:
                                                                        parseFloat(
                                                                            val,
                                                                        ) || 0,
                                                                }),
                                                            );
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

                                    <hr className="border-slate-100 dark:border-slate-800 mb-8" />

                                    <p className={`${labelCls} mb-3`}>
                                        투구 기록
                                    </p>
                                    <div className="grid grid-cols-5 gap-2 mb-8">
                                        {PITCHING_FIELDS.map(
                                            ({ key, label, sub, step }) => (
                                                <div
                                                    key={key}
                                                    className="bg-slate-50 dark:bg-slate-800/60 rounded-lg p-3 border border-transparent focus-within:border-slate-200 transition-all"
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
                                                            pitchingStr[
                                                                key as string
                                                            ] ?? ""
                                                        }
                                                        onChange={(e) =>
                                                            handlePitchingChange(
                                                                key as string,
                                                                e.target.value,
                                                            )
                                                        }
                                                        onFocus={(e) =>
                                                            e.target.select()
                                                        }
                                                    />
                                                    <p className="text-[10px] text-slate-400 mt-1">
                                                        {key ===
                                                        "inningsPitched"
                                                            ? "Ex) 2.1, 2.2"
                                                            : sub}
                                                    </p>
                                                </div>
                                            ),
                                        )}
                                    </div>

                                    <div className="flex items-center gap-2 mt-2">
                                        <div className="flex items-center gap-1">
                                            <span className={labelCls}>
                                                타석
                                            </span>
                                            {(["좌", "우", "양"] as const).map(
                                                (v) => (
                                                    <button
                                                        key={v}
                                                        onClick={() =>
                                                            updateDoc(
                                                                doc(
                                                                    db,
                                                                    "players",
                                                                    selectedId!,
                                                                ),
                                                                { batSide: v },
                                                            ).then(fetchPlayers)
                                                        }
                                                        className={`px-2 py-0.5 rounded text-[11px] font-bold transition-colors ${players.find((p) => p.id === selectedId)?.batSide === v ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-500 hover:bg-slate-200"}`}
                                                    >
                                                        {v}
                                                    </button>
                                                ),
                                            )}
                                        </div>
                                        <div className="w-px h-4 bg-slate-200" />
                                        <div className="flex items-center gap-1">
                                            <span className={labelCls}>
                                                투구
                                            </span>
                                            {(["좌", "우"] as const).map(
                                                (v) => (
                                                    <button
                                                        key={v}
                                                        onClick={() =>
                                                            updateDoc(
                                                                doc(
                                                                    db,
                                                                    "players",
                                                                    selectedId!,
                                                                ),
                                                                {
                                                                    throwSide:
                                                                        v,
                                                                },
                                                            ).then(fetchPlayers)
                                                        }
                                                        className={`px-2 py-0.5 rounded text-[11px] font-bold transition-colors ${players.find((p) => p.id === selectedId)?.throwSide === v ? "bg-slate-800 text-white" : "bg-slate-100 text-slate-500 hover:bg-slate-200"}`}
                                                    >
                                                        {v}
                                                    </button>
                                                ),
                                            )}
                                        </div>
                                    </div>

                                    <div className="sticky bottom-0 bg-white dark:bg-slate-900 py-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                                        <span
                                            className={`text-[12px] font-medium text-teal-500 transition-opacity ${saved ? "opacity-100" : "opacity-0"}`}
                                        >
                                            ✓ 기록이 성공적으로 저장되었습니다
                                        </span>
                                        <button
                                            onClick={handleSave}
                                            disabled={saving}
                                            className="px-8 py-2.5 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-[13px] font-bold rounded-xl hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-30"
                                        >
                                            {saving
                                                ? "저장 중..."
                                                : "변경사항 저장하기"}
                                        </button>
                                    </div>
                                </div>
                            </>
                        ) : (
                            <div className="flex-1 flex flex-col items-center justify-center text-slate-300">
                                <span className="text-4xl mb-3">✏️</span>
                                <p className="text-[13px] font-medium italic">
                                    좌측 목록에서 수정할 선수를 선택하세요
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default RecordEdit;
