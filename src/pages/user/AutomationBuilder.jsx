import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import ReactFlow, { Background, Controls, MiniMap, ReactFlowProvider, useReactFlow } from 'reactflow';
import 'reactflow/dist/style.css';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  Check,
  ChevronRight,
  Copy,
  FlaskConical,
  Loader2,
  MoreHorizontal,
  Pause,
  Pencil,
  Play,
  Settings2,
  Trash2,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { cn } from '../../lib/utils';
import { automationsApi, claudePromptApi, templatesApi, workspaceMembersApi } from '../../lib/api';
import { useTags } from '../../lib/dataHooks';
import { ENV } from '../../lib/env';
import { StatusPill } from '../../components/ui/status-pill';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../../components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import TestRunPanel from '../../components/automations/TestRunPanel';
import { BuilderContext } from '../../components/automations/builder/builderContext';
import { edgeTypes, nodeTypes } from '../../components/automations/builder/flowTypes';
import { StepPicker } from '../../components/automations/builder/StepPicker';
import { StepInspector } from '../../components/automations/builder/StepInspector';
import { SettingsPanel } from '../../components/automations/builder/SettingsPanel';
import { ActivityPanel } from '../../components/automations/builder/ActivityPanel';
import { ACTIONS_BY_TYPE, DEFAULT_SETTINGS } from '../../components/automations/builder/catalog';
import {
  blankGraph,
  changeStepType,
  childEdges,
  deleteStep,
  insertStep,
  loadGraph,
  reachableIds,
  toPayload,
  updateNodeData,
  validateGraph,
} from '../../components/automations/builder/graph';

const PAGE = '-mx-4 -my-4 h-[calc(100vh-56px)] sm:-mx-6 sm:-my-6 sm:h-[calc(100vh-64px)] lg:-mx-8 lg:-my-8';

/** Step numbers in walking order, so cards read "Step 1, Step 2…" down each path. */
function numberSteps(nodes, edges) {
  const trigger = nodes.find((n) => n.type === 'trigger');
  const numbers = {};
  if (!trigger) return numbers;
  let n = 0;
  const queue = [trigger.id];
  const seen = new Set();
  while (queue.length) {
    const id = queue.shift();
    if (seen.has(id)) continue;
    seen.add(id);
    if (id !== trigger.id) numbers[id] = ++n;
    for (const e of childEdges(edges, id)) queue.push(e.target);
  }
  return numbers;
}

function IconButton({ icon, label, active, onClick, children }) {
  const Icon = icon;
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      className={cn(
        'inline-flex h-9 items-center gap-1.5 rounded-lg border px-3 text-[13px] font-medium transition-colors',
        active ? 'border-gray-900 bg-gray-900 text-white' : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50',
      )}
    >
      <Icon className="h-4 w-4" />
      <span className="hidden xl:inline">{children || label}</span>
    </button>
  );
}

