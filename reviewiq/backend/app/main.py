"""ReviewIQ FastAPI application entry point."""

from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import router as api_router
from app.config import CORS_ORIGINS
from app.database.db import init_db
from app.services.ml_service import ml_service


@asynccontextmanager
async def lifespan(_app: FastAPI):
    init_db()
    ml_service.load()
    yield


app = FastAPI(
    title="ReviewIQ API",
    version="1.0.0",
    description=(
        "An Intelligent E-Commerce Review Analysis and Customer Insight System "
        "powered by real scikit-learn sentiment classification, K-Means complaint clustering, "
        "and SQLite persistence."
    ),
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router)


@app.get("/", tags=["Root"])
def root() -> dict[str, str]:
    return {
        "name": "ReviewIQ API",
        "docs": "/docs",
        "health": "/api/health",
    }

