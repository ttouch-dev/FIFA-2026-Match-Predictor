import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  Trophy,
  CalendarDays,
  Brain,
  History,
  CheckCircle,
  XCircle,
  Sparkles,
  Activity,
  Code2,
  Search,
  X,
} from "lucide-react";
import { apiGet } from "./api/http";
import { FLAGS } from "./utils/flags";
import "./style.css";

function getFlagUrl(team) {
  return FLAGS[team?.tla] || FLAGS[team?.short] || null;
}

function getRealResult(match) {
  const homeScore = match.score?.home;
  const awayScore = match.score?.away;

  if (homeScore === null || awayScore === null) return null;
  if (homeScore === undefined || awayScore === undefined) return null;

  if (homeScore > awayScore) return `${match.home?.name} Win`;
  if (awayScore > homeScore) return `${match.away?.name} Win`;
  return "Draw";
}

function getPredictionStatus(match) {
  if (match.status !== "finished") return null;

  const realResult = getRealResult(match);
  const predictedResult = match.prediction?.result;

  if (!realResult || !predictedResult || predictedResult === "TBD") return null;

  return realResult === predictedResult ? "success" : "failed";
}

function TeamBlock({ team, align = "left" }) {
  const flagUrl = getFlagUrl(team);

  return (
    <div className={`min-w-0 ${align === "right" ? "text-right" : "text-left"}`}>
      <div className={`mb-3 flex ${align === "right" ? "justify-end" : "justify-start"}`}>
        <div className="flex h-20 w-20 items-center justify-center rounded-3xl border border-white/10 bg-white/10 p-3 shadow-lg">
          {flagUrl ? (
            <img
              src={flagUrl}
              alt={team?.name || "Team"}
              className="h-full w-full object-contain"
            />
          ) : (
            <span className="text-4xl">🏳️</span>
          )}
        </div>
      </div>

      <h3 className="truncate text-xl font-black text-white">
        {team?.name || "TBD"}
      </h3>

      <p className="mt-1 text-xs font-bold uppercase tracking-[0.25em] text-emerald-300">
        {team?.tla || team?.short || ""}
      </p>
    </div>
  );
}

function ProbabilityBar({ label, value }) {
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between text-xs font-semibold text-slate-300">
        <span>{label}</span>
        <span>{value || 0}%</span>
      </div>

      <div className="h-2.5 overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-cyan-300"
          style={{ width: `${value || 0}%` }}
        />
      </div>
    </div>
  );
}

