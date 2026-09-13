"""Vector icons.

Each icon is a small SVG path set drawn on a 24x24 grid and rendered at the
requested size, so they stay crisp on any display scale instead of being
hand-plotted a few pixels at a time.  Colour is injected at render time so
one definition serves both themes and the accent state.
"""

from __future__ import annotations

from PySide6.QtCore import QByteArray, QRectF, Qt
from PySide6.QtGui import QIcon, QPainter, QPixmap
from PySide6.QtSvg import QSvgRenderer

# Stroke-based icons: {name: svg body drawn in a 24x24 viewBox}
_BODY = {
    "folder": '<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z"/>',
    "polygon": '<path d="M12 3.5 20.5 9.5 17.5 19.5 6.5 19.5 3.5 9.5Z"/>',
    "rect": '<rect x="4" y="6" width="16" height="12" rx="1.5"/>',
    "circle": '<circle cx="12" cy="12" r="7.5"/>',
    "lasso": '<ellipse cx="12" cy="9.5" rx="7.5" ry="5.5"/>'
             '<path d="M8.6 14.4c-.5 1-1.4 1.7-1.4 3 0 1 .6 1.9 1.5 2.3"/>',
    "cursor": '<path d="M5.5 3.5 19 11.5l-5.8 1.4L10.9 19Z"/>',
    "hand": '<path d="M8 12V6.5a1.5 1.5 0 0 1 3 0V11m0-.5V5.5a1.5 1.5 0 0 1 3 0V11m0-.5v-1a1.5 1.5 0 0 1 3 0V15a5 5 0 0 1-5 5h-1a5 5 0 0 1-5-5v-3a1.5 1.5 0 0 1 3 0"/>',
    "undo": '<path d="M4 10h9a5 5 0 0 1 0 10h-3"/><path d="M8 5.5 3.5 10 8 14.5"/>',
    "redo": '<path d="M20 10h-9a5 5 0 0 0 0 10h3"/><path d="M16 5.5 20.5 10 16 14.5"/>',
    "save": '<path d="M5 4h11l3 3v13H5Z"/><path d="M8 4v6h7V4"/><rect x="8" y="13" width="8" height="7"/>',
    "trash": '<path d="M4 7h16"/><path d="M10 4h4"/><path d="M6 7l1 13h10l1-13"/><path d="M10 11v6M14 11v6"/>',
    "copy": '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/>',
    "clear": '<path d="M4 4 20 20M20 4 4 20"/>',
    "zoom_in": '<circle cx="10.5" cy="10.5" r="6.5"/><path d="M15.5 15.5 21 21"/><path d="M10.5 7.5v6M7.5 10.5h6"/>',
    "zoom_out": '<circle cx="10.5" cy="10.5" r="6.5"/><path d="M15.5 15.5 21 21"/><path d="M7.5 10.5h6"/>',
    "zoom_fit": '<path d="M4 9V5.5A1.5 1.5 0 0 1 5.5 4H9"/><path d="M15 4h3.5A1.5 1.5 0 0 1 20 5.5V9"/><path d="M20 15v3.5a1.5 1.5 0 0 1-1.5 1.5H15"/><path d="M9 20H5.5A1.5 1.5 0 0 1 4 18.5V15"/>',
    "settings": '<circle cx="12" cy="12" r="3"/><path d="M12 3v2.5M12 18.5V21M21 12h-2.5M5.5 12H3M18.4 5.6l-1.8 1.8M7.4 16.6l-1.8 1.8M18.4 18.4l-1.8-1.8M7.4 7.4 5.6 5.6"/>',
    "help": '<circle cx="12" cy="12" r="8.5"/><path d="M9.6 9.4a2.5 2.5 0 0 1 4.9.6c0 1.7-2.5 2.1-2.5 3.7"/><circle cx="12" cy="17" r="0.9" fill="currentColor" stroke="none"/>',
    "comment": '<path d="M4 6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H9l-5 4Z"/>',
    "list": '<path d="M4 7h16M4 12h16M4 17h10"/>',
    "next": '<path d="M9 5.5 15.5 12 9 18.5"/>',
    "prev": '<path d="M15 5.5 8.5 12 15 18.5"/>',
    "check": '<path d="M4.5 12.5 9.5 17.5 19.5 6.5"/>',
    "cross": '<path d="M6 6l12 12M18 6 6 18"/>',
    "no_roi": '<circle cx="12" cy="12" r="8.5"/><path d="M6.5 17.5 17.5 6.5"/>',
    "export": '<path d="M12 15V4"/><path d="M8 8l4-4 4 4"/><path d="M4 15v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3"/>',
    "import": '<path d="M12 4v11"/><path d="M8 11l4 4 4-4"/><path d="M4 15v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3"/>',
    "report": '<rect x="4.5" y="3.5" width="15" height="17" rx="2"/><path d="M8 9h8M8 13h8M8 17h5"/>',
    "review": '<rect x="3" y="5" width="8" height="14" rx="1.5"/><rect x="13" y="5" width="8" height="14" rx="1.5"/>',
    "lock": '<rect x="5" y="10" width="14" height="10" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',
    "unlock": '<rect x="5" y="10" width="14" height="10" rx="2"/><path d="M8 10V7a4 4 0 0 1 7.3-2.2"/>',
    "eye": '<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z"/><circle cx="12" cy="12" r="3"/>',
    "eye_off": '<path d="M4 4l16 16"/><path d="M9.5 9.6A3 3 0 0 0 12 15a3 3 0 0 0 2.4-1.2"/><path d="M6.6 6.8C4 8.5 2.5 12 2.5 12S6 18.5 12 18.5c1.6 0 3-.4 4.2-1M17.6 15.2c2.4-1.7 3.9-3.2 3.9-3.2S18 5.5 12 5.5c-.7 0-1.3.1-2 .2"/>',
    "rotate": '<path d="M20 12a8 8 0 1 1-2.6-5.9"/><path d="M20 4v4.5h-4.5"/>',
    "align_left": '<path d="M4 3v18"/><rect x="7" y="6" width="11" height="4" rx="1"/><rect x="7" y="14" width="7" height="4" rx="1"/>',
    "align_top": '<path d="M3 4h18"/><rect x="6" y="7" width="4" height="11" rx="1"/><rect x="14" y="7" width="4" height="7" rx="1"/>',
    "distribute": '<path d="M3 3v18M21 3v18"/><rect x="8" y="9" width="8" height="6" rx="1"/>',
    "grid": '<rect x="3.5" y="3.5" width="7" height="7" rx="1.5"/><rect x="13.5" y="3.5" width="7" height="7" rx="1.5"/><rect x="3.5" y="13.5" width="7" height="7" rx="1.5"/><rect x="13.5" y="13.5" width="7" height="7" rx="1.5"/>',
    "search": '<circle cx="10.5" cy="10.5" r="6.5"/><path d="M15.5 15.5 21 21"/>',
    "sun": '<circle cx="12" cy="12" r="4.5"/><path d="M12 2.5v2M12 19.5v2M21.5 12h-2M4.5 12h-2M18.7 5.3l-1.4 1.4M6.7 17.3l-1.4 1.4M18.7 18.7l-1.4-1.4M6.7 6.7 5.3 5.3"/>',
    "moon": '<path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5Z"/>',
    "keyboard": '<rect x="2.5" y="6" width="19" height="12" rx="2"/><path d="M6 9.5h.01M9.5 9.5h.01M13 9.5h.01M16.5 9.5h.01M6 13h.01M9.5 13h4.5M17.5 13h.01"/>',
    "command": '<path d="M9 3a3 3 0 1 0 0 6h6a3 3 0 1 0 0-6 3 3 0 0 0-3 3v12a3 3 0 1 1-3-3h6a3 3 0 1 1 3 3"/>',
    "history": '<path d="M3.5 12a8.5 8.5 0 1 0 2.6-6.1"/><path d="M3.5 4v4.5H8"/><path d="M12 8v4.5l3 1.8"/>',
    "warning": '<path d="M12 4 21 19.5H3Z"/><path d="M12 10v4"/><circle cx="12" cy="17" r="0.9" fill="currentColor" stroke="none"/>',
    "info": '<circle cx="12" cy="12" r="8.5"/><path d="M12 11v5.5"/><circle cx="12" cy="8" r="0.9" fill="currentColor" stroke="none"/>',
    "plus": '<path d="M12 5v14M5 12h14"/>',
    "minus": '<path d="M5 12h14"/>',
    "refresh": '<path d="M20.5 11A8.5 8.5 0 0 0 6 6.5L3.5 9"/><path d="M3.5 13A8.5 8.5 0 0 0 18 17.5L20.5 15"/><path d="M3.5 4.5V9H8M20.5 19.5V15H16"/>',
}

