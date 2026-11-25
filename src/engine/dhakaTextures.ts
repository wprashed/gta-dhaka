import * as THREE from 'three';
import { BANGLA_SHOP_SIGNS } from '../data/dhakaWorldData';
import { resolveAssetUrl } from '../utils/assets';

const canvasCache = new Map<string, THREE.CanvasTexture>();
const imageTextureCache = new Map<string, THREE.Texture>();
const textureLoader = new THREE.TextureLoader();

export function loadRealTexture(
  url: string,
  repeatX = 1,
  repeatY = 1,
  isSRGB = true
): THREE.Texture {
  const resolvedUrl = resolveAssetUrl(url);
  const key = `${resolvedUrl}_${repeatX}_${repeatY}`;
  if (imageTextureCache.has(key)) return imageTextureCache.get(key)!;

  const tex = textureLoader.load(resolvedUrl);
  if (isSRGB) {
    tex.colorSpace = THREE.SRGBColorSpace;
  }
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatX, repeatY);
  tex.anisotropy = 8;
  imageTextureCache.set(key, tex);
  return tex;
}

export function createBanglaSignTexture(index: number): THREE.CanvasTexture {
  const key = `sign_${index}`;
  if (canvasCache.has(key)) return canvasCache.get(key)!;

  const sign = BANGLA_SHOP_SIGNS[index % BANGLA_SHOP_SIGNS.length];
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 160;
  const ctx = canvas.getContext('2d')!;

  const grad = ctx.createLinearGradient(0, 0, 512, 160);
  grad.addColorStop(0, sign.bg);
  grad.addColorStop(1, '#0f172a');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 512, 160);

  ctx.strokeStyle = sign.fg;
  ctx.lineWidth = 8;
  ctx.strokeRect(8, 8, 496, 144);

  ctx.fillStyle = sign.fg;
  ctx.font = 'bold 40px "Noto Sans Bengali", "Inter", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(sign.titleBn, 256, 62);

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 22px "Inter", sans-serif';
  ctx.fillText(sign.subEn, 256, 118);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  canvasCache.set(key, tex);
  return tex;
}

export function createHighwaySignTexture(
  titleBn: string,
  titleEn: string,
  subText: string
): THREE.CanvasTexture {
  const key = `hwy_${titleEn}_${subText}`;
  if (canvasCache.has(key)) return canvasCache.get(key)!;

  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 192;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#004d34';
  ctx.fillRect(0, 0, 512, 192);

  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 8;
  ctx.strokeRect(10, 10, 492, 172);

  ctx.fillStyle = '#fde047';
  ctx.font = 'bold 42px "Noto Sans Bengali", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(titleBn, 256, 68);

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 28px "Inter", sans-serif';
  ctx.fillText(titleEn, 256, 116);

  ctx.fillStyle = '#a7f3d0';
  ctx.font = 'bold 20px "Inter", sans-serif';
  ctx.fillText(subText, 256, 154);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  canvasCache.set(key, tex);
  return tex;
}

export function createRickshawArtTexture(_seed: number): THREE.Texture {
  // Seamless Bangladeshi hand-painted cycle rickshaw floral/peacock pattern texture
  return loadRealTexture('/textures/rickshaw_art_realistic.jpg', 1, 1, true);
}

export function createLungiPatternTexture(
  primaryHex: string,
  secondaryHex: string
): THREE.CanvasTexture {
  const key = `lungi_${primaryHex}_${secondaryHex}`;
  if (canvasCache.has(key)) return canvasCache.get(key)!;

  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = primaryHex;
  ctx.fillRect(0, 0, 128, 128);

  ctx.fillStyle = secondaryHex;
  for (let i = 0; i < 128; i += 32) {
    ctx.fillRect(i, 0, 14, 128);
    ctx.fillRect(0, i, 128, 14);
  }

  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2;
  for (let i = 16; i < 128; i += 32) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i, 128);
    ctx.moveTo(0, i);
    ctx.lineTo(128, i);
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  canvasCache.set(key, tex);
  return tex;
}

