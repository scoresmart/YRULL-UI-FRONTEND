import { createContext } from 'react';

/** Canvas callbacks and derived state, so nodes stay plain serialisable data. */
export const BuilderContext = createContext({
  selectedId: null,
  issuesById: {},
  stepNumbers: {},
  childHandles: {},
  readOnly: false,
  onAdd: () => {},
  onInsertOnEdge: () => {},
});
