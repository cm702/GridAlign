import os
import sys
import json
import secrets
import shutil
import subprocess
import traceback

from contextlib import redirect_stdout
from pathlib import Path

from dotenv import load_dotenv

from fastapi import (
    FastAPI,
    HTTPException,
    BackgroundTasks,
    Request,
    Depends,
)

from fastapi.responses import (
    FileResponse,
    RedirectResponse,
    JSONResponse,
)

from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel


# =========================
# PATHS
# =========================

PROJECT_ROOT = Path(__file__).resolve().parents[2]

FRONTEND_DIR = (
    PROJECT_ROOT
    / "frontend"
)

MATCHES_FILE = (
    PROJECT_ROOT
    / "data"
    / "processed"
    / "matches.json"
)

REPORTS_DIR = (
    PROJECT_ROOT
    / "reports"
)

BACKEND_JAVA_DIR = (
    PROJECT_ROOT
    / "backend-java"
)


# =========================
# ENVIRONMENT VARIABLES
# =========================

load_dotenv(
    PROJECT_ROOT / ".env"
)


# =========================
# FASTAPI APP
# =========================

app = FastAPI(
    title="GridAlign API",
    version="1.0.0"
)


# =========================
# JOB STATUS
# =========================

data_generation_status = {
    "running": False,
    "message": "Idle",
    "log": []
}

matcher_status = {
    "running": False,
    "message": "Idle",
    "log": []
}

report_generation_status = {
    "running": False,
    "message": "Idle",
    "log": []
}


# =========================
# JOB LOGGING
# =========================

def sanitize_log_text(text: str) -> str:

    result = str(text)

    sensitive_values = [
        os.getenv("GEMINI_API_KEY"),
        os.getenv("GRIDALIGN_PASSWORD"),
    ]

    for value in sensitive_values:

        if value:
            result = result.replace(
                value,
                "[REDACTED]"
            )

    return result


def add_job_log(
    status: dict,
    message: str
):

    message = sanitize_log_text(
        message
    ).strip()

    if not message:
        return

    status["log"].append(
        message
    )

    # Prevent unlimited memory use.
    status["log"] = (
        status["log"][-250:]
    )


class JobLogStream:

    def __init__(
        self,
        status: dict,
        terminal_stream
    ):

        self.status = status
        self.terminal_stream = terminal_stream
        self.buffer = ""


    def write(
        self,
        text
    ):

        if not text:
            return

        # Keep normal terminal output.
        self.terminal_stream.write(
            text
        )

        self.terminal_stream.flush()

        self.buffer += text


        while "\n" in self.buffer:

            line, self.buffer = (
                self.buffer.split(
                    "\n",
                    1
                )
            )

            add_job_log(
                self.status,
                line
            )


    def flush(self):

        self.terminal_stream.flush()

        if self.buffer.strip():

            add_job_log(
                self.status,
                self.buffer
            )

        self.buffer = ""


def any_job_running() -> bool:

    return (
        data_generation_status["running"]
        or matcher_status["running"]
        or report_generation_status["running"]
    )


# =========================
# AUTH SESSIONS
# =========================

active_sessions = set()


def get_session_token(
    request: Request
):

    return request.cookies.get(
        "gridalign_session"
    )


def is_authenticated(
    request: Request
):

    token = get_session_token(
        request
    )

    return (
        token is not None
        and token in active_sessions
    )


def require_auth(
    request: Request
):

    if not is_authenticated(request):

        raise HTTPException(
            status_code=401,
            detail="Authentication required."
        )


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
def home(
    request: Request
):

    if is_authenticated(request):

        return RedirectResponse(
            url="/dashboard"
        )

    return FileResponse(
        FRONTEND_DIR / "index.html"
    )


@app.get("/dashboard")
def dashboard(
    request: Request
):

    if not is_authenticated(request):

        return RedirectResponse(
            url="/"
        )

    return FileResponse(
        FRONTEND_DIR / "dashboard.html"
    )


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
# LOGIN
# =========================

