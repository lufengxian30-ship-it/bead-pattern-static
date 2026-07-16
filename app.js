const imageInput = document.getElementById("imageInput");
const dropzone = document.getElementById("dropzone");
const sizeSelect = document.getElementById("sizeSelect");
const colorCountSelect = document.getElementById("colorCount");
const preserveAspect = document.getElementById("preserveAspect");
const generateBtn = document.getElementById("generateBtn");
const downloadPatternBtn = document.getElementById("downloadPatternBtn");
const downloadLegendBtn = document.getElementById("downloadLegendBtn");
const printBtn = document.getElementById("printBtn");
const patternCanvas = document.getElementById("patternCanvas");
const legendCanvas = document.getElementById("legendCanvas");
const emptyState = document.getElementById("emptyState");
const paletteList = document.getElementById("paletteList");
const statusText = document.getElementById("statusText");
const gridSizeText = document.getElementById("gridSizeText");
const paletteSizeText = document.getElementById("paletteSizeText");
const pixelCountText = document.getElementById("pixelCountText");
const paletteItemTemplate = document.getElementById("paletteItemTemplate");

const patternCtx = patternCanvas.getContext("2d");
const legendCtx = legendCanvas.getContext("2d");
const gridSizes = new Set([104, 78, 52]);
const paletteOptions = [8, 12, 16, 24, 32, 48];
const FIXED_PALETTE_NAME = "Mard-221";

const state = {
  image: null,
  gridSize: 104,
  colorCount: 12,
  palette: [],
  pixelData: [],
};

