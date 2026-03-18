import React, { useState } from 'react';
import { 
  LayoutDashboard, 
  School as SchoolIcon, 
  PlusCircle, 
  BarChart3, 
  Layers, 
  CreditCard, 
  Settings, 
  History, 
  LogOut, 
  Search, 
  Bell, 
  User, 
  MoreVertical, 
  TrendingUp, 
  TrendingDown,
  ChevronRight,
  Globe,
  Zap,
  Moon,
  Sun,
  Activity,
  Server,
  Cpu,
  Database,
  AlertTriangle
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  LineChart,
  Line,
  Brush
} from 'recharts';
import { motion, AnimatePresence } from 'motion/react';
import { School, Stat } from './types';

// Mock Data
const enrollmentData = [
  { month: 'Jan', students: 45000 },
  { month: 'Feb', students: 52000 },
  { month: 'Mar', students: 48000 },
  { month: 'Apr', students: 61000 },
  { month: 'May', students: 68000 },
  { month: 'Jun', students: 75000 },
  { month: 'Jul', students: 82000 },
  { month: 'Aug', students: 88000 },
  { month: 'Sep', students: 95000 },
  { month: 'Oct', students: 102000 },
  { month: 'Nov', students: 110000 },
  { month: 'Dec', students: 125000 },
];

const revenueData = [
  { month: 'Jan', revenue: 120000 },
  { month: 'Feb', revenue: 150000 },
  { month: 'Mar', revenue: 140000 },
  { month: 'Apr', revenue: 190000 },
  { month: 'May', revenue: 210000 },
  { month: 'Jun', revenue: 250000 },
  { month: 'Jul', revenue: 280000 },
  { month: 'Aug', revenue: 310000 },
  { month: 'Sep', revenue: 340000 },
  { month: 'Oct', revenue: 380000 },
  { month: 'Nov', revenue: 420000 },
  { month: 'Dec', revenue: 500000 },
];

const systemHealthData = [
  { time: '00:00', cpu: 45, mem: 62, load: 1.2 },
  { time: '04:00', cpu: 32, mem: 58, load: 0.8 },
  { time: '08:00', cpu: 68, mem: 75, load: 2.4 },
  { time: '12:00', cpu: 85, mem: 82, load: 3.1 },
  { time: '16:00', cpu: 72, mem: 78, load: 2.1 },
  { time: '20:00', cpu: 55, mem: 68, load: 1.5 },
  { time: '23:59', cpu: 48, mem: 64, load: 1.3 },
];

const STAGES = [
  "Static Website - Stage 1",
  "Website Customization Admin Panel + Static Website - Stage 2",
  "Includes All Stage 2 + Student Dashboard - Stage 3",
  "Includes All Stage 3 + Tools in Admin Panel - Stage 4",
  "Includes All Stage 4 + Custom Tools - Stage 5",
  "Includes All Stage 4 + Complete School Manegement ERP Software - Stage 6"
];

interface CustomTooltipProps {
  active?: boolean;
  payload?: any[];
  label?: string;
  prefix?: string;
}

const CustomTooltip = ({ active, payload, label, prefix = '' }: CustomTooltipProps) => {
  if (active && payload && payload.length) {
    return (
      <div className="glass-panel p-4 border-blue-500/30 shadow-blue-500/20">
        <p className="text-xs font-bold text-blue-400 mb-1 uppercase tracking-wider">{label}</p>
        <p className="text-lg font-bold text-white">
          {prefix}{payload[0].value.toLocaleString()}
        </p>
        <div className="flex items-center gap-1 text-[10px] text-emerald-400 mt-1">
          <TrendingUp className="w-3 h-3" />
          <span>+12.5% from last month</span>
        </div>
      </div>
    );
  }
  return null;
};

const INITIAL_SCHOOLS: School[] = [
  { id: 'SCH-001', name: 'Global Academy', subdomain: 'global.snrworld.com', stage: STAGES[5], students: 1250, status: 'Active' },
  { id: 'SCH-002', name: 'St. Mary\'s High', subdomain: 'stmarys.snrworld.com', stage: STAGES[3], students: 850, status: 'Active' },
  { id: 'SCH-003', name: 'Little Hearts Pre-school', subdomain: 'littlehearts.snrworld.com', stage: STAGES[0], students: 320, status: 'Pending' },
  { id: 'SCH-004', name: 'Zenith International', subdomain: 'zenith.snrworld.com', stage: STAGES[4], students: 980, status: 'Active' },
  { id: 'SCH-005', name: 'Oxford Public School', subdomain: 'oxford.snrworld.com', stage: STAGES[2], students: 1500, status: 'Inactive' },
];

const stats: Stat[] = [
  { label: 'Total Schools', value: '482', change: '+12%', trend: 'up', icon: 'SchoolIcon' },
  { label: 'Active Schools', value: '456', change: '+8%', trend: 'up', icon: 'Zap' },
  { label: 'Total Students', value: '184.2k', change: '+24%', trend: 'up', icon: 'User' },
  { label: 'Monthly Revenue', value: '$2.4M', change: '+15%', trend: 'up', icon: 'CreditCard' },
];

