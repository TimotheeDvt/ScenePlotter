let isOrtho = false;
let selectedGears = [];
let selectedCable = null;
let cables = [];
let activeAnchor = null;
let clipboard = null;
let history = ["{\"gear\": [], \"cables\": []}"];
let historyStep = 0;
let isApplyingHistory = false;

const PX_PER_CM = 15;

let gridWidth = 50 * PX_PER_CM;
let gridHeight = 30 * PX_PER_CM;

const SNAP_SIZE = 25;

const container = document.getElementById('canvas-container');
const stage = new Konva.Stage({ container: 'canvas-container', width: container.offsetWidth, height: container.offsetHeight });
const gridLayer = new Konva.Layer();
const cableLayer = new Konva.Layer();
const mainLayer = new Konva.Layer();
const tempLayer = new Konva.Layer();
stage.add(gridLayer, cableLayer, mainLayer, tempLayer);

const tr = new Konva.Transformer({
	rotateAnchorOffset: 30,
	borderStroke: '#007acc',
	keepRatio: true,
	enabledAnchors: ['top-left', 'top-right', 'bottom-left', 'bottom-right']
});
tr.on('transform', () => {
	if (selectedGear) {
		const img = selectedGear.findOne('.icon');
		const text = selectedGear.findOne('Text');

		const newWidth = img.width() * img.scaleX();
		const newHeight = img.height() * img.scaleY();

		document.getElementById('prop-size-cm').value = (newWidth / PX_PER_CM).toFixed(1);

		img.width(newWidth);
		img.height(newHeight);
		img.scaleX(1);
		img.scaleY(1);

		text.width(newWidth);
		text.y(newHeight + 5);
		updateIO();
	}
	updateAllCables();
});

tr.on('transformend', () => {
	updateAllCables();
});
mainLayer.add(tr);

// ZOOM
const scaleBy = 1.1;
stage.on('wheel', (e) => {
	e.evt.preventDefault();

	const oldScale = stage.scaleX();
	const pointer = stage.getPointerPosition();

	const mousePointTo = {
		x: (pointer.x - stage.x()) / oldScale,
		y: (pointer.y - stage.y()) / oldScale,
	};

	const newScale = e.evt.deltaY < 0 ? oldScale * scaleBy : oldScale / scaleBy;

	if (newScale > 0.4 && newScale < 3) {
		stage.scale({ x: newScale, y: newScale });

		const newPos = {
			x: pointer.x - mousePointTo.x * newScale,
			y: pointer.y - mousePointTo.y * newScale,
		};
		stage.position(newPos);
		stage.batchDraw();
	}
});

// DRAG CANVAS
stage.container().addEventListener('mousedown', (e) => {
	if (e.button === 1) {
		stage.startDrag();
	}
});

const dragLine = new Konva.Line({ stroke: '#ffffff', strokeWidth: 2, dash: [5, 5], visible: false, listening: false });
tempLayer.add(dragLine);

window.addEventListener('resize', () => {
	stage.width(container.offsetWidth);
	stage.height(container.offsetHeight);
	drawGrid();
	updateAllCables();
});

updateCanvasSize();

function drawGrid() {
	gridLayer.destroyChildren();

	const background = new Konva.Rect({
		x: 0,
		y: 0,
		width: gridWidth,
		height: gridHeight,
		fill: '#2a2a2a',
		listening: false
	});
	gridLayer.add(background);

	for (let i = 0; i <= gridWidth / 50; i++) {
		gridLayer.add(new Konva.Line({
			points: [i * 50, 0, i * 50, gridHeight],
			stroke: '#444',
			strokeWidth: 1,
			listening: false
		}));
	}
	for (let j = 0; j <= gridHeight / 50; j++) {
		gridLayer.add(new Konva.Line({
			points: [0, j * 50, gridWidth, j * 50],
			stroke: '#444',
			strokeWidth: 1,
			listening: false
		}));
	}

	gridLayer.draw();
}
drawGrid();

