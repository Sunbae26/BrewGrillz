import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiPatch, apiPost } from "./api.js";

export const isStaff = (user) => user?.role === "STAFF" || user?.role === "ADMIN";
export const isAdmin = (user) => user?.role === "ADMIN";

export const ADMIN_KEYS = {
  summary: ["admin", "summary"],
  orders: ["admin", "orders"],
  bookings: (date) => ["admin", "bookings", date],
  enquiries: ["admin", "enquiries"],
  menu: ["admin", "menu"],
  team: ["admin", "team"],
  settings: ["admin", "settings"],
};

// A small POST/PATCH that refreshes the listed dashboard queries afterwards.
export function useAdminAction(keys) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ method = "POST", path, body }) => (method === "PATCH" ? apiPatch(path, body) : apiPost(path, body)),
    onSettled: () => {
      for (const key of [...keys, ADMIN_KEYS.summary]) queryClient.invalidateQueries({ queryKey: key });
    },
  });
}

// Two-note chime when a new order lands on the board.
export function playChime() {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    const context = new AudioContext();
    [880, 1175].forEach((frequency, index) => {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.frequency.value = frequency;
      oscillator.connect(gain);
      gain.connect(context.destination);
      const start = context.currentTime + index * 0.18;
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.25, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.35);
      oscillator.start(start);
      oscillator.stop(start + 0.4);
    });
  } catch {
    /* sound blocked until the page is clicked once */
  }
}
