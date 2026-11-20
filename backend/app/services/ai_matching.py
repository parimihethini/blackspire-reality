import logging
from typing import Dict, List, Any
from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError
from fastapi import HTTPException, status

logger = logging.getLogger(__name__)

class AIMatchingEngine:
    @staticmethod
    def calculate_investor_match_score(
        startup_industry: str,
        startup_stage: str,
        startup_geography: str,
        startup_ticket_req: float,
        investor_preferences: Dict[str, Any]
    ) -> float:
        """
        Computes a weighted match score (0-100) between a startup profile and an investor's preferences.
        Weights: Industry (40%), Stage (25%), Geography (20%), Ticket Size (15%).
        """
        score = 0.0
        
        # 1. Industry Match (40%)
        preferred_industries = investor_preferences.get("preferred_industries", [])
        if startup_industry in preferred_industries or not preferred_industries:
            score += 40.0

        # 2. Stage Match (25%)
        preferred_stage = investor_preferences.get("investment_stage")
        if not preferred_stage or startup_stage.lower() == preferred_stage.lower():
            score += 25.0

        # 3. Geography Match (20%)
        preferred_countries = investor_preferences.get("preferred_countries", [])
        if startup_geography in preferred_countries or not preferred_countries:
            score += 20.0

        # 4. Ticket Size Match (15%)
        min_ticket = investor_preferences.get("ticket_size_min", 0.0)
        max_ticket = investor_preferences.get("ticket_size_max", float("inf"))
        if min_ticket <= startup_ticket_req <= max_ticket:
            score += 15.0

        return round(score, 2)

    @classmethod
    def generate_ai_recommendation_report(
        cls, 
        db: Session, 
        startup_id: str, 
        investor_id: str
    ) -> Dict[str, Any]:
        """
        Generates full AI matching insights including match score, success probability, 
        investor recommendation rationale, and a suggested outreach strategy.
        """
        try:
            # Simulated database retrieval for startup & investor profiles
            # In production, query StartupModel and InvestorModel using db session
            
            mock_startup = {
                "id": startup_id,
                "startup_name": "Blackspire Spatial AI",
                "industry": "AI & Machine Learning",
                "stage": "Seed",
                "geography": "United States",
                "funding_requirement": 1500000.0
            }
            
            mock_investor = {
                "id": investor_id,
                "investor_name": "Apex Ventures",
                "preferred_industries": ["AI & Machine Learning", "SaaS"],
                "investment_stage": "Seed",
                "preferred_countries": ["United States", "Canada"],
                "ticket_size_min": 500000.0,
                "ticket_size_max": 5000000.0
            }

            match_score = cls.calculate_investor_match_score(
                mock_startup["industry"],
                mock_startup["stage"],
                mock_startup["geography"],
                mock_startup["funding_requirement"],
                mock_investor
            )

            success_probability = min(98.5, match_score * 0.95)

            return {
                "status": "success",
                "startup_id": startup_id,
                "investor_id": investor_id,
                "match_score": match_score,
                "success_probability_percentage": success_probability,
                "investor_recommendation": "High alignment on industry sector and ticket range. Highly recommended for outreach.",
                "suggested_outreach_strategy": (
                    "Send a warm introductory email highlighting market traction in AI & Machine Learning, "
                    "reference their portfolio investments in deep tech, and request a 15-minute introductory call."
                )
            }

        except SQLAlchemyError as se:
            logger.error(f"Database error during AI matching execution: {se}")
            db.rollback()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="A database error occurred while computing AI recommendations."
            )
        except Exception as e:
            logger.critical(f"Unhandled error in AI matching engine: {e}", exc_info=True)
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="An unexpected error occurred in the AI matching service."
            )