# PHASE 1 AUDIT REPORT — Blackspire Reality
**Prepared by:** Principal Software Architect  
**Date:** 2026-06-06  
**Status:** Awaiting Approval Before Implementation

---

## Executive Summary

The existing codebase is a **real-estate PropTech platform** (property listing, AI price prediction, fraud detection, site visits, reviews, investments). Phase 1 re-purposes it into an **investor-startup matchmaking platform**. The majority of the infrastructure (auth, JWT, DB, email, Cloudinary, AI scoring, search, admin) can be reused. The primary gaps are **domain-model gaps**: investor profiles, startup profiles, and investor-startup matching are missing — the existing `Investment` model is a property-investment tracker, not a startup investor record.

---

## 1. AUTHENTICATION

### Requirement vs. Reality

| Requirement | Status | Notes |
|---|---|---|
| User Registration (`POST /auth/register`) | ✅ **Fully Implemented** | `app/api/auth.py` — full OTP + email flow |
| Login (`POST /auth/login`) | ✅ **Fully Implemented** | JWT access + refresh tokens |
| Forgot Password (`POST /auth/forgot-password`) | ✅ **Fully Implemented** | Token + OTP dual-mode reset |
| OTP Verification (`POST /auth/verify-otp`) | ✅ **Fully Implemented** | 6-digit OTP, 10-min expiry, brute-force limit |
| JWT Authentication (access + refresh) | ✅ **Fully Implemented** | `app/core/security.py` — HS256, bcrypt |
| Role-Based Access Control | 🟡 **Partially Implemented** | Only 3 roles exist; 5 required |
| Role: Super Admin | ❌ **Missing** | No super_admin in `UserRole` enum |
| Role: Admin | ✅ **Fully Implemented** | `UserRole.admin` exists |
| Role: Team Member | ❌ **Missing** | No team_member role |
| Role: Startup Founder | ❌ **Missing** | `seller` is the closest proxy; needs renaming/extension |
| Role: Investor | ❌ **Missing** | `customer` is the closest proxy; needs renaming/extension |

### Existing Files
- `backend/app/api/auth.py` — all auth endpoints
- `backend/app/core/security.py` — JWT + bcrypt helpers
- `backend/app/core/dependencies.py` — `get_current_user`, `require_role`, role guards
- `backend/app/models/user.py` — `User` model, `UserRole` enum
- `backend/app/schemas/user.py` — all auth schemas

### Existing APIs
```
POST /auth/register
POST /auth/login
POST /auth/verify-otp
POST /auth/resend-otp
POST /auth/forgot-password
POST /auth/reset-password
POST /auth/verify-reset-otp
POST /auth/refresh
```

### Existing Database Tables
- **`users`** — id, name, email, phone, hashed_password, role (ENUM), profile_image, is_active, is_verified, otp_code, otp_expires_at, reset_token, reset_otp_hash, reset_otp_expires_at, reset_otp_attempts

### Gap Analysis
- `UserRole` enum has `customer | seller | admin` only
- Must add: `super_admin | team_member | startup_founder | investor`
- `customer` and `seller` roles must remain for backward compatibility (existing DB rows)
- `admin` guard (`get_current_admin`) must be extended to also allow `super_admin`

### Recommended Modifications
1. **Extend `UserRole` enum** — add `super_admin`, `team_member`, `startup_founder`, `investor`
2. **Update `dependencies.py`** — `get_current_admin` → accepts `admin | super_admin`; add `get_current_super_admin`, `get_current_investor`, `get_current_founder`
3. **Generate Alembic migration** — ALTER TABLE users — change enum type
4. **Validate login schema** — extend `LoginRequest.normalize_login_role` to accept new roles
5. **No auth flow rebuild** — reuse entirely

---

## 2. INVESTOR DATABASE

### Requirement vs. Reality

