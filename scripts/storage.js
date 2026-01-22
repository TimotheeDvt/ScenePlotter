function saveStage() {
	const allGear = [];
	const allNotes = [];

	Object.values(categoryGroups).forEach(group => {
		const gears = group.getChildren().filter(c => c.hasName('gear')).map(g => ({
			id: g.id(),
			x: g.x(),
			y: g.y(),
			label: g.findOne('Text').text(),
			src: g.findOne('.icon').image().src.split("/assets/")[1] || g.findOne('.icon').image().src,
			anchors: g.find('.anchor').map(a => ({ x: a.x(), y: a.y(), color: a.fill(), id: a.id(), family: a.family, iotype: a.iotype })),
			width: g.findOne('.icon').width(),
			height: g.findOne('.icon').height(),
			connections: g.connections,
			rotation: g.rotation(),
			name: g.assetName
		}));

		const notes = group.getChildren().filter(c => c.hasName('free-text')).map(n => ({
			x: n.x(),
			y: n.y(),
			text: n.text(),
			fontSize: n.fontSize(),
			color: n.fill()
		}));

		allGear.push(...gears);
		allNotes.push(...notes);
	});

	const data = {
		name: document.getElementById('projName').value,
		gear: allGear,
		cables: cables.map(c => ({
			fromId: c.fromId,
			toId: c.toId,
			color: c.line.stroke(),
			label: c.label ? c.label.text() : "",
			midPoints: c.handles.map(h => ({ x: h.x(), y: h.y() })),
			orthoInverse: c.orthoInverse
		})),
		notes: allNotes,
		isOrtho
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

		Object.values(categoryGroups).forEach(group => {
			group.getChildren().filter(c => c.hasName('gear') || c.hasName('free-text')).forEach(child => child.destroy());
		});

		cables.forEach(c => {
			c.line.destroy();
			c.handlesGroup.destroy();
			if (c.label) c.label.destroy();
		});
		cables = [];
		isOrtho = data.isOrtho;
		document.getElementById('orthoToggle').checked = isOrtho;
		if (data.notes) {
			data.notes.forEach(n => addNewNote(n.text, n.x, n.y, n.color, n.fontSize));
		}
		data.gear.forEach(g => addEquipment("" + g.src, g.x, g.y, g.id, g.label, g.connections || {}, g.anchors, g.width, g.height, g.rotation, g.path, g.name));
		setTimeout(() => {
			data.cables.forEach(c => {
				const sn = stage.findOne('#' + c.fromId);
				const en = stage.findOne('#' + c.toId);
				if (sn && en) createCable(sn, en, c.midPoints, c.label, c.orthoInverse);
			});
			mainLayer.batchDraw();
		}, 300);
		selectedCable = null;
		selectedGears = [];
		updateSelectionUI();
	};
	reader.readAsText(event.target.files[0]);
}

function saveHistory() {
	if (isApplyingHistory) return;
	history = history.slice(0, historyStep + 1);

	const allGear = [];
	const allNotes = [];

	Object.values(categoryGroups).forEach(group => {
		const gearsInGroup = group.getChildren().filter(c => c.hasName('gear')).map(g => ({
			id: g.id(),
			x: g.x(),
			y: g.y(),
			label: g.findOne('Text').text(),
			src: g.findOne('.icon').image().src,
			anchors: g.find('.anchor').map(a => ({ x: a.x(), y: a.y(), color: a.fill(), id: a.id() })),
			width: g.findOne('.icon').width(),
			height: g.findOne('.icon').height(),
			connections: g.connections,
			rotation: g.rotation(),
			name: g.assetName
		}));

		const notesInGroup = group.getChildren().filter(c => c.hasName('free-text')).map(n => ({
			x: n.x(),
			y: n.y(),
			text: n.text(),
			fontSize: n.fontSize(),
			color: n.fill()
		}));

		allGear.push(...gearsInGroup);
		allNotes.push(...notesInGroup);
	});

	const state = {
		gear: allGear,
		cables: cables.map(c => ({
			fromId: c.fromId,
			toId: c.toId,
			color: c.line.stroke(),
			label: c.label ? c.label.text() : "",
			midPoints: c.handles.map(h => ({ x: h.x(), y: h.y() })),
			orthoInverse: c.orthoInverse
		})),
		notes: allNotes,
		isOrtho
	};

	history.push(JSON.stringify(state));
	historyStep++;
	if (history.length > 50) {
		history.shift();
		historyStep--;
	}
}

function applyHistory(step) {
	isApplyingHistory = true;
	const state = JSON.parse(history[step]);

	Object.values(categoryGroups).forEach(group => {
		group.destroyChildren();
	});

	cables.forEach(c => {
		c.line.destroy();
		c.handlesGroup.destroy();
		if (c.label) c.label.destroy();
	});
	cables = [];
	state.gear.forEach(g => addEquipment(g.src, g.x, g.y, g.id, g.label, g.connections || {}, g.anchors, g.width, g.height, g.rotation, g.path, g.name));
	if (state.notes) {
		state.notes.forEach(n => addNewNote(n.text, n.x, n.y, n.color, n.fontSize));
	}
	setTimeout(() => {
		state.cables.forEach(c => {
			const sn = stage.findOne('#' + c.fromId);
			const en = stage.findOne('#' + c.toId);
			if (sn && en) createCable(sn, en, c.midPoints, c.color, c.label, c.orthoInverse);
		});
		isApplyingHistory = false;
		mainLayer.draw();
	}, 150);
	isOrtho = state.isOrtho;
}

