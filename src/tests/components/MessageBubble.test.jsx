import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MessageBubble } from '../../components/whatsapp/MessageBubble';
import { MessageActionsContext } from '../../components/whatsapp/messageHelpers';

const voiceNote = {
  id: 'row-1',
  wa_message_id: 'wamid.1',
  direction: 'outbound',
  message_type: 'audio',
  body: '[audio]',
  media_url: 'blob:voice',
  status: 'read',
  created_at: '2026-09-28T04:26:00Z',
};

function renderBubble(msg, actions, props = {}) {
  const client = new QueryClient();
  return render(
    <QueryClientProvider client={client}>
      <MessageActionsContext.Provider value={actions}>
        <MessageBubble msg={msg} {...props} />
      </MessageActionsContext.Provider>
    </QueryClientProvider>,
  );
}

const makeActions = (overrides = {}) => ({
  windowOpen: true,
  contactName: 'Vishal',
  onReply: vi.fn(),
  onReact: vi.fn(),
  onForward: vi.fn(),
  onInfo: vi.fn(),
  onToggleStar: vi.fn(),
  onTogglePin: vi.fn(),
  onDelete: vi.fn(),
  onJump: vi.fn(),
  ...overrides,
});

async function openMenu(user) {
  await user.click(screen.getByRole('button', { name: 'Message options' }));
  return screen.getByRole('menu');
}

describe('MessageBubble message menu', () => {
  it('offers WhatsApp’s actions for a voice note, not just Download', async () => {
    const user = userEvent.setup();
    const actions = makeActions();
    renderBubble(voiceNote, actions);
    const menu = await openMenu(user);
    for (const label of ['Message info', 'Reply', 'Forward', 'Download', 'Pin', 'Star', 'Delete for me']) {
      expect(within(menu).getByRole('menuitem', { name: new RegExp(`^${label}$`) })).toBeInTheDocument();
    }
    await user.click(within(menu).getByRole('menuitem', { name: 'React 👍' }));
    expect(actions.onReact).toHaveBeenCalledWith(voiceNote, '👍');
  });

  it('sends the chosen action with the message', async () => {
    const user = userEvent.setup();
    const actions = makeActions();
    renderBubble(voiceNote, actions);
    await user.click(within(await openMenu(user)).getByRole('menuitem', { name: 'Reply' }));
    expect(actions.onReply).toHaveBeenCalledWith(voiceNote);
    await user.click(within(await openMenu(user)).getByRole('menuitem', { name: 'Forward' }));
    expect(actions.onForward).toHaveBeenCalledWith(voiceNote);
  });

  it('disables reply and reactions once the 24-hour window has closed', async () => {
    const user = userEvent.setup();
    renderBubble(voiceNote, makeActions({ windowOpen: false }));
    const menu = await openMenu(user);
    expect(within(menu).getByRole('menuitem', { name: 'Reply' })).toHaveAttribute('data-disabled');
    expect(within(menu).getByRole('menuitem', { name: 'React 👍' })).toHaveAttribute('data-disabled');
    // Local-only actions still work.
    expect(within(menu).getByRole('menuitem', { name: 'Star' })).not.toHaveAttribute('data-disabled');
  });

  it('offers to remove a reaction already sent, and to unstar and unpin', async () => {
    const user = userEvent.setup();
    const actions = makeActions();
    const msg = { ...voiceNote, reactions: { outbound: '❤️' }, starred: true, pinned_at: '2026-09-28T05:00:00Z' };
    renderBubble(msg, actions);
    const menu = await openMenu(user);
    expect(within(menu).getByRole('menuitem', { name: 'Unstar' })).toBeInTheDocument();
    expect(within(menu).getByRole('menuitem', { name: 'Unpin' })).toBeInTheDocument();
    await user.click(within(menu).getByRole('menuitem', { name: 'Remove ❤️ reaction' }));
    expect(actions.onReact).toHaveBeenCalledWith(msg, '');
  });

  it('shows the quote, the reactions and the forwarded label on the bubble', () => {
    const quoted = { id: 'row-0', wa_message_id: 'wamid.0', direction: 'inbound', message_type: 'text', body: 'Is there a weekend batch?' };
    renderBubble(
      { ...voiceNote, reply_to: 'wamid.0', forwarded: true, reactions: { inbound: '😂' } },
      makeActions(),
      { quoted },
    );
    expect(screen.getByText('Forwarded')).toBeInTheDocument();
    expect(screen.getByText('Is there a weekend batch?')).toBeInTheDocument();
    expect(screen.getByText('Vishal')).toBeInTheDocument();
    expect(screen.getByText('😂')).toBeInTheDocument();
  });

  it('keeps to copy and download where no chat actions are provided', async () => {
    const user = userEvent.setup();
    renderBubble({ ...voiceNote, message_type: 'text', body: 'Hello', media_url: null }, null);
    const menu = await openMenu(user);
    expect(within(menu).getAllByRole('menuitem').map((i) => i.textContent)).toEqual(['Copy']);
  });

  it('holds back a message that is still sending', async () => {
    const user = userEvent.setup();
    renderBubble({ ...voiceNote, id: 'temp_1', wa_message_id: null, message_type: 'text', body: 'Hi', media_url: null }, makeActions());
    const menu = await openMenu(user);
    expect(within(menu).getAllByRole('menuitem').map((i) => i.textContent)).toEqual(['Copy']);
  });
});
