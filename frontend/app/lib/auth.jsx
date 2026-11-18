import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import { apiGet, apiPost } from "./api.js";

export const ME_KEY = ["me"];

export function useAuth() {
  const queryClient = useQueryClient();
  const { data: user, isPending } = useQuery({
    queryKey: ME_KEY,
    queryFn: ({ signal }) => apiGet("/auth/me", { signal }),
    staleTime: 60_000,
    retry: false,
  });

  const setUser = useCallback(
    (value) => queryClient.setQueryData(ME_KEY, value),
    [queryClient],
  );
  const refresh = useCallback(
    () => queryClient.invalidateQueries({ queryKey: ME_KEY }),
    [queryClient],
  );

  const signOut = useCallback(async () => {
    await apiPost("/auth/logout");
    queryClient.setQueryData(ME_KEY, null);
    queryClient.removeQueries({ queryKey: ["account"] });
  }, [queryClient]);

  const signOutOthers = useCallback(async () => {
    queryClient.setQueryData(ME_KEY, await apiPost("/auth/logout-all"));
  }, [queryClient]);

  return {
    user: user ?? null,
    loading: isPending,
    setUser,
    refresh,
    signOut,
    signOutOthers,
  };
}

export const safeNext = (value, fallback = "/account") =>
  value && value.startsWith("/") && !value.startsWith("//") ? value : fallback;
