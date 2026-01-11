# PhysioFlow - Modern PT EHR System

> A ground-up redesign of Physical Therapy EHR for Vietnamese healthcare settings

---

## Overview

PhysioFlow is a proposed modern replacement for OpenEMR's Vietnamese PT module, addressing critical UX issues while providing world-class bilingual support, offline capabilities, and clinical workflow optimization.

### Key Improvements Over OpenEMR

| Metric | OpenEMR | PhysioFlow |
|--------|---------|------------|
| **Visit workflow** | Form-based navigation | **Checklist-driven** |
| Clicks to common action | 5-7 | **1-3 (one-tap actions)** |
| Documentation time | ~15 min/patient | **~5 min/patient** |
| **Onboarding time** | 2 weeks | **15 minutes** |
| Mobile support | None | Mobile-first PWA |
| Offline capability | None | Full offline |
| Vietnamese UX | Functional but clunky | Native bilingual |
| SOAP notes | Manual typing | **Auto-generated from checklist** |
| Scheduling next visit | Exit → Calendar → Search | **One tap: "+3 days"** |
| Error recovery | Lost data possible | **Everything recoverable** |
| **Patient check-in** | Staff required | **Self-service (QR/kiosk)** |
| **Staff training** | Weeks | **< 1 hour** |
| **Walk-in to treatment** | 15+ minutes | **< 5 minutes** |

### Core Innovation: Checklist-Driven Visits

> **The visit IS the checklist.** Instead of navigating forms, therapists complete a smart checklist and documentation auto-generates.

```
Traditional EHR:  Form → Form → Form → Type notes → Save → Schedule
PhysioFlow:       Start Session → Tap checklist items → Done (note auto-generated)
```

---

## Documents

| Document | Description |
|----------|-------------|
| [DESIGN.md](./DESIGN.md) | Complete product design, wireframes, user flows, database schema, API design, implementation roadmap |
| [TECH_STACK.md](./TECH_STACK.md) | Technical specifications, framework comparisons, component mappings, infrastructure specs |

---

## Technology Stack

```
Frontend:    Next.js 14 + TypeScript + shadcn/ui
Mobile:      React Native (Expo)
Backend:     Go 1.22 + Echo v4
Database:    PostgreSQL 16
Cache:       Redis 7
Auth:        Keycloak (OAuth2 + OIDC)
Infra:       Kubernetes (K3s)
```

### UI Component Library: shadcn/ui

- 60+ production-ready components
- Built on Tailwind CSS + Radix UI
- WCAG 2.2 accessible
- Full code ownership (copy-paste, not npm)
- Healthcare-proven (Tiro.Health case study)

---

## Quick Links

### Checklist-Driven Visits (Core Feature)
- **Checklist Workflow**: See [DESIGN.md#checklist-driven-visit-workflow](./DESIGN.md#part-2b-checklist-driven-visit-workflow-fast-visit-mode)
- **One-Tap Actions**: See [DESIGN.md#one-tap-clinical-actions](./DESIGN.md#2b2-one-tap-clinical-actions)
- **Quick Visit Wireframe**: See [DESIGN.md#quick-visit-mode-wireframe](./DESIGN.md#2b4-quick-visit-mode-wireframe-mobile)
- **Checklist Database Schema**: See [DESIGN.md#checklist-database-schema](./DESIGN.md#41b-checklist-system-database-schema)
- **Quick Action APIs**: See [DESIGN.md#quick-action-api-examples](./DESIGN.md#41d-quick-action-api-examples)

### Usability & Experience
- **Onboarding**: See [DESIGN.md#onboarding](./DESIGN.md#part-2c-onboarding--first-run-experience) - 15-minute productivity goal
- **Error Handling**: See [DESIGN.md#error-handling](./DESIGN.md#part-2d-error-handling--edge-cases) - Every error recoverable
- **Mobile Touch**: See [DESIGN.md#mobile-optimization](./DESIGN.md#part-2e-mobile-first-touch-optimization) - One-thumb operation
- **Navigation Fixes**: See [DESIGN.md#navigation-fixes](./DESIGN.md#part-2f-navigation--information-architecture-fixes)

### Complete Stakeholder Journeys (All Roles)
- **Therapist Full Day**: See [DESIGN.md#therapist-day](./DESIGN.md#2g2-therapist-full-day-flow) - 8 patients, zero pending at EOD
- **PT Assistant Full Day**: See [DESIGN.md#pt-assistant-day](./DESIGN.md#2g3-pt-assistant-full-day-flow) - Support therapists seamlessly
- **Front Desk Full Day**: See [DESIGN.md#front-desk-day](./DESIGN.md#2g4-front-desk-staff-full-day-flow) - Every task < 10 sec
- **Patient Journey**: See [DESIGN.md#patient-journey](./DESIGN.md#part-2h-patient-experience-design) - Self-service at every step
- **Family/Caregiver Access**: See [DESIGN.md#family-access](./DESIGN.md#2h3-familycaregiver-access-flow) - Authorized care support
- **Staff Quick Actions**: See [DESIGN.md#staff-actions](./DESIGN.md#2i1-front-desk-quick-actions) - 12 common tasks solved
- **Manager Dashboard**: See [DESIGN.md#manager](./DESIGN.md#2i4-clinic-manager-dashboard) - Clinic health at a glance
- **Seamless Handoffs**: See [DESIGN.md#handoffs](./DESIGN.md#part-2j-seamless-handoffs--transitions) - Zero-friction transitions
- **Quality Checklist**: See [DESIGN.md#quality](./DESIGN.md#part-2k-experience-quality-checklist) - Final validation

### General Design
- **Wireframes**: See [DESIGN.md#wireframe-descriptions](./DESIGN.md#26-wireframe-descriptions)
- **Database Schema**: See [DESIGN.md#database-schema](./DESIGN.md#41-database-schema-design)
- **API Endpoints**: See [DESIGN.md#api-design](./DESIGN.md#42-api-design-summary)
- **Component Mapping**: See [TECH_STACK.md#shadcnui-component-mapping](./TECH_STACK.md#shadcnui-component-mapping-for-physioflow)
- **Implementation Roadmap**: See [DESIGN.md#implementation-roadmap](./DESIGN.md#part-5-implementation-roadmap)

---

## Investment Summary

- **Timeline**: 9 months (single release)
- **Team Size**: 10-12 engineers (5 parallel workstreams)
- **Budget**: $900K - $1.4M USD
- **Delivery**: Complete system, all features at launch

---

**Version**: 1.3
**Last Updated**: January 2026
