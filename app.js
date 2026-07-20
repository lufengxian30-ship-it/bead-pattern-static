const imageInput = document.getElementById("imageInput");
const dropzone = document.getElementById("dropzone");
const sizeSelect = document.getElementById("sizeSelect");
const colorCountSelect = document.getElementById("colorCount");
const preserveAspect = document.getElementById("preserveAspect");
const clarityOptimize = document.getElementById("clarityOptimize");
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

const MARD_221_SERIES = {
  A: "A1#FAF4C8A2#FFFFD5A3#FEFF8BA4#FBED56A5#F4D738A6#FEAC4CA7#FE8B4CA8#FFDA45A9#FF995BA10#F77C31A11#FFDD99A12#FE9F72A13#FFC365A14#FD543DA15#FFF365A16#FFFF9FA17#FFE36EA18#FEBE7DA19#FD7C72A20#FFD568A21#FFE395A22#F4F57DA23#E6C9B7A24#F7F8A2A25#FFD67DA26#FFC830",
  B: "B1#E6EE31B2#63F347B3#9EF780B4#5DE035B5#35E352B6#65E2A6B7#3DAF80B8#1C9C4FB9#27523AB10#95D3C2B11#5D722AB12#166F41B13#CAEB7BB14#ADE946B15#2E5132B16#C5ED9CB17#9BB13AB18#E6EE49B19#24B88CB20#C2F0CCB21#156A6BB22#0B3C43B23#303A21B24#EEFCA5B25#4E846DB26#8D7A35B27#CCE1AFB28#9EE5B9B29#C5E254B30#E2FCB1B31#B0E792B32#9CAB5A",
  C: "C1#E8FFE7C2#A9F9FCC3#A0E2FBC4#41CCFFC5#01ACEBC6#50AAF0C7#3677D2C8#0F54C0C9#324BCAC10#3EBCE2C11#28DDDEC12#1C334DC13#CDE8FFC14#D5FDFFC15#22C4C6C16#1557A8C17#04D1F6C18#1D3344C19#1887A2C20#176DAFC21#BEDDFFC22#67B4BEC23#C8E2FFC24#7CC4FFC25#A9E5E5C26#3CAED8C27#D3DFFAC28#BBCFEDC29#34488E",
  D: "D1#AEB4F2D2#858EDDD3#2F54AFD4#182A84D5#B843C5D6#AC7BDED7#8854B3D8#E2D3FFD9#D5B9F8D10#361851D11#B9BAE1D12#DE9AD4D13#B90095D14#8B279BD15#2F1F90D16#E3E1EED17#C4D4F6D18#A45EC7D19#D8C3D7D20#9C32B2D21#9A009BD22#333A95D23#EBDAFCD24#7786E5D25#494FC7D26#DFC2F8",
  E: "E1#FDD3CCE2#FEC0DFE3#FFB7E7E4#E8649EE5#F551A2E6#F13D74E7#C63478E8#FFDBE9E9#E970CCE10#D33793E11#FCDDD2E12#F78FC3E13#B5006DE14#FFD1BAE15#F8C7C9E16#FFF3EBE17#FFE2EAE18#FFC7DBE19#FEBAD5E20#D8C7D1E21#BD9DA1E22#B785A1E23#937A8DE24#E1BCE8",
  F: "F1#FD957BF2#FC3D46F3#F74941F4#FC283CF5#E7002FF6#943630F7#971937F8#BC0028F9#E2677AF10#8A4526F11#5A2121F12#FD4E6AF13#F35744F14#FFA9ADF15#D30022F16#FEC2A6F17#E69C79F18#D37C46F19#C1444AF20#CD9391F21#F7B4C6F22#FDC0D0F23#F67E66F24#E698AAF25#E54B4F",
  G: "G1#FFE2CEG2#FFC4AAG3#F4C3A5G4#E1B383G5#EDB045G6#E99C17G7#9D5B3EG8#753832G9#E6B483G10#D98C39G11#E0C593G12#FFC890G13#B7714AG14#8D614CG15#FCF9E0G16#F2D9BAG17#78524BG18#FFE4CCG19#E07935G20#A94023G21#B88558",
  H: "H1#FDFBFFH2#FEFFFFH3#B6B1BAH4#89858CH5#48464EH6#2F2B2FH7#000000H8#E7D6DBH9#EDEDEDH10#EEE9EAH11#CECDD5H12#FFF5EDH13#F5ECD2H14#CFD7D3H15#98A6A8H16#1D1414H17#F1EDEDH18#FFFDF0H19#F6EFE2H20#949FA3H21#FFFBE1H22#CACAD4H23#9A9D94",
  M: "M1#BCC6B8M2#8AA386M3#697D80M4#E3D2BCM5#D0CCAAM6#B0A782M7#B4A497M8#B38281M9#A58767M10#C5B2BCM11#9F7594M12#644749M13#D19066M14#C77362M15#757D78",
};

