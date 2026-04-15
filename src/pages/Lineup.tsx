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

// ── 1. 유틸리티 함수 (에러 방지를 위해 상단 배치) ──────────────────────
const genId = () => Math.floor(Math.random() * 1_000_000);

const makeEmptyLineup = () =>
    Array.from({ length: 9 }, (_, i) => ({
        id: genId(),
        order: i + 1,
        name: "",
        position: "",
        statLabel: "",
    }));

const TEAM_THEME: Record<
    string,
    { label: string; headerBg: string; text: string; dot: string }
> = {
    away: {
        label: "COUPANG SLAVES",
        headerBg: "bg-amber-400", // 쿠팡 옐로우
        text: "text-amber-900",
        dot: "bg-amber-600",
    },
    home: {
        label: "DAEGU YONGKIDS",
        headerBg: "bg-blue-600", // 용키즈 블루
        text: "text-white",
        dot: "bg-blue-400",
    },
};
const checkIsLockedWindow = () => {
    const now = new Date();
    const hour = now.getHours();
    return hour >= 17 && hour < 20;
};

const POSITIONS = [
    "투수",
    "1루수",
    "2루수",
    "유격수",
    "3루수",
    "외야수",
    "지명타자",
];
const POSITION_MAP: Record<string, any> = {
    투수: { abbr: "P", color: "text-red-500" },
    "1루수": { abbr: "1B", color: "text-gray-600" },
    "2루수": { abbr: "2B", color: "text-gray-600" },
    유격수: { abbr: "SS", color: "text-gray-600" },
    "3루수": { abbr: "3B", color: "text-gray-600" },
    외야수: { abbr: "OF", color: "text-gray-600" },
    지명타자: { abbr: "DH", color: "text-gray-600" },
};

// ── 2. 통계 계산 로직 (투수/타자 엄격 구분) ──────────────────────────
const getStatLabel = (p: any, type: "batter" | "pitcher") => {
    try {
        const { batting, pitching } = p;
        if (type === "pitcher") {
            const era =
                pitching?.inningsPitched > 0
                    ? (pitching.earnedRuns * 9) / pitching.inningsPitched
                    : 0;
            return `ERA ${era.toFixed(2)}`;
        } else {
            const obp =
                batting?.atBats + batting?.walks + batting?.hbp > 0
                    ? (batting.hits + batting.walks + batting.hbp) /
                      (batting.atBats + batting.walks + batting.hbp)
                    : 0;
            const singles =
                batting?.hits -
                (batting?.doubles + batting?.triples + batting?.homeRuns);
            const slg =
                batting?.atBats > 0
                    ? (singles +
                          batting.doubles * 2 +
                          batting.triples * 3 +
                          batting.homeRuns * 4) /
                      batting.atBats
                    : 0;
            return `OPS ${(obp + slg).toFixed(3)}`;
        }
    } catch (e) {
        return type === "pitcher" ? "ERA 0.00" : "OPS 0.000";
    }
};

