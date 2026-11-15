#!/usr/bin/env node
/**
 * render-video.js — HTML → webm render for the experimental video channel
 * (skills/design-omniskill/channel-video.md).
 *
 * Non-gate: never part of tests/run-all.sh. Exit 0 on success AND on SKIP
 * (playwright absent) so hosts without a browser toolchain are unaffected.
 * D4: artifact + measurement only — never gate evidence.
 *
 * Zero npm dependencies in the repo. Playwright is resolved optionally, in
 * order: --playwright <module> → env PLAYWRIGHT_MODULE → require.resolve
 * ("playwright") from the repo root. Browser: a system-installed channel,
 * default "msedge" (or "chrome"). No browser download is ever performed.
 *
 * ffmpeg (optional) is used only for metadata / frame extraction / PSNR, in
 * order: PATH → env FFMPEG_BIN → the ms-playwright cache (ffmpeg build dirs).
 *
 * Usage:
 *   node scripts/render-video.js --page <html> --out <webm>
 *        [--viewport 1440x900] [--duration 5] [--channel msedge]
 *        [--playwright <module>] [--headed]
 *        [--ref-out <png>] [--frame-out <png>] [--frame-time 0]
 *
 * Output: one JSON object on stdout — {"status":"ok"|...} with measured
 * metrics (size, sha256, duration, fps, codec, PSNR when computed).
 */
const fs = require("fs");
const os = require("os");
const path = require("path");
const crypto = require("crypto");
const zlib = require("zlib");
const { spawnSync } = require("child_process");
const { pathToFileURL } = require("url");

const ROOT = path.resolve(__dirname, "..");

function parseArgs(argv) {
  const a = {
    page: null, out: null, viewport: "1440x900", duration: 5,
    channel: "msedge", playwright: null, headed: false,
    refOut: null, frameOut: null, frameTime: 0,
  };
  for (let i = 0; i < argv.length; i++) {
    const t = argv[i];
    const next = () => { i += 1; return argv[i]; };
    if (t === "--page") a.page = path.resolve(next());
    else if (t === "--out") a.out = path.resolve(next());
    else if (t === "--viewport") a.viewport = next();
    else if (t === "--duration") a.duration = parseFloat(next());
    else if (t === "--channel") a.channel = next();
    else if (t === "--playwright") a.playwright = next();
    else if (t === "--headed") a.headed = true;
    else if (t === "--ref-out") a.refOut = path.resolve(next());
    else if (t === "--frame-out") a.frameOut = path.resolve(next());
    else if (t === "--frame-time") a.frameTime = parseFloat(next());
    else { fail(`unknown argument: ${t}`); }
  }
  if (!a.page) fail("--page <html> is required");
  if (!a.out) fail("--out <webm> is required");
  const m = /^(\d{2,5})x(\d{2,5})$/.exec(a.viewport);
  if (!m) fail(`--viewport must be WxH, got "${a.viewport}"`);
  a.vw = parseInt(m[1], 10);
  a.vh = parseInt(m[2], 10);
  if (!(a.duration >= 0) || !isFinite(a.duration)) fail("--duration must be a non-negative number");
  if (a.channel !== "msedge" && a.channel !== "chrome") fail('--channel must be "msedge" or "chrome"');
  return a;
}

function fail(msg) {
  console.log(JSON.stringify({ status: "error", error: msg }));
  process.exit(1);
}

function emit(obj) {
  console.log(JSON.stringify(obj));
}

function sha256(file) {
  return crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
}

// --- optional playwright resolution ---------------------------------------
function tryRequire(spec) {
  for (const candidate of [spec, spec && spec + "/index.js", spec && spec + "/index.mjs"]) {
    try {
      return { mod: require(candidate), spec: candidate };
    } catch (_) { /* keep looking */ }
  }
  return null;
}

function resolvePlaywright(argSpec) {
  const specs = [argSpec, process.env.PLAYWRIGHT_MODULE].filter(Boolean);
  for (const s of specs) {
    const hit = tryRequire(s);
    if (hit) return hit;
  }
  // Bare "playwright" from the repo root (covers a future dev install).
  try {
    const entry = require.resolve("playwright", { paths: [ROOT] });
    return { mod: require(entry), spec: entry };
  } catch (_) { /* absent */ }
  return null;
}