export function createBuildingFacadeTexture(
  style: 'old_dhaka' | 'modern_glass' | 'residential' | 'commercial',
  baseColor: string
): THREE.Texture {
  if (style === 'old_dhaka') {
    return loadRealTexture('/textures/brick_diffuse.jpg', 2, 3, true);
  }
  if (style === 'residential') {
    return loadRealTexture('/textures/dhaka_facade_realistic.jpg', 1, 2, true);
  }

  const key = `facade_arch_${style}_${baseColor}`;
  if (canvasCache.has(key)) return canvasCache.get(key)!;

  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d')!;

  // Base architectural concrete / glass curtain wall
  ctx.fillStyle = style === 'modern_glass' ? '#0f172a' : baseColor;
  ctx.fillRect(0, 0, 512, 1024);

  const rows = 14;
  const cols = 4;
  const padX = 18;
  const padY = 20;
  const cellW = (512 - padX * (cols + 1)) / cols;
  const cellH = (1024 - padY * (rows + 1)) / rows;

  for (let r = 0; r < rows; r++) {
    // Concrete floor slab ledge & balcony grille
    ctx.fillStyle = style === 'modern_glass' ? '#334155' : 'rgba(15,23,42,0.45)';
    ctx.fillRect(0, r * (cellH + padY), 512, 8);

    for (let c = 0; c < cols; c++) {
      const wx = padX + c * (cellW + padX);
      const wy = padY + r * (cellH + padY);
      const isLit = (r * 7 + c * 5) % 4 === 0 || (r + c) % 3 === 0;

      if (style === 'modern_glass') {
        const grad = ctx.createLinearGradient(wx, wy, wx + cellW, wy + cellH);
        grad.addColorStop(0, isLit ? '#7dd3fc' : '#0369a1');
        grad.addColorStop(1, isLit ? '#fef08a' : '#0c4a6e');
        ctx.fillStyle = grad;
        ctx.fillRect(wx, wy, cellW, cellH * 0.88);
      } else {
        // Dhaka apartment/commercial window with AC outdoor unit & verandah bars
        ctx.fillStyle = isLit ? '#fde68a' : '#1e293b';
        ctx.fillRect(wx, wy, cellW, cellH * 0.78);

        // Verandah railing stripes
        ctx.fillStyle = '#475569';
        ctx.fillRect(wx, wy + cellH * 0.6, cellW, 4);

        // Split AC outdoor unit box on alternating floors
        if ((r + c) % 2 === 0) {
          ctx.fillStyle = '#e2e8f0';
          ctx.fillRect(wx + cellW - 26, wy + 6, 22, 16);
        }
      }
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.needsUpdate = true;
  canvasCache.set(key, tex);
  return tex;
}

/**
 * Generates an authentic Dhaka Green CNG Auto-Rickshaw sheet-metal livery texture
 * with yellow waistline stripe, stamped rear engine cooling louvers, and Bangla registration stencil.
 */
export function createCngBodyTexture(seed = 1): THREE.CanvasTexture {
  const key = `cng_body_${seed % 6}`;
  if (canvasCache.has(key)) return canvasCache.get(key)!;

  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  // Rich Dhaka CNG Emerald Green metallic gradient
  const grad = ctx.createLinearGradient(0, 0, 0, 256);
  grad.addColorStop(0, '#16a34a');
  grad.addColorStop(0.5, '#15803d');
  grad.addColorStop(1, '#14532d');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 512, 256);

  // Yellow & Red reflective waistline safety stripes
  ctx.fillStyle = '#facc15';
  ctx.fillRect(0, 112, 512, 26);
  ctx.fillStyle = '#dc2626';
  ctx.fillRect(0, 134, 512, 6);

  // Stamped sheet-metal engine cooling louvers on rear quarter
  ctx.fillStyle = '#052e16';
  for (let i = 0; i < 7; i++) {
    ctx.fillRect(42 + i * 14, 156, 8, 52);
    ctx.fillRect(360 + i * 14, 156, 8, 52);
  }

  // White Bangla CNG stencil registration
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 22px "Hind Siliguri", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(`সিএনজি • ঢাকা মেট্রো-থ ১১-${4210 + (seed % 9) * 73}`, 256, 84);
  ctx.fillStyle = '#fde047';
  ctx.font = 'bold 18px "Hind Siliguri", sans-serif';
  ctx.fillText('আল্লাহু আকবর • মা-বাবার দোয়া', 256, 186);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  canvasCache.set(key, tex);
  return tex;
}

/**
 * Generates an authentic BRTA Bangladesh Bangla Vehicle Number Plate texture
 */
export function createBanglaNumberPlateTexture(
  plateText = 'ঢাকা মেট্রো-গ ৩৪-৮৯১২',
  isCommercialGreen = false
): THREE.CanvasTexture {
  const key = `plate_${plateText}_${isCommercialGreen}`;
  if (canvasCache.has(key)) return canvasCache.get(key)!;

  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 96;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = isCommercialGreen ? '#166534' : '#f8fafc';
  ctx.fillRect(0, 0, 256, 96);
  ctx.strokeStyle = '#0f172a';
  ctx.lineWidth = 6;
  ctx.strokeRect(3, 3, 250, 90);

  ctx.fillStyle = isCommercialGreen ? '#ffffff' : '#0f172a';
  ctx.font = 'bold 26px "Hind Siliguri", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(plateText, 128, 48);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  canvasCache.set(key, tex);
  return tex;
}

/**
 * Authentic Cast-Iron Circular Dhaka WASA (ঢাকা ওয়াসা) Sewer / Water Manhole Cover
 */
export function createWasaManholeTexture(): THREE.CanvasTexture {
  const key = 'wasa_manhole';
  if (canvasCache.has(key)) return canvasCache.get(key)!;

  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  // Dark cast iron base
  ctx.fillStyle = '#1e293b';
  ctx.beginPath();
  ctx.arc(128, 128, 124, 0, Math.PI * 2);
  ctx.fill();

  // Outer beveled iron rim
  ctx.strokeStyle = '#334155';
  ctx.lineWidth = 10;
  ctx.stroke();

  // Concentric non-slip textured ribs
  ctx.strokeStyle = '#475569';
  ctx.lineWidth = 3;
  [100, 78, 56].forEach((r) => {
    ctx.beginPath();
    ctx.arc(128, 128, r, 0, Math.PI * 2);
    ctx.stroke();
  });

  // Cross pattern grips
  for (let i = 0; i < 16; i++) {
    const angle = (i * Math.PI * 2) / 16;
    ctx.beginPath();
    ctx.moveTo(128 + Math.cos(angle) * 60, 128 + Math.sin(angle) * 60);
    ctx.lineTo(128 + Math.cos(angle) * 98, 128 + Math.sin(angle) * 98);
    ctx.stroke();
  }

  // Embossed Bangla WASA insignia
  ctx.fillStyle = '#94a3b8';
  ctx.font = 'bold 20px "Noto Sans Bengali", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('ঢাকা ওয়াসা', 128, 108);

  ctx.font = 'bold 16px "Inter", sans-serif';
  ctx.fillText('DWASA', 128, 148);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  canvasCache.set(key, tex);
  return tex;
}

/**
 * Authentic Yellow Diagonal Anti-Gridlock "Box Junction" Crisscross Grid
 */
export function createBoxJunctionTexture(): THREE.CanvasTexture {
  const key = 'box_junction';
  if (canvasCache.has(key)) return canvasCache.get(key)!;

  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  // Transparent dark asphalt base
  ctx.fillStyle = 'rgba(15, 23, 42, 0.0)';
  ctx.fillRect(0, 0, 256, 256);

  // Outer yellow bounding box
  ctx.strokeStyle = '#facc15';
  ctx.lineWidth = 10;
  ctx.strokeRect(6, 6, 244, 244);

  // Diagonal 45-degree crosshatch lines
  ctx.lineWidth = 5;
  for (let offset = -256; offset <= 512; offset += 36) {
    ctx.beginPath();
    ctx.moveTo(offset, 0);
    ctx.lineTo(offset + 256, 256);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(offset, 256);
    ctx.lineTo(offset + 256, 0);
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.needsUpdate = true;
  canvasCache.set(key, tex);
  return tex;
}

/**
 * Directional White Traffic Lane Arrows (Straight / Turn) painted on asphalt
 */
export function createRoadArrowTexture(type: 'straight' | 'left' | 'right'): THREE.CanvasTexture {
  const key = `road_arrow_${type}`;
  if (canvasCache.has(key)) return canvasCache.get(key)!;

  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#f8fafc';
  if (type === 'straight') {
    // Arrow stem
    ctx.fillRect(56, 110, 16, 120);
    // Arrow head
    ctx.beginPath();
    ctx.moveTo(64, 28);
    ctx.lineTo(104, 115);
    ctx.lineTo(76, 115);
    ctx.lineTo(76, 120);
    ctx.lineTo(52, 120);
    ctx.lineTo(52, 115);
    ctx.lineTo(24, 115);
    ctx.closePath();
    ctx.fill();
  } else if (type === 'left') {
    ctx.fillRect(56, 140, 16, 90);
    ctx.beginPath();
    ctx.arc(42, 140, 18, 0, Math.PI * 0.5, true);
    ctx.lineTo(28, 120);
    ctx.lineTo(10, 140);
    ctx.lineTo(28, 160);
    ctx.lineTo(28, 146);
    ctx.fill();
  } else {
    ctx.fillRect(56, 140, 16, 90);
    ctx.beginPath();
    ctx.arc(86, 140, 18, Math.PI, Math.PI * 0.5, false);
    ctx.lineTo(100, 120);
    ctx.lineTo(118, 140);
    ctx.lineTo(100, 160);
    ctx.lineTo(100, 146);
    ctx.fill();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  canvasCache.set(key, tex);
  return tex;
}

/**
 * Soft Radial Droplet Texture for 3D Animated Fountain Water Spray
 */
export function createFountainWaterDropTexture(): THREE.CanvasTexture {
  const key = 'fountain_drop';
  if (canvasCache.has(key)) return canvasCache.get(key)!;

  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d')!;

  const grad = ctx.createRadialGradient(32, 32, 2, 32, 32, 30);
  grad.addColorStop(0, 'rgba(255, 255, 255, 1.0)');
  grad.addColorStop(0.35, 'rgba(186, 230, 253, 0.85)');
  grad.addColorStop(0.75, 'rgba(56, 189, 248, 0.35)');
  grad.addColorStop(1, 'rgba(14, 165, 233, 0.0)');

  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(32, 32, 30, 0, Math.PI * 2);
  ctx.fill();

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  canvasCache.set(key, tex);
  return tex;
}

/**
 * Authentic Air Conditioner Outdoor Condenser Unit Texture (Walton / General)
 */
export function createAcUnitTexture(): THREE.CanvasTexture {
  const key = 'ac_outdoor_unit';
  if (canvasCache.has(key)) return canvasCache.get(key)!;

  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 160;
  const ctx = canvas.getContext('2d')!;

  // Off-white weather-resistant casing
  ctx.fillStyle = '#e2e8f0';
  ctx.fillRect(0, 0, 256, 160);
  ctx.strokeStyle = '#94a3b8';
  ctx.lineWidth = 4;
  ctx.strokeRect(4, 4, 248, 152);

  // Circular fan guard grille
  ctx.fillStyle = '#1e293b';
  ctx.beginPath();
  ctx.arc(95, 80, 58, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = '#475569';
  ctx.lineWidth = 3;
  ctx.stroke();

  // Fan blades
  ctx.strokeStyle = '#64748b';
  ctx.lineWidth = 5;
  for (let i = 0; i < 4; i++) {
    const a = (i * Math.PI) / 2 + 0.3;
    ctx.beginPath();
    ctx.moveTo(95, 80);
    ctx.lineTo(95 + Math.cos(a) * 52, 80 + Math.sin(a) * 52);
    ctx.stroke();
  }

  // Right-hand service panel & ventilation louvers
  ctx.fillStyle = '#334155';
  for (let y = 30; y < 135; y += 10) {
    ctx.fillRect(175, y, 62, 5);
  }

  // Brand Badge
  ctx.fillStyle = '#0284c7';
  ctx.font = 'bold 16px "Inter", sans-serif';
  ctx.fillText('WALTON', 178, 22);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  canvasCache.set(key, tex);
  return tex;
}

/**
 * Authentic Alternating Black-and-White Dhaka Roadside Curb Texture
 */
export function createBlackWhiteCurbTexture(): THREE.CanvasTexture {
  const key = 'bw_curb_texture';
  if (canvasCache.has(key)) return canvasCache.get(key)!;

  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 64;
  const ctx = canvas.getContext('2d')!;

  // Left half: dark asphalt charcoal
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(0, 0, 64, 64);

  // Right half: weathered white concrete
  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(64, 0, 64, 64);

  // Concrete texture grain
  ctx.fillStyle = 'rgba(0, 0, 0, 0.08)';
  for (let x = 0; x < 128; x += 4) {
    if ((x / 4) % 2 === 0) {
      ctx.fillRect(x, 0, 2, 64);
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(1, 1);
  canvasCache.set(key, tex);
  return tex;
}


