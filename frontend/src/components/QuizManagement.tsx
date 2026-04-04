import { useState } from 'react';
import { FileText, Download, Filter, Search, MoreVertical, Eye, Edit2, Trash2, FileJson, FileSpreadsheet, File } from 'lucide-react';

interface Quiz {
  id: string;
  title: string;
  role: string;
  bloomLevel: number;
  questions: number;
  completions: number;
  avgScore: number;
  createdDate: string;
  status: 'Active' | 'Draft' | 'Archived';
}

const sampleQuizzes: Quiz[] = [
  {
    id: '1',
    title: 'Access Control Fundamentals Assessment',
    role: 'Developer',
    bloomLevel: 3,
    questions: 15,
    completions: 127,
    avgScore: 84,
    createdDate: '2026-03-15',
    status: 'Active'
  },
  {
    id: '2',
    title: 'Incident Response Case Study',
    role: 'Security Lead',
    bloomLevel: 5,
    questions: 8,
    completions: 64,
    avgScore: 78,
    createdDate: '2026-03-20',
    status: 'Active'
  },
  {
    id: '3',
    title: 'Risk Assessment Framework Quiz',
    role: 'Compliance Officer',
    bloomLevel: 6,
    questions: 12,
    completions: 42,
    avgScore: 91,
    createdDate: '2026-03-25',
    status: 'Active'
  },
  {
    id: '4',
    title: 'Data Encryption Best Practices',
    role: 'Developer',
    bloomLevel: 4,
    questions: 10,
    completions: 95,
    avgScore: 87,
    createdDate: '2026-03-10',
    status: 'Active'
  },
  {
    id: '5',
    title: 'Security Awareness Training - Draft',
    role: 'All Roles',
    bloomLevel: 2,
    questions: 20,
    completions: 0,
    avgScore: 0,
    createdDate: '2026-03-28',
    status: 'Draft'
  },
];

