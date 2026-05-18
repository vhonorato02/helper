'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  CornerDownLeft,
  Kanban,
  LayoutDashboard,
  List,
  Plus,
  Search,
  Settings,
  UserRound,
} from 'lucide-react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { copy } from '@/lib/copy';

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
  onNewTicket: () => void;
  isAdmin?: boolean;
  currentUserId?: string;
}

const NAV_ITEMS = [
  { label: copy.commandPalette.actions.dashboard, href: '/', icon: LayoutDashboard, admin: false },
  { label: copy.commandPalette.actions.kanban, href: '/kanban', icon: Kanban, admin: false },
  { label: copy.commandPalette.actions.tickets, href: '/tickets', icon: List, admin: false },
  { label: copy.commandPalette.actions.settings, href: '/configuracoes', icon: Settings, admin: true },
] as const;

export function CommandPalette({
  open,
  onClose,
  onNewTicket,
  isAdmin = false,
  currentUserId = '',
}: CommandPaletteProps) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(0);

  const actions = useMemo(
    () => [
      {
        label: copy.commandPalette.actions.newTicket,
        icon: Plus,
        action: () => {
          onClose();
          onNewTicket();
        },
        keywords: copy.commandPalette.keywords.newTicket,
        group: copy.commandPalette.groups.actions,
      },
      ...(currentUserId
        ? [
            {
              label: copy.commandPalette.actions.myTickets,
              icon: UserRound,
              action: () => {
                router.push(`/tickets?assigneeId=${currentUserId}&status=ativas`);
                onClose();
              },
              keywords: copy.commandPalette.keywords.myTickets,
              group: copy.commandPalette.groups.actions,
            },
          ]
        : []),
      {
        label: copy.commandPalette.actions.attentionQueue,
        icon: AlertTriangle,
        action: () => {
          router.push('/tickets?attention=true');
          onClose();
        },
        keywords: copy.commandPalette.keywords.attentionQueue,
        group: copy.commandPalette.groups.actions,
      },
      ...NAV_ITEMS.filter((item) => !item.admin || isAdmin).map((item) => ({
        label: item.label,
        icon: item.icon,
        action: () => {
          router.push(item.href);
          onClose();
        },
        keywords: item.label.toLowerCase(),
        group: copy.commandPalette.groups.navigation,
      })),
    ],
    [currentUserId, isAdmin, onClose, onNewTicket, router],
  );

  const filtered = query
    ? actions.filter(
        (action) =>
          action.label.toLowerCase().includes(query.toLowerCase()) ||
          action.keywords.includes(query.toLowerCase()),
      )
    : actions;

  useEffect(() => {
    setSelected(0);
  }, [filtered.length]);

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        setSelected((value) => Math.min(value + 1, filtered.length - 1));
      } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        setSelected((value) => Math.max(value - 1, 0));
      } else if (event.key === 'Enter' && filtered[selected]) {
        event.preventDefault();
        filtered[selected].action();
        setQuery('');
      }
    },
    [filtered, selected],
  );

  useEffect(() => {
    if (!open) setQuery('');
  }, [open]);

  const groups = filtered.reduce<Record<string, typeof filtered>>((acc, item) => {
    if (!acc[item.group]) acc[item.group] = [];
    acc[item.group].push(item);
    return acc;
  }, {});

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="p-0 gap-0 max-w-lg overflow-hidden">
        <DialogTitle className="sr-only">{copy.commandPalette.title}</DialogTitle>
        <div className="flex items-center border-b px-4 gap-3">
          <Search className="size-4 text-muted-foreground shrink-0" />
          <input
            autoFocus
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={copy.commandPalette.placeholder}
            className="flex-1 py-3.5 text-sm bg-transparent outline-none placeholder:text-muted-foreground"
          />
          <kbd className="kbd">{copy.commandPalette.hints.escape}</kbd>
        </div>

        <div className="py-1.5 max-h-[400px] overflow-y-auto">
          {filtered.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-8">
              {copy.commandPalette.noResults(query)}
            </p>
          ) : (
            Object.entries(groups).map(([group, items], groupIndex) => {
              let runningIndex = filtered.findIndex((item) => item === items[0]);
              return (
                <div key={group} className={groupIndex > 0 ? 'mt-1.5' : ''}>
                  <p className="px-4 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {group}
                  </p>
                  {items.map((item) => {
                    const index = runningIndex++;
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.label}
                        onClick={() => {
                          item.action();
                          setQuery('');
                        }}
                        className={cn(
                          'w-[calc(100%-0.75rem)] flex items-center gap-3 px-4 py-2 text-sm transition-colors text-left mx-1.5 rounded-md',
                          index === selected
                            ? 'bg-accent text-accent-foreground'
                            : 'hover:bg-accent/50',
                        )}
                        onMouseEnter={() => setSelected(index)}
                      >
                        <Icon className="size-4 text-muted-foreground shrink-0" />
                        <span className="flex-1">{item.label}</span>
                        {index === selected && (
                          <CornerDownLeft className="size-3 text-muted-foreground" />
                        )}
                      </button>
                    );
                  })}
                </div>
              );
            })
          )}
        </div>

        <div className="border-t px-4 py-2 flex gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <ArrowUp className="size-3" />
            <ArrowDown className="size-3" />
            {copy.commandPalette.hints.navigate}
          </span>
          <span className="flex items-center gap-1.5">
            <CornerDownLeft className="size-3" />
            {copy.commandPalette.hints.select}
          </span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
