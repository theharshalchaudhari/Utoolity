"""Side panels: the ROI list, the vertex inspector, batch stats and the minimap."""

from __future__ import annotations

from PySide6.QtCore import QPointF, QRectF, QSize, Qt, Signal
from PySide6.QtGui import QBrush, QColor, QPainter, QPen
from PySide6.QtWidgets import (QAbstractItemView, QFrame, QGridLayout,
                               QHBoxLayout, QHeaderView, QLabel, QListWidget,
                               QListWidgetItem, QPlainTextEdit, QTableWidget,
                               QTableWidgetItem, QToolButton, QVBoxLayout,
                               QWidget)

from ..config import SHAPE_CIRCLE, SHAPE_RECT
from . import icons
from .palette import qcolor


def section_label(text: str) -> QLabel:
    label = QLabel(text)
    label.setObjectName("SectionHeader")
    return label


def divider() -> QFrame:
    line = QFrame()
    line.setObjectName("Divider")
    line.setFixedHeight(1)
    return line


# ══════════════════════════════════════════════════════════════
class RoiListPanel(QWidget):
    """Every ROI on the current image, with per-row visibility and lock."""

    selectionRequested = Signal(int, bool)      # index, additive
    visibilityToggled = Signal(int, bool)
    lockToggled = Signal(int, bool)
    deleteRequested = Signal()
    duplicateRequested = Signal()

    def __init__(self, parent=None):
        super().__init__(parent)
        self._theme = {}
        self._updating = False

        layout = QVBoxLayout(self)
        layout.setContentsMargins(0, 0, 0, 0)
        layout.setSpacing(8)

        header = QHBoxLayout()
        header.setSpacing(6)
        header.addWidget(section_label("ROIs on this image"))
        header.addStretch(1)
        self.count_label = QLabel("0")
        self.count_label.setObjectName("Subtitle")
        header.addWidget(self.count_label)
        layout.addLayout(header)

        self.list = QListWidget()
        self.list.setSelectionMode(
            QAbstractItemView.SelectionMode.ExtendedSelection)
        self.list.setUniformItemSizes(True)
        self.list.setMinimumHeight(120)
        self.list.itemSelectionChanged.connect(self._emit_selection)
        self.list.itemClicked.connect(self._maybe_toggle)
        layout.addWidget(self.list, 1)

        actions = QHBoxLayout()
        actions.setSpacing(6)
        self.btn_visible = self._action("eye", "Show or hide the selected ROI")
        self.btn_lock = self._action("lock", "Lock the selected ROI so it "
                                             "cannot be moved")
        self.btn_duplicate = self._action("copy", "Duplicate the selected ROI")
        self.btn_delete = self._action("trash", "Delete the selected ROI")
        self.btn_visible.clicked.connect(self._toggle_visible)
        self.btn_lock.clicked.connect(self._toggle_lock)
        self.btn_duplicate.clicked.connect(self.duplicateRequested.emit)
        self.btn_delete.clicked.connect(self.deleteRequested.emit)
        for button in (self.btn_visible, self.btn_lock, self.btn_duplicate,
                       self.btn_delete):
            actions.addWidget(button)
        actions.addStretch(1)
        layout.addLayout(actions)

        self._shapes = []

    def _action(self, name, tip) -> QToolButton:
        button = QToolButton()
        button.setObjectName("Tool")
        button.setToolTip(tip)
        button.setIconSize(QSize(17, 17))
        button.setProperty("iconName", name)
        button.setAutoRaise(True)
        return button

    def set_theme(self, theme: dict) -> None:
        self._theme = dict(theme)
        for button in (self.btn_visible, self.btn_lock, self.btn_duplicate,
                       self.btn_delete):
            colour = theme["danger"] if button is self.btn_delete else theme["sub"]
            button.setIcon(icons.icon(button.property("iconName"), colour, 17))
        self.refresh(self._shapes, set())

    # ── content ───────────────────────────────────────────
    def refresh(self, shapes, selection) -> None:
        self._shapes = list(shapes or [])
        selection = set(selection or ())
        self._updating = True
        try:
            self.list.clear()
            theme = self._theme or {}
            for index, shape in enumerate(self._shapes):
                marks = []
                if not shape.visible:
                    marks.append("hidden")
                if shape.locked:
                    marks.append("locked")
                suffix = ("  ·  " + ", ".join(marks)) if marks else ""
                item = QListWidgetItem("ROI %d   %s%s"
                                       % (index + 1, shape.describe(), suffix))
                item.setData(Qt.ItemDataRole.UserRole, index)
                kind_icon = {SHAPE_RECT: "rect", SHAPE_CIRCLE: "circle"}.get(
                    shape.kind, "polygon")
                colour = theme.get("muted" if (shape.locked or not shape.visible)
                                   else "text", "#c8cdd6")
                item.setIcon(icons.icon(kind_icon, colour, 15))
                if not shape.visible or shape.locked:
                    item.setForeground(QBrush(qcolor(theme.get("muted",
                                                               "#6f7784"))))
                self.list.addItem(item)
                item.setSelected(index in selection)
            self.count_label.setText(str(len(self._shapes)))
        finally:
            self._updating = False
        self._sync_buttons(selection)

    def _sync_buttons(self, selection) -> None:
        has = bool(selection)
        for button in (self.btn_visible, self.btn_lock, self.btn_duplicate,
                       self.btn_delete):
            button.setEnabled(has)
        if has:
            index = sorted(selection)[0]
            if 0 <= index < len(self._shapes):
                shape = self._shapes[index]
                theme = self._theme or {}
                self.btn_visible.setIcon(icons.icon(
                    "eye" if shape.visible else "eye_off",
                    theme.get("sub", "#8b93a1"), 17))
                self.btn_lock.setIcon(icons.icon(
                    "lock" if not shape.locked else "unlock",
                    theme.get("sub", "#8b93a1"), 17))

    def selected_indices(self):
        return sorted(item.data(Qt.ItemDataRole.UserRole)
                      for item in self.list.selectedItems())

    def _emit_selection(self) -> None:
        if self._updating:
            return
        indices = self.selected_indices()
        self._sync_buttons(set(indices))
        if indices:
            self.selectionRequested.emit(indices[0], False)
            for index in indices[1:]:
                self.selectionRequested.emit(index, True)
        else:
            self.selectionRequested.emit(-1, False)

    def _maybe_toggle(self, _item) -> None:
        self._sync_buttons(set(self.selected_indices()))

    def _toggle_visible(self) -> None:
        for index in self.selected_indices():
            if 0 <= index < len(self._shapes):
                self.visibilityToggled.emit(index, not self._shapes[index].visible)

    def _toggle_lock(self) -> None:
        for index in self.selected_indices():
            if 0 <= index < len(self._shapes):
                self.lockToggled.emit(index, not self._shapes[index].locked)


