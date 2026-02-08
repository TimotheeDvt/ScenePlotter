// Transformer Event
tr.on('transform', () => {
	selectedGears.forEach(gear => {
		const img = gear.findOne('.icon');
		const text = gear.findOne('Text');
		const newWidth = img.width() * img.scaleX();
		const newHeight = img.height() * img.scaleY();

		if (selectedGears.length === 1) {
			document.getElementById('prop-size-cm').value = (newWidth / PX_PER_CM).toFixed(1);
		}

		img.width(newWidth); img.height(newHeight); img.scaleX(1); img.scaleY(1);
		text.width(newWidth); text.y(newHeight + 50);
	});
	updateIO();
	updateAllCables();
});

tr.on('transformend', () => { updateAllCables(); saveHistory(); });

tr.on('dragmove', (e) => {
	selectedGears.forEach(g => {
		const cableObj = cables.find(c => c.fromId.includes(g.id()) || c.toId.includes(g.id()));

		if (cableObj && cableObj.handles.length > 0) {
			cableObj.handles.forEach(h => {
				h.x(h.x() + e.evt.movementX / stage.scaleX());
				h.y(h.y() + e.evt.movementY / stage.scaleY());
			});
		}
	});

	updateAllCables();
});

// Zoom
stage.on('wheel', (e) => {
	e.evt.preventDefault();
	const oldScale = stage.scaleX();
	const pointer = stage.getPointerPosition();
	const mousePointTo = { x: (pointer.x - stage.x()) / oldScale, y: (pointer.y - stage.y()) / oldScale };
	const newScale = e.evt.deltaY < 0 ? oldScale * 1.1 : oldScale / 1.1;

	if (newScale > 0 && newScale < Infinity) {
		stage.scale({ x: newScale, y: newScale });
		const newPos = { x: pointer.x - mousePointTo.x * newScale, y: pointer.y - mousePointTo.y * newScale };
		stage.position(newPos);
		stage.batchDraw();
	}
});

// Canvas Drag (Middle click)
stage.container().addEventListener('mousedown', (e) => {
	if (e.button === 1) stage.startDrag();
});

// Selection Rect & Cable Drawing Logic
let selectionRect = new Konva.Rect({ fill: 'rgba(0, 122, 204, 0.3)', stroke: '#007acc', strokeWidth: 1, visible: false, listening: false });
tempLayer.add(selectionRect);

stage.on('mousedown', (e) => {

	if (e.evt.shiftKey) {
		const pos = stage.getRelativePointerPosition();
		isMeasuring = true; // <--- Crucial : il manquait cette ligne

		const local_snap_size = SNAP_SIZE / 2;
		selectionStartPos = {
			x: Math.round(pos.x / local_snap_size) * local_snap_size,
			y: Math.round(pos.y / local_snap_size) * local_snap_size
		};

		// Préparation visuelle
		measurementStartCircle.position(selectionStartPos).visible(true);
		measurementEndCircle.position(selectionStartPos).visible(true);
		measurementLine.points([selectionStartPos.x, selectionStartPos.y, selectionStartPos.x, selectionStartPos.y]).visible(true);
		measurementText.text('0.00 cm').visible(true);

		tempLayer.draw();
		return; // On arrête ici pour ne pas déclencher la sélection
	}

	if (e.target !== stage) return;

	const pos = stage.getRelativePointerPosition();

	if (e.evt.button != 0) return;

	if (selectedGears.length > 0) {
		const selectionBox = tr.getClientRect();

		if (pos.x >= selectionBox.x && pos.x <= selectionBox.x + selectionBox.width &&
			pos.y >= selectionBox.y && pos.y <= selectionBox.y + selectionBox.height) {
			return;
		}
	}

	if (!e.evt.ctrlKey && !e.evt.shiftKey) {
		selectedGears = [];
		cables.forEach(c => {
			c.isSelected = false;
			c.line.strokeWidth(40);
			if (c.handlesGroup) c.handlesGroup.visible(false);
		});
		tr.nodes([]);
		updateSelectionUI();
	}
	selectionStartPos = pos;
	selectionRect.visible(true);
	selectionRect.width(0);
	selectionRect.height(0);
	tempLayer.draw();
});