stage.on('click tap', (e) => { if (e.target === stage) deselectAll(); });

const canvasProps = document.getElementById('canvas-props');
const gearProps = document.getElementById('gear-props');
const cableProps = document.getElementById('cable-props');
const selectionActions = document.getElementById('selection-actions');

function updateCanvasSize() {
	gridWidth = document.getElementById('canvas-width-cm').value * PX_PER_CM;
	gridHeight = document.getElementById('canvas-height-cm').value * PX_PER_CM;
	stage.width(container.offsetWidth);
	stage.height(container.offsetHeight);

	drawGrid();
	updateAllCables();
	centerStage();
}

document.getElementById('canvas-bg-color').oninput = (e) => {
	container.style.backgroundColor = e.target.value;
};
document.getElementById('canvas-width-cm').onchange = updateCanvasSize;
document.getElementById('canvas-height-cm').onchange = updateCanvasSize;

function executeDelete() {
	if (selectedGears.length > 0) {
		selectedGears.forEach(gear => {
			cables = cables.filter(c => {
				if (c.fromId.startsWith(gear.id()) || c.toId.startsWith(gear.id())) {
					const otherId = c.fromId.startsWith(gear.id()) ? c.toId : c.fromId;
					const otherAnchor = stage.findOne('#' + otherId);
					if (otherAnchor) otherAnchor.fill(otherAnchor.oldColor);
					c.line.destroy();
					c.handlesGroup.destroy();
					if (c.label) c.label.destroy();
					return false;
				}
				return true;
			});
			gear.destroy();
		});
	} else if (selectedCable) {
		const sn = stage.findOne('#' + selectedCable.fromId);
		const en = stage.findOne('#' + selectedCable.toId);

		if (sn) sn.fill(sn.oldColor);
		if (en) en.fill(en.oldColor);

		selectedCable.line.destroy();
		selectedCable.handlesGroup.destroy();
		if (selectedCable.label) selectedCable.label.destroy();
		cables = cables.filter(c => c !== selectedCable);
	}
	deselectAll();
	mainLayer.draw(); cableLayer.draw(); tempLayer.draw();
	saveHistory();
}
document.getElementById('btn-delete').onclick = executeDelete;
window.addEventListener('keydown', (e) => { if (e.key === 'Delete' || e.key === 'Backspace') executeDelete(); });

// Gears
function addEquipment(src, x = 100, y = 100, id = null, labelText = "", outCount = 2, inCount = 2, anchorData = null, width = null, height = null) {
	const nativeImg = new Image();
	nativeImg.onload = () => {
		const group = new Konva.Group({
			x: x,
			y: y,
			draggable: true,
			name: 'gear',
			id: id || 'g' + Date.now()
		});

		const finalWidth = width || 80;
		const finalHeight = height || 80;
		const img = new Konva.Image({
			image: nativeImg,
			width: finalWidth,
			height: finalHeight,
			name: 'icon'
		});

		const label = new Konva.Text({
			text: labelText,
			fontSize: 12,
			fill: 'white',
			y: finalWidth + 5,
			width: finalWidth,
			align: 'center',
			fontStyle: 'bold',
			listening: false,
			visible: labelText !== ""
		});

		group.add(img, label);
		mainLayer.add(group);

		if (anchorData) {
			anchorData.forEach(ad => createSingleAnchor(group, ad.x, ad.y, ad.color, ad.id));
		} else {
			generateDefaultAnchors(group, outCount, inCount);
		}

		group.on('mouseenter', () => showAnchorsOfGear(group, true));
		group.on('mouseleave', () => { if (!activeAnchor) showAnchorsOfGear(group, false) });
		group.on('click tap', (e) => {
			e.cancelBubble = true;
			const isMulti = e.evt.shiftKey || e.evt.ctrlKey;
			selectGear(group, isMulti);
		});

		group.on('dragmove', () => {
			group.position({
				x: Math.round(group.x() / SNAP_SIZE) * SNAP_SIZE,
				y: Math.round(group.y() / SNAP_SIZE) * SNAP_SIZE
			});
			updateAllCables();
		});

		group.on('dragend', () => saveHistory());

		if (!isApplyingHistory) {
			saveHistory();
		}

		mainLayer.batchDraw();
	};
	nativeImg.src = src;
}

