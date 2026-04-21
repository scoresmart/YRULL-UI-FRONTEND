import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import { RefreshCw, Loader2, Plus, Smartphone, MessageSquareText } from 'lucide-react';
import toast from 'react-hot-toast';
import { useWhatsAppIntegration } from '../../hooks/useWhatsAppIntegration';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { whatsappManagerApi, type WhatsAppTemplateListItem } from '../../lib/whatsappManagerApi';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Skeleton } from '../../components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '../../components/ui/dialog';
import { NumberCard } from '../../components/whatsapp-manager/NumberCard';
import { RegisterNumberModal } from '../../components/whatsapp-manager/RegisterNumberModal';
import { TemplateCard } from '../../components/whatsapp-manager/TemplateCard';
import { TemplateBuilderModal } from '../../components/whatsapp-manager/TemplateBuilderModal';
import { cn } from '../../lib/utils';

type TabId = 'numbers' | 'templates';

const STATUS_FILTERS = ['ALL', 'APPROVED', 'PENDING', 'REJECTED', 'PAUSED', 'DISABLED'] as const;

export function WhatsAppManagerPage() {
  useDocumentTitle('WhatsApp Manager');
  const queryClient = useQueryClient();
  const wa = useWhatsAppIntegration();
  const connectedPhoneId = (wa.status as { phone_number_id?: string } | null)?.phone_number_id;
  const [localActivePhoneId, setLocalActivePhoneId] = useState<string | null>(null);

  const [tab, setTab] = useState<TabId>('numbers');
  const [registerOpen, setRegisterOpen] = useState(false);
  const [builderOpen, setBuilderOpen] = useState(false);
  const [builderMode, setBuilderMode] = useState<'create' | 'edit'>('create');
  const [editTarget, setEditTarget] = useState<WhatsAppTemplateListItem | null>(null);
  const [dupSource, setDupSource] = useState<WhatsAppTemplateListItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<WhatsAppTemplateListItem | null>(null);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<(typeof STATUS_FILTERS)[number]>('ALL');
  const activePhoneId = connectedPhoneId || localActivePhoneId;

  const numbersQ = useQuery({
    queryKey: ['wa_manager_numbers'],
    queryFn: () => whatsappManagerApi.getNumbers(),
  });

  const templatesQ = useQuery({
    queryKey: ['wa_manager_templates'],
    queryFn: () => whatsappManagerApi.listTemplates(false),
  });

  const refreshMetaMut = useMutation({
    mutationFn: () => whatsappManagerApi.listTemplates(true),
    onSuccess: (data) => {
      queryClient.setQueryData(['wa_manager_templates'], data);
      toast.success('Templates refreshed from Meta');
    },
    onError: (e: Error) => toast.error(e.message || 'Refresh failed'),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => whatsappManagerApi.deleteTemplate(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['wa_manager_templates'] });
      const prev = queryClient.getQueryData<WhatsAppTemplateListItem[]>(['wa_manager_templates']);
      queryClient.setQueryData<WhatsAppTemplateListItem[]>(['wa_manager_templates'], (old) =>
        (old ?? []).filter((t) => t.id !== id),
      );
      return { prev };
    },
    onError: (e: Error, _id, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(['wa_manager_templates'], ctx.prev);
      toast.error(e.message || 'Delete failed');
    },
    onSuccess: () => {
      toast.success('Template deleted');
      setDeleteTarget(null);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['wa_manager_templates'] });
    },
  });

  const filteredTemplates = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = templatesQ.data ?? [];
    if (statusFilter !== 'ALL') {
      list = list.filter((t) => String(t.status || '').toUpperCase() === statusFilter);
    }
    if (!q) return list;
    return list.filter((t) => {
      const blob = `${t.name} ${t.language ?? ''} ${t.category ?? ''}`.toLowerCase();
      return blob.includes(q);
    });
  }, [templatesQ.data, search, statusFilter]);

  function openCreate() {
    setBuilderMode('create');
    setEditTarget(null);
    setDupSource(null);
    setBuilderOpen(true);
  }

  function openEdit(t: WhatsAppTemplateListItem) {
    setBuilderMode('edit');
    setEditTarget(t);
    setDupSource(null);
    setBuilderOpen(true);
  }

  function openDuplicate(t: WhatsAppTemplateListItem) {
    setBuilderMode('create');
    setEditTarget(null);
    setDupSource(t);
    setBuilderOpen(true);
  }

  return (
    <div
      className="-mx-4 -my-4 min-h-[calc(100vh-3.5rem)] bg-[#0D1117] px-4 py-6 font-['Sora',sans-serif] sm:-mx-6 sm:-my-6 sm:px-6 sm:py-8 lg:-mx-8 lg:-my-8 lg:px-8 lg:py-10"
    >
      <div className="mx-auto max-w-6xl">
        <header className="flex flex-col gap-4 border-b border-white/10 pb-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">WhatsApp Manager</h1>
            <p className="mt-1 max-w-xl text-sm text-gray-400">Manage numbers, templates, and approvals</p>
          </div>
          <Button
            type="button"
            onClick={() => refreshMetaMut.mutate()}
            disabled={refreshMetaMut.isPending}
            className="w-full gap-2 bg-[#00D4AA] text-[#0D1117] hover:bg-[#1D9E75] hover:text-white sm:w-auto"
          >
            {refreshMetaMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Refresh from Meta
          </Button>
        </header>

        <div className="mt-6 flex gap-2 rounded-2xl border border-white/10 bg-[#161B22]/60 p-1.5 backdrop-blur-sm">
          {(
            [
              { id: 'numbers' as const, label: 'Numbers', icon: Smartphone },
              { id: 'templates' as const, label: 'Templates', icon: MessageSquareText },
            ] as const
          ).map((item) => {
            const Icon = item.icon;
            const active = tab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setTab(item.id)}
                className={cn(
                  'relative flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition-colors',
                  active ? 'text-[#0D1117]' : 'text-gray-400 hover:text-white',
                )}
              >
                {active && (
                  <motion.span
                    layoutId="wa-tab-pill"
                    className="absolute inset-0 rounded-xl bg-[#00D4AA]"
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  />
                )}
                <span className="relative z-10 flex items-center gap-2">
                  <Icon className="h-4 w-4" />
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>

        <AnimatePresence mode="wait">
          {tab === 'numbers' && (
            <motion.section
              key="numbers"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className="mt-8 space-y-6"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <h2 className="text-lg font-semibold text-white">Connected numbers</h2>
                <Button
                  type="button"
                  variant="outline"
                  className="border-[#00D4AA]/40 bg-transparent text-[#00D4AA] hover:bg-[#00D4AA]/10"
                  onClick={() => setRegisterOpen(true)}
                >
                  <Plus className="h-4 w-4" />
                  Register New Number
                </Button>
              </div>

              {numbersQ.isLoading && (
                <div className="space-y-3">
                  {[0, 1, 2].map((i) => (
                    <Skeleton key={i} className="h-28 w-full rounded-2xl bg-white/5" />
                  ))}
                </div>
              )}

              {numbersQ.isError && (
                <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-6 text-center">
                  <p className="text-sm text-red-200">{(numbersQ.error as Error).message || 'Could not load numbers'}</p>
                  <Button type="button" className="mt-4 bg-white/10 text-white hover:bg-white/20" onClick={() => numbersQ.refetch()}>
                    Try again
                  </Button>
                </div>
              )}

              {numbersQ.isSuccess && (numbersQ.data?.length ?? 0) === 0 && (
                <div className="rounded-2xl border border-white/10 bg-[#161B22]/80 p-10 text-center">
                  <p className="text-sm text-gray-300">No WhatsApp numbers found for this workspace yet.</p>
                  <p className="mt-2 text-xs text-gray-500">Finish Meta Business onboarding, then refresh or register a number.</p>
                  <div className="mt-6 flex flex-wrap justify-center gap-2">
                    <Button type="button" className="bg-[#00D4AA] text-[#0D1117] hover:bg-[#1D9E75] hover:text-white" onClick={() => numbersQ.refetch()}>
                      Refresh list
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="border-white/20 text-gray-200 hover:bg-white/10"
                      onClick={() => setRegisterOpen(true)}
                    >
                      Register number
                    </Button>
                  </div>
                </div>
              )}

              {numbersQ.isSuccess && (numbersQ.data?.length ?? 0) > 0 && (
                <div className="space-y-3">
                  {numbersQ.data!.map((n, i) => (
                    <NumberCard
                      key={n.phone_number_id}
                      number={n}
                      index={i}
                      isActive={Boolean(activePhoneId && n.phone_number_id === activePhoneId)}
                      onCopied={() => toast.success('Phone number ID copied')}
                    />
                  ))}
                </div>
              )}

              <RegisterNumberModal
                open={registerOpen}
                onOpenChange={setRegisterOpen}
                numbers={numbersQ.data ?? []}
                numbersLoading={numbersQ.isLoading}
                onRegistered={(phoneNumberId) => {
                  setLocalActivePhoneId(phoneNumberId);
                  queryClient.invalidateQueries({ queryKey: ['wa_manager_numbers'] });
                  wa.refresh();
                }}
              />
            </motion.section>
          )}

          {tab === 'templates' && (
            <motion.section
              key="templates"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className="mt-8 space-y-6"
            >
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <Button type="button" onClick={openCreate} className="w-full gap-2 bg-[#00D4AA] text-[#0D1117] hover:bg-[#1D9E75] hover:text-white lg:w-auto">
                  <Plus className="h-4 w-4" />
                  Create Template
                </Button>
                <div className="relative max-w-md flex-1">
                  <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search name, language, category…"
                    className="border-white/10 bg-[#161B22] text-white placeholder:text-gray-600"
                  />
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {STATUS_FILTERS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setStatusFilter(s)}
                    className={cn(
                      'rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-wide transition',
                      statusFilter === s
                        ? 'border-[#00D4AA]/60 bg-[#00D4AA]/15 text-[#00D4AA]'
                        : 'border-white/10 text-gray-400 hover:border-white/25 hover:text-white',
                    )}
                  >
                    {s === 'ALL' ? 'All' : s.charAt(0) + s.slice(1).toLowerCase()}
                  </button>
                ))}
              </div>

              {templatesQ.isLoading && (
                <div className="grid gap-4 sm:grid-cols-2">
                  {[0, 1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-48 rounded-2xl bg-white/5" />
                  ))}
                </div>
              )}

              {templatesQ.isError && (
                <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-6 text-center">
                  <p className="text-sm text-red-200">{(templatesQ.error as Error).message || 'Could not load templates'}</p>
                  <Button type="button" className="mt-4 bg-white/10 text-white hover:bg-white/20" onClick={() => templatesQ.refetch()}>
                    Try again
                  </Button>
                </div>
              )}

              {templatesQ.isSuccess && filteredTemplates.length === 0 && (
                <div className="rounded-2xl border border-white/10 bg-[#161B22]/80 p-10 text-center">
                  <p className="text-sm text-gray-300">No templates match your filters.</p>
                    <Button
                      type="button"
                      variant="ghost"
                      className="mt-2 text-[#00D4AA] hover:bg-[#00D4AA]/10 hover:text-[#00D4AA]"
                      onClick={() => {
                        setSearch('');
                        setStatusFilter('ALL');
                      }}
                    >
                      Clear filters
                    </Button>
                </div>
              )}

              {templatesQ.isSuccess && filteredTemplates.length > 0 && (
                <div className="grid gap-4 sm:grid-cols-2">
                  {filteredTemplates.map((t, i) => (
                    <TemplateCard
                      key={t.id}
                      template={t}
                      index={i}
                      onEdit={openEdit}
                      onDuplicate={openDuplicate}
                      onDelete={setDeleteTarget}
                    />
                  ))}
                </div>
              )}
            </motion.section>
          )}
        </AnimatePresence>
      </div>

      <TemplateBuilderModal
        open={builderOpen}
        onOpenChange={(v) => {
          setBuilderOpen(v);
          if (!v) {
            setEditTarget(null);
            setDupSource(null);
          }
        }}
        mode={builderMode}
        template={editTarget}
        duplicateFrom={dupSource}
        onSuccess={({ mode: m }) => {
          if (m === 'edit' && editTarget) {
            const id = editTarget.id;
            queryClient.setQueryData<WhatsAppTemplateListItem[]>(['wa_manager_templates'], (old) =>
              (old ?? []).map((row) => (row.id === id ? { ...row, status: 'PENDING' } : row)),
            );
          } else {
            queryClient.invalidateQueries({ queryKey: ['wa_manager_templates'] });
          }
        }}
      />

      <Dialog open={Boolean(deleteTarget)} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <DialogContent className="max-w-md border border-white/10 bg-[#161B22] text-gray-100 [&>button]:text-gray-400 [&>button]:hover:bg-white/10">
          <DialogHeader>
            <DialogTitle className="text-white">Delete template</DialogTitle>
            <DialogDescription className="text-gray-400">
              This removes <span className="font-mono text-[#00D4AA]">{deleteTarget?.name}</span> from your workspace. Meta-side templates may need separate cleanup.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4 flex justify-end gap-2">
            <Button type="button" variant="outline" className="border-white/15 text-gray-200" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button
              type="button"
              className="bg-red-600 text-white hover:bg-red-700"
              disabled={deleteMut.isPending}
              onClick={() => deleteTarget && deleteMut.mutate(deleteTarget.id)}
            >
              {deleteMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Delete'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
