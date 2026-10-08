import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LandingPage } from './LandingPage';

export const RegisterPage: React.FC = () => {
  const { user, openRegisterModal } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    if (user) {
      navigate('/dashboard', { replace: true });
    } else {
      const ref = searchParams.get('ref') || undefined;
      openRegisterModal({
        referralCode: ref,
        onSuccess: () => navigate('/dashboard')
      });
    }
  }, [user, navigate, searchParams, openRegisterModal]);

  return <LandingPage />;
};

