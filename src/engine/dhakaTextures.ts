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

