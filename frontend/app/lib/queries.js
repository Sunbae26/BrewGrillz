import { QueryClient, useQuery } from "@tanstack/react-query";
import { apiGet } from "./api.js";

export const createQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 5 * 60 * 1000,
        gcTime: 30 * 60 * 1000,
        retry: (count, error) => (error?.status >= 400 && error?.status < 500 ? false : count < 2),
        refetchOnWindowFocus: false,
      },
    },
  });

export const queryKeys = {
  menu: ["menu"],
  slots: ["pickup-slots"],
  info: ["info"],
};

export async function loadOrNull(path) {
  try {
    return await apiGet(path);
  } catch {
    return null;
  }
}

// The menu is built into the page at build time (initialData), then refreshed from the API
// every minute and when the tab comes back, so price changes and sold-out dishes show up.
export const useMenu = (initialData, { enabled = true } = {}) =>
  useQuery({
    queryKey: queryKeys.menu,
    queryFn: ({ signal }) => apiGet("/menu", { signal }),
    staleTime: 30_000,
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
    enabled,
    ...(initialData ? { initialData, initialDataUpdatedAt: 0 } : {}),
  });

export const usePickupSlots = () =>
  useQuery({
    queryKey: queryKeys.slots,
    queryFn: ({ signal }) => apiGet("/orders/pickup-slots", { signal }),
    staleTime: 60_000,
    refetchInterval: 120_000,
    refetchOnWindowFocus: true,
  });
