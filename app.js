const imageInput = document.getElementById("imageInput");
const dropzone = document.getElementById("dropzone");
const sizeSelect = document.getElementById("sizeSelect");
const colorCountSelect = document.getElementById("colorCount");
const preserveAspect = document.getElementById("preserveAspect");
const generateBtn = document.getElementById("generateBtn");
const downloadPatternBtn = document.getElementById("downloadPatternBtn");
const downloadLegendBtn = document.getElementById("downloadLegendBtn");
const downloadCsvBtn = document.getElementById("downloadCsvBtn");
const patternCanvas = document.getElementById("patternCanvas");
const legendCanvas = document.getElementById("legendCanvas");
const paletteList = document.getElementById("paletteList");
const statusText = document.getElementById("statusText");
const gridSizeText = document.getElementById("gridSizeText");
const paletteItemTemplate = document.getElementById("paletteItemTemplate");

const patternCtx = patternCanvas.getContext("2d");
const legendCtx = legendCanvas.getContext("2d");
const sizes = new Set([104, 78, 52]);
const paletteOptions = [8, 12, 16, 24, 32, 48];
const fixedPaletteName = "Mard-221";

const state = {
  image: null,
  gridSize: 104,
  colorCount: 12,
  palette: [],
  pixels: [],
};

function rgbToHex(r, g, b) {
  return [r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("").toUpperCase();
}

function hexToRgb(hex) {
  const value = hex.replace("#", "");
  return {
    r: parseInt(value.slice(0, 2), 16),
    g: parseInt(value.slice(2, 4), 16),
    b: parseInt(value.slice(4, 6), 16),
  };
}

function luminance(color) {
  const [r, g, b] = [color.r, color.g, color.b].map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function makeLabel(index) {
  const letter = String.fromCharCode(65 + Math.floor(index / 100));
  const digits = String((index % 100) + 1).padStart(2, "0");
  return `${letter}${digits}`;
}

function loadImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("图片读取失败"));
    };
    image.src = url;
  });
}

function offscreen(width, height) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

function extractPixels(image, size, keepAspect) {
  const canvas = offscreen(size, size);
  const ctx = canvas.getContext("2d");
  if (keepAspect) {
    const scale = Math.max(size / image.width, size / image.height);
    const w = image.width * scale;
    const h = image.height * scale;
    const x = (size - w) / 2;
    const y = (size - h) / 2;
    ctx.drawImage(image, x, y, w, h);
  } else {
    ctx.drawImage(image, 0, 0, size, size);
  }
  const data = ctx.getImageData(0, 0, size, size).data;
  const pixels = [];
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const idx = (y * size + x) * 4;
      pixels.push({ r: data[idx], g: data[idx + 1], b: data[idx + 2], a: data[idx + 3] });
    }
  }
  return pixels;
}

function distance(a, b) {
  const dr = a.r - b.r;
  const dg = a.g - b.g;
  const db = a.b - b.b;
  return dr * dr + dg * dg + db * db;
}

function buildPalette(pixels, count) {
  const samples = pixels.filter((p) => p.a > 0);
  if (!samples.length) return [{ hex: "#FFFFFF", r: 255, g: 255, b: 255, label: "A01" }];

  const centroids = [];
  const step = Math.max(1, Math.floor(samples.length / count));
  for (let i = 0; i < samples.length && centroids.length < count; i += step) {
    centroids.push({ r: samples[i].r, g: samples[i].g, b: samples[i].b });
  }
  while (centroids.length < count) {
    const sample = samples[Math.floor(Math.random() * samples.length)];
    centroids.push({ r: sample.r, g: sample.g, b: sample.b });
  }

  for (let iter = 0; iter < 6; iter += 1) {
    const clusters = centroids.map(() => []);
    for (const sample of samples) {
      let bestIndex = 0;
      let bestDistance = Infinity;
      centroids.forEach((centroid, index) => {
        const d = distance(sample, centroid);
        if (d < bestDistance) {
          bestDistance = d;
          bestIndex = index;
        }
      });
      clusters[bestIndex].push(sample);
    }
    centroids.forEach((centroid, index) => {
      const cluster = clusters[index];
      if (!cluster.length) return;
      const total = cluster.reduce(
        (acc, p) => {
          acc.r += p.r;
          acc.g += p.g;
          acc.b += p.b;
          return acc;
        },
        { r: 0, g: 0, b: 0 }
      );
      centroid.r = Math.round(total.r / cluster.length);
      centroid.g = Math.round(total.g / cluster.length);
      centroid.b = Math.round(total.b / cluster.length);
    });
  }

  return centroids.map((c, index) => ({
    label: makeLabel(index),
    hex: `#${rgbToHex(c.r, c.g, c.b)}`,
    r: c.r,
    g: c.g,
    b: c.b,
  }));
}

