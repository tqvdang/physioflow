# PhysioFlow Technology Stack
## Complete Technical Specification

---

## Recommended Stack Summary

```
+-------------------+----------------------------------+
|     Layer         |          Technology              |
+-------------------+----------------------------------+
| Frontend (Web)    | Next.js 14 + React + TypeScript  |
| Frontend (Mobile) | React Native (Expo)              |
| UI Components     | shadcn/ui (Tailwind + Radix)     |
| State Management  | Zustand + TanStack Query         |
| Forms             | React Hook Form + Zod            |
| Data Tables       | TanStack Table                   |
| Charts            | Recharts                         |
| Backend           | Go 1.22 + Echo v4                |
| API               | REST + GraphQL (gqlgen)          |
| Database          | PostgreSQL 16                    |
| Cache             | Redis 7 Cluster                  |
| Search            | Meilisearch                      |
| File Storage      | MinIO (S3-compatible)            |
| Auth              | Keycloak (OAuth2 + OIDC)         |
| Message Queue     | NATS JetStream                   |
| Container         | Kubernetes (K3s)                 |
| CI/CD             | GitHub Actions + ArgoCD          |
| Secrets           | HashiCorp Vault                  |
| Observability     | Prometheus + Loki + Grafana      |
+-------------------+----------------------------------+
```

---

## Stack Comparison: Why These Choices

### Frontend: Next.js 14 vs Alternatives

| Criteria | Next.js 14 | Vue/Nuxt | SvelteKit | Remix |
|----------|-----------|----------|-----------|-------|
| SSR/SSG | Excellent | Good | Good | Excellent |
| React Ecosystem | Native | N/A | N/A | Native |
| TypeScript | First-class | First-class | First-class | First-class |
| PWA Support | Excellent | Good | Moderate | Moderate |
| Hiring Pool | Largest | Large | Small | Medium |
| HIPAA Examples | Many | Some | Few | Some |
| **Score** | **94/100** | 88/100 | 84/100 | 86/100 |

**Decision: Next.js 14**
- App Router with React Server Components
- Built-in image optimization (important for exercise images)
- Edge runtime for low-latency
- Massive ecosystem and hiring pool in Vietnam

### Backend: Go vs Alternatives

| Criteria | Go | Node.js | Rust | Python |
|----------|-----|---------|------|--------|
| Performance | Excellent | Good | Excellent | Moderate |
| Memory Usage | Low | High | Very Low | High |
| Concurrency | Native | Event Loop | Native | GIL Limited |
| Compilation | Fast | N/A | Slow | N/A |
| Healthcare Adoption | Growing | High | Low | High |
| Vietnamese UTF-8 | Good | Excellent | Good | Excellent |
| **Score** | **92/100** | 86/100 | 88/100 | 82/100 |

**Decision: Go with Echo**
- 10x less memory than Node.js (cost savings)
- Native goroutines for WebSocket handling
- Strong type safety for HIPAA compliance
- Fast compilation for rapid deployment

### Database: PostgreSQL vs Alternatives

| Criteria | PostgreSQL | MySQL | MongoDB | CockroachDB |
|----------|-----------|-------|---------|-------------|
| Vietnamese Collation | Native vi_VN | utf8mb4_vietnamese | ICU | ICU |
| JSONB Support | Excellent | Limited | Native | Good |
| Row-Level Security | Native | Manual | Manual | Native |
| HIPAA Tooling | Excellent | Good | Limited | Excellent |
| Horizontal Scaling | Read replicas | Read replicas | Native | Native |
| Cost | Free | Free | Paid (Atlas) | Paid |
| **Score** | **94/100** | 86/100 | 86/100 | 88/100 |

**Decision: PostgreSQL 16**
- Native Vietnamese collation (vi_VN)
- JSONB for flexible clinical data
- Row-Level Security for multi-tenant
- Logical replication for offline sync
- Free and battle-tested

---

## Detailed Component Specifications

### 1. Frontend Web Application

