from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
from datetime import datetime
import json
import subprocess
import sys
import os
import platform
import time
import re
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from database import get_db
from models import (
    UserCompanyProfile, Post, PostRelevanceScore,
    GeneratedPost, ExtractedTheme,
    TrackedPost, PostContentInsight, TrackedProfile
)
from schemas import (
    AnalyzeRelevanceRequest, AnalyzeRelevanceResponse,
    GeneratePostsRequest, GeneratePostsResponse,
    PostRelevanceScore as RelevanceScoreSchema,
    GeneratedPost as GeneratedPostSchema,
    ExtractedTheme as ExtractedThemeSchema,
    DraftStatus,
    InspirationPost
)

router = APIRouter(prefix="/api/generator", tags=["generator"])


def serialize_relevance_score(score: PostRelevanceScore, post: Post = None) -> dict:
    """Serialize relevance score with post info"""
    result = {
        "id": score.id,
        "post_id": score.post_id,
        "profile_id": score.profile_id,
        "overall_relevance": score.overall_relevance,
        "theme_relevance": score.theme_relevance,
        "audience_relevance": score.audience_relevance,
        "industry_relevance": score.industry_relevance,
        "is_company_specific": score.is_company_specific,
        "is_adaptable": score.is_adaptable,
        "universal_theme": score.universal_theme,
        "adaptable_elements": json.loads(score.adaptable_elements) if score.adaptable_elements else None,
        "reasoning": score.reasoning,
        "scored_at": score.scored_at,
    }

    if post:
        result["post_content"] = post.content
        result["post_category"] = post.category
        result["post_engagement"] = (post.likes or 0) + (post.comments or 0) + (post.shares or 0)
        result["company_name"] = post.company.name if post.company else None

    return result


def serialize_generated_post(post: GeneratedPost) -> dict:
    """Serialize generated post"""
    return {
        "id": post.id,
        "profile_id": post.profile_id,
        "content": post.content,
        "hashtags": json.loads(post.hashtags) if post.hashtags else None,
        "call_to_action": post.call_to_action,
        "theme": post.theme,
        "category": post.category,
        "target_emotion": post.target_emotion,
        "inspiration_post_ids": json.loads(post.inspiration_post_ids) if post.inspiration_post_ids else None,
        "predicted_engagement": post.predicted_engagement,
        "authenticity_score": post.authenticity_score,
        "status": post.status,
        "generated_at": post.generated_at,
        "used_at": post.used_at,
    }


def serialize_theme(theme: ExtractedTheme) -> dict:
    """Serialize extracted theme"""
    return {
        "id": theme.id,
        "profile_id": theme.profile_id,
        "theme_name": theme.theme_name,
        "theme_description": theme.theme_description,
        "category": theme.category,
        "occurrence_count": theme.occurrence_count,
        "avg_engagement": theme.avg_engagement,
        "avg_relevance_score": theme.avg_relevance_score,
        "source_post_ids": json.loads(theme.source_post_ids) if theme.source_post_ids else None,
        "example_angles": json.loads(theme.example_angles) if theme.example_angles else None,
        "first_seen_at": theme.first_seen_at,
        "last_seen_at": theme.last_seen_at,
        "is_trending": theme.is_trending,
    }


