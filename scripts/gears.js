function addEquipment(src, x = 100, y = 100, id = null, labelText = "", connections = {}, anchorData = null, width = null, height = null) {
    const nativeImg = new Image();
    nativeImg.onload = () => {
        const group = new Konva.Group({
            x: x, y: y, draggable: true, name: 'gear', id: id || 'g' + Date.now()
        });

        group.connections = connections;

        addUI(group, nativeImg, labelText, width, height);

        if (anchorData && anchorData.length > 0) {
            anchorData.forEach(ad => createSingleAnchor(group, ad.x, ad.y, ad.family, ad.type, ad.id));
        } else {
            generateDefaultAnchors(group, connections);
        }

        addEventListenersGroup(group);
        if (!isApplyingHistory) saveHistory();
        mainLayer.batchDraw();
    };
    nativeImg.src = src;
}

function createSingleAnchor(group, x, y, family, type, id) {
    const img = group.findOne('.icon');
    const color = CABLE_FAMILIES[family] ? CABLE_FAMILIES[family].color : '#888';
    const rotation = calculateAnchorRotation(x, y, img.width(), img.height(), type);

    const triangle = new Konva.RegularPolygon({
        x: x, y: y,
        sides: 3,
        radius: 40,
        fill: color,
        stroke: 'white',
        strokeWidth: 5,
        rotation: rotation,
        draggable: true,
        name: 'anchor',
        id: id || group.id() + '-' + family + '-' + type + Math.random()
    });

    triangle.family = family;
    triangle.iotype = type;

    triangle.on('dragmove', () => {
        const w = img.width();
        const h = img.height();
        let cx = triangle.x();
        let cy = triangle.y();

        if (Math.abs(cx - w/2) / w > Math.abs(cy - h/2) / h) {
            triangle.x(cx > w/2 ? w : 0);
            triangle.y(Math.max(0, Math.min(h, cy)));
        } else {
            triangle.y(cy > h/2 ? h : 0);
            triangle.x(Math.max(0, Math.min(w, cx)));
        }

        triangle.rotation(calculateAnchorRotation(triangle.x(), triangle.y(), w, h, type));
        updateAllCables();
    });

    addEventListenersAnchor(triangle, img, group);
    group.add(triangle);
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
		text: labelText, fontSize: 12, fill: 'white', y: finalWidth + 50,
		width: finalWidth, align: 'center', fontStyle: 'bold',
		listening: false, visible: labelText !== ""
	});

	group.add(img, label);
	mainLayer.add(group);
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

	group.on('dragend', () => saveHistory());
}

function addEventListenersAnchor(c, img, group) {
	c.on('mousedown touchstart', (e) => {
		e.cancelBubble = true;
		if (e.evt.button === 0 && (e.evt.ctrlKey || e.evt.metaKey)) {
			c.stopDrag();
			activeAnchor = c;
			showAllAnchors(true);
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
		updateAllCables();
	});

	c.on('dragend', (e) => {
		e.cancelBubble = true;
		group.find('.virtual-anchor').forEach(va => va.destroy());
		showAnchorsOfGear(group, true);
		mainLayer.draw();
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

    let index = 0;
    for (const [family, counts] of Object.entries(connections)) {
        for (let i = 0; i < counts.out; i++) {
            const pos = getRectPos(index++, totalAnchors, w, h);
            createSingleAnchor(group, pos.x, pos.y, family, 'out');
        }
        for (let i = 0; i < counts.in; i++) {
            const pos = getRectPos(index++, totalAnchors, w, h);
            createSingleAnchor(group, pos.x, pos.y, family, 'in');
        }
    }
}

function showAnchorsOfGear(g, v) {
	if (!v && activeAnchor) return;
	g.find('.anchor').forEach(a => a.opacity(v ? 1 : 0));
	mainLayer.draw();
}

function showAllAnchors(v) {
	stage.find('.anchor').forEach(a => a.opacity(v ? 1 : 0));
	mainLayer.draw();
}