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
		text.width(newWidth); text.y(newHeight + 5);
	});
	updateIO();
	updateAllCables();
});

tr.on('transformend', () => { updateAllCables(); saveHistory(); });

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

stage.on('mousedown touchstart', (e) => {
	if (e.target === stage || e.target.hasName('grid-background')) {
		const pos = stage.getRelativePointerPosition();
		selectionStartPos = pos;
		selectionRect.setAttrs({ width: 0, height: 0, x: pos.x, y: pos.y, visible: true });
		if (!e.evt.shiftKey && !e.evt.ctrlKey) deselectAll();
	}
});

stage.on('mousemove touchmove', (e) => {
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
		dragLine.points([start.x, start.y, pos.x, pos.y]);
		dragLine.visible(true);
		tempLayer.batchDraw();
	}
});

window.addEventListener('mouseup', (e) => {
	if (selectionRect.visible()) {
		selectionRect.visible(false);
		const box = selectionRect.getClientRect();
		const gears = stage.find('.gear');
		let selected = gears.filter(g => Konva.Util.haveIntersection(box, g.getClientRect()));

		if (selected.length > 0) {
			if (e.shiftKey || e.ctrlKey) {
				const currentIds = selectedGears.map(g => g.id());
				selected.forEach(g => { if (!currentIds.includes(g.id())) selectedGears.push(g); });
			} else { selectedGears = selected; }
			updateSelectionUI();
		}
		tempLayer.draw();
	}
	if (activeAnchor) {
		const pos = stage.getRelativePointerPosition();
		const target = stage.find('.anchor').find(a => {
			const p = a.getAbsolutePosition(stage);
			return Math.sqrt((pos.x - p.x) ** 2 + (pos.y - p.y) ** 2) < 25 && a !== activeAnchor;
		});
		if (target) createCable(activeAnchor, target, []);
		activeAnchor = null;
		dragLine.visible(false);
		showAllAnchors(false);
		tempLayer.draw();
	}
});

// Shortcuts
window.addEventListener('keydown', (e) => {
	if (e.key === 'Delete' || e.key === 'Backspace') executeDelete();
	if (e.ctrlKey && e.key === 'c') copyGears();
	if (e.ctrlKey && e.key === 'v') pasteGears();
	if (e.ctrlKey && e.key === 'x') cutGears();
	// ctrl + e => center stage
	if (e.ctrlKey && e.key === 'e') { e.preventDefault(); centerStage(); stage.batchDraw(); }
	if (e.ctrlKey && e.key === 'a') { e.preventDefault(); selectedGears = stage.find('.gear'); updateSelectionUI(); }
	if (e.ctrlKey && e.key === 'z') { if (historyStep > 0) applyHistory(--historyStep); }
	if (e.ctrlKey && e.key === 'y') { if (historyStep < history.length - 1) applyHistory(++historyStep); }
});

stage.on('click tap', (e) => { if (e.target === stage) deselectAll(); });
window.addEventListener('resize', () => {
	stage.width(container.offsetWidth);
	stage.height(container.offsetHeight);
	drawGrid();
	updateAllCables();
});
stage.container().addEventListener('contextmenu', (e) => e.preventDefault());