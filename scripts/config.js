// Global State
let isOrtho = true;
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
let allCablesVisible = true;
let idEquivalents = {};

// Constants
let PX_PER_CM = 15;
let ANCHOR_HIT_RADIUS = 40;
let SNAP_SIZE = 10 * PX_PER_CM;
let GRID_CELL_SIZE = 20 * PX_PER_CM;
let gridWidth = 600 * PX_PER_CM;
let gridHeight = 400 * PX_PER_CM;

// Konva Setup
const container = document.getElementById('canvas-container');
const stage = new Konva.Stage({
	container: 'canvas-container',
	width: container.offsetWidth,
	height: container.offsetHeight
});

const categoryGroups = {};
const gridLayer = new Konva.Layer();
const mainLayer = new Konva.Layer();
const tempLayer = new Konva.Layer();

stage.add(gridLayer, mainLayer, tempLayer);

// Shared Transformer
const tr = new Konva.Transformer({
	rotateAnchorOffset: 30,
	borderStroke: '#007acc',
	keepRatio: true,
	enabledAnchors: ['top-left', 'top-right', 'bottom-left', 'bottom-right'],
	dragable: true,
	shouldOverdrawWholeArea: true,
	rotationSnaps: [0, 45, 90, 135, 180, 225, 270, 315],
	rotationSnapTolerance: 10
});
tempLayer.add(tr);

// Drag line for cable creation
const dragLine = new Konva.Line({
	stroke: '#ffffff',
	strokeWidth: 20,
	dash: [40, 40],
	visible: false,
	listening: false
});
tempLayer.add(dragLine);

measurementLine = new Konva.Line({
	stroke: '#2ecc71',
	strokeWidth: 20,
	dash: [40, 40],
	visible: false,
	listening: false
});

measurementText = new Konva.Text({
	fill: '#2ecc71',
	fontSize: 140,
	fontStyle: 'bold',
	background: 'black',
	visible: false,
	listening: false
});

measurementStartCircle = new Konva.Circle({
	radius: 30,
	fill: '#2ecc71',
	visible: false,
	listening: false
});

measurementEndCircle = new Konva.Circle({
	radius: 30,
	fill: '#2ecc71',
	visible: false,
	listening: false
});

tempLayer.add(measurementStartCircle, measurementEndCircle, measurementLine, measurementText);