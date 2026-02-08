import sys
import os

# Add backend/python to path so imports work
sys.path.append(os.path.join(os.path.dirname(__file__), "..", "backend", "python"))

from main import app
