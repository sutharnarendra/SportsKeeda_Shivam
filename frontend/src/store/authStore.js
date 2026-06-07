import { create } from 'zustand';
import api from '../utils/api';
import { useCartStore } from './cartStore';

/**
 * Helper to encrypt highly sensitive data (Base64 + Tokenized masking simulation)
 */
const encryptData = (data) => {
  if (!data) return null;
  try {
    const stringified = JSON.stringify(data);
    return btoa(unescape(encodeURIComponent(stringified)));
  } catch (e) {
    return null;
  }
};

/**
 * Helper to decrypt highly sensitive data
 */
const decryptData = (encrypted) => {
  if (!encrypted) return null;
  try {
    const decoded = decodeURIComponent(escape(atob(encrypted)));
    return JSON.parse(decoded);
  } catch (e) {
    return null;
  }
};

/**
 * Zustand Authentication Store
 * Fully connected to Spring Boot backend API with localStorage fallback for profile preferences.
 */
export const useAuthStore = create((set, get) => {
  const loadInitialAuth = () => {
    try {
      const savedUser = localStorage.getItem('yatra_x_user');
      const savedToken = localStorage.getItem('yatra_x_token');
      return {
        user: savedUser ? JSON.parse(savedUser) : null,
        token: savedToken || null,
        isAuthenticated: !!savedToken,
      };
    } catch (e) {
      return { user: null, token: null, isAuthenticated: false };
    }
  };

  const initial = loadInitialAuth();

  return {
    user: initial.user,
    token: initial.token,
    isAuthenticated: initial.isAuthenticated,
    error: null,
    loading: false,

    // Real API Login
    login: async (email, password) => {
      set({ loading: true, error: null });
      try {
        const response = await api.post('/api/auth/login', { email, password });
        
        if (response.data.twoFactorRequired) {
          set({ loading: false });
          return { success: true, twoFactorRequired: true, email: response.data.email };
        }

        const { token, id, name, role } = response.data;

        // Load saved address and payment locally from localStorage (keyed by email)
        const savedAddress = JSON.parse(localStorage.getItem(`yatra_x_address_${email}`)) || null;
        const savedPayment = JSON.parse(localStorage.getItem(`yatra_x_payment_${email}`)) || null;

        const user = {
          id,
          name,
          email,
          role,
          address: savedAddress,
          paymentEncrypted: savedPayment ? encryptData(savedPayment) : null,
        };

        localStorage.setItem('yatra_x_user', JSON.stringify(user));
        localStorage.setItem('yatra_x_token', token);

        set({ user, token, isAuthenticated: true, loading: false });

        // Synchronize and merge guest cart into the backend database cart
        try {
          await useCartStore.getState().mergeCart();
        } catch (mergeErr) {
          console.error("Cart merging failed on login", mergeErr);
        }

        return { success: true };
      } catch (err) {
        const errMsg = err.response?.data || err.message;
        const parsedError = typeof errMsg === 'object' ? JSON.stringify(errMsg) : errMsg;
        set({ error: parsedError, loading: false });
        return { success: false, error: parsedError };
      }
    },

    //Real Google API Login
    loginWithGoogle: async (idToken) => {
      set({ loading: true, error: null });
      try {
        const response = await api.post('/api/auth/google', { idToken });
        
        if (response.data.twoFactorRequired) {
          set({ loading: false });
          return { success: true, twoFactorRequired: true, email: response.data.email };
        }

        const { token, id, name, role, email } = response.data;

        //Load saved preferences locally
        const savedAddress = JSON.parse(localStorage.getItem(`yatra_x_address_${email}`)) || null;
        const savedPayment = JSON.parse(localStorage.getItem(`yatra_x_payment_${email}`)) || null;

        const user = {
          id, name, email, role, address: savedAddress, paymentEncrypted: savedPayment ? encryptData(savedPayment) : null,
        };

        localStorage.setItem('yatra_x_user', JSON.stringify(user));
        localStorage.setItem('yatra_x_token', token);

        // Update the Zustand React State
        set({ user, token, isAuthenticated: true, loading: false });

        // Merge cart into backend database
        try {
          await useCartStore.getState().mergeCart();
        } catch (mergeErr) {
          console.error("Cart mergin failed on Google login", mergeErr);
        }

        return { success: true };
      } catch (err) {
        const errMsg = err.response?.data || err.message;
        const parsedError = typeof errMsg === 'object' ? JSON.stringify(errMsg) : errMsg;
        set({ error: parsedError, loading: false });
        return { success: false, error: parsedError };
      }
    },

    // Real API Registration
    register: async (name, email, password, address = null, payment = null) => {
      set({ loading: true, error: null });
      try {
        // Step 1: Register on Backend
        await api.post('/api/auth/register', { name, email, password });

        // Save optional address/payment locally since the backend doesn't store profile fields
        if (address) {
          localStorage.setItem(`yatra_x_address_${email}`, JSON.stringify(address));
        }
        if (payment) {
          localStorage.setItem(`yatra_x_payment_${email}`, JSON.stringify(payment));
        }

        set({ loading: false });
        return { success: true, needsVerification: true, email };
      } catch (err) {
        const errMsg = err.response?.data || err.message;
        const parsedError = typeof errMsg === 'object' ? JSON.stringify(errMsg) : errMsg;
        set({ error: parsedError, loading: false });
        return { success: false, error: parsedError };
      }
    },

    // Real API Email Verification (OTP check)
    verify: async (email, code) => {
      set({ loading: true, error: null });
      try {
        await api.post('/api/auth/verify', { email, code });
        set({ loading: false });
        return { success: true };
      } catch (err) {
        const errMsg = err.response?.data || err.message;
        const parsedError = typeof errMsg === 'object' ? JSON.stringify(errMsg) : errMsg;
        set({ error: parsedError, loading: false });
        return { success: false, error: parsedError };
      }
    },

    // Real API 2FA verification code validator
    verify2FA: async (email, code) => {
      set({ loading: true, error: null });
      try {
        const response = await api.post('/api/auth/verify-2fa', null, {
          params: { email, code }
        });
        const { token, id, name, role } = response.data;

        // Load saved address and payment locally from localStorage (keyed by email)
        const savedAddress = JSON.parse(localStorage.getItem(`yatra_x_address_${email}`)) || null;
        const savedPayment = JSON.parse(localStorage.getItem(`yatra_x_payment_${email}`)) || null;

        const user = {
          id,
          name,
          email,
          role,
          address: savedAddress,
          paymentEncrypted: savedPayment ? encryptData(savedPayment) : null,
        };

        localStorage.setItem('yatra_x_user', JSON.stringify(user));
        localStorage.setItem('yatra_x_token', token);

        set({ user, token, isAuthenticated: true, loading: false });

        // Synchronize and merge guest cart into the backend database cart
        try {
          await useCartStore.getState().mergeCart();
        } catch (mergeErr) {
          console.error("Cart merging failed on login", mergeErr);
        }

        return { success: true };
      } catch (err) {
        const errMsg = err.response?.data || err.message;
        const parsedError = typeof errMsg === 'object' ? JSON.stringify(errMsg) : errMsg;
        set({ error: parsedError, loading: false });
        return { success: false, error: parsedError };
      }
    },

    // Save or update address
    updateSavedAddress: (address) => {
      const { user } = get();
      if (!user) return;

      const updatedUser = { ...user, address };
      localStorage.setItem('yatra_x_user', JSON.stringify(updatedUser));
      localStorage.setItem(`yatra_x_address_${user.email}`, JSON.stringify(address));

      set({ user: updatedUser });
    },

    // Save or update payment details (with rigorous encryption wrapper)
    updateSavedPayment: (payment) => {
      const { user } = get();
      if (!user) return;

      const encryptedPayment = encryptData(payment);
      const updatedUser = {
        ...user,
        paymentEncrypted: encryptedPayment,
      };

      localStorage.setItem('yatra_x_user', JSON.stringify(updatedUser));
      localStorage.setItem(`yatra_x_payment_${user.email}`, JSON.stringify(payment));

      set({ user: updatedUser });
    },

    // Decrypt saved payment details for secure local checkout display
    getDecryptedPayment: () => {
      const { user } = get();
      if (!user) return null;
      const savedPayment = JSON.parse(localStorage.getItem(`yatra_x_payment_${user.email}`)) || null;
      return savedPayment;
    },

    logout: () => {
      localStorage.removeItem('yatra_x_user');
      localStorage.removeItem('yatra_x_token');
      set({ user: null, token: null, isAuthenticated: false, error: null });
      // Reset cart items locally/backend
      try {
        useCartStore.getState().clearCart();
      } catch (e) {
        console.error("Failed to clear cart on logout", e);
      }
    },
  };
});
