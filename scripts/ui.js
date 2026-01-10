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

	for (let i = 0; i <= gridWidth / GRID_CELL_SIZE; i++) {
		gridLayer.add(new Konva.Line({ points: [i * GRID_CELL_SIZE, 0, i * GRID_CELL_SIZE, gridHeight], stroke: '#444', strokeWidth: GRID_CELL_SIZE / 20, listening: false }));
	}
	for (let j = 0; j <= gridHeight / GRID_CELL_SIZE; j++) {
		gridLayer.add(new Konva.Line({ points: [0, j * GRID_CELL_SIZE, gridWidth, j * GRID_CELL_SIZE], stroke: '#444', strokeWidth: GRID_CELL_SIZE / 20, listening: false }));
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
	cableObj.line.strokeWidth(80);
	if (cableObj.handlesGroup) cableObj.handlesGroup.visible(true);

	document.getElementById('canvas-props').style.display = 'none';
	document.getElementById('gear-props').style.display = 'none';
	document.getElementById('cable-props').style.display = 'block';
	document.getElementById('selection-actions').style.display = 'block';
	document.getElementById('prop-title').innerText = "Cable Properties";
	document.getElementById('cable-label').value = cableObj.label ? cableObj.label.text() : "";
	document.getElementById('cable-color-picker').value = cableObj.line.stroke();
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
	cableLayer.draw(); tempLayer.draw();
}

function updateSelectionUI() {
	const transformableNodes = selectedGears.filter(node =>
		node.hasName('gear') || node.hasName('free-text')
	);
	tr.nodes(transformableNodes);
	const gearProps = document.getElementById('gear-props');
	const canvasProps = document.getElementById('canvas-props');
	const selectionActions = document.getElementById('selection-actions');
	const textProps = document.getElementById('text-props');
	const cableProps = document.getElementById('cable-props');

	[gearProps, canvasProps, textProps, cableProps, selectionActions].forEach(p => { if (p) p.style.display = 'none'; });

	if (selectedGears.length > 0 || cables.some(c => c.isSelected)) {
		selectionActions.style.display = 'block';
		if (selectedGears.length === 1) {
			if (selectedGears[0].hasName('gear')) {
				const gear = selectedGears[0];
				gearProps.style.display = 'block';
				document.getElementById('prop-title').innerText = "Element Properties";
				document.getElementById('prop-label').value = gear.findOne('Text').text();
				document.getElementById('prop-size-cm').value = (gear.findOne('.icon').width() / PX_PER_CM).toFixed(1);
			} else if (selectedGears[0].hasName('free-text')) {
				textProps.style.display = 'block';
				document.getElementById('prop-title').innerText = "Free Text Properties";

				const note = selectedGears[0];
				document.getElementById('note-text-input').value = note.text();
				document.getElementById('note-color-picker').value = note.fill();
				document.getElementById('note-size-input').value = note.fontSize();
			}
		} else if (cables.filter(c => c.isSelected).length === 1 && selectedGears.length === 0) {
			const selCable = cables.find(c => c.isSelected);
			selectCable(selCable);
		} else {
			document.getElementById('prop-title').innerText = "Sélection multiple";
		}
	} else { deselectAll(); }
}

function deselectAll() {
	tr.nodes([]); selectedGears = []; selectedCable = null;
	cables.forEach(c => { c.isSelected = false; c.line.strokeWidth(40); if (c.handlesGroup) c.handlesGroup.visible(false); });
	document.getElementById('canvas-props').style.display = 'block';
	document.getElementById('gear-props').style.display = 'none';
	document.getElementById('cable-props').style.display = 'none';
	document.getElementById('selection-actions').style.display = 'none';
	document.getElementById('prop-title').innerText = "Stage properties";
	cableLayer.draw(); tempLayer.draw();
	showAllAnchors(false);
}

