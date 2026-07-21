import { useCallback, useEffect, useState } from 'react';
import { NextGenAPI } from '../api/NextGenAPI';

export interface TimelineItem {
  id: string;
  type: string;
  timestamp: string;
  actor: string | null;
  summary: string;
  link: string; // tab hint ('documents','deadlines',…) or cross-page route ('/work','/proposals')
}

/**
 * Cursor-paginated client timeline (the unified activity feed). Resets + reloads
 * when clientId or the type filter changes; loadMore() pages via the compound
 * cursor the backend returns. All the aggregation lives server-side.
 */
export function useClientTimeline(clientId?: string, types: string[] = []) {
  const typesKey = [...types].sort().join(',');
  const [items, setItems] = useState<TimelineItem[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  const fetchPage = useCallback(async (before?: string) => {
    if (!clientId) return;
    setLoading(true); setError(false);
    try {
      const p = new URLSearchParams();
      if (typesKey) p.set('types', typesKey);
      if (before) p.set('before', before);
      const res = await NextGenAPI.get(`/brain/clients/${clientId}/timeline${p.toString() ? '?' + p : ''}`);
      const d = res.data.data ?? res.data;
      setItems((prev) => (before ? [...prev, ...(d.items || [])] : (d.items || [])));
      setNextCursor(d.nextCursor ?? null);
      setHasMore(!!d.hasMore);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [clientId, typesKey]);

  useEffect(() => { setItems([]); setNextCursor(null); setHasMore(false); fetchPage(); }, [fetchPage]);

  return {
    items,
    hasMore,
    loading,
    error,
    loadMore: () => { if (nextCursor) fetchPage(nextCursor); },
    refresh: () => fetchPage(),
  };
}
