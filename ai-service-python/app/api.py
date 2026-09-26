import os
import secrets
import json

from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from fastapi import BackgroundTasks
from .report_generator import generate_reports

# =========================
# PATHS
# =========================

PROJECT_ROOT = Path(__file__).resolve().parents[2]

FRONTEND_DIR = PROJECT_ROOT / "frontend"

MATCHES_FILE = (
    PROJECT_ROOT
    / "data"
    / "processed"
    / "matches.json"
)

REPORTS_DIR = PROJECT_ROOT / "reports"


# =========================
# ENVIRONMENT VARIABLES
# =========================

load_dotenv(PROJECT_ROOT / ".env")


# =========================
# FASTAPI APP
# =========================

app = FastAPI(
    title="GridAlign API",
    version="1.0.0"
)

report_generation_status = {
    "running": False,
    "message": "Idle"
}

# =========================
# STATIC FILES
# =========================

app.mount(
    "/css",
    StaticFiles(
        directory=FRONTEND_DIR / "css"
    ),
    name="css"
)

app.mount(
    "/js",
    StaticFiles(
        directory=FRONTEND_DIR / "js"
    ),
    name="js"
)


# =========================
# LOGIN MODEL
# =========================

class LoginRequest(BaseModel):
    username: str
    password: str


# =========================
# FRONTEND ROUTES
# =========================

@app.get("/")
def home():

    return FileResponse(
        FRONTEND_DIR / "index.html"
    )


@app.get("/dashboard")
def dashboard():

    return FileResponse(
        FRONTEND_DIR / "dashboard.html"
    )

# =========================
# AI REPORT GENERATION
# =========================

def run_report_generation():

    report_generation_status["running"] = True
    report_generation_status["message"] = (
        "Generating AI reports..."
    )

    try:

        generate_reports()

        report_generation_status["message"] = (
            "AI reports generated successfully."
        )

    except Exception as error:

        print(
            "REPORT GENERATION ERROR:",
            error
        )

        report_generation_status["message"] = (
            f"Error: {error}"
        )

    finally:

        report_generation_status["running"] = False


@app.post("/api/generate-reports")
def generate_reports_api(
    background_tasks: BackgroundTasks
):

    if report_generation_status["running"]:

        raise HTTPException(
            status_code=409,
            detail="Report generation is already running."
        )

    report_generation_status["running"] = True

    report_generation_status["message"] = (
        "Starting AI report generation..."
    )

    background_tasks.add_task(
        run_report_generation
    )

    return {
        "success": True,
        "message": "Report generation started."
    }


@app.get("/api/reports/status")
def get_report_status():

    return report_generation_status
# =========================
# HEALTH
# =========================

@app.get("/api/health")
def health():

    return {
        "status": "ok",
        "service": "GridAlign"
    }


# =========================
# MATCHES
# =========================

@app.get("/api/matches")
def get_matches():

    if not MATCHES_FILE.exists():
        raise HTTPException(
            status_code=404,
            detail="matches.json was not found."
        )

    with open(
        MATCHES_FILE,
        "r",
        encoding="utf-8"
    ) as file:
        data = json.load(file)

    matches = data.get("matches", [])

    for index, match in enumerate(matches, start=1):

        match["match_id"] = index

        report_file = (
            REPORTS_DIR
            / f"match_{index}.pdf"
        )

        match["report_available"] = (
            report_file.exists()
        )

    return data


# =========================
# REPORT DOWNLOAD
# =========================

@app.get("/api/reports/{match_id}")
def download_report(match_id: int):

    report_file = (
        REPORTS_DIR
        / f"match_{match_id}.pdf"
    )

    if not report_file.exists():

        raise HTTPException(
            status_code=404,
            detail="Report not found."
        )


    return FileResponse(
        path=report_file,
        media_type="application/pdf",
        filename=(
            f"GridAlign_Match_{match_id}.pdf"
        )
    )


# =========================
# LOGIN
# =========================

@app.post("/api/login")
def login(credentials: LoginRequest):

    correct_username = os.getenv(
        "GRIDALIGN_USERNAME"
    )

    correct_password = os.getenv(
        "GRIDALIGN_PASSWORD"
    )


    if not correct_username or not correct_password:

        raise HTTPException(
            status_code=500,
            detail=(
                "Server login credentials "
                "are not configured."
            )
        )


    username_valid = secrets.compare_digest(
        credentials.username,
        correct_username
    )

    password_valid = secrets.compare_digest(
        credentials.password,
        correct_password
    )


    if not username_valid or not password_valid:

        raise HTTPException(
            status_code=401,
            detail="Invalid username or password."
        )


    return {
        "success": True,
        "message": "Login successful."
    }