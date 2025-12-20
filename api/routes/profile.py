from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Optional
import json
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from database import get_db
from models import UserCompanyProfile
from schemas import (
    UserCompanyProfile as ProfileSchema,
    UserCompanyProfileCreate,
    UserCompanyProfileUpdate
)

router = APIRouter(prefix="/api/profile", tags=["profile"])


def serialize_profile(profile: UserCompanyProfile) -> dict:
    """Serialize profile with JSON fields"""
    return {
        "id": profile.id,
        "company_name": profile.company_name,
        "industry": profile.industry,
        "sub_industry": profile.sub_industry,
        "company_size": profile.company_size,
        "tone_of_voice": json.loads(profile.tone_of_voice) if profile.tone_of_voice else None,
        "key_messages": json.loads(profile.key_messages) if profile.key_messages else None,
        "values": json.loads(profile.values) if profile.values else None,
        "differentiators": json.loads(profile.differentiators) if profile.differentiators else None,
        "target_audience": json.loads(profile.target_audience) if profile.target_audience else None,
        "audience_pain_points": json.loads(profile.audience_pain_points) if profile.audience_pain_points else None,
        "preferred_categories": json.loads(profile.preferred_categories) if profile.preferred_categories else None,
        "excluded_topics": json.loads(profile.excluded_topics) if profile.excluded_topics else None,
        "hashtag_preferences": json.loads(profile.hashtag_preferences) if profile.hashtag_preferences else None,
        "created_at": profile.created_at,
        "updated_at": profile.updated_at,
        "is_active": profile.is_active,
    }


@router.get("", response_model=Optional[ProfileSchema])
def get_profile(db: Session = Depends(get_db)):
    """Recupere le profil entreprise actif (un seul par utilisateur)"""
    profile = db.query(UserCompanyProfile).filter(
        UserCompanyProfile.is_active == True
    ).first()

    if not profile:
        return None

    return serialize_profile(profile)


@router.get("/{profile_id}", response_model=ProfileSchema)
def get_profile_by_id(profile_id: int, db: Session = Depends(get_db)):
    """Recupere un profil par son ID"""
    profile = db.query(UserCompanyProfile).filter(
        UserCompanyProfile.id == profile_id
    ).first()

    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")

    return serialize_profile(profile)


@router.post("", response_model=ProfileSchema)
def create_profile(profile_data: UserCompanyProfileCreate, db: Session = Depends(get_db)):
    """Cree un nouveau profil entreprise"""
    # Desactiver les anciens profils actifs
    db.query(UserCompanyProfile).filter(
        UserCompanyProfile.is_active == True
    ).update({"is_active": False})

    # Preparer les donnees avec serialisation JSON
    data = profile_data.model_dump()

    # Convertir les listes et objets en JSON strings
    json_fields = [
        'tone_of_voice', 'key_messages', 'values', 'differentiators',
        'target_audience', 'audience_pain_points', 'preferred_categories',
        'excluded_topics', 'hashtag_preferences'
    ]

    for field in json_fields:
        if data.get(field) is not None:
            if field == 'target_audience' and data[field]:
                # TargetAudience est un objet Pydantic
                data[field] = json.dumps(data[field])
            else:
                data[field] = json.dumps(data[field])

    db_profile = UserCompanyProfile(**data)
    db.add(db_profile)
    db.commit()
    db.refresh(db_profile)

    return serialize_profile(db_profile)


@router.put("/", response_model=ProfileSchema)
def update_active_profile(
    profile_update: UserCompanyProfileUpdate,
    db: Session = Depends(get_db)
):
    """Met a jour le profil actif"""
    profile = db.query(UserCompanyProfile).filter(
        UserCompanyProfile.is_active == True
    ).first()

    if not profile:
        raise HTTPException(status_code=404, detail="No active profile found")

    update_data = profile_update.model_dump(exclude_unset=True)

    # Convertir les listes et objets en JSON strings
    json_fields = [
        'tone_of_voice', 'key_messages', 'values', 'differentiators',
        'target_audience', 'audience_pain_points', 'preferred_categories',
        'excluded_topics', 'hashtag_preferences'
    ]

    for field in json_fields:
        if field in update_data and update_data[field] is not None:
            if field == 'target_audience':
                update_data[field] = json.dumps(update_data[field])
            else:
                update_data[field] = json.dumps(update_data[field])

    for key, value in update_data.items():
        setattr(profile, key, value)

    db.commit()
    db.refresh(profile)

    return serialize_profile(profile)


@router.put("/{profile_id}", response_model=ProfileSchema)
def update_profile_by_id(
    profile_id: int,
    profile_update: UserCompanyProfileUpdate,
    db: Session = Depends(get_db)
):
    """Met a jour un profil par son ID"""
    profile = db.query(UserCompanyProfile).filter(
        UserCompanyProfile.id == profile_id
    ).first()

    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")

    update_data = profile_update.model_dump(exclude_unset=True)

    # Convertir les listes et objets en JSON strings
    json_fields = [
        'tone_of_voice', 'key_messages', 'values', 'differentiators',
        'target_audience', 'audience_pain_points', 'preferred_categories',
        'excluded_topics', 'hashtag_preferences'
    ]

    for field in json_fields:
        if field in update_data and update_data[field] is not None:
            if field == 'target_audience':
                update_data[field] = json.dumps(update_data[field])
            else:
                update_data[field] = json.dumps(update_data[field])

    for key, value in update_data.items():
        setattr(profile, key, value)

    db.commit()
    db.refresh(profile)

    return serialize_profile(profile)


@router.delete("/{profile_id}")
def delete_profile(profile_id: int, db: Session = Depends(get_db)):
    """Supprime un profil"""
    profile = db.query(UserCompanyProfile).filter(
        UserCompanyProfile.id == profile_id
    ).first()

    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")

    db.delete(profile)
    db.commit()

    return {"success": True, "message": f"Profile {profile_id} deleted"}
