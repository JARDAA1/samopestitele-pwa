// Mock Supabase client pro WEB
// Tento soubor se používá POUZE na webu a neobsahuje žádný Supabase kód
// Důvod: @supabase/supabase-js způsobuje React error 310 na webu

console.warn('WEB: Používám mock Supabase client - reálná data nejsou dostupná');

// Mock client který vrací prázdná data
export const supabase = {
  from: (table: string) => ({
    select: () => ({
      eq: () => ({ data: [], error: null }),
      neq: () => ({ data: [], error: null }),
      order: () => ({ data: [], error: null }),
      single: () => ({ data: null, error: { message: 'Supabase není dostupný na webu' } }),
    }),
    insert: () => ({ data: null, error: { message: 'Supabase není dostupný na webu' } }),
    update: () => ({ data: null, error: { message: 'Supabase není dostupný na webu' } }),
    delete: () => ({ data: null, error: { message: 'Supabase není dostupný na webu' } }),
  }),
  auth: {
    getSession: async () => ({ data: { session: null }, error: null }),
    signInWithPassword: async () => ({ data: null, error: { message: 'Supabase není dostupný na webu' } }),
    signOut: async () => ({ error: null }),
  },
  storage: {
    from: () => ({
      upload: async () => ({ data: null, error: { message: 'Supabase není dostupný na webu' } }),
      getPublicUrl: () => ({ data: { publicUrl: '' } }),
    }),
  },
};
