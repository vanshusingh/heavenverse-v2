"use client"

import { useState, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { useUser, UserButton } from "@clerk/nextjs"
import {
  LayoutDashboard,
  FileText,
  Users,
  LogOut,
  Shield,
  Activity,
  HardDrive,
  Clock,
  Music,
  Download,
  AlertTriangle,
  CheckCircle2,
  Info,
  XCircle,
  Search,
  RefreshCw,
  ChevronDown,
  Loader2,
  Wifi,
  Globe,
  Zap,
  TrendingUp,
  Server,
  Database,
  Eye,
  MoreVertical,
  Ban,
  UserCheck,
  UserX,
  Mail,
  Calendar,
} from "lucide-react"

type TabId = "overview" | "logs" | "users"

// Mock system log data
interface SystemLog {
  id: string
  timestamp: string
  level: "info" | "warn" | "error" | "success"
  source: string
  message: string
}

// Mock user data
interface AdminUser {
  id: string
  name: string
  email: string
  role: "admin" | "user" | "moderator"
  status: "active" | "inactive" | "banned"
  lastActive: string
  joined: string
  tracksUploaded: number
  avatar: string
}

// Data will be fetched from TiDB Cloud database

const levelConfig = {
  info: { icon: Info, color: "text-blue-400", bg: "bg-blue-500/10", border: "border-blue-500/20", badge: "bg-blue-500/15 text-blue-400" },
  warn: { icon: AlertTriangle, color: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/20", badge: "bg-amber-500/15 text-amber-400" },
  error: { icon: XCircle, color: "text-red-400", bg: "bg-red-500/10", border: "border-red-500/20", badge: "bg-red-500/15 text-red-400" },
  success: { icon: CheckCircle2, color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20", badge: "bg-emerald-500/15 text-emerald-400" },
}

const roleConfig = {
  admin: { color: "bg-red-500/15 text-red-400 border-red-500/20" },
  moderator: { color: "bg-indigo-500/15 text-indigo-400 border-indigo-500/20" },
  user: { color: "bg-white/10 text-white/60 border-white/10" },
}

const statusConfig = {
  active: { color: "text-emerald-400", dot: "bg-emerald-400", label: "Active" },
  inactive: { color: "text-white/40", dot: "bg-white/30", label: "Inactive" },
  banned: { color: "text-red-400", dot: "bg-red-400", label: "Banned" },
}

export default function AdminDashboard() {
  const router = useRouter()
  const [mounted, setMounted] = useState(false)
  const [activeTab, setActiveTab] = useState<TabId>("overview")
  const { user, isLoaded } = useUser()

  // Real database state
  const [dbLogs, setDbLogs] = useState<SystemLog[]>([])
  const [dbUsers, setDbUsers] = useState<AdminUser[]>([])

  // Logs state
  const [logFilter, setLogFilter] = useState<"all" | "info" | "warn" | "error" | "success">("all")
  const [logSearch, setLogSearch] = useState("")

  // Users state
  const [userSearch, setUserSearch] = useState("")
  const [userStatusFilter, setUserStatusFilter] = useState<"all" | "active" | "inactive" | "banned">("all")

  // Uptime counter
  const [uptime, setUptime] = useState(0)

  useEffect(() => {
    // If Clerk is loaded and user is missing, middleware should have blocked it, but just in case:
    if (isLoaded && !user) {
      router.replace("/admin")
      return
    }

    if (isLoaded && user) {
      // Fetch real data from TiDB Cloud
      Promise.all([
        fetch("/api/admin/logs").then(res => res.json()),
        fetch("/api/admin/users").then(res => res.json())
      ]).then(([logsData, usersData]) => {
        if (Array.isArray(logsData)) setDbLogs(logsData as SystemLog[])
        if (Array.isArray(usersData)) setDbUsers(usersData as AdminUser[])
      }).catch(err => console.error("Failed to fetch dashboard data:", err))
      .finally(() => setMounted(true))
    }

    // Uptime ticker
    const uptimeInterval = setInterval(() => {
      setUptime((prev) => prev + 1)
    }, 1000)

    return () => clearInterval(uptimeInterval)
  }, [router, isLoaded, user])

  const formatUptime = (seconds: number) => {
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    const s = seconds % 60
    return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`
  }

  // Filtered logs
  const filteredLogs = useMemo(() => {
    let result = [...dbLogs]
    if (logFilter !== "all") {
      result = result.filter((l) => l.level === logFilter)
    }
    if (logSearch.trim()) {
      const q = logSearch.toLowerCase()
      result = result.filter(
        (l) => l.message.toLowerCase().includes(q) || l.source.toLowerCase().includes(q)
      )
    }
    return result
  }, [logFilter, logSearch])

  // Filtered users
  const filteredUsers = useMemo(() => {
    let result = [...dbUsers]
    if (userStatusFilter !== "all") {
      result = result.filter((u) => u.status === userStatusFilter)
    }
    if (userSearch.trim()) {
      const q = userSearch.toLowerCase()
      result = result.filter(
        (u) => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
      )
    }
    return result
  }, [userStatusFilter, userSearch])

  if (!isLoaded || !mounted) {
    return (
      <div className="min-h-screen bg-slate-950 bg-gradient-to-br from-[#0e1622] via-[#081f2f] to-[#070b12] flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-white/40" />
      </div>
    )
  }

  if (!user) return null

  const navItems = [
    { id: "overview" as TabId, label: "Overview", icon: LayoutDashboard },
    { id: "logs" as TabId, label: "System Logs", icon: FileText },
    { id: "users" as TabId, label: "Users", icon: Users },
  ]

  const statCards = [
    { label: "Total Tracks", value: "156", change: "+12 today", icon: Music, color: "text-red-400", bgGlow: "from-red-500/10 to-red-500/0" },
    { label: "Downloads", value: "89", change: "+5 this hour", icon: Download, color: "text-indigo-400", bgGlow: "from-indigo-500/10 to-indigo-500/0" },
    { label: "Registered Users", value: dbUsers.length.toString(), change: "From TiDB", icon: Users, color: "text-emerald-400", bgGlow: "from-emerald-500/10 to-emerald-500/0" },
    { label: "Total Logs", value: dbLogs.length.toString(), change: "From TiDB", icon: Zap, color: "text-amber-400", bgGlow: "from-amber-500/10 to-amber-500/0" },
  ]

  return (
    <div
      className="min-h-screen max-h-screen bg-slate-950 bg-gradient-to-br from-[#0e1622] via-[#081f2f] to-[#070b12] bg-cover bg-center bg-no-repeat flex relative text-white select-none overflow-hidden font-sans"
      style={{ backgroundImage: "url('/images/bgg1.jpg')" }}
    >
      {/* Background overlay */}
      <div className="absolute inset-0 bg-black/65 backdrop-blur-[2px] pointer-events-none" />

      {/* Sidebar */}
      <aside className="z-10 w-16 lg:w-64 bg-black/30 backdrop-blur-3xl border-r border-white/[0.06] flex flex-col justify-between py-6 shrink-0">
        <div className="flex flex-col gap-8">
          {/* Logo */}
          <div className="flex items-center gap-3 px-4 lg:px-6">
            <div className="w-9 h-9 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center shrink-0">
              <Shield className="w-4.5 h-4.5 text-red-500" />
            </div>
            <div className="hidden lg:flex flex-col">
              <span className="text-[11px] font-black uppercase tracking-[0.2em] text-white/90">
                {user?.firstName || "Admin"}
              </span>
              <span className="text-[9px] text-white/30 font-medium">HeavenVerse V2</span>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex flex-col gap-1 px-2 lg:px-3">
            {navItems.map((item) => {
              const Icon = item.icon
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`flex items-center gap-3.5 px-4 py-3 rounded-xl text-xs font-bold tracking-wider transition-all cursor-pointer ${
                    activeTab === item.id
                      ? "bg-white/10 text-white shadow-sm border-l-2 border-red-500 rounded-l-none"
                      : "text-white/40 hover:text-white/80 hover:bg-white/[0.04]"
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className="hidden lg:block">{item.label}</span>
                </button>
              )
            })}
          </nav>
        </div>

        {/* Sidebar Footer */}
        <div className="px-2 lg:px-3 flex flex-col gap-2">
          {/* Uptime */}
          <div className="hidden lg:flex items-center gap-2 px-4 py-2">
            <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
            <span className="text-[10px] text-white/30 font-mono tabular-nums">
              Uptime {formatUptime(uptime)}
            </span>
          </div>

          {/* Logout */}
          <div className="flex items-center gap-3.5 px-4 py-3 rounded-xl transition-all">
            <UserButton appearance={{ elements: { userButtonAvatarBox: "w-7 h-7" } }} />
            <span className="hidden lg:block text-xs font-semibold text-white/50">My Account</span>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="z-10 flex-1 flex flex-col overflow-y-auto custom-scrollbar p-6 lg:p-8">
        {/* Overview Tab */}
        {activeTab === "overview" && (
          <div className="flex flex-col gap-6 animate-[fadeIn_0.4s_ease-out]">
            {/* Header */}
            <div>
              <h1 className="text-2xl lg:text-3xl font-extrabold tracking-wide">Dashboard</h1>
              <p className="text-white/40 text-xs mt-1">System overview and analytics for HeavenVerse V2.</p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
              {statCards.map((card, i) => {
                const Icon = card.icon
                return (
                  <div
                    key={card.label}
                    className="bg-white/[0.05] backdrop-blur-2xl border border-white/[0.08] rounded-2xl p-5 hover:bg-white/[0.08] transition-all duration-300 hover:translate-y-[-2px] group"
                    style={{ animation: `fadeSlideUp 0.5s ease-out ${i * 0.1}s both` }}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className={`p-2.5 rounded-xl bg-gradient-to-br ${card.bgGlow} border border-white/[0.06]`}>
                        <Icon className={`w-4.5 h-4.5 ${card.color}`} />
                      </div>
                      <TrendingUp className="w-3.5 h-3.5 text-emerald-400/50 group-hover:text-emerald-400 transition-colors" />
                    </div>
                    <div className="text-2xl font-bold text-white tracking-tight font-mono tabular-nums">{card.value}</div>
                    <div className="text-[10px] text-white/35 font-medium mt-0.5">{card.label}</div>
                    <div className="text-[9px] text-emerald-400/70 font-semibold mt-2">{card.change}</div>
                  </div>
                )
              })}
            </div>

            {/* System Status Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Server Status */}
              <div className="bg-white/[0.05] backdrop-blur-2xl border border-white/[0.08] rounded-2xl p-6" style={{ animation: "fadeSlideUp 0.5s ease-out 0.4s both" }}>
                <h3 className="text-sm font-bold text-white/70 uppercase tracking-wider mb-4">System Status</h3>
                <div className="space-y-3">
                  {[
                    { name: "Next.js Dev Server", status: "Running", icon: Server, ok: true },
                    { name: "IndexedDB Storage", status: "Connected", icon: Database, ok: true },
                    { name: "Audio Engine", status: "Ready", icon: Download, ok: true },
                    { name: "FFmpeg Transcoder", status: "Idle", icon: Zap, ok: true },
                    { name: "Open-Meteo Weather", status: "Online", icon: Globe, ok: true },
                    { name: "WebSocket (future)", status: "Not Configured", icon: Wifi, ok: false },
                  ].map((service) => {
                    const Icon = service.icon
                    return (
                      <div key={service.name} className="flex items-center justify-between py-1.5">
                        <div className="flex items-center gap-3">
                          <Icon className="w-3.5 h-3.5 text-white/30" />
                          <span className="text-xs text-white/70 font-medium">{service.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className={`w-1.5 h-1.5 rounded-full ${service.ok ? "bg-emerald-400" : "bg-white/20"}`} />
                          <span className={`text-[10px] font-semibold ${service.ok ? "text-emerald-400/80" : "text-white/30"}`}>
                            {service.status}
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Recent Activity */}
              <div className="bg-white/[0.05] backdrop-blur-2xl border border-white/[0.08] rounded-2xl p-6" style={{ animation: "fadeSlideUp 0.5s ease-out 0.5s both" }}>
                <h3 className="text-sm font-bold text-white/70 uppercase tracking-wider mb-4">Recent Activity</h3>
                <div className="space-y-3">
                  {dbLogs.slice(0, 6).map((log) => {
                    const config = levelConfig[log.level]
                    const LevelIcon = config.icon
                    return (
                      <div key={log.id} className="flex items-start gap-3 py-1">
                        <LevelIcon className={`w-3.5 h-3.5 ${config.color} shrink-0 mt-0.5`} />
                        <div className="flex-1 min-w-0">
                          <p className="text-[11px] text-white/70 font-medium truncate">{log.message}</p>
                          <p className="text-[9px] text-white/25 font-mono mt-0.5">{log.source} • {log.timestamp.split(" ")[1]}</p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Logs Tab */}
        {activeTab === "logs" && (
          <div className="flex flex-col gap-6 animate-[fadeIn_0.4s_ease-out]">
            <div>
              <h1 className="text-2xl lg:text-3xl font-extrabold tracking-wide">System Logs</h1>
              <p className="text-white/40 text-xs mt-1">Real-time application logs, errors, and events.</p>
            </div>

            {/* Filters Bar */}
            <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center bg-white/[0.04] backdrop-blur-2xl border border-white/[0.08] rounded-2xl p-4">
              {/* Search */}
              <div className="flex-1 relative">
                <Search className="absolute left-3.5 top-2.5 w-3.5 h-3.5 text-white/25" />
                <input
                  type="text"
                  value={logSearch}
                  onChange={(e) => setLogSearch(e.target.value)}
                  placeholder="Search logs..."
                  className="w-full bg-black/20 border border-white/[0.06] rounded-xl pl-9.5 pr-4 py-2 text-xs text-white placeholder-white/20 focus:outline-none focus:border-white/15 transition-all"
                />
              </div>

              {/* Level Filters */}
              <div className="flex gap-1.5">
                {(["all", "info", "warn", "error", "success"] as const).map((level) => (
                  <button
                    key={level}
                    onClick={() => setLogFilter(level)}
                    className={`px-3 py-1.5 text-[10px] font-bold rounded-lg uppercase tracking-wider transition-all cursor-pointer ${
                      logFilter === level
                        ? "bg-white/10 text-white shadow-sm border border-white/10"
                        : "text-white/35 hover:text-white/70"
                    }`}
                  >
                    {level}
                  </button>
                ))}
              </div>
            </div>

            {/* Log Entries */}
            <div className="space-y-2">
              {filteredLogs.map((log, i) => {
                const config = levelConfig[log.level]
                const LevelIcon = config.icon
                return (
                  <div
                    key={log.id}
                    className={`flex items-start gap-4 p-4 rounded-xl border transition-all hover:bg-white/[0.03] ${config.bg} ${config.border}`}
                    style={{ animation: `fadeSlideUp 0.3s ease-out ${i * 0.04}s both` }}
                  >
                    <LevelIcon className={`w-4 h-4 ${config.color} shrink-0 mt-0.5`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border ${config.badge} ${config.border}`}>
                          {log.level}
                        </span>
                        <span className="text-[10px] text-white/40 font-semibold">{log.source}</span>
                      </div>
                      <p className="text-xs text-white/80 font-medium leading-relaxed">{log.message}</p>
                    </div>
                    <span className="text-[10px] text-white/25 font-mono tabular-nums shrink-0 hidden sm:block">
                      {log.timestamp.split(" ")[1]}
                    </span>
                  </div>
                )
              })}

              {filteredLogs.length === 0 && (
                <div className="py-16 text-center border border-dashed border-white/10 rounded-2xl">
                  <span className="text-xs text-white/25 italic">No logs matching the current filter</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Users Tab */}
        {activeTab === "users" && (
          <div className="flex flex-col gap-6 animate-[fadeIn_0.4s_ease-out]">
            <div className="flex justify-between items-start">
              <div>
                <h1 className="text-2xl lg:text-3xl font-extrabold tracking-wide">User Management</h1>
                <p className="text-white/40 text-xs mt-1">Manage registered users, roles, and access.</p>
              </div>
              <div className="flex items-center gap-2 bg-white/[0.06] border border-white/[0.08] rounded-xl px-3 py-2">
                <Users className="w-3.5 h-3.5 text-white/40" />
                <span className="text-xs font-bold text-white/70">{dbUsers.length}</span>
                <span className="text-[10px] text-white/30">total</span>
              </div>
            </div>

            {/* Filters Bar */}
            <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center bg-white/[0.04] backdrop-blur-2xl border border-white/[0.08] rounded-2xl p-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3.5 top-2.5 w-3.5 h-3.5 text-white/25" />
                <input
                  type="text"
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  placeholder="Search users..."
                  className="w-full bg-black/20 border border-white/[0.06] rounded-xl pl-9.5 pr-4 py-2 text-xs text-white placeholder-white/20 focus:outline-none focus:border-white/15 transition-all"
                />
              </div>

              <div className="flex gap-1.5">
                {(["all", "active", "inactive", "banned"] as const).map((status) => (
                  <button
                    key={status}
                    onClick={() => setUserStatusFilter(status)}
                    className={`px-3 py-1.5 text-[10px] font-bold rounded-lg uppercase tracking-wider transition-all cursor-pointer ${
                      userStatusFilter === status
                        ? "bg-white/10 text-white shadow-sm border border-white/10"
                        : "text-white/35 hover:text-white/70"
                    }`}
                  >
                    {status}
                  </button>
                ))}
              </div>
            </div>

            {/* Users Table */}
            <div className="bg-white/[0.03] backdrop-blur-xl border border-white/[0.08] rounded-2xl overflow-hidden">
              {/* Table Header */}
              <div className="grid grid-cols-12 gap-4 px-5 py-3 border-b border-white/[0.06] bg-white/[0.02]">
                <div className="col-span-4 text-[10px] font-bold text-white/30 uppercase tracking-wider">User</div>
                <div className="col-span-2 text-[10px] font-bold text-white/30 uppercase tracking-wider hidden md:block">Role</div>
                <div className="col-span-2 text-[10px] font-bold text-white/30 uppercase tracking-wider hidden lg:block">Status</div>
                <div className="col-span-2 text-[10px] font-bold text-white/30 uppercase tracking-wider hidden sm:block">Last Active</div>
                <div className="col-span-2 text-[10px] font-bold text-white/30 uppercase tracking-wider text-right">Tracks</div>
              </div>

              {/* Table Rows */}
              {filteredUsers.map((user, i) => {
                const status = statusConfig[user.status]
                const role = roleConfig[user.role]
                return (
                  <div
                    key={user.id}
                    className="grid grid-cols-12 gap-4 px-5 py-4 border-b border-white/[0.04] hover:bg-white/[0.03] transition-all group"
                    style={{ animation: `fadeSlideUp 0.3s ease-out ${i * 0.05}s both` }}
                  >
                    {/* User Info */}
                    <div className="col-span-4 flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-white/10 to-white/[0.04] border border-white/10 flex items-center justify-center text-xs font-bold text-white/70 shrink-0">
                        {user.avatar}
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="text-xs font-bold text-white truncate group-hover:text-red-400 transition-colors">
                          {user.name}
                        </span>
                        <span className="text-[10px] text-white/30 truncate">{user.email}</span>
                      </div>
                    </div>

                    {/* Role */}
                    <div className="col-span-2 hidden md:flex items-center">
                      <span className={`text-[9px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-lg border ${role.color}`}>
                        {user.role}
                      </span>
                    </div>

                    {/* Status */}
                    <div className="col-span-2 hidden lg:flex items-center gap-2">
                      <div className={`w-1.5 h-1.5 rounded-full ${status.dot} ${user.status === "active" ? "animate-pulse" : ""}`} />
                      <span className={`text-[10px] font-semibold ${status.color}`}>{status.label}</span>
                    </div>

                    {/* Last Active */}
                    <div className="col-span-2 hidden sm:flex items-center">
                      <span className="text-[10px] text-white/40 font-medium">{user.lastActive}</span>
                    </div>

                    {/* Tracks */}
                    <div className="col-span-2 flex items-center justify-end">
                      <span className="text-xs font-bold text-white/60 font-mono tabular-nums">{user.tracksUploaded}</span>
                    </div>
                  </div>
                )
              })}

              {filteredUsers.length === 0 && (
                <div className="py-16 text-center">
                  <span className="text-xs text-white/25 italic">No users matching the current filter</span>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* CSS Keyframes */}
      <style jsx>{`
        @keyframes fadeSlideUp {
          from {
            opacity: 0;
            transform: translateY(12px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
    </div>
  )
}