// --- ACTIONS ---
function executeDelete() {
	if (selectedGears.length > 0) {
		selectedGears.forEach(gear => {
			cables = cables.filter(c => {
				if (c.fromId.startsWith(gear.id()) || c.toId.startsWith(gear.id())) {
					const otherId = c.fromId.startsWith(gear.id()) ? c.toId : c.fromId;
					resetAnchorAfterDelete(otherId);
					c.line.destroy(); c.handlesGroup.destroy(); if (c.label) c.label.destroy();
					return false;
				}
				return true;
			});
			gear.destroy();
		});
	} else if (selectedCable) {
		resetAnchorAfterDelete(selectedCable.fromId);
		resetAnchorAfterDelete(selectedCable.toId);
		const sn = stage.findOne('#' + selectedCable.fromId);
		const en = stage.findOne('#' + selectedCable.toId);
		selectedCable.line.destroy(); selectedCable.handlesGroup.destroy(); if (selectedCable.label) selectedCable.label.destroy();
		cables = cables.filter(c => c !== selectedCable);
	} else {
		const selectedNodes = tr.nodes();
		selectedNodes.forEach(node => {
			if (node.hasName('free-text')) {
				node.destroy();
			}
		});
	}
	deselectAll(); saveHistory();
}

function copyGears() {
	if (selectedGears.length === 0) return;
	clipboard = selectedGears.map(gear => ({
		src: gear.findOne('.icon').image().src,
		label: gear.findOne('Text').text(),
		connections: gear.connections,
		width: gear.findOne('.icon').width(), height: gear.findOne('.icon').height(),
		anchors: gear.find('.anchor').map(a => ({ x: a.x(), y: a.y(), color: a.fill() }))
	}));
}

function pasteGears() {
	if (!clipboard) return;
	const pos = stage.getRelativePointerPosition() || { x: 150, y: 150 };
	clipboard.forEach(c => addEquipment(c.src, pos.x, pos.y, null, c.label, c.connections, c.anchors, c.width, c.height));
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
		text.width(val); text.y(val + 50);
		updateIO();
	}
};
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
	const newColor = e.target.value;
	const startAnchor = stage.findOne('#' + selectedCable.fromId);
	const family = startAnchor.family;

	CABLE_FAMILIES[family].color = newColor;

	cables.forEach(c => {
		const anc = stage.findOne('#' + c.fromId);
		if (anc && anc.family === family) {
			c.line.stroke(newColor);
			c.redraw();
		}
	});
	stage.find('.anchor').forEach(a => {
		if (a.family === family) {
			a.fill(newColor);
		}
	});

	cableLayer.draw();
	mainLayer.draw();
	saveHistory();
};

document.getElementById('note-text-input').oninput = (e) => {
	if (selectedGears.length === 1 && selectedGears[0].hasName('free-text')) {
		selectedGears[0].text(e.target.value);
		mainLayer.batchDraw();
		saveHistory();
	}
};

document.getElementById('note-color-picker').oninput = (e) => {
	if (selectedGears.length === 1 && selectedGears[0].hasName('free-text')) {
		selectedGears[0].fill(e.target.value);
		mainLayer.batchDraw();
		saveHistory();
	}
};

document.getElementById('note-size-input').oninput = (e) => {
	if (selectedGears.length === 1 && selectedGears[0].hasName('free-text')) {
		selectedGears[0].fontSize(parseInt(e.target.value));
		mainLayer.batchDraw();
		saveHistory();
	}
};

// document.getElementById('prop-px-cm').onchange = (e) => {
// 	PX_PER_CM = parseFloat(e.target.value);
// 	updateCanvasSize();
// 	saveHistory();
// };

// document.getElementById('prop-snap-size').onchange = (e) => {
// 	SNAP_SIZE = parseInt(e.target.value);
// 	drawGrid();
// 	saveHistory();
// };

