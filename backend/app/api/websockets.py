import asyncio
import json
from typing import Dict, Set

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session

from app.db.session import SessionLocal
from app.models.property import Property

router = APIRouter()

# Connection registry: property_id → set of connected websockets
_connections: Dict[int, Set[WebSocket]] = {}


async def broadcast_price(property_id: int, price: float):
    """Broadcast a price update to all listeners for a property."""
    if property_id not in _connections:
        return
    dead = set()
    for ws in _connections[property_id]:
        try:
            await ws.send_text(json.dumps({"property_id": property_id, "price": price}))
        except Exception:
            dead.add(ws)
    _connections[property_id] -= dead


@router.websocket("/price-stream/{property_id}")
async def price_stream(websocket: WebSocket, property_id: int):
    """
    Stream real-time price updates for a property.
    Sends current price every 5 seconds with ±0.3% market fluctuation.
    """
    await websocket.accept()

    # Register connection
    _connections.setdefault(property_id, set()).add(websocket)

    db: Session = SessionLocal()
    try:
        prop = db.query(Property).filter(Property.id == property_id).first()
        if not prop:
            await websocket.send_text(json.dumps({"error": "Property not found"}))
            await websocket.close()
            return

        base_price = prop.price
        await websocket.send_text(json.dumps({
            "property_id": property_id,
            "price": base_price,
            "status": "connected",
        }))

        import random
        current_price = base_price
        while True:
            await asyncio.sleep(5)
            # Simulate realistic micro price movement (±0.3%)
            delta = current_price * random.uniform(-0.003, 0.003)
            current_price = round(current_price + delta, 2)
            await websocket.send_text(json.dumps({
                "property_id": property_id,
                "price": current_price,
            }))

    except WebSocketDisconnect:
        pass
    except Exception as e:
        try:
            await websocket.send_text(json.dumps({"error": str(e)}))
        except Exception:
            pass
    finally:
        _connections.get(property_id, set()).discard(websocket)
        db.close()


@router.websocket("/notifications/{user_id}")
async def user_notifications(websocket: WebSocket, user_id: int):
    """Push notifications channel for a specific user."""
    await websocket.accept()
    try:
        await websocket.send_text(json.dumps({
            "type": "connected",
            "user_id": user_id,
            "message": "Notifications channel connected",
        }))
        while True:
            # Keep alive — real notifications pushed via broadcast_price()
            await asyncio.sleep(30)
            await websocket.send_text(json.dumps({"type": "ping"}))
    except WebSocketDisconnect:
        pass
