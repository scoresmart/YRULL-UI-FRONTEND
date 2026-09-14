import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import TestRunPanel from '../../components/automations/TestRunPanel';

const nodes = [
  { id: 'trigger-1', type: 'trigger', data: { triggerType: 'new_message', keyword: 'hi' } },
  { id: 'a1', type: 'action', data: { actionType: 'send_message', message: 'Hey {first_name}!' } },
  { id: 'a2', type: 'action', data: { actionType: 'add_tag', tagId: null } },
];
const edges = [
  { id: 'e1', source: 'trigger-1', target: 'a1' },
  { id: 'e2', source: 'a1', target: 'a2' },
];

describe('TestRunPanel', () => {
  it('renders and produces a result on Run test', () => {
    render(<TestRunPanel nodes={nodes} edges={edges} onClose={() => {}} />);
    expect(screen.getByText('Test this automation')).toBeInTheDocument();
    expect(screen.getByText(/User sends a message/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Run test/i }));
    expect(screen.getByText('Hey Test!')).toBeInTheDocument();
    expect(screen.getByText(/problem/i)).toBeInTheDocument();
    expect(screen.getByText(/Nothing was sent/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Run again/i })).toBeInTheDocument();
  });
});
