import React, { useState, useEffect } from "react";
import { db } from "../firebase/firebase";
import {
    doc,
    getDoc,
    setDoc,
    collection,
    getDocs,
    Timestamp,
} from "firebase/firestore";
import { useSearchParams } from "react-router-dom";

// 포지션 정의
const POSITIONS = [
    "투수",
    "1루수",
    "2루수",
    "유격수",
    "3루수",
    "외야수",
    "지명타자",
];

// --- 통계 계산 유틸리티 (제공해주신 로직 반영) ---
const getStatLabel = (p: any) => {
    if (!p) return "";

    // OPS 계산 (공통)
    const { batting } = p;
    let opsStr = "OPS 0.000";
    if (batting && batting.atBats > 0) {
        const obp =
            batting.atBats + batting.walks + batting.hbp > 0
                ? (batting.hits + batting.walks + batting.hbp) /
                  (batting.atBats + batting.walks + batting.hbp)
                : 0;
        const singles =
            batting.hits -
            ((batting.doubles || 0) +
                (batting.triples || 0) +
                (batting.homeRuns || 0));
        const slg =
            (singles +
                (batting.doubles || 0) * 2 +
                (batting.triples || 0) * 3 +
                (batting.homeRuns || 0) * 4) /
            batting.atBats;
        opsStr = `OPS ${(obp + slg).toFixed(3)}`;
    }
    return opsStr;
};

interface Player {
    id: number;
    order: number;
    name: string;
    position: string;
    statLabel?: string;
}

