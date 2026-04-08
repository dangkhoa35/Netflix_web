import { useMemo } from "react";
import useSwr from "swr";

import fetcher from "../libs/fetcher";

export interface CurrentUser {
  id?: string;
  createdAt?: string;
  email?: string;
  emailVerified?: string | null;
  favoriteIds?: string[];
  image?: string | null;
  name?: string;
  updatedAt?: string;
}

type CurrentUserApiPayload = CurrentUser | { currentUser?: CurrentUser } | null;

const useCurrentUser = (enabled = true) => {
  const key = enabled ? "/api/current" : null;
  const { data, error, isLoading, mutate } = useSwr<CurrentUserApiPayload>(key, fetcher, {
    revalidateIfStale: false,
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    shouldRetryOnError: false,
  });

  const normalizedUser = useMemo<CurrentUser | null>(() => {
    if (!data) return null;

    if (typeof data === "object" && data !== null && "currentUser" in data) {
      return data.currentUser ?? null;
    }

    return data as CurrentUser;
  }, [data]);

  return {
    data: normalizedUser,
    error,
    isLoading,
    mutate,
  };
};

export default useCurrentUser;