function createSingleAnchor(group, x, y, color, id) {
	const size = group.findOne('.icon').width();
	const c = new Konva.Circle({
		x: x, y: y, radius: 8, fill: color, opacity: 0,
		draggable: true,
		name: 'anchor', id: id || group.id() + '-a' + Math.random()
	});
	c.oldColor = color;

	c.on('mousedown touchstart', (e) => {
		e.cancelBubble = true;

		if (e.evt.button === 0) {
			c.stopDrag();
			activeAnchor = c;
			showAllAnchors(true);
		} else if (e.evt.button === 2) {
			c.startDrag();
		}
	});

	c.on('dragmove', (e) => {
		e.cancelBubble = true;
		let cx = c.x();
		let cy = c.y();
		const mid = size / 2;

		if (Math.abs(cx - mid) > Math.abs(cy - mid)) {
			c.x(cx > mid ? size : 0);
			c.y(Math.max(0, Math.min(size, cy)));
		} else {
			c.y(cy > mid ? size : 0);
			c.x(Math.max(0, Math.min(size, cx)));
		}
		updateAllCables();
	});

	c.on('dragend', () => {
		saveHistory();
	});

	group.add(c);
	return c;
}

function generateDefaultAnchors(group, outCount, inCount) {
	const total = parseInt(outCount) + parseInt(inCount);
	for (let i = 0; i < outCount; i++) {
		const pos = getRectPos(i, total, group.findOne('.icon').width(), group.findOne('.icon').height());
		createSingleAnchor(group, pos.x, pos.y, '#e74c3c', group.id() + '-out' + i);
	}
	for (let i = 0; i < inCount; i++) {
		const pos = getRectPos(i + parseInt(outCount), total, group.findOne('.icon').width(), group.findOne('.icon').height());
		createSingleAnchor(group, pos.x, pos.y, '#3498db', group.id() + '-in' + i);
	}
}

// --- SELECTION ---
function selectGear(group, isMultiSelect = false) {
	if (!isMultiSelect) {
		deselectAll();
		selectedGears = [group];
	} else {
		if (selectedGears.includes(group)) {
			selectedGears = selectedGears.filter(g => g !== group);
		} else {
			selectedGears.push(group);
		}
	}

	tr.nodes(selectedGears);

	if (selectedGears.length > 0) {
		canvasProps.style.display = 'none';
		gearProps.style.display = selectedGears.length === 1 ? 'block' : 'none'; // Cache les props si plusieurs
		cableProps.style.display = 'none';
		selectionActions.style.display = 'block';
		document.getElementById('prop-title').innerText = selectedGears.length > 1
		? `${selectedGears.length} Éléments sélectionnés`
		: "Propriétés Élément";

		if (selectedGears.length === 1) {
			const img = group.findOne('.icon');
			document.getElementById('prop-label').value = group.findOne('Text').text();
			document.getElementById('prop-size-cm').value = (img.width() / PX_PER_CM).toFixed(1);
		}
	} else {
		deselectAll();
	}
}

document.getElementById('prop-size-cm').oninput = (e) => {
	if (selectedGear) {
		const val = parseFloat(e.target.value) * PX_PER_CM;
		if (val > 10) {
			const img = selectedGear.findOne('.icon');
			const text = selectedGear.findOne('Text');
			const ratio = img.height() / img.width();
			img.width(val);
			img.height(val * ratio);

			text.width(val);
			text.y(val + 5);

			updateIO();
			updateAllCables();
		}
	}
};