| Field Group | Specific Field | Status | Notes |
|---|---|---|---|
| **Basic** | Investor Name | 🟡 Partial | Exists as `users.name` — no dedicated investor table |
| **Basic** | Company Name | ❌ Missing | No company_name field anywhere |
| **Basic** | Designation | ❌ Missing | No designation field |
| **Basic** | Investor Type | ❌ Missing | No investor_type (Angel/VC/PE/Family Office) |
| **Basic** | Profile Photo | ✅ Implemented | `users.profile_image` via Cloudinary |
| **Contact** | Email | ✅ Implemented | `users.email` |
| **Contact** | Phone | ✅ Implemented | `users.phone` |
| **Contact** | LinkedIn | ❌ Missing | No linkedin_url field |
| **Contact** | Website | ❌ Missing | No website_url field |
| **Investment** | Investment Stage | ❌ Missing | No preferred_stages field |
| **Investment** | Ticket Size | ❌ Missing | No ticket_size_min/max fields |
| **Investment** | Preferred Industries | ❌ Missing | No preferred_industries field |
| **Investment** | Preferred Countries | ❌ Missing | No preferred_countries field |
| **Investment** | Preferred Cities | ❌ Missing | No preferred_cities field |
| **Preferences** | SaaS / AI / Fintech / etc. | ❌ Missing | No sector preferences |
| **Additional** | Notes | ❌ Missing | No notes field on investor |
| **Additional** | Internal Comments | ❌ Missing | No internal_comments field |
| **Additional** | Priority Score | ❌ Missing | No priority_score field |

### Existing Files
- `backend/app/models/investment.py` — property investment tracker (NOT an investor profile model)
- No `InvestorProfile` model exists anywhere

### Existing APIs
- None for investor profile CRUD

### Existing Database Tables
- **`investments`** — tracks user→property investment transactions; NOT investor profiles
- No `investor_profiles` table

### Recommended Modifications
1. **Create new model** `backend/app/models/investor.py` — `InvestorProfile` table with all required fields
2. **Create new schema** `backend/app/schemas/investor.py`
3. **Create new API** `backend/app/api/investors.py` — CRUD + list
4. **Register in** `backend/app/main.py`
5. **Generate Alembic migration** for new `investor_profiles` table

---

## 3. STARTUP DATABASE

### Requirement vs. Reality

| Field | Status | Notes |
|---|---|---|
| Startup Name | 🟡 Partial | `properties.title` — wrong table, domain mismatch |
| Logo | 🟡 Partial | `users.profile_image` via Cloudinary — usable as startup logo |
| Founder Name | 🟡 Partial | `users.name` — but no dedicated startup table |
| Industry | ❌ Missing | No industry field for startups |
| Stage | ❌ Missing | No funding stage field |
| Revenue | ❌ Missing | No annual_revenue field |
| Team Size | ❌ Missing | No team_size field |
| Funding Requirement | ❌ Missing | No funding_requirement field |
| Pitch Deck Upload | ❌ Missing | `properties.documents` JSON exists but wrong domain |
| Website | ❌ Missing | No website for startups |
| LinkedIn | ❌ Missing | No linkedin_url for startups |

### Existing Files
- `backend/app/models/property.py` — `Property` model (real estate, not startups)
- `backend/app/services/cloudinary_service.py` — reusable for logo/pitch deck uploads
- `backend/app/api/users.py` — `POST /users/upload-profile-image` — reusable pattern

### Existing APIs
- `POST /users/upload-profile-image` — Cloudinary upload (reuse pattern for startup logo/pitch deck)

### Existing Database Tables
- **`properties`** — real estate; NOT suitable for startup profiles
- No `startup_profiles` table

### Recommended Modifications
1. **Create new model** `backend/app/models/startup.py` — `StartupProfile` table
2. **Create new schema** `backend/app/schemas/startup.py`
3. **Create new API** `backend/app/api/startups.py` — CRUD + upload endpoints
4. **Extend Cloudinary service** — add `upload_document` function for pitch deck PDFs
5. **Generate Alembic migration** for new `startup_profiles` table

---

## 4. INVESTOR SEARCH ENGINE

### Requirement vs. Reality

| Feature | Status | Notes |
|---|---|---|
| Filter: Industry | ❌ Missing | No investor industry filter |
| Filter: Country | ❌ Missing | No investor country filter |
| Filter: City | ❌ Missing | No investor city filter |
| Filter: Ticket Size | ❌ Missing | No ticket size range filter |
| Filter: Stage | ❌ Missing | No stage filter |
| Filter: Investor Type | ❌ Missing | No investor type filter |
| Search: Name | ❌ Missing | No investor name search |
| Search: Company Name | ❌ Missing | No company name search |
| Search: Keywords | ❌ Missing | No keyword search on investors |
| Pagination | 🟡 Partial | Exists in `GET /properties/` — reuse pattern |
| Sorting | 🟡 Partial | Elasticsearch sorting exists — reuse pattern |
| Query Optimization | 🟡 Partial | SQLAlchemy fallback in `properties.py` — reuse pattern |

