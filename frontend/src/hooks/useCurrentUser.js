import { useState, useEffect } from 'react';
import axios from '../api/client';

export function useCurrentUser() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const { data } = await axios.get('/api/auth/me');
        setUser(data);
      } catch (error) {
        console.error('Failed to fetch current user:', error);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, []);

  const isAdmin = user?.role === 'Admin';
  const isDataEntry = user?.role === 'DataEntry';
  const isReadOnly = user?.role === 'ReadOnly';

  return { user, loading, isAdmin, isDataEntry, isReadOnly };
}