# ══════════════════════════════════════════════════════════════
class VertexInspector(QWidget):
    """Numeric read-out and entry for the selected ROI's points."""

    vertexEdited = Signal(int, int, int, int)   # shape, vertex, x, y

    def __init__(self, parent=None):
        super().__init__(parent)
        self._index = -1
        self._updating = False

        layout = QVBoxLayout(self)
        layout.setContentsMargins(0, 0, 0, 0)
        layout.setSpacing(6)
        header = QHBoxLayout()
        header.addWidget(section_label("Vertices"))
        header.addStretch(1)
        self.hint = QLabel("-")
        self.hint.setObjectName("Subtitle")
        header.addWidget(self.hint)
        layout.addLayout(header)

        self.table = QTableWidget(0, 3)
        self.table.setHorizontalHeaderLabels(["#", "x", "y"])
        self.table.verticalHeader().setVisible(False)
        self.table.setEditTriggers(
            QAbstractItemView.EditTrigger.DoubleClicked
            | QAbstractItemView.EditTrigger.SelectedClicked)
        self.table.setSelectionBehavior(
            QAbstractItemView.SelectionBehavior.SelectRows)
        self.table.setAlternatingRowColors(True)
        self.table.setMaximumHeight(190)
        head = self.table.horizontalHeader()
        head.setDefaultAlignment(Qt.AlignmentFlag.AlignLeft
                                 | Qt.AlignmentFlag.AlignVCenter)
        head.setSectionResizeMode(0, QHeaderView.ResizeMode.ResizeToContents)
        head.setSectionResizeMode(1, QHeaderView.ResizeMode.Stretch)
        head.setSectionResizeMode(2, QHeaderView.ResizeMode.Stretch)
        self.table.itemChanged.connect(self._commit)
        layout.addWidget(self.table)

    def show_shape(self, index: int, shape) -> None:
        self._updating = True
        try:
            self._index = index
            self.table.setRowCount(0)
            if shape is None:
                self.hint.setText("no selection")
                return
            self.hint.setText("ROI %d  ·  %s" % (index + 1, shape.describe()))
            editable = not shape.is_editable_as_box() and not shape.locked
            self.table.setRowCount(len(shape.points))
            for row, (x, y) in enumerate(shape.points):
                number = QTableWidgetItem(str(row + 1))
                number.setFlags(Qt.ItemFlag.ItemIsEnabled)
                self.table.setItem(row, 0, number)
                for column, value in ((1, x), (2, y)):
                    cell = QTableWidgetItem(str(int(value)))
                    if not editable:
                        cell.setFlags(Qt.ItemFlag.ItemIsEnabled)
                    self.table.setItem(row, column, cell)
        finally:
            self._updating = False

    def _commit(self, item) -> None:
        if self._updating or self._index < 0 or item.column() == 0:
            return
        row = item.row()
        try:
            x = int(float(self.table.item(row, 1).text()))
            y = int(float(self.table.item(row, 2).text()))
        except (TypeError, ValueError, AttributeError):
            return
        self.vertexEdited.emit(self._index, row, x, y)


