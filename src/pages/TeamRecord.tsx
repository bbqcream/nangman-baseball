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

const checkIsTimeOut = () => {
    const now = new Date();
    return now.getHours() >= 17;
};

const checkIsGameReset = () => {
    const now = new Date();
    const hour = now.getHours();
    const minute = now.getMinutes();
    return hour > 20 || (hour === 20 && minute >= 10);
};

const genId = () => Math.floor(Math.random() * 1_000_000);

const makeEmptyLineup = () =>
    Array.from({ length: 9 }, (_, i) => ({
        id: genId(),
        order: i + 1,
        name: "",
        position: "",
        statLabel: "",
    }));

const POSITIONS = ["투수", "1루수", "2루수", "유격수", "3루수", "포수", "지명타자"];
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
    if (!p?.batting) return "OPS 0.000";
    const { batting } = p;
    if (!batting.atBats) return "OPS 0.000";
    const obp =
        (batting.hits + batting.walks + batting.hbp) /
        (batting.atBats + batting.walks + batting.hbp || 1);
    const singles =
        batting.hits -
        ((batting.doubles || 0) + (batting.triples || 0) + (batting.homeRuns || 0));
    const slg =
        (singles +
            (batting.doubles || 0) * 2 +
            (batting.triples || 0) * 3 +
            (batting.homeRuns || 0) * 4) /
        batting.atBats;
    return `OPS ${(obp + slg).toFixed(3)}`;
};

const getTeamTag = (teamId: string) => {
    if (teamId === "mercenary") return { label: "용병", color: "bg-slate-100 text-slate-500" };
    if (teamId === "coupang") return { label: "쿠팡", color: "bg-amber-100 text-amber-600" };
    return { label: "용키", color: "bg-blue-100 text-blue-600" };
};

