'use client';

import * as React from 'react';
import { Menu, Search, Bell, Moon, Sun, User, LogOut, Settings, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from './Button';
import { Input } from './Input';
import { Avatar } from './Avatar';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuLabel } from './DropdownMenu';

export interface HeaderProps {
  user?: {
    name: string;
    email: string;
    avatar?: string;
    role?: string;
  };
  onMenuClick?: () => void;
  onSearch?: (query: string) => void;
  searchPlaceholder?: string;
  notifications?: Array<{
    id: string;
    title: string;
    description?: string;
    time: string;
    read?: boolean;
    onClick?: () => void;
  }>;
  onNotificationClick?: (notification: { id: string }) => void;
  onMarkAllRead?: () => void;
  className?: string;
  height?: number;
}

export const Header = React.forwardRef<HTMLHeaderElement, HeaderProps>(
  (
    {
      className,
      user,
      onMenuClick,
      onSearch,
      searchPlaceholder = 'Search...',
      notifications = [],
      onNotificationClick,
      onMarkAllRead,
      height = 64,
    },
    ref
  ) => {
    const [searchQuery, setSearchQuery] = React.useState('');

    const handleSearch = (e: React.FormEvent) => {
      e.preventDefault();
      onSearch?.(searchQuery);
    };

    const unreadCount = notifications.filter((n) => !n.read).length;

    return (
      <header
        ref={ref}
        className={cn(
          'fixed top-0 right-0 left-0 bg-component-card-bg/80 backdrop-blur-sm border-b border-component-card-border z-[var(--z-sticky)]',
          'transition-all duration-normal',
          className
        )}
        style={{ height, zIndex: 200 }}
        role="banner"
      >
        <div className="h-full px-4 sm:px-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4 flex-1 min-w-0">
            {onMenuClick && (
              <Button variant="ghost" size="icon" onClick={onMenuClick} aria-label="Toggle menu" className="lg:hidden">
                <Menu className="h-5 w-5" />
              </Button>
            )}

            <form onSubmit={handleSearch} className="relative w-full max-w-md hidden sm:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-semantic-text-tertiary" aria-hidden="true" />
              <Input
                type="search"
                placeholder={searchPlaceholder}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                size="sm"
                className="pl-10 w-full"
                aria-label="Search"
              />
            </form>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ''}`} className="relative">
                  <Bell className="h-5 w-5" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-[18px] h-5 px-1.5 text-[10px] font-semibold text-center rounded-full bg-semantic-status-error text-semantic-text-inverse">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-80 p-0">
                <div className="p-3 border-b border-component-card-border flex items-center justify-between">
                  <p className="font-semibold text-body-sm text-semantic-text-primary">Notifications</p>
                  {unreadCount > 0 && onMarkAllRead && (
                    <Button variant="ghost" size="sm" onClick={onMarkAllRead} className="text-body-sm">
                      Mark all read
                    </Button>
                  )}
                </div>
                {notifications.length === 0 ? (
                  <div className="p-6 text-center text-semantic-text-tertiary text-body-sm">No notifications</div>
                ) : (
                  <div className="max-h-96 overflow-y-auto">
                    {notifications.map((notification) => (
                      <DropdownMenuItem
                        key={notification.id}
                        onClick={() => onNotificationClick?.(notification)}
                        className={cn(
                          'p-3 hover:bg-semantic-bg-secondary flex flex-col gap-1',
                          !notification.read && 'bg-semantic-brand-primary/5'
                        )}
                        inset={false}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <p className={cn('font-medium text-body-sm truncate', !notification.read && 'font-semibold')}>
                            {notification.title}
                          </p>
                          <span className="text-[11px] text-semantic-text-tertiary whitespace-nowrap">{notification.time}</span>
                        </div>
                        {notification.description && (
                          <p className="text-body-sm text-semantic-text-secondary line-clamp-2">{notification.description}</p>
                        )}
                      </DropdownMenuItem>
                    ))}
                  </div>
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            <Button variant="ghost" size="icon" onClick={() => document.documentElement.classList.toggle('dark')} aria-label="Toggle theme">
              <Sun className="h-5 w-5 rotate-0 scale-100 transition-all duration-200 dark:rotate-90 dark:scale-0" />
              <Moon className="h-5 w-5 absolute rotate-90 scale-0 transition-all duration-200 dark:rotate-0 dark:scale-100" />
            </Button>

            {user && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="gap-2 pr-3" aria-label="User menu">
                    <Avatar src={user.avatar} alt={user.name} size="sm" />
                    <span className="hidden sm:block text-body-sm font-medium text-semantic-text-primary truncate max-w-[120px]">
                      {user.name}
                    </span>
                    <ChevronDown className="h-4 w-4 text-semantic-text-tertiary hidden sm:block" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel className="font-medium text-body-sm">Account</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => {}} inset>
                    <User className="h-4 w-4 mr-2" />
                    Profile
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => {}} inset>
                    <Settings className="h-4 w-4 mr-2" />
                    Settings
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => {}} inset className="text-semantic-status-error">
                    <LogOut className="h-4 w-4 mr-2" />
                    Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      </header>
    );
  }
);

Header.displayName = 'Header';