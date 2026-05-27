'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Bookmark, Plus, Star, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

const STORAGE_KEY = 'helper-saved-views-v1';

interface SavedView {
  id: string;
  name: string;
  query: string; // serialized search params
  createdAt: number;
}

function loadViews(): SavedView[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (v): v is SavedView =>
        typeof v?.id === 'string' &&
        typeof v?.name === 'string' &&
        typeof v?.query === 'string',
    );
  } catch {
    return [];
  }
}

function saveViews(views: SavedView[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(views));
  } catch {
    // ignore
  }
}

export function SavedViews() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [views, setViews] = useState<SavedView[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [name, setName] = useState('');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setViews(loadViews());
  }, []);

  const currentQuery = searchParams.toString();

  const handleSave = () => {
    if (!name.trim()) return;
    const newView: SavedView = {
      id: crypto.randomUUID(),
      name: name.trim().slice(0, 40),
      query: currentQuery,
      createdAt: Date.now(),
    };
    const next = [...views, newView];
    setViews(next);
    saveViews(next);
    setName('');
    setDialogOpen(false);
  };

  const handleDelete = useCallback(
    (id: string) => {
      const next = views.filter((v) => v.id !== id);
      setViews(next);
      saveViews(next);
    },
    [views],
  );

  const applyView = (view: SavedView) => {
    router.push(`/tickets${view.query ? `?${view.query}` : ''}`);
  };

  const isCurrentView = (view: SavedView) => view.query === currentQuery;

  if (!mounted) return null;

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {views.length > 0 && (
        <>
          <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wide flex items-center gap-1.5">
            <Bookmark className="size-3" />
            Visões
          </span>
          {views.map((view) => (
            <div key={view.id} className="group inline-flex items-center">
              <button
                onClick={() => applyView(view)}
                className={cn(
                  'h-7 pl-2.5 pr-1.5 rounded-l-md border border-r-0 text-xs font-medium transition-colors flex items-center gap-1.5',
                  isCurrentView(view)
                    ? 'bg-primary/10 text-primary border-primary/30'
                    : 'bg-card hover:bg-accent text-foreground border-border',
                )}
              >
                {isCurrentView(view) && <Star className="size-3 fill-current" />}
                {view.name}
              </button>
              <button
                onClick={() => handleDelete(view.id)}
                className={cn(
                  'h-7 w-7 rounded-r-md border text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors flex items-center justify-center',
                  isCurrentView(view) ? 'border-primary/30' : 'border-border',
                )}
                title="Remover visão"
                aria-label="Remover visão"
              >
                <X className="size-3" />
              </button>
            </div>
          ))}
        </>
      )}

      {currentQuery && (
        <Button variant="ghost" size="sm" onClick={() => setDialogOpen(true)} className="h-7 text-xs">
          <Plus className="size-3" />
          Salvar visão
        </Button>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Salvar visão atual</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Minhas urgentes, MKT atrasadas..."
              maxLength={40}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleSave();
                }
              }}
            />
            <p className="text-xs text-muted-foreground">
              Os filtros e a busca atuais serão salvos. As visões ficam guardadas neste dispositivo.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={!name.trim()}>
              <Bookmark className="size-4" />
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
