import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { User } from "@shared/schema";

interface CurrentUser {
  id: string;
  username: string;
}

export function useAuth() {
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  const { data: currentUser, isLoading } = useQuery<CurrentUser>({
    queryKey: ["/api/auth/me"],
    retry: false,
  });

  useEffect(() => {
    setIsCheckingAuth(isLoading);
  }, [isLoading]);

  return {
    currentUser,
    isAuthenticated: !!currentUser,
    isCheckingAuth,
  };
}
