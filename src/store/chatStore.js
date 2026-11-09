import { create } from 'zustand';

const FAVOURITES_KEY = 'favouriteWaIds';
const loadFavourites = () => {
  try {
    const raw = localStorage.getItem(FAVOURITES_KEY);
    return new Set(raw ? JSON.parse(raw) : []);
  } catch {
    return new Set();
  }
};

export const useChatStore = create((set) => ({
  selectedWaId: null,
  selectedIgUserId: null,
  conversationFilter: 'all', // all | unread | favourites
  sort: 'newest', // newest | oldest | unread
  search: '',
  tagFilter: null, // tag id to filter conversations by label
  favouriteWaIds: loadFavourites(), // starred chats, persisted to localStorage
  // Bumped by the contact info panel's Search button; the chat window watches it.
  searchRequest: 0,

  toggleFavourite: (waId) =>
    set((s) => {
      const next = new Set(s.favouriteWaIds);
      if (next.has(waId)) next.delete(waId);
      else next.add(waId);
      try {
        localStorage.setItem(FAVOURITES_KEY, JSON.stringify([...next]));
      } catch {
        /* storage unavailable (private mode) — keep the in-memory set */
      }
      return { favouriteWaIds: next };
    }),
  setSelectedWaId: (waId) => set({ selectedWaId: waId }),
  setSelectedIgUserId: (id) => set({ selectedIgUserId: id }),
  setFilter: (filter) => set({ conversationFilter: filter }),
  setSort: (sort) => set({ sort }),
  setSearch: (search) => set({ search }),
  setTagFilter: (tagId) => set({ tagFilter: tagId }),
  requestChatSearch: () => set((s) => ({ searchRequest: s.searchRequest + 1 })),
  reset: () =>
    set({ selectedWaId: null, selectedIgUserId: null, conversationFilter: 'all', sort: 'newest', search: '', tagFilter: null }),
}));
