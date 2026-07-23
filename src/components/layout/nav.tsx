'use client';

import { useCallback, useEffect, useState, useTransition } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
  Activity,
  CalendarDays,
  ChevronDown,
  FileInput,
  Kanban,
  Laptop2,
  KeyRound,
  LayoutDashboard,
  List,
  LogOut,
  Megaphone,
  Menu,
  MessageSquareQuote,
  MoreHorizontal,
  Plus,
  Search,
  Settings,
  UserRound,
  UsersRound,
  X,
} from 'lucide-react';
import { logoutAction } from '@/actions/auth';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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
import { NotificationBell } from '@/components/notifications/notification-bell';
import type { User } from '@/db/schema';

const PRIMARY_NAV_LINKS = [
  { href: '/', label: copy.nav.links.dashboard, icon: LayoutDashboard },
  { href: '/kanban', label: copy.nav.links.kanban, icon: Kanban },
  { href: '/tickets', label: copy.nav.links.tickets, icon: List },
  { href: '/agendamentos', label: copy.nav.links.schedules, icon: CalendarDays },
] as const;

const TOOL_NAV_LINKS = [
  { href: '/respostas-rapidas', label: copy.nav.links.quickResponses, icon: MessageSquareQuote },
  { href: '/equipe', label: copy.nav.links.team, icon: UsersRound },
  { href: '/marketing', label: copy.nav.links.marketing, icon: Megaphone },
  { href: '/solicitacoes-publicas', label: copy.nav.links.publicRequests, icon: FileInput },
  { href: '/chromebooks', label: copy.nav.links.chromebooks, icon: Laptop2 },
  { href: '/atividade', label: copy.nav.links.activity, icon: Activity },
] as const;

interface NavProps {
  user: {
    id?: string;
    name?: string | null;
    isAdmin?: boolean;
    username?: string;
    role?: string | null;
    area?: 'TI' | 'MKT' | 'PF' | null;
    avatarUrl?: string | null;
  };
  users: Pick<User, 'id' | 'displayName' | 'role' | 'area' | 'avatarUrl'>[];
}

