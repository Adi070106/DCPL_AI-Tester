"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";

const categoryIcons = {
  seo: (
    <svg className="w-4 h-4 text-indigo-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
    </svg>
  ),
  performance: (
    <svg className="w-4 h-4 text-amber-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  accessibility: (
    <svg className="w-4 h-4 text-emerald-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
    </svg>
  ),
  responsiveness: (
    <svg className="w-4 h-4 text-blue-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
    </svg>
  ),
  forms: (
    <svg className="w-4 h-4 text-fuchsia-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
    </svg>
  ),
  navigation: (
    <svg className="w-4 h-4 text-rose-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h7" />
    </svg>
  ),
  security: (
    <svg className="w-4 h-4 text-teal-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
    </svg>
  ),
  content: (
    <svg className="w-4 h-4 text-orange-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  ),
  branding: (
    <svg className="w-4 h-4 text-cyan-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
    </svg>
  )
};

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [triggerLoading, setTriggerLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedCategories, setSelectedCategories] = useState([
    "seo", "performance", "accessibility", "responsiveness", "forms", "navigation", "security", "content", "branding", "footer"
  ]);
  const [schedule, setSchedule] = useState("manual");
  const [assignedTo, setAssignedTo] = useState("");
  const [newBrandName, setNewBrandName] = useState("");
  const [allowedColors, setAllowedColors] = useState("");
  const [allowedFonts, setAllowedFonts] = useState("");
  const [requiredTexts, setRequiredTexts] = useState("");
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [theme, setTheme] = useState("dark");
  const [selectedSite, setSelectedSite] = useState("");
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const dashboardRef = useRef(null);

  const uniqueSites = Array.from(new Set(jobs.map(j => j.website_url)));
  const visibleJobs = selectedSite
    ? jobs.filter(j => j.website_url === selectedSite)
    : [];
  const isProjectComplete = visibleJobs[0]?.is_project_complete || false;

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

  const pollIntervalRef = useRef(null);

  // Auth Guard & Initial Load
  useEffect(() => {
    const token = localStorage.getItem("token");
    const storedUser = localStorage.getItem("user");

    if (!token || !storedUser) {
      router.push("/");
      return;
    }

    try {
      const parsedUser = JSON.parse(storedUser);
      // If developer, redirect to developer dashboard
      if (parsedUser.role === "developer") {
        router.push("/developer");
        return;
      }
      setUser(parsedUser);
      setNewBrandName(parsedUser.custom_brand_name || "DCPL AI-Tester");
      if (parsedUser.brand_rules_str) {
        try {
          const parsedRules = JSON.parse(parsedUser.brand_rules_str);
          setAllowedColors(parsedRules.allowed_colors?.join(", ") || "");
          setAllowedFonts(parsedRules.allowed_fonts?.join(", ") || "");
          setRequiredTexts(parsedRules.required_texts?.join(", ") || "");
        } catch (e) {
          console.error("Failed to parse brand rules", e);
        }
      }
      fetchJobs(token);
      setPageLoading(false);
    } catch (e) {
      console.error("Failed to parse user session, logging out.", e);
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      router.push("/");
    }
  }, [router]);

  // Set up polling if there are any running/pending jobs
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

  // Staggered card animation entrance
  useEffect(() => {
    if (visibleJobs.length > 0) {
      const anime = require("animejs/lib/anime.es.js").default;
      anime.remove('.job-card-anim');

      const cards = document.querySelectorAll('.job-card-anim');
      cards.forEach(card => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(25px)';
      });

      anime({
        targets: '.job-card-anim',
        translateY: [25, 0],
        opacity: [0, 1],
        delay: anime.stagger(60),
        duration: 550,
        easing: 'easeOutQuad'
      });
    }
  }, [visibleJobs]);

  // Clear selected site if it is no longer valid in jobs list, or default to add new project if database is empty
  useEffect(() => {
    if (jobs.length > 0) {
      const uniqueSites = Array.from(new Set(jobs.map(j => j.website_url)));
      if (selectedSite && !uniqueSites.includes(selectedSite)) {
        setSelectedSite("");
        setIsAddingNew(false);
      }
    } else {
      setSelectedSite("");
      setIsAddingNew(true);
    }
  }, [jobs, selectedSite]);

  const handleSiteChange = (val) => {
    setSelectedSite(val);
    setIsAddingNew(false);
    if (val) {
      setWebsiteUrl(val);
      const lastJob = jobs.find(j => j.website_url === val);
      if (lastJob) {
        if (lastJob.selected_categories && lastJob.selected_categories.length > 0) {
          setSelectedCategories(lastJob.selected_categories);
        }
        if (lastJob.schedule) {
          setSchedule(lastJob.schedule);
        }
        setAssignedTo(lastJob.assigned_to || "");
      }
    }
  };

  const handleAddNewProjectClick = () => {
    setIsAddingNew(true);
    setSelectedSite("");
    setWebsiteUrl("");
    setSelectedCategories([
      "seo", "performance", "accessibility", "responsiveness", "forms", "navigation", "security", "content", "branding", "footer"
    ]);
    setSchedule("manual");
    setAssignedTo("");
  };

  const handleToggleProjectComplete = async () => {
    if (!selectedSite) return;
    const token = localStorage.getItem("token");
    const nextStatus = !isProjectComplete;

    try {
      await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/api/jobs/complete?website_url=${encodeURIComponent(selectedSite)}&completed=${nextStatus}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      fetchJobs(token);
    } catch (err) {
      alert(err.response?.data?.detail || "Failed to update project completion status.");
    }
  };

  const handleSaveAssignment = async () => {
    if (!selectedSite) return;
    const token = localStorage.getItem("token");
    try {
      await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/api/jobs/assign?website_url=${encodeURIComponent(selectedSite)}&assigned_to=${encodeURIComponent(assignedTo)}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      fetchJobs(token);
      alert("Developer assignment updated successfully!");
    } catch (err) {
      alert(err.response?.data?.detail || "Failed to update assignment.");
    }
  };

  // Animate dashboard container fade-in when active target or add new state is selected
  useEffect(() => {
    if (selectedSite || isAddingNew) {
      const anime = require("animejs/lib/anime.es.js").default;
      anime({
        targets: dashboardRef.current,
        opacity: [0, 1],
        translateY: [20, 0],
        duration: 500,
        easing: 'easeOutQuad'
      });
    }
  }, [selectedSite, isAddingNew]);

  const fetchJobs = async (token) => {
    try {
      const res = await axios.get(process.env.NEXT_PUBLIC_API_URL + "/api/jobs", {
        headers: { Authorization: `Bearer ${token}` }
      });
      setJobs(res.data);
    } catch (err) {
      if (err.response?.status === 401) {
        console.warn("Unauthorized API call (401). Interceptor should handle redirect.");
      } else {
        console.error("Failed to load jobs list:", err.message || err);
      }
    }
  };

  const handleStartAudit = async (e) => {
    e.preventDefault();
    setError("");
    setTriggerLoading(true);
    const token = localStorage.getItem("token");

    try {
      await axios.post(
        process.env.NEXT_PUBLIC_API_URL + "/api/jobs", // Note: fallback or standard URL
        {
          website_url: websiteUrl,
          selected_categories: selectedCategories,
          schedule: schedule,
          assigned_to: assignedTo
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setSelectedSite(websiteUrl);
      setIsAddingNew(false);
      setWebsiteUrl("");
      fetchJobs(token);
    } catch (err) {
      // Retry on standard port 8000 if 8500 fails or is just local config
      try {
        await axios.post(
          process.env.NEXT_PUBLIC_API_URL + "/api/jobs",
          {
            website_url: websiteUrl,
            selected_categories: selectedCategories,
            schedule: schedule,
            assigned_to: assignedTo
          },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setSelectedSite(websiteUrl);
        setIsAddingNew(false);
        setWebsiteUrl("");
        fetchJobs(token);
      } catch (retryErr) {
        setError(retryErr.response?.data?.detail || "Failed to start audit job. Verify the URL path.");
      }
    } finally {
      setTriggerLoading(false);
    }
  };

  const handleSignOut = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    router.push("/");
  };

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    setSettingsLoading(true);
    const token = localStorage.getItem("token");

    const colorsArr = allowedColors.split(",").map(s => s.strip ? s.strip() : s.trim()).filter(s => s.length > 0);
    const fontsArr = allowedFonts.split(",").map(s => s.strip ? s.strip() : s.trim()).filter(s => s.length > 0);
    const textsArr = requiredTexts.split(",").map(s => s.strip ? s.strip() : s.trim()).filter(s => s.length > 0);

    const brandRulesObj = {
      allowed_colors: colorsArr,
      allowed_fonts: fontsArr,
      required_texts: textsArr
    };

    try {
      const res = await axios.post(process.env.NEXT_PUBLIC_API_URL + "/api/users/settings",
        {
          custom_brand_name: newBrandName,
          brand_rules_str: JSON.stringify(brandRulesObj)
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setUser(res.data);
      localStorage.setItem("user", JSON.stringify(res.data));
      alert("Branding settings saved successfully!");
    } catch (err) {
      if (err.response?.status !== 401) {
        console.error("Failed to save settings:", err.message || err);
        alert(err.response?.data?.detail || "Failed to save branding settings.");
      }
    } finally {
      setSettingsLoading(false);
    }
  };

  const handleDeleteJob = async (jobId) => {
    if (!window.confirm("Are you sure you want to permanently delete this audit record? This will delete all its PDF reports and screenshot files. This action cannot be undone.")) {
      return;
    }

    const token = localStorage.getItem("token");
    try {
      await axios.delete(`${process.env.NEXT_PUBLIC_API_URL}/api/jobs/${jobId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setJobs(jobs.filter(j => j.id !== jobId));
    } catch (err) {
      alert(err.response?.data?.detail || "Failed to delete audit job.");
    }
  };

  const handleCardMouseEnter = (e) => {
    const anime = require("animejs/lib/anime.es.js").default;
    anime({
      targets: e.currentTarget,
      scale: 1.02,
      translateY: -4,
      boxShadow: '0 20px 25px -5px rgba(99, 102, 241, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.2)',
      duration: 300,
      easing: 'easeOutQuad'
    });
  };

  const handleCardMouseLeave = (e) => {
    const anime = require("animejs/lib/anime.es.js").default;
    anime({
      targets: e.currentTarget,
      scale: 1.0,
      translateY: 0,
      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
      duration: 300,
      easing: 'easeOutQuad'
    });
  };

  if (pageLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950">
        <div className="animate-pulse text-sm font-semibold tracking-wider text-slate-500 uppercase">
          Initializing Dashboard...
        </div>
      </div>
    );
  }

  // Stats calculated for the selected website target
  const completedJobs = visibleJobs.filter(j => j.status === "COMPLETED");
  const totalAudits = visibleJobs.length;
  const averageScore = completedJobs.length > 0
    ? Math.round(completedJobs.reduce((acc, curr) => acc + (curr.overall_health_score || 0), 0) / completedJobs.length)
    : 0;
  const activeScansCount = visibleJobs.filter(j => j.status === "PENDING" || j.status === "RUNNING").length;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <header className="sticky top-0 z-50 backdrop-blur-md bg-slate-950/80 border-b border-brand-border py-4 px-6 shadow-lg shadow-slate-950/20">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row gap-4 justify-between items-center w-full">
          {/* Logo and Mobile Controls Row */}
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
            </div>

            {/* Mobile-only theme & logout toggles */}
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

          {jobs.length > 0 && (
            <div className="flex flex-row items-center gap-2 w-full md:w-auto flex-1 md:flex-initial">
              <div className="flex items-center gap-1.5 flex-1 min-w-0">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap hidden sm:inline">Target:</span>
                <div className="relative flex-1 min-w-0">
                  <select
                    value={selectedSite}
                    onChange={(e) => handleSiteChange(e.target.value)}
                    className="bg-slate-900/80 backdrop-blur-md border border-brand-border text-slate-200 rounded-xl px-4 py-2 pr-10 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-transparent transition duration-200 appearance-none cursor-pointer shadow-lg w-full truncate"
                  >
                    <option value="" disabled className="bg-slate-950 text-slate-500 font-medium">
                      -- Select Project / Target --
                    </option>
                    {uniqueSites.map((site) => {
                      const isSiteComplete = jobs.find(j => j.website_url === site)?.is_project_complete;
                      return (
                        <option key={site} value={site} className="bg-slate-950 text-slate-200 font-medium">
                          {site}{isSiteComplete ? " ✓ (Completed)" : ""}
                        </option>
                      );
                    })}
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-slate-400">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  onClick={handleAddNewProjectClick}
                  className="bg-brand-primary/10 hover:bg-brand-primary/20 border border-brand-primary/30 hover:border-brand-primary/50 text-brand-primary text-xs font-bold p-2.5 sm:px-4 sm:py-2 rounded-xl transition duration-200 active:scale-[0.97] flex items-center gap-1.5 cursor-pointer shadow-md"
                  title="Add New Project"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                  </svg>
                  <span className="hidden sm:inline">Add New Project</span>
                </button>

                {selectedSite && (
                  <>
                    <button
                      onClick={handleToggleProjectComplete}
                      className={`text-xs font-bold p-2.5 sm:px-4 sm:py-2 rounded-xl transition duration-205 active:scale-[0.97] flex items-center gap-1.5 cursor-pointer shadow-md ${isProjectComplete
                        ? "bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 hover:border-emerald-500/50 text-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.15)]"
                        : "bg-slate-900/50 hover:bg-slate-800 border border-brand-border hover:border-slate-700 text-slate-300 hover:text-white"
                        }`}
                      title={isProjectComplete ? "Project Complete" : "Mark Project Complete"}
                    >
                      <svg className={`w-4 h-4 ${isProjectComplete ? "text-emerald-400" : "text-slate-400"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        {isProjectComplete ? (
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        ) : (
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        )}
                      </svg>
                      <span className="hidden sm:inline">{isProjectComplete ? "Project Complete" : "Mark Project Complete"}</span>
                    </button>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Desktop-only theme & logout toggles */}
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

      <main className="max-w-7xl mx-auto px-6 py-10 w-full flex-1 animate-fadeIn flex flex-col justify-center">
        {!selectedSite && !isAddingNew ? (
          /* Welcome Card */
          <div className="flex-1 flex flex-col items-center justify-center py-20 px-6 max-w-2xl mx-auto text-center animate-fadeIn">
            <div className="p-4 bg-indigo-500/10 rounded-full text-indigo-400 border border-indigo-500/10 shadow-lg shadow-indigo-500/5 mb-6">
              <svg className="w-10 h-10 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-2xl font-black text-slate-100 mb-3 tracking-tight">No Target Selected</h2>
            <p className="text-sm text-slate-400 leading-relaxed mb-8">
              Select an existing target website from the header dropdown to view its audit history and metrics, or click <strong className="text-indigo-400">Add New Project</strong> to start auditing a new website from scratch.
            </p>
          </div>
        ) : (
          /* Dashboard Container */
          <div ref={dashboardRef} className="opacity-0 w-full">
            {/* Dynamic Stats Panel (Only shown if selectedSite is true) */}
            {selectedSite && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-10">
                <div className="rounded-2xl border border-brand-border/60 bg-gradient-to-br from-brand-card/45 to-slate-900/10 p-6 flex items-center justify-between shadow-xl transition hover:border-slate-800">
                  <div>
                    <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Total Audits Run</div>
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
                    <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Active Scanner Scans</div>
                    <div className="text-3xl font-black text-slate-100">{activeScansCount}</div>
                  </div>
                  <div className="p-3 bg-amber-500/10 rounded-2xl text-amber-400 border border-amber-500/10 shadow-inner">
                    <svg className={`w-5 h-5 ${activeScansCount > 0 ? "animate-spin" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
                    </svg>
                  </div>
                </div>
              </div>
            )}

            {/* Audit Form Section (Always shown when active/new is selected) */}
            <div className="rounded-2xl border border-brand-border bg-gradient-to-br from-brand-card to-slate-950 p-6 md:p-8 shadow-2xl mb-10 hover:border-slate-800 transition duration-300">
              <div className="flex flex-wrap items-center justify-between gap-4 mb-2">
                <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
                  <svg className="w-5 h-5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {isAddingNew ? "Add New Project" : "Run New Website Audit"}
                </h2>
                {selectedSite && isProjectComplete && (
                  <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-[0_0_8px_rgba(16,185,129,0.1)] animate-fadeIn">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span>Project Complete</span>
                  </span>
                )}
              </div>
              <p className="text-xs md:text-sm text-slate-400 mb-6 max-w-3xl leading-relaxed">
                Enter the website seed URL.
              </p>

              {error && (
                <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 p-4 rounded-xl text-sm mb-6 animate-fadeIn">
                  {error}
                </div>
              )}

              <form onSubmit={handleStartAudit}>
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="relative flex-1">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-500">
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                      </svg>
                    </div>
                    <input
                      type="text"
                      placeholder="https://www.example.com"
                      value={websiteUrl}
                      onChange={(e) => setWebsiteUrl(e.target.value)}
                      required
                      className="w-full bg-brand-input border border-brand-border text-slate-200 rounded-xl pl-12 pr-4 py-3.5 text-sm placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-transparent transition duration-200 shadow-inner"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={triggerLoading}
                    className="bg-brand-primary hover:bg-brand-primary-hover text-white font-semibold rounded-xl px-7 py-3.5 text-sm transition active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed shadow-lg shadow-brand-primary/25 whitespace-nowrap cursor-pointer flex items-center justify-center gap-2"
                  >
                    {triggerLoading ? (
                      <>
                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>Queueing...</span>
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span>Start Audit</span>
                      </>
                    )}
                  </button>
                </div>
                <div className="mt-6 pt-5 border-t border-brand-border">
                  <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
                    Audit Execution Schedule:
                  </div>
                  <div className="flex flex-wrap gap-2.5 mb-6">
                    {[
                      { id: "manual", label: "Manual Scan Only" },
                      { id: "daily", label: "Daily Active Monitor" },
                      { id: "weekly", label: "Weekly Active Monitor" }
                    ].map(sched => (
                      <button
                        key={sched.id}
                        type="button"
                        onClick={() => setSchedule(sched.id)}
                        className={`px-4 py-2 text-xs font-bold rounded-xl border transition cursor-pointer ${schedule === sched.id
                          ? "bg-brand-primary border-brand-primary text-white"
                          : "bg-slate-900/60 border-brand-border text-slate-400 hover:text-slate-200"
                          }`}
                      >
                        {sched.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="mt-6 pt-5 border-t border-brand-border">
                  <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
                    Assigned To (Developer Name):
                  </div>
                  <div className="relative max-w-md flex gap-2">
                    <div className="relative flex-1">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-500">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      </div>
                      <input
                        type="text"
                        value={assignedTo}
                        onChange={(e) => setAssignedTo(e.target.value)}
                        className="w-full bg-brand-input border border-brand-border text-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-xs placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-transparent transition duration-200 shadow-inner"
                      />
                    </div>
                    {selectedSite && (
                      <button
                        type="button"
                        onClick={handleSaveAssignment}
                        className="bg-brand-primary/10 hover:bg-brand-primary/20 border border-brand-primary/30 hover:border-brand-primary/50 text-brand-primary text-xs font-bold px-4 py-2.5 rounded-xl transition duration-200 active:scale-[0.97] cursor-pointer shadow-md"
                      >
                        Save
                      </button>
                    )}
                  </div>
                </div>

                <div className="mt-6 pt-5 border-t border-brand-border">
                  <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">
                    Select Audit Categories:
                  </div>
                  <div className="grid grid-cols-[repeat(auto-fill,minmax(140px,1fr))] gap-3">
                    {[
                      { id: "seo", label: "SEO" },
                      { id: "performance", label: "Performance" },
                      { id: "accessibility", label: "Accessibility" },
                      { id: "responsiveness", label: "Responsiveness" },
                      { id: "forms", label: "Forms" },
                      { id: "navigation", label: "Navigation" },
                      { id: "security", label: "Security" },
                      { id: "content", label: "Content" },
                      { id: "branding", label: "Branding" },
                      { id: "footer", label: "Footer" }
                    ].map(cat => (
                      <label
                        key={cat.id}
                        className={`text-xs font-bold flex items-center gap-3 cursor-pointer select-none rounded-xl p-3 border transition duration-150 justify-start ${selectedCategories.includes(cat.id)
                          ? "bg-slate-900/60 text-slate-100 border-indigo-500/20"
                          : "bg-slate-950/20 text-slate-500 border-brand-border/40 hover:text-slate-400 hover:border-slate-800"
                          }`}
                      >
                        <input
                          type="checkbox"
                          checked={selectedCategories.includes(cat.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedCategories([...selectedCategories, cat.id]);
                            } else {
                              if (selectedCategories.length > 1) {
                                setSelectedCategories(selectedCategories.filter(x => x !== cat.id));
                              }
                            }
                          }}
                          className="w-4 h-4 cursor-pointer rounded border-slate-700 accent-brand-primary focus:ring-brand-primary shrink-0"
                        />
                        <span className="leading-none select-none">{cat.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </form>
            </div>

            {/* Selected Target Specific Sections (Settings and Executions) */}
            {selectedSite && (
              <>
                {/* Settings Card */}
                <div className="rounded-2xl border border-brand-border bg-gradient-to-br from-brand-card to-slate-950 p-6 md:p-8 shadow-2xl mb-10 hover:border-slate-800 transition duration-300">
                  <h2 className="text-xl font-bold text-slate-100 mb-2 flex items-center gap-2">
                    <svg className="w-5 h-5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    Agency White-Labeling Settings
                  </h2>
                  <p className="text-xs md:text-sm text-slate-400 mb-6 max-w-3xl leading-relaxed">
                    Customize the brand name displayed in headers, client reports, and generated PDF file footers.
                  </p>
                  <form onSubmit={handleSaveSettings} className="space-y-5">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                          Agency Brand Name
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. My Agency QA Tester"
                          value={newBrandName}
                          onChange={(e) => setNewBrandName(e.target.value)}
                          required
                          className="w-full bg-brand-input border border-brand-border text-slate-200 rounded-xl px-4 py-3.5 text-sm placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-transparent transition duration-200"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                          Allowed Brand Colors (Comma-separated HEX values)
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. #c9a96e, #ffffff, #000000"
                          value={allowedColors}
                          onChange={(e) => setAllowedColors(e.target.value)}
                          className="w-full bg-brand-input border border-brand-border text-slate-200 rounded-xl px-4 py-3.5 text-sm placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-transparent transition duration-200"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                          Allowed Font Families (Comma-separated)
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. Outfit, Inter, sans-serif"
                          value={allowedFonts}
                          onChange={(e) => setAllowedFonts(e.target.value)}
                          className="w-full bg-brand-input border border-brand-border text-slate-200 rounded-xl px-4 py-3.5 text-sm placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-transparent transition duration-200"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                          Required Brand/Copyright Strings (Comma-separated)
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. powered by dimakh consultants, copyright 2026"
                          value={requiredTexts}
                          onChange={(e) => setRequiredTexts(e.target.value)}
                          className="w-full bg-brand-input border border-brand-border text-slate-200 rounded-xl px-4 py-3.5 text-sm placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-transparent transition duration-200"
                        />
                      </div>
                    </div>

                    <div className="flex justify-end pt-2">
                      <button
                        type="submit"
                        disabled={settingsLoading}
                        className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl px-6 py-3.5 text-sm transition active:scale-[0.98] disabled:opacity-60 cursor-pointer shadow-md flex items-center justify-center gap-2 whitespace-nowrap"
                      >
                        {settingsLoading ? "Saving..." : "Save Branding Guidelines"}
                      </button>
                    </div>
                  </form>
                </div>

                {/* Audit History List */}
                <div>
                  <h2 className="text-lg font-extrabold text-slate-100 mb-6 tracking-tight flex items-center gap-2">
                    <svg className="w-5 h-5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Audit Executions
                  </h2>

                  {visibleJobs.length === 0 ? (
                    <div className="rounded-2xl border border-brand-border bg-brand-card/40 text-center py-16 px-4 text-slate-500 shadow-inner">
                      No audits have been executed yet for this target.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {visibleJobs.map((job) => (
                        <div
                          key={job.id}
                          className="job-card-anim opacity-0 rounded-2xl border border-brand-border bg-brand-card/45 p-6 flex flex-col justify-between shadow-xl min-h-[180px] hover:border-slate-800 hover:bg-brand-card/75 transition-colors duration-300"
                          onMouseEnter={handleCardMouseEnter}
                          onMouseLeave={handleCardMouseLeave}
                        >
                          <div>
                            <div className="flex justify-between items-start gap-4 mb-2">
                              <div className="text-sm font-bold text-slate-200 truncate flex-1 hover:text-indigo-300 transition cursor-default" title={job.website_url}>
                                {job.website_url}
                              </div>
                              <div className="flex flex-wrap gap-1.5 justify-end">
                                {job.schedule && job.schedule !== "manual" && (
                                  <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[8px] font-extrabold uppercase tracking-wider border bg-indigo-500/10 text-indigo-400 border-indigo-500/20">
                                    {job.schedule}
                                  </span>
                                )}
                                <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wider border ${getStatusBadgeClass(job.status)}`}>
                                  {job.status}
                                </span>
                              </div>
                            </div>

                            <div className="text-[10px] font-semibold text-slate-500 mb-5 flex items-center gap-1.5">
                              <svg className="w-3.5 h-3.5 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                              <span>
                                {(() => {
                                  if (!job.created_at) return "";
                                  let cleanStr = job.created_at;
                                  if (!cleanStr.endsWith("Z") && !/[-+]\d{2}:?\d{2}$/.test(cleanStr)) {
                                    cleanStr += "Z";
                                  }
                                  const dateObj = new Date(cleanStr);
                                  const formattedDate = dateObj.toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata" });
                                  const formattedTime = dateObj.toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata", hour: '2-digit', minute: '2-digit', hour12: true });
                                  return `${formattedDate} at ${formattedTime.toUpperCase()} IST`;
                                })()}
                              </span>
                            </div>
                            {job.assigned_to && (
                              <div className="text-[10px] font-semibold text-indigo-400/90 mb-5 flex items-center gap-1.5 -mt-3.5">
                                <svg className="w-3.5 h-3.5 text-indigo-500/80" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                </svg>
                                <span>Assigned To: <strong className="text-slate-300">{job.assigned_to}</strong></span>
                              </div>
                            )}
                          </div>

                          {/* Progress Bar for Active Jobs */}
                          {(job.status === "PENDING" || job.status === "RUNNING") && (
                            <div className="mt-auto space-y-2.5">
                              <div className="flex justify-between text-xs font-semibold text-slate-400">
                                <span className="flex items-center gap-1.5">
                                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-ping" />
                                  <span>Auditing pages...</span>
                                </span>
                                <span>{job.progress_percentage}%</span>
                              </div>
                              <div className="h-2 bg-slate-950 rounded-full overflow-hidden border border-brand-border/40">
                                <div
                                  className="h-full bg-brand-primary rounded-full transition-all duration-500 animate-pulse shadow-[0_0_8px_rgba(99,102,241,0.5)]"
                                  style={{ width: `${job.progress_percentage}%` }}
                                />
                              </div>
                            </div>
                          )}

                          {/* Action Buttons for Completed Jobs */}
                          {job.status === "COMPLETED" && (
                            <div className="mt-auto flex gap-2 pt-2">
                              <button
                                className="flex-1 text-center bg-slate-900 hover:bg-slate-850 border border-brand-border hover:border-slate-700 text-slate-200 hover:text-white text-xs font-extrabold py-3 px-4 rounded-xl transition duration-200 active:scale-[0.98] cursor-pointer shadow-sm flex items-center justify-center gap-2"
                                onClick={() => router.push(`/audits/${job.id}`)}
                              >
                                <span>View Reports</span>
                                <svg className="w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                                </svg>
                              </button>
                              <button
                                className="p-3 bg-slate-900 hover:bg-rose-950/30 border border-brand-border hover:border-rose-500/20 text-slate-400 hover:text-rose-400 rounded-xl transition duration-200 active:scale-[0.98] cursor-pointer"
                                onClick={() => handleDeleteJob(job.id)}
                                title="Delete Audit"
                              >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            </div>
                          )}

                          {job.status === "FAILED" && (
                            <div className="mt-auto space-y-3 pt-2">
                              <div className="text-[11px] text-rose-400 bg-rose-500/5 border border-rose-500/10 p-3 rounded-xl leading-relaxed flex items-start gap-2">
                                <svg className="w-4 h-4 shrink-0 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                                <span>Scan failed. The target host was unresponsive or blocked the crawler requests.</span>
                              </div>
                              <button
                                className="w-full text-center bg-slate-900/40 hover:bg-rose-950/20 border border-brand-border/60 hover:border-rose-500/20 text-slate-400 hover:text-rose-400 text-xs font-bold py-2.5 px-4 rounded-xl transition duration-200 active:scale-[0.98] cursor-pointer flex items-center justify-center gap-1.5"
                                onClick={() => handleDeleteJob(job.id)}
                              >
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                                <span>Delete Record</span>
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </main>

      {/* Sidebar Drawer */}
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
              <svg className="w-4 h-4 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
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
                <span className="text-xs font-semibold text-slate-450"></span>
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
                <span className="text-xs font-semibold text-slate-450"></span>
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
                <span className="text-xs font-semibold text-slate-450"></span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function getStatusBadgeClass(status) {
  switch (status) {
    case "COMPLETED":
      return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-[0_0_8px_rgba(16,185,129,0.08)]";
    case "RUNNING":
      return "bg-blue-500/10 text-blue-400 border-blue-500/20 shadow-[0_0_8px_rgba(59,130,246,0.08)]";
    case "PENDING":
      return "bg-amber-500/10 text-amber-400 border-amber-500/20 shadow-[0_0_8px_rgba(234,179,8,0.08)]";
    case "FAILED":
      return "bg-rose-500/10 text-rose-400 border-rose-500/20 shadow-[0_0_8px_rgba(244,63,94,0.08)]";
    default:
      return "bg-slate-500/10 text-slate-400 border-slate-500/20";
  }
}
