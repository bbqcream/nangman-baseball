import { useState, useEffect } from "react";
import { db } from "../firebase/firebase";
import { doc, getDoc, setDoc, Timestamp } from "firebase/firestore";

const POSITIONS = [
    "투수",
    "1루수",
    "2루수",
    "유격수",
    "3루수",
    "외야수",
    "지명타자",
];

interface Player {
    id: number;
    order: number;
    name: string;
    position: string;
}

const Lineup = () => {
    const [isLocked, setIsLocked] = useState(false);
    const [loading, setLoading] = useState(true);
    const today = new Date().toLocaleDateString("ko-KR", {
        year: "numeric",
        month: "long",
        day: "numeric",
        weekday: "short",
    });

    const dateId = new Date().toISOString().split("T")[0];

    const createInitialLineup = () =>
        Array.from({ length: 5 }, (_, i) => ({
            id: Math.random(),
            order: i + 1,
            name: "",
            position: "",
        }));

    const [awayLineup, setAwayLineup] = useState<Player[]>(
        createInitialLineup(),
    );
    const [homeLineup, setHomeLineup] = useState<Player[]>(
        createInitialLineup(),
    );

    // --- 1. 데이터 불러오기 (Read) ---
    useEffect(() => {
        const fetchLineup = async () => {
            try {
                const docRef = doc(db, "lineups", dateId);
                const docSnap = await getDoc(docRef);

                if (docSnap.exists()) {
                    const data = docSnap.data();
                    setAwayLineup(data.awayLineup);
                    setHomeLineup(data.homeLineup);
                    setIsLocked(data.isLocked || false);
                }
            } catch (e) {
                console.error("데이터 로드 실패:", e);
            } finally {
                setLoading(false);
            }
        };
        fetchLineup();
    }, [dateId]);

    // --- 2. 데이터 저장하기 (Write/Update) ---
    const saveToFirebase = async (lockState: boolean) => {
        try {
            await setDoc(doc(db, "lineups", dateId), {
                awayLineup,
                homeLineup,
                isLocked: lockState,
                updatedAt: Timestamp.now(),
            });
        } catch (e) {
            console.error("저장 실패:", e);
            alert("저장 중 오류가 발생했습니다.");
        }
    };

    const toggleLock = async () => {
        const nextState = !isLocked;
        setIsLocked(nextState);
        await saveToFirebase(nextState); // 상태 변경 시 자동으로 DB 반영
    };

    // 기존 업데이트 로직들
    const addPlayer = (side: "away" | "home") => {
        const setter = side === "away" ? setAwayLineup : setHomeLineup;
        const current = side === "away" ? awayLineup : homeLineup;
        setter([
            ...current,
            {
                id: Date.now(),
                order: current.length + 1,
                name: "",
                position: "",
            },
        ]);
    };

    const removePlayer = (side: "away" | "home", id: number) => {
        const setter = side === "away" ? setAwayLineup : setHomeLineup;
        const current = side === "away" ? awayLineup : homeLineup;
        const filtered = current.filter((p) => p.id !== id);
        setter(filtered.map((p, i) => ({ ...p, order: i + 1 })));
    };

    const handleUpdate = (
        side: "away" | "home",
        id: number,
        field: string,
        value: string,
    ) => {
        const setter = side === "away" ? setAwayLineup : setHomeLineup;
        const current = side === "away" ? awayLineup : homeLineup;
        setter(
            current.map((p) => (p.id === id ? { ...p, [field]: value } : p)),
        );
    };

    if (loading)
        return (
            <div className="p-10 text-center font-bold">
                라인업 불러오는 중...
            </div>
        );

    return (
        <div className="min-h-screen bg-gray-100 p-4 pb-20">
            <div className="max-w-5xl mx-auto">
                <div className="text-center mb-8">
                    <p className="text-blue-600 font-bold tracking-tighter">
                        {today}
                    </p>
                    <h1 className="text-4xl font-black italic text-gray-900 uppercase">
                        Match Lineup
                    </h1>
                    <div className="h-1 w-20 bg-blue-600 mx-auto mt-2"></div>
                </div>

                <div className="flex flex-wrap gap-6 justify-center">
                    <LineupCard
                        title="쿠팡 일용직스"
                        lineup={awayLineup}
                        side="away"
                        bgColor="bg-gray-700"
                        isLocked={isLocked}
                        handleUpdate={handleUpdate}
                        addPlayer={addPlayer}
                        removePlayer={removePlayer}
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
                    />
                </div>

                <div className="mt-10 max-w-md mx-auto">
                    <button
                        onClick={toggleLock}
                        className={`w-full py-4 rounded-xl font-black text-xl shadow-lg transition transform active:scale-95 ${
                            isLocked
                                ? "bg-gray-800 text-white hover:bg-gray-900"
                                : "bg-red-600 text-white hover:bg-red-700"
                        }`}
                    >
                        {isLocked ? "라인업 수정하기" : "라인업 확정 및 저장"}
                    </button>
                </div>
            </div>
        </div>
    );
};

// LineupCard 컴포넌트는 이전과 동일 (바깥에 위치해야 함)
const LineupCard = ({
    title,
    lineup,
    side,
    bgColor,
    isLocked,
    handleUpdate,
    addPlayer,
    removePlayer,
}: any) => (
    <div
        className={`flex-1 min-w-[350px] bg-white border-2 border-gray-200 rounded-2xl shadow-sm overflow-hidden ${isLocked ? "opacity-90" : ""}`}
    >
        <div
            className={`${bgColor} text-white p-3 text-center font-black text-xl tracking-widest`}
        >
            {title} {isLocked && "🔒"}
        </div>
        {/* ... 이하 생략 (이전 코드와 동일하게 input에 disabled={isLocked} 적용) ... */}
        <div className="grid grid-cols-12 bg-gray-50 border-b text-center font-bold text-xs py-2 text-gray-500">
            <div className="col-span-2">타순</div>
            <div className="col-span-5">선수명</div>
            <div className="col-span-4">수비</div>
            <div className="col-span-1"></div>
        </div>
        {lineup.map((player: any) => (
            <div
                key={player.id}
                className="grid grid-cols-12 items-center border-b border-gray-100 p-2 gap-1"
            >
                <div className="col-span-2 text-center font-black text-blue-900">
                    {player.order}
                </div>
                <div className="col-span-5">
                    <input
                        type="text"
                        value={player.name}
                        disabled={isLocked}
                        placeholder={isLocked ? "" : "이름"}
                        onChange={(e) =>
                            handleUpdate(
                                side,
                                player.id,
                                "name",
                                e.target.value,
                            )
                        }
                        className={`w-full p-1.5 rounded-md text-sm font-bold ${isLocked ? "bg-transparent border-none" : "bg-gray-50"}`}
                    />
                </div>
                <div className="col-span-4">
                    <select
                        value={player.position}
                        disabled={isLocked}
                        onChange={(e) =>
                            handleUpdate(
                                side,
                                player.id,
                                "position",
                                e.target.value,
                            )
                        }
                        className={`w-full p-1.5 text-xs rounded-md appearance-none ${isLocked ? "bg-transparent border-none" : "bg-gray-100"}`}
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
                            className="text-red-300 text-lg"
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
                className="w-full py-3 text-sm text-gray-400 font-bold hover:bg-gray-50 transition border-t border-dashed"
            >
                + 타순 추가
            </button>
        )}
    </div>
);

export default Lineup;
