// Global State
let isOrtho = false;
let selectedGears = [];
let selectedCable = null;
let cables = [];
let activeAnchor = null;
let clipboard = null;
let history = ["{\"gear\": [], \"cables\": []}"];
let historyStep = 0;
let isApplyingHistory = false;
let canvasBackgroundColor = '#2a2a2a';
let showGrid = true;
let selectionStartPos = { x: 0, y: 0 };
let helpToggleLock = false;
let measurementLine = null;
let measurementText = null;
let isMeasuring = false;

// Constants
const PX_PER_CM = 15;
const SNAP_SIZE = 30;
let gridWidth = 50 * PX_PER_CM;
let gridHeight = 30 * PX_PER_CM;

// Konva Setup
const container = document.getElementById('canvas-container');
const stage = new Konva.Stage({
	container: 'canvas-container',
	width: container.offsetWidth,
	height: container.offsetHeight
});

const gridLayer = new Konva.Layer();
const cableLayer = new Konva.Layer();
const mainLayer = new Konva.Layer();
const tempLayer = new Konva.Layer();

stage.add(gridLayer, cableLayer, mainLayer, tempLayer);

// Shared Transformer
const tr = new Konva.Transformer({
	rotateAnchorOffset: 30,
	borderStroke: '#007acc',
	keepRatio: true,
	enabledAnchors: ['top-left', 'top-right', 'bottom-left', 'bottom-right']
});
mainLayer.add(tr);

// Drag line for cable creation
const dragLine = new Konva.Line({
	stroke: '#ffffff',
	strokeWidth: 2,
	dash: [5, 5],
	visible: false,
	listening: false
});
tempLayer.add(dragLine);

measurementLine = new Konva.Line({
	stroke: '#2ecc71',
	strokeWidth: 2,
	dash: [4, 4],
	visible: false,
	listening: false
});

measurementText = new Konva.Text({
	fill: '#2ecc71',
	fontSize: 14,
	fontStyle: 'bold',
	background: 'black',
	visible: false,
	listening: false
});

measurementStartCircle = new Konva.Circle({
	radius: 3,
	fill: '#2ecc71',
	visible: false,
	listening: false
});

measurementEndCircle = new Konva.Circle({
	radius: 3,
	fill: '#2ecc71',
	visible: false,
	listening: false
});

tempLayer.add(measurementStartCircle, measurementEndCircle);

tempLayer.add(measurementLine, measurementText);