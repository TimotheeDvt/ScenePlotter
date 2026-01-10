function updateAllCables() {
	cables.forEach(c => c.redraw());
	mainLayer.batchDraw();
}

function createCable(startAnchor, endAnchor, midPoints = [], labelTxt = "", orthoInverse = false) {
	if (startAnchor.getParent() === endAnchor.getParent()) {
		return;
	}
	const isStartOccupied = cables.some(c => c.fromId === startAnchor.id() || c.toId === startAnchor.id());
	const isEndOccupied = cables.some(c => c.fromId === endAnchor.id() || c.toId === endAnchor.id());

	if (isStartOccupied || isEndOccupied) {
		return;
	}

	if (startAnchor.family !== endAnchor.family) {
		return;
	}
	if (startAnchor.iotype === endAnchor.iotype && startAnchor.family !== 'aes') {
		return;
	}

	const family = startAnchor.family;
	const color = CABLE_FAMILIES[family].color;

	const catGroupStart = startAnchor.getParent().getParent();
	const catGroupEnd = endAnchor.getParent().getParent();

	let targetCategoryGroup = catGroupStart;

	if (catGroupEnd.name() === "Instruments" || catGroupStart.name() === "Instruments") {
		targetCategoryGroup = categoryGroups["Instruments"];
	} else {
		targetCategoryGroup = catGroupStart;
	}

	const line = new Konva.Line({
		stroke: color,
		strokeWidth: 40,
		lineCap: 'round',
		lineJoin: 'round',
		hitStrokeWidth: 200
	});
	const handlesGroup = new Konva.Group({ visible: false });
	const cableObj = { line, fromId: startAnchor.id(), toId: endAnchor.id(), handles: [], isSelected: false, label: null, orthoInverse };

	if (labelTxt) {
		cableObj.label = new Konva.Text({ text: labelTxt, fontSize: 110, fill: 'white', fontStyle: 'italic' });
		targetCategoryGroup.add(cableObj.label);
	}

	function redraw() { cableRedraw(cableObj, line, isOrtho); }

	line.on('contextmenu', (e) => {
		e.evt.preventDefault();
		if (isOrtho) { cableObj.orthoInverse = !cableObj.orthoInverse; redraw(); saveHistory(); }
	});

	line.on('dblclick', () => {
		const p = stage.getRelativePointerPosition();
		addHandleToCable(cableObj, handlesGroup, p.x, p.y, redraw);
	});

	line.on('click', (e) => { e.cancelBubble = true; selectCable(cableObj); });

	midPoints.forEach(p => addHandleToCable(cableObj, handlesGroup, p.x, p.y, redraw, true));

	targetCategoryGroup.add(line);
	line.moveToBottom();
	tempLayer.add(handlesGroup);
	cableObj.redraw = redraw;
	cableObj.handlesGroup = handlesGroup;
	cables.push(cableObj);
	redraw();
	saveHistory();
}

function addHandleToCable(cableObj, group, x, y, redraw, isInit = false) {
	const h = new Konva.Circle({
		x: Math.round(x / SNAP_SIZE) * SNAP_SIZE,
		y: Math.round(y / SNAP_SIZE) * SNAP_SIZE,
		radius: 60, fill: '#f1c40f', stroke: 'white', strokeWidth: 10, draggable: true
	});

	h.on('dragmove', () => {
		h.position({ x: Math.round(h.x() / SNAP_SIZE) * SNAP_SIZE, y: Math.round(h.y() / SNAP_SIZE) * SNAP_SIZE });
		redraw();
	});

	h.on('contextmenu', (e) => {
		e.evt.preventDefault(); h.destroy();
		cableObj.handles = cableObj.handles.filter(handle => handle !== h);
		const length = calculateCableLength(cableObj);
		const lengthInput = document.getElementById('cable-length');
		if (lengthInput) {
			const lengthCm = parseFloat(length);
			if (lengthCm >= 100) {
				const meters = Math.floor(lengthCm / 100);
				const centimeters = Math.round(lengthCm % 100);
				lengthInput.value = `${meters} m ${centimeters} cm`;
			} else {
				lengthInput.value = `${Math.round(lengthCm)} cm`;
			}
		}
		redraw();
	});

	if (!isInit) {
		const sn = stage.findOne('#' + cableObj.fromId).getAbsolutePosition(stage);
		const en = stage.findOne('#' + cableObj.toId).getAbsolutePosition(stage);
		let allPoints = [{ x: sn.x, y: sn.y }, ...cableObj.handles.map(handle => ({ x: handle.x(), y: handle.y() })), { x: en.x, y: en.y }];
		let insertIndex = 0; let minDist = Infinity;
		for (let i = 0; i < allPoints.length - 1; i++) {
			let dist = distToSegment({ x: h.x(), y: h.y() }, allPoints[i], allPoints[i + 1]);
			if (dist < minDist) { minDist = dist; insertIndex = i; }
		}
		cableObj.handles.splice(insertIndex, 0, h);
	} else {
		cableObj.handles.push(h);
	}
	group.add(h);
}

