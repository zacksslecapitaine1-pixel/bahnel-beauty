# Bahnel Beauty Institute — Application de gestion de salon

Application web de gestion complète pour un institut de beauté : rendez-vous, clients, prestations, prestataires, stock, ventes, finances et rapports.

**Démo :** https://zacksslecapitaine1-pixel.github.io/bahnel-beauty/

## Fonctionnalités

- Tableau de bord avec graphiques (chiffre d'affaires, rendez-vous, performances)
- Gestion des rendez-vous, clients et catalogue de prestations
- Espace prestataire (clients, ventes, stock, commissions)
- Produits, fournisseurs, mouvements de stock
- Ventes, factures, paiements, dépenses et finances
- Rapports et export PDF
- Notifications et paramètres

## Stack technique

React 18 · Vite · Tailwind CSS · React Router (HashRouter) · Zustand · Supabase · Recharts · jsPDF

## Architecture

```
bahnel-beauty/
├── src/
│   ├── pages/            Dashboard, rendez-vous, clients, prestations, prestataires,
│   │                     produits, fournisseurs, ventes, finances, rapports, paramètres
│   ├── components/       layout (Navbar, Sidebar) et composants UI partagés
│   ├── store/            état global (Zustand)
│   ├── lib/              client Supabase, export PDF
│   └── assets/
├── supabase_schema.sql   schéma de la base (18 tables)
├── vite.config.js
└── .github/workflows/    déploiement GitHub Pages
```

## Installation

```bash
npm install
npm run dev
```

Au premier lancement, la page **Setup** demande l'URL et la clé publique (anon) de votre projet Supabase. Exécutez d'abord `supabase_schema.sql` dans le SQL Editor de Supabase.

## Déploiement

Le workflow GitHub Actions construit l'application et la publie sur GitHub Pages à chaque push sur `master`.

## Auteur

Créé par **Zackss (Oumate Razakou)** — [Dev.zak](https://dev-zak.netlify.app), développeur Full Stack & automatisation IA à Lomé, Togo.