function BuilderCanvas() {
  const { id: routeId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { fitView } = useReactFlow();

  const [automationId, setAutomationId] = useState(routeId === 'new' ? null : routeId);
  const [loading, setLoading] = useState(routeId !== 'new');
  const [name, setName] = useState('Untitled automation');
  const [description, setDescription] = useState('');
  const [folder, setFolder] = useState('');
  const [status, setStatus] = useState('draft');
  const [platform, setPlatform] = useState('whatsapp');
  const [graph, setGraph] = useState(blankGraph);
  const [savedSnapshot, setSavedSnapshot] = useState(null);
  const [saving, setSaving] = useState(false);
  const [editingName, setEditingName] = useState(false);

  const [selectedId, setSelectedId] = useState(null);
  const [panel, setPanel] = useState(null); // 'settings' | 'activity' | 'test'
  const [picker, setPicker] = useState(null); // {mode:'add', parentId, handle} | {mode:'change', nodeId} | {mode:'trigger'}
  const [showIssues, setShowIssues] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const loadedIdRef = useRef(null);

  const { nodes, edges } = graph;
  const trigger = nodes.find((n) => n.type === 'trigger');
  const settings = trigger?.data?.settings || DEFAULT_SETTINGS;

  const tagsQ = useTags();
  const templatesQ = useQuery({
    queryKey: ['whatsapp_templates'],
    queryFn: () => templatesApi.list(),
    staleTime: 5 * 60 * 1000,
    select: (data) => (Array.isArray(data) ? data : data?.templates ?? data?.data ?? []).filter((t) => t.status === 'APPROVED'),
  });
  const membersQ = useQuery({
    queryKey: ['workspace_members'],
    queryFn: () => (ENV.USE_MOCK ? [] : workspaceMembersApi.list()),
    staleTime: 60_000,
    select: (d) => (Array.isArray(d) ? d : d?.members ?? []),
  });

  /* ── Load ── */
  useEffect(() => {
    if (routeId === 'new') {
      setLoading(false);
      setPicker({ mode: 'trigger' });
      return;
    }
    // After the first save of a new automation the URL changes to its id; the
    // graph on screen is already that automation, so don't reload over edits.
    if (loadedIdRef.current === routeId) return;
    let cancelled = false;
    setLoading(true);
    automationsApi
      .get(routeId)
      .then((auto) => {
        if (cancelled) return;
        if (!auto?.id) {
          toast.error('Automation not found');
          navigate('/automations', { replace: true });
          return;
        }
        const { nodes: n, edges: e, repaired } = loadGraph(auto.nodes, auto.edges);
        loadedIdRef.current = auto.id;
        setAutomationId(auto.id);
        setName(auto.name || 'Untitled automation');
        setDescription(auto.description || '');
        setFolder(auto.folder || '');
        setStatus(auto.status || 'draft');
        setPlatform(auto.platform || 'whatsapp');
        setGraph({ nodes: n, edges: e });
        const snapshot = JSON.stringify({ ...toPayload(n, e), name: auto.name || 'Untitled automation', description: auto.description || '', folder: auto.folder || '' });
        // Repaired links are real changes the user should save.
        setSavedSnapshot(repaired ? null : snapshot);
        if (repaired) {
          toast(`Reconnected ${repaired} step${repaired === 1 ? '' : 's'} that had come loose. Review and save.`, { icon: '🔗', duration: 6000 });
        }
        requestAnimationFrame(() => fitView({ padding: 0.2, maxZoom: 1, minZoom: 0.75 }));
      })
      .catch((err) => toast.error(err.message || 'Could not load the automation'))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [routeId, navigate, fitView]);

  const payload = useMemo(() => toPayload(nodes, edges), [nodes, edges]);
  const snapshot = useMemo(() => JSON.stringify({ ...payload, name, description, folder }), [payload, name, description, folder]);
  const dirty = snapshot !== savedSnapshot;
  const issues = useMemo(() => validateGraph(nodes, edges), [nodes, edges]);
  const issuesById = useMemo(() => {
    const map = {};
    for (const i of issues) if (i.nodeId) (map[i.nodeId] ||= []).push(i.message);
    return map;
  }, [issues]);
  const stepNumbers = useMemo(() => numberSteps(nodes, edges), [nodes, edges]);
  const childHandles = useMemo(() => {
    const map = {};
    for (const e of edges) (map[e.source] ||= {})[e.sourceHandle || 'default'] = true;
    return map;
  }, [edges]);

  // Leaving with unsaved changes loses them — ask first.
  useEffect(() => {
    if (!dirty) return undefined;
    const onUnload = (e) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', onUnload);
    return () => window.removeEventListener('beforeunload', onUnload);
  }, [dirty]);

  /* ── Graph edits ── */
  const applyGraph = useCallback((result, focusId) => {
    if (result.error) {
      toast.error(result.error);
      return false;
    }
    setGraph({ nodes: result.nodes, edges: result.edges });
    if (focusId !== undefined) setSelectedId(focusId);
    return true;
  }, []);

  const onPick = (type) => {
    if (!picker) return;
    if (picker.mode === 'trigger') {
      const t = nodes.find((n) => n.type === 'trigger');
      setGraph((g) => ({
        ...g,
        nodes: updateNodeData(g.nodes, t.id, { triggerType: type, keyword: '', status: '', keywordMode: undefined }),
      }));
      setSelectedId(t.id);
      setPanel(null);
    } else if (picker.mode === 'change') {
      applyGraph(changeStepType(nodes, edges, picker.nodeId, type), picker.nodeId);
    } else {
      const result = insertStep(nodes, edges, { parentId: picker.parentId, handle: picker.handle, actionType: type });
      applyGraph(result, result.id);
      setPanel(null);
    }
    setPicker(null);
  };

  const onChangeSelected = (patch) => setGraph((g) => ({ ...g, nodes: updateNodeData(g.nodes, selectedId, patch) }));

  const onDeleteSelected = () => {
    if (applyGraph(deleteStep(nodes, edges, selectedId), null)) toast.success('Step deleted');
  };

  const onSettings = (next) => {
    if (!trigger) return;
    setGraph((g) => ({ ...g, nodes: updateNodeData(g.nodes, trigger.id, { settings: next }) }));
  };

  const context = useMemo(
    () => ({
      selectedId,
      issuesById,
      stepNumbers,
      childHandles,
      readOnly: false,
      onAdd: ({ parentId, handle }) => setPicker({ mode: 'add', parentId, handle }),
      onInsertOnEdge: ({ source, sourceHandle }) => setPicker({ mode: 'add', parentId: source, handle: sourceHandle }),
    }),
    [selectedId, issuesById, stepNumbers, childHandles],
  );

  /* ── Save ── */
  const save = useCallback(
    async (nextStatus = status) => {
      if (saving) return false;
      if (nextStatus === 'live' && issues.length) {
        setShowIssues(true);
        toast.error(`Fix ${issues.length} issue${issues.length === 1 ? '' : 's'} before going live`);
        return false;
      }
      const body = { name: name.trim() || 'Untitled automation', description, folder, status: nextStatus, platform, ...payload };
      setSaving(true);
      try {
        if (automationId) {
          await automationsApi.update(automationId, body);
        } else {
          const created = await automationsApi.create(body);
          if (!created?.id) throw new Error('The automation was not created');
          // create ignores the folder, so write it straight after.
          if (folder) await automationsApi.update(created.id, { folder });
          loadedIdRef.current = created.id;
          setAutomationId(created.id);
          navigate(`/automations/${created.id}`, { replace: true });
        }
        setStatus(nextStatus);
        setSavedSnapshot(JSON.stringify({ ...payload, name: body.name, description, folder }));
        if (body.name !== name) setName(body.name);
        queryClient.invalidateQueries({ queryKey: ['automations'] });
        toast.success(
          nextStatus === 'live' && status !== 'live'
            ? 'Automation is live'
            : nextStatus === 'paused' && status !== 'paused'
              ? 'Automation paused'
              : 'Saved',
        );
        return true;
      } catch (err) {
        toast.error(err.message || 'Could not save');
        return false;
      } finally {
        setSaving(false);
      }
    },
    [saving, status, issues.length, name, description, folder, platform, payload, automationId, navigate, queryClient],
  );

  useEffect(() => {
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        save();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [save]);

  const goBack = () => {
    if (dirty && !window.confirm('You have unsaved changes. Leave without saving?')) return;
    navigate('/automations');
  };

  const duplicate = async () => {
    if (!automationId) return;
    try {
      let copy;
      try {
        copy = await automationsApi.duplicate(automationId);
      } catch (err) {
        if (err?.status !== 404) throw err;
        copy = await automationsApi.create({ name: `${name} (copy)`, description, status: 'draft', platform, ...payload });
      }
      toast.success('Duplicated as a draft');
      queryClient.invalidateQueries({ queryKey: ['automations'] });
      if (copy?.id) {
        loadedIdRef.current = null;
        navigate(`/automations/${copy.id}`);
      }
    } catch (err) {
      toast.error(err.message || 'Could not duplicate');
    }
  };

  const remove = async () => {
    try {
      if (automationId) await automationsApi.delete(automationId);
      setSavedSnapshot(snapshot);
      queryClient.invalidateQueries({ queryKey: ['automations'] });
      toast.success('Automation deleted');
      navigate('/automations', { replace: true });
    } catch (err) {
      toast.error(err.message || 'Could not delete');
    }
  };

  const selectedNode = nodes.find((n) => n.id === selectedId);
  const reachable = useMemo(() => reachableIds(nodes, edges), [nodes, edges]);
  const stepCount = nodes.filter((n) => n.type === 'action' && reachable.has(n.id)).length;
  const rightPanel = selectedNode ? 'inspector' : panel;

  if (loading) {
    return (
      <div className={cn(PAGE, 'flex items-center justify-center bg-[#F7F8FA]')}>
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className={cn(PAGE, 'flex flex-col bg-[#F7F8FA]')}>
      {/* Header */}
      <header className="flex h-16 shrink-0 items-center gap-3 border-b border-gray-200 bg-white px-4 sm:px-6">
        <button type="button" onClick={goBack} aria-label="Back to automations" className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-900">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="min-w-0 flex-1">
          <div className="hidden items-center gap-1 text-xs text-gray-400 sm:flex">
            <button type="button" onClick={goBack} className="hover:text-gray-600">
              Automations
            </button>
            <ChevronRight className="h-3 w-3" />
            <span className="truncate">{folder || 'All'}</span>
          </div>
          <div className="flex min-w-0 items-center gap-2">
            {editingName ? (
              <input
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                onBlur={() => setEditingName(false)}
                onKeyDown={(e) => (e.key === 'Enter' || e.key === 'Escape') && setEditingName(false)}
                className="h-8 w-full max-w-md rounded-md border border-gray-300 px-2 text-base font-semibold text-gray-900 focus:border-[#25D366] focus:outline-none focus:ring-2 focus:ring-[#25D366]/20"
              />
            ) : (
              <button type="button" onClick={() => setEditingName(true)} className="group flex min-w-0 items-center gap-1.5" title="Rename">
                <span className="truncate text-base font-semibold text-gray-900">{name}</span>
                <Pencil className="h-3.5 w-3.5 shrink-0 text-gray-400 opacity-0 group-hover:opacity-100" />
              </button>
            )}
            <StatusPill status={status} />
            <span className={cn('hidden shrink-0 text-xs md:inline', dirty ? 'text-amber-600' : 'text-gray-400')}>
              {saving ? 'Saving…' : dirty ? 'Unsaved changes' : 'All changes saved'}
            </span>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <IconButton icon={Settings2} label="Settings" active={rightPanel === 'settings'} onClick={() => { setSelectedId(null); setPanel(panel === 'settings' ? null : 'settings'); }} />
          <IconButton icon={Activity} label="Activity" active={rightPanel === 'activity'} onClick={() => { setSelectedId(null); setPanel(panel === 'activity' ? null : 'activity'); }} />
          <IconButton icon={FlaskConical} label="Test" active={panel === 'test'} onClick={() => { setSelectedId(null); setPanel(panel === 'test' ? null : 'test'); }} />
          <button
            type="button"
            onClick={() => save()}
            disabled={saving || (!dirty && Boolean(automationId))}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 text-[13px] font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            Save
          </button>
          {status === 'live' ? (
            <button type="button" onClick={() => save('paused')} disabled={saving} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-amber-300 bg-amber-50 px-3 text-[13px] font-semibold text-amber-800 hover:bg-amber-100 disabled:opacity-50">
              <Pause className="h-4 w-4" />
              Pause
            </button>
          ) : (
            <button type="button" onClick={() => save('live')} disabled={saving} className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[#25D366] px-3.5 text-[13px] font-semibold text-white shadow-sm hover:bg-[#1fb85a] disabled:opacity-50">
              <Play className="h-4 w-4 fill-current" />
              {status === 'paused' ? 'Resume' : 'Go live'}
            </button>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button type="button" aria-label="More actions" className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-900">
                <MoreHorizontal className="h-5 w-5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              {status !== 'draft' ? (
                <DropdownMenuItem onSelect={() => save('draft')}>
                  <Pencil className="mr-2 h-4 w-4 text-gray-500" />
                  Move to drafts
                </DropdownMenuItem>
              ) : null}
              <DropdownMenuItem disabled={!automationId} onSelect={duplicate}>
                <Copy className="mr-2 h-4 w-4 text-gray-500" />
                Duplicate
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => setConfirmDelete(true)} className="text-red-600 focus:text-red-700">
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <div className="relative flex min-h-0 flex-1">
        <div className="relative min-w-0 flex-1">
          <BuilderContext.Provider value={context}>
            <ReactFlow
              nodes={nodes}
              edges={edges}
              nodeTypes={nodeTypes}
              edgeTypes={edgeTypes}
              onNodeClick={(_, node) => {
                setSelectedId(node.id);
                if (panel === 'test') setPanel(null);
              }}
              onPaneClick={() => setSelectedId(null)}
              nodesDraggable={false}
              nodesConnectable={false}
              edgesFocusable={false}
              deleteKeyCode={null}
              fitView
              fitViewOptions={{ padding: 0.2, maxZoom: 1, minZoom: 0.75 }}
              minZoom={0.3}
              maxZoom={1.5}
              proOptions={{ hideAttribution: true }}
            >
              <Background color="#D5DAE1" gap={20} size={1.2} />
              <Controls showInteractive={false} position="bottom-left" className="!rounded-lg !border !border-gray-200 !shadow-sm" />
              <MiniMap pannable zoomable position="bottom-right" className="!rounded-lg !border !border-gray-200" nodeColor={(n) => (n.type === 'trigger' ? '#8B5CF6' : '#94A3B8')} maskColor="rgba(247,248,250,0.7)" />
            </ReactFlow>
          </BuilderContext.Provider>

          {/* Health of the whole automation, at a glance */}
          <div className="pointer-events-none absolute left-4 top-4 flex">
            <button
              type="button"
              onClick={() => issues.length && setShowIssues((v) => !v)}
              className={cn(
                'pointer-events-auto inline-flex items-center gap-2 rounded-full border bg-white px-3.5 py-1.5 text-[13px] shadow-sm',
                issues.length ? 'border-amber-200 text-amber-800 hover:bg-amber-50' : 'border-gray-200 text-gray-600',
              )}
            >
              {issues.length ? <AlertTriangle className="h-4 w-4 text-amber-500" /> : <Check className="h-4 w-4 text-emerald-500" />}
              {issues.length
                ? `${issues.length} thing${issues.length === 1 ? '' : 's'} to fix`
                : `${stepCount} step${stepCount === 1 ? '' : 's'} · ready to go live`}
            </button>
          </div>
          {showIssues && issues.length ? (
            <div className="absolute left-4 top-14 z-20 w-[min(92%,26rem)] rounded-xl border border-gray-200 bg-white p-2 shadow-lg">
              {issues.map((issue, i) => {
                const node = nodes.find((n) => n.id === issue.nodeId);
                const label = !node
                  ? 'Automation'
                  : node.type === 'trigger'
                    ? 'Trigger'
                    : `${stepNumbers[node.id] ? `Step ${stepNumbers[node.id]} · ` : ''}${ACTIONS_BY_TYPE[node.data.actionType]?.label || 'Step'}`;
                return (
                  <button
                    key={`${issue.nodeId}-${i}`}
                    type="button"
                    onClick={() => {
                      if (node) {
                        setSelectedId(node.id);
                        setShowIssues(false);
                      }
                    }}
                    className="flex w-full items-start gap-2.5 rounded-lg px-3 py-2 text-left hover:bg-gray-50"
                  >
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                    <span>
                      <span className="block text-[13px] font-medium text-gray-900">{label}</span>
                      <span className="block text-xs text-gray-500">{issue.message}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          ) : null}

          {panel === 'test' && !selectedNode ? <TestRunPanel nodes={nodes} edges={edges} onClose={() => setPanel(null)} /> : null}
        </div>

        {rightPanel === 'inspector' ? (
          <StepInspector
            key={selectedNode.id}
            node={selectedNode}
            stepNumber={stepNumbers[selectedNode.id]}
            templates={templatesQ.data || []}
            templatesLoading={templatesQ.isLoading}
            tags={tagsQ.data || []}
            members={membersQ.data || []}
            onChange={onChangeSelected}
            onChangeType={() => setPicker(selectedNode.type === 'trigger' ? { mode: 'trigger' } : { mode: 'change', nodeId: selectedNode.id })}
            onDelete={onDeleteSelected}
            onClose={() => setSelectedId(null)}
          />
        ) : rightPanel === 'settings' ? (
          <SettingsPanel
            name={name}
            description={description}
            folder={folder}
            platform={platform}
            settings={settings}
            onDetails={(patch) => {
              if ('name' in patch) setName(patch.name);
              if ('description' in patch) setDescription(patch.description);
              if ('folder' in patch) setFolder(patch.folder);
            }}
            onSettings={onSettings}
            onClose={() => setPanel(null)}
          />
        ) : rightPanel === 'activity' ? (
          <ActivityPanel automationId={automationId} status={status} nodes={nodes} onClose={() => setPanel(null)} />
        ) : null}
      </div>

      <StepPicker
        open={Boolean(picker)}
        mode={picker?.mode === 'trigger' ? 'trigger' : 'action'}
        title={picker?.mode === 'change' ? 'Change this step' : undefined}
        currentType={
          picker?.mode === 'trigger'
            ? trigger?.data?.triggerType
            : picker?.mode === 'change'
              ? nodes.find((n) => n.id === picker.nodeId)?.data?.actionType
              : undefined
        }
        onPick={onPick}
        onClose={() => setPicker(null)}
      />

      <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <DialogContent className="w-[min(92vw,26rem)]">
          <DialogHeader>
            <DialogTitle>Delete this automation?</DialogTitle>
            <DialogDescription>
              “{name}” and its run history will be removed. Contacts part-way through it won&apos;t receive the remaining steps.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-2 flex justify-end gap-2">
            <button type="button" onClick={() => setConfirmDelete(false)} className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
              Cancel
            </button>
            <button type="button" onClick={remove} className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700">
              Delete
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ── Built-in AI auto-reply: a prompt, not a flow ─────────────────────────── */

function SystemAiReplyEditor() {
  const navigate = useNavigate();
  const [prompt, setPrompt] = useState('');
  const [saved, setSaved] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    claudePromptApi
      .get()
      .then((d) => {
        setPrompt(d?.prompt || '');
        setSaved(d?.prompt || '');
      })
      .catch(() => toast.error('Could not load the AI prompt'))
      .finally(() => setLoading(false));
  }, []);

  const save = async () => {
    if (!prompt.trim()) {
      toast.error('The prompt can’t be empty');
      return;
    }
    setSaving(true);
    try {
      await claudePromptApi.update(prompt);
      setSaved(prompt);
      toast.success('AI prompt saved');
    } catch (err) {
      toast.error(err.message || 'Could not save');
    } finally {
      setSaving(false);
    }
  };

  const steps = [
    ['Trigger', 'Any incoming WhatsApp text message'],
    ['AI', 'Claude reads the message with your instructions below'],
    ['Reply', 'Sends the answer on WhatsApp and records the intent'],
  ];

  return (
    <div className={cn(PAGE, 'flex flex-col bg-[#F7F8FA]')}>
      <header className="flex h-16 shrink-0 items-center gap-3 border-b border-gray-200 bg-white px-4 sm:px-6">
        <button type="button" onClick={() => navigate('/automations')} aria-label="Back" className="rounded-lg p-2 text-gray-500 hover:bg-gray-100">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="min-w-0 flex-1">
          <div className="text-xs text-gray-400">Automations · Built-in</div>
          <div className="flex items-center gap-2">
            <span className="text-base font-semibold text-gray-900">AI auto-reply</span>
            <StatusPill status="live" />
          </div>
        </div>
        <button type="button" onClick={save} disabled={saving || prompt === saved} className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-gray-900 px-4 text-[13px] font-semibold text-white hover:bg-gray-800 disabled:opacity-40">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
          Save prompt
        </button>
      </header>
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-3xl space-y-5 px-4 py-8 sm:px-6">
          <div className="grid gap-3 sm:grid-cols-3">
            {steps.map(([label, text], i) => (
              <div key={label} className="rounded-xl border border-gray-200 bg-white p-4">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                  {i + 1}. {label}
                </div>
                <div className="mt-1 text-sm text-gray-700">{text}</div>
              </div>
            ))}
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <div className="text-sm font-semibold text-gray-900">Instructions for the AI</div>
            <p className="mt-0.5 text-[13px] text-gray-500">
              Tell it who it is speaking for, what to offer, what it must never promise, and when to hand over to a person.
            </p>
            {loading ? (
              <div className="mt-4 h-72 animate-pulse rounded-lg bg-gray-100" />
            ) : (
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                rows={16}
                className="mt-4 w-full resize-y rounded-lg border border-gray-200 px-3 py-2.5 font-mono text-[13px] leading-relaxed text-gray-800 focus:border-[#25D366] focus:outline-none focus:ring-2 focus:ring-[#25D366]/20"
              />
            )}
            <div className="mt-2 text-right text-xs text-gray-400">{prompt.length.toLocaleString()} characters</div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function AutomationBuilderPage() {
  const { id } = useParams();
  if (id === 'system-ai-reply') return <SystemAiReplyEditor />;
  return (
    <ReactFlowProvider>
      <BuilderCanvas key={id === 'new' ? 'new' : 'existing'} />
    </ReactFlowProvider>
  );
}
