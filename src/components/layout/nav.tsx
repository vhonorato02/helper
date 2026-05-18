'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  ChevronDown,
  Kanban,
  KeyRound,
  LayoutDashboard,
  List,
  LogOut,
  Menu,
  Plus,
  Settings,
  X,
} from 'lucide-react';
import { signOut } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ThemeToggle } from './theme-toggle';
import { TicketForm } from '@/components/tickets/ticket-form';
import { CommandPalette } from '@/components/command-palette';
import { ChangePasswordDialog } from '@/components/change-password-dialog';
import { cn } from '@/lib/utils';
import { copy } from '@/lib/copy';
import { initials } from '@/lib/format';
import type { User } from '@/db/schema';

const NAV_LINKS = [
  { href: '/', label: copy.nav.links.dashboard, icon: LayoutDashboard },
  { href: '/kanban', label: copy.nav.links.kanban, icon: Kanban },
  { href: '/tickets', label: copy.nav.links.tickets, icon: List },
] as const;

interface NavProps {
  user: { id?: string; name?: string | null; isAdmin?: boolean };
  users: Pick<User, 'id' | 'displayName'>[];
}

export function Nav({ user, users }: NavProps) {
  const pathname = usePathname();
  const [formOpen, setFormOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);

  const handleKeydown = useCallback((event: KeyboardEvent) => {
    if (['INPUT', 'TEXTAREA', 'SELECT'].includes((event.target as HTMLElement)?.tagName)) return;
    if ((event.target as HTMLElement)?.isContentEditable) return;

    if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
      event.preventDefault();
      setPaletteOpen(true);
      return;
    }
    if (event.key === 'n' || event.key === 'N') {
      event.preventDefault();
      setFormOpen(true);
      return;
    }
    if (event.key === '/') {
      event.preventDefault();
      document.getElementById('search-input')?.focus();
    }
  }, []);

  useEffect(() => {
    document.addEventListener('keydown', handleKeydown);
    return () => document.removeEventListener('keydown', handleKeydown);
  }, [handleKeydown]);

  const userName = user.name ?? copy.dashboard.greeting.fallbackName;

  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/70">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex h-14 items-center gap-3">
          <Link href="/" className="flex items-center gap-2.5 font-semibold shrink-0 group">
            <div className="size-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground text-sm font-bold shadow-sm shadow-primary/20 transition-transform group-hover:scale-105">
              {copy.brand.initials}
            </div>
            <span className="hidden sm:block tracking-tight">{copy.brand.name}</span>
          </Link>

          <nav className="hidden md:flex items-center gap-0.5 ml-4">
            {NAV_LINKS.map(({ href, label, icon: Icon }) => {
              const active = pathname === href;
              return (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    'flex items-center gap-1.5 px-3 h-9 rounded-md text-sm transition-colors',
                    active
                      ? 'bg-accent text-foreground font-medium'
                      : 'text-muted-foreground hover:text-foreground hover:bg-accent/60',
                  )}
                >
                  <Icon className="size-4" />
                  {label}
                </Link>
              );
            })}
          </nav>

          <div className="ml-auto flex items-center gap-1.5">
            <button
              onClick={() => setPaletteOpen(true)}
              className="hidden lg:inline-flex items-center gap-2 h-8 px-2.5 rounded-md border border-border bg-muted/40 text-xs text-muted-foreground hover:bg-muted hover:border-foreground/20 transition-colors"
              aria-label={copy.commandPalette.title}
            >
              <span>{copy.nav.search}</span>
              <span className="kbd">{copy.nav.commandShortcut}</span>
            </button>

            <Button
              size="sm"
              onClick={() => setFormOpen(true)}
              className="gap-1.5 shadow-sm shadow-primary/20"
            >
              <Plus className="size-4" />
              <span className="hidden sm:inline">{copy.nav.newTicket}</span>
            </Button>

            <ThemeToggle />

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="hidden md:flex items-center gap-1.5 h-9 pl-1 pr-2 rounded-md hover:bg-accent transition-colors"
                  aria-label={copy.auth.menu.userMenu}
                >
                  <Avatar className="size-7">
                    <AvatarFallback className="text-[10px] font-semibold bg-primary/10 text-primary">
                      {initials(userName)}
                    </AvatarFallback>
                  </Avatar>
                  <ChevronDown className="size-3 text-muted-foreground" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-0.5">
                    <p className="text-sm font-medium leading-tight">{userName}</p>
                    {user.isAdmin && (
                      <p className="text-xs text-muted-foreground">{copy.auth.menu.admin}</p>
                    )}
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => setPasswordDialogOpen(true)}>
                  <KeyRound className="size-4" />
                  {copy.auth.menu.changeOwnPassword}
                </DropdownMenuItem>
                {user.isAdmin && (
                  <DropdownMenuItem asChild>
                    <Link href="/configuracoes">
                      <Settings className="size-4" />
                      {copy.nav.links.settings}
                    </Link>
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onSelect={() => signOut({ callbackUrl: '/login' })}
                  className="text-destructive focus:text-destructive focus:bg-destructive/10"
                >
                  <LogOut className="size-4" />
                  {copy.auth.buttons.signOut}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setMobileOpen((open) => !open)}
              aria-label={copy.nav.mobileMenu}
            >
              {mobileOpen ? <X className="size-4" /> : <Menu className="size-4" />}
            </Button>
          </div>
        </div>

        {mobileOpen && (
          <div className="md:hidden border-t bg-background px-4 py-3 space-y-1">
            {NAV_LINKS.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  'flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors',
                  pathname === href
                    ? 'bg-accent text-foreground font-medium'
                    : 'text-muted-foreground hover:text-foreground hover:bg-accent/60',
                )}
              >
                <Icon className="size-4" />
                {label}
              </Link>
            ))}
            <button
              onClick={() => {
                setMobileOpen(false);
                setPasswordDialogOpen(true);
              }}
              className="flex w-full items-center gap-2 px-3 py-2 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-accent/60"
            >
              <KeyRound className="size-4" />
              {copy.auth.menu.changeOwnPassword}
            </button>
            {user.isAdmin && (
              <Link
                href="/configuracoes"
                onClick={() => setMobileOpen(false)}
                className="flex items-center gap-2 px-3 py-2 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-accent/60"
              >
                <Settings className="size-4" />
                {copy.nav.links.settings}
              </Link>
            )}
            <button
              onClick={() => signOut({ callbackUrl: '/login' })}
              className="flex w-full items-center gap-2 px-3 py-2 rounded-md text-sm text-destructive hover:bg-destructive/10"
            >
              <LogOut className="size-4" />
              {copy.nav.signOutWithName(userName)}
            </button>
          </div>
        )}
      </header>

      <TicketForm open={formOpen} onClose={() => setFormOpen(false)} users={users} />
      <CommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        onNewTicket={() => setFormOpen(true)}
        isAdmin={user.isAdmin}
        currentUserId={user.id}
      />
      {user.id && (
        <ChangePasswordDialog
          open={passwordDialogOpen}
          onOpenChange={setPasswordDialogOpen}
          targetUserId={user.id}
          targetUserName={userName}
          isSelf
        />
      )}
    </>
  );
}
