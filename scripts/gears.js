function addEquipment(src, x = 100, y = 100, id = null, labelText = "", connections = {}, anchorData = null, width = null, height = null, rotation = 0, path = null, assetName = "") {
	const nativeImg = new Image();
	nativeImg.onload = () => {
		const group = new Konva.Group({
			x: x, y: y, draggable: true, name: 'gear', id: id || 'g' + Date.now(), rotation: rotation
		});

		group.connections = connections;
		group.assetName = assetName;
		group.path = path;

		const preset = SVG_LIBRARY.find(item => item.name === assetName);
        const category = preset ? (preset.category || "Notes") : "Notes";
		const targetGroup = categoryGroups[category] || categoryGroups["Notes"];

		addUI(group, nativeImg, labelText, width, height);

		if (anchorData && anchorData.length > 0) {
			anchorData.forEach(ad => createSingleAnchor(group, ad.x, ad.y, ad.family, ad.iotype, ad.id, ad.i));
		} else if (width && height) {
			if (preset && preset.fixedAnchors) {
				preset.fixedAnchors.forEach(fa => {
					const scaleX = width / preset.width;
					const scaleY = height / preset.height;
					createSingleAnchor(group, fa.x * scaleX, fa.y * scaleY, fa.family, fa.type, null, fa.i);
				});
			} else {
				generateDefaultAnchors(group, connections);
			}
		} else {
			generateDefaultAnchors(group, connections);
		}

		addEventListenersGroup(group);

		if (!isApplyingHistory) saveHistory();
		targetGroup.add(group);
		mainLayer.batchDraw();
	};
	nativeImg.src = src;
}

function createSingleAnchor(group, x, y, family, type, id, index = 0) {
	const img = group.findOne('.icon');
	const color = CABLE_FAMILIES[family] ? CABLE_FAMILIES[family].color : '#888';
	const rotation = calculateAnchorRotation(x, y, img.width(), img.height(), type);

	let anchorShape;

	if (family === 'aes') {
		anchorShape = new Konva.Rect({
			x: x,
			y: y,
			width: 60,
			height: 60,
			fill: color,
			stroke: 'white',
			strokeWidth: 5,
			offsetX: 30,
			offsetY: 30,
			rotation: rotation,
			draggable: true,
			name: 'anchor',
			opacity: 1,
			visible: false,
			id: id || group.id() + '-' + family + '-' + type + Math.random()
		});
	} else {
		anchorShape = new Konva.RegularPolygon({
			x: x,
			y: y,
			sides: 3,
			radius: 40,
			fill: color,
			stroke: 'white',
			strokeWidth: 5,
			rotation: rotation,
			draggable: true,
			name: 'anchor',
			opacity: 0,
			id: id || group.id() + '-' + family + '-' + type + Math.random()
		});
	}

	anchorShape.family = family;
	anchorShape.iotype = type;
	anchorShape.i = index;

	addEventListenersAnchor(anchorShape, img, group);
	group.add(anchorShape);
	return anchorShape;
}

function calculateAnchorRotation(x, y, w, h, type) {
	let baseAngle = 0;
	if (x <= 0) baseAngle = -90;
	else if (x >= w) baseAngle = 90;
	else if (y <= 0) baseAngle = 0;
	else if (y >= h) baseAngle = 180;

	return type === 'in' ? baseAngle + 180 : baseAngle;
}

function createVirtualAnchor(group, x, y) {
	group.add(new Konva.Circle({
		x, y, radius: 20, fill: '#666', opacity: 0.5,
		name: 'virtual-anchor', listening: false
	}));
}

