from datetime import datetime, timedelta, timezone
from typing import List

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import or_
from sqlalchemy.orm import Session, joinedload

from app.db.session import get_db
from app.models.user import User, UserRole
from app.models.property import Property, SiteVisit
from app.models.review import Review
from app.models.investment import Investment
from app.models.startup import StartupListingStatus, StartupProfile
from app.core.dependencies import get_current_admin_user
from app.core.permissions import sync_user_role_assignment
from app.schemas.user import UserResponse, AdminUserRoleUpdate, AdminStatsResponse
from app.schemas.property import PropertyResponse, AdminPropertyApprove

router = APIRouter(prefix="/admin", tags=["Admin"])


def _role_str(role) -> str:
    return role.value if hasattr(role, "value") else str(role)


def _purge_property_children(db: Session, property_id: int) -> None:
    db.query(Investment).filter(Investment.property_id == property_id).delete(synchronize_session=False)
    db.query(Review).filter(Review.property_id == property_id).delete(synchronize_session=False)
    db.query(SiteVisit).filter(SiteVisit.property_id == property_id).delete(synchronize_session=False)


def _purge_user_graph(db: Session, user: User) -> None:
    """Remove related rows so the user can be deleted without FK errors."""
    uid = user.id
    seller_prop_ids = [r[0] for r in db.query(Property.id).filter(Property.seller_id == uid).all()]

    inv_filters = [Investment.investor_id == uid]
    if seller_prop_ids:
        inv_filters.append(Investment.property_id.in_(seller_prop_ids))
    db.query(Investment).filter(or_(*inv_filters)).delete(synchronize_session=False)

    rev_filters = [Review.user_id == uid]
    if seller_prop_ids:
        rev_filters.append(Review.property_id.in_(seller_prop_ids))
    db.query(Review).filter(or_(*rev_filters)).delete(synchronize_session=False)

    visit_filters = [SiteVisit.customer_id == uid]
    if seller_prop_ids:
        visit_filters.append(SiteVisit.property_id.in_(seller_prop_ids))
    db.query(SiteVisit).filter(or_(*visit_filters)).delete(synchronize_session=False)

    if seller_prop_ids:
        db.query(Property).filter(Property.seller_id == uid).delete(synchronize_session=False)


@router.get("/users", response_model=List[UserResponse])
async def admin_list_users(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_admin_user),
):
    return db.query(User).order_by(User.id.asc()).all()


@router.delete("/users/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def admin_delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin_user),
):
    if user_id == admin.id:
        raise HTTPException(status_code=400, detail="Cannot delete your own admin account.")

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")

    if user.role == UserRole.super_admin:
        raise HTTPException(status_code=400, detail="Super admin accounts cannot be deleted.")

    if user.role == UserRole.admin:
        others = db.query(User).filter(
            User.role.in_([UserRole.admin, UserRole.super_admin]),
            User.id != user_id,
        ).count()
        if others < 1:
            raise HTTPException(status_code=400, detail="Cannot delete the last admin account.")

    _purge_user_graph(db, user)
    db.delete(user)
    db.commit()
    return None


@router.patch("/users/{user_id}/role", response_model=UserResponse)
async def admin_update_user_role(
    user_id: int,
    body: AdminUserRoleUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin_user),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")

    if user.id == admin.id and body.role not in (UserRole.admin, UserRole.super_admin):
        raise HTTPException(status_code=400, detail="Cannot demote your own admin account.")

    if body.role == UserRole.super_admin and _role_str(admin.role) != "super_admin":
        raise HTTPException(status_code=403, detail="Only super admins can assign the super_admin role.")

    if user.role in (UserRole.admin, UserRole.super_admin) and body.role not in (UserRole.admin, UserRole.super_admin):
        others = db.query(User).filter(
            User.role.in_([UserRole.admin, UserRole.super_admin]),
            User.id != user_id,
        ).count()
        if others < 1:
            raise HTTPException(status_code=400, detail="Cannot remove the last admin role.")

    user.role = body.role
    db.commit()
    db.refresh(user)
    sync_user_role_assignment(db, user)
    db.commit()
    return user


@router.get("/properties", response_model=List[PropertyResponse])
async def admin_list_properties(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_admin_user),
):
    return db.query(Property).order_by(Property.id.desc()).all()


