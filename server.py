#!/usr/bin/env python3
"""dev-shit.de entrypoint for ServerXProject.

Deployment revision: seed-test-accounts.

The hosting platform runs this file and proxies wwc.dev-shit.de to the port in
proxy.conf. This bootstraps a local Python virtualenv, installs backend
requirements, then serves the FastAPI app plus the built React frontend.
"""

import os
import pathlib
import re
import subprocess
import sys

HERE = pathlib.Path(__file__).resolve().parent
VENV = HERE / ".venv"
PYTHON = VENV / "bin" / "python"
UVICORN = VENV / "bin" / "uvicorn"


def port() -> int:
    txt = re.sub(r"#.*", "", (HERE / "proxy.conf").read_text())
    match = re.search(r"\d{1,5}", txt)
    return int(match.group()) if match else 8000


def ensure_venv() -> None:
    if not PYTHON.exists():
        subprocess.check_call([sys.executable, "-m", "venv", str(VENV)])
    subprocess.check_call([str(PYTHON), "-m", "pip", "install", "--upgrade", "pip"])
    subprocess.check_call([
        str(PYTHON),
        "-m",
        "pip",
        "install",
        "--requirement",
        str(HERE / "backend" / "requirements.txt"),
    ])


def main() -> None:
    ensure_venv()
    os.environ.setdefault("APP_DATA_DIR", str(HERE / "data"))
    os.chdir(HERE)
    os.execv(
        str(UVICORN),
        [
            str(UVICORN),
            "backend.app.main:app",
            "--host",
            "127.0.0.1",
            "--port",
            str(port()),
        ],
    )


if __name__ == "__main__":
    main()
