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
  Search,
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
import { BrandMark } from '@/components/brand/brand-mark';
import { KeyboardCheatSheet } from '@/components/keyboard-cheatsheet';
import type { User } from '@/db/schema';

const NAV_LINKS = [
  { href: '/', label: copy.nav.links.dashboard, icon: LayoutDashboard },
  { href: '/kanban', label: copy.nav.links.kanban, icon: Kanban },
  { href: '/tickets', label: copy.nav.links.tickets, icon: List },
] as const;

interface NavProps {
  user: {
    id?: string;
    name?: string | null;
    isAdmin?: boolean;
    username?: string;
  };
  users: Pick<User, 'id' | 'displayName'>[];
}

export function Nav({ user, users }: NavProps) {
  const pathname = usePathname();
  const [formOpen, setFormOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [cheatSheetOpen, setCheatSheetOpen] = useState(false);

  const handleKeydown = useCallback((event: KeyboardEvent) => {
    const target = event.target as HTMLElement | null;
    if (target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return;
    if (target?.isContentEditable) return;

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
    if (event.key === '?' || (event.shiftKey && event.key === '/')) {
      event.preventDefault();
      setCheatSheetOpen(true);
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
  const isActiveLink = (href: string) =>
    href === '/' ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);

  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b border-border/60 bg-background/90 backdrop-blur-xl supports-[backdrop-filter]:bg-background/80">
        <div className="mx-auto flex h-14 max-w-7xl items-center gap-3 px-4 sm:px-6">
          <Link
            href="/"
            className="group flex min-w-0 shrink-0 items-center gap-2.5 rounded-lg pr-1 font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            aria-label={`${copy.brand.name} – ${copy.brand.institution}`}
          >
            <BrandMark className="size-8 rounded-lg shadow-md shadow-primary/25 transition-transform group-hover:scale-105 group-hover:shadow-lg" />
            <div className="hidden min-w-0 sm:block">
              <span className="block text-sm leading-tight tracking-tight font-bold">
                Ticket<span className="text-primary">Anglo</span>
              </span>
              <span className="block truncate text-[10.5px] font-medium text-muted-foreground leading-tight">
                {copy.brand.institution}
              </span>
            </div>
          </Link>

          <nav className="ml-3 hidden items-center gap-0.5 rounded-lg border border-border/70 bg-card/80 p-1 shadow-xs md:flex">
            {NAV_LINKS.map(({ href, label, icon: Icon }) => {
              const active = isActiveLink(href);
              return (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    'flex h-8 items-center gap-1.5 rounded-md px-3 text-sm font-medium transition-all',
                    active
                      ? 'bg-primary text-primary-foreground shadow-sm shadow-primary/20'
                      : 'text-muted-foreground hover:bg-accent hover:text-foreground',
                  )}
                >
                  <Icon className="size-3.5" />
                  {label}
                </Link>
              );
            })}
          </nav>

          <div className="ml-auto flex items-center gap-1.5">
            <button
              onClick={() => setPaletteOpen(true)}
              className="hidden h-8 items-center gap-2 rounded-md border border-border/80 bg-card/90 px-3 text-xs font-medium text-muted-foreground shadow-xs transition-all hover:border-foreground/20 hover:bg-accent hover:text-foreground lg:inline-flex"
              aria-label={copy.commandPalette.title}
            >
              <Search className="size-3.5" />
              <span>{copy.nav.search}</span>
              <span className="kbd">{copy.nav.commandShortcut}</span>
            </button>

            <Button
              size="sm"
              onClick={() => setFormOpen(true)}
              className="gap-1.5 h-8 shadow-sm shadow-primary/20"
            >
              <Plus className="size-4" />
              <span className="hidden sm:inline">{copy.nav.newTicket}</span>
            </Button>

            <ThemeToggle />

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="hidden h-10 items-center gap-2 rounded-md border border-transparent pl-1.5 pr-2 transition-colors hover:border-border hover:bg-card md:flex"
                  aria-label={copy.auth.menu.userMenu}
                >
                  <Avatar className="size-8">
                    <AvatarFallback className="bg-primary/10 text-[10px] font-semibold text-primary">
                      {initials(userName)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="max-w-28 truncate text-sm font-medium">{userName}</span>
                  <ChevronDown className="size-3.5 text-muted-foreground" />
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
              aria-expanded={mobileOpen}
            >
              {mobileOpen ? <X className="size-4" /> : <Menu className="size-4" />}
            </Button>
          </div>
        </div>

        {mobileOpen && (
          <div className="border-t border-border/70 bg-background/95 px-4 py-3 shadow-lg md:hidden">
            <div className="mb-3 flex items-center gap-3 rounded-lg border bg-card p-3">
              <Avatar className="size-9">
                <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
                  {initials(userName)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{userName}</p>
                {user.isAdmin && (
                  <p className="text-xs text-muted-foreground">{copy.auth.menu.admin}</p>
                )}
              </div>
            </div>
            <div className="space-y-1">
            {NAV_LINKS.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  'flex items-center gap-2 rounded-md px-3 py-2.5 text-sm font-medium transition-colors',
                  isActiveLink(href)
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-accent hover:text-foreground',
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
          </div>
        )}
      </header>

      <KeyboardCheatSheet open={cheatSheetOpen} onOpenChange={setCheatSheetOpen} />
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