### Existing Files
- `backend/app/api/properties.py` — full filter/search/pagination pattern (reusable)
- `backend/app/services/search_service.py` — Elasticsearch integration (reusable, new index needed)
- `backend/app/services/cache_service.py` — Redis caching (reusable)

### Existing APIs
- None for investor search

### Recommended Modifications
1. **Add `GET /investors/search`** with query params: `industry, country, city, ticket_size_min, ticket_size_max, stage, investor_type, q, page, per_page, sort_by`
2. **Add Elasticsearch index** `blackspire_investors` to `search_service.py` or create `investor_search_service.py`
3. **Add PostgreSQL fallback filters** using SQLAlchemy (same pattern as properties)
4. **Add Redis caching** for search results

---

## 5. DASHBOARDS

### 5a. Admin Dashboard

| Metric | Status | Notes |
|---|---|---|
| Total Investors | ❌ Missing | `admin_stats` only counts by `customer/seller/admin` roles |
| Active Investors | ❌ Missing | No investor-specific active count |
| New Investors | ❌ Missing | No time-windowed investor count |
| Startup Requests | ❌ Missing | No startup request tracking |

### 5b. Investor Dashboard

| Metric | Status | Notes |
|---|---|---|
| Profile Completion % | ❌ Missing | No profile completeness calculation |
| Interested Startups | ❌ Missing | No startup interest/shortlist system |
| Saved Startups | ❌ Missing | No startup favorites (existing `favorites` table is property-based) |

### 5c. Founder Dashboard

| Metric | Status | Notes |
|---|---|---|
| Startup Profile | ❌ Missing | No startup profile API |
| Investor Matches | ❌ Missing | No AI matching for startups→investors |
| Applications Sent | ❌ Missing | No application/interest submission system |

### Existing Files
- `backend/app/api/admin.py` — `GET /admin/stats` — partial; returns user/property counts
- `backend/app/api/analytics.py` — market analytics (property-based, partially reusable)

### Existing APIs
```
GET /admin/stats          → total_users, customers, sellers, admins, total_properties
GET /admin/users          → list all users
GET /admin/properties     → list all properties
GET /analytics/market     → property market stats
GET /analytics/property/{id} → property-specific insights
```

### Recommended Modifications
1. **Extend `GET /admin/stats`** — add `total_investors`, `total_startups`, `new_investors_this_week`, `pending_startup_requests`
2. **Create `GET /investors/dashboard`** — profile completion %, interested startups, saved startups
3. **Create `GET /founders/dashboard`** — startup profile summary, matched investors, applications sent
4. **Create `startup_interests` table** for saved/interested startups

---

## 6. AI MATCHING MVP

### Requirement vs. Reality

| Feature | Status | Notes |
|---|---|---|
| Match Input: Industry | ❌ Missing | No industry-based matching |
| Match Input: Funding Stage | ❌ Missing | No stage-based matching |
| Match Input: Funding Requirement | ❌ Missing | No amount-based matching |
| Match Input: Geography | ❌ Missing | No geography-based matching |
| Match Output: Match Score | 🟡 Partial | Scoring exists in `ai/recommendation.py` and `ai/price_predictor.py` — logic can be repurposed |
| Match Output: Recommended Investors | ❌ Missing | No investor recommendation endpoint |
| Lightweight Scoring Logic | 🟡 Partial | `_fallback_similarity` and `scoring_service.py` exist — reuse |
| Scalable Architecture | ✅ Implemented | Lazy-loading, thread executor, optional ML model patterns all exist |

### Existing Files
- `backend/app/ai/recommendation.py` — cosine similarity + semantic scoring (directly reusable)
- `backend/app/services/scoring_service.py` — lightweight scoring service (reuse)
- `backend/app/ai/price_predictor.py` — GradientBoosting model (not applicable to matching)
- `backend/app/api/ai.py` — AI endpoints (`/ai/predict-price`, `/ai/recommend/{id}`, etc.)

### Existing APIs
```
POST /ai/predict-price          → property price prediction
GET  /ai/recommend/{property_id} → property recommendations
GET  /ai/fraud-check/{property_id}
GET  /ai/investment-score/{property_id}
```

