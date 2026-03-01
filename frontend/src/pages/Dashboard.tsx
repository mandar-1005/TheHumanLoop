import { useState } from 'react';
import { 
  LayoutDashboard, 
  BookOpen, 
  FileText, 
  Users, 
  BarChart3, 
  Settings, 
  Search, 
  Bell, 
  Plus,
  TrendingUp,
  TrendingDown,
  MoreVertical,
  Shield,
  AlertTriangle,
  CheckCircle,
  Clock,
  Download
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard', href: '/dashboard', active: true },
  { icon: BookOpen, label: 'Training Modules', href: '/training-modules', active: false },
  { icon: FileText, label: 'SSP Documents', href: '/ssp-documents', active: false },
  { icon: Users, label: 'Roles & Assessments', href: '/roles', active: false },
  { icon: BarChart3, label: 'Analytics', href: '/analytics', active: false },
  { icon: Settings, label: 'Settings', href: '/settings', active: false },
];

const metricsData = [
  {
    title: 'Active Training Modules',
    value: '24',
    change: '+12%',
    trending: 'up',
    subtitle: 'vs last month'
  },
  {
    title: 'Employees Enrolled',
    value: '342',
    change: '+8%',
    trending: 'up',
    subtitle: 'across all roles'
  },
  {
    title: 'Completion Rate',
    value: '87%',
    change: '+5%',
    trending: 'up',
    subtitle: 'target: 90%'
  },
  {
    title: 'At-Risk Roles',
    value: '3',
    change: '-2',
    trending: 'down',
    subtitle: 'needs attention'
  },
];

const trainingModules = [
  {
    id: 1,
    name: 'Access Control Fundamentals',
    role: 'Developer',
    status: 'Published',
    completion: 92,
    lastUpdated: '2 days ago'
  },
  {
    id: 2,
    name: 'Incident Response Protocol',
    role: 'Security Lead',
    status: 'Published',
    completion: 78,
    lastUpdated: '1 week ago'
  },
  {
    id: 3,
    name: 'Audit & Accountability Training',
    role: 'Team Lead',
    status: 'In Review',
    completion: 45,
    lastUpdated: '3 days ago'
  },
  {
    id: 4,
    name: 'Data Encryption Best Practices',
    role: 'Developer',
    status: 'Published',
    completion: 88,
    lastUpdated: '5 days ago'
  },
  {
    id: 5,
    name: 'Risk Assessment Framework',
    role: 'Compliance Officer',
    status: 'Draft',
    completion: 0,
    lastUpdated: '1 day ago'
  },
];

const sspDocuments = [
  {
    id: 1,
    name: 'SSP-2026-Q1-v2.3.pdf',
    uploadedBy: 'Sarah Johnson',
    date: 'Feb 25, 2026',
    size: '2.4 MB'
  },
  {
    id: 2,
    name: 'Control-Baseline-Moderate.pdf',
    uploadedBy: 'Michael Chen',
    date: 'Feb 23, 2026',
    size: '1.8 MB'
  },
  {
    id: 3,
    name: 'SSP-Appendix-A-Access.pdf',
    uploadedBy: 'Alex Martinez',
    date: 'Feb 20, 2026',
    size: '890 KB'
  },
];

const recentGenerations = [
  {
    id: 1,
    title: 'Security Awareness Module',
    status: 'Succeeded',
    timestamp: '2 hours ago'
  },
  {
    id: 2,
    title: 'Compliance Overview Training',
    status: 'Needs Review',
    timestamp: '5 hours ago'
  },
  {
    id: 3,
    title: 'Access Control Deep Dive',
    status: 'Succeeded',
    timestamp: '1 day ago'
  },
  {
    id: 4,
    title: 'Incident Response Procedures',
    status: 'Failed',
    timestamp: '2 days ago'
  },
];

const fedRAMPCoverageData = [
  { name: 'Access Control', coverage: 94, total: 100 },
  { name: 'Audit & Accountability', coverage: 87, total: 100 },
  { name: 'Incident Response', coverage: 72, total: 100 },
  { name: 'Risk Assessment', coverage: 91, total: 100 },
  { name: 'System Protection', coverage: 85, total: 100 },
  { name: 'Data Security', coverage: 96, total: 100 },
];