@app.post("/api/login")
def login(
    credentials: LoginRequest
):

    correct_username = os.getenv(
        "GRIDALIGN_USERNAME"
    )

    correct_password = os.getenv(
        "GRIDALIGN_PASSWORD"
    )


    if (
        not correct_username
        or not correct_password
    ):

        raise HTTPException(
            status_code=500,
            detail=(
                "Server login credentials "
                "are not configured."
            )
        )


    username_valid = (
        secrets.compare_digest(
            credentials.username,
            correct_username
        )
    )

    password_valid = (
        secrets.compare_digest(
            credentials.password,
            correct_password
        )
    )


    if (
        not username_valid
        or not password_valid
    ):

        raise HTTPException(
            status_code=401,
            detail="Invalid username or password."
        )


    session_token = (
        secrets.token_urlsafe(32)
    )

    active_sessions.add(
        session_token
    )


    response = JSONResponse(
        content={
            "success": True,
            "message": "Login successful."
        }
    )


    response.set_cookie(
        key="gridalign_session",
        value=session_token,
        httponly=True,
        samesite="lax",
        secure=True,
        path="/",
    )


    return response


# =========================
# LOGOUT
# =========================

@app.post("/api/logout")
def logout(
    request: Request
):

    session_token = get_session_token(
        request
    )


    if session_token:

        active_sessions.discard(
            session_token
        )


    response = JSONResponse(
        content={
            "success": True,
            "message": "Logged out."
        }
    )


    response.delete_cookie(
        key="gridalign_session",
        path="/",
    )


    return response


# =========================
# MATCHES
# =========================

@app.get("/api/matches")
def get_matches(
    _: None = Depends(
        require_auth
    )
):

    if not MATCHES_FILE.exists():

        raise HTTPException(
            status_code=404,
            detail="matches.json was not found."
        )


    try:

        with MATCHES_FILE.open(
            "r",
            encoding="utf-8"
        ) as file:

            data = json.load(file)


        matches = data.get(
            "matches",
            []
        )


        for index, match in enumerate(
            matches,
            start=1
        ):

            match["match_id"] = index

            report_file = (
                REPORTS_DIR
                / f"match_{index}.pdf"
            )

            match["report_available"] = (
                report_file.exists()
            )


        return data


    except Exception as error:

        print(
            "MATCHES ERROR:",
            error
        )

        raise HTTPException(
            status_code=500,
            detail=str(error)
        )


# =========================
# PROJECT DATA GENERATION
# =========================

def run_project_data_generation():

    data_generation_status["running"] = True

    data_generation_status["message"] = (
        "Processing project data..."
    )

    data_generation_status["log"] = []


    add_job_log(
        data_generation_status,
        "Starting project data processing..."
    )


    terminal = sys.stdout

    logger = JobLogStream(
        data_generation_status,
        terminal
    )


    try:

        with redirect_stdout(
            logger
        ):

            from .main import create_company_data

            create_company_data()


        data_generation_status["message"] = (
            "Project data processed successfully."
        )

        add_job_log(
            data_generation_status,
            "Project data processed successfully."
        )


    except Exception as error:

        data_generation_status["message"] = (
            f"Error: {error}"
        )

        add_job_log(
            data_generation_status,
            f"ERROR: {error}"
        )

        traceback.print_exc(
            file=logger
        )


    finally:

        logger.flush()

        data_generation_status["running"] = False


@app.post("/api/refresh-data")
def refresh_project_data(
    background_tasks: BackgroundTasks,
    _: None = Depends(
        require_auth
    )
):

    if any_job_running():

        raise HTTPException(
            status_code=409,
            detail=(
                "Another GridAlign process "
                "is already running."
            )
        )


    data_generation_status["running"] = True

    data_generation_status["message"] = (
        "Starting project data processing..."
    )

    data_generation_status["log"] = []


    background_tasks.add_task(
        run_project_data_generation
    )


    return {
        "success": True,
        "message": (
            "Project data processing started."
        )
    }


@app.get("/api/refresh-data/status")
def refresh_project_data_status(
    _: None = Depends(
        require_auth
    )
):

    return data_generation_status


# =========================
# JAVA PROJECT MATCHER
# =========================

