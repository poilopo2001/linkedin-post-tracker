from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from database import get_db
from models import Company, Post
from schemas import Company as CompanySchema, CompanyCreate, CompanyUpdate

router = APIRouter(prefix="/api/companies", tags=["companies"])


@router.get("/", response_model=List[CompanySchema])
def list_companies(
    skip: int = 0,
    limit: int = 100,
    active_only: bool = True,
    search: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Liste toutes les entreprises trackées"""
    query = db.query(Company)

    if active_only:
        query = query.filter(Company.is_active == True)

    if search:
        query = query.filter(Company.name.ilike(f"%{search}%"))

    companies = query.offset(skip).limit(limit).all()

    # Ajouter le nombre de posts pour chaque entreprise
    result = []
    for company in companies:
        company_dict = {
            "id": company.id,
            "name": company.name,
            "linkedin_url": company.linkedin_url,
            "industry": company.industry,
            "location": company.location,
            "employee_count": company.employee_count,
            "website": company.website,
            "is_active": company.is_active,
            "created_at": company.created_at,
            "last_collected_at": company.last_collected_at,
            "post_count": db.query(Post).filter(Post.company_id == company.id).count()
        }
        result.append(company_dict)

    return result


@router.get("/{company_id}", response_model=CompanySchema)
def get_company(company_id: int, db: Session = Depends(get_db)):
    """Récupère une entreprise par son ID"""
    company = db.query(Company).filter(Company.id == company_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")

    return {
        "id": company.id,
        "name": company.name,
        "linkedin_url": company.linkedin_url,
        "industry": company.industry,
        "location": company.location,
        "employee_count": company.employee_count,
        "website": company.website,
        "is_active": company.is_active,
        "created_at": company.created_at,
        "last_collected_at": company.last_collected_at,
        "post_count": db.query(Post).filter(Post.company_id == company.id).count()
    }


@router.post("/", response_model=CompanySchema)
def create_company(company: CompanyCreate, db: Session = Depends(get_db)):
    """Ajoute une nouvelle entreprise à tracker"""
    # Vérifier si l'URL LinkedIn existe déjà
    existing = db.query(Company).filter(
        Company.linkedin_url == company.linkedin_url
    ).first()
    if existing:
        raise HTTPException(
            status_code=400,
            detail="Company with this LinkedIn URL already exists"
        )

    db_company = Company(**company.model_dump())
    db.add(db_company)
    db.commit()
    db.refresh(db_company)

    return {
        "id": db_company.id,
        "name": db_company.name,
        "linkedin_url": db_company.linkedin_url,
        "industry": db_company.industry,
        "location": db_company.location,
        "employee_count": db_company.employee_count,
        "website": db_company.website,
        "is_active": db_company.is_active,
        "created_at": db_company.created_at,
        "last_collected_at": db_company.last_collected_at,
        "post_count": 0
    }


@router.put("/{company_id}", response_model=CompanySchema)
def update_company(
    company_id: int,
    company_update: CompanyUpdate,
    db: Session = Depends(get_db)
):
    """Met à jour une entreprise"""
    company = db.query(Company).filter(Company.id == company_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")

    update_data = company_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(company, key, value)

    db.commit()
    db.refresh(company)

    return {
        "id": company.id,
        "name": company.name,
        "linkedin_url": company.linkedin_url,
        "industry": company.industry,
        "location": company.location,
        "employee_count": company.employee_count,
        "website": company.website,
        "is_active": company.is_active,
        "created_at": company.created_at,
        "last_collected_at": company.last_collected_at,
        "post_count": db.query(Post).filter(Post.company_id == company.id).count()
    }


@router.delete("/{company_id}")
def delete_company(company_id: int, db: Session = Depends(get_db)):
    """Supprime une entreprise et tous ses posts"""
    company = db.query(Company).filter(Company.id == company_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")

    db.delete(company)
    db.commit()

    return {"success": True, "message": f"Company {company_id} deleted"}


@router.post("/bulk")
def create_companies_bulk(
    companies: List[CompanyCreate],
    db: Session = Depends(get_db)
):
    """Ajoute plusieurs entreprises en une fois"""
    added = []
    skipped = []

    for company in companies:
        existing = db.query(Company).filter(
            Company.linkedin_url == company.linkedin_url
        ).first()

        if existing:
            skipped.append(company.name)
            continue

        db_company = Company(**company.model_dump())
        db.add(db_company)
        added.append(company.name)

    db.commit()

    return {
        "added": len(added),
        "skipped": len(skipped),
        "added_companies": added,
        "skipped_companies": skipped
    }
