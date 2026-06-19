"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import axios from "axios";
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts";

const categoryIcons = {
  seo: (
    <svg className="w-5 h-5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
    </svg>
  ),
  performance: (
    <svg className="w-5 h-5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  accessibility: (
    <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
    </svg>
  ),
  responsiveness: (
    <svg className="w-5 h-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
    </svg>
  ),
  forms: (
    <svg className="w-5 h-5 text-fuchsia-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
    </svg>
  ),
  navigation: (
    <svg className="w-5 h-5 text-rose-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h7" />
    </svg>
  ),
  security: (
    <svg className="w-5 h-5 text-teal-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
    </svg>
  ),
  content: (
    <svg className="w-5 h-5 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  ),
  branding: (
    <svg className="w-5 h-5 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
    </svg>
  ),
  footer: (
    <svg className="w-5 h-5 text-rose-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2 2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
    </svg>
  )
};

const subjectIcons = {
  "SEO": categoryIcons.seo,
  "Performance": categoryIcons.performance,
  "Accessibility": categoryIcons.accessibility,
  "Responsiveness": categoryIcons.responsiveness,
  "Forms": categoryIcons.forms,
  "Navigation": categoryIcons.navigation,
  "Security": categoryIcons.security,
  "Content": categoryIcons.content,
  "Branding": categoryIcons.branding,
  "Footer": categoryIcons.footer
};

export default function AuditDetailPage() {
  const router = useRouter();
  const { id: jobId } = useParams();
  const searchParams = useSearchParams();

  // Determine user role from URL query param or localStorage
  const urlRole = searchParams.get("role");
  const userRole = (() => {
    if (urlRole === "developer") return "developer";
    try {
      const stored = localStorage.getItem("user");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed?.role === "developer") return "developer";
      }
    } catch {}
    return "tester";
  })();

  // Tabs the developer is allowed to see
  const DEVELOPER_ALLOWED_TABS = ["developer", "map", "crawl_health", "performance_diagnostics", "security", "resolved", "compare"];
  const isDeveloperRole = userRole === "developer";

  const [audit, setAudit] = useState(null);
  const [activeTab, setActiveTab] = useState(isDeveloperRole ? "developer" : "client");
  const [animatedScore, setAnimatedScore] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [downloading, setDownloading] = useState(null); // stores reportId of active download

  // Filters for Developer tab
  const [severityFilter, setSeverityFilter] = useState("ALL");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [trendsData, setTrendsData] = useState([]);
  const [pageFilter, setPageFilter] = useState("ALL");
  const [selectedNode, setSelectedNode] = useState(null);
  const [customBrandName, setCustomBrandName] = useState("DCPL AI-Tester");
  const [theme, setTheme] = useState("dark");
  const [mapLayout, setMapLayout] = useState("radial"); // radial or horizontal
  const [compareRuns, setCompareRuns] = useState([]);
  const [compareTargetJobId, setCompareTargetJobId] = useState("");
  const [comparisonData, setComparisonData] = useState(null);
  const [loadingComparison, setLoadingComparison] = useState(false);
  const [selectedSeoUrl, setSelectedSeoUrl] = useState("");
  const [showRawJson, setShowRawJson] = useState({});

  // Visual Inspector states
  const [viewMode, setViewMode] = useState("list"); // "list" or "inspector"
  const [selectedScreenshotId, setSelectedScreenshotId] = useState("");
  const [selectedFindingId, setSelectedFindingId] = useState(null);
  const [hoveredFindingId, setHoveredFindingId] = useState(null);
  const [inspectZoom, setInspectZoom] = useState(1);
  const [inspectPan, setInspectPan] = useState({ x: 0, y: 0 });
  const [isInspectPanning, setIsInspectPanning] = useState(false);
  const [inspectPanStart, setInspectPanStart] = useState({ x: 0, y: 0, panX: 0, panY: 0 });

  // Crawl Map Zoom and Pan states
  const [graphNodes, setGraphNodes] = useState([]);
  const [graphZoom, setGraphZoom] = useState(0.95);
  const [graphPan, setGraphPan] = useState({ x: 30, y: 10 });
  const [isGraphPanning, setIsGraphPanning] = useState(false);
  const [graphPanStart, setGraphPanStart] = useState({ x: 0, y: 0, panX: 0, panY: 0 });
  const [dragNodeId, setDragNodeId] = useState(null);
  const [physicsTicks, setPhysicsTicks] = useState(0);

  // Recharts Trends Category Toggles
  const [activeCategoryLines, setActiveCategoryLines] = useState({
    overall: true,
    seo: true,
    performance: true,
    accessibility: true,
    security: true,
    responsiveness: false,
    forms: false,
    navigation: false,
    content: false,
    branding: false,
    footer: false
  });

  const toggleCategoryLine = (cat) => {
    setActiveCategoryLines(prev => ({
      ...prev,
      [cat]: !prev[cat]
    }));
  };

  const lineColors = {
    overall: "#6366f1",
    seo: "#a855f7",
    performance: "#f59e0b",
    accessibility: "#10b981",
    security: "#14b8a6",
    responsiveness: "#3b82f6",
    forms: "#d946ef",
    navigation: "#f43f5e",
    content: "#f97316",
    branding: "#06b6d4",
    footer: "#ec4899"
  };

  // Drag & Pan & Zoom Event Handlers for Crawl Graph
  const handleGraphMouseDown = (e) => {
    if (e.target.tagName === "svg" || e.target.tagName === "line" || e.target.id === "graph-bg") {
      setIsGraphPanning(true);
      setGraphPanStart({
        x: e.clientX,
        y: e.clientY,
        panX: graphPan.x,
        panY: graphPan.y
      });
    }
  };

  const handleGraphMouseMove = (e) => {
    if (dragNodeId) {
      const svg = e.currentTarget;
      const rect = svg.getBoundingClientRect();
      const x = (e.clientX - rect.left - graphPan.x) / graphZoom;
      const y = (e.clientY - rect.top - graphPan.y) / graphZoom;
      setGraphNodes(prev => prev.map(n => n.url === dragNodeId ? { ...n, x, y } : n));
    } else if (isGraphPanning) {
      const dx = e.clientX - graphPanStart.x;
      const dy = e.clientY - graphPanStart.y;
      setGraphPan({ x: graphPanStart.panX + dx, y: graphPanStart.panY + dy });
    }
  };

  const handleGraphMouseUp = () => {
    setDragNodeId(null);
    setIsGraphPanning(false);
  };

  const handleGraphWheel = (e) => {
    e.preventDefault();
    const zoomFactor = 1.08;
    let newZoom = graphZoom;
    if (e.deltaY < 0) {
      newZoom = Math.min(6, graphZoom * zoomFactor);
    } else {
      newZoom = Math.max(0.15, graphZoom / zoomFactor);
    }
    setGraphZoom(newZoom);
  };

  // Zoom & Pan Event Handlers for Interactive Visual Inspector
  const handleInspectMouseDown = (e) => {
    e.preventDefault();
    setIsInspectPanning(true);
    setInspectPanStart({
      x: e.clientX,
      y: e.clientY,
      panX: inspectPan.x,
      panY: inspectPan.y
    });
  };

  const handleInspectMouseMove = (e) => {
    if (isInspectPanning) {
      const dx = e.clientX - inspectPanStart.x;
      const dy = e.clientY - inspectPanStart.y;
      setInspectPan({ x: inspectPanStart.panX + dx, y: inspectPanStart.panY + dy });
    }
  };

  const handleInspectMouseUp = () => {
    setIsInspectPanning(false);
  };

  const brokenLinks = [];
  if (audit?.broken_links_str) {
    try {
      const parsed = JSON.parse(audit.broken_links_str);
      if (Array.isArray(parsed)) {
        brokenLinks.push(...parsed);
      }
    } catch (e) {}
  }
  
  const slowestPages = [];
  if (audit?.slowest_pages_str) {
    try {
      const parsed = JSON.parse(audit.slowest_pages_str);
      if (Array.isArray(parsed)) {
        slowestPages.push(...parsed);
      }
    } catch (e) {}
  }
  
  const heavyAssets = [];
  if (audit?.heavy_assets_str) {
    try {
      const parsed = JSON.parse(audit.heavy_assets_str);
      if (Array.isArray(parsed)) {
        heavyAssets.push(...parsed);
      }
    } catch (e) {}
  }
  
  const pageSeoList = [];
  if (audit?.page_seo_str) {
    try {
      const parsed = JSON.parse(audit.page_seo_str);
      if (Array.isArray(parsed)) {
        pageSeoList.push(...parsed);
      }
    } catch (e) {}
  }

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

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/");
      return;
    }
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      try {
        const parsed = JSON.parse(storedUser);
        if (parsed.custom_brand_name) {
          setCustomBrandName(parsed.custom_brand_name);
        }
      } catch (e) { }
    }
    fetchAuditDetails(token);
  }, [jobId, router]);

  // Score ticking count-up animation
  useEffect(() => {
    if (audit && audit.overall_health_score >= 0) {
      const anime = require("animejs/lib/anime.es.js").default;
      const obj = { score: 0 };
      anime({
        targets: obj,
        score: audit.overall_health_score,
        round: 1,
        easing: "easeOutExpo",
        duration: 2000,
        update: () => {
          setAnimatedScore(obj.score);
        }
      });
    }
  }, [audit]);

  // Crawl map SVG line drawing and elastic node pop animations
  useEffect(() => {
    let hasRelations = false;
    if (audit?.crawl_relations_str) {
      try {
        const relations = JSON.parse(audit.crawl_relations_str);
        if (relations.length > 0) {
          hasRelations = true;
        }
      } catch (e) { }
    }

    if (activeTab === "map" && hasRelations) {
      const anime = require("animejs/lib/anime.es.js").default;

      // Reset styles before running
      anime.set('.crawl-map-link', {
        strokeDashoffset: (el) => el.style.strokeDasharray || 0
      });
      anime.set('.crawl-map-node-group', {
        scale: 0
      });

      const tl = anime.timeline({
        easing: 'easeOutQuad'
      });

      tl.add({
        targets: '.crawl-map-link',
        strokeDashoffset: 0,
        duration: 900,
        delay: anime.stagger(40)
      })
        .add({
          targets: '.crawl-map-node-group',
          scale: [0, 1],
          duration: 1000,
          delay: anime.stagger(50),
          easing: 'easeOutElastic(1, 0.8)'
        }, '-=400');
    } else if (activeTab === "security") {
      const anime = require("animejs/lib/anime.es.js").default;
      anime({
        targets: '.security-card',
        translateY: [15, 0],
        opacity: [0, 1],
        delay: anime.stagger(80),
        duration: 600,
        easing: 'easeOutQuad'
      });
    } else if (activeTab === "trends" && trendsData.length > 0) {
      const anime = require("animejs/lib/anime.es.js").default;
      anime({
        targets: '.trend-card',
        translateY: [15, 0],
        opacity: [0, 1],
        delay: anime.stagger(80),
        duration: 600,
        easing: 'easeOutQuad'
      });
    }
  }, [activeTab, audit, trendsData]);

  const fetchAuditDetails = async (token) => {
    try {
      const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/api/audits/by-job/${jobId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAudit(res.data);
      if (res.data?.id) {
        fetchTrends(token, res.data.id);
      }
    } catch (err) {
      if (err.response?.status === 401) {
        console.warn("Unauthorized API call (401). Interceptor should handle redirect.");
      } else {
        setError(err.response?.data?.detail || "Failed to load audit details.");
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchTrends = async (token, auditId) => {
    try {
      const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/api/audits/${auditId}/history`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTrendsData(res.data);
    } catch (err) {
      if (err.response?.status !== 401) {
        console.error("Failed to load historical trends:", err.message || err);
      }
    }
  };

  useEffect(() => {
    if (activeTab === "compare" && audit?.job?.website_url && compareRuns.length === 0) {
      const token = localStorage.getItem("token");
      axios.get(`${process.env.NEXT_PUBLIC_API_URL}/api/jobs/trends?url=${encodeURIComponent(audit.job.website_url)}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      .then(res => {
        // Filter out current job
        const others = res.data.filter(run => run.job_id !== Number(jobId));
        setCompareRuns(others);
      })
      .catch(err => {
        if (err.response?.status !== 401) {
          console.error("Failed to load other runs for comparison:", err.message || err);
        }
      });
    }
  }, [activeTab, audit, jobId, compareRuns]);

  useEffect(() => {
    if (compareTargetJobId) {
      setLoadingComparison(true);
      const token = localStorage.getItem("token");
      
      axios.get(`${process.env.NEXT_PUBLIC_API_URL}/api/audits/by-job/${compareTargetJobId}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      .then(targetAuditRes => {
        const targetAuditId = targetAuditRes.data.id;
        const currentAuditId = audit.id;
        
        return axios.get(`${process.env.NEXT_PUBLIC_API_URL}/api/audits/compare/run?audit_id_a=${targetAuditId}&audit_id_b=${currentAuditId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
      })
      .then(compareRes => {
        setComparisonData(compareRes.data);
      })
      .catch(err => {
        if (err.response?.status !== 401) {
          console.error("Failed to perform comparison:", err.message || err);
          alert("Failed to load comparison details.");
        }
      })
      .finally(() => {
        setLoadingComparison(false);
      });
    } else {
      setComparisonData(null);
    }
  }, [compareTargetJobId, audit]);

  useEffect(() => {
    if (pageSeoList && pageSeoList.length > 0 && !selectedSeoUrl) {
      setSelectedSeoUrl(pageSeoList[0].url);
    }
  }, [pageSeoList, selectedSeoUrl]);

  const getUrlPath = (url) => {
    try {
      const parsed = new URL(url);
      return parsed.pathname === "/" || parsed.pathname === "" ? "/" : parsed.pathname;
    } catch (e) {
      return url;
    }
  };

  // Crawled pages extraction
  const crawledUrls = new Set();
  const seedUrl = audit?.job?.website_url || "";
  if (seedUrl) {
    crawledUrls.add(seedUrl);
  }
  let crawlRelations = [];
  if (audit?.crawl_relations_str) {
    try {
      crawlRelations = JSON.parse(audit.crawl_relations_str);
      crawlRelations.forEach(([parent, child]) => {
        crawledUrls.add(parent);
        crawledUrls.add(child);
      });
    } catch (e) {
      console.error("Failed to parse crawl relations:", e);
    }
  }
  const allScannedPages = Array.from(crawledUrls);

  // Position nodes concentric layout
  const nodes = [];
  const nodeMap = {};
  const parentMap = {};
  let levelGroups = {};

  // Initialize and update Crawl Graph nodes when audit, mapLayout, or activeTab changes
  useEffect(() => {
    if (!audit) return;

    // BFS Concentric Layout computation
    const computedNodes = [];
    const localNodeMap = {};
    const localParentMap = {};
    const localLevelGroups = {};
    const localLevels = {};
    localLevels[seedUrl] = 0;

    let queue = [seedUrl];
    while (queue.length > 0) {
      const current = queue.shift();
      const currentLevel = localLevels[current];
      const children = crawlRelations
        .filter(([parent, child]) => parent === current)
        .map(([parent, child]) => child);

      children.forEach(child => {
        if (localLevels[child] === undefined) {
          localLevels[child] = currentLevel + 1;
          localParentMap[child] = current;
          queue.push(child);
        }
      });
    }

    allScannedPages.forEach(url => {
      if (localLevels[url] === undefined) {
        localLevels[url] = 1;
      }
    });

    allScannedPages.forEach(url => {
      const lvl = localLevels[url];
      if (!localLevelGroups[lvl]) {
        localLevelGroups[lvl] = [];
      }
      localLevelGroups[lvl].push(url);
    });

    const centerX = 500;
    const centerY = 350;

    if (mapLayout === "radial") {
      localNodeMap[seedUrl] = { url: seedUrl, x: centerX, y: centerY, label: "/", level: 0 };
      computedNodes.push(localNodeMap[seedUrl]);

      const maxLevel = Math.max(...Object.values(localLevels).map(Number), 1);
      const maxAllowedRadius = 240;
      const baseRadius = maxLevel > 0 ? maxAllowedRadius / maxLevel : 120;

      Object.keys(localLevelGroups).forEach(lvlStr => {
        const lvl = Number(lvlStr);
        if (lvl === 0) return;

        const levelUrls = localLevelGroups[lvl];
        const numNodes = levelUrls.length;
        const radius = lvl * baseRadius;

        levelUrls.forEach((url, index) => {
          const angle = (index / numNodes) * 2 * Math.PI + (lvl * 0.25);
          const x = centerX + radius * Math.cos(angle);
          const y = centerY + radius * Math.sin(angle);

          localNodeMap[url] = {
            url,
            x,
            y,
            label: getUrlPath(url),
            level: lvl
          };
          computedNodes.push(localNodeMap[url]);
        });
      });
    } else {
      // Build a map of children for each node in the BFS tree
      const childrenMap = {};
      allScannedPages.forEach(url => {
        childrenMap[url] = [];
      });
      allScannedPages.forEach(url => {
        const parent = localParentMap[url];
        if (parent && childrenMap[parent]) {
          childrenMap[parent].push(url);
        }
      });

      // Identify and order the leaf nodes using a depth-first traversal
      const leafOrder = [];
      function traverse(url) {
        const children = childrenMap[url] || [];
        if (children.length === 0) {
          leafOrder.push(url);
        } else {
          const sortedChildren = [...children].sort((a, b) => a.localeCompare(b));
          sortedChildren.forEach(child => traverse(child));
        }
      }
      traverse(seedUrl);

      allScannedPages.forEach(url => {
        if (!leafOrder.includes(url) && (childrenMap[url] || []).length === 0) {
          leafOrder.push(url);
        }
      });

      const totalLeaves = leafOrder.length;
      const leafYMap = {};
      leafOrder.forEach((url, idx) => {
        leafYMap[url] = 60 + (idx + 0.5) * (580 / Math.max(1, totalLeaves));
      });

      const computedY = {};
      function getOrComputeY(url) {
        if (computedY[url] !== undefined) return computedY[url];
        const children = childrenMap[url] || [];
        if (children.length === 0) {
          computedY[url] = leafYMap[url];
        } else {
          const childYs = children.map(c => getOrComputeY(c));
          computedY[url] = childYs.reduce((sum, val) => sum + val, 0) / children.length;
        }
        return computedY[url];
      }

      allScannedPages.forEach(url => {
        getOrComputeY(url);
      });

      const maxLevel = Math.max(...Object.values(localLevels).map(Number), 1);
      const levelWidth = maxLevel > 0 ? 800 / maxLevel : 200;

      localNodeMap[seedUrl] = {
        url: seedUrl,
        x: 100,
        y: computedY[seedUrl],
        label: "/",
        level: 0
      };
      computedNodes.push(localNodeMap[seedUrl]);

      allScannedPages.forEach(url => {
        if (url === seedUrl) return;
        const lvl = localLevels[url] || 1;
        localNodeMap[url] = {
          url,
          x: 100 + lvl * levelWidth,
          y: computedY[url],
          label: getUrlPath(url),
          level: lvl
        };
        computedNodes.push(localNodeMap[url]);
      });
    }

    setGraphNodes(computedNodes);
    setPhysicsTicks(80);
  }, [audit, mapLayout, activeTab]);

  // Physics tick simulation running in animation frame loop
  const runPhysicsTick = () => {
    if (!audit) return;
    const seedUrl = audit.job.website_url;
    
    let crawlRelations = [];
    if (audit.crawl_relations_str) {
      try {
        crawlRelations = JSON.parse(audit.crawl_relations_str);
      } catch (e) {}
    }

    setGraphNodes(prevNodes => {
      if (prevNodes.length === 0) return prevNodes;
      const k = 0.035; // Spring force strength
      const repel = 220; // Node repulsion force strength
      const nextNodes = prevNodes.map(n => ({ ...n, fx: 0, fy: 0 }));

      // 1. Repulsive forces between nodes
      for (let i = 0; i < nextNodes.length; i++) {
        for (let j = i + 1; j < nextNodes.length; j++) {
          const n1 = nextNodes[i];
          const n2 = nextNodes[j];
          const dx = n2.x - n1.x;
          const dy = n2.y - n1.y;
          const dist = Math.hypot(dx, dy) || 1;
          if (dist < 260) {
            const force = repel / (dist * dist);
            const fx = (dx / dist) * force;
            const fy = (dy / dist) * force;
            n1.fx -= fx;
            n1.fy -= fy;
            n2.fx += fx;
            n2.fy += fy;
          }
        }
      }

      // 2. Attractive forces along crawl relationships
      crawlRelations.forEach(([parentUrl, childUrl]) => {
        const parent = nextNodes.find(n => n.url === parentUrl);
        const child = nextNodes.find(n => n.url === childUrl);
        if (parent && child) {
          const dx = child.x - parent.x;
          const dy = child.y - parent.y;
          const dist = Math.hypot(dx, dy) || 1;
          const desiredDist = 130;
          const force = k * (dist - desiredDist);
          const fx = (dx / dist) * force;
          const fy = (dy / dist) * force;
          parent.fx += fx;
          parent.fy += fy;
          child.fx -= fx;
          child.fy -= fy;
        }
      });

      // 3. Apply updates with damping relaxation
      const damping = 0.82;
      return nextNodes.map(n => {
        if (n.url === seedUrl || n.url === dragNodeId) return n; // Keep root and dragged node stationary
        const newX = n.x + (n.fx || 0) * damping;
        const newY = n.y + (n.fy || 0) * damping;
        return {
          ...n,
          x: Math.max(50, Math.min(950, newX)),
          y: Math.max(50, Math.min(650, newY))
        };
      });
    });
  };

  useEffect(() => {
    if (physicsTicks > 0) {
      const frame = requestAnimationFrame(() => {
        runPhysicsTick();
        setPhysicsTicks(prev => prev - 1);
      });
      return () => cancelAnimationFrame(frame);
    }
  }, [physicsTicks, dragNodeId]);

  const handleDownloadReport = async (reportId, reportType) => {
    let defaultProjName = "";
    try {
      defaultProjName = new URL(audit?.job?.website_url).hostname.replace("www.", "");
    } catch (e) {
      defaultProjName = audit?.job?.website_url || "";
    }

    const reportTitle = prompt("Enter a custom Project/Report Name for the PDF cover page (optional):", defaultProjName);
    if (reportTitle === null) {
      return; // User cancelled the download
    }

    setDownloading(reportId);
    const token = localStorage.getItem("token");
    try {
      const url = `${process.env.NEXT_PUBLIC_API_URL}/api/reports/download/${reportId}${reportTitle.trim() ? `?report_title=${encodeURIComponent(reportTitle.trim())}` : ""}`;
      const res = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: "blob"
      });

      const blobUrl = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = blobUrl;
      
      const sanitizedTitle = reportTitle.trim()
        ? reportTitle.trim().replace(/[^a-z0-9]/gi, "_").replace(/_+/g, "_")
        : "";
      const downloadFilename = sanitizedTitle
        ? `${sanitizedTitle}_${reportType.toLowerCase()}_report.pdf`
        : `Dimakh_Audit_${reportType.toLowerCase()}_${jobId}.pdf`;

      link.setAttribute("download", downloadFilename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(blobUrl);
    } catch (err) {
      if (err.response?.status !== 401) {
        alert("Failed to download report. Please try again.");
      }
    } finally {
      setDownloading(null);
    }
  };

  const handleToggleFixed = async (findingId) => {
    const token = localStorage.getItem("token");
    try {
      const res = await axios.put(`${process.env.NEXT_PUBLIC_API_URL}/api/audits/findings/${findingId}/toggle-fixed`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAudit(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          findings: prev.findings.map(f => f.id === findingId ? { ...f, is_fixed: res.data.is_fixed } : f)
        };
      });
    } catch (err) {
      if (err.response?.status !== 401) {
        alert("Failed to update finding status. Please try again.");
      }
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950">
        <div className="animate-pulse text-sm font-semibold tracking-wider text-slate-500 uppercase">
          Generating Audit Report View...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 p-6">
        <div className="w-full max-w-md rounded-2xl border border-brand-border bg-brand-card/50 p-8 shadow-2xl backdrop-blur-xl text-center">
          <h3 className="text-rose-500 font-bold text-lg mb-2">Error Loading Report</h3>
          <p className="text-slate-400 text-sm mb-6">{error}</p>
          <button
            className="w-full bg-brand-primary hover:bg-brand-primary-hover text-white font-semibold rounded-xl px-5 py-2.5 text-sm transition active:scale-[0.98] cursor-pointer"
            onClick={() => router.push(isDeveloperRole ? "/developer" : "/dashboard")}
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // Prepare all categories & chart data
  const allCategories = [
    { subject: "SEO", score: audit.seo_score, fullMark: 100 },
    { subject: "Performance", score: audit.performance_score, fullMark: 100 },
    { subject: "Accessibility", score: audit.accessibility_score, fullMark: 100 },
    { subject: "Responsiveness", score: audit.responsiveness_score, fullMark: 100 },
    { subject: "Forms", score: audit.forms_score, fullMark: 100 },
    { subject: "Navigation", score: audit.navigation_score, fullMark: 100 },
    { subject: "Security", score: audit.security_score, fullMark: 100 },
    { subject: "Content", score: audit.content_score, fullMark: 100 },
    { subject: "Branding", score: audit.branding_score, fullMark: 100 },
    { subject: "Footer", score: audit.footer_score, fullMark: 100 },
  ];

  const chartData = allCategories.filter((item) => item.score >= 0);

  // Filter findings for Developer Tab
  const filteredFindings = audit.findings.filter((f) => {
    const matchesSeverity = severityFilter === "ALL" || f.severity === severityFilter;
    const matchesCategory = categoryFilter === "ALL" || f.category === categoryFilter;
    const matchesPage = pageFilter === "ALL" || f.page_url === pageFilter;
    return matchesSeverity && matchesCategory && matchesPage;
  });

  // Extract unique categories for filter options
  const uniqueCategories = Array.from(new Set(audit.findings.map((f) => f.category)));

  // Group client key recommendations
  const clientKeyIssues = audit.findings.filter((f) => f.severity === "CRITICAL" || f.severity === "HIGH");

  if (allScannedPages.length > 0) {
    const centerX = 500;
    const centerY = 350;
    const levels = {};
    levels[seedUrl] = 0;

    let queue = [seedUrl];
    while (queue.length > 0) {
      const current = queue.shift();
      const currentLevel = levels[current];
      const children = crawlRelations
        .filter(([parent, child]) => parent === current)
        .map(([parent, child]) => child);

      children.forEach(child => {
        if (levels[child] === undefined) {
          levels[child] = currentLevel + 1;
          parentMap[child] = current;
          queue.push(child);
        }
      });
    }

    allScannedPages.forEach(url => {
      if (levels[url] === undefined) {
        levels[url] = 1;
      }
    });

    levelGroups = {};
    allScannedPages.forEach(url => {
      const lvl = levels[url];
      if (!levelGroups[lvl]) {
        levelGroups[lvl] = [];
      }
      levelGroups[lvl].push(url);
    });

    if (mapLayout === "radial") {
      nodeMap[seedUrl] = { url: seedUrl, x: centerX, y: centerY, label: "/", level: 0 };
      nodes.push(nodeMap[seedUrl]);

      const maxLevel = Math.max(...Object.values(levels).map(Number), 1);
      const maxAllowedRadius = 240;
      const baseRadius = maxLevel > 0 ? maxAllowedRadius / maxLevel : 120;

      Object.keys(levelGroups).forEach(lvlStr => {
        const lvl = Number(lvlStr);
        if (lvl === 0) return;

        const levelUrls = levelGroups[lvl];
        const numNodes = levelUrls.length;
        const radius = lvl * baseRadius;

        levelUrls.forEach((url, index) => {
          const angle = (index / numNodes) * 2 * Math.PI + (lvl * 0.25);
          const x = centerX + radius * Math.cos(angle);
          const y = centerY + radius * Math.sin(angle);

          nodeMap[url] = {
            url,
            x,
            y,
            label: getUrlPath(url),
            level: lvl
          };
          nodes.push(nodeMap[url]);
        });
      });
    } else {
      // 1. Build a map of children for each node in the BFS tree
      const childrenMap = {};
      allScannedPages.forEach(url => {
        childrenMap[url] = [];
      });
      allScannedPages.forEach(url => {
        const parent = parentMap[url];
        if (parent && childrenMap[parent]) {
          childrenMap[parent].push(url);
        }
      });

      // 2. Identify and order the leaf nodes using a depth-first traversal to keep parent/child adjacent
      const leafOrder = [];
      function traverse(url) {
        const children = childrenMap[url] || [];
        if (children.length === 0) {
          leafOrder.push(url);
        } else {
          const sortedChildren = [...children].sort((a, b) => a.localeCompare(b));
          sortedChildren.forEach(child => traverse(child));
        }
      }
      traverse(seedUrl);

      // Fallback for any unvisited nodes
      allScannedPages.forEach(url => {
        if (!leafOrder.includes(url) && (childrenMap[url] || []).length === 0) {
          leafOrder.push(url);
        }
      });

      // 3. Assign leaf nodes vertical positions evenly spaced across height (60px to 640px)
      const totalLeaves = leafOrder.length;
      const leafYMap = {};
      leafOrder.forEach((url, idx) => {
        leafYMap[url] = 60 + (idx + 0.5) * (580 / Math.max(1, totalLeaves));
      });

      // 4. Compute Y coordinates for parent nodes bottom-up (average of their children's positions)
      const computedY = {};
      function getOrComputeY(url) {
        if (computedY[url] !== undefined) return computedY[url];
        const children = childrenMap[url] || [];
        if (children.length === 0) {
          computedY[url] = leafYMap[url];
        } else {
          const childYs = children.map(c => getOrComputeY(c));
          computedY[url] = childYs.reduce((sum, val) => sum + val, 0) / children.length;
        }
        return computedY[url];
      }

      allScannedPages.forEach(url => {
        getOrComputeY(url);
      });

      // 5. Assign X coordinates based on level and build final nodes array
      const maxLevel = Math.max(...Object.values(levels).map(Number), 1);
      const levelWidth = maxLevel > 0 ? 800 / maxLevel : 200;

      // Seed URL node
      nodeMap[seedUrl] = {
        url: seedUrl,
        x: 100,
        y: computedY[seedUrl],
        label: "/",
        level: 0
      };
      nodes.push(nodeMap[seedUrl]);

      // All other nodes
      allScannedPages.forEach(url => {
        if (url === seedUrl) return;
        const lvl = levels[url] || 1;
        nodeMap[url] = {
          url,
          x: 100 + lvl * levelWidth,
          y: computedY[url],
          label: getUrlPath(url),
          level: lvl
        };
        nodes.push(nodeMap[url]);
      });
    }
  }

  const maxNodesInAnyLevel = allScannedPages.length > 0 && levelGroups ? Math.max(...Object.values(levelGroups).map(arr => arr.length), 1) : 1;
  const dynamicNodeRadius = maxNodesInAnyLevel > 20 ? Math.max(5, Math.floor(180 / maxNodesInAnyLevel)) : 9;
  const rootRadius = dynamicNodeRadius + 6;
  const selectedRadius = dynamicNodeRadius + 3;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <header className="sticky top-0 z-50 backdrop-blur-md bg-slate-950/80 border-b border-brand-border py-4 px-6 shadow-lg shadow-slate-950/20">
        <div className="max-w-7xl mx-auto flex justify-between items-center gap-4">
          <div className="flex items-center gap-4 shrink-0">
            <button
              className="border border-brand-border bg-slate-900/50 hover:bg-slate-800 text-slate-300 hover:text-white px-3.5 py-1.5 rounded-xl text-xs font-bold tracking-wide transition active:scale-[0.98] cursor-pointer flex items-center gap-1.5"
              onClick={() => router.push(isDeveloperRole ? "/developer" : "/dashboard")}
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
              <span>Dashboard</span>
            </button>
            <div className="hidden sm:flex items-center bg-white/95 px-3 py-1 rounded-lg shadow-sm">
              <img src="/dimakh_logo.png" alt="Dimakh Consultants Logo" className="h-6 w-auto object-contain" />
            </div>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <div className="text-xs font-semibold text-slate-400 truncate max-w-[150px] sm:max-w-md lg:max-w-lg bg-slate-900/30 border border-brand-border/40 rounded-lg px-3.5 py-2 select-all font-mono" title={audit.job.website_url}>
              Target: {audit.job.website_url}
            </div>
            <button
              suppressHydrationWarning
              onClick={toggleTheme}
              className="p-2 rounded-xl border border-brand-border bg-slate-900/50 hover:bg-slate-800 text-slate-300 hover:text-white transition active:scale-[0.95] cursor-pointer shadow-sm hover:border-slate-700 flex items-center justify-center"
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
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-10 w-full flex-1 animate-fadeIn">

        {/* TOP ROW: Health Score and Download Buttons */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">

          {/* Radial Health Ring */}
          <div className="rounded-2xl border border-brand-border bg-gradient-to-br from-brand-card to-slate-950 p-6 flex flex-col items-center justify-center shadow-xl text-center">
            <div className="flex justify-center items-center">
              <div
                className={`w-[160px] h-[160px] rounded-full flex justify-center items-center transition-all duration-300 shadow-[0_0_30px_rgba(0,0,0,0.5)] ${getScoreGlowClass(audit.overall_health_score < 0 ? -1 : animatedScore)}`}
                style={{
                  background: audit.overall_health_score < 0
                    ? `conic-gradient(#64748b 0deg, #1b2234 0deg)`
                    : `conic-gradient(${getScoreColor(animatedScore)} ${animatedScore * 3.6}deg, #1b2234 0deg)`
                }}
              >
                <div className="w-[136px] h-[136px] rounded-full bg-brand-card flex flex-col justify-center items-center shadow-inner">
                  <div className="text-4xl font-black text-slate-100 tracking-tight leading-none">
                    {audit.overall_health_score < 0 ? "N/A" : animatedScore}
                  </div>
                  <div className="text-[9px] font-extrabold text-slate-500 uppercase tracking-widest mt-1">Health Score</div>
                </div>
              </div>
            </div>

            <div className="text-center mt-6">
              <div className="font-black text-xs tracking-widest uppercase" style={{ color: getScoreColor(audit.overall_health_score < 0 ? -1 : animatedScore) }}>
                {getScoreRating(audit.overall_health_score < 0 ? -1 : animatedScore)}
              </div>
              <p className="text-slate-400 text-[11px] font-semibold leading-relaxed mt-2.5 max-w-[240px]">
                Based on 19 quality auditors run across {audit.total_pages_scanned} crawled pages.
              </p>
            </div>
          </div>

          {/* Action Card */}
          <div className="rounded-2xl border border-brand-border bg-brand-card/40 p-6 md:p-8 flex flex-col justify-center shadow-xl lg:col-span-2">
            <h2 className="text-lg font-bold text-slate-100 mb-2">Download PDF Reports</h2>
            <p className="text-sm text-slate-400 mb-6 leading-relaxed">
              Download official offline documents customized for business reviews (Client Report) or code corrections (Developer Report).
            </p>

            <div className="flex flex-col sm:flex-row gap-4">
              {audit.reports.map((report) => (
                <button
                  key={report.id}
                  className={`flex-1 font-semibold rounded-xl px-5 py-4 text-sm transition active:scale-[0.98] cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 ${report.report_type === "CLIENT"
                      ? "bg-brand-primary hover:bg-brand-primary-hover text-white shadow-lg shadow-brand-primary/20"
                      : "border border-brand-border bg-slate-900/50 hover:bg-slate-800 text-slate-300 hover:text-white"
                    }`}
                  disabled={downloading === report.id}
                  onClick={() => handleDownloadReport(report.id, report.report_type)}
                >
                  {downloading === report.id ? (
                    <span className="animate-pulse flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-current/30 border-t-current rounded-full animate-spin" />
                      <span>Downloading...</span>
                    </span>
                  ) : report.report_type === "CLIENT" ? (
                    <>
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <span>Download Client PDF</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                      </svg>
                      <span>Download Developer PDF</span>
                    </>
                  )}
                </button>
              ))}
            </div>
          </div>

        </div>

        {/* TAB CONTROLS */}
        <div className="flex border-b border-brand-border mb-8 justify-between items-center w-full gap-1 overflow-x-auto scrollbar-none">
          {/* All tab definitions - filtered by role */}
          {[
            { key: "client", label: "Client View" },
            { key: "developer", label: "Developer View" },
            { key: "map", label: "Crawl Map" },
            { key: "crawl_health", label: "Crawl Health" },
            { key: "performance_diagnostics", label: "Performance" },
            { key: "seo_social_previews", label: "SEO & Social" },
            { key: "security", label: "Security" },
            { key: "trends", label: "Trends" },
            { key: "resolved", label: "Resolved Bugs" },
            { key: "compare", label: "Compare Runs" },
          ]
            .filter(tab => !isDeveloperRole || DEVELOPER_ALLOWED_TABS.includes(tab.key))
            .map(tab => (
              <button
                key={tab.key}
                className={`px-2 py-3 text-[10px] lg:text-xs font-bold uppercase tracking-wider border-b-2 transition duration-150 cursor-pointer bg-transparent text-center flex-1 min-w-fit ${activeTab === tab.key
                    ? "border-brand-primary text-brand-primary"
                    : "border-transparent text-slate-400 hover:text-slate-200"
                  }`}
                onClick={() => setActiveTab(tab.key)}
              >
                {tab.label}
              </button>
            ))}
        </div>

        {/* TAB CONTENT: CLIENT */}
        {activeTab === "client" && (
          <div className="animate-fadeIn">
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

              {/* Radar Chart */}
              <div className="rounded-2xl border border-brand-border bg-brand-card/40 p-6 flex flex-col items-center justify-center shadow-xl lg:col-span-3 min-h-[380px]">
                <h3 className="text-xs font-bold tracking-wider text-slate-400 uppercase mb-6 flex items-center gap-2">
                  <svg className="w-4 h-4 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
                  </svg>
                  Category Score Profile
                </h3>
                <div className="w-full h-[280px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart cx="50%" cy="50%" outerRadius="80%" data={chartData}>
                      <PolarGrid stroke="var(--color-brand-border)" />
                      <PolarAngleAxis dataKey="subject" stroke="var(--color-slate-400)" fontSize={11} />
                      <PolarRadiusAxis angle={30} domain={[0, 100]} stroke="var(--color-brand-border)" />
                      <Radar name="Score" dataKey="score" stroke="#6366f1" fill="#6366f1" fillOpacity={0.25} />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Score List Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 lg:col-span-2">
                {allCategories.map((d) => (
                  <div
                    key={d.subject}
                    className="rounded-2xl border border-brand-border/60 bg-brand-card/50 p-4 flex flex-col items-center justify-center gap-2 shadow-md transition duration-200 hover:border-slate-800 hover:bg-brand-card"
                    style={{ opacity: d.score < 0 ? 0.35 : 1 }}
                  >
                    <div className="p-2 bg-slate-900/60 border border-brand-border/40 rounded-xl">
                      {subjectIcons[d.subject]}
                    </div>
                    <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest text-center">{d.subject}</span>
                    <span
                      className="text-2xl font-black tracking-tight"
                      style={{ color: getScoreColor(d.score) }}
                    >
                      {d.score < 0 ? "N/A" : d.score}
                    </span>
                  </div>
                ))}
              </div>

            </div>

            {/* Business Recommendations */}
            <div className="rounded-2xl border border-brand-border bg-brand-card/40 p-6 md:p-8 mt-8 shadow-xl">
              <h3 className="text-base font-bold text-slate-100 mb-6 flex items-center gap-2 border-b border-brand-border pb-4">
                <svg className="w-5 h-5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
                Key Issues & Business Recommendations
              </h3>

              {clientKeyIssues.length === 0 ? (
                <p className="text-emerald-400 text-sm font-semibold flex items-center gap-2">
                  <span className="w-2 h-2 bg-emerald-500 rounded-full animate-ping" />
                  <span>✓ Outstanding! No Critical or High-severity issues were found on the website.</span>
                </p>
              ) : (
                <div className="space-y-6">
                  {clientKeyIssues.map((issue, idx) => (
                    <div key={issue.id} className="border-b border-brand-border/60 pb-6 last:border-b-0 last:pb-0">
                      <div className="flex flex-col sm:flex-row sm:justify-between items-start gap-2 mb-2">
                        <span className="text-sm font-bold text-slate-100 flex items-center gap-2">
                          <span className="text-xs text-indigo-400 font-mono">0{idx + 1}.</span>
                          <span className={issue.is_fixed ? "line-through text-slate-500 font-normal" : ""}>{issue.title}</span>
                        </span>
                        <div className="flex gap-2 items-center flex-wrap shrink-0">
                          {issue.is_fixed ? (
                            <span className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[9px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full">
                              Resolved
                            </span>
                          ) : (
                            <span className="bg-rose-500/10 border border-rose-500/20 text-rose-400 text-[9px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full">
                              Open
                            </span>
                          )}
                          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wider border ${getSeverityBadgeClass(issue.severity)}`}>
                            {issue.severity}
                          </span>
                        </div>
                      </div>
                      <div className="pl-6 space-y-1.5">
                        <p className="text-slate-300 text-xs md:text-sm leading-relaxed">
                          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-0.5">Description:</span>
                          {issue.description}
                        </p>
                        <p className="text-slate-400 text-xs leading-relaxed">
                          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-0.5">Business Impact:</span>
                          {issue.business_impact}
                        </p>
                        {issue.screenshot_id && (
                          <div className="pt-2">
                            <button
                              onClick={() => {
                                setPageFilter(issue.page_url);
                                setSelectedScreenshotId(issue.screenshot_id);
                                setSelectedFindingId(issue.id);
                                setViewMode("inspector");
                                setActiveTab("developer");
                              }}
                              className="text-[10px] font-extrabold uppercase tracking-wider text-indigo-405 hover:text-indigo-300 transition duration-150 flex items-center gap-1 cursor-pointer bg-slate-900 border border-brand-border/40 hover:border-slate-700 px-3.5 py-1.5 rounded-lg shadow-sm"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              </svg>
                              Open in Interactive Visual Inspector
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Google PageSpeed Insights Screenshots */}
            {audit.performance_score >= 0 && (
              <div className="rounded-2xl border border-brand-border bg-brand-card/40 p-6 md:p-8 mt-8 shadow-xl">
                <h3 className="text-base font-bold text-slate-100 mb-4 flex items-center gap-2 border-b border-brand-border pb-4">
                  <svg className="w-5 h-5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  Google PageSpeed Insights Analysis
                </h3>
                <p className="text-xs text-slate-400 mb-6 leading-relaxed">
                  Official reports generated directly from Google PageSpeed Insights for both Desktop and Mobile configurations.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Desktop PSI report screenshot */}
                  <div className="space-y-3">
                    <div className="text-xs font-bold text-slate-300 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                      <span>Desktop Analysis Report</span>
                    </div>
                    <div className="border border-brand-border rounded-xl overflow-hidden bg-slate-950 shadow-lg group relative">
                      <img
                        src={`${process.env.NEXT_PUBLIC_API_URL}/storage/screenshots/psi_desktop_${audit.id}.png`}
                        alt="PageSpeed Insights Desktop Report"
                        className="w-full h-auto block transition-transform duration-300 hover:scale-[1.01]"
                        onError={(e) => {
                          e.target.parentElement.innerHTML = '<div class="text-xs text-slate-500 p-8 text-center bg-slate-900/40 rounded-xl">Desktop PSI screenshot report not available for this run.</div>';
                        }}
                      />
                    </div>
                  </div>
                  {/* Mobile PSI report screenshot */}
                  <div className="space-y-3">
                    <div className="text-xs font-bold text-slate-300 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                      <span>Mobile Analysis Report</span>
                    </div>
                    <div className="border border-brand-border rounded-xl overflow-hidden bg-slate-950 shadow-lg group relative">
                      <img
                        src={`${process.env.NEXT_PUBLIC_API_URL}/storage/screenshots/psi_mobile_${audit.id}.png`}
                        alt="PageSpeed Insights Mobile Report"
                        className="w-full h-auto block transition-transform duration-300 hover:scale-[1.01]"
                        onError={(e) => {
                          e.target.parentElement.innerHTML = '<div class="text-xs text-slate-500 p-8 text-center bg-slate-900/40 rounded-xl">Mobile PSI screenshot report not available for this run.</div>';
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Historical Progress Trends */}
            {trendsData.length > 1 && (
              <div className="rounded-2xl border border-brand-border bg-brand-card/45 p-6 mt-8 shadow-xl">
                <h3 className="text-xs font-bold tracking-wider text-slate-400 uppercase mb-6 flex items-center gap-2">
                  <svg className="w-4 h-4 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M7 12l3-3 3 3 4-4M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                  Historical Score Trends & Regression Timeline
                </h3>
                <div className="w-full h-[260px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={trendsData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--color-brand-border)" />
                      <XAxis dataKey="date" stroke="var(--color-slate-400)" fontSize={10} />
                      <YAxis domain={[0, 100]} stroke="var(--color-slate-400)" fontSize={10} />
                      <Tooltip
                        contentStyle={{ backgroundColor: 'var(--color-brand-card)', borderColor: 'var(--color-brand-border)', borderRadius: '12px' }}
                        labelClassName="text-slate-300 font-bold font-mono text-xs"
                      />
                      <Legend wrapperStyle={{ fontSize: '10px', paddingTop: '10px' }} />
                      <Line type="monotone" dataKey="overall" name="Overall Health" stroke="#6366f1" strokeWidth={3} activeDot={{ r: 6 }} />
                      <Line type="monotone" dataKey="seo" name="SEO" stroke="#818cf8" strokeWidth={1.5} strokeDasharray="4 4" />
                      <Line type="monotone" dataKey="performance" name="Performance" stroke="#fbbf24" strokeWidth={1.5} strokeDasharray="4 4" />
                      <Line type="monotone" dataKey="accessibility" name="Accessibility" stroke="#34d399" strokeWidth={1.5} strokeDasharray="4 4" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB CONTENT: DEVELOPER */}
        {activeTab === "developer" && (
          <div className="animate-fadeIn flex flex-col lg:flex-row gap-6">

            {/* Left Page Explorer Sidebar */}
            <div className="w-full lg:w-1/4 shrink-0 rounded-2xl border border-brand-border bg-brand-card/45 p-4 shadow-md h-fit">
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3.5 px-2">Page Explorer</div>
              <div className="space-y-1.5 max-h-[500px] overflow-y-auto pr-1">
                <button
                  onClick={() => setPageFilter("ALL")}
                  className={`w-full text-left px-3 py-2.5 text-xs font-bold rounded-xl transition flex items-center justify-between cursor-pointer border ${pageFilter === "ALL"
                      ? "bg-brand-primary border-brand-primary text-white"
                      : "bg-slate-900/40 border-brand-border/40 text-slate-400 hover:text-slate-200"
                    }`}
                >
                  <span>All Scanned Pages</span>
                  <span className={`px-2 py-0.5 rounded-full text-[9px] ${pageFilter === "ALL" ? "bg-white/20 text-white" : "bg-slate-950 text-slate-500"}`}>
                    {audit.findings.length}
                  </span>
                </button>
                {allScannedPages.map(pageUrl => {
                  const pathName = getUrlPath(pageUrl);
                  const count = audit.findings.filter(f => f.page_url === pageUrl).length;
                  return (
                    <button
                      key={pageUrl}
                      onClick={() => setPageFilter(pageUrl)}
                      title={pageUrl}
                      className={`w-full text-left px-3 py-2.5 text-xs font-bold rounded-xl transition flex items-center justify-between gap-3 cursor-pointer border truncate ${pageFilter === pageUrl
                          ? "bg-brand-primary border-brand-primary text-white"
                          : "bg-slate-900/40 border-brand-border/40 text-slate-400 hover:text-slate-200"
                        }`}
                    >
                      <span className="truncate">{pathName}</span>
                      <span className={`px-2 py-0.5 rounded-full text-[9px] shrink-0 ${pageFilter === pageUrl ? "bg-white/20 text-white" : "bg-slate-950 text-slate-500"}`}>
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Right Content Area */}
            <div className="flex-1 min-w-0">
              {/* Toggle checklist/inspector View Mode */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 border-b border-brand-border/60 pb-4">
                <div className="text-sm font-extrabold text-slate-200">
                  {pageFilter === "ALL" ? "All Scanned Pages" : getUrlPath(pageFilter)}
                </div>
                {pageFilter !== "ALL" && (
                  <div className="flex gap-1.5 border border-brand-border/40 bg-slate-950/60 p-1 rounded-xl shadow-inner shrink-0">
                    <button
                      onClick={() => setViewMode("list")}
                      className={`px-3.5 py-1.5 rounded-lg text-[10px] font-extrabold uppercase tracking-wider transition-all duration-150 cursor-pointer ${
                        viewMode === "list"
                          ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
                          : "text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      Checklist View
                    </button>
                    <button
                      onClick={() => setViewMode("inspector")}
                      className={`px-3.5 py-1.5 rounded-lg text-[10px] font-extrabold uppercase tracking-wider transition-all duration-150 cursor-pointer ${
                        viewMode === "inspector"
                          ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
                          : "text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      Visual Inspector
                    </button>
                  </div>
                )}
              </div>

              {viewMode === "inspector" && pageFilter !== "ALL" ? (
                /* Interactive Visual Inspector Split View */
                (() => {
                  const pageScreenshots = audit.screenshots.filter(s => s.page_url === pageFilter);
                  if (pageScreenshots.length === 0) {
                    return (
                      <div className="rounded-2xl border border-brand-border bg-brand-card/45 p-8 text-center text-slate-500 shadow-md">
                        <svg className="w-10 h-10 text-slate-650 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <p className="text-xs font-semibold text-slate-400">No screenshots captured for this page.</p>
                        <p className="text-[10px] text-slate-500 mt-1 max-w-sm mx-auto leading-relaxed">
                          Screenshots are automatically captured during the crawl when Critical or High-severity layout or styling issues are encountered.
                        </p>
                      </div>
                    );
                  }

                  const activeSSId = selectedScreenshotId && pageScreenshots.some(s => String(s.id) === String(selectedScreenshotId))
                    ? selectedScreenshotId
                    : pageScreenshots[0].id;
                  
                  const activeSS = pageScreenshots.find(s => String(s.id) === String(activeSSId)) || pageScreenshots[0];
                  
                  // Filter page findings that belong to this screenshot or are branding category
                  const inspectorFindings = audit.findings.filter(f => f.page_url === pageFilter && (f.screenshot_id === activeSS.id || f.category === "branding"));
                  const selectedFinding = inspectorFindings.find(f => f.id === selectedFindingId) || inspectorFindings[0];

                  return (
                    <div className="flex flex-col lg:flex-row gap-6 animate-fadeIn">
                      {/* Left: Zoomable Screenshot Workspace */}
                      <div className="flex-1 flex flex-col gap-3">
                        <div className="flex items-center justify-between gap-3 bg-slate-900/60 border border-brand-border/40 p-3.5 rounded-xl shadow-md">
                          {/* Screenshot Reason Selector if multiple */}
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest whitespace-nowrap">Context:</span>
                            <select
                              value={activeSSId}
                              onChange={(e) => {
                                setSelectedScreenshotId(e.target.value);
                                setSelectedFindingId(null);
                              }}
                              className="bg-brand-input border border-brand-border rounded-xl text-slate-200 px-3 py-1.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-brand-primary/50 cursor-pointer max-w-xs truncate"
                            >
                              {pageScreenshots.map(s => (
                                <option key={s.id} value={s.id}>
                                  {s.reason || `Screenshot #${s.id}`}
                                </option>
                              ))}
                            </select>
                          </div>
                          {/* Control Buttons */}
                          <div className="flex items-center gap-1.5 shrink-0 bg-slate-950/60 border border-brand-border/30 rounded-lg p-1">
                            <button
                              onClick={() => setInspectZoom(prev => Math.min(4, prev * 1.15))}
                              className="p-1.5 text-slate-400 hover:text-slate-200 transition bg-slate-900 border border-brand-border/20 rounded-md cursor-pointer hover:border-slate-700"
                              title="Zoom In"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                              </svg>
                            </button>
                            <button
                              onClick={() => setInspectZoom(prev => Math.max(0.7, prev / 1.15))}
                              className="p-1.5 text-slate-400 hover:text-slate-200 transition bg-slate-900 border border-brand-border/20 rounded-md cursor-pointer hover:border-slate-700"
                              title="Zoom Out"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M20 12H4" />
                              </svg>
                            </button>
                            <button
                              onClick={() => {
                                setInspectZoom(1);
                                setInspectPan({ x: 0, y: 0 });
                              }}
                              className="p-1.5 text-slate-400 hover:text-slate-200 transition bg-slate-900 border border-brand-border/20 rounded-md cursor-pointer hover:border-slate-700"
                              title="Reset zoom & position"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.21 7.89H18.235" />
                              </svg>
                            </button>
                          </div>
                        </div>

                        {/* Interactive Viewer container */}
                        <div
                          className="relative border border-brand-border bg-slate-950 rounded-xl shadow-inner flex flex-col items-center justify-center min-h-[500px] max-h-[650px] overflow-hidden select-none"
                          onMouseDown={handleInspectMouseDown}
                          onMouseMove={handleInspectMouseMove}
                          onMouseUp={handleInspectMouseUp}
                          onMouseLeave={handleInspectMouseUp}
                        >
                          <div
                            className="relative select-none"
                            style={{
                              transform: `translate(${inspectPan.x}px, ${inspectPan.y}px) scale(${inspectZoom})`,
                              transformOrigin: "center center",
                              transition: isInspectPanning ? "none" : "transform 0.15s ease-out",
                              cursor: isInspectPanning ? "grabbing" : "grab"
                            }}
                          >
                            <img
                              src={`${process.env.NEXT_PUBLIC_API_URL}/${activeSS.file_path}`}
                              alt="Inspected viewport screenshot"
                              className="max-w-[700px] h-auto block pointer-events-none"
                            />
                            
                            {/* Render coordinate overlay bounding boxes */}
                            {inspectorFindings.map(finding => {
                              if (!finding.element_coords) return null;
                              try {
                                const parsed = JSON.parse(finding.element_coords);
                                const rects = parsed.rects || [];
                                const isSelected = selectedFinding?.id === finding.id;
                                const isHovered = hoveredFindingId === finding.id;
                                
                                return rects.map((rect, rIdx) => {
                                  // Map 1280x800 logical viewport to the responsive layout
                                  const leftPct = (rect.x / 1280) * 100;
                                  const topPct = (rect.y / 800) * 100;
                                  const widthPct = (rect.w / 1280) * 100;
                                  const heightPct = (rect.h / 800) * 100;
                                  
                                  return (
                                    <div
                                      key={`inspect-highlight-${finding.id}-${rIdx}`}
                                      onMouseEnter={() => setHoveredFindingId(finding.id)}
                                      onMouseLeave={() => setHoveredFindingId(null)}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedFindingId(finding.id);
                                      }}
                                      className={`absolute cursor-pointer border-2 transition-all duration-200 ${
                                        isSelected 
                                          ? "border-amber-450 bg-amber-500/20 shadow-[0_0_20px_rgba(245,158,11,0.6)] z-20 scale-[1.01]" 
                                          : isHovered 
                                            ? "border-indigo-400 bg-indigo-400/15 shadow-[0_0_15px_rgba(99,102,241,0.5)] z-10" 
                                            : "border-rose-500 bg-rose-500/5 hover:bg-rose-500/15 z-0"
                                      }`}
                                      style={{
                                        left: `${leftPct}%`,
                                        top: `${topPct}%`,
                                        width: `${widthPct}%`,
                                        height: `${heightPct}%`,
                                      }}
                                      title={finding.title}
                                    />
                                  );
                                });
                              } catch (e) {
                                return null;
                              }
                            })}
                          </div>
                        </div>
                      </div>

                      {/* Right: Sidebar findings explorer list */}
                      <div className="w-full lg:w-[320px] flex flex-col gap-4">
                        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1">Findings on this page ({inspectorFindings.length})</div>
                        <div className="space-y-2 overflow-y-auto max-h-[360px] pr-1">
                          {inspectorFindings.map(finding => {
                            const isSelected = selectedFinding?.id === finding.id;
                            const isHovered = hoveredFindingId === finding.id;
                            
                            return (
                              <div
                                key={finding.id}
                                onMouseEnter={() => setHoveredFindingId(finding.id)}
                                onMouseLeave={() => setHoveredFindingId(null)}
                                onClick={() => setSelectedFindingId(finding.id)}
                                className={`p-3 rounded-xl border text-xs font-semibold cursor-pointer transition flex flex-col gap-1 ${
                                  isSelected
                                    ? "bg-slate-900 border-indigo-500/50 shadow-md shadow-indigo-900/10 text-slate-100"
                                    : isHovered
                                      ? "bg-slate-900/40 border-brand-border text-slate-205"
                                      : "bg-slate-950/20 border-brand-border/40 text-slate-400 hover:text-slate-350"
                                }`}
                              >
                                <div className="flex justify-between items-start gap-2">
                                  <span className="font-bold leading-snug truncate pr-2">{finding.title}</span>
                                  <span className={`text-[7px] font-black tracking-wider uppercase px-1.5 py-0.5 rounded ${
                                    finding.severity === "CRITICAL" ? "bg-rose-500/10 text-rose-450 border border-rose-500/20" :
                                    finding.severity === "HIGH" ? "bg-orange-500/10 text-orange-450 border border-orange-500/20" :
                                    finding.severity === "MEDIUM" ? "bg-yellow-500/10 text-yellow-450 border border-yellow-500/20" :
                                    "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                                  }`}>{finding.severity}</span>
                                </div>
                                {!finding.element_coords && (
                                  <span className="text-[8px] font-bold text-slate-600 tracking-wide mt-1 block italic uppercase">No coordinates (Global issue)</span>
                                )}
                              </div>
                            );
                          })}
                        </div>

                        {/* Selected finding detail inspector */}
                        {selectedFinding && (
                          <div className="rounded-xl border border-brand-border bg-slate-900/45 p-4 shadow-md flex-1 flex flex-col justify-between animate-fadeIn">
                            <div className="space-y-3.5">
                              <div className="border-b border-brand-border/60 pb-2">
                                <div className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-0.5">Selected Finding Detail</div>
                                <div className="text-xs font-bold text-indigo-300 leading-snug">{selectedFinding.title}</div>
                              </div>
                              <div className="space-y-2.5">
                                <div>
                                  <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest block mb-0.5">Description:</span>
                                  <p className="text-[11px] text-slate-300 leading-relaxed">{selectedFinding.description}</p>
                                </div>
                                <div>
                                  <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest block mb-0.5">Developer Fix:</span>
                                  <pre className="text-[9px] text-slate-350 bg-slate-950 border border-brand-border/40 rounded-lg p-2 max-w-full overflow-x-auto font-mono select-all leading-normal">{selectedFinding.developer_fix}</pre>
                                </div>
                              </div>
                            </div>
                            
                            <div className="pt-4 border-t border-brand-border/40 mt-3 flex justify-between items-center gap-3">
                              <button
                                onClick={() => handleToggleFixed(selectedFinding.id)}
                                className={`text-[10px] font-extrabold uppercase tracking-wider px-3.5 py-2 rounded-lg transition active:scale-[0.98] cursor-pointer flex-1 text-center border ${
                                  selectedFinding.is_fixed
                                    ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                                    : "bg-slate-900 hover:bg-slate-855 border-brand-border text-slate-355"
                                }`}
                              >
                                {selectedFinding.is_fixed ? "✓ Marked Fixed" : "Mark as Fixed"}
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })()
              ) : (
                /* Original Filters and Findings list */
                <>
                  {/* Filter Row */}
                  <div className="rounded-2xl border border-brand-border bg-brand-card/40 p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 shadow-md">
                    <div className="flex flex-wrap gap-4">
                      <div className="flex flex-col gap-1.5">
                        <label htmlFor="severity-select" className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Severity</label>
                        <select
                          id="severity-select"
                          value={severityFilter}
                          onChange={(e) => setSeverityFilter(e.target.value)}
                          className="bg-brand-input border border-brand-border rounded-xl text-slate-200 px-3.5 py-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-brand-primary/50 cursor-pointer"
                        >
                          <option value="ALL">All Severities</option>
                          <option value="CRITICAL">Critical</option>
                          <option value="HIGH">High</option>
                          <option value="MEDIUM">Medium</option>
                          <option value="LOW">Low</option>
                        </select>
                      </div>

                      <div className="flex flex-col gap-1.5">
                        <label htmlFor="category-select" className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Category</label>
                        <select
                          id="category-select"
                          value={categoryFilter}
                          onChange={(e) => setCategoryFilter(e.target.value)}
                          className="bg-brand-input border border-brand-border rounded-xl text-slate-200 px-3.5 py-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-brand-primary/50 cursor-pointer"
                        >
                          <option value="ALL">All Categories</option>
                          {uniqueCategories.map((c) => (
                            <option key={c} value={c}>
                              {c.capitalize()}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="text-xs text-slate-500 font-semibold sm:self-center bg-slate-900/50 border border-brand-border/40 px-3.5 py-2 rounded-xl">
                      Showing {filteredFindings.length} of {audit.findings.length} findings
                    </div>
                  </div>

                  {/* Findings List */}
              {filteredFindings.length === 0 ? (
                <div className="rounded-2xl border border-brand-border bg-brand-card/40 text-center py-16 px-4 text-slate-500">
                  No findings match the current filters.
                </div>
              ) : (
                <div className="space-y-6">
                  {filteredFindings.map((finding) => (
                    <div
                      key={finding.id}
                      className={`rounded-2xl border-l-4 bg-brand-card/50 p-6 shadow-md border-y border-r border-brand-border hover:border-y-slate-800 hover:border-r-slate-800 transition duration-150 ${getSeverityBorderClass(finding.severity)}`}
                    >

                      <div className="flex flex-col md:flex-row justify-between items-start gap-4 border-b border-brand-border/60 pb-4 mb-4">
                        <div className="flex flex-col gap-1.5">
                          <span className="text-base font-bold text-slate-100 leading-tight">{finding.title}</span>
                          <span className="text-xs font-medium text-slate-500 truncate max-w-sm sm:max-w-xl md:max-w-2xl block hover:text-slate-400 transition cursor-default font-mono" title={finding.page_url}>
                            URL: {finding.page_url}
                          </span>
                        </div>
                        <div className="flex gap-2 items-center flex-wrap shrink-0">
                          {finding.is_fixed ? (
                            <span className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[9px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-lg">
                              Resolved
                            </span>
                          ) : (
                            <span className="bg-rose-500/10 border border-rose-500/20 text-rose-400 text-[9px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-lg">
                              Open
                            </span>
                          )}
                          <span className="bg-slate-950 border border-brand-border text-slate-400 text-[10px] font-bold tracking-wider px-2.5 py-1 rounded-lg font-mono">
                            Code: {finding.issue_code}
                          </span>
                          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wider border ${getSeverityBadgeClass(finding.severity)}`}>
                            {finding.severity}
                          </span>
                        </div>
                      </div>

                      <div className="space-y-5">
                        <div className="flex flex-col gap-1.5">
                          <div className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Description</div>
                          <div className="text-sm text-slate-300 leading-relaxed">{finding.description}</div>
                        </div>

                        <div className="flex flex-col gap-0">
                          <div className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Developer Fix</div>
                          {/* Mock IDE Window frame */}
                          <div className="bg-slate-900 border border-brand-border rounded-t-xl px-4 py-2.5 flex items-center justify-between shadow-md shrink-0">
                            <div className="flex items-center gap-1.5">
                              <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80" />
                              <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
                              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
                            </div>
                            <span className="text-[9px] font-bold text-slate-500 font-mono tracking-wider">FIX_RECOMMENDATION.js</span>
                          </div>
                          <pre className="bg-slate-950 border border-t-0 border-brand-border rounded-b-xl text-slate-300 font-mono text-[11px] p-4 overflow-x-auto leading-relaxed shadow-inner max-w-full select-all">{finding.developer_fix}</pre>
                        </div>

                        {/* Display Associated Screenshot if available */}
                        {finding.screenshot_id && (
                          <div className="mt-2 space-y-1.5">
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                              <div className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Captured Screenshot</div>
                              <button
                                onClick={() => {
                                  setPageFilter(finding.page_url);
                                  setSelectedScreenshotId(finding.screenshot_id);
                                  setSelectedFindingId(finding.id);
                                  setViewMode("inspector");
                                }}
                                className="text-[10px] font-extrabold uppercase tracking-wider text-indigo-400 hover:text-indigo-350 transition duration-150 flex items-center gap-1 cursor-pointer bg-slate-900 border border-brand-border/40 hover:border-slate-700 px-3 py-1.5 rounded-lg shadow-sm"
                              >
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                </svg>
                                Open in Interactive Visual Inspector
                              </button>
                            </div>
                            <div className="relative border border-brand-border rounded-xl overflow-hidden bg-slate-950 max-w-2xl shadow-xl transition hover:border-slate-800">
                              <img
                                src={`${process.env.NEXT_PUBLIC_API_URL}/${audit.screenshots.find(s => s.id === finding.screenshot_id)?.file_path}`}
                                alt={finding.title}
                                className="w-full h-auto block"
                              />
                              {(() => {
                                if (!finding.element_coords) return null;
                                try {
                                  const parsed = JSON.parse(finding.element_coords);
                                  const rects = parsed.rects || [];
                                  return rects.map((rect, rIdx) => {
                                    // Scale to percentages of default 1280x800 viewport
                                    const leftPct = (rect.x / 1280) * 100;
                                    const topPct = (rect.y / 800) * 100;
                                    const widthPct = (rect.w / 1280) * 100;
                                    const heightPct = (rect.h / 800) * 100;
                                    
                                    return (
                                      <div
                                        key={`highlight-${rIdx}`}
                                        className="absolute border-2 border-rose-500 bg-rose-500/10 shadow-[0_0_15px_rgba(239,68,68,0.5)] animate-pulse rounded-md"
                                        style={{
                                          left: `${leftPct}%`,
                                          top: `${topPct}%`,
                                          width: `${widthPct}%`,
                                          height: `${heightPct}%`,
                                          pointerEvents: 'none'
                                        }}
                                      />
                                    );
                                  });
                                } catch (e) {
                                  return null;
                                }
                              })()}
                            </div>
                          </div>
                        )}
                      </div>

                    </div>
                  ))}
                </div>
              )}
            </>
          )}
            </div>

          </div>
        )}

        {/* TAB CONTENT: CRAWL MAP VISUALIZER */}
        {activeTab === "map" && (
          <div className="animate-fadeIn">
            <div className="rounded-2xl border border-brand-border bg-brand-card/40 p-6 shadow-xl mb-8">
              <h3 className="text-base font-bold text-slate-100 mb-2 flex items-center gap-2">
                <svg className="w-5 h-5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
                </svg>
                Site Structure Crawl Map
              </h3>
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <p className="text-xs text-slate-400 max-w-2xl leading-relaxed">
                  Concentric hierarchy representing link relationships discovered during crawling. Hover or click nodes to see page-specific findings.
                </p>
                <div className="flex gap-1.5 shrink-0 border border-brand-border/40 bg-slate-950/60 p-1 rounded-xl shadow-inner">
                  <button
                    onClick={() => setMapLayout("radial")}
                    className={`px-3.5 py-1.5 rounded-lg text-[10px] font-extrabold uppercase tracking-wider transition-all duration-150 cursor-pointer ${
                      mapLayout === "radial"
                        ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
                        : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    Radial
                  </button>
                  <button
                    onClick={() => setMapLayout("horizontal")}
                    className={`px-3.5 py-1.5 rounded-lg text-[10px] font-extrabold uppercase tracking-wider transition-all duration-150 cursor-pointer ${
                      mapLayout === "horizontal"
                        ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
                        : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    Horizontal Tree
                  </button>
                </div>
              </div>

              <div className="relative border border-brand-border bg-slate-950 rounded-xl overflow-hidden shadow-inner flex flex-col items-center justify-center min-h-[700px] w-full">
                {/* Floating Legend */}
                <div className="absolute top-4 left-4 bg-slate-900/90 border border-brand-border/60 rounded-xl p-3.5 shadow-xl flex flex-col gap-2 z-10 text-[10px] font-semibold text-slate-400 backdrop-blur-sm">
                  <div className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1 border-b border-brand-border/40 pb-1.5">Crawl Map Legend</div>
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.3)]" />
                    <span>Resolved / Clean Page</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.3)]" />
                    <span>Critical/High Issues</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(251,191,36,0.3)]" />
                    <span>Medium/Low Issues</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-slate-900 border-2 border-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.2)]" />
                    <span>Root / Seed URL (/)</span>
                  </div>
                </div>

                  <div className="relative w-full overflow-hidden">
                    {/* SVG control overlay */}
                    <div className="absolute top-4 right-4 flex gap-1.5 shrink-0 bg-slate-900/90 border border-brand-border/60 rounded-xl p-1 shadow-lg z-10 backdrop-blur-sm">
                      <button
                        onClick={() => setGraphZoom(prev => Math.min(5, prev * 1.1))}
                        className="p-1.5 text-slate-300 hover:text-white transition bg-slate-950/80 border border-brand-border/40 rounded-md cursor-pointer hover:border-slate-700"
                        title="Zoom In"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                        </svg>
                      </button>
                      <button
                        onClick={() => setGraphZoom(prev => Math.max(0.15, prev / 1.1))}
                        className="p-1.5 text-slate-300 hover:text-white transition bg-slate-950/80 border border-brand-border/40 rounded-md cursor-pointer hover:border-slate-700"
                        title="Zoom Out"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M20 12H4" />
                        </svg>
                      </button>
                      <button
                        onClick={() => {
                          setGraphZoom(0.95);
                          setGraphPan({ x: 30, y: 10 });
                          setPhysicsTicks(80);
                        }}
                        className="p-1.5 text-slate-300 hover:text-white transition bg-slate-950/80 border border-brand-border/40 rounded-md cursor-pointer hover:border-slate-700"
                        title="Reset Layout & Align"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.21 7.89H18.235" />
                        </svg>
                      </button>
                      <button
                        onClick={() => setPhysicsTicks(100)}
                        className="p-1.5 text-slate-300 hover:text-indigo-400 transition bg-slate-950/80 border border-brand-border/40 rounded-md cursor-pointer hover:border-slate-700"
                        title="Apply Physics Relaxation"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                      </button>
                    </div>

                    <svg
                      className="w-full max-w-[1000px] h-[700px] shrink-0 select-none bg-slate-950/40 rounded-xl"
                      viewBox="0 0 1000 700"
                      onMouseDown={handleGraphMouseDown}
                      onMouseMove={handleGraphMouseMove}
                      onMouseUp={handleGraphMouseUp}
                      onMouseLeave={handleGraphMouseUp}
                      onWheel={handleGraphWheel}
                    >
                      <defs>
                        <marker id="arrow" viewBox="0 0 10 10" refX="21" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                          <path d="M 0 2 L 10 5 L 0 8 z" fill="#4f46e5" />
                        </marker>
                      </defs>

                      {/* background rect to capture mousedown drags */}
                      <rect id="graph-bg" width="1000" height="700" fill="transparent" />

                      <g
                        style={{
                          transform: `translate(${graphPan.x}px, ${graphPan.y}px) scale(${graphZoom})`,
                          transformOrigin: "top left",
                          transition: isGraphPanning || dragNodeId ? "none" : "transform 0.15s ease-out"
                        }}
                      >
                        {/* Render All Link Relationships */}
                        {crawlRelations.map(([parentUrl, childUrl], idx) => {
                          const pNode = graphNodes.find(n => n.url === parentUrl);
                          const cNode = graphNodes.find(n => n.url === childUrl);
                          if (!pNode || !cNode) return null;

                          const isSelected = selectedNode?.url === parentUrl || selectedNode?.url === childUrl;
                          const isLineHighlighted = isSelected;
                          const length = Math.hypot(cNode.x - pNode.x, cNode.y - pNode.y);
                          
                          return (
                            <line
                              key={`link-${idx}`}
                              className="crawl-map-link transition-all duration-300"
                              x1={pNode.x}
                              y1={pNode.y}
                              x2={cNode.x}
                              y2={cNode.y}
                              stroke={isLineHighlighted ? "#6366f1" : "var(--color-brand-border)"}
                              strokeWidth={isLineHighlighted ? 2.5 : 1}
                              strokeOpacity={isLineHighlighted ? 0.9 : 0.25}
                              markerEnd="url(#arrow)"
                              style={{
                                strokeDasharray: length,
                                strokeDashoffset: 0
                              }}
                            />
                          );
                        })}

                        {/* Render Nodes */}
                        {graphNodes.map((node) => {
                          const isBroken = brokenLinks.some(bl => bl.url === node.url);
                          const activeFindings = audit.findings.filter(f => f.page_url === node.url && !f.is_fixed);
                          const count = activeFindings.length;
                          const hasCrit = activeFindings.some(f => f.severity === "CRITICAL" || f.severity === "HIGH");
                          const nodeColor = isBroken ? "#f43f5e" : count === 0 ? "#10b981" : hasCrit ? "#f43f5e" : "#fbbf24";
                          const isSelected = selectedNode?.url === node.url;

                          return (
                            <g
                              key={node.url}
                              className="cursor-pointer group"
                              onClick={() => setSelectedNode(node)}
                              onMouseDown={(e) => {
                                e.stopPropagation();
                                setDragNodeId(node.url);
                              }}
                              style={{
                                transformOrigin: `${node.x}px ${node.y}px`,
                                transform: 'scale(1)'
                              }}
                            >
                              {/* Inner circle */}
                              <circle
                                cx={node.x}
                                cy={node.y}
                                r={node.level === 0 ? rootRadius : isSelected ? selectedRadius : dynamicNodeRadius}
                                fill={node.level === 0 && count === 0 ? "#4f46e5" : nodeColor}
                                stroke={isSelected ? "var(--color-slate-100)" : "var(--color-brand-border)"}
                                strokeWidth={isSelected ? 3 : 1.5}
                                style={{
                                  transformOrigin: `${node.x}px ${node.y}px`
                                }}
                                className="transition-all duration-200 group-hover:scale-125"
                              />
                              {/* Blinking red ring for broken link */}
                              {isBroken && (
                                <circle
                                  cx={node.x}
                                  cy={node.y}
                                  r={(node.level === 0 ? rootRadius : isSelected ? selectedRadius : dynamicNodeRadius) + 4}
                                  fill="none"
                                  stroke="#f43f5e"
                                  strokeWidth={2}
                                  className="animate-ping"
                                  style={{
                                    transformOrigin: `${node.x}px ${node.y}px`,
                                    animationDuration: '1.5s'
                                  }}
                                />
                              )}
                              {/* Ring outer stroke for seed URL */}
                              {node.level === 0 && (
                                <circle
                                  cx={node.x}
                                  cy={node.y}
                                  r={rootRadius + 6}
                                  fill="none"
                                  stroke="#818cf8"
                                  strokeWidth={1.5}
                                  strokeDasharray="4,4"
                                  style={{
                                    transformOrigin: `${node.x}px ${node.y}px`
                                  }}
                                  className="animate-[spin_20s_linear_infinite]"
                                />
                              )}
                              
                              {/* Label display on hover or if seed/selected */}
                              <text
                                x={node.x}
                                y={node.y + (node.level === 0 ? rootRadius + 16 : isSelected ? selectedRadius + 12 : dynamicNodeRadius + 12)}
                                textAnchor="middle"
                                fill={isSelected ? "var(--color-indigo-400)" : "var(--color-slate-300)"}
                                fontSize={8}
                                fontWeight={isSelected || node.level === 0 ? "bold" : "normal"}
                                className={`pointer-events-none drop-shadow font-bold transition-opacity duration-200 ${
                                  node.level === 0 || isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                                }`}
                              >
                                {node.label}
                              </text>
                            </g>
                          );
                        })}
                      </g>
                    </svg>
                  </div>
              </div>
            </div>

            {/* Display Selected Node's Findings */}
            {selectedNode && (
              <div className="rounded-2xl border border-brand-border bg-brand-card/45 p-6 shadow-xl animate-fadeIn">
                <div className="flex justify-between items-center border-b border-brand-border/60 pb-4 mb-4">
                  <div className="min-w-0">
                    <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-0.5">Selected Page Findings</div>
                    <div className="text-sm font-bold text-indigo-300 truncate font-mono select-all" title={selectedNode.url}>
                      {selectedNode.url}
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedNode(null)}
                    className="text-xs text-slate-400 hover:text-slate-200 border border-brand-border px-3 py-1.5 rounded-xl bg-slate-900 cursor-pointer"
                  >
                    Clear Selection
                  </button>
                </div>

                {(() => {
                  const nodeFindings = audit.findings.filter(f => f.page_url === selectedNode.url);
                  if (nodeFindings.length === 0) {
                    return (
                      <p className="text-emerald-400 text-xs font-semibold">
                        ✓ No issues detected on this page!
                      </p>
                    );
                  }
                  return (
                    <div className="space-y-4">
                      {nodeFindings.map((finding) => (
                        <div key={finding.id} className="border border-brand-border/60 rounded-xl p-4 bg-slate-950/20">
                          <div className="flex justify-between items-center gap-4 mb-2">
                            <span className="text-xs font-extrabold text-slate-200">{finding.title}</span>
                            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[8px] font-bold uppercase tracking-wider border ${getSeverityBadgeClass(finding.severity)}`}>
                              {finding.severity}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400 leading-relaxed">{finding.description}</p>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
        )}

        {/* TAB CONTENT: CRAWL HEALTH */}
        {activeTab === "crawl_health" && (
          <div className="animate-fadeIn">
            <div className="rounded-2xl border border-brand-border bg-brand-card/40 p-6 md:p-8 shadow-xl">
              <h3 className="text-base font-bold text-slate-100 mb-6 flex items-center gap-2 border-b border-brand-border pb-4">
                <svg className="w-5 h-5 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                Crawl Health & Dead Links Map
              </h3>

              {/* Summary Cards */}
              {(() => {
                const totalLinksChecked = allScannedPages.length + brokenLinks.length;
                const brokenCount = brokenLinks.length;
                const successRate = totalLinksChecked > 0 ? Math.round(((totalLinksChecked - brokenCount) / totalLinksChecked) * 100) : 100;
                return (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <div className="rounded-2xl border border-brand-border bg-slate-900/30 p-5 flex items-center justify-between shadow-md">
                      <div>
                        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Total Checked Links</div>
                        <div className="text-3xl font-black text-slate-100">{totalLinksChecked}</div>
                      </div>
                      <div className="p-3 bg-indigo-500/10 rounded-2xl text-indigo-400 border border-indigo-500/10">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                        </svg>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-brand-border bg-slate-900/30 p-5 flex items-center justify-between shadow-md">
                      <div>
                        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Broken Links</div>
                        <div className={`text-3xl font-black ${brokenCount > 0 ? "text-rose-500" : "text-emerald-400"}`}>{brokenCount}</div>
                      </div>
                      <div className={`p-3 rounded-2xl border ${brokenCount > 0 ? "bg-rose-500/10 text-rose-400 border-rose-500/10" : "bg-emerald-500/10 text-emerald-400 border-emerald-500/10"}`}>
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-brand-border bg-slate-900/30 p-5 flex items-center justify-between shadow-md">
                      <div>
                        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Crawl Success Rate</div>
                        <div className={`text-3xl font-black ${successRate >= 90 ? "text-emerald-400" : successRate >= 70 ? "text-amber-500" : "text-rose-500"}`}>{successRate}%</div>
                      </div>
                      <div className={`p-3 rounded-2xl border ${successRate >= 90 ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/10" : "bg-amber-500/10 text-amber-500 border-amber-500/10"}`}>
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {brokenLinks.length === 0 ? (
                <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-6 rounded-xl text-center shadow-inner">
                  <span className="text-sm font-bold block mb-1">✓ No Dead Links Detected</span>
                  <p className="text-xs text-emerald-500/80">Every internal link checked successfully returned a valid 2xx status response code.</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Table */}
                  <div className="border border-brand-border rounded-xl overflow-hidden shadow-lg bg-slate-950">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-brand-border bg-slate-900/50 text-[10px] font-bold text-slate-400 uppercase tracking-widest font-sans">
                          <th className="p-4">Destination Link</th>
                          <th className="p-4">Status</th>
                          <th className="p-4">Found On (Source Page)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {brokenLinks.map((bl, blIdx) => (
                          <tr key={blIdx} className="border-b border-brand-border/40 hover:bg-slate-900/20 last:border-b-0 text-xs text-slate-300">
                            <td className="p-4 font-mono select-all text-rose-400 max-w-xs sm:max-w-md truncate animate-fadeIn" title={bl.url}>
                              <div className="flex items-center gap-2">
                                <span className="truncate">{bl.url}</span>
                                <button
                                  onClick={() => {
                                    navigator.clipboard.writeText(bl.url);
                                    alert("Copied link to clipboard!");
                                  }}
                                  className="p-1 hover:bg-slate-800 rounded text-slate-500 hover:text-slate-300 transition shrink-0 cursor-pointer"
                                  title="Copy URL"
                                >
                                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2" />
                                  </svg>
                                </button>
                              </div>
                            </td>
                            <td className="p-4">
                              <span className="bg-rose-500/10 text-rose-400 border border-rose-500/20 font-extrabold px-2.5 py-1 rounded-lg text-[10px] font-mono tracking-wider flex items-center gap-1.5 w-fit shadow-sm">
                                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                                {bl.status_code === 0 ? "TIMEOUT" : bl.status_code}
                              </span>
                            </td>
                            <td className="p-4 text-slate-400 truncate max-w-xs font-mono" title={bl.source_page}>
                              {getUrlPath(bl.source_page)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB CONTENT: PERFORMANCE DIAGNOSTICS */}
        {activeTab === "performance_diagnostics" && (
          <div className="animate-fadeIn space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* Slowest Pages */}
              <div className="rounded-2xl border border-brand-border bg-brand-card/40 p-6 shadow-xl">
                <h3 className="text-base font-bold text-slate-100 mb-2 flex items-center gap-2 border-b border-brand-border pb-4">
                  <svg className="w-5 h-5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Top 5 Slowest Loading Pages
                </h3>
                <p className="text-xs text-slate-400 mb-6 leading-relaxed">
                  These pages took the longest to completely render and load. Consider optimizing their script payload and blocking resources.
                </p>

                {slowestPages.length === 0 ? (
                  <p className="text-xs text-slate-500 italic py-6 text-center">No page speed measurements available.</p>
                ) : (
                  <div className="space-y-4">
                    {slowestPages.map((page, idx) => {
                      const loadTime = page.load_time;
                      const pct = Math.min(100, (loadTime / 5.0) * 100);
                      let barColor = "bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.3)]";
                      let ratingLabel = "Poor";
                      let ratingColor = "text-rose-400 bg-rose-500/10 border-rose-500/20";
                      
                      if (loadTime < 1.0) {
                        barColor = "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.3)]";
                        ratingLabel = "Fast";
                        ratingColor = "text-emerald-400 bg-emerald-500/10 border-emerald-500/20";
                      } else if (loadTime <= 2.5) {
                        barColor = "bg-amber-500 shadow-[0_0_8px_rgba(251,191,36,0.3)]";
                        ratingLabel = "Average";
                        ratingColor = "text-amber-400 bg-amber-500/10 border-amber-500/20";
                      }
                      
                      return (
                        <div key={idx} className="bg-slate-950 p-4 border border-brand-border rounded-xl shadow-md animate-fadeIn">
                          <div className="flex justify-between items-start gap-3 mb-2">
                            <span className="text-xs font-bold text-slate-200 truncate font-mono block max-w-[70%] select-all" title={page.url}>
                              {getUrlPath(page.url)}
                            </span>
                            <div className="flex gap-2 items-center">
                              <span className="text-xs font-bold text-slate-100 font-mono">{loadTime.toFixed(2)}s</span>
                              <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded border ${ratingColor}`}>
                                {ratingLabel}
                              </span>
                            </div>
                          </div>
                          <div className="h-2 bg-slate-900 rounded-full overflow-hidden border border-brand-border/40">
                            <div className={`h-full ${barColor} rounded-full transition-all duration-500`} style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Heavy Assets & WebP Savings */}
              <div className="rounded-2xl border border-brand-border bg-brand-card/40 p-6 shadow-xl">
                <h3 className="text-base font-bold text-slate-100 mb-2 flex items-center gap-2 border-b border-brand-border pb-4">
                  <svg className="w-5 h-5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                  Top 5 Heaviest Assets & Compression Savings
                </h3>
                <p className="text-xs text-slate-400 mb-6 leading-relaxed">
                  These stylesheet, script, and image files represent the largest payload downloaded when users browse your website.
                </p>

                {heavyAssets.length === 0 ? (
                  <p className="text-xs text-slate-500 italic py-6 text-center">No heavy asset measurements available.</p>
                ) : (
                  <div className="space-y-4">
                    {heavyAssets.map((asset, idx) => {
                      const sizeMB = asset.size_bytes / (1024 * 1024);
                      const savingsMB = asset.webp_savings_bytes / (1024 * 1024);
                      const sizeLimit = 1.0; // 1MB budget
                      const originalPct = Math.min(100, (sizeMB / sizeLimit) * 100);
                      const postSavingsMB = Math.max(0, sizeMB - savingsMB);
                      const savingsPct = Math.min(100, (postSavingsMB / sizeLimit) * 100);
                      
                      let barColor = "bg-rose-500";
                      if (sizeMB < 0.2) {
                        barColor = "bg-emerald-500";
                      } else if (sizeMB <= 0.5) {
                        barColor = "bg-amber-500";
                      }

                      // Type badge styles
                      let typeColor = "text-slate-400 bg-slate-900/60 border-brand-border/40";
                      if (asset.type.toLowerCase().includes("image")) {
                        typeColor = "text-emerald-400 bg-emerald-500/10 border-emerald-500/20";
                      } else if (asset.type.toLowerCase().includes("javascript") || asset.type.toLowerCase().includes("script")) {
                        typeColor = "text-indigo-400 bg-indigo-500/10 border-indigo-500/20";
                      } else if (asset.type.toLowerCase().includes("css") || asset.type.toLowerCase().includes("style")) {
                        typeColor = "text-pink-400 bg-pink-500/10 border-pink-500/20";
                      }

                      const assetName = asset.url.split("/").pop() || asset.url;

                      return (
                        <div key={idx} className="bg-slate-950 p-4 border border-brand-border rounded-xl shadow-md animate-fadeIn">
                          <div className="flex justify-between items-start gap-3 mb-2">
                            <div className="min-w-0 flex-1">
                              <span className="text-xs font-bold text-slate-200 truncate block font-mono select-all" title={asset.url}>
                                {assetName}
                              </span>
                              <span className="text-[9px] text-slate-500 truncate block font-mono mt-0.5 select-all" title={asset.url}>
                                {asset.url}
                              </span>
                            </div>
                            <div className="flex gap-2 items-center shrink-0">
                              <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded border ${typeColor}`}>
                                {asset.type.replace("javascript", "JS").replace("stylesheet", "CSS")}
                              </span>
                              <span className="text-xs font-bold text-slate-100 font-mono">{sizeMB.toFixed(2)} MB</span>
                            </div>
                          </div>

                          {/* Gauge tracks */}
                          <div className="space-y-2 mt-3">
                            <div className="flex justify-between items-center text-[10px] text-slate-450 font-semibold">
                              <span>Payload Weight (Budget: 1.0MB)</span>
                              <span>{originalPct.toFixed(0)}%</span>
                            </div>
                            <div className="h-2 bg-slate-900 rounded-full overflow-hidden border border-brand-border/40 relative">
                              <div className={`h-full ${barColor} rounded-full transition-all duration-500`} style={{ width: `${originalPct}%` }} />
                            </div>

                            {asset.webp_savings_bytes > 0 && (
                              <div className="pt-1">
                                <div className="flex justify-between items-center text-[10px] text-emerald-450 font-bold mb-1">
                                  <span className="flex items-center gap-1">
                                    <svg className="w-3.5 h-3.5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                                    </svg>
                                    Potential WebP Compression Savings
                                  </span>
                                  <span>-{savingsMB.toFixed(2)} MB (~60%)</span>
                                </div>
                                <div className="h-2 bg-slate-900 rounded-full overflow-hidden border border-brand-border/40 relative">
                                  <div className="h-full bg-emerald-500 rounded-full transition-all duration-500" style={{ width: `${savingsPct}%` }} />
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

            </div>
          </div>
        )}

        {/* TAB CONTENT: SEO & SOCIAL PREVIEWS */}
        {activeTab === "seo_social_previews" && (
          <div className="animate-fadeIn space-y-6">
            <div className="rounded-2xl border border-brand-border bg-brand-card/40 p-6 shadow-xl">
              <h3 className="text-base font-bold text-slate-100 mb-2 flex items-center gap-2 border-b border-brand-border pb-4">
                <svg className="w-5 h-5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Smart SEO Schema & Social Cards Auditor
              </h3>
              <p className="text-xs text-slate-400 mb-6 leading-relaxed">
                Check how search engine spiders and social platform crawlers index your page metadata and render preview card previews.
              </p>

              {/* Selector */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 bg-slate-950 p-4 rounded-xl border border-brand-border/60 mb-6">
                <label htmlFor="seo-page-select" className="text-xs font-bold text-slate-300 shrink-0">Select Page to Audit:</label>
                {pageSeoList.length === 0 ? (
                  <span className="text-xs text-slate-500 font-semibold italic">No pages crawled with metadata.</span>
                ) : (
                  <select
                    id="seo-page-select"
                    value={selectedSeoUrl}
                    onChange={(e) => setSelectedSeoUrl(e.target.value)}
                    className="bg-brand-input border border-brand-border rounded-xl text-slate-200 px-3.5 py-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-brand-primary/50 cursor-pointer flex-1 animate-fadeIn"
                  >
                    {pageSeoList.map(s => (
                      <option key={s.url} value={s.url}>
                        {getUrlPath(s.url)}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {(() => {
                const currentSeo = pageSeoList.find(s => s.url === selectedSeoUrl) || pageSeoList[0];
                if (!currentSeo) return null;
                return (
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fadeIn">
                    
                    {/* Left columns: Previews */}
                    <div className="lg:col-span-2 space-y-6">
                      {/* Google Search Snippet */}
                      <div className="border border-brand-border bg-slate-950/40 rounded-xl p-5 shadow-lg max-w-lg font-sans">
                        <div className="text-[10px] font-extrabold text-slate-500 uppercase tracking-widest mb-3 border-b border-brand-border/40 pb-2 flex justify-between items-center">
                          <span>Google Search Result Preview</span>
                          <span className="w-2 h-2 rounded-full bg-[#34a853] shadow-[0_0_6px_rgba(52,168,83,0.6)] animate-pulse" />
                        </div>
                        <div className="font-sans">
                          {/* Breadcrumb line with favicon */}
                          <div className="flex items-center gap-2 mb-1">
                            <div className="w-5 h-5 rounded-full bg-slate-900 border border-brand-border/60 flex items-center justify-center shrink-0">
                              <svg className="w-3 h-3 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                              </svg>
                            </div>
                            <div className="text-[11px] text-slate-400 truncate max-w-[280px] select-all">
                              {(() => {
                                try {
                                  const urlObj = new URL(currentSeo.url);
                                  return `${urlObj.hostname} › ${urlObj.pathname.split("/").filter(Boolean).join(" › ")}`;
                                } catch(e) {
                                  return currentSeo.url;
                                }
                              })()}
                            </div>
                          </div>
                          <div className="text-base sm:text-lg text-[#8ab4f8] font-medium hover:underline cursor-pointer truncate leading-snug select-all">
                            {currentSeo.title || "Untitled Document"}
                          </div>
                          <div className="text-xs text-slate-400 leading-relaxed mt-1 line-clamp-2 select-all">
                            {currentSeo.description || "Please supply a description by adding a meta description tag in your page head to improve CTR on search result lists."}
                          </div>
                        </div>
                      </div>

                      {/* Facebook Card Share */}
                      <div className="border border-[#2f3031] bg-[#18191a] text-[#e4e6eb] rounded-xl overflow-hidden shadow-lg max-w-lg font-sans">
                        <div className="bg-[#242526] px-4 py-3 text-[10px] font-extrabold text-slate-400 uppercase tracking-widest border-b border-[#2f3031] flex justify-between items-center">
                          <span>Facebook Share Card Preview</span>
                          <span className="w-2 h-2 rounded-full bg-[#1877f2] shadow-[0_0_6px_rgba(24,119,242,0.6)] animate-pulse" />
                        </div>
                        
                        {/* FB Header */}
                        <div className="p-3.5 flex items-center gap-2.5">
                          <div className="w-9 h-9 rounded-full bg-indigo-600/30 border border-indigo-500/30 flex items-center justify-center font-black text-xs text-indigo-400 font-sans shadow-inner shrink-0 uppercase select-none">
                            {(() => {
                              try { return currentSeo.url ? new URL(currentSeo.url).hostname.charAt(0) : "W"; } catch(e) { return "W"; }
                            })()}
                          </div>
                          <div>
                            <div className="text-xs font-bold text-[#e4e6eb] hover:underline cursor-pointer flex items-center gap-1 select-all">
                              {(() => {
                                try { return currentSeo.url ? new URL(currentSeo.url).hostname : "Website"; } catch(e) { return "Website"; }
                              })()}
                            </div>
                            <div className="text-[10px] text-[#b0b3b8] flex items-center gap-1 mt-0.5 font-medium">
                              <span>Just now</span>
                              <span>•</span>
                              <svg className="w-3 h-3 text-[#b0b3b8]" fill="currentColor" viewBox="0 0 16 16">
                                <path d="M8 0a8 8 0 1 0 0 16A8 8 0 0 0 8 0zM2.04 4.326c.325 1.329 2.532 2.54 3.786 2.54.777 0 1.413-.636 1.413-1.413 0-.317-.1-.62-.288-.868L6.447 3.52c-.157-.205-.285-.436-.379-.684l-.156-.412c1.12-.35 2.3-.414 3.46-.188l.209.435c.168.35.398.66.679.914l.848.77c.23.21.43.46.59.742.16.28.24.6.24.93 0 .46-.18.9-.51 1.23l-.86.86c-.33.33-.77.51-1.23.51h-.59c-.46 0-.9-.18-1.23-.51l-.29-.29a1.74 1.74 0 0 1-.51-1.23v-.59c0-.46-.18-.9-.51-1.23L4.91 5.92a2.49 2.49 0 0 0-1.77-.73h-.74c-.13 0-.26.01-.39.04L2.04 4.326zM13.92 11.23a6.953 6.953 0 0 1-2.09 3.02l-.37-.74a1.74 1.74 0 0 0-1.55-.97H8.38c-.46 0-.9-.18-1.23-.51L5.94 10.8a2.49 2.49 0 0 1-.73-1.77V8.44c0-.32-.13-.62-.35-.84l-.62-.62a.87.87 0 0 0-1.23 0L1.75 8.24a6.957 6.957 0 0 1-.36-4.63l.62.62c.16.16.39.26.62.26h.88c.49 0 .88-.39.88-.88v-.59c0-.23.09-.46.26-.62L5.53 1.54a6.974 6.974 0 0 1 4.7 1.83l-.26.26a.87.87 0 0 0-.26.62v.88c0 .49.39.88.88.88h.88c.23 0 .46.09.62.26l.88.88c.16.16.26.39.26.62v1.76c0 .23-.09.46-.26.62l-.88.88a.87.87 0 0 0-.26.62v.88c0 .32.13.62.35.84l.62.62c.16.16.26.39.26.62v.42c0 .24-.1.47-.26.63l-.38.38z" />
                              </svg>
                            </div>
                          </div>
                        </div>

                        {/* FB Text */}
                        <div className="px-3.5 pb-2 text-[13px] text-[#e4e6eb] leading-normal font-sans select-all">
                          {currentSeo.og_description || currentSeo.description || "No preview description available. Visit the site to read more details."}
                        </div>

                        {/* Media image */}
                        {currentSeo.og_image ? (
                          <div className="w-full aspect-[1.91/1] overflow-hidden bg-slate-900 border-y border-[#2f3031] flex items-center justify-center relative">
                            <img src={currentSeo.og_image} alt="OG Card Mock" className="w-full h-full object-cover" />
                          </div>
                        ) : (
                          <div className="w-full aspect-[1.91/1] bg-[#242526] flex flex-col items-center justify-center text-slate-500 border-y border-[#2f3031]">
                            <svg className="w-10 h-10 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            <span className="text-[10px] uppercase font-bold tracking-wider">No og:image found</span>
                          </div>
                        )}
                        
                        {/* Card metadata snippet */}
                        <div className="p-3.5 bg-[#242526] border-b border-[#2f3031]">
                          <div className="text-[10px] text-[#b0b3b8] uppercase tracking-wider font-semibold select-all">
                            {(() => {
                              try { return currentSeo.url ? new URL(currentSeo.url).hostname : "website"; } catch(e) { return "website"; }
                            })()}
                          </div>
                          <div className="text-sm font-bold text-[#e4e6eb] mt-1 leading-snug line-clamp-1 select-all">
                            {currentSeo.og_title || currentSeo.title || "Untitled Document"}
                          </div>
                          <div className="text-xs text-[#b0b3b8] mt-1 line-clamp-1 leading-normal select-all">
                            {currentSeo.og_description || currentSeo.description || "No description provided."}
                          </div>
                        </div>

                        {/* Interactive Buttons footer */}
                        <div className="px-2 py-1 flex items-center justify-between text-xs text-[#b0b3b8] font-semibold bg-[#242526]">
                          <button className="flex-1 py-2 hover:bg-[#3a3b3c] rounded-lg flex items-center justify-center gap-1.5 transition select-none cursor-pointer">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
                            </svg>
                            <span>Like</span>
                          </button>
                          <button className="flex-1 py-2 hover:bg-[#3a3b3c] rounded-lg flex items-center justify-center gap-1.5 transition select-none cursor-pointer">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                            </svg>
                            <span>Comment</span>
                          </button>
                          <button className="flex-1 py-2 hover:bg-[#3a3b3c] rounded-lg flex items-center justify-center gap-1.5 transition select-none cursor-pointer">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                            </svg>
                            <span>Share</span>
                          </button>
                        </div>
                      </div>

                      {/* Twitter/X Summary Card */}
                      <div className="border border-[#2f3336] bg-[#000000] text-slate-100 rounded-xl overflow-hidden shadow-lg max-w-lg font-sans">
                        <div className="bg-[#16181c] px-4 py-3 text-[10px] font-extrabold text-slate-400 uppercase tracking-widest border-b border-[#2f3336] flex justify-between items-center">
                          <span>Twitter/X Card Preview</span>
                          <span className="w-2 h-2 rounded-full bg-[#1da1f2] shadow-[0_0_6px_rgba(29,161,242,0.6)] animate-pulse" />
                        </div>
                        
                        <div className="p-3.5 flex gap-3">
                          {/* Circular profile avatar */}
                          <div className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-black text-sm text-slate-400 shrink-0 uppercase select-none">
                            {(() => {
                              try { return currentSeo.url ? new URL(currentSeo.url).hostname.charAt(0) : "W"; } catch(e) { return "W"; }
                            })()}
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            {/* Author header info */}
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-sm font-bold text-slate-100 hover:underline cursor-pointer truncate select-all">
                                {(() => {
                                  try { return currentSeo.url ? new URL(currentSeo.url).hostname : "Website"; } catch(e) { return "Website"; }
                                })()}
                              </span>
                              <span className="text-xs text-slate-500 font-medium truncate select-all">
                                {`@${(() => {
                                  try { return currentSeo.url ? new URL(currentSeo.url).hostname.split(".")[0] : "site"; } catch(e) { return "site"; }
                                })()}`}
                              </span>
                              <span className="text-xs text-slate-500 font-semibold">•</span>
                              <span className="text-xs text-slate-500 hover:underline">1m</span>
                            </div>
                            
                            {/* Tweet caption */}
                            <div className="text-[13px] text-slate-200 mt-1 leading-normal font-sans select-all">
                              Discover our latest insights and metadata audit results! #webdev #seo
                            </div>
                            
                            {/* Embedded metadata card preview */}
                            <div className="border border-[#2f3336] rounded-2xl overflow-hidden mt-3 bg-[#0f1419] transition hover:bg-[#15181c] cursor-pointer">
                              {currentSeo.twitter_image ? (
                                <div className="w-full aspect-[2/1] overflow-hidden bg-slate-900 flex items-center justify-center border-b border-[#2f3336]">
                                  <img src={currentSeo.twitter_image} alt="Twitter Card Mock" className="w-full h-full object-cover" />
                                </div>
                              ) : (
                                <div className="w-full aspect-[2/1] bg-[#16181c] flex flex-col items-center justify-center text-slate-600 border-b border-[#2f3336]">
                                  <svg className="w-10 h-10 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                  </svg>
                                  <span className="text-[10px] uppercase font-bold tracking-wider">No twitter:image found</span>
                                </div>
                              )}
                              
                              <div className="p-3">
                                <div className="text-[10px] text-slate-500 font-semibold select-all">
                                  {(() => {
                                    try { return currentSeo.url ? new URL(currentSeo.url).hostname : "website"; } catch(e) { return "website"; }
                                  })()}
                                </div>
                                <div className="text-sm font-bold text-slate-200 mt-0.5 leading-snug line-clamp-1 select-all">
                                  {currentSeo.twitter_title || currentSeo.og_title || currentSeo.title || "Untitled Document"}
                                </div>
                                <div className="text-xs text-slate-400 mt-1 line-clamp-1 leading-normal select-all">
                                  {currentSeo.twitter_description || currentSeo.og_description || currentSeo.description || "No description provided."}
                                </div>
                              </div>
                            </div>

                            {/* Tweet Action Indicators */}
                            <div className="flex items-center justify-between text-slate-500 text-xs mt-3 max-w-md select-none">
                              <button className="flex items-center gap-1.5 hover:text-sky-400 transition cursor-pointer">
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                                </svg>
                                <span>24</span>
                              </button>
                              <button className="flex items-center gap-1.5 hover:text-emerald-400 transition cursor-pointer">
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.21 7.89H18.235" />
                                </svg>
                                <span>12</span>
                              </button>
                              <button className="flex items-center gap-1.5 hover:text-rose-400 transition cursor-pointer">
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                                </svg>
                                <span>142</span>
                              </button>
                              <button className="flex items-center gap-1.5 hover:text-sky-400 transition cursor-pointer">
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                </svg>
                                <span>4.2K</span>
                              </button>
                            </div>

                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Right column: Schema Audit */}
                    <div className="space-y-6">
                      <div className="border border-brand-border bg-slate-950/40 rounded-xl p-5 shadow-sm min-h-[400px]">
                        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-4">JSON-LD Structured Data Schema Audit</div>
                        
                        {!currentSeo.schemas || currentSeo.schemas.length === 0 ? (
                          <div className="text-slate-500 text-xs py-8 text-center bg-slate-900/10 border border-brand-border/20 rounded-xl">
                            No JSON-LD schemas detected on this page. Add schemas to declare LocalBusiness, Organization, or Breadcrumb structures to search engines.
                          </div>
                        ) : (
                          <div className="space-y-4">
                            {currentSeo.schemas.map((s, sIdx) => {
                              let parsedSchema = null;
                              try {
                                parsedSchema = JSON.parse(s.raw_json);
                              } catch(e) {}

                              return (
                                <div key={sIdx} className="border border-brand-border/60 rounded-xl p-4 bg-slate-900/20">
                                  <div className="flex justify-between items-center gap-2 mb-2">
                                    <span className="text-xs font-bold text-indigo-300 font-mono">@{s.type}</span>
                                    <span className={`text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded border ${
                                      s.is_valid 
                                        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" 
                                        : "bg-rose-500/10 text-rose-400 border-rose-500/20 shadow-[0_0_8px_rgba(244,63,94,0.1)]"
                                    }`}>
                                      {s.is_valid ? "Valid" : "Issues"}
                                    </span>
                                  </div>
                                  
                                  {s.issues && s.issues.length > 0 ? (
                                    <ul className="list-disc pl-4 text-[10px] text-rose-400 space-y-1 mt-2">
                                      {s.issues.map((issue, issueIdx) => (
                                        <li key={issueIdx}>{issue}</li>
                                      ))}
                                    </ul>
                                  ) : (
                                    <div className="text-[10px] text-emerald-400 font-semibold mt-1 flex items-center gap-1">
                                      <span>✓ Fully compliant with schema spec.</span>
                                    </div>
                                  )}
                                  
                                  <div className="mt-3 border border-brand-border/40 rounded-xl bg-slate-950/60 overflow-hidden">
                                    <div className="flex justify-between items-center bg-slate-950 px-3 py-2 border-b border-brand-border/40 select-none">
                                      <span className="text-[9px] text-slate-400 font-extrabold uppercase tracking-wider">Properties Inspector</span>
                                      <button
                                        onClick={() => {
                                          setShowRawJson(prev => ({
                                            ...prev,
                                            [`${sIdx}`]: !prev[`${sIdx}`]
                                          }));
                                        }}
                                        className="text-[9px] font-bold text-indigo-400 hover:text-indigo-300 transition cursor-pointer px-2 py-0.5 border border-indigo-500/20 bg-indigo-500/5 select-none"
                                      >
                                        {showRawJson[`${sIdx}`] ? "Show Property Grid" : "Show Raw JSON"}
                                      </button>
                                    </div>
                                    
                                    {showRawJson[`${sIdx}`] ? (
                                      <pre className="p-3 text-[9px] text-slate-450 font-mono overflow-x-auto max-h-[220px] select-all bg-slate-950">
                                        {s.raw_json}
                                      </pre>
                                    ) : (
                                      <div className="p-2 overflow-x-auto max-h-[220px]">
                                        {parsedSchema ? (
                                          <table className="w-full text-left text-[10px] border-collapse font-mono">
                                            <tbody>
                                              {Object.entries(parsedSchema).map(([key, val]) => {
                                                if (key === "@context") return null;
                                                let valStr = "";
                                                if (typeof val === "object" && val !== null) {
                                                  valStr = JSON.stringify(val);
                                                } else {
                                                  valStr = String(val);
                                                }
                                                return (
                                                  <tr key={key} className="border-b border-brand-border/20 last:border-b-0 hover:bg-slate-900/10">
                                                    <td className="py-1.5 pr-3 font-bold text-indigo-400 shrink-0 select-all align-top">{key}</td>
                                                    <td className="py-1.5 text-slate-350 break-all select-all align-top">{valStr}</td>
                                                  </tr>
                                                );
                                              })}
                                            </tbody>
                                          </table>
                                        ) : (
                                          <span className="text-[10px] text-slate-500 italic p-2 block">Could not parse schema JSON.</span>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>

                  </div>
                );
              })()}
            </div>
          </div>
        )}

        {/* TAB CONTENT: BUG RESOLVED CHECKLIST */}
        {activeTab === "resolved" && (
          <div className="animate-fadeIn">
            {(() => {
              const totalFindings = audit.findings.length;
              const fixedFindings = audit.findings.filter(f => f.is_fixed).length;
              const remainingFindings = totalFindings - fixedFindings;
              const progressPercentage = totalFindings > 0 ? Math.round((fixedFindings / totalFindings) * 100) : 0;
              
              return (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
                    <div className="rounded-2xl border border-brand-border bg-gradient-to-br from-brand-card/45 to-slate-900/10 p-6 flex items-center justify-between shadow-xl">
                      <div>
                        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Total Issues Found</div>
                        <div className="text-3xl font-black text-slate-100">{totalFindings}</div>
                      </div>
                      <div className="p-3 bg-indigo-500/10 rounded-2xl text-brand-primary border border-indigo-500/10">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-brand-border bg-gradient-to-br from-brand-card/45 to-slate-900/10 p-6 flex items-center justify-between shadow-xl">
                      <div>
                        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Resolved Issues</div>
                        <div className="text-3xl font-black text-emerald-400">{fixedFindings}</div>
                      </div>
                      <div className="p-3 bg-emerald-500/10 rounded-2xl text-emerald-400 border border-emerald-500/10">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-brand-border bg-gradient-to-br from-brand-card/45 to-slate-900/10 p-6 flex items-center justify-between shadow-xl">
                      <div>
                        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Remaining Issues</div>
                        <div className="text-3xl font-black text-rose-400">{remainingFindings}</div>
                      </div>
                      <div className="p-3 bg-rose-500/10 rounded-2xl text-rose-400 border border-rose-500/10">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                    </div>
                  </div>

                  {/* Progress Bar Card */}
                  <div className="rounded-2xl border border-brand-border bg-brand-card/40 p-6 shadow-xl mb-8">
                    <div className="flex justify-between items-center mb-3 text-sm font-semibold text-slate-300">
                      <span>Fix Completion Progress</span>
                      <span className="text-indigo-400 font-bold">{progressPercentage}%</span>
                    </div>
                    <div className="h-3 bg-slate-950 rounded-full overflow-hidden border border-brand-border/40">
                      <div 
                        className="h-full bg-gradient-to-r from-indigo-500 to-emerald-500 rounded-full transition-all duration-500" 
                        style={{ width: `${progressPercentage}%` }} 
                      />
                    </div>
                  </div>

                  {/* Interactive Checklist Card */}
                  <div className="rounded-2xl border border-brand-border bg-brand-card/40 p-6 md:p-8 shadow-xl">
                    <h3 className="text-base font-bold text-slate-100 mb-2 flex items-center gap-2">
                      <svg className="w-5 h-5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2" />
                      </svg>
                      QA & Developer Resolution Checklist
                    </h3>
                    <p className="text-xs text-slate-400 mb-6 leading-relaxed">
                      Below is the list of all findings. Developers can toggle each issue to mark it as fixed, which instantly updates the DB.
                    </p>

                    {audit.findings.length === 0 ? (
                      <div className="text-center py-16 text-slate-500">
                        No findings available to resolve.
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {/* Sort findings so critical is at the top */}
                        {(() => {
                          const severityOrder = { "CRITICAL": 0, "HIGH": 1, "MEDIUM": 2, "LOW": 3 };
                          const sorted = [...audit.findings].sort((a, b) => {
                            if (a.is_fixed !== b.is_fixed) {
                              return a.is_fixed ? 1 : -1; // unfixed first
                            }
                            return severityOrder[a.severity] - severityOrder[b.severity];
                          });
                          
                          return sorted.map((finding) => (
                            <div 
                              key={finding.id} 
                              className={`rounded-2xl border border-brand-border p-4 sm:p-5 transition flex gap-4 items-start select-none ${
                                finding.is_fixed 
                                  ? "bg-slate-900/10 border-slate-800/40 opacity-50" 
                                  : "bg-brand-card/50 hover:border-slate-800 hover:bg-brand-card/75"
                              }`}
                            >
                              {/* Checkbox wrapper */}
                              <div className="pt-0.5 shrink-0">
                                <button
                                  onClick={() => handleToggleFixed(finding.id)}
                                  className={`w-6 h-6 rounded-lg border flex items-center justify-center transition active:scale-95 cursor-pointer ${
                                    finding.is_fixed
                                      ? "bg-emerald-500 border-emerald-500 text-white"
                                      : "border-slate-700 bg-slate-950 text-transparent hover:border-slate-600"
                                  }`}
                                  title={finding.is_fixed ? "Mark as remaining" : "Mark as fixed"}
                                >
                                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                  </svg>
                                </button>
                              </div>

                              {/* Details */}
                              <div className="min-w-0 flex-1">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-1">
                                  <span className={`text-sm font-bold truncate leading-tight ${
                                    finding.is_fixed ? "line-through text-slate-500 font-normal" : "text-slate-200 font-bold"
                                  }`}>
                                    {finding.title}
                                  </span>
                                  <div className="flex gap-2 items-center shrink-0 flex-wrap">
                                    {finding.is_fixed ? (
                                      <span className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[8px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full">
                                        Resolved
                                      </span>
                                    ) : (
                                      <span className="bg-rose-500/10 border border-rose-500/20 text-rose-400 text-[8px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full">
                                        Open
                                      </span>
                                    )}
                                    <span className="bg-slate-950/60 border border-brand-border text-slate-500 text-[8px] font-bold tracking-wider px-2 py-0.5 rounded font-mono">
                                      {finding.issue_code}
                                    </span>
                                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[8px] font-bold uppercase tracking-wider border ${getSeverityBadgeClass(finding.severity)}`}>
                                      {finding.severity}
                                    </span>
                                  </div>
                                </div>
                                <div className="text-xs text-indigo-400 font-mono truncate mb-2 select-all" title={finding.page_url}>
                                  Page: {getUrlPath(finding.page_url)}
                                </div>
                                <p className={`text-xs leading-relaxed ${
                                  finding.is_fixed ? "text-slate-600" : "text-slate-400"
                                }`}>
                                  {finding.description}
                                </p>
                                {finding.screenshot_id && (
                                  <div className="pt-2">
                                    <button
                                      onClick={() => {
                                        setPageFilter(finding.page_url);
                                        setSelectedScreenshotId(finding.screenshot_id);
                                        setSelectedFindingId(finding.id);
                                        setViewMode("inspector");
                                        setActiveTab("developer");
                                      }}
                                      className="text-[10px] font-extrabold uppercase tracking-wider text-indigo-400 hover:text-indigo-350 transition duration-150 flex items-center gap-1 cursor-pointer bg-slate-900 border border-brand-border/40 hover:border-slate-700 px-3 py-1 rounded-lg shadow-sm w-fit"
                                    >
                                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                      </svg>
                                      Open in Interactive Visual Inspector
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          ));
                        })()}
                      </div>
                    )}
                  </div>
                </>
              );
            })()}
          </div>
        )}

        {/* TAB CONTENT: SECURITY SCORECARD */}
        {activeTab === "security" && (() => {
          let securityDetails = null;
          if (audit?.security_details_str) {
            try {
              securityDetails = JSON.parse(audit.security_details_str);
            } catch (e) {
              console.error("Failed to parse security details:", e);
            }
          }

          return (
            <div className="animate-fadeIn space-y-8">
              <div className="rounded-2xl border border-brand-border bg-brand-card/40 p-6 shadow-xl">
                <h3 className="text-base font-bold text-slate-100 mb-2 flex items-center gap-2">
                  <svg className="w-5 h-5 text-teal-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                  SSL & Security Headers Scorecard
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Inspect the encryption strength and security configuration of your server. This audit validates SSL/TLS certificate validity and the presence of crucial security headers.
                </p>
              </div>

              {!securityDetails ? (
                <div className="rounded-2xl border border-brand-border bg-brand-card/25 p-8 text-center shadow-md">
                  <p className="text-xs text-slate-500 italic">
                    Security scorecard details are not available for this run. Run a fresh audit to generate detailed security parameters.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Left Column: Grade & SSL Cert */}
                  <div className="space-y-6">
                    {/* Grade Badge Card */}
                    <div className="security-card rounded-2xl border border-brand-border bg-brand-card/40 p-6 flex flex-col items-center justify-center text-center shadow-xl min-h-[260px]">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-4">Security Grade</span>
                      
                      {(() => {
                        const grade = securityDetails.security_headers_grade || "F";
                        const score = securityDetails.security_headers_score ?? 0;
                        let gradeColorClass = "text-rose-400 border-rose-500/30 bg-rose-500/5 shadow-[0_0_25px_rgba(244,63,94,0.25)]";
                        if (grade.startsWith("A")) {
                          gradeColorClass = "text-emerald-400 border-emerald-500/30 bg-emerald-500/5 shadow-[0_0_25px_rgba(16,185,129,0.25)]";
                        } else if (grade.startsWith("B") || grade.startsWith("C") || grade.startsWith("D")) {
                          gradeColorClass = "text-amber-400 border-amber-500/30 bg-amber-500/5 shadow-[0_0_25px_rgba(245,158,11,0.25)]";
                        }
                        
                        return (
                          <>
                            <div className={`w-32 h-32 rounded-full border-4 flex items-center justify-center text-5xl font-black mb-4 transition duration-300 ${gradeColorClass}`}>
                              {grade}
                            </div>
                            <span className="text-sm font-bold text-slate-300">
                              Security Score: <span className="font-extrabold text-white">{score}</span> / 100
                            </span>
                          </>
                        );
                      })()}
                    </div>

                    {/* SSL Cert Info Card */}
                    <div className="security-card rounded-2xl border border-brand-border bg-brand-card/40 p-6 shadow-xl">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-4 flex items-center gap-2">
                        <svg className="w-4 h-4 text-teal-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                        SSL Certificate Information
                      </h4>
                      <div className="space-y-4">
                        <div className="flex justify-between items-center border-b border-brand-border/40 pb-2">
                          <span className="text-xs text-slate-400 font-medium">SSL Status</span>
                          {securityDetails.ssl_valid ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                              Secure & Valid
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                              <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                              Insecure / Invalid
                            </span>
                          )}
                        </div>

                        <div className="flex justify-between items-center border-b border-brand-border/40 pb-2">
                          <span className="text-xs text-slate-400 font-medium">Certificate Issuer</span>
                          <span className="text-xs text-slate-200 font-bold truncate max-w-[240px]" title={securityDetails.ssl_issuer}>
                            {securityDetails.ssl_issuer || "None"}
                          </span>
                        </div>

                        <div className="flex justify-between items-center border-b border-brand-border/40 pb-2">
                          <span className="text-xs text-slate-400 font-medium">Expiration Date</span>
                          <span className="text-xs text-slate-200 font-mono font-bold">
                            {securityDetails.ssl_expiry 
                              ? new Date(securityDetails.ssl_expiry).toLocaleDateString(undefined, { dateStyle: 'medium' })
                              : "N/A"
                            }
                          </span>
                        </div>

                        <div className="flex justify-between items-center">
                          <span className="text-xs text-slate-400 font-medium">Days Remaining</span>
                          {(() => {
                            const days = securityDetails.ssl_days_remaining ?? 0;
                            let badgeClass = "bg-rose-500/10 text-rose-400 border-rose-500/20";
                            if (days > 30) {
                              badgeClass = "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
                            } else if (days > 0) {
                              badgeClass = "bg-amber-500/10 text-amber-400 border-amber-500/20";
                            }
                            return (
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${badgeClass}`}>
                                {days < 0 ? "Expired" : `${days} Days`}
                              </span>
                            );
                          })()}
                        </div>

                        {securityDetails.ssl_error && (
                          <div className="mt-4 p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-[10px] font-bold leading-relaxed font-mono">
                            Error Details: {securityDetails.ssl_error}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Security Headers Checklist */}
                  <div className="security-card rounded-2xl border border-brand-border bg-brand-card/40 p-6 shadow-xl">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-4 flex items-center gap-2">
                      <svg className="w-4 h-4 text-teal-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                      HTTP Security Headers Checklist
                    </h4>
                    
                    <div className="space-y-4">
                      {[
                        {
                          key: "strict-transport-security",
                          name: "Strict-Transport-Security (HSTS)",
                          desc: "Forces all connections over secure HTTPS, protecting against SSL stripping."
                        },
                        {
                          key: "content-security-policy",
                          name: "Content-Security-Policy (CSP)",
                          desc: "Specifies allowed sources of resources to prevent cross-site scripting (XSS)."
                        },
                        {
                          key: "x-frame-options",
                          name: "X-Frame-Options (Clickjacking)",
                          desc: "Prevents browsers from loading the page inside frames or iframes."
                        },
                        {
                          key: "x-content-type-options",
                          name: "X-Content-Type-Options (MIME-Sniffing)",
                          desc: "Forces browsers to respect the content-type header, avoiding execution of scripts disguised as images."
                        }
                      ].map(header => {
                        const isPresent = securityDetails.headers_present?.includes(header.key);
                        return (
                          <div key={header.key} className="bg-slate-950/40 border border-brand-border/40 rounded-xl p-4 flex gap-4 items-start">
                            <div className="shrink-0 mt-0.5">
                              {isPresent ? (
                                <span className="flex w-5 h-5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 items-center justify-center text-xs font-bold">✓</span>
                              ) : (
                                <span className="flex w-5 h-5 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 items-center justify-center text-xs font-bold">✗</span>
                              )}
                            </div>
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-slate-200">{header.name}</span>
                                <span className={`text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border ${
                                  isPresent ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-rose-500/10 text-rose-400 border-rose-500/20"
                                }`}>
                                  {isPresent ? "Present" : "Missing"}
                                </span>
                              </div>
                              <p className="text-[11px] text-slate-400 leading-relaxed">{header.desc}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })()}

        {/* TAB CONTENT: PERFORMANCE HISTORY TRENDS */}
        {activeTab === "trends" && (
          <div className="animate-fadeIn space-y-8">
            <div className="rounded-2xl border border-brand-border bg-brand-card/40 p-6 shadow-xl">
              <h3 className="text-base font-bold text-slate-100 mb-2 flex items-center gap-2">
                <svg className="w-5 h-5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M7 12l3-3 3 3 4-4M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
                Project Performance History & Trends
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Track optimization progress and identify performance regression trends across historical completed runs for the target website.
              </p>
            </div>

            {trendsData.length < 2 ? (
              <div className="rounded-2xl border border-brand-border bg-brand-card/25 p-8 text-center shadow-md">
                <p className="text-xs text-slate-500 italic">
                  Historical trends require at least two completed audit runs of this website. Gather more runs to populate the line graphs.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Score progression chart */}
                <div className="trend-card rounded-2xl border border-brand-border bg-brand-card/40 p-6 shadow-xl">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-6 flex items-center gap-2">
                    <svg className="w-4 h-4 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                    Historical Category Scores
                  </h4>
                  {/* Category checkline toggles */}
                  <div className="flex flex-wrap gap-2 mb-6 bg-slate-950/45 border border-brand-border/40 p-3 rounded-xl">
                    {[
                      { id: "overall", label: "Overall Health", color: "border-indigo-500 text-indigo-400" },
                      { id: "seo", label: "SEO", color: "border-purple-500 text-purple-400" },
                      { id: "performance", label: "Performance", color: "border-amber-500 text-amber-400" },
                      { id: "accessibility", label: "Accessibility", color: "border-emerald-500 text-emerald-400" },
                      { id: "security", label: "Security", color: "border-teal-500 text-teal-400" },
                      { id: "responsiveness", label: "Responsiveness", color: "border-blue-500 text-blue-400" },
                      { id: "forms", label: "Forms", color: "border-fuchsia-500 text-fuchsia-400" },
                      { id: "navigation", label: "Navigation", color: "border-rose-500 text-rose-450" },
                      { id: "content", label: "Content", color: "border-orange-500 text-orange-400" },
                      { id: "branding", label: "Branding", color: "border-cyan-500 text-cyan-400" },
                      { id: "footer", label: "Footer", color: "border-rose-500 text-rose-400" },
                    ].map(cat => (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => toggleCategoryLine(cat.id)}
                        className={`px-3 py-1 rounded-lg text-[9px] font-extrabold uppercase tracking-wider transition border cursor-pointer ${
                          activeCategoryLines[cat.id]
                            ? `bg-slate-900 ${
                                cat.id === 'overall' ? 'border-indigo-500 text-indigo-400' : 
                                cat.id === 'seo' ? 'border-purple-500 text-purple-400' : 
                                cat.id === 'performance' ? 'border-amber-500 text-amber-400' : 
                                cat.id === 'accessibility' ? 'border-emerald-500 text-emerald-400' : 
                                cat.id === 'security' ? 'border-teal-500 text-teal-400' : 
                                cat.id === 'responsiveness' ? 'border-blue-500 text-blue-400' : 
                                cat.id === 'forms' ? 'border-fuchsia-500 text-fuchsia-400' : 
                                cat.id === 'navigation' ? 'border-rose-500 text-rose-450' : 
                                cat.id === 'content' ? 'border-orange-500 text-orange-400' : 
                                cat.id === 'branding' ? 'border-cyan-500 text-cyan-400' : 
                                'border-rose-500 text-rose-400'
                              } shadow-md`
                            : "bg-transparent border-brand-border/30 text-slate-500 hover:text-slate-400"
                        }`}
                      >
                        {cat.label}
                      </button>
                    ))}
                  </div>

                  <div className="w-full h-[280px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={trendsData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-brand-border)" />
                        <XAxis dataKey="date" stroke="var(--color-slate-400)" fontSize={9} />
                        <YAxis domain={[0, 100]} stroke="var(--color-slate-400)" fontSize={9} />
                        <Tooltip
                          contentStyle={{ backgroundColor: 'var(--color-brand-card)', borderColor: 'var(--color-brand-border)', borderRadius: '12px' }}
                          labelClassName="text-slate-300 font-bold font-mono text-xs"
                        />
                        <Legend wrapperStyle={{ fontSize: '9px', paddingTop: '10px' }} />
                        {activeCategoryLines.overall && <Line type="monotone" dataKey="overall" name="Overall Health" stroke={lineColors.overall} strokeWidth={3} activeDot={{ r: 5 }} />}
                        {activeCategoryLines.seo && <Line type="monotone" dataKey="seo" name="SEO" stroke={lineColors.seo} strokeWidth={1.5} />}
                        {activeCategoryLines.performance && <Line type="monotone" dataKey="performance" name="Performance" stroke={lineColors.performance} strokeWidth={1.5} />}
                        {activeCategoryLines.accessibility && <Line type="monotone" dataKey="accessibility" name="Accessibility" stroke={lineColors.accessibility} strokeWidth={1.5} />}
                        {activeCategoryLines.security && <Line type="monotone" dataKey="security" name="Security" stroke={lineColors.security} strokeWidth={1.5} />}
                        {activeCategoryLines.responsiveness && <Line type="monotone" dataKey="responsiveness" name="Responsiveness" stroke={lineColors.responsiveness} strokeWidth={1.5} />}
                        {activeCategoryLines.forms && <Line type="monotone" dataKey="forms" name="Forms" stroke={lineColors.forms} strokeWidth={1.5} />}
                        {activeCategoryLines.navigation && <Line type="monotone" dataKey="navigation" name="Navigation" stroke={lineColors.navigation} strokeWidth={1.5} />}
                        {activeCategoryLines.content && <Line type="monotone" dataKey="content" name="Content" stroke={lineColors.content} strokeWidth={1.5} />}
                        {activeCategoryLines.branding && <Line type="monotone" dataKey="branding" name="Branding" stroke={lineColors.branding} strokeWidth={1.5} />}
                        {activeCategoryLines.footer && <Line type="monotone" dataKey="footer" name="Footer" stroke={lineColors.footer} strokeWidth={1.5} />}
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Scan scopes / Pages Count chart */}
                <div className="trend-card rounded-2xl border border-brand-border bg-brand-card/40 p-6 shadow-xl">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-6 flex items-center gap-2">
                    <svg className="w-4 h-4 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                    Scan Scope Trend
                  </h4>
                  <div className="w-full h-[280px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={trendsData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                        <defs>
                          <linearGradient id="colorPages" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.25}/>
                            <stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-brand-border)" />
                        <XAxis dataKey="date" stroke="var(--color-slate-400)" fontSize={9} />
                        <YAxis stroke="var(--color-slate-400)" fontSize={9} />
                        <Tooltip
                          contentStyle={{ backgroundColor: 'var(--color-brand-card)', borderColor: 'var(--color-brand-border)', borderRadius: '12px' }}
                          labelClassName="text-slate-300 font-bold font-mono text-xs"
                        />
                        <Legend wrapperStyle={{ fontSize: '9px', paddingTop: '10px' }} />
                        <Area type="monotone" dataKey="total_pages" name="Pages Scanned" stroke="#06b6d4" fillOpacity={1} fill="url(#colorPages)" strokeWidth={2} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB CONTENT: COMPARE AUDIT RUNS */}
        {activeTab === "compare" && (
          <div className="animate-fadeIn">
            <div className="rounded-2xl border border-brand-border bg-brand-card/40 p-6 shadow-xl mb-8">
              <h3 className="text-base font-bold text-slate-100 mb-2 flex items-center gap-2">
                <svg className="w-5 h-5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                Audit Run Comparison
              </h3>
              <p className="text-xs text-slate-400 mb-6 max-w-3xl leading-relaxed">
                Compare results of the current audit with a previous completed run. See score improvements, resolved bugs, and newly introduced issues.
              </p>

              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 bg-slate-950 p-4 rounded-xl border border-brand-border/60">
                <label htmlFor="compare-run-select" className="text-xs font-bold text-slate-300 shrink-0">Compare Current Run With:</label>
                {compareRuns.length === 0 ? (
                  <span className="text-xs text-slate-500 font-semibold italic">No other completed runs found for this target website.</span>
                ) : (
                  <select
                    id="compare-run-select"
                    value={compareTargetJobId}
                    onChange={(e) => setCompareTargetJobId(e.target.value)}
                    className="bg-brand-input border border-brand-border rounded-xl text-slate-200 px-3.5 py-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-brand-primary/50 cursor-pointer min-w-[260px]"
                  >
                    <option value="">-- Select a past run --</option>
                    {compareRuns.map(run => (
                      <option key={run.job_id} value={run.job_id}>
                        {run.date} (Score: {run.overall_score})
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </div>

            {loadingComparison && (
              <div className="text-center py-16 text-slate-500 font-semibold uppercase tracking-wider animate-pulse text-xs">
                Generating comparative report...
              </div>
            )}

            {!loadingComparison && comparisonData && (
              <div className="space-y-8 animate-fadeIn">
                {/* comparative Scores Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Overall score box */}
                  <div className="rounded-2xl border border-brand-border bg-gradient-to-br from-brand-card/50 to-slate-950 p-6 flex flex-col items-center justify-center text-center shadow-xl">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">Overall Health Comparison</span>
                    <div className="flex items-center gap-4">
                      <div className="flex flex-col items-center">
                        <span className="text-2xl font-black text-slate-400">{comparisonData.scores.overall.a}</span>
                        <span className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mt-1">Previous</span>
                      </div>
                      <svg className="w-5 h-5 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                      </svg>
                      <div className="flex flex-col items-center">
                        <span className="text-3xl font-black text-slate-100">{comparisonData.scores.overall.b}</span>
                        <span className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mt-1">Current</span>
                      </div>
                    </div>
                    {/* delta badge */}
                    <div className="mt-4">
                      {comparisonData.scores.overall.delta > 0 ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-[0_0_12px_rgba(16,185,129,0.12)]">
                          ▲ +{comparisonData.scores.overall.delta} Improvement
                        </span>
                      ) : comparisonData.scores.overall.delta < 0 ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-rose-500/10 text-rose-400 border border-rose-500/20 shadow-[0_0_12px_rgba(244,63,94,0.12)]">
                          ▼ {comparisonData.scores.overall.delta} Regression
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-500/10 text-slate-400 border border-slate-500/20">
                          = No Change
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Category Scores Deltas */}
                  <div className="md:col-span-2 rounded-2xl border border-brand-border bg-brand-card/40 p-6 shadow-xl">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-4">Category Score Changes</span>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                      {Object.keys(comparisonData.scores).filter(k => k !== "overall").map(cat => {
                        const sData = comparisonData.scores[cat];
                        if (sData.a < 0 || sData.b < 0) return null; // Skip disabled
                        return (
                          <div key={cat} className="bg-slate-950/40 border border-brand-border/40 rounded-xl p-3 flex flex-col justify-between">
                            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">{cat}</span>
                            <div className="flex items-baseline justify-between mt-2 gap-2">
                              <span className="text-lg font-black text-slate-100">{sData.b}</span>
                              {sData.delta > 0 ? (
                                <span className="text-[10px] font-black text-emerald-400 font-mono">+{sData.delta}</span>
                              ) : sData.delta < 0 ? (
                                <span className="text-[10px] font-black text-rose-400 font-mono">{sData.delta}</span>
                              ) : (
                                <span className="text-[10px] font-bold text-slate-600">=</span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Findings split checklist section */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Resolved Findings */}
                  <div className="rounded-2xl border border-brand-border bg-brand-card/30 p-6 shadow-md">
                    <div className="flex justify-between items-center border-b border-brand-border/60 pb-3 mb-4">
                      <span className="text-xs font-black uppercase tracking-wider text-emerald-400 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                        Resolved Bugs ({comparisonData.findings.resolved.length})
                      </span>
                    </div>
                    {comparisonData.findings.resolved.length === 0 ? (
                      <p className="text-xs text-slate-500 italic py-6">No bugs resolved compared to the previous run.</p>
                    ) : (
                      <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1">
                        {comparisonData.findings.resolved.map((f, idx) => (
                          <div key={`res-${idx}`} className="bg-slate-900/30 border border-brand-border/30 rounded-xl p-3 flex flex-col gap-1">
                            <div className="flex justify-between items-start gap-3">
                              <span className="text-xs font-bold text-slate-200 line-through leading-tight">{f.title}</span>
                              <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[7px] font-bold px-1.5 py-0.5 rounded uppercase shrink-0">Resolved</span>
                            </div>
                            <span className="text-[9px] text-slate-500 font-mono truncate">{getUrlPath(f.page_url)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* New Findings */}
                  <div className="rounded-2xl border border-brand-border bg-brand-card/30 p-6 shadow-md">
                    <div className="flex justify-between items-center border-b border-brand-border/60 pb-3 mb-4">
                      <span className="text-xs font-black uppercase tracking-wider text-rose-400 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)] animate-pulse" />
                        New Issues Introduced ({comparisonData.findings.new.length})
                      </span>
                    </div>
                    {comparisonData.findings.new.length === 0 ? (
                      <p className="text-xs text-slate-500 italic py-6">No new bugs introduced! Clean progression.</p>
                    ) : (
                      <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1">
                        {comparisonData.findings.new.map((f, idx) => (
                          <div key={`new-${idx}`} className="bg-slate-900/30 border border-brand-border/30 rounded-xl p-3 flex flex-col gap-1">
                            <div className="flex justify-between items-start gap-3">
                              <span className="text-xs font-bold text-slate-200 leading-tight">{f.title}</span>
                              <span className="bg-rose-500/10 text-rose-400 border border-rose-500/20 text-[7px] font-bold px-1.5 py-0.5 rounded uppercase shrink-0">{f.severity}</span>
                            </div>
                            <span className="text-[9px] text-slate-500 font-mono truncate">{getUrlPath(f.page_url)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

// Capitalize helper extension
String.prototype.capitalize = function () {
  return this.charAt(0).toUpperCase() + this.slice(1);
};

function getScoreColor(score) {
  if (score < 0) return "#64748b"; // gray for N/A
  if (score >= 90) return "#10b981"; // success
  if (score >= 70) return "#3b82f6"; // info/low
  if (score >= 50) return "#eab308"; // medium
  return "#f43f5e"; // critical
}

function getScoreRating(score) {
  if (score < 0) return "Not Applicable";
  if (score >= 90) return "Excellent (Highly Compliant)";
  if (score >= 70) return "Good (Minor Improvements Needed)";
  if (score >= 50) return "Fair (Moderate Improvements Needed)";
  return "Critical (Immediate Attention Required)";
}

function getScoreGlowClass(score) {
  if (score < 0) return "shadow-slate-500/10";
  if (score >= 90) return "shadow-emerald-500/20";
  if (score >= 70) return "shadow-blue-500/20";
  if (score >= 50) return "shadow-yellow-500/20";
  return "shadow-rose-500/20";
}

function getSeverityBorderClass(severity) {
  switch (severity) {
    case "CRITICAL": return "border-l-rose-500";
    case "HIGH": return "border-l-orange-500";
    case "MEDIUM": return "border-l-yellow-500";
    case "LOW": return "border-l-blue-500";
    default: return "border-l-slate-500";
  }
}

function getSeverityBadgeClass(severity) {
  switch (severity) {
    case "CRITICAL": return "bg-rose-500/10 text-rose-400 border-rose-500/20 shadow-[0_0_12px_rgba(244,63,94,0.12)]";
    case "HIGH": return "bg-orange-500/10 text-orange-400 border-orange-500/20 shadow-[0_0_12px_rgba(249,115,22,0.12)]";
    case "MEDIUM": return "bg-yellow-500/10 text-yellow-400 border-yellow-500/20 shadow-[0_0_12px_rgba(234,179,8,0.12)]";
    case "LOW": return "bg-blue-500/10 text-blue-400 border-blue-500/20 shadow-[0_0_12px_rgba(59,130,246,0.12)]";
    default: return "bg-slate-500/10 text-slate-400 border-slate-500/20";
  }
}