def run_java_matcher():

    matcher_status["running"] = True

    matcher_status["message"] = (
        "Running Java Project Matcher..."
    )

    matcher_status["log"] = []


    add_job_log(
        matcher_status,
        "Starting Java Project Matcher..."
    )


    try:

        maven_command = (
            shutil.which("mvn")
            or shutil.which("mvn.cmd")
        )


        if not maven_command:

            raise RuntimeError(
                "Maven was not found."
            )


        add_job_log(
            matcher_status,
            f"Maven: {maven_command}"
        )

        add_job_log(
            matcher_status,
            "Compiling and running ProjectMatcher..."
        )


        # Remove old matches file so we know
        # the matcher really created a new one.
        if MATCHES_FILE.exists():

            MATCHES_FILE.unlink()

            add_job_log(
                matcher_status,
                "Old matches.json removed."
            )


        process = subprocess.Popen(
            [
                maven_command,

                "-f",
                str(
                    BACKEND_JAVA_DIR
                    / "pom.xml"
                ),

                "compile",

                "exec:java",

                "-Dexec.mainClass=com.gridalign.ProjectMatcher",
            ],

            # IMPORTANT:
            # Run from the GridAlign repository root
            # because ProjectMatcher uses paths like:
            # data/processed/georgia_power.json
            cwd=PROJECT_ROOT,

            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,

            text=True,
            encoding="utf-8",
            errors="replace",

            bufsize=1,
        )


        if process.stdout:

            for line in process.stdout:

                print(
                    line,
                    end=""
                )

                add_job_log(
                    matcher_status,
                    line
                )


        return_code = (
            process.wait()
        )


        if return_code != 0:

            raise RuntimeError(
                "Java Project Matcher failed "
                f"with exit code {return_code}."
            )


        # Maven can say BUILD SUCCESS even if
        # ProjectMatcher caught an exception.
        # Therefore verify the actual output.
        if not MATCHES_FILE.exists():

            raise RuntimeError(
                "ProjectMatcher finished, "
                "but matches.json was not created."
            )


        matcher_status["message"] = (
            "Project matching completed successfully."
        )


        add_job_log(
            matcher_status,
            "matches.json created successfully."
        )

        add_job_log(
            matcher_status,
            str(MATCHES_FILE)
        )


    except Exception as error:

        print(
            "PROJECT MATCHER ERROR:",
            error
        )

        matcher_status["message"] = (
            f"Error: {error}"
        )

        add_job_log(
            matcher_status,
            f"ERROR: {error}"
        )


    finally:

        matcher_status["running"] = False


@app.post("/api/run-matcher")
def run_matcher(
    background_tasks: BackgroundTasks,
    _: None = Depends(
        require_auth
    )
):

    if any_job_running():

        raise HTTPException(
            status_code=409,
            detail=(
                "Another GridAlign process "
                "is already running."
            )
        )


    matcher_status["running"] = True

    matcher_status["message"] = (
        "Starting Project Matcher..."
    )

    matcher_status["log"] = []


    background_tasks.add_task(
        run_java_matcher
    )


    return {
        "success": True,
        "message": (
            "Project Matcher started."
        )
    }


@app.get("/api/run-matcher/status")
def get_matcher_status(
    _: None = Depends(
        require_auth
    )
):

    return matcher_status


# =========================
# AI REPORT GENERATION
# =========================

def run_report_generation():

    report_generation_status["running"] = True

    report_generation_status["message"] = (
        "Generating AI reports..."
    )

    report_generation_status["log"] = []


    add_job_log(
        report_generation_status,
        "Starting AI report generation..."
    )


    terminal = sys.stdout

    logger = JobLogStream(
        report_generation_status,
        terminal
    )


    try:

        with redirect_stdout(
            logger
        ):

            from .report_generator import generate_reports

            generate_reports()


        report_generation_status["message"] = (
            "AI reports generated successfully."
        )

        add_job_log(
            report_generation_status,
            "AI reports generated successfully."
        )


    except Exception as error:

        report_generation_status["message"] = (
            f"Error: {error}"
        )

        add_job_log(
            report_generation_status,
            f"ERROR: {error}"
        )

        traceback.print_exc(
            file=logger
        )


    finally:

        logger.flush()

        report_generation_status["running"] = False


@app.post("/api/generate-reports")
def generate_reports_api(
    background_tasks: BackgroundTasks,
    _: None = Depends(
        require_auth
    )
):

    if any_job_running():

        raise HTTPException(
            status_code=409,
            detail=(
                "Another GridAlign process "
                "is already running."
            )
        )


    report_generation_status["running"] = True

    report_generation_status["message"] = (
        "Starting AI report generation..."
    )

    report_generation_status["log"] = []


    background_tasks.add_task(
        run_report_generation
    )


    return {
        "success": True,
        "message": (
            "Report generation started."
        )
    }


# IMPORTANT:
# Keep this route BEFORE /api/reports/{match_id}

@app.get("/api/reports/status")
def get_report_status(
    _: None = Depends(
        require_auth
    )
):

    return report_generation_status


# =========================
# REPORT DOWNLOAD
# =========================

@app.get("/api/reports/{match_id}")
def download_report(
    match_id: int,
    _: None = Depends(
        require_auth
    )
):

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