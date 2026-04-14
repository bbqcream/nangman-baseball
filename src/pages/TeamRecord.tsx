import React, { useEffect, useMemo, useState } from "react";
import { doc, getDoc, setDoc, Timestamp } from "firebase/firestore";
import { db } from "../firebase/firebase";
import { useNavigate } from "react-router-dom";

interface GameDetail {
    scorers: string;
    hits: number;
    pitchers: string;
    memo: string;
}

interface Game {
    id: string;
    date: string;
    opponent: string;
    myScore: number;
    opponentScore: number;
    result: "win" | "loss" | "draw";
    detail?: GameDetail;
}

interface TeamData {
    wins: number;
    losses: number;
    draws: number;
    games: Game[];
}

const TEAMS = [
    { id: "coupang", label: "쿠팡 일용직스", short: "쿠팡" },
    { id: "yongkids", label: "대구 용키즈", short: "용키즈" },
] as const;

type TeamId = "coupang" | "yongkids";

const RESULT_BADGE: Record<Game["result"], { label: string; cls: string }> = {
    win: {
        label: "승",
        cls: "bg-emerald-50 text-emerald-700 border border-emerald-200",
    },
    loss: {
        label: "패",
        cls: "bg-red-50 text-red-600 border border-red-200",
    },
    draw: {
        label: "무",
        cls: "bg-slate-100 text-slate-500 border border-slate-200",
    },
};

const TEAM_BADGE: Record<TeamId, string> = {
    coupang: "bg-amber-50 text-amber-800",
    yongkids: "bg-blue-50 text-blue-800",
};

