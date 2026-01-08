// --- INITIALIZATION ---
document.getElementById('projName').value = genName();
drawGrid();
centerStage();

// --- GRID & CANVAS ---
function drawGrid() {
	gridLayer.destroyChildren();
	const background = new Konva.Rect({
		x: 0, y: 0, width: gridWidth, height: gridHeight,
		fill: canvasBackgroundColor, listening: false, name: 'grid-background'
	});
	gridLayer.add(background);
	if (!showGrid) { gridLayer.draw(); return; }

	console.log(gridWidth, PX_PER_CM, gridWidth / PX_PER_CM);
	for (let i = 0; i <= gridWidth / PX_PER_CM; i++) {
		gridLayer.add(new Konva.Line({ points: [i * PX_PER_CM, 0, i * PX_PER_CM, gridHeight], stroke: '#444', strokeWidth: 1, listening: false }));
	}
	for (let j = 0; j <= gridHeight / PX_PER_CM; j++) {
		gridLayer.add(new Konva.Line({ points: [0, j * PX_PER_CM, gridWidth, j * PX_PER_CM], stroke: '#444', strokeWidth: 1, listening: false }));
	}
	gridLayer.draw();
}

function updateCanvasSize() {
	gridWidth = document.getElementById('canvas-width-cm').value * PX_PER_CM;
	gridHeight = document.getElementById('canvas-height-cm').value * PX_PER_CM;
	stage.width(container.offsetWidth); stage.height(container.offsetHeight);
	drawGrid(); updateAllCables(); centerStage();
}

function centerStage() {
	const paddingFactor = 0.95;
	const scaleX = (container.offsetWidth / gridWidth) * paddingFactor;
	const scaleY = (container.offsetHeight / gridHeight) * paddingFactor;

	const newScale = Math.min(scaleX, scaleY, 1);

	stage.scale({ x: newScale, y: newScale });

	stage.position({
		x: (container.offsetWidth - gridWidth * newScale) / 2,
		y: (container.offsetHeight - gridHeight * newScale) / 2
	});

	stage.batchDraw();
}

// --- SELECTION & UI STATE ---
function selectGear(group, isMulti = false) {
	if (!isMulti) { deselectAll(); selectedGears = [group]; }
	else {
		if (selectedGears.includes(group)) selectedGears = selectedGears.filter(g => g !== group);
		else selectedGears.push(group);
	}
	updateSelectionUI();
}

function selectCable(cableObj) {
	deselectAll();
	selectedCable = cableObj;
	cableObj.isSelected = true;
	cableObj.line.strokeWidth(8);
	if (cableObj.handlesGroup) cableObj.handlesGroup.visible(true);

	document.getElementById('canvas-props').style.display = 'none';
	document.getElementById('gear-props').style.display = 'none';
	document.getElementById('cable-props').style.display = 'block';
	document.getElementById('selection-actions').style.display = 'block';
	document.getElementById('prop-title').innerText = "Propriétés Câble";
	document.getElementById('cable-label').value = cableObj.label ? cableObj.label.text() : "";
	document.getElementById('cable-color-picker').value = cableObj.line.stroke();
	const length = calculateCableLength(cableObj);
	const lengthInput = document.getElementById('cable-length');
	if (lengthInput) {
		lengthInput.value = length + " cm";
	}
	cableLayer.draw(); tempLayer.draw();
}

function updateSelectionUI() {
	tr.nodes(selectedGears);
	const gearProps = document.getElementById('gear-props');
	const canvasProps = document.getElementById('canvas-props');
	const selectionActions = document.getElementById('selection-actions');

	if (selectedGears.length > 0) {
		canvasProps.style.display = 'none';
		selectionActions.style.display = 'block';
		if (selectedGears.length === 1) {
			const gear = selectedGears[0];
			gearProps.style.display = 'block';
			document.getElementById('prop-title').innerText = "Propriétés Élément";
			document.getElementById('prop-label').value = gear.findOne('Text').text();
			document.getElementById('prop-size-cm').value = (gear.findOne('.icon').width() / PX_PER_CM).toFixed(1);
			document.getElementById('prop-in').value = gear.find('.anchor').filter(a => a.oldColor === '#3498db').length;
			document.getElementById('prop-out').value = gear.find('.anchor').filter(a => a.oldColor === '#e74c3c').length;
		} else {
			gearProps.style.display = 'none';
			document.getElementById('prop-title').innerText = `${selectedGears.length} Éléments sélectionnés`;
		}
	} else { deselectAll(); }
}

