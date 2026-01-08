function updateAllCables() {
	cables.forEach(c => c.redraw());
	cableLayer.batchDraw();
}

function createCable(startAnchor, endAnchor, midPoints = [], color = null, labelTxt = "", orthoInverse = false) {
	const line = new Konva.Line({ strokeWidth: 4, lineCap: 'round', lineJoin: 'round', hitStrokeWidth: 20 });
	const handlesGroup = new Konva.Group({ visible: false });
	const cableObj = { line, fromId: startAnchor.id(), toId: endAnchor.id(), handles: [], isSelected: false, label: null, orthoInverse };

	if (labelTxt) {
		cableObj.label = new Konva.Text({ text: labelTxt, fontSize: 11, fill: 'white', fontStyle: 'italic' });
		cableLayer.add(cableObj.label);
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

	cableLayer.add(line);
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
		radius: 6, fill: '#f1c40f', stroke: 'white', strokeWidth: 1, draggable: true
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
			lengthInput.value = length + " cm";
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
			lengthInput.value = calculateCableLength(cableObj) + " cm";
		}
	}
}


// manque ORTHO
function calculateCableLength(cableObj) {
	const points = cableObj.line.points();
	let totalLength = 0;

	for (let i = 0; i < points.length - 2; i += 2) {
		const x1 = points[i];
		const y1 = points[i + 1];
		const x2 = points[i + 2];
		const y2 = points[i + 3];

		// Distance euclidienne entre deux points
		const segmentLength = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
		totalLength += segmentLength;
	}

	// Conversion en cm via votre constante PX_PER_CM
	return (totalLength / PX_PER_CM).toFixed(2);
}