import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock localStorage
const localStorageMock = (() => {
  let store = {};
  return {
    getItem: (key) => store[key] || null,
    setItem: (key, value) => { store[key] = String(value); },
    clear: () => { store = {}; },
    removeItem: (key) => { delete store[key]; }
  };
})();
Object.defineProperty(window, 'localStorage', { value: localStorageMock });