function cableRedraw(cableObj, line, isOrtho) {
	const sn = stage.findOne('#' + cableObj.fromId);
	const en = stage.findOne('#' + cableObj.toId);
	if (!sn || !en) return;

	const startPos = sn.getAbsolutePosition(stage);
	const endPos = en.getAbsolutePosition(stage);
	let pts = [startPos.x, startPos.y];
	cableObj.handles.forEach(h => pts.push(h.getAbsolutePosition(stage).x, h.getAbsolutePosition(stage).y));
	pts.push(endPos.x, endPos.y);

	line.strokeLinearGradientStartPoint({ x: startPos.x, y: startPos.y });
	line.strokeLinearGradientEndPoint({ x: endPos.x, y: endPos.y });
	line.strokeLinearGradientColorStops([0, sn.fill(), 1, en.fill()]);
	line.points(isOrtho ? getOrthoPoints(pts, cableObj.orthoInverse) : pts);

	if (cableObj.label) {
		cableObj.label.position({ x: (startPos.x + endPos.x) / 2, y: (startPos.y + endPos.y) / 2 - 15 });
	}

	if (selectedCable === cableObj) {
		const lengthInput = document.getElementById('cable-length');
		if (lengthInput) {
			const length = calculateCableLength(cableObj);
			const lengthCm = parseFloat(length);
			if (lengthCm >= 100) {
				const meters = Math.floor(lengthCm / 100);
				const centimeters = Math.round(lengthCm % 100);
				lengthInput.value = `${meters} m ${centimeters} cm`;
			} else {
				lengthInput.value = `${Math.round(lengthCm)} cm`;
			}
		}
	}
}

function calculateCableLength(cableObj) {
	const sn = stage.findOne('#' + cableObj.fromId);
	const en = stage.findOne('#' + cableObj.toId);
	if (!sn || !en) return "0.00";

	const startPos = sn.getAbsolutePosition(stage);
	const endPos = en.getAbsolutePosition(stage);

	let pts = [{ x: startPos.x, y: startPos.y }];
	cableObj.handles.forEach(h => pts.push({ x: h.x(), y: h.y() }));
	pts.push({ x: endPos.x, y: endPos.y });

	let totalLength = 0;

	for (let i = 0; i < pts.length - 1; i++) {
		const p1 = pts[i];
		const p2 = pts[i + 1];

		if (isOrtho) {
			totalLength += Math.abs(p2.x - p1.x) + Math.abs(p2.y - p1.y);
		} else {
			totalLength += Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
		}
	}

	return (totalLength / PX_PER_CM).toFixed(2);
}

function toggleAllCablesVisibility() {
	allCablesVisible = !allCablesVisible;
	cables.forEach(c => {
		if (c.line) c.line.visible(allCablesVisible);
		if (c.label) c.label.visible(allCablesVisible);
		if (!allCablesVisible && c.handlesGroup) {
			c.handlesGroup.visible(false);
		}
	});

	mainLayer.batchDraw();
	tempLayer.batchDraw();
}