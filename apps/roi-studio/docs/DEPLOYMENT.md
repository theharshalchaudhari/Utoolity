# Deploying ROI Studio to annotators

Three ways, from least to most effort for you.

## 1. Copy the folder and run the bootstrap

Best when annotators have Python and can run one command.

1. Copy the whole `apps/roi-studio` folder to the machine, or clone
   Utoolity and use that folder:
   ```
   git clone https://github.com/theharshalchaudhari/Utoolity.git
   cd Utoolity/apps/roi-studio
   ```
2. On that machine, inside that folder:
   ```
   python bootstrap.py --shortcut
   ```
3. They start it from the desktop shortcut, or with `python run.py`.

The bootstrap builds `.venv` inside the folder, so nothing is installed
system-wide and no administrator rights are needed. `run.py` finds that
environment by itself afterwards.

### Machines with no internet

Download the wheels once on a connected machine:

```
python -m pip download -d wheels PySide6-Essentials pillow openpyxl
```

Copy `wheels/` alongside the project, then on the target machine:

```
python bootstrap.py --offline wheels
```

## 2. Ship a standalone executable

Best when annotators should not have to think about Python at all.

```
python build/build_exe.py
```

The result lands in `dist/`. PyInstaller cannot cross-compile, so build on
each platform you need:

| Target | Build on | Result |
|---|---|---|
| Windows | Windows | `dist/ROI-Studio.exe` |
| macOS | macOS | `dist/ROI-Studio.app` |
| Linux | Linux | `dist/ROI-Studio` |

Use `--onedir` instead of the default single file when startup speed matters;
a one-file build unpacks itself on every launch.

Sign the result if your organisation requires it — unsigned binaries trigger
SmartScreen on Windows and Gatekeeper on macOS.

## 3. Install as a package

```
python -m pip install .
roi-studio
```

Useful when the machine already has a managed Python environment.

---

## Verifying a machine before anyone works on it

```
python run.py --check       # what is installed, what is missing
python run.py --selftest    # exercises the whole data path, no display needed
```

The self-test needs no display, so it also works over SSH and in CI.

## What the application writes where

| Location | Contents |
|---|---|
| the batch folder | the spreadsheet, JSON, report, `no_roi/`, `printed_roi/`, lock, audit log |
| the per-user config folder | settings, crash reports, recovery drafts |

The per-user path follows the platform convention (`%APPDATA%` on Windows,
`~/Library/Application Support` on macOS, `$XDG_CONFIG_HOME` or `~/.config` on
Linux) and falls back to a temporary directory if none of those can be
written. `python run.py --check` prints the resolved path.

Nothing else on the machine is touched.
