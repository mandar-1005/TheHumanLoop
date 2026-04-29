import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';
import { Loader2 } from 'lucide-react';
import { Users, Plus, Edit2, Trash2, Save, X, CheckCircle, Brain, Target } from 'lucide-react';

// Bloom's Taxonomy levels
const bloomLevels = [
    { id: 1, name: 'Remember', description: 'Recall facts and basic concepts', color: 'bg-purple-100 border-purple-300 text-purple-800' },
    { id: 2, name: 'Understand', description: 'Explain ideas or concepts', color: 'bg-blue-100 border-blue-300 text-blue-800' },
    { id: 3, name: 'Apply', description: 'Use information in new situations', color: 'bg-green-100 border-green-300 text-green-800' },
    { id: 4, name: 'Analyze', description: 'Draw connections among ideas', color: 'bg-yellow-100 border-yellow-300 text-yellow-800' },
    { id: 5, name: 'Evaluate', description: 'Justify a decision or course of action', color: 'bg-orange-100 border-orange-300 text-orange-800' },
    { id: 6, name: 'Create', description: 'Produce new or original work', color: 'bg-red-100 border-red-300 text-red-800' },
];

interface Role {
    id: string;
    name: string;
    department: string;
    bloomLevel: number;
    description: string;
    responsibilities: string[];
    organization_id?: string;
}

