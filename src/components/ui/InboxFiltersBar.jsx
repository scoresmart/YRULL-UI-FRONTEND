import { ArrowUpDown, Check, ChevronDown, Filter, MessageCircle, Plus } from 'lucide-react';
import { Button } from './button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from './dropdown-menu';
import { cn } from '../../lib/utils';

function MenuButton({ icon: Icon, label, className }) {
  return (
    <Button type="button" variant="outline" size="sm" className={cn('h-10 gap-2 rounded-xl px-4', className)}>
      <Icon className="h-4 w-4" />
      <span>{label}</span>
      <ChevronDown className="h-4 w-4 text-gray-500" />
    </Button>
  );
}

function PickMenu({ icon, value, options, onChange, className }) {
  const selected = options.find((item) => item.value === value) || options[0];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <div>
          <MenuButton icon={icon} label={selected?.label || 'Select'} className={className} />
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
      <PickMenu icon={MessageCircle} value={scopeValue} options={scopeOptions} onChange={onScopeChange} />

      <Button
        type="button"
        variant={unreadActive ? 'default' : 'outline'}
        size="sm"
        className={cn(
          'h-10 rounded-xl px-4',
          compact ? 'w-full justify-center' : '',
          unreadActive ? 'bg-gray-900 text-white hover:bg-gray-800' : '',
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
        className={compact ? 'w-full justify-between' : ''}
      />
      <PickMenu
        icon={MessageCircle}
        value={channelValue}
        options={channelOptions}
        onChange={onChannelChange}
        className={compact ? 'w-full justify-between' : ''}
      />

      <Button
        type="button"
        variant="outline"
        size="sm"
        className={cn('h-10 gap-2 rounded-xl px-4', compact ? 'w-full justify-center' : '')}
        onClick={onAdvancedFilter}
      >
        <Plus className="h-4 w-4" />
        Filter
        <Filter className="h-4 w-4 text-gray-500" />
      </Button>
    </div>
  );
}