// ── 3. 선발 투수 카드 (디자인 일체화) ──────────────────────────
const StarterPitcherCard = ({
    side,
    pitcher,
    isLocked,
    onUpdate,
    dbPlayers,
}: any) => {
    const [search, setSearch] = useState("");
    const [open, setOpen] = useState(false);
    const filtered = dbPlayers.filter(
        (p: any) => search.trim() !== "" && p.name.includes(search.trim()),
    );

    return (
        <div className="bg-white border-2 border-red-50 rounded-2xl p-4 shadow-sm relative">
            <div className="flex justify-between items-center mb-1">
                <span className="text-[10px] font-black text-red-500 uppercase">
                    Starting Pitcher
                </span>
                {pitcher?.name && (
                    <span className="text-[11px] font-black text-red-600">
                        {pitcher.statLabel}
                    </span>
                )}
            </div>
            <input
                type="text"
                disabled={isLocked}
                placeholder="선발 투수 검색"
                value={
                    isLocked
                        ? pitcher?.name || ""
                        : open
                          ? search
                          : pitcher?.name || ""
                }
                onChange={(e) => {
                    setSearch(e.target.value);
                    setOpen(true);
                }}
                onFocus={() => {
                    if (!isLocked) {
                        setOpen(true);
                        setSearch(pitcher?.name || "");
                    }
                }}
                onBlur={() => setTimeout(() => setOpen(false), 200)}
                className="w-full bg-transparent border-none py-1 text-lg font-black text-gray-800 outline-none"
            />
            {!isLocked && open && filtered.length > 0 && (
                <div className="absolute z-[110] left-0 right-0 top-full bg-white border border-gray-200 rounded-xl shadow-2xl mt-2 overflow-hidden">
                    {filtered.map((p: any) => {
                        const era = getStatLabel(p, "pitcher");
                        return (
                            <div
                                key={p.id}
                                onMouseDown={() => {
                                    onUpdate(side, {
                                        name: p.name,
                                        statLabel: era,
                                    });
                                    setOpen(false);
                                }}
                                className="px-4 py-3 hover:bg-red-50 cursor-pointer flex justify-between items-center border-b last:border-none"
                            >
                                <span className="font-bold text-sm">
                                    {p.name}
                                </span>
                                <span className="text-red-600 font-black text-xs">
                                    {era}
                                </span>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

// ── 4. 라인업 카드 (한 줄 배치 & 깔끔한 디자인) ──────────────────────
const LineupCard = ({
    lineup,
    side,
    isLocked,
    onUpdate,
    onAdd,
    dbPlayers,
    pitcher,
    onPitcherUpdate,
}: any) => {
    const [searchTerms, setSearchTerms] = useState<Record<string, string>>({});
    const [openDropdown, setOpenDropdown] = useState<string | null>(null);
    const theme = side === "away" ? TEAM_THEME.away : TEAM_THEME.home;

    return (
        <div className="flex-1 min-w-[380px] bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden">
            {/* 상단 헤더: 각 팀의 시그니처 컬러 적용 */}
            <div
                className={`${theme.headerBg} px-8 py-5 flex justify-between items-center`}
            >
                <h2
                    className={`${theme.text} font-black text-xl italic tracking-tight uppercase`}
                >
                    {theme.label}
                </h2>
                {isLocked && (
                    <span
                        className={`${theme.text} opacity-60 text-xs font-bold`}
                    >
                        LOCKED 🔒
                    </span>
                )}
            </div>

            {/* 선발 투수 영역: 연한 배경으로 구분 */}
            <div className="p-5 bg-slate-50/80 border-b border-slate-100">
                <StarterPitcherCard
                    side={side}
                    pitcher={pitcher}
                    isLocked={isLocked}
                    onUpdate={onPitcherUpdate}
                    dbPlayers={dbPlayers}
                />
            </div>

            {/* 타순 리스트 */}
            <div className="px-3 py-2">
                {lineup.map((player: any) => {
                    const pid = String(player.id);
                    const currentSearch = searchTerms[pid] ?? "";
                    const filtered = dbPlayers.filter(
                        (p: any) =>
                            currentSearch.trim() !== "" &&
                            p.name.includes(currentSearch.trim()),
                    );
                    const posInfo = POSITION_MAP[player.position] || {
                        abbr: "-",
                        color: "text-slate-300",
                    };

                    return (
                        <div
                            key={pid}
                            className="flex items-center gap-3 px-4 py-3 border-b border-slate-50 last:border-none group"
                        >
                            {/* 타순 번호: 팀 컬러 도트 활용 */}
                            <div className="w-6 flex flex-col items-center">
                                <span className="text-[10px] font-black text-slate-300 group-hover:text-slate-600">
                                    {player.order}
                                </span>
                                <div
                                    className={`w-1 h-1 rounded-full mt-0.5 ${theme.dot} opacity-40`}
                                />
                            </div>

                            <div className="flex-1 relative">
                                <div className="flex items-center justify-between gap-2">
                                    <input
                                        type="text"
                                        disabled={isLocked}
                                        placeholder="선수 검색"
                                        value={
                                            isLocked
                                                ? player.name
                                                : openDropdown === pid
                                                  ? currentSearch
                                                  : player.name
                                        }
                                        onChange={(e) =>
                                            setSearchTerms((prev) => ({
                                                ...prev,
                                                [pid]: e.target.value,
                                            }))
                                        }
                                        onFocus={() => {
                                            if (!isLocked) {
                                                setOpenDropdown(pid);
                                                setSearchTerms((prev) => ({
                                                    ...prev,
                                                    [pid]: player.name || "",
                                                }));
                                            }
                                        }}
                                        onBlur={() =>
                                            setTimeout(
                                                () => setOpenDropdown(null),
                                                200,
                                            )
                                        }
                                        className="bg-transparent font-bold text-slate-800 outline-none w-full text-[15px] placeholder-slate-300"
                                    />
                                    {player.name && (
                                        <span
                                            className={`shrink-0 text-[10px] font-black px-2 py-0.5 rounded shadow-sm ${side === "away" ? "bg-amber-100 text-amber-700" : "bg-blue-50 text-blue-600"}`}
                                        >
                                            {player.statLabel}
                                        </span>
                                    )}
                                </div>

                                {/* 검색 드롭다운 디자인 개선 */}
                                {!isLocked &&
                                    openDropdown === pid &&
                                    filtered.length > 0 && (
                                        <div className="absolute z-[100] left-0 right-0 top-full bg-white border border-slate-200 rounded-xl shadow-xl mt-1 overflow-hidden animate-in fade-in slide-in-from-top-1">
                                            {filtered.map((p: any) => {
                                                const ops = getStatLabel(
                                                    p,
                                                    "batter",
                                                );
                                                return (
                                                    <div
                                                        key={p.id}
                                                        onMouseDown={() => {
                                                            onUpdate(
                                                                side,
                                                                player.id,
                                                                {
                                                                    name: p.name,
                                                                    position:
                                                                        p.position ||
                                                                        "",
                                                                    statLabel:
                                                                        ops,
                                                                },
                                                            );
                                                            setOpenDropdown(
                                                                null,
                                                            );
                                                        }}
                                                        className="px-4 py-3 hover:bg-slate-50 cursor-pointer flex justify-between items-center border-b border-slate-50 last:border-none"
                                                    >
                                                        <div className="flex items-center gap-2">
                                                            <span className="font-bold text-sm text-slate-700">
                                                                {p.name}
                                                            </span>
                                                            <span className="text-[9px] text-slate-400">
                                                                {p.teamId ===
                                                                "coupang"
                                                                    ? "쿠팡"
                                                                    : "용키"}
                                                            </span>
                                                        </div>
                                                        <span className="text-blue-600 font-black text-xs">
                                                            {ops}
                                                        </span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                            </div>

                            {/* 포지션 선택창 */}
                            <div className="w-16 shrink-0">
                                {isLocked ? (
                                    <span
                                        className={`block text-center text-xs font-black ${posInfo.color}`}
                                    >
                                        {posInfo.abbr}
                                    </span>
                                ) : (
                                    <select
                                        value={player.position}
                                        onChange={(e) =>
                                            onUpdate(side, player.id, {
                                                position: e.target.value,
                                            })
                                        }
                                        className="w-full bg-slate-100 border-none rounded-md text-[10px] font-black p-1.5 outline-none text-slate-600"
                                    >
                                        <option value="">POS</option>
                                        {POSITIONS.map((pos) => (
                                            <option key={pos} value={pos}>
                                                {POSITION_MAP[pos].abbr}
                                            </option>
                                        ))}
                                    </select>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {!isLocked && (
                <button
                    onClick={() => onAdd(side)}
                    className="w-full py-5 text-[11px] font-black text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-all border-t border-dashed border-slate-100"
                >
                    + ADD BATTER
                </button>
            )}
        </div>
    );
};
// ── 5. 메인 페이지 컴포넌트 ──────────────────────────────────────────
const Lineup = () => {
    const [searchParams] = useSearchParams();
    const dateId =
        searchParams.get("date") || new Date().toISOString().split("T")[0];
    const [isLocked, setIsLocked] = useState(false);
    const [loading, setLoading] = useState(true);
    const [exists, setExists] = useState(false);
    const [dbPlayers, setDbPlayers] = useState<any[]>([]);
    const [awayLineup, setAwayLineup] = useState<any[]>([]);
    const [homeLineup, setHomeLineup] = useState<any[]>([]);
    const [awayPitcher, setAwayPitcher] = useState<any>(null);
    const [homePitcher, setHomePitcher] = useState<any>(null);

    const init = async () => {
        try {
            const playerSnap = await getDocs(collection(db, "players"));
            setDbPlayers(
                playerSnap.docs.map((d) => ({ id: d.id, ...d.data() })),
            );
            const docSnap = await getDoc(doc(db, "lineups", dateId));
            if (docSnap.exists()) {
                const data = docSnap.data();
                setAwayLineup(data.awayLineup || []);
                setHomeLineup(data.homeLineup || []);
                setAwayPitcher(data.awayPitcher || null);
                setHomePitcher(data.homePitcher || null);
                setIsLocked(checkIsLockedWindow() || data.isLocked || false);
                setExists(true);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        init();
    }, [dateId]);

    const handleSave = async (lock: boolean) => {
        await setDoc(doc(db, "lineups", dateId), {
            awayLineup,
            homeLineup,
            awayPitcher,
            homePitcher,
            isLocked: lock,
            updatedAt: Timestamp.now(),
        });
        setIsLocked(lock);
    };

    if (loading)
        return (
            <div className="p-20 text-center font-black text-gray-300 animate-pulse text-2xl italic">
                LOADING...
            </div>
        );

    return (
        <div className="min-h-screen bg-[#f8f9fa] p-8 pb-32">
            <div className="max-w-7xl mx-auto">
                <header className="mb-16 text-center">
                    <span className="text-blue-600 font-black text-sm tracking-widest uppercase">
                        {dateId}
                    </span>
                    <h1 className="text-6xl font-black italic text-gray-900 tracking-tighter mt-4 uppercase">
                        Battle Lineup
                    </h1>
                    <div className="w-20 h-2 bg-blue-600 mx-auto mt-6"></div>
                </header>

                {!exists ? (
                    <div className="bg-white rounded-[3rem] p-24 text-center shadow-2xl border border-gray-100 max-w-2xl mx-auto">
                        <button
                            onClick={() => {
                                setAwayLineup(makeEmptyLineup());
                                setHomeLineup(makeEmptyLineup());
                                setExists(true);
                            }}
                            className="px-16 py-6 bg-blue-600 text-white font-black text-2xl rounded-2xl shadow-xl hover:scale-105 transition-transform active:scale-95"
                        >
                            새 라인업 생성하기
                        </button>
                    </div>
                ) : (
                    <>
                        <div className="flex flex-wrap gap-12 justify-center items-start">
                            <LineupCard
                                title="Coupang Slaves"
                                lineup={awayLineup}
                                side="away"
                                bgColor="bg-slate-800"
                                isLocked={isLocked}
                                onUpdate={(_s: any, id: any, u: any) =>
                                    setAwayLineup((prev) =>
                                        prev.map((p) =>
                                            p.id === id ? { ...p, ...u } : p,
                                        ),
                                    )
                                }
                                onAdd={() =>
                                    setAwayLineup([
                                        ...awayLineup,
                                        {
                                            id: genId(),
                                            order: awayLineup.length + 1,
                                            name: "",
                                            position: "",
                                        },
                                    ])
                                }
                                onRemove={(_s: any, id: any) =>
                                    setAwayLineup(
                                        awayLineup
                                            .filter((p) => p.id !== id)
                                            .map((p, i) => ({
                                                ...p,
                                                order: i + 1,
                                            })),
                                    )
                                }
                                dbPlayers={dbPlayers}
                                pitcher={awayPitcher}
                                onPitcherUpdate={(_s: any, u: any) =>
                                    setAwayPitcher((p: any) => ({ ...p, ...u }))
                                }
                            />

                            <LineupCard
                                title="Daegu Yongkids"
                                lineup={homeLineup}
                                side="home"
                                bgColor="bg-blue-700"
                                isLocked={isLocked}
                                onUpdate={(_s: any, id: any, u: any) =>
                                    setHomeLineup((prev) =>
                                        prev.map((p) =>
                                            p.id === id ? { ...p, ...u } : p,
                                        ),
                                    )
                                }
                                onAdd={() =>
                                    setHomeLineup([
                                        ...homeLineup,
                                        {
                                            id: genId(),
                                            order: homeLineup.length + 1,
                                            name: "",
                                            position: "",
                                        },
                                    ])
                                }
                                onRemove={(_s: any, id: any) =>
                                    setHomeLineup(
                                        homeLineup
                                            .filter((p) => p.id !== id)
                                            .map((p, i) => ({
                                                ...p,
                                                order: i + 1,
                                            })),
                                    )
                                }
                                dbPlayers={dbPlayers}
                                pitcher={homePitcher}
                                onPitcherUpdate={(_s: any, u: any) =>
                                    setHomePitcher((p: any) => ({ ...p, ...u }))
                                }
                            />
                        </div>

                        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 w-full max-w-sm px-6 z-[120]">
                            <button
                                onClick={() => handleSave(!isLocked)}
                                className={`w-full py-6 rounded-[1.5rem] font-black text-xl shadow-2xl transition-all active:scale-95 ${isLocked ? "bg-gray-900 text-white" : "bg-red-600 text-white hover:bg-red-700"}`}
                            >
                                {isLocked
                                    ? "🔄 LINEUP UNLOCK"
                                    : "✅ SAVE & LOCK"}
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default Lineup;
