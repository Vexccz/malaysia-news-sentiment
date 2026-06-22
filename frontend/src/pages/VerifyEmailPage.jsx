import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import api from '../services/api';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';

const VerifyEmailPage = () => {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState('verifying');
  const navigate = useNavigate();
  const token = searchParams.get('token');

  useEffect(() => {
    const verify = async () => {
      if (!token) {
        setStatus('error');
        return;
      }
      try {
        await api.get(`/auth/verify-email?token=${token}`);
        setStatus('success');
        toast.success('Email verified successfully!');
        setTimeout(() => navigate('/login'), 3000);
      } catch (err) {
        setStatus('error');
        toast.error(err.response?.data?.message || 'Verification failed');
      }
    };
    verify();
  }, [token, navigate]);

  return (
    <div className="min-h-screen bg-[#fafaf9] dark:bg-[#0f0f0f] flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="bg-white dark:bg-[#1a1a1a] border border-[#eee] dark:border-[#2a2a2a] rounded-sm p-10 text-center max-w-sm w-full shadow-black/5"
      >
        {status === 'verifying' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              className="w-12 h-12 border-3 border-[#e5e5e5] dark:border-[#333] border-t-[#2563eb] rounded-full mx-auto mb-5"
            />
            <h2 className="text-xl font-bold dark:text-white mb-2">Verifying...</h2>
            <p className="text-sm text-[#888]">Please wait while we verify your email.</p>
          </motion.div>
        )}

        {status === 'success' && (
          <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ type: 'spring' }}>
            <div className="w-16 h-16 bg-[#059669]/10 rounded-full flex items-center justify-center mx-auto mb-5">
              <CheckCircle size={32} className="text-[#059669]" />
            </div>
            <h2 className="text-xl font-bold dark:text-white mb-2">Email Verified!</h2>
            <p className="text-sm text-[#888] mb-6">Your account is now active. Redirecting to login...</p>
            <Link
              to="/login"
              className="inline-block bg-[#1a1a1a] dark:bg-[#2563eb] text-white px-6 py-3 rounded-xl text-sm font-medium hover:opacity-90 transition-all"
            >
              Go to Login
            </Link>
          </motion.div>
        )}

        {status === 'error' && (
          <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ type: 'spring' }}>
            <div className="w-16 h-16 bg-red-50 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-5">
              <XCircle size={32} className="text-red-500" />
            </div>
            <h2 className="text-xl font-bold dark:text-white mb-2">Verification Failed</h2>
            <p className="text-sm text-[#888] mb-6">The link may be invalid or expired.</p>
            <Link
              to="/register"
              className="inline-block bg-[#1a1a1a] dark:bg-[#2563eb] text-white px-6 py-3 rounded-xl text-sm font-medium hover:opacity-90 transition-all"
            >
              Try Registering Again
            </Link>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
};

export default VerifyEmailPage;