function selectCable(cableObj) {
	deselectAll();
	selectedCable = cableObj;
	cableObj.isSelected = true;
	cableObj.line.strokeWidth(8);
	cableObj.handlesGroup.visible(true);

	canvasProps.style.display = 'none';
	gearProps.style.display = 'none';
	cableProps.style.display = 'block';
	selectionActions.style.display = 'block';
	document.getElementById('prop-title').innerText = "Propriétés Câble";

	document.getElementById('cable-label').value = cableObj.label ? cableObj.label.text() : "";
	document.getElementById('cable-color-picker').value = cableObj.line.stroke();
	cableLayer.draw();
}

function deselectAll() {
	tr.nodes([]);
	selectedGears = [];
	selectedCable = null;

	canvasProps.style.display = 'block';
	gearProps.style.display = 'none';
	cableProps.style.display = 'none';
	selectionActions.style.display = 'none';
	document.getElementById('prop-title').innerText = "Propriétés du Canevas";

	cableLayer.draw();
}

// --- PROPRIETES INPUTS ---
document.getElementById('prop-label').oninput = (e) => { if (selectedGear) { const t = selectedGear.findOne('Text'); t.text(e.target.value); t.visible(e.target.value !== ""); mainLayer.batchDraw(); saveHistory(); } };
document.getElementById('prop-in').onchange = () => updateIO();
document.getElementById('prop-out').onchange = () => updateIO();
function updateIO() {
	if (!selectedGear) return;
	const width = selectedGear.findOne('.icon').width();
	const height = selectedGear.findOne('.icon').height();
	selectedGear.find('.anchor').forEach(a => a.destroy());

	const outCount = document.getElementById('prop-out').value;
	const inCount = document.getElementById('prop-in').value;
	const total = parseInt(outCount) + parseInt(inCount);

	for (let i = 0; i < outCount; i++) {
		const pos = getRectPos(i, total, width, height);
		createSingleAnchor(selectedGear, pos.x, pos.y, '#e74c3c', selectedGear.id() + '-out' + i);
	}
	for (let i = 0; i < inCount; i++) {
		const pos = getRectPos(i + parseInt(outCount), total, width, height);
		createSingleAnchor(selectedGear, pos.x, pos.y, '#3498db', selectedGear.id() + '-in' + i);
	}
	updateAllCables();
	saveHistory();
}

document.getElementById('cable-label').oninput = (e) => {
	if (!selectedCable) return;
	if (!selectedCable.label) {
		selectedCable.label = new Konva.Text({ fontSize: 11, fill: 'white', fontStyle: 'italic' });
		cableLayer.add(selectedCable.label);
	}
	selectedCable.label.text(e.target.value);
	selectedCable.redraw();
};

document.getElementById('cable-color-picker').oninput = (e) => {
	if (selectedCable) {
		const startAnchor = stage.findOne('#' + selectedCable.fromId);
		const endAnchor = stage.findOne('#' + selectedCable.toId);

		if (startAnchor && endAnchor) {
			startAnchor.fill(e.target.value);
			endAnchor.fill(e.target.value);

			selectedCable.redraw();
			cableLayer.draw();
			mainLayer.draw();
		}
	}
};

// --- CABLES ---
function updateAllCables() { cables.forEach(c => c.redraw()); cableLayer.batchDraw(); }
function showAllAnchors(v) { stage.find('.anchor').forEach(a => a.opacity(v ? 1 : 0)); mainLayer.draw(); }
function showAnchorsOfGear(g, v) { g.find('.anchor').forEach(a => a.opacity(v ? 1 : 0)); mainLayer.draw(); }

stage.on('mousemove touchmove', () => {
	if (!activeAnchor) return;

	const pos = stage.getRelativePointerPosition();

	const start = activeAnchor.getAbsolutePosition(stage);

	dragLine.points([start.x, start.y, pos.x, pos.y]);
	dragLine.visible(true);
	tempLayer.batchDraw();
});