const MARD_221_PALETTE = Object.values(MARD_221_SERIES)
  .flatMap((series) =>
    [...series.matchAll(/([A-Z]\d{1,2})#([0-9A-F]{6})/g)].map((match) => ({
      label: match[1],
      hex: `#${match[2]}`,
    }))
  )
  .reduce((list, color) => {
    if (!list.some((entry) => entry.label === color.label)) list.push(color);
    return list;
  }, []);

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
  const letters = "ABCDEFGHIJKLM";
  const letter = letters[index % letters.length];
  const digits = String(Math.floor(index / letters.length) + 1).padStart(2, "0");
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
  sourceCtx.imageSmoothingEnabled = false;

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

function extractClarityPixels(image, size, keepAspect) {
  const source = createOffscreenCanvas(image.width, image.height);
  const sourceCtx = source.getContext("2d");
  sourceCtx.imageSmoothingEnabled = false;
  sourceCtx.drawImage(image, 0, 0);
  const imageData = sourceCtx.getImageData(0, 0, image.width, image.height).data;
  const pixels = [];

  const scale = keepAspect ? Math.max(size / image.width, size / image.height) : size / Math.min(image.width, image.height);
  const drawWidth = keepAspect ? image.width * scale : size;
  const drawHeight = keepAspect ? image.height * scale : size;
  const offsetX = keepAspect ? (size - drawWidth) / 2 : 0;
  const offsetY = keepAspect ? (size - drawHeight) / 2 : 0;

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const srcX = keepAspect
        ? Math.min(image.width - 1, Math.max(0, Math.round((x - offsetX + 0.5) / scale)))
        : Math.min(image.width - 1, Math.max(0, Math.round((x + 0.5) * image.width / size)));
      const srcY = keepAspect
        ? Math.min(image.height - 1, Math.max(0, Math.round((y - offsetY + 0.5) / scale)))
        : Math.min(image.height - 1, Math.max(0, Math.round((y + 0.5) * image.height / size)));
      const idx = (srcY * image.width + srcX) * 4;
      pixels.push({
        r: imageData[idx],
        g: imageData[idx + 1],
        b: imageData[idx + 2],
        a: imageData[idx + 3],
      });
    }
  }

  return pixels;
}

function buildPalette(pixels, count) {
  const samples = pixels.filter((pixel) => pixel.a > 0);
  if (!samples.length) {
    return [{ label: "H1", hex: "#FFFFFF", r: 255, g: 255, b: 255 }];
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

  const chosen = [];
  for (const centroid of centroids) {
    let best = MARD_221_PALETTE[0];
    let bestDistance = Infinity;
    for (const color of MARD_221_PALETTE) {
      const rgb = hexToRgb(color.hex);
      const d = distance(centroid, rgb);
      if (d < bestDistance && !chosen.some((entry) => entry.label === color.label)) {
        bestDistance = d;
        best = color;
      }
    }
    const rgb = hexToRgb(best.hex);
    chosen.push({ label: best.label, hex: best.hex, r: rgb.r, g: rgb.g, b: rgb.b });
  }

  return chosen;
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
  const pixels = clarityOptimize.checked
    ? extractClarityPixels(state.image, state.gridSize, preserveAspect.checked)
    : extractScaledPixels(state.image, state.gridSize, preserveAspect.checked);
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

clarityOptimize.addEventListener("change", () => {
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
