// Main Application Component - Synced
import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Search, 
  Download, 
  Zap, 
  MessageSquareText,
  Loader2,
  Eye,
  CheckCircle2,
  ArrowRight,
  Calculator,
  Sparkles,
  RotateCcw,
  History,
  LogOut,
  User,
  Key,
  ShieldAlert,
  FileSpreadsheet,
  Copy,
  Check,
  TrendingUp,
  Activity,
  ChevronDown,
  Sun,
  Moon,
  Mail,
  Link as LinkIcon,
  DollarSign,
  Cloud
} from 'lucide-react';
import { InstagramLead, UserConfig } from './types';
import { runHybridDiscovery, geminiSearchFallback } from './services/instagramService';
import { generateOutreachMessage } from './services/geminiService';

// ==========================================
// 🟣 Replace this link with your hosted logo!
const LOGO_URL = "https://i.postimg.cc/nLrPKdGG/Shared-Successlogo.png";
// ==========================================

const AVAILABLE_NICHES = [
  "Art & Illustration",
  "Beauty & Skincare",
  "Career Coaching",
  "Cooking & Baking",
  "Cryptocurrency & Web3",
  "Digital Marketing & SEO",
  "DIY & Home Improvement",
  "E-commerce & Dropshipping",
  "Fitness & Home Workouts",
  "Graphic Design",
  "Health & Wellness",
  "Language Learning",
  "Mindfulness & Mental Health",
  "Music Production",
  "Parenting & Family",
  "Personal Finance & Investing",
  "Photography & Videography",
  "Productivity & ADHD",
  "Real Estate & Wholesaling",
  "Relationships & Dating",
  "SaaS & Tech Startups",
  "Travel & Digital Nomad",
  "Vegan & Plant-Based Recipes",
  "Yoga & Pilates"
];

