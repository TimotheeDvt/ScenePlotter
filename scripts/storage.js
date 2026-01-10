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
			rotation: g.rotation()
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
		data.gear.forEach(g => addEquipment("assets/" + g.src, g.x, g.y, g.id, g.label, g.connections || {}, g.anchors, g.width, g.height, g.rotation));
		setTimeout(() => {
			data.cables.forEach(c => {
				const sn = stage.findOne('#' + c.fromId);
				const en = stage.findOne('#' + c.toId);
				if (sn && en) createCable(sn, en, c.midPoints, c.label, c.orthoInverse);
			});
			mainLayer.batchDraw();
			cableLayer.batchDraw();
		}, 300);
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
			rotation: g.rotation()
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
	state.gear.forEach(g => addEquipment(g.src, g.x, g.y, g.id, g.label, g.connections || {}, g.anchors, g.width, g.height, g.rotation));
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
		cableLayer.draw();
	}, 150);
	isOrtho = state.isOrtho;
}