```yaml
package: physioflow-web
framework: Next.js 14.x (App Router)
language: TypeScript 5.3+

dependencies:
  core:
    - next: ^14.0.0
    - react: ^18.2.0
    - react-dom: ^18.2.0
    - typescript: ^5.3.0

  ui:  # shadcn/ui - copy-paste components (not npm package)
    - tailwindcss: ^3.4.0
    - tailwindcss-animate: ^1.0.0
    - class-variance-authority: ^0.7.0  # Component variants
    - clsx: ^2.0.0                      # Class utilities
    - tailwind-merge: ^2.0.0            # Merge tailwind classes
    - @radix-ui/react-*: latest         # Primitives (installed per component)
    - lucide-react: ^0.300.0            # Icons
    - recharts: ^2.10.0                 # Charts (via shadcn/ui)
    - @tanstack/react-table: ^8.10.0    # Data tables (via shadcn/ui)
    - cmdk: ^0.2.0                      # Command palette
    - vaul: ^0.9.0                      # Drawer component
    - sonner: ^1.0.0                    # Toast notifications
    - date-fns: ^3.0.0                  # Date utilities

  state:
    - zustand: ^4.4.0
    - @tanstack/react-query: ^5.0.0
    - immer: ^10.0.0

  forms:  # Integrated with shadcn/ui Form component
    - react-hook-form: ^7.48.0
    - zod: ^3.22.0
    - @hookform/resolvers: ^3.3.0

  offline:
    - next-pwa: ^5.6.0
    - dexie: ^3.2.0           # IndexedDB wrapper
    - dexie-react-hooks: ^1.1.0

  i18n:
    - next-intl: ^3.4.0

  testing:
    - vitest: ^1.0.0
    - @playwright/test: ^1.40.0
    - @testing-library/react: ^14.0.0

build:
  output: standalone
  target: esnext
  experimental:
    - serverActions: true
    - ppr: true  # Partial Prerendering

shadcn_components:
  # Install via: npx shadcn@latest add <component>
  layout:
    - sidebar          # Main navigation
    - navigation-menu  # Header navigation
    - breadcrumb       # Page breadcrumbs
    - tabs             # Content tabs
    - accordion        # Collapsible sections
    - resizable        # Resizable panels

  forms:
    - form             # React Hook Form wrapper
    - input            # Text inputs
    - textarea         # Multi-line input
    - select           # Dropdowns
    - checkbox         # Checkboxes
    - radio-group      # Radio buttons
    - switch           # Toggle switches
    - slider           # Range sliders (pain scale!)
    - calendar         # Date selection
    - date-picker      # Date picker
    - combobox         # Autocomplete

  data_display:
    - table            # Basic tables
    - data-table       # TanStack Table integration
    - card             # Content cards
    - badge            # Status badges
    - avatar           # User avatars
    - chart            # Recharts integration

  feedback:
    - toast            # Sonner notifications
    - alert            # Alert messages
    - alert-dialog     # Confirmation dialogs
    - progress         # Progress bars
    - skeleton         # Loading states
    - spinner          # Loading spinner

  overlays:
    - dialog           # Modal dialogs
    - drawer           # Slide-out panels
    - sheet            # Side sheets
    - popover          # Popovers
    - tooltip          # Tooltips
    - hover-card       # Hover previews
    - context-menu     # Right-click menus
    - dropdown-menu    # Dropdown menus

  navigation:
    - button           # Buttons
    - toggle           # Toggle buttons
    - toggle-group     # Button groups
    - command          # Command palette (Cmd+K)
    - pagination       # Page navigation

  specialty:
    - carousel         # Image carousel (exercise demos)
    - collapsible      # Collapsible content
    - scroll-area      # Custom scrollbars
    - separator        # Visual dividers
```

### shadcn/ui Component Mapping for PhysioFlow