function assignPalette(pixels, palette) {
  return pixels.map((pixel) => {
    if (pixel.a === 0) return palette[0];
    let best = palette[0];
    let bestDistance = Infinity;
    palette.forEach((color) => {
      const d = distance(pixel, color);
      if (d < bestDistance) {
        bestDistance = d;
        best = color;
      }
    });
    return best;
  });
}

function drawGrid(ctx, canvas, size, pixels, drawLabels = true) {
  const scale = canvas.width / size;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.imageSmoothingEnabled = false;
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const color = pixels[y * size + x];
      ctx.fillStyle = color.hex;
      ctx.fillRect(Math.round(x * scale), Math.round(y * scale), Math.ceil(scale), Math.ceil(scale));
    }
  }
  ctx.strokeStyle = "rgba(20,28,32,0.18)";
  ctx.lineWidth = 1;
  for (let i = 0; i <= size; i += 1) {
    const pos = Math.round(i * scale) + 0.5;
    ctx.beginPath();
    ctx.moveTo(pos, 0);
    ctx.lineTo(pos, canvas.height);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, pos);
    ctx.lineTo(canvas.width, pos);
    ctx.stroke();
  }
  if (drawLabels) {
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = `${Math.max(6, Math.floor(scale * 0.34))}px Arial`;
    for (let y = 0; y < size; y += 1) {
      for (let x = 0; x < size; x += 1) {
        const color = pixels[y * size + x];
        const rgb = hexToRgb(color.hex);
        ctx.fillStyle = luminance(rgb) > 0.55 ? "#111827" : "#FFFFFF";
        ctx.fillText(color.label, (x + 0.5) * scale, (y + 0.5) * scale);
      }
    }
  }
}

function renderPalette(palette, pixels) {
  paletteList.innerHTML = "";
  const counts = new Map();
  pixels.forEach((pixel) => counts.set(pixel.label, (counts.get(pixel.label) ?? 0) + 1));
  palette.forEach((color) => {
    const node = paletteItemTemplate.content.firstElementChild.cloneNode(true);
    node.querySelector(".swatch").style.background = color.hex;
    node.querySelector(".palette-hex").textContent = `${color.label} ${color.hex}`;
    node.querySelector(".palette-count").textContent = `${counts.get(color.label) ?? 0} 个像素`;
    paletteList.appendChild(node);
  });
}

function setReady(ready) {
  downloadPatternBtn.disabled = !ready;
  downloadLegendBtn.disabled = !ready;
  downloadCsvBtn.disabled = !ready;
}

function updateStatus(message) {
  statusText.textContent = message;
}

function refreshSizeButtons(group, value, key) {
  group.querySelectorAll("button").forEach((button) => {
    button.classList.toggle("active", Number(button.dataset[key]) === value);
  });
}

function buildLegendCanvas() {
  const items = state.palette.map((color) => ({
    ...color,
    count: state.pixels.filter((p) => p.label === color.label).length,
  }));

  const columns = state.gridSize === 104 ? 6 : 5;
  const rows = Math.ceil(items.length / columns);
  const cardWidth = 180;
  const cardHeight = 78;
  const gapX = 18;
  const gapY = 18;
  const marginX = 48;
  const marginTop = 120;
  const canvasWidth = marginX * 2 + columns * cardWidth + (columns - 1) * gapX;
  const canvasHeight = marginTop + rows * cardHeight + (rows - 1) * gapY + 90;
  const canvas = offscreen(canvasWidth, canvasHeight);
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);
  ctx.fillStyle = "#111";
  ctx.font = "bold 32px Arial";
  ctx.fillText("色号统计图", 48, 54);
  ctx.font = "18px Arial";
  ctx.fillText(`尺寸：${state.gridSize}×${state.gridSize}  |  色库：${fixedPaletteName}  |  颜色档位：${state.colorCount} 色`, 48, 88);

  items.forEach((item, index) => {
    const col = index % columns;
    const row = Math.floor(index / columns);
    const x = marginX + col * (cardWidth + gapX);
    const y = marginTop + row * (cardHeight + gapY);
    ctx.fillStyle = item.hex;
    ctx.fillRect(x, y, cardWidth, cardHeight);
    ctx.strokeStyle = "rgba(0,0,0,0.15)";
    ctx.strokeRect(x + 0.5, y + 0.5, cardWidth - 1, cardHeight - 1);
    const rgb = hexToRgb(item.hex);
    ctx.fillStyle = luminance(rgb) > 0.55 ? "#111" : "#fff";
    ctx.font = "bold 20px Arial";
    ctx.fillText(item.label, x + 12, y + 28);
    ctx.font = "16px Arial";
    ctx.fillText(item.hex, x + 12, y + 50);
    const countText = `${item.count} 颗`;
    ctx.fillText(countText, x + cardWidth - 12 - ctx.measureText(countText).width, y + 50);
  });

  legendCanvas.width = canvas.width;
  legendCanvas.height = canvas.height;
  legendCtx.clearRect(0, 0, legendCanvas.width, legendCanvas.height);
  legendCtx.drawImage(canvas, 0, 0);
}

