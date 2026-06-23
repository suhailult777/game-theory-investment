from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv
import os

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/investment")

_engine_kwargs = {"pool_pre_ping": True}
# PostgreSQL-specific pool params (not valid for SQLite)
if DATABASE_URL.startswith("postgresql"):
    _engine_kwargs.update({
        "pool_size": 10,
        "max_overflow": 10,
        "pool_timeout": 30,
    })

engine = create_engine(DATABASE_URL, **_engine_kwargs)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
