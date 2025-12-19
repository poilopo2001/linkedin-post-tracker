import os
import asyncio
from pathlib import Path
from dotenv import load_dotenv

# Charger les variables d'environnement depuis .env à la racine du projet
env_path = Path(__file__).parent.parent / ".env"
load_dotenv(env_path)

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from database import init_db, SessionLocal
from routes import companies_router, posts_router, trends_router, profile_router, generator_router, tracker_router
from services.tracker_scheduler import init_scheduler, get_scheduler


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialisation au demarrage et cleanup a l'arret"""
    # Startup
    init_db()
    print("Database initialized")

    # Initialize and start the tracker scheduler
    scheduler = init_scheduler(SessionLocal)
    scheduler_task = asyncio.create_task(scheduler.start())
    print("Tracker scheduler started")

    yield

    # Shutdown
    scheduler.stop()
    scheduler_task.cancel()
    try:
        await scheduler_task
    except asyncio.CancelledError:
        pass
    print("Tracker scheduler stopped")


app = FastAPI(
    title="LinkedIn Posts Dashboard API",
    description="API pour tracker et analyser les posts LinkedIn des entreprises luxembourgeoises",
    version="1.0.0",
    lifespan=lifespan
)

# Configuration CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",  # Next.js dev
        "http://127.0.0.1:3000",
        "http://localhost:3002",  # Alternative port
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Inclusion des routes
app.include_router(companies_router)
app.include_router(posts_router)
app.include_router(trends_router)
app.include_router(profile_router)
app.include_router(generator_router)
app.include_router(tracker_router)


@app.get("/")
def root():
    """Endpoint racine"""
    return {
        "name": "LinkedIn Posts Dashboard API",
        "version": "1.0.0",
        "status": "running",
        "docs": "/docs",
        "endpoints": {
            "companies": "/api/companies",
            "posts": "/api/posts",
            "trends": "/api/trends",
            "profile": "/api/profile",
            "generator": "/api/generator",
            "tracker": "/api/tracker"
        }
    }


@app.get("/health")
def health_check():
    """Health check endpoint"""
    return {"status": "healthy"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