function buildPatternExportCanvas() {
  const scale = state.gridSize === 104 ? 24 : state.gridSize === 78 ? 28 : 32;
  const canvas = offscreen(state.gridSize * scale, state.gridSize * scale);
  const ctx = canvas.getContext("2d");
  drawGrid(ctx, canvas, state.gridSize, state.pixels, true);
  return canvas;
}

function exportCSV() {
  const counts = new Map();
  state.pixels.forEach((pixel) => counts.set(pixel.label, (counts.get(pixel.label) ?? 0) + 1));
  const rows = ["label,hex,count,r,g,b"];
  state.palette.forEach((color) => {
    rows.push([color.label, color.hex, counts.get(color.label) ?? 0, color.r, color.g, color.b].join(","));
  });
  const blob = new Blob([rows.join("\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `bead-pattern-${state.gridSize}.csv`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

function downloadCanvas(canvas, filename) {
  const a = document.createElement("a");
  a.href = canvas.toDataURL("image/png");
  a.download = filename;
  a.click();
}

function generate() {
  if (!state.image) {
    updateStatus("请先上传图片。");
    setReady(false);
    return;
  }
  updateStatus("正在生成图纸...");
  const pixels = extractPixels(state.image, state.gridSize, preserveAspect.checked);
  const palette = buildPalette(pixels, state.colorCount);
  const assigned = assignPalette(pixels, palette);
  state.palette = palette;
  state.pixels = assigned;

  const patternScale = state.gridSize === 104 ? 18 : state.gridSize === 78 ? 20 : 24;
  patternCanvas.width = state.gridSize * patternScale;
  patternCanvas.height = state.gridSize * patternScale;
  drawGrid(patternCtx, patternCanvas, state.gridSize, assigned, true);
  buildLegendCanvas();
  renderPalette(palette, assigned);
  gridSizeText.textContent = `${state.gridSize}×${state.gridSize}`;
  updateStatus(`已生成 ${state.gridSize}×${state.gridSize} 图纸，固定色库：${fixedPaletteName}。`);
  setReady(true);
}

imageInput.addEventListener("change", (event) => {
  const [file] = event.target.files;
  if (!file) return;
  loadImage(file)
    .then((image) => {
      state.image = image;
      updateStatus(`已载入 ${file.name}，点击生成图纸。`);
      generate();
    })
    .catch((err) => updateStatus(err.message));
});

dropzone.addEventListener("dragover", (event) => {
  event.preventDefault();
  dropzone.classList.add("drag");
});

dropzone.addEventListener("dragleave", () => dropzone.classList.remove("drag"));

dropzone.addEventListener("drop", (event) => {
  event.preventDefault();
  dropzone.classList.remove("drag");
  const [file] = event.dataTransfer.files;
  if (!file) return;
  loadImage(file)
    .then((image) => {
      state.image = image;
      updateStatus(`已载入 ${file.name}，点击生成图纸。`);
      generate();
    })
    .catch((err) => updateStatus(err.message));
});

sizeSelect.addEventListener("click", (event) => {
  const button = event.target.closest("button");
  if (!button) return;
  const size = Number(button.dataset.size);
  if (!sizes.has(size)) return;
  state.gridSize = size;
  refreshSizeButtons(sizeSelect, size, "size");
  if (state.image) generate();
});

colorCountSelect.addEventListener("click", (event) => {
  const button = event.target.closest("button");
  if (!button) return;
  const count = Number(button.dataset.colors);
  if (!paletteOptions.includes(count)) return;
  state.colorCount = count;
  refreshSizeButtons(colorCountSelect, count, "colors");
  if (state.image) generate();
});

generateBtn.addEventListener("click", generate);
downloadPatternBtn.addEventListener("click", () => downloadCanvas(buildPatternExportCanvas(), `bead-pattern-${state.gridSize}.png`));
downloadLegendBtn.addEventListener("click", () => downloadCanvas(buildLegendCanvas(), `bead-legend-${state.gridSize}.png`));
downloadCsvBtn.addEventListener("click", exportCSV);

setReady(false);
