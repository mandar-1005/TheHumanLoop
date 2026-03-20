import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

type TrainingStatus = 'Published' | 'In Review' | 'Draft';

type TrainingRow = {
  id: string | number;
  company_role: string | null;
  training_json: unknown;
  created_at: string | null;
};

type TrainingModule = {
  id: string;
  name: string;
  role: string;
  status: TrainingStatus;
  completion: number;
  createdAt: string;
};

function asObject(value: unknown): Record<string, unknown> | null {
  if (typeof value === 'object' && value !== null) return value as Record<string, unknown>;
  return null;
}

function normalizeStatus(status: unknown): TrainingStatus {
  if (status === 'Published' || status === 'In Review' || status === 'Draft') return status;
  return 'Draft';
}

function normalizeCompletion(value: unknown): number {
  const n = typeof value === 'number' ? value : 0;
  return Math.max(0, Math.min(100, n));
}

function mapTraining(row: TrainingRow): TrainingModule {
  const payload = asObject(row.training_json);

  const name =
    (payload?.title as string | undefined) ||
    (payload?.module_name as string | undefined) ||
    (payload?.training_title as string | undefined) ||
    `Training ${String(row.id)}`;

  const status = normalizeStatus(payload?.status);
  const completion = normalizeCompletion(payload?.completion);

  return {
    id: String(row.id),
    name,
    role: row.company_role || 'Other',
    status,
    completion,
    createdAt: row.created_at ? new Date(row.created_at).toLocaleString() : 'Unknown',
  };
}

export function TrainingModulesPage() {
  const [rows, setRows] = useState<TrainingModule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const total = useMemo(() => rows.length, [rows]);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('trainings')
        .select('id, company_role, training_json, created_at')
        .order('created_at', { ascending: false });

      if (!mounted) return;

      if (error) {
        setError(error.message);
        setRows([]);
      } else {
        const mapped = ((data ?? []) as TrainingRow[]).map(mapTraining);
        setRows(mapped);
      }

      setLoading(false);
    };

    void load();
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <main className="min-h-screen bg-gray-50 p-8">
      <h1 className="text-2xl font-semibold text-gray-900 mb-2">Training Modules</h1>
      <p className="text-sm text-gray-600 mb-6">Total trainings: {total}</p>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left text-xs font-medium text-gray-600 px-6 py-3">Module Name</th>
              <th className="text-left text-xs font-medium text-gray-600 px-6 py-3">Role</th>
              <th className="text-left text-xs font-medium text-gray-600 px-6 py-3">Status</th>
              <th className="text-left text-xs font-medium text-gray-600 px-6 py-3">Completion</th>
              <th className="text-left text-xs font-medium text-gray-600 px-6 py-3">Created</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {loading && (
              <tr>
                <td colSpan={5} className="px-6 py-6 text-sm text-gray-600">Loading trainings...</td>
              </tr>
            )}

            {!loading && error && (
              <tr>
                <td colSpan={5} className="px-6 py-6 text-sm text-red-600">Failed to load trainings: {error}</td>
              </tr>
            )}

            {!loading && !error && rows.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-6 text-sm text-gray-600">No trainings found.</td>
              </tr>
            )}

            {!loading && !error && rows.map((row) => (
              <tr key={row.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 text-sm font-medium text-gray-900">{row.name}</td>
                <td className="px-6 py-4 text-sm text-gray-700">{row.role}</td>
                <td className="px-6 py-4 text-sm text-gray-700">{row.status}</td>
                <td className="px-6 py-4 text-sm text-gray-700">{row.completion}%</td>
                <td className="px-6 py-4 text-sm text-gray-700">{row.createdAt}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}