const TeamRecord: React.FC = () => {
    const navigate = useNavigate();
    const [teamData, setTeamData] = useState<Record<string, TeamData>>({});
    const [selectedTeam, setSelectedTeam] = useState<TeamId>("coupang");
    const [saving, setSaving] = useState(false);
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [form, setForm] = useState({
        date: new Date().toISOString().slice(0, 10),
        opponent: "",
        myScore: "",
        opponentScore: "",
        scorers: "",
        hits: "",
        pitchers: "",
        memo: "",
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

    const allGames = useMemo(() => {
        const merged: (Game & { teamId: TeamId })[] = [];
        for (const team of TEAMS) {
            for (const g of teamData[team.id]?.games ?? []) {
                merged.push({ ...g, teamId: team.id });
            }
        }
        return merged.sort((a, b) => b.date.localeCompare(a.date));
    }, [teamData]);

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
        const current = teamData[selectedTeam] ?? {
            wins: 0,
            losses: 0,
            draws: 0,
            games: [],
        };

        const newGame: Game = {
            id: Date.now().toString(),
            date: form.date,
            opponent: form.opponent.trim(),
            myScore: my,
            opponentScore: opp,
            result,
            detail: {
                scorers: form.scorers.trim(),
                hits: parseInt(form.hits) || 0,
                pitchers: form.pitchers.trim(),
                memo: form.memo.trim(),
            },
        };

        const updatedTeam: TeamData = {
            wins: current.wins + (result === "win" ? 1 : 0),
            losses: current.losses + (result === "loss" ? 1 : 0),
            draws: current.draws + (result === "draw" ? 1 : 0),
            games: [newGame, ...current.games],
        };

        setSaving(true);
        try {
            await setDoc(doc(db, "teams", selectedTeam), updatedTeam);

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
                scorers: "",
                hits: "",
                pitchers: "",
                memo: "",
            });
            fetchAll();
        } catch (e) {
            console.error(e);
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteGame = async (gameId: string, teamId: TeamId) => {
        if (!window.confirm("기록을 삭제하시겠습니까?")) return;
        const current = teamData[teamId];
        const game = current.games.find((g) => g.id === gameId);
        if (!game) return;

        const updated: TeamData = {
            wins: current.wins - (game.result === "win" ? 1 : 0),
            losses: current.losses - (game.result === "loss" ? 1 : 0),
            draws: current.draws - (game.result === "draw" ? 1 : 0),
            games: current.games.filter((g) => g.id !== gameId),
        };
        await setDoc(doc(db, "teams", teamId), updated);
        fetchAll();
    };

    return (
        <div className="min-h-screen bg-[#f9f9f8] p-6">
            <div className="max-w-5xl mx-auto">
                <div className="mb-6">
                    <p className="text-[11px] font-medium tracking-[0.12em] uppercase text-slate-400 mb-1">
                        Nangman Baseball League
                    </p>
                    <h1 className="text-2xl font-medium text-slate-900 tracking-tight">
                        팀 일정 & 기록
                    </h1>
                </div>

                {/* 두 팀 요약 카드 */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                    {TEAMS.map((t) => {
                        const d = teamData[t.id];
                        const total =
                            (d?.wins ?? 0) + (d?.losses ?? 0) + (d?.draws ?? 0);
                        const pct =
                            total > 0
                                ? ((d!.wins / total) * 100).toFixed(1)
                                : "0.0";
                        return (
                            <div
                                key={t.id}
                                className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm"
                            >
                                <div className="flex items-center justify-between mb-3">
                                    <p className="text-sm font-medium text-slate-800">
                                        {t.label}
                                    </p>
                                    <span
                                        className={`text-xs font-bold px-2 py-0.5 rounded-full ${TEAM_BADGE[t.id]}`}
                                    >
                                        {t.short}
                                    </span>
                                </div>
                                <div className="flex gap-5 mb-2">
                                    {(
                                        [
                                            ["승", d?.wins ?? 0],
                                            ["패", d?.losses ?? 0],
                                            ["무", d?.draws ?? 0],
                                        ] as [string, number][]
                                    ).map(([label, val]) => (
                                        <div
                                            key={label}
                                            className="text-center"
                                        >
                                            <p className="text-2xl font-bold text-slate-900">
                                                {val}
                                            </p>
                                            <p className="text-xs text-slate-400 mt-0.5">
                                                {label}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                                <p className="text-xs text-slate-400 text-right">
                                    승률 {pct}%
                                </p>
                            </div>
                        );
                    })}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* 경기 추가 폼 */}
                    <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
                        <h2 className="text-xs font-bold mb-4 uppercase text-slate-400">
                            경기 추가
                        </h2>
                        <div className="space-y-3">
                            {/* 팀 선택 드롭다운 */}
                            <select
                                className="w-full p-2 border rounded text-sm bg-white"
                                value={selectedTeam}
                                onChange={(e) =>
                                    setSelectedTeam(e.target.value as TeamId)
                                }
                            >
                                {TEAMS.map((t) => (
                                    <option key={t.id} value={t.id}>
                                        {t.label}
                                    </option>
                                ))}
                            </select>

                            <input
                                type="date"
                                className="w-full p-2 border rounded text-sm"
                                value={form.date}
                                onChange={(e) =>
                                    setForm({ ...form, date: e.target.value })
                                }
                            />
                            <input
                                type="text"
                                placeholder="상대팀"
                                className="w-full p-2 border rounded text-sm"
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
                                    className="w-1/2 p-2 border rounded text-sm"
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
                                    className="w-1/2 p-2 border rounded text-sm"
                                    value={form.opponentScore}
                                    onChange={(e) =>
                                        setForm({
                                            ...form,
                                            opponentScore: e.target.value,
                                        })
                                    }
                                />
                            </div>

                            <hr className="border-slate-100" />
                            <p className="text-xs text-slate-400 font-medium">
                                상세 기록 (선택)
                            </p>

                            <input
                                type="text"
                                placeholder="득점자"
                                className="w-full p-2 border rounded text-sm"
                                value={form.scorers}
                                onChange={(e) =>
                                    setForm({
                                        ...form,
                                        scorers: e.target.value,
                                    })
                                }
                            />
                            <input
                                type="number"
                                placeholder="팀 안타 수"
                                className="w-full p-2 border rounded text-sm"
                                value={form.hits}
                                onChange={(e) =>
                                    setForm({ ...form, hits: e.target.value })
                                }
                            />
                            <input
                                type="text"
                                placeholder="투수 (예: 이민수)"
                                className="w-full p-2 border rounded text-sm"
                                value={form.pitchers}
                                onChange={(e) =>
                                    setForm({
                                        ...form,
                                        pitchers: e.target.value,
                                    })
                                }
                            />
                            <textarea
                                placeholder="메모"
                                rows={2}
                                className="w-full p-2 border rounded text-sm resize-none"
                                value={form.memo}
                                onChange={(e) =>
                                    setForm({ ...form, memo: e.target.value })
                                }
                            />

                            <button
                                onClick={handleAddGame}
                                disabled={saving}
                                className="w-full bg-slate-900 text-white p-2 rounded-lg font-bold text-sm disabled:opacity-40"
                            >
                                {saving ? "저장 중..." : "기록 추가"}
                            </button>
                        </div>
                    </div>

                    {/* 합산 경기 목록 */}
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
                                        스코어
                                    </th>
                                    <th className="p-3 text-xs font-bold text-slate-400">
                                        결과
                                    </th>
                                    <th className="p-3 text-xs font-bold text-slate-400">
                                        팀
                                    </th>
                                    <th className="p-3 text-xs font-bold text-slate-400">
                                        라인업
                                    </th>
                                    <th className="p-3 text-xs font-bold text-slate-400"></th>
                                </tr>
                            </thead>
                            <tbody>
                                {allGames.length === 0 && (
                                    <tr>
                                        <td
                                            colSpan={7}
                                            className="p-6 text-center text-sm text-slate-400"
                                        >
                                            아직 등록된 경기가 없습니다.
                                        </td>
                                    </tr>
                                )}
                                {allGames.map((g) => {
                                    const badge = RESULT_BADGE[g.result];
                                    const isOpen = expandedId === g.id;
                                    const hasDetail =
                                        g.detail &&
                                        (g.detail.scorers ||
                                            g.detail.hits ||
                                            g.detail.pitchers ||
                                            g.detail.memo);

                                    return (
                                        <React.Fragment
                                            key={`${g.teamId}-${g.id}`}
                                        >
                                            <tr
                                                className="border-b hover:bg-slate-50 transition-colors cursor-pointer"
                                                onClick={() =>
                                                    setExpandedId(
                                                        isOpen ? null : g.id,
                                                    )
                                                }
                                            >
                                                <td className="p-3 text-sm text-slate-500">
                                                    {g.date}
                                                </td>
                                                <td className="p-3 text-sm font-bold">
                                                    {g.opponent}
                                                </td>
                                                <td className="p-3 text-sm font-mono font-bold">
                                                    {g.myScore}:
                                                    {g.opponentScore}
                                                </td>
                                                <td className="p-3">
                                                    <span
                                                        className={`text-xs font-bold px-2 py-0.5 rounded-full ${badge.cls}`}
                                                    >
                                                        {badge.label}
                                                    </span>
                                                </td>
                                                <td className="p-3">
                                                    <span
                                                        className={`text-xs font-medium px-2 py-0.5 rounded-full ${TEAM_BADGE[g.teamId]}`}
                                                    >
                                                        {g.teamId === "coupang"
                                                            ? "쿠팡"
                                                            : "Yongkids"}
                                                    </span>
                                                </td>
                                                <td className="p-3">
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            navigate(
                                                                `/lineup?date=${g.date}`,
                                                            );
                                                        }}
                                                        className="text-blue-600 font-bold hover:underline text-xs"
                                                    >
                                                        보기/수정
                                                    </button>
                                                </td>
                                                <td className="p-3 text-right whitespace-nowrap">
                                                    <span className="text-slate-300 text-xs mr-2 select-none">
                                                        {isOpen ? "▲" : "▼"}
                                                    </span>
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleDeleteGame(
                                                                g.id,
                                                                g.teamId,
                                                            );
                                                        }}
                                                        className="text-red-300 hover:text-red-500 text-xs"
                                                    >
                                                        삭제
                                                    </button>
                                                </td>
                                            </tr>

                                            {/* 아코디언 상세 */}
                                            {isOpen && (
                                                <tr className="border-b bg-slate-50">
                                                    <td
                                                        colSpan={7}
                                                        className="px-5 py-4"
                                                    >
                                                        {hasDetail ? (
                                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                                                <DetailCard
                                                                    label="득점자"
                                                                    value={
                                                                        g.detail
                                                                            ?.scorers ||
                                                                        "—"
                                                                    }
                                                                />
                                                                <DetailCard
                                                                    label="팀 안타"
                                                                    value={
                                                                        g.detail
                                                                            ?.hits !=
                                                                        null
                                                                            ? `${g.detail.hits}개`
                                                                            : "—"
                                                                    }
                                                                />
                                                                <DetailCard
                                                                    label="투수"
                                                                    value={
                                                                        g.detail
                                                                            ?.pitchers ||
                                                                        "—"
                                                                    }
                                                                />
                                                                <DetailCard
                                                                    label="메모"
                                                                    value={
                                                                        g.detail
                                                                            ?.memo ||
                                                                        "—"
                                                                    }
                                                                />
                                                            </div>
                                                        ) : (
                                                            <p className="text-xs text-slate-400 text-center py-2">
                                                                상세 기록이
                                                                없습니다.
                                                            </p>
                                                        )}
                                                    </td>
                                                </tr>
                                            )}
                                        </React.Fragment>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};

const DetailCard: React.FC<{ label: string; value: string }> = ({
    label,
    value,
}) => (
    <div className="bg-white rounded-lg border border-slate-200 p-3">
        <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400 mb-1">
            {label}
        </p>
        <p className="text-sm font-medium text-slate-800">{value}</p>
    </div>
);

export default TeamRecord;