```
+--------------------------------+----------------------------------+
| PhysioFlow Feature             | shadcn/ui Components             |
+--------------------------------+----------------------------------+
| CHECKLIST-DRIVEN VISITS (CORE)                                    |
+--------------------------------+----------------------------------+
| Visit Checklist UI             | Card, Checkbox, Progress, Badge  |
| One-Tap Pain Scale             | Slider (custom 0-10 with emoji)  |
| Quick ROM Input                | Slider, Toggle, Card             |
| Checklist Section              | Accordion, Collapsible           |
| Session Timer                  | Badge (custom timer component)   |
| Quick Schedule Buttons         | Button, ToggleGroup              |
| Auto-Generated Note Preview    | Card, Textarea (read-only)       |
| Checklist Progress Bar         | Progress                         |
| Done/Complete Button           | Button (primary, large)          |
| Voice Input Trigger            | Button (with mic icon)           |
+--------------------------------+----------------------------------+
| GENERAL FEATURES                                                  |
+--------------------------------+----------------------------------+
| Patient List                   | DataTable, Badge, Avatar, Card   |
| PT Assessment Form             | Form, Input, Slider, Textarea    |
| Pain Scale (0-10)              | Slider (custom styled)           |
| Appointment Calendar           | Calendar, DatePicker             |
| Treatment Plan                 | Accordion, Tabs, Card            |
| Bilingual Toggle               | Switch, Toggle                   |
| Clinical Notes                 | Textarea, Form                   |
| Outcome Charts                 | Chart (Recharts)                 |
| Quick Actions                  | Command (Cmd+K palette)          |
| Navigation Sidebar             | Sidebar, NavigationMenu          |
| Patient Modal                  | Dialog, Sheet                    |
| Status Indicators              | Badge, Progress                  |
| Exercise Library               | DataTable, Carousel, Card        |
| Notifications                  | Toast (Sonner)                   |
| Confirmation Dialogs           | AlertDialog                      |
| Settings Forms                 | Form, Select, Switch, RadioGroup |
| Search/Autocomplete            | Combobox, Command                |
| Mobile Navigation              | Drawer, Sheet                    |
+--------------------------------+----------------------------------+
```

### Checklist Component Details

```yaml
# Custom Components Built on shadcn/ui

visit_checklist:
  name: VisitChecklist
  base: Card, Accordion
  features:
    - Sectioned checklist display
    - Real-time progress tracking
    - Auto-save on each interaction
    - Collapse/expand sections

checklist_item:
  name: ChecklistItem
  base: Checkbox, Slider, Toggle, Input
  variants:
    - tap_checkbox: Simple checkbox with label
    - slider: Pain/percentage scale
    - quick_select: Radio-style options
    - voice_text: Input with mic button
    - yes_no: ToggleGroup with Yes/No/N/A
    - multi_select: Checkbox group
  features:
    - Delta display (↑5° from baseline)
    - One-tap completion
    - Previous value comparison

pain_slider:
  name: PainSlider
  base: Slider
  customization:
    - 0-10 scale with emoji faces
    - Color gradient (green → red)
    - Previous value marker
    - Touch-optimized thumb size

quick_schedule:
  name: QuickSchedule
  base: ToggleGroup, Button
  options:
    - "+3 days"
    - "+7 days"
    - "Custom..."
  features:
    - Auto-select next available slot
    - Confirmation toast
    - Calendar popover for custom

session_timer:
  name: SessionTimer
  base: Badge
  features:
    - Elapsed time display
    - Visual alert at target time
    - Pause/resume capability
```

### 2. Mobile Application

```yaml
package: physioflow-mobile
framework: React Native + Expo
language: TypeScript 5.3+

dependencies:
  core:
    - expo: ~50.0.0
    - react-native: 0.73.x
    - expo-router: ^3.0.0

  offline:
    - @nozbe/watermelondb: ^0.27.0
    - @nozbe/with-observables: ^1.6.0

  shared:
    - @physioflow/shared-types: workspace:*
    - @physioflow/shared-utils: workspace:*

  navigation:
    - expo-router: ^3.0.0

  notifications:
    - expo-notifications: ~0.27.0
    - @react-native-firebase/messaging: ^18.0.0

target_platforms:
  - iOS 14+
  - Android 10+
```

