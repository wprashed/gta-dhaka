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
  const key = `sign_hd_${index}`;
  if (canvasCache.has(key)) return canvasCache.get(key)!;

  const sign = BANGLA_SHOP_SIGNS[index % BANGLA_SHOP_SIGNS.length];
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 320;
  const ctx = canvas.getContext('2d')!;

  // Rich Backlit Acrylic Lightbox Backdrop
  const grad = ctx.createLinearGradient(0, 0, 1024, 320);
  grad.addColorStop(0, sign.bg);
  grad.addColorStop(0.55, sign.bg);
  grad.addColorStop(1, '#020617');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 1024, 320);

  // Subtle decorative left brand color pillar + diagonal shopfront sheen
  ctx.fillStyle = sign.fg;
  ctx.fillRect(22, 22, 18, 276);

  const sheen = ctx.createLinearGradient(0, 0, 1024, 0);
  sheen.addColorStop(0, 'rgba(255,255,255,0.16)');
  sheen.addColorStop(0.45, 'rgba(255,255,255,0.03)');
  sheen.addColorStop(1, 'rgba(0,0,0,0.22)');
  ctx.fillStyle = sheen;
  ctx.fillRect(0, 0, 1024, 320);

  // Crisp aluminum inner trim & corner fastener dots
  ctx.strokeStyle = sign.fg;
  ctx.lineWidth = 8;
  ctx.strokeRect(14, 14, 996, 292);
  ctx.strokeStyle = 'rgba(255,255,255,0.35)';
  ctx.lineWidth = 2;
  ctx.strokeRect(26, 26, 972, 268);

  // Top-right badge pill
  ctx.fillStyle = sign.fg;
  ctx.beginPath();
  ctx.roundRect(808, 34, 174, 36, 18);
  ctx.fill();
  ctx.fillStyle = '#090d16';
  ctx.font = '800 18px "Inter", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('DHAKA • VERIFIED', 895, 52);

  // Drop-shadowed Bangla Shopfront Header
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.65)';
  ctx.shadowBlur = 10;
  ctx.shadowOffsetY = 3;
  ctx.fillStyle = sign.fg;
  ctx.font = 'bold 68px "Noto Sans Bengali", "Hind Siliguri", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(sign.titleBn, 520, 128);
  ctx.restore();

  // Horizontal accent rule + English brand subtitle
  ctx.fillStyle = 'rgba(255,255,255,0.25)';
  ctx.fillRect(160, 194, 704, 2);

  ctx.fillStyle = '#f8fafc';
  ctx.font = '800 34px "Inter", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(sign.subEn.toUpperCase(), 520, 240);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  tex.needsUpdate = true;
  canvasCache.set(key, tex);
  return tex;
}