stage.on('mouseup touchend', () => {
	if (activeAnchor) {
		const pos = stage.getRelativePointerPosition();

		const target = stage.find('.anchor').find(a => {
			const p = a.getAbsolutePosition(stage);
			return Math.sqrt((pos.x - p.x) ** 2 + (pos.y - p.y) ** 2) < 25 && a !== activeAnchor;
		});

		if (target) {
			createCable(activeAnchor, target);
		}
	}

	activeAnchor = null;
	dragLine.visible(false);
	showAllAnchors(false);
	tempLayer.draw();
});

function createCable(startAnchor, endAnchor, midPoints = [], color = null, labelTxt = "") {
	const line = new Konva.Line({
		strokeWidth: 4,
		lineCap: 'round',
		lineJoin: 'round',
		hitStrokeWidth: 20
	});

	const handlesGroup = new Konva.Group({ visible: false });
	const cableObj = { line, fromId: startAnchor.id(), toId: endAnchor.id(), handles: [], isSelected: false, label: null };

	if (labelTxt) {
		cableObj.label = new Konva.Text({ text: labelTxt, fontSize: 11, fill: 'white', fontStyle: 'italic' });
		cableLayer.add(cableObj.label);
	}

	const redraw = () => {
		const sn = stage.findOne('#' + cableObj.fromId);
		const en = stage.findOne('#' + cableObj.toId);
		if (!sn || !en) return;

		const startPos = sn.getAbsolutePosition(stage);
		const endPos = en.getAbsolutePosition(stage);

		let pts = [startPos.x, startPos.y];

		cableObj.handles.forEach(h => {
			const hPos = h.getAbsolutePosition(stage);
			pts.push(hPos.x, hPos.y);
		});

		pts.push(endPos.x, endPos.y);

		const colorStart = sn.fill();
		const colorEnd = en.fill();

		line.strokeLinearGradientStartPoint({ x: startPos.x, y: startPos.y });
		line.strokeLinearGradientEndPoint({ x: endPos.x, y: endPos.y });
		line.strokeLinearGradientColorStops([0, colorStart, 1, colorEnd]);

		line.points(isOrtho ? getOrthoPoints(pts) : pts);

		if (cableObj.label) {
			const midX = (startPos.x + endPos.x) / 2;
			const midY = (startPos.y + endPos.y) / 2;
			cableObj.label.position({ x: midX, y: midY - 15 });
		}
	};

	const addHandleAtPos = (x, y) => {
		const snapX = Math.round(x / SNAP_SIZE) * SNAP_SIZE;
		const snapY = Math.round(y / SNAP_SIZE) * SNAP_SIZE;

		const h = new Konva.Circle({
			x: snapX,
			y: snapY,
			radius: 6,
			fill: '#f1c40f',
			stroke: 'white',
			strokeWidth: 1,
			draggable: true
		});

		h.on('dragmove', () => {
			h.position({
				x: Math.round(h.x() / SNAP_SIZE) * SNAP_SIZE,
				y: Math.round(h.y() / SNAP_SIZE) * SNAP_SIZE
			});
			redraw();
		});

		h.on('contextmenu', (e) => {
			e.evt.preventDefault();
			h.destroy();
			cableObj.handles = cableObj.handles.filter(handle => handle !== h);
			redraw();
		});

		let insertIndex = cableObj.handles.length;
		let minDist = Infinity;

		const sn = stage.findOne('#' + cableObj.fromId).getAbsolutePosition(stage);
		const en = stage.findOne('#' + cableObj.toId).getAbsolutePosition(stage);

		let allPoints = [{ x: sn.x, y: sn.y }, ...cableObj.handles.map(handle => ({ x: handle.x(), y: handle.y() })), { x: en.x, y: en.y }];

		for (let i = 0; i < allPoints.length - 1; i++) {
			let dist = distToSegment({ x: snapX, y: snapY }, allPoints[i], allPoints[i + 1]);
			if (dist < minDist) {
				minDist = dist;
				insertIndex = i;
			}
		}

		cableObj.handles.splice(insertIndex, 0, h);
		handlesGroup.add(h);
		redraw();
	};

	line.on('dblclick', () => {
		const p = stage.getRelativePointerPosition();
		addHandleAtPos(p.x, p.y);
	});

	line.on('click', (e) => { e.cancelBubble = true; selectCable(cableObj); });

	midPoints.forEach(p => {
		const h = new Konva.Circle({
			x: Math.round(p.x / SNAP_SIZE) * SNAP_SIZE,
			y: Math.round(p.y / SNAP_SIZE) * SNAP_SIZE,
			radius: 6,
			fill: '#f1c40f',
			stroke: 'white',
			strokeWidth: 1,
			draggable: true
		});

		h.on('dragmove', () => {
			h.position({
				x: Math.round(h.x() / SNAP_SIZE) * SNAP_SIZE,
				y: Math.round(h.y() / SNAP_SIZE) * SNAP_SIZE
			});
			redraw();
		});

		h.on('contextmenu', (e) => {
			e.evt.preventDefault();
			h.destroy();
			cableObj.handles = cableObj.handles.filter(handle => handle !== h);
			redraw();
		});

		cableObj.handles.push(h);
		handlesGroup.add(h);
	});

	cableLayer.add(line);
	tempLayer.add(handlesGroup);
	cableObj.redraw = redraw;
	cableObj.handlesGroup = handlesGroup;
	cables.push(cableObj);
	redraw();
	saveHistory();
}

