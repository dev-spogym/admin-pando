// 공지사항(notices) API
import { supabase } from '@/lib/supabase';

const getBranchId = (): number => {
  const stored = localStorage.getItem('branchId');
  return stored ? Number(stored) : 1;
};

export interface Notice {
  id: number;
  title: string;
  content: string;
  authorName: string;
  isPinned: boolean;
  isPublic: boolean;
  branchId: number;
  createdAt: string;
  updatedAt: string;
}

// 목록 조회 (고정글 먼저)
export async function getNotices(branchId?: number): Promise<{ data: Notice[] | null; error: string | null }> {
  const bid = branchId ?? getBranchId();
  const { data, error } = await supabase
    .from('notices')
    .select('*')
    .eq('branchId', bid)
    .order('isPinned', { ascending: false })
    .order('createdAt', { ascending: false });

  if (error) return { data: null, error: error.message };
  return {
    data: (data ?? []).map((row: Record<string, unknown>) => ({
      id: row.id as number,
      title: (row.title as string) ?? '',
      content: (row.content as string) ?? '',
      authorName: (row.authorName as string) ?? '',
      isPinned: (row.isPinned as boolean) ?? false,
      isPublic: (row.isPublic as boolean) ?? true,
      branchId: row.branchId as number,
      createdAt: (row.createdAt as string) ?? '',
      updatedAt: (row.updatedAt as string) ?? '',
    })),
    error: null,
  };
}

export async function createNotice(data: {
  title: string;
  content: string;
  authorName: string;
  isPinned: boolean;
  isPublic: boolean;
}): Promise<{ error: string | null }> {
  const { error } = await supabase.from('notices').insert({
    ...data,
    branchId: getBranchId(),
  });
  return { error: error?.message ?? null };
}

export async function updateNotice(id: number, data: Partial<{
  title: string;
  content: string;
  isPinned: boolean;
  isPublic: boolean;
}>): Promise<{ error: string | null }> {
  const { error } = await supabase.from('notices').update({ ...data, updatedAt: new Date().toISOString() }).eq('id', id);
  return { error: error?.message ?? null };
}

export async function deleteNotice(id: number): Promise<{ error: string | null }> {
  const { error } = await supabase.from('notices').delete().eq('id', id);
  return { error: error?.message ?? null };
}
