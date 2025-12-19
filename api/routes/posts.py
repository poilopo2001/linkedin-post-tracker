from fastapi import APIRouter, Depends, HTTPException, Query, BackgroundTasks
from sqlalchemy.orm import Session
from sqlalchemy import func, desc
from typing import List, Optional
from datetime import datetime, timedelta
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from database import get_db
from models import Company, Post, CollectionLog
from schemas import (
    Post as PostSchema,
    CollectRequest,
    CollectBatchRequest,
    CollectionStatus,
    PostCategory
)
from services.collector import collect_company_posts, collect_all_companies

router = APIRouter(prefix="/api/posts", tags=["posts"])


@router.get("/", response_model=List[PostSchema])
def list_posts(
    company_id: Optional[int] = None,
    category: Optional[str] = None,
    sentiment: Optional[str] = None,
    date_from: Optional[datetime] = None,
    date_to: Optional[datetime] = None,
    min_engagement: Optional[int] = None,
    search: Optional[str] = None,
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db)
):
    """Liste les posts avec filtres optionnels"""
    query = db.query(Post).join(Company)

    if company_id:
        query = query.filter(Post.company_id == company_id)

    if category:
        query = query.filter(Post.category == category)

    if sentiment:
        query = query.filter(Post.sentiment == sentiment)

    if date_from:
        query = query.filter(Post.posted_at >= date_from)

    if date_to:
        query = query.filter(Post.posted_at <= date_to)

    if min_engagement:
        query = query.filter(
            (Post.likes + Post.comments + Post.shares) >= min_engagement
        )

    if search:
        query = query.filter(Post.content.ilike(f"%{search}%"))

    posts = query.order_by(desc(Post.posted_at)).offset(skip).limit(limit).all()

    result = []
    for post in posts:
        post_dict = {
            "id": post.id,
            "company_id": post.company_id,
            "linkedin_post_id": post.linkedin_post_id,
            "content": post.content,
            "posted_at": post.posted_at,
            "category": post.category,
            "sentiment": post.sentiment,
            "confidence_score": post.confidence_score,
            "keywords": post.keywords,
            "likes": post.likes,
            "comments": post.comments,
            "shares": post.shares,
            "media_type": post.media_type,
            "url": post.url,
            "collected_at": post.collected_at,
            "company_name": post.company.name
        }
        result.append(post_dict)

    return result


@router.get("/{post_id}", response_model=PostSchema)
def get_post(post_id: int, db: Session = Depends(get_db)):
    """Récupère un post par son ID"""
    post = db.query(Post).filter(Post.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")

    return {
        "id": post.id,
        "company_id": post.company_id,
        "linkedin_post_id": post.linkedin_post_id,
        "content": post.content,
        "posted_at": post.posted_at,
        "category": post.category,
        "sentiment": post.sentiment,
        "confidence_score": post.confidence_score,
        "keywords": post.keywords,
        "likes": post.likes,
        "comments": post.comments,
        "shares": post.shares,
        "media_type": post.media_type,
        "url": post.url,
        "collected_at": post.collected_at,
        "company_name": post.company.name
    }


@router.post("/collect")
async def trigger_collection(
    request: CollectRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """
    Lance une collecte de posts.
    Si company_id est fourni, collecte pour cette entreprise uniquement.
    Sinon, collecte pour toutes les entreprises actives.
    """
    if request.company_id:
        company = db.query(Company).filter(
            Company.id == request.company_id,
            Company.is_active == True
        ).first()

        if not company:
            raise HTTPException(status_code=404, detail="Company not found or inactive")

        result = await collect_company_posts(
            db, company, request.max_posts, request.classify
        )
        return result
    else:
        result = await collect_all_companies(
            db, None, request.max_posts, request.classify
        )
        return result


@router.post("/collect/batch")
async def trigger_batch_collection(
    request: CollectBatchRequest,
    db: Session = Depends(get_db)
):
    """Lance une collecte pour plusieurs entreprises"""
    result = await collect_all_companies(
        db,
        request.company_ids,
        request.max_posts_per_company,
        request.classify
    )
    return result


@router.get("/collection/logs", response_model=List[CollectionStatus])
def list_collection_logs(
    limit: int = 20,
    status: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Liste les logs de collecte"""
    query = db.query(CollectionLog)

    if status:
        query = query.filter(CollectionLog.status == status)

    logs = query.order_by(desc(CollectionLog.started_at)).limit(limit).all()
    return logs


@router.get("/categories")
def list_categories():
    """Liste les catégories disponibles"""
    return {
        "categories": [
            {"id": "recruitment", "label": "Recrutement", "color": "#3B82F6"},
            {"id": "promotional", "label": "Promotionnel", "color": "#10B981"},
            {"id": "thought_leadership", "label": "Thought Leadership", "color": "#8B5CF6"},
            {"id": "events", "label": "Événements", "color": "#F59E0B"},
            {"id": "csr", "label": "RSE", "color": "#06B6D4"},
            {"id": "internal_news", "label": "Actualités internes", "color": "#EC4899"},
            {"id": "partnerships", "label": "Partenariats", "color": "#EF4444"}
        ]
    }


@router.delete("/{post_id}")
def delete_post(post_id: int, db: Session = Depends(get_db)):
    """Supprime un post"""
    post = db.query(Post).filter(Post.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")

    db.delete(post)
    db.commit()

    return {"success": True, "message": f"Post {post_id} deleted"}
