import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { db } from '../lib/supabase'

// ===== AUTH STORE =====
export const useAuthStore = create(
  persist(
    (set, get) => ({
      role:            null,
      prestataire:     null,
      isAuthenticated: false,
      permissions: {
        planning:         true,
        clients_voir:     true,
        clients_modifier: false,
        ventes:           true,
        stock_voir:       true,
        commissions_voir: true,
      },

      loginDirectrice: async (password) => {
        try {
          const stored = await db.getSetting('directrice_password')
          if (password === (stored || 'bahnel2025')) {
            set({ role: 'directrice', isAuthenticated: true, prestataire: null })
            return { success: true }
          }
          return { success: false, message: 'Mot de passe incorrect.' }
        } catch {
          if (password === 'bahnel2025') {
            set({ role: 'directrice', isAuthenticated: true, prestataire: null })
            return { success: true }
          }
          return { success: false, message: 'Erreur de connexion.' }
        }
      },

      loginPrestataire: async (prestataire) => {
        try {
          const raw   = await db.getSetting('permissions_prestataires')
          const perms = raw ? JSON.parse(raw) : {}
          set({ role: 'prestataire', isAuthenticated: true, prestataire, permissions: perms })
        } catch {
          set({ role: 'prestataire', isAuthenticated: true, prestataire })
        }
        return { success: true }
      },

      logout: () => set({ role: null, isAuthenticated: false, prestataire: null }),

      hasPermission: (perm) => {
        const { role, permissions } = get()
        if (role === 'directrice') return true
        return permissions[perm] === true
      },

      updatePermissions: (p) => set({ permissions: p }),
    }),
    {
      name: 'bahnel-auth-v1',
      getStorage: () => {
        try { return window.sessionStorage } catch { return null }
      },
      partialize: (s) => ({
        role: s.role,
        prestataire: s.prestataire,
        isAuthenticated: s.isAuthenticated,
        permissions: s.permissions,
      }),
    }
  )
)

// ===== APP STORE =====
export const useAppStore = create((set) => ({
  sidebarOpen:   true,
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  syncing:       false,
  lastSync:      null,
  setSyncing:    (v) => set({ syncing: v }),
  setLastSync:   () => set({ lastSync: new Date() }),
}))

// ===== NOTIF STORE =====
export const useNotifStore = create((set) => ({
  notifications: [],
  unread: 0,
  setNotifications: (n) => set({ notifications: n, unread: n.filter(x => !x.lu).length }),
  markRead: (id) => set((s) => ({
    notifications: s.notifications.map(n => n.id === id ? { ...n, lu: true } : n),
    unread: Math.max(0, s.unread - 1),
  })),
  markAllRead: () => set((s) => ({
    notifications: s.notifications.map(n => ({ ...n, lu: true })),
    unread: 0,
  })),
}))