function updateAnchorsPosition(group) {
	const preset = SVG_LIBRARY.find(item => item.name === group.assetName);
	if (!preset || !preset.fixedAnchors) return;
	for (const anchor of group.find('.anchor')) {
		const fixedAnchor = preset.fixedAnchors || null;
		if (fixedAnchor) {
			const fa = fixedAnchor.find(fa => fa.family === anchor.family && fa.type === anchor.iotype && fa.i === anchor.i);
			if (fa) {
				anchor.x(fa.x * (group.findOne('.icon').width() / preset.width));
				anchor.y(fa.y * (group.findOne('.icon').height() / preset.height));

				const newRotation = calculateAnchorRotation(anchor.x(), anchor.y(), group.findOne('.icon').width(), group.findOne('.icon').height(), anchor.iotype);
				anchor.rotation(newRotation);
			}
		}
	}
}

function addUI(group, nativeImg, labelText, width, height) {
	const finalWidth = width || 80;
	const finalHeight = height || 80;

	group.add(new Konva.Rect({
		x: -10, y: -10, width: finalWidth + 20, height: finalHeight + 20,
		fill: 'transparent', name: 'hit-area'
	}));

	const img = new Konva.Image({
		image: nativeImg, width: finalWidth, height: finalHeight, name: 'icon'
	});

	const label = new Konva.Text({
		text: labelText, fontSize: 120, fill: 'white', y: finalHeight + 50,
		width: finalWidth, align: 'center', fontStyle: 'bold',
		listening: false, visible: labelText !== ""
	});

	group.add(img, label);
}

function addEventListenersGroup(group) {
	group.on('mouseenter', () => showAnchorsOfGear(group, true));
	group.on('mouseleave', () => { if (!activeAnchor) showAnchorsOfGear(group, false) });

	group.on('click tap', (e) => {
		e.cancelBubble = true;
		selectGear(group, e.evt.shiftKey || e.evt.ctrlKey);
	});

	group.on('dragmove', () => {
		group.position({
			x: Math.round(group.x() / SNAP_SIZE) * SNAP_SIZE,
			y: Math.round(group.y() / SNAP_SIZE) * SNAP_SIZE
		});
		updateAllCables();
	});

	group.on('transformend', () => {
		updateAnchorsPosition(group);
		updateAllCables();
		saveHistory();
	});

	group.on('dragend', () => saveHistory());
}

function addEventListenersAnchor(c, img, group) {
	c.on('mousedown touchstart', (e) => {
		e.cancelBubble = true;
		if (e.evt.button === 0 && (e.evt.ctrlKey || e.evt.metaKey)) {
			c.stopDrag();
			activeAnchor = c;
			showAllAnchors(true, c.family, c.iotype);
		}
	});

	c.on('dragstart', (e) => {
		e.cancelBubble = true;
		const w = img.width();
		const h = img.height();
		const local_snap = SNAP_SIZE / 2;
		for (let ix = 0; ix <= w; ix += local_snap) {
			createVirtualAnchor(group, ix, 0);
			createVirtualAnchor(group, ix, h);
		}
		for (let iy = local_snap; iy < h; iy += local_snap) {
			createVirtualAnchor(group, 0, iy);
			createVirtualAnchor(group, w, iy);
		}
	});

	c.on('dragmove', (e) => {
		e.cancelBubble = true;
		const w = img.width();
		const h = img.height();
		const local_snap = SNAP_SIZE / 2;

		let cx = Math.round(c.x() / local_snap) * local_snap;
		let cy = Math.round(c.y() / local_snap) * local_snap;

		const dx = (cx - w / 2) / w;
		const dy = (cy - h / 2) / h;

		if (Math.abs(dx) > Math.abs(dy)) {
			c.x(dx > 0 ? w : 0);
			c.y(Math.max(0, Math.min(h, cy)));
		} else {
			c.y(dy > 0 ? h : 0);
			c.x(Math.max(0, Math.min(w, cx)));
		}

		const newRotation = calculateAnchorRotation(c.x(), c.y(), w, h, c.iotype);
		c.rotation(newRotation);
		updateAllCables();
	});

	c.on('dragend', (e) => {
		e.cancelBubble = true;
		group.find('.virtual-anchor').forEach(va => va.destroy());
		showAnchorsOfGear(group, true);
		if (group.getLayer()) {
			group.getLayer().draw();
		}
		saveHistory();
	});
}

