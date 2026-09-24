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
 *
 * `windowOpen` rides along because a call permission request is a free-form
 * message — outside the 24-hour window Meta rejects it, so the dialler needs to
 * know before it offers to send one.
 */
export const useCallStore = create((set) => ({
  request: null, // { waId, name, windowOpen } | null

  dial: (waId, name = '', windowOpen = null) => set({ request: { waId, name, windowOpen } }),

  clearRequest: () => set({ request: null }),
}));
