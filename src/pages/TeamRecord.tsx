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
    loss: { label: "패", cls: "bg-red-50 text-red-600 border border-red-200" },
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

    // 상대팀 종류 (리그 내 맞대결 vs 외부팀)
    const [opponentType, setOpponentType] = useState<"league" | "external">(
        "league",
    );
    const [externalOpponent, setExternalOpponent] = useState("");

    const [form, setForm] = useState({
        date: new Date().toISOString().slice(0, 10),
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
        const seenIds = new Set<string>(); // 중복 방지용 (양쪽에 저장된 맞대결을 하나로 묶음)

        for (const team of TEAMS) {
            for (const g of teamData[team.id]?.games ?? []) {
                if (!seenIds.has(g.id)) {
                    merged.push({ ...g, teamId: team.id });
                    seenIds.add(g.id);
                }
            }
        }
        return merged.sort(
            (a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id),
        );
    }, [teamData]);

    const handleAddGame = async () => {
        if (opponentType === "external" && !externalOpponent.trim()) {
            alert("외부 상대팀 이름을 입력해주세요.");
            return;
        }
        if (form.myScore === "" || form.opponentScore === "") {
            alert("양 팀의 점수를 모두 입력해주세요.");
            return;
        }

        const myScoreNum = parseInt(form.myScore, 10);
        const oppScoreNum = parseInt(form.opponentScore, 10);

        if (
            isNaN(myScoreNum) ||
            isNaN(oppScoreNum) ||
            myScoreNum < 0 ||
            oppScoreNum < 0
        ) {
            alert("점수를 0 이상의 숫자로 올바르게 입력해주세요.");
            return;
        }

        // 1. 기준 팀(내가 선택한 팀) 데이터 세팅
        const myResult =
            myScoreNum > oppScoreNum
                ? "win"
                : myScoreNum < oppScoreNum
                  ? "loss"
                  : "draw";
        const myTeamConfig = TEAMS.find((t) => t.id === selectedTeam)!;
        const oppTeamConfig = TEAMS.find((t) => t.id !== selectedTeam)!;

        const actualOpponentName =
            opponentType === "league"
                ? oppTeamConfig.label
                : externalOpponent.trim();
        const gameId = Date.now().toString();

        const baseGameDetail = {
            scorers: form.scorers.trim(),
            hits: parseInt(form.hits, 10) || 0,
            pitchers: form.pitchers.trim(),
            memo: form.memo.trim(),
        };

        const promises = [];

        // --- 내 팀 기록 업데이트 ---
        const myNewGame: Game = {
            id: gameId,
            date: form.date,
            opponent: actualOpponentName,
            myScore: myScoreNum,
            opponentScore: oppScoreNum,
            result: myResult,
            detail: baseGameDetail,
        };

        const myCurrent = teamData[selectedTeam] ?? {
            wins: 0,
            losses: 0,
            draws: 0,
            games: [],
        };
        const myNewList = [myNewGame, ...myCurrent.games];
        promises.push(
            setDoc(doc(db, "teams", selectedTeam), {
                wins: myNewList.filter((g) => g.result === "win").length,
                losses: myNewList.filter((g) => g.result === "loss").length,
                draws: myNewList.filter((g) => g.result === "draw").length,
                games: myNewList,
            }),
        );

        // --- 상대 팀 기록 크로스 업데이트 (리그 내 맞대결일 경우에만) ---
        if (opponentType === "league") {
            const oppResult =
                myResult === "win"
                    ? "loss"
                    : myResult === "loss"
                      ? "win"
                      : "draw";

            // 점수와 결과를 반대로 뒤집어서 저장
            const oppNewGame: Game = {
                id: gameId,
                date: form.date,
                opponent: myTeamConfig.label,
                myScore: oppScoreNum,
                opponentScore: myScoreNum,
                result: oppResult,
                detail: baseGameDetail,
            };

            const oppCurrent = teamData[oppTeamConfig.id] ?? {
                wins: 0,
                losses: 0,
                draws: 0,
                games: [],
            };
            const oppNewList = [oppNewGame, ...oppCurrent.games];
            promises.push(
                setDoc(doc(db, "teams", oppTeamConfig.id), {
                    wins: oppNewList.filter((g) => g.result === "win").length,
                    losses: oppNewList.filter((g) => g.result === "loss")
                        .length,
                    draws: oppNewList.filter((g) => g.result === "draw").length,
                    games: oppNewList,
                }),
            );
        }

        // 라인업 초기화 (기존 로직 유지)
        const lineupRef = doc(db, "lineups", form.date);
        const lineupSnap = await getDoc(lineupRef);
        if (!lineupSnap.exists()) {
            promises.push(
                setDoc(lineupRef, {
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
                }),
            );
        }

        setSaving(true);
        try {
            await Promise.all(promises);

            // 폼 초기화
            setForm({
                date: new Date().toISOString().slice(0, 10),
                myScore: "",
                opponentScore: "",
                scorers: "",
                hits: "",
                pitchers: "",
                memo: "",
            });
            setExternalOpponent("");
            fetchAll();
        } catch (e) {
            console.error(e);
            alert("저장 중 오류가 발생했습니다.");
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteGame = async (gameId: string) => {
        if (
            !window.confirm(
                "기록을 삭제하시겠습니까?\n(맞대결의 경우 양팀 기록에서 모두 삭제됩니다.)",
            )
        )
            return;

        const promises = [];

        // 양쪽 팀을 모두 순회하며 해당 gameId가 있으면 삭제하고 다시 승패를 계산
        for (const team of TEAMS) {
            const current = teamData[team.id];
            if (!current) continue;

            const hasGame = current.games.some((g) => g.id === gameId);
            if (hasGame) {
                const filteredGames = current.games.filter(
                    (g) => g.id !== gameId,
                );
                const updated: TeamData = {
                    wins: filteredGames.filter((g) => g.result === "win")
                        .length,
                    losses: filteredGames.filter((g) => g.result === "loss")
                        .length,
                    draws: filteredGames.filter((g) => g.result === "draw")
                        .length,
                    games: filteredGames,
                };
                promises.push(setDoc(doc(db, "teams", team.id), updated));
            }
        }

        try {
            await Promise.all(promises);
            fetchAll();
        } catch (e) {
            console.error(e);
            alert("삭제 중 오류가 발생했습니다.");
        }
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

                <div className="grid grid-cols-2 gap-4 mb-6">
                    {TEAMS.map((t) => {
                        const d = teamData[t.id];
                        const wins = d?.wins ?? 0;
                        const losses = d?.losses ?? 0;
                        const draws = d?.draws ?? 0;
                        const validGames = wins + losses;
                        const pct =
                            validGames > 0
                                ? ((wins / validGames) * 100).toFixed(1)
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
                                            ["승", wins],
                                            ["패", losses],
                                            ["무", draws],
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
                            <input
                                type="date"
                                className="w-full p-2 border rounded text-sm mb-2"
                                value={form.date}
                                onChange={(e) =>
                                    setForm({ ...form, date: e.target.value })
                                }
                            />

                            {/* 팀 vs 상대팀 드롭다운 */}
                            <div className="flex gap-2 items-center bg-slate-50 p-2 rounded-lg border border-slate-100">
                                <select
                                    className="flex-1 p-2 border rounded text-sm bg-white font-bold"
                                    value={selectedTeam}
                                    onChange={(e) =>
                                        setSelectedTeam(
                                            e.target.value as TeamId,
                                        )
                                    }
                                >
                                    {TEAMS.map((t) => (
                                        <option key={t.id} value={t.id}>
                                            {t.short}
                                        </option>
                                    ))}
                                </select>
                                <span className="text-xs font-black text-slate-300">
                                    VS
                                </span>
                                <select
                                    className="flex-1 p-2 border rounded text-sm bg-white font-bold"
                                    value={opponentType}
                                    onChange={(e) =>
                                        setOpponentType(
                                            e.target.value as
                                                | "league"
                                                | "external",
                                        )
                                    }
                                >
                                    <option value="league">
                                        {
                                            TEAMS.find(
                                                (t) => t.id !== selectedTeam,
                                            )?.short
                                        }
                                    </option>
                                    <option value="external">
                                        외부팀 (직접입력)
                                    </option>
                                </select>
                            </div>

                            {opponentType === "external" && (
                                <input
                                    type="text"
                                    placeholder="외부팀 이름"
                                    className="w-full p-2 border rounded text-sm mt-2"
                                    value={externalOpponent}
                                    onChange={(e) =>
                                        setExternalOpponent(e.target.value)
                                    }
                                />
                            )}

                            <div className="flex gap-2 mt-2">
                                <input
                                    type="number"
                                    min="0"
                                    placeholder="우리 점수"
                                    className="w-1/2 p-2 border rounded text-sm text-center font-bold"
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
                                    min="0"
                                    placeholder="상대 점수"
                                    className="w-1/2 p-2 border rounded text-sm text-center font-bold"
                                    value={form.opponentScore}
                                    onChange={(e) =>
                                        setForm({
                                            ...form,
                                            opponentScore: e.target.value,
                                        })
                                    }
                                />
                            </div>

                            <hr className="border-slate-100 my-4" />
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
                                min="0"
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
                                className="w-full bg-blue-600 text-white p-3 rounded-lg font-bold text-sm disabled:opacity-40 hover:bg-blue-700 transition-colors shadow-md mt-2"
                            >
                                {saving ? "저장 중..." : "경기 기록 추가하기"}
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
                                        매치업
                                    </th>
                                    <th className="p-3 text-xs font-bold text-slate-400">
                                        스코어
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
                                {allGames.length === 0 && (
                                    <tr>
                                        <td
                                            colSpan={6}
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
                                        <React.Fragment key={g.id}>
                                            <tr
                                                className="border-b hover:bg-slate-50 transition-colors cursor-pointer"
                                                onClick={() =>
                                                    setExpandedId(
                                                        isOpen ? null : g.id,
                                                    )
                                                }
                                            >
                                                <td className="p-3 text-sm text-slate-500 whitespace-nowrap">
                                                    {g.date.substring(5)}
                                                </td>
                                                <td className="p-3 text-sm flex items-center gap-2">
                                                    <span
                                                        className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${TEAM_BADGE[g.teamId]}`}
                                                    >
                                                        {g.teamId === "coupang"
                                                            ? "쿠팡"
                                                            : "용키"}
                                                    </span>
                                                    <span className="text-xs font-black text-slate-300">
                                                        vs
                                                    </span>
                                                    <span className="font-bold">
                                                        {g.opponent}
                                                    </span>
                                                </td>
                                                <td className="p-3 text-sm font-mono font-bold whitespace-nowrap">
                                                    {g.myScore} :{" "}
                                                    {g.opponentScore}
                                                </td>
                                                <td className="p-3">
                                                    <span
                                                        className={`text-xs font-bold px-2 py-0.5 rounded-full ${badge.cls}`}
                                                    >
                                                        {badge.label}
                                                    </span>
                                                </td>
                                                <td className="p-3"></td>
                                                <td className="p-3 text-right whitespace-nowrap">
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleDeleteGame(
                                                                g.id,
                                                            );
                                                        }}
                                                        className="text-red-300 hover:text-red-500 text-xs px-2"
                                                    >
                                                        삭제
                                                    </button>
                                                </td>
                                            </tr>

                                            {/* 아코디언 상세 */}
                                            {isOpen && (
                                                <tr className="border-b bg-slate-50/80">
                                                    <td
                                                        colSpan={6}
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
                                                                            ?.hits
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
    <div className="bg-white rounded-lg border border-slate-200 p-3 shadow-sm">
        <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400 mb-1">
            {label}
        </p>
        <p className="text-sm font-medium text-slate-800 break-words">
            {value}
        </p>
    </div>
);

export default TeamRecord;
