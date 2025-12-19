import httpx
import json
from datetime import datetime
from typing import Optional, List
from sqlalchemy.orm import Session
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from models import Company, Post, CollectionLog

# URL de l'API TypeScript
TYPESCRIPT_API_URL = os.getenv("TYPESCRIPT_API_URL", "http://localhost:3001")


async def collect_company_posts(
    db: Session,
    company: Company,
    max_posts: int = 20,
    classify: bool = True
) -> dict:
    """
    Appelle l'API TypeScript pour collecter les posts d'une entreprise
    et stocke les résultats en base de données.
    """
    # Créer un log de collecte
    log = CollectionLog(
        company_id=company.id,
        status="running"
    )
    db.add(log)
    db.commit()

    try:
        async with httpx.AsyncClient(timeout=180.0) as client:
            response = await client.post(
                f"{TYPESCRIPT_API_URL}/collect",
                json={
                    "company_linkedin_url": company.linkedin_url,
                    "company_name": company.name,
                    "max_posts": max_posts,
                    "classify": classify
                }
            )
            response.raise_for_status()
            result = response.json()

        if not result.get("success"):
            raise Exception(result.get("error", "Unknown error"))

        data = result.get("data", {})
        posts_data = data.get("posts", [])

        # Stocker les posts en base
        posts_added = 0
        for post_data in posts_data:
            # Vérifier si le post existe déjà (par post_id ou contenu)
            existing = None
            if post_data.get("post_id"):
                existing = db.query(Post).filter(
                    Post.linkedin_post_id == post_data["post_id"]
                ).first()

            if existing:
                # Mettre à jour les métriques d'engagement
                existing.likes = post_data.get("likes", 0)
                existing.comments = post_data.get("comments", 0)
                existing.shares = post_data.get("shares", 0)
            else:
                # Créer un nouveau post
                post = Post(
                    company_id=company.id,
                    linkedin_post_id=post_data.get("post_id"),
                    content=post_data.get("content"),
                    posted_at=parse_datetime(post_data.get("posted_at")),
                    category=post_data.get("category"),
                    sentiment=post_data.get("sentiment"),
                    confidence_score=post_data.get("confidence_score"),
                    keywords=json.dumps(post_data.get("keywords", [])),
                    likes=post_data.get("likes", 0),
                    comments=post_data.get("comments", 0),
                    shares=post_data.get("shares", 0),
                    media_type=post_data.get("media_type"),
                    url=post_data.get("url")
                )
                db.add(post)
                posts_added += 1

        # Mettre à jour la date de dernière collecte
        company.last_collected_at = datetime.utcnow()

        # Mettre à jour le log
        log.completed_at = datetime.utcnow()
        log.posts_collected = posts_added
        log.status = "completed"

        db.commit()

        return {
            "success": True,
            "company_id": company.id,
            "posts_collected": posts_added,
            "posts_updated": len(posts_data) - posts_added
        }

    except Exception as e:
        log.completed_at = datetime.utcnow()
        log.status = "failed"
        log.error_message = str(e)
        db.commit()

        return {
            "success": False,
            "company_id": company.id,
            "error": str(e)
        }


async def collect_all_companies(
    db: Session,
    company_ids: Optional[List[int]] = None,
    max_posts_per_company: int = 10,
    classify: bool = True
) -> dict:
    """
    Collecte les posts de plusieurs entreprises.
    Si company_ids est None, collecte pour toutes les entreprises actives.
    """
    if company_ids:
        companies = db.query(Company).filter(
            Company.id.in_(company_ids),
            Company.is_active == True
        ).all()
    else:
        companies = db.query(Company).filter(Company.is_active == True).all()

    results = []
    total_posts = 0

    for company in companies:
        result = await collect_company_posts(
            db, company, max_posts_per_company, classify
        )
        results.append(result)
        if result.get("success"):
            total_posts += result.get("posts_collected", 0)

    return {
        "companies_processed": len(companies),
        "successful": len([r for r in results if r.get("success")]),
        "failed": len([r for r in results if not r.get("success")]),
        "total_posts_collected": total_posts,
        "results": results
    }


def parse_datetime(dt_string: Optional[str]) -> Optional[datetime]:
    """Parse une string datetime en objet datetime"""
    if not dt_string:
        return None
    try:
        # Essayer différents formats
        for fmt in ["%Y-%m-%dT%H:%M:%S.%fZ", "%Y-%m-%dT%H:%M:%SZ", "%Y-%m-%d"]:
            try:
                return datetime.strptime(dt_string, fmt)
            except ValueError:
                continue
        return None
    except Exception:
        return None