export function Dashboard() {
  const [activeTab, setActiveTab] = useState('Developers');
  const tabs = ['Developers', 'Security Leads', 'Team Leads', 'Other'];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Published':
        return 'bg-green-100 text-green-700 border-green-200';
      case 'In Review':
        return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'Draft':
        return 'bg-gray-100 text-gray-700 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getGenerationStatusColor = (status: string) => {
    switch (status) {
      case 'Succeeded':
        return 'bg-green-100 text-green-700';
      case 'Needs Review':
        return 'bg-yellow-100 text-yellow-700';
      case 'Failed':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getGenerationIcon = (status: string) => {
    switch (status) {
      case 'Succeeded':
        return <CheckCircle className="w-4 h-4" />;
      case 'Needs Review':
        return <AlertTriangle className="w-4 h-4" />;
      case 'Failed':
        return <AlertTriangle className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 h-full w-64 bg-white border-r border-gray-200 z-10">
        <div className="p-6">
          {/* Logo */}
          <div className="flex items-center gap-3 mb-10">
            <div className="w-10 h-10 bg-[#1e3a5f] rounded-lg flex items-center justify-center">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900">Secure Training</h1>
              <p className="text-xs text-gray-500">MARi Platform</p>
            </div>
          </div>

          {/* Navigation */}
          <nav className="space-y-1">
            {navItems.map((item) => (
              <button
                key={item.label}
                onClick={(e) => {
                  if (!item.active) {
                    e.preventDefault();
                    // For demo purposes, show alert for unimplemented routes
                    alert(`${item.label} page coming soon!`);
                  }
                }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  item.active
                    ? 'bg-[#1e3a5f] text-white'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <item.icon className="w-5 h-5" />
                {item.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Bottom section */}
        <div className="absolute bottom-0 left-0 right-0 p-6 border-t border-gray-200">
          <div className="text-xs text-gray-500">
            <p className="mb-1">© 2026 MARi</p>
            <p>FedRAMP Compliant</p>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="ml-64">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
          <div className="px-8 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-semibold text-gray-900">Dashboard</h2>
                <p className="text-sm text-gray-600 mt-1">Welcome back, Alex Chen</p>
              </div>

              <div className="flex items-center gap-4">
                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search trainings..."
                    className="pl-10 pr-4 py-2 w-80 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>

                {/* Notifications */}
                <button className="relative p-2 hover:bg-gray-100 rounded-lg transition-colors">
                  <Bell className="w-5 h-5 text-gray-600" />
                  <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
                </button>

                {/* User */}
                <div className="flex items-center gap-3 pl-4 border-l border-gray-200">
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-900">Alex Chen</p>
                    <p className="text-xs text-gray-600">Compliance Lead</p>
                  </div>
                  <div className="w-10 h-10 bg-[#1e3a5f] rounded-full flex items-center justify-center text-white font-medium">
                    AC
                  </div>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Dashboard Content */}
        <main className="p-8 space-y-8">
          {/* Key Metrics */}
          <div className="grid grid-cols-4 gap-6">
            {metricsData.map((metric, index) => (
              <div key={index} className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-4">
                  <h3 className="text-sm font-medium text-gray-600">{metric.title}</h3>
                  <button className="text-gray-400 hover:text-gray-600">
                    <MoreVertical className="w-4 h-4" />
                  </button>
                </div>
                <div className="space-y-2">
                  <p className="text-3xl font-bold text-gray-900">{metric.value}</p>
                  <div className="flex items-center gap-2">
                    <span className={`flex items-center gap-1 text-sm font-medium ${
                      metric.trending === 'up' ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {metric.trending === 'up' ? (
                        <TrendingUp className="w-4 h-4" />
                      ) : (
                        <TrendingDown className="w-4 h-4" />
                      )}
                      {metric.change}
                    </span>
                    <span className="text-sm text-gray-500">{metric.subtitle}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Training Modules by Role */}
          <div className="bg-white rounded-xl border border-gray-200">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Training Modules by Role</h3>
                <button className="flex items-center gap-2 px-4 py-2 bg-[#1e3a5f] text-white rounded-lg text-sm font-medium hover:bg-[#152d4a] transition-colors">
                  <Plus className="w-4 h-4" />
                  Create New Training Module
                </button>
              </div>

              {/* Tabs */}
              <div className="flex gap-2">
                {tabs.map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      activeTab === tab
                        ? 'bg-[#1e3a5f] text-white'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left text-xs font-medium text-gray-600 px-6 py-3">Module Name</th>
                    <th className="text-left text-xs font-medium text-gray-600 px-6 py-3">Role</th>
                    <th className="text-left text-xs font-medium text-gray-600 px-6 py-3">Status</th>
                    <th className="text-left text-xs font-medium text-gray-600 px-6 py-3">Completion</th>
                    <th className="text-left text-xs font-medium text-gray-600 px-6 py-3">Last Updated</th>
                    <th className="text-left text-xs font-medium text-gray-600 px-6 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {trainingModules.map((module) => (
                    <tr key={module.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <p className="text-sm font-medium text-gray-900">{module.name}</p>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-gray-600">{module.role}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium border ${getStatusColor(module.status)}`}>
                          {module.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-[#1e3a5f] rounded-full"
                              style={{ width: `${module.completion}%` }}
                            />
                          </div>
                          <span className="text-sm text-gray-600">{module.completion}%</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-gray-600">{module.lastUpdated}</span>
                      </td>
                      <td className="px-6 py-4">
                        <button className="text-gray-400 hover:text-gray-600">
                          <MoreVertical className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* SSP Documents & Recent Generations */}
          <div className="grid grid-cols-2 gap-6">
            {/* Recent SSP Documents */}
            <div className="bg-white rounded-xl border border-gray-200">
              <div className="p-6 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">Recent SSP Documents</h3>
              </div>
              <div className="p-6 space-y-4">
                {sspDocuments.map((doc) => (
                  <div key={doc.id} className="flex items-center justify-between p-4 rounded-lg border border-gray-200 hover:border-gray-300 hover:shadow-sm transition-all">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0">
                        <FileText className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{doc.name}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          {doc.uploadedBy} · {doc.date} · {doc.size}
                        </p>
                      </div>
                    </div>
                    <button className="px-3 py-1.5 text-xs font-medium text-[#1e3a5f] border border-[#1e3a5f] rounded-lg hover:bg-[#1e3a5f] hover:text-white transition-colors">
                      Generate Training
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent Generations */}
            <div className="bg-white rounded-xl border border-gray-200">
              <div className="p-6 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">Recent Generations</h3>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  {recentGenerations.map((gen) => (
                    <div key={gen.id} className="flex items-start gap-3 pb-4 border-b border-gray-100 last:border-0 last:pb-0">
                      <div className={`p-2 rounded-lg ${getGenerationStatusColor(gen.status)}`}>
                        {getGenerationIcon(gen.status)}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">{gen.title}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`text-xs font-medium px-2 py-0.5 rounded ${getGenerationStatusColor(gen.status)}`}>
                            {gen.status}
                          </span>
                          <span className="text-xs text-gray-500">{gen.timestamp}</span>
                        </div>
                      </div>
                      <button className="text-gray-400 hover:text-gray-600">
                        <Download className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* FedRAMP Coverage */}
          <div className="bg-white rounded-xl border border-gray-200">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">FedRAMP Coverage by Control Family</h3>
              <p className="text-sm text-gray-600 mt-1">Compliance coverage across control families</p>
            </div>
            <div className="p-6">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={fedRAMPCoverageData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis 
                    dataKey="name" 
                    tick={{ fill: '#6b7280', fontSize: 12 }}
                    angle={-15}
                    textAnchor="end"
                    height={80}
                  />
                  <YAxis 
                    tick={{ fill: '#6b7280', fontSize: 12 }}
                    domain={[0, 100]}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#fff', 
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      fontSize: '12px'
                    }}
                    formatter={(value) => [`${value}%`, 'Coverage']}
                  />
                  <Bar dataKey="coverage" fill="#1e3a5f" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

