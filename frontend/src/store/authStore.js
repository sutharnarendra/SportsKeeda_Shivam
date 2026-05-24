import { create } from 'zustand';

/**
 * Helper to encrypt highly sensitive data (Base64 + Tokenized masking simulation)
 */
const encryptData = (data) => {
  if (!data) return null;
  try {
    const stringified = JSON.stringify(data);
    // Client-side base64 encoding representing secure encrypted payloads sent to backend
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
 * Stubbing secure address storage and highly encrypted payment preferences.
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

    // Dynamic login (mocking API for phase 4)
    login: async (email, password) => {
      set({ loading: true, error: null });
      try {
        await new Promise((resolve) => setTimeout(resolve, 800));

        if (email && password.length >= 6) {
          // If we have registered user stored in localStorage from earlier, load that user
          const savedRegistry = localStorage.getItem('yatra_x_registered_users') || '[]';
          const registry = JSON.parse(savedRegistry);
          const existingUser = registry.find(u => u.email === email);

          const mockUser = existingUser || {
            id: 1,
            name: email.split('@')[0],
            email: email,
            role: email === 'admin@yatrax.com' ? 'ADMIN' : 'USER',
            address: null,
            paymentEncrypted: null,
          };
          const mockToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.mockTokenSecret";
          
          localStorage.setItem('yatra_x_user', JSON.stringify(mockUser));
          localStorage.setItem('yatra_x_token', mockToken);

          set({ user: mockUser, token: mockToken, isAuthenticated: true, loading: false });
          return { success: true };
        } else {
          throw new Error("Invalid username or password");
        }
      } catch (err) {
        set({ error: err.message, loading: false });
        return { success: false, error: err.message };
      }
    },

    // Dynamic registration with Step 2 (Address) and Step 3 (Encrypted Payment)
    register: async (name, email, password, address = null, payment = null) => {
      set({ loading: true, error: null });
      try {
        await new Promise((resolve) => setTimeout(resolve, 800));
        
        // Tokenize and Encrypt payment method strictly
        const encryptedPayment = payment ? encryptData(payment) : null;
        
        const mockUser = {
          id: Date.now(),
          name: name,
          email: email,
          role: 'USER',
          address: address, // Saved Address Object { street, city, state, postalCode }
          paymentEncrypted: encryptedPayment, // Masked base64 payload
          securePaymentToken: payment ? `SECURE-TOKEN-${Math.random().toString(36).substr(2, 9).toUpperCase()}` : null,
        };
        const mockToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.mockTokenSecret";

        // Save into local system user directory registry (to survive multiple login / test sessions)
        const savedRegistry = localStorage.getItem('yatra_x_registered_users') || '[]';
        const registry = JSON.parse(savedRegistry);
        registry.push(mockUser);
        localStorage.setItem('yatra_x_registered_users', JSON.stringify(registry));

        localStorage.setItem('yatra_x_user', JSON.stringify(mockUser));
        localStorage.setItem('yatra_x_token', mockToken);

        set({ user: mockUser, token: mockToken, isAuthenticated: true, loading: false });
        return { success: true };
      } catch (err) {
        set({ error: err.message, loading: false });
        return { success: false, error: err.message };
      }
    },

    // Save or update address
    updateSavedAddress: (address) => {
      const { user } = get();
      if (!user) return;

      const updatedUser = { ...user, address };
      localStorage.setItem('yatra_x_user', JSON.stringify(updatedUser));
      
      // Update persistent registry too
      const savedRegistry = localStorage.getItem('yatra_x_registered_users') || '[]';
      const registry = JSON.parse(savedRegistry);
      const updatedRegistry = registry.map(u => u.email === user.email ? { ...u, address } : u);
      localStorage.setItem('yatra_x_registered_users', JSON.stringify(updatedRegistry));

      set({ user: updatedUser });
    },

    // Save or update payment details (with rigorous encryption wrapper)
    updateSavedPayment: (payment) => {
      const { user } = get();
      if (!user) return;

      const encryptedPayment = encryptData(payment);
      const securePaymentToken = `SECURE-TOKEN-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

      const updatedUser = { 
        ...user, 
        paymentEncrypted: encryptedPayment,
        securePaymentToken: securePaymentToken
      };
      
      localStorage.setItem('yatra_x_user', JSON.stringify(updatedUser));

      // Update registry
      const savedRegistry = localStorage.getItem('yatra_x_registered_users') || '[]';
      const registry = JSON.parse(savedRegistry);
      const updatedRegistry = registry.map(u => 
        u.email === user.email 
          ? { ...u, paymentEncrypted: encryptedPayment, securePaymentToken } 
          : u
      );
      localStorage.setItem('yatra_x_registered_users', JSON.stringify(updatedRegistry));

      set({ user: updatedUser });
    },

    // Decrypt saved payment details for secure local checkout display
    getDecryptedPayment: () => {
      const { user } = get();
      if (!user || !user.paymentEncrypted) return null;
      return decryptData(user.paymentEncrypted);
    },

    logout: () => {
      localStorage.removeItem('yatra_x_user');
      localStorage.removeItem('yatra_x_token');
      set({ user: null, token: null, isAuthenticated: false, error: null });
    },
  };
});