// LIBRARY & CATEGORIES
if (typeof SVG_LIBRARY !== 'undefined') {
	const cats = {};
	SVG_LIBRARY.forEach(f => {
		const cat = (f.category || "Miscellaneous").toLowerCase();
		if (!cats[cat]) cats[cat] = [];
		cats[cat].push(f);
	});

	const lib = document.getElementById('library-container');
	for (let catName in cats) {
		const title = document.createElement('div');
		title.className = 'category-title';
		title.innerText = catName;
		const grid = document.createElement('div');
		grid.className = 'bank-grid';
		cats[catName].forEach(f => {
			const item = document.createElement('div');
			item.className = 'bank-item';
			const imagePath = `svgs/${f.path || f}`;
			item.innerHTML = `<img src="${imagePath}"><span>${f.name || f}</span>`;
			item.onclick = () => addEquipment(
				imagePath,
				150,
				150,
				null,
				"",
				f.outputNbAnchors ?? 2,
				f.inputNbAnchors ?? 2,
				null,
				f.width ?? 80,
				f.height ?? 80
			);
			grid.appendChild(item);
		});
		lib.appendChild(title); lib.appendChild(grid);
	}
}

// STORAGE
function saveStage() {
	const data = {
		name: document.getElementById('projName').value,
		gear: mainLayer.getChildren().filter(c => c.hasName('gear')).map(g => ({
			id: g.id(), x: g.x(), y: g.y(), label: g.findOne('Text').text(), src: g.findOne('.icon').image().src,
			anchors: g.find('.anchor').map(a => ({ x: a.x(), y: a.y(), color: a.fill(), id: a.id() })),
			width: g.findOne('.icon').width(),
			height: g.findOne('.icon').height(),
			inCount: g.find('.anchor').filter(a => a.fill() === '#3498db').length,
			outCount: g.find('.anchor').filter(a => a.fill() === '#e74c3c').length
		})),
		cables: cables.map(c => ({
			fromId: c.fromId, toId: c.toId, color: c.line.stroke(), label: c.label ? c.label.text() : "",
			midPoints: c.handles.map(h => ({ x: h.x(), y: h.y() }))
		})),
		isOrtho: isOrtho
	};
	const link = document.createElement('a');
	link.download = `${data.name}.stage`;
	link.href = URL.createObjectURL(new Blob([JSON.stringify(data)], { type: "application/json" }));
	link.click();
}