export default function App() {
  const [activeTab, setActiveTab] = useState('Dashboard');
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'info' } | null>(null);
  const [schools, setSchools] = useState<School[]>(INITIAL_SCHOOLS);
  
  const showToast = (message: string, type: 'success' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };
  
  // Customization State
  const [config, setConfig] = useState({
    name: 'SNR World',
    accentColor: '#3b82f6',
    logo: 'Globe',
    theme: 'Dark'
  });

  const renderLogo = () => {
    switch(config.logo) {
      case 'Zap': return <Zap className="text-white w-6 h-6" />;
      case 'School': return <SchoolIcon className="text-white w-6 h-6" />;
      case 'Layers': return <Layers className="text-white w-6 h-6" />;
      default: return <Globe className="text-white w-6 h-6" />;
    }
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'Dashboard': return <DashboardView showToast={showToast} />;
      case 'Schools': return <SchoolsView schools={schools} setSchools={setSchools} showToast={showToast} />;
      case 'Add School': return <AddSchoolView showToast={showToast} />;
      case 'Analytics Hub': return <AnalyticsView />;
      case 'Stage Management': return <StageView showToast={showToast} />;
      case 'Subscriptions': return <SubscriptionView showToast={showToast} />;
      case 'Appearance': return <AppearanceView config={config} setConfig={setConfig} showToast={showToast} />;
      case 'System Settings': return <SettingsView showToast={showToast} />;
      case 'System Health': return <SystemHealthView showToast={showToast} />;
      case 'Logs': return <LogsView />;
      default: return <DashboardView showToast={showToast} />;
    }
  };

  return (
    <div 
      className={`flex h-screen w-full overflow-hidden transition-colors duration-500 ${config.theme === 'Dark' ? 'bg-[#030303] text-slate-200' : 'bg-slate-50 text-slate-900'}`} 
      style={{ '--brand-accent': config.accentColor } as React.CSSProperties}
    >
      {/* Sidebar */}
      <aside className="w-72 glass-panel m-4 flex flex-col border-r-0">
        <div className="p-8 flex items-center gap-3">
          <div 
            className="w-10 h-10 rounded-xl flex items-center justify-center glow-blue transition-all duration-500 bg-brand-accent"
          >
            {renderLogo()}
          </div>
          <h1 className="text-2xl font-bold tracking-tighter text-white">{config.name}</h1>
        </div>

        <nav className="flex-1 px-4 space-y-1 overflow-y-auto custom-scrollbar">
          {[
            { name: 'Dashboard', icon: LayoutDashboard },
            { name: 'Schools', icon: SchoolIcon },
            { name: 'Add School', icon: PlusCircle },
            { name: 'Analytics Hub', icon: BarChart3 },
            { name: 'Stage Management', icon: Layers },
            { name: 'Subscriptions', icon: CreditCard },
            { name: 'Appearance', icon: Zap },
            { name: 'System Settings', icon: Settings },
            { name: 'System Health', icon: Activity },
            { name: 'Logs', icon: History },
          ].map((item) => (
            <button
              key={item.name}
              onClick={() => setActiveTab(item.name)}
              className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-all duration-200 group ${
                activeTab === item.name 
                ? 'bg-white/10 text-white border border-white/10 active-nav-item' 
                : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
              }`}
              style={activeTab === item.name ? { 
                boxShadow: `0 0 15px ${config.accentColor}26`, 
                borderColor: `${config.accentColor}4d` 
              } : {}}
              title={`Navigate to ${item.name}`}
            >
              <item.icon 
                className={`w-5 h-5 transition-colors ${activeTab === item.name ? 'text-brand-accent' : 'group-hover:text-blue-300'}`} 
              />
              <span className="font-medium text-sm">{item.name}</span>
              {activeTab === item.name && (
                  <motion.div 
                    layoutId="active" 
                    className="ml-auto w-1.5 h-1.5 rounded-full bg-brand-accent" 
                  />
              )}
            </button>
          ))}
        </nav>

        <div className="p-4 mt-auto">
          <button 
            className="w-full flex items-center gap-4 px-4 py-3 rounded-xl text-red-400 hover:bg-red-400/10 transition-all"
            title="Logout from the system"
          >
            <LogOut className="w-5 h-5" />
            <span className="font-medium">Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden relative">
        {/* Top Navigation */}
        <header className="h-20 glass-panel mt-4 mr-4 flex items-center justify-between px-8 border-l-0 border-t-0 border-r-0 rounded-none rounded-tr-2xl">
          <div className="flex-1 max-w-xl">
            <div className="relative group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 group-focus-within:text-blue-400 transition-colors" />
              <input 
                type="text" 
                placeholder="Search schools, subdomains, or analytics..." 
                className="w-full bg-white/5 border border-white/10 rounded-full py-2.5 pl-12 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                title="Search platform for schools, subdomains, or analytics"
              />
            </div>
          </div>

          <div className="flex items-center gap-6">
            <button className="relative p-2 rounded-full hover:bg-white/5 transition-all" title="Notifications">
              <Bell className="w-6 h-6 text-slate-400" />
              <span className="absolute top-2 right-2 w-2 h-2 bg-blue-500 rounded-full border-2 border-[#030303]" />
            </button>
            <div className="flex items-center gap-3 pl-6 border-l border-white/10">
              <div className="text-right">
                <p className="text-sm font-semibold text-white">Nilesh Shah</p>
                <p className="text-xs text-slate-500">Super Admin</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 p-0.5">
                <div className="w-full h-full rounded-full bg-[#030303] flex items-center justify-center overflow-hidden">
                  <img src="https://picsum.photos/seed/admin/100/100" alt="Admin" className="w-full h-full object-cover" />
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Dashboard Content */}
        <div className="flex-1 overflow-y-auto p-8 pr-12 space-y-8 custom-scrollbar">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              {renderContent()}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-8 right-8 z-50"
          >
            <div className={`px-6 py-3 rounded-xl shadow-2xl backdrop-blur-xl border flex items-center gap-3 ${
              toast.type === 'success' ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400' : 'bg-blue-500/20 border-blue-500/30 text-blue-400'
            }`}>
              <Zap className="w-5 h-5" />
              <span className="font-bold text-sm">{toast.message}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// --- Views ---

const DashboardView = ({ showToast }: { showToast: (message: string, type?: 'success' | 'info') => void }) => (
  <div className="space-y-8">
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {stats.map((stat, i) => (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.1 }}
          key={stat.label} 
          className="glass-card p-6 group cursor-pointer"
          onClick={() => showToast(`Viewing details for ${stat.label}`, 'info')}
          title={`View details for ${stat.label}`}
        >
          <div className="flex justify-between items-start mb-4">
            <div className={`p-3 rounded-xl bg-white/5 group-hover:bg-blue-500/10 transition-colors`}>
              {stat.icon === 'SchoolIcon' && <SchoolIcon className="w-6 h-6 text-blue-400" />}
              {stat.icon === 'Zap' && <Zap className="w-6 h-6 text-yellow-400" />}
              {stat.icon === 'User' && <User className="w-6 h-6 text-purple-400" />}
              {stat.icon === 'CreditCard' && <CreditCard className="w-6 h-6 text-emerald-400" />}
            </div>
            <div className={`flex items-center gap-1 text-xs font-medium ${stat.trend === 'up' ? 'text-emerald-400' : 'text-red-400'}`}>
              {stat.trend === 'up' ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              {stat.change}
            </div>
          </div>
          <h3 className="text-slate-400 text-sm font-medium">{stat.label}</h3>
          <p className="text-3xl font-bold text-white mt-1">{stat.value}</p>
        </motion.div>
      ))}
    </div>

    <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
      <div className="xl:col-span-3">
        <AnalyticsView compact />
      </div>
      <div className="xl:col-span-1">
        <QuickActionsPanel />
      </div>
    </div>
  </div>
);

const AnalyticsView = ({ compact = false }: { compact?: boolean }) => (
  <div className={`grid grid-cols-1 ${compact ? 'gap-6' : 'lg:grid-cols-2 gap-8'}`}>
    <motion.div className="glass-panel p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-xl font-bold text-white">Student Enrollment</h2>
          <p className="text-sm text-slate-500">Platform-wide growth over 7 months</p>
        </div>
      </div>
      <div className="h-[300px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={enrollmentData} syncId="analytics">
            <defs>
              <linearGradient id="colorStudents" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
            <XAxis dataKey="month" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
            <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${value/1000}k`} />
            <Tooltip content={<CustomTooltip />} />
            <Area type="monotone" dataKey="students" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorStudents)" activeDot={{ r: 6, stroke: '#030303', strokeWidth: 2, fill: '#3b82f6' }} />
            {!compact && <Brush dataKey="month" height={30} stroke="#3b82f6" fill="#030303" travellerWidth={10} />}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </motion.div>

    <motion.div className="glass-panel p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-xl font-bold text-white">Fee Collection</h2>
          <p className="text-sm text-slate-500">Monthly revenue trends</p>
        </div>
      </div>
      <div className="h-[300px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={revenueData} syncId="analytics">
            <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
            <XAxis dataKey="month" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
            <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `$${value/1000}k`} />
            <Tooltip content={<CustomTooltip prefix="$" />} />
            <Line type="monotone" dataKey="revenue" stroke="#8b5cf6" strokeWidth={3} dot={{ r: 4, fill: '#8b5cf6', strokeWidth: 2, stroke: '#030303' }} activeDot={{ r: 6, glow: '0 0 10px #8b5cf6' }} />
            {!compact && <Brush dataKey="month" height={30} stroke="#8b5cf6" fill="#030303" travellerWidth={10} />}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  </div>
);