function rgbToHex(r, g, b) {
  return [r, g, b]
    .map((value) => value.toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase();
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

function makeCompactLabel(index) {
  const letter = String.fromCharCode(65 + Math.floor(index / 100));
  const digits = String((index % 100) + 1).padStart(2, "0");
  return `${letter}${digits}`;
}

function distance(a, b) {
  const dr = a.r - b.r;
  const dg = a.g - b.g;
  const db = a.b - b.b;
  return dr * dr + dg * dg + db * db;
}

function loadImageFromFile(file) {
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

function createOffscreenCanvas(width, height) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

function extractScaledPixels(image, size, keepAspect) {
  const source = createOffscreenCanvas(size, size);
  const sourceCtx = source.getContext("2d");
  sourceCtx.clearRect(0, 0, size, size);

  if (keepAspect) {
    const scale = Math.max(size / image.width, size / image.height);
    const drawWidth = image.width * scale;
    const drawHeight = image.height * scale;
    const offsetX = (size - drawWidth) / 2;
    const offsetY = (size - drawHeight) / 2;
    sourceCtx.drawImage(image, offsetX, offsetY, drawWidth, drawHeight);
  } else {
    sourceCtx.drawImage(image, 0, 0, size, size);
  }

  const { data } = sourceCtx.getImageData(0, 0, size, size);
  const pixels = [];
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const idx = (y * size + x) * 4;
      pixels.push({
        r: data[idx],
        g: data[idx + 1],
        b: data[idx + 2],
        a: data[idx + 3],
      });
    }
  }
  return pixels;
}

function buildPalette(pixels, count) {
  const samples = pixels.filter((pixel) => pixel.a > 0);
  if (!samples.length) {
    return [{ hex: "#FFFFFF", r: 255, g: 255, b: 255 }];
  }

  const centroids = [];
  const seeded = new Set();
  const step = Math.max(1, Math.floor(samples.length / count));

  for (let i = 0; i < samples.length && centroids.length < count; i += step) {
    const sample = samples[i];
    const key = `${sample.r}-${sample.g}-${sample.b}`;
    if (!seeded.has(key)) {
      seeded.add(key);
      centroids.push({ r: sample.r, g: sample.g, b: sample.b });
    }
  }

  while (centroids.length < count) {
    const sample = samples[Math.floor(Math.random() * samples.length)];
    centroids.push({ r: sample.r, g: sample.g, b: sample.b });
  }

  for (let iteration = 0; iteration < 8; iteration += 1) {
    const clusters = centroids.map(() => []);

    for (const sample of samples) {
      let bestIndex = 0;
      let bestDistance = Infinity;

      centroids.forEach((centroid, index) => {
        const current = distance(sample, centroid);
        if (current < bestDistance) {
          bestDistance = current;
          bestIndex = index;
        }
      });

      clusters[bestIndex].push(sample);
    }

    centroids.forEach((centroid, index) => {
      const cluster = clusters[index];
      if (!cluster.length) return;

      const totals = cluster.reduce(
        (acc, pixel) => {
          acc.r += pixel.r;
          acc.g += pixel.g;
          acc.b += pixel.b;
          return acc;
        },
        { r: 0, g: 0, b: 0 }
      );

      centroid.r = Math.round(totals.r / cluster.length);
      centroid.g = Math.round(totals.g / cluster.length);
      centroid.b = Math.round(totals.b / cluster.length);
    });
  }

  return centroids.map((color, index) => ({
    id: index + 1,
    label: makeCompactLabel(index),
    hex: `#${rgbToHex(color.r, color.g, color.b)}`,
    r: color.r,
    g: color.g,
    b: color.b,
  }));
}

function assignPalette(pixels, palette) {
  return pixels.map((pixel) => {
    if (pixel.a === 0) return palette[0];
    let best = palette[0];
    let bestDistance = Infinity;
    palette.forEach((color) => {
      const current = distance(pixel, color);
      if (current < bestDistance) {
        bestDistance = current;
        best = color;
      }
    });
    return best;
  });
}

function drawGrid(renderCtx, canvas, size, pixels, options = {}) {
  const { drawLabels = true } = options;
  const scale = canvas.width / size;

  renderCtx.clearRect(0, 0, canvas.width, canvas.height);
  renderCtx.imageSmoothingEnabled = false;

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const color = pixels[y * size + x];
      renderCtx.fillStyle = color.hex;
      renderCtx.fillRect(
        Math.round(x * scale),
        Math.round(y * scale),
        Math.ceil(scale),
        Math.ceil(scale)
      );
    }
  }

  renderCtx.strokeStyle = "rgba(20, 28, 32, 0.18)";
  renderCtx.lineWidth = 1;
  for (let i = 0; i <= size; i += 1) {
    const pos = Math.round(i * scale) + 0.5;
    renderCtx.beginPath();
    renderCtx.moveTo(pos, 0);
    renderCtx.lineTo(pos, canvas.height);
    renderCtx.stroke();
    renderCtx.beginPath();
    renderCtx.moveTo(0, pos);
    renderCtx.lineTo(canvas.width, pos);
    renderCtx.stroke();
  }

  if (drawLabels) {
    renderCtx.textAlign = "center";
    renderCtx.textBaseline = "middle";
    renderCtx.font = `${Math.max(6, Math.floor(scale * 0.34))}px Arial`;
    for (let y = 0; y < size; y += 1) {
      for (let x = 0; x < size; x += 1) {
        const color = pixels[y * size + x];
        const rgb = hexToRgb(color.hex);
        renderCtx.fillStyle = luminance(rgb) > 0.55 ? "#111827" : "#FFFFFF";
        renderCtx.fillText(color.label, (x + 0.5) * scale, (y + 0.5) * scale);
      }
    }
  }
}

function renderPalette(palette, pixels) {
  paletteList.innerHTML = "";
  const counts = new Map();

  pixels.forEach((pixel) => {
    counts.set(pixel.label, (counts.get(pixel.label) ?? 0) + 1);
  });

  palette.forEach((color) => {
    const node = paletteItemTemplate.content.firstElementChild.cloneNode(true);
    node.querySelector(".swatch").style.background = color.hex;
    node.querySelector(".palette-hex").textContent = `${color.label} ${color.hex}`;
    const count = counts.get(color.label) ?? 0;
    node.querySelector(".palette-count").textContent = `${count} 个像素`;
    paletteList.appendChild(node);
  });
}

function updateStatus(message) {
  statusText.textContent = message;
}

function setReady(isReady) {
  downloadPatternBtn.disabled = !isReady;
  downloadLegendBtn.disabled = !isReady;
  printBtn.disabled = !isReady;
  emptyState.classList.toggle("hide", isReady);
}

function updateUiValues() {
  gridSizeText.textContent = `${state.gridSize}×${state.gridSize}`;
  paletteSizeText.textContent = FIXED_PALETTE_NAME;
  pixelCountText.textContent = `${state.gridSize * state.gridSize}`;
}