stage.on('mousemove touchmove', (e) => {
	if (isMeasuring) {
		const pos = stage.getRelativePointerPosition();

		const local_snap_size = SNAP_SIZE / 2;
		const snappedX = Math.round(pos.x / local_snap_size) * local_snap_size;
		const snappedY = Math.round(pos.y / local_snap_size) * local_snap_size;

		measurementLine.points([selectionStartPos.x, selectionStartPos.y, snappedX, snappedY]);

		measurementEndCircle.position({ x: snappedX, y: snappedY });

		const dx = snappedX - selectionStartPos.x;
		const dy = snappedY - selectionStartPos.y;
		const distancePx = Math.sqrt(dx * dx + dy * dy);
		const distanceCm = (distancePx / PX_PER_CM);
		let length;
		const lengthCm = parseFloat(distanceCm);
		if (lengthCm >= 100) {
			const meters = Math.floor(lengthCm / 100);
			const centimeters = Math.round(lengthCm % 100);
			if (meters > 0 && centimeters > 0) {
				length = `${meters} m ${centimeters} cm`;
			} else if (meters > 0) {
				length = `${meters} m`;
			} else {
				length = `${centimeters} cm`;
			}
		} else {
			length = `${Math.round(lengthCm)} cm`;
		}

		measurementText.text(length);
		measurementText.position({ x: snappedX + 100, y: snappedY - 150 });

		tempLayer.batchDraw();
		return;
	}
	if (selectionRect.visible()) {
		const pos = stage.getRelativePointerPosition();
		selectionRect.setAttrs({
			x: Math.min(pos.x, selectionStartPos.x),
			y: Math.min(pos.y, selectionStartPos.y),
			width: Math.abs(pos.x - selectionStartPos.x),
			height: Math.abs(pos.y - selectionStartPos.y),
		});
		tempLayer.batchDraw();
	}
	if (activeAnchor) {
		const pos = stage.getRelativePointerPosition();
		const start = activeAnchor.getAbsolutePosition(stage);

		const familyColor = CABLE_FAMILIES[activeAnchor.family]
			? CABLE_FAMILIES[activeAnchor.family].color
			: '#ffffff';

		dragLine.points([start.x, start.y, pos.x, pos.y]);
		dragLine.stroke(familyColor);
		dragLine.visible(true);
		tempLayer.batchDraw();
	}
});

window.addEventListener('mouseup', (e) => {
	if (isMeasuring) {
		isMeasuring = false;
		measurementStartCircle.visible(false);
		measurementEndCircle.visible(false);
		measurementLine.visible(false);
		measurementText.visible(false);
		tempLayer.draw();
	}
	if (selectionRect.visible()) {
		selectionRect.visible(false);

		if (selectionRect.width() < 2 && selectionRect.height() < 2) {
            tempLayer.draw();
            return;
        }
		const box = selectionRect.getClientRect();

		const gears = stage.find('.gear');
		const notes = stage.find('.free-text');

		let newlySelectedElements = [...gears, ...notes].filter(el =>
			Konva.Util.haveIntersection(box, el.getClientRect())
		);

		cables.forEach(c => {
			const isIntersecting = Konva.Util.haveIntersection(box, c.line.getClientRect());

			if (isIntersecting) {
				c.isSelected = true;
				c.line.strokeWidth(80);
				if (c.handlesGroup) c.handlesGroup.visible(true);
				if (!newlySelectedElements.includes(c.line)) newlySelectedElements.push(c.line);
			} else if (!e.shiftKey && !e.ctrlKey) {
				c.isSelected = false;
				c.line.strokeWidth(40);
				if (c.handlesGroup) c.handlesGroup.visible(false);
			}
		});

		if (e.shiftKey || e.ctrlKey) {
			newlySelectedElements.forEach(el => {
				if (!selectedGears.includes(el)) selectedGears.push(el);
			});
		} else {
			selectedGears = newlySelectedElements;
		}

		updateSelectionUI();

		tempLayer.draw();
		mainLayer.draw();
	}
	if (activeAnchor) {
		const pos = stage.getRelativePointerPosition();
		const target = stage.find('.anchor').find(a => {
			const p = a.getAbsolutePosition(stage);
			return Math.sqrt((pos.x - p.x) ** 2 + (pos.y - p.y) ** 2) < ANCHOR_HIT_RADIUS && a !== activeAnchor;
		});
		if (target) createCable(activeAnchor, target, []);
		activeAnchor = null;
		dragLine.visible(false);
		dragLine.stroke('#FFFFFF');
		showAllAnchors(false);
		tempLayer.batchDraw();
	}
});

// Shortcuts
window.addEventListener('keydown', (e) => {
	if (e.key === 'Delete' || e.key === 'Backspace') {
		e.preventDefault();
		const activeEl = document.activeElement;
		const isTyping = activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA';
		if (isTyping) return;
		executeDelete();
	}
	if (e.ctrlKey && e.key === 'c') copyGears();
	if (e.ctrlKey && e.key === 'v') pasteGears();
	if (e.ctrlKey && e.key === 'x') cutGears();
	if (e.ctrlKey && e.key === 'e') { e.preventDefault(); centerStage(); stage.batchDraw(); }
	if (e.ctrlKey && e.key === 'a') {
		e.preventDefault();
		selectedGears = [...stage.find('.gear'), ...stage.find('.free-text')];
		cables.forEach(c => {
			c.isSelected = true;
			c.line.strokeWidth(80);
			if (c.handlesGroup) c.handlesGroup.visible(true);
		});

		updateSelectionUI();
		mainLayer.batchDraw();
	}
	if (e.ctrlKey && e.key === 'z') { e.preventDefault(); return; if (historyStep > 0) applyHistory(--historyStep); }
	if (e.ctrlKey && e.key === 'y') { return; if (historyStep < history.length - 1) applyHistory(++historyStep); }
	if (e.key === 'Escape') {
		const help = document.getElementById('help-modal');
		if (help && !help.classList.contains('hidden')) help.classList.add('hidden');
		deselectAll();
	}
	if (e.ctrlKey && e.key === 's') {
		e.preventDefault();
		saveStage();
	}
});

stage.on('click tap', (e) => { if (e.target === stage) deselectAll(); });
window.addEventListener('resize', () => {
	stage.width(container.offsetWidth);
	stage.height(container.offsetHeight);
	drawGrid();
	updateAllCables();
});
stage.container().addEventListener('contextmenu', (e) => e.preventDefault());