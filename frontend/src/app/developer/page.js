"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";

export default function DeveloperDashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [pageLoading, setPageLoading] = useState(true);
  const [theme, setTheme] = useState("dark");
  const [selectedSite, setSelectedSite] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const dashboardRef = useRef(null);
  const pollIntervalRef = useRef(null);

  const uniqueSites = Array.from(new Set(jobs.map(j => j.website_url)));
  const visibleJobs = selectedSite
    ? jobs.filter(j => j.website_url === selectedSite)
    : [];

  const totalProjectsCount = uniqueSites.length;
  const completedProjectsCount = uniqueSites.filter(site => {
    const lastJob = jobs.find(j => j.website_url === site);
    return lastJob?.is_project_complete;
  }).length;
  const ongoingProjectsCount = totalProjectsCount - completedProjectsCount;

  useEffect(() => {
    const savedTheme = localStorage.getItem("theme") || "dark";
    setTheme(savedTheme);
    document.documentElement.setAttribute("data-theme", savedTheme);
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    localStorage.setItem("theme", nextTheme);
    document.documentElement.setAttribute("data-theme", nextTheme);
  };

  // Auth Guard - developer only
  useEffect(() => {
    const token = localStorage.getItem("token");
    const storedUser = localStorage.getItem("user");

    if (!token || !storedUser) {
      router.push("/");
      return;
    }

    try {
      const parsedUser = JSON.parse(storedUser);
      if (parsedUser.role !== "developer") {
        router.push("/dashboard");
        return;
      }
      setUser(parsedUser);
      fetchJobs(token);
      setPageLoading(false);
    } catch (e) {
      console.error("Failed to parse user session, logging out.", e);
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      router.push("/");
    }
  }, [router]);

  // Polling for running jobs
  useEffect(() => {
    const hasRunningJobs = jobs.some(j => j.status === "PENDING" || j.status === "RUNNING");

    if (hasRunningJobs && !pollIntervalRef.current) {
      const token = localStorage.getItem("token");
      pollIntervalRef.current = setInterval(() => {
        fetchJobs(token);
      }, 2500);
    } else if (!hasRunningJobs && pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    };
  }, [jobs]);

  // Animate dashboard container
  useEffect(() => {
    if (selectedSite && dashboardRef.current) {
      dashboardRef.current.style.opacity = '0';
      dashboardRef.current.style.transform = 'translateY(20px)';
      requestAnimationFrame(() => {
        if (dashboardRef.current) {
          dashboardRef.current.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
          dashboardRef.current.style.opacity = '1';
          dashboardRef.current.style.transform = 'translateY(0)';
        }
      });
    }
  }, [selectedSite]);

  const fetchJobs = async (token) => {
    try {
      const res = await axios.get(process.env.NEXT_PUBLIC_API_URL + "/api/jobs", {
        headers: { Authorization: `Bearer ${token}` }
      });
      setJobs(res.data);
    } catch (err) {
      if (err.response?.status === 401) {
        console.warn("Unauthorized.");
      } else {
        console.error("Failed to load jobs:", err.message || err);
      }
    }
  };

  const handleSignOut = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    router.push("/");
  };

  const getStatusBadge = (status) => {
    const map = {
      COMPLETED: "bg-emerald-500/10 border-emerald-500/20 text-emerald-400",
      RUNNING: "bg-amber-500/10 border-amber-500/20 text-amber-400",
      PENDING: "bg-slate-500/10 border-slate-500/20 text-slate-400",
      FAILED: "bg-rose-500/10 border-rose-500/20 text-rose-400",
    };
    return map[status] || map.PENDING;
  };

  const getScoreColor = (score) => {
    if (score >= 80) return "text-emerald-400";
    if (score >= 50) return "text-amber-400";
    return "text-rose-400";
  };

  const getScoreRingColor = (score) => {
    if (score >= 80) return "#34d399";
    if (score >= 50) return "#fbbf24";
    return "#f87171";
  };

  if (pageLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950">
        <div className="animate-pulse text-sm font-semibold tracking-wider text-slate-500 uppercase">
          Initializing Developer Dashboard...
        </div>
      </div>
    );
  }

  const completedJobs = visibleJobs.filter(j => j.status === "COMPLETED");
  const totalAudits = visibleJobs.length;
  const averageScore = completedJobs.length > 0
    ? Math.round(completedJobs.reduce((acc, curr) => acc + (curr.overall_health_score || 0), 0) / completedJobs.length)
    : 0;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 backdrop-blur-md bg-slate-950/80 border-b border-brand-border py-4 px-6 shadow-lg shadow-slate-950/20">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row gap-4 justify-between items-center w-full">
          <div className="flex w-full md:w-auto justify-between items-center gap-4">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setSidebarOpen(true)}
                className="p-2 rounded-xl border border-brand-border bg-slate-900/50 hover:bg-slate-800 text-slate-350 hover:text-white transition active:scale-[0.95] cursor-pointer shadow-sm hover:border-slate-700 flex items-center justify-center shrink-0"
                title="Open Statistics"
              >
                <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
              <div className="flex items-center bg-white/95 px-3 py-1 rounded-lg shadow-sm">
                <img src="/dimakh_logo.png" alt="Dimakh Consultants Logo" className="h-6 w-auto object-contain" />
              </div>
              <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-widest bg-teal-500/10 text-teal-400 border border-teal-500/20 shadow-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-pulse" />
                Developer
              </span>
            </div>

            {/* Mobile controls */}
            <div className="flex md:hidden items-center gap-2">
              <button
                suppressHydrationWarning
                onClick={toggleTheme}
                className="p-2 rounded-xl border border-brand-border bg-slate-900/50 hover:bg-slate-800 text-slate-300 hover:text-white transition active:scale-[0.95] cursor-pointer shadow-sm hover:border-slate-700 flex items-center justify-center"
                title={theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
              >
                {theme === "dark" ? (
                  <svg className="w-4 h-4 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m0-12.728l.707.707m12.728 12.727l.707.707M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                  </svg>
                )}
              </button>
              <button
                className="border border-brand-border bg-slate-900/50 hover:bg-slate-800 text-slate-300 hover:text-white p-2 rounded-xl transition active:scale-[0.98] cursor-pointer shadow-sm hover:border-slate-700 flex items-center justify-center"
                onClick={handleSignOut}
                title="Sign Out"
              >
                <svg className="w-4 h-4 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </button>
            </div>
          </div>

          {/* Project selector */}
          {jobs.length > 0 && (
            <div className="flex flex-row items-center gap-2 w-full md:w-auto flex-1 md:flex-initial">
              <div className="flex items-center gap-1.5 flex-1 min-w-0">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap hidden sm:inline">Project:</span>
                <div className="relative flex-1 min-w-0">
                  <select
                    value={selectedSite}
                    onChange={(e) => setSelectedSite(e.target.value)}
                    className="bg-slate-900/80 backdrop-blur-md border border-brand-border text-slate-200 rounded-xl px-4 py-2 pr-10 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-transparent transition duration-200 appearance-none cursor-pointer shadow-lg w-full truncate"
                  >
                    <option value="" disabled className="bg-slate-950 text-slate-500 font-medium">
                      -- Select Project --
                    </option>
                    {uniqueSites.map((site) => (
                      <option key={site} value={site} className="bg-slate-950 text-slate-200 font-medium">
                        {site}
                      </option>
                    ))}
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-slate-400">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Desktop controls */}
          <div className="hidden md:flex items-center gap-4">
            <div className="text-xs font-semibold text-slate-400 hidden lg:flex items-center gap-2 bg-slate-900/60 border border-brand-border px-3.5 py-1.5 rounded-full whitespace-nowrap shrink-0">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping shrink-0" />
              <span>Hello, <span className="text-slate-200">{user?.name ? user.name.split(" ")[0] : ""}</span></span>
            </div>
            <button
              suppressHydrationWarning
              onClick={toggleTheme}
              className="p-2 rounded-xl border border-brand-border bg-slate-900/50 hover:bg-slate-800 text-slate-300 hover:text-white transition active:scale-[0.95] cursor-pointer shadow-sm hover:border-slate-700 flex items-center justify-center shrink-0"
              title={theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
              id="theme-toggle-btn"
            >
              {theme === "dark" ? (
                <svg className="w-4 h-4 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m0-12.728l.707.707m12.728 12.727l.707.707M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              ) : (
                <svg className="w-4 h-4 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
              )}
            </button>
            <button
              className="border border-brand-border bg-slate-900/50 hover:bg-slate-800 text-slate-300 hover:text-white px-3.5 py-2 rounded-xl text-xs font-bold tracking-wide transition active:scale-[0.98] cursor-pointer shadow-sm hover:border-slate-700 whitespace-nowrap shrink-0"
              onClick={handleSignOut}
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-10 w-full flex-1 animate-fadeIn flex flex-col justify-center">
        {!selectedSite ? (
          /* Welcome Card */
          <div className="flex-1 flex flex-col items-center justify-center py-20 px-6 max-w-2xl mx-auto text-center animate-fadeIn">
            <div className="p-4 bg-teal-500/10 rounded-full text-teal-400 border border-teal-500/10 shadow-lg shadow-teal-500/5 mb-6">
              <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
              </svg>
            </div>
            <h2 className="text-2xl font-black text-slate-100 mb-3 tracking-tight">Developer Dashboard</h2>
            <p className="text-sm text-slate-400 leading-relaxed mb-8">
              Select a project from the dropdown above to view its audit executions, review findings, and mark bugs as resolved.
            </p>
          </div>
        ) : (
          /* Dashboard Container */
          <div ref={dashboardRef} style={{ opacity: 0 }} className="w-full">
            {/* Stats Panel */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-10">
              <div className="rounded-2xl border border-brand-border/60 bg-gradient-to-br from-brand-card/45 to-slate-900/10 p-6 flex items-center justify-between shadow-xl transition hover:border-slate-800">
                <div>
                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Total Audits</div>
                  <div className="text-3xl font-black text-slate-100">{totalAudits}</div>
                </div>
                <div className="p-3 bg-indigo-500/10 rounded-2xl text-brand-primary border border-indigo-500/10 shadow-inner">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                  </svg>
                </div>
              </div>

              <div className="rounded-2xl border border-brand-border/60 bg-gradient-to-br from-brand-card/45 to-slate-900/10 p-6 flex items-center justify-between shadow-xl transition hover:border-slate-800">
                <div>
                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Average Health Score</div>
                  <div className="text-3xl font-black text-slate-100">{completedJobs.length > 0 ? `${averageScore}%` : "N/A"}</div>
                </div>
                <div className="p-3 bg-emerald-500/10 rounded-2xl text-emerald-400 border border-emerald-500/10 shadow-inner">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                </div>
              </div>

              <div className="rounded-2xl border border-brand-border/60 bg-gradient-to-br from-brand-card/45 to-slate-900/10 p-6 flex items-center justify-between shadow-xl transition hover:border-slate-800">
                <div>
                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Completed Audits</div>
                  <div className="text-3xl font-black text-slate-100">{completedJobs.length}</div>
                </div>
                <div className="p-3 bg-teal-500/10 rounded-2xl text-teal-400 border border-teal-500/10 shadow-inner">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Audit Executions List */}
            <div className="rounded-2xl border border-brand-border bg-gradient-to-br from-brand-card to-slate-950 p-6 md:p-8 shadow-2xl hover:border-slate-800 transition duration-300">
              <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2 mb-2">
                <svg className="w-5 h-5 text-teal-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                Audit Executions
              </h2>
              <p className="text-xs text-slate-400 mb-6 leading-relaxed">
                Click on any completed audit to view detailed findings and resolve bugs.
              </p>

              {visibleJobs.length === 0 ? (
                <div className="text-center py-16 text-slate-500 text-sm">
                  No audit runs found for this project.
                </div>
              ) : (
                <div className="grid gap-4">
                  {visibleJobs.map((job) => {
                    const score = job.overall_health_score || 0;
                    const isCompleted = job.status === "COMPLETED";
                    const circumference = 2 * Math.PI * 28;
                    const dashOffset = circumference - (circumference * score) / 100;

                    return (
                      <div
                        key={job.id}
                        onClick={() => {
                          if (isCompleted) {
                            router.push(`/audits/${job.id}?role=developer`);
                          }
                        }}
                        className={`rounded-2xl border border-brand-border p-5 flex items-center gap-5 transition duration-200 ${
                          isCompleted
                            ? "hover:border-slate-700 hover:bg-brand-card/60 cursor-pointer"
                            : "opacity-70"
                        }`}
                      >
                        {/* Score Ring */}
                        <div className="shrink-0">
                          {isCompleted ? (
                            <div className="relative w-16 h-16">
                              <svg className="w-16 h-16 -rotate-90" viewBox="0 0 64 64">
                                <circle cx="32" cy="32" r="28" stroke="currentColor" strokeWidth="4" fill="none" className="text-slate-800" />
                                <circle
                                  cx="32" cy="32" r="28"
                                  stroke={getScoreRingColor(score)}
                                  strokeWidth="4"
                                  fill="none"
                                  strokeLinecap="round"
                                  strokeDasharray={circumference}
                                  strokeDashoffset={dashOffset}
                                  style={{ transition: "stroke-dashoffset 0.6s ease" }}
                                />
                              </svg>
                              <div className={`absolute inset-0 flex items-center justify-center text-sm font-black ${getScoreColor(score)}`}>
                                {score}
                              </div>
                            </div>
                          ) : (
                            <div className="w-16 h-16 rounded-full border-2 border-slate-800 flex items-center justify-center">
                              {job.status === "RUNNING" || job.status === "PENDING" ? (
                                <svg className="w-6 h-6 text-amber-400 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
                                </svg>
                              ) : (
                                <svg className="w-6 h-6 text-rose-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Job Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2 mb-1">
                            <span className="text-sm font-bold text-slate-200">
                              Audit #{job.id}
                            </span>
                            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider border ${getStatusBadge(job.status)}`}>
                              {job.status === "RUNNING" && (
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse mr-1.5" />
                              )}
                              {job.status}
                            </span>
                            {job.status === "RUNNING" && job.progress_percentage > 0 && (
                              <span className="text-[10px] text-amber-400 font-bold">
                                {job.progress_percentage}%
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-slate-500 font-medium">
                            {new Date(job.created_at).toLocaleString("en-IN", {
                              day: "2-digit", month: "short", year: "numeric",
                              hour: "2-digit", minute: "2-digit"
                            })}
                          </div>
                          {/* Progress bar for running jobs */}
                          {(job.status === "RUNNING" || job.status === "PENDING") && (
                            <div className="mt-2 h-1.5 bg-slate-800 rounded-full overflow-hidden max-w-xs">
                              <div
                                className="h-full bg-gradient-to-r from-amber-500 to-amber-400 rounded-full transition-all duration-500"
                                style={{ width: `${job.progress_percentage || 2}%` }}
                              />
                            </div>
                          )}
                        </div>

                        {/* Arrow */}
                        {isCompleted && (
                          <div className="shrink-0 text-slate-600">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                            </svg>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Sidebar Overlay */}
      <div className={`fixed inset-0 z-[100] transition-opacity duration-300 ease-in-out ${sidebarOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}>
        {/* Backdrop overlay */}
        <div
          className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm transition-opacity duration-300"
          onClick={() => setSidebarOpen(false)}
        />

        {/* Sidebar Panel */}
        <div className={`absolute top-0 left-0 bottom-0 w-72 max-w-[90vw] bg-slate-950 border-r border-brand-border/60 shadow-2xl flex flex-col transition-transform duration-300 ease-in-out ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
          {/* Sidebar Header */}
          <div className="flex items-center justify-between p-5 border-b border-brand-border/40 bg-slate-900/40">
            <h3 className="font-bold text-slate-200 text-sm tracking-wide uppercase flex items-center gap-2">
              <svg className="w-4 h-4 text-teal-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 002 2h2a2 2 0 002-2z" />
              </svg>
              Project Overview
            </h3>
            <button
              type="button"
              onClick={() => setSidebarOpen(false)}
              className="p-1.5 rounded-lg border border-brand-border bg-slate-900/50 hover:bg-slate-800 text-slate-400 hover:text-white transition cursor-pointer"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Sidebar Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Box 1: Total Projects */}
            <div className="rounded-2xl border border-brand-border/60 bg-brand-card/45 p-5 flex flex-col justify-between shadow-lg hover:border-slate-800 transition duration-300">
              <div className="flex justify-between items-start mb-4">
                <span className="text-[10px] font-bold text-slate-550 uppercase tracking-wider">Total Projects</span>
                <div className="p-2 bg-indigo-500/10 rounded-xl text-indigo-400 border border-indigo-500/10">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                  </svg>
                </div>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black text-slate-100 tracking-tight">{totalProjectsCount}</span>
              </div>
            </div>

            {/* Box 2: Ongoing Projects */}
            <div className="rounded-2xl border border-brand-border/60 bg-brand-card/45 p-5 flex flex-col justify-between shadow-lg hover:border-slate-800 transition duration-300">
              <div className="flex justify-between items-start mb-4">
                <span className="text-[10px] font-bold text-slate-550 uppercase tracking-wider">Ongoing Projects</span>
                <div className="p-2 bg-amber-500/10 rounded-xl text-amber-400 border border-amber-500/10">
                  <svg className="w-4 h-4 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black text-slate-100 tracking-tight">{ongoingProjectsCount}</span>
              </div>
            </div>

            {/* Box 3: Completed Projects */}
            <div className="rounded-2xl border border-brand-border/60 bg-brand-card/45 p-5 flex flex-col justify-between shadow-lg hover:border-slate-800 transition duration-300">
              <div className="flex justify-between items-start mb-4">
                <span className="text-[10px] font-bold text-slate-550 uppercase tracking-wider">Completed Projects</span>
                <div className="p-2 bg-emerald-500/10 rounded-xl text-emerald-400 border border-emerald-500/10">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black text-slate-100 tracking-tight">{completedProjectsCount}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
