from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_investor
from app.db.session import get_db
from app.models.user import User
from app.schemas.startup import (
    ContactRequestCreate,
    DeckRequestCreate,
    InterestExpressionCreate,
    StartupInteractionSummary,
    StartupProfileResponse,
)
from app.services import startup_interaction_service

router = APIRouter(prefix="/investor/startups", tags=["Investor Startup Actions"])


def _enum_val(v):
    return v.value if hasattr(v, "value") else v


@router.get("/saved", response_model=list[StartupProfileResponse])
async def list_saved_startups(
    db: Session = Depends(get_db),
    investor: User = Depends(get_current_investor),
):
    return startup_interaction_service.list_saved_startups(db, investor)


@router.get("/interactions", response_model=StartupInteractionSummary)
async def list_interactions(
    db: Session = Depends(get_db),
    investor: User = Depends(get_current_investor),
):
    return startup_interaction_service.get_investor_interactions(db, investor)


@router.post("/{startup_id}/save", status_code=status.HTTP_200_OK)
async def save_startup(
    startup_id: int,
    db: Session = Depends(get_db),
    investor: User = Depends(get_current_investor),
):
    return startup_interaction_service.save_startup(db, startup_id, investor)


@router.delete("/{startup_id}/save", status_code=status.HTTP_200_OK)
async def unsave_startup(
    startup_id: int,
    db: Session = Depends(get_db),
    investor: User = Depends(get_current_investor),
):
    return startup_interaction_service.unsave_startup(db, startup_id, investor)


@router.post("/{startup_id}/request-deck", status_code=status.HTTP_201_CREATED)
async def request_deck(
    startup_id: int,
    body: DeckRequestCreate,
    db: Session = Depends(get_db),
    investor: User = Depends(get_current_investor),
):
    req = startup_interaction_service.request_pitch_deck(db, startup_id, investor, body)
    return {"id": req.id, "status": _enum_val(req.status), "message": "Deck request submitted"}


@router.post("/{startup_id}/contact", status_code=status.HTTP_201_CREATED)
async def contact_founder(
    startup_id: int,
    body: ContactRequestCreate,
    db: Session = Depends(get_db),
    investor: User = Depends(get_current_investor),
):
    req = startup_interaction_service.contact_founder(db, startup_id, investor, body)
    return {"id": req.id, "status": _enum_val(req.status), "message": "Contact request submitted"}


@router.post("/{startup_id}/express-interest", status_code=status.HTTP_201_CREATED)
async def express_interest(
    startup_id: int,
    body: InterestExpressionCreate,
    db: Session = Depends(get_db),
    investor: User = Depends(get_current_investor),
):
    expr = startup_interaction_service.express_interest(db, startup_id, investor, body)
    return {
        "id": expr.id,
        "status": _enum_val(expr.status),
        "interest_level": _enum_val(expr.interest_level),
        "message": "Interest expressed",
    }
