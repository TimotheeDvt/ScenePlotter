const SVG_LIBRARY = [
	// Instruments
	{
		"name": "Drums",
		"path": "drums",
		"category": "Instruments",
		"width": 200,
		"height": 160,
		"connections": {
			"xlr": { "in": 0, "out": 8 }
		},
		"fixedAnchors": [
			{ family: "xlr", type: "out", x: 0.5, y: 0, i:0 },
			{ family: "xlr", type: "out", x: 10, y: 0, i:1 },
			{ family: "xlr", type: "out", x: 20, y: 0, i:2 },
			{ family: "xlr", type: "out", x: 30, y: 0, i:3 },
			{ family: "xlr", type: "out", x: 40, y: 0, i:4 },
			{ family: "xlr", type: "out", x: 50, y: 0, i:5 },
			{ family: "xlr", type: "out", x: 60, y: 0, i:6 },
			{ family: "xlr", type: "out", x: 70, y: 0, i:7 }
		]
	},
	{
		"name": "AGuitar",
		"path": "acc_guitar",
		"category": "Instruments",
		"width": 30,
		"height": 20,
		"connections": {
			"jack": { "in": 0, "out": 1 }
		}
	},
	{
		"name": "EGuitar",
		"path": "elec_guitar",
		"category": "Instruments",
		"width": 30,
		"height": 30,
		"connections": {
			"jack": { "in": 0, "out": 1 }
		}
	},
	{
		"name": "Bass",
		"path": "bass.svg",
		"category": "Instruments",
		"width": 70,
		"height": 120,
		"connections": {
			"jack": { "in": 0, "out": 1 }
		}
	},
	{
		"name": "Trumpet",
		"path": "trumpet",
		"category": "Instruments",
		"width": 45,
		"height": 15,
		"connections": {
			"xlr": { "in": 0, "out": 1 }
		}
	},
	{
		"name": "Violin",
		"path": "violin",
		"category": "Instruments",
		"width": 30,
		"height": 40,
		"connections": {
			"xlr": { "in": 0, "out": 1 }
		}
	},
	{
		"name": "Piano",
		"path": "piano",
		"category": "Instruments",
		"width": 100,
		"height": 25,
		"connections": {
			"jack": { "in": 0, "out": 2 },
			"elec": { "in": 1, "out": 0 }
		},
		"fixedAnchors": [
			{ family: "jack", type: "out", x: 40, y: 0, i: 0 },
			{ family: "jack", type: "out", x: 45, y: 0, i: 1 },
			{ family: "elec", type: "in", x: 50, y: 0, i: 0 }
		]
	},
	// Microphones
	{
		"name": "SM58",
		"path": "sm58",
		"category": "Microphones",
		"width": 5.1,
		"height": 16.2,
		"connections": {
			"xlr": { "in": 0, "out": 1 }
		}
	},
	{
		"name": "SM57",
		"path": "sm57",
		"category": "Microphones",
		"width": 4.2,
		"height": 15.7,
		"connections": {
			"xlr": { "in": 0, "out": 1 }
		}
	},
	// Audio Gear
	{
		"name": "DBR10",
		"path": "DBR10",
		"category": "Audio",
		"width": 30.8,
		"height": 49.3,
		"connections": {
			"xlr": { "in": 1, "out": 0 },
			"elec" : { "in": 1, "out": 0 }
		},
		"fixedAnchors": [
			{ family: "xlr", type: "in", x: 0, y: 20, i: 0 },
			{ family: "elec", type: "in", x: 0, y: 30, i: 0 }
		]
	},
	{
		"name": "DL32",
		"path": "DL32",
		"outputNbAnchors": 16,
		"inputNbAnchors": 32,
		"electricalNbAnchors": 1,
		"category": "Audio",
		"width": 55,
		"height": 22,
		"connections": {
			"xlr": { "in": 32, "out": 16 },
			"elec" : { "in": 1, "out": 0 },
			"aes" : { "in": 2, "out": 0 },
			"MULTI": { "in": 1, "out": 0 }
		}
	},
	{
		"name": "M32R",
		"path": "M32R",
		"outputNbAnchors": 1,
		"inputNbAnchors": 1,
		"electricalNbAnchors": 1,
		"category": "Audio",
		"width": 70,
		"height": 70,
		"connections": {
			"elec" : { "in": 1, "out": 0 },
			"aes" : { "in": 2, "out": 0 }
		},
		"fixedAnchors": [
			{ family: "aes", type: "in", x: 25, y: 0, i: 0 },
			{ family: "aes", type: "out", x: 30, y: 0, i: 0 },
			{ family: "elec", type: "in", x: 40, y: 0, i: 0 }
		]
	},
	{
		"name": "D.I.",
		"path": "DI",
		"category": "Audio",
		"width": 8.6,
		"height": 14.7,
		"connections": {
			"xlr": { "in": 0, "out": 1 },
			"jack": { "in": 1, "out": 0 }
		}
	},
	{
		"name": "Multipair",
		"path": "multipaire",
		"category": "Audio",
		"width": 30,
		"height": 50,
		"connections": {
			"xlr": { "in": 24, "out": 8 },
			"MULTI": { "in": 0, "out": 1 }
		}
	},
	// Electricity
	{
		"name": "Power Strip",
		"path": "multiprise",
		"category": "Electricity",
		"width": 8,
		"height": 30,
		"connections": {
			"elec": { "in": 1, "out": 5 }
		},
		"fixedAnchors": [
			{ family: "elec", type: "in", x: 4, y: 30, i: 0 },
			{ family: "elec", type: "out", x: 0, y: 5, i: 0 },
			{ family: "elec", type: "out", x: 0, y: 10, i: 1 },
			{ family: "elec", type: "out", x: 0, y: 15, i: 2 },
			{ family: "elec", type: "out", x: 0, y: 20, i: 3 },
			{ family: "elec", type: "out", x: 0, y: 25, i: 4 }
		]
	},
	{
		"name": "Power outlet",
		"path": "prise",
		"category": "Electricity",
		"width": 8,
		"height": 8,
		"connections": {
			"elec": { "in": 0, "out": 1 }
		}
	},
	// Lights
	{
		"name": "LED Bar",
		"path": "led_bar",
		"category": "Lights",
		"width": 100,
		"height": 15,
		"connections": {
			"dmx": { "in": 1, "out": 1 },
			"elec": { "in": 1, "out": 1 }
		},
		"fixedAnchors": [
			{ family: "dmx", type: "in", x: 0, y: 7, i: 0 },
			{ family: "dmx", type: "out", x: 100, y: 7, i: 0 },
			{ family: "elec", type: "in", x: 0, y: 0, i: 0 },
			{ family: "elec", type: "out", x: 100, y: 0, i: 0 }
		]
	},
	{
		"name": "Led Spot",
		"path": "led_spot",
		"category": "Lights",
		"width": 25,
		"height": 28,
		"connections": {
			"dmx": { "in": 1, "out": 1 },
			"elec": { "in": 1, "out": 1 }
		},
		"fixedAnchors": [
			{ family: "dmx", type: "in", x: 0, y: 12.5, i: 0 },
			{ family: "dmx", type: "out", x: 25, y: 12.5, i: 0 },
			{ family: "elec", type: "in", x: 0, y: 0, i: 0 },
			{ family: "elec", type: "out", x: 25, y: 0, i: 0 }
		]
	},
	{
		"name": "DMX/USB Interface",
		"path": "dmx_usb_interface",
		"category": "Lights",
		"width": 6,
		"height": 8,
		"connections": {
			"dmx": { "in": 1, "out": 1 }
		},
		"fixedAnchors": [
			{ family: "dmx", type: "in", x: 6, y: 4 , i: 0},
			{ family: "dmx", type: "out", x: 0, y: 4, i: 0 }
		]
	},
	{
		"name": "DMX Terminator",
		"path": "dmx_terminator",
		"category": "Lights",
		"width": 10,
		"height": 3,
		"connections": {
			"dmx": { "in": 1, "out": 0 }
		},
		"fixedAnchors": [
			{ family: "dmx", type: "in", x: 10, y: 1.5, i: 0 }
		]
	},
];

const CABLE_FAMILIES = {
	xlr: { label: "XLR", color: "#0000FF", types: ["in", "out"], lengths: [2, 3, 6, 25, 32] },
	jack: { label: "Jack", color: "#000000", types: ["in", "out"], lengths: [2, 3, 6] },
	elec: { label: "Electricity", color: "#FFFFFF", types: ["in", "out"], lengths: [2, 3, 6] },
	aes: { label: "AES", color: "#FF0000", types: ["in", "out"], lengths: [2, 3, 6] },
	dmx: { label: "DMX", color: "#800080", types: ["in", "out"], lengths: [2, 3, 6] },
	MULTI: { label: "MULTI", color: "#00ff00", types: ["in", "out"], lengths: [2, 3, 6] }
};