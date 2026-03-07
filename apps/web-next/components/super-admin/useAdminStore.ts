'use client';

import { useSyncExternalStore } from 'react';

type AdminState = {
  lastCommand: string;
  killSwitchArmed: boolean;
  lastLegacyMessage: string;
};

type Listener = () => void;

const listeners = new Set<Listener>();

let state: AdminState = {
  lastCommand: 'idle',
  killSwitchArmed: false,
  lastLegacyMessage: 'none',
};

function emit() {
  listeners.forEach((listener) => listener());
}

function setState(partial: Partial<AdminState>) {
  state = { ...state, ...partial };
  emit();
}

function subscribe(listener: Listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot() {
  return state;
}

export function useAdminStore() {
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  return {
    ...snapshot,
    setLastCommand: (lastCommand: string) => setState({ lastCommand }),
    setKillSwitchArmed: (killSwitchArmed: boolean) => setState({ killSwitchArmed }),
    setLastLegacyMessage: (lastLegacyMessage: string) => setState({ lastLegacyMessage }),
  };
}