function pkgVersion(resolved) {
  // Resolve to the module's entry file, then walk up to its own package.json
  // (a folder-path spec must not inherit a foreign package.json version).
  let startDir = path.dirname(resolved.spec);
  try { startDir = path.dirname(require.resolve(resolved.spec, { paths: [__dirname] })); } catch (_) { /* keep spec dir */ }
  let d = startDir;
  while (d !== path.dirname(d)) {
    try {
      const p = path.join(d, "package.json");
      if (fs.existsSync(p)) {
        const pkg = JSON.parse(fs.readFileSync(p, "utf8"));
        if (pkg.version) return pkg.version;
      }
    } catch (_) { /* keep walking */ }
    d = path.dirname(d);
  }
  return null;
}

// --- optional ffmpeg resolution -------------------------------------------
function exeName() {
  return process.platform === "win32" ? "ffmpeg.exe" : "ffmpeg";
}

function findFfmpeg() {
  const exe = exeName();
  const pathDirs = (process.env.PATH || "").split(path.delimiter).filter(Boolean);
  for (const dir of pathDirs) {
    try {
      const p = path.join(dir, exe);
      if (fs.existsSync(p)) return p;
    } catch (_) { /* skip */ }
  }
  const bin = process.env.FFMPEG_BIN;
  if (bin) {
    const b = path.resolve(bin);
    if (fs.existsSync(b) && fs.statSync(b).isFile()) return b;
    if (fs.existsSync(b)) {
      const p = path.join(b, exe);
      if (fs.existsSync(p)) return p;
    }
  }
  // ms-playwright cache: <root>/ffmpeg-<build>/ffmpeg-<platform>
  const roots = [
    path.join(os.homedir(), "AppData", "Local", "ms-playwright"),
    path.join(os.homedir(), ".cache", "ms-playwright"),
  ];
  if (process.env.PLAYWRIGHT_BROWSERS_PATH) roots.unshift(path.resolve(process.env.PLAYWRIGHT_BROWSERS_PATH));
  const wantExe = process.platform === "win32";
  for (const root of roots) {
    let entries = [];
    try { entries = fs.readdirSync(root, { withFileTypes: true }); } catch (_) { continue; }
    const dirs = entries
      .filter((e) => e.isDirectory() && /^ffmpeg-/.test(e.name))
      // Newest build first: the newest playwright ffmpeg build matches the
      // codec of recordings made with the current playwright (vp8 → vp9 era).
      .sort((x, y) => y.name.localeCompare(x.name, undefined, { numeric: true }));
    for (const e of dirs) {
      let files = [];
      try { files = fs.readdirSync(path.join(root, e.name)); } catch (_) { continue; }
      const match = files
        .filter((f) => f === exe || (f.startsWith("ffmpeg") && (wantExe ? f.endsWith(".exe") : !f.includes("."))))
        .sort((x, y) => (x === exe ? -1 : y === exe ? 1 : 0));
      if (match.length) return path.join(root, e.name, match[0]);
    }
  }
  return null;
}

function probeMeta(ffmpeg, file) {
  const r = spawnSync(ffmpeg, ["-hide_banner", "-i", file], { encoding: "utf8", timeout: 60000 });
  const text = `${r.stdout || ""}\n${r.stderr || ""}`;
  const out = { duration_s: null, codec: null, width: null, height: null, fps: null, creation_time: null };
  const dur = /Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)/.exec(text);
  if (dur) out.duration_s = parseFloat(dur[1]) * 3600 + parseFloat(dur[2]) * 60 + parseFloat(dur[3]);
  const line = text.split(/\r?\n/).find((l) => /Stream .*Video:/.test(l)) || "";
  const codec = /Video:\s*([A-Za-z0-9]+)/.exec(line);
  if (codec) out.codec = codec[1];
  const dim = /(\d{2,5})x(\d{2,5})/.exec(line);
  if (dim) { out.width = parseInt(dim[1], 10); out.height = parseInt(dim[2], 10); }
  const fps = /(\d+(?:\.\d+)?)\s*fps/.exec(line);
  if (fps) out.fps = parseFloat(fps[1]);
  const ct = /creation_time\s*:\s*([0-9T:.\-+Z]+)/.exec(text);
  if (ct) out.creation_time = ct[1];
  return out;
}

function extractFrame(ffmpeg, inWebm, outPng, timeS) {
  // Note: no -update flag — the minimal playwright ffmpeg builds reject it.
  const r = spawnSync(ffmpeg, ["-hide_banner", "-y", "-ss", String(timeS), "-i", inWebm, "-frames:v", "1", outPng], {
    encoding: "utf8",
    timeout: 120000,
  });
  return r.status === 0 && fs.existsSync(outPng);
}

