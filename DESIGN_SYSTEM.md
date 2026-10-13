# Small Moves — Design System & Brand Guidelines

> **System Name:** Small Moves Brand & UI System
> **Target Application:** Small Moves Principal Emergency Fund — Principal Portal & Admin Operations
> **Version:** 2.6.0 (merged + token-reconciled + one white rail across both portals)
> **Supersedes:** `DESIGN_SYSTEM.md` v1.0.0 (admin/navy spec), `DESIGN.md` (principal/light spec)
> **Machine-readable companion:** [`designTokens.ts`](./src/designTokens.ts) — same values, same version. Change both together.

---

## 1. Brand Identity & Overview

**Small Moves** empowers public school principals with fast, flexible emergency funds to
support students and families in crisis. The product is two surfaces on one system:

| Surface | Audience | Left rail |
| :--- | :--- | :--- |
| **Principal Portal** | School principals requesting funds | **White** (`#FFFFFF`) |
| **Admin Operations** | Small Moves staff triaging & disbursing | **White** (`#FFFFFF`) — identical |

Both portals share one palette, one type ramp, one status vocabulary, one component set,
**and one rail**. The chrome is identical. The only difference between them is *what is in*
the rail — the nav destinations and the permissions behind them — never how it looks.

### Visual Identity Archetype
- **Tone:** Objective, trustworthy, operational, modern, human-centric.
- **Aesthetic:** Crisp light workspace, soft balanced typography, semantic status tinting,
  zero visual clutter.
- **Key Tenet:** High legibility without aggressive borders or noisy decorative accents.

### Logo Lockup
- **Font:** `Barlow Condensed`, Bold Italic.
- **Wordmark colors:** "PRINCIPAL" `#0089B3` (Cyan) · "EMERGENCY" `#8A2BE2` (Display Purple) ·
  "FUND" `#6EBF00` (Lime).
- **Backdrop:** tilted tile mark in `#C7DCF0` (Light Blue).
- **Logo container (in sidebar):** plain `bg-white rounded-2xl`.

---

## 2. Color Palette & Token Reference

### A. Brand & Accent — canonical values

| Token Name | Hex | Tailwind / CSS | Role | Contrast |
| :--- | :--- | :--- | :--- | :--- |
| **Brand Cyan** | `#0089B3` | `bg-[#0089B3]`, `text-[#0089B3]` | Brand mark, active nav icons, primary CTA fill, focus rings | 4.02:1 on white — **large text / UI only** |
| **Brand Cyan Text** | `#006E8F` | `text-[#006E8F]` | All cyan *body-size* text, including on cyan tints | 5.79:1 on white · 5.32:1 on `#EDF7FC` ✅ AA |
| **Lime** | `#6EBF00` | `bg-[#6EBF00]` | Logo "FUND", accent dots, payout emphasis, queue counters | 2.30:1 on white — **fill/graphic only, never text** |
| **Lime Text** | `#2D5F00` | `text-[#2D5F00]` | Green text on lime tints | 7.20:1 on `#F2FCE2` ✅ AAA |
| **Lime Tint / Muted** | `#F2FCE2` / `#E2F7C2` | `bg-[#F2FCE2]` | Positive status surface; muted is the gradient stop | — |
| **Display Purple** | `#8A2BE2` | `text-[#8A2BE2]` | Logo "EMERGENCY", emergency priority graphics, accent dots | Display use only |
| **Purple Text** | `#6A1CB8` | `text-[#6A1CB8]` | "Waiting on Beneficiary" pill text | 7.50:1 on `#F5EEFE` ✅ AAA |
| **Brand Light Tint** | `#EDF7FC` | `bg-[#EDF7FC]` | Info badges, role tags, "In Review" pill background | — |
| **Brand Soft Tint** | `#E1F2FB` | `bg-[#E1F2FB]` | Slightly deeper cyan surface (hover, nested tint) | 5.04:1 with `#006E8F` ✅ AA |
| **Rail Surface** | `#FFFFFF` | `bg-white` | The left rail in **both** portals — surface, items, logo, profile. All of it | — |
| **Light Blue** | `#C7DCF0` | `border-[#C7DCF0]` | Left-nav right border, dividers, logo tile backdrop | — |
| **Soft Ice Tint** | `#EDF5FB` | `bg-[#EDF5FB]` | **Selected left-rail item** (the rail's only fill), plus tinted cards and info panels elsewhere | 16.2:1 with `text-slate-900` ✅ AAA |
| **Command Navy** | `#0B132B` | `bg-[#0B132B]` | Near-black ink and dark popovers/tooltips only. **No longer a nav surface** | 18.38:1 vs white ✅ AAA |
| **Command Navy Elevation** | `#1E293B` | `bg-slate-800` | Selected dark nav items, elevated dark popovers | — |

---

## 3. Typography Hierarchy

### Font Families
1. **Primary Interface Font:** `Plus Jakarta Sans`, system-ui, sans-serif
   — geometric, high legibility. Weights `400` / `500` / `600` / `700`.
2. **Brand Display Font (logo only):** `Barlow Condensed`, Bold Italic.