### 3. Backend API

```yaml
package: physioflow-api
language: Go 1.22+

dependencies:
  framework:
    - github.com/labstack/echo/v4: ^4.11.0

  database:
    - entgo.io/ent: ^0.12.0          # ORM
    - github.com/jackc/pgx/v5: ^5.5.0 # PostgreSQL driver

  api:
    - github.com/99designs/gqlgen: ^0.17.0  # GraphQL
    - github.com/swaggo/swag: ^1.16.0       # OpenAPI

  validation:
    - github.com/go-playground/validator/v10: ^10.16.0

  auth:
    - github.com/coreos/go-oidc/v3: ^3.9.0
    - github.com/golang-jwt/jwt/v5: ^5.2.0

  logging:
    - go.uber.org/zap: ^1.26.0

  testing:
    - github.com/stretchr/testify: ^1.8.0
    - github.com/golang/mock: ^1.6.0

structure:
  /cmd/api         # Main entrypoint
  /internal/
    /config        # Configuration
    /handler       # HTTP handlers
    /service       # Business logic
    /repository    # Data access
    /ent           # Generated ORM
    /middleware    # HTTP middleware
  /pkg/            # Shared packages
  /api/            # OpenAPI specs
```

### 4. Database Schema

```yaml
database: PostgreSQL 16
encoding: UTF8
collation: vi_VN.utf8
timezone: Asia/Ho_Chi_Minh

extensions:
  - uuid-ossp      # UUID generation
  - pgcrypto       # Encryption
  - pg_trgm        # Trigram for fuzzy search

tables:
  core:
    - organizations
    - clinics
    - users
    - patients
    - insurance_info

  clinical:
    - assessments
    - treatment_plans
    - treatment_sessions
    - exercise_library
    - exercise_prescriptions
    - outcome_measures

  scheduling:
    - appointments
    - recurring_patterns
    - availability

  system:
    - audit_logs
    - sync_queue
    - translations

indexes:
  - patients(last_name_vi) using btree
  - patients(phone) using hash
  - assessments(patient_id, created_at) using btree
  - audit_logs(created_at) using brin  # Efficient for time-series
```

### 5. Infrastructure

```yaml
kubernetes:
  distribution: K3s (lightweight)
  version: v1.29.x

namespaces:
  - physioflow-prod
  - physioflow-staging
  - physioflow-dev
  - observability
  - vault

workloads:
  frontend:
    replicas: 2
    resources:
      requests: { cpu: 100m, memory: 256Mi }
      limits: { cpu: 500m, memory: 512Mi }

  api:
    replicas: 3
    resources:
      requests: { cpu: 100m, memory: 256Mi }
      limits: { cpu: 500m, memory: 512Mi }

  websocket:
    replicas: 2
    resources:
      requests: { cpu: 50m, memory: 128Mi }

  worker:
    replicas: 2
    resources:
      requests: { cpu: 100m, memory: 256Mi }

ingress:
  controller: Traefik
  tls: Let's Encrypt (cert-manager)
  annotations:
    - rate-limiting: 1000/min
    - timeout: 60s
```

---

## Security Specifications

### Authentication & Authorization

```yaml
authentication:
  provider: Keycloak 23.x
  protocols:
    - OAuth 2.0
    - OpenID Connect

  flows:
    web: Authorization Code + PKCE
    mobile: Authorization Code + PKCE
    api: Client Credentials

  mfa:
    required: true (for PHI access)
    methods:
      - TOTP (Google Authenticator)
      - SMS (Vietnam carriers)

authorization:
  model: RBAC + ABAC

  roles:
    - super_admin
    - clinic_admin
    - therapist
    - assistant
    - patient

  permissions:
    - patients:read
    - patients:write
    - assessments:read
    - assessments:write
    - reports:generate
    - settings:manage
```

### Encryption

