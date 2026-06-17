"""CRM service — lead pipeline, activity log, reminders."""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Dict, List, Optional, Tuple

from fastapi import HTTPException
from sqlalchemy.orm import Session, joinedload

from app.models.crm import CrmActivity, CrmLead, CrmLeadStatus, CrmReminder
from app.models.user import User


def _role_str(role) -> str:
    return role.value if hasattr(role, "value") else str(role)


def _is_admin(user: User) -> bool:
    return _role_str(user.role) in ("admin", "super_admin", "team_member")


def _is_founder(user: User) -> bool:
    return _role_str(user.role) in ("startup_founder", "seller")


def _assert_lead_access(lead: CrmLead, user: User) -> None:
    """Founder owns their leads; admins see all."""
    if _is_admin(user):
        return
    if lead.founder_id != user.id:
        raise HTTPException(status_code=403, detail="Access denied to this lead")


# ── Auto-create lead (called from interaction service) ────────────────────────

def auto_create_lead(
    db: Session,
    *,
    startup_id: int,
    investor_id: int,
    founder_id: int,
    interest_level: str = "medium",
    source: str = "interest_expression",
    conversation_id: Optional[int] = None,
) -> Tuple[CrmLead, bool]:
    """Idempotently create a lead. Returns (lead, created)."""
    existing = (
        db.query(CrmLead)
        .filter(CrmLead.startup_id == startup_id, CrmLead.investor_id == investor_id)
        .first()
    )
    if existing:
        # Update interest level if stronger
        level_rank = {"low": 0, "medium": 1, "high": 2}
        existing_rank = level_rank.get(existing.interest_level or "medium", 1)
        new_rank = level_rank.get(interest_level, 1)
        if new_rank > existing_rank:
            existing.interest_level = interest_level
            db.commit()
            db.refresh(existing)
        return existing, False

    lead = CrmLead(
        startup_id=startup_id,
        investor_id=investor_id,
        founder_id=founder_id,
        status=CrmLeadStatus.new_lead.value,
        interest_level=interest_level,
        source=source,
        conversation_id=conversation_id,
    )
    db.add(lead)
    db.commit()
    db.refresh(lead)

    # Log creation activity
    _log_activity(db, lead_id=lead.id, actor_id=investor_id, action="lead_created",
                  note=f"Lead auto-created via {source}")
    return lead, True


# ── List / get leads ──────────────────────────────────────────────────────────

def list_leads(
    db: Session,
    user: User,
    status_filter: Optional[str] = None,
    startup_id: Optional[int] = None,
    skip: int = 0,
    limit: int = 100,
) -> List[CrmLead]:
    q = db.query(CrmLead).options(
        joinedload(CrmLead.startup),
        joinedload(CrmLead.investor),
        joinedload(CrmLead.founder),
    )

    if _is_admin(user):
        pass  # see all
    elif _is_founder(user):
        q = q.filter(CrmLead.founder_id == user.id)
    else:
        raise HTTPException(status_code=403, detail="CRM access denied")

    if status_filter:
        q = q.filter(CrmLead.status == status_filter)
    if startup_id:
        q = q.filter(CrmLead.startup_id == startup_id)

    return q.order_by(CrmLead.created_at.desc()).offset(skip).limit(limit).all()


def get_lead(db: Session, lead_id: int, user: User) -> CrmLead:
    lead = (
        db.query(CrmLead)
        .options(
            joinedload(CrmLead.startup),
            joinedload(CrmLead.investor),
            joinedload(CrmLead.founder),
            joinedload(CrmLead.activities).joinedload(CrmActivity.actor),
            joinedload(CrmLead.reminders),
        )
        .filter(CrmLead.id == lead_id)
        .first()
    )
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    _assert_lead_access(lead, user)
    return lead


# ── Status transitions ────────────────────────────────────────────────────────

VALID_TRANSITIONS: Dict[str, List[str]] = {
    CrmLeadStatus.new_lead.value:              [CrmLeadStatus.contacted.value, CrmLeadStatus.rejected.value, CrmLeadStatus.archived.value],
    CrmLeadStatus.contacted.value:             [CrmLeadStatus.meeting_scheduled.value, CrmLeadStatus.rejected.value, CrmLeadStatus.archived.value],
    CrmLeadStatus.meeting_scheduled.value:     [CrmLeadStatus.due_diligence.value, CrmLeadStatus.contacted.value, CrmLeadStatus.rejected.value],
    CrmLeadStatus.due_diligence.value:         [CrmLeadStatus.negotiation.value, CrmLeadStatus.rejected.value],
    CrmLeadStatus.negotiation.value:           [CrmLeadStatus.investment_confirmed.value, CrmLeadStatus.rejected.value],
    CrmLeadStatus.investment_confirmed.value:  [CrmLeadStatus.archived.value],
    CrmLeadStatus.rejected.value:              [CrmLeadStatus.new_lead.value, CrmLeadStatus.archived.value],
    CrmLeadStatus.archived.value:              [CrmLeadStatus.new_lead.value],
}


def update_lead_status(db: Session, lead_id: int, new_status: str, user: User, note: Optional[str] = None) -> CrmLead:
    lead = get_lead(db, lead_id, user)
    _assert_lead_access(lead, user)

    try:
        validated = CrmLeadStatus(new_status)
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Invalid status: {new_status}")

    old_status = lead.status
    allowed = VALID_TRANSITIONS.get(old_status, [])
    if validated.value not in allowed and not _is_admin(user):
        raise HTTPException(
            status_code=400,
            detail=f"Cannot transition from '{old_status}' to '{new_status}'. Allowed: {allowed}",
        )

    lead.status = validated.value
    db.commit()

    _log_activity(
        db, lead_id=lead.id, actor_id=user.id,
        action="status_changed",
        from_status=old_status, to_status=validated.value,
        note=note,
    )
    db.refresh(lead)
    return lead


