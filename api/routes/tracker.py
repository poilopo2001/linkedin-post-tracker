from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, desc
from typing import List, Optional
from datetime import datetime, timedelta
import json
import subprocess
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from database import get_db
from models import (
    TrackedProfile, ProfileSnapshot, TrackedPost,
    PostContentInsight, ScrapeJob
)
from schemas import (
    TrackedProfile as TrackedProfileSchema,
    TrackedProfileCreate, TrackedProfileUpdate, TrackedProfileWithStats,
    ProfileSnapshot as ProfileSnapshotSchema,
    TrackedPost as TrackedPostSchema, TrackedPostWithInsights,
    PostContentInsight as PostContentInsightSchema,
    ScrapeJob as ScrapeJobSchema,
    TriggerScrapeRequest, BatchScrapeRequest, BatchScrapeResponse,
    TrackerAnalytics, EngagementTrend, TopPerformer,
    InspirationPost, InspirationResponse,
    ProfileType, TrackingFrequency, JobType
)

router = APIRouter(prefix="/api/tracker", tags=["tracker"])


# ============ Serialization Helpers ============

def serialize_profile(profile: TrackedProfile) -> dict:
    """Serialize tracked profile"""
    return {
        "id": profile.id,
        "linkedin_url": profile.linkedin_url,
        "profile_type": profile.profile_type,
        "display_name": profile.display_name,
        "headline": profile.headline,
        "location": profile.location,
        "industry": profile.industry,
        "follower_count": profile.follower_count,
        "connection_count": profile.connection_count,
        "profile_image_url": profile.profile_image_url,
        "about": profile.about,
        "tracking_frequency": profile.tracking_frequency,
        "is_active": profile.is_active,
        "priority": profile.priority,
        "tags": json.loads(profile.tags) if profile.tags else None,
        "notes": profile.notes,
        "total_posts_tracked": profile.total_posts_tracked,
        "avg_engagement_rate": profile.avg_engagement_rate,
        "created_at": profile.created_at,
        "last_scraped_at": profile.last_scraped_at,
        "next_scrape_at": profile.next_scrape_at,
    }


def serialize_snapshot(snapshot: ProfileSnapshot) -> dict:
    """Serialize profile snapshot"""
    return {
        "id": snapshot.id,
        "profile_id": snapshot.profile_id,
        "raw_data": snapshot.raw_data,
        "follower_count": snapshot.follower_count,
        "connection_count": snapshot.connection_count,
        "headline": snapshot.headline,
        "about_summary": snapshot.about_summary,
        "changes_detected": json.loads(snapshot.changes_detected) if snapshot.changes_detected else None,
        "is_significant_change": snapshot.is_significant_change,
        "scraped_at": snapshot.scraped_at,
        "scrape_duration_ms": snapshot.scrape_duration_ms,
        "scrape_status": snapshot.scrape_status,
        "error_message": snapshot.error_message,
    }


def serialize_tracked_post(post: TrackedPost, profile_name: str = None) -> dict:
    """Serialize tracked post"""
    return {
        "id": post.id,
        "profile_id": post.profile_id,
        "linkedin_post_id": post.linkedin_post_id,
        "content": post.content,
        "post_url": post.post_url,
        "posted_at": post.posted_at,
        "likes": post.likes,
        "comments": post.comments,
        "shares": post.shares,
        "media_type": post.media_type,
        "media_url": post.media_url,
        "category": post.category,
        "sentiment": post.sentiment,
        "confidence_score": post.confidence_score,
        "keywords": json.loads(post.keywords) if post.keywords else None,
        "hook_type": post.hook_type,
        "structure_type": post.structure_type,
        "cta_type": post.cta_type,
        "content_length": post.content_length,
        "hashtag_count": post.hashtag_count,
        "is_new": post.is_new,
        "first_seen_at": post.first_seen_at,
        "engagement_history": json.loads(post.engagement_history) if post.engagement_history else None,
        "total_engagement": (post.likes or 0) + (post.comments or 0) + (post.shares or 0),
        "profile_name": profile_name,
    }


