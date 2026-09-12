import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

export function useAppConfig() {
  return useQuery({
    queryKey: ["app-config"],
    queryFn: async () => {
      const res = await api.api.config.$get();
      return res.json();
    },
    staleTime: Infinity,
  });
}
