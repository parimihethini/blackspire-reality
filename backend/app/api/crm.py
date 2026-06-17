"""CRM API — lead pipeline, activity timeline, reminders."""
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.dependencies import get_any_user, get_current_admin
from app.db.session import get_db
from app.models.crm import CrmLeadStatus
from app.models.user import User
from app.services import crm_service

router = APIRouter(prefix="/crm", tags=["CRM Pipeline"])


# ── Schemas ───────────────────────────────────────────────────────────────────

class UpdateStatusRequest(BaseModel):
    status: str
    note: Optional[str] = None


class UpdateLeadRequest(BaseModel):
    notes: Optional[str] = None
    estimated_value: Optional[float] = None
    assigned_to: Optional[int] = None


class AddNoteRequest(BaseModel):
    note: str


class CreateReminderRequest(BaseModel):
    title: str
    due_at: datetime


# ── Serializers ───────────────────────────────────────────────────────────────

def _serialize_activity(a) -> dict:
    return {
        "id": a.id,
        "lead_id": a.lead_id,
        "actor_id": a.actor_id,
        "actor_name": a.actor.name if a.actor else None,
        "action": a.action,
        "from_status": a.from_status,
        "to_status": a.to_status,
        "note": a.note,
        "metadata": a.metadata_json,
        "created_at": a.created_at.isoformat() if a.created_at else None,
    }


def _serialize_reminder(r) -> dict:
    return {
        "id": r.id,
        "lead_id": r.lead_id,
        "owner_id": r.owner_id,
        "title": r.title,
        "due_at": r.due_at.isoformat() if r.due_at else None,
        "is_done": r.is_done,
        "created_at": r.created_at.isoformat() if r.created_at else None,
    }


def _serialize_lead(lead) -> dict:
    return {
        "id": lead.id,
        "startup_id": lead.startup_id,
        "startup_name": lead.startup.name if lead.startup else None,
        "startup_logo": lead.startup.logo_url if lead.startup else None,
        "investor_id": lead.investor_id,
        "investor_name": lead.investor.name if lead.investor else None,
        "investor_email": lead.investor.email if lead.investor else None,
        "investor_profile_image": lead.investor.profile_image if lead.investor else None,
        "founder_id": lead.founder_id,
        "status": lead.status,
        "interest_level": lead.interest_level,
        "estimated_value": lead.estimated_value,
        "notes": lead.notes,
        "conversation_id": lead.conversation_id,
        "source": lead.source,
        "assigned_to": lead.assigned_to,
        "created_at": lead.created_at.isoformat() if lead.created_at else None,
        "updated_at": lead.updated_at.isoformat() if lead.updated_at else None,
    }


# ── Leads ─────────────────────────────────────────────────────────────────────

@router.get("/leads", summary="List CRM leads")
async def list_leads(
    status_filter: Optional[str] = Query(None, alias="status"),
    startup_id: Optional[int] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_any_user),
):
    leads = crm_service.list_leads(db, current_user, status_filter=status_filter, startup_id=startup_id, skip=skip, limit=limit)
    return [_serialize_lead(l) for l in leads]


@router.get("/leads/kanban", summary="Get Kanban board data")
async def kanban_board(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_any_user),
):
    return crm_service.get_kanban(db, current_user)


@router.get("/leads/{lead_id}", summary="Get lead detail")
async def get_lead(
    lead_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_any_user),
):
    lead = crm_service.get_lead(db, lead_id, current_user)
    return _serialize_lead(lead)


@router.patch("/leads/{lead_id}", summary="Update lead fields (notes, value, assignment)")
async def update_lead(
    lead_id: int,
    body: UpdateLeadRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_any_user),
):
    lead = crm_service.update_lead_fields(
        db, lead_id, current_user,
        notes=body.notes,
        estimated_value=body.estimated_value,
        assigned_to=body.assigned_to,
    )
    return _serialize_lead(lead)


@router.patch("/leads/{lead_id}/status", summary="Move lead to a new pipeline stage")
async def update_status(
    lead_id: int,
    body: UpdateStatusRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_any_user),
):
    lead = crm_service.update_lead_status(db, lead_id, body.status, current_user, note=body.note)
    return _serialize_lead(lead)


# ── Activity / Notes ──────────────────────────────────────────────────────────

@router.get("/leads/{lead_id}/activity", summary="Get lead activity timeline")
async def get_activity(
    lead_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_any_user),
):
    activities = crm_service.get_activity(db, lead_id, current_user)
    return [_serialize_activity(a) for a in activities]


@router.post("/leads/{lead_id}/notes", status_code=status.HTTP_201_CREATED, summary="Add a note to a lead")
async def add_note(
    lead_id: int,
    body: AddNoteRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_any_user),
):
    activity = crm_service.add_note(db, lead_id, current_user, body.note)
    return _serialize_activity(activity)


# ── Reminders ─────────────────────────────────────────────────────────────────

@router.get("/leads/{lead_id}/reminders", summary="List reminders for a lead")
async def list_reminders(
    lead_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_any_user),
):
    reminders = crm_service.list_reminders(db, lead_id, current_user)
    return [_serialize_reminder(r) for r in reminders]


@router.post("/leads/{lead_id}/reminders", status_code=status.HTTP_201_CREATED, summary="Create a reminder")
async def create_reminder(
    lead_id: int,
    body: CreateReminderRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_any_user),
):
    reminder = crm_service.create_reminder(db, lead_id, current_user, body.title, body.due_at)
    return _serialize_reminder(reminder)


@router.patch("/leads/{lead_id}/reminders/{reminder_id}", summary="Mark a reminder as done")
async def complete_reminder(
    lead_id: int,
    reminder_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_any_user),
):
    reminder = crm_service.complete_reminder(db, lead_id, reminder_id, current_user)
    return _serialize_reminder(reminder)


# ── Admin metrics ─────────────────────────────────────────────────────────────

@router.get("/metrics", summary="CRM pipeline metrics (admin only)")
async def pipeline_metrics(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_admin),
):
    return crm_service.get_pipeline_metrics(db)