// --- zero-dep PNG decode (8-bit, non-interlaced, color types 0/2/3/4/6) ----
// Fresh logic (PNG spec is public); the minimal playwright ffmpeg builds
// cannot decode PNG, so screenshot references are decoded here instead.
function decodePng(file) {
  const b = fs.readFileSync(file);
  if (b.readUInt32BE(0) !== 0x89504e47) throw new Error("not a png: " + file);
  let off = 8;
  let w = 0, h = 0, depth = 0, ct = 0, inter = 0;
  const idat = [];
  let plte = null;
  while (off + 8 <= b.length) {
    const len = b.readUInt32BE(off);
    const type = b.toString("ascii", off + 4, off + 8);
    const data = b.subarray(off + 8, off + 8 + len);
    if (type === "IHDR") { w = data.readUInt32BE(0); h = data.readUInt32BE(4); depth = data[8]; ct = data[9]; inter = data[12]; }
    else if (type === "PLTE") plte = data;
    else if (type === "IDAT") idat.push(data);
    else if (type === "IEND") break;
    off += 12 + len;
  }
  if (inter !== 0) throw new Error("interlaced png unsupported");
  if (depth !== 8) throw new Error("bit depth " + depth + " unsupported");
  const ch = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 }[ct];
  if (!ch) throw new Error("colortype " + ct + " unsupported");
  const raw = zlib.inflateSync(Buffer.concat(idat));
  const stride = w * ch;
  const px = Buffer.alloc(h * stride);
  let pos = 0;
  for (let y = 0; y < h; y++) {
    const ft = raw[pos++];
    const row = raw.subarray(pos, pos + stride);
    pos += stride;
    const prev = y > 0 ? px.subarray((y - 1) * stride, y * stride) : null;
    const cur = px.subarray(y * stride, (y + 1) * stride);
    if (ft === 0) cur.set(row);
    else if (ft === 1) for (let x = 0; x < stride; x++) cur[x] = (row[x] + (x >= ch ? cur[x - ch] : 0)) & 255;
    else if (ft === 2) for (let x = 0; x < stride; x++) cur[x] = (row[x] + (prev ? prev[x] : 0)) & 255;
    else if (ft === 3) for (let x = 0; x < stride; x++) { const a = x >= ch ? cur[x - ch] : 0; const bb = prev ? prev[x] : 0; cur[x] = (row[x] + ((a + bb) >> 1)) & 255; }
    else if (ft === 4) for (let x = 0; x < stride; x++) {
      const a = x >= ch ? cur[x - ch] : 0; const bb = prev ? prev[x] : 0; const c = x >= ch && prev ? prev[x - ch] : 0;
      const p = a + bb - c;
      const pa = Math.abs(p - a), pb = Math.abs(p - bb), pc = Math.abs(p - c);
      const pr = pa <= pb && pa <= pc ? a : (pb <= pc ? bb : c);
      cur[x] = (row[x] + pr) & 255;
    } else throw new Error("unknown filter " + ft);
  }
  const rgb = Buffer.alloc(w * h * 3);
  for (let i = 0; i < w * h; i++) {
    let r, g, bl;
    if (ct === 2) { r = px[i * 3]; g = px[i * 3 + 1]; bl = px[i * 3 + 2]; }
    else if (ct === 0) { r = g = bl = px[i]; }
    else if (ct === 4) { r = g = bl = px[i * 2]; }
    else if (ct === 6) { r = px[i * 4]; g = px[i * 4 + 1]; bl = px[i * 4 + 2]; }
    else { r = plte[px[i] * 3]; g = plte[px[i] * 3 + 1]; bl = plte[px[i] * 3 + 2]; }
    rgb[i * 3] = r; rgb[i * 3 + 1] = g; rgb[i * 3 + 2] = bl;
  }
  return { width: w, height: h, rgb };
}

function psnrRgb(bufA, bufB) {
  if (bufA.length !== bufB.length) return { value: null, reason: "buffer size mismatch" };
  const n = bufA.length / 3;
  const sse = [0, 0, 0];
  for (let i = 0; i < bufA.length; i++) { const d = bufA[i] - bufB[i]; sse[i % 3] += d * d; }
  let sum = 0;
  let allZero = true;
  for (let c = 0; c < 3; c++) {
    const mse = sse[c] / n;
    if (mse === 0) continue;
    allZero = false;
    sum += 10 * Math.log10(65025 / mse);
  }
  if (allZero) return { value: "inf", reason: "identical pixels" };
  // 8-bit per-channel dB average over R, G, B (ffmpeg psnr "average" semantics for rgb24).
  return { value: Math.round((sum / 3) * 100) / 100 };
}

