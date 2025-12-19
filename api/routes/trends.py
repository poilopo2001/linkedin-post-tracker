from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, desc, case
from typing import Optional
from datetime import datetime, timedelta
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from database import get_db
from models import Company, Post
from schemas import DashboardStats, CategoryCount, SentimentCount, CompanyActivity, TrendPoint

router = APIRouter(prefix="/api/trends", tags=["trends"])


@router.get("/", response_model=DashboardStats)
def get_dashboard_stats(
    days: int = Query(30, description="Nombre de jours pour les tendances"),
    db: Session = Depends(get_db)
):
    """Statistiques globales pour le dashboard"""
    cutoff_date = datetime.utcnow() - timedelta(days=days)
    last_7_days = datetime.utcnow() - timedelta(days=7)

    # Compteurs de base
    total_companies = db.query(Company).count()
    active_companies = db.query(Company).filter(Company.is_active == True).count()
    total_posts = db.query(Post).count()
    posts_last_7_days = db.query(Post).filter(Post.collected_at >= last_7_days).count()

    # Posts par catégorie
    category_counts = db.query(
        Post.category,
        func.count(Post.id).label("count")
    ).filter(
        Post.category.isnot(None)
    ).group_by(Post.category).all()

    total_categorized = sum(c.count for c in category_counts)
    posts_by_category = [
        CategoryCount(
            category=c.category or "unknown",
            count=c.count,
            percentage=round((c.count / total_categorized * 100) if total_categorized > 0 else 0, 1)
        )
        for c in category_counts
    ]

    # Posts par sentiment
    sentiment_counts = db.query(
        Post.sentiment,
        func.count(Post.id).label("count")
    ).filter(
        Post.sentiment.isnot(None)
    ).group_by(Post.sentiment).all()

    total_sentiments = sum(s.count for s in sentiment_counts)
    posts_by_sentiment = [
        SentimentCount(
            sentiment=s.sentiment or "unknown",
            count=s.count,
            percentage=round((s.count / total_sentiments * 100) if total_sentiments > 0 else 0, 1)
        )
        for s in sentiment_counts
    ]

    # Top entreprises par activité
    top_companies_query = db.query(
        Company.id,
        Company.name,
        func.count(Post.id).label("post_count"),
        func.avg(Post.likes + Post.comments + Post.shares).label("avg_engagement")
    ).join(Post).group_by(Company.id).order_by(
        desc("post_count")
    ).limit(10).all()

    top_companies = [
        CompanyActivity(
            company_id=c.id,
            company_name=c.name,
            post_count=c.post_count,
            avg_engagement=round(c.avg_engagement or 0, 1)
        )
        for c in top_companies_query
    ]

    # Tendances récentes (par jour et catégorie)
    trends_query = db.query(
        func.date(Post.posted_at).label("date"),
        Post.category,
        func.count(Post.id).label("count")
    ).filter(
        Post.posted_at >= cutoff_date,
        Post.category.isnot(None)
    ).group_by(
        func.date(Post.posted_at),
        Post.category
    ).order_by("date").all()

    recent_trends = [
        TrendPoint(
            date=str(t.date) if t.date else "",
            category=t.category or "unknown",
            count=t.count
        )
        for t in trends_query
    ]

    return DashboardStats(
        total_companies=total_companies,
        active_companies=active_companies,
        total_posts=total_posts,
        posts_last_7_days=posts_last_7_days,
        posts_by_category=posts_by_category,
        posts_by_sentiment=posts_by_sentiment,
        top_companies=top_companies,
        recent_trends=recent_trends
    )


@router.get("/categories")
def get_category_breakdown(
    company_id: Optional[int] = None,
    days: Optional[int] = None,
    db: Session = Depends(get_db)
):
    """Répartition détaillée par catégorie"""
    query = db.query(
        Post.category,
        func.count(Post.id).label("count"),
        func.avg(Post.likes).label("avg_likes"),
        func.avg(Post.comments).label("avg_comments"),
        func.avg(Post.shares).label("avg_shares"),
        func.avg(Post.confidence_score).label("avg_confidence")
    )

    if company_id:
        query = query.filter(Post.company_id == company_id)

    if days:
        cutoff = datetime.utcnow() - timedelta(days=days)
        query = query.filter(Post.collected_at >= cutoff)

    results = query.filter(
        Post.category.isnot(None)
    ).group_by(Post.category).all()

    return {
        "breakdown": [
            {
                "category": r.category,
                "count": r.count,
                "avg_likes": round(r.avg_likes or 0, 1),
                "avg_comments": round(r.avg_comments or 0, 1),
                "avg_shares": round(r.avg_shares or 0, 1),
                "avg_confidence": round(r.avg_confidence or 0, 1),
                "avg_engagement": round((r.avg_likes or 0) + (r.avg_comments or 0) + (r.avg_shares or 0), 1)
            }
            for r in results
        ]
    }


