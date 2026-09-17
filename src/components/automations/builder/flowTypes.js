import { StepEdge, StepFlowNode, TriggerFlowNode } from './FlowNodes';

// Defined once at module level: ReactFlow warns and re-mounts nodes if these
// objects change identity between renders.
export const nodeTypes = { trigger: TriggerFlowNode, action: StepFlowNode };
export const edgeTypes = { step: StepEdge };
