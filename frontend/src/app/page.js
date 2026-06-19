"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";

export default function AuthPage() {
  const router = useRouter();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [theme, setTheme] = useState("dark");

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

  // Check if already logged in
  useEffect(() => {
    const token = localStorage.getItem("token");
    const user = localStorage.getItem("user");
    if (token && user) {
      try {
        const parsed = JSON.parse(user);
        const role = parsed?.role || "tester";
        router.push(role === "developer" ? "/developer" : "/dashboard");
      } catch {
        router.push("/dashboard");
      }
    } else if (token || user) {
      // Clear half-cleared sessions
      localStorage.removeItem("token");
      localStorage.removeItem("user");
    }
  }, [router]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (isLogin) {
        // Standard OAuth2 form request
        const formData = new URLSearchParams();
        formData.append("username", email);
        formData.append("password", password);

        const response = await axios.post(process.env.NEXT_PUBLIC_API_URL + "/api/auth/login", formData, {
          headers: {
            "Content-Type": "application/x-www-form-urlencoded"
          }
        });

        localStorage.setItem("token", response.data.access_token);
        localStorage.setItem("user", JSON.stringify(response.data.user));
        const userRole = response.data.user?.role || "tester";
        router.push(userRole === "developer" ? "/developer" : "/dashboard");
      } else {
        // Register request
        await axios.post(process.env.NEXT_PUBLIC_API_URL + "/api/auth/register", {
          name,
          email,
          password
        });

        // Auto-login after registration
        const formData = new URLSearchParams();
        formData.append("username", email);
        formData.append("password", password);

        const loginRes = await axios.post(process.env.NEXT_PUBLIC_API_URL + "/api/auth/login", formData);
        localStorage.setItem("token", loginRes.data.access_token);
        localStorage.setItem("user", JSON.stringify(loginRes.data.user));
        const regRole = loginRes.data.user?.role || "tester";
        router.push(regRole === "developer" ? "/developer" : "/dashboard");
      }
    } catch (err) {
      setError(
        err.response?.data?.detail ||
        "Authentication failed. Please verify your details."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950/40 p-6 relative">
      <div className="absolute top-6 right-6">
        <button
          suppressHydrationWarning
          onClick={toggleTheme}
          className="p-2.5 rounded-xl border border-brand-border bg-slate-900/50 hover:bg-slate-800 text-slate-300 hover:text-white transition active:scale-[0.95] cursor-pointer shadow-sm hover:border-slate-700 flex items-center justify-center"
          title={theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
          id="theme-toggle-btn"
        >
          {theme === "dark" ? (
            <svg className="w-4.5 h-4.5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m0-12.728l.707.707m12.728 12.727l.707.707M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          ) : (
            <svg className="w-4.5 h-4.5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
            </svg>
          )}
        </button>
      </div>
      <div className="w-full max-w-md rounded-2xl border border-brand-border bg-brand-card/85 p-8 shadow-2xl backdrop-blur-xl transition duration-300 hover:border-slate-800">
        <div className="text-center mb-8 border-b border-brand-border pb-6 flex flex-col items-center justify-center">
          <div className="bg-white/95 px-4 py-2 rounded-xl shadow-md mb-2 flex items-center justify-center">
            <img src="/dimakh_logo.png" alt="Dimakh Consultants Logo" className="h-10 w-auto object-contain" />
          </div>
          <div className="text-xs font-medium text-slate-500 uppercase tracking-widest">
            Automated Website Quality & Audit
          </div>
        </div>

        <h2 className="text-xl font-bold text-slate-100 mb-6">
          {isLogin ? "Sign In" : "Create Account"}
        </h2>

        {error && (
          <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 p-4 rounded-xl text-sm mb-6 animate-fadeIn">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {!isLogin && (
            <div className="flex flex-col gap-2">
              <label htmlFor="name" className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Full Name
              </label>
              <input
                suppressHydrationWarning
                id="name"
                type="text"
                placeholder="Enter your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full bg-brand-input border border-brand-border text-slate-200 rounded-xl px-4 py-3 text-sm placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-transparent transition duration-200"
              />
            </div>
          )}

          <div className="flex flex-col gap-2">
            <label htmlFor="email" className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Email Address
            </label>
            <input
              suppressHydrationWarning
              id="email"
              type="email"
              placeholder="name@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full bg-brand-input border border-brand-border text-slate-200 rounded-xl px-4 py-3 text-sm placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-transparent transition duration-200"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="password" className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Password
            </label>
            <input
              suppressHydrationWarning
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full bg-brand-input border border-brand-border text-slate-200 rounded-xl px-4 py-3 text-sm placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-transparent transition duration-200"
            />
          </div>

          <button
            suppressHydrationWarning
            type="submit"
            disabled={loading}
            className="w-full bg-brand-primary hover:bg-brand-primary-hover text-white font-semibold rounded-xl px-6 py-3 text-sm transition active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed shadow-lg shadow-brand-primary/20 mt-2 cursor-pointer"
          >
            {loading ? (
              <span className="animate-pulse">Authenticating...</span>
            ) : isLogin ? (
              "Sign In"
            ) : (
              "Create Account"
            )}
          </button>
        </form>

        <div className="text-center mt-6 text-sm text-slate-400">
          {isLogin ? "Don't have an account? " : "Already have an account? "}
          <button
            suppressHydrationWarning
            onClick={() => {
              setIsLogin(!isLogin);
              setError("");
            }}
            className="text-brand-primary font-semibold hover:underline bg-transparent border-none p-0 cursor-pointer"
          >
            {isLogin ? "Register here" : "Sign in here"}
          </button>
        </div>
      </div>
    </div>
  );
}