### Recommended Modifications
1. **Create `POST /ai/match-investors`** — accepts startup profile inputs, returns scored investor list
2. **Reuse `_fallback_similarity` pattern** from `recommendation.py` for rule-based matching (industry overlap, stage match, ticket size within range, geography match)
3. **Match scoring formula**: `industry_score(0.35) + stage_score(0.30) + ticket_score(0.20) + geo_score(0.15)`
4. **Do NOT rebuild** existing property AI; add a new matching function alongside

---

## 7. EMAIL NOTIFICATIONS

### Requirement vs. Reality

| Feature | Status | Notes |
|---|---|---|
| OTP Email | ✅ **Fully Implemented** | `send_otp_email()` in `email_service.py` |
| Password Reset Email | ✅ **Fully Implemented** | `send_reset_email()` in `email_service.py` |
| Basic System Notifications | 🟡 **Partially Implemented** | In-app `Notification` model exists; web push exists; no new-match email |
| Investor Match Notification | ❌ Missing | No email when investor is matched to a startup |
| Startup Application Email | ❌ Missing | No email when founder sends interest to investor |

### Existing Files
- `backend/app/services/email_service.py` — Gmail API via OAuth2 (send_otp_email, send_reset_email)
- `backend/app/services/push_service.py` — WebPush (VAPID) in-memory subscriptions
- `backend/app/models/property.py:Notification` — in-app notification model (reusable)

### Existing APIs
```
POST /notifications/subscribe    → WebPush subscription
GET  /properties/notifications   → list user's in-app notifications
PATCH /properties/notifications/{id}/read
```

### Recommended Modifications
1. **Add `send_match_email()`** to `email_service.py` — notify investor of new startup match
2. **Add `send_application_email()`** — notify founder their application was received
3. **Move notification endpoints** from `/properties/notifications` → `/notifications` prefix (already has `/notifications/subscribe`; unify routing)
4. **Reuse existing `Notification` model** — no new table needed

---

## 8. ENGINEERING RULES — COMPLIANCE AUDIT

| Rule | Status |
|---|---|
| Never rewrite working modules | ✅ Plan reuses all existing modules |
| Extend existing code first | ✅ All gaps filled by extension |
| Avoid duplicate models | ✅ New models: InvestorProfile, StartupProfile, StartupInterest only |
| Avoid duplicate routes | ✅ New router files per domain |
| Avoid duplicate services | ✅ Reuse email_service, cloudinary_service, search_service |
| Maintain backward compatibility | ✅ Existing enum values preserved; new values added only |
| Follow current project architecture | ✅ api/ + models/ + schemas/ + services/ pattern maintained |
| Use existing DB schema where possible | ✅ `users` table extended; new tables only where no overlap |
| Add Alembic migrations when required | ⚠️ Required for: UserRole enum, investor_profiles, startup_profiles, startup_interests |
| Keep APIs RESTful | ✅ All new endpoints follow REST conventions |

---

## 9. IMPLEMENTATION ORDER (APPROVED SEQUENCE)

| Step | Module | Effort | Risk |
|---|---|---|---|
| 1 | **Authentication & Roles** — extend UserRole enum, update guards | Low | Low |
| 2 | **Investor Database** — new InvestorProfile model, schema, CRUD API | Medium | Low |
| 3 | **Startup Database** — new StartupProfile model, schema, CRUD + file upload | Medium | Low |
| 4 | **Investor Search Engine** — filter/search/pagination endpoint | Medium | Low |
| 5 | **Dashboards** — extend admin stats, add investor + founder dashboard APIs | Medium | Low |
| 6 | **AI Matching MVP** — rule-based scoring, `POST /ai/match-investors` | Medium | Low |
| 7 | **Notifications** — add match/application emails, unify notification routes | Low | Low |

---

## 10. NEW FILES REQUIRED