function MatchCard({ match }) {
  const home = match.home || {};
  const away = match.away || {};
  const prediction = match.prediction || {};
  const predictionStatus = getPredictionStatus(match);
  const realResult = getRealResult(match);

  return (
    <article className="group overflow-hidden rounded-[2rem] border border-white/10 bg-slate-900/75 shadow-2xl shadow-black/30 backdrop-blur-xl transition duration-300 hover:-translate-y-1 hover:border-emerald-300/40">
      <div className="relative p-5 sm:p-6">
        <div className="absolute -right-16 -top-16 h-40 w-40 rounded-full bg-emerald-400/10 blur-3xl" />

        <div className="relative mb-6 flex items-center justify-between text-xs font-bold text-sky-200">
          <span className="rounded-full bg-white/10 px-3 py-1">
            {match.stage || "Match"}
          </span>
          <span>{match.group || ""}</span>
        </div>

        <div className="relative grid grid-cols-[1fr_auto_1fr] items-center gap-4">
          <TeamBlock team={home} />

          <div className="flex h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-white/10 text-sm font-black text-white">
            VS
          </div>

          <TeamBlock team={away} align="right" />
        </div>

        {match.status === "finished" && (
          <div className="relative mt-6 rounded-3xl border border-emerald-400/20 bg-emerald-400/10 p-4 text-center">
            <p className="text-xs font-black uppercase tracking-[0.25em] text-emerald-200">
              Real Score
            </p>
            <p className="mt-2 text-4xl font-black text-white">
              {match.score?.home} - {match.score?.away}
            </p>
            <p className="mt-1 text-sm font-bold text-emerald-300">
              {realResult}
            </p>
          </div>
        )}

        <div className="relative mt-6 rounded-3xl border border-white/10 bg-slate-800/80 p-4">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h4 className="flex items-center gap-2 text-lg font-black text-white">
              <Sparkles size={18} className="text-emerald-300" />
              AI Prediction
            </h4>

            {predictionStatus === "success" && (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-400/15 px-3 py-1 text-xs font-black text-emerald-300">
                <CheckCircle size={14} /> Success
              </span>
            )}

            {predictionStatus === "failed" && (
              <span className="inline-flex items-center gap-1 rounded-full bg-red-500/15 px-3 py-1 text-xs font-black text-red-300">
                <XCircle size={14} /> Failed
              </span>
            )}
          </div>

          <p className="text-2xl font-black text-white">
            {prediction.result || "TBD"}
          </p>

          <p className="mt-3 text-sm text-slate-200">
            Predicted Score:{" "}
            <span className="text-lg font-black text-white">
              {prediction.score || "TBD"}
            </span>
          </p>

          <p className="mt-2 inline-flex rounded-full bg-emerald-400/10 px-3 py-1 text-xs font-black text-emerald-300">
            Model: {prediction.modelType || "unknown"}
          </p>

          <div className="mt-4 grid grid-cols-3 gap-2">
            <div className="rounded-2xl bg-white/5 p-3 text-center">
              <p className="text-xs text-slate-400">{home.tla || "Home"}</p>
              <b className="text-lg text-white">{prediction.homeWin || 0}%</b>
            </div>

            <div className="rounded-2xl bg-white/5 p-3 text-center">
              <p className="text-xs text-slate-400">Draw</p>
              <b className="text-lg text-white">{prediction.draw || 0}%</b>
            </div>

            <div className="rounded-2xl bg-white/5 p-3 text-center">
              <p className="text-xs text-slate-400">{away.tla || "Away"}</p>
              <b className="text-lg text-white">{prediction.awayWin || 0}%</b>
            </div>
          </div>

          <div className="mt-5 grid gap-3">
            <ProbabilityBar label={home.name || "Home"} value={prediction.homeWin} />
            <ProbabilityBar label="Draw" value={prediction.draw} />
            <ProbabilityBar label={away.name || "Away"} value={prediction.awayWin} />
          </div>

          <p className="mt-4 text-sm leading-relaxed text-sky-100/75">
            {prediction.analysis}
          </p>
        </div>

        <div className="relative mt-4 rounded-3xl border border-white/10 bg-white/[0.04] p-4">
          <h4 className="mb-3 flex items-center gap-2 text-sm font-black text-white">
            <Activity size={16} className="text-cyan-300" />
            Previous Match History
          </h4>

          <div className="grid gap-2 text-xs text-sky-100/80">
            <p>
              <b className="text-white">{home.name}</b>: {home.record || "0-0-0"} |
              GF Avg: {home.goalsForAvg || 0} | GA Avg: {home.goalsAgainstAvg || 0}
            </p>

            <p>
              <b className="text-white">{away.name}</b>: {away.record || "0-0-0"} |
              GF Avg: {away.goalsForAvg || 0} | GA Avg: {away.goalsAgainstAvg || 0}
            </p>
          </div>
        </div>
      </div>
    </article>
  );
}

function StatCard({ icon, value, label }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.06] p-5 shadow-xl shadow-black/20 backdrop-blur-xl">
      <div className="text-emerald-300">{icon}</div>
      <b className="mt-3 block text-3xl font-black text-white">{value || 0}</b>
      <span className="text-sm text-sky-100/70">{label}</span>
    </div>
  );
}

function SearchBox({ search, setSearch, total, filtered }) {
  return (
    <div className="mt-5 rounded-3xl border border-white/10 bg-slate-950/70 p-3 shadow-xl shadow-black/20 backdrop-blur-xl">
      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <div className="relative flex-1">
          <Search
            size={18}
            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-emerald-300"
          />

          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search country name or code... Brazil, Japan, ARG, BRA"
            className="w-full rounded-2xl border border-white/10 bg-white/[0.06] px-12 py-4 text-sm font-semibold text-white outline-none transition placeholder:text-slate-500 focus:border-emerald-400/60 focus:ring-4 focus:ring-emerald-400/10"
          />

          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-slate-300 hover:bg-white/20"
              type="button"
            >
              <X size={16} />
            </button>
          )}
        </div>

        <div className="rounded-2xl bg-emerald-400/10 px-4 py-3 text-center text-xs font-black text-emerald-200 md:min-w-[150px]">
          Showing {filtered} / {total}
        </div>
      </div>
    </div>
  );
}

function Footer() {
  return (
    <footer className="mt-16 border-t border-white/10">
      <div className="flex flex-col items-center justify-between gap-5 py-8 text-center md:flex-row md:text-left">
        <div>
          <p className="font-bold text-slate-300">
            © {new Date().getFullYear()} World Cup AI Prediction
          </p>
          <p className="mt-1 text-sm text-slate-500">
            Real AI Football Prediction Platform powered by XGBoost.
          </p>
        </div>

        <div className="flex flex-col items-center md:items-end">
          <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.25em] text-slate-500">
            <Code2 size={14} /> Developed by
          </p>

          <h3 className="mt-2 bg-gradient-to-r from-emerald-400 via-cyan-400 to-blue-500 bg-clip-text text-xl font-black text-transparent">
            Md. Mehedy Hasan Siam
          </h3>

          <p className="mt-1 text-xs text-slate-500">
            Software Engineer • AI & Full Stack Developer
          </p>
        </div>
      </div>
    </footer>
  );
}

