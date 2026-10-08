import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LandingPage } from './LandingPage';

export const LoginPage: React.FC = () => {
  const { user, openLoginModal } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      navigate('/dashboard', { replace: true });
    } else {
      openLoginModal({
        onSuccess: () => navigate('/dashboard')
      });
    }
  }, [user, navigate, openLoginModal]);

  return <LandingPage />;
};

