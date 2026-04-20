import { create } from 'zustand';

export const useChatStore = create((set) => ({
  selectedWaId: null,
  selectedIgUserId: null,
  conversationFilter: 'all', // all | unread | assigned | resolved
  sort: 'newest', // newest | oldest | unread
  search: '',

  setSelectedWaId: (waId) => set({ selectedWaId: waId }),
  setSelectedIgUserId: (id) => set({ selectedIgUserId: id }),
  setFilter: (filter) => set({ conversationFilter: filter }),
  setSort: (sort) => set({ sort }),
  setSearch: (search) => set({ search }),
  reset: () =>
    set({ selectedWaId: null, selectedIgUserId: null, conversationFilter: 'all', sort: 'newest', search: '' }),
}));