function refreshActiveButtonGroup(group, value, attrName) {
  group.querySelectorAll(".segmented-option").forEach((button) => {
    button.classList.toggle("active", Number(button.dataset[attrName]) === value);
  });
}

function buildFooterLines() {
  const counts = new Map();
  state.pixelData.forEach((pixel) => {
    counts.set(pixel.label, (counts.get(pixel.label) ?? 0) + 1);
  });

  return state.palette.map((color) => ({
    ...color,
    count: counts.get(color.label) ?? 0,
  }));
}

function renderPatternCanvas(targetCanvas, pixels) {
  const scale = state.gridSize === 104 ? 18 : state.gridSize === 78 ? 20 : 24;
  targetCanvas.width = state.gridSize * scale;
  targetCanvas.height = state.gridSize * scale;
  const targetCtx = targetCanvas.getContext("2d");
  drawGrid(targetCtx, targetCanvas, state.gridSize, pixels, { drawLabels: true });
}

function buildPatternExportCanvas() {
  const scale = state.gridSize === 104 ? 24 : state.gridSize === 78 ? 28 : 32;
  const gridCanvas = createOffscreenCanvas(state.gridSize * scale, state.gridSize * scale);
  const gridCtx = gridCanvas.getContext("2d");
  drawGrid(gridCtx, gridCanvas, state.gridSize, state.pixelData, { drawLabels: true });

  const exportCanvas = createOffscreenCanvas(gridCanvas.width + 120, gridCanvas.height + 180);
  const exportCtx = exportCanvas.getContext("2d");

  exportCtx.fillStyle = "#ffffff";
  exportCtx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);
  exportCtx.fillStyle = "#111111";
  exportCtx.font = "bold 32px Arial";
  exportCtx.fillText("效果图", 60, 54);
  exportCtx.font = "18px Arial";
  exportCtx.fillText(
    `尺寸：${state.gridSize}×${state.gridSize}  |  色库：${FIXED_PALETTE_NAME}  |  颜色档位：${state.colorCount} 色`,
    60,
    88
  );

  exportCtx.drawImage(gridCanvas, 60, 120);
  return exportCanvas;
}

function buildLegendExportCanvas() {
  const footerItems = buildFooterLines();
  const columns = state.gridSize === 104 ? 6 : 5;
  const rows = Math.ceil(footerItems.length / columns);
  const cardWidth = 180;
  const cardHeight = 78;
  const gapX = 18;
  const gapY = 18;
  const marginX = 48;
  const marginTop = 120;
  const marginBottom = 60;
  const canvasWidth = marginX * 2 + columns * cardWidth + (columns - 1) * gapX;
  const canvasHeight = marginTop + rows * cardHeight + (rows - 1) * gapY + marginBottom + 90;
  const exportCanvas = createOffscreenCanvas(canvasWidth, canvasHeight);
  const exportCtx = exportCanvas.getContext("2d");

  exportCtx.fillStyle = "#ffffff";
  exportCtx.fillRect(0, 0, canvasWidth, canvasHeight);
  exportCtx.fillStyle = "#111111";
  exportCtx.font = "bold 32px Arial";
  exportCtx.fillText("色号统计图", 48, 54);
  exportCtx.font = "18px Arial";
  exportCtx.fillText(
    `尺寸：${state.gridSize}×${state.gridSize}  |  色库：${FIXED_PALETTE_NAME}  |  颜色档位：${state.colorCount} 色`,
    48,
    88
  );

  footerItems.forEach((item, index) => {
    const column = index % columns;
    const row = Math.floor(index / columns);
    const x = marginX + column * (cardWidth + gapX);
    const y = marginTop + row * (cardHeight + gapY);

    exportCtx.fillStyle = item.hex;
    exportCtx.fillRect(x, y, cardWidth, cardHeight);
    exportCtx.strokeStyle = "rgba(0,0,0,0.15)";
    exportCtx.strokeRect(x + 0.5, y + 0.5, cardWidth - 1, cardHeight - 1);

    const rgb = hexToRgb(item.hex);
    exportCtx.fillStyle = luminance(rgb) > 0.55 ? "#111111" : "#FFFFFF";
    exportCtx.font = "bold 20px Arial";
    exportCtx.fillText(item.label, x + 12, y + 28);
    exportCtx.font = "16px Arial";
    exportCtx.fillText(item.hex, x + 12, y + 50);
    const countText = `${item.count} 颗`;
    exportCtx.fillText(countText, x + cardWidth - 12 - exportCtx.measureText(countText).width, y + 50);
  });

  return exportCanvas;
}