const App: React.FC = () => {
  // Theme State
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const savedTheme = localStorage.getItem('sss_theme');
    return savedTheme ? savedTheme === 'dark' : true;
  });

  // Session State
  const [user, setUser] = useState<UserConfig | null>(null);
  const [loginForm, setLoginForm] = useState({ username: '', apiKey: '' });
  const [isKeySelected, setIsKeySelected] = useState(false);

  // Leads State
  const [leads, setLeads] = useState<InstagramLead[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchStatus, setSearchStatus] = useState("");
  const [progress, setProgress] = useState(0);
  
  // Niche State
  const [nicheCategory, setNicheCategory] = useState("");
  const [customNiche, setCustomNiche] = useState("");
  
  const [leadCount, setLeadCount] = useState(10);
  const [aiLoading, setAiLoading] = useState<string | null>(null);
  const [aiMessage, setAiMessage] = useState<{username: string, text: string} | null>(null);
  const [groundingSources, setGroundingSources] = useState<any[]>([]);
  const [selectedLead, setSelectedLead] = useState<InstagramLead | null>(null);
  
  // UI & History State
  const [copiedLead, setCopiedLead] = useState<string | null>(null);
  const [history, setHistory] = useState<InstagramLead[]>([]);

  // Derived target niche for API calls
  const targetNiche = nicheCategory === 'Custom' ? customNiche.trim() : nicheCategory;

  // Check for Paid AI Studio Key on Mount
  useEffect(() => {
    const checkKey = async () => {
      if ((window as any).aistudio?.hasSelectedApiKey) {
        try {
          const selected = await (window as any).aistudio.hasSelectedApiKey();
          setIsKeySelected(selected);
        } catch (e) {
          console.error(e);
        }
      }
    };
    checkKey();
  }, []);

  // Apply Theme
  useEffect(() => {
    localStorage.setItem('sss_theme', isDarkMode ? 'dark' : 'light');
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  // Load Session on Mount
  useEffect(() => {
    const activeSession = localStorage.getItem('sss_active_session');
    if (activeSession) {
      const config = JSON.parse(activeSession);
      setUser(config);
      loadUserData(config.username);
    }
  }, []);

  const loadUserData = (username: string) => {
    const historyKey = `sss_user_${username}_history_v2`;
    
    const storedHistory = localStorage.getItem(historyKey);
    if (storedHistory) {
      try { setHistory(JSON.parse(storedHistory)); } catch (e) { setHistory([]); }
    } else {
      setHistory([]);
    }
  };

  useEffect(() => {
    if (user) {
      const key = `sss_user_${user.username}_history_v2`;
      localStorage.setItem(key, JSON.stringify(history));
    }
  }, [history, user]);

  const handleSelectPaidKey = async () => {
    if ((window as any).aistudio?.openSelectKey) {
      try {
        await (window as any).aistudio.openSelectKey();
        // Assume success to mitigate potential race condition
        setIsKeySelected(true); 
      } catch (error) {
        console.error("Failed to open key selector", error);
        // If it fails due to a missing entity error, the user will be prompted again.
        setIsKeySelected(false);
      }
    } else {
      alert("API Key selection is only available in the AI Studio preview environment. If running locally, check your .env file.");
    }
  };

  const handleSignIn = (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginForm.username) return;

    const config: UserConfig = {
      username: loginForm.username,
      apifyToken: loginForm.apiKey || undefined,
      isLiteMode: !loginForm.apiKey
    };

    setUser(config);
    localStorage.setItem('sss_active_session', JSON.stringify(config));
    loadUserData(config.username);
  };

  const handleSignOut = () => {
    setUser(null);
    setLeads([]);
    setHistory([]);
    setNicheCategory("");
    setCustomNiche("");
    localStorage.removeItem('sss_active_session');
  };

  const resetMemory = () => {
    if (confirm("Permanently clear all discovery history for this profile? This cannot be undone.")) {
      setHistory([]);
      if (user) {
        localStorage.removeItem(`sss_user_${user.username}_history_v2`);
      }
    }
  };

  const handleSearch = async () => {
    if (!user || !targetNiche) return;
    setIsSearching(true);
    setProgress(5);
    setSearchStatus("Initializing engine...");
    setLeads([]);
    setGroundingSources([]);
    
    const seenUsernames = new Set<string>(history.map(h => h.username));
    
    try {
      if (user.isLiteMode || !user.apifyToken) {
        // Fallback AI Mode
        setSearchStatus("Lite Mode: Using AI exclusively for search...");
        const { leads: aiLeads, sources } = await geminiSearchFallback(targetNiche, leadCount, Array.from(seenUsernames));
        const uniqueAiLeads = aiLeads.filter(l => !seenUsernames.has(l.username));
        setLeads(uniqueAiLeads);
        setGroundingSources(sources);
        setHistory(prev => [...prev, ...uniqueAiLeads]);
      } else {
        // Hybrid Mode: AI Search + API Audit
        try {
          const { leads: finalLeads, sources } = await runHybridDiscovery(
            targetNiche, 
            leadCount, 
            user.apifyToken, 
            Array.from(seenUsernames),
            (status, percent) => {
              setSearchStatus(status);
              setProgress(percent);
            }
          );
          
          setLeads(finalLeads);
          setGroundingSources(sources);
          setHistory(prev => [...prev, ...finalLeads]);
        } catch (hybridError: any) {
          // EXPOSE THE EXACT APIFY ERROR TO THE UI
          const errorMessage = hybridError?.message || String(hybridError);
          console.warn("Hybrid extraction failed, falling back to AI:", errorMessage);
          setSearchStatus(`Apify Error: ${errorMessage} | Falling back to AI...`);
          setProgress(40);
          
          // Automatic Graceful Fallback
          try {
            const { leads: aiLeads, sources } = await geminiSearchFallback(targetNiche, leadCount, Array.from(seenUsernames));
            const uniqueAiLeads = aiLeads.filter(l => !seenUsernames.has(l.username));
            setLeads(uniqueAiLeads);
            setGroundingSources(sources);
            setHistory(prev => [...prev, ...uniqueAiLeads]);
          } catch (fallbackErr: any) {
             throw new Error(`Apify failed (${errorMessage}) AND AI Fallback failed (${fallbackErr.message})`);
          }
        }
      }
    } catch (error: any) {
      console.error("Discovery cycle failed:", error);
      alert(`Discovery failed: ${error.message || "Please check your API configuration or try again."}`);
    } finally {
      setIsSearching(false);
      setProgress(100);
      // We purposefully don't clear the searchStatus immediately here so the user can read the fallback message
      setTimeout(() => setSearchStatus(""), 4000); 
    }
  };

  const exportToCSV = (data: InstagramLead[], filename: string) => {
    if (data.length === 0) return;

    const headers = [
      "Handle", 
      "Full Name", 
      "Niche", 
      "Followers", 
      "Posts/Day", 
      "Top Format", 
      "Est. Revenue Gap", 
      "Email", 
      "Website",
      "Suggested Product", 
      "Product Type", 
      "Strategy Description",
      "Bio",
      "Competitors",
      "Grounding Sources URLs"
    ];

    const escapeCSV = (str: string | number | undefined) => {
      if (str === undefined || str === null) return '""';
      const clean = String(str).replace(/"/g, '""').replace(/\n/g, ' ');
      return `"${clean}"`;
    };

    const rows = data.map(l => [
      escapeCSV(l.handle),
      escapeCSV(l.fullName),
      escapeCSV(l.niche),
      l.followers,
      escapeCSV(l.dailyWeeklySplit),
      escapeCSV(l.topFormat),
      l.estRevenueGap,
      escapeCSV(l.email),
      escapeCSV(l.externalUrl),
      escapeCSV(l.suggestedProduct?.name),
      escapeCSV(l.suggestedProduct?.type),
      escapeCSV(l.suggestedProduct?.description),
      escapeCSV(l.bio),
      escapeCSV(l.competitors?.map(c => `@${c.username} (${c.monetizationMethod})`).join(" | ")),
      escapeCSV(l.groundingSources?.join(" | "))
    ]);
    
    const csvContent = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `${filename}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleGenerateAI = async (lead: InstagramLead) => {
    setAiLoading(lead.username);
    const msg = await generateOutreachMessage(lead);
    setAiMessage({ username: lead.username, text: msg });
    setAiLoading(null);
  };

  const copyLeadData = (lead: InstagramLead) => {
    const textToCopy = `Handle: ${lead.handle}\nEmail: ${lead.email}\nEst. Revenue Gap: $${lead.estRevenueGap.toLocaleString()}`;
    navigator.clipboard.writeText(textToCopy).then(() => {
      setCopiedLead(lead.username);
      setTimeout(() => setCopiedLead(null), 2000);
    }).catch(err => console.error("Could not copy text: ", err));
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-[#0d1117] flex items-center justify-center p-6 relative overflow-hidden transition-colors duration-200">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-purple-600/10 blur-[120px] rounded-full"></div>
        <div className="absolute bottom-[-10%] right-[-5%] w-[40%] h-[40%] bg-blue-600/10 blur-[100px] rounded-full"></div>

        <div className="absolute top-6 right-6 z-20">
          <button 
            onClick={() => setIsDarkMode(!isDarkMode)} 
            className="p-3 text-gray-500 hover:text-purple-500 transition-colors rounded-xl bg-white dark:bg-[#161b22] border border-gray-200 dark:border-[#30363d] shadow-lg" 
            title="Toggle Theme"
          >
            {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>
        </div>

        <div className="w-full max-w-md space-y-8 relative z-10">
          <div className="text-center space-y-6 flex flex-col items-center">
            <img 
              src={LOGO_URL} 
              alt="Shared Success Studios" 
              className="w-56 h-56 md:w-64 md:h-64 rounded-3xl shadow-2xl shadow-purple-500/20 object-contain border border-gray-200 dark:border-[#30363d] bg-white dark:bg-[#161b22]" 
              onError={(e) => {
                e.currentTarget.style.display = 'none';
                const nextEl = e.currentTarget.nextElementSibling;
                if(nextEl) nextEl.classList.remove('hidden');
              }}
            />
            <div className="hidden w-56 h-56 md:w-64 md:h-64 rounded-3xl shadow-2xl shadow-purple-500/20 border border-gray-200 dark:border-[#30363d] bg-white dark:bg-[#161b22] flex flex-col items-center justify-center p-4">
              <Sparkles className="w-12 h-12 text-purple-500 mb-2" />
              <h1 className="text-xl font-bold tracking-tight text-gray-900 dark:text-white text-center leading-tight">
                Shared <span className="text-purple-500">Success</span><br/>
                <span className="text-xs uppercase tracking-[0.2em] text-gray-500 dark:text-gray-400">Studios</span>
              </h1>
              <p className="text-[10px] text-red-500 mt-4 text-center">Image failed to load</p>
            </div>
            
            <p className="text-gray-600 dark:text-gray-400 text-sm font-medium">Sign in to your discovery workstation.</p>
          </div>

          <form onSubmit={handleSignIn} className="bg-white dark:bg-[#161b22] p-8 rounded-3xl border border-gray-200 dark:border-[#30363d] shadow-2xl space-y-6 transition-colors duration-200">
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-widest ml-1">Workspace ID</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input 
                    required
                    type="text" 
                    value={loginForm.username}
                    onChange={(e) => setLoginForm({...loginForm, username: e.target.value})}
                    placeholder="Enter your name..."
                    className="w-full bg-gray-50 dark:bg-[#0d1117] border border-gray-200 dark:border-[#30363d] rounded-xl py-3 pl-10 pr-4 text-sm focus:border-purple-500 focus:outline-none transition-all text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
                  />
                </div>
              </div>

              {/* NEW PAID CLOUD PROJECT SELECTOR FOR AI STUDIO */}
              <div className="space-y-1.5 p-4 border border-purple-200 dark:border-purple-900/50 bg-purple-50 dark:bg-purple-900/10 rounded-xl">
                <label className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-widest flex items-center gap-2">
                  <Cloud className="w-4 h-4 text-purple-500" />
                  Google Cloud Connection
                </label>
                <p className="text-[10px] text-gray-500 dark:text-gray-400 mb-3 leading-relaxed">
                  To avoid free-tier 429 limits, select your paid Google Cloud project. 
                  <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noreferrer" className="text-purple-600 dark:text-purple-400 hover:underline ml-1 font-medium">View Billing Docs</a>
                </p>
                <button
                  type="button"
                  onClick={handleSelectPaidKey}
                  className={`w-full py-2.5 rounded-lg font-bold text-sm transition-all border flex items-center justify-center gap-2 ${isKeySelected ? 'bg-green-100 text-green-700 border-green-300 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50 dark:bg-[#161b22] dark:text-gray-300 dark:border-[#30363d] dark:hover:bg-gray-800'}`}
                >
                  {isKeySelected ? <><CheckCircle2 className="w-4 h-4" /> Paid Project Connected</> : <><Key className="w-4 h-4" /> Select Paid Project</>}
                </button>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-widest ml-1 flex justify-between">
                  Apify API Token (Optional)
                  <span className="text-[10px] lowercase opacity-50 font-normal">Leave blank for AI-only mode</span>
                </label>
                <div className="relative">
                  <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input 
                    type="password" 
                    value={loginForm.apiKey}
                    onChange={(e) => setLoginForm({...loginForm, apiKey: e.target.value})}
                    placeholder="Enter Apify API Token..."
                    className="w-full bg-gray-50 dark:bg-[#0d1117] border border-gray-200 dark:border-[#30363d] rounded-xl py-3 pl-10 pr-4 text-sm focus:border-purple-500 focus:outline-none transition-all text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
                  />
                </div>
              </div>
            </div>

            <button 
              type="submit"
              className="w-full py-4 gradient-button rounded-2xl font-black uppercase tracking-widest text-sm shadow-lg shadow-purple-600/20 text-white"
            >
              Initialize Station
            </button>

            <div className="flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-500/5 rounded-xl border border-blue-200 dark:border-blue-500/10">
              <ShieldAlert className="w-4 h-4 text-blue-500 dark:text-blue-400 shrink-0" />
              <p className="text-[10px] text-blue-700 dark:text-blue-300 leading-tight">
                Data is encrypted and stored locally on this machine. Leads are saved to your profile archive.
              </p>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-gray-50 dark:bg-[#0d1117] transition-colors duration-200">
      <aside className="w-full md:w-80 bg-white dark:bg-[#161b22] border-r border-gray-200 dark:border-[#30363d] p-6 flex flex-col gap-8 z-20 transition-colors duration-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img 
              src={LOGO_URL} 
              alt="Shared Success Studios" 
              className="w-12 h-12 rounded-xl shadow-md object-contain border border-gray-200 dark:border-[#30363d]" 
            />
            <h1 className="text-lg font-bold tracking-tight text-gray-900 dark:text-white leading-tight">
              Shared <span className="text-purple-500">Success</span><br/>
              <span className="text-[10px] uppercase tracking-[0.2em] text-gray-500 dark:text-gray-400">Studios</span>
            </h1>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={() => setIsDarkMode(!isDarkMode)} className="p-2 text-gray-500 hover:text-purple-500 transition-colors rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800" title="Toggle Theme">
              {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
            <button onClick={handleSignOut} className="p-2 text-gray-500 hover:text-red-500 transition-colors rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800" title="Sign Out">
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-4 bg-gray-100 dark:bg-gray-800/50 rounded-2xl border border-gray-200 dark:border-[#30363d] flex items-center gap-3 transition-colors duration-200">
          <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-purple-500 to-blue-500 flex items-center justify-center font-bold text-white uppercase">
            {user.username[0]}
          </div>
          <div className="flex-1 overflow-hidden">
            <div className="text-sm font-bold truncate text-gray-900 dark:text-white">{user.username}</div>
            <div className="flex items-center gap-1.5">
              <div className={`w-1.5 h-1.5 rounded-full ${user.isLiteMode ? 'bg-blue-400' : 'bg-green-400'}`} />
              <span className="text-[10px] text-gray-500 uppercase tracking-tighter">
                {user.isLiteMode ? 'Lite Mode' : 'Hybrid Engine'}
              </span>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="space-y-4 relative z-30">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Target Niche</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500 pointer-events-none" />
                <select 
                  value={nicheCategory}
                  onChange={(e) => setNicheCategory(e.target.value)}
                  className="w-full bg-gray-50 dark:bg-[#0d1117] border border-gray-200 dark:border-[#30363d] rounded-lg py-2.5 pl-10 pr-10 text-sm focus:border-purple-500 focus:outline-none transition-colors appearance-none cursor-pointer text-gray-900 dark:text-white"
                >
                  <option value="" disabled>Select a target niche...</option>
                  <option value="Custom">✨ Custom Keyword...</option>
                  <optgroup label="Trending Niches">
                    {AVAILABLE_NICHES.map(n => (
                      <option key={n} value={n}>{n}</option>
                    ))}
                  </optgroup>
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500 pointer-events-none" />
              </div>
            </div>

            {nicheCategory === 'Custom' && (
              <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-200">
                <input 
                  type="text" 
                  value={customNiche}
                  onChange={(e) => setCustomNiche(e.target.value)}
                  placeholder="e.g., 'Vanlife Content Creators'"
                  className="w-full bg-gray-50 dark:bg-[#0d1117] border border-purple-500/50 rounded-lg py-2.5 px-4 text-sm focus:border-purple-500 focus:outline-none transition-all shadow-[0_0_15px_rgba(168,85,247,0.15)] text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
                  autoFocus
                />
              </div>
            )}
          </div>

          <div className="space-y-2 relative z-10">
            <div className="flex justify-between items-center">
              <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Audit Batch Size</label>
              <span className="text-xs font-mono text-purple-500 dark:text-purple-400">{leadCount}</span>
            </div>
            <input 
              type="range" min="5" max="25" step="5"
              value={leadCount}
              onChange={(e) => setLeadCount(parseInt(e.target.value))}
              className="w-full accent-purple-600 bg-gray-300 dark:bg-gray-700 h-1 rounded-lg appearance-none cursor-pointer"
            />
          </div>

          <div className="p-4 rounded-xl bg-gray-50 dark:bg-[#0d1117] border border-gray-200 dark:border-[#30363d] space-y-3 relative z-10 transition-colors duration-200">
            <h3 className="text-xs font-bold text-gray-700 dark:text-gray-300 flex items-center justify-between">
              <span className="flex items-center gap-2 uppercase tracking-widest text-[10px]">
                <History className="w-3.5 h-3.5 text-blue-500 dark:text-blue-400" />
                Discovery Archive
              </span>
              <button onClick={resetMemory} className="text-gray-500 dark:text-gray-600 hover:text-red-500 dark:hover:text-red-400 transition-colors" title="Reset Data"><RotateCcw className="w-3 h-3" /></button>
            </h3>
            <div className="flex justify-between text-[11px] mb-2">
              <span className="text-gray-500">Total Discovery Count</span>
              <span className="text-gray-900 dark:text-white font-mono">{history.length}</span>
            </div>
            <button 
              onClick={() => exportToCSV(history, `full_archive_${user.username}`)}
              disabled={history.length === 0}
              className="w-full py-2 bg-blue-100 dark:bg-blue-600/10 hover:bg-blue-200 dark:hover:bg-blue-600/20 text-blue-600 dark:text-blue-400 text-[10px] font-black uppercase tracking-[0.1em] rounded-lg border border-blue-200 dark:border-blue-600/20 transition-all flex items-center justify-center gap-2 disabled:opacity-30"
            >
              <Download className="w-3 h-3" /> Download Archive
            </button>
          </div>

          <button 
            onClick={handleSearch}
            disabled={isSearching || !targetNiche}
            className="w-full gradient-button py-3 rounded-lg font-bold flex items-center justify-center gap-2 disabled:opacity-50 relative z-10 text-white"
          >
            {isSearching ? <Loader2 className="w-5 h-5 animate-spin" /> : <Zap className="w-5 h-5" />}
            {isSearching ? "ENGINE ACTIVE..." : `RUN HYBRID EXTRACTION`}
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-8 z-10 relative transition-colors duration-200">
        <div className="max-w-5xl mx-auto space-y-8">
          
          {isSearching && (
            <div className="p-8 bg-white dark:bg-[#161b22] border border-gray-200 dark:border-[#30363d] rounded-3xl shadow-lg flex flex-col items-center justify-center text-center space-y-6">
              <div className="relative">
                <div className="w-16 h-16 border-4 border-purple-100 dark:border-purple-900 rounded-full"></div>
                <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin absolute top-0 left-0"></div>
                <Zap className="w-6 h-6 text-purple-500 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse" />
              </div>
              <div className="space-y-2 w-full max-w-md">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Active Discovery Sequence</h2>
                <p className="text-sm font-medium text-purple-600 dark:text-purple-400">{searchStatus}</p>
                <div className="w-full bg-gray-100 dark:bg-gray-800 h-3 rounded-full overflow-hidden border border-gray-200 dark:border-gray-700">
                  <div className="h-full bg-gradient-to-r from-purple-500 to-blue-500 transition-all duration-500 ease-out" style={{ width: `${progress}%` }}></div>
                </div>
              </div>
            </div>
          )}

          {!isSearching && searchStatus && leads.length === 0 && (
             <div className="p-6 bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-200 dark:border-yellow-900/30 rounded-2xl text-center">
               <ShieldAlert className="w-8 h-8 text-yellow-500 mx-auto mb-3" />
               <h3 className="text-lg font-bold text-yellow-800 dark:text-yellow-400 mb-1">Discovery Yielded No Results</h3>
               <p className="text-sm text-yellow-700 dark:text-yellow-300 max-w-lg mx-auto">{searchStatus}</p>
             </div>
          )}

          {!isSearching && leads.length > 0 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-[#161b22] p-4 rounded-2xl border border-gray-200 dark:border-[#30363d] shadow-sm">
                <div>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <Users className="w-5 h-5 text-purple-500" />
                    Discovery Results
                    <span className="bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 text-xs py-1 px-2.5 rounded-full font-bold ml-2">
                      {leads.length} Leads
                    </span>
                  </h2>
                </div>
                <button 
                  onClick={() => exportToCSV(leads, `leads_${targetNiche}`)}
                  className="px-4 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs font-bold uppercase tracking-wider rounded-lg border border-gray-200 dark:border-gray-700 transition-colors flex items-center gap-2"
                >
                  <FileSpreadsheet className="w-4 h-4" /> Export Batch to CSV
                </button>
              </div>

              {groundingSources.length > 0 && (
                <div className="p-4 bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-900/30 rounded-2xl">
                  <h3 className="text-xs font-bold text-blue-800 dark:text-blue-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <LinkIcon className="w-4 h-4" /> Validated Sources (AI Mode)
                  </h3>
                  <div className="grid gap-2 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                    {groundingSources.map((source, idx) => (
                      <a key={idx} href={source} target="_blank" rel="noreferrer" className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 bg-white dark:bg-[#161b22] border border-blue-100 dark:border-blue-900/50 p-2 rounded-lg truncate transition-colors">
                        {source}
                      </a>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid gap-6">
                {leads.map((lead, index) => (
                  <div key={lead.username} className="bg-white dark:bg-[#161b22] border border-gray-200 dark:border-[#30363d] p-6 rounded-3xl shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
                    {lead.isAiGenerated && (
                      <div className="absolute top-0 right-0 bg-blue-500 text-white text-[10px] font-bold uppercase tracking-widest py-1 px-3 rounded-bl-xl shadow-sm flex items-center gap-1">
                        <Sparkles className="w-3 h-3" /> AI Discovery
                      </div>
                    )}
                    
                    <div className="flex flex-col md:flex-row gap-6">
                      <div className="flex-1 space-y-4">
                        <div className="flex items-start gap-4">
                          <div className="relative">
                            {lead.profilePic ? (
                              <img src={lead.profilePic} alt={lead.username} className="w-16 h-16 rounded-2xl border-2 border-gray-100 dark:border-gray-800 object-cover" />
                            ) : (
                              <div className="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center border-2 border-gray-200 dark:border-gray-700">
                                <User className="w-8 h-8 text-gray-400" />
                              </div>
                            )}
                            <div className="absolute -bottom-2 -right-2 bg-white dark:bg-[#161b22] rounded-full p-1 border border-gray-200 dark:border-gray-700">
                              <div className="w-5 h-5 bg-gradient-to-tr from-[#f09433] via-[#dc2743] to-[#bc1888] rounded-full flex items-center justify-center text-white">
                                <InstagramIcon />
                              </div>
                            </div>
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white truncate pr-16">{lead.fullName || lead.handle}</h3>
                            <a href={lead.externalUrl || `https://instagram.com/${lead.username}`} target="_blank" rel="noreferrer" className="text-sm text-purple-500 hover:text-purple-600 dark:hover:text-purple-400 font-medium flex items-center gap-1 w-max">
                              {lead.handle} <ArrowRight className="w-3 h-3 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                            </a>
                            {lead.bio && (
                              <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 line-clamp-2 leading-relaxed">
                                {lead.bio}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                          <MetricCard icon={<Users className="w-4 h-4 text-blue-500" />} label="Followers" value={lead.followers.toLocaleString()} />
                          <MetricCard icon={<Activity className="w-4 h-4 text-green-500" />} label="Activity" value={lead.dailyWeeklySplit} />
                          <MetricCard icon={<TrendingUp className="w-4 h-4 text-orange-500" />} label="Top Format" value={lead.topFormat} />
                          <MetricCard icon={<Mail className="w-4 h-4 text-purple-500" />} label="Contact" value={lead.email} truncate />
                        </div>
                      </div>

                      <div className="w-full md:w-80 flex flex-col gap-4 border-t md:border-t-0 md:border-l border-gray-100 dark:border-gray-800 pt-4 md:pt-0 md:pl-6">
                        <div className="bg-green-50 dark:bg-green-900/10 rounded-2xl p-4 border border-green-100 dark:border-green-900/20 text-center relative overflow-hidden">
                          <div className="absolute top-0 right-0 w-16 h-16 bg-green-500/10 rounded-full blur-xl -translate-y-1/2 translate-x-1/2"></div>
                          <p className="text-xs font-bold text-green-700 dark:text-green-400 uppercase tracking-widest mb-1">Est. Revenue Gap</p>
                          <p className="text-3xl font-black text-green-600 dark:text-green-500 flex items-center justify-center gap-1">
                            <DollarSign className="w-6 h-6 -mr-1" />{lead.estRevenueGap.toLocaleString()}
                          </p>
                          <p className="text-[10px] text-green-600/70 dark:text-green-400/70 mt-1 uppercase tracking-wider">Annual Missed Potential</p>
                        </div>

                        <div className="flex-1 flex flex-col gap-2">
                          <button 
                            onClick={() => handleGenerateAI(lead)}
                            disabled={aiLoading === lead.username}
                            className="w-full flex-1 min-h-[44px] bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white text-xs font-bold uppercase tracking-widest rounded-xl transition-all shadow-lg shadow-purple-500/20 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {aiLoading === lead.username ? <Loader2 className="w-4 h-4 animate-spin" /> : <MessageSquareText className="w-4 h-4" />}
                            Generate AI Pitch
                          </button>
                          
                          <button 
                            onClick={() => setSelectedLead(selectedLead?.username === lead.username ? null : lead)}
                            className="w-full py-2.5 bg-gray-50 dark:bg-[#0d1117] hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 text-xs font-bold uppercase tracking-widest rounded-xl border border-gray-200 dark:border-gray-700 transition-colors flex items-center justify-center gap-2"
                          >
                            <Eye className="w-4 h-4" /> View Strategy Audit
                          </button>
                          
                          <button 
                            onClick={() => copyLeadData(lead)}
                            className="w-full py-2.5 bg-gray-50 dark:bg-[#0d1117] hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 text-xs font-bold uppercase tracking-widest rounded-xl border border-gray-200 dark:border-gray-700 transition-colors flex items-center justify-center gap-2"
                          >
                            {copiedLead === lead.username ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                            {copiedLead === lead.username ? 'Copied!' : 'Copy Lead Info'}
                          </button>
                        </div>
                      </div>
                    </div>

                    {selectedLead?.username === lead.username && lead.suggestedProduct && (
                      <div className="mt-6 pt-6 border-t border-gray-100 dark:border-gray-800 grid md:grid-cols-2 gap-6 animate-in slide-in-from-top-4 fade-in duration-300">
                        <div className="space-y-4">
                          <h4 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                            <Zap className="w-4 h-4 text-purple-500" />
                            Monetization Blueprint
                          </h4>
                          <div className="bg-purple-50 dark:bg-purple-900/10 rounded-2xl p-5 border border-purple-100 dark:border-purple-900/20">
                            <div className="inline-block bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded mb-3">
                              {lead.suggestedProduct.type}
                            </div>
                            <h5 className="font-bold text-gray-900 dark:text-white mb-2">{lead.suggestedProduct.name}</h5>
                            <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">{lead.suggestedProduct.description}</p>
                          </div>
                        </div>

                        {lead.competitors && lead.competitors.length > 0 && (
                          <div className="space-y-4">
                            <h4 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                              <Target className="w-4 h-4 text-red-500" />
                              Competitor Validation
                            </h4>
                            <div className="space-y-3">
                              {lead.competitors.map((comp, idx) => (
                                <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-[#0d1117] rounded-xl border border-gray-100 dark:border-gray-800">
                                  <div className="flex items-center gap-2">
                                    <div className="w-6 h-6 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-[10px] font-bold text-gray-500">
                                      {comp.username[0].toUpperCase()}
                                    </div>
                                    <span className="text-sm font-medium text-gray-900 dark:text-white">@{comp.username}</span>
                                  </div>
                                  <span className="text-xs bg-white dark:bg-[#161b22] px-2 py-1 rounded border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400">
                                    {comp.monetizationMethod}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {aiMessage?.username === lead.username && (
                      <div className="mt-6 pt-6 border-t border-gray-100 dark:border-gray-800 animate-in slide-in-from-top-4 fade-in duration-300">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                            <Sparkles className="w-4 h-4 text-blue-500" />
                            AI Outreach Draft
                          </h4>
                          <button 
                            onClick={() => {
                              navigator.clipboard.writeText(aiMessage.text);
                              setCopiedLead(`${lead.username}-msg`);
                              setTimeout(() => setCopiedLead(null), 2000);
                            }}
                            className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:text-blue-700 flex items-center gap-1"
                          >
                            {copiedLead === `${lead.username}-msg` ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
                            {copiedLead === `${lead.username}-msg` ? 'Copied' : 'Copy'}
                          </button>
                        </div>
                        <div className="bg-gray-50 dark:bg-[#0d1117] p-5 rounded-2xl border border-gray-200 dark:border-gray-800 text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed font-medium">
                          {aiMessage.text}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

// --- Helper Components ---
const MetricCard = ({ icon, label, value, truncate }: { icon: React.ReactNode, label: string, value: string, truncate?: boolean }) => (
  <div className="bg-gray-50 dark:bg-[#0d1117] p-3 rounded-xl border border-gray-100 dark:border-gray-800">
    <div className="flex items-center gap-1.5 mb-1.5 text-gray-500 dark:text-gray-400">
      {icon}
      <span className="text-[10px] font-bold uppercase tracking-wider">{label}</span>
    </div>
    <div className={`text-sm font-bold text-gray-900 dark:text-white ${truncate ? 'truncate' : ''}`} title={value}>
      {value}
    </div>
  </div>
);

const InstagramIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3">
    <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
  </svg>
);

const Target = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <circle cx="12" cy="12" r="10"></circle>
    <circle cx="12" cy="12" r="6"></circle>
    <circle cx="12" cy="12" r="2"></circle>
  </svg>
);

export default App;