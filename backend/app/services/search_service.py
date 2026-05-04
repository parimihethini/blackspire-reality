import os
from typing import Any, Dict, Optional

from elasticsearch import AsyncElasticsearch, NotFoundError

from app.core.config import settings

INDEX = "blackspire_properties"

_MAPPING = {
    "mappings": {
        "properties": {
            "id": {"type": "integer"},
            "title": {"type": "text", "analyzer": "standard"},
            "description": {"type": "text"},
            "type": {"type": "keyword"},
            "status": {"type": "keyword"},
            "price": {"type": "float"},
            "city": {"type": "keyword"},
            "state": {"type": "keyword"},
            "pincode": {"type": "keyword"},
            "area": {"type": "text"},
            "features": {"type": "keyword"},
            "is_published": {"type": "boolean"},
            "created_at": {"type": "date"},
            "location": {"type": "geo_point"},
        }
    }
}


class SearchService:
    def __init__(self):
        self._client: Optional[AsyncElasticsearch] = None

    async def connect(self):
        try:
            # Skip if URL is default localhost in production environments
            if "localhost" in settings.ELASTICSEARCH_URL:
                if os.getenv("RAILWAY_ENVIRONMENT") or os.getenv("PORT"):
                    print("[Search] Elasticsearch not configured (using default localhost in production). Full-text search disabled.")
                    self._client = None
                    return

            self._client = AsyncElasticsearch([settings.ELASTICSEARCH_URL])
            if not await self._client.indices.exists(index=INDEX):
                await self._client.indices.create(index=INDEX, body=_MAPPING)
            print("[Search] Elasticsearch connected.")
        except Exception as e:
            print(f"[Search] Elasticsearch unavailable (Connection Error): {e}")
            self._client = None

    async def disconnect(self):
        if self._client:
            await self._client.close()

    async def index(self, prop: Dict[str, Any]):
        if not self._client:
            return
        doc = {**prop}
        if doc.get("latitude") and doc.get("longitude"):
            doc["location"] = {"lat": doc["latitude"], "lon": doc["longitude"]}
        try:
            await self._client.index(index=INDEX, id=doc["id"], document=doc)
        except Exception as e:
            print(f"[Search] Index error: {e}")

    async def delete(self, prop_id: int):
        if not self._client:
            return
        try:
            await self._client.delete(index=INDEX, id=prop_id)
        except (NotFoundError, Exception):
            pass

    async def search(
        self,
        query: Optional[str] = None,
        city: Optional[str] = None,
        prop_type: Optional[str] = None,
        min_price: Optional[float] = None,
        max_price: Optional[float] = None,
        pincode: Optional[str] = None,
        from_: int = 0,
        size: int = 20,
    ) -> Dict[str, Any]:
        if not self._client:
            return {"hits": {"hits": [], "total": {"value": 0}}}

        must = [{"term": {"is_published": True}}]
        filters = []

        if query:
            must.append({
                "multi_match": {
                    "query": query,
                    "fields": ["title^3", "description", "area", "city"],
                }
            })
        if city:
            filters.append({"term": {"city": city}})
        if prop_type:
            filters.append({"term": {"type": prop_type}})
        if pincode:
            filters.append({"term": {"pincode": pincode}})
        if min_price or max_price:
            rng: Dict = {}
            if min_price:
                rng["gte"] = min_price
            if max_price:
                rng["lte"] = max_price
            filters.append({"range": {"price": rng}})

        body = {
            "query": {"bool": {"must": must, "filter": filters}},
            "from": from_,
            "size": size,
            "sort": [{"_score": "desc"}, {"created_at": "desc"}],
        }

        try:
            return await self._client.search(index=INDEX, body=body)
        except Exception as e:
            print(f"[Search] Search error: {e}")
            return {"hits": {"hits": [], "total": {"value": 0}}}


search = SearchService()
