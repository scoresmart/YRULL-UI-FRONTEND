import { create } from 'zustand';

/**
 * Hand-off between the chat header's call button and IncomingCallNotification,
 * which owns every peer connection in the app.
 *
 * The dialler lives there rather than in ChatWindow so that one component holds
 * the microphone, the RTCPeerConnection and the in-call UI. Two components
 * capturing audio independently is how you end up with a call that survives
 * navigating away from the conversation, or two live peer connections at once.
 *
 * `request` is a one-shot: the notification consumes it and clears it.
 */
export const useCallStore = create((set) => ({
  request: null, // { waId, name } | null

  dial: (waId, name = '') => set({ request: { waId, name } }),

  clearRequest: () => set({ request: null }),
}));
