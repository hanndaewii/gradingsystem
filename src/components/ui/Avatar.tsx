'use client';

import * as React from 'react';
import * as AvatarPrimitive from '@radix-ui/react-avatar';
import { cn } from '@/lib/utils';

export interface AvatarProps extends React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Root> {
  src?: string | null;
  alt?: string;
  fallback?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  status?: 'online' | 'offline' | 'busy' | 'away';
  statusPosition?: 'bottom-right' | 'top-right' | 'bottom-left' | 'top-left';
  shape?: 'circle' | 'square';
}

const sizes = {
  xs: 'h-6 w-6 text-[10px]',
  sm: 'h-8 w-8 text-[11px]',
  md: 'h-10 w-10 text-body-sm',
  lg: 'h-12 w-12 text-body',
  xl: 'h-16 w-16 text-heading-md',
  '2xl': 'h-24 w-24 text-heading-xl',
};

const statusSizes = {
  xs: 'h-1.5 w-1.5',
  sm: 'h-2 w-2',
  md: 'h-2.5 w-2.5',
  lg: 'h-3 w-3',
  xl: 'h-4 w-4',
  '2xl': 'h-5 w-5',
};

const statusColors = {
  online: 'bg-semantic-status-success',
  offline: 'bg-semantic-text-tertiary',
  busy: 'bg-semantic-status-error',
  away: 'bg-semantic-status-warning',
};

const statusPositions = {
  'bottom-right': 'bottom-0 right-0',
  'top-right': 'top-0 right-0',
  'bottom-left': 'bottom-0 left-0',
  'top-left': 'top-0 left-0',
};

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

const Avatar = React.forwardRef<HTMLDivElement, AvatarProps>(
  (
    {
      className,
      src,
      alt,
      fallback,
      size = 'md',
      status,
      statusPosition = 'bottom-right',
      shape = 'circle',
      ...props
    },
    ref
  ) => {
    const sizesKey = size as keyof typeof sizes;
    const statusSizesKey = size as keyof typeof statusSizes;

    const imageFallback = fallback || (alt ? getInitials(alt) : '?');

    return (
      <AvatarPrimitive.Root
        ref={ref}
        className={cn(
          'relative inline-flex shrink-0 overflow-hidden',
          sizes[sizesKey],
          shape === 'circle' ? 'rounded-full' : 'rounded-xl',
          className
        )}
        {...props}
      >
        <AvatarPrimitive.Image
          src={src}
          alt={alt || ''}
          className="aspect-square h-full w-full object-cover"
          onError={(e) => {
            e.currentTarget.style.display = 'none';
          }}
        />
        <AvatarPrimitive.Fallback
          className={cn(
            'flex items-center justify-center bg-semantic-brand-primary/10 text-semantic-brand-primary font-medium',
            'h-full w-full'
          )}
          delayMs={100}
        >
          {imageFallback}
        </AvatarPrimitive.Fallback>
        {status && (
          <span
            className={cn(
              'absolute rounded-full border-2 border-semantic-bg-primary',
              statusColors[status],
              statusSizes[statusSizesKey],
              statusPositions[statusPosition]
            )}
            aria-label={`Status: ${status}`}
          />
        )}
      </AvatarPrimitive.Root>
    );
  }
);

Avatar.displayName = AvatarPrimitive.Root.displayName;

export interface AvatarGroupProps {
  avatars: Array<{
    src?: string | null;
    alt?: string;
    fallback?: string;
    size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
    status?: 'online' | 'offline' | 'busy' | 'away';
  }>;
  max?: number;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  className?: string;
}

export const AvatarGroup = React.forwardRef<HTMLDivElement, AvatarGroupProps>(
  ({ className, avatars, max = 5, size = 'md', ...props }, ref) => {
    const visibleAvatars = avatars.slice(0, max);
    const remainingCount = avatars.length - max;

    const sizesKey = size as keyof typeof sizes;

    return (
      <div ref={ref} className={cn('flex -space-x-2', className)} {...props}>
        {visibleAvatars.map((avatar, index) => (
          <Avatar
            key={index}
            src={avatar.src}
            alt={avatar.alt}
            fallback={avatar.fallback}
            size={avatar.size || size}
            status={avatar.status}
            className={cn(
              'ring-2 ring-semantic-bg-primary',
              index === 0 && 'z-10'
            )}
          />
        ))}
        {remainingCount > 0 && (
          <div
            className={cn(
              'flex items-center justify-center bg-semantic-bg-tertiary text-semantic-text-secondary font-medium border-2 border-semantic-bg-primary',
              sizes[sizesKey],
              'rounded-full'
            )}
          >
            +{remainingCount}
          </div>
        )}
      </div>
    );
  }
);

AvatarGroup.displayName = 'AvatarGroup';

export { Avatar };