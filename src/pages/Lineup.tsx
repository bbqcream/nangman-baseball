import { useState, useEffect } from "react";
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

// --- 시간 체크 유틸리티 ---
const checkIsTimeOut = () => {
    const now = new Date();
    // 한국 시간 기준으로 체크 (서버 시간이 UTC일 경우를 대비해 현지 시간 활용)
    const hour = now.getHours();
    return hour >= 17; // 17시(오후 5시) 이상이면 true
};

const POSITIONS = [
    "투수",
    "1루수",
    "2루수",
    "유격수",
    "3루수",
    "포수",
    "지명타자",
];
const POSITION_MAP: { [key: string]: { abbr: string; color: string } } = {
    투수: { abbr: "P", color: "text-red-600 font-black" },
    "1루수": { abbr: "1B", color: "text-gray-700" },
    "2루수": { abbr: "2B", color: "text-gray-700" },
    "3루수": { abbr: "3B", color: "text-gray-700" },
    유격수: { abbr: "SS", color: "text-gray-700" },
    포수: { abbr: "C", color: "text-gray-700" },
    지명타자: { abbr: "DH", color: "text-gray-700" },
};

const getStatLabel = (p: any) => {
    if (!p || !p.batting) return "OPS 0.000";
    const { batting } = p;
    if (batting.atBats === 0) return "OPS 0.000";
    const obp =
        (batting.hits + batting.walks + batting.hbp) /
        (batting.atBats + batting.walks + batting.hbp || 1);
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
    return `OPS ${(obp + slg).toFixed(3)}`;
};

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
            className={`flex-1 min-w-87.5 bg-white border-2 border-gray-200 rounded-2xl shadow-sm overflow-hidden transition-all ${isLocked ? "opacity-95" : "opacity-100"}`}
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

            {lineup.map((player: any) => {
                const posInfo = POSITION_MAP[player.position] || {
                    abbr: player.position,
                    color: "text-gray-400",
                };
                return (
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
                                                const teamTag =
                                                    p.teamId === "mercenary"
                                                        ? "용병"
                                                        : p.teamId === "coupang"
                                                          ? "쿠팡"
                                                          : "용키";
                                                const teamColor =
                                                    p.teamId === "mercenary"
                                                        ? "bg-slate-100 text-slate-500"
                                                        : p.teamId === "coupang"
                                                          ? "bg-amber-100 text-amber-600"
                                                          : "bg-blue-100 text-blue-600";
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
                                                                    statLabel:
                                                                        stat,
                                                                },
                                                            );
                                                            setSearchTerm({
                                                                ...searchTerm,
                                                                [player.id]:
                                                                    p.name,
                                                            });
                                                            setShowDropdown(
                                                                null,
                                                            );
                                                        }}
                                                    >
                                                        <div className="flex items-center gap-2">
                                                            <span className="font-bold text-sm">
                                                                {p.name}
                                                            </span>
                                                            <span
                                                                className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${teamColor}`}
                                                            >
                                                                {teamTag}
                                                            </span>
                                                        </div>
                                                        <span className="text-blue-600 font-black text-[10px]">
                                                            {stat}
                                                        </span>
                                                    </div>
                                                );
                                            })}
                                    </div>
                                )}
                        </div>
                        <div className="col-span-4 text-center">
                            {isLocked ? (
                                <span
                                    className={`text-sm font-bold ${posInfo.color}`}
                                >
                                    {posInfo.abbr}
                                </span>
                            ) : (
                                <select
                                    value={player.position}
                                    onChange={(e) =>
                                        handleUpdate(side, player.id, {
                                            position: e.target.value,
                                        })
                                    }
                                    className="w-full p-2 text-xs rounded-lg appearance-none bg-gray-100 font-bold"
                                >
                                    <option value="">선택</option>
                                    {POSITIONS.map((pos) => (
                                        <option key={pos} value={pos}>
                                            {pos} ({POSITION_MAP[pos]?.abbr})
                                        </option>
                                    ))}
                                </select>
                            )}
                        </div>
                        <div className="col-span-1 text-center">
                            {!isLocked && player.order > 5 && (
                                <button
                                    onClick={() =>
                                        removePlayer(side, player.id)
                                    }
                                    className="text-red-300 hover:text-red-600"
                                >
                                    ×
                                </button>
                            )}
                        </div>
                    </div>
                );
            })}
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
    const [isTimeOut, setIsTimeOut] = useState(false); // 5시 경과 여부 상태 추가
    const [loading, setLoading] = useState(true);
    const [exists, setExists] = useState(false);
    const [dbPlayers, setDbPlayers] = useState<any[]>([]);
    const [awayLineup, setAwayLineup] = useState<any[]>([]);
    const [homeLineup, setHomeLineup] = useState<any[]>([]);

    useEffect(() => {
        const init = async () => {
            try {
                // 1. 시간 확인
                const timeOut = checkIsTimeOut();
                setIsTimeOut(timeOut);

                const playerSnap = await getDocs(collection(db, "players"));
                setDbPlayers(
                    playerSnap.docs.map((doc) => ({
                        id: doc.id,
                        ...doc.data(),
                    })),
                );
                const docSnap = await getDoc(doc(db, "lineups", dateId));
                if (docSnap.exists()) {
                    const data = docSnap.data();
                    setAwayLineup(data.awayLineup || []);
                    setHomeLineup(data.homeLineup || []);
                    // DB 설정이 풀려있더라도 시간이 지났으면 강제로 Lock
                    setIsLocked(timeOut ? true : data.isLocked || false);
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

    const handleUpdate = (side: "away" | "home", id: number, updates: any) => {
        if (checkIsTimeOut()) return; // 시간 초과 시 업데이트 차단
        const setter = side === "away" ? setAwayLineup : setHomeLineup;
        setter((prev) =>
            prev.map((p) => (p.id === id ? { ...p, ...updates } : p)),
        );
    };

    const saveToFirebase = async (lockState: boolean) => {
        if (checkIsTimeOut()) {
            alert("오후 5시 이후에는 라인업을 수정할 수 없습니다.");
            return;
        }
        await setDoc(doc(db, "lineups", dateId), {
            awayLineup,
            homeLineup,
            isLocked: lockState,
            updatedAt: Timestamp.now(),
        });
    };

    const addPlayer = (side: "away" | "home") => {
        if (checkIsTimeOut()) return;
        const setter = side === "away" ? setAwayLineup : setHomeLineup;
        setter((prev) => [
            ...prev,
            { id: Date.now(), order: prev.length + 1, name: "", position: "" },
        ]);
    };

    const removePlayer = (side: "away" | "home", id: number) => {
        if (checkIsTimeOut()) return;
        const setter = side === "away" ? setAwayLineup : setHomeLineup;
        setter((prev) =>
            prev
                .filter((p) => p.id !== id)
                .map((p, i) => ({ ...p, order: i + 1 })),
        );
    };

    const createGame = async () => {
        if (checkIsTimeOut()) {
            alert("오후 5시 이후에는 새로운 라인업을 생성할 수 없습니다.");
            return;
        }
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
                    {/* 5시 이후 경고 문구 추가 */}
                    <div className="h-1.5 w-16 bg-blue-600 mx-auto mt-3"></div>
                </div>
                {!exists ? (
                    <div className="bg-white rounded-3xl p-16 text-center border-2 border-dashed">
                        <button
                            onClick={createGame}
                            disabled={isTimeOut}
                            className={`px-10 py-4 rounded-2xl font-black text-xl text-white ${isTimeOut ? "bg-gray-400 cursor-not-allowed" : "bg-blue-600"}`}
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
                                isLocked={isLocked || isTimeOut}
                                handleUpdate={handleUpdate}
                                addPlayer={addPlayer}
                                removePlayer={removePlayer}
                                dbPlayers={dbPlayers}
                            />
                            <LineupCard
                                title="대구 용키즈"
                                lineup={homeLineup}
                                side="home"
                                bgColor="bg-blue-800"
                                isLocked={isLocked || isTimeOut}
                                handleUpdate={handleUpdate}
                                addPlayer={addPlayer}
                                removePlayer={removePlayer}
                                dbPlayers={dbPlayers}
                            />
                        </div>
                        <div className="mt-12 max-w-md mx-auto">
                            {!isTimeOut ? (
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
                            ) : (
                                <></>
                            )}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default Lineup;