async function generatePattern() {
  if (!state.image) {
    updateStatus("请先上传图片。");
    setReady(false);
    return;
  }

  updateStatus("正在生成图纸...");
  const pixels = extractScaledPixels(state.image, state.gridSize, preserveAspect.checked);
  const palette = buildPalette(pixels, state.colorCount);
  const assigned = assignPalette(pixels, palette);

  state.palette = palette;
  state.pixelData = assigned;

  renderPatternCanvas(patternCanvas, assigned);

  const legend = buildLegendExportCanvas();
  legendCanvas.width = legend.width;
  legendCanvas.height = legend.height;
  legendCtx.clearRect(0, 0, legendCanvas.width, legendCanvas.height);
  legendCtx.drawImage(legend, 0, 0);

  renderPalette(palette, assigned);
  updateUiValues();
  updateStatus(`已生成 ${state.gridSize}×${state.gridSize} 图纸，固定色库：${FIXED_PALETTE_NAME}。`);
  setReady(true);
}

function downloadDataUrl(dataUrl, filename) {
  const link = document.createElement("a");
  link.href = dataUrl;
  link.download = filename;
  link.click();
}

function canvasToJpegDataUrl(canvas) {
  const output = createOffscreenCanvas(canvas.width, canvas.height);
  const ctx = output.getContext("2d");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, output.width, output.height);
  ctx.drawImage(canvas, 0, 0);
  return output.toDataURL("image/jpeg", 0.95);
}

function exportPatternJpg() {
  const exportCanvas = buildPatternExportCanvas();
  downloadDataUrl(canvasToJpegDataUrl(exportCanvas), `bead-pattern-${state.gridSize}.jpg`);
}

function exportLegendJpg() {
  const exportCanvas = buildLegendExportCanvas();
  downloadDataUrl(canvasToJpegDataUrl(exportCanvas), `bead-legend-${state.gridSize}.jpg`);
}

function attachImage(file) {
  if (!file || !file.type.startsWith("image/")) {
    updateStatus("请选择有效的图片文件。");
    return;
  }
  loadImageFromFile(file)
    .then((image) => {
      state.image = image;
      updateStatus(`已载入 ${file.name}，点击生成图纸。`);
      generatePattern();
    })
    .catch((error) => {
      updateStatus(error.message);
      setReady(false);
    });
}

imageInput.addEventListener("change", (event) => {
  const [file] = event.target.files;
  attachImage(file);
});

sizeSelect.addEventListener("click", (event) => {
  const button = event.target.closest(".segmented-option");
  if (!button) return;
  const value = Number(button.dataset.size);
  if (!gridSizes.has(value)) return;
  state.gridSize = value;
  refreshActiveButtonGroup(sizeSelect, value, "size");
  updateUiValues();
  if (state.image) generatePattern();
});

colorCountSelect.addEventListener("click", (event) => {
  const button = event.target.closest(".segmented-option");
  if (!button) return;
  const value = Number(button.dataset.colors);
  if (!paletteOptions.includes(value)) return;
  state.colorCount = value;
  refreshActiveButtonGroup(colorCountSelect, value, "colors");
  if (state.image) generatePattern();
});

preserveAspect.addEventListener("change", () => {
  if (state.image) generatePattern();
});

generateBtn.addEventListener("click", generatePattern);
downloadPatternBtn.addEventListener("click", exportPatternJpg);
downloadLegendBtn.addEventListener("click", exportLegendJpg);
printBtn.addEventListener("click", () => window.print());

["dragenter", "dragover"].forEach((eventName) => {
  dropzone.addEventListener(eventName, (event) => {
    event.preventDefault();
    dropzone.classList.add("dragover");
  });
});

["dragleave", "drop"].forEach((eventName) => {
  dropzone.addEventListener(eventName, (event) => {
    event.preventDefault();
    dropzone.classList.remove("dragover");
  });
});

dropzone.addEventListener("drop", (event) => {
  const [file] = event.dataTransfer.files;
  attachImage(file);
});

updateUiValues();
setReady(false);
updateStatus("上传一张图片开始生成。");
