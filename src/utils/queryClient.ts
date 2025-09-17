// src/utils/queryClient.ts
import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient();

export async function apiRequest(method: string, url: string, body?: any) {
  const res = await fetch(`https://api.fazendasaopedro.appsirius.com/api${url}`, {
    method,
    headers: {
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  return res;
}
