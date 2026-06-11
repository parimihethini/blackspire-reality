"""Seed roles and permissions for Phase 1 RBAC."""

from sqlalchemy.orm import Session

from app.models.rbac import Role, Permission, role_permissions

ROLE_DEFINITIONS = [
    ("super_admin", "Full platform control"),
    ("admin", "Platform administrator"),
    ("team_member", "Internal Blackspire staff"),
    ("startup_founder", "Startup profile owner"),
    ("investor", "Investor browsing startups"),
    ("customer", "Legacy customer / investor alias"),
    ("seller", "Legacy seller / founder alias"),
]

PERMISSION_DEFINITIONS = [
    ("users.read", "View user profiles"),
    ("users.write", "Create and update users"),
    ("users.delete", "Delete users"),
    ("properties.read", "View properties"),
    ("properties.write", "Create and update properties"),
    ("properties.moderate", "Approve or reject listings"),
    ("admin.access", "Access admin dashboard"),
    ("admin.roles", "Manage user roles"),
    ("investments.read", "View investments"),
    ("investments.write", "Create investments"),
    ("analytics.read", "View analytics"),
    ("investors.read", "View investor profiles"),
    ("investors.write", "Create and update investor profiles"),
    ("investors.delete", "Soft-delete investor profiles"),
    ("startups.read", "View startup profiles"),
    ("startups.write", "Create and update startup profiles"),
    ("startups.delete", "Soft-delete startup profiles"),
    ("startups.moderate", "Approve, reject, verify, or suspend startups"),
    ("startups.interact", "Save, contact, and express interest in startups"),
]

ROLE_PERMISSION_MAP = {
    "super_admin": [p[0] for p in PERMISSION_DEFINITIONS],
    "admin": [
        "users.read", "users.write", "users.delete",
        "properties.read", "properties.write", "properties.moderate",
        "admin.access", "admin.roles", "investments.read", "analytics.read",
        "investors.read", "investors.write", "investors.delete",
        "startups.read", "startups.write", "startups.delete", "startups.moderate",
    ],
    "team_member": [
        "users.read", "properties.read", "properties.moderate",
        "admin.access", "analytics.read",
        "startups.read", "startups.moderate",
    ],
    "startup_founder": [
        "properties.read", "properties.write", "investments.read",
        "startups.read", "startups.write", "startups.delete",
    ],
    "seller": [
        "properties.read", "properties.write", "investments.read",
        "startups.read", "startups.write", "startups.delete",
    ],
    "investor": [
        "properties.read", "investments.read", "investments.write",
        "startups.read", "startups.interact",
    ],
    "customer": [
        "properties.read", "investments.read", "investments.write",
        "startups.read", "startups.interact",
    ],
}


def seed_rbac(db: Session) -> None:
    """Idempotently seed roles, permissions, and role-permission mappings."""
    perm_by_name: dict[str, Permission] = {}
    for name, description in PERMISSION_DEFINITIONS:
        perm = db.query(Permission).filter(Permission.name == name).first()
        if not perm:
            perm = Permission(name=name, description=description)
            db.add(perm)
            db.flush()
        perm_by_name[name] = perm

    role_by_name: dict[str, Role] = {}
    for name, description in ROLE_DEFINITIONS:
        role = db.query(Role).filter(Role.name == name).first()
        if not role:
            role = Role(name=name, description=description)
            db.add(role)
            db.flush()
        role_by_name[name] = role

    for role_name, perm_names in ROLE_PERMISSION_MAP.items():
        role = role_by_name.get(role_name)
        if not role:
            continue
        for perm_name in perm_names:
            perm = perm_by_name.get(perm_name)
            if perm and perm not in role.permissions:
                role.permissions.append(perm)

    db.commit()
    print("[RBAC] Roles and permissions seeded [OK]")
