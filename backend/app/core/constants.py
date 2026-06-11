"""Shared domain constants."""

INVESTOR_TYPES = (
    "Angel",
    "VC",
    "PE",
    "Family Office",
    "Corporate",
    "Other",
)

INVESTOR_SORT_FIELDS = (
    "created_at",
    "name",
    "email",
    "priority_score",
    "company_name",
)

STARTUP_LISTING_STATUSES = (
    "draft",
    "pending_review",
    "published",
    "rejected",
    "suspended",
)

STARTUP_VERIFICATION_STATUSES = (
    "unverified",
    "pending",
    "verified",
    "rejected",
)

INTEREST_LEVELS = ("low", "medium", "high")

STARTUP_SORT_FIELDS = (
    "created_at",
    "name",
    "funding_requirement",
    "revenue",
    "team_size",
    "views_count",
    "profile_completion",
)

# Weighted fields for profile completion (total = 100)
STARTUP_PROFILE_FIELDS = (
    ("name", 10),
    ("logo_url", 5),
    ("founder_name", 5),
    ("industry_id", 8),
    ("stage_id", 8),
    ("description", 10),
    ("problem_statement", 10),
    ("solution", 10),
    ("target_market", 8),
    ("business_model", 8),
    ("funding_requirement", 8),
    ("website", 5),
    ("linkedin_url", 5),
    ("location", 5),
    ("country", 5),
)
