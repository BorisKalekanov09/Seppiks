import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';

export interface Question {
  id: string;
  text: string;
  category: string;
  content_type: string;
  yes_count: number;
  no_count: number;
  comment_count: number;
  created_at: string;
}

const BATCH_SIZE = 10;

export function useQuestions() {
  const { user } = useAuth();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [votedIds, setVotedIds] = useState<Set<string>>(new Set());

  const fetchVotedIds = useCallback(async () => {
    console.log('[fetchVotedIds] START - user?', !!user);
    if (!user) return new Set<string>();
    console.log('[fetchVotedIds] Fetching from supabase votes...');
    const { data, error } = await supabase
      .from('votes')
      .select('question_id')
      .eq('user_id', user.id);
    if (error) console.error('[fetchVotedIds] Error:', error);
    console.log('[fetchVotedIds] DONE', data?.length || 0);
    return new Set<string>((data ?? []).map((v: any) => v.question_id));
  }, [user]);

  const fetchQuestions = useCallback(async (excludeIds: Set<string>) => {
    console.log('[fetchQuestions] START. exclude count:', excludeIds.size);
    setLoading(true);
    try {
      let query = supabase
        .from('questions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(BATCH_SIZE);

      if (excludeIds.size > 0) {
        query = query.not('id', 'in', `(${Array.from(excludeIds).join(',')})`);
      }

      console.log('[fetchQuestions] Awaiting query...');
      const { data, error } = await query;
      console.log('[fetchQuestions] Query done. error:', !!error, 'data len:', data?.length);
      if (error) throw error;
      setQuestions(data ?? []);
    } catch (e) {
      console.error('[fetchQuestions] caught error:', e);
    } finally {
      console.log('[fetchQuestions] Setting loading = false');
      setLoading(false);
    }
  }, []);

  const loadMore = useCallback(async () => {
    const currentIds = new Set([...votedIds, ...questions.map(q => q.id)]);
    let query = supabase
      .from('questions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(BATCH_SIZE);

    if (currentIds.size > 0) {
      query = query.not('id', 'in', `(${Array.from(currentIds).join(',')})`);
    }

    const { data } = await query;
    if (data && data.length > 0) {
      setQuestions(prev => [...prev, ...data]);
    }
  }, [questions, votedIds]);

  const removeQuestion = useCallback((id: string) => {
    setVotedIds(prev => new Set([...prev, id]));
    setQuestions(prev => prev.filter(q => q.id !== id));
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const ids = await fetchVotedIds();
        setVotedIds(ids);
        await fetchQuestions(ids);
      } catch (err) {
        console.error('[useQuestions] Error fetching questions or voted ids:', err);
        setLoading(false);
      }
    })();
  }, [user]);

  return { questions, loading, loadMore, removeQuestion };
}