function deselectAll() {
	tr.nodes([]); selectedGears = []; selectedCable = null;
	cables.forEach(c => { c.isSelected = false; c.line.strokeWidth(4); if (c.handlesGroup) c.handlesGroup.visible(false); });
	document.getElementById('canvas-props').style.display = 'block';
	document.getElementById('gear-props').style.display = 'none';
	document.getElementById('cable-props').style.display = 'none';
	document.getElementById('selection-actions').style.display = 'none';
	document.getElementById('prop-title').innerText = "Propriétés du Canevas";
	cableLayer.draw(); tempLayer.draw();
}

// --- ACTIONS ---
function executeDelete() {
	if (selectedGears.length > 0) {
		selectedGears.forEach(gear => {
			cables = cables.filter(c => {
				if (c.fromId.startsWith(gear.id()) || c.toId.startsWith(gear.id())) {
					const otherId = c.fromId.startsWith(gear.id()) ? c.toId : c.fromId;
					const otherAnchor = stage.findOne('#' + otherId);
					if (otherAnchor) otherAnchor.fill(otherAnchor.oldColor);
					c.line.destroy(); c.handlesGroup.destroy(); if (c.label) c.label.destroy();
					return false;
				}
				return true;
			});
			gear.destroy();
		});
	} else if (selectedCable) {
		const sn = stage.findOne('#' + selectedCable.fromId);
		const en = stage.findOne('#' + selectedCable.toId);
		if (sn) sn.fill(sn.oldColor); if (en) en.fill(en.oldColor);
		selectedCable.line.destroy(); selectedCable.handlesGroup.destroy(); if (selectedCable.label) selectedCable.label.destroy();
		cables = cables.filter(c => c !== selectedCable);
	}
	deselectAll(); saveHistory();
}

function copyGears() {
	if (selectedGears.length === 0) return;
	clipboard = selectedGears.map(gear => ({
		src: gear.findOne('.icon').image().src,
		label: gear.findOne('Text').text(),
		outCount: gear.find('.anchor').filter(a => a.oldColor === '#e74c3c').length,
		inCount: gear.find('.anchor').filter(a => a.oldColor === '#3498db').length,
		width: gear.findOne('.icon').width(), height: gear.findOne('.icon').height(),
		anchors: gear.find('.anchor').map(a => ({ x: a.x(), y: a.y(), color: a.fill() }))
	}));
}

function pasteGears() {
	if (!clipboard) return;
	const pos = stage.getRelativePointerPosition() || { x: 150, y: 150 };
	clipboard.forEach(c => addEquipment(c.src, pos.x, pos.y, null, c.label, c.outCount, c.inCount, c.anchors, c.width, c.height));
}

function cutGears() { copyGears(); executeDelete(); }

function updateIO() {
	selectedGears.forEach(gear => {
		const img = gear.findOne('.icon');
		const w = img.width(), h = img.height();
		gear.find('.anchor').forEach(a => a.destroy());
		const outCount = parseInt(document.getElementById('prop-out').value);
		const inCount = parseInt(document.getElementById('prop-in').value);
		const total = outCount + inCount;
		for (let i = 0; i < outCount; i++) {
			const pos = getRectPos(i, total, w, h);
			createSingleAnchor(gear, pos.x, pos.y, '#e74c3c', gear.id() + '-out' + i);
		}
		for (let i = 0; i < inCount; i++) {
			const pos = getRectPos(i + outCount, total, w, h);
			createSingleAnchor(gear, pos.x, pos.y, '#3498db', gear.id() + '-in' + i);
		}
	});
	updateAllCables(); saveHistory();
}