function loadStage(event) {
	const reader = new FileReader();
	reader.onload = (e) => {
		const data = JSON.parse(e.target.result);
		document.getElementById('projName').value = data.name;
		mainLayer.getChildren().filter(c => c.hasName('gear')).forEach(g => g.destroy());
		cables.forEach(c => { c.line.destroy(); c.handlesGroup.destroy(); if (c.label) c.label.destroy(); });
		cables = [];
		isOrtho = data.isOrtho;
		document.getElementById('orthoToggle').checked = isOrtho;
		data.gear.forEach(g => addEquipment(g.src, g.x, g.y, g.id, g.label, g.outCount, g.inCount, g.anchors, g.width, g.height));
		setTimeout(() => {
			data.cables.forEach(c => {
				const sn = stage.findOne('#' + c.fromId); const en = stage.findOne('#' + c.toId);
				if (sn && en) createCable(sn, en, c.midPoints, c.color, c.label);
			});
		}, 300);
	};
	reader.readAsText(event.target.files[0]);
}

// UTILS
function genName() {
	const date = new Date();
	return `Ma scene ${(date.getDate() < 10 ? '0' : '') + date.getDate()}-${(date.getMonth() < 10 ? '0' : '') + (date.getMonth() + 1)}-${date.getFullYear()}`;
}

document.getElementById('projName').value = genName();


function distToSegment(p, v, w) {
	// distance between point p and segment vw
	const l2 = (v.x - w.x) ** 2 + (v.y - w.y) ** 2;
	if (l2 === 0) return Math.sqrt((p.x - v.x) ** 2 + (p.y - v.y) ** 2);
	let t = ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2;
	t = Math.max(0, Math.min(1, t));
	return Math.sqrt((p.x - (v.x + t * (w.x - v.x))) ** 2 + (p.y - (v.y + t * (w.y - v.y))) ** 2);
}

function getOrthoPoints(points) {
	let ortho = [points[0], points[1]];
	for (let i = 0; i < points.length - 2; i += 2) {
		let x1 = points[i], y1 = points[i + 1];
		let x2 = points[i + 2], y2 = points[i + 3];
		ortho.push(x2, y1);
		ortho.push(x2, y2);
	}
	return ortho;
}

function getRectPos(index, total, width = 80, height = 80) {
	const perimeter = (width + height) * 2;
	const step = perimeter / total;

	// Starting point offset (optional: adjusts where the first anchor appears)
	const dist = (index * step) % perimeter;

	// Top edge
	if (dist <= width) {
		return { x: dist, y: 0 };
	}
	// Right edge
	if (dist <= width + height) {
		return { x: width, y: dist - width };
	}
	// Bottom edge
	if (dist <= width * 2 + height) {
		return { x: width - (dist - (width + height)), y: height };
	}
	// Left edge
	return { x: 0, y: height - (dist - (width * 2 + height)) };
}

function centerStage() {
	const containerW = container.offsetWidth;
	const containerH = container.offsetHeight;

	// Calculate position to center the gridWidth x gridHeight area
	const centerX = (containerW - gridWidth) / 2;
	const centerY = (containerH - gridHeight) / 2;

	stage.position({ x: centerX, y: centerY });
	stage.batchDraw();
}
centerStage();

