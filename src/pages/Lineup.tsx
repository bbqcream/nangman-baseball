import { useState } from "react";

// 요청하신 수비 위치 옵션
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
    // 오늘 날짜
    const today = new Date().toLocaleDateString("ko-KR", {
        year: "numeric",
        month: "long",
        day: "numeric",
        weekday: "short",
    });

    // 초기 5명 생성 함수 (고정석)
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

    // 선수 추가 (5번 이후)
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

    // 선수 삭제 (6번부터 가능)
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

    // 라인업 카드 렌더링 컴포넌트
    const LineupCard = ({
        title,
        lineup,
        side,
        bgColor,
    }: {
        title: string;
        lineup: Player[];
        side: "away" | "home";
        bgColor: string;
    }) => (
        <div className="flex-1 min-w-[350px] bg-white border-2 border-gray-200 rounded-2xl shadow-sm overflow-hidden">
            <div
                className={`${bgColor} text-white p-3 text-center font-black text-xl tracking-widest`}
            >
                {title}
            </div>
            <div className="grid grid-cols-12 bg-gray-50 border-b text-center font-bold text-xs py-2 text-gray-500">
                <div className="col-span-2">타순</div>
                <div className="col-span-5">선수명</div>
                <div className="col-span-4">수비</div>
                <div className="col-span-1"></div>
            </div>
            {lineup.map((player) => (
                <div
                    key={player.id}
                    className="grid grid-cols-12 items-center border-b border-gray-50 p-2 gap-1"
                >
                    <div className="col-span-2 text-center font-black text-blue-900">
                        {player.order}
                    </div>
                    <div className="col-span-5">
                        <input
                            type="text"
                            value={player.name}
                            placeholder="이름"
                            onChange={(e) =>
                                handleUpdate(
                                    side,
                                    player.id,
                                    "name",
                                    e.target.value,
                                )
                            }
                            className="w-full p-1.5 bg-gray-50 border-none rounded-md text-sm font-bold focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                    <div className="col-span-4">
                        <select
                            value={player.position}
                            onChange={(e) =>
                                handleUpdate(
                                    side,
                                    player.id,
                                    "position",
                                    e.target.value,
                                )
                            }
                            className="w-full p-1.5 text-xs border-none bg-gray-100 rounded-md appearance-none"
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
                        {player.order > 5 && (
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
            <button
                onClick={() => addPlayer(side)}
                className="w-full py-3 text-sm text-gray-400 font-bold hover:bg-gray-50 transition border-t border-dashed"
            >
                + 타순 추가
            </button>
        </div>
    );

    return (
        <div className="min-h-screen bg-gray-100 p-4 pb-20">
            <div className="max-w-5xl mx-auto">
                {/* 상단 정보 */}
                <div className="text-center mb-8">
                    <p className="text-blue-600 font-bold tracking-tighter">
                        {today}
                    </p>
                    <h1 className="text-4xl font-black italic text-gray-900 uppercase">
                        Match Lineup
                    </h1>
                    <div className="h-1 w-20 bg-blue-600 mx-auto mt-2"></div>
                </div>

                {/* 양 팀 라인업 보드 */}
                <div className="flex flex-wrap gap-6 justify-center">
                    <LineupCard
                        title="AWAY TEAM"
                        lineup={awayLineup}
                        side="away"
                        bgColor="bg-gray-700"
                    />
                    <LineupCard
                        title="HOME TEAM"
                        lineup={homeLineup}
                        side="home"
                        bgColor="bg-blue-800"
                    />
                </div>

                {/* 하단 액션 */}
                <div className="mt-10 max-w-md mx-auto">
                    <button className="w-full bg-red-600 text-white py-4 rounded-xl font-black text-xl shadow-lg hover:bg-red-700 active:scale-95 transition transform">
                        경기 시작 / 라인업 확정
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Lineup;
