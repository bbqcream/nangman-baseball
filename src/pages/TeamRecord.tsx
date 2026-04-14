import React, { useEffect, useState } from "react";
import { doc, getDoc, updateDoc, setDoc, Timestamp } from "firebase/firestore";
import { db } from "../firebase/firebase";

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
    { id: "coupang", label: "쿠팡 일용직스", color: "amber" },
    { id: "yongkids", label: "Daegu Yongkids", color: "blue" },
] as const;

const winRate = (t: TeamData) => {
    const total = t.wins + t.losses + t.draws;
    if (total === 0) return "-";
    return (t.wins / total).toFixed(3);
};

const resultLabel = (r: Game["result"]) =>
    ({ win: "승", loss: "패", draw: "무" })[r];

const resultColor = (r: Game["result"]) =>
    ({
        win: "bg-teal-50 text-teal-800 dark:bg-teal-950 dark:text-teal-300",
        loss: "bg-red-50 text-red-800 dark:bg-red-950 dark:text-red-300",
        draw: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
    })[r];

const TeamRecord: React.FC = () => {
    const [teamData, setTeamData] = useState<Record<string, TeamData>>({});
    const [selectedTeam, setSelectedTeam] = useState<"coupang" | "yongkids">(
        "coupang",
    );
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);

    // 게임 입력 폼
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
            if (snap.exists()) {
                results[team.id] = snap.data() as TeamData;
            } else {
                results[team.id] = { wins: 0, losses: 0, draws: 0, games: [] };
            }
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
        const updated: TeamData = {
            wins: current.wins + (result === "win" ? 1 : 0),
            losses: current.losses + (result === "loss" ? 1 : 0),
            draws: current.draws + (result === "draw" ? 1 : 0),
            games: [newGame, ...current.games],
        };

        setSaving(true);
        await setDoc(doc(db, "teams", selectedTeam), updated);
        setSaving(false);
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
        setForm({
            date: new Date().toISOString().slice(0, 10),
            opponent: "",
            myScore: "",
            opponentScore: "",
        });
        fetchAll();
    };

    const handleDeleteGame = async (gameId: string) => {
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

    const data = teamData[selectedTeam];
    const labelCls =
        "text-[11px] font-medium uppercase tracking-[0.08em] text-slate-400 dark:text-slate-500";
    const inputCls =
        "w-full px-3 py-2 text-[13px] bg-transparent border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:border-slate-400 dark:focus:border-slate-500 transition-colors text-slate-900 dark:text-slate-100";

    return (
        <div className="min-h-screen bg-[#f9f9f8] dark:bg-slate-950 p-6">
            <div className="max-w-5xl mx-auto">
                <div className="mb-6">
                    <p className="text-[11px] font-medium tracking-[0.12em] uppercase text-slate-400 mb-1">
                        Nangman Baseball League
                    </p>
                    <h1 className="text-2xl font-medium text-slate-900 dark:text-slate-100 tracking-tight">
                        팀 승률
                    </h1>
                </div>

                {/* 팀 탭 */}
                <div className="flex gap-2 mb-4">
                    {TEAMS.map((t) => {
                        const d = teamData[t.id];
                        return (
                            <button
                                key={t.id}
                                onClick={() => setSelectedTeam(t.id)}
                                className={[
                                    "flex items-center gap-3 px-4 py-3 rounded-xl border text-left transition-colors",
                                    selectedTeam === t.id
                                        ? "border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900"
                                        : "border-transparent bg-transparent hover:bg-white dark:hover:bg-slate-900",
                                ].join(" ")}
                            >
                                <div>
                                    <p className="text-[13px] font-medium text-slate-800 dark:text-slate-200">
                                        {t.label}
                                    </p>
                                    {d && (
                                        <p className="text-[11px] text-slate-400">
                                            {d.wins}승 {d.losses}패 {d.draws}무
                                            · 승률 {winRate(d)}
                                        </p>
                                    )}
                                </div>
                            </button>
                        );
                    })}
                </div>

                <div className="flex gap-3">
                    {/* 좌측: 경기 추가 폼 + 요약 */}
                    <div className="w-72 flex-shrink-0 space-y-3">
                        {/* 승률 요약 카드 */}
                        {data && (
                            <div className="border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 p-5">
                                <p className={`${labelCls} mb-3`}>시즌 요약</p>
                                <div className="grid grid-cols-2 gap-2">
                                    {[
                                        { label: "승률", val: winRate(data) },
                                        {
                                            label: "경기수",
                                            val:
                                                data.wins +
                                                data.losses +
                                                data.draws,
                                        },
                                        { label: "승", val: data.wins },
                                        { label: "패", val: data.losses },
                                        { label: "무", val: data.draws },
                                    ].map(({ label, val }) => (
                                        <div
                                            key={label}
                                            className="bg-slate-50 dark:bg-slate-800/60 rounded-lg p-3"
                                        >
                                            <p className={`${labelCls} mb-1`}>
                                                {label}
                                            </p>
                                            <p className="text-[20px] font-medium text-slate-900 dark:text-slate-100 tabular-nums leading-tight">
                                                {val}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* 경기 추가 폼 */}
                        <div className="border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 p-5">
                            <p className={`${labelCls} mb-4`}>경기 추가</p>
                            <div className="space-y-3">
                                <div>
                                    <label
                                        className={`${labelCls} mb-1.5 block`}
                                    >
                                        날짜
                                    </label>
                                    <input
                                        type="date"
                                        className={inputCls}
                                        value={form.date}
                                        onChange={(e) =>
                                            setForm((f) => ({
                                                ...f,
                                                date: e.target.value,
                                            }))
                                        }
                                    />
                                </div>
                                <div>
                                    <label
                                        className={`${labelCls} mb-1.5 block`}
                                    >
                                        상대팀
                                    </label>
                                    <input
                                        type="text"
                                        className={inputCls}
                                        placeholder="팀명 입력"
                                        value={form.opponent}
                                        onChange={(e) =>
                                            setForm((f) => ({
                                                ...f,
                                                opponent: e.target.value,
                                            }))
                                        }
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <label
                                            className={`${labelCls} mb-1.5 block`}
                                        >
                                            우리 점수
                                        </label>
                                        <input
                                            type="number"
                                            min={0}
                                            className={inputCls}
                                            placeholder="0"
                                            value={form.myScore}
                                            onChange={(e) =>
                                                setForm((f) => ({
                                                    ...f,
                                                    myScore: e.target.value,
                                                }))
                                            }
                                            onFocus={(e) => e.target.select()}
                                        />
                                    </div>
                                    <div>
                                        <label
                                            className={`${labelCls} mb-1.5 block`}
                                        >
                                            상대 점수
                                        </label>
                                        <input
                                            type="number"
                                            min={0}
                                            className={inputCls}
                                            placeholder="0"
                                            value={form.opponentScore}
                                            onChange={(e) =>
                                                setForm((f) => ({
                                                    ...f,
                                                    opponentScore:
                                                        e.target.value,
                                                }))
                                            }
                                            onFocus={(e) => e.target.select()}
                                        />
                                    </div>
                                </div>
                                <div className="flex items-center justify-between pt-1">
                                    <span
                                        className={`text-[12px] font-medium text-teal-500 transition-opacity duration-300 ${saved ? "opacity-100" : "opacity-0"}`}
                                    >
                                        추가 완료
                                    </span>
                                    <button
                                        onClick={handleAddGame}
                                        disabled={
                                            saving ||
                                            !form.opponent.trim() ||
                                            form.myScore === "" ||
                                            form.opponentScore === ""
                                        }
                                        className="px-4 py-2 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-[13px] font-medium rounded-lg hover:opacity-80 transition-opacity disabled:opacity-30"
                                    >
                                        {saving ? "저장 중..." : "추가"}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* 우측: 경기 기록 목록 */}
                    <div className="flex-1 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-slate-900">
                        <div className="px-5 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                            <span className={labelCls}>경기 기록</span>
                            <span className="text-[11px] text-slate-400">
                                {data?.games.length ?? 0}경기
                            </span>
                        </div>

                        {data?.games.length ? (
                            <table className="w-full border-collapse">
                                <thead>
                                    <tr className="border-b border-slate-100 dark:border-slate-800">
                                        {[
                                            "날짜",
                                            "상대팀",
                                            "점수",
                                            "결과",
                                            "",
                                        ].map((h) => (
                                            <th
                                                key={h}
                                                className="text-[11px] font-medium uppercase tracking-[0.07em] text-slate-400 px-5 py-2.5 text-left"
                                            >
                                                {h}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {data.games.map((g) => (
                                        <tr
                                            key={g.id}
                                            className="border-b border-slate-100 dark:border-slate-800/60 last:border-0 hover:bg-slate-50/70 dark:hover:bg-slate-800/30 transition-colors"
                                        >
                                            <td className="px-5 py-3 text-[13px] text-slate-500 dark:text-slate-400 tabular-nums">
                                                {g.date}
                                            </td>
                                            <td className="px-5 py-3 text-[13px] font-medium text-slate-800 dark:text-slate-200">
                                                {g.opponent}
                                            </td>
                                            <td className="px-5 py-3 text-[13px] tabular-nums text-slate-700 dark:text-slate-300">
                                                {g.myScore} : {g.opponentScore}
                                            </td>
                                            <td className="px-5 py-3">
                                                <span
                                                    className={`text-[11px] font-medium px-2 py-1 rounded ${resultColor(g.result)}`}
                                                >
                                                    {resultLabel(g.result)}
                                                </span>
                                            </td>
                                            <td className="px-5 py-3 text-right">
                                                <button
                                                    onClick={() =>
                                                        handleDeleteGame(g.id)
                                                    }
                                                    className="text-[11px] text-slate-300 dark:text-slate-700 hover:text-red-400 dark:hover:text-red-500 transition-colors"
                                                >
                                                    삭제
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        ) : (
                            <div className="flex items-center justify-center h-48 text-[13px] text-slate-400">
                                아직 경기 기록이 없습니다
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TeamRecord;