def serialize_insight(insight: PostContentInsight) -> dict:
    """Serialize post content insight"""
    return {
        "id": insight.id,
        "post_id": insight.post_id,
        "hook_text": insight.hook_text,
        "key_takeaways": json.loads(insight.key_takeaways) if insight.key_takeaways else None,
        "call_to_action": insight.call_to_action,
        "tone": insight.tone,
        "readability_score": insight.readability_score,
        "emoji_usage": insight.emoji_usage,
        "line_break_pattern": insight.line_break_pattern,
        "predicted_engagement": insight.predicted_engagement,
        "engagement_drivers": json.loads(insight.engagement_drivers) if insight.engagement_drivers else None,
        "adaptability_score": insight.adaptability_score,
        "adaptation_suggestions": json.loads(insight.adaptation_suggestions) if insight.adaptation_suggestions else None,
        "analyzed_at": insight.analyzed_at,
    }


def serialize_job(job: ScrapeJob, profile_name: str = None) -> dict:
    """Serialize scrape job"""
    duration = None
    if job.started_at and job.completed_at:
        duration = int((job.completed_at - job.started_at).total_seconds())

    return {
        "id": job.id,
        "profile_id": job.profile_id,
        "job_type": job.job_type,
        "status": job.status,
        "scheduled_at": job.scheduled_at,
        "started_at": job.started_at,
        "completed_at": job.completed_at,
        "items_scraped": job.items_scraped,
        "new_items_found": job.new_items_found,
        "changes_detected": job.changes_detected,
        "error_message": job.error_message,
        "retry_count": job.retry_count,
        "max_retries": job.max_retries,
        "created_at": job.created_at,
        "duration_seconds": duration,
        "profile_name": profile_name,
    }


# ============ Profile Endpoints ============

