import { supabase } from './supabaseClient';

export type Folder = {
    id: string;
    name: string;
    color: string | null;
    organization_id: string;
    created_at?: string;
    updated_at?: string;
    created_by?: string | null;
};

export async function listFolders(): Promise<Folder[]> {
    const { data, error } = await supabase
        .from('folders')
        .select('id, name, color, organization_id, created_at, updated_at, created_by')
        .order('name', { ascending: true });

    if (error) throw error;
    return (data ?? []) as Folder[];
}

export async function createFolder(input: {
    name: string;
    color?: string | null;
    organization_id: string;
}): Promise<Folder> {
    const { data: userResp } = await supabase.auth.getUser();
    const created_by = userResp.user?.id ?? null;

    const { data, error } = await supabase
        .from('folders')
        .insert({
            name: input.name.trim(),
            color: input.color ?? null,
            organization_id: input.organization_id,
            created_by,
        })
        .select('id, name, color, organization_id, created_at, updated_at, created_by')
        .single();

    if (error) throw error;
    return data as Folder;
}

export async function renameFolder(id: string, name: string): Promise<void> {
    const { error } = await supabase
        .from('folders')
        .update({ name: name.trim(), updated_at: new Date().toISOString() })
        .eq('id', id);

    if (error) throw error;
}

export async function setFolderColor(id: string, color: string | null): Promise<void> {
    const { error } = await supabase
        .from('folders')
        .update({ color, updated_at: new Date().toISOString() })
        .eq('id', id);

    if (error) throw error;
}

export async function deleteFolder(id: string): Promise<void> {
    const { error } = await supabase
        .from('folders')
        .delete()
        .eq('id', id);

    if (error) throw error;
}

export async function assignDeckToFolder(
    trainingId: string | number,
    folderId: string | null,
): Promise<void> {
    const { error } = await supabase
        .from('trainings')
        .update({ folder_id: folderId })
        .eq('id', trainingId);

    if (error) throw error;
}
