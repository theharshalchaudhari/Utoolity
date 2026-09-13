#!/usr/bin/env python3
"""Run every test suite and report one verdict.

    python tests/run_all.py
"""

import os
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
SUITES = [("core", "test_core.py"),
          ("gui", "test_gui.py"),
          ("features", "test_features.py")]


def main():
    failures = []
    for name, script in SUITES:
        print("=" * 62)
        print("running %s" % name)
        print("=" * 62)
        result = subprocess.run([sys.executable, os.path.join(HERE, script)])
        if result.returncode != 0:
            failures.append(name)
    print("=" * 62)
    if failures:
        print("FAILED: %s" % ", ".join(failures))
        return 1
    print("ALL SUITES PASSED")
    return 0


if __name__ == "__main__":
    sys.exit(main())