@router.delete("/properties/{property_id}", status_code=status.HTTP_204_NO_CONTENT)
async def admin_delete_property(
    property_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_admin_user),
):
    prop = db.query(Property).filter(Property.id == property_id).first()
    if not prop:
        raise HTTPException(status_code=404, detail="Property not found.")
    _purge_property_children(db, property_id)
    db.delete(prop)
    db.commit()
    return None


@router.patch("/properties/{property_id}/approve", response_model=PropertyResponse)
async def admin_approve_property(
    property_id: int,
    body: AdminPropertyApprove,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_admin_user),
):
    prop = db.query(Property).filter(Property.id == property_id).first()
    if not prop:
        raise HTTPException(status_code=404, detail="Property not found.")

    if body.approved:
        prop.is_verified = True
        prop.is_published = True
    else:
        prop.is_published = False
        prop.is_verified = False

    db.commit()
    db.refresh(prop)
    return prop


@router.get("/stats", response_model=AdminStatsResponse)
async def admin_stats(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_admin_user),
):
    # ── Legacy / property counts ─────────────────────────────────────────────────
    total_users = db.query(User).count()
    customers = db.query(User).filter(User.role == UserRole.customer).count()
    sellers = db.query(User).filter(User.role == UserRole.seller).count()
    admins = db.query(User).filter(User.role == UserRole.admin).count()
    total_properties = db.query(Property).count()
    published_properties = db.query(Property).filter(Property.is_published == True).count()
    pending_listings = db.query(Property).filter(
        (Property.is_published == False) | (Property.is_verified == False)
    ).count()

    # ── Phase 1 domain role counts ────────────────────────────────────────────────
    super_admins = db.query(User).filter(User.role == UserRole.super_admin).count()
    team_members = db.query(User).filter(User.role == UserRole.team_member).count()
    investors = db.query(User).filter(User.role == UserRole.investor).count()
    startup_founders = db.query(User).filter(User.role == UserRole.startup_founder).count()

    # Total investors = new 'investor' role + legacy 'customer' role
    total_investors = investors + customers

    # New investors registered in the last 7 days (both investor + customer roles)
    week_ago = datetime.now(timezone.utc) - timedelta(days=7)
    new_investors_this_week = db.query(User).filter(
        User.role.in_([UserRole.investor, UserRole.customer]),
        User.created_at >= week_ago,
    ).count()

    total_startups = db.query(StartupProfile).filter(StartupProfile.is_deleted == False).count()
    pending_startup_requests = db.query(StartupProfile).filter(
        StartupProfile.is_deleted == False,
        StartupProfile.status == StartupListingStatus.pending_review,
    ).count()

    return AdminStatsResponse(
        # Legacy fields
        total_users=total_users,
        customers=customers,
        sellers=sellers,
        admins=admins,
        total_properties=total_properties,
        published_properties=published_properties,
        pending_listings=pending_listings,
        # Phase 1 fields
        super_admins=super_admins,
        team_members=team_members,
        investors=investors,
        startup_founders=startup_founders,
        total_investors=total_investors,
        total_startups=total_startups,
        new_investors_this_week=new_investors_this_week,
        pending_startup_requests=pending_startup_requests,
    )


# ── Admin: Conversations monitor ──────────────────────────────────────────────

@router.get("/conversations", summary="Admin: list all conversations", tags=["Admin"])
async def admin_list_conversations(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_admin_user),
):
    from app.models.communication import Conversation
    convs = (
        db.query(Conversation)
        .options(
            joinedload(Conversation.investor),
            joinedload(Conversation.founder),
            joinedload(Conversation.startup),
        )
        .order_by(Conversation.last_message_at.desc().nullslast(), Conversation.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )
    total = db.query(Conversation).count()
    return {
        "total": total,
        "skip": skip,
        "limit": limit,
        "items": [
            {
                "id": c.id,
                "startup_id": c.startup_id,
                "startup_name": c.startup.name if c.startup else None,
                "investor": {"id": c.investor_id, "name": c.investor.name if c.investor else None, "email": c.investor.email if c.investor else None},
                "founder":  {"id": c.founder_id,  "name": c.founder.name  if c.founder  else None, "email": c.founder.email  if c.founder  else None},
                "subject": c.subject,
                "last_message_at": c.last_message_at.isoformat() if c.last_message_at else None,
                "created_at": c.created_at.isoformat() if c.created_at else None,
            }
            for c in convs
        ],
    }


@router.get("/crm/metrics", summary="Admin: CRM pipeline metrics", tags=["Admin"])
async def admin_crm_metrics(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_admin_user),
):
    from app.services import crm_service
    return crm_service.get_pipeline_metrics(db)