// --- main -------------------------------------------------------------------
async function main() {
  const a = parseArgs(process.argv.slice(2));
  if (!fs.existsSync(a.page)) fail(`page not found: ${a.page}`);
  if (!fs.existsSync(path.dirname(a.out))) fs.mkdirSync(path.dirname(a.out), { recursive: true });
  if (a.refOut) fs.mkdirSync(path.dirname(a.refOut), { recursive: true });
  if (a.frameOut) fs.mkdirSync(path.dirname(a.frameOut), { recursive: true });

  const pw = resolvePlaywright(a.playwright);
  if (!pw) {
    emit({ status: "skip", reason: "playwright not found (set PLAYWRIGHT_MODULE or --playwright <module>)" });
    process.exit(0);
  }
  const { chromium } = pw.mod;
  const browser = await chromium.launch({ channel: a.channel, headless: !a.headed });
  const browserVersion = browser.version();
  let ref = null;
  try {
    const context = await browser.newContext({
      viewport: { width: a.vw, height: a.vh },
      recordVideo: { dir: path.dirname(a.out), size: { width: a.vw, height: a.vh } },
    });
    const page = await context.newPage();
    await page.goto(pathToFileURL(a.page).href, { waitUntil: "load" });
    if (a.refOut) {
      await page.screenshot({ path: a.refOut, fullPage: false });
      ref = { path: a.refOut, size: fs.statSync(a.refOut).size, sha256: sha256(a.refOut) };
    }
    await page.waitForTimeout(Math.round(a.duration * 1000));
    await page.close();
    const video = page.video();
    const videoPath = await video.path();
    await context.close();
    fs.copyFileSync(videoPath, a.out);
    fs.unlinkSync(videoPath);
  } finally {
    await browser.close();
  }

  const ffmpeg = findFfmpeg();
  const meta = ffmpeg ? probeMeta(ffmpeg, a.out) : { duration_s: null, codec: null, width: null, height: null, fps: null, creation_time: null };

  let frame = null;
  if (a.frameOut) {
    const ok = ffmpeg ? extractFrame(ffmpeg, a.out, a.frameOut, a.frameTime) : false;
    frame = ok
      ? { path: a.frameOut, time_s: a.frameTime, size: fs.statSync(a.frameOut).size, sha256: sha256(a.frameOut) }
      : { path: a.frameOut, time_s: a.frameTime, error: ffmpeg ? "frame extraction failed" : "ffmpeg not found" };
  }
  let psnr = null;
  if (a.refOut && frame && !frame.error) {
    try {
      const r = decodePng(a.refOut);
      const f = decodePng(a.frameOut);
      if (r.width !== f.width || r.height !== f.height) {
        psnr = { value: null, reason: `dimension mismatch: ref ${r.width}x${r.height} vs frame ${f.width}x${f.height}` };
      } else {
        psnr = psnrRgb(r.rgb, f.rgb);
        psnr.method = "node png-decode + rgb24 per-channel dB average (8-bit)";
      }
    } catch (e) {
      psnr = { value: null, reason: String(e && e.message || e) };
    }
  }

  emit({
    status: "ok",
    page: a.page,
    out: a.out,
    size: fs.statSync(a.out).size,
    sha256: sha256(a.out),
    viewport: { width: a.vw, height: a.vh },
    requested_duration_s: a.duration,
    duration_s: meta.duration_s,
    width: meta.width,
    height: meta.height,
    fps: meta.fps,
    codec: meta.codec,
    creation_time: meta.creation_time,
    metadata_source: ffmpeg,
    browser_channel: a.channel,
    browser_version: browserVersion,
    playwright_version: pkgVersion(pw),
    ref,
    frame,
    psnr_db: psnr ? psnr.value : null,
    psnr_method: psnr && psnr.method ? psnr.method : null,
    psnr_reason: psnr && psnr.reason ? psnr.reason : null,
  });
  process.exit(0);
}

main().catch((e) => {
  console.log(JSON.stringify({ status: "error", error: String(e && e.message || e) }));
  process.exit(1);
});
