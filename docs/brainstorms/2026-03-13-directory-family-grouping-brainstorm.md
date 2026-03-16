---
date: 2026-03-13
topic: directory-family-grouping
platform: cross-platform-mobile
---

# Directory: Family Grouping & Last Name Sort

## What We're Building

Reorganize the member directory from a flat alphabetical list into family-grouped sections sorted by last name. Each household from Planning Center becomes a section (e.g., "The Coe Family") with individual members listed underneath. Single individuals appear as single-person sections. An A-Z section index strip enables quick navigation. Search matches both family names and individual member names.

## Why This Approach

- **Enrich Firestore at sync time (Approach A):** Add `firstName`, `lastName`, `householdId`, and `householdName` fields to each member document during the Planning Center sync. The app groups and sorts client-side using this enriched data.
- Rejected: Separate `households` Firestore collection — over-engineered for current needs, adds fetch complexity and sync burden.

## Key Decisions

1. **Data source:** Planning Center People is the source of truth. Existing sync scripts will be updated to pull household and name data.
2. **Data model change:** `MemberProfile` gains `firstName`, `lastName`, `householdId`, and `householdName` fields. `displayName` is retained for backward compatibility.
3. **Sort order:** Sections sorted alphabetically by household last name (derived from `householdName` or primary member's `lastName`).
4. **Family display:** Section headers ("The Coe Family") with individual members listed below. Single individuals get their own section — no special "ungrouped" treatment.
5. **Section index:** A-Z letter strip on the right side for quick jumping by last name initial.
6. **Search behavior:** Filters both family/household names and individual member names. Typing "Coe" shows the entire Coe family section; typing "Sam" shows Sam's entry.
7. **Platform:** Cross-platform mobile (React Native/Expo) — single implementation for iOS and Android.

## Resolved Questions

- **Where does member data live?** Planning Center, synced to Firestore via scripts.
- **How to define families?** Use Planning Center's built-in household groupings.
- **How to handle singles?** Treat as single-person families — consistent display.
- **Search scope?** Match both family names and individual names.
- **Section index?** Yes, include A-Z strip for quick navigation.
- **Member ordering within a family:** Head of household (PC primary contact) listed first, then remaining members alphabetically.
- **Section header format:** Use Planning Center's household name directly rather than a fixed "The [LastName] Family" template.
