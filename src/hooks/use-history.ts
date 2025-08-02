import { useState, useCallback, useRef, useEffect } from 'react';

type HistoryState<T> = {
  past: T[];
  present: T;
  future: T[];
};

// Custom hook for managing state history with undo/redo functionality.
export const useHistory = <T,>(initialState: T) => {
  const [state, setState] = useState<HistoryState<T>>({
    past: [],
    present: initialState,
    future: [],
  });

  const initialStateRef = useRef(initialState);

  const canUndo = state.past.length > 0;
  const canRedo = state.future.length > 0;

  // The undo function.
  const undo = useCallback(() => {
    setState((currentState) => {
      const { past, present, future } = currentState;
      if (past.length === 0) {
        return currentState;
      }
      const previous = past[past.length - 1];
      const newPast = past.slice(0, past.length - 1);
      return {
        past: newPast,
        present: previous,
        future: [present, ...future],
      };
    });
  }, []);

  // Replaces the present state without affecting the history.
  const replace = useCallback((newState: T | ((prevState: T) => T)) => {
    setState(currentState => ({
      ...currentState,
      present: typeof newState === 'function' ? (newState as (prevState: T) => T)(currentState.present) : newState,
    }));
  }, []);

  // The redo function.
  const redo = useCallback(() => {
    setState((currentState) => {
      const { past, present, future } = currentState;
      if (future.length === 0) {
        return currentState;
      }
      const next = future[0];
      const newFuture = future.slice(1);
      return {
        past: [...past, present],
        present: next,
        future: newFuture,
      };
    });
  }, []);

  // Sets a new state and clears the future (redo stack).
  const set = useCallback((newState: T | ((prevState: T) => T)) => {
    setState((currentState) => {
      const newPresent = typeof newState === 'function' ? (newState as (prevState: T) => T)(currentState.present) : newState;

      // Don't save duplicates
      if (JSON.stringify(newPresent) === JSON.stringify(currentState.present)) {
        return currentState;
      }

      return {
        past: [...currentState.past, currentState.present],
        present: newPresent,
        future: [], // Clear future when a new state is set
      };
    });
  }, []);

  // Resets the history to the initial state.
  const reset = useCallback(() => {
    setState({
      past: [],
      present: initialStateRef.current,
      future: [],
    });
  }, [initialStateRef]);

  return {
    state: state.present,
    set,
    replace,
    undo,
    redo,
    reset,
    canUndo,
    canRedo,
  };
};
