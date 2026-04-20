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

const genId = () => Math.floor(Math.random() * 1_000_000);

const formatSide = (side: string) => {
    if (side === "좌") return "L";
    if (side === "우") return "R";
    return side || "-";
};

const makeEmptyLineup = () =>
    Array.from({ length: 9 }, (_, i) => ({
        id: genId(),
        order: i + 1,
        name: "",
        position: "",
        statLabel: "",
        batSide: "",
        throwSide: "",
    }));

const TEAM_THEME: Record<
    string,
    { label: string; headerBg: string; text: string; dot: string }
> = {
    away: {
        label: "COUPANG SLAVES",
        headerBg: "bg-amber-400",
        text: "text-amber-900",
        dot: "bg-amber-600",
    },
    home: {
        label: "DAEGU YONGKIDS",
        headerBg: "bg-blue-600",
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

/**
 * 통계 레이블 생성 함수
 * 투수: ERA 계산 (이닝 보정) + 이닝/승/패
 * 타자: OPS 계산
 */
const getStatLabel = (p: any, type: "batter" | "pitcher") => {
    try {
        const { batting, pitching } = p;

        if (type === "pitcher") {
            const ip = pitching?.inningsPitched || 0;
            const earnedRuns = pitching?.earnedRuns || 0;
            const wins = pitching?.wins || 0;
            const losses = pitching?.losses || 0;

            // 야구 이닝 계산 (0.1이닝 = 1/3)
            const innings = Math.floor(ip);
            const outs = Math.round((ip - innings) * 10);
            const realInnings = innings + outs / 3;

            // ERA = (자책점 * 9) / 이닝
            const era = realInnings > 0 ? (earnedRuns * 9) / realInnings : 0;

            return `ERA ${era.toFixed(2)} | ${ip.toFixed(1)}이닝 ${wins}승 ${losses}패`;
        } else {
            const atBats = batting?.atBats || 0;
            const hits = batting?.hits || 0;
            const walks = batting?.walks || 0;
            const hbp = batting?.hbp || 0;
            const doubles = batting?.doubles || 0;
            const triples = batting?.triples || 0;
            const homeRuns = batting?.homeRuns || 0;

            const obp =
                atBats + walks + hbp > 0
                    ? (hits + walks + hbp) / (atBats + walks + hbp)
                    : 0;

            const singles = hits - (doubles + triples + homeRuns);
            const slg =
                atBats > 0
                    ? (singles + doubles * 2 + triples * 3 + homeRuns * 4) /
                      atBats
                    : 0;

            return `OPS ${(obp + slg).toFixed(3)}`;
        }
    } catch (e) {
        return type === "pitcher" ? "ERA 0.00 | 0.0이닝 0승 0패" : "OPS 0.000";
    }
};

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
                    <span className="text-[10px] font-black text-red-600 truncate max-w-[180px]">
                        {pitcher.statLabel}
                    </span>
                )}
            </div>
            <div className="flex items-center gap-2">
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
                    className="flex-1 bg-transparent border-none py-1 text-lg font-black text-gray-800 outline-none"
                />
                {pitcher?.name && (
                    <span className="shrink-0 bg-red-100 text-red-600 text-[10px] font-black px-1.5 py-0.5 rounded">
                        {formatSide(pitcher.batSide)}/
                        {formatSide(pitcher.throwSide)}
                    </span>
                )}
            </div>
            {!isLocked && open && filtered.length > 0 && (
                <div className="absolute z-[110] left-0 right-0 top-full bg-white border border-gray-200 rounded-xl shadow-2xl mt-2 overflow-hidden">
                    {filtered.map((p: any) => (
                        <div
                            key={p.id}
                            onMouseDown={() => {
                                onUpdate(side, {
                                    name: p.name,
                                    statLabel: getStatLabel(p, "pitcher"),
                                    batSide: p.batSide,
                                    throwSide: p.throwSide,
                                });
                                setOpen(false);
                            }}
                            className="px-4 py-3 hover:bg-red-50 cursor-pointer flex justify-between items-center border-b"
                        >
                            <span className="font-bold text-sm">{p.name}</span>
                            <span className="text-red-600 font-black text-[10px]">
                                {getStatLabel(p, "pitcher")}
                            </span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

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
            <div className="p-5 bg-slate-50/80 border-b border-slate-100">
                <StarterPitcherCard
                    side={side}
                    pitcher={pitcher}
                    isLocked={isLocked}
                    onUpdate={onPitcherUpdate}
                    dbPlayers={dbPlayers}
                />
            </div>
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
                                        className="bg-transparent font-bold text-slate-800 outline-none w-full text-[15px]"
                                    />
                                    {player.name && (
                                        <span
                                            className={`shrink-0 text-[10px] font-black px-2 py-0.5 rounded shadow-sm bg-slate-100 text-slate-600`}
                                        >
                                            {player.statLabel}
                                        </span>
                                    )}
                                </div>
                                {!isLocked &&
                                    openDropdown === pid &&
                                    filtered.length > 0 && (
                                        <div className="absolute z-[100] left-0 right-0 top-full bg-white border border-slate-200 rounded-xl shadow-xl mt-1 overflow-hidden">
                                            {filtered.map((p: any) => (
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
                                                                    getStatLabel(
                                                                        p,
                                                                        "batter",
                                                                    ),
                                                                batSide:
                                                                    p.batSide,
                                                                throwSide:
                                                                    p.throwSide,
                                                            },
                                                        );
                                                        setOpenDropdown(null);
                                                    }}
                                                    className="px-4 py-3 hover:bg-slate-50 cursor-pointer flex justify-between border-b"
                                                >
                                                    <span className="font-bold text-sm">
                                                        {p.name}
                                                    </span>
                                                    <span className="text-blue-600 font-black text-[10px]">
                                                        {getStatLabel(
                                                            p,
                                                            "batter",
                                                        )}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                            </div>
                            <div className="w-16 shrink-0">
                                {!isLocked ? (
                                    <select
                                        value={player.position}
                                        onChange={(e) =>
                                            onUpdate(side, player.id, {
                                                position: e.target.value,
                                            })
                                        }
                                        className="w-full bg-slate-100 border-none rounded-md text-[10px] font-black p-1.5 outline-none"
                                    >
                                        <option value="">POS</option>
                                        {POSITIONS.map((pos) => (
                                            <option key={pos} value={pos}>
                                                {POSITION_MAP[pos].abbr}
                                            </option>
                                        ))}
                                    </select>
                                ) : (
                                    <span
                                        className={`block text-center text-xs font-black ${posInfo.color}`}
                                    >
                                        {posInfo.abbr}
                                    </span>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
            {!isLocked && (
                <button
                    onClick={() => onAdd(side)}
                    className="w-full py-5 text-[11px] font-black text-slate-400 hover:text-slate-600 hover:bg-slate-50 border-t border-dashed"
                >
                    {" "}
                    + ADD BATTER{" "}
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
                    <h1 className="text-6xl font-black italic text-gray-900 tracking-tighter mt-4 uppercase">
                        Battle Lineup
                    </h1>
                </header>
                {!exists ? (
                    <div className="bg-white rounded-[3rem] p-24 text-center shadow-2xl border border-gray-100 max-w-2xl mx-auto">
                        <button
                            onClick={() => {
                                setAwayLineup(makeEmptyLineup());
                                setHomeLineup(makeEmptyLineup());
                                setExists(true);
                            }}
                            className="px-16 py-6 bg-blue-600 text-white font-black text-2xl rounded-2xl shadow-xl"
                        >
                            생성하기
                        </button>
                    </div>
                ) : (
                    <>
                        <div className="flex flex-wrap gap-12 justify-center items-start">
                            <LineupCard
                                lineup={awayLineup}
                                side="away"
                                isLocked={isLocked}
                                onUpdate={(_s: any, id: any, u: any) =>
                                    setAwayLineup((p) =>
                                        p.map((x) =>
                                            x.id === id ? { ...x, ...u } : x,
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
                                dbPlayers={dbPlayers}
                                pitcher={awayPitcher}
                                onPitcherUpdate={(_s: any, u: any) =>
                                    setAwayPitcher((p: any) => ({ ...p, ...u }))
                                }
                            />
                            <LineupCard
                                lineup={homeLineup}
                                side="home"
                                isLocked={isLocked}
                                onUpdate={(_s: any, id: any, u: any) =>
                                    setHomeLineup((p) =>
                                        p.map((x) =>
                                            x.id === id ? { ...x, ...u } : x,
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
                                className={`w-full py-6 rounded-[1.5rem] font-black text-xl shadow-2xl ${isLocked ? "bg-gray-900" : "bg-red-600"} text-white`}
                            >
                                {isLocked ? "🔄 UNLOCK" : "✅ SAVE & LOCK"}
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default Lineup;