def update_lead_fields(
    db: Session,
    lead_id: int,
    user: User,
    *,
    notes: Optional[str] = None,
    estimated_value: Optional[float] = None,
    assigned_to: Optional[int] = None,
) -> CrmLead:
    lead = get_lead(db, lead_id, user)
    _assert_lead_access(lead, user)

    changed = []
    if notes is not None:
        lead.notes = notes
        changed.append("notes_updated")
    if estimated_value is not None:
        lead.estimated_value = estimated_value
        changed.append("value_updated")
    if assigned_to is not None:
        lead.assigned_to = assigned_to
        changed.append("assigned")

    db.commit()
    if changed:
        _log_activity(db, lead_id=lead.id, actor_id=user.id, action=",".join(changed))
    db.refresh(lead)
    return lead


# ── Activity ──────────────────────────────────────────────────────────────────

def _log_activity(
    db: Session,
    *,
    lead_id: int,
    actor_id: Optional[int],
    action: str,
    from_status: Optional[str] = None,
    to_status: Optional[str] = None,
    note: Optional[str] = None,
    metadata: Optional[dict] = None,
) -> CrmActivity:
    activity = CrmActivity(
        lead_id=lead_id,
        actor_id=actor_id,
        action=action,
        from_status=from_status,
        to_status=to_status,
        note=note,
        metadata_json=metadata or {},
    )
    db.add(activity)
    db.commit()
    db.refresh(activity)
    return activity


def add_note(db: Session, lead_id: int, user: User, note: str) -> CrmActivity:
    lead = get_lead(db, lead_id, user)
    _assert_lead_access(lead, user)
    return _log_activity(db, lead_id=lead.id, actor_id=user.id, action="note_added", note=note)


def get_activity(db: Session, lead_id: int, user: User) -> List[CrmActivity]:
    lead = get_lead(db, lead_id, user)
    return (
        db.query(CrmActivity)
        .filter(CrmActivity.lead_id == lead.id)
        .order_by(CrmActivity.created_at.asc())
        .all()
    )


# ── Reminders ─────────────────────────────────────────────────────────────────

def create_reminder(db: Session, lead_id: int, user: User, title: str, due_at: datetime) -> CrmReminder:
    lead = get_lead(db, lead_id, user)
    _assert_lead_access(lead, user)

    reminder = CrmReminder(lead_id=lead.id, owner_id=user.id, title=title, due_at=due_at)
    db.add(reminder)
    db.commit()
    db.refresh(reminder)
    _log_activity(db, lead_id=lead.id, actor_id=user.id, action="reminder_set",
                  note=f"Reminder: {title} due {due_at.isoformat()}")
    return reminder


def list_reminders(db: Session, lead_id: int, user: User) -> List[CrmReminder]:
    lead = get_lead(db, lead_id, user)
    return (
        db.query(CrmReminder)
        .filter(CrmReminder.lead_id == lead.id)
        .order_by(CrmReminder.due_at.asc())
        .all()
    )


def complete_reminder(db: Session, lead_id: int, reminder_id: int, user: User) -> CrmReminder:
    lead = get_lead(db, lead_id, user)
    _assert_lead_access(lead, user)

    reminder = db.query(CrmReminder).filter(
        CrmReminder.id == reminder_id, CrmReminder.lead_id == lead.id
    ).first()
    if not reminder:
        raise HTTPException(status_code=404, detail="Reminder not found")
    reminder.is_done = True
    db.commit()
    db.refresh(reminder)
    return reminder


# ── Kanban data ───────────────────────────────────────────────────────────────

def get_kanban(db: Session, user: User) -> Dict[str, List[dict]]:
    """Return leads grouped by status for Kanban board rendering."""
    leads = list_leads(db, user, limit=500)
    board: Dict[str, List[dict]] = {s.value: [] for s in CrmLeadStatus}
    for lead in leads:
        board[lead.status].append(_serialize_lead_summary(lead))
    return board


def _serialize_lead_summary(lead: CrmLead) -> dict:
    return {
        "id": lead.id,
        "startup_id": lead.startup_id,
        "startup_name": lead.startup.name if lead.startup else None,
        "startup_logo": lead.startup.logo_url if lead.startup else None,
        "investor_id": lead.investor_id,
        "investor_name": lead.investor.name if lead.investor else None,
        "investor_email": lead.investor.email if lead.investor else None,
        "interest_level": lead.interest_level,
        "estimated_value": lead.estimated_value,
        "status": lead.status,
        "source": lead.source,
        "conversation_id": lead.conversation_id,
        "created_at": lead.created_at.isoformat() if lead.created_at else None,
        "updated_at": lead.updated_at.isoformat() if lead.updated_at else None,
    }


# ── Admin metrics ─────────────────────────────────────────────────────────────

def get_pipeline_metrics(db: Session) -> dict:
    """Funnel counts for admin dashboard."""
    counts = {}
    total = db.query(CrmLead).count()
    for s in CrmLeadStatus:
        counts[s.value] = db.query(CrmLead).filter(CrmLead.status == s.value).count()

    confirmed = counts.get(CrmLeadStatus.investment_confirmed.value, 0)
    conversion_rate = round(confirmed / total * 100, 1) if total > 0 else 0.0

    return {
        "total_leads": total,
        "by_status": counts,
        "conversion_rate_pct": conversion_rate,
    }