function generateDefaultAnchors(group, connections) {
	if (!connections) return;
	const img = group.findOne('.icon');
	const w = img.width();
	const h = img.height();

	let totalAnchors = 0;
	Object.values(connections).forEach(f => totalAnchors += (f.in + f.out));

	const preset = group.assetName ? SVG_LIBRARY.find(item => item.name === group.assetName) : null;
	const fixedAnchors = preset?.fixedAnchors || [];

	let posIndex = 0;
	for (const [family, counts] of Object.entries(connections)) {
		for (let i = 0; i < counts.out; i++) {
			const fixed = fixedAnchors.find(fa => fa.family === family && fa.type === 'out' && fa.i === i);
			const x = fixed ? fixed.x * (w / preset.width) : getRectPos(posIndex, totalAnchors, w, h).x;
			const y = fixed ? fixed.y * (h / preset.height) : getRectPos(posIndex, totalAnchors, w, h).y;
			createSingleAnchor(group, x, y, family, 'out', null, i);
			posIndex++;
		}
		for (let i = 0; i < counts.in; i++) {
			const fixed = fixedAnchors.find(fa => fa.family === family && fa.type === 'in' && fa.i === i);
			const x = fixed ? fixed.x * (w / preset.width) : getRectPos(posIndex, totalAnchors, w, h).x;
			const y = fixed ? fixed.y * (h / preset.height) : getRectPos(posIndex, totalAnchors, w, h).y;
			createSingleAnchor(group, x, y, family, 'in', null, i);
			posIndex++;
		}
	}
}

function showAnchorsOfGear(group, v) {
	if (!v) {
		group.find('.anchor').forEach(a => {
			const isSelectedCableAnchor = selectedCable && (a.id() === selectedCable.fromId || a.id() === selectedCable.toId);
			if (!isSelectedCableAnchor) {
				a.visible(false);
				a.listening(false);
			}
		});
		group.getLayer().batchDraw();
		return;
	}

	group.find('.anchor').forEach(a => {
		const occupied = isAnchorOccupied(a.id());
		if (activeAnchor) {
			if (occupied) {
				a.visible(false);
				a.listening(false);
				return;
			}
			let isCompatible = (activeAnchor.family === 'aes')
				? (a.family === 'aes')
				: (a.family === activeAnchor.family && a.iotype !== activeAnchor.iotype);

			a.visible(isCompatible);
			a.listening(isCompatible);
			if (isCompatible) { a.opacity(1); a.strokeWidth(5); }
		} else {
			a.visible(true); a.listening(true); a.opacity(1);
			a.strokeWidth(occupied ? 0 : 5);
		}
	});
	group.getLayer().batchDraw();
}

function showAllAnchors(v, filterFamily = null, filterType = null) {
	stage.find('.anchor').forEach(a => {
		if (!v || isAnchorOccupied(a.id())) {
			a.visible(false); a.listening(false);
		} else if (filterFamily === 'aes') {
			const isAes = a.family === 'aes';
			a.visible(isAes); a.listening(isAes);
			if (isAes) a.opacity(1);
		} else if (filterFamily && filterType) {
			const isCompatible = (a.family === filterFamily && a.iotype !== filterType);
			a.visible(isCompatible); a.listening(isCompatible);
			if (isCompatible) a.opacity(1);
		} else {
			a.visible(true); a.listening(true); a.opacity(1);
		}
		if (a.visible()) a.strokeWidth(5);
	});
	mainLayer.batchDraw();
}

function isAnchorOccupied(anchorId) {
	return cables.some(c => c.fromId === anchorId || c.toId === anchorId);
}

function resetAnchorAfterDelete(anchorId) {
	const anchor = stage.findOne('#' + anchorId);
	if (anchor) {
		if (anchor.family && CABLE_FAMILIES[anchor.family]) {
			anchor.fill(CABLE_FAMILIES[anchor.family].color);
		}
		anchor.opacity(0);
		if (anchor.getLayer()) {
			anchor.getLayer().draw();
		}
	}
}