// ── 선발 투수 카드 ──────────────────────────────────────────
const StarterPitcherCard = ({ side, pitcher, isLocked, onUpdate, dbPlayers }: any) => {
    const [search, setSearch] = useState("");
    const [open, setOpen] = useState(false);

    const filtered = dbPlayers.filter((p: any) => search && p.name.includes(search));

    return (
        <div className="bg-white border-2 border-red-100 rounded-2xl shadow-sm p-4 overflow-visible">
            <div className="flex items-center gap-2 mb-3">
                <span className="text-red-600 font-black text-lg">⚾</span>
                <span className="font-black text-sm text-gray-700 uppercase tracking-widest">선발 투수</span>
            </div>
            <div className="relative">
                <input
                    type="text"
                    disabled={isLocked}
                    placeholder="선발 투수 검색"
                    value={
                        isLocked
                            ? pitcher?.name
                                ? `${pitcher.name}${pitcher.statLabel ? ` (${pitcher.statLabel})` : ""}`
                                : "미정"
                            : search
                    }
                    onChange={(e) => { setSearch(e.target.value); setOpen(true); }}
                    onFocus={() => { if (!isLocked) setOpen(true); }}
                    onBlur={() => setTimeout(() => setOpen(false), 150)}
                    className={`w-full p-3 rounded-xl text-sm font-bold ${
                        isLocked
                            ? "bg-transparent border-none text-gray-800"
                            : "bg-red-50 outline-none border border-red-200 focus:border-red-400"
                    }`}
                />
                {!isLocked && open && filtered.length > 0 && (
                    <div className="absolute z-50 w-full bg-white border border-gray-200 rounded-lg shadow-2xl max-h-48 overflow-y-auto mt-1">
                        {filtered.map((p: any) => {
                            const stat = getStatLabel(p);
                            const { label, color } = getTeamTag(p.teamId);
                            return (
                                <div
                                    key={p.id}
                                    onMouseDown={() => {
                                        onUpdate(side, { name: p.name, statLabel: stat });
                                        setSearch(p.name);
                                        setOpen(false);
                                    }}
                                    className="px-3 py-2 hover:bg-red-50 cursor-pointer flex justify-between items-center border-b last:border-none"
                                >
                                    <div className="flex items-center gap-2">
                                        <span className="font-bold text-sm">{p.name}</span>
                                        <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${color}`}>{label}</span>
                                    </div>
                                    <span className="text-red-600 font-black text-[10px]">{stat}</span>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};

// ── 라인업 카드 ─────────────────────────────────────────────
const LineupCard = ({
    title, lineup, side, bgColor, isLocked,
    onUpdate, onAdd, onRemove, dbPlayers, pitcher, onPitcherUpdate,
}: any) => {
    // key를 string으로 통일
    const [searchTerms, setSearchTerms] = useState<Record<string, string>>({});
    const [openDropdown, setOpenDropdown] = useState<string | null>(null);

    const setSearch = (id: string, val: string) =>
        setSearchTerms((prev) => ({ ...prev, [id]: val }));

    return (
        <div className={`flex-1 min-w-[350px] bg-white border-2 border-gray-200 rounded-2xl shadow-sm overflow-visible transition-all`}>
            <div className={`${bgColor} text-white p-4 text-center font-black text-xl tracking-widest uppercase`}>
                {title} {isLocked && "🔒"}
            </div>

            {/* 선발 투수 */}
            <div className="p-3 border-b-2 border-dashed border-red-100 bg-red-50/30 overflow-visible">
                <StarterPitcherCard
                    side={side}
                    pitcher={pitcher}
                    isLocked={isLocked}
                    onUpdate={onPitcherUpdate}
                    dbPlayers={dbPlayers}
                />
            </div>

            {/* 헤더 */}
            <div className="grid grid-cols-12 bg-gray-50 border-b text-center font-bold text-[10px] py-2 text-gray-500 uppercase tracking-tighter">
                <div className="col-span-1">#</div>
                <div className="col-span-6">선수명 (STAT)</div>
                <div className="col-span-4">수비위치</div>
                <div className="col-span-1"></div>
            </div>

            {lineup.map((player: any) => {
                const pid = String(player.id);
                const posInfo = POSITION_MAP[player.position] || { abbr: player.position || "-", color: "text-gray-400" };
                const currentSearch = searchTerms[pid] ?? player.name ?? "";
                const filtered = dbPlayers.filter((p: any) =>
                    currentSearch && p.name.includes(currentSearch)
                );

                return (
                    <div key={pid} className="grid grid-cols-12 items-center border-b border-gray-100 p-2 gap-1 relative">
                        <div className="col-span-1 text-center font-black text-blue-900 text-lg">
                            {player.order}
                        </div>

                        <div className="col-span-6 relative">
                            <input
                                type="text"
                                disabled={isLocked}
                                placeholder="선수 검색"
                                value={
                                    isLocked
                                        ? player.name ? `${player.name}${player.statLabel ? ` (${player.statLabel})` : ""}` : ""
                                        : currentSearch
                                }
                                onChange={(e) => {
                                    setSearch(pid, e.target.value);
                                    setOpenDropdown(pid);
                                }}
                                onFocus={() => { if (!isLocked) setOpenDropdown(pid); }}
                                onBlur={() => setTimeout(() => setOpenDropdown(null), 150)}
                                className={`w-full p-2 rounded-lg text-sm font-bold ${
                                    isLocked
                                        ? "bg-transparent border-none text-gray-800"
                                        : "bg-blue-50 outline-none border border-blue-200 focus:border-blue-400"
                                }`}
                            />
                            {!isLocked && openDropdown === pid && filtered.length > 0 && (
                                <div className="absolute z-50 w-full bg-white border border-gray-200 rounded-lg shadow-2xl max-h-48 overflow-y-auto mt-1">
                                    {filtered.map((p: any) => {
                                        const stat = getStatLabel(p);
                                        const { label, color } = getTeamTag(p.teamId);
                                        return (
                                            <div
                                                key={p.id}
                                                onMouseDown={() => {
                                                    // 실제 lineup state 업데이트
                                                    onUpdate(side, player.id, {
                                                        name: p.name,
                                                        position: p.position || "",
                                                        statLabel: stat,
                                                    });
                                                    setSearch(pid, p.name);
                                                    setOpenDropdown(null);
                                                }}
                                                className="px-3 py-2 hover:bg-blue-50 cursor-pointer flex justify-between items-center border-b last:border-none"
                                            >
                                                <div className="flex items-center gap-2">
                                                    <span className="font-bold text-sm">{p.name}</span>
                                                    <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${color}`}>{label}</span>
                                                </div>
                                                <span className="text-blue-600 font-black text-[10px]">{stat}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        <div className="col-span-4 text-center">
                            {isLocked ? (
                                <span className={`text-sm font-bold ${posInfo.color}`}>{posInfo.abbr}</span>
                            ) : (
                                <select
                                    value={player.position}
                                    onChange={(e) => onUpdate(side, player.id, { position: e.target.value })}
                                    className="w-full p-2 text-xs rounded-lg appearance-none bg-gray-100 font-bold"
                                >
                                    <option value="">선택</option>
                                    {POSITIONS.map((pos) => (
                                        <option key={pos} value={pos}>{pos} ({POSITION_MAP[pos]?.abbr})</option>
                                    ))}
                                </select>
                            )}
                        </div>

                        <div className="col-span-1 text-center">
                            {!isLocked && player.order > 5 && (
                                <button onClick={() => onRemove(side, player.id)} className="text-red-300 hover:text-red-600 text-lg font-bold">×</button>
                            )}
                        </div>
                    </div>
                );
            })}

            {!isLocked && (
                <button
                    onClick={() => onAdd(side)}
                    className="w-full py-4 text-xs text-gray-400 font-bold hover:bg-gray-50 transition border-t border-dashed"
                >
                    + 타순 추가
                </button>
            )}
        </div>
    );
};

// ── 메인 ────────────────────────────────────────────────────
const Lineup = () => {
    const [searchParams] = useSearchParams();
    const dateId = searchParams.get("date") || new Date().toISOString().split("T")[0];

    const [isLocked, setIsLocked] = useState(false);
    const [isTimeOut, setIsTimeOut] = useState(false);
    const [loading, setLoading] = useState(true);
    const [exists, setExists] = useState(false);
    const [dbPlayers, setDbPlayers] = useState<any[]>([]);
    const [awayLineup, setAwayLineup] = useState<any[]>([]);
    const [homeLineup, setHomeLineup] = useState<any[]>([]);
    const [awayPitcher, setAwayPitcher] = useState<any>(null);
    const [homePitcher, setHomePitcher] = useState<any>(null);

    useEffect(() => {
        const init = async () => {
            try {
                const timeOut = checkIsTimeOut();
                setIsTimeOut(timeOut);

                const playerSnap = await getDocs(collection(db, "players"));
                setDbPlayers(playerSnap.docs.map((d) => ({ id: d.id, ...d.data() })));

                const docSnap = await getDoc(doc(db, "lineups", dateId));
                if (docSnap.exists()) {
                    const data = docSnap.data();

                    if (checkIsGameReset()) {
                        const a = makeEmptyLineup();
                        const h = makeEmptyLineup();
                        setAwayLineup(a); setHomeLineup(h);
                        setAwayPitcher(null); setHomePitcher(null);
                        setIsLocked(false); setExists(true);
                        await setDoc(doc(db, "lineups", dateId), {
                            awayLineup: a, homeLineup: h,
                            awayPitcher: null, homePitcher: null,
                            isLocked: false, updatedAt: Timestamp.now(), resetAt: Timestamp.now(),
                        });
                        return;
                    }

                    setAwayLineup(data.awayLineup || []);
                    setHomeLineup(data.homeLineup || []);
                    setAwayPitcher(data.awayPitcher || null);
                    setHomePitcher(data.homePitcher || null);
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

    // 8:10 자동 초기화 감지
    useEffect(() => {
        if (!exists) return;
        const interval = setInterval(async () => {
            if (!checkIsGameReset()) return;
            const a = makeEmptyLineup();
            const h = makeEmptyLineup();
            setAwayLineup(a); setHomeLineup(h);
            setAwayPitcher(null); setHomePitcher(null);
            setIsLocked(false);
            await setDoc(doc(db, "lineups", dateId), {
                awayLineup: a, homeLineup: h,
                awayPitcher: null, homePitcher: null,
                isLocked: false, updatedAt: Timestamp.now(), resetAt: Timestamp.now(),
            });
            clearInterval(interval);
        }, 30_000);
        return () => clearInterval(interval);
    }, [exists, dateId]);

    const handleUpdate = (side: "away" | "home", id: number, updates: any) => {
        if (checkIsTimeOut()) return;
        const setter = side === "away" ? setAwayLineup : setHomeLineup;
        setter((prev) => prev.map((p) => (p.id === id ? { ...p, ...updates } : p)));
    };

    const handlePitcherUpdate = (side: "away" | "home", updates: any) => {
        if (checkIsTimeOut()) return;
        const setter = side === "away" ? setAwayPitcher : setHomePitcher;
        setter((prev: any) => ({ ...(prev || {}), ...updates }));
    };

    const saveToFirebase = async (lockState: boolean) => {
        if (checkIsTimeOut()) { alert("오후 5시 이후에는 라인업을 수정할 수 없습니다."); return; }
        await setDoc(doc(db, "lineups", dateId), {
            awayLineup, homeLineup, awayPitcher, homePitcher,
            isLocked: lockState, updatedAt: Timestamp.now(),
        });
    };

    const handleAdd = (side: "away" | "home") => {
        if (checkIsTimeOut()) return;
        const setter = side === "away" ? setAwayLineup : setHomeLineup;
        setter((prev) => [...prev, { id: genId(), order: prev.length + 1, name: "", position: "", statLabel: "" }]);
    };

    const handleRemove = (side: "away" | "home", id: number) => {
        if (checkIsTimeOut()) return;
        const setter = side === "away" ? setAwayLineup : setHomeLineup;
        setter((prev) => prev.filter((p) => p.id !== id).map((p, i) => ({ ...p, order: i + 1 })));
    };

    const createGame = async () => {
        if (checkIsTimeOut()) { alert("오후 5시 이후에는 새로운 라인업을 생성할 수 없습니다."); return; }
        const a = makeEmptyLineup();
        const h = makeEmptyLineup();
        await setDoc(doc(db, "lineups", dateId), {
            awayLineup: a, homeLineup: h,
            awayPitcher: null, homePitcher: null,
            isLocked: false, updatedAt: Timestamp.now(),
        });
        setAwayLineup(a); setHomeLineup(h);
        setAwayPitcher(null); setHomePitcher(null);
        setExists(true);
    };

    if (loading) return <div className="p-20 text-center font-bold text-gray-400">Loading...</div>;

    return (
        <div className="min-h-screen bg-gray-100 p-4 pb-20 font-sans">
            <div className="max-w-5xl mx-auto">
                <div className="text-center mb-10">
                    <p className="text-blue-600 font-bold tracking-widest text-sm mb-1 uppercase">{dateId}</p>
                    <h1 className="text-4xl font-black italic text-gray-900 uppercase tracking-tighter">Match Lineup</h1>
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
                                title="Coupang slaves"
                                lineup={awayLineup}
                                side="away"
                                bgColor="bg-slate-700"
                                isLocked={isLocked || isTimeOut}
                                onUpdate={handleUpdate}
                                onAdd={handleAdd}
                                onRemove={handleRemove}
                                dbPlayers={dbPlayers}
                                pitcher={awayPitcher}
                                onPitcherUpdate={handlePitcherUpdate}
                            />
                            <LineupCard
                                title="Daegu Yongkids"
                                lineup={homeLineup}
                                side="home"
                                bgColor="bg-blue-800"
                                isLocked={isLocked || isTimeOut}
                                onUpdate={handleUpdate}
                                onAdd={handleAdd}
                                onRemove={handleRemove}
                                dbPlayers={dbPlayers}
                                pitcher={homePitcher}
                                onPitcherUpdate={handlePitcherUpdate}
                            />
                        </div>
                        <div className="mt-12 max-w-md mx-auto">
                            {!isTimeOut && (
                                <button
                                    onClick={() => { setIsLocked(!isLocked); saveToFirebase(!isLocked); }}
                                    className={`w-full py-5 rounded-2xl font-black text-xl shadow-2xl transition ${isLocked ? "bg-gray-900 text-white" : "bg-red-600 text-white"}`}
                                >
                                    {isLocked ? "🔄 라인업 수정하기" : "✅ 라인업 확정 및 저장"}
                                </button>
                            )}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default Lineup;