# ══════════════════════════════════════════════════════════════
class StatsPanel(QWidget):
    """Batch counters plus a segmented progress bar."""

    def __init__(self, parent=None):
        super().__init__(parent)
        self._theme = {}
        self._values = {"total": 0, "roi": 0, "no_roi": 0, "todo": 0}

        layout = QVBoxLayout(self)
        layout.setContentsMargins(0, 0, 0, 0)
        layout.setSpacing(8)
        layout.addWidget(section_label("Batch progress"))

        self.bar = _SegmentBar()
        layout.addWidget(self.bar)

        grid = QGridLayout()
        grid.setHorizontalSpacing(10)
        grid.setVerticalSpacing(4)
        self._labels = {}
        for column, (key, text) in enumerate((("total", "Images"),
                                              ("roi", "ROI drawn"),
                                              ("no_roi", "No ROI"),
                                              ("todo", "Remaining"))):
            value = QLabel("0")
            value.setObjectName("StatValue")
            caption = QLabel(text)
            caption.setObjectName("StatLabel")
            grid.addWidget(value, 0, column)
            grid.addWidget(caption, 1, column)
            self._labels[key] = value
        layout.addLayout(grid)

    def set_theme(self, theme: dict) -> None:
        self._theme = dict(theme)
        self.bar.set_theme(theme)
        self._recolour()

    def set_values(self, total, roi, no_roi, todo) -> None:
        self._values = {"total": total, "roi": roi, "no_roi": no_roi,
                        "todo": todo}
        for key, value in self._values.items():
            self._labels[key].setText(str(value))
        self.bar.set_values(roi, no_roi, todo)
        self._recolour()

    def _recolour(self) -> None:
        theme = self._theme or {}
        colours = {"total": theme.get("title", "#e9ecf1"),
                   "roi": theme.get("good", "#5cbf6b"),
                   "no_roi": theme.get("sub", "#8b93a1"),
                   "todo": theme.get("accent", "#df5e3b")}
        for key, label in self._labels.items():
            label.setStyleSheet("color: %s;" % colours[key])