export function QuizManagement() {
  const [quizzes, setQuizzes] = useState<Quiz[]>(sampleQuizzes);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState<string>('All');
  const [filterStatus, setFilterStatus] = useState<string>('All');
  const [selectedQuizzes, setSelectedQuizzes] = useState<Set<string>>(new Set());
  const [showExportMenu, setShowExportMenu] = useState<string | null>(null);

  const roles = ['All', 'Developer', 'Security Lead', 'Team Lead', 'Compliance Officer', 'All Roles'];
  const statuses = ['All', 'Active', 'Draft', 'Archived'];

  const filteredQuizzes = quizzes.filter(quiz => {
    const matchesSearch = quiz.title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = filterRole === 'All' || quiz.role === filterRole;
    const matchesStatus = filterStatus === 'All' || quiz.status === filterStatus;
    return matchesSearch && matchesRole && matchesStatus;
  });

  const handleExport = (quizId: string, format: 'json' | 'csv' | 'pdf') => {
    const quiz = quizzes.find(q => q.id === quizId);
    if (!quiz) return;

    // Simulate export
    const data = {
      quiz: quiz,
      exportedAt: new Date().toISOString(),
      format: format
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${quiz.title.replace(/\s+/g, '_')}_export.${format}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    setShowExportMenu(null);
  };

  const handleBulkExport = (format: 'json' | 'csv' | 'pdf') => {
    const selectedQuizData = quizzes.filter(q => selectedQuizzes.has(q.id));
    
    const data = {
      quizzes: selectedQuizData,
      exportedAt: new Date().toISOString(),
      format: format,
      count: selectedQuizData.length
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bulk_quiz_export_${selectedQuizzes.size}_items.${format}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    setSelectedQuizzes(new Set());
  };

  const toggleQuizSelection = (quizId: string) => {
    const newSelection = new Set(selectedQuizzes);
    if (newSelection.has(quizId)) {
      newSelection.delete(quizId);
    } else {
      newSelection.add(quizId);
    }
    setSelectedQuizzes(newSelection);
  };

  const toggleSelectAll = () => {
    if (selectedQuizzes.size === filteredQuizzes.length) {
      setSelectedQuizzes(new Set());
    } else {
      setSelectedQuizzes(new Set(filteredQuizzes.map(q => q.id)));
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Active':
        return 'bg-green-100 text-green-700 border-green-200';
      case 'Draft':
        return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'Archived':
        return 'bg-gray-100 text-gray-700 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200">
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <FileText className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Quiz Management</h3>
              <p className="text-sm text-gray-600">Manage and export quiz assessments</p>
            </div>
          </div>

          {selectedQuizzes.size > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">
                {selectedQuizzes.size} selected
              </span>
              <div className="relative">
                <button
                  onClick={() => setShowExportMenu('bulk')}
                  className="flex items-center gap-2 px-4 py-2 bg-[#1e3a5f] text-white rounded-lg text-sm font-medium hover:bg-[#152d4a] transition-colors"
                >
                  <Download className="w-4 h-4" />
                  Export Selected
                </button>

                {showExportMenu === 'bulk' && (
                  <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-10">
                    <button
                      onClick={() => handleBulkExport('json')}
                      className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    >
                      <FileJson className="w-4 h-4 text-blue-600" />
                      Export as JSON
                    </button>
                    <button
                      onClick={() => handleBulkExport('csv')}
                      className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    >
                      <FileSpreadsheet className="w-4 h-4 text-green-600" />
                      Export as CSV
                    </button>
                    <button
                      onClick={() => handleBulkExport('pdf')}
                      className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    >
                      <File className="w-4 h-4 text-red-600" />
                      Export as PDF
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Filters */}
        <div className="flex gap-4">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search quizzes..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Role Filter */}
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <select
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
              className="pl-10 pr-8 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-blue-500 appearance-none bg-white"
            >
              {roles.map(role => (
                <option key={role} value={role}>{role}</option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-blue-500 appearance-none bg-white"
          >
            {statuses.map(status => (
              <option key={status} value={status}>{status}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Quiz Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-3 text-left">
                <input
                  type="checkbox"
                  checked={selectedQuizzes.size === filteredQuizzes.length && filteredQuizzes.length > 0}
                  onChange={toggleSelectAll}
                  className="w-4 h-4 rounded border-gray-300"
                />
              </th>
              <th className="text-left text-xs font-medium text-gray-600 px-6 py-3">Quiz Title</th>
              <th className="text-left text-xs font-medium text-gray-600 px-6 py-3">Role</th>
              <th className="text-left text-xs font-medium text-gray-600 px-6 py-3">Bloom Level</th>
              <th className="text-left text-xs font-medium text-gray-600 px-6 py-3">Questions</th>
              <th className="text-left text-xs font-medium text-gray-600 px-6 py-3">Completions</th>
              <th className="text-left text-xs font-medium text-gray-600 px-6 py-3">Avg Score</th>
              <th className="text-left text-xs font-medium text-gray-600 px-6 py-3">Status</th>
              <th className="text-left text-xs font-medium text-gray-600 px-6 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {filteredQuizzes.map((quiz) => (
              <tr key={quiz.id} className="hover:bg-gray-50">
                <td className="px-6 py-4">
                  <input
                    type="checkbox"
                    checked={selectedQuizzes.has(quiz.id)}
                    onChange={() => toggleQuizSelection(quiz.id)}
                    className="w-4 h-4 rounded border-gray-300"
                  />
                </td>
                <td className="px-6 py-4">
                  <p className="text-sm font-medium text-gray-900">{quiz.title}</p>
                  <p className="text-xs text-gray-500">{quiz.createdDate}</p>
                </td>
                <td className="px-6 py-4">
                  <span className="text-sm text-gray-600">{quiz.role}</span>
                </td>
                <td className="px-6 py-4">
                  <span className="inline-flex items-center px-2 py-1 bg-purple-50 text-purple-700 text-xs font-medium rounded border border-purple-200">
                    Level {quiz.bloomLevel}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span className="text-sm text-gray-600">{quiz.questions}</span>
                </td>
                <td className="px-6 py-4">
                  <span className="text-sm text-gray-600">{quiz.completions}</span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-medium ${
                      quiz.avgScore >= 80 ? 'text-green-600' :
                      quiz.avgScore >= 60 ? 'text-yellow-600' :
                      'text-red-600'
                    }`}>
                      {quiz.avgScore > 0 ? `${quiz.avgScore}%` : 'N/A'}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium border ${getStatusColor(quiz.status)}`}>
                    {quiz.status}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <button className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors">
                      <Eye className="w-4 h-4" />
                    </button>
                    <button className="p-1.5 text-gray-600 hover:bg-gray-50 rounded transition-colors">
                      <Edit2 className="w-4 h-4" />
                    </button>
                    
                    <div className="relative">
                      <button
                        onClick={() => setShowExportMenu(showExportMenu === quiz.id ? null : quiz.id)}
                        className="p-1.5 text-green-600 hover:bg-green-50 rounded transition-colors"
                      >
                        <Download className="w-4 h-4" />
                      </button>

                      {showExportMenu === quiz.id && (
                        <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-10">
                          <button
                            onClick={() => handleExport(quiz.id, 'json')}
                            className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                          >
                            <FileJson className="w-4 h-4 text-blue-600" />
                            Export as JSON
                          </button>
                          <button
                            onClick={() => handleExport(quiz.id, 'csv')}
                            className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                          >
                            <FileSpreadsheet className="w-4 h-4 text-green-600" />
                            Export as CSV
                          </button>
                          <button
                            onClick={() => handleExport(quiz.id, 'pdf')}
                            className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                          >
                            <File className="w-4 h-4 text-red-600" />
                            Export as PDF
                          </button>
                        </div>
                      )}
                    </div>

                    <button className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filteredQuizzes.length === 0 && (
        <div className="text-center py-12">
          <FileText className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-sm text-gray-600">No quizzes found matching your filters.</p>
        </div>
      )}

      {/* Footer */}
      <div className="p-4 border-t border-gray-200 bg-gray-50">
        <p className="text-xs text-gray-600 text-center">
          Showing {filteredQuizzes.length} of {quizzes.length} quizzes
        </p>
      </div>
    </div>
  );
}
