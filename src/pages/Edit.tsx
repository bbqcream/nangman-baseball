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
        "w-full px-3 py-2 text-[13px] bg-transparent border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:border-slate-400 transition-colors text-slate-900 dark:text-slate-100";
    const labelCls =
        "block text-[11px] font-medium uppercase tracking-[0.08em] text-slate-400 mb-1.5";

    return (
        <div className="min-h-screen bg-[#f9f9f8] dark:bg-slate-950 p-4 md:p-6">
            <div className="max-w-6xl mx-auto">
                <div className="mb-6">
                    <p className="text-[11px] font-medium tracking-[0.12em] uppercase text-slate-400 mb-1">
                        Nangman Baseball League
                    </p>
                    <h1 className="text-2xl font-medium text-slate-900 dark:text-slate-100 tracking-tight">
                        Roster Management
                    </h1>
                </div>

                {/* 반응형 레이아웃: 모바일 flex-col, 데스크탑 flex-row */}
                <div className="flex flex-col md:flex-row gap-4">
                    {/* 좌측: 선수 목록 */}
                    <div className="w-full md:w-64 h-72 md:h-150 flex flex-col border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-slate-900">
                        <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex justify-between">
                            <span className="text-[11px] font-medium uppercase text-slate-400">
                                Active Roster
                            </span>
                            <span className="text-[11px] text-slate-400">
                                {players.length}명
                            </span>
                        </div>
                        <div className="overflow-y-auto flex-1">
                            {players.map((p) => (
                                <div
                                    key={p.id}
                                    onClick={() => {
                                        setSelectedId(p.id);
                                        setEditTeamId(p.teamId);
                                        setEditIsManager(p.isManager);
                                        setTab("edit");
                                    }}
                                    className={`flex items-center gap-3 px-4 py-3 cursor-pointer border-b last:border-0 ${selectedId === p.id ? "bg-slate-50 dark:bg-slate-800" : "hover:bg-slate-50"}`}
                                >
                                    <div
                                        className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] ${p.teamId === "coupang" ? "bg-amber-50 text-amber-800" : "bg-blue-50 text-blue-800"}`}
                                    >
                                        {p.name[0]}
                                    </div>
                                    <div className="truncate">
                                        <p className="text-[13px] font-medium text-slate-800">
                                            {p.name}
                                        </p>
                                        <p className="text-[11px] text-slate-400">
                                            {teamLabel(p.teamId)}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* 우측: 폼 패널 */}
                    <div className="flex-1 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 overflow-hidden">
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
                                    className={`text-[13px] py-3.5 mr-6 border-b-[1.5px] ${tab === t ? "border-slate-900 text-slate-900" : "border-transparent text-slate-400"}`}
                                >
                                    {label}
                                </button>
                            ))}
                        </div>

                        <div className="p-6">
                            {tab === "add" ? (
                                <form
                                    onSubmit={handleAddPlayer}
                                    className="max-w-sm space-y-4"
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
                                    <button
                                        type="submit"
                                        disabled={addLoading}
                                        className="w-full py-2.5 bg-slate-900 text-white rounded-lg text-[13px] disabled:opacity-30"
                                    >
                                        {addLoading
                                            ? "등록 중..."
                                            : "선수 등록"}
                                    </button>
                                </form>
                            ) : (
                                <>
                                    {selectedPlayer ? (
                                        <div className="max-w-sm space-y-4">
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
                                            <button
                                                onClick={handleUpdate}
                                                disabled={editLoading}
                                                className="w-full py-2.5 bg-slate-900 text-white rounded-lg text-[13px]"
                                            >
                                                {editLoading
                                                    ? "저장 중..."
                                                    : "변경사항 저장"}
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="h-40 flex items-center justify-center text-slate-400 text-[13px]">
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