export function createHighwaySignTexture(
  titleBn: string,
  titleEn: string,
  subText: string
): THREE.CanvasTexture {
  const key = `hwy_hd_${titleEn}_${subText}`;
  if (canvasCache.has(key)) return canvasCache.get(key)!;

  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 360;
  const ctx = canvas.getContext('2d')!;

  const grad = ctx.createLinearGradient(0, 0, 0, 360);
  grad.addColorStop(0, '#065f46');
  grad.addColorStop(0.55, '#064e3b');
  grad.addColorStop(1, '#022c22');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 1024, 360);

  // Reflective double white highway sign border
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 12;
  ctx.beginPath();
  ctx.roundRect(14, 14, 996, 332, 20);
  ctx.stroke();

  ctx.strokeStyle = 'rgba(255,255,255,0.45)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.roundRect(28, 28, 968, 304, 14);
  ctx.stroke();

  // Route Badge on Left
  ctx.fillStyle = '#facc15';
  ctx.beginPath();
  ctx.roundRect(48, 46, 92, 46, 10);
  ctx.fill();
  ctx.fillStyle = '#0f172a';
  ctx.font = '900 24px "Inter", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('N1 • RHD', 94, 69);

  ctx.textAlign = 'center';
  ctx.fillStyle = '#fde047';
  ctx.font = 'bold 54px "Noto Sans Bengali", "Hind Siliguri", sans-serif';
  ctx.fillText(titleBn, 540, 118);

  ctx.fillStyle = '#ffffff';
  ctx.font = '800 36px "Inter", sans-serif';
  ctx.fillText(titleEn, 512, 208);

  ctx.fillStyle = 'rgba(255,255,255,0.22)';
  ctx.fillRect(100, 250, 824, 3);

  ctx.fillStyle = '#6ee7b7';
  ctx.font = 'bold 28px "Inter", sans-serif';
  ctx.fillText(subText, 512, 296);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
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
  ctx.fillStyle = style === 'modern_glass' ? '#0b1324' : baseColor;
  ctx.fillRect(0, 0, 512, 1024);

  const rows = 14;
  const cols = style === 'modern_glass' ? 6 : 5;
  const padX = style === 'modern_glass' ? 10 : 16;
  const padY = 18;
  const cellW = (512 - padX * (cols + 1)) / cols;
  const cellH = (1024 - padY * (rows + 1)) / rows;

  for (let r = 0; r < rows; r++) {
    const rowY = r * (cellH + padY);
    // Concrete floor slab spandrel ledge
    ctx.fillStyle = style === 'modern_glass' ? '#1e293b' : 'rgba(15,23,42,0.52)';
    ctx.fillRect(0, rowY, 512, 9);
    ctx.fillStyle = style === 'modern_glass' ? '#475569' : 'rgba(255,255,255,0.16)';
    ctx.fillRect(0, rowY + 9, 512, 3);

    for (let c = 0; c < cols; c++) {
      const wx = padX + c * (cellW + padX);
      const wy = padY + r * (cellH + padY);
      const isLit = (r * 7 + c * 5) % 4 === 0 || (r + c) % 3 === 0;

      if (style === 'modern_glass') {
        // Exterior dark mullion recess
        ctx.fillStyle = '#020617';
        ctx.fillRect(wx - 2, wy - 2, cellW + 4, cellH * 0.9 + 4);
        const grad = ctx.createLinearGradient(wx, wy, wx + cellW, wy + cellH);
        grad.addColorStop(0, isLit ? '#bae6fd' : '#0284c7');
        grad.addColorStop(0.55, isLit ? '#38bdf8' : '#0c4a6e');
        grad.addColorStop(1, isLit ? '#fef08a' : '#082f49');
        ctx.fillStyle = grad;
        ctx.fillRect(wx, wy, cellW, cellH * 0.88);
        // Subtle diagonal sky specular reflection & horizontal glass transom
        ctx.fillStyle = 'rgba(255,255,255,0.18)';
        ctx.fillRect(wx, wy, cellW, 4);
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(wx, wy + cellH * 0.44, cellW, 3);
      } else {
        // Dhaka apartment/commercial recessed window frame with curtain interior, balcony grille & AC unit
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(wx - 2, wy - 2, cellW + 4, cellH * 0.8 + 4);
        ctx.fillStyle = isLit ? '#fde68a' : '#1e293b';
        ctx.fillRect(wx, wy, cellW, cellH * 0.78);
        // Interior blind / room shadow & center mullion
        ctx.fillStyle = isLit ? 'rgba(180,83,9,0.22)' : 'rgba(148,163,184,0.18)';
        ctx.fillRect(wx, wy, cellW, cellH * 0.3);
        ctx.fillStyle = '#334155';
        ctx.fillRect(wx + cellW * 0.48, wy, 3, cellH * 0.78);

        // Verandah concrete sill & vertical iron grille stripes
        ctx.fillStyle = '#64748b';
        ctx.fillRect(wx - 3, wy + cellH * 0.76, cellW + 6, 5);
        ctx.fillStyle = '#334155';
        ctx.fillRect(wx, wy + cellH * 0.58, cellW, 3);

        // Split AC outdoor unit box on alternating windows
        if ((r + c) % 2 === 0) {
          ctx.fillStyle = '#e2e8f0';
          ctx.fillRect(wx + cellW - 24, wy + 5, 20, 14);
          ctx.fillStyle = '#334155';
          ctx.fillRect(wx + cellW - 22, wy + 8, 10, 8);
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

/**
 * Authentic BRTC Bus Side Decal Coachwork Banner with Bangla & English Typography
 */
export function createBrtcSideDecalTexture(seed = 1): THREE.CanvasTexture {
  const key = `brtc_side_decal_${seed}`;
  if (canvasCache.has(key)) return canvasCache.get(key)!;

  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;

  // Crimson / Emerald background gradient
  const grad = ctx.createLinearGradient(0, 0, 0, 128);
  grad.addColorStop(0, '#991b1b');
  grad.addColorStop(0.5, '#b91c1c');
  grad.addColorStop(1, '#7f1d1d');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 1024, 128);

  // Top & bottom golden yellow racing stripes
  ctx.fillStyle = '#f59e0b';
  ctx.fillRect(0, 0, 1024, 10);
  ctx.fillRect(0, 118, 1024, 10);

  // Emerald green accent band in center
  ctx.fillStyle = '#065f46';
  ctx.fillRect(0, 14, 1024, 32);

  // BRTC Crest / Emblem on left & right
  [-1, 1].forEach((dir) => {
    const cx = dir === -1 ? 85 : 939;
    ctx.fillStyle = '#f59e0b';
    ctx.beginPath();
    ctx.arc(cx, 64, 38, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.arc(cx, 64, 32, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#fef08a';
    ctx.font = 'bold 20px "Inter", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('BRTC', cx, 64);
  });

  // Main Bangla typography
  ctx.fillStyle = '#fef08a';
  ctx.font = 'bold 36px "Hind Siliguri", "Noto Sans Bengali", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('বিআরটিসি • ঢাকা মহানগরী পরিবহন', 512, 32);

  // Subtitle English typography & Route
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 22px "Inter", sans-serif';
  ctx.fillText('BANGLADESH ROAD TRANSPORT CORPORATION • AIR CONDITIONED', 512, 74);

  const routes = [
    'ফার্মগেট ⇄ শাহবাগ ⇄ প্রেস ক্লাব ⇄ পল্টন ⇄ মতিঝিল',
    'উত্তরা এয়ারপোর্ট ⇄ বনানী ⇄ মহাখালী ⇄ ফার্মগেট',
    'মিরপুর-১০ ⇄ কারওয়ান বাজার ⇄ শাহবাগ ⇄ গুলিস্তান',
    'গাবতলী ⇄ আসাদগেট ⇄ সায়েন্স ল্যাব ⇄ নিউ মার্কেট',
  ];
  const routeText = routes[Math.abs(seed) % routes.length];
  ctx.fillStyle = '#fde68a';
  ctx.font = 'bold 20px "Hind Siliguri", sans-serif';
  ctx.fillText(routeText, 512, 102);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  canvasCache.set(key, tex);
  return tex;
}

/**
 * Luminous Dhaka & Cyberpunk Neon Signs with Multi-layer Bloom & Glow Halo (1024x512 HD)
 */
export function createNeonSignTexture(
  textBn: string,
  textEn: string,
  neonColor = '#06b6d4',
  bgHex = '#090d16'
): THREE.CanvasTexture {
  const key = `neon_hd_${textBn}_${textEn}_${neonColor}`;
  if (canvasCache.has(key)) return canvasCache.get(key)!;

  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  // Deep dark anodized louver cabinet backing
  ctx.fillStyle = bgHex;
  ctx.fillRect(0, 0, 1024, 512);

  // Subtle horizontal brushed-metal / louver slats on cabinet background
  ctx.fillStyle = 'rgba(255, 255, 255, 0.025)';
  for (let y = 0; y < 512; y += 14) {
    ctx.fillRect(0, y, 1024, 3);
  }

  // Soft ambient wall wash from the neon tubes behind text
  const wallGlow = ctx.createRadialGradient(512, 240, 30, 512, 240, 480);
  wallGlow.addColorStop(0, `${neonColor}44`);
  wallGlow.addColorStop(0.55, `${neonColor}18`);
  wallGlow.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = wallGlow;
  ctx.fillRect(0, 0, 1024, 512);

  // Double rounded glass neon tube border frame with standoffs
  ctx.save();
  ctx.strokeStyle = neonColor;
  ctx.shadowColor = neonColor;
  ctx.shadowBlur = 42;
  ctx.lineWidth = 12;
  ctx.beginPath();
  ctx.roundRect(26, 26, 972, 460, 34);
  ctx.stroke();

  ctx.strokeStyle = '#ffffff';
  ctx.shadowBlur = 10;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.roundRect(26, 26, 972, 460, 34);
  ctx.stroke();

  // Corner insulated tube standoff mounts
  [
    [54, 54],
    [970, 54],
    [54, 458],
    [970, 458],
  ].forEach(([cx, cy]) => {
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.arc(cx, cy, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 2;
    ctx.stroke();
  });
  ctx.restore();

  // Multi-pass glowing Bangla neon tube typography
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = 'bold 78px "Hind Siliguri", "Noto Sans Bengali", sans-serif';

  ctx.shadowColor = neonColor;
  ctx.shadowBlur = 48;
  ctx.fillStyle = neonColor;
  ctx.fillText(textBn, 512, 198);

  ctx.shadowBlur = 20;
  ctx.fillText(textBn, 512, 198);

  ctx.shadowBlur = 6;
  ctx.fillStyle = '#ffffff';
  ctx.fillText(textBn, 512, 198);
  ctx.restore();

  // Glowing horizontal neon divider tube
  ctx.save();
  ctx.strokeStyle = neonColor;
  ctx.shadowColor = neonColor;
  ctx.shadowBlur = 20;
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(150, 286);
  ctx.lineTo(874, 286);
  ctx.stroke();
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.restore();

  // Multi-pass glowing English subtitle
  if (textEn) {
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '900 44px "Inter", sans-serif';

    ctx.shadowColor = neonColor;
    ctx.shadowBlur = 30;
    ctx.fillStyle = neonColor;
    ctx.fillText(textEn.toUpperCase(), 512, 366);

    ctx.shadowBlur = 5;
    ctx.fillStyle = '#f8fafc';
    ctx.fillText(textEn.toUpperCase(), 512, 366);
    ctx.restore();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  canvasCache.set(key, tex);
  return tex;
}

/**
 * Creates high-contrast illuminated night window grid textures for towers and apartments
 */
export function createEmissiveWindowGridTexture(seed = 1): THREE.CanvasTexture {
  const key = `emissive_window_grid_${seed}`;
  if (canvasCache.has(key)) return canvasCache.get(key)!;

  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  // Black dark facade background
  ctx.fillStyle = '#05070a';
  ctx.fillRect(0, 0, 256, 256);

  // Grid of illuminated interior windows
  const warmTints = ['#fde047', '#fef08a', '#fed7aa', '#67e8f9', '#bae6fd', '#fcd34d'];
  const cols = 8;
  const rows = 8;
  const padX = 6;
  const padY = 6;
  const w = (256 - padX * (cols + 1)) / cols;
  const h = (256 - padY * (rows + 1)) / rows;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const idx = r * cols + c + seed * 17;
      const isLit = (idx * 31) % 100 < 55; // 55% of windows illuminated
      if (isLit) {
        const tint = warmTints[(idx * 7) % warmTints.length];
        ctx.fillStyle = tint;
        ctx.fillRect(padX + c * (w + padX), padY + r * (h + padY), w, h);

        // Blinds / curtain silhouette on some windows
        if (idx % 3 === 0) {
          ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
          ctx.fillRect(padX + c * (w + padX), padY + r * (h + padY), w, h * 0.4);
        }
      }
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(2, 4);
  canvasCache.set(key, tex);
  return tex;
}



