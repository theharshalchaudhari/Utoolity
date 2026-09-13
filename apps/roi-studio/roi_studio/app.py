"""Application entry point: environment checks, then the window.

Everything that can go wrong before there is a window to show a message in
is handled here - a missing Qt, no display, an unreadable settings file - so
the user gets a sentence they can act on instead of a traceback.
"""

from __future__ import annotations

import argparse
import os
import sys
import traceback
from datetime import datetime

from .config import (APP_AUTHOR, APP_NAME, APP_VERSION, Settings, crash_dir,
                     log_path)

MIN_PYTHON = (3, 9)


# ══════════════════════════════════════════════════════════════
# ENVIRONMENT
# ══════════════════════════════════════════════════════════════
def check_environment(require_gui: bool = True):
    """Return (ok, list_of_problems, list_of_notes)."""
    problems, notes = [], []

    if sys.version_info < MIN_PYTHON:
        problems.append(
            "Python %d.%d or newer is required; this is %s"
            % (MIN_PYTHON[0], MIN_PYTHON[1],
               ".".join(str(p) for p in sys.version_info[:3])))

    if require_gui:
        try:
            import PySide6                                   # noqa: F401
        except Exception as exc:
            problems.append("PySide6 is not installed (%s)" % exc)

    try:
        import PIL                                           # noqa: F401
    except Exception:
        problems.append("Pillow is not installed - images cannot be read")

    try:
        import openpyxl                                      # noqa: F401
    except Exception:
        problems.append("openpyxl is not installed - the spreadsheet "
                        "cannot be written")

    if require_gui and sys.platform.startswith("linux"):
        if not (os.environ.get("DISPLAY") or os.environ.get("WAYLAND_DISPLAY")):
            problems.append("no display found - a desktop session is required")

    return (not problems), problems, notes


def environment_report() -> str:
    ok, problems, _notes = check_environment(require_gui=True)
    lines = ["%s %s" % (APP_NAME, APP_VERSION),
             "Python %s" % ".".join(str(p) for p in sys.version_info[:3]),
             "Platform %s" % sys.platform]
    for name in ("PySide6", "PIL", "openpyxl"):
        try:
            module = __import__(name)
            version = getattr(module, "__version__", "installed")
            lines.append("%-10s %s" % (name, version))
        except Exception:
            lines.append("%-10s MISSING" % name)
    if problems:
        lines.append("")
        lines.append("Problems:")
        lines.extend("  - " + p for p in problems)
    return "\n".join(lines)


def _print_missing(problems) -> None:
    print("%s cannot start.\n" % APP_NAME)
    for problem in problems:
        print("  - %s" % problem)
    print("\nThe quickest fix is to run the bootstrap script, which builds a\n"
          "private environment with everything needed:\n\n"
          "    python bootstrap.py\n\n"
          "Or install the packages yourself:\n\n"
          "    python -m pip install PySide6-Essentials pillow openpyxl\n")


# ══════════════════════════════════════════════════════════════
# CRASH HANDLING
# ══════════════════════════════════════════════════════════════
def _write_crash(exc_type, exc_value, exc_tb) -> str:
    text = "".join(traceback.format_exception(exc_type, exc_value, exc_tb))
    stamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    path = crash_dir() / ("crash_%s.txt" % stamp)
    try:
        path.write_text("%s %s\n%s\n\n%s" % (APP_NAME, APP_VERSION,
                                             datetime.now().isoformat(), text),
                        encoding="utf-8")
    except Exception:
        pass
    try:
        with open(log_path(), "a", encoding="utf-8") as fh:
            fh.write("[%s] %s" % (datetime.now().isoformat(timespec="seconds"),
                                  text))
    except Exception:
        pass
    return str(path)


def install_excepthook(window_getter=None) -> None:
    """Unhandled exceptions become a message box and a crash file, never a
    silent death."""
    def hook(exc_type, exc_value, exc_tb):
        if issubclass(exc_type, KeyboardInterrupt):
            sys.__excepthook__(exc_type, exc_value, exc_tb)
            return
        path = _write_crash(exc_type, exc_value, exc_tb)
        sys.stderr.write("".join(traceback.format_exception(
            exc_type, exc_value, exc_tb)))
        try:
            from PySide6.QtWidgets import QApplication, QMessageBox
            if QApplication.instance() is not None:
                window = window_getter() if window_getter else None
                box = QMessageBox(window)
                box.setIcon(QMessageBox.Icon.Warning)
                box.setWindowTitle("Something went wrong")
                box.setText("%s hit an unexpected error, but your annotations "
                            "on disk are untouched." % APP_NAME)
                box.setInformativeText(
                    "%s: %s\n\nA report was written to:\n%s"
                    % (exc_type.__name__, exc_value, path))
                box.setStandardButtons(QMessageBox.StandardButton.Ok)
                box.exec()
        except Exception:
            pass
    sys.excepthook = hook


# ══════════════════════════════════════════════════════════════
# MAIN
# ══════════════════════════════════════════════════════════════
def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="roi-studio",
        description="%s %s - polygon ROI annotation" % (APP_NAME, APP_VERSION))
    parser.add_argument("folder", nargs="?", default="",
                        help="batch folder to open on start")
    parser.add_argument("--folder", dest="folder_opt", default="",
                        help="batch folder to open on start")
    parser.add_argument("--selftest", action="store_true",
                        help="run the offline checks and exit (no GUI needed)")
    parser.add_argument("--check", action="store_true",
                        help="print the environment report and exit")
    parser.add_argument("--reset-settings", action="store_true",
                        help="start from default settings")
    parser.add_argument("--version", action="version",
                        version="%s %s by %s" % (APP_NAME, APP_VERSION,
                                                 APP_AUTHOR))
    return parser


def run(argv=None) -> int:
    args = build_parser().parse_args(argv)

    if args.check:
        print(environment_report())
        return 0

    if args.selftest:
        from .selftest import run_selftest
        return run_selftest()

    ok, problems, _notes = check_environment(require_gui=True)
    if not ok:
        _print_missing(problems)
        return 2

    from PySide6.QtCore import Qt
    from PySide6.QtWidgets import QApplication

    # Sharp on scaled displays; the rounding policy stops half-pixel seams.
    try:
        QApplication.setHighDpiScaleFactorRoundingPolicy(
            Qt.HighDpiScaleFactorRoundingPolicy.PassThrough)
    except Exception:
        pass

    app = QApplication(sys.argv[:1])
    app.setApplicationName(APP_NAME)
    app.setApplicationVersion(APP_VERSION)
    app.setOrganizationName(APP_NAME)
    app.setStyle("Fusion")            # identical on every platform

    settings = Settings()
    if args.reset_settings:
        from .config import DEFAULT_SETTINGS
        settings.data = dict(DEFAULT_SETTINGS)
        settings.save()

    from .ui.main_window import MainWindow
    window = MainWindow(settings, app)
    install_excepthook(lambda: window)
    window.show()

    folder = args.folder_opt or args.folder
    if folder:
        if os.path.isdir(folder):
            window.open_folder(folder)
        else:
            window._status("No such folder: %s" % folder, "warning")

    window.show_welcome()
    return app.exec()


def main(argv=None) -> int:
    try:
        return run(argv)
    except KeyboardInterrupt:
        return 130
    except Exception:
        path = _write_crash(*sys.exc_info())
        print("%s could not start. A report was written to:\n  %s"
              % (APP_NAME, path))
        traceback.print_exc()
        return 1
