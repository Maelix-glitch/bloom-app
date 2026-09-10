globalThis.__nitro_main__ = import.meta.url;
import { i as HTTPError, n as defineLazyEventHandler, t as H3Core } from "./_libs/h3+rou3+srvx.mjs";
import { t as HookableCore } from "./_libs/hookable.mjs";
import { r as FastResponse } from "./_libs/h3-v2+rou3+srvx.mjs";
//#region #nitro-vite-setup
function lazyService(loader) {
	let promise, mod;
	return { fetch(req) {
		if (mod) return mod.fetch(req);
		if (!promise) promise = loader().then((_mod) => mod = _mod.default || _mod);
		return promise.then((mod) => mod.fetch(req));
	} };
}
var services = { ["ssr"]: lazyService(() => import("./_ssr/ssr.mjs")) };
globalThis.__nitro_vite_envs__ = services;
//#endregion
//#region #nitro/virtual/public-assets-data
var public_assets_data_default = {
	"/favicon.ico": {
		"type": "image/vnd.microsoft.icon",
		"etag": "\"2709-WTBVh+RcmxfpCmIoXkd0eQ0n1vM\"",
		"mtime": "2026-09-10T09:29:56.102Z",
		"size": 9993,
		"path": "../public/favicon.ico"
	},
	"/manifest.webmanifest": {
		"type": "application/manifest+json",
		"etag": "\"6df-bUwTole7cBr1PpU1RKqXDEXhdD0\"",
		"mtime": "2026-09-10T10:14:51.283Z",
		"size": 1759,
		"path": "../public/manifest.webmanifest"
	},
	"/robots.txt": {
		"type": "text/plain; charset=utf-8",
		"etag": "\"ae-hLVBrSrDdpIw3Xl0dJPRkupPepQ\"",
		"mtime": "2026-08-24T08:45:23.078Z",
		"size": 174,
		"path": "../public/robots.txt"
	},
	"/assets/activity-DJZI7e2A.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"df-F6+eY1CoAX247g5BuQnude9djkE\"",
		"mtime": "2026-09-10T12:42:59.308Z",
		"size": 223,
		"path": "../public/assets/activity-DJZI7e2A.js"
	},
	"/sw.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"efb-uIXbd51uVlwtocuxv193cqA+hHg\"",
		"mtime": "2026-09-10T12:12:59.633Z",
		"size": 3835,
		"path": "../public/sw.js"
	},
	"/assets/AddHabitModal-BNfD8Qyk.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"49e6-fpFlU6WrS1kKHtc9mR7+xmJ1VYA\"",
		"mtime": "2026-09-10T12:42:59.300Z",
		"size": 18918,
		"path": "../public/assets/AddHabitModal-BNfD8Qyk.js"
	},
	"/assets/AddHabitModal-C2Z1rpgG.css": {
		"type": "text/css; charset=utf-8",
		"etag": "\"42c6-w9zmMbu3ObnlefCheoPyPYDAZyY\"",
		"mtime": "2026-09-10T12:42:59.354Z",
		"size": 17094,
		"path": "../public/assets/AddHabitModal-C2Z1rpgG.css"
	},
	"/assets/AssistantPanel-Cxo9noQ1.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"14c8-jdsInYANMAlgOYPipa7Zb2gGVtU\"",
		"mtime": "2026-09-10T12:42:59.301Z",
		"size": 5320,
		"path": "../public/assets/AssistantPanel-Cxo9noQ1.js"
	},
	"/assets/arrow-up-right-DLAkDo7u.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"9c-JNUIx5NVgfwGGDAQVVtgbG1CGqM\"",
		"mtime": "2026-09-10T12:42:59.309Z",
		"size": 156,
		"path": "../public/assets/arrow-up-right-DLAkDo7u.js"
	},
	"/assets/arrow-down-B1BlUxzU.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"9a-sz1eTPB8Aw1Gv2U5dEEGLC9lyog\"",
		"mtime": "2026-09-10T12:42:59.308Z",
		"size": 154,
		"path": "../public/assets/arrow-down-B1BlUxzU.js"
	},
	"/assets/analytics-q5cIe7eE.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"2e1e-HSy7rNH++etfyuBJ81uiZDiq+Hs\"",
		"mtime": "2026-09-10T12:42:59.308Z",
		"size": 11806,
		"path": "../public/assets/analytics-q5cIe7eE.js"
	},
	"/assets/bloom-sheet-D7LABTOT.css": {
		"type": "text/css; charset=utf-8",
		"etag": "\"5210-6X8vvQOJLa9rMoxpGZ27TPo+/LE\"",
		"mtime": "2026-09-10T12:42:59.354Z",
		"size": 21008,
		"path": "../public/assets/bloom-sheet-D7LABTOT.css"
	},
	"/assets/bell-Jnnt7HPw.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"117-i88qQlEzJzK/ejAP4F3aVF42T40\"",
		"mtime": "2026-09-10T12:42:59.309Z",
		"size": 279,
		"path": "../public/assets/bell-Jnnt7HPw.js"
	},
	"/assets/Atmosphere-D0tAz3wR.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"f4b-ObcIP1h/+cEbymIT0dQrSqZwTLk\"",
		"mtime": "2026-09-10T12:42:59.301Z",
		"size": 3915,
		"path": "../public/assets/Atmosphere-D0tAz3wR.js"
	},
	"/assets/BloomHeader-DuN9ovCF.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"b6a-Qv5EvQSEf+W6Wr15exbxmiiN6b8\"",
		"mtime": "2026-09-10T12:42:59.301Z",
		"size": 2922,
		"path": "../public/assets/BloomHeader-DuN9ovCF.js"
	},
	"/assets/bloom-sheet-zeya0Ceh.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"944-o7uWj3n26NjAmmsvc9iu9UbHwGQ\"",
		"mtime": "2026-09-10T12:42:59.309Z",
		"size": 2372,
		"path": "../public/assets/bloom-sheet-zeya0Ceh.js"
	},
	"/assets/bokeh-CANVd9cB.jpg": {
		"type": "image/jpeg",
		"etag": "\"20db4-k3bgVppOktIZsuSTjW5s7B7ZJr4\"",
		"mtime": "2026-09-10T12:42:59.356Z",
		"size": 134580,
		"path": "../public/assets/bokeh-CANVd9cB.jpg"
	},
	"/assets/calendar-check-Bl6fdoet.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"126-N9qkw/CGNENiWmyW+YpOqSMHNKc\"",
		"mtime": "2026-09-10T12:42:59.309Z",
		"size": 294,
		"path": "../public/assets/calendar-check-Bl6fdoet.js"
	},
	"/assets/calendar-clock-DHH8hiN3.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"16f-nbJP4QcvmsdJP6aaYgiwmibCSwY\"",
		"mtime": "2026-09-10T12:42:59.311Z",
		"size": 367,
		"path": "../public/assets/calendar-clock-DHH8hiN3.js"
	},
	"/assets/candle-BCrW_19q.jpg": {
		"type": "image/jpeg",
		"etag": "\"f8fa-dRhuCqVuqQ3aA3N0mCBEnj4vrX4\"",
		"mtime": "2026-09-10T12:42:59.356Z",
		"size": 63738,
		"path": "../public/assets/candle-BCrW_19q.jpg"
	},
	"/assets/chart-column-C0AeAGJm.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"f0-+ee1gsYFVjaaS19xTTzhl/WT6vI\"",
		"mtime": "2026-09-10T12:42:59.311Z",
		"size": 240,
		"path": "../public/assets/chart-column-C0AeAGJm.js"
	},
	"/assets/chevron-down-BxkIhjb3.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"75-j12+0jCEwoFSXhBjPRz9GpHhXzk\"",
		"mtime": "2026-09-10T12:42:59.312Z",
		"size": 117,
		"path": "../public/assets/chevron-down-BxkIhjb3.js"
	},
	"/assets/chevron-left-D0xFguxs.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"77-wB4BwhIWGHyj/XNeOw8yyxy5gWs\"",
		"mtime": "2026-09-10T12:42:59.313Z",
		"size": 119,
		"path": "../public/assets/chevron-left-D0xFguxs.js"
	},
	"/assets/charts-Czr2-zn_.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"3ff3c-+NbDF5NC7q4PurKoNv8hVn5QCtI\"",
		"mtime": "2026-09-10T12:42:59.312Z",
		"size": 261948,
		"path": "../public/assets/charts-Czr2-zn_.js"
	},
	"/assets/chevron-right-Bu1vIx0O.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"77-+D7OSxqGKjAE0nj9aqe2t7GiuD0\"",
		"mtime": "2026-09-10T12:42:59.313Z",
		"size": 119,
		"path": "../public/assets/chevron-right-Bu1vIx0O.js"
	},
	"/assets/clock-3-RkkREGeo.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"9e-UG0kZHPSqJGem4FPR4ItR02BidM\"",
		"mtime": "2026-09-10T12:42:59.314Z",
		"size": 158,
		"path": "../public/assets/clock-3-RkkREGeo.js"
	},
	"/assets/circle-play-CAiQFoSe.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"1b6-8IXTyhyQukaV9QXfUO8cBQTbSVQ\"",
		"mtime": "2026-09-10T12:42:59.314Z",
		"size": 438,
		"path": "../public/assets/circle-play-CAiQFoSe.js"
	},
	"/assets/circle-alert-0k2CVl5C.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"ef-EI1UlKktMLZvPd8YdAo9e3uH4ls\"",
		"mtime": "2026-09-10T12:42:59.314Z",
		"size": 239,
		"path": "../public/assets/circle-alert-0k2CVl5C.js"
	},
	"/assets/coach-Bi3LQH9T.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"13647-M3NfR4KJ/EN0vRyMC6Mni/FCNgg\"",
		"mtime": "2026-09-10T12:42:59.315Z",
		"size": 79431,
		"path": "../public/assets/coach-Bi3LQH9T.js"
	},
	"/assets/coach-Cab5FeO5.css": {
		"type": "text/css; charset=utf-8",
		"etag": "\"be63-AO0dlOLVzPmtrDjOLq9uwlzTssM\"",
		"mtime": "2026-09-10T12:42:59.357Z",
		"size": 48739,
		"path": "../public/assets/coach-Cab5FeO5.css"
	},
	"/assets/Composer-0YC9dhgh.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"4e82-ftUPAch4g8xU+sA7Lmf45qieNg4\"",
		"mtime": "2026-09-10T12:42:59.302Z",
		"size": 20098,
		"path": "../public/assets/Composer-0YC9dhgh.js"
	},
	"/assets/components-DRj8tCrr.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"3f446-a5CmDbf3yiwFkvI2zs0BadybuBk\"",
		"mtime": "2026-09-10T12:42:59.315Z",
		"size": 259142,
		"path": "../public/assets/components-DRj8tCrr.js"
	},
	"/assets/confirm-sheet-BDPkF1ht.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"76f-06xX9MY8r8M3OIIA6mee9aMmkwM\"",
		"mtime": "2026-09-10T12:42:59.316Z",
		"size": 1903,
		"path": "../public/assets/confirm-sheet-BDPkF1ht.js"
	},
	"/assets/core-CuoFZo8I.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"9c-SNUEGuVVuAPBZyBi/Yvfrf4I0g0\"",
		"mtime": "2026-09-10T12:42:59.317Z",
		"size": 156,
		"path": "../public/assets/core-CuoFZo8I.js"
	},
	"/assets/Composer-BuUgojcG.css": {
		"type": "text/css; charset=utf-8",
		"etag": "\"2856-h4VR/KfIDQYg2GrExEaS1jjCEYU\"",
		"mtime": "2026-09-10T12:42:59.354Z",
		"size": 10326,
		"path": "../public/assets/Composer-BuUgojcG.css"
	},
	"/assets/core-DVz_Pog2.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"3376-7g7dkbFPPDYJtsKcgSUhmCHWogk\"",
		"mtime": "2026-09-10T12:42:59.317Z",
		"size": 13174,
		"path": "../public/assets/core-DVz_Pog2.js"
	},
	"/assets/copy-Ceutyal3.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"2fb-DKi5MHvZVuaYsLOQxr0mNwqSA24\"",
		"mtime": "2026-09-10T12:42:59.316Z",
		"size": 763,
		"path": "../public/assets/copy-Ceutyal3.js"
	},
	"/assets/cycle-DsVWKmib.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"a7e-he1OxQ+FLFRnv4VUpmkv+9msE04\"",
		"mtime": "2026-09-10T12:42:59.318Z",
		"size": 2686,
		"path": "../public/assets/cycle-DsVWKmib.js"
	},
	"/assets/cycle-classic-B-9f0Gcb.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"27294-mSylMcM/faF8EzJrfHDcOZZJfxY\"",
		"mtime": "2026-09-10T12:42:59.319Z",
		"size": 160404,
		"path": "../public/assets/cycle-classic-B-9f0Gcb.js"
	},
	"/assets/cycle-D_phLHra.css": {
		"type": "text/css; charset=utf-8",
		"etag": "\"5619-AdQATO+XdEZAgToMoEUMNEUG8CQ\"",
		"mtime": "2026-09-10T12:42:59.357Z",
		"size": 22041,
		"path": "../public/assets/cycle-D_phLHra.css"
	},
	"/assets/customGraphicKeyframeAnimation-Dxg_gut0.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"30c3d-odm20agRCrxAi/M4UDMxXhYQI3c\"",
		"mtime": "2026-09-10T12:42:59.318Z",
		"size": 199741,
		"path": "../public/assets/customGraphicKeyframeAnimation-Dxg_gut0.js"
	},
	"/assets/cycle-styles-DfndklLc.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"40b5-f2JYPk3k8mtD67/JntWkwtKfQ/4\"",
		"mtime": "2026-09-10T12:42:59.319Z",
		"size": 16565,
		"path": "../public/assets/cycle-styles-DfndklLc.js"
	},
	"/assets/CycleHistory-Br2K1_PJ.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"4a-0XylBp5JyZs+OHE/LVjNG9d5kPE\"",
		"mtime": "2026-09-10T12:42:59.302Z",
		"size": 74,
		"path": "../public/assets/CycleHistory-Br2K1_PJ.js"
	},
	"/assets/cycle2-DWeBPVhj.css": {
		"type": "text/css; charset=utf-8",
		"etag": "\"5aba-+StsfdjemkNM6O9+tb08gjGr98E\"",
		"mtime": "2026-09-10T12:42:59.358Z",
		"size": 23226,
		"path": "../public/assets/cycle2-DWeBPVhj.css"
	},
	"/assets/dashboard-Dx93hqlm.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"2025-+pPfcY1aoadlCYdATlkr6TlBZDs\"",
		"mtime": "2026-09-10T12:42:59.320Z",
		"size": 8229,
		"path": "../public/assets/dashboard-Dx93hqlm.js"
	},
	"/assets/CycleIntelligence-CT9lkN_y.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"1b04c-DWzJ/dm+Sy4k0ydq72fh96YgdM4\"",
		"mtime": "2026-09-10T12:42:59.302Z",
		"size": 110668,
		"path": "../public/assets/CycleIntelligence-CT9lkN_y.js"
	},
	"/assets/dialog-3uuw6XDM.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"742-JqxqRfTHNM42FmxqYk23tlRdcgo\"",
		"mtime": "2026-09-10T12:42:59.320Z",
		"size": 1858,
		"path": "../public/assets/dialog-3uuw6XDM.js"
	},
	"/assets/download-uDwovDo4.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"dd-HBqClsL+kNXEpcq9ofD3byjgcu0\"",
		"mtime": "2026-09-10T12:42:59.321Z",
		"size": 221,
		"path": "../public/assets/download-uDwovDo4.js"
	},
	"/assets/dist-Bc7wrN7j.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"8fb8-fdxds1euIS8Sp3pOmLOnxX61uZ4\"",
		"mtime": "2026-09-10T12:42:59.321Z",
		"size": 36792,
		"path": "../public/assets/dist-Bc7wrN7j.js"
	},
	"/assets/droplets-ts9hc9Kf.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"16a-pR8APo4dBPdkfPZKoVUqAGWCYZM\"",
		"mtime": "2026-09-10T12:42:59.321Z",
		"size": 362,
		"path": "../public/assets/droplets-ts9hc9Kf.js"
	},
	"/assets/Emblem-B7_l-plS.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"220b-IfeCEbbyeXwkEObugTAqiKTmwN8\"",
		"mtime": "2026-09-10T12:42:59.303Z",
		"size": 8715,
		"path": "../public/assets/Emblem-B7_l-plS.js"
	},
	"/assets/elements-BAYCcKvf.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"18fd2-mReb/30G/FY5PbjIG9e6R6Rn10w\"",
		"mtime": "2026-09-10T12:42:59.322Z",
		"size": 102354,
		"path": "../public/assets/elements-BAYCcKvf.js"
	},
	"/assets/esm-DKKGmMgN.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"1efa-uZ97SkNrCh8bUND7GXsvtD+T+3I\"",
		"mtime": "2026-09-10T12:42:59.323Z",
		"size": 7930,
		"path": "../public/assets/esm-DKKGmMgN.js"
	},
	"/assets/engine-fjRktoBe.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"4c10-5vsslTYo8IHxWZpxKhu12VSGp7c\"",
		"mtime": "2026-09-10T12:42:59.322Z",
		"size": 19472,
		"path": "../public/assets/engine-fjRktoBe.js"
	},
	"/assets/flame-DLDTXkXJ.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"bc-KCbr8KE0KwBCyexCX7S9GIwTFxg\"",
		"mtime": "2026-09-10T12:42:59.324Z",
		"size": 188,
		"path": "../public/assets/flame-DLDTXkXJ.js"
	},
	"/assets/flower-branch-DNSwmwiB.jpg": {
		"type": "image/jpeg",
		"etag": "\"e8b9-nYfv6yGO1fpntywRA3A+C5DRcho\"",
		"mtime": "2026-09-10T12:42:59.358Z",
		"size": 59577,
		"path": "../public/assets/flower-branch-DNSwmwiB.jpg"
	},
	"/assets/extension-CUL4evYB.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"2e073-m0VGWMwfkudv6XsUyDmTfQzU7xk\"",
		"mtime": "2026-09-10T12:42:59.323Z",
		"size": 188531,
		"path": "../public/assets/extension-CUL4evYB.js"
	},
	"/assets/flower-detail-DOgfpDE4.jpg": {
		"type": "image/jpeg",
		"etag": "\"15ed6-1cFLYQABtW0f81Sa/8NBbN76Q6s\"",
		"mtime": "2026-09-10T12:42:59.358Z",
		"size": 89814,
		"path": "../public/assets/flower-detail-DOgfpDE4.jpg"
	},
	"/assets/habits-BMF976wN.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"265b-K2OSIcoUY4z7Sc4By0PC3vHzxVc\"",
		"mtime": "2026-09-10T12:42:59.325Z",
		"size": 9819,
		"path": "../public/assets/habits-BMF976wN.js"
	},
	"/assets/HomeSidebar-NItmc3hB.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"22a1-G6jHHqni/T3sd+dcQ0u5gvgf34Q\"",
		"mtime": "2026-09-10T12:42:59.303Z",
		"size": 8865,
		"path": "../public/assets/HomeSidebar-NItmc3hB.js"
	},
	"/assets/image-94Wh18LO.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"2c0-r5+zxnxA6aqv8X2/F1ycZhs5ZMM\"",
		"mtime": "2026-09-10T12:42:59.326Z",
		"size": 704,
		"path": "../public/assets/image-94Wh18LO.js"
	},
	"/assets/graphic-CsjPMrQo.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"23be1-S0ZZBcgl1QYz1KTfsGLUpQ+ESQ0\"",
		"mtime": "2026-09-10T12:42:59.325Z",
		"size": 146401,
		"path": "../public/assets/graphic-CsjPMrQo.js"
	},
	"/assets/hero-window-BYceyZgH.jpg": {
		"type": "image/jpeg",
		"etag": "\"1cc81-A+kBaiulJlTEicD+Hr4FiAOPSLs\"",
		"mtime": "2026-09-10T12:42:59.359Z",
		"size": 117889,
		"path": "../public/assets/hero-window-BYceyZgH.jpg"
	},
	"/assets/index-B_F64sWo.css": {
		"type": "text/css; charset=utf-8",
		"etag": "\"3f6c-lQ82NxDhnpFRr40kzIn1zIol0wc\"",
		"mtime": "2026-09-10T12:42:59.359Z",
		"size": 16236,
		"path": "../public/assets/index-B_F64sWo.css"
	},
	"/assets/info-xLZGP0-O.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"c1-+mbgTxIs5Vt+aqjb7V+wc8feZN4\"",
		"mtime": "2026-09-10T12:42:59.326Z",
		"size": 193,
		"path": "../public/assets/info-xLZGP0-O.js"
	},
	"/assets/intelligence-CJk93Mr9.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"c007-1qc8yZlEI8Of90Oo7y+SzSB9rqA\"",
		"mtime": "2026-09-10T12:42:59.327Z",
		"size": 49159,
		"path": "../public/assets/intelligence-CJk93Mr9.js"
	},
	"/assets/intelligence-hHIcysh2.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"6f1b-JNIeqj8pH6EunbNre8zVizPFKI0\"",
		"mtime": "2026-09-10T12:42:59.327Z",
		"size": 28443,
		"path": "../public/assets/intelligence-hHIcysh2.js"
	},
	"/assets/leaf-CRRVQCtI.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"fe-JdrBwxViJp9YumYuu5i4eK/BWYE\"",
		"mtime": "2026-09-10T12:42:59.328Z",
		"size": 254,
		"path": "../public/assets/leaf-CRRVQCtI.js"
	},
	"/assets/jsx-runtime-DE3RlOCf.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"1edb-++aNIhyKgQeSqFVy8og9djQ1xvw\"",
		"mtime": "2026-09-10T12:42:59.328Z",
		"size": 7899,
		"path": "../public/assets/jsx-runtime-DE3RlOCf.js"
	},
	"/assets/localDay-CffLBJ2z.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"253-7P+PlglA9NHpQC1784RPNoPSebY\"",
		"mtime": "2026-09-10T12:42:59.329Z",
		"size": 595,
		"path": "../public/assets/localDay-CffLBJ2z.js"
	},
	"/assets/loader-circle-CDoiuU-w.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"85-eIkY6aWbjkWoPKD2/QrolaNf5n4\"",
		"mtime": "2026-09-10T12:42:59.328Z",
		"size": 133,
		"path": "../public/assets/loader-circle-CDoiuU-w.js"
	},
	"/assets/lock-DrVjC7b1.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"c3-DYKpJBbDdAFG2r2RqUoi2bd7yd8\"",
		"mtime": "2026-09-10T12:42:59.329Z",
		"size": 195,
		"path": "../public/assets/lock-DrVjC7b1.js"
	},
	"/assets/leaf-dark-s4I3nVeB.jpg": {
		"type": "image/jpeg",
		"etag": "\"ebad-jCubM19jD1vE+lEjqmGir7dyr3A\"",
		"mtime": "2026-09-10T12:42:59.359Z",
		"size": 60333,
		"path": "../public/assets/leaf-dark-s4I3nVeB.jpg"
	},
	"/assets/messages-Dc8f9Alk.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"392-WgS6Dx5HNx6o9pqQsUe3CakcC/I\"",
		"mtime": "2026-09-10T12:42:59.329Z",
		"size": 914,
		"path": "../public/assets/messages-Dc8f9Alk.js"
	},
	"/assets/index-m6yQh6SB.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"909dd-dopk76Ii7eBrFPnRXldX2wak1+U\"",
		"mtime": "2026-09-10T12:42:59.299Z",
		"size": 592349,
		"path": "../public/assets/index-m6yQh6SB.js"
	},
	"/assets/mood-ANqcn7QT.css": {
		"type": "text/css; charset=utf-8",
		"etag": "\"194f-haEW3Ga/voO9TwHAkK6gZ25KzPA\"",
		"mtime": "2026-09-10T12:42:59.360Z",
		"size": 6479,
		"path": "../public/assets/mood-ANqcn7QT.css"
	},
	"/assets/MetricsEntryModal-B0Y2b0J1.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"2344-0y3blmork/95RUJ9rcG72U80Pws\"",
		"mtime": "2026-09-10T12:42:59.304Z",
		"size": 9028,
		"path": "../public/assets/MetricsEntryModal-B0Y2b0J1.js"
	},
	"/assets/motion-DpLiHEYw.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"7de-NVvQPB+6ImtMH3//AcJO7+54wHg\"",
		"mtime": "2026-09-10T12:42:59.331Z",
		"size": 2014,
		"path": "../public/assets/motion-DpLiHEYw.js"
	},
	"/assets/not-found-i5RsCZif.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"76-Trmr7GZIBZuvfg4uM18tBiRtOXg\"",
		"mtime": "2026-09-10T12:42:59.332Z",
		"size": 118,
		"path": "../public/assets/not-found-i5RsCZif.js"
	},
	"/assets/palette-CtwvlKan.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"1f3-WP0kYoLKjsspaqZvvZvRqZnHd6k\"",
		"mtime": "2026-09-10T12:42:59.332Z",
		"size": 499,
		"path": "../public/assets/palette-CtwvlKan.js"
	},
	"/assets/mood-Bfr3on9r.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"c034-bhOYZV4BuLeYXVTlJO92bMNIHCQ\"",
		"mtime": "2026-09-10T12:42:59.331Z",
		"size": 49204,
		"path": "../public/assets/mood-Bfr3on9r.js"
	},
	"/assets/pencil-CuvluVSo.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"109-GXFkQkayNOFZ1CbKahTi8TORT18\"",
		"mtime": "2026-09-10T12:42:59.333Z",
		"size": 265,
		"path": "../public/assets/pencil-CuvluVSo.js"
	},
	"/assets/pen-line-D6VWBXyq.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"10a-hJ/082kJUw+It/wKBk/F4XorB4M\"",
		"mtime": "2026-09-10T12:42:59.332Z",
		"size": 266,
		"path": "../public/assets/pen-line-D6VWBXyq.js"
	},
	"/assets/mountain-lake-BgopHUKh.jpg": {
		"type": "image/jpeg",
		"etag": "\"18e4a-0tTwVnL6fneVZqXyi6w+ALhHU50\"",
		"mtime": "2026-09-10T12:42:59.360Z",
		"size": 101962,
		"path": "../public/assets/mountain-lake-BgopHUKh.jpg"
	},
	"/assets/pin-BEVNRL8g.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"14f-xfogRZHvk7Ux4oc4qZ+5QJJsJCU\"",
		"mtime": "2026-09-10T12:42:59.334Z",
		"size": 335,
		"path": "../public/assets/pin-BEVNRL8g.js"
	},
	"/assets/plus-CENETLkf.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"8e-WtfOd9aUjmI+ZeZxgvS+euM6aNg\"",
		"mtime": "2026-09-10T12:42:59.334Z",
		"size": 142,
		"path": "../public/assets/plus-CENETLkf.js"
	},
	"/assets/primitives-D8b6Ofwy.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"f61-X8tnpZOZ90+SNVR88/86luak6lY\"",
		"mtime": "2026-09-10T12:42:59.335Z",
		"size": 3937,
		"path": "../public/assets/primitives-D8b6Ofwy.js"
	},
	"/assets/periodStore-BHS60ECl.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"ab89-Yt8dW6Fz0WQg20CXilySF5VtDIM\"",
		"mtime": "2026-09-10T12:42:59.333Z",
		"size": 43913,
		"path": "../public/assets/periodStore-BHS60ECl.js"
	},
	"/assets/profile-UK84Kg3u.css": {
		"type": "text/css; charset=utf-8",
		"etag": "\"4319-aUKkcP3jdH1wS51AJa4/gzlSL+k\"",
		"mtime": "2026-09-10T12:42:59.361Z",
		"size": 17177,
		"path": "../public/assets/profile-UK84Kg3u.css"
	},
	"/assets/ProfileAvatar-DZeJ_di0.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"2311-f7ECR9qzp1Ly1X7TeOejHPKQKG0\"",
		"mtime": "2026-09-10T12:42:59.304Z",
		"size": 8977,
		"path": "../public/assets/ProfileAvatar-DZeJ_di0.js"
	},
	"/assets/PublicProfileView-BSH7tVte.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"380c-ozeivaGH+xXmkJYzpliy+2hmgd0\"",
		"mtime": "2026-09-10T12:42:59.305Z",
		"size": 14348,
		"path": "../public/assets/PublicProfileView-BSH7tVte.js"
	},
	"/assets/redirect-1Dss4sOM.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"216-AhfiXwQqYdLrM+uQAOtPHfIddmI\"",
		"mtime": "2026-09-10T12:42:59.337Z",
		"size": 534,
		"path": "../public/assets/redirect-1Dss4sOM.js"
	},
	"/assets/progression-Sm4ml5nf.css": {
		"type": "text/css; charset=utf-8",
		"etag": "\"ddf0-9t5kxd+J9tMSsUHGP3bO0jZtaOA\"",
		"mtime": "2026-09-10T12:42:59.361Z",
		"size": 56816,
		"path": "../public/assets/progression-Sm4ml5nf.css"
	},
	"/assets/prefs-D3IPXt_m.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"35fd7-+CM2mRaUZikUfA7D2yzWCZ7if38\"",
		"mtime": "2026-09-10T12:42:59.335Z",
		"size": 221143,
		"path": "../public/assets/prefs-D3IPXt_m.js"
	},
	"/assets/refresh-ccw-DoH9NGSM.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"136-ZKC9opJT3F/CDFg0xmcCZa+ymMA\"",
		"mtime": "2026-09-10T12:42:59.338Z",
		"size": 310,
		"path": "../public/assets/refresh-ccw-DoH9NGSM.js"
	},
	"/assets/refresh-cw-CH9cB71N.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"136-VtuZjiqvtxWeXbNkvgDYzGnaEMs\"",
		"mtime": "2026-09-10T12:42:59.338Z",
		"size": 310,
		"path": "../public/assets/refresh-cw-CH9cB71N.js"
	},
	"/assets/renderers-DUEpLE8z.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"839b-wEJx202ko5sjgJ41Stq2k1zHBP0\"",
		"mtime": "2026-09-10T12:42:59.338Z",
		"size": 33691,
		"path": "../public/assets/renderers-DUEpLE8z.js"
	},
	"/assets/progression-BlSU05Ag.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"11fd-QYbgfMjPtY5CtK15Sd+MwRz+4SY\"",
		"mtime": "2026-09-10T12:42:59.337Z",
		"size": 4605,
		"path": "../public/assets/progression-BlSU05Ag.js"
	},
	"/assets/profile-Dgj9sv2R.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"1d7d0-miUxb0VVTXCZUcY+Bo5tgWYbNfE\"",
		"mtime": "2026-09-10T12:42:59.336Z",
		"size": 120784,
		"path": "../public/assets/profile-Dgj9sv2R.js"
	},
	"/assets/rewards-Di-voPi6.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"4e60-HZijjzbtYRU+X8h2UgUlan7NChU\"",
		"mtime": "2026-09-10T12:42:59.339Z",
		"size": 20064,
		"path": "../public/assets/rewards-Di-voPi6.js"
	},
	"/assets/rewards-lH3gWeAc.css": {
		"type": "text/css; charset=utf-8",
		"etag": "\"af4b-JqDcXVmgGZkR2cbWxd3j5aCG8yw\"",
		"mtime": "2026-09-10T12:42:59.362Z",
		"size": 44875,
		"path": "../public/assets/rewards-lH3gWeAc.css"
	},
	"/assets/rewards.atelier-DgFIoLTb.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"1613-65N62w4eYYcPLcc02X4XHAWNIRs\"",
		"mtime": "2026-09-10T12:42:59.339Z",
		"size": 5651,
		"path": "../public/assets/rewards.atelier-DgFIoLTb.js"
	},
	"/assets/rewards-SecpA08y.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"9a-dlyoocvntJ5zRBs7Sg9FpUR1x98\"",
		"mtime": "2026-09-10T12:42:59.339Z",
		"size": 154,
		"path": "../public/assets/rewards-SecpA08y.js"
	},
	"/assets/rewards.index-CBLSmH_T.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"9bac-EdFhjhjEQsm2xeJRjaEncSSLVQY\"",
		"mtime": "2026-09-10T12:42:59.340Z",
		"size": 39852,
		"path": "../public/assets/rewards.index-CBLSmH_T.js"
	},
	"/assets/rolldown-runtime-hePW80VL.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"2cc-fA8td6k29UVF6JoPfhOPkceTK1M\"",
		"mtime": "2026-09-10T12:42:59.340Z",
		"size": 716,
		"path": "../public/assets/rolldown-runtime-hePW80VL.js"
	},
	"/assets/rotate-ccw-C6mDIN9i.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"bd-Y1cmok2OnPFQzejEIww55J77g3U\"",
		"mtime": "2026-09-10T12:42:59.340Z",
		"size": 189,
		"path": "../public/assets/rotate-ccw-C6mDIN9i.js"
	},
	"/assets/send-pz9nagI5.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"117-4BLVp7ffK9LxytGOZHbFJUtwwNE\"",
		"mtime": "2026-09-10T12:42:59.341Z",
		"size": 279,
		"path": "../public/assets/send-pz9nagI5.js"
	},
	"/assets/routes-Dy1ha5vp.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"d1dd-iGqTNltxfFGHwZv8DBNCuRJgRAA\"",
		"mtime": "2026-09-10T12:42:59.341Z",
		"size": 53725,
		"path": "../public/assets/routes-Dy1ha5vp.js"
	},
	"/assets/settings-xM3H11yg.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"1dc-yJKDbHx0wSmySTiSToz9/NGA5cU\"",
		"mtime": "2026-09-10T12:42:59.342Z",
		"size": 476,
		"path": "../public/assets/settings-xM3H11yg.js"
	},
	"/assets/shared-EmF6aVfK.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"14e7-Q1HTDWlc10miI0BuaRKTmUwMXp0\"",
		"mtime": "2026-09-10T12:42:59.342Z",
		"size": 5351,
		"path": "../public/assets/shared-EmF6aVfK.js"
	},
	"/assets/sheet-CmFHrlLC.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"b14-zaIZoguB2eNj6EpBeIUDjDsF8Ug\"",
		"mtime": "2026-09-10T12:42:59.343Z",
		"size": 2836,
		"path": "../public/assets/sheet-CmFHrlLC.js"
	},
	"/assets/shield-check-B8hln0kM.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"135-lLMLmi9pTKod3JkAE9cAu8b5BF4\"",
		"mtime": "2026-09-10T12:42:59.343Z",
		"size": 309,
		"path": "../public/assets/shield-check-B8hln0kM.js"
	},
	"/assets/sidebar-botanical-JtydDgxT.jpg": {
		"type": "image/jpeg",
		"etag": "\"6e79-vVuAx2EeMMNgT58AwoOL6Of8zXo\"",
		"mtime": "2026-09-10T12:42:59.362Z",
		"size": 28281,
		"path": "../public/assets/sidebar-botanical-JtydDgxT.jpg"
	},
	"/assets/sliders-horizontal-CNmCnjqx.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"19d-R4wcH8KZSOFm5qkQgbSMEhKGDw0\"",
		"mtime": "2026-09-10T12:42:59.344Z",
		"size": 413,
		"path": "../public/assets/sliders-horizontal-CNmCnjqx.js"
	},
	"/assets/smartphone-CtmlMkjf.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"ba-2vH336sqoMqpKrnopWJ/A5ySZLM\"",
		"mtime": "2026-09-10T12:42:59.344Z",
		"size": 186,
		"path": "../public/assets/smartphone-CtmlMkjf.js"
	},
	"/assets/storage-Bdq_Akua.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"1061-92o9/m3tuwHttrh/m8qoEctkxfI\"",
		"mtime": "2026-09-10T12:42:59.345Z",
		"size": 4193,
		"path": "../public/assets/storage-Bdq_Akua.js"
	},
	"/assets/store-CUnl9dAX.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"e37-wdVyDq/tzt/1i2oWpaDdR4ay/6Q\"",
		"mtime": "2026-09-10T12:42:59.345Z",
		"size": 3639,
		"path": "../public/assets/store-CUnl9dAX.js"
	},
	"/assets/today-BmoWVH16.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"30a2-qSJqP+3OkHXiqCAVNUhzsC1xuSM\"",
		"mtime": "2026-09-10T12:42:59.346Z",
		"size": 12450,
		"path": "../public/assets/today-BmoWVH16.js"
	},
	"/assets/StoryComposer-QmFSngLS.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"28de7-6Wc1iEFziONGk/H7dbdpiPn4AXo\"",
		"mtime": "2026-09-10T12:42:59.305Z",
		"size": 167399,
		"path": "../public/assets/StoryComposer-QmFSngLS.js"
	},
	"/assets/TrackerModal-CDxuor7a.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"933-nETazoLf2l2CsZ4EbdTa7SP5nW8\"",
		"mtime": "2026-09-10T12:42:59.306Z",
		"size": 2355,
		"path": "../public/assets/TrackerModal-CDxuor7a.js"
	},
	"/assets/trackers-BD8QPp4j.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"3eb-I1QqpOZ7EgUtW96qHDc8qQ+smig\"",
		"mtime": "2026-09-10T12:42:59.346Z",
		"size": 1003,
		"path": "../public/assets/trackers-BD8QPp4j.js"
	},
	"/assets/trackers-OQiYwwOx.css": {
		"type": "text/css; charset=utf-8",
		"etag": "\"2284-TiMVV/n3xRft1gCdFNxu9ca2nwM\"",
		"mtime": "2026-09-10T12:42:59.363Z",
		"size": 8836,
		"path": "../public/assets/trackers-OQiYwwOx.css"
	},
	"/assets/trackers-premium-DEGw0WBm.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"45b0-VgyGpdwmI5UL8MhAoUibx14kBEU\"",
		"mtime": "2026-09-10T12:42:59.346Z",
		"size": 17840,
		"path": "../public/assets/trackers-premium-DEGw0WBm.js"
	},
	"/assets/styles-DWhul0yH.css": {
		"type": "text/css; charset=utf-8",
		"etag": "\"2eb8c-mTomp5IKTlTAtIcoLgkaCSWGDhw\"",
		"mtime": "2026-09-10T12:42:59.362Z",
		"size": 191372,
		"path": "../public/assets/styles-DWhul0yH.css"
	},
	"/assets/trackers-styles-DQNTkQQl.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"7c2-QbMB0EJ71bRh8aScq2PLRIPLXo8\"",
		"mtime": "2026-09-10T12:42:59.347Z",
		"size": 1986,
		"path": "../public/assets/trackers-styles-DQNTkQQl.js"
	},
	"/assets/trash-2-Dvk7H5Be.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"13d-5KWjGavegf0WdeUivpIcW/75edM\"",
		"mtime": "2026-09-10T12:42:59.347Z",
		"size": 317,
		"path": "../public/assets/trash-2-Dvk7H5Be.js"
	},
	"/assets/TrackersPage-CWHgp05Y.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"15144-0xhKZ7/eFloeMdJ816DKlOVy5kA\"",
		"mtime": "2026-09-10T12:42:59.306Z",
		"size": 86340,
		"path": "../public/assets/TrackersPage-CWHgp05Y.js"
	},
	"/assets/trending-up-4DSUeho_.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"a4-6S5ZMVDsjutIiIsWEJ5aZAvX4p8\"",
		"mtime": "2026-09-10T12:42:59.348Z",
		"size": 164,
		"path": "../public/assets/trending-up-4DSUeho_.js"
	},
	"/assets/triangle-alert-Ddt3_9BR.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"fe-xPs19oG86MPApyCL7vgrjwCcN9w\"",
		"mtime": "2026-09-10T12:42:59.348Z",
		"size": 254,
		"path": "../public/assets/triangle-alert-Ddt3_9BR.js"
	},
	"/assets/undo-2-Da17ZNPO.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"c5-PcLR0ZzofAmNP0t/zWYInaXRNas\"",
		"mtime": "2026-09-10T12:42:59.348Z",
		"size": 197,
		"path": "../public/assets/undo-2-Da17ZNPO.js"
	},
	"/assets/UndoToast-B9JaQdGc.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"ce4-r8NXZ22+8+qZ3piDyE6xW80xZU4\"",
		"mtime": "2026-09-10T12:42:59.307Z",
		"size": 3300,
		"path": "../public/assets/UndoToast-B9JaQdGc.js"
	},
	"/assets/undo-Wf9U5Opj.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"8c-tMikHzJqfGsiNxBFq0+cixigtGQ\"",
		"mtime": "2026-09-10T12:42:59.349Z",
		"size": 140,
		"path": "../public/assets/undo-Wf9U5Opj.js"
	},
	"/assets/trackers2-BGM9dftj.css": {
		"type": "text/css; charset=utf-8",
		"etag": "\"b59d-HvWtJ5CXx+zXcSoMqQMyhkaxJyc\"",
		"mtime": "2026-09-10T12:42:59.363Z",
		"size": 46493,
		"path": "../public/assets/trackers2-BGM9dftj.css"
	},
	"/assets/upload-BLrIBByl.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"20d-cfJntS7nQSjbyHRzkHVIHJZYdlo\"",
		"mtime": "2026-09-10T12:42:59.349Z",
		"size": 525,
		"path": "../public/assets/upload-BLrIBByl.js"
	},
	"/assets/useEverReady-CdI9JXso.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"d4-E1sIG1MEJ5H20RhZt/vM5KzKQcI\"",
		"mtime": "2026-09-10T12:42:59.350Z",
		"size": 212,
		"path": "../public/assets/useEverReady-CdI9JXso.js"
	},
	"/assets/useHabits-CId6H-xD.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"1ec3-fcPqrVcLkx241GpYnFzpFetafTs\"",
		"mtime": "2026-09-10T12:42:59.350Z",
		"size": 7875,
		"path": "../public/assets/useHabits-CId6H-xD.js"
	},
	"/assets/useMoodSystem-BmF5a3NE.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"3b88-W86QJcPqQyxzFrSMZrUhCJ9ZgSs\"",
		"mtime": "2026-09-10T12:42:59.350Z",
		"size": 15240,
		"path": "../public/assets/useMoodSystem-BmF5a3NE.js"
	},
	"/assets/usePeriodLog-DDXnkc9w.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"6484-y99M7Qd67UfdDHJxUpBbpa3SuL8\"",
		"mtime": "2026-09-10T12:42:59.351Z",
		"size": 25732,
		"path": "../public/assets/usePeriodLog-DDXnkc9w.js"
	},
	"/assets/user-round-DuWFIk1E.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"ab-RFUaEeUZQ2oG4+ro2rhuCDrxuxM\"",
		"mtime": "2026-09-10T12:42:59.353Z",
		"size": 171,
		"path": "../public/assets/user-round-DuWFIk1E.js"
	},
	"/assets/useProgression-CVvNOMnp.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"6d72-1uisF0YJB8CTKVkunjxvfcl7gf4\"",
		"mtime": "2026-09-10T12:42:59.351Z",
		"size": 28018,
		"path": "../public/assets/useProgression-CVvNOMnp.js"
	},
	"/assets/useTrackers-Bcym2szw.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"1d19-YjDakJBLCzEsl4Tl9o9U0ooi7cQ\"",
		"mtime": "2026-09-10T12:42:59.352Z",
		"size": 7449,
		"path": "../public/assets/useTrackers-Bcym2szw.js"
	},
	"/assets/useStore-CK-BGkvO.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"4b58-GTFBtDo+OUs3oz3py59u8LBF8YE\"",
		"mtime": "2026-09-10T12:42:59.352Z",
		"size": 19288,
		"path": "../public/assets/useStore-CK-BGkvO.js"
	},
	"/assets/zap-DW04FrqK.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"fb-4pFOj2LXVtWgwKzZtvYLiqw537A\"",
		"mtime": "2026-09-10T12:42:59.354Z",
		"size": 251,
		"path": "../public/assets/zap-DW04FrqK.js"
	},
	"/assets/window-dusk-Qezs-EOW.jpg": {
		"type": "image/jpeg",
		"etag": "\"d3c9-X0FybVeHwLNarug7HhPJKGVJlN8\"",
		"mtime": "2026-09-10T12:42:59.364Z",
		"size": 54217,
		"path": "../public/assets/window-dusk-Qezs-EOW.jpg"
	},
	"/assets/_handle-CvxCFlsc.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"1845-+S8rdlTnA7P7t36Nk6gwg0kD/YI\"",
		"mtime": "2026-09-10T12:42:59.307Z",
		"size": 6213,
		"path": "../public/assets/_handle-CvxCFlsc.js"
	},
	"/assets/utils-DojpP95n.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"6a7e-rehYKtt6GcJPoEspFNv2VomMQ30\"",
		"mtime": "2026-09-10T12:42:59.353Z",
		"size": 27262,
		"path": "../public/assets/utils-DojpP95n.js"
	},
	"/bloom/icons/icon-192.png": {
		"type": "image/png",
		"etag": "\"1530-Cq7CIV6q8BHvc1KSSmFvJLYStkk\"",
		"mtime": "2026-09-10T09:29:56.100Z",
		"size": 5424,
		"path": "../public/bloom/icons/icon-192.png"
	},
	"/bloom/icons/icon-1024.png": {
		"type": "image/png",
		"etag": "\"979c-J6z5zyClgE91mKDnXssAC+4hqP0\"",
		"mtime": "2026-09-10T09:29:56.099Z",
		"size": 38812,
		"path": "../public/bloom/icons/icon-1024.png"
	},
	"/bloom/bloom-add-habit-modal-v3-latest.html": {
		"type": "text/html; charset=utf-8",
		"etag": "\"c652-MYcyp7y9zcHM3adUocKqRuZt+F4\"",
		"mtime": "2026-08-24T17:49:44.468Z",
		"size": 50770,
		"path": "../public/bloom/bloom-add-habit-modal-v3-latest.html"
	},
	"/bloom/icons/icon-192.svg": {
		"type": "image/svg+xml",
		"etag": "\"219-ZfotOJ+2xm2Gvu2AJTNkQieQ46Q\"",
		"mtime": "2026-08-17T10:26:46.669Z",
		"size": 537,
		"path": "../public/bloom/icons/icon-192.svg"
	},
	"/bloom/icons/icon-512.svg": {
		"type": "image/svg+xml",
		"etag": "\"219-jojSDFu0bkm2TsgWm10+0al+01c\"",
		"mtime": "2026-08-17T10:26:53.345Z",
		"size": 537,
		"path": "../public/bloom/icons/icon-512.svg"
	},
	"/bloom/icons/icon-maskable-512.png": {
		"type": "image/png",
		"etag": "\"18b9-pX4bOBuEGbV8pjCBIY1fAWMUp0o\"",
		"mtime": "2026-09-10T10:14:51.263Z",
		"size": 6329,
		"path": "../public/bloom/icons/icon-maskable-512.png"
	},
	"/bloom/splash/splash-1170x2532.png": {
		"type": "image/png",
		"etag": "\"55d4-rKs3LAI4wz0AFqWTZCqySV8jerI\"",
		"mtime": "2026-09-10T10:14:51.268Z",
		"size": 21972,
		"path": "../public/bloom/splash/splash-1170x2532.png"
	},
	"/bloom/icons/icon-512.png": {
		"type": "image/png",
		"etag": "\"4111-ND2VDC//ADhwcO/y1qZZKL05tnU\"",
		"mtime": "2026-09-10T09:29:56.101Z",
		"size": 16657,
		"path": "../public/bloom/icons/icon-512.png"
	},
	"/bloom/splash/splash-1125x2436.png": {
		"type": "image/png",
		"etag": "\"50f9-qOCyS1yrKQRqMa/85Xaor1m2l+I\"",
		"mtime": "2026-09-10T10:14:51.266Z",
		"size": 20729,
		"path": "../public/bloom/splash/splash-1125x2436.png"
	},
	"/bloom/splash/splash-1242x2688.png": {
		"type": "image/png",
		"etag": "\"5f80-StkJDZCji8A4tJ0CFgE+N1SxdAE\"",
		"mtime": "2026-09-10T10:14:51.271Z",
		"size": 24448,
		"path": "../public/bloom/splash/splash-1242x2688.png"
	},
	"/bloom/splash/splash-1179x2556.png": {
		"type": "image/png",
		"etag": "\"572f-zUbWj5npfyoeuNsMlWXDI/plFog\"",
		"mtime": "2026-09-10T10:14:51.270Z",
		"size": 22319,
		"path": "../public/bloom/splash/splash-1179x2556.png"
	},
	"/bloom/splash/splash-1284x2778.png": {
		"type": "image/png",
		"etag": "\"64bc-8RxRbJfuUEkPtJo8hwvf0dhTJnU\"",
		"mtime": "2026-09-10T10:14:51.272Z",
		"size": 25788,
		"path": "../public/bloom/splash/splash-1284x2778.png"
	},
	"/bloom/splash/splash-1290x2796.png": {
		"type": "image/png",
		"etag": "\"6522-SuJOYyh3NKGRV4VlhL1i0PoNMHM\"",
		"mtime": "2026-09-10T10:14:51.273Z",
		"size": 25890,
		"path": "../public/bloom/splash/splash-1290x2796.png"
	},
	"/bloom/splash/splash-1536x2048.png": {
		"type": "image/png",
		"etag": "\"63dd-ahe3r/19W2aYSyMcLF+nGjIQPq0\"",
		"mtime": "2026-09-10T10:14:51.277Z",
		"size": 25565,
		"path": "../public/bloom/splash/splash-1536x2048.png"
	},
	"/bloom/splash/splash-1488x2266.png": {
		"type": "image/png",
		"etag": "\"662a-LPcbEH8mgl5EMnNfPgpPsnHKw4c\"",
		"mtime": "2026-09-10T10:14:51.276Z",
		"size": 26154,
		"path": "../public/bloom/splash/splash-1488x2266.png"
	},
	"/bloom/splash/splash-1668x2388.png": {
		"type": "image/png",
		"etag": "\"7820-9rH0vL29rhezbR/neypeVu09UCY\"",
		"mtime": "2026-09-10T10:14:51.278Z",
		"size": 30752,
		"path": "../public/bloom/splash/splash-1668x2388.png"
	},
	"/bloom/splash/splash-2048x2732.png": {
		"type": "image/png",
		"etag": "\"9b16-YuD5Hk9ubTq4YgdSSZxmbolA/4A\"",
		"mtime": "2026-09-10T10:14:51.279Z",
		"size": 39702,
		"path": "../public/bloom/splash/splash-2048x2732.png"
	},
	"/bloom/splash/splash-640x1136.png": {
		"type": "image/png",
		"etag": "\"1c0c-H2xndLAVTF0DumrEfKTQVWyrDf0\"",
		"mtime": "2026-09-10T10:14:51.280Z",
		"size": 7180,
		"path": "../public/bloom/splash/splash-640x1136.png"
	},
	"/bloom/splash/splash-750x1334.png": {
		"type": "image/png",
		"etag": "\"23ce-GasXdTzDN7M1cCxYP2ykhNQe8ts\"",
		"mtime": "2026-09-10T10:14:51.281Z",
		"size": 9166,
		"path": "../public/bloom/splash/splash-750x1334.png"
	},
	"/rewards/art/deep-rest.jpg": {
		"type": "image/jpeg",
		"etag": "\"2e2ed-sNzhOXoBQ7pHPilmc3kPIF6Q4xo\"",
		"mtime": "2026-09-10T05:41:31.743Z",
		"size": 189165,
		"path": "../public/rewards/art/deep-rest.jpg"
	},
	"/rewards/art/golden-hour.jpg": {
		"type": "image/jpeg",
		"etag": "\"37c61-BVIPMEQ92Ybbxmm6qcOhshQpXC8\"",
		"mtime": "2026-09-10T05:41:31.746Z",
		"size": 228449,
		"path": "../public/rewards/art/golden-hour.jpg"
	},
	"/rewards/art/hydration-mist.jpg": {
		"type": "image/jpeg",
		"etag": "\"20ef9-XHXyBgxxTd7J8S22wuzw2Aw0Ikw\"",
		"mtime": "2026-09-10T05:41:31.750Z",
		"size": 134905,
		"path": "../public/rewards/art/hydration-mist.jpg"
	},
	"/rewards/art/moonlit-garden.jpg": {
		"type": "image/jpeg",
		"etag": "\"4cb26-wpXDTxLXM9/VbDl4b62Mir8Q5VE\"",
		"mtime": "2026-09-10T05:41:31.754Z",
		"size": 314150,
		"path": "../public/rewards/art/moonlit-garden.jpg"
	},
	"/rewards/art/recovery-season.jpg": {
		"type": "image/jpeg",
		"etag": "\"35854-FqsHuKxgFcOxZCOKjXerOnihsFg\"",
		"mtime": "2026-09-10T05:41:31.761Z",
		"size": 219220,
		"path": "../public/rewards/art/recovery-season.jpg"
	},
	"/rewards/art/soft-reset.jpg": {
		"type": "image/jpeg",
		"etag": "\"1e591-r5oDQqgmAIYLnDncc4TCPR79am0\"",
		"mtime": "2026-09-10T05:41:31.764Z",
		"size": 124305,
		"path": "../public/rewards/art/soft-reset.jpg"
	},
	"/rewards/art/move-breathe.jpg": {
		"type": "image/jpeg",
		"etag": "\"2a04b-ShextNvlZNS2QVbdQL1KN0epQFE\"",
		"mtime": "2026-09-10T05:41:31.756Z",
		"size": 172107,
		"path": "../public/rewards/art/move-breathe.jpg"
	},
	"/rewards/art/quiet-focus.jpg": {
		"type": "image/jpeg",
		"etag": "\"20796-Gys1WBevyJxkprT2dgBa1k1/vj8\"",
		"mtime": "2026-09-10T05:41:31.757Z",
		"size": 133014,
		"path": "../public/rewards/art/quiet-focus.jpg"
	},
	"/rewards/art/serenity-strength.jpg": {
		"type": "image/jpeg",
		"etag": "\"24d80-xmgTho2y4CZ9cJBcdJ2yXAXDaKk\"",
		"mtime": "2026-09-10T05:41:31.763Z",
		"size": 150912,
		"path": "../public/rewards/art/serenity-strength.jpg"
	},
	"/rewards/art/wellness-morning.jpg": {
		"type": "image/jpeg",
		"etag": "\"2ccab-zPTpTfdRi6EmSELus3iwpcZ2uYo\"",
		"mtime": "2026-09-10T05:41:31.766Z",
		"size": 183467,
		"path": "../public/rewards/art/wellness-morning.jpg"
	},
	"/rewards/medals/medal-01.png": {
		"type": "image/png",
		"etag": "\"e7a0-vHdR8zA3Q12SE8xqRM0xQo5/l4Q\"",
		"mtime": "2026-08-26T19:24:35.248Z",
		"size": 59296,
		"path": "../public/rewards/medals/medal-01.png"
	},
	"/rewards/medals/medal-02.png": {
		"type": "image/png",
		"etag": "\"ee19-zZasRHp0NZx7TrrZ4Xf9IYzAzpI\"",
		"mtime": "2026-08-26T19:24:35.255Z",
		"size": 60953,
		"path": "../public/rewards/medals/medal-02.png"
	},
	"/rewards/medals/medal-04.png": {
		"type": "image/png",
		"etag": "\"e910-SuB2olhmvLxBZ2IZ44mCHrkkr1M\"",
		"mtime": "2026-08-26T19:24:35.267Z",
		"size": 59664,
		"path": "../public/rewards/medals/medal-04.png"
	},
	"/rewards/medals/medal-03.png": {
		"type": "image/png",
		"etag": "\"e5e4-sHWshUUlcxzb21+YlfQF+BL9q9I\"",
		"mtime": "2026-08-26T19:24:35.261Z",
		"size": 58852,
		"path": "../public/rewards/medals/medal-03.png"
	},
	"/rewards/medals/medal-06.png": {
		"type": "image/png",
		"etag": "\"d7d0-a6LVmVcjUkyM/d8FsfZlm3P1HU0\"",
		"mtime": "2026-08-26T19:24:35.280Z",
		"size": 55248,
		"path": "../public/rewards/medals/medal-06.png"
	},
	"/rewards/medals/medal-07.png": {
		"type": "image/png",
		"etag": "\"ef79-OCiOK4mep9zXyubXj+upI4qx6hw\"",
		"mtime": "2026-08-26T19:24:35.286Z",
		"size": 61305,
		"path": "../public/rewards/medals/medal-07.png"
	},
	"/rewards/medals/medal-05.png": {
		"type": "image/png",
		"etag": "\"e07d-/s+//NIWbl8ak8uWV/8QazQyLz4\"",
		"mtime": "2026-08-26T19:24:35.273Z",
		"size": 57469,
		"path": "../public/rewards/medals/medal-05.png"
	},
	"/rewards/medals/medal-09.png": {
		"type": "image/png",
		"etag": "\"10de2-w/XYCgOPF+3zJQgzqtKQIxEVhQ0\"",
		"mtime": "2026-08-26T19:24:35.298Z",
		"size": 69090,
		"path": "../public/rewards/medals/medal-09.png"
	},
	"/rewards/medals/medal-10.png": {
		"type": "image/png",
		"etag": "\"e2ed-MN599xq0nYrDsoMWxIwUCAQlgJA\"",
		"mtime": "2026-08-26T19:24:35.303Z",
		"size": 58093,
		"path": "../public/rewards/medals/medal-10.png"
	},
	"/rewards/medals/medal-08.png": {
		"type": "image/png",
		"etag": "\"edcc-zDJv74mqjfc8fWIXL0snHXLrFEM\"",
		"mtime": "2026-08-26T19:24:35.292Z",
		"size": 60876,
		"path": "../public/rewards/medals/medal-08.png"
	},
	"/rewards/medals/medal-12.png": {
		"type": "image/png",
		"etag": "\"f639-8kH94jEi2nSTKX49eC4H+jlEcQU\"",
		"mtime": "2026-08-26T19:24:35.317Z",
		"size": 63033,
		"path": "../public/rewards/medals/medal-12.png"
	},
	"/rewards/medals/medal-11.png": {
		"type": "image/png",
		"etag": "\"e0f6-Ij0OVrAmMMAn4y8cFNEopy9FgaU\"",
		"mtime": "2026-08-26T19:24:35.310Z",
		"size": 57590,
		"path": "../public/rewards/medals/medal-11.png"
	},
	"/rewards/medals/medal-13.png": {
		"type": "image/png",
		"etag": "\"e70c-DvqnwE46RQyxerXbKx2EMcjCpKA\"",
		"mtime": "2026-08-26T19:24:35.324Z",
		"size": 59148,
		"path": "../public/rewards/medals/medal-13.png"
	},
	"/rewards/medals/medal-14.png": {
		"type": "image/png",
		"etag": "\"eb4d-cACmlNzGpnnQdgWLu84BsrMqMjM\"",
		"mtime": "2026-08-26T19:24:35.330Z",
		"size": 60237,
		"path": "../public/rewards/medals/medal-14.png"
	},
	"/rewards/medals/medal-15.png": {
		"type": "image/png",
		"etag": "\"f77e-K1dMIxnUvPAYPLMY5CnJadGdHig\"",
		"mtime": "2026-08-26T19:24:35.336Z",
		"size": 63358,
		"path": "../public/rewards/medals/medal-15.png"
	},
	"/rewards/medals/medal-16.png": {
		"type": "image/png",
		"etag": "\"10de8-iG3eOWI7G3F0bSBEo0a1vdSFQqY\"",
		"mtime": "2026-08-26T19:24:35.342Z",
		"size": 69096,
		"path": "../public/rewards/medals/medal-16.png"
	},
	"/rewards/medals/medal-18.png": {
		"type": "image/png",
		"etag": "\"10729-c9Z84+VM9hhPu1tltvJwbYkKHdY\"",
		"mtime": "2026-08-26T19:24:35.354Z",
		"size": 67369,
		"path": "../public/rewards/medals/medal-18.png"
	},
	"/rewards/medals/medal-17.png": {
		"type": "image/png",
		"etag": "\"10409-ZIvg3kcU4e/DZo2X+OTZintgjWs\"",
		"mtime": "2026-08-26T19:24:35.349Z",
		"size": 66569,
		"path": "../public/rewards/medals/medal-17.png"
	},
	"/rewards/medals/medal-19.png": {
		"type": "image/png",
		"etag": "\"10464-QFYaTAAwu9msN8ieS389NlN4ZwU\"",
		"mtime": "2026-08-26T19:24:35.361Z",
		"size": 66660,
		"path": "../public/rewards/medals/medal-19.png"
	},
	"/rewards/medals/medal-20.png": {
		"type": "image/png",
		"etag": "\"fec8-AdweDKzV4ACx3JsAXBrx9ua1P8Y\"",
		"mtime": "2026-08-26T19:24:35.366Z",
		"size": 65224,
		"path": "../public/rewards/medals/medal-20.png"
	},
	"/rewards/medals/medal-21.png": {
		"type": "image/png",
		"etag": "\"105a4-VmB6dbgcdV05RMG5kNXY8nvGv3Q\"",
		"mtime": "2026-08-26T19:24:35.372Z",
		"size": 66980,
		"path": "../public/rewards/medals/medal-21.png"
	},
	"/rewards/medals/medal-23.png": {
		"type": "image/png",
		"etag": "\"12747-ATlU5+7hPE5Q+HIWJf991KPUiDU\"",
		"mtime": "2026-08-26T19:24:35.384Z",
		"size": 75591,
		"path": "../public/rewards/medals/medal-23.png"
	},
	"/rewards/medals/medal-22.png": {
		"type": "image/png",
		"etag": "\"10753-IahFLK9+I7xYrW3l6R2ZGdgYBZ0\"",
		"mtime": "2026-08-26T19:24:35.378Z",
		"size": 67411,
		"path": "../public/rewards/medals/medal-22.png"
	},
	"/rewards/medals/medal-24.png": {
		"type": "image/png",
		"etag": "\"107af-eJassB6Duto5IlhKUiwBlNIyByY\"",
		"mtime": "2026-08-26T19:24:35.390Z",
		"size": 67503,
		"path": "../public/rewards/medals/medal-24.png"
	},
	"/rewards/medals/medal-25.png": {
		"type": "image/png",
		"etag": "\"fef9-y7iL8KVuVXVMvQ00q04a/IX32Ww\"",
		"mtime": "2026-08-26T19:24:35.396Z",
		"size": 65273,
		"path": "../public/rewards/medals/medal-25.png"
	},
	"/rewards/medals/medal-26.png": {
		"type": "image/png",
		"etag": "\"efda-7aKDqm4Ekj+iIqCRZpOOsOh41jE\"",
		"mtime": "2026-08-26T19:24:35.403Z",
		"size": 61402,
		"path": "../public/rewards/medals/medal-26.png"
	},
	"/rewards/medals/medal-28.png": {
		"type": "image/png",
		"etag": "\"e9c8-zUx9JpRytX63+yp0ws5q3UOAryk\"",
		"mtime": "2026-08-26T19:24:35.415Z",
		"size": 59848,
		"path": "../public/rewards/medals/medal-28.png"
	},
	"/rewards/medals/medal-27.png": {
		"type": "image/png",
		"etag": "\"f677-sww7Oj75fDzNxrVye28krqWcP0M\"",
		"mtime": "2026-08-26T19:24:35.409Z",
		"size": 63095,
		"path": "../public/rewards/medals/medal-27.png"
	},
	"/rewards/medals/medal-29.png": {
		"type": "image/png",
		"etag": "\"fb1b-AlAdAeFXWwc0ztJKyrLXTsXNaf4\"",
		"mtime": "2026-08-26T19:24:35.421Z",
		"size": 64283,
		"path": "../public/rewards/medals/medal-29.png"
	},
	"/rewards/medals/medal-30.png": {
		"type": "image/png",
		"etag": "\"df1a-RmXjCmhbmUcEPMGsCLhkQjhDQXY\"",
		"mtime": "2026-08-26T19:24:35.427Z",
		"size": 57114,
		"path": "../public/rewards/medals/medal-30.png"
	}
};
//#endregion
//#region #nitro/virtual/public-assets
var publicAssetBases = {};
function isPublicAssetURL(id = "") {
	if (public_assets_data_default[id]) return true;
	for (const base in publicAssetBases) if (id.startsWith(base)) return true;
	return false;
}
//#endregion
//#region node_modules/nitro/dist/runtime/internal/route-rules.mjs
var headers = ((m) => function headersRouteRule(event) {
	for (const [key, value] of Object.entries(m.options || {})) event.res.headers.set(key, value);
});
//#endregion
//#region #nitro/virtual/routing
var findRouteRules = /* @__PURE__ */ (() => {
	const $0 = [{
		name: "headers",
		route: "/assets/**",
		handler: headers,
		options: { "cache-control": "public, max-age=31536000, immutable" }
	}];
	return (m, p) => {
		let r = [];
		if (p.charCodeAt(p.length - 1) === 47) p = p.slice(0, -1) || "/";
		let s = p.split("/");
		if (s.length > 1) {
			if (s[1] === "assets") r.unshift({
				data: $0,
				params: { "_": s.slice(2).join("/") }
			});
		}
		return r;
	};
})();
var _lazy_x2NBOj = defineLazyEventHandler(() => import("./_chunks/ssr-renderer.mjs"));
var findRoute = /* @__PURE__ */ (() => {
	const data = {
		route: "/**",
		handler: _lazy_x2NBOj
	};
	return ((_m, p) => {
		return {
			data,
			params: { "_": p.slice(1) }
		};
	});
})();
[].filter(Boolean);
//#endregion
//#region node_modules/nitro/dist/runtime/internal/error/prod.mjs
var errorHandler = (error, event) => {
	const res = defaultHandler(error, event);
	return new FastResponse(typeof res.body === "string" ? res.body : JSON.stringify(res.body, null, 2), res);
};
function defaultHandler(error, event) {
	const unhandled = error.unhandled ?? !HTTPError.isError(error);
	const { status = 500, statusText = "" } = unhandled ? {} : error;
	if (status === 404) {
		const url = event.url || new URL(event.req.url);
		const baseURL = "/";
		if (/^\/[^/]/.test(baseURL) && !url.pathname.startsWith(baseURL)) return {
			status: 302,
			headers: new Headers({ location: `${baseURL}${url.pathname.slice(1)}${url.search}` })
		};
	}
	const headers = new Headers(unhandled ? {} : error.headers);
	headers.set("content-type", "application/json; charset=utf-8");
	return {
		status,
		statusText,
		headers,
		body: {
			error: true,
			...unhandled ? {
				status,
				unhandled: true
			} : typeof error.toJSON === "function" ? error.toJSON() : {
				status,
				statusText,
				message: error.message
			}
		}
	};
}
//#endregion
//#region #nitro/virtual/error-handler
var errorHandlers = [errorHandler];
async function error_handler_default(error, event) {
	for (const handler of errorHandlers) try {
		const response = await handler(error, event, { defaultHandler });
		if (response) return response;
	} catch (error) {
		console.error(error);
	}
}
//#endregion
//#region #nitro/virtual/app
function createNitroApp() {
	const captureError = (error, errorCtx) => {
		if (errorCtx?.event) {
			const errors = errorCtx.event.req.context?.nitro?.errors;
			if (errors) errors.push({
				error,
				context: errorCtx
			});
		}
	};
	const h3App = createH3App({ onError(error, event) {
		return error_handler_default(error, event);
	} });
	let appHandler = (req) => {
		req.context ||= {};
		req.context.nitro = req.context.nitro || { errors: [] };
		return h3App.fetch(req);
	};
	return {
		fetch: appHandler,
		h3: h3App,
		hooks: void 0,
		captureError
	};
}
function createH3App(config) {
	const h3App = new H3Core(config);
	h3App["~findRoute"] = (event) => findRoute(event.req.method, event.url.pathname);
	h3App["~getMiddleware"] = (event, route) => {
		const pathname = event.url.pathname;
		const method = event.req.method;
		const middleware = [];
		const routeRules = getRouteRules(method, pathname);
		event.context.routeRules = routeRules?.routeRules;
		if (routeRules?.routeRuleMiddleware.length) middleware.push(...routeRules.routeRuleMiddleware);
		if (route?.data?.middleware?.length) middleware.push(...route.data.middleware);
		return middleware;
	};
	return h3App;
}
//#endregion
//#region node_modules/nitro/dist/runtime/internal/app.mjs
var APP_ID = "default";
function useNitroApp() {
	let instance = useNitroApp._instance;
	if (instance) return instance;
	instance = useNitroApp._instance = createNitroApp();
	globalThis.__nitro__ = globalThis.__nitro__ || {};
	globalThis.__nitro__[APP_ID] = instance;
	return instance;
}
function useNitroHooks() {
	const nitroApp = useNitroApp();
	const hooks = nitroApp.hooks;
	if (hooks) return hooks;
	return nitroApp.hooks = new HookableCore();
}
function getRouteRules(method, pathname) {
	const m = findRouteRules(method, pathname);
	if (!m?.length) return { routeRuleMiddleware: [] };
	const routeRules = {};
	for (const layer of m) for (const rule of layer.data) {
		const currentRule = routeRules[rule.name];
		if (currentRule) {
			if (rule.options === false) {
				delete routeRules[rule.name];
				continue;
			}
			if (typeof currentRule.options === "object" && typeof rule.options === "object") currentRule.options = {
				...currentRule.options,
				...rule.options
			};
			else currentRule.options = rule.options;
			currentRule.route = rule.route;
			currentRule.params = {
				...currentRule.params,
				...layer.params
			};
		} else if (rule.options !== false) routeRules[rule.name] = {
			...rule,
			params: layer.params
		};
	}
	const middleware = [];
	const orderedRules = Object.values(routeRules).sort((a, b) => (a.handler?.order || 0) - (b.handler?.order || 0));
	for (const rule of orderedRules) {
		if (rule.options === false || !rule.handler) continue;
		middleware.push(rule.handler(rule));
	}
	return {
		routeRules,
		routeRuleMiddleware: middleware
	};
}
//#endregion
//#region node_modules/nitro/dist/presets/cloudflare/runtime/_module-handler.mjs
function createHandler(hooks) {
	const nitroApp = useNitroApp();
	const nitroHooks = useNitroHooks();
	return {
		async fetch(request, env, context) {
			globalThis.__env__ = env;
			augmentReq(request, {
				env,
				context
			});
			const ctxExt = {};
			const url = new URL(request.url);
			if (hooks.fetch) {
				const res = await hooks.fetch(request, env, context, url, ctxExt);
				if (res) return res;
			}
			return await nitroApp.fetch(request);
		},
		scheduled(controller, env, context) {
			globalThis.__env__ = env;
			context.waitUntil(nitroHooks.callHook("cloudflare:scheduled", {
				controller,
				env,
				context
			}) || Promise.resolve());
		},
		email(message, env, context) {
			globalThis.__env__ = env;
			context.waitUntil(nitroHooks.callHook("cloudflare:email", {
				message,
				event: message,
				env,
				context
			}) || Promise.resolve());
		},
		queue(batch, env, context) {
			globalThis.__env__ = env;
			context.waitUntil(nitroHooks.callHook("cloudflare:queue", {
				batch,
				event: batch,
				env,
				context
			}) || Promise.resolve());
		},
		tail(traces, env, context) {
			globalThis.__env__ = env;
			context.waitUntil(nitroHooks.callHook("cloudflare:tail", {
				traces,
				env,
				context
			}) || Promise.resolve());
		},
		trace(traces, env, context) {
			globalThis.__env__ = env;
			context.waitUntil(nitroHooks.callHook("cloudflare:trace", {
				traces,
				env,
				context
			}) || Promise.resolve());
		}
	};
}
function augmentReq(cfReq, ctx) {
	const req = cfReq;
	req.ip = cfReq.headers.get("cf-connecting-ip") || void 0;
	req.runtime ??= { name: "cloudflare" };
	req.runtime.cloudflare = {
		...req.runtime.cloudflare,
		...ctx
	};
	req.waitUntil = ctx.context?.waitUntil.bind(ctx.context);
}
//#endregion
//#region node_modules/nitro/dist/presets/cloudflare/runtime/cloudflare-module.mjs
var cloudflare_module_default = createHandler({ fetch(cfRequest, env, context, url) {
	if (env.ASSETS && isPublicAssetURL(url.pathname)) return env.ASSETS.fetch(cfRequest);
} });
//#endregion
export { cloudflare_module_default as default };
