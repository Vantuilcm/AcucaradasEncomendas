import { create } from 'zustand';

export const useStore = create<any>((set: any) => ({
  cart: [],
  addToCart: (item: any) =>
    set((state: any) => ({
      cart: [...state.cart, item],
    })),
  clearCart: () => set({ cart: [] }),
}));
