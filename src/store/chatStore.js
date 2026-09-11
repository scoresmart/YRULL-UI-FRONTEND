import { create } from 'zustand';

export const useChatStore = create((set) => ({
  selectedWaId: null,
  selectedIgUserId: null,
  conversationFilter: 'all', // all | unread | assigned | resolved
  sort: 'newest', // newest | oldest | unread
  search: '',
  tagFilter: null, // tag id to filter conversations by label

  setSelectedWaId: (waId) => set({ selectedWaId: waId }),
  setSelectedIgUserId: (id) => set({ selectedIgUserId: id }),
  setFilter: (filter) => set({ conversationFilter: filter }),
  setSort: (sort) => set({ sort }),
  setSearch: (search) => set({ search }),
  setTagFilter: (tagId) => set({ tagFilter: tagId }),
  reset: () =>
    set({ selectedWaId: null, selectedIgUserId: null, conversationFilter: 'all', sort: 'newest', search: '', tagFilter: null }),
}));