export function RoleDefinitionPortal() {
    const { profile } = useAuth();
    const [roles, setRoles] = useState<Role[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [isAddingRole, setIsAddingRole] = useState(false);
    const [editingRoleId, setEditingRoleId] = useState<string | null>(null);
    const [formData, setFormData] = useState<Partial<Role>>({
        name: '',
        department: '',
        bloomLevel: 1,
        description: '',
        responsibilities: []
    });
    const [newResponsibility, setNewResponsibility] = useState('');

    useEffect(() => {
        if (!profile?.organization_id) return;
        void loadRoles();
    }, [profile]);

    const loadRoles = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('roles')
            .select('*')
            .eq('organization_id', profile!.organization_id)
            .order('created_at', { ascending: true });
        if (!error && data) {
            if (data.length === 0) {
                // Seed default roles for new org
                const defaults = [
                    { name: 'Developer', department: 'Engineering', bloom_level: 4, description: 'Software developers building secure applications', responsibilities: ['Code security', 'Vulnerability assessment', 'Secure coding practices'] },
                    { name: 'Security Lead', department: 'Security', bloom_level: 5, description: 'Security professionals leading incident response', responsibilities: ['Incident management', 'Security strategy', 'Team leadership'] },
                    { name: 'Team Lead', department: 'Management', bloom_level: 5, description: 'Team leaders managing cross-functional teams', responsibilities: ['Team management', 'Compliance oversight', 'Resource allocation'] },
                    { name: 'Compliance Officer', department: 'Compliance', bloom_level: 6, description: 'Compliance experts ensuring regulatory adherence', responsibilities: ['Policy creation', 'Audit coordination', 'Risk assessment'] },
                ].map(r => ({ ...r, organization_id: profile!.organization_id }));
                await supabase.from('roles').insert(defaults);
                // Reload after seeding
                const { data: seeded } = await supabase.from('roles').select('*').eq('organization_id', profile!.organization_id).order('created_at', { ascending: true });
                setRoles((seeded ?? []).map(r => ({ id: r.id, name: r.name, department: r.department ?? '', bloomLevel: r.bloom_level ?? 1, description: r.description ?? '', responsibilities: r.responsibilities ?? [], organization_id: r.organization_id })));
            } else {
                setRoles(data.map(r => ({ id: r.id, name: r.name, department: r.department ?? '', bloomLevel: r.bloom_level ?? 1, description: r.description ?? '', responsibilities: r.responsibilities ?? [], organization_id: r.organization_id })));
            }
        }
        setLoading(false);
    };

    const handleAddRole = () => {
        setIsAddingRole(true);
        setFormData({
            name: '',
            department: '',
            bloomLevel: 1,
            description: '',
            responsibilities: []
        });
    };

    const handleEditRole = (role: Role) => {
        setEditingRoleId(role.id);
        setFormData(role);
    };

    const handleSaveRole = async () => {
        if (!profile?.organization_id) return;
        setSaving(true);
        if (isAddingRole) {
            const { error } = await supabase.from('roles').insert({
                organization_id: profile.organization_id,
                name: formData.name,
                department: formData.department,
                bloom_level: formData.bloomLevel ?? 1,
                description: formData.description,
                responsibilities: formData.responsibilities ?? [],
            });
            if (!error) { await loadRoles(); setIsAddingRole(false); }
        } else if (editingRoleId) {
            const { error } = await supabase.from('roles').update({
                name: formData.name,
                department: formData.department,
                bloom_level: formData.bloomLevel ?? 1,
                description: formData.description,
                responsibilities: formData.responsibilities ?? [],
            }).eq('id', editingRoleId);
            if (!error) { await loadRoles(); setEditingRoleId(null); }
        }
        setFormData({});
        setSaving(false);
    };

    const handleCancel = () => {
        setIsAddingRole(false);
        setEditingRoleId(null);
        setFormData({});
    };

    const handleDeleteRole = async (id: string) => {
        await supabase.from('roles').delete().eq('id', id);
        setRoles(roles.filter(role => role.id !== id));
    };

    const handleAddResponsibility = () => {
        if (newResponsibility.trim()) {
            setFormData({
                ...formData,
                responsibilities: [...(formData.responsibilities || []), newResponsibility.trim()]
            });
            setNewResponsibility('');
        }
    };

    const handleRemoveResponsibility = (index: number) => {
        setFormData({
            ...formData,
            responsibilities: formData.responsibilities?.filter((_, i) => i !== index) || []
        });
    };

    const getBloomLevel = (levelId: number) => {
        return bloomLevels.find(level => level.id === levelId);
    };

    return (
        <div className="bg-white rounded-xl border border-gray-200">
            {/* Header */}
            <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                            <Users className="w-5 h-5 text-purple-600" />
                        </div>
                        <div>
                            <h3 className="text-lg font-semibold text-gray-900">Role Definition Portal</h3>
                            <p className="text-sm text-gray-600">Map organization roles to Bloom's Taxonomy levels</p>
                        </div>
                    </div>
                    <button
                        onClick={handleAddRole}
                        className="flex items-center gap-2 px-4 py-2 bg-[#1e3a5f] text-white rounded-lg text-sm font-medium hover:bg-[#152d4a] transition-colors"
                    >
                        <Plus className="w-4 h-4" />
                        Add New Role
                    </button>
                </div>
            </div>

            {/* Bloom's Taxonomy Reference */}
            <div className="p-6 bg-gradient-to-r from-purple-50 to-blue-50 border-b border-gray-200">
                <div className="flex items-center gap-2 mb-3">
                    <Brain className="w-5 h-5 text-purple-600" />
                    <h4 className="text-sm font-semibold text-gray-900">Bloom's Taxonomy Levels</h4>
                </div>
                <div className="grid grid-cols-6 gap-2">
                    {bloomLevels.map((level) => (
                        <div key={level.id} className={`p-3 rounded-lg border ${level.color}`}>
                            <p className="text-xs font-bold mb-1">{level.id}. {level.name}</p>
                            <p className="text-xs">{level.description}</p>
                        </div>
                    ))}
                </div>
            </div>

            {/* Add/Edit Role Form */}
            {(isAddingRole || editingRoleId) && (
                <div className="p-6 bg-blue-50 border-b border-blue-200">
                    <h4 className="text-sm font-semibold text-gray-900 mb-4">
                        {isAddingRole ? 'Add New Role' : 'Edit Role'}
                    </h4>

                    <div className="grid grid-cols-2 gap-4 mb-4">
                        <div>
                            <label className="block text-xs font-medium text-gray-700 mb-2">Role Name</label>
                            <input
                                type="text"
                                value={formData.name || ''}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-blue-500"
                                placeholder="e.g., Senior Developer"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-medium text-gray-700 mb-2">Department</label>
                            <input
                                type="text"
                                value={formData.department || ''}
                                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-blue-500"
                                placeholder="e.g., Engineering"
                            />
                        </div>
                    </div>

                    <div className="mb-4">
                        <label className="block text-xs font-medium text-gray-700 mb-2">Description</label>
                        <textarea
                            value={formData.description || ''}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-blue-500"
                            rows={2}
                            placeholder="Brief description of the role..."
                        />
                    </div>

                    <div className="mb-4">
                        <label className="block text-xs font-medium text-gray-700 mb-2">
                            Bloom's Taxonomy Level
                        </label>
                        <div className="grid grid-cols-6 gap-2">
                            {bloomLevels.map((level) => (
                                <button
                                    key={level.id}
                                    onClick={() => setFormData({ ...formData, bloomLevel: level.id })}
                                    className={`p-3 rounded-lg border-2 text-xs font-semibold transition-all ${
                                        formData.bloomLevel === level.id
                                            ? level.color + ' border-current shadow-md'
                                            : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
                                    }`}
                                >
                                    {level.id}. {level.name}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="mb-4">
                        <label className="block text-xs font-medium text-gray-700 mb-2">Key Responsibilities</label>
                        <div className="flex gap-2 mb-2">
                            <input
                                type="text"
                                value={newResponsibility}
                                onChange={(e) => setNewResponsibility(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleAddResponsibility()}
                                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-blue-500"
                                placeholder="Add a responsibility..."
                            />
                            <button
                                onClick={handleAddResponsibility}
                                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors"
                            >
                                Add
                            </button>
                        </div>
                        <div className="space-y-2">
                            {formData.responsibilities?.map((resp, index) => (
                                <div key={index} className="flex items-center justify-between bg-white p-2 rounded-lg border border-gray-200">
                                    <span className="text-sm text-gray-700">{resp}</span>
                                    <button
                                        onClick={() => handleRemoveResponsibility(index)}
                                        className="text-red-600 hover:text-red-700"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="flex gap-2">
                        <button
                            onClick={handleSaveRole}
                            disabled={!formData.name || !formData.department || saving}
                            className="flex items-center gap-2 px-4 py-2 bg-[#1e3a5f] text-white rounded-lg text-sm font-medium hover:bg-[#152d4a] transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
                        >
                            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                            {saving ? 'Saving...' : 'Save Role'}
                        </button>
                        <button
                            onClick={handleCancel}
                            className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors"
                        >
                            <X className="w-4 h-4" />
                            Cancel
                        </button>
                    </div>
                </div>
            )}

            {/* Roles List */}
            <div className="p-6">
                {loading ? (
                    <div className="flex items-center justify-center py-12">
                        <Loader2 className="w-6 h-6 animate-spin text-gray-400 mr-2" />
                        <p className="text-sm text-gray-500">Loading roles...</p>
                    </div>
                ) : roles.length === 0 ? (
                    <div className="text-center py-12">
                        <Users className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                        <p className="text-sm text-gray-600">No roles defined yet. Click "Add New Role" to get started.</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {roles.map((role) => {
                            const bloomLevel = getBloomLevel(role.bloomLevel);
                            return (
                                <div key={role.id} className="p-4 border border-gray-200 rounded-lg hover:shadow-md transition-shadow">
                                    <div className="flex items-start justify-between mb-3">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-3 mb-2">
                                                <h4 className="text-base font-semibold text-gray-900">{role.name}</h4>
                                                <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">{role.department}</span>
                                            </div>
                                            <p className="text-sm text-gray-600 mb-3">{role.description}</p>
                                            {bloomLevel && (
                                                <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border ${bloomLevel.color}`}>
                                                    <Target className="w-4 h-4" />
                                                    <span className="text-xs font-semibold">Level {bloomLevel.id}: {bloomLevel.name}</span>
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex gap-2">
                                            <button onClick={() => handleEditRole(role)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                                                <Edit2 className="w-4 h-4" />
                                            </button>
                                            <button onClick={() => handleDeleteRole(role.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                    <div className="mt-3 pt-3 border-t border-gray-200">
                                        <p className="text-xs font-medium text-gray-700 mb-2">Key Responsibilities:</p>
                                        <div className="flex flex-wrap gap-2">
                                            {role.responsibilities.map((resp, index) => (
                                                <span key={index} className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded border border-blue-200">
                          <CheckCircle className="w-3 h-3" />
                                                    {resp}
                        </span>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}