"""Vercel entrypoint: serves the FastAPI backend as a Python serverless function.

vercel.json rewrites every /api/* request here; FastAPI still sees the original path.
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "backend"))

from app.main import app  # noqa: E402,F401  (Vercel looks for `app`)