_TEMPLATE = (
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" '
    'width="{size}" height="{size}" fill="none" stroke="{colour}" '
    'stroke-width="{weight}" stroke-linecap="round" stroke-linejoin="round" '
    'color="{colour}">{body}</svg>'
)

_CACHE = {}


def available():
    return sorted(_BODY)


def svg_text(name: str, colour: str = "#000000", size: int = 24,
             weight: float = 1.8) -> str:
    body = _BODY.get(name)
    if body is None:
        body = _BODY["info"]
    return _TEMPLATE.format(size=size, colour=colour, weight=weight, body=body)


def pixmap(name: str, colour: str, size: int = 20, weight: float = 1.8,
           ratio: float = 1.0) -> QPixmap:
    key = (name, colour, int(size), round(weight, 2), round(ratio, 2))
    cached = _CACHE.get(key)
    if cached is not None:
        return cached

    scale = max(1.0, float(ratio))
    px = QPixmap(int(size * scale), int(size * scale))
    px.setDevicePixelRatio(scale)
    px.fill(Qt.GlobalColor.transparent)
    try:
        renderer = QSvgRenderer(QByteArray(
            svg_text(name, colour, size, weight).encode("utf-8")))
        painter = QPainter(px)
        painter.setRenderHint(QPainter.RenderHint.Antialiasing, True)
        # The pixmap carries a device pixel ratio, so the painter already
        # works in logical units - the target rect is the logical size, not
        # the device size, or the glyph is drawn oversized and clipped.
        renderer.render(painter, QRectF(0, 0, size, size))
        painter.end()
    except Exception:
        pass
    _CACHE[key] = px
    return px