document.getElementById('prop-grid-size').onchange = (e) => {
	GRID_CELL_SIZE = parseInt(e.target.value) * PX_PER_CM;
	drawGrid();
	saveHistory();
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

		if (["electricity", "audio"].includes(catName.toLowerCase())) {
			title.classList.add('collapsed');
			grid.classList.add('collapsed');
		}

		title.onclick = () => { title.classList.toggle('collapsed'); grid.classList.toggle('collapsed'); };

		cats[catName].forEach(f => {
			const item = document.createElement('div'); item.className = 'bank-item';
			const path = `assets/${f.path || f}`;
			item.innerHTML = `<img src="${path}"><span>${f.name || f}</span>`;

			item.onclick = () => addEquipment(
				path,
				150, 150,
				null,
				"",
				f.connections || {}, // On passe l'objet de connexions au lieu de in/out
				null,
				(f.width ?? 80) * PX_PER_CM,
				(f.height ?? 80) * PX_PER_CM
			);
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
	if (dist <= width + height) return { x: width, y: dist - width };
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

function setAllCategories(collapse) {
	const titles = document.querySelectorAll('.category-title');
	const grids = document.querySelectorAll('.bank-grid');

	titles.forEach(t => {
		if (collapse) t.classList.add('collapsed');
		else t.classList.remove('collapsed');
	});

	grids.forEach(g => {
		if (collapse) g.classList.add('collapsed');
		else g.classList.remove('collapsed');
	});
}

function addNewNote(text = "Nouvelle note", x = 100, y = 100) {
	const note = new Konva.Text({
		text: text,
		x: x,
		y: y,
		fontSize: 160,
		fontFamily: 'Segoe UI',
		fill: '#ffffff',
		fontStyle: 'bold',
		draggable: true,
		name: 'free-text'
	});

	note.on('dragmove', () => {
		note.position({
			x: Math.round(note.x() / SNAP_SIZE) * SNAP_SIZE,
			y: Math.round(note.y() / SNAP_SIZE) * SNAP_SIZE
		});
	});

	note.on('click tap', (e) => {
		e.cancelBubble = true;
		const isMulti = e.evt.shiftKey || e.evt.ctrlKey;

		if (!isMulti) {
			deselectAll();
			selectedGears = [note];
		} else {
			if (selectedGears.includes(note)) {
				selectedGears = selectedGears.filter(g => g !== note);
			} else {
				selectedGears.push(note);
			}
		}
		updateSelectionUI();
		mainLayer.draw();
	});

	mainLayer.add(note);
	selectedGears = [note];
	updateSelectionUI();
	mainLayer.draw();
	saveHistory();
}

function refreshFamilyInputs(gear) {
	const container = document.getElementById('family-inputs-container');
	container.innerHTML = ''; // On vide

	// Pour chaque famille définie dans la config
	Object.keys(CABLE_FAMILIES).forEach(famKey => {
		const fam = CABLE_FAMILIES[famKey];
		const conn = gear.connections[famKey] || { in: 0, out: 0 };

		const div = document.createElement('div');
		div.style.marginBottom = "10px";
		div.innerHTML = `
            <label style="color:${fam.color}">${fam.label}</label>
            <div style="display: flex; gap: 5px;">
                <input type="number" placeholder="In" value="${conn.in}"
                    onchange="updateGearConnections('${famKey}', 'in', this.value)" style="flex:1">
                <input type="number" placeholder="Out" value="${conn.out}"
                    onchange="updateGearConnections('${famKey}', 'out', this.value)" style="flex:1">
            </div>
        `;
		container.appendChild(div);
	});
}

function updateGearConnections(family, type, value) {
	if (selectedGears.length !== 1) return;
	const gear = selectedGears[0];

	if (!gear.connections[family]) gear.connections[family] = { in: 0, out: 0 };
	gear.connections[family][type] = parseInt(value) || 0;

	// On régénère les ancres
	gear.find('.anchor').forEach(a => a.destroy());
	generateDefaultAnchors(gear, gear.connections);

	updateAllCables();
	saveHistory();
	mainLayer.draw();
}