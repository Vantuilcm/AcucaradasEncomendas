import { create } from 'zustand';

export interface StoreState {
  cart: any[];
  addToCart: (item: any) => void;
  clearCart: () => void;
}

export const useStore = create<StoreState>((set) => ({
  cart: [],
  addToCart: (item: any) =>
    set((state: StoreState) => ({
      cart: [...state.cart, item],
    })),
  clearCart: () => set({ cart: [] }),
}));