const LineupCard = ({
    title,
    lineup,
    side,
    bgColor,
    isLocked,
    handleUpdate,
    addPlayer,
    removePlayer,
    dbPlayers,
}: any) => {
    const [searchTerm, setSearchTerm] = useState<{ [key: number]: string }>({});
    const [showDropdown, setShowDropdown] = useState<number | null>(null);

    return (
        <div
            className={`flex-1 min-w-[350px] bg-white border-2 border-gray-200 rounded-2xl shadow-sm overflow-hidden transition-all ${isLocked ? "opacity-95" : "opacity-100"}`}
        >
            <div
                className={`${bgColor} text-white p-4 text-center font-black text-xl tracking-widest uppercase`}
            >
                {title} {isLocked && "🔒"}
            </div>

            <div className="grid grid-cols-12 bg-gray-50 border-b text-center font-bold text-[10px] py-2 text-gray-500 uppercase tracking-tighter">
                <div className="col-span-1">#</div>
                <div className="col-span-6">선수명 (STAT)</div>
                <div className="col-span-4">수비위치</div>
                <div className="col-span-1"></div>
            </div>

            {lineup.map((player: Player) => (
                <div
                    key={player.id}
                    className="grid grid-cols-12 items-center border-b border-gray-50 p-2 gap-1 relative group"
                >
                    <div className="col-span-1 text-center font-black text-blue-900 text-lg">
                        {player.order}
                    </div>

                    <div className="col-span-6 relative">
                        <input
                            type="text"
                            value={
                                isLocked
                                    ? player.name
                                        ? `${player.name} (${player.statLabel || ""})`
                                        : ""
                                    : (searchTerm[player.id] ?? player.name)
                            }
                            disabled={isLocked}
                            placeholder="선수 검색"
                            onChange={(e) => {
                                setSearchTerm({
                                    ...searchTerm,
                                    [player.id]: e.target.value,
                                });
                                setShowDropdown(player.id);
                            }}
                            className={`w-full p-2 rounded-lg text-sm font-bold ${isLocked ? "bg-transparent border-none text-gray-800" : "bg-blue-50 outline-none"}`}
                        />

                        {!isLocked &&
                            showDropdown === player.id &&
                            searchTerm[player.id] && (
                                <div className="absolute z-50 w-full bg-white border border-gray-200 rounded-lg shadow-2xl max-h-48 overflow-y-auto mt-1">
                                    {dbPlayers
                                        .filter((p: any) =>
                                            p.name.includes(
                                                searchTerm[player.id],
                                            ),
                                        )
                                        .map((p: any) => {
                                            const stat = getStatLabel(p);
                                            return (
                                                <div
                                                    key={p.id}
                                                    className="px-3 py-2 hover:bg-blue-50 cursor-pointer flex justify-between items-center border-b last:border-none"
                                                    onClick={() => {
                                                        handleUpdate(
                                                            side,
                                                            player.id,
                                                            {
                                                                name: p.name,
                                                                position:
                                                                    p.position ||
                                                                    "",
                                                                statLabel: stat,
                                                            },
                                                        );
                                                        setSearchTerm({
                                                            ...searchTerm,
                                                            [player.id]: p.name,
                                                        });
                                                        setShowDropdown(null);
                                                    }}
                                                >
                                                    <span className="font-bold text-sm">
                                                        {p.name}
                                                    </span>
                                                    <span className="text-blue-600 font-black text-[10px]">
                                                        {stat}
                                                    </span>
                                                </div>
                                            );
                                        })}
                                </div>
                            )}
                    </div>

                    <div className="col-span-4">
                        <select
                            value={player.position}
                            disabled={isLocked}
                            onChange={(e) =>
                                handleUpdate(side, player.id, {
                                    position: e.target.value,
                                })
                            }
                            className={`w-full p-2 text-xs rounded-lg appearance-none ${isLocked ? "bg-transparent border-none font-bold text-gray-600 text-center" : "bg-gray-100"}`}
                        >
                            <option value="">선택</option>
                            {POSITIONS.map((pos) => (
                                <option key={pos} value={pos}>
                                    {pos}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="col-span-1 text-center">
                        {!isLocked && player.order > 5 && (
                            <button
                                onClick={() => removePlayer(side, player.id)}
                                className="text-red-300 hover:text-red-600"
                            >
                                ×
                            </button>
                        )}
                    </div>
                </div>
            ))}

            {!isLocked && (
                <button
                    onClick={() => addPlayer(side)}
                    className="w-full py-4 text-xs text-gray-400 font-bold hover:bg-gray-50 transition border-t border-dashed"
                >
                    + 타순 추가
                </button>
            )}
        </div>
    );
};

const Lineup = () => {
    const [searchParams] = useSearchParams();
    const dateId =
        searchParams.get("date") || new Date().toISOString().split("T")[0];

    const [isLocked, setIsLocked] = useState(false);
    const [loading, setLoading] = useState(true);
    const [exists, setExists] = useState(false);
    const [dbPlayers, setDbPlayers] = useState<any[]>([]);
    const [awayLineup, setAwayLineup] = useState<Player[]>([]);
    const [homeLineup, setHomeLineup] = useState<Player[]>([]);

    useEffect(() => {
        const init = async () => {
            setLoading(true);
            try {
                // 1. DB 선수 데이터 로드
                const playerSnap = await getDocs(collection(db, "players"));
                setDbPlayers(
                    playerSnap.docs.map((doc) => ({
                        id: doc.id,
                        ...doc.data(),
                    })),
                );

                // 2. 라인업 데이터 로드
                const docSnap = await getDoc(doc(db, "lineups", dateId));
                if (docSnap.exists()) {
                    const data = docSnap.data();
                    setAwayLineup(data.awayLineup || []);
                    setHomeLineup(data.homeLineup || []);
                    setIsLocked(data.isLocked || false);
                    setExists(true);
                }
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };
        init();
    }, [dateId]);

    const handleUpdate = (
        side: "away" | "home",
        id: number,
        updates: Partial<Player>,
    ) => {
        const setter = side === "away" ? setAwayLineup : setHomeLineup;
        setter((prev) =>
            prev.map((p) => (p.id === id ? { ...p, ...updates } : p)),
        );
    };

    const saveToFirebase = async (lockState: boolean) => {
        await setDoc(doc(db, "lineups", dateId), {
            awayLineup,
            homeLineup,
            isLocked: lockState,
            updatedAt: Timestamp.now(),
        });
    };

    const addPlayer = (side: "away" | "home") => {
        const setter = side === "away" ? setAwayLineup : setHomeLineup;
        setter((prev) => [
            ...prev,
            { id: Date.now(), order: prev.length + 1, name: "", position: "" },
        ]);
    };

    const removePlayer = (side: "away" | "home", id: number) => {
        const setter = side === "away" ? setAwayLineup : setHomeLineup;
        setter((prev) =>
            prev
                .filter((p) => p.id !== id)
                .map((p, i) => ({ ...p, order: i + 1 })),
        );
    };

    const createGame = async () => {
        const init = () =>
            Array.from({ length: 9 }, (_, i) => ({
                id: Math.random(),
                order: i + 1,
                name: "",
                position: "",
            }));
        const a = init();
        const h = init();
        await setDoc(doc(db, "lineups", dateId), {
            awayLineup: a,
            homeLineup: h,
            isLocked: false,
            updatedAt: Timestamp.now(),
        });
        setAwayLineup(a);
        setHomeLineup(h);
        setExists(true);
    };

    if (loading)
        return (
            <div className="p-20 text-center font-bold text-gray-400">
                Loading...
            </div>
        );

    return (
        <div className="min-h-screen bg-gray-100 p-4 pb-20 font-sans">
            <div className="max-w-5xl mx-auto">
                <div className="text-center mb-10">
                    <p className="text-blue-600 font-bold tracking-widest text-sm mb-1 uppercase">
                        {dateId}
                    </p>
                    <h1 className="text-4xl font-black italic text-gray-900 uppercase tracking-tighter">
                        Match Lineup
                    </h1>
                    <div className="h-1.5 w-16 bg-blue-600 mx-auto mt-3"></div>
                </div>

                {!exists ? (
                    <div className="bg-white rounded-3xl p-16 text-center border-2 border-dashed">
                        <button
                            onClick={createGame}
                            className="bg-blue-600 text-white px-10 py-4 rounded-2xl font-black text-xl"
                        >
                            라인업 생성하기
                        </button>
                    </div>
                ) : (
                    <>
                        <div className="flex flex-wrap gap-8 justify-center">
                            <LineupCard
                                title="Coupang daylaborers"
                                lineup={awayLineup}
                                side="away"
                                bgColor="bg-slate-700"
                                isLocked={isLocked}
                                handleUpdate={handleUpdate}
                                addPlayer={addPlayer}
                                removePlayer={removePlayer}
                                dbPlayers={dbPlayers}
                            />
                            <LineupCard
                                title="Daegu Yongkids"
                                lineup={homeLineup}
                                side="home"
                                bgColor="bg-blue-800"
                                isLocked={isLocked}
                                handleUpdate={handleUpdate}
                                addPlayer={addPlayer}
                                removePlayer={removePlayer}
                                dbPlayers={dbPlayers}
                            />
                        </div>
                        <div className="mt-12 max-w-md mx-auto">
                            <button
                                onClick={() => {
                                    setIsLocked(!isLocked);
                                    saveToFirebase(!isLocked);
                                }}
                                className={`w-full py-5 rounded-2xl font-black text-xl shadow-2xl transition ${isLocked ? "bg-gray-900 text-white" : "bg-red-600 text-white"}`}
                            >
                                {isLocked
                                    ? "🔄 라인업 수정하기"
                                    : "✅ 라인업 확정 및 저장"}
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default Lineup;