function App() {
  const [tab, setTab] = useState("upcoming");
  const [matches, setMatches] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const endpoint = useMemo(() => {
    if (tab === "today") return "/matches/today";
    if (tab === "history") return "/matches/history";
    return "/matches/upcoming";
  }, [tab]);

  const filteredMatches = useMemo(() => {
    const keyword = search.toLowerCase().trim();

    if (!keyword) return matches;

    return matches.filter((match) => {
      const homeName = match.home?.name?.toLowerCase() || "";
      const awayName = match.away?.name?.toLowerCase() || "";
      const homeShort = match.home?.short?.toLowerCase() || "";
      const awayShort = match.away?.short?.toLowerCase() || "";
      const homeTla = match.home?.tla?.toLowerCase() || "";
      const awayTla = match.away?.tla?.toLowerCase() || "";
      const group = match.group?.toLowerCase() || "";
      const stage = match.stage?.toLowerCase() || "";

      return (
        homeName.includes(keyword) ||
        awayName.includes(keyword) ||
        homeShort.includes(keyword) ||
        awayShort.includes(keyword) ||
        homeTla.includes(keyword) ||
        awayTla.includes(keyword) ||
        group.includes(keyword) ||
        stage.includes(keyword)
      );
    });
  }, [matches, search]);

  async function load() {
    try {
      setLoading(true);

      const [matchRes, statsRes] = await Promise.all([
        apiGet(endpoint),
        apiGet("/matches/ai-stats"),
      ]);

      setMatches(matchRes.data || []);
      setStats(statsRes.data || null);
      setSearch("");
    } catch (error) {
      console.error(error);
      setMatches([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [endpoint]);

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,#064e3b_0,#020617_35%,#020617_100%)] px-4 py-5 text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <section className="relative overflow-hidden rounded-[2.5rem] border border-white/10 bg-white/[0.06] p-6 shadow-2xl shadow-black/30 backdrop-blur-xl sm:p-10 lg:p-12">
          <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-emerald-400/20 blur-3xl" />

          <div className="relative">
            <p className="inline-flex items-center gap-2 rounded-full bg-emerald-400/15 px-4 py-2 text-sm font-black text-emerald-200">
              <Trophy size={16} /> FIFA World Cup 2026
            </p>

            <h1 className="mt-5 max-w-4xl text-4xl font-black tracking-tight text-white sm:text-6xl lg:text-7xl">
              Premium AI Match Prediction
            </h1>

            <p className="mt-4 max-w-2xl text-base leading-relaxed text-sky-100/75 sm:text-lg">
              Real country flags, XGBoost probability, predicted score, live result
              tracking and mobile-first premium design.
            </p>
          </div>
        </section>

        {stats && (
          <section className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard icon={<Brain />} value={stats.xgboostPredictions} label="XGBoost" />
            <StatCard icon={<CalendarDays />} value={stats.upcomingMatches} label="Upcoming" />
            <StatCard icon={<History />} value={stats.finishedMatches} label="Finished" />
            <StatCard icon={<Trophy />} value={stats.totalMatches} label="Total" />
          </section>
        )}

        <div className="sticky top-0 z-20 mt-6 flex gap-3 overflow-x-auto rounded-3xl border border-white/10 bg-slate-950/80 p-2 backdrop-blur-xl">
          {["today", "upcoming", "history"].map((item) => (
            <button
              key={item}
              onClick={() => setTab(item)}
              className={`min-w-[110px] rounded-2xl px-5 py-3 text-sm font-black capitalize transition ${
                tab === item
                  ? "bg-emerald-400 text-slate-950 shadow-lg shadow-emerald-400/20"
                  : "bg-white/5 text-white hover:bg-white/10"
              }`}
            >
              {item}
            </button>
          ))}
        </div>

        <SearchBox
          search={search}
          setSearch={setSearch}
          total={matches.length}
          filtered={filteredMatches.length}
        />

        {loading ? (
          <p className="py-20 text-center text-sky-100/70">Loading...</p>
        ) : filteredMatches.length === 0 ? (
          <p className="py-20 text-center text-sky-100/70">
            No matches found for "{search}".
          </p>
        ) : (
          <section className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
            {filteredMatches.map((match) => (
              <MatchCard key={match._id || match.externalId} match={match} />
            ))}
          </section>
        )}

        <Footer />
      </div>
    </main>
  );
}

createRoot(document.getElementById("root")).render(<App />);