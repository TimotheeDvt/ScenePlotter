function saveStage() {
	const data = {
		name: document.getElementById('projName').value,
		gear: mainLayer.getChildren().filter(c => c.hasName('gear')).map(g => ({
			id: g.id(), x: g.x(), y: g.y(), label: g.findOne('Text').text(),
			src: g.findOne('.icon').image().src.split("/svgs/")[1] || g.findOne('.icon').image().src,
			anchors: g.find('.anchor').map(a => ({ x: a.x(), y: a.y(), color: a.fill(), id: a.id() })),
			width: g.findOne('.icon').width(), height: g.findOne('.icon').height(),
			inCount: g.find('.anchor').filter(a => a.oldColor === '#3498db').length,
			outCount: g.find('.anchor').filter(a => a.oldColor === '#e74c3c').length
		})),
		cables: cables.map(c => ({
			fromId: c.fromId, toId: c.toId, color: c.line.stroke(), label: c.label ? c.label.text() : "",
			midPoints: c.handles.map(h => ({ x: h.x(), y: h.y() })), orthoInverse: c.orthoInverse
		})),
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
		mainLayer.getChildren().filter(c => c.hasName('gear')).forEach(g => g.destroy());
		cables.forEach(c => { c.line.destroy(); c.handlesGroup.destroy(); if (c.label) c.label.destroy(); });
		cables = [];
		isOrtho = data.isOrtho;
		document.getElementById('orthoToggle').checked = isOrtho;
		data.gear.forEach(g => addEquipment("svgs/" + g.src, g.x, g.y, g.id, g.label, g.outCount, g.inCount, g.anchors, g.width, g.height));
		setTimeout(() => {
			data.cables.forEach(c => {
				const sn = stage.findOne('#' + c.fromId); const en = stage.findOne('#' + c.toId);
				if (sn && en) createCable(sn, en, c.midPoints, c.color, c.label, c.orthoInverse);
			});
		}, 300);
	};
	reader.readAsText(event.target.files[0]);
}

function saveHistory() {
	if (isApplyingHistory) return;
	history = history.slice(0, historyStep + 1);
	const state = {
		gear: mainLayer.getChildren().filter(c => c.hasName('gear')).map(g => ({
			id: g.id(), x: g.x(), y: g.y(), label: g.findOne('Text').text(), src: g.findOne('.icon').image().src,
			anchors: g.find('.anchor').map(a => ({ x: a.x(), y: a.y(), color: a.fill(), id: a.id() })),
			width: g.findOne('.icon').width(), height: g.findOne('.icon').height(),
			inCount: g.find('.anchor').filter(a => a.oldColor === '#3498db').length,
			outCount: g.find('.anchor').filter(a => a.oldColor === '#e74c3c').length
		})),
		cables: cables.map(c => ({
			fromId: c.fromId, toId: c.toId, color: c.line.stroke(), label: c.label ? c.label.text() : "",
			midPoints: c.handles.map(h => ({ x: h.x(), y: h.y() })), orthoInverse: c.orthoInverse
		}))
	};
	history.push(JSON.stringify(state));
	historyStep++;
	if (history.length > 50) { history.shift(); historyStep--; }
}

function applyHistory(step) {
	isApplyingHistory = true;
	const state = JSON.parse(history[step]);
	mainLayer.getChildren().filter(c => c.hasName('gear')).forEach(g => g.destroy());
	cables.forEach(c => { c.line.destroy(); c.handlesGroup.destroy(); if (c.label) c.label.destroy(); });
	cables = [];
	state.gear.forEach(g => addEquipment(g.src, g.x, g.y, g.id, g.label, g.outCount, g.inCount, g.anchors, g.width, g.height));
	setTimeout(() => {
		state.cables.forEach(c => {
			const sn = stage.findOne('#' + c.fromId); const en = stage.findOne('#' + c.toId);
			if (sn && en) createCable(sn, en, c.midPoints, c.color, c.label, c.orthoInverse);
		});
		isApplyingHistory = false;
		mainLayer.draw(); cableLayer.draw();
	}, 150);
}