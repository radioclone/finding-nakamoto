import { create } from "zustand";

type WalletSummary = Record<string, any>;

type TurnkeyStoreState = {
  wallets: WalletSummary[] | null;
  isLoading: boolean;
  initialized: boolean;
  setWallets: (wallets: WalletSummary[] | null) => void;
  setLoading: (value: boolean) => void;
  reset: () => void;
};

const initialState: Pick<TurnkeyStoreState, "wallets" | "isLoading" | "initialized"> = {
  wallets: null,
  isLoading: false,
  initialized: false,
};

export const useTurnkeyStore = create<TurnkeyStoreState>((set) => ({
  ...initialState,
  setWallets: (wallets) =>
    set({ wallets: wallets ?? null, initialized: true }),
  setLoading: (value) => set({ isLoading: value }),
  reset: () => set({ ...initialState }),
}));

export type { WalletSummary, TurnkeyStoreState };
