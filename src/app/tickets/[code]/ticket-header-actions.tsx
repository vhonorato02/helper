'use client';

import { Copy, Link2, Printer } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { copy } from '@/lib/copy';

export function TicketHeaderActions({ code }: { code: string }) {
  const copyValue = async (value: string, message: string) => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success(message);
    } catch {
      toast.error(copy.tickets.detail.copyFailed);
    }
  };

  return (
    <div className="flex items-center gap-1.5 no-print">
      <Button
        type="button"
        variant="outline"
        size="icon-sm"
        aria-label="Imprimir"
        title="Imprimir / Salvar PDF"
        onClick={() => window.print()}
      >
        <Printer className="size-3.5" />
      </Button>
      <Button
        type="button"
        variant="outline"
        size="icon-sm"
        aria-label={copy.tickets.detail.copyCode}
        title={copy.tickets.detail.copyCode}
        onClick={() => copyValue(code, copy.tickets.detail.codeCopied)}
      >
        <Copy className="size-3.5" />
      </Button>
      <Button
        type="button"
        variant="outline"
        size="icon-sm"
        aria-label={copy.tickets.detail.copyLink}
        title={copy.tickets.detail.copyLink}
        onClick={() =>
          copyValue(`${window.location.origin}/tickets/${code}`, copy.tickets.detail.linkCopied)
        }
      >
        <Link2 className="size-3.5" />
      </Button>
    </div>
  );
}
