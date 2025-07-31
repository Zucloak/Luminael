import { createContext } from 'react';

type QueueActionsContextType = {
  handleImportQueue: (() => void) | null;
  handleExportQueue: (() => void) | null;
};

export const QueueActionsContext = createContext<QueueActionsContextType>({
  handleImportQueue: null,
  handleExportQueue: null,
});