class _SegmentBar(QWidget):
    """Three-part progress bar: drawn, no_roi, remaining."""

    def __init__(self, parent=None):
        super().__init__(parent)
        self.setFixedHeight(8)
        self._roi = self._no_roi = self._todo = 0
        self._theme = {}

    def set_theme(self, theme):
        self._theme = dict(theme)
        self.update()

    def set_values(self, roi, no_roi, todo):
        self._roi, self._no_roi, self._todo = int(roi), int(no_roi), int(todo)
        self.update()

    def paintEvent(self, event):
        theme = self._theme or {}
        painter = QPainter(self)
        painter.setRenderHint(QPainter.RenderHint.Antialiasing, True)
        painter.setPen(Qt.PenStyle.NoPen)
        radius = self.height() / 2.0
        track = QRectF(0, 0, self.width(), self.height())
        painter.setBrush(QBrush(qcolor(theme.get("surfaceAlt", "#252a33"))))
        painter.drawRoundedRect(track, radius, radius)

        total = self._roi + self._no_roi + self._todo
        if total <= 0:
            painter.end()
            return
        segments = ((self._roi, theme.get("good", "#5cbf6b")),
                    (self._no_roi, theme.get("sub", "#8b93a1")),
                    (self._todo, theme.get("border", "#333a45")))
        x = 0.0
        for count, colour in segments:
            if count <= 0:
                continue
            width = self.width() * count / float(total)
            painter.setBrush(QBrush(qcolor(colour)))
            painter.drawRoundedRect(QRectF(x, 0, max(width - 1.5, 1.5),
                                           self.height()), radius, radius)
            x += width
        painter.end()


# ══════════════════════════════════════════════════════════════
class CommentBox(QWidget):
    """The per-image note."""

    def __init__(self, parent=None):
        super().__init__(parent)
        layout = QVBoxLayout(self)
        layout.setContentsMargins(0, 0, 0, 0)
        layout.setSpacing(6)
        layout.addWidget(section_label("Image comment"))
        self.editor = QPlainTextEdit()
        self.editor.setPlaceholderText("Saved with this image")
        self.editor.setFixedHeight(70)
        self.editor.setTabChangesFocus(True)
        layout.addWidget(self.editor)

    def text(self) -> str:
        return self.editor.toPlainText().strip()

    def set_text(self, value) -> None:
        blocked = self.editor.blockSignals(True)
        self.editor.setPlainText(str(value or ""))
        self.editor.blockSignals(blocked)

    def clear(self) -> None:
        self.set_text("")