```yaml
encryption:
  at_rest:
    database: PostgreSQL TDE (pgcrypto)
    files: AES-256-GCM
    keys: Vault Transit

  in_transit:
    protocol: TLS 1.3
    ciphers:
      - TLS_AES_256_GCM_SHA384
      - TLS_CHACHA20_POLY1305_SHA256

  application:
    phi_fields: AES-256-GCM (field-level)
    key_rotation: 90 days
```

### Audit Logging

```yaml
audit:
  events:
    - authentication
    - authorization
    - data_access
    - data_modification
    - data_export
    - configuration_change

  retention: 7 years (HIPAA)

  fields:
    - timestamp
    - user_id
    - action
    - resource_type
    - resource_id
    - old_value (hashed)
    - new_value (hashed)
    - ip_address
    - user_agent
```

---

## Performance Targets

| Metric | Target | Measurement |
|--------|--------|-------------|
| Page Load (FCP) | < 1.5s | Lighthouse |
| API Response (p50) | < 100ms | Prometheus |
| API Response (p95) | < 500ms | Prometheus |
| API Response (p99) | < 2s | Prometheus |
| Concurrent Users | 1000+ | Load Test |
| Database Queries | < 50ms | pg_stat |
| Offline Sync | < 30s | E2E Test |
| Mobile App Size | < 50MB | App Store |
| PWA Size | < 5MB | Build |

---

## Vietnamese-Specific Requirements

### Text Handling

```yaml
vietnamese:
  encoding: UTF-8 (utf8mb4 equivalent)
  collation: vi_VN.utf8
  font:
    primary: "Be Vietnam Pro"  # Google Font
    fallback: "Noto Sans Vietnamese"

  text_processing:
    normalization: NFC
    diacritics: preserved
    search: ICU + trigram

  name_handling:
    order: family_first  # Nguyen Van A
    display: "{family} {middle} {given}"
```

### Date/Time

```yaml
datetime:
  timezone: Asia/Ho_Chi_Minh (UTC+7)
  format:
    date: DD/MM/YYYY
    time: HH:mm (24-hour)
    datetime: DD/MM/YYYY HH:mm

  display:
    today: "Hom nay"
    yesterday: "Hom qua"
    tomorrow: "Ngay mai"
```

### Phone Numbers

```yaml
phone:
  country_code: +84
  format: 0XXX-XXX-XXX
  validation: ^(0|\+84)[0-9]{9,10}$

  carriers:
    - Viettel: 03[2-9], 09[6-8]
    - Mobifone: 07[0-9], 09[0-3]
    - Vinaphone: 08[1-5], 09[4-5]
```

---

## Cost Estimation (Monthly)

| Service | Dev | Staging | Production |
|---------|-----|---------|------------|
| K3s Nodes (3x) | $50 | $100 | $500 |
| PostgreSQL | $20 | $50 | $200 |
| Redis | $10 | $25 | $100 |
| MinIO Storage | $10 | $30 | $150 |
| Keycloak | $20 | $30 | $100 |
| Monitoring | $20 | $40 | $150 |
| CDN/WAF | $0 | $20 | $100 |
| Backup | $10 | $30 | $100 |
| **Total** | **$140** | **$325** | **$1,400** |

---

## Development Environment

### Local Setup

```bash
# Prerequisites
- Docker Desktop
- Node.js 20+
- Go 1.22+
- pnpm 8+

# Clone and setup
git clone https://github.com/tqvdang/physioflow.git
cd physioflow
pnpm install

# Start services
docker compose up -d  # PostgreSQL, Redis, Keycloak, MinIO

# Start development
pnpm dev:web      # Next.js on :3000
pnpm dev:api      # Go API on :8080
```

### IDE Recommendations

```yaml
vscode:
  extensions:
    - golang.go
    - esbenp.prettier-vscode
    - bradlc.vscode-tailwindcss
    - prisma.prisma

  settings:
    editor.formatOnSave: true
    go.lintTool: golangci-lint
```

---

**Document Version:** 1.1
**Created:** January 2026
**Updated:** January 2026 - Added shadcn/ui as UI component library
**For:** PhysioFlow Engineering Team
