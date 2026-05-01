from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.user import User, UserRole
from app.models.property import Property, SiteVisit
from app.models.review import Review
from app.models.investment import Investment
from app.core.dependencies import get_current_admin_user
from app.schemas.user import UserResponse, AdminUserRoleUpdate, AdminStatsResponse
from app.schemas.property import PropertyResponse, AdminPropertyApprove

router = APIRouter(prefix="/admin", tags=["Admin"])


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

    if user.role == UserRole.admin:
        others = db.query(User).filter(User.role == UserRole.admin, User.id != user_id).count()
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

    if user.id == admin.id and body.role != UserRole.admin:
        raise HTTPException(status_code=400, detail="Cannot demote your own admin account.")

    if user.role == UserRole.admin and body.role != UserRole.admin:
        others = db.query(User).filter(User.role == UserRole.admin, User.id != user_id).count()
        if others < 1:
            raise HTTPException(status_code=400, detail="Cannot remove the last admin role.")

    user.role = body.role
    db.commit()
    db.refresh(user)
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
    total_users = db.query(User).count()
    customers = db.query(User).filter(User.role == UserRole.customer).count()
    sellers = db.query(User).filter(User.role == UserRole.seller).count()
    admins = db.query(User).filter(User.role == UserRole.admin).count()
    total_properties = db.query(Property).count()
    published_properties = db.query(Property).filter(Property.is_published == True).count()
    pending_listings = db.query(Property).filter(
        (Property.is_published == False) | (Property.is_verified == False)
    ).count()

    return AdminStatsResponse(
        total_users=total_users,
        customers=customers,
        sellers=sellers,
        admins=admins,
        total_properties=total_properties,
        published_properties=published_properties,
        pending_listings=pending_listings,
    )
