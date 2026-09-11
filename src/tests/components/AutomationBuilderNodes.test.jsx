import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ReactFlowProvider } from 'reactflow';
import { AirtableIntegrationFields, ActionNode } from '../../pages/user/AutomationBuilder';

const renderNode = (data) =>
  render(
    <ReactFlowProvider>
      <ActionNode id="action-1" selected={false} data={data} />
    </ReactFlowProvider>,
  );

describe('Airtable integration step', () => {
  it('offers the three CRM operations once Airtable is chosen', () => {
    renderNode({ actionType: 'custom_integration', integrationKey: 'airtable', integrationName: 'Airtable' });

    expect(screen.getByText('What to do')).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Update the lead' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Add to the CRM' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Add a note' })).toBeInTheDocument();
  });

  it('adds a field row and writes it back as {field, value}', () => {
    const onUpdateMessage = vi.fn();
    render(<AirtableIntegrationFields id="action-1" data={{ airtableFields: [], onUpdateMessage }} />);

    fireEvent.click(screen.getByText('+ Add field'));
    expect(onUpdateMessage).toHaveBeenCalledWith('action-1', [{ field: '', value: '' }], 'airtableFields');
  });

  it('edits an existing row without disturbing its neighbours', () => {
    const onUpdateMessage = vi.fn();
    render(
      <AirtableIntegrationFields
        id="action-1"
        data={{
          airtableFields: [
            { field: 'Status', value: 'CNP' },
            { field: 'Caller', value: 'Shilpa' },
          ],
          onUpdateMessage,
        }}
      />,
    );

    fireEvent.change(screen.getByDisplayValue('CNP'), { target: { value: 'Prospects' } });
    expect(onUpdateMessage).toHaveBeenCalledWith(
      'action-1',
      [
        { field: 'Status', value: 'Prospects' },
        { field: 'Caller', value: 'Shilpa' },
      ],
      'airtableFields',
    );
  });

  it('swaps the fields for a note box when the operation is add_note', () => {
    render(<AirtableIntegrationFields id="action-1" data={{ airtableOp: 'add_note' }} />);

    expect(screen.getByText('Note')).toBeInTheDocument();
    expect(screen.queryByText('Fields to write')).not.toBeInTheDocument();
  });

  it('keeps the email match optional', () => {
    render(<AirtableIntegrationFields id="action-1" data={{}} />);
    expect(screen.getByPlaceholderText('Leave empty to match on phone number')).toBeInTheDocument();
  });
});

describe('Email step', () => {
  it('shows the stored subject and body', () => {
    renderNode({
      actionType: 'send_email',
      label: 'Email 4',
      subject: 'You Need a Free Mock Test?',
      body: '<p>Hi {first_name},</p>',
    });

    expect(screen.getByDisplayValue('You Need a Free Mock Test?')).toBeInTheDocument();
    expect(screen.getByDisplayValue('<p>Hi {first_name},</p>')).toBeInTheDocument();
    expect(screen.getByText('Email 4')).toBeInTheDocument();
  });

  it('writes edits to subject and body, not to message', () => {
    const onUpdateMessage = vi.fn();
    renderNode({ actionType: 'send_email', subject: 'Old', body: 'Body', onUpdateMessage });

    fireEvent.change(screen.getByDisplayValue('Old'), { target: { value: 'New subject' } });
    expect(onUpdateMessage).toHaveBeenCalledWith('action-1', 'New subject', 'subject');

    fireEvent.change(screen.getByDisplayValue('Body'), { target: { value: '<p>New</p>' } });
    expect(onUpdateMessage).toHaveBeenCalledWith('action-1', '<p>New</p>', 'body');
  });
});

describe('Delay step', () => {
  it('shows the unit a wait is measured in', () => {
    renderNode({ actionType: 'delay', duration: 4, unit: 'days' });
    expect(screen.getByDisplayValue('days')).toBeInTheDocument();
    expect(screen.getByDisplayValue('4')).toBeInTheDocument();
  });

  it('writes the duration to duration, where it is read from', () => {
    const onUpdateMessage = vi.fn();
    renderNode({ actionType: 'delay', duration: 4, unit: 'days', onUpdateMessage });

    fireEvent.change(screen.getByDisplayValue('4'), { target: { value: '6' } });
    expect(onUpdateMessage).toHaveBeenCalledWith('action-1', '6', 'duration');
  });
});

describe('Chaining steps', () => {
  it('offers a next step on a step nothing follows yet', () => {
    const onAddNextStep = vi.fn();
    renderNode({ actionType: 'send_message', onAddNextStep, hasNextStep: false });

    fireEvent.click(screen.getByText('Add next step'));
    expect(onAddNextStep).toHaveBeenCalledWith('action-1');
  });

  it('hides the offer once something already follows the step', () => {
    renderNode({ actionType: 'send_message', hasNextStep: true });
    expect(screen.queryByText('Add next step')).not.toBeInTheDocument();
  });

  it('offers it on an integration step too, so a CRM write can be followed up', () => {
    renderNode({
      actionType: 'custom_integration',
      integrationKey: 'airtable',
      integrationName: 'Airtable',
    });
    expect(screen.getByText('Add next step')).toBeInTheDocument();
  });
});