// --- BINDINGS ---
document.getElementById('canvas-bg-color').oninput = (e) => { canvasBackgroundColor = e.target.value; drawGrid(); };
document.getElementById('canvas-width-cm').onchange = updateCanvasSize;
document.getElementById('canvas-height-cm').onchange = updateCanvasSize;
document.getElementById('btn-delete').onclick = executeDelete;
document.getElementById('prop-label').oninput = (e) => {
	if (selectedGears.length === 1) {
		const t = selectedGears[0].findOne('Text');
		t.text(e.target.value); t.visible(e.target.value !== "");
		mainLayer.batchDraw(); saveHistory();
	}
};
document.getElementById('prop-size-cm').oninput = (e) => {
	if (selectedGears.length !== 1) return;
	const val = parseFloat(e.target.value) * PX_PER_CM;
	if (val > 10) {
		const gear = selectedGears[0];
		const img = gear.findOne('.icon'), text = gear.findOne('Text');
		const ratio = img.height() / img.width();
		img.width(val); img.height(val * ratio);
		text.width(val); text.y(val + 5);
		updateIO();
	}
};
document.getElementById('prop-in').onchange = updateIO;
document.getElementById('prop-out').onchange = updateIO;
document.getElementById('cable-label').oninput = (e) => {
	if (!selectedCable) return;
	if (!selectedCable.label) {
		selectedCable.label = new Konva.Text({ fontSize: 11, fill: 'white', fontStyle: 'italic' });
		cableLayer.add(selectedCable.label);
	}
	selectedCable.label.text(e.target.value); selectedCable.redraw();
};
document.getElementById('cable-color-picker').oninput = (e) => {
	if (!selectedCable) return;
	const sn = stage.findOne('#' + selectedCable.fromId), en = stage.findOne('#' + selectedCable.toId);
	if (sn && en) { sn.fill(e.target.value); en.fill(e.target.value); selectedCable.redraw(); mainLayer.draw(); }
};

// --- LIBRARY ---
if (typeof SVG_LIBRARY !== 'undefined') {
	const lib = document.getElementById('library-container');
	const cats = {};
	SVG_LIBRARY.forEach(f => {
		const cat = (f.category || "Miscellaneous").toLowerCase();
		if (!cats[cat]) cats[cat] = [];
		cats[cat].push(f);
	});
	for (let catName in cats) {
		const title = document.createElement('div'); title.className = 'category-title'; title.innerText = catName;
		const grid = document.createElement('div'); grid.className = 'bank-grid';
		title.onclick = () => { title.classList.toggle('collapsed'); grid.classList.toggle('collapsed'); };
		cats[catName].forEach(f => {
			const item = document.createElement('div'); item.className = 'bank-item';
			const path = `svgs/${f.path || f}`;
			item.innerHTML = `<img src="${path}"><span>${f.name || f}</span>`;
			item.onclick = () => addEquipment(path, 150, 150, null, "", f.outputNbAnchors ?? 2, f.inputNbAnchors ?? 2, null, f.width ?? 80, f.height ?? 80);
			grid.appendChild(item);
		});
		lib.appendChild(title); lib.appendChild(grid);
	}
}

// --- UTILS ---
function genName() {
	const d = new Date();
	return `Ma scene ${d.getDate().toString().padStart(2, '0')}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getFullYear()}`;
}

function getRectPos(index, total, width, height) {
	const perimeter = (width + height) * 2;
	const step = perimeter / total;
	const dist = (index * step + height + width * 1.5) % perimeter;
	if (dist <= width) return { x: dist, y: 0 };
	if (dist <= width + height) return { x: width, y: dist - height };
	if (dist <= width * 2 + height) return { x: width - (dist - (width + height)), y: height };
	return { x: 0, y: height - (dist - (width * 2 + height)) };
}

function distToSegment(p, v, w) {
	const l2 = (v.x - w.x) ** 2 + (v.y - w.y) ** 2;
	if (l2 === 0) return Math.sqrt((p.x - v.x) ** 2 + (p.y - v.y) ** 2);
	let t = Math.max(0, Math.min(1, ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2));
	return Math.sqrt((p.x - (v.x + t * (w.x - v.x))) ** 2 + (p.y - (v.y + t * (w.y - v.y))) ** 2);
}

function getOrthoPoints(points, inverse = true) {
	let ortho = [points[0], points[1]];
	for (let i = 0; i < points.length - 2; i += 2) {
		if (inverse) ortho.push(points[i], points[i + 3], points[i + 2], points[i + 3]);
		else ortho.push(points[i + 2], points[i + 1], points[i + 2], points[i + 3]);
	}
	return ortho;
}

function toggleGrid(visible) { showGrid = visible; drawGrid(); }

function showHelp() {
	const help = document.getElementById('help-modal');
	help.classList.toggle('hidden');
	// prevent the immediate document click (which triggered the toggle)
	helpToggleLock = true;
	setTimeout(() => { helpToggleLock = false; }, 100);
}

function closeHelp() {
	const help = document.getElementById('help-modal');
	if (help && !help.classList.contains('hidden')) help.classList.add('hidden');
}

// Close help modal when clicking outside of it
document.addEventListener('click', (e) => {
	const help = document.getElementById('help-modal');
	if (!help) return;
	if (helpToggleLock) return;
	if (help.classList.contains('hidden')) return;
	if (!help.contains(e.target)) {
		help.classList.add('hidden');
	}
});