const SchoolsView = ({ schools, setSchools, showToast }: { schools: School[], setSchools: React.Dispatch<React.SetStateAction<School[]>>, showToast: (message: string, type?: 'success' | 'info') => void }) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<{ id: string, name: string, newStage: string } | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const handleStageChangeRequest = (id: string, name: string, newStage: string) => {
    setConfirming({ id, name, newStage });
    setEditingId(null);
  };

  const confirmStageChange = () => {
    if (!confirming) return;
    setSchools(schools.map(s => s.id === confirming.id ? { ...s, stage: confirming.newStage } : s));
    setConfirming(null);
    showToast('School stage updated successfully!', 'success');
  };

  const filteredSchools = schools.filter(school => 
    school.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="glass-panel p-8 relative">
      <AnimatePresence>
        {confirming && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="glass-panel max-w-md w-full p-8 border-white/20 shadow-2xl"
            >
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 rounded-full bg-amber-500/20 flex items-center justify-center">
                  <AlertTriangle className="w-6 h-6 text-amber-500" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">Confirm Stage Change</h3>
                  <p className="text-sm text-slate-400">Security & Access Modification</p>
                </div>
              </div>
              
              <p className="text-slate-300 mb-8 leading-relaxed">
                Are you sure you want to change the stage for <span className="text-white font-bold">{confirming.name}</span> to <span className="text-blue-400 font-bold">{confirming.newStage}</span>? This will immediately modify their platform access and available features.
              </p>

              <div className="flex gap-3">
                <button 
                  onClick={() => setConfirming(null)}
                  className="flex-1 py-3 bg-white/5 border border-white/10 rounded-xl text-sm font-bold text-slate-300 hover:bg-white/10 transition-all"
                >
                  Cancel
                </button>
                <button 
                  onClick={confirmStageChange}
                  className="flex-1 py-3 bg-blue-600 rounded-xl text-sm font-bold text-white hover:bg-blue-500 transition-all shadow-lg shadow-blue-600/20"
                >
                  Confirm Change
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <h2 className="text-xl font-bold text-white">School Management</h2>
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input 
              type="text" 
              placeholder="Search schools..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder:text-slate-500 outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all w-full sm:w-64"
            />
          </div>
          <div className="flex gap-2">
            <button 
              onClick={() => showToast('Filters applied', 'info')}
              className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-sm hover:bg-white/10 transition-all text-slate-300"
              title="Filter school records"
            >
              Filter
            </button>
            <button 
              onClick={() => showToast('Exporting school data...', 'info')}
              className="px-4 py-2 bg-blue-600 rounded-lg text-sm font-medium hover:bg-blue-500 transition-all shadow-lg shadow-blue-600/20 text-white"
              title="Export school data as CSV"
            >
              Export CSV
            </button>
          </div>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-white/10 text-slate-500 text-sm">
              <th className="pb-4 font-medium">School ID</th>
              <th className="pb-4 font-medium">School Name</th>
              <th className="pb-4 font-medium">Subdomain</th>
              <th className="pb-4 font-medium">Stage</th>
              <th className="pb-4 font-medium">Students</th>
              <th className="pb-4 font-medium">Status</th>
              <th className="pb-4 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {filteredSchools.map((school) => (
              <tr key={school.id} className="group hover:bg-white/5 transition-all">
                <td className="py-4 text-sm font-mono text-blue-400">{school.id}</td>
                <td className="py-4 text-sm font-semibold text-white">{school.name}</td>
                <td className="py-4 text-sm text-slate-400 font-mono">{school.subdomain}</td>
                <td className="py-4">
                  {editingId === school.id ? (
                    <select 
                      className="bg-[#030303] border border-white/20 rounded px-2 py-1 text-xs text-white outline-none focus:ring-1 focus:ring-blue-500"
                      value={school.stage}
                      onChange={(e) => handleStageChangeRequest(school.id, school.name, e.target.value)}
                      onBlur={() => setEditingId(null)}
                      autoFocus
                      title="Select School Stage"
                    >
                      {STAGES.map(stage => (
                        <option key={stage} value={stage}>{stage}</option>
                      ))}
                    </select>
                  ) : (
                    <button 
                      onClick={() => setEditingId(school.id)}
                      className="px-2.5 py-1 rounded-full bg-purple-500/10 text-purple-400 text-[10px] font-medium border border-purple-500/20 hover:bg-purple-500/20 transition-all text-left max-w-[150px] truncate"
                      title={school.stage}
                    >
                      {school.stage}
                    </button>
                  )}
                </td>
                <td className="py-4 text-sm text-slate-300">{school.students.toLocaleString()}</td>
                <td className="py-4">
                  <div className="flex items-center gap-2">
                    <div className={`w-1.5 h-1.5 rounded-full ${
                      school.status === 'Active' ? 'bg-emerald-400' : 
                      school.status === 'Pending' ? 'bg-amber-400' : 'bg-red-400'
                    }`} />
                    <span className="text-sm text-slate-300">{school.status}</span>
                  </div>
                </td>
                <td className="py-4 text-right">
                  <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={() => setEditingId(school.id)}
                      className="p-2 hover:bg-white/10 rounded-lg transition-all text-slate-400 hover:text-white"
                      title="Edit Stage"
                    >
                      <Settings className="w-4 h-4" />
                    </button>
                    <button 
                      className="p-2 hover:bg-white/10 rounded-lg transition-all text-slate-400 hover:text-white"
                      title="View School Details"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const AddSchoolView = ({ showToast }: { showToast: (message: string, type?: 'success' | 'info') => void }) => (
  <div className="max-w-2xl mx-auto glass-panel p-8">
    <h2 className="text-2xl font-bold text-white mb-6">Register New School</h2>
    <form className="space-y-6" onSubmit={(e) => {
      e.preventDefault();
      showToast('School instance provisioned successfully!', 'success');
    }}>
      <div className="grid grid-cols-2 gap-6">
        <div className="space-y-2">
          <label className="text-sm text-slate-400">School Name</label>
          <input type="text" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:ring-2 focus:ring-blue-500 outline-none" placeholder="e.g. Harvard Academy" />
        </div>
        <div className="space-y-2">
          <label className="text-sm text-slate-400">Subdomain</label>
          <div className="flex items-center bg-white/5 border border-white/10 rounded-xl px-4 py-2.5">
            <input 
              type="text" 
              className="bg-transparent text-white outline-none flex-1" 
              placeholder="harvard" 
              title="Enter school subdomain"
            />
            <span className="text-slate-500">.snrworld.com</span>
          </div>
        </div>
      </div>
      <div className="space-y-2">
        <label className="text-sm text-slate-400">Educational Stage</label>
        <select className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white outline-none" title="Educational Stage">
          {STAGES.map(stage => (
            <option key={stage}>{stage}</option>
          ))}
        </select>
      </div>
      <div className="space-y-2">
        <label className="text-sm text-slate-400">Admin Email</label>
        <input 
          type="email" 
          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:ring-2 focus:ring-blue-500 outline-none" 
          placeholder="admin@school.com" 
          title="Enter admin email address"
        />
      </div>
      <button 
        className="w-full py-3 bg-blue-600 rounded-xl font-bold text-white hover:bg-blue-500 transition-all shadow-lg shadow-blue-600/20"
        title="Provision the new school instance"
      >
        Provision School Instance
      </button>
    </form>
  </div>
);

const AppearanceView = ({ config, setConfig, showToast }: { config: any, setConfig: React.Dispatch<React.SetStateAction<any>>, showToast: (message: string, type?: 'success' | 'info') => void }) => (
  <div className="max-w-4xl mx-auto space-y-8">
    <div className="glass-panel p-8">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-white">Platform Appearance</h2>
        <button 
          onClick={() => showToast('Appearance settings saved!', 'success')}
          className="px-4 py-2 bg-blue-600 rounded-lg text-sm font-medium hover:bg-blue-500 transition-all"
        >
          Save Changes
        </button>
      </div>
      <div className="space-y-8">
        <div className="grid grid-cols-2 gap-8">
          <div className="space-y-4">
            <label className="text-sm font-medium text-slate-400">Dashboard Name</label>
            <input 
              type="text" 
              value={config.name}
              onChange={(e) => setConfig({ ...config, name: e.target.value })}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-blue-500 outline-none" 
              placeholder="Enter Dashboard Name"
              title="Dashboard Name Input"
            />
          </div>
          <div className="space-y-4">
            <label className="text-sm font-medium text-slate-400">Accent Color</label>
            <div className="flex gap-4">
              {['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444'].map((color) => (
                <button 
                  key={color}
                  onClick={() => setConfig({ ...config, accentColor: color })}
                  className={`w-10 h-10 rounded-full border-2 transition-all ${config.accentColor === color ? 'border-white scale-110' : 'border-transparent'}`}
                  style={{ backgroundColor: color }}
                  title={`Select ${color} as accent color`}
                />
              ))}
              <input 
                type="color" 
                value={config.accentColor}
                onChange={(e) => setConfig({ ...config, accentColor: e.target.value })}
                className="w-10 h-10 rounded-full bg-transparent border-none outline-none cursor-pointer"
                title="Choose Accent Color"
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-8">
          <div className="space-y-4">
            <label className="text-sm font-medium text-slate-400">Platform Theme</label>
            <div className="flex gap-4">
              {['Dark', 'Light'].map((theme) => (
                <button 
                  key={theme}
                  onClick={() => setConfig({ ...config, theme })}
                  className={`flex-1 flex items-center justify-center gap-3 p-4 rounded-xl border transition-all ${
                    config.theme === theme ? 'bg-white/10 border-white/20 text-white' : 'bg-white/5 border-white/5 text-slate-400 hover:bg-white/10'
                  }`}
                  title={`Switch to ${theme} Mode`}
                >
                  {theme === 'Dark' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
                  <span className="font-medium">{theme} Mode</span>
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-4">
            <label className="text-sm font-medium text-slate-400">Platform Logo</label>
            <div className="grid grid-cols-4 gap-2">
              {['Globe', 'Zap', 'School', 'Layers'].map((iconName) => (
                <button 
                  key={iconName}
                  onClick={() => setConfig({ ...config, logo: iconName })}
                  className={`p-3 rounded-xl border transition-all flex items-center justify-center ${
                    config.logo === iconName ? 'bg-white/10 border-white/20' : 'bg-white/5 border-white/5 hover:bg-white/10'
                  }`}
                  title={`Select ${iconName} as platform logo`}
                >
                  {iconName === 'Globe' && <Globe className="w-5 h-5 text-blue-400" />}
                  {iconName === 'Zap' && <Zap className="w-5 h-5 text-yellow-400" />}
                  {iconName === 'School' && <SchoolIcon className="w-5 h-5 text-purple-400" />}
                  {iconName === 'Layers' && <Layers className="w-5 h-5 text-emerald-400" />}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>

    <div className="glass-panel p-8 bg-gradient-to-br from-blue-600/10 to-purple-600/10">
      <h3 className="text-lg font-bold text-white mb-2">Live Preview</h3>
      <p className="text-sm text-slate-400 mb-6">This is how your branding will appear to other administrators.</p>
      <div className="p-6 rounded-2xl bg-[#030303] border border-white/10 flex items-center gap-4">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-brand-accent">
          {config.logo === 'Globe' && <Globe className="w-6 h-6 text-white" />}
          {config.logo === 'Zap' && <Zap className="w-6 h-6 text-white" />}
          {config.logo === 'School' && <SchoolIcon className="w-6 h-6 text-white" />}
          {config.logo === 'Layers' && <Layers className="w-6 h-6 text-white" />}
        </div>
        <span className="text-xl font-bold text-white">{config.name}</span>
      </div>
    </div>
  </div>
);

const QuickActionsPanel = () => (
  <div className="space-y-6">
    <div className="glass-panel p-6">
      <h2 className="text-lg font-bold text-white mb-6">Quick Actions</h2>
      <div className="space-y-3">
        <button className="w-full flex items-center justify-between p-4 glass-card group">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400 group-hover:bg-blue-500 group-hover:text-white transition-all">
              <PlusCircle className="w-5 h-5" />
            </div>
            <span className="text-sm font-medium">Add New School</span>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-600" />
        </button>
        <button className="w-full flex items-center justify-between p-4 glass-card group">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400 group-hover:bg-purple-500 group-hover:text-white transition-all">
              <Zap className="w-5 h-5" />
            </div>
            <span className="text-sm font-medium">Generate School ID</span>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-600" />
        </button>
      </div>
    </div>

    <div className="glass-panel p-6 bg-gradient-to-br from-blue-600/20 to-purple-600/20 border-blue-500/20">
      <h3 className="text-white font-bold mb-2">System Health</h3>
      <div className="flex items-center gap-2 mb-4">
        <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
        <span className="text-xs text-emerald-400 font-medium uppercase tracking-wider">All Systems Operational</span>
      </div>
      <div className="space-y-3">
        <div className="flex justify-between text-xs">
          <span className="text-slate-400">Server Load</span>
          <span className="text-white">24%</span>
        </div>
        <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
          <div className="w-[24%] h-full bg-purple-500" />
        </div>
      </div>
    </div>
  </div>
);

const StageView = ({ showToast }: { showToast: (message: string, type?: 'success' | 'info') => void }) => (
  <div className="space-y-8">
    <div className="glass-panel p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-xl font-bold text-white">Educational Stage Configuration</h2>
          <p className="text-sm text-slate-500">Define curriculum, grading, and assessment rules for each level.</p>
        </div>
        <button 
          onClick={() => showToast('Stage creation wizard opened', 'info')}
          className="px-4 py-2 bg-blue-600 rounded-lg text-sm font-medium hover:bg-blue-500 transition-all"
        >
          Add New Stage
        </button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {STAGES.map((stage, i) => (
          <div 
            key={stage} 
            className="glass-card p-6 group cursor-pointer border border-white/5 hover:border-blue-500/30 transition-all"
            onClick={() => showToast(`Configuring ${stage}`, 'info')}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400 font-bold">
                  {i + 1}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white leading-tight">{stage}</h3>
                  <p className="text-[10px] text-slate-500 uppercase tracking-wider mt-1">Status: Active</p>
                </div>
              </div>
              <button className="p-2 hover:bg-white/10 rounded-lg opacity-0 group-hover:opacity-100 transition-all" title="Configure Stage">
                <Settings className="w-4 h-4 text-slate-400" />
              </button>
            </div>
            <div className="space-y-3">
              <p className="text-[11px] text-slate-400 leading-relaxed">
                {i === 0 ? "Basic online presence with essential school information." : 
                 i === 1 ? "Full control over website content via a dedicated admin panel." :
                 i === 2 ? "Personalized dashboards for students to track progress." :
                 i === 3 ? "Advanced administrative tools for school operations." :
                 i === 4 ? "Custom-built specialized tools for unique requirements." :
                 "The ultimate ERP solution for complete school management."}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

const SubscriptionView = ({ showToast }: { showToast: (message: string, type?: 'success' | 'info') => void }) => (
  <div className="glass-panel p-8">
    <h2 className="text-xl font-bold text-white mb-6">Platform Subscriptions</h2>
    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
      {[
        { name: 'Basic', price: '$499', features: ['Up to 10 Schools', 'Basic Analytics', 'Standard Support'] },
        { name: 'Professional', price: '$1,299', features: ['Up to 50 Schools', 'Advanced Analytics', 'Priority Support'], active: true },
        { name: 'Enterprise', price: 'Custom', features: ['Unlimited Schools', 'Full API Access', 'Dedicated Account Manager'] },
      ].map((plan) => (
        <div key={plan.name} className={`glass-card p-8 flex flex-col ${plan.active ? 'border-blue-500/50 ring-1 ring-blue-500/50' : ''}`}>
          <h3 className="text-xl font-bold text-white mb-2">{plan.name}</h3>
          <p className="text-3xl font-bold text-white mb-6">{plan.price}<span className="text-sm text-slate-500">/mo</span></p>
          <ul className="space-y-4 mb-8 flex-1">
            {plan.features.map(f => (
              <li key={f} className="text-sm text-slate-400 flex items-center gap-2">
                <Zap className="w-4 h-4 text-blue-400" /> {f}
              </li>
            ))}
          </ul>
          <button 
            onClick={() => showToast(`Switched to ${plan.name} plan`, 'info')}
            className={`w-full py-2.5 rounded-xl font-bold transition-all ${plan.active ? 'bg-blue-600 text-white' : 'bg-white/5 text-slate-300 hover:bg-white/10'}`}
            title={`Choose ${plan.name} Plan`}
          >
            {plan.active ? 'Current Plan' : 'Upgrade'}
          </button>
        </div>
      ))}
    </div>
  </div>
);

const SettingsView = ({ showToast }: { showToast: (message: string, type?: 'success' | 'info') => void }) => (
  <div className="max-w-4xl mx-auto space-y-8">
    <div className="glass-panel p-8">
      <h2 className="text-xl font-bold text-white mb-8">System Settings</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
        <div className="space-y-8">
          <div>
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">General Configuration</h3>
            <div className="space-y-4">
              {[
                { label: 'Maintenance Mode', desc: 'Disable all school subdomains', active: false },
                { label: 'Automatic Backups', desc: 'Daily database snapshots', active: true },
                { label: 'Email Notifications', desc: 'System alerts to super admins', active: true },
              ].map((item, i) => (
                <div 
                  key={i} 
                  className="flex items-center justify-between p-4 glass-card cursor-pointer"
                  onClick={() => showToast(`${item.label} toggled`, 'info')}
                  title={`Toggle ${item.label}`}
                >
                  <div>
                    <p className="text-sm font-bold text-white">{item.label}</p>
                    <p className="text-xs text-slate-500">{item.desc}</p>
                  </div>
                  <div className={`w-12 h-6 rounded-full relative transition-colors ${item.active ? 'bg-blue-600' : 'bg-white/10'}`}>
                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${item.active ? 'right-1' : 'left-1'}`} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-8">
          <div>
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">Security & Access</h3>
            <div className="space-y-4">
              <div className="p-4 glass-card space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-bold text-white">Two-Factor Auth</p>
                  <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 text-[10px] font-bold uppercase">Enabled</span>
                </div>
                <button className="w-full py-2 bg-white/5 border border-white/10 rounded-lg text-xs font-bold hover:bg-white/10 transition-all">Manage 2FA Settings</button>
              </div>
              <div className="p-4 glass-card space-y-4">
                <p className="text-sm font-bold text-white">IP Whitelisting</p>
                <p className="text-xs text-slate-500">Restrict admin access to specific IP ranges.</p>
                <div className="flex gap-2">
                  <input type="text" className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white outline-none" placeholder="192.168.1.1" title="Enter IP address to whitelist" />
                  <button className="px-3 py-1.5 bg-blue-600 rounded-lg text-xs font-bold" title="Add IP address to whitelist">Add</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
);

const LogsView = () => (
  <div className="glass-panel p-8">
    <h2 className="text-xl font-bold text-white mb-6">System Logs</h2>
    <div className="space-y-4">
      {[
        { time: '2 mins ago', user: 'Nilesh Shah', action: 'Provisioned SCH-006', status: 'Success' },
        { time: '15 mins ago', user: 'System', action: 'Automated Backup', status: 'Success' },
        { time: '1 hour ago', user: 'Admin User', action: 'Modified Subdomain SCH-002', status: 'Warning' },
        { time: '3 hours ago', user: 'Nilesh Shah', action: 'Updated Subscription Plan', status: 'Success' },
      ].map((log, i) => (
        <div key={i} className="flex items-center justify-between p-4 glass-card text-sm">
          <div className="flex items-center gap-4">
            <span className="text-slate-500 font-mono text-xs">{log.time}</span>
            <span className="text-blue-400 font-bold">{log.user}</span>
            <span className="text-slate-200">{log.action}</span>
          </div>
          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${log.status === 'Success' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'}`}>
            {log.status}
          </span>
        </div>
      ))}
    </div>
  </div>
);

const SystemHealthView = ({ showToast }: { showToast: (message: string, type?: 'success' | 'info') => void }) => (
  <div className="space-y-8">
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {[
        { label: 'CPU Usage', value: '42%', icon: Cpu, color: 'text-blue-400', bg: 'bg-blue-400/10' },
        { label: 'Memory Usage', value: '68%', icon: Database, color: 'text-purple-400', bg: 'bg-purple-400/10' },
        { label: 'Server Load', value: '1.24', icon: Server, color: 'text-emerald-400', bg: 'bg-emerald-400/10' },
      ].map((item, i) => (
        <div key={i} className="glass-panel p-6 flex items-center gap-4">
          <div className={`p-3 rounded-xl ${item.bg}`}>
            <item.icon className={`w-6 h-6 ${item.color}`} />
          </div>
          <div>
            <p className="text-xs text-slate-500 uppercase font-bold tracking-wider">{item.label}</p>
            <p className="text-2xl font-bold text-white">{item.value}</p>
          </div>
        </div>
      ))}
    </div>

    <div className="glass-panel p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-xl font-bold text-white">Resource Performance</h2>
          <p className="text-sm text-slate-500">Real-time monitoring of system resources across all clusters.</p>
        </div>
        <button 
          onClick={() => showToast('Refreshing system metrics...', 'info')}
          className="p-2 hover:bg-white/5 rounded-lg transition-all"
          title="Refresh Metrics"
        >
          <Activity className="w-5 h-5 text-blue-400" />
        </button>
      </div>
      
      <div className="h-[400px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={systemHealthData}>
            <defs>
              <linearGradient id="colorCpu" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="colorMem" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
            <XAxis 
              dataKey="time" 
              stroke="#64748b" 
              fontSize={12} 
              tickLine={false} 
              axisLine={false}
              dy={10}
            />
            <YAxis 
              stroke="#64748b" 
              fontSize={12} 
              tickLine={false} 
              axisLine={false}
              tickFormatter={(value) => `${value}%`}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area 
              type="monotone" 
              dataKey="cpu" 
              stroke="#3b82f6" 
              strokeWidth={3}
              fillOpacity={1} 
              fill="url(#colorCpu)" 
              name="CPU Usage"
            />
            <Area 
              type="monotone" 
              dataKey="mem" 
              stroke="#8b5cf6" 
              strokeWidth={3}
              fillOpacity={1} 
              fill="url(#colorMem)" 
              name="Memory Usage"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className="glass-panel p-6">
        <h3 className="text-lg font-bold text-white mb-4">Active Clusters</h3>
        <div className="space-y-4">
          {[
            { name: 'US-East-1 (Primary)', status: 'Healthy', latency: '24ms' },
            { name: 'EU-West-1 (Secondary)', status: 'Healthy', latency: '86ms' },
            { name: 'AS-South-1 (Edge)', status: 'Healthy', latency: '42ms' },
          ].map((cluster, i) => (
            <div key={i} className="flex items-center justify-between p-4 glass-card">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-sm font-medium text-white">{cluster.name}</span>
              </div>
              <div className="text-right">
                <p className="text-xs font-bold text-emerald-400 uppercase">{cluster.status}</p>
                <p className="text-[10px] text-slate-500">{cluster.latency}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
      
      <div className="glass-panel p-6">
        <h3 className="text-lg font-bold text-white mb-4">Database Health</h3>
        <div className="space-y-4">
          <div className="p-4 glass-card">
            <div className="flex justify-between mb-2">
              <span className="text-sm text-slate-400">Storage Capacity</span>
              <span className="text-sm font-bold text-white">72%</span>
            </div>
            <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
              <div className="h-full bg-blue-500 w-[72%]" />
            </div>
          </div>
          <div className="p-4 glass-card">
            <div className="flex justify-between mb-2">
              <span className="text-sm text-slate-400">Query Performance</span>
              <span className="text-sm font-bold text-white">99.9%</span>
            </div>
            <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
              <div className="h-full bg-emerald-500 w-[99.9%]" />
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
);
