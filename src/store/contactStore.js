import { create } from 'zustand';

export const useContactStore = create((set) => ({
  selectedContactId: null,
  setSelectedContactId: (id) => set({ selectedContactId: id }),
}));
