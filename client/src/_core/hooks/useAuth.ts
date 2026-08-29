import { useState } from "react";

export type AuthUser = {
  id: string;
  name: string;
  email?: string;
  role?: string;
};

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(false);

  const logout = () => {
    setUser(null);
  };

  return {
    user,
    loading,
    logout,
  };
}
