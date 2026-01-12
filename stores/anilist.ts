import { create } from "zustand";
import {
  type AniListMapping,
  type AniListSyncQueueItem,
  getAniListClientId,
  getAniListMappings,
  getAniListSyncQueue,
  setAniListClientId,
  setAniListMappings,
  setAniListSyncQueue,
} from "@/lib/anilist-storage";
import {
  deleteAniListAccessToken,
  getAniListAccessToken,
  setAniListAccessToken,
  getAniListClientSecret,
  setAniListClientSecret,
  deleteAniListClientSecret,
} from "@/lib/secure-storage";

interface AniListStore {
  accessToken: string | null;
  clientId: string | null;
  clientSecret: string | null;
  mappings: Record<string, AniListMapping>;
  queue: AniListSyncQueueItem[];
  isLoading: boolean;
  loadState: () => Promise<void>;
  setAccessToken: (token: string) => Promise<void>;
  clearAccessToken: () => Promise<void>;
  setClientId: (clientId: string) => void;
  setClientSecret: (clientSecret: string) => Promise<void>;
  clearClientSecret: () => Promise<void>;
  setMapping: (key: string, mapping: AniListMapping) => void;
  removeMapping: (key: string) => void;
  setQueue: (queue: AniListSyncQueueItem[]) => void;
}

export const useAniListStore = create<AniListStore>((set) => ({
  accessToken: null,
  clientId: null,
  clientSecret: null,
  mappings: {},
  queue: [],
  isLoading: true,

  loadState: async () => {
    const [accessToken, clientId, clientSecret, mappings, queue] = await Promise.all([
      getAniListAccessToken(),
      Promise.resolve(getAniListClientId()),
      getAniListClientSecret(),
      Promise.resolve(getAniListMappings()),
      Promise.resolve(getAniListSyncQueue()),
    ]);
    set({ accessToken, clientId, clientSecret, mappings, queue, isLoading: false });
  },

  setAccessToken: async (token) => {
    await setAniListAccessToken(token);
    set({ accessToken: token });
  },

  clearAccessToken: async () => {
    await deleteAniListAccessToken();
    set({ accessToken: null });
  },

  setClientId: (clientId) => {
    setAniListClientId(clientId);
    set({ clientId });
  },

  setClientSecret: async (clientSecret) => {
    await setAniListClientSecret(clientSecret);
    set({ clientSecret });
  },

  clearClientSecret: async () => {
    await deleteAniListClientSecret();
    set({ clientSecret: null });
  },

  setMapping: (key, mapping) => {
    set((state) => {
      const updatedMappings = { ...state.mappings, [key]: mapping };
      setAniListMappings(updatedMappings);
      return { mappings: updatedMappings };
    });
  },

  removeMapping: (key) => {
    set((state) => {
      const updatedMappings = { ...state.mappings };
      delete updatedMappings[key];
      setAniListMappings(updatedMappings);
      return { mappings: updatedMappings };
    });
  },

  setQueue: (queue) => {
    setAniListSyncQueue(queue);
    set({ queue });
  },
}));