@router.get("/profiles", response_model=List[TrackedProfileSchema])
def list_profiles(
    active_only: bool = True,
    profile_type: Optional[str] = None,
    tag: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Liste tous les profils trackes"""
    query = db.query(TrackedProfile)

    if active_only:
        query = query.filter(TrackedProfile.is_active == True)

    if profile_type:
        query = query.filter(TrackedProfile.profile_type == profile_type)

    if tag:
        query = query.filter(TrackedProfile.tags.contains(f'"{tag}"'))

    profiles = query.order_by(
        TrackedProfile.priority.desc(),
        TrackedProfile.last_scraped_at.desc().nullslast()
    ).all()

    return [serialize_profile(p) for p in profiles]


@router.post("/profiles", response_model=TrackedProfileSchema)
def create_profile(
    profile: TrackedProfileCreate,
    db: Session = Depends(get_db)
):
    """Ajoute un nouveau profil a tracker"""
    # Verifier si l'URL existe deja
    existing = db.query(TrackedProfile).filter(
        TrackedProfile.linkedin_url == profile.linkedin_url
    ).first()

    if existing:
        raise HTTPException(
            status_code=400,
            detail=f"Profile already exists with ID {existing.id}"
        )

    db_profile = TrackedProfile(
        linkedin_url=profile.linkedin_url,
        profile_type=profile.profile_type.value,
        display_name=profile.display_name,
        headline=profile.headline,
        location=profile.location,
        industry=profile.industry,
        tracking_frequency=profile.tracking_frequency.value,
        priority=profile.priority,
        tags=json.dumps(profile.tags) if profile.tags else None,
        notes=profile.notes,
        is_active=True,
        total_posts_tracked=0
    )

    db.add(db_profile)
    db.commit()
    db.refresh(db_profile)

    return serialize_profile(db_profile)


@router.get("/profiles/{profile_id}", response_model=TrackedProfileWithStats)
def get_profile(profile_id: int, db: Session = Depends(get_db)):
    """Recupere un profil avec ses stats"""
    profile = db.query(TrackedProfile).filter(
        TrackedProfile.id == profile_id
    ).first()

    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")

    # Stats additionnelles
    recent_posts = db.query(TrackedPost).filter(
        TrackedPost.profile_id == profile_id,
        TrackedPost.first_seen_at >= datetime.utcnow() - timedelta(days=7)
    ).count()

    last_post = db.query(TrackedPost).filter(
        TrackedPost.profile_id == profile_id
    ).order_by(TrackedPost.first_seen_at.desc()).first()

    result = serialize_profile(profile)
    result["recent_posts_count"] = recent_posts
    result["last_post_date"] = last_post.first_seen_at if last_post else None
    result["engagement_trend"] = None  # TODO: calculer la tendance

    return result


@router.put("/profiles/{profile_id}", response_model=TrackedProfileSchema)
def update_profile(
    profile_id: int,
    update: TrackedProfileUpdate,
    db: Session = Depends(get_db)
):
    """Met a jour un profil"""
    profile = db.query(TrackedProfile).filter(
        TrackedProfile.id == profile_id
    ).first()

    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")

    update_data = update.dict(exclude_unset=True)

    if "tags" in update_data and update_data["tags"] is not None:
        update_data["tags"] = json.dumps(update_data["tags"])

    if "tracking_frequency" in update_data and update_data["tracking_frequency"]:
        update_data["tracking_frequency"] = update_data["tracking_frequency"].value

    for field, value in update_data.items():
        setattr(profile, field, value)

    db.commit()
    db.refresh(profile)

    return serialize_profile(profile)


@router.delete("/profiles/{profile_id}")
def delete_profile(profile_id: int, db: Session = Depends(get_db)):
    """Supprime un profil et toutes ses donnees"""
    profile = db.query(TrackedProfile).filter(
        TrackedProfile.id == profile_id
    ).first()

    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")

    db.delete(profile)
    db.commit()

    return {"success": True, "message": f"Profile {profile_id} deleted"}


@router.get("/profiles/{profile_id}/snapshots", response_model=List[ProfileSnapshotSchema])
def get_profile_snapshots(
    profile_id: int,
    limit: int = 30,
    db: Session = Depends(get_db)
):
    """Recupere l'historique des snapshots d'un profil"""
    snapshots = db.query(ProfileSnapshot).filter(
        ProfileSnapshot.profile_id == profile_id
    ).order_by(
        ProfileSnapshot.scraped_at.desc()
    ).limit(limit).all()

    return [serialize_snapshot(s) for s in snapshots]


# ============ Post Endpoints ============

@router.get("/posts", response_model=List[TrackedPostSchema])
def list_tracked_posts(
    profile_id: Optional[int] = None,
    category: Optional[str] = None,
    min_engagement: Optional[int] = None,
    new_only: bool = False,
    limit: int = 50,
    offset: int = 0,
    db: Session = Depends(get_db)
):
    """Liste les posts trackes avec filtres"""
    query = db.query(TrackedPost, TrackedProfile.display_name).join(
        TrackedProfile, TrackedPost.profile_id == TrackedProfile.id
    )

    if profile_id:
        query = query.filter(TrackedPost.profile_id == profile_id)

    if category:
        query = query.filter(TrackedPost.category == category)

    if min_engagement:
        query = query.filter(
            (TrackedPost.likes + TrackedPost.comments + TrackedPost.shares) >= min_engagement
        )

    if new_only:
        query = query.filter(TrackedPost.is_new == True)

    results = query.order_by(
        TrackedPost.first_seen_at.desc()
    ).offset(offset).limit(limit).all()

    return [serialize_tracked_post(post, profile_name) for post, profile_name in results]


@router.get("/posts/{post_id}", response_model=TrackedPostWithInsights)
def get_tracked_post(post_id: int, db: Session = Depends(get_db)):
    """Recupere un post avec ses insights"""
    post = db.query(TrackedPost).filter(TrackedPost.id == post_id).first()

    if not post:
        raise HTTPException(status_code=404, detail="Post not found")

    profile = db.query(TrackedProfile).filter(
        TrackedProfile.id == post.profile_id
    ).first()

    insight = db.query(PostContentInsight).filter(
        PostContentInsight.post_id == post_id
    ).first()

    result = serialize_tracked_post(post, profile.display_name if profile else None)
    result["insights"] = serialize_insight(insight) if insight else None

    return result


# ============ Scrape Endpoints ============

@router.post("/scrape/{profile_id}")
async def trigger_scrape(
    profile_id: int,
    request: TriggerScrapeRequest = TriggerScrapeRequest(),
    background_tasks: BackgroundTasks = None,
    db: Session = Depends(get_db)
):
    """Declenche un scrape pour un profil"""
    profile = db.query(TrackedProfile).filter(
        TrackedProfile.id == profile_id
    ).first()

    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")

    # Creer le job
    job = ScrapeJob(
        profile_id=profile_id,
        job_type=request.job_type.value,
        status="pending",
        created_at=datetime.utcnow()
    )
    db.add(job)
    db.commit()
    db.refresh(job)

    # Lancer en arriere-plan
    background_tasks.add_task(
        run_scrape_workflow,
        profile_id=profile_id
    )

    return {
        "job_id": job.id,
        "status": "started",
        "profile": profile.display_name
    }


@router.post("/scrape/batch", response_model=BatchScrapeResponse)
async def trigger_batch_scrape(
    request: BatchScrapeRequest = BatchScrapeRequest(),
    background_tasks: BackgroundTasks = None,
    db: Session = Depends(get_db)
):
    """Declenche un scrape pour plusieurs profils"""
    if request.profile_ids:
        profiles = db.query(TrackedProfile).filter(
            TrackedProfile.id.in_(request.profile_ids),
            TrackedProfile.is_active == True
        ).all()
    else:
        # Profils dus pour scrape
        profiles = db.query(TrackedProfile).filter(
            TrackedProfile.is_active == True,
            (TrackedProfile.next_scrape_at == None) |
            (TrackedProfile.next_scrape_at <= datetime.utcnow())
        ).order_by(
            TrackedProfile.priority.desc()
        ).limit(10).all()

    if not profiles:
        return {
            "jobs_created": 0,
            "profile_ids": [],
            "message": "No profiles to scrape"
        }

    profile_ids = [p.id for p in profiles]

    # Lancer en arriere-plan
    background_tasks.add_task(
        run_batch_scrape_workflow,
        profile_ids=profile_ids
    )

    return {
        "jobs_created": len(profiles),
        "profile_ids": profile_ids,
        "message": f"Batch scrape started for {len(profiles)} profiles"
    }


def run_scrape_workflow(profile_id: int):
    """Execute le workflow TypeScript pour le scrape"""
    try:
        cwd = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        print(f"[Tracker] Running scrape for profile {profile_id}")

        cmd = f'npx tsx src/workflow-tracker.ts scrape {profile_id}'
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            cwd=cwd,
            env=os.environ.copy(),
            shell=True,
            encoding='utf-8',
            errors='replace'
        )

        if result.returncode != 0:
            print(f"[Tracker] Scrape ERROR: {result.stderr}")
        else:
            print(f"[Tracker] Scrape SUCCESS")
    except Exception as e:
        print(f"[Tracker] Scrape EXCEPTION: {e}")


def run_batch_scrape_workflow(profile_ids: List[int]):
    """Execute le workflow TypeScript pour le batch scrape"""
    try:
        cwd = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        ids_str = " ".join(str(id) for id in profile_ids)
        print(f"[Tracker] Running batch scrape for {len(profile_ids)} profiles")

        cmd = f'npx tsx src/workflow-tracker.ts batch {ids_str}'
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            cwd=cwd,
            env=os.environ.copy(),
            shell=True,
            encoding='utf-8',
            errors='replace'
        )

        if result.returncode != 0:
            print(f"[Tracker] Batch scrape ERROR: {result.stderr}")
        else:
            print(f"[Tracker] Batch scrape SUCCESS")
    except Exception as e:
        print(f"[Tracker] Batch scrape EXCEPTION: {e}")


# ============ Jobs Endpoints ============

@router.get("/jobs", response_model=List[ScrapeJobSchema])
def list_jobs(
    status: Optional[str] = None,
    profile_id: Optional[int] = None,
    limit: int = 50,
    db: Session = Depends(get_db)
):
    """Liste les jobs de scrape"""
    query = db.query(ScrapeJob, TrackedProfile.display_name).outerjoin(
        TrackedProfile, ScrapeJob.profile_id == TrackedProfile.id
    )

    if status:
        query = query.filter(ScrapeJob.status == status)

    if profile_id:
        query = query.filter(ScrapeJob.profile_id == profile_id)

    results = query.order_by(
        ScrapeJob.created_at.desc()
    ).limit(limit).all()

    return [serialize_job(job, profile_name) for job, profile_name in results]


# ============ Analytics Endpoints ============

@router.get("/analytics/overview", response_model=TrackerAnalytics)
def get_tracker_analytics(db: Session = Depends(get_db)):
    """Vue d'ensemble des analytics du tracker"""
    total_profiles = db.query(TrackedProfile).count()
    active_profiles = db.query(TrackedProfile).filter(
        TrackedProfile.is_active == True
    ).count()

    total_posts = db.query(TrackedPost).count()
    posts_7d = db.query(TrackedPost).filter(
        TrackedPost.first_seen_at >= datetime.utcnow() - timedelta(days=7)
    ).count()

    # Engagement moyen
    avg_engagement = db.query(
        func.avg(TrackedPost.likes + TrackedPost.comments + TrackedPost.shares)
    ).scalar() or 0

    # Top performers
    top_posts = db.query(
        TrackedPost, TrackedProfile.display_name
    ).join(
        TrackedProfile, TrackedPost.profile_id == TrackedProfile.id
    ).order_by(
        (TrackedPost.likes + TrackedPost.comments + TrackedPost.shares).desc()
    ).limit(5).all()

    top_performers = []
    for post, profile_name in top_posts:
        top_performers.append({
            "profile_id": post.profile_id,
            "profile_name": profile_name,
            "post_id": post.id,
            "content_preview": (post.content or "")[:100],
            "total_engagement": (post.likes or 0) + (post.comments or 0) + (post.shares or 0),
            "posted_at": post.posted_at
        })

    # Engagement par jour (7 derniers jours)
    engagement_by_day = []
    for i in range(7):
        day = datetime.utcnow() - timedelta(days=i)
        day_start = day.replace(hour=0, minute=0, second=0, microsecond=0)
        day_end = day_start + timedelta(days=1)

        stats = db.query(
            func.sum(TrackedPost.likes),
            func.sum(TrackedPost.comments),
            func.sum(TrackedPost.shares)
        ).filter(
            TrackedPost.first_seen_at >= day_start,
            TrackedPost.first_seen_at < day_end
        ).first()

        engagement_by_day.append({
            "date": day_start.strftime("%Y-%m-%d"),
            "likes": stats[0] or 0,
            "comments": stats[1] or 0,
            "shares": stats[2] or 0,
            "total": (stats[0] or 0) + (stats[1] or 0) + (stats[2] or 0)
        })

    return {
        "total_profiles": total_profiles,
        "active_profiles": active_profiles,
        "total_posts_tracked": total_posts,
        "posts_last_7_days": posts_7d,
        "avg_engagement_rate": float(avg_engagement),
        "top_performers": top_performers,
        "engagement_by_day": list(reversed(engagement_by_day))
    }


@router.get("/analytics/engagement-trends", response_model=List[EngagementTrend])
def get_engagement_trends(
    days: int = 30,
    profile_id: Optional[int] = None,
    db: Session = Depends(get_db)
):
    """Tendances d'engagement sur une periode"""
    trends = []

    for i in range(days):
        day = datetime.utcnow() - timedelta(days=i)
        day_start = day.replace(hour=0, minute=0, second=0, microsecond=0)
        day_end = day_start + timedelta(days=1)

        query = db.query(
            func.sum(TrackedPost.likes),
            func.sum(TrackedPost.comments),
            func.sum(TrackedPost.shares)
        ).filter(
            TrackedPost.first_seen_at >= day_start,
            TrackedPost.first_seen_at < day_end
        )

        if profile_id:
            query = query.filter(TrackedPost.profile_id == profile_id)

        stats = query.first()

        trends.append({
            "date": day_start.strftime("%Y-%m-%d"),
            "likes": stats[0] or 0,
            "comments": stats[1] or 0,
            "shares": stats[2] or 0,
            "total": (stats[0] or 0) + (stats[1] or 0) + (stats[2] or 0)
        })

    return list(reversed(trends))


@router.get("/analytics/top-performers", response_model=List[TopPerformer])
def get_top_performers(
    days: int = 30,
    limit: int = 10,
    db: Session = Depends(get_db)
):
    """Top posts par engagement"""
    cutoff = datetime.utcnow() - timedelta(days=days)

    top_posts = db.query(
        TrackedPost, TrackedProfile.display_name
    ).join(
        TrackedProfile, TrackedPost.profile_id == TrackedProfile.id
    ).filter(
        TrackedPost.first_seen_at >= cutoff
    ).order_by(
        (TrackedPost.likes + TrackedPost.comments + TrackedPost.shares).desc()
    ).limit(limit).all()

    return [
        {
            "profile_id": post.profile_id,
            "profile_name": profile_name,
            "post_id": post.id,
            "content_preview": (post.content or "")[:100],
            "total_engagement": (post.likes or 0) + (post.comments or 0) + (post.shares or 0),
            "posted_at": post.posted_at
        }
        for post, profile_name in top_posts
    ]


# ============ Inspiration Endpoint (pour le generateur) ============

@router.get("/inspiration/posts", response_model=InspirationResponse)
def get_inspiration_posts(
    min_adaptability: float = 70,
    min_engagement: int = 50,
    category: Optional[str] = None,
    limit: int = 20,
    db: Session = Depends(get_db)
):
    """
    Recupere les posts trackes les plus adaptables pour le generateur.
    Filtre par score d'adaptabilite et engagement.
    """
    query = db.query(
        TrackedPost, TrackedProfile.display_name, PostContentInsight
    ).join(
        TrackedProfile, TrackedPost.profile_id == TrackedProfile.id
    ).outerjoin(
        PostContentInsight, TrackedPost.id == PostContentInsight.post_id
    ).filter(
        TrackedPost.content != None,
        (TrackedPost.likes + TrackedPost.comments + TrackedPost.shares) >= min_engagement
    )

    if category:
        query = query.filter(TrackedPost.category == category)

    # Filtrer par adaptabilite si insights disponibles
    query = query.filter(
        (PostContentInsight.adaptability_score >= min_adaptability) |
        (PostContentInsight.adaptability_score == None)
    )

    results = query.order_by(
        (TrackedPost.likes + TrackedPost.comments + TrackedPost.shares).desc()
    ).limit(limit).all()

    posts = []
    for post, profile_name, insight in results:
        posts.append({
            "post_id": post.id,
            "profile_name": profile_name,
            "content": post.content,
            "category": post.category,
            "hook_type": post.hook_type,
            "structure_type": post.structure_type,
            "engagement": (post.likes or 0) + (post.comments or 0) + (post.shares or 0),
            "adaptability_score": insight.adaptability_score if insight else None,
            "adaptation_suggestions": json.loads(insight.adaptation_suggestions) if insight and insight.adaptation_suggestions else None
        })

    return {
        "posts": posts,
        "total_available": len(posts),
        "filters_applied": {
            "min_adaptability": min_adaptability,
            "min_engagement": min_engagement,
            "category": category
        }
    }


@router.get("/stats")
def get_tracker_stats(db: Session = Depends(get_db)):
    """Statistiques rapides du tracker"""
    total_profiles = db.query(TrackedProfile).filter(
        TrackedProfile.is_active == True
    ).count()

    total_posts = db.query(TrackedPost).count()

    posts_today = db.query(TrackedPost).filter(
        TrackedPost.first_seen_at >= datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    ).count()

    pending_jobs = db.query(ScrapeJob).filter(
        ScrapeJob.status.in_(["pending", "running"])
    ).count()

    last_scrape = db.query(TrackedProfile.last_scraped_at).filter(
        TrackedProfile.last_scraped_at != None
    ).order_by(
        TrackedProfile.last_scraped_at.desc()
    ).first()

    return {
        "active_profiles": total_profiles,
        "total_posts": total_posts,
        "posts_today": posts_today,
        "pending_jobs": pending_jobs,
        "last_scrape": last_scrape[0] if last_scrape else None
    }
