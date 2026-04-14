import React, { useEffect, useState } from "react";
import { doc, getDoc, setDoc, Timestamp } from "firebase/firestore";
import { db } from "../firebase/firebase";
import { useNavigate } from "react-router-dom";

interface Game {
    id: string;
    date: string;
    opponent: string;
    myScore: number;
    opponentScore: number;
    result: "win" | "loss" | "draw";
}

interface TeamData {
    wins: number;
    losses: number;
    draws: number;
    games: Game[];
}

const TEAMS = [
    { id: "coupang", label: "쿠팡 일용직스" },
    { id: "yongkids", label: "Daegu Yongkids" },
] as const;

const TeamRecord: React.FC = () => {
    const navigate = useNavigate();
    const [teamData, setTeamData] = useState<Record<string, TeamData>>({});
    const [selectedTeam, setSelectedTeam] = useState<"coupang" | "yongkids">(
        "coupang",
    );
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState({
        date: new Date().toISOString().slice(0, 10),
        opponent: "",
        myScore: "",
        opponentScore: "",
    });

    useEffect(() => {
        fetchAll();
    }, []);

    const fetchAll = async () => {
        const results: Record<string, TeamData> = {};
        for (const team of TEAMS) {
            const snap = await getDoc(doc(db, "teams", team.id));
            results[team.id] = snap.exists()
                ? (snap.data() as TeamData)
                : { wins: 0, losses: 0, draws: 0, games: [] };
        }
        setTeamData(results);
    };

    const handleAddGame = async () => {
        if (
            !form.opponent.trim() ||
            form.myScore === "" ||
            form.opponentScore === ""
        )
            return;

        const my = parseInt(form.myScore);
        const opp = parseInt(form.opponentScore);
        const result: Game["result"] =
            my > opp ? "win" : my < opp ? "loss" : "draw";
        const current = teamData[selectedTeam];

        const newGame: Game = {
            id: Date.now().toString(),
            date: form.date,
            opponent: form.opponent.trim(),
            myScore: my,
            opponentScore: opp,
            result,
        };

        const updatedTeam: TeamData = {
            wins: current.wins + (result === "win" ? 1 : 0),
            losses: current.losses + (result === "loss" ? 1 : 0),
            draws: current.draws + (result === "draw" ? 1 : 0),
            games: [newGame, ...current.games],
        };

        setSaving(true);
        try {
            // 1. 팀 성적 업데이트
            await setDoc(doc(db, "teams", selectedTeam), updatedTeam);

            // 2. 해당 날짜 라인업 문서가 없으면 자동 생성 (이미 있으면 덮어쓰지 않음)
            const lineupRef = doc(db, "lineups", form.date);
            const lineupSnap = await getDoc(lineupRef);
            if (!lineupSnap.exists()) {
                await setDoc(lineupRef, {
                    awayLineup: Array.from({ length: 5 }, (_, i) => ({
                        id: Math.random(),
                        order: i + 1,
                        name: "",
                        position: "",
                    })),
                    homeLineup: Array.from({ length: 5 }, (_, i) => ({
                        id: Math.random(),
                        order: i + 1,
                        name: "",
                        position: "",
                    })),
                    isLocked: false,
                    updatedAt: Timestamp.now(),
                });
            }

            setForm({
                date: new Date().toISOString().slice(0, 10),
                opponent: "",
                myScore: "",
                opponentScore: "",
            });
            fetchAll();
        } catch (e) {
            console.error(e);
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteGame = async (gameId: string) => {
        if (!window.confirm("기록을 삭제하시겠습니까?")) return;
        const current = teamData[selectedTeam];
        const game = current.games.find((g) => g.id === gameId);
        if (!game) return;

        const updated: TeamData = {
            wins: current.wins - (game.result === "win" ? 1 : 0),
            losses: current.losses - (game.result === "loss" ? 1 : 0),
            draws: current.draws - (game.result === "draw" ? 1 : 0),
            games: current.games.filter((g) => g.id !== gameId),
        };
        await setDoc(doc(db, "teams", selectedTeam), updated);
        fetchAll();
    };

    return (
        <div className="min-h-screen bg-[#f9f9f8] p-6">
            <div className="max-w-5xl mx-auto">
                <h1 className="text-2xl font-bold mb-6">팀 승률 및 기록</h1>

                {/* 팀 선택 탭 */}
                <div className="flex gap-2 mb-6">
                    {TEAMS.map((t) => (
                        <button
                            key={t.id}
                            onClick={() => setSelectedTeam(t.id)}
                            className={`px-4 py-2 rounded-lg border ${selectedTeam === t.id ? "bg-white border-slate-400 font-bold" : "bg-transparent"}`}
                        >
                            {t.label}
                        </button>
                    ))}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* 경기 추가 폼 */}
                    <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
                        <h2 className="text-sm font-bold mb-4 uppercase text-slate-400">
                            경기 추가
                        </h2>
                        <div className="space-y-3">
                            <input
                                type="date"
                                className="w-full p-2 border rounded"
                                value={form.date}
                                onChange={(e) =>
                                    setForm({ ...form, date: e.target.value })
                                }
                            />
                            <input
                                type="text"
                                placeholder="상대팀"
                                className="w-full p-2 border rounded"
                                value={form.opponent}
                                onChange={(e) =>
                                    setForm({
                                        ...form,
                                        opponent: e.target.value,
                                    })
                                }
                            />
                            <div className="flex gap-2">
                                <input
                                    type="number"
                                    placeholder="우리"
                                    className="w-1/2 p-2 border rounded"
                                    value={form.myScore}
                                    onChange={(e) =>
                                        setForm({
                                            ...form,
                                            myScore: e.target.value,
                                        })
                                    }
                                />
                                <input
                                    type="number"
                                    placeholder="상대"
                                    className="w-1/2 p-2 border rounded"
                                    value={form.opponentScore}
                                    onChange={(e) =>
                                        setForm({
                                            ...form,
                                            opponentScore: e.target.value,
                                        })
                                    }
                                />
                            </div>
                            <button
                                onClick={handleAddGame}
                                disabled={saving}
                                className="w-full bg-slate-900 text-white p-2 rounded-lg font-bold"
                            >
                                {saving ? "저장 중..." : "기록 추가"}
                            </button>
                        </div>
                    </div>

                    {/* 기록 목록 */}
                    <div className="md:col-span-2 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                        <table className="w-full text-left">
                            <thead className="bg-slate-50 border-b">
                                <tr>
                                    <th className="p-3 text-xs font-bold text-slate-400">
                                        날짜
                                    </th>
                                    <th className="p-3 text-xs font-bold text-slate-400">
                                        상대
                                    </th>
                                    <th className="p-3 text-xs font-bold text-slate-400">
                                        결과
                                    </th>
                                    <th className="p-3 text-xs font-bold text-slate-400">
                                        라인업
                                    </th>
                                    <th className="p-3 text-xs font-bold text-slate-400"></th>
                                </tr>
                            </thead>
                            <tbody>
                                {teamData[selectedTeam]?.games.map((g) => (
                                    <tr
                                        key={g.id}
                                        className="border-b last:border-0 hover:bg-slate-50 transition-colors"
                                    >
                                        <td className="p-3 text-sm">
                                            {g.date}
                                        </td>
                                        <td className="p-3 text-sm font-bold">
                                            {g.opponent}
                                        </td>
                                        <td className="p-3 text-sm">
                                            {g.myScore}:{g.opponentScore} (
                                            {g.result === "win"
                                                ? "승"
                                                : g.result === "loss"
                                                  ? "패"
                                                  : "무"}
                                            )
                                        </td>
                                        <td className="p-3 text-sm">
                                            <button
                                                onClick={() =>
                                                    navigate(
                                                        `/lineup?date=${g.date}`,
                                                    )
                                                }
                                                className="text-blue-600 font-bold hover:underline"
                                            >
                                                보기/수정
                                            </button>
                                        </td>
                                        <td className="p-3 text-right">
                                            <button
                                                onClick={() =>
                                                    handleDeleteGame(g.id)
                                                }
                                                className="text-red-300 hover:text-red-500"
                                            >
                                                삭제
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TeamRecord;
