"""Simple health check script."""
import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

try:
    from app.main import app
    print("✅ Backend app module loaded successfully")
    print(f"   App title: {app.title}")
    print(f"   App version: {app.version}")
except Exception as e:
    print(f"❌ Failed to load app: {e}")
    import traceback
    traceback.print_exc()
