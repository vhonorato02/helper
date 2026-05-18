'use client';

import { Keyboard } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { copy } from '@/lib/copy';

interface KeyboardCheatSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface Row {
  keys: string[];
  description: string;
}

const SECTIONS: ReadonlyArray<{ title: string; rows: Row[] }> = [
  {
    title: copy.shortcuts.sections.general,
    rows: [
      { keys: ['?'], description: copy.shortcuts.entries.showHelp },
      { keys: ['Ctrl', 'K'], description: copy.shortcuts.entries.openPalette },
      { keys: ['N'], description: copy.shortcuts.entries.newTicket },
      { keys: ['/'], description: copy.shortcuts.entries.focusSearch },
    ],
  },
  {
    title: copy.shortcuts.sections.comments,
    rows: [{ keys: ['Ctrl', 'Enter'], description: copy.shortcuts.entries.sendComment }],
  },
  {
    title: copy.shortcuts.sections.kanban,
    rows: [
      { keys: ['Tab'], description: copy.shortcuts.entries.focusCard },
      { keys: ['Space'], description: copy.shortcuts.entries.pickUpCard },
      { keys: ['←', '→'], description: copy.shortcuts.entries.moveCard },
      { keys: ['Enter'], description: copy.shortcuts.entries.dropCard },
      { keys: ['Esc'], description: copy.shortcuts.entries.cancelDrag },
    ],
  },
];

export function KeyboardCheatSheet({ open, onOpenChange }: KeyboardCheatSheetProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-start gap-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-primary/10">
              <Keyboard className="size-4 text-primary" />
            </div>
            <div>
              <DialogTitle>{copy.shortcuts.title}</DialogTitle>
              <DialogDescription className="mt-1">{copy.shortcuts.description}</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-5">
          {SECTIONS.map((section) => (
            <div key={section.title}>
              <p className="section-label mb-2">{section.title}</p>
              <dl className="divide-y divide-border/50 overflow-hidden rounded-lg border border-border/60 bg-card/60">
                {section.rows.map((row) => (
                  <div key={row.description} className="flex items-center justify-between gap-3 px-3 py-2">
                    <dd className="text-sm text-muted-foreground">{row.description}</dd>
                    <dt className="flex shrink-0 items-center gap-1">
                      {row.keys.map((key) => (
                        <kbd key={key} className="kbd">
                          {key}
                        </kbd>
                      ))}
                    </dt>
                  </div>
                ))}
              </dl>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