window.addEventListener('keydown', (e) => {
	if (e.ctrlKey && e.key === 'c') {
		if (selectedGear) {
			clipboard = {
				src: selectedGear.findOne('.icon').image().src,
				label: selectedGear.findOne('Text').text(),
				outCount: selectedGear.find('.anchor').filter(a => a.fill() === '#e74c3c').length,
				inCount: selectedGear.find('.anchor').filter(a => a.fill() === '#3498db').length,
				width: selectedGear.findOne('.icon').getClientRect().width,
				height: selectedGear.findOne('.icon').getClientRect().height
			};
		}
	}

	if (e.ctrlKey && e.key === 'v') {
		if (clipboard) {
			const mousePos = stage.getRelativePointerPosition();
			const x = mousePos ? mousePos.x : 150;
			const y = mousePos ? mousePos.y : 150;

			addEquipment(clipboard.src, x, y, null, clipboard.label, clipboard.outCount, clipboard.inCount, null, clipboard.width, clipboard.height);
		}
	}

	if (e.ctrlKey && e.key === 'x') {
		if (selectedGear) {
			clipboard = {
				src: selectedGear.findOne('.icon').image().src,
				label: selectedGear.findOne('Text').text(),
				outCount: selectedGear.find('.anchor').filter(a => a.fill() === '#e74c3c').length,
				inCount: selectedGear.find('.anchor').filter(a => a.fill() === '#3498db').length,
				width: selectedGear.findOne('.icon').getClientRect().width,
				height: selectedGear.findOne('.icon').getClientRect().height
			};
			executeDelete();
			selectedGear = null;
		}
	}
});

function saveHistory() {
	if (isApplyingHistory) return;
	history = history.slice(0, historyStep + 1);

	const state = {
		gear: mainLayer.getChildren().filter(c => c.hasName('gear')).map(g => ({
			id: g.id(),
			x: g.x(),
			y: g.y(),
			label: g.findOne('Text').text(),
			src: g.findOne('.icon').image().src,
			anchors: g.find('.anchor').map(a => ({ x: a.x(), y: a.y(), color: a.fill(), id: a.id() })),
			inCount: g.find('.anchor').filter(a => a.fill() === '#3498db').length,
			outCount: g.find('.anchor').filter(a => a.fill() === '#e74c3c').length,
			width: g.findOne('.icon').width()
		})),
		cables: cables.map(c => ({
			fromId: c.fromId, toId: c.toId, color: c.line.stroke(), label: c.label ? c.label.text() : "",
			midPoints: c.handles.map(h => ({ x: h.x(), y: h.y() }))
		}))
	};

	history.push(JSON.stringify(state));
	historyStep++;

	if (history.length > 50) {
		history.shift();
		historyStep--;
	}
}

function applyHistory(step) {
	isApplyingHistory = true; // On bloque les sauvegardes auto
	const state = JSON.parse(history[step]);

	mainLayer.getChildren().filter(c => c.hasName('gear')).forEach(g => g.destroy());
	cables.forEach(c => {
		c.line.destroy();
		c.handlesGroup.destroy();
		if (c.label) c.label.destroy();
	});
	cables = [];

	state.gear.forEach(g => {
		addEquipment(g.src, g.x, g.y, g.id, g.label, g.outCount, g.inCount, g.anchors, g.width, g.height);
		mainLayer.draw();
	});

	setTimeout(() => {
		state.cables.forEach(c => {
			const sn = stage.findOne('#' + c.fromId);
			const en = stage.findOne('#' + c.toId);
			if (sn && en) {
				createCable(sn, en, c.midPoints, c.color, c.label);
			}
		});

		mainLayer.draw();
		cableLayer.draw();

		isApplyingHistory = false;
	}, 150);
}

window.addEventListener('keydown', (e) => {
	if (e.ctrlKey && e.key === 'z') {
		if (historyStep > 0) {
			historyStep--;
			applyHistory(historyStep);
		}
	}
	if (e.ctrlKey && e.key === 'y') {
		if (historyStep < history.length - 1) {
			historyStep++;
			applyHistory(historyStep);
		}
	}
});

stage.container().addEventListener('contextmenu', (e) => {
	e.preventDefault();
});