import { createClient } from '@supabase/supabase-js'

// ============================================================
// Lecture des credentials depuis localStorage
// (configurés au premier lancement via la page Setup)
// ============================================================
export function getCredentials() {
  try {
    return {
      url: localStorage.getItem('bahnel_supabase_url') || '',
      key: localStorage.getItem('bahnel_supabase_key') || '',
    }
  } catch {
    return { url: '', key: '' }
  }
}

export function saveCredentials(url, key) {
  try {
    localStorage.setItem('bahnel_supabase_url', url.trim())
    localStorage.setItem('bahnel_supabase_key', key.trim())
    return true
  } catch {
    return false
  }
}

export function clearCredentials() {
  try {
    localStorage.removeItem('bahnel_supabase_url')
    localStorage.removeItem('bahnel_supabase_key')
  } catch {}
}

export function isConfigured() {
  const { url, key } = getCredentials()
  return url.startsWith('https://') && key.length > 20
}

// Créer le client Supabase dynamiquement avec les credentials du localStorage
function createDynamicClient() {
  const { url, key } = getCredentials()
  if (url && key) {
    return createClient(url, key, { auth: { persistSession: false } })
  }
  // Client factice si pas encore configuré (ne fera rien)
  return createClient('https://placeholder.supabase.co', 'placeholder', {
    auth: { persistSession: false }
  })
}

export let supabase = createDynamicClient()

// Réinitialiser le client après configuration
export function reinitSupabase() {
  supabase = createDynamicClient()
}

// Tables qui ont une colonne updated_at
const TABLES_WITH_UPDATED_AT = new Set([
  'settings', 'prestataires', 'clients', 'prestations_catalogue',
  'rendez_vous', 'factures', 'fournisseurs', 'produits', 'depenses',
])

// ===== HELPERS CRUD =====
export const db = {

  async get(table, options = {}) {
    let query = supabase.from(table).select(options.select || '*')
    if (options.eq) {
      Object.entries(options.eq).forEach(([k, v]) => { query = query.eq(k, v) })
    }
    if (options.order) {
      query = query.order(options.order, { ascending: options.asc === true })
    }
    if (options.limit)  query = query.limit(options.limit)
    if (options.single) query = query.single()
    const { data, error } = await query
    if (error) throw error
    return data
  },

  async insert(table, payload) {
    const { data, error } = await supabase
      .from(table).insert(payload).select().single()
    if (error) throw error
    return data
  },

  async insertMany(table, payload) {
    const { data, error } = await supabase
      .from(table).insert(payload).select()
    if (error) throw error
    return data
  },

  async update(table, id, payload) {
    const enriched = TABLES_WITH_UPDATED_AT.has(table)
      ? { ...payload, updated_at: new Date().toISOString() }
      : { ...payload }
    const { data, error } = await supabase
      .from(table).update(enriched).eq('id', id).select().single()
    if (error) throw error
    return data
  },

  async delete(table, id) {
    const { error } = await supabase.from(table).delete().eq('id', id)
    if (error) throw error
    return true
  },

  async getSetting(cle) {
    const { data } = await supabase
      .from('settings').select('valeur').eq('cle', cle).single()
    return data?.valeur ?? null
  },

  async setSetting(cle, valeur) {
    const { error } = await supabase.from('settings')
      .upsert({ cle, valeur, updated_at: new Date().toISOString() }, { onConflict: 'cle' })
    if (error) throw error
    return true
  },
}
