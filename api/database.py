from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os

# Chemin vers la base de données SQLite
DATABASE_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "posts.db")
SQLALCHEMY_DATABASE_URL = f"sqlite:///{DATABASE_PATH}"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False}  # Nécessaire pour SQLite
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    """Dependency pour obtenir une session DB"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    """Initialise la base de données (crée les tables)"""
    import models  # Import ici pour éviter circular import
    Base.metadata.create_all(bind=engine)
