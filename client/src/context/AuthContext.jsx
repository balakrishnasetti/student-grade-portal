import { createContext, useContext, useEffect, useState } from 'react';
import api from '../api/axios';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      setLoading(false);
      return undefined;
    }

    // Without loading, ProtectedRoute sees user === null on refresh and redirects a valid session to /login.
    api.get('/auth/me')
      .then((response) => setUser(response.data.data.user))
      .catch(() => {
        localStorage.removeItem('token');
        setUser(null);
      })
      .finally(() => setLoading(false));

    return undefined;
  }, []);

  async function login(email, password) {
    const response = await api.post('/auth/login', { email, password });
    localStorage.setItem('token', response.data.data.token);
    setUser(response.data.data.user);
    return response.data.data.user;
  }

  async function register(payload) {
    const response = await api.post('/auth/register', payload);
    localStorage.setItem('token', response.data.data.token);
    setUser(response.data.data.user);
    return response.data.data.user;
  }

  function logout() {
    localStorage.removeItem('token');
    setUser(null);
  }

  const value = {
    user,
    loading,
    isTeacher: user?.role === 'teacher',
    login,
    register,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used inside an AuthProvider');
  }
  return context;
}
