"""Allow `python -m roi_studio`."""

import sys

from .app import main

if __name__ == "__main__":
    sys.exit(main())
