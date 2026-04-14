import React, { useState, useEffect } from "react";
import {
    collection,
    getDocs,
    doc,
    updateDoc,
    addDoc,
    query,
    orderBy,
} from "firebase/firestore";
import { db } from "../firebase/firebase";
import type { Player } from "../types/record-interface";

type Tab = "add" | "edit";

const teamLabel = (teamId: string) =>
    teamId === "coupang" ? "쿠팡 일용직스" : "Daegu Yongkids";

const Edit: React.FC = () => {
    const [players, setPlayers] = useState<Player[]>([]);
    const [selectedId, setSelectedId] = useState<string>("");
    const [tab, setTab] = useState<Tab>("add");

    const [newName, setNewName] = useState("");
    const [newTeamId, setNewTeamId] = useState("coupang");
    const [newIsManager, setNewIsManager] = useState(false);
    const [addLoading, setAddLoading] = useState(false);

    const [editTeamId, setEditTeamId] = useState("");
    const [editIsManager, setEditIsManager] = useState(false);
    const [editLoading, setEditLoading] = useState(false);

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

    const handleAddPlayer = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newName.trim()) return;
        setAddLoading(true);
        await addDoc(collection(db, "players"), {
            name: newName.trim(),
            teamId: newTeamId,
            isManager: newIsManager,
            batting: {
                atBats: 0,
                hits: 0,
                doubles: 0,
                triples: 0,
                homeRuns: 0,
                walks: 0,
                hbp: 0,
                sf: 0,
                rbi: 0,
                runs: 0,
            },
            pitching: {
                inningsPitched: 0,
                earnedRuns: 0,
                strikeouts: 0,
                wins: 0,
                losses: 0,
            },
        });
        setNewName("");
        setNewIsManager(false);
        setAddLoading(false);
        fetchPlayers();
    };

    const handleUpdate = async () => {
        if (!selectedId) return;
        setEditLoading(true);
        await updateDoc(doc(db, "players", selectedId), {
            teamId: editTeamId,
            isManager: editIsManager,
        });
        setEditLoading(false);
        fetchPlayers();
    };

    const selectedPlayer = players.find((p) => p.id === selectedId) ?? null;

    const inputCls =
        "w-full px-3 py-2 text-[13px] bg-transparent border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:border-slate-400 dark:focus:border-slate-500 transition-colors text-slate-900 dark:text-slate-100";
    const labelCls =
        "block text-[11px] font-medium uppercase tracking-[0.08em] text-slate-400 mb-1.5";

    return (
        <div className="min-h-screen bg-[#f9f9f8] dark:bg-slate-950 p-6">
            <div className="max-w-6xl mx-auto">
                {/* 헤더 */}
                <div className="mb-6">
                    <p className="text-[11px] font-medium tracking-[0.12em] uppercase text-slate-400 mb-1">
                        Nangman Baseball League
                    </p>
                    <h1 className="text-2xl font-medium text-slate-900 dark:text-slate-100 tracking-tight">
                        Roster Management
                    </h1>
                </div>

                <div className="flex gap-3 h-170">
                    {/* 좌측: 선수 목록 */}
                    <div className="w-64 shrink-0 flex flex-col border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-slate-900">
                        <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                            <span className="text-[11px] font-medium uppercase tracking-[0.08em] text-slate-400">
                                Active Roster
                            </span>
                            <span className="text-[11px] text-slate-400">
                                {players.length}명
                            </span>
                        </div>
                        <div className="overflow-y-auto flex-1">
                            {players.map((p) => {
                                const isCoupang = p.teamId === "coupang";
                                const isSelected = selectedId === p.id;
                                return (
                                    <div
                                        key={p.id}
                                        onClick={() => {
                                            setSelectedId(p.id);
                                            setEditTeamId(p.teamId);
                                            setEditIsManager(p.isManager);
                                            setTab("edit");
                                        }}
                                        className={[
                                            "flex items-center gap-3 px-4 py-3 cursor-pointer border-b border-slate-100 dark:border-slate-800/60 last:border-0 transition-colors",
                                            isSelected
                                                ? "bg-slate-50 dark:bg-slate-800/50"
                                                : "hover:bg-slate-50/70 dark:hover:bg-slate-800/30",
                                        ].join(" ")}
                                    >
                                        <div
                                            className={[
                                                "w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-medium shrink-0",
                                                isCoupang
                                                    ? "bg-amber-50 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                                                    : "bg-blue-50 text-blue-800 dark:bg-blue-950 dark:text-blue-300",
                                            ].join(" ")}
                                        >
                                            {p.name[0]}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <p className="text-[13px] font-medium text-slate-800 dark:text-slate-200 truncate flex items-center gap-1.5">
                                                {p.name}
                                                {p.isManager && (
                                                    <span className="w-1.5 h-1.5 rounded-full bg-teal-500 inline-block shrink-0" />
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

                    {/* 우측: 폼 패널 */}
                    <div className="flex-1 flex flex-col border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-slate-900">
                        {/* 탭 */}
                        <div className="flex border-b border-slate-200 dark:border-slate-800 px-5">
                            {(
                                [
                                    ["add", "신규 등록"],
                                    ["edit", "정보 수정"],
                                ] as [Tab, string][]
                            ).map(([t, label]) => (
                                <button
                                    key={t}
                                    onClick={() => setTab(t)}
                                    className={[
                                        "text-[13px] py-3.5 mr-6 border-b-[1.5px] transition-colors",
                                        tab === t
                                            ? "border-slate-900 dark:border-slate-100 text-slate-900 dark:text-slate-100 font-medium"
                                            : "border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300",
                                    ].join(" ")}
                                >
                                    {label}
                                </button>
                            ))}
                        </div>

                        <div className="flex-1 overflow-y-auto p-6">
                            {/* 신규 등록 탭 */}
                            {tab === "add" && (
                                <form
                                    onSubmit={handleAddPlayer}
                                    className="max-w-sm space-y-5"
                                >
                                    <div>
                                        <label className={labelCls}>
                                            선수명
                                        </label>
                                        <input
                                            className={inputCls}
                                            value={newName}
                                            onChange={(e) =>
                                                setNewName(e.target.value)
                                            }
                                            placeholder="이름 입력"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className={labelCls}>
                                            팀 배정
                                        </label>
                                        <select
                                            className={inputCls}
                                            value={newTeamId}
                                            onChange={(e) =>
                                                setNewTeamId(e.target.value)
                                            }
                                        >
                                            <option value="coupang">
                                                쿠팡 일용직스
                                            </option>
                                            <option value="yongkids">
                                                Daegu Yongkids
                                            </option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className={labelCls}>
                                            포지션
                                        </label>
                                        <div className="flex gap-2">
                                            {(["선수", "매니저"] as const).map(
                                                (opt) => {
                                                    const isManager =
                                                        opt === "매니저";
                                                    const active =
                                                        newIsManager ===
                                                        isManager;
                                                    return (
                                                        <button
                                                            key={opt}
                                                            type="button"
                                                            onClick={() =>
                                                                setNewIsManager(
                                                                    isManager,
                                                                )
                                                            }
                                                            className={[
                                                                "flex-1 py-2 text-[12px] font-medium rounded-lg border transition-colors",
                                                                active
                                                                    ? "border-slate-900 dark:border-slate-100 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900"
                                                                    : "border-slate-200 dark:border-slate-700 text-slate-500 hover:border-slate-300 dark:hover:border-slate-600",
                                                            ].join(" ")}
                                                        >
                                                            {opt}
                                                        </button>
                                                    );
                                                },
                                            )}
                                        </div>
                                    </div>

                                    {/* 미리보기 */}
                                    {newName.trim() && (
                                        <div className="border border-slate-100 dark:border-slate-800 rounded-lg p-4 bg-slate-50 dark:bg-slate-800/40">
                                            <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-slate-400 mb-2">
                                                미리보기
                                            </p>
                                            <div className="flex items-center gap-3">
                                                <div
                                                    className={[
                                                        "w-8 h-8 rounded-full flex items-center justify-center text-[12px] font-medium",
                                                        newTeamId === "coupang"
                                                            ? "bg-amber-50 text-amber-800"
                                                            : "bg-blue-50 text-blue-800",
                                                    ].join(" ")}
                                                >
                                                    {newName[0]}
                                                </div>
                                                <div>
                                                    <p className="text-[13px] font-medium text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                                                        {newName}
                                                        {newIsManager && (
                                                            <span className="w-1.5 h-1.5 rounded-full bg-teal-500 inline-block" />
                                                        )}
                                                    </p>
                                                    <p className="text-[11px] text-slate-400">
                                                        {teamLabel(newTeamId)}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    <button
                                        type="submit"
                                        disabled={addLoading || !newName.trim()}
                                        className="w-full py-2.5 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-[13px] font-medium rounded-lg hover:bg-slate-700 dark:hover:bg-slate-200 transition-colors disabled:opacity-30"
                                    >
                                        {addLoading
                                            ? "등록 중..."
                                            : "선수 등록"}
                                    </button>
                                </form>
                            )}

                            {/* 정보 수정 탭 */}
                            {tab === "edit" && (
                                <>
                                    {selectedPlayer ? (
                                        <div className="max-w-sm space-y-5">
                                            {/* 선택된 선수 인포 */}
                                            <div className="flex items-center gap-3 p-4 border border-slate-100 dark:border-slate-800 rounded-lg bg-slate-50 dark:bg-slate-800/40">
                                                <div
                                                    className={[
                                                        "w-8 h-8 rounded-full flex items-center justify-center text-[12px] font-medium shrink-0",
                                                        selectedPlayer.teamId ===
                                                        "coupang"
                                                            ? "bg-amber-50 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                                                            : "bg-blue-50 text-blue-800 dark:bg-blue-950 dark:text-blue-300",
                                                    ].join(" ")}
                                                >
                                                    {selectedPlayer.name[0]}
                                                </div>
                                                <div>
                                                    <p className="text-[13px] font-medium text-slate-800 dark:text-slate-200">
                                                        {selectedPlayer.name}
                                                    </p>
                                                    <p className="text-[11px] text-slate-400">
                                                        {teamLabel(
                                                            selectedPlayer.teamId,
                                                        )}
                                                    </p>
                                                </div>
                                            </div>

                                            <div>
                                                <label className={labelCls}>
                                                    팀 이동
                                                </label>
                                                <select
                                                    className={inputCls}
                                                    value={editTeamId}
                                                    onChange={(e) =>
                                                        setEditTeamId(
                                                            e.target.value,
                                                        )
                                                    }
                                                >
                                                    <option value="coupang">
                                                        쿠팡 일용직스
                                                    </option>
                                                    <option value="yongkids">
                                                        Daegu Yongkids
                                                    </option>
                                                </select>
                                            </div>

                                            <div>
                                                <label className={labelCls}>
                                                    포지션
                                                </label>
                                                <div className="flex gap-2">
                                                    {(
                                                        [
                                                            "선수",
                                                            "매니저",
                                                        ] as const
                                                    ).map((opt) => {
                                                        const isManager =
                                                            opt === "매니저";
                                                        const active =
                                                            editIsManager ===
                                                            isManager;
                                                        return (
                                                            <button
                                                                key={opt}
                                                                type="button"
                                                                onClick={() =>
                                                                    setEditIsManager(
                                                                        isManager,
                                                                    )
                                                                }
                                                                className={[
                                                                    "flex-1 py-2 text-[12px] font-medium rounded-lg border transition-colors",
                                                                    active
                                                                        ? "border-slate-900 dark:border-slate-100 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900"
                                                                        : "border-slate-200 dark:border-slate-700 text-slate-500 hover:border-slate-300 dark:hover:border-slate-600",
                                                                ].join(" ")}
                                                            >
                                                                {opt}
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            </div>

                                            <button
                                                onClick={handleUpdate}
                                                disabled={editLoading}
                                                className="w-full py-2.5 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-[13px] font-medium rounded-lg hover:bg-slate-700 dark:hover:bg-slate-200 transition-colors disabled:opacity-30"
                                            >
                                                {editLoading
                                                    ? "저장 중..."
                                                    : "변경사항 저장"}
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="h-full flex items-center justify-center text-[13px] text-slate-400">
                                            ← 좌측에서 선수를 선택하세요
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Edit;