# ══════════════════════════════════════════════════════════════
class MiniMap(QWidget):
    """A thumbnail of the whole image with the viewport drawn on it."""

    navigateTo = Signal(QPointF)                 # image coordinates

    def __init__(self, parent=None):
        super().__init__(parent)
        self.setFixedHeight(104)
        self.setCursor(Qt.CursorShape.PointingHandCursor)
        self._pixmap = None
        self._image_size = (0, 0)
        self._view = QRectF()
        self._theme = {}
        self._shapes = []

    def set_theme(self, theme):
        self._theme = dict(theme)
        self.update()

    def set_image(self, pixmap, image_size) -> None:
        if pixmap is None or pixmap.isNull():
            self._pixmap = None
        else:
            self._pixmap = pixmap.scaled(
                self.width() * 2 or 320, self.height() * 2,
                Qt.AspectRatioMode.KeepAspectRatio,
                Qt.TransformationMode.SmoothTransformation)
        self._image_size = tuple(image_size or (0, 0))
        self.update()

    def set_view(self, rect: QRectF, shapes=None) -> None:
        self._view = QRectF(rect)
        self._shapes = list(shapes or [])
        self.update()

    def _draw_rect(self) -> QRectF:
        w, h = self._image_size
        if not w or not h:
            return QRectF()
        available = QRectF(4, 4, self.width() - 8, self.height() - 8)
        scale = min(available.width() / w, available.height() / h)
        width, height = w * scale, h * scale
        return QRectF(available.center().x() - width / 2.0,
                      available.center().y() - height / 2.0, width, height)

    def mousePressEvent(self, event):
        self._navigate(event)

    def mouseMoveEvent(self, event):
        if event.buttons() & Qt.MouseButton.LeftButton:
            self._navigate(event)

    def _navigate(self, event) -> None:
        area = self._draw_rect()
        if area.isEmpty():
            return
        w, h = self._image_size
        x = (event.position().x() - area.left()) / area.width() * w
        y = (event.position().y() - area.top()) / area.height() * h
        self.navigateTo.emit(QPointF(max(0.0, min(float(w), x)),
                                     max(0.0, min(float(h), y))))

    def paintEvent(self, event):
        theme = self._theme or {}
        painter = QPainter(self)
        painter.setRenderHint(QPainter.RenderHint.Antialiasing, True)
        painter.setRenderHint(QPainter.RenderHint.SmoothPixmapTransform, True)
        area = self._draw_rect()
        if self._pixmap is None or area.isEmpty():
            painter.setPen(QPen(qcolor(theme.get("muted", "#6f7784"))))
            painter.drawText(self.rect(), Qt.AlignmentFlag.AlignCenter, "-")
            painter.end()
            return

        painter.drawPixmap(area, self._pixmap, QRectF(self._pixmap.rect()))
        w, h = self._image_size
        scale_x = area.width() / float(w)
        scale_y = area.height() / float(h)

        if self._shapes:
            pen = QPen(qcolor(theme.get("accent", "#df5e3b")), 1)
            painter.setPen(pen)
            painter.setBrush(Qt.BrushStyle.NoBrush)
            for shape in self._shapes:
                x0, y0, x1, y1 = shape.bounds
                painter.drawRect(QRectF(area.left() + x0 * scale_x,
                                        area.top() + y0 * scale_y,
                                        max(1.0, (x1 - x0) * scale_x),
                                        max(1.0, (y1 - y0) * scale_y)))

        if not self._view.isEmpty():
            view = QRectF(area.left() + self._view.left() * scale_x,
                          area.top() + self._view.top() * scale_y,
                          self._view.width() * scale_x,
                          self._view.height() * scale_y)
            shade = QColor(0, 0, 0, 90)
            painter.setPen(Qt.PenStyle.NoPen)
            painter.setBrush(QBrush(shade))
            for piece in (QRectF(area.left(), area.top(), area.width(),
                                 max(0.0, view.top() - area.top())),
                          QRectF(area.left(), view.bottom(), area.width(),
                                 max(0.0, area.bottom() - view.bottom())),
                          QRectF(area.left(), view.top(),
                                 max(0.0, view.left() - area.left()),
                                 view.height()),
                          QRectF(view.right(), view.top(),
                                 max(0.0, area.right() - view.right()),
                                 view.height())):
                if piece.width() > 0 and piece.height() > 0:
                    painter.drawRect(piece)
            painter.setBrush(Qt.BrushStyle.NoBrush)
            painter.setPen(QPen(qcolor(theme.get("onAccent", "#ffffff")), 1.4))
            painter.drawRect(view)

        painter.setPen(QPen(qcolor(theme.get("border", "#333a45")), 1))
        painter.setBrush(Qt.BrushStyle.NoBrush)
        painter.drawRect(area)
        painter.end()
