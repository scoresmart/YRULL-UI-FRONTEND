import { ArrowUpDown, Check, ChevronDown, Filter, MessageCircle, Plus } from 'lucide-react';
import { Button } from './button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from './dropdown-menu';
import { cn } from '../../lib/utils';

function MenuButton({ icon: Icon, label, className, full }) {
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className={cn(
        'h-9 gap-1.5 rounded-lg border-gray-200 px-2.5 text-xs font-medium text-gray-700',
        full ? 'w-full justify-between' : '',
        className,
      )}
    >
      <span className="flex min-w-0 items-center gap-1.5">
        <Icon className="h-3.5 w-3.5 shrink-0 text-gray-500" />
        <span className="truncate">{label}</span>
      </span>
      <ChevronDown className="h-3.5 w-3.5 shrink-0 text-gray-400" />
    </Button>
  );
}

function PickMenu({ icon, value, options, onChange, className, full }) {
  const selected = options.find((item) => item.value === value) || options[0];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <div className={cn(full ? 'w-full' : '')}>
          <MenuButton icon={icon} label={selected?.label || 'Select'} className={className} full={full} />
        </div>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        {options.map((option) => (
          <DropdownMenuItem key={option.value} onClick={() => onChange(option.value)}>
            <Check className={cn('h-4 w-4', option.value === selected?.value ? 'opacity-100' : 'opacity-0')} />
            {option.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function InboxFiltersBar({
  scopeValue,
  onScopeChange,
  scopeOptions,
  unreadActive,
  onToggleUnread,
  unreadLabel = 'Unread',
  sortValue,
  onSortChange,
  sortOptions,
  channelValue,
  onChannelChange,
  channelOptions,
  onAdvancedFilter,
  showChannel = true,
  showFilter = true,
  compact = false,
  className,
}) {
  return (
    <div
      className={cn(
        compact ? 'grid grid-cols-2 gap-2' : 'flex flex-wrap items-center gap-2',
        className,
      )}
    >
      <PickMenu
        icon={MessageCircle}
        value={scopeValue}
        options={scopeOptions}
        onChange={onScopeChange}
        full={compact}
      />

      <Button
        type="button"
        variant={unreadActive ? 'default' : 'outline'}
        size="sm"
        className={cn(
          'h-9 rounded-lg px-3 text-xs font-medium',
          compact ? 'w-full justify-center' : '',
          unreadActive
            ? 'bg-gray-900 text-white hover:bg-gray-800'
            : 'border-gray-200 text-gray-700',
        )}
        onClick={onToggleUnread}
      >
        {unreadLabel}
      </Button>

      <PickMenu
        icon={ArrowUpDown}
        value={sortValue}
        options={sortOptions}
        onChange={onSortChange}
        full={compact}
      />
      {showChannel && (
        <PickMenu
          icon={MessageCircle}
          value={channelValue}
          options={channelOptions}
          onChange={onChannelChange}
          full={compact}
        />
      )}

      {showFilter && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className={cn(
            'h-9 gap-1.5 rounded-lg border-gray-200 px-3 text-xs font-medium text-gray-700',
            compact ? 'w-full justify-center' : '',
          )}
          onClick={onAdvancedFilter}
        >
          <Plus className="h-3.5 w-3.5" />
          Filter
          <Filter className="h-3.5 w-3.5 text-gray-400" />
        </Button>
      )}
    </div>
  );
}