export function Nav({ user, users }: NavProps) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [formOpen, setFormOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [cheatSheetOpen, setCheatSheetOpen] = useState(false);
  const [isSigningOut, startSignOut] = useTransition();
  const shouldOpenTicketForm = searchParams.get('novo') === '1';

  const closeTicketForm = useCallback(() => {
    setFormOpen(false);
    if (!shouldOpenTicketForm) return;

    const params = new URLSearchParams(searchParams.toString());
    params.delete('novo');
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }, [pathname, router, searchParams, shouldOpenTicketForm]);

  const openTicketForm = useCallback(() => {
    setMobileOpen(false);
    setFormOpen(true);
  }, []);

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

  useEffect(() => {
    if (shouldOpenTicketForm) setFormOpen(true);
  }, [shouldOpenTicketForm]);

  const userName = user.name ?? copy.dashboard.greeting.fallbackName;
  const isActiveLink = (href: string) =>
    href === '/' ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
  const handleSignOut = () => {
    startSignOut(async () => {
      await logoutAction();
      setMobileOpen(false);
      router.push('/login');
      router.refresh();
    });
  };

  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b border-border/60 bg-background/90 backdrop-blur-xl supports-[backdrop-filter]:bg-background/80">
        <div className="safe-auth-x mx-auto flex h-14 max-w-7xl items-center gap-2 sm:gap-3">
          <Link
            href="/"
            className="group flex min-w-0 shrink-0 items-center gap-2.5 rounded-lg pr-1 font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            aria-label={`${copy.brand.name} – ${copy.brand.institution}`}
          >
            <BrandMark className="size-8 rounded-lg shadow-md shadow-primary/25 transition-transform group-hover:scale-105 group-hover:shadow-lg" />
            <div className="hidden min-w-0 sm:block">
              <span className="block text-sm leading-tight tracking-tight font-bold">
                Helper
              </span>
              <span className="block truncate text-[10.5px] font-medium text-muted-foreground leading-tight">
                {copy.brand.institution}
              </span>
            </div>
          </Link>

          <nav className="ml-3 hidden min-w-0 flex-1 items-center gap-0.5 overflow-x-auto rounded-lg border border-border/70 bg-card/80 p-1 shadow-xs xl:flex">
            {PRIMARY_NAV_LINKS.map(({ href, label, icon: Icon }) => {
              const active = isActiveLink(href);
              return (
                <Link
                  key={href}
                  href={href}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'flex h-8 shrink-0 items-center gap-1.5 rounded-md px-3 text-sm font-medium transition-all',
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
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className={cn(
                    'flex h-8 shrink-0 items-center gap-1.5 rounded-md px-3 text-sm font-medium transition-all',
                    TOOL_NAV_LINKS.some(({ href }) => isActiveLink(href))
                      ? 'bg-primary text-primary-foreground shadow-sm shadow-primary/20'
                      : 'text-muted-foreground hover:bg-accent hover:text-foreground',
                  )}
                >
                  <MoreHorizontal className="size-3.5" />
                  Mais
                  <ChevronDown className="size-3" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-60">
                {TOOL_NAV_LINKS.map(({ href, label, icon: Icon }) => (
                  <DropdownMenuItem key={href} asChild>
                    <Link href={href}>
                      <Icon className="size-4" />
                      {label}
                    </Link>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </nav>

          <div className="ml-auto flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setPaletteOpen(true)}
              className="hidden h-8 items-center gap-2 rounded-md border border-border/80 bg-card/90 px-3 text-xs font-medium text-muted-foreground shadow-xs transition-all hover:border-foreground/20 hover:bg-accent hover:text-foreground 2xl:inline-flex"
              aria-label={copy.commandPalette.title}
            >
              <Search className="size-3.5" />
              <span>{copy.nav.search}</span>
              <span className="kbd">{copy.nav.commandShortcut}</span>
            </button>

            <Button
              size="sm"
              onClick={openTicketForm}
              className="h-9 gap-1.5 px-2.5 shadow-sm shadow-primary/20 sm:px-3"
              aria-label={copy.nav.newTicket}
            >
              <Plus className="size-4" />
              <span className="hidden sm:inline">{copy.nav.newTicket}</span>
            </Button>

            <ThemeToggle />
            <NotificationBell />

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="hidden h-10 items-center gap-2 rounded-md border border-transparent pl-1.5 pr-2 transition-colors hover:border-border hover:bg-card lg:flex"
                  aria-label={copy.auth.menu.userMenu}
                >
                  <Avatar className="size-8">
                    {user.avatarUrl && <AvatarImage src={user.avatarUrl} alt="" />}
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
                    <p className="text-[11px] text-muted-foreground">{copy.brand.versionLabel}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/minha-conta">
                    <UserRound className="size-4" />
                    {copy.nav.links.account}
                  </Link>
                </DropdownMenuItem>
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
                  onSelect={(event) => {
                    event.preventDefault();
                    handleSignOut();
                  }}
                  disabled={isSigningOut}
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
              className="xl:hidden"
              onClick={() => setMobileOpen((open) => !open)}
              aria-label={copy.nav.mobileMenu}
              aria-expanded={mobileOpen}
              aria-controls="mobile-navigation"
            >
              {mobileOpen ? (
                <X className="size-4" aria-hidden="true" />
              ) : (
                <Menu className="size-4" aria-hidden="true" />
              )}
            </Button>
          </div>
        </div>

        {mobileOpen && (
          <div
            id="mobile-navigation"
            className="safe-auth-x max-h-[calc(100svh-3.5rem)] overflow-y-auto border-t border-border/70 bg-background/95 py-3 shadow-lg xl:hidden"
          >
            <div className="mb-3 flex items-center gap-3 rounded-lg border bg-card p-3">
              <Avatar className="size-9">
                {user.avatarUrl && <AvatarImage src={user.avatarUrl} alt="" />}
                <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
                  {initials(userName)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{userName}</p>
                {user.isAdmin && (
                  <p className="text-xs text-muted-foreground">{copy.auth.menu.admin}</p>
                )}
                <p className="text-[11px] text-muted-foreground">{copy.brand.versionLabel}</p>
              </div>
            </div>
            <div className="space-y-1">
            <button
              type="button"
              onClick={() => {
                setMobileOpen(false);
                setPaletteOpen(true);
              }}
              className="flex w-full items-center gap-2 rounded-md px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              <Search className="size-4" />
              {copy.nav.search}
            </button>
            {[...PRIMARY_NAV_LINKS, ...TOOL_NAV_LINKS].map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                aria-current={isActiveLink(href) ? 'page' : undefined}
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
            <Link
              href="/minha-conta"
              aria-current={isActiveLink('/minha-conta') ? 'page' : undefined}
              onClick={() => setMobileOpen(false)}
              className={cn(
                'flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors',
                isActiveLink('/minha-conta')
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-accent/60 hover:text-foreground',
              )}
            >
              <UserRound className="size-4" />
              {copy.nav.links.account}
            </Link>
            <button
              type="button"
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
                aria-current={isActiveLink('/configuracoes') ? 'page' : undefined}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  'flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors',
                  isActiveLink('/configuracoes')
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-accent/60 hover:text-foreground',
                )}
              >
                <Settings className="size-4" />
                {copy.nav.links.settings}
              </Link>
            )}
            <button
              type="button"
              onClick={handleSignOut}
              disabled={isSigningOut}
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
      <TicketForm open={formOpen} onClose={closeTicketForm} users={users} />
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
