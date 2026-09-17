import { memo, useContext } from 'react';
import { BaseEdge, EdgeLabelRenderer, getSmoothStepPath, Handle, Position } from 'reactflow';
import { AlertTriangle, Plus, Zap } from 'lucide-react';
import { cn } from '../../../lib/utils';
import {
  ACTIONS_BY_TYPE,
  TONES,
  TRIGGERS_BY_TYPE,
  UNSUPPORTED_ACTION_LABELS,
  triggerSummary,
} from './catalog';
import { NODE_WIDTH } from './graph';
import { BuilderContext } from './builderContext';

const hiddenHandle = '!h-2 !w-2 !min-w-0 !border-0 !bg-transparent';

function AddButton({ label, onClick, className }) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick(e);
      }}
      className={cn(
        'nodrag nopan flex h-7 w-7 items-center justify-center rounded-full border border-gray-300 bg-white text-gray-500 shadow-sm transition-colors hover:border-[#25D366] hover:bg-[#25D366] hover:text-white',
        className,
      )}
      aria-label={label}
      title={label}
    >
      <Plus className="h-4 w-4" />
    </button>
  );
}

function Card({ id, tone, icon, eyebrow, title, summary, placeholder, issues, children }) {
  const { selectedId } = useContext(BuilderContext);
  const Icon = icon;
  const toneCls = TONES[tone] || TONES.slate;
  const selected = selectedId === id;
  return (
    <div
      style={{ width: NODE_WIDTH }}
      className={cn(
        'relative cursor-pointer rounded-xl border bg-white shadow-[0_1px_2px_rgba(16,24,40,0.06)] transition-shadow',
        selected ? cn('border-transparent ring-2', toneCls.ring, 'shadow-md') : 'border-gray-200 hover:shadow-md',
      )}
    >
      <div className={cn('absolute inset-y-0 left-0 w-1 rounded-l-xl', toneCls.bar)} />
      <div className="flex items-start gap-3 py-3.5 pl-5 pr-4">
        <div className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-lg', toneCls.chip)}>
          <Icon className="h-[18px] w-[18px]" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[10.5px] font-semibold uppercase tracking-wider text-gray-400">{eyebrow}</div>
          <div className="truncate text-[14.5px] font-semibold text-gray-900">{title}</div>
          <div className={cn('mt-0.5 line-clamp-2 text-[12.5px] leading-snug', summary ? 'text-gray-600' : 'text-gray-400')}>
            {summary || placeholder}
          </div>
          {issues.length ? (
            <div className="mt-2 inline-flex max-w-full items-center gap-1 rounded-md bg-amber-50 px-1.5 py-0.5 text-[11px] font-medium text-amber-700">
              <AlertTriangle className="h-3 w-3 shrink-0" />
              <span className="truncate">{issues[0]}</span>
            </div>
          ) : null}
        </div>
      </div>
      {children}
    </div>
  );
}

export const TriggerFlowNode = memo(function TriggerFlowNode({ id, data }) {
  const { issuesById, childHandles, readOnly, onAdd } = useContext(BuilderContext);
  const def = TRIGGERS_BY_TYPE[data.triggerType];
  const hasChild = childHandles[id]?.default;
  return (
    <Card
      id={id}
      tone="trigger"
      icon={def?.icon || Zap}
      eyebrow="Trigger"
      title={def?.label || 'Choose a trigger'}
      summary={def ? triggerSummary(data) : ''}
      placeholder="What starts this automation?"
      issues={issuesById[id] || []}
    >
      <Handle type="source" position={Position.Bottom} className={hiddenHandle} isConnectable={false} />
      {!hasChild && !readOnly ? (
        <div className="absolute -bottom-12 left-1/2 flex -translate-x-1/2 flex-col items-center">
          <div className="h-4 w-px bg-gray-300" />
          <AddButton label="Add first step" onClick={(e) => onAdd({ parentId: id, anchor: e.currentTarget })} />
        </div>
      ) : null}
    </Card>
  );
});

export const StepFlowNode = memo(function StepFlowNode({ id, data }) {
  const { issuesById, stepNumbers, childHandles, readOnly, onAdd } = useContext(BuilderContext);
  const def = ACTIONS_BY_TYPE[data.actionType];
  const branching = data.actionType === 'condition';
  const handles = childHandles[id] || {};
  const legacy = UNSUPPORTED_ACTION_LABELS[data.actionType];

  return (
    <Card
      id={id}
      tone={def?.tone || 'slate'}
      icon={def?.icon || AlertTriangle}
      eyebrow={stepNumbers[id] ? `Step ${stepNumbers[id]}` : 'Not connected'}
      title={def?.label || legacy || 'Unknown step'}
      summary={def ? def.summary(data) : ''}
      placeholder={def ? 'Click to set up' : 'Not supported'}
      issues={issuesById[id] || []}
    >
      <Handle type="target" position={Position.Top} className={hiddenHandle} isConnectable={false} />
      {branching ? (
        <>
          <Handle id="yes" type="source" position={Position.Bottom} style={{ left: '25%' }} className={hiddenHandle} isConnectable={false} />
          <Handle id="no" type="source" position={Position.Bottom} style={{ left: '75%' }} className={hiddenHandle} isConnectable={false} />
          {[
            ['yes', '25%', 'Yes', 'text-emerald-700 bg-emerald-50'],
            ['no', '75%', 'No', 'text-rose-700 bg-rose-50'],
          ].map(([handle, left, label, cls]) => (
            <div key={handle} className="absolute top-full flex -translate-x-1/2 flex-col items-center" style={{ left }}>
              <span className={cn('mt-1.5 rounded px-1.5 py-px text-[10.5px] font-semibold', cls)}>{label}</span>
              {!handles[handle] && !readOnly ? (
                <>
                  <div className="h-3 w-px bg-gray-300" />
                  <AddButton
                    label={`Add step on the ${label} path`}
                    onClick={(e) => onAdd({ parentId: id, handle, anchor: e.currentTarget })}
                  />
                </>
              ) : null}
            </div>
          ))}
        </>
      ) : (
        <>
          <Handle type="source" position={Position.Bottom} className={hiddenHandle} isConnectable={false} />
          {!handles.default && !readOnly ? (
            <div className="absolute -bottom-12 left-1/2 flex -translate-x-1/2 flex-col items-center">
              <div className="h-4 w-px bg-gray-300" />
              <AddButton label="Add next step" onClick={(e) => onAdd({ parentId: id, anchor: e.currentTarget })} />
            </div>
          ) : null}
        </>
      )}
    </Card>
  );
});

/** A connecting line with a + in the middle to insert a step there. */
export const StepEdge = memo(function StepEdge({ id, source, target, sourceHandle, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition }) {
  const { readOnly, onInsertOnEdge } = useContext(BuilderContext);
  const [path, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    borderRadius: 12,
    offset: 24,
  });
  return (
    <>
      <BaseEdge id={id} path={path} style={{ stroke: '#CBD5E1', strokeWidth: 1.75 }} />
      {!readOnly ? (
        <EdgeLabelRenderer>
          <div
            className="nodrag nopan pointer-events-auto absolute"
            style={{ transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY + (sourceHandle ? 10 : 0)}px)` }}
          >
            <AddButton
              label="Insert a step here"
              className="h-6 w-6 opacity-70 hover:opacity-100"
              onClick={(e) => onInsertOnEdge({ source, target, sourceHandle, anchor: e.currentTarget })}
            />
          </div>
        </EdgeLabelRenderer>
      ) : null}
    </>
  );
});