@router.post("/analyze-relevance", response_model=AnalyzeRelevanceResponse)
async def analyze_relevance(
    background_tasks: BackgroundTasks,
    category: Optional[str] = None,
    days: Optional[int] = 30,
    min_engagement: Optional[int] = None,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    """
    Analyse la pertinence de tous les posts concurrents par rapport au profil utilisateur.
    Lance le workflow TypeScript en arriere-plan.
    """
    # Verifier qu'un profil actif existe
    profile = db.query(UserCompanyProfile).filter(
        UserCompanyProfile.is_active == True
    ).first()

    if not profile:
        raise HTTPException(
            status_code=400,
            detail="No active company profile. Create a profile first."
        )

    # Construire la requete de posts
    query = db.query(Post)

    if category:
        query = query.filter(Post.category == category)

    if min_engagement:
        query = query.filter(
            (Post.likes + Post.comments + Post.shares) >= min_engagement
        )

    # Filtrer par date si days est spécifié
    if days:
        from datetime import timedelta
        cutoff_date = datetime.utcnow() - timedelta(days=days)
        query = query.filter(Post.collected_at >= cutoff_date)

    posts = query.limit(limit).all()

    if not posts:
        raise HTTPException(
            status_code=404,
            detail="No posts found matching criteria"
        )

    # Lancer le workflow TypeScript en arriere-plan
    background_tasks.add_task(
        run_relevance_analysis,
        profile_id=profile.id,
        post_ids=[p.id for p in posts]
    )

    # Retourner les statistiques actuelles
    existing_scores = db.query(PostRelevanceScore).filter(
        PostRelevanceScore.profile_id == profile.id
    ).all()

    relevant = [s for s in existing_scores if s.overall_relevance >= 50]
    company_specific = [s for s in existing_scores if s.is_company_specific]
    adaptable = [s for s in existing_scores if s.is_adaptable]

    # Extraire les themes les plus courants
    theme_counts = {}
    for score in existing_scores:
        if score.universal_theme:
            theme_counts[score.universal_theme] = theme_counts.get(score.universal_theme, 0) + 1

    top_themes = sorted(theme_counts.keys(), key=lambda x: theme_counts[x], reverse=True)[:5]

    return {
        "total_posts_analyzed": len(posts),
        "relevant_posts": len(relevant),
        "company_specific_posts": len(company_specific),
        "adaptable_posts": len(adaptable),
        "avg_relevance": sum(s.overall_relevance for s in existing_scores) / len(existing_scores) if existing_scores else 0,
        "top_themes": top_themes,
    }


def run_relevance_analysis(profile_id: int, post_ids: List[int]):
    """Execute le workflow TypeScript pour l'analyse de pertinence"""
    try:
        cwd = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        print(f"[Generator] Running relevance analysis for profile {profile_id} with {len(post_ids)} posts")
        print(f"[Generator] CWD: {cwd}")

        cmd = f'npx tsx src/workflow-generator.ts analyze {profile_id} {json.dumps(json.dumps(post_ids))}'
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
            print(f"[Generator] ERROR: {result.stderr}")
        else:
            print(f"[Generator] SUCCESS: {result.stdout[:500] if result.stdout else 'No output'}")
    except Exception as e:
        print(f"[Generator] EXCEPTION: {e}")


@router.get("/relevance-scores", response_model=List[RelevanceScoreSchema])
def get_relevance_scores(
    min_score: float = 0,
    adaptable_only: bool = False,
    limit: int = 50,
    db: Session = Depends(get_db)
):
    """Recupere les scores de pertinence des posts"""
    profile = db.query(UserCompanyProfile).filter(
        UserCompanyProfile.is_active == True
    ).first()

    if not profile:
        raise HTTPException(status_code=400, detail="No active profile")

    query = db.query(PostRelevanceScore).filter(
        PostRelevanceScore.profile_id == profile.id,
        PostRelevanceScore.overall_relevance >= min_score
    )

    if adaptable_only:
        query = query.filter(PostRelevanceScore.is_adaptable == True)

    scores = query.order_by(
        PostRelevanceScore.overall_relevance.desc()
    ).limit(limit).all()

    result = []
    for score in scores:
        post = db.query(Post).filter(Post.id == score.post_id).first()
        result.append(serialize_relevance_score(score, post))

    return result


@router.get("/themes", response_model=List[ExtractedThemeSchema])
def get_themes(
    trending_only: bool = False,
    category: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Recupere les themes extraits des posts concurrents"""
    profile = db.query(UserCompanyProfile).filter(
        UserCompanyProfile.is_active == True
    ).first()

    if not profile:
        raise HTTPException(status_code=400, detail="No active profile")

    query = db.query(ExtractedTheme).filter(
        ExtractedTheme.profile_id == profile.id
    )

    if trending_only:
        query = query.filter(ExtractedTheme.is_trending == True)

    if category:
        query = query.filter(ExtractedTheme.category == category)

    themes = query.order_by(
        ExtractedTheme.avg_engagement.desc().nullslast(),
        ExtractedTheme.occurrence_count.desc()
    ).all()

    return [serialize_theme(t) for t in themes]


@router.post("/extract-themes")
async def extract_themes(
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """
    Extrait les themes des posts pertinents.
    Lance le workflow TypeScript.
    """
    profile = db.query(UserCompanyProfile).filter(
        UserCompanyProfile.is_active == True
    ).first()

    if not profile:
        raise HTTPException(status_code=400, detail="No active profile")

    # Recuperer les posts pertinents et adaptables
    scores = db.query(PostRelevanceScore).filter(
        PostRelevanceScore.profile_id == profile.id,
        PostRelevanceScore.overall_relevance >= 50,
        PostRelevanceScore.is_adaptable == True
    ).all()

    if not scores:
        raise HTTPException(
            status_code=400,
            detail="No relevant posts found. Run analyze-relevance first."
        )

    # Lancer l'extraction en arriere-plan
    background_tasks.add_task(
        run_theme_extraction,
        profile_id=profile.id,
        score_ids=[s.id for s in scores]
    )

    return {
        "status": "started",
        "posts_to_analyze": len(scores)
    }


def run_theme_extraction(profile_id: int, score_ids: List[int]):
    """Execute le workflow TypeScript pour l'extraction de themes"""
    try:
        cwd = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        print(f"[Generator] Running theme extraction for profile {profile_id} with {len(score_ids)} scores")

        cmd = f'npx tsx src/workflow-generator.ts themes {profile_id} {json.dumps(json.dumps(score_ids))}'
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
            print(f"[Generator] Theme extraction ERROR: {result.stderr}")
        else:
            print(f"[Generator] Theme extraction SUCCESS")
    except Exception as e:
        print(f"[Generator] Theme extraction EXCEPTION: {e}")


@router.post("/generate", response_model=GeneratePostsResponse)
async def generate_posts(
    request: GeneratePostsRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """
    Genere des posts LinkedIn bases sur les themes et le profil.
    """
    profile = db.query(UserCompanyProfile).filter(
        UserCompanyProfile.is_active == True
    ).first()

    if not profile:
        raise HTTPException(status_code=400, detail="No active profile")

    # Recuperer les themes pour inspiration
    theme_query = db.query(ExtractedTheme).filter(
        ExtractedTheme.profile_id == profile.id
    )

    if request.theme:
        theme_query = theme_query.filter(ExtractedTheme.theme_name == request.theme)

    if request.category:
        theme_query = theme_query.filter(ExtractedTheme.category == request.category)

    themes = theme_query.limit(5).all()

    # Lancer la generation en arriere-plan
    background_tasks.add_task(
        run_post_generation,
        profile_id=profile.id,
        num_posts=request.num_posts,
        category=request.category,
        theme=request.theme,
        target_emotion=request.target_emotion
    )

    # Retourner les posts deja generes comme placeholder
    existing_posts = db.query(GeneratedPost).filter(
        GeneratedPost.profile_id == profile.id,
        GeneratedPost.status == "draft"
    ).order_by(GeneratedPost.generated_at.desc()).limit(request.num_posts).all()

    return {
        "generated_posts": [serialize_generated_post(p) for p in existing_posts],
        "inspiration_sources": [],
        "themes_used": [t.theme_name for t in themes],
    }


def run_post_generation(
    profile_id: int,
    num_posts: int,
    category: Optional[str],
    theme: Optional[str],
    target_emotion: Optional[str]
):
    """Execute le workflow TypeScript pour la generation de posts"""
    try:
        cwd = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        args = {
            "num_posts": num_posts,
            "category": category,
            "theme": theme,
            "target_emotion": target_emotion
        }
        print(f"[Generator] Running post generation for profile {profile_id}: {args}")

        cmd = f'npx tsx src/workflow-generator.ts generate {profile_id} {json.dumps(json.dumps(args))}'
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
            print(f"[Generator] Post generation ERROR: {result.stderr}")
        else:
            print(f"[Generator] Post generation SUCCESS")
    except Exception as e:
        print(f"[Generator] Post generation EXCEPTION: {e}")


@router.get("/drafts", response_model=List[GeneratedPostSchema])
def get_drafts(
    status: Optional[str] = None,
    limit: int = 50,
    db: Session = Depends(get_db)
):
    """Recupere les brouillons de posts generes"""
    profile = db.query(UserCompanyProfile).filter(
        UserCompanyProfile.is_active == True
    ).first()

    if not profile:
        raise HTTPException(status_code=400, detail="No active profile")

    query = db.query(GeneratedPost).filter(
        GeneratedPost.profile_id == profile.id
    )

    if status:
        query = query.filter(GeneratedPost.status == status)

    drafts = query.order_by(
        GeneratedPost.generated_at.desc()
    ).limit(limit).all()

    return [serialize_generated_post(d) for d in drafts]


@router.put("/drafts/{draft_id}/status")
def update_draft_status(
    draft_id: int,
    status: DraftStatus,
    db: Session = Depends(get_db)
):
    """Met a jour le statut d'un brouillon"""
    draft = db.query(GeneratedPost).filter(
        GeneratedPost.id == draft_id
    ).first()

    if not draft:
        raise HTTPException(status_code=404, detail="Draft not found")

    draft.status = status.value

    if status == DraftStatus.used:
        draft.used_at = datetime.utcnow()

    db.commit()
    db.refresh(draft)

    return serialize_generated_post(draft)


@router.delete("/drafts/{draft_id}")
def delete_draft(draft_id: int, db: Session = Depends(get_db)):
    """Supprime un brouillon"""
    draft = db.query(GeneratedPost).filter(
        GeneratedPost.id == draft_id
    ).first()

    if not draft:
        raise HTTPException(status_code=404, detail="Draft not found")

    db.delete(draft)
    db.commit()

    return {"success": True, "message": f"Draft {draft_id} deleted"}


@router.get("/stats")
def get_generator_stats(db: Session = Depends(get_db)):
    """Statistiques du generateur"""
    profile = db.query(UserCompanyProfile).filter(
        UserCompanyProfile.is_active == True
    ).first()

    if not profile:
        return {
            "has_profile": False,
            "posts_analyzed": 0,
            "relevant_posts": 0,
            "themes_extracted": 0,
            "posts_generated": 0,
            "posts_used": 0,
        }

    posts_analyzed = db.query(PostRelevanceScore).filter(
        PostRelevanceScore.profile_id == profile.id
    ).count()

    relevant_posts = db.query(PostRelevanceScore).filter(
        PostRelevanceScore.profile_id == profile.id,
        PostRelevanceScore.overall_relevance >= 50,
        PostRelevanceScore.is_adaptable == True
    ).count()

    themes_extracted = db.query(ExtractedTheme).filter(
        ExtractedTheme.profile_id == profile.id
    ).count()

    posts_generated = db.query(GeneratedPost).filter(
        GeneratedPost.profile_id == profile.id
    ).count()

    posts_used = db.query(GeneratedPost).filter(
        GeneratedPost.profile_id == profile.id,
        GeneratedPost.status == "used"
    ).count()

    return {
        "has_profile": True,
        "profile_name": profile.company_name,
        "posts_analyzed": posts_analyzed,
        "relevant_posts": relevant_posts,
        "themes_extracted": themes_extracted,
        "posts_generated": posts_generated,
        "posts_used": posts_used,
    }


@router.get("/inspiration-from-tracker", response_model=List[InspirationPost])
def get_inspiration_from_tracker(
    min_adaptability: float = 70,
    min_engagement: int = 0,
    category: Optional[str] = None,
    limit: int = 20,
    db: Session = Depends(get_db)
):
    """
    Recupere les posts trackes performants pour inspirer la generation.
    Filtre par score d'adaptabilite et engagement.
    """
    # Requete avec jointure sur les insights
    query = db.query(
        TrackedPost,
        PostContentInsight,
        TrackedProfile
    ).join(
        PostContentInsight,
        TrackedPost.id == PostContentInsight.post_id
    ).join(
        TrackedProfile,
        TrackedPost.profile_id == TrackedProfile.id
    ).filter(
        PostContentInsight.adaptability_score >= min_adaptability
    )

    # Filtre par engagement
    if min_engagement > 0:
        query = query.filter(
            (TrackedPost.likes + TrackedPost.comments) >= min_engagement
        )

    # Filtre par categorie
    if category:
        query = query.filter(TrackedPost.category == category)

    # Tri par adaptabilite puis engagement
    results = query.order_by(
        PostContentInsight.adaptability_score.desc(),
        (TrackedPost.likes + TrackedPost.comments).desc()
    ).limit(limit).all()

    inspiration_posts = []
    for post, insight, profile in results:
        inspiration_posts.append({
            "post_id": post.id,
            "profile_name": profile.display_name,
            "content": post.content,
            "category": post.category,
            "sentiment": post.sentiment,
            "hook_type": post.hook_type,
            "structure_type": post.structure_type,
            "likes": post.likes,
            "comments": post.comments,
            "adaptability_score": insight.adaptability_score,
            "adaptation_suggestions": json.loads(insight.adaptation_suggestions) if insight.adaptation_suggestions else [],
            "engagement_drivers": json.loads(insight.engagement_drivers) if insight.engagement_drivers else [],
            "key_takeaways": json.loads(insight.key_takeaways) if insight.key_takeaways else []
        })

    return inspiration_posts


@router.post("/spin")
async def spin_post(
    post_id: int,
    tone: str = "professional",
    angle_preference: Optional[str] = None,
    include_cta: bool = True,
    db: Session = Depends(get_db)
):
    """
    Spin un post tracke pour creer un nouveau post original.
    Utilise le workflow TypeScript avec gpt-5-nano reasoning.
    """
    # Recuperer le post tracke
    tracked_post = db.query(TrackedPost).filter(TrackedPost.id == post_id).first()
    if not tracked_post:
        raise HTTPException(status_code=404, detail="Post not found")

    # Recuperer le profil du post
    tracked_profile = db.query(TrackedProfile).filter(
        TrackedProfile.id == tracked_post.profile_id
    ).first()

    # Recuperer le profil entreprise actif
    company_profile = db.query(UserCompanyProfile).filter(
        UserCompanyProfile.is_active == True
    ).first()

    if not company_profile:
        raise HTTPException(
            status_code=400,
            detail="No active company profile. Create a profile first."
        )

    # Construire la requete pour le workflow TypeScript
    spin_request = {
        "original_post": {
            "content": tracked_post.content,
            "author_name": tracked_profile.display_name if tracked_profile else "Unknown",
            "likes": tracked_post.likes or 0,
            "comments": tracked_post.comments or 0,
            "shares": 0,
            "category": tracked_post.category,
            "hook_type": tracked_post.hook_type,
            "structure_type": tracked_post.structure_type
        },
        "company_profile": {
            "company_name": company_profile.company_name,
            "industry": company_profile.industry,
            "tone_of_voice": json.loads(company_profile.tone_of_voice) if company_profile.tone_of_voice else [],
            "key_messages": json.loads(company_profile.key_messages) if company_profile.key_messages else [],
            "values": json.loads(company_profile.values) if company_profile.values else [],
            "target_audience": json.loads(company_profile.target_audience) if company_profile.target_audience else None,
            "differentiators": json.loads(company_profile.differentiators) if company_profile.differentiators else None
        },
        "spin_options": {
            "tone": tone,
            "angle_preference": angle_preference,
            "include_cta": include_cta
        }
    }

    # Executer le workflow TypeScript de maniere synchrone
    result = run_spin_workflow(spin_request)

    if result.get("success"):
        # Sauvegarder le post genere en base
        generated = GeneratedPost(
            profile_id=company_profile.id,
            content=result["final_post"]["content"],
            hashtags=json.dumps(result["final_post"]["hashtags"]),
            theme=result.get("selected_angle"),
            category=tracked_post.category,
            target_emotion=None,
            inspiration_post_ids=json.dumps([post_id]),
            predicted_engagement=result["final_post"]["predicted_engagement"],
            authenticity_score=result["final_post"]["authenticity_score"],
            status="draft"
        )
        db.add(generated)
        db.commit()
        db.refresh(generated)

        return {
            "success": True,
            "generated_post": serialize_generated_post(generated),
            "analysis": result.get("analysis"),
            "selected_angle": result.get("selected_angle"),
            "authenticity_score": result["final_post"]["authenticity_score"],
            "originality_score": result["final_post"]["originality_score"],
            "passed_ai_check": result.get("passed_ai_check"),
            "passed_plagiarism_check": result.get("passed_plagiarism_check"),
            "iterations": result.get("iterations_count")
        }
    else:
        raise HTTPException(
            status_code=500,
            detail=f"Spin failed: {result.get('error', 'Unknown error')}"
        )


def run_spin_workflow(spin_request: dict) -> dict:
    """Execute le workflow TypeScript de spin"""
    import tempfile
    temp_file = None

    try:
        cwd = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        print(f"[Spin] Starting spin workflow...")
        print(f"[Spin] CWD: {cwd}")

        # Écrire le JSON dans un fichier temporaire pour éviter les problèmes d'encodage
        request_json = json.dumps(spin_request, ensure_ascii=False)
        temp_file = tempfile.NamedTemporaryFile(
            mode='w',
            suffix='.json',
            delete=False,
            encoding='utf-8'
        )
        temp_file.write(request_json)
        temp_file.close()

        print(f"[Spin] Request saved to: {temp_file.name}")

        # Utiliser le fichier temporaire comme argument
        cmd = f'npx tsx src/workflow-spin.ts --file "{temp_file.name}"'

        # Utiliser Popen pour éviter les problèmes de buffering avec le SDK OpenAI
        proc = subprocess.Popen(
            cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            cwd=cwd,
            env=os.environ.copy(),
            shell=True,
            text=True,
            encoding='utf-8',
            errors='replace'
        )

        # Lire la sortie ligne par ligne avec timeout
        start_time = time.time()
        output_lines = []
        while True:
            if time.time() - start_time > 180:
                proc.kill()
                raise subprocess.TimeoutExpired(cmd, 180)

            # Check if process is done first
            if proc.poll() is not None:
                # Process terminé, lire le reste
                remaining = proc.stdout.read()
                if remaining:
                    print(f"[Spin] (remaining output)")
                    output_lines.append(remaining)
                break

            line = proc.stdout.readline()
            if line:
                print(f"[Spin] {line.rstrip()}")
                output_lines.append(line)
            else:
                # Pas de ligne disponible, petit délai pour éviter busy-wait
                time.sleep(0.1)

        if proc.returncode != 0:
            print(f"[Spin] Process returned: {proc.returncode}")
            return {
                "success": False,
                "error": "".join(output_lines) or "Workflow execution failed"
            }

        # Parser la sortie JSON du workflow
        stdout = "".join(output_lines).strip()

        # Trouver le dernier objet JSON complet dans la sortie
        # Le JSON du workflow commence par "{" sur une nouvelle ligne
        lines = stdout.split('\n')
        json_start_idx = -1
        for i in range(len(lines) - 1, -1, -1):
            if lines[i].strip() == '{':
                json_start_idx = i
                break

        if json_start_idx != -1:
            json_str = '\n'.join(lines[json_start_idx:])
            try:
                return json.loads(json_str)
            except json.JSONDecodeError:
                # Fallback: essayer de trouver le JSON autrement
                pass

        # Fallback: chercher le pattern "success": au début d'un objet JSON
        match = re.search(r'\{\s*"success":', stdout)
        if match:
            json_str = stdout[match.start():]
            # Trouver la fin du JSON (dernière })
            brace_count = 0
            end_idx = 0
            for i, char in enumerate(json_str):
                if char == '{':
                    brace_count += 1
                elif char == '}':
                    brace_count -= 1
                    if brace_count == 0:
                        end_idx = i + 1
                        break
            if end_idx > 0:
                return json.loads(json_str[:end_idx])

        print(f"[Spin] No JSON found in output: {stdout[:500]}")
        return {
            "success": False,
            "error": "No valid JSON output from workflow"
        }

    except subprocess.TimeoutExpired:
        print("[Spin] Workflow timeout")
        return {
            "success": False,
            "error": "Workflow timeout after 180 seconds"
        }
    except json.JSONDecodeError as e:
        print(f"[Spin] JSON parse error: {e}")
        return {
            "success": False,
            "error": f"Failed to parse workflow output: {e}"
        }
    except Exception as e:
        print(f"[Spin] EXCEPTION: {e}")
        return {
            "success": False,
            "error": str(e)
        }
    finally:
        # Nettoyer le fichier temporaire
        if temp_file and os.path.exists(temp_file.name):
            try:
                os.unlink(temp_file.name)
            except Exception:
                pass


@router.get("/inspiration-stats")
def get_inspiration_stats(db: Session = Depends(get_db)):
    """Statistiques sur les posts d'inspiration disponibles du tracker"""
    # Total posts trackes avec insights
    total_analyzed = db.query(PostContentInsight).count()

    # Posts adaptables (score >= 70)
    adaptable = db.query(PostContentInsight).filter(
        PostContentInsight.adaptability_score >= 70
    ).count()

    # Tres adaptables (score >= 90)
    highly_adaptable = db.query(PostContentInsight).filter(
        PostContentInsight.adaptability_score >= 90
    ).count()

    # Par categorie
    category_stats = db.query(
        TrackedPost.category,
        func.count(TrackedPost.id).label("count"),
        func.avg(PostContentInsight.adaptability_score).label("avg_adaptability")
    ).join(
        PostContentInsight,
        TrackedPost.id == PostContentInsight.post_id
    ).filter(
        PostContentInsight.adaptability_score >= 70
    ).group_by(TrackedPost.category).all()

    # Top profils sources
    top_sources = db.query(
        TrackedProfile.display_name,
        func.count(TrackedPost.id).label("post_count"),
        func.avg(PostContentInsight.adaptability_score).label("avg_adaptability")
    ).join(
        TrackedPost,
        TrackedProfile.id == TrackedPost.profile_id
    ).join(
        PostContentInsight,
        TrackedPost.id == PostContentInsight.post_id
    ).filter(
        PostContentInsight.adaptability_score >= 70
    ).group_by(TrackedProfile.id).order_by(
        func.count(TrackedPost.id).desc()
    ).limit(5).all()

    return {
        "total_analyzed_posts": total_analyzed,
        "adaptable_posts": adaptable,
        "highly_adaptable_posts": highly_adaptable,
        "by_category": [
            {
                "category": cat or "unknown",
                "count": count,
                "avg_adaptability": round(avg or 0, 1)
            }
            for cat, count, avg in category_stats
        ],
        "top_sources": [
            {
                "profile_name": name,
                "post_count": count,
                "avg_adaptability": round(avg or 0, 1)
            }
            for name, count, avg in top_sources
        ]
    }