@router.get("/timeline")
def get_timeline(
    category: Optional[str] = None,
    company_id: Optional[int] = None,
    days: int = 30,
    db: Session = Depends(get_db)
):
    """Timeline des posts par jour"""
    cutoff = datetime.utcnow() - timedelta(days=days)

    query = db.query(
        func.date(Post.posted_at).label("date"),
        func.count(Post.id).label("count"),
        func.sum(Post.likes).label("total_likes"),
        func.sum(Post.comments).label("total_comments")
    ).filter(Post.posted_at >= cutoff)

    if category:
        query = query.filter(Post.category == category)

    if company_id:
        query = query.filter(Post.company_id == company_id)

    results = query.group_by(func.date(Post.posted_at)).order_by("date").all()

    return {
        "timeline": [
            {
                "date": str(r.date) if r.date else "",
                "count": r.count,
                "total_likes": r.total_likes or 0,
                "total_comments": r.total_comments or 0
            }
            for r in results
        ]
    }


@router.get("/engagement")
def get_engagement_stats(
    days: int = 30,
    db: Session = Depends(get_db)
):
    """Statistiques d'engagement par catégorie"""
    cutoff = datetime.utcnow() - timedelta(days=days)

    results = db.query(
        Post.category,
        func.count(Post.id).label("count"),
        func.sum(Post.likes).label("total_likes"),
        func.sum(Post.comments).label("total_comments"),
        func.sum(Post.shares).label("total_shares"),
        func.avg(Post.likes + Post.comments + Post.shares).label("avg_engagement")
    ).filter(
        Post.posted_at >= cutoff,
        Post.category.isnot(None)
    ).group_by(Post.category).all()

    return {
        "engagement": [
            {
                "category": r.category,
                "post_count": r.count,
                "total_likes": r.total_likes or 0,
                "total_comments": r.total_comments or 0,
                "total_shares": r.total_shares or 0,
                "avg_engagement": round(r.avg_engagement or 0, 1)
            }
            for r in results
        ]
    }


@router.get("/company/{company_id}")
def get_company_trends(
    company_id: int,
    days: int = 30,
    db: Session = Depends(get_db)
):
    """Tendances spécifiques à une entreprise"""
    cutoff = datetime.utcnow() - timedelta(days=days)

    company = db.query(Company).filter(Company.id == company_id).first()
    if not company:
        return {"error": "Company not found"}

    # Posts par catégorie
    category_counts = db.query(
        Post.category,
        func.count(Post.id).label("count")
    ).filter(
        Post.company_id == company_id,
        Post.posted_at >= cutoff,
        Post.category.isnot(None)
    ).group_by(Post.category).all()

    # Timeline
    timeline = db.query(
        func.date(Post.posted_at).label("date"),
        func.count(Post.id).label("count")
    ).filter(
        Post.company_id == company_id,
        Post.posted_at >= cutoff
    ).group_by(func.date(Post.posted_at)).order_by("date").all()

    # Engagement moyen
    engagement = db.query(
        func.avg(Post.likes).label("avg_likes"),
        func.avg(Post.comments).label("avg_comments"),
        func.avg(Post.shares).label("avg_shares")
    ).filter(
        Post.company_id == company_id,
        Post.posted_at >= cutoff
    ).first()

    return {
        "company": {
            "id": company.id,
            "name": company.name
        },
        "categories": [
            {"category": c.category, "count": c.count}
            for c in category_counts
        ],
        "timeline": [
            {"date": str(t.date), "count": t.count}
            for t in timeline
        ],
        "avg_engagement": {
            "likes": round(engagement.avg_likes or 0, 1),
            "comments": round(engagement.avg_comments or 0, 1),
            "shares": round(engagement.avg_shares or 0, 1)
        }
    }
