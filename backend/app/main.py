from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from app.scheduler.jobs import start_scheduler, stop_scheduler
from app.api.routes import router
from app.core.log import configure_logging, get_logger

configure_logging()
log = get_logger(__name__)

app = FastAPI(
    title="Game-Theory Investment Intelligence System API",
    version="1.0.0",
    description="Automated game-theory factor scoring and NLP news sentiment analysis.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    log.error("Unhandled exception on %s %s: %s", request.method, request.url.path, exc)
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error", "path": request.url.path},
    )


@app.on_event("startup")
async def startup_event():
    log.info("FastAPI application booting...")
    start_scheduler()


@app.on_event("shutdown")
async def shutdown_event():
    log.info("Shutting down scheduler...")
    stop_scheduler()


@app.get("/")
def read_root():
    return {
        "status": "online",
        "system": "Game-Theory Investment Intelligence System API",
        "version": "1.0.0",
    }
