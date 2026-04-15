import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from '@/hooks/use-toast';
import { api, setToken, clearToken } from '@/lib/api';
import { ApiError } from '@/lib/api';
import type { AuthUser, LoginResponse, UserRole } from '@/types/api';

interface AuthContextType {
  user: AuthUser | null;
  session: null;
  loading: boolean;
  signUp: (email: string, password: string, fullName: string, role?: UserRole) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: any }>;
  updatePassword: (newPassword: string) => Promise<{ error: any }>;
  getProfile: () => Promise<AuthUser | null>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

const getDashboardPathForRole = (role: UserRole): string => {
  switch (role) {
    case 'ADMIN':
      return '/admin';
    case 'DIRECTOR':
    case 'BRANCH_DIRECTOR':
      return '/school-dashboard';
    case 'TEACHER':
      return '/eligibility';
    case 'PARENT':
    default:
      return '/dashboard';
  }
};

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const getProfile = async (): Promise<AuthUser | null> => {
    try {
      const me = await api.get<AuthUser>('/auth/me');
      setUser(me);
      return me;
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        clearToken();
        setUser(null);
      }
      return null;
    }
  };

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (token) {
      getProfile().finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      const data = await api.post<LoginResponse>('/auth/login', { email, password });

      setToken(data.accessToken);
      setUser(data.user);

      toast({
        title: 'Welcome back!',
        description: 'You have been signed in successfully.',
      });

      navigate(getDashboardPathForRole(data.user.role));
      return { error: null };
    } catch (error: any) {
      const message = error instanceof ApiError ? error.message : error.message;
      toast({
        variant: 'destructive',
        title: 'Sign in failed',
        description: message,
      });
      return { error };
    }
  };

  const signUp = async (
    email: string,
    password: string,
    fullName: string,
    role?: UserRole,
  ) => {
    try {
      const data = await api.post<LoginResponse>('/auth/register', {
        email,
        password,
        name: fullName,
        role: role ?? 'PARENT',
      });

      setToken(data.accessToken);
      setUser(data.user);

      toast({
        title: 'Account created!',
        description: 'Your account has been created successfully.',
      });

      navigate(getDashboardPathForRole(data.user.role));
      return { error: null };
    } catch (error: any) {
      const message = error instanceof ApiError ? error.message : error.message;
      toast({
        variant: 'destructive',
        title: 'Sign up failed',
        description: message,
      });
      return { error };
    }
  };

  const signOut = async () => {
    clearToken();
    setUser(null);

    toast({
      title: 'Signed out',
      description: 'You have been signed out successfully.',
    });

    navigate('/auth');
  };

  const resetPassword = async (email: string) => {
    try {
      await api.post('/auth/forgot-password', { email });

      toast({
        title: 'Check your email',
        description: "We've sent you a password reset link.",
      });

      return { error: null };
    } catch (error: any) {
      const message = error instanceof ApiError ? error.message : error.message;
      toast({
        variant: 'destructive',
        title: 'Reset failed',
        description: message,
      });
      return { error };
    }
  };

  const updatePassword = async (newPassword: string) => {
    try {
      await api.post('/auth/update-password', { password: newPassword });

      toast({
        title: 'Password updated!',
        description: 'Your password has been changed successfully.',
      });

      if (user) {
        navigate(getDashboardPathForRole(user.role));
      }

      return { error: null };
    } catch (error: any) {
      const message = error instanceof ApiError ? error.message : error.message;
      toast({
        variant: 'destructive',
        title: 'Update failed',
        description: message,
      });
      return { error };
    }
  };

  const value: AuthContextType = {
    user,
    session: null,
    loading,
    signUp,
    signIn,
    signOut,
    resetPassword,
    updatePassword,
    getProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