function exportScene(format) {
	alert("Ca marche pas encore très bien donc prend un screenshot en attendant :)");
	return;
	const items = mainLayer.getChildren(node => {
		return node.visible() && (node.hasName('gear') || node.hasName('free-text'));
	});

	let contentBox;
	if (items.length > 0) {
		contentBox = items[0].getClientRect();
		items.forEach(item => {
			const itemRect = item.getClientRect();
			contentBox = {
				x: Math.min(contentBox.x, itemRect.x),
				y: Math.min(contentBox.y, itemRect.y),
				width: Math.max(contentBox.x + contentBox.width, itemRect.x + itemRect.width) - Math.min(contentBox.x, itemRect.x),
				height: Math.max(contentBox.y + contentBox.height, itemRect.y + itemRect.height) - Math.min(contentBox.y, itemRect.y)
			};
		});
	} else {
		contentBox = { x: 0, y: 0, width: gridWidth / PX_PER_CM, height: gridHeight / PX_PER_CM };
	}

	const exportX = Math.min(0, contentBox.x);
	const exportY = Math.min(0, contentBox.y);
	const exportWidth = Math.max(gridWidth, contentBox.x + contentBox.width) - exportX;
	const exportHeight = Math.max(gridHeight, contentBox.y + contentBox.height) - exportY;

	const dataURL = stage.toDataURL({
		x: exportX - 10,
		y: exportY - 10,
		width: exportWidth + 20,
		height: exportHeight + 20,
		pixelRatio: 2
	});

	if (format === 'png') {
		const link = document.createElement('a');
		link.download = document.getElementById('projName').value + '.png';
		link.href = dataURL;
		link.click();
	} else {
		const { jsPDF } = window.jspdf;
		const pdf = new jsPDF(box.width > box.height ? 'l' : 'p', 'px', [box.width, box.height]);
		pdf.addImage(dataURL, 'PNG', 0, 0, box.width, box.height);
		pdf.save(document.getElementById('projName').value + '.pdf');
	}
}

function exportGearList() {
	let content = `STAGE LIST: ${document.getElementById('projName').value}\n`;

	// --- 1. GEAR LIST SORTED BY CATEGORY ---
	content += "--- GEARS ---\n";
	const gearByCat = {};

	Object.keys(categoryGroups).forEach(cat => {
		const gears = categoryGroups[cat].find('.gear');
		if (gears.length > 0) {
			// Group items within this category to count quantities
			const counts = {};
			gears.forEach(g => {
				const name = g.findOne('Text').text() || '';
				const asset = g.assetName || "Generic";
				// Create a unique key combining name and asset
				const key = name !== '' ? `${name} (${asset})` : asset;
				counts[key] = (counts[key] || 0) + 1;
			});
			gearByCat[cat] = counts;
		}
	});

	for (const [cat, items] of Object.entries(gearByCat)) {
		content += `[${cat.toUpperCase()}]\n`;
		// Sort the unique keys alphabetically
		Object.keys(items).sort().forEach(itemKey => {
			const quantity = items[itemKey];
			const quantityStr = quantity > 1 ? ` (x${quantity})` : '';
			content += ` - ${itemKey}${quantityStr}\n`;
		});
		content += "\n";
	}

	// --- 2. CABLE LIST SORTED BY TYPE AND LENGTH ---
	content += "--- CABLE LIST ---\n";

	const groupedCables = {};

	cables.forEach(c => {
		const familyConfig = CABLE_FAMILIES[c.family];
		const actualLengthCm = (c.length || calculateCableLength(c)) / PX_PER_CM;
		let finalLength = actualLengthCm;
		if (familyConfig && familyConfig.lengths) {
			const sortedAvailable = [...familyConfig.lengths].sort((a, b) => a - b);
			const upperLength = sortedAvailable.find(l => l >= actualLengthCm);
			if (upperLength !== undefined) {
				finalLength = upperLength;
			} else {
				finalLength = Math.ceil(actualLengthCm);
			}
		}

		const label = `${finalLength}${typeof finalLength === 'number' ? 'm' : 'cm'}`;

		if (!groupedCables[c.family]) groupedCables[c.family] = {};
		groupedCables[c.family][label] = (groupedCables[c.family][label] || 0) + 1;
	});

	Object.keys(groupedCables).sort().forEach(family => {
		content += `[${family.toUpperCase()}]\n`;

		const lengths = groupedCables[family];
		Object.keys(lengths).sort((a, b) => parseFloat(a) - parseFloat(b)).forEach(lenLabel => {
			const count = lengths[lenLabel];
			const countStr = count > 1 ? ` (x${count})` : '';
			content += ` - ${lenLabel}${countStr}\n`;
		});
		content += "\n";
	});

	const blob = new Blob([content], { type: 'text/plain' });
	const url = URL.createObjectURL(blob);
	const link = document.createElement('a');
	link.href = url;
	link.download = `${document.getElementById('projName').value}_list.txt`;
	link.click();
	URL.revokeObjectURL(url);
}