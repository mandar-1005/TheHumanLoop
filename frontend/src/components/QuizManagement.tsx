import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../context/AuthContext";
import {
  FileText,
  Download,
  Filter,
  Search,
  MoreVertical,
  Eye,
  Edit2,
  Trash2,
  FileJson,
  FileSpreadsheet,
  File,
} from "lucide-react";

interface Quiz {
  id: string;
  title: string;
  role: string;
  bloomLevel: number;
  questions: number;
  completions: number;
  avgScore: number;
  createdDate: string;
  status: "Published" | "Draft" | "In Review" | "Rejected";
}

type TrainingRow = {
  id: number;
  name?: string | null;
  company_role?: string | null;
  created_at?: string | null;
  status?: string | null;
  training_json?: unknown;
};

type EvidenceRow = {
  training_id: number;
  score: number;
  organization_id?: string | null;
};

type ParsedTrainingContent = {
  assessment?: {
    questions?: Array<{ bloom_level?: string | null }>;
  };
};

const BLOOM_LEVEL_MAP: Record<string, number> = {
  remembering: 1,
  understanding: 2,
  applying: 3,
  analyzing: 4,
  evaluating: 5,
  creating: 6,
};

function formatRoleLabel(value?: string | null): string {
  if (!value) return "Other";
  return value
    .replace(/[_-]/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

function parseTrainingJson(raw: unknown): ParsedTrainingContent[] {
  try {
    let parsed = raw;
    if (typeof raw === "string") {
      const cleaned = raw
        .replace(/^```json\s*/i, "")
        .replace(/```\s*$/, "")
        .trim();
      parsed = JSON.parse(cleaned);
    }
    if (Array.isArray(parsed)) return parsed as ParsedTrainingContent[];
    if (typeof parsed === "object" && parsed !== null)
      return [parsed as ParsedTrainingContent];
  } catch {
    return [];
  }
  return [];
}

function getQuestionCount(trainingJson: unknown): number {
  const contents = parseTrainingJson(trainingJson);
  return contents.reduce(
    (sum, content) => sum + (content.assessment?.questions?.length ?? 0),
    0,
  );
}

function getBloomLevel(trainingJson: unknown): number {
  const contents = parseTrainingJson(trainingJson);
  const levels = contents
    .flatMap((content) => content.assessment?.questions ?? [])
    .map((question) => {
      const key = (question.bloom_level ?? "").toLowerCase();
      return BLOOM_LEVEL_MAP[key];
    })
    .filter((level): level is number => typeof level === "number");

  if (!levels.length) return 0;
  return Math.round(
    levels.reduce((sum, level) => sum + level, 0) / levels.length,
  );
}

function mapTrainingStatus(value?: string | null): Quiz["status"] {
  switch ((value ?? "").toLowerCase()) {
    case "published":
      return "Published";
    case "in_review":
      return "In Review";
    case "rejected":
      return "Rejected";
    case "draft":
    default:
      return "Draft";
  }
}

function mapQuizStatusToTrainingStatus(value: Quiz["status"]): string {
  switch (value) {
    case "Published":
      return "published";
    case "In Review":
      return "in_review";
    case "Rejected":
      return "rejected";
    case "Draft":
    default:
      return "draft";
  }
}

function downloadTextFile(content: string, fileName: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

function escapeCsvCell(value: string | number) {
  const text = String(value ?? "");
  if (/[",\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

function buildQuizCsv(quizzes: Quiz[]) {
  const header = [
    "ID",
    "Title",
    "Role",
    "Bloom Level",
    "Questions",
    "Completions",
    "Average Score",
    "Created Date",
    "Status",
  ];

  const rows = quizzes.map((quiz) => [
    quiz.id,
    quiz.title,
    quiz.role,
    quiz.bloomLevel,
    quiz.questions,
    quiz.completions,
    quiz.avgScore,
    quiz.createdDate,
    quiz.status,
  ]);

  return [header, ...rows]
    .map((row) => row.map((cell) => escapeCsvCell(cell)).join(","))
    .join("\n");
}

function escapeHtml(value: string | number) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function openPrintablePdfDocument(quizzes: Quiz[], title: string) {
  const rows = quizzes
    .map(
      (quiz) => `
        <tr>
          <td>${escapeHtml(quiz.title)}</td>
          <td>${escapeHtml(quiz.role)}</td>
          <td>${escapeHtml(quiz.bloomLevel)}</td>
          <td>${escapeHtml(quiz.questions)}</td>
          <td>${escapeHtml(quiz.completions)}</td>
          <td>${escapeHtml(quiz.avgScore > 0 ? `${quiz.avgScore}%` : "N/A")}</td>
          <td>${escapeHtml(quiz.status)}</td>
          <td>${escapeHtml(quiz.createdDate)}</td>
        </tr>
      `,
    )
    .join("");

  const printableHtml = `
    <html>
      <head>
        <title>${escapeHtml(title)}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 24px; color: #111827; }
          h1 { margin: 0 0 8px 0; font-size: 20px; }
          p { margin: 0 0 16px 0; color: #4b5563; font-size: 12px; }
          table { width: 100%; border-collapse: collapse; font-size: 12px; }
          th, td { border: 1px solid #e5e7eb; padding: 8px; text-align: left; }
          th { background: #f9fafb; }
          @page { size: A4 landscape; margin: 16mm; }
        </style>
      </head>
      <body>
        <h1>${escapeHtml(title)}</h1>
        <p>Generated ${new Date().toLocaleString()}</p>
        <table>
          <thead>
            <tr>
              <th>Title</th>
              <th>Role</th>
              <th>Bloom Level</th>
              <th>Questions</th>
              <th>Completions</th>
              <th>Avg Score</th>
              <th>Status</th>
              <th>Created</th>
            </tr>
          </thead>
          <tbody>
            ${rows}
          </tbody>
        </table>
      </body>
    </html>
  `;

  const blob = new Blob([printableHtml], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const printWindow = window.open(url, "_blank");
  if (!printWindow) {
    URL.revokeObjectURL(url);
    return;
  }

  const cleanup = () => URL.revokeObjectURL(url);
  printWindow.addEventListener(
    "load",
    () => {
      printWindow.focus();
      printWindow.print();
      setTimeout(cleanup, 2000);
    },
    { once: true },
  );
}

export function QuizManagement() {
  const { profile } = useAuth();
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterRole, setFilterRole] = useState<string>("All");
  const [filterStatus, setFilterStatus] = useState<string>("All");
  const [selectedQuizzes, setSelectedQuizzes] = useState<Set<string>>(
    new Set(),
  );
  const [showExportMenu, setShowExportMenu] = useState<string | null>(null);
  const [previewQuiz, setPreviewQuiz] = useState<Quiz | null>(null);
  const [editingQuiz, setEditingQuiz] = useState<Quiz | null>(null);
  const [editForm, setEditForm] = useState({
    title: "",
    status: "Draft" as Quiz["status"],
  });

  const roles = useMemo(
    () => [
      "All",
      ...Array.from(new Set(quizzes.map((quiz) => quiz.role))).sort(),
    ],
    [quizzes],
  );
  const statuses: Array<"All" | Quiz["status"]> = [
    "All",
    "Published",
    "Draft",
    "In Review",
    "Rejected",
  ];

  useEffect(() => {
    let mounted = true;

    const loadQuizzes = async () => {
      setLoading(true);
      setLoadError(null);

      try {
        const trainingsPromise = supabase
          .from("trainings")
          .select("id, name, company_role, created_at, status, training_json")
          .order("created_at", { ascending: false });

        let evidenceQuery = supabase
          .from("training_evidence")
          .select("training_id, score, organization_id");

        if (profile?.organization_id) {
          evidenceQuery = evidenceQuery.eq(
            "organization_id",
            profile.organization_id,
          );
        }

        const [trainingsResult, evidenceResult] = await Promise.all([
          trainingsPromise,
          evidenceQuery,
        ]);
        if (trainingsResult.error) throw trainingsResult.error;
        if (evidenceResult.error) throw evidenceResult.error;

        const trainings = (trainingsResult.data ?? []) as TrainingRow[];
        const evidenceRows = (evidenceResult.data ?? []) as EvidenceRow[];

        const evidenceByTraining = new Map<
          number,
          { completions: number; totalScore: number }
        >();
        for (const row of evidenceRows) {
          const current = evidenceByTraining.get(row.training_id) ?? {
            completions: 0,
            totalScore: 0,
          };
          current.completions += 1;
          current.totalScore += Number(row.score ?? 0);
          evidenceByTraining.set(row.training_id, current);
        }

        const mapped = trainings.map((training) => {
          const evidence = evidenceByTraining.get(training.id);
          const completions = evidence?.completions ?? 0;
          const avgScore =
            completions > 0
              ? Math.round((evidence?.totalScore ?? 0) / completions)
              : 0;
          const role = formatRoleLabel(training.company_role);
          const title = training.name?.trim() || `${role} Training`;

          return {
            id: String(training.id),
            title,
            role,
            bloomLevel: getBloomLevel(training.training_json),
            questions: getQuestionCount(training.training_json),
            completions,
            avgScore,
            createdDate: training.created_at
              ? new Date(training.created_at).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })
              : "Unknown",
            status: mapTrainingStatus(training.status),
          } satisfies Quiz;
        });

        if (!mounted) return;
        setQuizzes(mapped);
      } catch (err) {
        if (!mounted) return;
        setQuizzes([]);
        setLoadError(
          err instanceof Error ? err.message : "Failed to load quizzes",
        );
      } finally {
        if (mounted) setLoading(false);
      }
    };

    void loadQuizzes();
    return () => {
      mounted = false;
    };
  }, [profile?.organization_id]);

  const filteredQuizzes = quizzes.filter((quiz) => {
    const matchesSearch = quiz.title
      .toLowerCase()
      .includes(searchTerm.toLowerCase());
    const matchesRole = filterRole === "All" || quiz.role === filterRole;
    const matchesStatus =
      filterStatus === "All" || quiz.status === filterStatus;
    return matchesSearch && matchesRole && matchesStatus;
  });

  const handleExport = (quizId: string, format: "json" | "csv" | "pdf") => {
    const quiz = quizzes.find((q) => q.id === quizId);
    if (!quiz) return;

    if (format === "json") {
      const payload = {
        quiz,
        exportedAt: new Date().toISOString(),
        format,
      };
      downloadTextFile(
        JSON.stringify(payload, null, 2),
        `${quiz.title.replace(/\s+/g, "_")}_export.json`,
        "application/json",
      );
    } else if (format === "csv") {
      const csv = buildQuizCsv([quiz]);
      downloadTextFile(
        csv,
        `${quiz.title.replace(/\s+/g, "_")}_export.csv`,
        "text/csv;charset=utf-8",
      );
    } else {
      openPrintablePdfDocument([quiz], `${quiz.title} Export`);
    }

    setShowExportMenu(null);
  };

  const handleBulkExport = (format: "json" | "csv" | "pdf") => {
    const selectedQuizData = quizzes.filter((q) => selectedQuizzes.has(q.id));

    if (format === "json") {
      const payload = {
        quizzes: selectedQuizData,
        exportedAt: new Date().toISOString(),
        format,
        count: selectedQuizData.length,
      };
      downloadTextFile(
        JSON.stringify(payload, null, 2),
        `bulk_quiz_export_${selectedQuizzes.size}_items.json`,
        "application/json",
      );
    } else if (format === "csv") {
      const csv = buildQuizCsv(selectedQuizData);
      downloadTextFile(
        csv,
        `bulk_quiz_export_${selectedQuizzes.size}_items.csv`,
        "text/csv;charset=utf-8",
      );
    } else {
      openPrintablePdfDocument(
        selectedQuizData,
        `Bulk Quiz Export (${selectedQuizData.length} items)`,
      );
    }

    setSelectedQuizzes(new Set());
    setShowExportMenu(null);
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
      setSelectedQuizzes(new Set(filteredQuizzes.map((q) => q.id)));
    }
  };

  const handleDelete = (quizId: string) => {
    void (async () => {
      const { error } = await supabase
        .from("trainings")
        .delete()
        .eq("id", Number(quizId));

      if (error) {
        setLoadError(error.message);
        return;
      }

      setQuizzes((prev) => prev.filter((q) => q.id !== quizId));
      selectedQuizzes.delete(quizId);
      setSelectedQuizzes(new Set(selectedQuizzes));
    })();
  };

  const handleEditSave = () => {
    if (!editingQuiz) return;
    void (async () => {
      const { error } = await supabase
        .from("trainings")
        .update({
          name: editForm.title.trim(),
          status: mapQuizStatusToTrainingStatus(editForm.status),
        })
        .eq("id", Number(editingQuiz.id));

      if (error) {
        setLoadError(error.message);
        return;
      }

      setQuizzes((prev) =>
        prev.map((q) =>
          q.id === editingQuiz.id
            ? { ...q, title: editForm.title.trim(), status: editForm.status }
            : q,
        ),
      );
      setEditingQuiz(null);
    })();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Published":
        return "bg-green-100 text-green-700 border-green-200";
      case "In Review":
        return "bg-blue-100 text-blue-700 border-blue-200";
      case "Draft":
        return "bg-yellow-100 text-yellow-700 border-yellow-200";
      case "Rejected":
        return "bg-red-100 text-red-700 border-red-200";
      default:
        return "bg-gray-100 text-gray-700 border-gray-200";
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
              <h3 className="text-lg font-semibold text-gray-900">
                Quiz Management
              </h3>
              <p className="text-sm text-gray-600">
                Manage and export quiz assessments
              </p>
            </div>
          </div>

          {selectedQuizzes.size > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">
                {selectedQuizzes.size} selected
              </span>
              <div className="relative">
                <button
                  onClick={() => setShowExportMenu("bulk")}
                  className="flex items-center gap-2 px-4 py-2 bg-[#1e3a5f] text-white rounded-lg text-sm font-medium hover:bg-[#152d4a] transition-colors"
                >
                  <Download className="w-4 h-4" />
                  Export Selected
                </button>

                {showExportMenu === "bulk" && (
                  <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-10">
                    <button
                      onClick={() => handleBulkExport("json")}
                      className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    >
                      <FileJson className="w-4 h-4 text-blue-600" />
                      Export as JSON
                    </button>
                    <button
                      onClick={() => handleBulkExport("csv")}
                      className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    >
                      <FileSpreadsheet className="w-4 h-4 text-green-600" />
                      Export as CSV
                    </button>
                    <button
                      onClick={() => handleBulkExport("pdf")}
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
              {roles.map((role) => (
                <option key={role} value={role}>
                  {role}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-blue-500 appearance-none bg-white"
          >
            {statuses.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </div>
        {loadError && <p className="mt-3 text-sm text-red-600">{loadError}</p>}
      </div>

      {/* Quiz Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-3 text-left">
                <input
                  type="checkbox"
                  checked={
                    selectedQuizzes.size === filteredQuizzes.length &&
                    filteredQuizzes.length > 0
                  }
                  onChange={toggleSelectAll}
                  className="w-4 h-4 rounded border-gray-300"
                />
              </th>
              <th className="text-left text-xs font-medium text-gray-600 px-6 py-3">
                Quiz Title
              </th>
              <th className="text-left text-xs font-medium text-gray-600 px-6 py-3">
                Role
              </th>
              <th className="text-left text-xs font-medium text-gray-600 px-6 py-3">
                Bloom Level
              </th>
              <th className="text-left text-xs font-medium text-gray-600 px-6 py-3">
                Questions
              </th>
              <th className="text-left text-xs font-medium text-gray-600 px-6 py-3">
                Completions
              </th>
              <th className="text-left text-xs font-medium text-gray-600 px-6 py-3">
                Avg Score
              </th>
              <th className="text-left text-xs font-medium text-gray-600 px-6 py-3">
                Status
              </th>
              <th className="text-left text-xs font-medium text-gray-600 px-6 py-3">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {loading && (
              <tr>
                <td colSpan={9} className="px-6 py-8 text-sm text-gray-500">
                  Loading quizzes...
                </td>
              </tr>
            )}
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
                  <p className="text-sm font-medium text-gray-900">
                    {quiz.title}
                  </p>
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
                  <span className="text-sm text-gray-600">
                    {quiz.questions}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span className="text-sm text-gray-600">
                    {quiz.completions}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-sm font-medium ${
                        quiz.avgScore >= 80
                          ? "text-green-600"
                          : quiz.avgScore >= 60
                            ? "text-yellow-600"
                            : "text-red-600"
                      }`}
                    >
                      {quiz.avgScore > 0 ? `${quiz.avgScore}%` : "N/A"}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span
                    className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium border ${getStatusColor(quiz.status)}`}
                  >
                    {quiz.status}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setPreviewQuiz(quiz)}
                      className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                      title="Preview quiz"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        setEditingQuiz(quiz);
                        setEditForm({ title: quiz.title, status: quiz.status });
                      }}
                      className="p-1.5 text-gray-600 hover:bg-gray-50 rounded transition-colors"
                      title="Edit quiz"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>

                    <div className="relative">
                      <button
                        onClick={() =>
                          setShowExportMenu(
                            showExportMenu === quiz.id ? null : quiz.id,
                          )
                        }
                        className="p-1.5 text-green-600 hover:bg-green-50 rounded transition-colors"
                      >
                        <Download className="w-4 h-4" />
                      </button>

                      {showExportMenu === quiz.id && (
                        <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-10">
                          <button
                            onClick={() => handleExport(quiz.id, "json")}
                            className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                          >
                            <FileJson className="w-4 h-4 text-blue-600" />
                            Export as JSON
                          </button>
                          <button
                            onClick={() => handleExport(quiz.id, "csv")}
                            className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                          >
                            <FileSpreadsheet className="w-4 h-4 text-green-600" />
                            Export as CSV
                          </button>
                          <button
                            onClick={() => handleExport(quiz.id, "pdf")}
                            className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                          >
                            <File className="w-4 h-4 text-red-600" />
                            Export as PDF
                          </button>
                        </div>
                      )}
                    </div>

                    <button
                      onClick={() => handleDelete(quiz.id)}
                      className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
                      title="Delete quiz"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {!loading && filteredQuizzes.length === 0 && (
        <div className="text-center py-12">
          <FileText className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-sm text-gray-600">
            No quizzes found matching your filters.
          </p>
        </div>
      )}

      {/* Footer */}
      <div className="p-4 border-t border-gray-200 bg-gray-50">
        <p className="text-xs text-gray-600 text-center">
          Showing {filteredQuizzes.length} of {quizzes.length} quizzes
        </p>
      </div>

      {/* Preview Modal */}
      {previewQuiz && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-xl shadow-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Quiz Preview
              </h3>
              <button
                onClick={() => setPreviewQuiz(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <MoreVertical className="w-4 h-4 rotate-90" />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase">
                  Title
                </p>
                <p className="text-sm text-gray-900">{previewQuiz.title}</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase">
                    Role
                  </p>
                  <p className="text-sm text-gray-900">{previewQuiz.role}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase">
                    Status
                  </p>
                  <p className="text-sm">
                    <span
                      className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(previewQuiz.status)}`}
                    >
                      {previewQuiz.status}
                    </span>
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase">
                    Bloom Level
                  </p>
                  <p className="text-sm font-semibold text-purple-700">
                    {previewQuiz.bloomLevel}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase">
                    Questions
                  </p>
                  <p className="text-sm font-semibold text-gray-900">
                    {previewQuiz.questions}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase">
                    Avg Score
                  </p>
                  <p className="text-sm font-semibold text-gray-900">
                    {previewQuiz.avgScore > 0
                      ? `${previewQuiz.avgScore}%`
                      : "N/A"}
                  </p>
                </div>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase">
                  Completions
                </p>
                <p className="text-sm text-gray-900">
                  {previewQuiz.completions} total
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase">
                  Created
                </p>
                <p className="text-sm text-gray-900">
                  {previewQuiz.createdDate}
                </p>
              </div>
            </div>
            <button
              onClick={() => setPreviewQuiz(null)}
              className="w-full mt-5 px-4 py-2.5 bg-[#1e3a5f] text-white text-sm font-medium rounded-lg hover:bg-[#152d4a]"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editingQuiz && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-white rounded-xl shadow-xl p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Edit Quiz
            </h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Title
                </label>
                <input
                  type="text"
                  value={editForm.title}
                  onChange={(e) =>
                    setEditForm((f) => ({ ...f, title: e.target.value }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Status
                </label>
                <select
                  value={editForm.status}
                  onChange={(e) =>
                    setEditForm((f) => ({
                      ...f,
                      status: e.target.value as Quiz["status"],
                    }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-blue-500 bg-white"
                >
                  <option value="Published">Published</option>
                  <option value="Draft">Draft</option>
                  <option value="In Review">In Review</option>
                  <option value="Rejected">Rejected</option>
                </select>
              </div>
            </div>
            <div className="flex gap-2 mt-5">
              <button
                onClick={() => setEditingQuiz(null)}
                className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleEditSave}
                className="flex-1 px-4 py-2.5 bg-[#1e3a5f] text-white text-sm font-medium rounded-lg hover:bg-[#152d4a]"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
