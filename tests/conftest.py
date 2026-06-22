"""pytest configuration — ensure project root is on sys.path."""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Keep the test suite runnable from a clean clone without a user's gitignored config.
os.environ.setdefault(
    "BUSINESS_CONFIG_PATH",
    os.path.join(os.path.dirname(__file__), "fixtures", "business_config.json"),
)