```
backend/
├── app/
│   ├── models/
│   │   ├── investor.py          [NEW] InvestorProfile model
│   │   ├── startup.py           [NEW] StartupProfile model  
│   │   └── interest.py          [NEW] StartupInterest model
│   ├── schemas/
│   │   ├── investor.py          [NEW] Pydantic schemas for investor
│   │   └── startup.py           [NEW] Pydantic schemas for startup
│   └── api/
│       ├── investors.py         [NEW] CRUD + search API
│       └── startups.py          [NEW] CRUD + upload API
├── alembic/versions/
│   ├── xxxx_add_new_roles.py    [NEW] Extend UserRole enum
│   ├── xxxx_investor_profile.py [NEW] investor_profiles table
│   ├── xxxx_startup_profile.py  [NEW] startup_profiles table
│   └── xxxx_startup_interest.py [NEW] startup_interests table
docs/
└── PHASE1_AUDIT_REPORT.md       [THIS FILE]
```

---

## 11. MODIFIED FILES REQUIRED

```
backend/
├── app/
│   ├── models/user.py           [MODIFY] Extend UserRole enum (+4 roles)
│   ├── core/dependencies.py     [MODIFY] Add new role guards
│   ├── schemas/user.py          [MODIFY] Add new roles to LoginRequest validator
│   ├── api/admin.py             [MODIFY] Extend /admin/stats with investor/startup counts
│   ├── api/ai.py                [MODIFY] Add POST /ai/match-investors endpoint
│   ├── services/email_service.py [MODIFY] Add send_match_email, send_application_email
│   └── main.py                  [MODIFY] Register investors.router, startups.router
```

---

## 12. DATABASE CHANGES SUMMARY

| Table | Action | Changes |
|---|---|---|
| `users` | MODIFY | Extend `role` ENUM: add `super_admin, team_member, startup_founder, investor` |
| `investor_profiles` | CREATE | 20+ fields for investor profile |
| `startup_profiles` | CREATE | 12 fields for startup profile |
| `startup_interests` | CREATE | Investor→Startup interest/shortlist tracking |

---

## 13. DELIVERABLES SUMMARY PER MODULE

| Module | Audit | Files Modified | DB Changes | API Changes | Frontend Impact | Test Cases |
|---|---|---|---|---|---|---|
| Authentication | ✅ | user.py, dependencies.py, schemas/user.py | users.role enum | None (new roles only) | Login role list update | OTP flow, role guard |
| Investor DB | ❌ | investor.py (NEW) | investor_profiles table | 5 CRUD endpoints | Investor profile form | CRUD + validation |
| Startup DB | ❌ | startup.py (NEW) | startup_profiles table | 5 CRUD + upload | Startup profile form | CRUD + file upload |
| Investor Search | ❌ | investors.py (NEW) | None | GET /investors/search | Search page | Filter + pagination |
| Dashboards | 🟡 | admin.py, NEW investor/founder routes | None | 3 new dashboard endpoints | Dashboard pages | Stats accuracy |
| AI Matching | 🟡 | ai.py | None | POST /ai/match-investors | Match results display | Score validation |
| Notifications | 🟡 | email_service.py | None | Unified notification routes | Notification center | Email delivery |

---

## 14. OPEN QUESTIONS (Require Approval)

> [!IMPORTANT]
> **Q1 — Role Backward Compatibility**: Existing users have `customer` and `seller` roles. Do we keep these as aliases for `investor` and `startup_founder`, or strictly migrate?  
> **Recommendation**: Keep `customer` and `seller` intact; add new roles alongside. No data migration needed.

> [!IMPORTANT]
> **Q2 — Investor Profile Relationship**: Should `InvestorProfile` be a separate table with `user_id FK` (one-to-one), or extend the `users` table directly?  
> **Recommendation**: Separate table — keeps User model clean, avoids bloat, consistent with startup profile pattern.

> [!IMPORTANT]
> **Q3 — Pitch Deck Storage**: Should pitch decks go to Cloudinary (existing) or a separate document storage? Max file size?  
> **Recommendation**: Cloudinary (already configured), `resource_type=raw`, max 20MB.

> [!WARNING]
> **Q4 — Elasticsearch for Investor Search**: Elasticsearch is currently configured but disabled in production (localhost URL check in `search_service.py`). Should investor search also fall back to PostgreSQL only?  
> **Recommendation**: Yes — PostgreSQL-only for Phase 1 to match current production config.

> [!NOTE]
> **Q5 — AI Matching Complexity**: Phase 1 specifies "lightweight scoring logic." Confirmed: rule-based weighted scoring (no ML training) is the approach. Upgrade to ML in Phase 2.

---

*Report complete. Awaiting approval to proceed to Step 2: Authentication & Roles.*
