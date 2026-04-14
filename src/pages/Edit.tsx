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

// 팀 ID에 따른 한글 라벨 및 스타일 설정
const TEAM_CONFIG: Record<string, { label: string; color: string }> = {
    coupang: { label: "쿠팡 일용직스", color: "bg-amber-50 text-amber-800" },
    yongkids: { label: "Daegu Yongkids", color: "bg-blue-50 text-blue-800" },
    mercenary: {
        label: "용병 (Mercenary)",
        color: "bg-slate-100 text-slate-600",
    },
};

const Edit: React.FC = () => {
    const [players, setPlayers] = useState<Player[]>([]);
    const [selectedId, setSelectedId] = useState<string>("");
    const [tab, setTab] = useState<Tab>("add");

    // 신규 등록 State
    const [newName, setNewName] = useState("");
    const [newTeamId, setNewTeamId] = useState("coupang");
    const [addLoading, setAddLoading] = useState(false);

    // 수정 State
    const [editTeamId, setEditTeamId] = useState("");
    const [editIsManager, setEditIsManager] = useState(false);
    const [editLoading, setEditLoading] = useState(false);

    useEffect(() => {
        fetchPlayers();
    }, []);

    const fetchPlayers = async () => {
        const q = query(collection(db, "players"), orderBy("name", "asc"));
        const snap = await getDocs(q);
        const data = snap.docs.map((d) => ({
            id: d.id,
            ...d.data(),
        })) as Player[];

        // 팀 우선순위 정렬: 쿠팡(1) -> 용키즈(2) -> 용병(3)
        const sortedData = data.sort((a, b) => {
            const priority: Record<string, number> = {
                coupang: 1,
                yongkids: 2,
                mercenary: 3,
            };
            const aP = priority[a.teamId] || 99;
            const bP = priority[b.teamId] || 99;
            return aP - bP;
        });

        setPlayers(sortedData);
    };

    const handleAddPlayer = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newName.trim()) return;
        setAddLoading(true);
        try {
            await addDoc(collection(db, "players"), {
                name: newName.trim(),
                teamId: newTeamId,
                isManager: false,
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
            setAddLoading(false);
            fetchPlayers();
        } catch (err) {
            console.error(err);
            setAddLoading(false);
        }
    };

    const handleUpdate = async () => {
        if (!selectedId) return;
        setEditLoading(true);
        try {
            await updateDoc(doc(db, "players", selectedId), {
                teamId: editTeamId,
                isManager: editIsManager,
            });
            setEditLoading(false);
            fetchPlayers();
        } catch (err) {
            console.error(err);
            setEditLoading(false);
        }
    };

    const selectedPlayer = players.find((p) => p.id === selectedId) ?? null;

    // 공통 스타일 클래스
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

                <div className="flex flex-col md:flex-row gap-4">
                    {/* 좌측: 선수 목록 (팀별 정렬됨) */}
                    <div className="w-full md:w-64 h-72 md:h-[600px] flex flex-col border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-slate-900">
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
                                    className={`flex items-center gap-3 px-4 py-3 cursor-pointer border-b last:border-0 transition-colors ${selectedId === p.id ? "bg-slate-50 dark:bg-slate-800" : "hover:bg-slate-50"}`}
                                >
                                    <div
                                        className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold ${TEAM_CONFIG[p.teamId]?.color || "bg-slate-100"}`}
                                    >
                                        {p.name[0]}
                                    </div>
                                    <div className="truncate">
                                        <p className="text-[13px] font-medium text-slate-800 dark:text-slate-200">
                                            {p.name}
                                        </p>
                                        <p className="text-[11px] text-slate-400">
                                            {TEAM_CONFIG[p.teamId]?.label}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* 우측: 폼 패널 */}
                    <div className="flex-1 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 overflow-hidden">
                        <div className="flex border-b border-slate-200 dark:border-slate-800 px-5">
                            {(["add", "edit"] as Tab[]).map((t) => (
                                <button
                                    key={t}
                                    onClick={() => setTab(t)}
                                    className={`text-[13px] py-3.5 mr-6 border-b-[1.5px] transition-all ${tab === t ? "border-slate-900 text-slate-900 dark:text-slate-100" : "border-transparent text-slate-400"}`}
                                >
                                    {t === "add" ? "신규 등록" : "정보 수정"}
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
                                            {Object.entries(TEAM_CONFIG).map(
                                                ([id, cfg]) => (
                                                    <option key={id} value={id}>
                                                        {cfg.label}
                                                    </option>
                                                ),
                                            )}
                                        </select>
                                    </div>
                                    <button
                                        type="submit"
                                        disabled={addLoading}
                                        className="w-full py-2.5 bg-slate-900 text-white rounded-lg text-[13px] font-medium hover:bg-slate-800 disabled:opacity-30 transition-all"
                                    >
                                        {addLoading
                                            ? "등록 중..."
                                            : "선수 등록"}
                                    </button>
                                </form>
                            ) : (
                                <div className="max-w-sm space-y-5">
                                    {selectedPlayer ? (
                                        <>
                                            <div className="pb-2 border-b border-slate-100 dark:border-slate-800">
                                                <p className={labelCls}>
                                                    수정 중인 선수
                                                </p>
                                                <p className="text-lg font-bold">
                                                    {selectedPlayer.name}
                                                </p>
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
                                                    {Object.entries(
                                                        TEAM_CONFIG,
                                                    ).map(([id, cfg]) => (
                                                        <option
                                                            key={id}
                                                            value={id}
                                                        >
                                                            {cfg.label}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <input
                                                    type="checkbox"
                                                    id="mgr"
                                                    checked={editIsManager}
                                                    onChange={(e) =>
                                                        setEditIsManager(
                                                            e.target.checked,
                                                        )
                                                    }
                                                    className="w-4 h-4 accent-slate-900"
                                                />
                                                <label
                                                    htmlFor="mgr"
                                                    className="text-[13px] text-slate-600"
                                                >
                                                    감독 여부
                                                </label>
                                            </div>
                                            <button
                                                onClick={handleUpdate}
                                                disabled={editLoading}
                                                className="w-full py-2.5 bg-slate-900 text-white rounded-lg text-[13px] font-medium hover:bg-slate-800 transition-all"
                                            >
                                                {editLoading
                                                    ? "저장 중..."
                                                    : "변경사항 저장"}
                                            </button>
                                        </>
                                    ) : (
                                        <div className="h-40 flex items-center justify-center text-slate-400 text-[13px] border-2 border-dashed border-slate-100 rounded-xl">
                                            ← 좌측 목록에서 선수를 선택하세요
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Edit;
