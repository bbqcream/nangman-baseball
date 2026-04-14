import React from "react";
import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";
import Home from "./pages/Home";
import Record from "./pages/Record";
import Edit from "./pages/Edit";
import RecordEdit from "./pages/RecordEdit";
import TeamRecord from "./pages/TeamRecord";

const App: React.FC = () => {
    return (
        <Router>
            <nav className="p-4 bg-blue-900 text-white flex gap-6 font-semibold shadow-md">
                <Link to="/" className="hover:text-blue-300 transition-colors">
                    홈 (선수 목록)
                </Link>
                <Link
                    to="/record"
                    className="hover:text-blue-300 transition-colors"
                >
                    리그 순위표
                </Link>
                <Link
                    className="hover:text-blue-300 transition-colors"
                    to="/team-record"
                >
                    팀 순위
                </Link>
                <Link
                    to="/edit"
                    className="hover:text-blue-300 transition-colors"
                >
                    기록 관리
                </Link>
            </nav>

            <main className="min-h-screen bg-gray-50 p-6">
                <Routes>
                    <Route path="/" element={<Home />} />
                    <Route path="/record" element={<Record />} />
                    <Route path="/edit" element={<Edit />} />
                    <Route path="record-edit" element={<RecordEdit />} />
                    <Route path="team-record" element={<TeamRecord />} />
                </Routes>
            </main>
        </Router>
    );
};

export default App;