def icon(name: str, colour: str, size: int = 20, weight: float = 1.8,
         ratio: float = 2.0) -> QIcon:
    """A QIcon rendered at 2x by default, so it stays sharp when scaled."""
    result = QIcon()
    result.addPixmap(pixmap(name, colour, size, weight, ratio))
    return result


def dual_icon(name: str, normal: str, active: str, size: int = 20,
              weight: float = 1.8) -> QIcon:
    """An icon that switches colour when its button is checked or pressed."""
    result = QIcon()
    result.addPixmap(pixmap(name, normal, size, weight, 2.0),
                     QIcon.Mode.Normal, QIcon.State.Off)
    result.addPixmap(pixmap(name, active, size, weight, 2.0),
                     QIcon.Mode.Normal, QIcon.State.On)
    result.addPixmap(pixmap(name, active, size, weight, 2.0),
                     QIcon.Mode.Active, QIcon.State.On)
    result.addPixmap(pixmap(name, normal, size, weight, 2.0),
                     QIcon.Mode.Active, QIcon.State.Off)
    return result


def app_icon(accent: str = "#df5e3b", background: str = "#14171d") -> QIcon:
    """The window and taskbar icon: the polygon mark on a rounded tile."""
    result = QIcon()
    for size in (16, 24, 32, 48, 64, 128, 256):
        svg = (
            '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" '
            'width="{s}" height="{s}">'
            '<rect width="64" height="64" rx="14" fill="{bg}"/>'
            '<path d="M32 12 52 26 44.5 50 19.5 50 12 26Z" fill="none" '
            'stroke="{fg}" stroke-width="4" stroke-linejoin="round"/>'
            '<circle cx="32" cy="12" r="4.5" fill="{fg}"/>'
            '<circle cx="52" cy="26" r="4.5" fill="{fg}"/>'
            '<circle cx="44.5" cy="50" r="4.5" fill="{fg}"/>'
            '<circle cx="19.5" cy="50" r="4.5" fill="{fg}"/>'
            '<circle cx="12" cy="26" r="4.5" fill="{fg}"/>'
            '</svg>'
        ).format(s=size, bg=background, fg=accent)
        px = QPixmap(size, size)
        px.fill(Qt.GlobalColor.transparent)
        try:
            renderer = QSvgRenderer(QByteArray(svg.encode("utf-8")))
            painter = QPainter(px)
            painter.setRenderHint(QPainter.RenderHint.Antialiasing, True)
            renderer.render(painter, QRectF(0, 0, size, size))
            painter.end()
        except Exception:
            continue
        result.addPixmap(px)
    return result


def clear_cache() -> None:
    _CACHE.clear()
