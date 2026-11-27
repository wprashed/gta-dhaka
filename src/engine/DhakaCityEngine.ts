import * as THREE from 'three';
import { Sky } from 'three/examples/jsm/objects/Sky.js';
import {
  CNG_STATIONS,
  DISTRICTS,
  MARINE_DOCKS,
  METRO_STATIONS,
  POINTS_OF_INTEREST,
  SIDE_MISSIONS,
  SPEED_CAMERAS,
  STORY_MISSIONS,
  STREET_ATMS,
  VEHICLE_STATS,
  PLAYABLE_CHARACTERS,
} from '../data/dhakaWorldData';
import {
  DistrictId,
  NPCEntity,
  NPCRole,
  VehicleEntity,
  VehicleType,
  PlayableCharacterId,
} from '../types/game';
import {
  CharacterLimbs,
  createBurigangaLaunchMesh,
  createCharacterMesh,
  createSketchfabAssetPropMesh,
  createStreetStallMesh,
  createVehicleMesh,
  ensureNpcUmbrella,
  createFlyoverGantryTexture,
  createFobBillboardTexture,
  createStadiumScoreboardTexture,
  createMallSignboardTexture,
  createHeritageSignboardTexture,
  createHighwaySpeedSignTexture,
  loadCustomGLBFromUrl,
  setCharacterAnimationState,
  setDeathRagdollPose,
  setDrivingPose,
  tintCharacterOutfit,
  updateWeaponAttachment,
} from './dhakaModels';
import {
  createBanglaSignTexture,
  createBuildingFacadeTexture,
  createHighwaySignTexture,
  loadRealTexture,
  createWasaManholeTexture,
  createBoxJunctionTexture,
  createRoadArrowTexture,
  createFountainWaterDropTexture,
  createAcUnitTexture,
  createBlackWhiteCurbTexture,
  createEmissiveWindowGridTexture,
  createNeonSignTexture,
} from './dhakaTextures';
import { NearbyPrompt, useGameStore } from '../store/useGameStore';
import { dhakaAudio } from '../audio/dhakaAudioEngine';

interface BuildingCollider {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  minY?: number;
  maxY?: number;
  tag?: string;
}

interface CircleCollider {
  x: number;
  z: number;
  radius: number;
  tag?: string;
}

interface CashPickupDrop {
  mesh: THREE.Group;
  x: number;
  z: number;
  amount: number;
}

export class DhakaCityEngine {
  public static readonly NS_ROADS = [
    // Central National Spine: Airport Highway -> Farmgate -> Sadarghat & Buriganga
    { x: 0, width: 22, zMin: -1400, zMax: 800 },
    // Dhanmondi / Asad Gate / Agargaon Avenue
    { x: -170, width: 18, zMin: -1400, zMax: 800 },
    // Mirpur 10 Circle & Sher-e-Bangla Stadium Avenue
    { x: -380, width: 18, zMin: -1400, zMax: 800 },
    // Mirpur-12 / DOHS Avenue
    { x: -480, width: 16, zMin: -1400, zMax: 800 },
    // Gabtoli & Kalyanpur Bus Expressway
    { x: -580, width: 20, zMin: -1400, zMax: 800 },
    // Savar & Hemayetpur Outer Highway
    { x: -780, width: 20, zMin: -1400, zMax: 800 },
    // Western Outer Ring Road Link
    { x: -950, width: 22, zMin: -1400, zMax: 800 },
    // Gulshan Avenue & Motijheel Financial Spine
    { x: 220, width: 18, zMin: -1400, zMax: 800 },
    // Badda / Rampura / Bashundhara Link Avenue
    { x: 440, width: 18, zMin: -1400, zMax: 800 },
    // Purbachal 300 Feet Grand Expressway
    { x: 640, width: 24, zMin: -1400, zMax: 800 },
    // Purbachal Smart City East Boulevard
    { x: 840, width: 22, zMin: -1400, zMax: 800 },
    // Eastern Outer Ring Road Link
    { x: 950, width: 22, zMin: -1400, zMax: 800 },
    // Old Dhaka Chawkbazar Historical Street
    { x: -70, width: 14, zMin: 60, zMax: 580 },
  ];

  public static readonly EW_ROADS = [
    // Northern Outer Ring Road (Tongi - Ashulia - Diabari Expressway)
    { z: -1400, width: 22, xMin: -950, xMax: 950 },
    // Uttara Sector 18 & Diabari Metro Depot Expressway
    { z: -1100, width: 20, xMin: -950, xMax: 950 },
    // Tongi & Gazipur Industrial Boulevard
    { z: -850, width: 20, xMin: -950, xMax: 950 },
    // Uttara North & Airport Runway Road
    { z: -620, width: 20, xMin: -950, xMax: 950 },
    // Uttara South & Airport Terminal Boulevard
    { z: -460, width: 20, xMin: -950, xMax: 950 },
    // Banani / Airport Flyover & 300ft Entry
    { z: -315, width: 20, xMin: -950, xMax: 950 },
    // Mirpur 10 / Mohakhali Flyover / Gulshan-2
    { z: -175, width: 18, xMin: -950, xMax: 950 },
    // Manik Mia Avenue / Farmgate / Karwan Bazar
    { z: 0, width: 22, xMin: -950, xMax: 950 },
    // Shahbagh / TSC / Motijheel Commercial District
    { z: 175, width: 18, xMin: -950, xMax: 950 },
    // Lalbagh Fort / Chawkbazar / Sadarghat Riverfront
    { z: 285, width: 18, xMin: -950, xMax: 950 },
    // Mayor Hanif Expressway Corridor
    { z: 240, width: 18, xMin: -950, xMax: 950 },
    // Buriganga 2nd Bridge / Postogola / Keraniganj Highway
    { z: 460, width: 20, xMin: -950, xMax: 950 },
    // Jatrabari & Sayedabad Bus Expressway
    { z: 620, width: 20, xMin: -950, xMax: 950 },
    // Keraniganj South Link Highway
    { z: 760, width: 18, xMin: -950, xMax: 950 },
    // Southern Outer Ring Road (Postogola - Keraniganj - Babubazar Southern Bypass)
    { z: 800, width: 22, xMin: -950, xMax: 950 },
  ];

  private container: HTMLElement;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private animFrameId: number | null = null;
  private clock = new THREE.Clock();

  // Lighting, Sky Dome & Weather
  private ambientLight!: THREE.AmbientLight;
  private hemiLight!: THREE.HemisphereLight;
  private sunLight!: THREE.DirectionalLight;
  private headlightSpot!: THREE.SpotLight;
  private headlightTarget!: THREE.Object3D;
  private heliSearchLight!: THREE.SpotLight;
  private heliSearchTarget!: THREE.Object3D;
  private policeNearby = false;
  private sky!: Sky;
  private sunPosition = new THREE.Vector3();
  private starField!: THREE.Points;
  private waterNormalTex!: THREE.Texture;
  private rainSystem: THREE.Points | null = null;
  private hatirjheelLights: THREE.PointLight[] = [];
  private lastGraphicsQuality: 'high' | 'low' = 'high';

  // Jamuna Future Park Shopping Mall Interior & Interactables
  private jfpInteriorGroup: THREE.Group | null = null;
  private readonly jfpCenter = { x: 520, z: -385 };
  private jfpFerrisWheel: THREE.Group | null = null;
  private jfpFerrisGondolas: THREE.Group[] = [];
  private jfpDropCar: THREE.Mesh | null = null;
  private jfpElevatorCab: THREE.Group | null = null;
  private jfpChandelier: THREE.Group | null = null;
  private wasInsideJfp = false;
  private lastMissionEnemyStepId: string | null = null;
  private vehicleSpeedBoostMap = new Map<string, number>();
  private groundRoadMat: THREE.MeshStandardMaterial | null = null;
  private cngStationSpots: Array<{ x: number; z: number; isMarine?: boolean }> = [];
  private streetAtmSpots: Array<{ x: number; z: number; nameEn: string; nameBn: string }> = [];
  private streetAtmCooldown = 0;
  private speedCameraSpots: Array<{ x: number; y: number; z: number }> = [];
  private speedCameraCooldown = 0;
  private hornFlashTimer = 0;
  private patrolViolationCooldown = 0;
  private playerTrafficHitCooldown = 0;
  private fuelSputterCooldown = 0;
  private headlightsManual: boolean | null = null;
  private flashlightOn = false;
  private fareMarkerGroup!: THREE.Group;
  private policeFireCooldown = 0;
  private isSwimming = false;
  private lightningTimer = 6.0;
  private destructibleProps: Array<{
    mesh: THREE.Object3D;
    origX: number;
    origZ: number;
    x: number;
    z: number;
    vx: number;
    vz: number;
    vy: number;
    hit: boolean;
    life: number;
  }> = [];
  private streetLampStdMats: THREE.MeshStandardMaterial[] = [];
  private streetLampBasicMats: THREE.MeshBasicMaterial[] = [];
  private signalMaterials: {
    nsRed: THREE.MeshBasicMaterial;
    nsYellow: THREE.MeshBasicMaterial;
    nsGreen: THREE.MeshBasicMaterial;
    ewRed: THREE.MeshBasicMaterial;
    ewYellow: THREE.MeshBasicMaterial;
    ewGreen: THREE.MeshBasicMaterial;
  } | null = null;
  private jfpInteractables: Array<{
    id: string;
    x: number;
    y: number;
    z: number;
    floor: number;
    category: 'fashion' | 'food' | 'cinema' | 'tech' | 'arcade' | 'elevator' | 'atm' | 'books' | 'footwear';
    nameEn: string;
    nameBn: string;
    labelEn: string;
    labelBn: string;
    cost: number;
  }> = [];

  // World Collision Boxes, Cylinders, Pickups & Live Dhaka Metro Train
  private buildingColliders: BuildingCollider[] = [];
  private circleColliders: CircleCollider[] = [];
  private cashDrops: CashPickupDrop[] = [];
  private metroTrainGroup: THREE.Group | null = null;
  private metroTrainGroup2: THREE.Group | null = null;
  private metroTrainLine5East: THREE.Group | null = null;
  private metroTrainLine5West: THREE.Group | null = null;
  private playerMetroTrainL6: THREE.Group | null = null;
  private playerMetroTrainL5: THREE.Group | null = null;
  private metroPortalRings: THREE.Mesh[] = [];
  private metroEscalators: Array<{
    x1: number;
    z1: number;
    y1: number;
    x2: number;
    z2: number;
    y2: number;
    halfWidth: number;
    kioskX: number;
    kioskZ: number;
    kioskHalfX: number;
    kioskHalfZ: number;
    landMinX: number;
    landMaxX: number;
    landMinZ: number;
    landMaxZ: number;
    landY: number;
  }> = [];
  private metroStationInteriors: Array<{
    concourseMinX: number;
    concourseMaxX: number;
    concourseMinZ: number;
    concourseMaxZ: number;
    concourseY: number;
    platMinX: number;
    platMaxX: number;
    platMinZ: number;
    platMaxZ: number;
    platY: number;
    inX1: number;
    inZ1: number;
    inY1: number;
    inX2: number;
    inZ2: number;
    inY2: number;
    inHalfW: number;
  }> = [];
  private metroRide: {
    segments: Array<{
      line: 'L6' | 'L5';
      startX: number;
      startZ: number;
      endX: number;
      endZ: number;
      y: number;
      yaw: number;
      length: number;
    }>;
    segIdx: number;
    segDist: number;
    totalDist: number;
    coveredDist: number;
    speed: number;
    fromId: string;
    toId: string;
    fromNameEn: string;
    fromNameBn: string;
    toNameEn: string;
    toNameBn: string;
    toX: number;
    toZ: number;
    lastHudSync: number;
  } | null = null;
  private metroChimeTimer = 0;
  private playerStuckTimer = 0;
  private npcAnimFrame = 0;
  private skidDecals: Array<{ mesh: THREE.Mesh; life: number }> = [];
  private bloodDecals: Array<{
    mesh: THREE.Mesh;
    life: number;
    initialRadius: number;
    targetRadius: number;
    growthProgress: number;
  }> = [];
  private bloodParticles: Array<{
    mesh: THREE.Mesh;
    vx: number;
    vy: number;
    vz: number;
    life: number;
    maxLife: number;
  }> = [];
  private glassShards: Array<{
    mesh: THREE.Mesh;
    vx: number;
    vy: number;
    vz: number;
    life: number;
  }> = [];
  private radiatorSteam: Array<{
    mesh: THREE.Mesh;
    vy: number;
    life: number;
    maxLife: number;
  }> = [];
  private cameraTrauma = 0;
  private aviationBeacons: THREE.Mesh[] = [];
  private bikeWheeliePitch = 0;
  private fountainParticles: Array<{
    points: THREE.Points;
    velocities: Float32Array;
    origins: Float32Array;
    count: number;
    poolY: number;
  }> = [];

  // Player Character State
  private playerLimbs!: CharacterLimbs;
  private playerPos = new THREE.Vector3(6, 0, 16);
  private playerVelY = 0;
  private playerRotation = Math.PI;
  private playerStamina = 100;
  private isGrounded = true;
  private isCrouching = false;
  private attackAnimTimer = 0;
  private walkAnimPhase = 0;
  private footstepTimer = 0;
  private footstepRight = false;
  private lastEquippedOutfit = '';
  private lastEquippedTool = '';
  private lastSelectedCharacterId: PlayableCharacterId = 'arif';
  private buildingEmissiveMats: (THREE.MeshPhysicalMaterial | THREE.MeshStandardMaterial)[] = [];
  private treeCanopies: THREE.Object3D[] = [];

  // Camera & Performance State
  private cameraYaw = 0;
  private cameraPitch = 0.25;
  private currentCameraDist = 6.2;
  private cameraTargetPos = new THREE.Vector3();
  private cameraLookTarget = new THREE.Vector3(6, 1.75, 16);
  private isPointerDragging = false;
  private pointerDragDist = 0;
  private lastPointerX = 0;
  private lastPointerY = 0;
  private worldClockTimer = 0;
  private policeSpawnTimer = 0;
  private policeSirenTimer = 0;
  private tireSmokeTimer = 0;
  private streetChatterTimer = 0;

  // Cached Colors for Zero-GC Day/Night Transitions
  private static readonly SKY_DAY = new THREE.Color('#38bdf8');
  private static readonly SKY_NIGHT = new THREE.Color('#0a0f1a');
  private static readonly SKY_RAIN = new THREE.Color('#334155');
  private static readonly SKY_GOLDEN = new THREE.Color('#ea580c');

  // 3D Firearm Ballistics, Muzzle Flash & Explosion FX
  public isAiming = false;
  private meleeComboStep = 0;
  private meleeComboTimer = 0;
  private fireCooldown = 0;
  private bulletTracers: Array<{
    mesh: THREE.Mesh;
    vx: number;
    vy: number;
    vz: number;
    life: number;
    damage: number;
  }> = [];
  private shellCasings: Array<{
    mesh: THREE.Mesh;
    vx: number;
    vy: number;
    vz: number;
    rx: number;
    ry: number;
    rz: number;
    life: number;
    bounced: boolean;
  }> = [];
  private muzzleSmokePuffs: Array<{
    mesh: THREE.Mesh;
    vx: number;
    vy: number;
    vz: number;
    life: number;
    maxLife: number;
  }> = [];
  private bulletHoles: Array<{
    mesh: THREE.Mesh;
    life: number;
  }> = [];
  private hitSparks: Array<{
    mesh: THREE.Mesh;
    life: number;
  }> = [];
  private sharedSparkGeo = new THREE.DodecahedronGeometry(0.24, 0);
  private sharedSteamGeo = new THREE.DodecahedronGeometry(0.24, 0);
  private sharedBloodDropGeo = new THREE.SphereGeometry(0.045, 5, 5);
  private sharedBloodDropMat = new THREE.MeshBasicMaterial({ color: '#7f1d1d' });
  private sharedShardGeo = new THREE.TetrahedronGeometry(0.09, 0);
  private sharedSkidGeo = new THREE.BoxGeometry(0.32, 0.015, 1.35);
  private sharedBloodPoolGeo = (() => {
    const g = new THREE.CircleGeometry(1, 12);
    g.rotateX(-Math.PI / 2);
    return g;
  })();
  private readonly isWindows =
    typeof navigator !== 'undefined' &&
    /Win/i.test(navigator.platform || navigator.userAgent);
  private perfFrameEma = 16.6;
  private perfFrameCount = 0;
  private perfDegraded = false;
  private lastRafTime = 0;
  private envLightTimer = 0;
  private lastTelemetryKey = '';
  private jfpLights: THREE.PointLight[] = [];
  private distantPointLights: Array<{
    light: THREE.PointLight;
    x: number;
    z: number;
    maxDist: number;
  }> = [];
  private muzzleLight: THREE.PointLight | null = null;
  private muzzleLightTimer = 0;

  // Vehicles
  public vehicles: VehicleEntity[] = [];
  private vehicleMeshes = new Map<string, THREE.Group>();
  private activeVehicleId: string | null = null;

  // NPCs
  public npcs: NPCEntity[] = [];
  private npcLimbsMap = new Map<string, CharacterLimbs>();

  // Mission & Waypoint 3D Markers
  private missionMarkerGroup!: THREE.Group;
  private missionBeamMesh!: THREE.Mesh;
  private missionRingMesh!: THREE.Mesh;
  private launchBoats: THREE.Group[] = [];

  // Input State
  private keys = new Set<string>();
  private telemetryTimer = 0;

  constructor(container: HTMLElement) {
    this.container = container;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color('#38bdf8');
    this.scene.fog = new THREE.FogExp2('#38bdf8', 0.0011);

    this.camera = new THREE.PerspectiveCamera(
      60,
      container.clientWidth / Math.max(1, container.clientHeight),
      0.4,
      this.isWindows ? 1400 : 2000
    );

    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.isWindows,
      powerPreference: 'high-performance',
      stencil: false,
    });
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.setPixelRatio(
      Math.min(window.devicePixelRatio, this.isWindows ? 1.0 : 1.25)
    );
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.autoUpdate = false;
    this.renderer.shadowMap.needsUpdate = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.12;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    container.innerHTML = '';
    container.appendChild(this.renderer.domElement);

    this.setupLightsAndSkyDome();
    this.buildDhakaWorld();
    this.setupPlayer();
    this.spawnInitialVehicles();
    this.spawnInitialNPCs();
    this.setupMissionMarker();
    this.setupRainParticles();
    this.bindEvents();

    this.animate();
  }

  private setupLightsAndSkyDome() {
    this.ambientLight = new THREE.AmbientLight('#fffbeb', 0.72);
    this.scene.add(this.ambientLight);

    this.hemiLight = new THREE.HemisphereLight('#bae6fd', '#334155', 0.68);
    this.scene.add(this.hemiLight);

    this.sunLight = new THREE.DirectionalLight('#fef08a', 1.55);
    this.sunLight.position.set(120, 180, 90);
    this.sunLight.castShadow = true;
    this.sunLight.shadow.mapSize.width = this.isWindows ? 512 : 1024;
    this.sunLight.shadow.mapSize.height = this.isWindows ? 512 : 1024;
    this.sunLight.shadow.bias = -0.0003;
    this.sunLight.shadow.camera.near = 10;
    this.sunLight.shadow.camera.far = 380;
    const d = 85;
    this.sunLight.shadow.camera.left = -d;
    this.sunLight.shadow.camera.right = d;
    this.sunLight.shadow.camera.top = d;
    this.sunLight.shadow.camera.bottom = -d;
    this.scene.add(this.sunLight);
    this.scene.add(this.sunLight.target);

    // Dynamic Vehicle Headlight SpotLight for Night & Monsoon Driving
    this.headlightSpot = new THREE.SpotLight(
      '#fef9c3',
      0,
      58,
      Math.PI / 4.2,
      0.45,
      1.2
    );
    this.headlightTarget = new THREE.Object3D();
    this.scene.add(this.headlightTarget);
    this.headlightSpot.target = this.headlightTarget;
    this.scene.add(this.headlightSpot);

    // Overhead RAB / DMP Searchlight SpotLight for Wanted ★4-5
    this.heliSearchLight = new THREE.SpotLight('#e0f2fe', 0, 120, Math.PI / 7, 0.35, 1.0);
    this.heliSearchTarget = new THREE.Object3D();
    this.scene.add(this.heliSearchTarget);
    this.heliSearchLight.target = this.heliSearchTarget;
    this.scene.add(this.heliSearchLight);

    // Physically-Based Atmospheric Scattering Sky (Preetham / Rayleigh Model - No Fake Wallpaper Images)
    this.sky = new Sky();
    this.sky.scale.setScalar(5000);
    this.scene.add(this.sky);

    // Procedural Night Starfield (Twinkling stars for Dhaka night sky)
    const starCount = 1200;
    const starGeo = new THREE.BufferGeometry();
    const starPos = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      const u = Math.random();
      const v = Math.random();
      const theta = u * 2.0 * Math.PI;
      const phi = Math.acos(2.0 * v - 1.0);
      const r = 2400;
      starPos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      starPos[i * 3 + 1] = Math.abs(r * Math.cos(phi)) + 150;
      starPos[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
    }
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
    const starMat = new THREE.PointsMaterial({
      color: '#ffffff',
      size: 2.5,
      transparent: true,
      opacity: 0,
      fog: false,
    });
    this.starField = new THREE.Points(starGeo, starMat);
    this.scene.add(this.starField);

    // Smooth procedural PBR environment map for realistic car paint & glass reflections
    const envCanvas = document.createElement('canvas');
    envCanvas.width = 512;
    envCanvas.height = 256;
    const envCtx = envCanvas.getContext('2d')!;
    const envGrad = envCtx.createLinearGradient(0, 0, 0, 256);
    envGrad.addColorStop(0, '#0369a1');
    envGrad.addColorStop(0.48, '#38bdf8');
    envGrad.addColorStop(0.52, '#fde68a');
    envGrad.addColorStop(0.56, '#ea580c');
    envGrad.addColorStop(0.68, '#334155');
    envGrad.addColorStop(1, '#0f172a');
    envCtx.fillStyle = envGrad;
    envCtx.fillRect(0, 0, 512, 256);
    const envTex = new THREE.CanvasTexture(envCanvas);
    envTex.mapping = THREE.EquirectangularReflectionMapping;
    this.scene.environment = envTex;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.18;
  }

  private buildDhakaWorld() {
    // 1. Realistic Dhaka Urban Terrain Roadbed & Ground Foundation (No Endless Red Pavers)
    const groundAsphaltTex = loadRealTexture(
      '/textures/dhaka_asphalt.jpg',
      160,
      160,
      true
    );
    const groundGeo = new THREE.PlaneGeometry(5000, 5000);
    groundGeo.rotateX(-Math.PI / 2);
    const groundMat = new THREE.MeshStandardMaterial({
      map: groundAsphaltTex,
      color: '#334155',
      roughness: 0.88,
      metalness: 0.08,
    });
    this.groundRoadMat = groundMat;
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.receiveShadow = true;
    this.scene.add(ground);

    // Lush Green Dhaka Urban Parks (Ramna Park, Suhrawardy Udyan, Chandrima Udyan & Dhanmondi Park)
    const parkGrassMat = new THREE.MeshStandardMaterial({
      color: '#15803d',
      roughness: 0.9,
    });
    [
      { x: -115, z: -45, w: 68, d: 56 }, // Chandrima Udyan / Parliament Green Lawn
      { x: -75, z: 120, w: 54, d: 48 }, // Suhrawardy Udyan / Shahbagh Green
      { x: 115, z: 45, w: 58, d: 52 }, // Ramna Park Green Lawn
      { x: -185, z: 25, w: 36, d: 95 }, // Dhanmondi Lake Park Promenade
    ].forEach((pk) => {
      const lawn = new THREE.Mesh(
        new THREE.BoxGeometry(pk.w, 0.12, pk.d),
        parkGrassMat
      );
      lawn.position.set(pk.x, 0.06, pk.z);
      lawn.receiveShadow = true;
      this.scene.add(lawn);
    });

    // 2. Normal-Mapped Realistic Waterways (Buriganga River, Hatirjheel Lake, Dhanmondi Lake)
    this.waterNormalTex = loadRealTexture(
      '/textures/waternormals.jpg',
      1,
      1,
      false
    );
    this.waterNormalTex.wrapS = THREE.RepeatWrapping;
    this.waterNormalTex.wrapT = THREE.RepeatWrapping;

    const waterMat = new THREE.MeshStandardMaterial({
      color: '#082f3d',
      normalMap: this.waterNormalTex,
      normalScale: new THREE.Vector2(0.28, 0.28),
      roughness: 0.18,
      metalness: 0.32,
    });

    const buriganga = this.createIsotropicWaterMesh(1800, 150, waterMat, 22);
    buriganga.position.set(0, 0.06, 375);
    this.scene.add(buriganga);

    // Embankment Promenade Segments (leaving clean, wide openings for ALL North-South bridge corridors)
    const embankmentMat = new THREE.MeshStandardMaterial({
      map: loadRealTexture('/textures/brick_diffuse.jpg', 20, 1),
      color: '#94a3b8',
      roughness: 0.85,
    });
    const bridgeCuts = DhakaCityEngine.NS_ROADS
      .filter((r) => r.zMax >= 310 && r.zMin <= 290)
      .map((r) => ({
        min: r.x - r.width / 2 - 4.5,
        max: r.x + r.width / 2 + 4.5,
      }))
      .sort((a, b) => a.min - b.min);

    let curEmbX = -980;
    bridgeCuts.forEach((cut) => {
      if (cut.min > curEmbX + 3.0) {
        const segW = cut.min - curEmbX;
        const emb = new THREE.Mesh(
          new THREE.BoxGeometry(segW, 0.22, 14),
          embankmentMat
        );
        emb.position.set(curEmbX + segW / 2, 0.05, 296);
        emb.receiveShadow = true;
        this.scene.add(emb);

        // Retaining Seawall dropping down into the river channel
        const seawall = new THREE.Mesh(
          new THREE.BoxGeometry(segW, 1.6, 0.6),
          embankmentMat
        );
        seawall.position.set(curEmbX + segW / 2, -0.64, 303.3);
        this.scene.add(seawall);
      }
      curEmbX = Math.max(curEmbX, cut.max);
    });
    if (curEmbX < 980 - 3.0) {
      const segW = 980 - curEmbX;
      const emb = new THREE.Mesh(
        new THREE.BoxGeometry(segW, 0.22, 14),
        embankmentMat
      );
      emb.position.set(curEmbX + segW / 2, 0.05, 296);
      emb.receiveShadow = true;
      this.scene.add(emb);

      const seawall = new THREE.Mesh(
        new THREE.BoxGeometry(segW, 1.6, 0.6),
        embankmentMat
      );
      seawall.position.set(curEmbX + segW / 2, -0.64, 303.3);
      this.scene.add(seawall);
    }

    [-180, -65, 12, 95, 220].forEach((lx) => {
      const launch = createBurigangaLaunchMesh();
      launch.position.set(lx, 0.2, 318);
      launch.rotation.y = Math.PI / 2 + (lx === 12 ? -0.12 : 0.05);
      this.scene.add(launch);
      this.launchBoats.push(launch);
    });

    const hatirjheelWater = this.createIsotropicWaterMesh(130, 160, waterMat, 20);
    hatirjheelWater.position.set(220, 0.05, -5);
    this.scene.add(hatirjheelWater);

    const dhanmondiWater = this.createIsotropicWaterMesh(90, 130, waterMat, 20);
    dhanmondiWater.position.set(-225, 0.05, 25);
    this.scene.add(dhanmondiWater);

    // Gulshan-Baridhara Diplomatic Lake (cleanly framed in the Gulshan park block east of Avenue X=265 & south of Mohakhali Ramp Z=-175)
    const gulshanWater = this.createIsotropicWaterMesh(84, 120, waterMat, 20);
    gulshanWater.position.set(350, 0.05, -100);
    this.scene.add(gulshanWater);

    // Uttara Sector 7 Lake
    const uttaraWater = this.createIsotropicWaterMesh(85, 160, waterMat, 20);
    uttaraWater.position.set(-180, 0.05, -540);
    this.scene.add(uttaraWater);

    // 3. Realistic Dhaka Asphalt Road Network with Unobstructed Intersections & Proportional UVs
    const nsAsphaltTex = loadRealTexture(
      '/textures/dhaka_asphalt.jpg',
      3,
      26,
      true
    );
    const nsRoadMat = new THREE.MeshStandardMaterial({
      map: nsAsphaltTex,
      color: '#475569',
      roughness: 0.82,
      metalness: 0.08,
    });

    const ewAsphaltTex = loadRealTexture(
      '/textures/dhaka_asphalt.jpg',
      26,
      3,
      true
    );
    const ewRoadMat = new THREE.MeshStandardMaterial({
      map: ewAsphaltTex,
      color: '#475569',
      roughness: 0.82,
      metalness: 0.08,
    });

    const juncAsphaltTex = loadRealTexture(
      '/textures/dhaka_asphalt.jpg',
      3,
      3,
      true
    );
    const junctionMat = new THREE.MeshStandardMaterial({
      map: juncAsphaltTex,
      color: '#475569',
      roughness: 0.82,
      metalness: 0.08,
    });

    const yellowLineMat = new THREE.MeshBasicMaterial({ color: '#facc15' });
    const whiteLineMat = new THREE.MeshBasicMaterial({ color: '#f8fafc' });
    const bwCurbMat = new THREE.MeshStandardMaterial({
      map: createBlackWhiteCurbTexture(),
      roughness: 0.65,
    });
    const boxJunctionMat = new THREE.MeshBasicMaterial({
      map: createBoxJunctionTexture(),
      transparent: true,
      depthWrite: false,
    });
    const wasaManholeMat = new THREE.MeshStandardMaterial({
      map: createWasaManholeTexture(),
      roughness: 0.75,
      metalness: 0.65,
    });
    const arrowStraightMat = new THREE.MeshBasicMaterial({
      map: createRoadArrowTexture('straight'),
      transparent: true,
      depthWrite: false,
    });
    const zebraStripeMat = new THREE.MeshStandardMaterial({
      color: '#f8fafc',
      roughness: 0.55,
    });

    const nsRoads = DhakaCityEngine.NS_ROADS;
    const ewRoads = DhakaCityEngine.EW_ROADS;

    // Build seamless junction patches and anti-gridlock Box Junctions at intersections
    const majorBoxJunctions: Array<[number, number]> = [
      [0, 0],       // Farmgate / Manik Mia
      [0, -175],    // Karwan Bazar / Mohakhali
      [220, 175],   // Motijheel Shapla Chattar
      [640, -315],  // Purbachal 300ft Entry
      [0, 285],     // Sadarghat / Riverfront
      [-170, 0],    // Dhanmondi Asad Gate
    ];

    nsRoads.forEach((ns) => {
      ewRoads.forEach((ew) => {
        if (
          ns.x >= ew.xMin &&
          ns.x <= ew.xMax &&
          ew.z >= ns.zMin &&
          ew.z <= ns.zMax
        ) {
          const jMesh = new THREE.Mesh(
            new THREE.PlaneGeometry(ns.width, ew.width),
            junctionMat
          );
          jMesh.rotation.x = -Math.PI / 2;
          jMesh.position.set(ns.x, 0.08, ew.z);
          jMesh.receiveShadow = true;
          this.scene.add(jMesh);

          // Yellow diagonal Box Junction for anti-gridlock at major Dhaka intersections
          if (majorBoxJunctions.some(([jx, jz]) => Math.abs(ns.x - jx) < 4 && Math.abs(ew.z - jz) < 4)) {
            const boxW = Math.min(ns.width, ew.width) * 0.88;
            const boxMesh = new THREE.Mesh(new THREE.PlaneGeometry(boxW, boxW), boxJunctionMat);
            boxMesh.rotation.x = -Math.PI / 2;
            boxMesh.position.set(ns.x, 0.086, ew.z);
            this.scene.add(boxMesh);
          }
        }
      });
    });

    // Helper to spawn white Dhaka zebra crosswalk stripes
    const addZebraCrossing = (
      cx: number,
      cz: number,
      isNorthSouth: boolean,
      roadWidth: number
    ) => {
      const stripeCount = Math.floor(roadWidth / 1.5);
      const startOffset = -((stripeCount - 1) * 1.4) / 2;
      for (let i = 0; i < stripeCount; i++) {
        const offset = startOffset + i * 1.4;
        const stripe = new THREE.Mesh(
          new THREE.PlaneGeometry(
            isNorthSouth ? 0.6 : 2.8,
            isNorthSouth ? 2.8 : 0.6
          ),
          zebraStripeMat
        );
        stripe.rotation.x = -Math.PI / 2;
        stripe.position.set(
          isNorthSouth ? cx + offset : cx,
          0.088,
          isNorthSouth ? cz : cz + offset
        );
        stripe.receiveShadow = true;
        this.scene.add(stripe);
      }
    };

    // Helper to render high-realism North-South road segments with double yellow lines, dashed lane dividers & curbs
    const addNSRoadSegment = (curZ: number, endZ: number, roadX: number, roadWidth: number) => {
      const segLen = endZ - curZ;
      const centerZ = (curZ + endZ) / 2;
      const rMesh = new THREE.Mesh(new THREE.PlaneGeometry(roadWidth, segLen), nsRoadMat);
      rMesh.rotation.x = -Math.PI / 2;
      rMesh.position.set(roadX, 0.08, centerZ);
      rMesh.receiveShadow = true;
      this.scene.add(rMesh);

      const divLen = Math.max(1, segLen - 5);

      // 1. Double Solid Yellow Centerline
      // If roadX === 0 and segment spans through the SAARC Fountain Roundabout (-46 to -10),
      // split the yellow centerline into north and south sections so it doesn't cross the roundabout plaza!
      if (roadX === 0 && curZ < -10 && endZ > -46) {
        const subSegs: Array<[number, number]> = [];
        if (curZ < -46) subSegs.push([curZ, -46]);
        if (endZ > -10) subSegs.push([-10, endZ]);
        subSegs.forEach(([sz, ez]) => {
          const sLen = Math.max(1, ez - sz - 3);
          const scZ = (sz + ez) / 2;
          [-0.14, 0.14].forEach((ox) => {
            const divider = new THREE.Mesh(new THREE.PlaneGeometry(0.12, sLen), yellowLineMat);
            divider.rotation.x = -Math.PI / 2;
            divider.position.set(roadX + ox, 0.095, scZ);
            this.scene.add(divider);
          });
        });
      } else {
        [-0.14, 0.14].forEach((ox) => {
          const divider = new THREE.Mesh(new THREE.PlaneGeometry(0.12, divLen), yellowLineMat);
          divider.rotation.x = -Math.PI / 2;
          divider.position.set(roadX + ox, 0.095, centerZ);
          this.scene.add(divider);
        });
      }

      // 2. Multi-lane Dashed White Lane Dividers
      if (roadWidth >= 18) {
        const laneOffset = roadWidth * 0.25;
        [-laneOffset, laneOffset].forEach((lx) => {
          for (let dz = curZ + 4; dz <= endZ - 4; dz += 7.5) {
            const dashLen = Math.min(4.0, endZ - dz - 0.5);
            if (dashLen > 1.2) {
              const dash = new THREE.Mesh(new THREE.PlaneGeometry(0.18, dashLen), whiteLineMat);
              dash.rotation.x = -Math.PI / 2;
              dash.position.set(roadX + lx, 0.092, dz + dashLen / 2);
              this.scene.add(dash);
            }
          }
        });
      }

      // 3. Solid White Outer Shoulder Lines
      [-roadWidth / 2 + 1.2, roadWidth / 2 - 1.2].forEach((sx) => {
        const edgeLine = new THREE.Mesh(new THREE.PlaneGeometry(0.16, divLen), whiteLineMat);
        edgeLine.rotation.x = -Math.PI / 2;
        edgeLine.position.set(roadX + sx, 0.092, centerZ);
        this.scene.add(edgeLine);
      });

      // 4. Directional Lane Arrows ahead of intersection
      if (segLen > 24) {
        [-roadWidth * 0.25, roadWidth * 0.25].forEach((lx) => {
          const arrow = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 2.4), arrowStraightMat);
          arrow.rotation.x = -Math.PI / 2;
          arrow.position.set(roadX + lx, 0.093, endZ - 8);
          this.scene.add(arrow);
        });
      }

      // 5. Cast-Iron Dhaka WASA Manhole Covers
      for (let mz = curZ + 18; mz < endZ - 18; mz += 52) {
        const manhole = new THREE.Mesh(new THREE.PlaneGeometry(1.25, 1.25), wasaManholeMat);
        manhole.rotation.x = -Math.PI / 2;
        manhole.position.set(roadX + (mz % 2 === 0 ? 3.5 : -3.5), 0.088, mz);
        this.scene.add(manhole);
      }

      // 6. Black-and-White Alternating Striped Curbs
      [-roadWidth / 2 - 0.55, roadWidth / 2 + 0.55].forEach((ox) => {
        this.scene.add(
          this.sharedBox(
            1.1,
            0.22,
            segLen,
            bwCurbMat,
            roadX + ox,
            0.11,
            centerZ
          )
        );
      });
    };

    // Helper to render high-realism East-West road segments
    const addEWRoadSegment = (curX: number, endX: number, roadZ: number, roadWidth: number) => {
      const segLen = endX - curX;
      const centerX = (curX + endX) / 2;
      const rMesh = new THREE.Mesh(new THREE.PlaneGeometry(segLen, roadWidth), ewRoadMat);
      rMesh.rotation.x = -Math.PI / 2;
      rMesh.position.set(centerX, 0.08, roadZ);
      rMesh.receiveShadow = true;
      this.scene.add(rMesh);

      // 1. Double Solid Yellow Centerline
      const divLen = Math.max(1, segLen - 5);
      [-0.14, 0.14].forEach((oz) => {
        const divider = new THREE.Mesh(new THREE.PlaneGeometry(divLen, 0.12), yellowLineMat);
        divider.rotation.x = -Math.PI / 2;
        divider.position.set(centerX, 0.095, roadZ + oz);
        this.scene.add(divider);
      });

      // 2. Multi-lane Dashed White Lane Dividers
      if (roadWidth >= 18) {
        const laneOffset = roadWidth * 0.25;
        [-laneOffset, laneOffset].forEach((lz) => {
          for (let dx = curX + 4; dx <= endX - 4; dx += 7.5) {
            const dashLen = Math.min(4.0, endX - dx - 0.5);
            if (dashLen > 1.2) {
              const dash = new THREE.Mesh(new THREE.PlaneGeometry(dashLen, 0.18), whiteLineMat);
              dash.rotation.x = -Math.PI / 2;
              dash.position.set(dx + dashLen / 2, 0.092, roadZ + lz);
              this.scene.add(dash);
            }
          }
        });
      }

      // 3. Solid White Outer Shoulder Lines
      [-roadWidth / 2 + 1.2, roadWidth / 2 - 1.2].forEach((sz) => {
        const edgeLine = new THREE.Mesh(new THREE.PlaneGeometry(divLen, 0.16), whiteLineMat);
        edgeLine.rotation.x = -Math.PI / 2;
        edgeLine.position.set(centerX, 0.092, roadZ + sz);
        this.scene.add(edgeLine);
      });

      // 4. Directional Lane Arrows ahead of intersection
      if (segLen > 24) {
        [-roadWidth * 0.25, roadWidth * 0.25].forEach((lz) => {
          const arrow = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 1.2), arrowStraightMat);
          arrow.rotation.x = -Math.PI / 2;
          arrow.rotation.z = Math.PI / 2;
          arrow.position.set(endX - 8, 0.093, roadZ + lz);
          this.scene.add(arrow);
        });
      }

      // 5. Cast-Iron Dhaka WASA Manhole Covers
      for (let mx = curX + 18; mx < endX - 18; mx += 52) {
        const manhole = new THREE.Mesh(new THREE.PlaneGeometry(1.25, 1.25), wasaManholeMat);
        manhole.rotation.x = -Math.PI / 2;
        manhole.position.set(mx, 0.088, roadZ + (mx % 2 === 0 ? 3.5 : -3.5));
        this.scene.add(manhole);
      }

      // 6. Black-and-White Alternating Striped Curbs
      [-roadWidth / 2 - 0.55, roadWidth / 2 + 0.55].forEach((oz) => {
        this.scene.add(
          this.sharedBox(
            segLen,
            0.22,
            1.1,
            bwCurbMat,
            centerX,
            0.11,
            roadZ + oz
          )
        );
      });
    };

    // Build North-South road segments with clean intersection cutoffs
    nsRoads.forEach((ns) => {
      const cutoffs = ewRoads
        .filter(
          (ew) =>
            ns.x >= ew.xMin &&
            ns.x <= ew.xMax &&
            ew.z >= ns.zMin &&
            ew.z <= ns.zMax
        )
        .map((ew) => ({
          zMin: ew.z - ew.width / 2 - 0.2,
          zMax: ew.z + ew.width / 2 + 0.2,
          cz: ew.z,
          w: ew.width,
        }))
        .sort((a, b) => a.zMin - b.zMin);

      let curZ = ns.zMin;
      cutoffs.forEach((c) => {
        if (c.zMin > curZ + 3) {
          addNSRoadSegment(curZ, c.zMin, ns.x, ns.width);
          // Zebra crosswalk entering cross street
          addZebraCrossing(ns.x, c.zMin - 1.8, true, ns.width);
        }
        curZ = c.zMax;
        // Zebra crosswalk leaving cross street (only if the road continues forward)
        if (ns.zMax > curZ + 4) {
          addZebraCrossing(ns.x, curZ + 1.8, true, ns.width);
        }
      });

      if (ns.zMax > curZ + 3) {
        addNSRoadSegment(curZ, ns.zMax, ns.x, ns.width);
      }
    });

    // Build East-West road segments with clean intersection cutoffs
    ewRoads.forEach((ew) => {
      const cutoffs = nsRoads
        .filter(
          (ns) =>
            ns.x >= ew.xMin &&
            ns.x <= ew.xMax &&
            ew.z >= ns.zMin &&
            ew.z <= ns.zMax
        )
        .map((ns) => ({
          xMin: ns.x - ns.width / 2 - 0.2,
          xMax: ns.x + ns.width / 2 + 0.2,
          cx: ns.x,
          w: ns.width,
        }))
        .sort((a, b) => a.xMin - b.xMin);

      let curX = ew.xMin;
      cutoffs.forEach((c) => {
        if (c.xMin > curX + 3) {
          addEWRoadSegment(curX, c.xMin, ew.z, ew.width);
          // Zebra crosswalk entering cross street
          addZebraCrossing(c.xMin - 1.8, ew.z, false, ew.width);
        }
        curX = c.xMax;
        // Zebra crosswalk leaving cross street (only if the road continues forward)
        if (ew.xMax > curX + 4) {
          addZebraCrossing(curX + 1.8, ew.z, false, ew.width);
        }
      });

      if (ew.xMax > curX + 3) {
        addEWRoadSegment(curX, ew.xMax, ew.z, ew.width);
      }
    });

    // 4. Landmarks, Sketchfab Billboards & Buildings
    this.buildBurigangaRiverBridges();
    this.buildHatirjheelBridge();
    this.buildMotijheelShaplaMonument();
    this.buildMetroViaductPillars();
    this.buildDistrictHighwaySigns();
    this.buildMosqueLandmarks();
    this.buildPointsOfInterestMeshes();
    this.buildCityDistrictBuildings();
    this.buildSketchfabGtaLandmarks();
  }

  private buildSketchfabGtaLandmarks() {
    // 1. Giant Illuminated Dhaka Unipole Steel Billboards (Framed Cabinet + Catwalk + Overhead Floodlights)
    const billboardLocations = [
      { x: 24, z: -22, signIdx: 0, rot: -0.4 },
      { x: -25, z: 24, signIdx: 3, rot: 0.5 },
      { x: 202, z: -158, signIdx: 5, rot: -0.3 },
      { x: 202, z: 158, signIdx: 7, rot: 0.3 },
    ];
    const unipoleSteelMat = new THREE.MeshStandardMaterial({ color: '#1e293b', metalness: 0.78, roughness: 0.32 });
    const unipolePlinthMat = new THREE.MeshStandardMaterial({ color: '#64748b', roughness: 0.85 });
    const floodBulbMat = new THREE.MeshBasicMaterial({ color: '#fef9c3' });

    billboardLocations.forEach((b) => {
      this.circleColliders.push({
        x: b.x,
        z: b.z,
        radius: 0.65,
        tag: 'billboard_pole',
      });
      const poleGroup = new THREE.Group();
      poleGroup.position.set(b.x, 0, b.z);
      poleGroup.rotation.y = b.rot;

      // Concrete pedestal + steel flange + tapered tubular mast
      const plinth = new THREE.Mesh(this.cylCache(0.62, 0.72, 0.9, 10), unipolePlinthMat);
      plinth.position.y = 0.45;
      const pole = new THREE.Mesh(this.cylCache(0.30, 0.40, 9.2, 12), unipoleSteelMat);
      pole.position.y = 4.6;
      pole.castShadow = true;
      poleGroup.add(plinth, pole);

      // Diagonal V-brace yoke + Maintenance Catwalk Platform
      [-2.2, 2.2].forEach((vx) => {
        const vArm = new THREE.Mesh(this.boxCache(0.24, 2.4, 0.24), unipoleSteelMat);
        vArm.position.set(vx * 0.5, 7.6, 0);
        vArm.rotation.z = vx > 0 ? -0.55 : 0.55;
        poleGroup.add(vArm);
      });
      const catwalk = new THREE.Mesh(this.boxCache(10.2, 0.14, 1.35), unipoleSteelMat);
      catwalk.position.set(0, 7.05, 0);
      poleGroup.add(catwalk);

      // Dark anodized steel outer signboard cabinet
      const cabinet = new THREE.Mesh(this.boxCache(10.0, 4.7, 0.44), unipoleSteelMat);
      cabinet.position.y = 9.5;
      cabinet.castShadow = true;
      poleGroup.add(cabinet);

      const boardMat = new THREE.MeshBasicMaterial({ map: createBanglaSignTexture(b.signIdx) });
      const frontFace = new THREE.Mesh(new THREE.PlaneGeometry(9.6, 4.35), boardMat);
      frontFace.position.set(0, 9.5, 0.23);
      const backFace = new THREE.Mesh(new THREE.PlaneGeometry(9.6, 4.35), boardMat);
      backFace.position.set(0, 9.5, -0.23);
      backFace.rotation.y = Math.PI;
      poleGroup.add(frontFace, backFace);

      // 3 Gooseneck LED Floodlight Hoods along top edge (both sides)
      [-3.2, 0, 3.2].forEach((lx) => {
        [1, -1].forEach((side) => {
          const arm = new THREE.Mesh(this.boxCache(0.08, 0.08, 1.25), unipoleSteelMat);
          arm.position.set(lx, 12.05, side * 0.65);
          const hood = new THREE.Mesh(this.boxCache(0.42, 0.14, 0.28), unipoleSteelMat);
          hood.position.set(lx, 11.98, side * 1.25);
          hood.rotation.x = side * 0.45;
          const bulb = new THREE.Mesh(this.boxCache(0.32, 0.05, 0.18), floodBulbMat);
          bulb.position.set(lx, 11.92, side * 1.25);
          poleGroup.add(arm, hood, bulb);
        });
      });

      this.scene.add(poleGroup);
    });

    // 2. Iconic Karwan Bazar SAARC Fountain (সার্ক ফোয়ারা - কারওয়ান বাজার মোড়)
    // Masterpiece modernist stainless steel sculpture designed by Nitun Kundu in 1993
    // Set inside an authentic, wide Dhaka Roundabout Traffic Circle (সার্ক ফোয়ারা চত্বর)
    this.circleColliders.push({
      x: 0,
      z: -28,
      radius: 5.6,
      tag: 'saarc_fountain',
    });

    // 2.1 Wide Asphalt Roundabout Driving Ring (Radius 22.5m, Width 17m road ring)
    const roundaboutAsphaltMat = new THREE.MeshStandardMaterial({
      map: loadRealTexture('/textures/asphalt_diffuse.jpg', 6, 6),
      roughness: 0.88,
      metalness: 0.12,
    });
    const roundaboutRing = new THREE.Mesh(
      new THREE.CircleGeometry(22.5, 48),
      roundaboutAsphaltMat
    );
    roundaboutRing.rotation.x = -Math.PI / 2;
    roundaboutRing.position.set(0, 0.082, -28);
    roundaboutRing.receiveShadow = true;
    this.scene.add(roundaboutRing);

    // North & South asphalt approach transition tapers (widens road from 22m to 44m)
    [-46, -10].forEach((tz) => {
      const taper = new THREE.Mesh(
        new THREE.PlaneGeometry(44, 20),
        roundaboutAsphaltMat
      );
      taper.rotation.x = -Math.PI / 2;
      taper.position.set(0, 0.081, tz);
      taper.receiveShadow = true;
      this.scene.add(taper);
    });

    // Raised Roundabout Island Curb (Radius 5.6m, Height 0.25m) with black & white hazard blocks
    const islandCurbMat = new THREE.MeshStandardMaterial({
      color: '#0f172a',
      roughness: 0.75,
    });
    const islandCurb = new THREE.Mesh(
      new THREE.CylinderGeometry(5.6, 5.8, 0.26, 40),
      islandCurbMat
    );
    islandCurb.position.set(0, 0.13, -28);
    islandCurb.receiveShadow = true;
    this.scene.add(islandCurb);

    // Landscaped decorative grass verge on the roundabout island
    const islandGrass = new THREE.Mesh(
      new THREE.CircleGeometry(5.4, 40),
      new THREE.MeshStandardMaterial({ color: '#166534', roughness: 0.9 })
    );
    islandGrass.rotation.x = -Math.PI / 2;
    islandGrass.position.set(0, 0.265, -28);
    this.scene.add(islandGrass);

    // Curving yellow hazard line around the roundabout island
    const yellowRing = new THREE.Mesh(
      new THREE.RingGeometry(6.4, 6.64, 48),
      new THREE.MeshBasicMaterial({ color: '#facc15' })
    );
    yellowRing.rotation.x = -Math.PI / 2;
    yellowRing.position.set(0, 0.086, -28);
    this.scene.add(yellowRing);

    const saarcFountain = new THREE.Group();
    saarcFountain.position.set(0, 0.25, -28);

    // Multi-tiered circular granite retaining basin with black & white hazard curbs
    const outerCurb = new THREE.Mesh(
      new THREE.CylinderGeometry(4.7, 4.9, 0.45, 32),
      new THREE.MeshStandardMaterial({ color: '#1e293b', roughness: 0.5, metalness: 0.2 })
    );
    outerCurb.position.y = 0.225;
    saarcFountain.add(outerCurb);

    const innerBasinWall = new THREE.Mesh(
      new THREE.CylinderGeometry(4.2, 4.4, 0.75, 32),
      new THREE.MeshStandardMaterial({ color: '#0f172a', roughness: 0.4 })
    );
    innerBasinWall.position.y = 0.45;
    saarcFountain.add(innerBasinWall);

    // Tiered deep-blue rippling water surface with clearcoat reflections
    const poolWater = new THREE.Mesh(
      new THREE.CylinderGeometry(4.15, 4.15, 0.76, 32),
      new THREE.MeshPhysicalMaterial({
        color: '#0284c7',
        roughness: 0.1,
        metalness: 0.2,
        clearcoat: 0.95,
        clearcoatRoughness: 0.1,
        transparent: true,
        opacity: 0.88,
      })
    );
    poolWater.position.y = 0.48;
    saarcFountain.add(poolWater);

    // Center stepped granite plinth supporting Nitun Kundu's 7-tier sculpture
    const centerPlinth = new THREE.Mesh(
      new THREE.CylinderGeometry(1.6, 1.8, 0.65, 24),
      new THREE.MeshStandardMaterial({ color: '#334155', roughness: 0.35, metalness: 0.5 })
    );
    centerPlinth.position.y = 0.75;
    saarcFountain.add(centerPlinth);

    // Authentic Nitun Kundu 7-Tier Overlapping Stainless Steel Geometric Prisms
    const stainlessSteelMat = new THREE.MeshStandardMaterial({
      color: '#f1f5f9',
      metalness: 0.96,
      roughness: 0.08,
    });

    // 7 tiers of ascending geometric blades representing SAARC member nations
    const tierHeights = [1.2, 2.0, 2.8, 3.6, 4.4, 5.2, 6.0];
    const tierRadii = [1.35, 1.15, 0.98, 0.82, 0.65, 0.48, 0.32];
    tierHeights.forEach((h, tierIdx) => {
      const blades = 7;
      const r = tierRadii[tierIdx];
      for (let b = 0; b < blades; b++) {
        const bladeAngle = (b * Math.PI * 2) / blades + tierIdx * 0.42;
        const blade = new THREE.Mesh(
          new THREE.BoxGeometry(0.08, 1.1, 0.45),
          stainlessSteelMat
        );
        blade.position.set(
          Math.cos(bladeAngle) * r,
          h + 0.6,
          Math.sin(bladeAngle) * r
        );
        blade.rotation.y = bladeAngle + 0.35;
        blade.rotation.z = -0.18;
        saarcFountain.add(blade);
      }
    });

    // Center stainless steel crown spire
    const centerCrown = new THREE.Mesh(
      new THREE.CylinderGeometry(0.08, 0.28, 6.4, 16),
      stainlessSteelMat
    );
    centerCrown.position.y = 3.8;
    saarcFountain.add(centerCrown);

    // Perimeter brass water nozzles pointing toward center (16 nozzles)
    const nozzleMat = new THREE.MeshStandardMaterial({ color: '#eab308', metalness: 0.85, roughness: 0.3 });
    for (let i = 0; i < 16; i++) {
      const nAngle = (i * Math.PI * 2) / 16;
      const nozzle = new THREE.Mesh(
        new THREE.CylinderGeometry(0.05, 0.07, 0.32, 8),
        nozzleMat
      );
      nozzle.position.set(Math.cos(nAngle) * 3.7, 0.52, Math.sin(nAngle) * 3.7);
      nozzle.rotation.z = Math.cos(nAngle) * 0.5;
      nozzle.rotation.x = -Math.sin(nAngle) * 0.5;
      saarcFountain.add(nozzle);
    }

    // Underwater turquoise illumination
    const fountainLight = new THREE.PointLight('#38bdf8', 2.8, 25);
    fountainLight.position.set(0, 1.2, 0);
    saarcFountain.add(fountainLight);
    this.distantPointLights.push({ light: fountainLight, x: 0, z: -28, maxDist: 65 });

    this.scene.add(saarcFountain);
    this.createFountainSpraySystem(0, 0.5, -28, 16, 3.7, 4.8);

    // 3. Baitul Mukarram National Mosque (বায়তুল মোকাররম জাতীয় মসজিদ) in Paltan/Motijheel West
    // (Elevated MRT Line-6 Stations are built complete with portal piers, concourse & escalators in buildMetroViaductPillars)
    const baitulMukarram = new THREE.Group();
    baitulMukarram.position.set(78, 0, 82);
    const whiteMarble = new THREE.MeshStandardMaterial({
      color: '#f8fafc',
      roughness: 0.35,
    });
    const podium = new THREE.Mesh(
      new THREE.BoxGeometry(28, 3.2, 28),
      new THREE.MeshStandardMaterial({ color: '#e2e8f0', roughness: 0.6 })
    );
    podium.position.y = 1.6;
    baitulMukarram.add(podium);

    // Iconic Cube-shaped (Kaaba-inspired) main prayer hall with vertical recessed arches
    const cubeHall = new THREE.Mesh(
      new THREE.BoxGeometry(20, 19, 20),
      whiteMarble
    );
    cubeHall.position.y = 12.7;
    cubeHall.castShadow = true;
    baitulMukarram.add(cubeHall);

    const blackTrim = new THREE.Mesh(
      new THREE.BoxGeometry(20.3, 1.6, 20.3),
      new THREE.MeshStandardMaterial({ color: '#0f172a' })
    );
    blackTrim.position.y = 20.2;
    baitulMukarram.add(blackTrim);
    this.scene.add(baitulMukarram);

    // Spawn an initial collectible Cash Stack Drop near Karwan Bazar alley
    this.spawnCashDrop(22, 8, 2500);
  }

  public spawnCashDrop(x: number, z: number, amount = 2500) {
    const mesh = createSketchfabAssetPropMesh(
      'money_stacks',
      '/sketchfab/gta_model_5.jpg'
    );
    mesh.position.set(x, 0, z);

    const ring = new THREE.Mesh(
      new THREE.RingGeometry(1.3, 1.7, 20),
      new THREE.MeshBasicMaterial({ color: '#4ade80', side: THREE.DoubleSide })
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.12;
    mesh.add(ring);

    this.scene.add(mesh);
    this.cashDrops.push({ mesh, x, z, amount });
  }

  private spawnSkidMark(x: number, z: number, rotation: number, y = 0) {
    if (this.skidDecals.length > 35) {
      const old = this.skidDecals.shift();
      if (old) {
        this.scene.remove(old.mesh);
        (old.mesh.material as THREE.Material).dispose();
      }
    }
    const skidMat = new THREE.MeshBasicMaterial({
      color: '#0f172a',
      transparent: true,
      opacity: 0.55,
    });
    const mesh = new THREE.Mesh(this.sharedSkidGeo, skidMat);
    mesh.position.set(x, y + 0.025, z);
    mesh.rotation.y = rotation;
    this.scene.add(mesh);
    this.skidDecals.push({ mesh, life: 8.5 });
  }

  private spawnBloodDecal(x: number, z: number, targetRadius = 1.35, y = 0) {
    if (this.bloodDecals.length > 32) {
      const old = this.bloodDecals.shift();
      if (old) {
        this.scene.remove(old.mesh);
        (old.mesh.material as THREE.Material).dispose();
      }
    }
    const finalR = targetRadius + Math.random() * 0.45;
    const mat = new THREE.MeshBasicMaterial({
      color: '#3b0505',
      transparent: true,
      opacity: 0.88,
      depthWrite: false,
    });
    const mesh = new THREE.Mesh(this.sharedBloodPoolGeo, mat);
    mesh.position.set(x, y + 0.086, z);
    // Start small and expand organically into a dark blood pool
    mesh.scale.set(0.18 * finalR, 0.18 * finalR, 0.18 * finalR);
    this.scene.add(mesh);
    this.bloodDecals.push({
      mesh,
      life: 75.0,
      initialRadius: 0.2,
      targetRadius: finalR,
      growthProgress: 0.0,
    });
  }

  public spawnDirectionalBloodSpray(
    x: number,
    y: number,
    z: number,
    dirX: number,
    dirZ: number,
    count = 24
  ) {
    dhakaAudio.playSfx('arterial_spray');

    for (let i = 0; i < count; i++) {
      if (this.bloodParticles.length > 70) {
        const old = this.bloodParticles.shift();
        if (old) this.scene.remove(old.mesh);
      }
      const mesh = new THREE.Mesh(this.sharedBloodDropGeo, this.sharedBloodDropMat);
      mesh.position.set(
        x + (Math.random() - 0.5) * 0.25,
        y + (Math.random() - 0.5) * 0.25,
        z + (Math.random() - 0.5) * 0.25
      );
      this.scene.add(mesh);

      // Ballistic velocity with upward arc and spray dispersion
      const spread = (Math.random() - 0.5) * 2.2;
      const speed = 5.2 + Math.random() * 6.5;
      const len = Math.max(0.001, Math.hypot(dirX, dirZ));
      const ndx = dirX / len;
      const ndz = dirZ / len;
      const perpX = -ndz;
      const perpZ = ndx;

      const vx = ndx * speed + perpX * spread;
      const vz = ndz * speed + perpZ * spread;
      const vy = 2.2 + Math.random() * 4.2;

      this.bloodParticles.push({
        mesh,
        vx,
        vy,
        vz,
        life: 0,
        maxLife: 0.75 + Math.random() * 0.45,
      });
    }
  }

  private spawnGlassShatter(x: number, y: number, z: number, count = 22) {
    const actualCount = Math.min(count, 12);
    for (let i = 0; i < actualCount; i++) {
      if (this.glassShards.length > 26) {
        const old = this.glassShards.shift();
        if (old) {
          this.scene.remove(old.mesh);
          (old.mesh.material as THREE.Material).dispose();
        }
      }
      const shardMat = new THREE.MeshBasicMaterial({
        color: '#e0f2fe',
        transparent: true,
        opacity: 0.88,
      });
      const mesh = new THREE.Mesh(this.sharedShardGeo, shardMat);
      mesh.position.set(
        x + (Math.random() - 0.5) * 0.8,
        y + (Math.random() - 0.5) * 0.5,
        z + (Math.random() - 0.5) * 0.8
      );
      this.scene.add(mesh);
      this.glassShards.push({
        mesh,
        vx: (Math.random() - 0.5) * 9,
        vy: 2.5 + Math.random() * 4.5,
        vz: (Math.random() - 0.5) * 9,
        life: 2.2 + Math.random() * 0.8,
      });
    }
  }

  private spawnRadiatorDamage(x: number, y: number, z: number) {
    for (let i = 0; i < 2; i++) {
      if (this.radiatorSteam.length > 28) {
        const old = this.radiatorSteam.shift();
        if (old) {
          this.scene.remove(old.mesh);
          (old.mesh.material as THREE.Material).dispose();
        }
      }
      const steamMat = new THREE.MeshBasicMaterial({
        color: '#cbd5e1',
        transparent: true,
        opacity: 0.65,
      });
      const mesh = new THREE.Mesh(this.sharedSteamGeo, steamMat);
      mesh.position.set(
        x + (Math.random() - 0.5) * 0.6,
        y + (Math.random() - 0.5) * 0.3,
        z + (Math.random() - 0.5) * 0.6
      );
      this.scene.add(mesh);
      this.radiatorSteam.push({
        mesh,
        vy: 1.6 + Math.random() * 1.4,
        life: 1.4,
        maxLife: 1.4,
      });
    }
  }

  private policeArrestTimer = 0;

  public isPositionInWater(x: number, z: number): boolean {
    // Buriganga River channel (open water starts south of Sadarghat promenade curb z=303.5 and ends north of Keraniganj bank z=447)
    if (x >= -900 && x <= 900 && z > 303.5 && z < 447) {
      // Bridges spanning Buriganga across all major metropolitan arteries:
      const onBridge = DhakaCityEngine.NS_ROADS.some(
        (r) => r.zMax >= 450 && r.zMin <= 300 && Math.abs(x - r.x) <= r.width / 2 + 3.5
      );
      if (onBridge) return false;
      // Walkable Sadarghat launch terminal pontoon & gangways
      const onSadarghatJetty = x >= -40 && x <= 40 && z <= 335;
      if (onSadarghatJetty) return false;
      return true;
    }
    // Balu River waterway in Purbachal (38 x 700 centered at X=590, Z=-250), excluding crossing bridges/roads
    if (x >= 571 && x <= 609 && z >= -600 && z <= 100) {
      const onBaluCrossing =
        Math.abs(z - (-460)) <= 10.5 ||
        Math.abs(z - (-315)) <= 11.5 || // Purbachal 8-Lane Cable-Stayed Bridge
        Math.abs(z - (-175)) <= 9.5 ||
        Math.abs(z) <= 11.5;
      if (!onBaluCrossing) return true;
    }
    // Dhanmondi Lake (90 x 130 centered at X=-225, Z=25), excluding Manik Mia / Asad Gate EW road crossing
    if (x >= -270 && x <= -180 && z >= -40 && z <= 90) {
      if (Math.abs(z) > 11.5) return true;
    }
    // Hatirjheel Lake (130 x 160 centered at X=220, Z=-5), excluding Hatirjheel Tied-Arch Bridge & EW causeway
    if (x >= 155 && x <= 285 && z >= -85 && z <= 75) {
      const onBridge = x >= 209 && x <= 231;
      const onCauseway = Math.abs(z) <= 11.5;
      if (!onBridge && !onCauseway) return true;
    }
    // Gulshan-Baridhara Diplomatic Lake (84 x 120 centered at X=350, Z=-100)
    if (x >= 308 && x <= 392 && z >= -160 && z <= -40) {
      return true;
    }
    // Uttara Sector 7 Lake (85 x 160 centered at X=-180, Z=-540), excluding Uttara North & South EW roads
    if (x >= -222.5 && x <= -137.5 && z >= -620 && z <= -460) {
      const onCrossingRoad = z <= -609.5 || z >= -470.5;
      if (!onCrossingRoad) return true;
    }
    return false;
  }

  public alertNearbyPedestrians(x: number, z: number, radius = 24) {
    for (const npc of this.npcs) {
      if (npc.isDead || npc.isStoryNPC) continue;
      const d = Math.hypot(npc.x - x, npc.z - z);
      if (d < radius && npc.aiState !== 'dead') {
        npc.aiState = 'flee';
        const angle = Math.atan2(npc.x - x, npc.z - z);
        npc.walkTargetX = npc.x + Math.sin(angle) * 35;
        npc.walkTargetZ = npc.z + Math.cos(angle) * 35;
      }
    }
  }

  public alertPedestriansAhead(x: number, z: number, rotation: number, range = 18) {
    const forwardX = Math.sin(rotation);
    const forwardZ = Math.cos(rotation);
    const rightX = Math.cos(rotation);
    const rightZ = -Math.sin(rotation);
    for (const npc of this.npcs) {
      if (npc.isDead || npc.isStoryNPC) continue;
      const dx = npc.x - x;
      const dz = npc.z - z;
      const dist = Math.hypot(dx, dz);
      if (dist < range) {
        const dot = (dx * forwardX + dz * forwardZ) / Math.max(0.01, dist);
        if (dot > 0.25) {
          npc.aiState = 'flee';
          // Step aside onto the nearest footpath
          npc.walkTargetX = npc.x + (npc.x > 0 ? 8 : -8);
          npc.walkTargetZ = npc.z + (Math.random() - 0.5) * 6;
        }
      }
    }
    // Slow rickshaws and CNGs ahead yield slightly toward the curb on horn blast
    for (const veh of this.vehicles) {
      if (!veh.isTraffic || (veh.type !== 'rickshaw' && veh.type !== 'cng')) continue;
      const dx = veh.x - x;
      const dz = veh.z - z;
      const dist = Math.hypot(dx, dz);
      if (dist > 2 && dist < range + 6) {
        const dot = (dx * forwardX + dz * forwardZ) / dist;
        if (dot > 0.3) {
          const yieldX = veh.x + rightX * 0.9;
          const yieldZ = veh.z + rightZ * 0.9;
          if (!this.checkWorldObstacle(yieldX, yieldZ, 1.0, veh.id, veh.y)) {
            veh.x = clampWorldCoord(yieldX);
            veh.z = clampWorldCoord(yieldZ);
          }
        }
      }
    }
  }

  public exitCurrentVehicle() {
    if (!this.activeVehicleId) return;
    const veh = this.vehicles.find((v) => v.id === this.activeVehicleId);
    if (veh) {
      const vStats = VEHICLE_STATS[veh.type];
      const sideDist = vStats.width * 0.5 + 0.55;
      const endDist = vStats.length * 0.5 + 0.65;
      const cosR = Math.cos(veh.rotation);
      const sinR = Math.sin(veh.rotation);

      // Systematically test exit candidates: driver side, passenger side, rear, front, diagonal offsets
      const candidateOffsets: Array<[number, number]> = [
        [-cosR * sideDist, sinR * sideDist], // Driver left side
        [cosR * sideDist, -sinR * sideDist], // Passenger right side
        [-sinR * endDist, -cosR * endDist], // Behind vehicle
        [sinR * endDist, cosR * endDist], // In front of vehicle
        [-cosR * sideDist - sinR * 1.0, sinR * sideDist - cosR * 1.0], // Left rear
        [cosR * sideDist - sinR * 1.0, -sinR * sideDist - cosR * 1.0], // Right rear
        [-cosR * (sideDist + 0.4), sinR * (sideDist + 0.4)], // Wider left
        [cosR * (sideDist + 0.4), -sinR * (sideDist + 0.4)], // Wider right
      ];
      let safeX = veh.x - cosR * sideDist;
      let safeZ = veh.z + sinR * sideDist;
      let foundSafe = false;
      const expandedCandidates =
        veh.type === 'boat'
          ? [
              ...candidateOffsets,
              [-cosR * 4.5, sinR * 4.5],
              [cosR * 4.5, -sinR * 4.5],
              [-sinR * 5.0, -cosR * 5.0],
              [sinR * 5.0, cosR * 5.0],
              [-cosR * 8.0, sinR * 8.0],
              [cosR * 8.0, -sinR * 8.0],
            ]
          : candidateOffsets;
      for (const [ox, oz] of expandedCandidates) {
        const tx = veh.x + ox;
        const tz = veh.z + oz;
        const te = this.getRoadElevation(tx, tz, veh.y);
        const waterBlocked = this.isPositionInWater(tx, tz) && te <= 0.25;
        // Ensure exit spot is on dry surface at same deck level and free of obstacles
        if (!waterBlocked && Math.abs(te - veh.y) <= 1.8 && !this.checkWorldObstacle(tx, tz, 0.35, veh.id, veh.y)) {
          safeX = tx;
          safeZ = tz;
          foundSafe = true;
          break;
        }
      }
      if (!foundSafe) {
        // Fallback: step beside vehicle (into swim if open water)
        safeX = veh.x - cosR * (vStats.width * 0.5 + 0.6);
        safeZ = veh.z + sinR * (vStats.width * 0.5 + 0.6);
      }
      const inWaterExit = this.isPositionInWater(safeX, safeZ);
      const exitElev = inWaterExit ? -1.05 : this.getRoadElevation(safeX, safeZ, veh.y);
      this.isSwimming = inWaterExit;
      this.playerPos.set(safeX, exitElev, safeZ);
      if (this.playerLimbs.group.parent !== this.scene) {
        this.scene.add(this.playerLimbs.group);
      }
      this.playerLimbs.group.visible = true;
      this.playerLimbs.group.position.copy(this.playerPos);
      this.playerLimbs.group.scale.set(1.0, 1.0, 1.0);
      this.playerLimbs.group.rotation.set(0, this.playerRotation, 0);
      this.playerLimbs.leftArm.rotation.set(0, 0, 0);
      this.playerLimbs.rightArm.rotation.set(0, 0, 0);
      this.playerLimbs.leftLeg.rotation.set(0, 0, 0);
      this.playerLimbs.rightLeg.rotation.set(0, 0, 0);
      if (this.playerLimbs.weaponMesh) {
        this.playerLimbs.weaponMesh.visible = true;
      }
      const rig = this.playerLimbs.rpmRig || this.playerLimbs.driveRig;
      if (rig) {
        if (rig.leftUpLeg) rig.leftUpLeg.bone.quaternion.copy(rig.leftUpLeg.rest);
        if (rig.rightUpLeg) rig.rightUpLeg.bone.quaternion.copy(rig.rightUpLeg.rest);
        if (rig.leftLeg) rig.leftLeg.bone.quaternion.copy(rig.leftLeg.rest);
        if (rig.rightLeg) rig.rightLeg.bone.quaternion.copy(rig.rightLeg.rest);
        if (rig.leftFoot) rig.leftFoot.bone.quaternion.copy(rig.leftFoot.rest);
        if (rig.rightFoot) rig.rightFoot.bone.quaternion.copy(rig.rightFoot.rest);
        if (rig.spine) rig.spine.bone.quaternion.copy(rig.spine.rest);
        if (rig.leftArm) rig.leftArm.bone.quaternion.copy(rig.leftArm.rest);
        if (rig.rightArm) rig.rightArm.bone.quaternion.copy(rig.rightArm.rest);
        if (rig.leftForeArm) rig.leftForeArm.bone.quaternion.copy(rig.leftForeArm.rest);
        if (rig.rightForeArm) rig.rightForeArm.bone.quaternion.copy(rig.rightForeArm.rest);
      }
      if (this.playerLimbs.actions?.idle) {
        this.playerLimbs.actions.idle.reset().fadeIn(0.18).play();
        this.playerLimbs.currentActionName = 'idle';
      }
    }
    this.activeVehicleId = null;
    this.headlightSpot.intensity = 0;
    dhakaAudio.updateEngine(false, null, 0);
    useGameStore.setState({ inVehicleId: null, currentVehicleType: null });
  }

  public ejectDriverFromVehicle(veh: VehicleEntity) {
    const store = useGameStore.getState();
    const mesh = this.vehicleMeshes.get(veh.id);

    let hadDriver = false;
    if (mesh) {
      (mesh as any).isPlayerDriven = true;
      if (!mesh.userData) mesh.userData = {};
      mesh.userData.noDriver = true;

      // Find and purge any driver model in top-level or descendants
      const driversToRemove: THREE.Object3D[] = [];
      mesh.traverse((c) => {
        if (
          c.name &&
          (c.name === 'npc_driver' ||
            c.name.startsWith('npc_driver') ||
            c.name.includes('driver') ||
            c.name.includes('puller') ||
            c.name.includes('rider'))
        ) {
          driversToRemove.push(c);
        }
      });
      driversToRemove.forEach((d) => {
        hadDriver = true;
        d.visible = false;
        d.parent?.remove(d);
      });
    }

    // If it was traffic or had a driver on dry land, drop the driver out onto the street!
    if ((veh.isTraffic || hadDriver) && veh.type !== 'boat') {
      const ejectSide = veh.type === 'bus' ? -2.2 : -1.6; // Driver door / side of bike
      const ejectAngle = veh.rotation + Math.PI / 2;
      let dropX = clampWorldCoord(veh.x + Math.sin(ejectAngle) * ejectSide);
      let dropZ = clampWorldCoord(veh.z + Math.cos(ejectAngle) * ejectSide);
      if (this.isPositionInWater(dropX, dropZ)) {
        // Try opposite passenger side before giving up over water
        dropX = clampWorldCoord(veh.x - Math.sin(ejectAngle) * ejectSide);
        dropZ = clampWorldCoord(veh.z - Math.cos(ejectAngle) * ejectSide);
      }
      if (this.isPositionInWater(dropX, dropZ)) {
        return;
      }

      const droppedId = `ejected_driver_${Date.now()}_${Math.floor(Math.random() * 999)}`;
      const droppedNPC: NPCEntity = {
        id: droppedId,
        nameEn: 'Ejected Driver',
        nameBn: 'গাড়ির চালক',
        role: veh.isPolice
          ? 'police_officer'
          : veh.type === 'rickshaw'
          ? 'rickshaw_puller'
          : 'citizen',
        x: dropX,
        z: dropZ,
        rotation: veh.rotation + Math.PI + (Math.random() - 0.5) * 0.4,
        shirtColor: veh.isPolice ? '#1e3a8a' : '#d97706',
        pantsColor: '#1e293b',
        dialogueEn: ['Hey! My vehicle! Stop thief! Call the police!'],
        dialogueBn: ['আরে আমার গাড়ি! ছিনতাইকারী! পুলিশ ডাকো! এই ব্যাটা নাম!'],
        aiState: 'flee',
        walkTargetX: dropX + (Math.random() - 0.5) * 60,
        walkTargetZ: dropZ + (Math.random() - 0.5) * 60,
        health: 80,
        isEjectedDriver: true,
        ejectedTumbleTimer: 2.2, // Tumbles on the ground for 2.2s before scrambling to feet
      };

      const droppedLimbs = createCharacterMesh(
        droppedNPC.shirtColor,
        droppedNPC.pantsColor,
        droppedNPC.role,
        false
      );

      // Ejected driver hits the street pavement (ragdoll tumbling on the ground)
      const dropElev = this.getRoadElevation(dropX, dropZ, veh.y);
      droppedLimbs.group.position.set(dropX, dropElev + 0.08, dropZ);
      droppedLimbs.group.rotation.x = -Math.PI / 2; // Lies flat on the pavement
      droppedLimbs.group.rotation.y = veh.rotation + Math.PI / 2;
      this.scene.add(droppedLimbs.group);

      this.npcs.push(droppedNPC);
      this.npcLimbsMap.set(droppedId, droppedLimbs);

      // Spawn road scrape dust & play impact grunt sound
      this.spawnImpactSparks(dropX, 0.18, dropZ, '#cbd5e1', 2.0);
      dhakaAudio.playSfx('hit');

      store.showBanner({
        titleEn: 'DRIVER DROPPED OUT — YOU ARE THE DRIVER!',
        titleBn: 'চালককে নামিয়ে দেওয়া হয়েছে — আপনি এখন ড্রাইভার!',
        subtitleEn: veh.isPolice
          ? 'Commandeered DMP Patrol cruiser! Wanted Level 2!'
          : `Ejected driver to the street! Now driving ${veh.type.toUpperCase()}.`,
        subtitleBn: veh.isPolice
          ? 'পুলিশের গাড়ি দখল করেছেন! ওয়ান্টেড লেভেল ২!'
          : 'চালককে নামিয়ে দিয়েছেন! আপনি এখন গাড়ি চালাচ্ছেন।',
        tone: veh.isPolice ? 'red' : 'gold',
      });

      if (veh.isPolice && store.wantedLevel === 0) {
        store.setWantedLevel(2);
      } else if (!veh.isPolice && store.wantedLevel === 0 && Math.random() < 0.45) {
        store.setWantedLevel(1);
      }
    }
  }

  public explodeVehicle(veh: VehicleEntity) {
    veh.health = 0;
    veh.speed = 0;
    veh.isTraffic = false;
    veh.isParked = true;
    const mesh = this.vehicleMeshes.get(veh.id);
    if (mesh) {
      mesh.traverse((c) => {
        if ((c as THREE.Mesh).isMesh) {
          const m = c as THREE.Mesh;
          const mat = m.material as THREE.MeshStandardMaterial;
          if (mat && 'color' in mat && m.name !== 'contact_shadow') {
            mat.color.set('#1e293b');
            if ('roughness' in mat) mat.roughness = 0.96;
            if ('metalness' in mat) mat.metalness = 0.1;
          }
        }
      });
    }
    this.spawnImpactSparks(veh.x, 1.4, veh.z, '#ef4444', 4.5);
    this.spawnImpactSparks(veh.x, 2.2, veh.z, '#facc15', 3.5);
    this.spawnImpactSparks(veh.x, 0.8, veh.z, '#374151', 3.0);
    dhakaAudio.playSfx('shotgun');

    if (this.activeVehicleId === veh.id) {
      const store = useGameStore.getState();
      store.damagePlayer(35);
      this.exitCurrentVehicle();
      this.playerPos.x += Math.sin(veh.rotation + Math.PI) * 3.5;
      this.playerPos.z += Math.cos(veh.rotation + Math.PI) * 3.5;
      this.playerLimbs.group.position.copy(this.playerPos);
      store.setWantedLevel(Math.max(2, store.wantedLevel + 1));
      store.showBanner({
        titleEn: 'VEHICLE DESTROYED!',
        titleBn: 'গাড়ি সম্পূর্ণ ধ্বংস হয়েছে!',
        subtitleEn: 'Bailed out after fatal engine blowout & explosion.',
        subtitleBn: 'ইঞ্জিন বিস্ফোরণের পর গাড়ি থেকে ছিটকে পড়েছেন।',
        tone: 'red',
      });
    }
  }

  public spawnPoliceCruiserNearPlayer() {
    const stats = VEHICLE_STATS.police;
    const id = `veh_backup_${Date.now()}`;
    const offsetZ = Math.random() > 0.5 ? 85 : -85;
    let x = Math.abs(this.playerPos.x) < 30 ? (Math.random() > 0.5 ? 4.5 : -4.5) : this.playerPos.x;
    let z = clampWorldCoord(this.playerPos.z + offsetZ);
    if (this.isPositionInWater(x, z)) {
      x = 4.5;
      z = -40;
    }
    const spawnElev = this.getRoadElevation(x, z, this.playerPos.y);
    const entity: VehicleEntity = {
      id,
      type: 'police',
      x,
      y: spawnElev,
      z,
      rotation: offsetZ > 0 ? Math.PI : 0,
      speed: 16,
      steering: 0,
      health: stats.maxHealth,
      maxHealth: stats.maxHealth,
      color: '#1e3a8a',
      isTraffic: true,
      isPolice: true,
      fuel: 100,
      plateNumber: `ডিএমপি-${Math.floor(Math.random() * 80 + 10)}-${Math.floor(Math.random() * 8000 + 1000)}`,
    };
    this.vehicles.push(entity);
    const mesh = createVehicleMesh('police', '#1e3a8a', 0, true);
    mesh.position.set(x, spawnElev, z);
    this.scene.add(mesh);
    this.vehicleMeshes.set(id, mesh);
  }

  /**
   * Authentic Buriganga River Bridges (১ম ও ২য় বুড়িগঙ্গা সেতু / বাবুবাজার ও পোস্তগোলা সেতু)
   * Multi-lane elevated highway river crossings with high navigation clearance for Sadarghat passenger launches,
   * heavy concrete river piers, illuminated yellow crash barriers, and iconic bilingual highway entrance portals.
   */
  private buildBurigangaRiverBridges() {
    const bridgeConcreteMat = new THREE.MeshStandardMaterial({
      color: '#cbd5e1',
      roughness: 0.72,
    });
    const pierMat = new THREE.MeshStandardMaterial({
      color: '#94a3b8',
      roughness: 0.82,
    });
    const barrierMat = new THREE.MeshStandardMaterial({
      color: '#0f172a',
      roughness: 0.65,
    });
    const yellowStripeMat = new THREE.MeshStandardMaterial({
      color: '#facc15',
      emissive: new THREE.Color('#facc15'),
      emissiveIntensity: 0.35,
      roughness: 0.45,
    });
    const portalFrameMat = new THREE.MeshStandardMaterial({
      color: '#047857', // Iconic Bangladesh Emerald Green
      metalness: 0.55,
      roughness: 0.35,
    });
    const lampLightMat = new THREE.MeshStandardMaterial({
      color: '#fef08a',
      emissive: new THREE.Color('#fef08a'),
      emissiveIntensity: 1.0,
      roughness: 0.2,
    });
    this.streetLampStdMats.push(lampLightMat);

    // 1. First Buriganga Bridge (China-Bangladesh Friendship Bridge - Babubazar / Sadarghat Central Spine at X = 0)
    // Span: Z: 285 to 460 (Length 175m, Width 22m)
    const bridgeX = 0;
    const bridgeW = 22;
    const zStart = 285;
    const zEnd = 460;
    const bridgeLen = zEnd - zStart;

    // Segmented arched road deck over Buriganga (arch peak Y = 2.8m at Z = 372.5)
    const numBridgeSegs = 14;
    const segLen = bridgeLen / numBridgeSegs;
    for (let i = 0; i < numBridgeSegs; i++) {
      const segZ1 = zStart + i * segLen;
      const segZ2 = zStart + (i + 1) * segLen;
      const midZ = (segZ1 + segZ2) / 2;
      const t = (midZ - zStart) / bridgeLen;
      const segElev = 0.08 + 2.75 * Math.sin(t * Math.PI);

      // Deck Slab
      const slab = this.sharedBox(bridgeW, 0.75, segLen + 0.1, bridgeConcreteMat, bridgeX, segElev - 0.35, midZ);
      slab.receiveShadow = true;
      this.scene.add(slab);

      // Side Crash Barriers with Hazard Markings
      [-bridgeW / 2 + 0.3, bridgeW / 2 - 0.3].forEach((bx) => {
        const barrier = this.sharedBox(0.45, 1.15, segLen + 0.1, barrierMat, bridgeX + bx, segElev + 0.45, midZ);
        this.scene.add(barrier);

        const hazardStripe = this.sharedBox(0.48, 0.22, segLen + 0.1, yellowStripeMat, bridgeX + bx, segElev + 0.2, midZ);
        this.scene.add(hazardStripe);
      });
    }

    // Guardrail colliders for First Buriganga Bridge (China-Bangladesh Friendship Bridge at X = 0)
    this.buildingColliders.push({
      minX: bridgeX - bridgeW / 2 - 0.2,
      maxX: bridgeX - bridgeW / 2 + 0.55,
      minZ: zStart - 5,
      maxZ: zEnd + 5,
      minY: 0.1,
      maxY: 4.5,
      tag: 'buriganga_bridge_guardrail',
    });
    this.buildingColliders.push({
      minX: bridgeX + bridgeW / 2 - 0.55,
      maxX: bridgeX + bridgeW / 2 + 0.2,
      minZ: zStart - 5,
      maxZ: zEnd + 5,
      minY: 0.1,
      maxY: 4.5,
      tag: 'buriganga_bridge_guardrail',
    });

    // Heavy Concrete Piers in the Buriganga River Channel
    for (let pz = 320; pz <= 430; pz += 36) {
      const t = (pz - zStart) / bridgeLen;
      const pierElev = 0.08 + 2.75 * Math.sin(t * Math.PI);

      [-bridgeW / 3, bridgeW / 3].forEach((px) => {
        const pier = new THREE.Mesh(this.cylCache(1.4, 1.7, pierElev + 3.0, 14), pierMat);
        pier.position.set(bridgeX + px, (pierElev - 3.0) / 2 + 0.5, pz);
        pier.castShadow = true;
        this.scene.add(pier);

        this.circleColliders.push({
          x: bridgeX + px,
          z: pz,
          radius: 1.8,
          tag: 'bridge_pier',
        });
      });

      // Concrete Pier Crossbeam Girder
      const crossBeam = this.sharedBox(bridgeW + 1.2, 1.35, 3.2, bridgeConcreteMat, bridgeX, pierElev - 0.85, pz);
      this.scene.add(crossBeam);

      // Highway High-Mast Streetlights on Bridge
      [-bridgeW / 2 + 0.3, bridgeW / 2 - 0.3].forEach((lx) => {
        const pole = new THREE.Mesh(this.cylCache(0.12, 0.16, 6.4, 8), pierMat);
        pole.position.set(bridgeX + lx, pierElev + 3.2, pz);
        this.scene.add(pole);

        const lum = new THREE.Mesh(this.boxCache(0.6, 0.12, 0.3), lampLightMat);
        lum.position.set(bridgeX + lx + (lx > 0 ? -0.4 : 0.4), pierElev + 6.3, pz);
        this.scene.add(lum);
      });
    }

    // Welcome Arch Portals at North (Sadarghat) and South (Keraniganj) bridgeheads
    [zStart + 2, zEnd - 2].forEach((az, aIdx) => {
      const archGroup = new THREE.Group();
      archGroup.position.set(bridgeX, 0, az);

      [-bridgeW / 2 - 0.6, bridgeW / 2 + 0.6].forEach((px) => {
        const pylon = new THREE.Mesh(this.boxCache(0.8, 8.5, 0.8), portalFrameMat);
        pylon.position.set(px, 4.25, 0);
        archGroup.add(pylon);
      });

      const lintel = new THREE.Mesh(this.boxCache(bridgeW + 2.0, 1.4, 0.9), portalFrameMat);
      lintel.position.set(0, 8.2, 0);
      archGroup.add(lintel);

      const signTex = createFlyoverGantryTexture(
        '১ম বুড়িগঙ্গা সেতু (চীন-বাংলাদেশ মৈত্রী সেতু)',
        '1ST BURIGANGA BRIDGE (CHINA-BANGLADESH FRIENDSHIP BRIDGE)',
        aIdx === 0 ? 'কেরানীগঞ্জ ও মাওয়া এক্সপ্রেসওয়ে সংযোগ' : 'সদরঘাট, চকবাজার ও গুলিস্তান সংযোগ',
        aIdx === 0 ? 'KERANIGANJ & MAWA EXPRESSWAY LINK' : 'SADARGHAT, CHAWKBAZAR & GULISTAN LINK'
      );
      const signBoard = new THREE.Mesh(
        new THREE.BoxGeometry(bridgeW * 0.85, 2.2, 0.12),
        new THREE.MeshStandardMaterial({ map: signTex, roughness: 0.4 })
      );
      signBoard.position.set(0, 6.8, 0);
      archGroup.add(signBoard);

      this.scene.add(archGroup);
    });

    // 2. Concrete Bridge Decks & Smooth Approach Ramps for ALL North-South arteries crossing Buriganga
    // Covers all metropolitan corridors: Mirpur, Gabtoli, Savar, Dhanmondi, Gulshan, Badda, Purbachal & Outer Rings
    const otherBridgeXs = [-950, -780, -580, -480, -380, -170, 220, 440, 640, 840, 950];
    const rampLen2 = 20; // 20m smooth slope transition from ground (Y = 0.08) to bridge deck (Y = 1.0)
    const rampAngle = Math.atan2(0.92, rampLen2);

    otherBridgeXs.forEach((ox) => {
      const oRoad = DhakaCityEngine.NS_ROADS.find((r) => r.x === ox);
      const oW = oRoad ? oRoad.width : 18;

      // 2.1 North Approach Ramp (Z: 265 to 285, rising Y: 0.08 -> 1.0)
      const northRamp = new THREE.Mesh(this.boxCache(oW, 0.8, rampLen2 + 0.2), bridgeConcreteMat);
      northRamp.position.set(ox, 0.54, 275);
      northRamp.rotation.x = -rampAngle;
      northRamp.receiveShadow = true;
      this.scene.add(northRamp);

      // North Ramp Guardrails
      [-oW / 2 + 0.25, oW / 2 - 0.25].forEach((gx) => {
        const rail = new THREE.Mesh(this.boxCache(0.4, 1.1, rampLen2 + 0.2), barrierMat);
        rail.position.set(ox + gx, 1.39, 275);
        rail.rotation.x = -rampAngle;
        this.scene.add(rail);
      });

      // 2.2 Solid Main Bridge Deck Slab (Z: 285 to 460 at Y = 1.0, flush with embankment)
      const oDeck = this.sharedBox(oW, 0.8, bridgeLen, bridgeConcreteMat, ox, 0.6, (zStart + zEnd) / 2);
      oDeck.receiveShadow = true;
      this.scene.add(oDeck);

      // Side Guardrails along main span
      [-oW / 2 + 0.25, oW / 2 - 0.25].forEach((gx) => {
        const rail = this.sharedBox(0.4, 1.1, bridgeLen, barrierMat, ox + gx, 1.45, (zStart + zEnd) / 2);
        this.scene.add(rail);

        // Yellow reflective hazard markings along the bridge barriers
        for (let rz = zStart + 10; rz <= zEnd - 10; rz += 20) {
          const stud = new THREE.Mesh(this.boxCache(0.42, 0.2, 0.8), yellowStripeMat);
          stud.position.set(ox + gx, 1.25, rz);
          this.scene.add(stud);
        }
      });

      // 2.3 South Approach Ramp (Z: 460 to 480, declining Y: 1.0 -> 0.08)
      const southRamp = new THREE.Mesh(this.boxCache(oW, 0.8, rampLen2 + 0.2), bridgeConcreteMat);
      southRamp.position.set(ox, 0.54, 470);
      southRamp.rotation.x = rampAngle;
      southRamp.receiveShadow = true;
      this.scene.add(southRamp);

      // South Ramp Guardrails
      [-oW / 2 + 0.25, oW / 2 - 0.25].forEach((gx) => {
        const rail = new THREE.Mesh(this.boxCache(0.4, 1.1, rampLen2 + 0.2), barrierMat);
        rail.position.set(ox + gx, 1.39, 470);
        rail.rotation.x = rampAngle;
        this.scene.add(rail);
      });

      // Guardrail colliders along entire bridge corridor (prevents falling off side onto promenade or into river)
      this.buildingColliders.push({
        minX: ox - oW / 2 - 0.2,
        maxX: ox - oW / 2 + 0.55,
        minZ: 265,
        maxZ: 480,
        minY: 0.1,
        maxY: 3.5,
        tag: 'buriganga_bridge_guardrail',
      });
      this.buildingColliders.push({
        minX: ox + oW / 2 - 0.55,
        maxX: ox + oW / 2 + 0.2,
        minZ: 265,
        maxZ: 480,
        minY: 0.1,
        maxY: 3.5,
        tag: 'buriganga_bridge_guardrail',
      });

      // 2.4 Concrete Water Piers in the Buriganga River Channel
      for (let pz = 320; pz <= 430; pz += 36) {
        const pier = new THREE.Mesh(this.cylCache(1.3, 1.5, 4.2, 12), pierMat);
        pier.position.set(ox, 0.1, pz);
        pier.castShadow = true;
        this.scene.add(pier);

        this.circleColliders.push({
          x: ox,
          z: pz,
          radius: 1.6,
          tag: 'bridge_pier',
        });
      }
    });
  }

  private buildHatirjheelBridge() {
    const archGroup = new THREE.Group();
    archGroup.position.set(220, 0, -5);

    const asphaltTex = loadRealTexture(
      '/textures/dhaka_asphalt.jpg',
      2,
      12,
      true
    );
    const deck = new THREE.Mesh(
      new THREE.BoxGeometry(20, 0.5, 95),
      new THREE.MeshStandardMaterial({ map: asphaltTex, roughness: 0.7 })
    );
    deck.position.set(0, 0.25, 0);
    archGroup.add(deck);

    // 3D Parabolic Tied-Arch Hatirjheel Bridge with Neon LED Arch Ribs & Hanger Cables
    const neonColors = ['#ec4899', '#06b6d4', '#a855f7', '#f43f5e'];
    [-9.5, 9.5].forEach((sideX, idx) => {
      for (let i = -40; i <= 40; i += 4) {
        const h = Math.max(1.8, 15.5 - (i * i) / 105);
        const col = neonColors[Math.abs(Math.floor(i / 4) + idx) % neonColors.length];
        // Vertical suspension cable
        const cable = new THREE.Mesh(
          new THREE.CylinderGeometry(0.08, 0.08, h, 8),
          new THREE.MeshBasicMaterial({ color: col })
        );
        cable.position.set(sideX, h / 2, i);
        archGroup.add(cable);

        // Top arch rib segment
        const rib = new THREE.Mesh(
          new THREE.SphereGeometry(0.42, 10, 10),
          new THREE.MeshBasicMaterial({ color: col })
        );
        rib.position.set(sideX, h, i);
        archGroup.add(rib);
      }
    });

    const bridgeLight = new THREE.PointLight('#ec4899', 2.4, 75);
    bridgeLight.position.set(0, 12, 0);
    archGroup.add(bridgeLight);
    this.hatirjheelLights.push(bridgeLight);

    this.scene.add(archGroup);

    // Hatirjheel Bridge guardrails (prevent driving off into the lake!)
    this.buildingColliders.push({
      minX: 209.2,
      maxX: 210.4,
      minZ: -52.5,
      maxZ: 42.5,
      minY: 0.0,
      maxY: 3.5,
      tag: 'bridge_rail_west',
    });
    this.buildingColliders.push({
      minX: 229.6,
      maxX: 230.8,
      minZ: -52.5,
      maxZ: 42.5,
      minY: 0.0,
      maxY: 3.5,
      tag: 'bridge_rail_east',
    });
  }

  private buildMotijheelShaplaMonument() {
    // 1. 3D Motijheel Shapla Chattar (শাপলা চত্বর — Water Lily Monument)
    // Iconic national symbol designed by sculptor Azizul Jalil Pasha in Motijheel Commercial Area
    this.circleColliders.push({
      x: 220,
      z: 175,
      radius: 7.8,
      tag: 'shapla_chattar',
    });
    const shaplaGroup = new THREE.Group();
    shaplaGroup.position.set(220, 0.1, 175);

    // Multi-tier tiered circular granite fountain basin with black-and-white curb edge
    const outerBasinCurb = new THREE.Mesh(
      new THREE.CylinderGeometry(7.2, 7.6, 0.55, 32),
      new THREE.MeshStandardMaterial({ color: '#1e293b', roughness: 0.5, metalness: 0.2 })
    );
    outerBasinCurb.position.y = 0.28;
    shaplaGroup.add(outerBasinCurb);

    const innerWall = new THREE.Mesh(
      new THREE.CylinderGeometry(6.6, 6.9, 0.75, 32),
      new THREE.MeshStandardMaterial({ color: '#334155', roughness: 0.4 })
    );
    innerWall.position.y = 0.42;
    shaplaGroup.add(innerWall);

    // Cascading turquoise rippling water surface
    const waterPool = new THREE.Mesh(
      new THREE.CylinderGeometry(6.5, 6.5, 0.65, 32),
      new THREE.MeshPhysicalMaterial({
        color: '#0284c7',
        roughness: 0.12,
        clearcoat: 0.95,
        clearcoatRoughness: 0.1,
        transparent: true,
        opacity: 0.88,
      })
    );
    waterPool.position.y = 0.45;
    shaplaGroup.add(waterPool);

    // Floating green water lily pads (শালুক / পদ্মপাতা)
    const lilyPadMat = new THREE.MeshStandardMaterial({
      color: '#15803d',
      roughness: 0.35,
    });
    const padAngles = [0.2, 0.9, 1.8, 2.7, 3.6, 4.4, 5.3, 6.0];
    padAngles.forEach((ang, idx) => {
      const pRad = 3.6 + (idx % 3) * 0.9;
      const pad = new THREE.Mesh(
        new THREE.CylinderGeometry(0.72 + (idx % 2) * 0.2, 0.72 + (idx % 2) * 0.2, 0.04, 16),
        lilyPadMat
      );
      pad.position.set(Math.cos(ang) * pRad, 0.47, Math.sin(ang) * pRad);
      pad.rotation.y = ang;
      shaplaGroup.add(pad);
    });

    // Sculpted green stem pedestal (বৃন্ত)
    const stem = new THREE.Mesh(
      new THREE.CylinderGeometry(0.95, 1.5, 5.2, 20),
      new THREE.MeshStandardMaterial({ color: '#166534', roughness: 0.4 })
    );
    stem.position.y = 2.9;
    shaplaGroup.add(stem);

    // Authentic sculpted white petals with soft gradient and clearcoat
    const petalMat = new THREE.MeshStandardMaterial({
      color: '#ffffff',
      emissive: '#fef3c7',
      emissiveIntensity: 0.18,
      roughness: 0.2,
      metalness: 0.05,
    });

    // Outer & Inner tiers of sculpted 3D Water Lily (Shapla) petals
    for (let ring = 0; ring < 2; ring++) {
      const count = ring === 0 ? 12 : 8;
      const radius = ring === 0 ? 1.65 : 1.05;
      const tilt = ring === 0 ? 0.62 : 0.34;
      for (let i = 0; i < count; i++) {
        const angle = (i * Math.PI * 2) / count + ring * 0.28;
        const petal = new THREE.Mesh(
          new THREE.ConeGeometry(0.85, 3.4, 8),
          petalMat
        );
        petal.position.set(
          Math.cos(angle) * radius,
          5.9 + ring * 0.45,
          Math.sin(angle) * radius
        );
        petal.rotation.z = -Math.cos(angle) * tilt;
        petal.rotation.x = Math.sin(angle) * tilt;
        shaplaGroup.add(petal);
      }
    }

    // Golden-yellow central stamens (কেশর)
    const stamenCore = new THREE.Mesh(
      new THREE.SphereGeometry(0.78, 16, 16),
      new THREE.MeshBasicMaterial({ color: '#facc15' })
    );
    stamenCore.position.y = 6.6;
    shaplaGroup.add(stamenCore);

    for (let s = 0; s < 8; s++) {
      const sAngle = (s * Math.PI * 2) / 8;
      const stamenTip = new THREE.Mesh(
        new THREE.CylinderGeometry(0.04, 0.04, 0.6, 8),
        new THREE.MeshBasicMaterial({ color: '#fbbf24' })
      );
      stamenTip.position.set(Math.cos(sAngle) * 0.4, 6.9, Math.sin(sAngle) * 0.4);
      stamenTip.rotation.z = -Math.cos(sAngle) * 0.3;
      stamenTip.rotation.x = Math.sin(sAngle) * 0.3;
      shaplaGroup.add(stamenTip);
    }

    // Perimeter brass water nozzles pointing toward center (20 nozzles)
    const nozzleMat = new THREE.MeshStandardMaterial({ color: '#eab308', metalness: 0.85, roughness: 0.3 });
    for (let i = 0; i < 20; i++) {
      const nAngle = (i * Math.PI * 2) / 20;
      const nozzle = new THREE.Mesh(
        new THREE.CylinderGeometry(0.05, 0.07, 0.32, 8),
        nozzleMat
      );
      nozzle.position.set(Math.cos(nAngle) * 5.8, 0.5, Math.sin(nAngle) * 5.8);
      nozzle.rotation.z = Math.cos(nAngle) * 0.55;
      nozzle.rotation.x = -Math.sin(nAngle) * 0.55;
      shaplaGroup.add(nozzle);
    }

    // Illuminating pond lights
    const shaplaLight = new THREE.PointLight('#38bdf8', 3.0, 35);
    shaplaLight.position.set(0, 2.5, 0);
    shaplaGroup.add(shaplaLight);
    this.distantPointLights.push({ light: shaplaLight, x: 220, z: 175, maxDist: 65 });

    this.scene.add(shaplaGroup);
    this.createFountainSpraySystem(220, 0.45, 175, 20, 5.8, 5.2);

    // 2. 3D Central Shaheed Minar (কেন্দ্রীয় শহীদ মিনার) near Shahbagh / Dhanmondi East
    const shaheedGroup = new THREE.Group();
    shaheedGroup.position.set(-38, 0.05, 58);

    const redAltar = new THREE.Mesh(
      new THREE.BoxGeometry(15, 0.75, 10),
      new THREE.MeshStandardMaterial({ color: '#991b1b', roughness: 0.6 })
    );
    redAltar.position.y = 0.38;
    shaheedGroup.add(redAltar);

    // Glowing Crimson Red Rising Sun Disc (লাল সূর্য)
    const redSun = new THREE.Mesh(
      new THREE.CylinderGeometry(3.8, 3.8, 0.28, 32).rotateX(Math.PI / 2),
      new THREE.MeshBasicMaterial({ color: '#dc2626' })
    );
    redSun.position.set(0, 4.8, -1.6);
    shaheedGroup.add(redSun);

    const marbleMat = new THREE.MeshStandardMaterial({
      color: '#f8fafc',
      roughness: 0.25,
    });
    const frameOffsets = [
      { x: -4.8, h: 5.2, yaw: 0.25, bend: false },
      { x: -2.5, h: 6.4, yaw: 0.14, bend: false },
      { x: 0, h: 7.8, yaw: 0, bend: true },
      { x: 2.5, h: 6.4, yaw: -0.14, bend: false },
      { x: 4.8, h: 5.2, yaw: -0.25, bend: false },
    ];
    frameOffsets.forEach((f) => {
      const fGroup = new THREE.Group();
      fGroup.position.set(f.x, 0.75, 0.5);
      fGroup.rotation.y = f.yaw;

      [-0.65, 0.65].forEach((px) => {
        const post = new THREE.Mesh(
          new THREE.BoxGeometry(0.24, f.h, 0.24),
          marbleMat
        );
        post.position.set(px, f.h / 2, 0);
        fGroup.add(post);
      });
      const topBar = new THREE.Mesh(
        new THREE.BoxGeometry(1.54, 0.24, 0.24),
        marbleMat
      );
      topBar.position.set(0, f.h, 0);
      fGroup.add(topBar);

      if (f.bend) {
        const bowedTop = new THREE.Mesh(
          new THREE.BoxGeometry(1.54, 2.2, 0.22),
          marbleMat
        );
        bowedTop.position.set(0, f.h + 0.75, 0.65);
        bowedTop.rotation.x = 0.65;
        fGroup.add(bowedTop);
      }
      shaheedGroup.add(fGroup);
    });
    this.scene.add(shaheedGroup);

    // 3. 3D Jatiya Sangsad Bhaban (জাতীয় সংসদ ভবন — National Parliament House of Bangladesh)
    const sangsadGroup = new THREE.Group();
    sangsadGroup.position.set(-68, 0.05, -48);

    const sangsadLake = new THREE.Mesh(
      new THREE.CylinderGeometry(18, 18, 0.25, 24),
      new THREE.MeshPhysicalMaterial({ color: '#0284c7', roughness: 0.15, clearcoat: 0.9 })
    );
    sangsadLake.position.y = 0.12;
    sangsadGroup.add(sangsadLake);

    this.circleColliders.push({
      x: -68,
      z: -48,
      radius: 18.2,
      tag: 'sangsad_lake_basin',
    });

    const concreteMat = new THREE.MeshStandardMaterial({
      color: '#cbd5e1',
      roughness: 0.75,
    });
    const darkCutoutMat = new THREE.MeshBasicMaterial({ color: '#0f172a' });

    const centralOctagon = new THREE.Mesh(
      new THREE.CylinderGeometry(7.5, 7.8, 18.5, 8),
      concreteMat
    );
    centralOctagon.position.y = 9.4;
    centralOctagon.castShadow = true;
    sangsadGroup.add(centralOctagon);

    for (let i = 0; i < 8; i++) {
      const ang = (i * Math.PI) / 4;
      const wing = new THREE.Mesh(
        new THREE.BoxGeometry(5.2, 14.5, 4.2),
        concreteMat
      );
      wing.position.set(Math.cos(ang) * 9.2, 7.4, Math.sin(ang) * 9.2);
      wing.rotation.y = -ang + Math.PI / 2;
      wing.castShadow = true;

      // Iconic Louis Kahn circular & triangular facade cutouts
      const circleCut = new THREE.Mesh(
        new THREE.CircleGeometry(1.35, 20),
        darkCutoutMat
      );
      circleCut.position.set(0, 2.2, 2.15);
      wing.add(circleCut);

      const triCut = new THREE.Mesh(
        new THREE.CircleGeometry(1.45, 3),
        darkCutoutMat
      );
      triCut.position.set(0, -2.0, 2.15);
      wing.add(triCut);

      sangsadGroup.add(wing);
    }
    this.scene.add(sangsadGroup);

    // 4. 3D Ahsan Manzil (আহসান মঞ্জিল — The Pink Palace of Old Dhaka)
    const ahsanGroup = new THREE.Group();
    ahsanGroup.position.set(-78, 0.05, 222);

    const pinkMat = new THREE.MeshStandardMaterial({
      color: '#f472b6',
      roughness: 0.5,
    });
    const whiteTrim = new THREE.MeshStandardMaterial({
      color: '#fff1f2',
      roughness: 0.35,
    });

    const palaceHall = new THREE.Mesh(
      new THREE.BoxGeometry(24, 9.5, 11),
      pinkMat
    );
    palaceHall.position.y = 4.75;
    palaceHall.castShadow = true;
    ahsanGroup.add(palaceHall);

    const drum = new THREE.Mesh(
      new THREE.CylinderGeometry(3.8, 4.2, 4.5, 12),
      whiteTrim
    );
    drum.position.y = 11.2;
    ahsanGroup.add(drum);

    const pinkDome = new THREE.Mesh(
      new THREE.SphereGeometry(4.0, 20, 16, 0, Math.PI * 2, 0, Math.PI * 0.6),
      pinkMat
    );
    pinkDome.position.y = 13.2;
    ahsanGroup.add(pinkDome);

    const grandStairs = new THREE.Mesh(
      new THREE.BoxGeometry(8.5, 3.8, 6.5),
      new THREE.MeshStandardMaterial({ color: '#78716c' })
    );
    grandStairs.position.set(0, 1.9, 7.5);
    ahsanGroup.add(grandStairs);

    this.scene.add(ahsanGroup);
  }

  private buildMetroViaductPillars() {
    const concreteMat = new THREE.MeshStandardMaterial({
      color: '#94a3b8',
      roughness: 0.85,
    });
    const railSteelMat = new THREE.MeshStandardMaterial({
      color: '#64748b',
      metalness: 0.92,
      roughness: 0.18,
    });
    const mastSteelMat = new THREE.MeshStandardMaterial({
      color: '#475569',
      metalness: 0.85,
      roughness: 0.35,
    });
    const wireMat = new THREE.MeshBasicMaterial({ color: '#334155' });
    const canopyMat = new THREE.MeshStandardMaterial({
      color: '#0f766e',
      metalness: 0.45,
      roughness: 0.25,
      side: THREE.DoubleSide,
    });
    const concourseMat = new THREE.MeshStandardMaterial({
      color: '#e2e8f0',
      roughness: 0.72,
    });
    const glassMat = new THREE.MeshPhysicalMaterial({
      color: '#bae6fd',
      transmission: 0.82,
      roughness: 0.08,
      transparent: true,
      opacity: 0.85,
    });
    const psdGlassMat = new THREE.MeshPhysicalMaterial({
      color: '#38bdf8',
      transmission: 0.75,
      roughness: 0.12,
      transparent: true,
      opacity: 0.75,
    });

    // =========================================================================
    // SECTION A: MRT LINE-6 (NORTH-SOUTH) VIADUCT (Uttara Depot Z=-1250 to Kamalapur Z=+470)
    // =========================================================================
    const line6CrossRoads = [-1100, -850, -620, -460, -315, -198, -175, -28, 0, 175, 240, 285, 440];
    for (let z = -1240; z <= 460; z += 42) {
      // Exclude cross streets, flyover intersections, and SAARC Fountain Roundabout (-28)
      if (line6CrossRoads.some((cr) => Math.abs(z - cr) < (cr === -28 ? 26 : 18))) continue;

      this.circleColliders.push({
        x: -12.2,
        z,
        radius: 1.15,
        tag: 'metro_pillar',
      });
      const pier = new THREE.Mesh(
        new THREE.CylinderGeometry(1.05, 1.25, 11.5, 14),
        concreteMat
      );
      pier.position.set(-12.2, 5.75, z);
      pier.castShadow = true;
      this.scene.add(pier);

      const cap = new THREE.Mesh(
        new THREE.BoxGeometry(6.4, 1.4, 3.4),
        concreteMat
      );
      cap.position.set(-12.2, 11.5, z);
      this.scene.add(cap);

      // Steel Catenary Overhead Mast (Line-6)
      if (z % 84 === 0) {
        const mast = new THREE.Mesh(new THREE.BoxGeometry(0.24, 6.2, 0.24), mastSteelMat);
        mast.position.set(-15.3, 15.6, z);
        this.scene.add(mast);

        const cantilever = new THREE.Mesh(new THREE.BoxGeometry(4.8, 0.18, 0.18), mastSteelMat);
        cantilever.position.set(-13.0, 18.2, z);
        this.scene.add(cantilever);

        const dropArm1 = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.8), mastSteelMat);
        dropArm1.position.set(-13.3, 17.8, z);
        this.scene.add(dropArm1);

        const dropArm2 = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.8), mastSteelMat);
        dropArm2.position.set(-11.1, 17.8, z);
        this.scene.add(dropArm2);
      }
    }

    // Continuous Pre-Stressed Concrete Box Girder (1720m length, Z: -1250 to +470)
    const line6Girder = new THREE.Mesh(
      new THREE.BoxGeometry(5.4, 1.25, 1720),
      concreteMat
    );
    line6Girder.position.set(-12.2, 12.6, -390);
    line6Girder.castShadow = true;
    this.scene.add(line6Girder);

    // Continuous Line-6 Dual Overhead Catenary Contact Wires
    [-13.3, -11.1].forEach((wireX) => {
      const contactWire = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 1720, 6), wireMat);
      contactWire.position.set(wireX, 17.4, -390);
      contactWire.rotation.x = Math.PI / 2;
      this.scene.add(contactWire);
    });

    // Dual Steel Track Rails with Timber Sleepers (Line-6)
    [-13.3, -11.1].forEach((trackX) => {
      [-0.45, 0.45].forEach((railOffsetX) => {
        const rail = this.sharedBox(0.12, 0.14, 1720, railSteelMat, trackX + railOffsetX, 13.28, -390);
        this.scene.add(rail);
      });
    });

    // =========================================================================
    // SECTION B: MRT LINE-5 NORTHERN ROUTE (EAST-WEST) VIADUCT (X: -460 to +650 at Z = -198)
    // Running parallel north of Mohakhali Flyover with zero roadway obstructions
    // Passes 4.2m OVER Line-6 at Mirpur-10 (Deck Y = 16.8m, Rails Y = 17.5m)
    // =========================================================================
    const line5Z = -198;
    const line5CrossAvenues = [-420, -280, -170, -12.2, 14, 120, 260, 420, 560];
    for (let x = -460; x <= 640; x += 42) {
      if (line5CrossAvenues.some((ca) => Math.abs(x - ca) < 18)) continue;

      this.circleColliders.push({
        x,
        z: line5Z,
        radius: 1.2,
        tag: 'metro_pillar',
      });
      const pier5 = new THREE.Mesh(
        new THREE.CylinderGeometry(1.1, 1.35, 15.6, 14),
        concreteMat
      );
      pier5.position.set(x, 7.8, line5Z);
      pier5.castShadow = true;
      this.scene.add(pier5);

      const cap5 = new THREE.Mesh(
        new THREE.BoxGeometry(3.4, 1.4, 6.4),
        concreteMat
      );
      cap5.position.set(x, 15.6, line5Z);
      this.scene.add(cap5);

      // Steel Catenary Overhead Mast (Line-5)
      if (x % 84 === 0) {
        const mast5 = new THREE.Mesh(new THREE.BoxGeometry(0.24, 6.2, 0.24), mastSteelMat);
        mast5.position.set(x, 19.8, line5Z - 3.2);
        this.scene.add(mast5);

        const cantilever5 = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.18, 4.8), mastSteelMat);
        cantilever5.position.set(x, 22.4, line5Z - 0.9);
        this.scene.add(cantilever5);

        const dropArm5A = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.8), mastSteelMat);
        dropArm5A.position.set(x, 22.0, line5Z - 1.2);
        this.scene.add(dropArm5A);

        const dropArm5B = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.8), mastSteelMat);
        dropArm5B.position.set(x, 22.0, line5Z + 1.2);
        this.scene.add(dropArm5B);
      }
    }

    // Continuous Line-5 Box Girder (1110m length, X: -460 to +650, Z = -198, Y = 16.8m)
    const line5Girder = new THREE.Mesh(
      new THREE.BoxGeometry(1110, 1.25, 5.4),
      concreteMat
    );
    line5Girder.position.set(95, 16.8, line5Z);
    line5Girder.castShadow = true;
    this.scene.add(line5Girder);

    // Continuous Line-5 Dual Overhead Catenary Contact Wires
    [line5Z - 1.2, line5Z + 1.2].forEach((wireZ) => {
      const contactWire5 = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 1110, 6), wireMat);
      contactWire5.position.set(95, 21.6, wireZ);
      contactWire5.rotation.z = Math.PI / 2;
      this.scene.add(contactWire5);
    });

    // Dual Steel Track Rails (Line-5, East-West)
    [line5Z - 1.2, line5Z + 1.2].forEach((trackZ) => {
      [-0.45, 0.45].forEach((railOffsetZ) => {
        const rail5 = this.sharedBox(1110, 0.14, 0.12, railSteelMat, 95, 17.48, trackZ + railOffsetZ);
        this.scene.add(rail5);
      });
    });

    // =========================================================================
    // SECTION C: COMPLETE 2-TIER DHAKA MRT STATIONS, PORTAL PIERS & ESCALATORS
    // =========================================================================
    const concourseGlowMat = new THREE.MeshStandardMaterial({
      color: '#fef3c7',
      emissive: new THREE.Color('#fde68a'),
      emissiveIntensity: 0.45,
      roughness: 0.2,
    });
    const mrtGreenTrimMat = new THREE.MeshStandardMaterial({ color: '#059669', roughness: 0.35, metalness: 0.25 });
    const mrtRedTrimMat = new THREE.MeshStandardMaterial({ color: '#be123c', roughness: 0.35, metalness: 0.25 });
    const yellowLineMat = new THREE.MeshBasicMaterial({ color: '#facc15' });
    const trussSteelMat = new THREE.MeshStandardMaterial({ color: '#f8fafc', metalness: 0.65, roughness: 0.28 });
    const afcGateMat = new THREE.MeshStandardMaterial({ color: '#334155', metalness: 0.7, roughness: 0.3 });

    const line6Stations = [
      { nameBn: 'উত্তরা উত্তর ডিপো স্টেশন', nameEn: 'UTTARA NORTH DEPOT', sz: -1150, hasStairs: true },
      { nameBn: 'উত্তরা সেন্টার মেট্রো স্টেশন', nameEn: 'UTTARA CENTER METRO', sz: -850, hasStairs: true },
      { nameBn: 'উত্তরা উত্তর / পল্লবী স্টেশন', nameEn: 'UTTARA NORTH / PALLABI', sz: -530, hasStairs: true },
      { nameBn: 'মিরপুর-১০ ইন্টারচেঞ্জ স্টেশন', nameEn: 'MIRPUR-10 GRAND INTERCHANGE', sz: -175, hasStairs: true, isHub: true },
      { nameBn: 'ফার্মগেট মেট্রো স্টেশন', nameEn: 'FARMGATE CENTRAL STATION', sz: -15, hasStairs: true },
      { nameBn: 'শাহবাগ / টিএসসি স্টেশন', nameEn: 'SHAHBAGH / TSC STATION', sz: 160, hasStairs: true },
      { nameBn: 'মতিঝিল / কমলাপুর স্টেশন', nameEn: 'MOTIJHEEL BANK PLAZA', sz: 270, hasStairs: true },
      { nameBn: 'কমলাপুর রেল টার্মিনাল স্টেশন', nameEn: 'KAMALAPUR TERMINAL', sz: 450, hasStairs: true },
    ];

    line6Stations.forEach((st) => {
      // 1. Structural Twin-Column Concrete Portal Bents (Sidewalk X=-17.8 & Median X=-12.2, zero road obstruction)
      [-22, -7, 7, 22].forEach((bz) => {
        [-17.8, -12.2].forEach((px) => {
          const col = new THREE.Mesh(this.cylCache(0.72, 0.88, 12.6, 10), concreteMat);
          col.position.set(px, 6.3, st.sz + bz);
          this.scene.add(col);
          this.circleColliders.push({ x: px, z: st.sz + bz, radius: 0.92, tag: 'metro_station_pier' });
        });
        // Transverse concourse & platform cross-beams cantilevered cleanly over the station width
        this.scene.add(this.sharedBox(15.2, 0.9, 1.4, concreteMat, -10.5, 8.2, st.sz + bz));
        this.scene.add(this.sharedBox(15.8, 1.0, 1.6, concreteMat, -10.5, 12.3, st.sz + bz));
      });

      // 2. Hollow Walk-In Lower Ticket Concourse Level (Floor Y = 8.96m, Ceiling Y = 12.7m)
      // Floor slab + outer illuminated side bands + glazed curtain wall with doorway opening on West escalator side
      this.scene.add(this.sharedBox(14.2, 0.42, 58, concourseMat, -10.5, 8.75, st.sz));
      this.scene.add(this.sharedBox(1.8, 0.14, 54, concourseGlowMat, -10.5, 12.2, st.sz));
      const l6DirSign = st.sz === -175 ? 1 : -1;
      const l6LandCenterZ = (st.sz === -175 ? st.sz - 22 : st.sz + 22) + l6DirSign * 15.5;
      // Outer glass concourse walls (splitting around the open escalator entrance at l6LandCenterZ)
      [-3.45, -17.45].forEach((wx) => {
        if (wx < -10) {
          const zNorthMin = st.sz - 28.5;
          const zNorthMax = l6LandCenterZ - 2.0;
          if (zNorthMax > zNorthMin + 1) {
            this.scene.add(this.sharedBox(0.18, 2.9, zNorthMax - zNorthMin, glassMat, wx, 10.4, (zNorthMin + zNorthMax) * 0.5));
          }
          const zSouthMin = l6LandCenterZ + 2.0;
          const zSouthMax = st.sz + 28.5;
          if (zSouthMax > zSouthMin + 1) {
            this.scene.add(this.sharedBox(0.18, 2.9, zSouthMax - zSouthMin, glassMat, wx, 10.4, (zSouthMin + zSouthMax) * 0.5));
          }
        } else {
          this.scene.add(this.sharedBox(0.18, 2.9, 57, glassMat, wx, 10.4, st.sz));
        }
        this.scene.add(this.sharedBox(0.24, 0.48, 58.2, mrtGreenTrimMat, wx, 8.95, st.sz));
      });
      // Interior Ticket Vending Kiosks & AFC Smart Turnstiles inside Concourse Hall
      this.scene.add(this.sharedBox(1.2, 2.2, 3.6, mrtGreenTrimMat, -7.2, 10.05, st.sz));
      [-11.8, -11.8].forEach((tx, idx) => {
        this.scene.add(this.sharedBox(0.22, 1.05, 1.4, afcGateMat, tx, 9.48, st.sz + (idx === 0 ? -4 : 4)));
      });

      // Interior Concrete Escalator Stairway connecting Concourse Hall (Y=8.96) -> West Side Platform (Y=13.30)
      const intZ1 = st.sz - 8.5;
      const intZ2 = st.sz + 1.5;
      const intX = -15.4;
      for (let is = 0; is < 14; is++) {
        const ft = (is + 0.5) / 14;
        const step = new THREE.Mesh(this.boxCache(2.0, 0.24, 0.8), afcGateMat);
        step.position.set(intX, THREE.MathUtils.lerp(8.96, 13.28, ft) + 0.08, THREE.MathUtils.lerp(intZ1, intZ2, ft));
        this.scene.add(step);
      }

      // 3. Open Dual-Side Upper Train Platform Deck (Tracks open in center at X=-14.2..-10.2, Walkable West/East Platforms Y=13.30)
      this.scene.add(this.sharedBox(15.2, 0.52, 64, concourseMat, -10.5, 12.6, st.sz));
      this.scene.add(this.sharedBox(4.0, 0.44, 62, concourseMat, -15.9, 13.08, st.sz)); // West boarding platform (X: -17.9..-13.9)
      this.scene.add(this.sharedBox(5.6, 0.44, 62, concourseMat, -6.5, 13.08, st.sz));  // East boarding platform (X: -9.3..-3.7)

      // Curved Teal Vaulted Roof Canopy + 5 Steel Arch Trusses & Warm Ceiling LED Strips
      const canopy = new THREE.Mesh(
        new THREE.CylinderGeometry(8.6, 8.6, 65, 16, 1, false, 0, Math.PI).rotateX(Math.PI / 2),
        canopyMat
      );
      canopy.position.set(-10.5, 18.4, st.sz);
      this.scene.add(canopy);
      for (let rz = -26; rz <= 26; rz += 13) {
        const rib = new THREE.Mesh(
          new THREE.TorusGeometry(8.65, 0.2, 6, 16, Math.PI),
          trussSteelMat
        );
        rib.position.set(-10.5, 18.4, st.sz + rz);
        this.scene.add(rib);
      }
      this.scene.add(this.sharedBox(1.8, 0.14, 58, concourseGlowMat, -10.5, 17.8, st.sz));

      // Glass Curtain Wall Windows + Vertical Mullions along Platform Edges
      [-17.8, -3.2].forEach((wx) => {
        this.scene.add(this.sharedBox(0.2, 3.4, 62, glassMat, wx, 15.2, st.sz));
        for (let mz = -28; mz <= 28; mz += 7) {
          this.scene.add(this.sharedBox(0.28, 3.8, 0.28, mastSteelMat, wx, 15.2, st.sz + mz));
        }
      });

      // Platform Screen Doors (PSD), Tactile Lines & LED Train Arrival Boards
      [-14.2, -10.2].forEach((psdX) => {
        this.scene.add(this.sharedBox(0.12, 1.8, 56, psdGlassMat, psdX, 14.2, st.sz));
        this.scene.add(this.sharedBox(0.22, 0.04, 56, yellowLineMat, psdX + (psdX < -12 ? 0.35 : -0.35), 13.32, st.sz));
      });
      this.scene.add(this.sharedBox(3.6, 0.7, 0.25, new THREE.MeshBasicMaterial({ color: '#10b981' }), -10.5, 16.5, st.sz + 14));
      this.scene.add(this.sharedBox(3.6, 0.7, 0.25, new THREE.MeshBasicMaterial({ color: '#10b981' }), -10.5, 16.5, st.sz - 14));

      this.metroStationInteriors.push({
        concourseMinX: -17.6,
        concourseMaxX: -3.4,
        concourseMinZ: st.sz - 28.5,
        concourseMaxZ: st.sz + 28.5,
        concourseY: 8.96,
        platMinX: -17.8,
        platMaxX: -3.3,
        platMinZ: st.sz - 30.5,
        platMaxZ: st.sz + 30.5,
        platY: 13.30,
        inX1: intX,
        inZ1: intZ1,
        inY1: 8.96,
        inX2: intX,
        inZ2: intZ2,
        inY2: 13.30,
        inHalfW: 1.25,
      });

      // 4. Ground-Anchored West Sidewalk Entry Pavilion & Covered Escalator Bridge (Y = 0 -> Concourse Y = 9.0m)
      if (st.hasStairs) {
        // Offset Mirpur-10 stair pavilion cleanly north of EW road Z=-175 so road traffic is untouched
        const dirSign = st.sz === -175 ? 1 : -1;
        const stairBaseZ = st.sz === -175 ? st.sz - 22 : st.sz + 22;
        const kioskZ = stairBaseZ - dirSign * 3.4;
        const stairX = -20.2;
        const topZ = stairBaseZ + dirSign * 14;
        // Keep escalator axis straight along Z (zero lateral skew so step treads sit square!)
        const startPos = new THREE.Vector3(stairX, -0.04, stairBaseZ - dirSign * 0.9);
        const endPos = new THREE.Vector3(stairX, 8.95, topZ);
        const midPos = startPos.clone().add(endPos).multiplyScalar(0.5);
        const spanLen = startPos.distanceTo(endPos);

        const stairBridge = new THREE.Mesh(this.boxCache(2.8, 0.52, spanLen), concourseMat);
        stairBridge.position.copy(midPos).add(new THREE.Vector3(0, -0.12, 0));
        stairBridge.lookAt(endPos.clone().add(new THREE.Vector3(0, -0.12, 0)));
        this.scene.add(stairBridge);

        // Ground concrete plinth base under escalator bottom threshold
        this.scene.add(this.sharedBox(2.95, 0.65, 1.8, concreteMat, stairX, 0.32, stairBaseZ - dirSign * 0.55));

        // 20 Straight-Aligned 3D Escalator Treads + Twin Dark Steel Balustrades
        const escSteps = 20;
        for (let es = 0; es < escSteps; es++) {
          const ft = (es + 0.5) / escSteps;
          const sx = THREE.MathUtils.lerp(startPos.x, endPos.x, ft);
          const sy = THREE.MathUtils.lerp(0.22, endPos.y, ft);
          const sz = THREE.MathUtils.lerp(startPos.z, endPos.z, ft);
          const tread = new THREE.Mesh(this.boxCache(2.12, 0.22, 0.72), afcGateMat);
          tread.position.set(sx, sy + 0.06, sz);
          this.scene.add(tread);
        }
        [-1.18, 1.18].forEach((bx) => {
          const railBeam = new THREE.Mesh(this.boxCache(0.14, 0.95, spanLen), afcGateMat);
          railBeam.position.copy(midPos).add(new THREE.Vector3(bx, 0.72, 0));
          railBeam.lookAt(endPos.clone().add(new THREE.Vector3(bx, 0.72, 0)));
          this.scene.add(railBeam);
        });

        // Upper Walkable Concourse Landing Balcony + Glass Concourse Portal Doorway into Station
        const landCenterZ = topZ + dirSign * 1.5;
        this.scene.add(this.sharedBox(5.2, 0.42, 3.8, concourseMat, -19.4, 8.75, landCenterZ));
        // Outer guardrail along outer & end edges of landing balcony
        this.scene.add(this.sharedBox(0.12, 1.05, 3.8, trussSteelMat, -21.95, 9.48, landCenterZ));
        this.scene.add(this.sharedBox(5.2, 1.05, 0.12, trussSteelMat, -19.4, 9.48, landCenterZ + dirSign * 1.85));
        // Open Wide Walk-In Concourse Entrance Doorway Jambs + Overhead Header (clear walk-in opening!)
        [-1.55, 1.55].forEach((dz) => {
          this.scene.add(this.sharedBox(0.28, 2.8, 0.24, afcGateMat, -17.35, 10.35, landCenterZ + dz));
        });
        this.scene.add(this.sharedBox(0.36, 0.45, 3.4, mrtGreenTrimMat, -17.32, 11.75, landCenterZ));

        // Glass canopy starting past the kiosk roof lip up over the landing balcony
        const canopyStart = startPos.clone().lerp(endPos, 0.14);
        const canopyMid = canopyStart.clone().add(endPos).multiplyScalar(0.5);
        const canopyLen = canopyStart.distanceTo(endPos);
        const stairGlassTube = new THREE.Mesh(this.boxCache(3.0, 2.45, canopyLen), glassMat);
        stairGlassTube.position.copy(canopyMid).add(new THREE.Vector3(0, 1.5, 0));
        stairGlassTube.lookAt(endPos.clone().add(new THREE.Vector3(0, 1.5, 0)));
        this.scene.add(stairGlassTube);

        // Ground Entry Kiosk Pavilion with Turnstiles
        this.scene.add(this.sharedBox(4.4, 0.22, 5.4, concourseMat, stairX, 0.11, kioskZ));
        this.scene.add(this.sharedBox(4.8, 0.52, 5.6, mrtGreenTrimMat, stairX, 3.85, kioskZ));
        this.scene.add(this.sharedBox(4.9, 0.18, 5.7, trussSteelMat, stairX, 4.18, kioskZ));
        [-1.95, 1.95].forEach((ox) => {
          this.scene.add(this.sharedBox(0.32, 3.6, 5.2, concourseMat, stairX + ox, 1.9, kioskZ));
        });
        // Interior Turnstile Barrier Gates (walkable center lane!)
        [-1.05, 1.05].forEach((tx) => {
          this.scene.add(this.sharedBox(0.22, 1.05, 1.4, afcGateMat, stairX + tx, 0.65, kioskZ));
        });
        // Support column cleanly beneath upper landing balcony (never blocking stairs)
        const landCol = new THREE.Mesh(this.cylCache(0.42, 0.52, 8.6, 8), concreteMat);
        landCol.position.set(-19.5, 4.3, landCenterZ);
        this.scene.add(landCol);

        this.metroEscalators.push({
          x1: startPos.x,
          z1: startPos.z,
          y1: 0.22,
          x2: endPos.x,
          z2: endPos.z,
          y2: endPos.y + 0.08,
          halfWidth: 1.45,
          kioskX: stairX,
          kioskZ,
          kioskHalfX: 2.25,
          kioskHalfZ: 2.75,
          landMinX: -22.0,
          landMaxX: -16.8,
          landMinZ: landCenterZ - 1.9,
          landMaxZ: landCenterZ + 1.9,
          landY: 8.96,
        });
      }

      // Illuminated Station Bilingual Signboard Gantries (Both Ends + Street Facade)
      const signTex = createFlyoverGantryTexture(st.nameBn, st.nameEn, 'ঢাকা ম্যাস ট্রানজিট (MRT LINE-6)', 'DHAKA MASS TRANSIT CO. (DMTCL)');
      const signMatL6 = new THREE.MeshBasicMaterial({ map: signTex, side: THREE.DoubleSide });
      [-32.2, 32.2].forEach((dz) => {
        const sb = new THREE.Mesh(new THREE.PlaneGeometry(11.5, 2.5), signMatL6);
        sb.position.set(-10.5, 17.5, st.sz + dz);
        this.scene.add(sb);
      });
      const sideSignL6 = new THREE.Mesh(new THREE.PlaneGeometry(14, 2.4), signMatL6);
      sideSignL6.rotation.y = Math.PI / 2;
      sideSignL6.position.set(-18.1, 13.8, st.sz);
      this.scene.add(sideSignL6);
    });

    // Line-5 Stations: Complete 2-Tier Concourse, Portal Columns & Ground Access Escalators
    const line5Stations = [
      { nameBn: 'মিরপুর পশ্চিম মেট্রো স্টেশন', nameEn: 'MIRPUR WEST METRO (LINE-5)', sx: -380 },
      { nameBn: 'মহাখালী উত্তর / বনানী স্টেশন', nameEn: 'MOHAKHALI NORTH / BANANI', sx: 95 },
      { nameBn: 'গুলশান-২ ডিপ্লোম্যাটিক স্টেশন', nameEn: 'GULSHAN-2 DIPLOMATIC CIRCLE', sx: 260 },
      { nameBn: 'নতুন বাজার / গুলশান লিংক', nameEn: 'NATUN BAZAR / GULSHAN-2 LINK', sx: 430 },
    ];

    line5Stations.forEach((st) => {
      // 1. Structural Twin-Column Concrete Portal Bents anchored to y=0
      [-22, 0, 22].forEach((bx) => {
        [line5Z - 7.8, line5Z + 7.8].forEach((pz) => {
          const col5 = new THREE.Mesh(this.cylCache(0.75, 0.9, 16.5, 10), concreteMat);
          col5.position.set(st.sx + bx, 8.25, pz);
          this.scene.add(col5);
          this.circleColliders.push({ x: st.sx + bx, z: pz, radius: 0.92, tag: 'metro_station_pier' });
        });
        this.scene.add(this.sharedBox(1.5, 1.0, 16.6, concreteMat, st.sx + bx, 12.2, line5Z));
        this.scene.add(this.sharedBox(1.6, 1.1, 17.2, concreteMat, st.sx + bx, 16.3, line5Z));
      });

      // 2. Hollow Walk-In Lower Ticket Concourse Level (Floor Y = 12.86m)
      this.scene.add(this.sharedBox(58, 0.42, 14.0, concourseMat, st.sx, 12.65, line5Z));
      this.scene.add(this.sharedBox(54, 0.14, 1.8, concourseGlowMat, st.sx, 16.2, line5Z));
      [line5Z - 6.95, line5Z + 6.95].forEach((wz) => {
        this.scene.add(this.sharedBox(58.2, 0.48, 0.24, mrtRedTrimMat, st.sx, 12.95, wz));
      });
      // Interior staircase from Line-5 Concourse (Y=12.86) -> Platform (Y=17.55)
      const int5X1 = st.sx + 4;
      const int5X2 = st.sx + 14;
      const int5Z = line5Z - 4.4;
      for (let is = 0; is < 15; is++) {
        const ft = (is + 0.5) / 15;
        const step = new THREE.Mesh(this.boxCache(0.8, 0.24, 2.0), afcGateMat);
        step.position.set(THREE.MathUtils.lerp(int5X1, int5X2, ft), THREE.MathUtils.lerp(12.86, 17.55, ft) + 0.08, int5Z);
        this.scene.add(step);
      }

      // 3. Open Dual-Side Upper Train Platform Deck + Crimson Vaulted Canopy & Trusses
      this.scene.add(this.sharedBox(64, 0.52, 15.2, concourseMat, st.sx, 16.85, line5Z));
      this.scene.add(this.sharedBox(62, 0.44, 4.8, concourseMat, st.sx, 17.33, line5Z - 4.9));
      this.scene.add(this.sharedBox(62, 0.44, 4.8, concourseMat, st.sx, 17.33, line5Z + 4.9));

      this.metroStationInteriors.push({
        concourseMinX: st.sx - 28.5,
        concourseMaxX: st.sx + 28.5,
        concourseMinZ: line5Z - 7.0,
        concourseMaxZ: line5Z + 7.0,
        concourseY: 12.86,
        platMinX: st.sx - 30.5,
        platMaxX: st.sx + 30.5,
        platMinZ: line5Z - 7.4,
        platMaxZ: line5Z + 7.4,
        platY: 17.55,
        inX1: int5X1,
        inZ1: int5Z,
        inY1: 12.86,
        inX2: int5X2,
        inZ2: int5Z,
        inY2: 17.55,
        inHalfW: 1.25,
      });

      const canopy5 = new THREE.Mesh(
        new THREE.CylinderGeometry(8.6, 8.6, 65, 16, 1, false, 0, Math.PI).rotateZ(Math.PI / 2),
        mrtRedTrimMat
      );
      canopy5.position.set(st.sx, 22.4, line5Z);
      this.scene.add(canopy5);
      for (let rx = -26; rx <= 26; rx += 13) {
        const rib5 = new THREE.Mesh(
          new THREE.TorusGeometry(8.65, 0.2, 6, 16, Math.PI).rotateY(Math.PI / 2),
          trussSteelMat
        );
        rib5.position.set(st.sx + rx, 22.4, line5Z);
        this.scene.add(rib5);
      }

      [line5Z - 7.4, line5Z + 7.4].forEach((wz) => {
        this.scene.add(this.sharedBox(62, 3.4, 0.2, glassMat, st.sx, 19.4, wz));
      });
      [line5Z - 2.2, line5Z + 2.2].forEach((psdZ) => {
        this.scene.add(this.sharedBox(56, 1.8, 0.12, psdGlassMat, st.sx, 18.4, psdZ));
        this.scene.add(this.sharedBox(56, 0.04, 0.22, yellowLineMat, st.sx, 17.52, psdZ + (psdZ < line5Z ? 0.35 : -0.35)));
      });

      // 4. Ground-Anchored Entry Pavilion & Escalator Bridge on South Sidewalk (Z = line5Z - 10.5)
      const entryZ = line5Z - 10.5;
      const startP = new THREE.Vector3(st.sx - 17.4, -0.04, entryZ);
      const endP = new THREE.Vector3(st.sx - 6, 12.85, entryZ);
      const midP = startP.clone().add(endP).multiplyScalar(0.5);
      const span5 = startP.distanceTo(endP);
      const esc5 = new THREE.Mesh(this.boxCache(2.8, 0.52, span5), concourseMat);
      esc5.position.copy(midP).add(new THREE.Vector3(0, -0.12, 0));
      esc5.lookAt(endP.clone().add(new THREE.Vector3(0, -0.12, 0)));
      this.scene.add(esc5);

      this.scene.add(this.sharedBox(1.8, 0.65, 2.95, concreteMat, st.sx - 17.0, 0.32, entryZ));
      for (let es = 0; es < 22; es++) {
        const ft = (es + 0.5) / 22;
        const sx = THREE.MathUtils.lerp(startP.x, endP.x, ft);
        const sy = THREE.MathUtils.lerp(0.22, endP.y, ft);
        const sz = THREE.MathUtils.lerp(startP.z, endP.z, ft);
        const tread = new THREE.Mesh(this.boxCache(0.72, 0.22, 2.12), afcGateMat);
        tread.position.set(sx, sy + 0.06, sz);
        this.scene.add(tread);
      }

      // Upper Walkable Concourse Landing Balcony bridging South Sidewalk Escalator into open Line-5 Concourse Doorway
      const land5Z = (entryZ + (line5Z - 6.8)) * 0.5;
      this.scene.add(this.sharedBox(3.8, 0.42, 4.4, concourseMat, st.sx - 5.2, 12.65, land5Z));
      [-1.55, 1.55].forEach((dx) => {
        this.scene.add(this.sharedBox(0.24, 2.8, 0.28, afcGateMat, st.sx - 5.2 + dx, 14.25, line5Z - 6.85));
      });
      this.scene.add(this.sharedBox(3.4, 0.45, 0.36, mrtRedTrimMat, st.sx - 5.2, 15.65, line5Z - 6.82));

      const canopy5Start = startP.clone().lerp(endP, 0.14);
      const canopy5Mid = canopy5Start.clone().add(endP).multiplyScalar(0.5);
      const escGlass5 = new THREE.Mesh(this.boxCache(3.0, 2.45, canopy5Start.distanceTo(endP)), glassMat);
      escGlass5.position.copy(canopy5Mid).add(new THREE.Vector3(0, 1.5, 0));
      escGlass5.lookAt(endP.clone().add(new THREE.Vector3(0, 1.5, 0)));
      this.scene.add(escGlass5);
      this.scene.add(this.sharedBox(5.0, 0.22, 4.2, concourseMat, st.sx - 19.6, 0.11, entryZ));
      this.scene.add(this.sharedBox(5.2, 0.55, 4.6, mrtRedTrimMat, st.sx - 19.6, 3.85, entryZ));
      [-2.0, 2.0].forEach((oz) => {
        this.scene.add(this.sharedBox(4.4, 3.6, 0.3, concourseMat, st.sx - 19.6, 1.9, entryZ + oz));
      });

      this.metroEscalators.push({
        x1: startP.x,
        z1: startP.z,
        y1: 0.22,
        x2: endP.x,
        z2: endP.z,
        y2: endP.y + 0.08,
        halfWidth: 1.45,
        kioskX: st.sx - 19.6,
        kioskZ: entryZ,
        kioskHalfX: 2.55,
        kioskHalfZ: 2.15,
        landMinX: st.sx - 7.1,
        landMaxX: st.sx - 3.3,
        landMinZ: entryZ - 1.2,
        landMaxZ: line5Z - 6.6,
        landY: 12.86,
      });

      const signTex5 = createFlyoverGantryTexture(st.nameBn, st.nameEn, 'ঢাকা ম্যাস ট্রানজিট (MRT LINE-5)', 'DMTCL NORTHERN ROUTE');
      const signMat5 = new THREE.MeshBasicMaterial({ map: signTex5, side: THREE.DoubleSide });
      [-32.2, 32.2].forEach((dx) => {
        const sb5 = new THREE.Mesh(new THREE.PlaneGeometry(11.5, 2.5), signMat5);
        sb5.rotation.y = Math.PI / 2;
        sb5.position.set(st.sx + dx, 21.6, line5Z);
        this.scene.add(sb5);
      });
    });

    // Street-level MRT Station Ticket Gate Kiosks & Glowing Boarding Pads at EVERY METRO_STATIONS stop
    const metroPortalRingGeo = new THREE.RingGeometry(1.7, 2.3, 28);
    METRO_STATIONS.forEach((st) => {
      const accentHex = st.line === 'L5' ? '#f43f5e' : '#10b981';
      const ringMat = new THREE.MeshBasicMaterial({
        color: accentHex,
        transparent: true,
        opacity: 0.82,
        side: THREE.DoubleSide,
      });

      const kx = st.kioskX ?? st.x;
      const kz = st.kioskZ ?? st.z;

      // Glowing Boarding Ring right in front of the street Entry Kiosk Pavilion turnstiles
      const kioskRing = new THREE.Mesh(metroPortalRingGeo, ringMat);
      kioskRing.rotation.x = -Math.PI / 2;
      kioskRing.position.set(kx, 0.098, kz);
      this.scene.add(kioskRing);
      this.metroPortalRings.push(kioskRing);

      // Station center / viaduct boarding ring (clear of EW road intersections)
      if (Math.hypot(kx - st.x, kz - st.z) > 6 && st.id !== 'mrt_mirpur10') {
        const ring = new THREE.Mesh(metroPortalRingGeo, ringMat);
        ring.rotation.x = -Math.PI / 2;
        ring.position.set(st.x, 0.098, st.z);
        this.scene.add(ring);
        this.metroPortalRings.push(ring);
      }

      // Street Totem Pylon + Illuminated Signage outside the Entry Kiosk
      const boothX = st.line === 'L6' ? kx - 2.9 : kx + 3.2;
      const boothZ = st.line === 'L6' ? kz : kz - 2.6;

      const pylon = new THREE.Mesh(
        new THREE.BoxGeometry(0.95, 4.4, 0.95),
        new THREE.MeshStandardMaterial({ color: '#0f172a', metalness: 0.45, roughness: 0.35 })
      );
      pylon.position.set(boothX, 2.2, boothZ);
      this.scene.add(pylon);

      const canopyCap = new THREE.Mesh(
        new THREE.BoxGeometry(2.6, 0.48, 2.6),
        new THREE.MeshStandardMaterial({
          color: accentHex,
          emissive: new THREE.Color(accentHex),
          emissiveIntensity: 0.55,
          roughness: 0.25,
        })
      );
      canopyCap.position.set(boothX, 4.55, boothZ);
      this.scene.add(canopyCap);

      const signTex = createFlyoverGantryTexture(
        st.nameBn,
        st.nameEn,
        `মেট্রোরেল [E/F] • ${st.line === 'L5' ? 'লাইন-৫' : 'লাইন-৬'}`,
        `PRESS [E] OR [F] TO RIDE • ৳${st.fare}`
      );
      const portalSign = new THREE.Mesh(
        new THREE.BoxGeometry(2.8, 1.05, 0.22),
        new THREE.MeshBasicMaterial({ map: signTex })
      );
      portalSign.position.set(boothX, 3.4, boothZ + (st.line === 'L5' ? 0.6 : 0));
      if (st.line === 'L6') portalSign.rotation.y = Math.PI / 2;
      this.scene.add(portalSign);

      this.circleColliders.push({ x: boothX, z: boothZ, radius: 0.72, tag: 'metro_ticket_pylon' });
    });

    // =========================================================================
    // SECTION D: REALISTIC JAPANESE KAWASAKI 6-COACH METRO ROLLING STOCK
    // =========================================================================
    const createRealistic6CoachTrain = (lineType: 'line6' | 'line5') => {
      const trainGroup = new THREE.Group();

      const stainlessMat = new THREE.MeshStandardMaterial({
        color: '#e2e8f0',
        metalness: 0.82,
        roughness: 0.24,
      });
      const primaryStripeMat = new THREE.MeshBasicMaterial({
        color: lineType === 'line6' ? '#10b981' : '#e11d48',
      });
      const speedRibbonMat = new THREE.MeshBasicMaterial({
        color: lineType === 'line6' ? '#dc2626' : '#f59e0b',
      });
      const windowGlassMat = new THREE.MeshStandardMaterial({
        color: '#fef08a',
        emissive: '#fef08a',
        emissiveIntensity: 0.45,
        roughness: 0.1,
      });
      const darkGlassMat = new THREE.MeshStandardMaterial({
        color: '#0f172a',
        metalness: 0.9,
        roughness: 0.1,
      });
      const bogieMat = new THREE.MeshStandardMaterial({
        color: '#334155',
        metalness: 0.8,
        roughness: 0.4,
      });
      const pantographMat = new THREE.MeshStandardMaterial({
        color: '#dc2626',
        metalness: 0.9,
        roughness: 0.2,
      });

      // 6 Coaches: Length 11.6m each, total trainset length ~72m
      for (let c = 0; c < 6; c++) {
        const cz = (c - 2.5) * 12.0;
        const isLeadCar = c === 0;
        const isTailCar = c === 5;
        const hasPantograph = c === 1 || c === 4;

        const coachGroup = new THREE.Group();
        coachGroup.position.set(0, 0, cz);

        // Main Stainless Steel Car Body
        const body = new THREE.Mesh(new THREE.BoxGeometry(2.9, 2.9, 11.2), stainlessMat);
        body.position.set(0, 1.62, 0);
        body.castShadow = true;
        coachGroup.add(body);

        // Aerodynamic Sloped Cab Nose on Lead and Tail Cars
        if (isLeadCar || isTailCar) {
          const noseZ = isLeadCar ? -6.0 : 6.0;
          const nose = new THREE.Mesh(new THREE.BoxGeometry(2.7, 2.6, 1.4), stainlessMat);
          nose.position.set(0, 1.5, noseZ);
          coachGroup.add(nose);

          // Sloped Cockpit Windshield
          const windshield = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 1.2), darkGlassMat);
          windshield.position.set(0, 1.85, isLeadCar ? -6.72 : 6.72);
          if (isLeadCar) windshield.rotation.x = -0.32;
          else {
            windshield.rotation.y = Math.PI;
            windshield.rotation.x = -0.32;
          }
          coachGroup.add(windshield);

          // Digital LED Destination Display ("MRT LINE-6" / "MRT LINE-5")
          const destSign = new THREE.Mesh(
            new THREE.PlaneGeometry(1.6, 0.32),
            new THREE.MeshBasicMaterial({ color: '#f59e0b' })
          );
          destSign.position.set(0, 2.65, isLeadCar ? -6.72 : 6.72);
          if (isTailCar) destSign.rotation.y = Math.PI;
          coachGroup.add(destSign);

          // Headlights (Lead Car) or Tail Markers (Tail Car)
          [-0.85, 0.85].forEach((hx) => {
            const lightMesh = new THREE.Mesh(
              new THREE.CircleGeometry(0.14, 12),
              new THREE.MeshBasicMaterial({ color: isLeadCar ? '#fef08a' : '#ef4444' })
            );
            lightMesh.position.set(hx, 1.05, isLeadCar ? -6.72 : 6.72);
            if (isTailCar) lightMesh.rotation.y = Math.PI;
            coachGroup.add(lightMesh);
          });
        }

        // Primary Color Beltline & Red/Gold Speed Ribbon
        const stripe = new THREE.Mesh(new THREE.BoxGeometry(2.96, 0.42, 11.24), primaryStripeMat);
        stripe.position.set(0, 1.48, 0);
        coachGroup.add(stripe);

        const ribbon = new THREE.Mesh(new THREE.BoxGeometry(2.98, 0.12, 11.26), speedRibbonMat);
        ribbon.position.set(0, 1.22, 0);
        coachGroup.add(ribbon);

        // Side Passenger Windows with warm interior cabin lighting
        const winBand = new THREE.Mesh(new THREE.BoxGeometry(2.94, 0.85, 9.8), windowGlassMat);
        winBand.position.set(0, 2.12, 0);
        coachGroup.add(winBand);

        // 8 Passenger Entrance Doors (4 pairs per side) with yellow indicators
        [-3.6, -1.2, 1.2, 3.6].forEach((dz) => {
          [-1.48, 1.48].forEach((dx) => {
            const doorInd = new THREE.Mesh(new THREE.PlaneGeometry(0.12, 0.12), new THREE.MeshBasicMaterial({ color: '#facc15' }));
            doorInd.position.set(dx, 2.68, dz);
            doorInd.rotation.y = dx > 0 ? Math.PI / 2 : -Math.PI / 2;
            coachGroup.add(doorInd);
          });
        });

        // Dual Rooftop HVAC / Climate Control Pods
        [-2.8, 2.8].forEach((hz) => {
          const hvac = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.42, 2.6), stainlessMat);
          hvac.position.set(0, 3.25, hz);
          coachGroup.add(hvac);
        });

        // Articulated Diamond Pantograph on Cars 1 & 4 (Reaches up to contact wire at 4.2m)
        if (hasPantograph) {
          const pantoBase = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.16, 1.8), pantographMat);
          pantoBase.position.set(0, 3.16, 0);
          coachGroup.add(pantoBase);

          const armLower = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.2), pantographMat);
          armLower.position.set(0, 3.72, -0.32);
          armLower.rotation.x = 0.55;
          coachGroup.add(armLower);

          const armUpper = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.2), pantographMat);
          armUpper.position.set(0, 4.35, 0.32);
          armUpper.rotation.x = -0.55;
          coachGroup.add(armUpper);

          // Carbon Contact Collector Shoe Touching Overhead Wire
          const collectorShoe = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.06, 0.35), stainlessMat);
          collectorShoe.position.set(0, 4.88, 0);
          coachGroup.add(collectorShoe);
        }

        // Dual Bogie Wheel Trucks per Coach (front & rear axles)
        [-3.6, 3.6].forEach((bz) => {
          const bogieFrame = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.28, 2.6), bogieMat);
          bogieFrame.position.set(0, 0.32, bz);
          coachGroup.add(bogieFrame);

          [-0.8, 0.8].forEach((wz) => {
            [-1.15, 1.15].forEach((wx) => {
              const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.38, 0.16, 14), bogieMat);
              wheel.position.set(wx, 0.32, bz + wz);
              wheel.rotation.z = Math.PI / 2;
              coachGroup.add(wheel);
            });
          });
        });

        // Flexible Inter-Car Gangway Connection between Coaches
        if (c < 5) {
          const gangway = new THREE.Mesh(new THREE.BoxGeometry(2.1, 2.3, 0.82), new THREE.MeshStandardMaterial({ color: '#1e293b', roughness: 0.9 }));
          gangway.position.set(0, 1.48, 6.0);
          coachGroup.add(gangway);
        }

        trainGroup.add(coachGroup);
      }

      return trainGroup;
    };

    // Instantiate Trains:
    // MRT Line-6 Southbound Train
    this.metroTrainGroup = createRealistic6CoachTrain('line6');
    this.metroTrainGroup.position.set(-13.3, 13.2, -25);
    this.scene.add(this.metroTrainGroup);

    // MRT Line-6 Northbound Train
    this.metroTrainGroup2 = createRealistic6CoachTrain('line6');
    this.metroTrainGroup2.position.set(-11.1, 13.2, -550);
    this.metroTrainGroup2.rotation.y = Math.PI;
    this.scene.add(this.metroTrainGroup2);

    // MRT Line-5 Eastbound Train (Crossing Mirpur-10 at Y = 17.5m, moving East towards Purbachal)
    this.metroTrainLine5East = createRealistic6CoachTrain('line5');
    this.metroTrainLine5East.position.set(40, 17.48, -199.2);
    this.metroTrainLine5East.rotation.y = -Math.PI / 2; // Faces +X (Eastbound)
    this.scene.add(this.metroTrainLine5East);

    // MRT Line-5 Westbound Train (Moving West towards Mirpur West)
    this.metroTrainLine5West = createRealistic6CoachTrain('line5');
    this.metroTrainLine5West.position.set(280, 17.48, -196.8);
    this.metroTrainLine5West.rotation.y = Math.PI / 2; // Faces -X (Westbound)
    this.scene.add(this.metroTrainLine5West);

    // Express 6-Coach Trains reserved for real-time player Metro Rail Rides
    this.playerMetroTrainL6 = createRealistic6CoachTrain('line6');
    this.playerMetroTrainL6.visible = false;
    this.scene.add(this.playerMetroTrainL6);

    this.playerMetroTrainL5 = createRealistic6CoachTrain('line5');
    this.playerMetroTrainL5.visible = false;
    this.scene.add(this.playerMetroTrainL5);
  }

  private buildDistrictHighwaySigns() {
    const signs = [
      {
        x: 0,
        z: -24,
        titleBn: '↑ বনানী ও গুলশান | ← সংসদ ভবন ও ধানমন্ডি',
        titleEn: '↑ BANANI & GULSHAN | ← PARLIAMENT & DHANMONDI',
        sub: 'ফার্মগেট মোড় • FARMGATE METRO INTERSECTION',
      },
      {
        x: 0,
        z: 32,
        titleBn: '↓ শহীদ মিনার, পুরান ঢাকা ও সদরঘাট | → মতিঝিল',
        titleEn: '↓ SHAHEED MINAR, OLD DHAKA & SADARGHAT | → MOTIJHEEL',
        sub: 'কারওয়ান বাজার • KARWAN BAZAR',
      },
      {
        x: 220,
        z: -120,
        titleBn: '↑ গুলশান এভিনিউ | ↓ হাতিরঝিল সেতু',
        titleEn: '↑ GULSHAN AVE | ↓ HATIRJHEEL BRIDGE',
        sub: 'গুলশান লিংক রোড • GULSHAN LINK RD',
      },
      {
        x: -70,
        z: 140,
        titleBn: 'পুরান ঢাকা ঐতিহ্যবাহী এলাকা ও আহসান মঞ্জিল',
        titleEn: 'OLD DHAKA (CHAWKBAZAR & AHSAN MANZIL)',
        sub: 'সদরঘাট লঞ্চ টার্মিনাল সামনে • SADARGHAT AHEAD',
      },
    ];

    const poleMat = new THREE.MeshStandardMaterial({
      color: '#475569',
      metalness: 0.68,
      roughness: 0.35,
    });
    const cabinetMat = new THREE.MeshStandardMaterial({
      color: '#0f172a',
      metalness: 0.75,
      roughness: 0.32,
    });
    const gantryPlinthMat = new THREE.MeshStandardMaterial({
      color: '#cbd5e1',
      roughness: 0.85,
    });
    const gantryFloodMat = new THREE.MeshBasicMaterial({ color: '#fef9c3' });

    signs.forEach((s) => {
      const g = new THREE.Group();
      g.position.set(s.x, 0, s.z);

      // Twin Portal Columns outside traffic lanes with concrete foundation pedestals
      [-8.4, 8.4].forEach((px) => {
        const plinth = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.52, 0.8, 10), gantryPlinthMat);
        plinth.position.set(px, 0.4, 0);
        const col = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.28, 8.2, 10), poleMat);
        col.position.set(px, 4.1, 0);
        col.castShadow = true;
        g.add(plinth, col);
      });

      // Open Steel Lattice Overhead Truss Crossbeam (top & bottom chords + vertical struts)
      const trussBottom = new THREE.Mesh(new THREE.BoxGeometry(17.4, 0.22, 0.42), poleMat);
      trussBottom.position.set(0, 5.4, 0);
      const trussTop = new THREE.Mesh(new THREE.BoxGeometry(17.4, 0.22, 0.42), poleMat);
      trussTop.position.set(0, 7.85, 0);
      g.add(trussBottom, trussTop);
      for (let bx = -7.2; bx <= 7.2; bx += 2.4) {
        const strut = new THREE.Mesh(new THREE.BoxGeometry(0.14, 2.4, 0.32), poleMat);
        strut.position.set(bx, 6.62, 0);
        g.add(strut);
      }

      // Framed Aluminum Signboard Cabinet + Double-Sided High-Res RHD Highway Panels
      const cabinet = new THREE.Mesh(new THREE.BoxGeometry(14.8, 3.35, 0.34), cabinetMat);
      cabinet.position.set(0, 6.65, 0);
      cabinet.castShadow = true;
      g.add(cabinet);

      const tex = createHighwaySignTexture(s.titleBn, s.titleEn, s.sub);
      const signFaceMat = new THREE.MeshBasicMaterial({ map: tex });
      const frontBoard = new THREE.Mesh(new THREE.PlaneGeometry(14.4, 3.05), signFaceMat);
      frontBoard.position.set(0, 6.65, 0.18);
      const backBoard = new THREE.Mesh(new THREE.PlaneGeometry(14.4, 3.05), signFaceMat);
      backBoard.position.set(0, 6.65, -0.18);
      backBoard.rotation.y = Math.PI;
      g.add(frontBoard, backBoard);

      // Overhead Gooseneck LED Floodlights lighting the gantry signboard
      [-4.8, -1.6, 1.6, 4.8].forEach((lx) => {
        [1, -1].forEach((dir) => {
          const arm = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.95), poleMat);
          arm.position.set(lx, 8.42, dir * 0.48);
          const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.1, 0.2), gantryFloodMat);
          lamp.position.set(lx, 8.34, dir * 0.92);
          g.add(arm, lamp);
        });
      });

      this.scene.add(g);
    });
  }

  private buildMosqueLandmarks() {
    const locations = [
      { x: -95, z: 195 },
      { x: -145, z: -35 },
    ];

    locations.forEach(({ x, z }) => {
      const mosque = new THREE.Group();
      mosque.position.set(x, 0, z);

      const wallMat = new THREE.MeshStandardMaterial({
        color: '#f8fafc',
        roughness: 0.4,
      });
      const domeMat = new THREE.MeshStandardMaterial({
        color: '#0284c7',
        metalness: 0.3,
        roughness: 0.3,
      });
      const goldMat = new THREE.MeshStandardMaterial({
        color: '#facc15',
        metalness: 0.8,
        roughness: 0.2,
      });

      const hall = new THREE.Mesh(
        new THREE.BoxGeometry(16, 7.5, 12),
        wallMat
      );
      hall.position.set(0, 3.75, 0);
      hall.castShadow = true;
      mosque.add(hall);

      [-4.5, 0, 4.5].forEach((dx, idx) => {
        const radius = idx === 1 ? 3.2 : 2.3;
        const dome = new THREE.Mesh(
          new THREE.SphereGeometry(
            radius,
            16,
            12,
            0,
            Math.PI * 2,
            0,
            Math.PI / 2
          ),
          domeMat
        );
        dome.position.set(dx, 7.5, 0);
        mosque.add(dome);

        const finial = new THREE.Mesh(
          new THREE.CylinderGeometry(0.08, 0.14, 1.4, 8),
          goldMat
        );
        finial.position.set(dx, 7.5 + radius + 0.5, 0);
        mosque.add(finial);
      });

      [
        [-7.8, -5.8],
        [7.8, -5.8],
        [-7.8, 5.8],
        [7.8, 5.8],
      ].forEach(([mx, mz]) => {
        const minaret = new THREE.Mesh(
          new THREE.CylinderGeometry(0.65, 0.85, 16, 12),
          wallMat
        );
        minaret.position.set(mx, 8, mz);
        minaret.castShadow = true;
        mosque.add(minaret);

        const cap = new THREE.Mesh(
          new THREE.ConeGeometry(0.85, 2.2, 12),
          goldMat
        );
        cap.position.set(mx, 17, mz);
        mosque.add(cap);
      });

      this.scene.add(mosque);
      this.buildingColliders.push({
        minX: x - 8.5,
        maxX: x + 8.5,
        minZ: z - 6.5,
        maxZ: z + 6.5,
      });
    });
  }

  private buildPointsOfInterestMeshes() {
    POINTS_OF_INTEREST.forEach((poi) => {
      const ringColor =
        poi.type === 'safe_house'
          ? '#10b981'
          : poi.type === 'garage'
          ? '#3b82f6'
          : poi.type === 'police_box'
          ? '#ef4444'
          : '#f59e0b';

      const ring = new THREE.Mesh(
        new THREE.RingGeometry(2.1, 2.65, 24),
        new THREE.MeshBasicMaterial({ color: ringColor, side: THREE.DoubleSide })
      );
      ring.rotation.x = -Math.PI / 2;
      ring.position.set(poi.x, 0.14, poi.z);
      this.scene.add(ring);

      if (poi.type === 'tea_stall') {
        const stall = createStreetStallMesh('tea_stall');
        stall.position.set(poi.x + 2.5, 0, poi.z + 2.0);
        this.scene.add(stall);
        this.circleColliders.push({
          x: poi.x + 2.5,
          z: poi.z + 2.0,
          radius: 1.4,
          tag: 'tea_stall',
        });
      } else if (poi.type === 'fuchka_stall') {
        const stall = createStreetStallMesh('fuchka_stall');
        stall.position.set(poi.x - 2.5, 0, poi.z + 1.8);
        this.scene.add(stall);
        this.circleColliders.push({
          x: poi.x - 2.5,
          z: poi.z + 1.8,
          radius: 1.4,
          tag: 'fuchka_stall',
        });
      }
    });
  }

  // -------------------------------------------------------------------------
  // Shared resource caches. The city has thousands of small props; creating a
  // fresh material + geometry for each one pushed the scene to ~1900 materials
  // and 2500 geometries (1079 draw calls per frame). Reusing one geometry per
  // distinct size and one material per look lets three.js batch far more work
  // and cuts memory churn during loading.
  // -------------------------------------------------------------------------
  private geoCache = new Map<string, THREE.BufferGeometry>();
  private tracerGeo = new THREE.BoxGeometry(0.05, 0.05, 0.95);
  private tracerMatSingle = new THREE.MeshBasicMaterial({ color: '#fde047' });
  private tracerMatSpread = new THREE.MeshBasicMaterial({ color: '#fb923c' });
  private casingGeo = new THREE.CylinderGeometry(0.012, 0.012, 0.045, 8).rotateX(Math.PI / 2);
  private casingMat = new THREE.MeshStandardMaterial({
    color: '#eab308',
    metalness: 0.95,
    roughness: 0.22,
  });
  private smokeGeo = new THREE.SphereGeometry(0.09, 6, 6);
  private smokeMat = new THREE.MeshBasicMaterial({
    color: '#cbd5e1',
    transparent: true,
    opacity: 0.45,
    depthWrite: false,
  });
  private bulletHoleGeo = new THREE.CircleGeometry(0.055, 8).rotateX(-Math.PI / 2);
  private bulletHoleMat = new THREE.MeshBasicMaterial({
    color: '#0f172a',
    transparent: true,
    opacity: 0.88,
    depthWrite: false,
  });
  private coilGeo: THREE.BufferGeometry = new THREE.TorusGeometry(0.36, 0.055, 8, 16);
  private matCache = new Map<string, THREE.Material>();
  private texCache = new Map<string, THREE.Texture>();

  /** Box geometry cache keyed by rounded dimensions. */
  private boxCache(w: number, h: number, d: number): THREE.BufferGeometry {
    const key = `box|${w.toFixed(2)}|${h.toFixed(2)}|${d.toFixed(2)}`;
    let g = this.geoCache.get(key);
    if (!g) {
      g = new THREE.BoxGeometry(w, h, d);
      this.geoCache.set(key, g);
    }
    return g;
  }

  /** Cylinder geometry cache keyed by radius/height/segments. */
  private cylCache(
    rt: number,
    rb: number,
    h: number,
    seg = 12
  ): THREE.BufferGeometry {
    const key = `cyl|${rt.toFixed(2)}|${rb.toFixed(2)}|${h.toFixed(2)}|${seg}`;
    let g = this.geoCache.get(key);
    if (!g) {
      g = new THREE.CylinderGeometry(rt, rb, h, seg);
      this.geoCache.set(key, g);
    }
    return g;
  }

  /** Creates an isotropic water mesh with uniform UV tiling to prevent wave stretching artifacts. */
  private createIsotropicWaterMesh(
    w: number,
    d: number,
    mat: THREE.Material,
    tileMeters = 22
  ): THREE.Mesh {
    const geo = new THREE.PlaneGeometry(w, d);
    const uvs = geo.attributes.uv;
    const repeatU = w / tileMeters;
    const repeatV = d / tileMeters;
    for (let i = 0; i < uvs.count; i++) {
      uvs.setXY(i, uvs.getX(i) * repeatU, uvs.getY(i) * repeatV);
    }
    uvs.needsUpdate = true;
    const mesh = new THREE.Mesh(geo, mat);
    mesh.rotation.x = -Math.PI / 2;
    return mesh;
  }

  /**
   * Adds many copies of one geometry+material as a single InstancedMesh, so a
   * hundred identical bollards, railing posts or zebra stripes cost one draw
   * call instead of a hundred.
   */
  private addInstances(
    geo: THREE.BufferGeometry,
    mat: THREE.Material,
    transforms: Array<{ x: number; y: number; z: number; ry?: number }>,
    castShadow = false
  ): THREE.InstancedMesh | null {
    if (transforms.length === 0) return null;
    const inst = new THREE.InstancedMesh(geo, mat, transforms.length);
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const pos = new THREE.Vector3();
    const scale = new THREE.Vector3(1, 1, 1);
    transforms.forEach((t, i) => {
      pos.set(t.x, t.y, t.z);
      q.setFromAxisAngle(THREE.Object3D.DEFAULT_UP, t.ry ?? 0);
      m.compose(pos, q, scale);
      inst.setMatrixAt(i, m);
    });
    inst.instanceMatrix.needsUpdate = true;
    inst.castShadow = castShadow;
    inst.receiveShadow = false;
    this.scene.add(inst);
    return inst;
  }

  /** Convenience: a mesh using cached geometry, positioned in world space. */
  private sharedBox(
    w: number,
    h: number,
    d: number,
    mat: THREE.Material,
    x: number,
    y: number,
    z: number
  ): THREE.Mesh {
    const m = new THREE.Mesh(this.boxCache(w, h, d), mat);
    m.position.set(x, y, z);
    m.frustumCulled = true;
    return m;
  }

  private buildCityDistrictBuildings() {
    const brickBump = loadRealTexture('/textures/brick_bump.jpg', 2, 3, false);
    const dhakaRealFacadeTex = loadRealTexture(
      '/textures/dhaka_facade_realistic.jpg',
      2,
      3,
      true
    );
    const dhakaBrickTex = loadRealTexture(
      '/textures/brick_diffuse.jpg',
      3,
      4,
      true
    );

    const buildingBlocks: Array<{
      x: number;
      z: number;
      w: number;
      d: number;
      h: number;
      style: 'old_dhaka' | 'modern_glass' | 'residential' | 'commercial';
      color: string;
      signIndex?: number;
    }> = [
      // Farmgate & Karwan Bazar Dense Street-Lining Blocks (Right around Spawn!)
      { x: 26, z: 24, w: 18, d: 18, h: 26, style: 'commercial', color: '#f8fafc', signIndex: 0 },
      { x: -26, z: 24, w: 18, d: 16, h: 22, style: 'commercial', color: '#fef3c7', signIndex: 1 },
      { x: -26, z: -24, w: 18, d: 18, h: 24, style: 'residential', color: '#f1f5f9', signIndex: 2 },
      { x: 26, z: -24, w: 20, d: 18, h: 32, style: 'modern_glass', color: '#bae6fd', signIndex: 3 },
      { x: 26, z: 54, w: 18, d: 20, h: 24, style: 'commercial', color: '#e2e8f0', signIndex: 4 },
      { x: -26, z: 54, w: 18, d: 20, h: 22, style: 'residential', color: '#ffedd5', signIndex: 5 },
      { x: 26, z: -56, w: 18, d: 20, h: 28, style: 'commercial', color: '#f8fafc', signIndex: 6 },
      { x: -26, z: -56, w: 18, d: 20, h: 25, style: 'residential', color: '#fef9c3', signIndex: 7 },
      { x: 26, z: 84, w: 18, d: 18, h: 21, style: 'commercial', color: '#f1f5f9', signIndex: 1 },
      { x: -26, z: 84, w: 18, d: 18, h: 20, style: 'residential', color: '#fed7aa', signIndex: 2 },
      { x: 26, z: -88, w: 18, d: 18, h: 27, style: 'modern_glass', color: '#7dd3fc', signIndex: 3 },
      { x: -26, z: -88, w: 18, d: 18, h: 23, style: 'commercial', color: '#e2e8f0', signIndex: 4 },
      { x: 58, z: 24, w: 20, d: 18, h: 26, style: 'commercial', color: '#cbd5e1', signIndex: 4 },
      { x: -58, z: -24, w: 20, d: 18, h: 22, style: 'residential', color: '#fed7aa', signIndex: 5 },
      { x: 58, z: -24, w: 20, d: 18, h: 29, style: 'modern_glass', color: '#93c5fd', signIndex: 7 },
      { x: -58, z: 24, w: 20, d: 18, h: 23, style: 'commercial', color: '#fde68a', signIndex: 0 },
      { x: 92, z: 26, w: 20, d: 20, h: 26, style: 'commercial', color: '#cbd5e1', signIndex: 4 },
      { x: -92, z: -28, w: 22, d: 18, h: 21, style: 'residential', color: '#fed7aa', signIndex: 5 },

      // Farmgate Super Market & Commercial Towers
      { x: 38, z: -25, w: 26, d: 24, h: 28, style: 'commercial', color: '#f8fafc', signIndex: 0 },
      { x: -38, z: -24, w: 24, d: 22, h: 26, style: 'commercial', color: '#fef3c7', signIndex: 1 },
      { x: 42, z: 26, w: 30, d: 24, h: 25, style: 'commercial', color: '#e0f2fe', signIndex: 4 },
      { x: -44, z: 25, w: 28, d: 22, h: 32, style: 'modern_glass', color: '#0284c7', signIndex: 3 },
      { x: 38, z: -65, w: 22, d: 22, h: 24, style: 'commercial', color: '#fef9c3', signIndex: 6 },
      { x: -42, z: 65, w: 28, d: 26, h: 22, style: 'commercial', color: '#ffedd5', signIndex: 5 },
      { x: -47, z: 95, w: 26, d: 26, h: 38, style: 'modern_glass', color: '#0ea5e9', signIndex: 7 },
      { x: 55, z: 95, w: 26, d: 24, h: 36, style: 'commercial', color: '#cbd5e1', signIndex: 2 },
      { x: -48, z: -110, w: 28, d: 26, h: 34, style: 'modern_glass', color: '#38bdf8', signIndex: 3 },
      { x: 48, z: -110, w: 28, d: 26, h: 36, style: 'modern_glass', color: '#0284c7', signIndex: 5 },

      // Tejgaon & Bijoy Sarani Commercial / Industrial Towers
      { x: 78, z: -80, w: 28, d: 24, h: 30, style: 'modern_glass', color: '#0284c7', signIndex: 6 },
      { x: -78, z: -80, w: 26, d: 24, h: 28, style: 'residential', color: '#fed7aa', signIndex: 1 },
      { x: 78, z: -125, w: 30, d: 26, h: 35, style: 'commercial', color: '#f8fafc', signIndex: 4 },
      { x: -78, z: -125, w: 28, d: 24, h: 27, style: 'residential', color: '#e2e8f0', signIndex: 0 },
      { x: 110, z: -60, w: 28, d: 26, h: 32, style: 'modern_glass', color: '#0369a1', signIndex: 7 },
      { x: 110, z: 28, w: 32, d: 28, h: 38, style: 'modern_glass', color: '#1e3a8a', signIndex: 3 },
      { x: 110, z: 80, w: 28, d: 26, h: 30, style: 'commercial', color: '#e2e8f0', signIndex: 2 },

      // Karwan Bazar & Panthapath Media Centers
      { x: -68, z: 45, w: 26, d: 24, h: 30, style: 'commercial', color: '#fde68a', signIndex: 5 },
      { x: -68, z: -45, w: 26, d: 24, h: 28, style: 'residential', color: '#fef3c7', signIndex: 4 },
      { x: -110, z: 28, w: 30, d: 28, h: 35, style: 'modern_glass', color: '#0284c7', signIndex: 3 },
      { x: -110, z: -45, w: 28, d: 26, h: 26, style: 'commercial', color: '#cbd5e1', signIndex: 1 },
      { x: -110, z: 95, w: 32, d: 28, h: 42, style: 'modern_glass', color: '#0f766e', signIndex: 7 },

      // Old Dhaka (Puran Dhaka) Dense Heritage Blocks
      { x: -42, z: 125, w: 15, d: 15, h: 14, style: 'old_dhaka', color: '#fca5a5', signIndex: 0 },
      { x: -42, z: 150, w: 15, d: 16, h: 16, style: 'old_dhaka', color: '#fcd34d', signIndex: 2 },
      { x: -42, z: 215, w: 16, d: 16, h: 13, style: 'old_dhaka', color: '#fdba74', signIndex: 5 },
      { x: -42, z: 258, w: 16, d: 16, h: 15, style: 'old_dhaka', color: '#fde047', signIndex: 1 },
      { x: -98, z: 110, w: 16, d: 15, h: 13, style: 'old_dhaka', color: '#fb923c', signIndex: 3 },
      { x: -98, z: 148, w: 16, d: 15, h: 15, style: 'old_dhaka', color: '#f87171', signIndex: 4 },
      { x: -98, z: 221, w: 18, d: 15, h: 14, style: 'old_dhaka', color: '#fde047', signIndex: 0 },
      { x: -125, z: 115, w: 18, d: 16, h: 15, style: 'old_dhaka', color: '#fed7aa', signIndex: 2 },
      { x: -125, z: 155, w: 18, d: 16, h: 16, style: 'old_dhaka', color: '#fcd34d', signIndex: 5 },
      { x: -125, z: 205, w: 18, d: 16, h: 14, style: 'old_dhaka', color: '#fca5a5', signIndex: 6 },
      { x: 35, z: 135, w: 18, d: 18, h: 18, style: 'old_dhaka', color: '#fed7aa', signIndex: 4 },
      { x: 35, z: 198, w: 18, d: 16, h: 16, style: 'old_dhaka', color: '#fb923c', signIndex: 0 },
      { x: 35, z: 221, w: 20, d: 16, h: 16, style: 'commercial', color: '#cbd5e1', signIndex: 7 },

      // Motijheel Financial Skyscrapers
      { x: 145, z: 135, w: 24, d: 24, h: 46, style: 'modern_glass', color: '#1e40af', signIndex: 3 },
      { x: 145, z: 218, w: 22, d: 22, h: 42, style: 'modern_glass', color: '#0369a1', signIndex: 3 },
      { x: 265, z: 135, w: 24, d: 24, h: 52, style: 'modern_glass', color: '#0f172a', signIndex: 7 },
      { x: 265, z: 219, w: 22, d: 20, h: 38, style: 'commercial', color: '#94a3b8', signIndex: 1 },

      // Gulshan Avenue Glass Corporate Towers
      { x: 155, z: -140, w: 24, d: 22, h: 48, style: 'modern_glass', color: '#0284c7', signIndex: 3 },
      { x: 265, z: -140, w: 24, d: 24, h: 54, style: 'modern_glass', color: '#1e3a8a', signIndex: 5 },
      { x: 155, z: -220, w: 22, d: 22, h: 44, style: 'modern_glass', color: '#0d9488', signIndex: 6 },
      { x: 265, z: -220, w: 24, d: 22, h: 50, style: 'modern_glass', color: '#312e81', signIndex: 3 },

      // Banani Road 11 Boutique & Nightlife Blocks
      { x: -45, z: -135, w: 20, d: 18, h: 26, style: 'commercial', color: '#f43f5e', signIndex: 5 },
      { x: 45, z: -135, w: 20, d: 18, h: 28, style: 'commercial', color: '#fbbf24', signIndex: 2 },
      { x: -45, z: -220, w: 22, d: 18, h: 30, style: 'residential', color: '#e2e8f0', signIndex: 6 },
      { x: 45, z: -220, w: 20, d: 20, h: 32, style: 'modern_glass', color: '#06b6d4', signIndex: 1 },

      // Dhanmondi Residential & University Blocks
      { x: -130, z: 55, w: 20, d: 18, h: 22, style: 'residential', color: '#fed7aa', signIndex: 1 },
      { x: -130, z: -75, w: 22, d: 20, h: 24, style: 'residential', color: '#bbf7d0', signIndex: 2 },
      { x: -290, z: -45, w: 22, d: 22, h: 26, style: 'residential', color: '#e2e8f0', signIndex: 5 },
      { x: -290, z: 85, w: 22, d: 20, h: 22, style: 'residential', color: '#fde68a', signIndex: 0 },

      // Uttara Model Town Planned Sectors
      { x: -225, z: -215, w: 24, d: 22, h: 28, style: 'residential', color: '#ccfbf1', signIndex: 6 },
      { x: -285, z: -215, w: 24, d: 22, h: 30, style: 'commercial', color: '#e0e7ff', signIndex: 7 },
      { x: -225, z: -275, w: 24, d: 20, h: 26, style: 'residential', color: '#fef3c7', signIndex: 1 },

      // Airport Road Terminal & Flyover Surroundings
      { x: 85, z: -355, w: 36, d: 22, h: 24, style: 'modern_glass', color: '#38bdf8', signIndex: 7 },
      { x: 165, z: -355, w: 32, d: 22, h: 28, style: 'modern_glass', color: '#1d4ed8', signIndex: 3 },

      // Mirpur-10 & Sher-e-Bangla National Cricket Stadium Blocks
      { x: -440, z: -150, w: 34, d: 26, h: 32, style: 'commercial', color: '#3b82f6', signIndex: 6 },
      { x: -505, z: -151, w: 30, d: 24, h: 26, style: 'residential', color: '#fef08a', signIndex: 2 },
      { x: -440, z: -250, w: 36, d: 28, h: 36, style: 'commercial', color: '#10b981', signIndex: 1 },
      { x: -506, z: -250, w: 32, d: 26, h: 28, style: 'residential', color: '#fed7aa', signIndex: 5 },
      { x: -354, z: -250, w: 28, d: 24, h: 30, style: 'residential', color: '#e2e8f0', signIndex: 0 },

      // Purbachal 300ft Expressway & Food Hub
      { x: 607, z: -250, w: 38, d: 26, h: 28, style: 'modern_glass', color: '#06b6d4', signIndex: 7 },
      { x: 560, z: -250, w: 32, d: 24, h: 24, style: 'commercial', color: '#f59e0b', signIndex: 4 },
      { x: 609, z: -150, w: 34, d: 26, h: 26, style: 'commercial', color: '#ec4899', signIndex: 3 },
      { x: 560, z: -152, w: 30, d: 22, h: 22, style: 'residential', color: '#a7f3d0', signIndex: 1 },
      { x: 500, z: -250, w: 28, d: 24, h: 26, style: 'commercial', color: '#6366f1', signIndex: 6 },

      // Bashundhara R/A Surrounding Blocks (clear of Jamuna Future Park at X=520, Z=-385)
      { x: 380, z: -341, w: 32, d: 28, h: 34, style: 'commercial', color: '#e0e7ff', signIndex: 2 },
      { x: 602, z: -392, w: 28, d: 28, h: 38, style: 'modern_glass', color: '#38bdf8', signIndex: 3 },
      { x: 380, z: -400, w: 30, d: 26, h: 30, style: 'residential', color: '#fde68a', signIndex: 5 },

      // Uttara North & Metro Depot (Sector 18)
      { x: -140, z: -540, w: 36, d: 28, h: 32, style: 'modern_glass', color: '#0ea5e9', signIndex: 4 },
      { x: -220, z: -540, w: 32, d: 26, h: 28, style: 'residential', color: '#e2e8f0', signIndex: 0 },
      { x: -280, z: -540, w: 30, d: 24, h: 26, style: 'residential', color: '#bbf7d0', signIndex: 2 },
      { x: -142, z: -435, w: 32, d: 24, h: 30, style: 'commercial', color: '#f43f5e', signIndex: 6 },

      // Lalbagh Heritage & Chawkbazar Old Dhaka (kept north of Sadarghat riverfront Z = 285)
      { x: -145, z: 262, w: 26, d: 22, h: 22, style: 'old_dhaka', color: '#fb923c', signIndex: 5 },
      { x: -230, z: 262, w: 24, d: 20, h: 20, style: 'old_dhaka', color: '#fde047', signIndex: 1 },
      { x: -145, z: 212, w: 26, d: 22, h: 24, style: 'old_dhaka', color: '#f87171', signIndex: 4 },
      { x: -230, z: 212, w: 24, d: 20, h: 22, style: 'old_dhaka', color: '#fed7aa', signIndex: 2 },

      // Keraniganj & Buriganga South Bank Industrial & Garments (south of Keraniganj Highway Z = 460)
      { x: -43, z: 492, w: 34, d: 28, h: 24, style: 'commercial', color: '#64748b', signIndex: 0 },
      { x: 60, z: 492, w: 36, d: 28, h: 26, style: 'commercial', color: '#475569', signIndex: 3 },
      { x: -140, z: 494, w: 32, d: 26, h: 22, style: 'residential', color: '#cbd5e1', signIndex: 7 },
      { x: 140, z: 494, w: 32, d: 26, h: 22, style: 'residential', color: '#94a3b8', signIndex: 5 },
      { x: 34, z: 540, w: 40, d: 30, h: 24, style: 'commercial', color: '#334155', signIndex: 1 },
    ];

    const balconyMat = new THREE.MeshStandardMaterial({
      color: '#475569',
      roughness: 0.65,
      metalness: 0.3,
    });

    // Load Orthographic 3D Dhaka Architectural, Shopfront, Sidewalk & Skyline Skins
    const dhakaShopfrontTex = loadRealTexture(
      '/textures/dhaka_shopfront_arcade.jpg',
      1,
      1,
      true
    );
    const dhakaCommercialTex = loadRealTexture(
      '/textures/dhaka_commercial_tower.jpg',
      3,
      6,
      true
    );
    const dhakaOldCityTex = loadRealTexture(
      '/textures/dhaka_old_city_facade.jpg',
      3,
      5,
      true
    );
    const dhakaSidewalkTileTex = loadRealTexture(
      '/textures/dhaka_ground_sidewalk.jpg',
      24,
      24,
      true
    );

    // Shared per-style materials (one instance, reused by every building).
    const shopArcadeMat = new THREE.MeshStandardMaterial({
      map: dhakaShopfrontTex,
      roughness: 0.48,
      metalness: 0.12,
    });
    const oldArcadeMat = new THREE.MeshStandardMaterial({
      map: dhakaOldCityTex,
      roughness: 0.62,
      metalness: 0.06,
    });
    const sidewalkPlinthMat = new THREE.MeshStandardMaterial({
      map: dhakaSidewalkTileTex,
      roughness: 0.8,
    });
    const tankBlueMat = new THREE.MeshStandardMaterial({
      color: '#0284c7',
      roughness: 0.4,
    });
    const tankSlateMat = new THREE.MeshStandardMaterial({
      color: '#1e293b',
      roughness: 0.45,
    });
    const tankDarkMat = new THREE.MeshStandardMaterial({
      color: '#0369a1',
      roughness: 0.45,
    });
    const acUnitMat = new THREE.MeshStandardMaterial({
      map: createAcUnitTexture(),
      roughness: 0.5,
      metalness: 0.2,
    });

    const corniceMat = new THREE.MeshStandardMaterial({ color: '#334155', roughness: 0.55, metalness: 0.25 });
    const stoneTrimMat = new THREE.MeshStandardMaterial({ color: '#e2e8f0', roughness: 0.6 });
    const mullionDarkMat = new THREE.MeshStandardMaterial({ color: '#0f172a', metalness: 0.85, roughness: 0.22 });
    const awningMats = [
      new THREE.MeshStandardMaterial({ color: '#b91c1c', roughness: 0.72 }),
      new THREE.MeshStandardMaterial({ color: '#047857', roughness: 0.72 }),
      new THREE.MeshStandardMaterial({ color: '#1d4ed8', roughness: 0.72 }),
      new THREE.MeshStandardMaterial({ color: '#b45309', roughness: 0.72 }),
    ];
    const lobbyGlassMat = new THREE.MeshStandardMaterial({
      color: '#bae6fd',
      emissive: new THREE.Color('#fef08a'),
      emissiveIntensity: 0.28,
      metalness: 0.75,
      roughness: 0.12,
    });
    const btsSteelMat = new THREE.MeshStandardMaterial({ color: '#cbd5e1', metalness: 0.88, roughness: 0.25 });
    const aviationRedMat = new THREE.MeshBasicMaterial({ color: '#ff1744' });

    const balconyPositions = new Map<
      string,
      Array<{ x: number; y: number; z: number }>
    >();
    buildingBlocks.forEach((b, bIdx) => {
      // Proportional UV scaling so floor height & window width match real human scale across all heights
      const repX = Math.max(1, Math.round(b.w / 10));
      const repY = Math.max(1, Math.round(b.h / 12));
      const baseFacadeTex =
        b.style === 'old_dhaka'
          ? dhakaOldCityTex
          : b.style === 'commercial'
          ? dhakaCommercialTex
          : b.style === 'residential'
          ? dhakaRealFacadeTex
          : createBuildingFacadeTexture(b.style, b.color);

      let scaledTex = baseFacadeTex;
      if (b.style === 'modern_glass' || b.style === 'commercial') {
        const texKey = `ftex|${b.style}|${b.color}|${repX}x${repY}`;
        let cachedTex = this.texCache.get(texKey);
        if (!cachedTex) {
          cachedTex = baseFacadeTex.clone();
          cachedTex.wrapS = THREE.RepeatWrapping;
          cachedTex.wrapT = THREE.RepeatWrapping;
          cachedTex.repeat.set(repX, repY);
          cachedTex.needsUpdate = true;
          this.texCache.set(texKey, cachedTex);
        }
        scaledTex = cachedTex;
      }

      const tint =
        b.style === 'modern_glass' ||
        b.style === 'commercial' ||
        b.style === 'old_dhaka'
          ? '#ffffff'
          : b.color;
      let mat: THREE.Material;
      if (b.style === 'modern_glass') {
        const glassKey = `facade_glass|${b.color}|${repX}x${repY}|${b.x}_${b.z}`;
        let glassMat = this.matCache.get(glassKey) as THREE.MeshPhysicalMaterial | undefined;
        if (!glassMat) {
          const windowTex = createEmissiveWindowGridTexture(Math.abs(Math.round(b.x * 7 + b.z * 13)));
          glassMat = new THREE.MeshPhysicalMaterial({
            map: scaledTex,
            color: b.color || '#bae6fd',
            bumpMap: brickBump,
            bumpScale: 0.02,
            roughness: 0.08,
            metalness: 0.88,
            reflectivity: 0.95,
            clearcoat: 1.0,
            clearcoatRoughness: 0.04,
            emissive: new THREE.Color('#fef08a'),
            emissiveMap: windowTex,
            emissiveIntensity: 0.0,
          });
          this.matCache.set(glassKey, glassMat);
          this.buildingEmissiveMats.push(glassMat);
        }
        mat = glassMat;
      } else if (b.style === 'commercial') {
        const commKey = `facade_comm|${b.color}|${repX}x${repY}|${b.x}_${b.z}`;
        let commMat = this.matCache.get(commKey) as THREE.MeshStandardMaterial | undefined;
        if (!commMat) {
          const windowTex = createEmissiveWindowGridTexture(Math.abs(Math.round(b.x * 11 + b.z * 5)));
          commMat = new THREE.MeshStandardMaterial({
            map: scaledTex,
            color: tint,
            bumpMap: brickBump,
            bumpScale: 0.05,
            roughness: 0.35,
            metalness: 0.45,
            emissive: new THREE.Color('#fed7aa'),
            emissiveMap: windowTex,
            emissiveIntensity: 0.0,
          });
          this.matCache.set(commKey, commMat);
          this.buildingEmissiveMats.push(commMat);
        }
        mat = commMat;
      } else {
        const facadeKey = `facade|${b.style}|${tint}|${scaledTex.uuid}`;
        let stdMat = this.matCache.get(facadeKey) as THREE.MeshStandardMaterial | undefined;
        if (!stdMat) {
          stdMat = new THREE.MeshStandardMaterial({
            map: scaledTex,
            color: tint,
            bumpMap: brickBump,
            bumpScale: 0.07,
            roughness: 0.54,
            metalness: 0.16,
          });
          this.matCache.set(facadeKey, stdMat);
        }
        mat = stdMat;
      }

      // Main Tower Body + Concrete Podium Cornice & Stepped Upper Setback for tall towers
      const shaftH = b.h >= 34 ? b.h - 4.2 : b.h;
      const mesh = new THREE.Mesh(this.boxCache(b.w, shaftH, b.d), mat);
      mesh.position.set(b.x, shaftH / 2, b.z);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      this.scene.add(mesh);

      if (b.h >= 34) {
        const setW = b.w * 0.78;
        const setD = b.d * 0.78;
        const setMesh = new THREE.Mesh(this.boxCache(setW, 4.2, setD), mat);
        setMesh.position.set(b.x, shaftH + 2.1, b.z);
        setMesh.castShadow = true;
        this.scene.add(setMesh);
        this.scene.add(this.sharedBox(setW + 0.5, 0.45, setD + 0.5, corniceMat, b.x, b.h + 0.22, b.z));
      }

      // 3D Architectural Aluminum Mullions & Horizontal Spandrel Bands for Glass Towers
      if (b.style === 'modern_glass' && b.h >= 22) {
        const numFins = Math.floor(b.w / 4.8);
        for (let fi = -numFins / 2; fi <= numFins / 2; fi++) {
          const finX = b.x + fi * 4.8;
          this.scene.add(this.sharedBox(0.16, shaftH - 4.5, 0.24, mullionDarkMat, finX, (shaftH + 4.5) / 2, b.z + b.d / 2 + 0.1));
          this.scene.add(this.sharedBox(0.16, shaftH - 4.5, 0.24, mullionDarkMat, finX, (shaftH + 4.5) / 2, b.z - b.d / 2 - 0.1));
        }
        for (let sy = 9; sy < shaftH - 3; sy += 9.5) {
          this.scene.add(this.sharedBox(b.w + 0.26, 0.34, b.d + 0.26, corniceMat, b.x, sy, b.z));
        }
      } else {
        // Vertical architectural corner pilasters on commercial, residential & old_dhaka buildings
        [-b.w / 2, b.w / 2].forEach((cx) => {
          [-b.d / 2, b.d / 2].forEach((cz) => {
            this.scene.add(this.sharedBox(0.55, shaftH, 0.55, stoneTrimMat, b.x + cx, shaftH / 2, b.z + cz));
          });
        });
      }

      // Ground-Floor Authentic Dhaka Shopfront Arcade Skin + Podium Cornice + Shop Awnings & Lobby Vestibule
      const arcadeMat = b.style === 'old_dhaka' ? oldArcadeMat : shopArcadeMat;
      const groundArcade = this.sharedBox(b.w + 0.28, 4.1, b.d + 0.28, arcadeMat, b.x, 2.05, b.z);
      this.scene.add(groundArcade);
      // Heavy architectural floor cornice separating street retail from upper floors
      this.scene.add(this.sharedBox(b.w + 0.72, 0.42, b.d + 0.72, corniceMat, b.x, 4.28, b.z));

      // Street-facing shopfront awning canopy & illuminated lobby vestibule
      const faceZSign = b.z > 0 ? -1 : 1;
      if (b.style === 'modern_glass' || b.style === 'commercial') {
        const lobbyCanopy = this.sharedBox(Math.min(b.w * 0.44, 7.2), 0.26, 1.9, corniceMat, b.x, 3.8, b.z + faceZSign * (b.d / 2 + 0.95));
        const lobbyDoor = this.sharedBox(Math.min(b.w * 0.3, 4.4), 3.3, 0.2, lobbyGlassMat, b.x, 1.75, b.z + faceZSign * (b.d / 2 + 0.18));
        this.scene.add(lobbyCanopy, lobbyDoor);
      } else {
        const awningMat = awningMats[bIdx % awningMats.length];
        const awning = this.sharedBox(b.w * 0.76, 0.18, 1.55, awningMat, b.x, 3.65, b.z + faceZSign * (b.d / 2 + 0.78));
        awning.rotation.x = faceZSign * 0.24;
        this.scene.add(awning);
      }

      // Paved Dhaka Sidewalk Plinth around Building (ফুটপাতের টাইলস)
      const sidewalkPlinth = this.sharedBox(
        b.w + 3.6,
        0.24,
        b.d + 3.6,
        sidewalkPlinthMat,
        b.x,
        0.12,
        b.z
      );
      sidewalkPlinth.receiveShadow = true;
      this.scene.add(sidewalkPlinth);

      // Rooftop Parapet Wall Ledge (ছাদের রেলিং)
      const topRoofY = b.h;
      const parapetW = b.h >= 34 ? b.w * 0.78 + 0.4 : b.w + 0.4;
      const parapetD = b.h >= 34 ? b.d * 0.78 + 0.4 : b.d + 0.4;
      this.scene.add(this.sharedBox(parapetW, 0.85, parapetD, balconyMat, b.x, shaftH + 0.42, b.z));

      // 3D Protruding Dhaka Apartment Balconies (বারান্দা) cleanly above commercial signboards
      if (b.style !== 'modern_glass') {
        const balcStartY = b.signIndex !== undefined ? (b.h >= 18 ? 13.4 : 9.8) : 7.5;
        for (let fy = balcStartY; fy < shaftH - 2.5; fy += 3.8) {
          const key = (b.w * 0.72).toFixed(2);
          if (!balconyPositions.has(key)) balconyPositions.set(key, []);
          balconyPositions.get(key)!.push({
            x: b.x,
            y: fy,
            z: b.z + (b.z > 0 ? -b.d / 2 - 0.3 : b.d / 2 + 0.3),
          });
        }
      }

      // Varied Realistic Rooftops by Building Type & Height
      if (b.style === 'modern_glass' || b.h >= 36) {
        // Corporate Rooftop HVAC Chiller Units + Telecom Spire & Aviation Warning Light
        [-3.2, 3.2].forEach((hx) => {
          this.scene.add(this.sharedBox(2.4, 1.5, 3.6, corniceMat, b.x + hx, topRoofY + 0.95, b.z));
        });
        if (b.h >= 40) {
          const spire = new THREE.Mesh(this.cylCache(0.12, 0.28, 7.5, 8), btsSteelMat);
          spire.position.set(b.x, topRoofY + 3.75, b.z);
          const avLight = new THREE.Mesh(this.boxCache(0.45, 0.45, 0.45), aviationRedMat);
          avLight.position.set(b.x, topRoofY + 7.6, b.z);
          this.scene.add(spire, avLight);
          this.aviationBeacons.push(avLight);
        }
      } else {
        // Authentic Cylindrical Gazi/RFL Water Tanks on concrete pads + Stairwell Bulkhead (চিলেকোঠা)
        const tank1 = new THREE.Mesh(this.cylCache(1.15, 1.15, 2.3, 12), bIdx % 2 === 0 ? tankBlueMat : tankSlateMat);
        tank1.position.set(b.x + b.w * 0.22, topRoofY + 1.25, b.z - b.d * 0.2);
        const tank2 = new THREE.Mesh(this.cylCache(0.95, 0.95, 1.9, 12), tankDarkMat);
        tank2.position.set(b.x - b.w * 0.22, topRoofY + 1.05, b.z + b.d * 0.18);
        this.scene.add(tank1, tank2);

        const stairRoom = this.sharedBox(
          Math.min(b.w * 0.32, 4.0),
          2.6,
          Math.min(b.d * 0.32, 3.6),
          stoneTrimMat,
          b.x - b.w * 0.08,
          topRoofY + 1.3,
          b.z - b.d * 0.08
        );
        this.scene.add(stairRoom);

        // Mobile Telecom BTS Lattice Antenna Mast on every 4th commercial/residential rooftop
        if (bIdx % 4 === 0 && b.h >= 20) {
          const btsMast = new THREE.Mesh(this.cylCache(0.15, 0.28, 6.2, 6), btsSteelMat);
          btsMast.position.set(b.x + b.w * 0.25, topRoofY + 3.1, b.z + b.d * 0.2);
          this.scene.add(btsMast);
          this.scene.add(this.sharedBox(1.4, 0.85, 0.22, stoneTrimMat, b.x + b.w * 0.25, topRoofY + 5.6, b.z + b.d * 0.2));
        }
      }

      // AC Outdoor Units mounted on walls cleanly above commercial signboard tiers
      if (b.style !== 'modern_glass' && b.h >= 14) {
        const acStartY = b.signIndex !== undefined ? (b.h >= 18 ? 13.8 : 10.2) : 8.5;
        for (let fy = acStartY; fy < b.h - 4.0; fy += 5.2) {
          const acFront = this.sharedBox(1.1, 0.75, 0.45, acUnitMat, b.x + b.w * 0.28, fy, b.z + b.d / 2 + 0.24);
          this.scene.add(acFront);
          const acBack = this.sharedBox(1.1, 0.75, 0.45, acUnitMat, b.x - b.w * 0.28, fy, b.z - b.d / 2 - 0.24);
          this.scene.add(acBack);
        }
      }

      // Stacked Multi-Floor Bangla Commercial Signboards in Dark Anodized Lightbox Frames
      if (b.signIndex !== undefined) {
        const signW = Math.min(b.w * 0.86, 12.5);
        const bezelKey = 'sign_bezel_frame';
        let bezelMat = this.matCache.get(bezelKey) as THREE.MeshStandardMaterial | undefined;
        if (!bezelMat) {
          bezelMat = new THREE.MeshStandardMaterial({
            color: '#0f172a',
            metalness: 0.72,
            roughness: 0.34,
          });
          this.matCache.set(bezelKey, bezelMat);
        }

        [0, 1, 2].forEach((tier) => {
          if (tier === 2 && b.h < 18) return;
          const signTexIdx = (b.signIndex! + tier * 3) % 8;
          const signKey = `sign_face|${signTexIdx}`;
          let signMat = this.matCache.get(signKey) as THREE.MeshBasicMaterial | undefined;
          if (!signMat) {
            signMat = new THREE.MeshBasicMaterial({
              map: createBanglaSignTexture(signTexIdx),
            });
            this.matCache.set(signKey, signMat);
          }
          const signY = 4.0 + tier * 3.4;

          // Front-facing Lightbox Frame + Inset Graphic Face
          this.scene.add(
            this.sharedBox(signW + 0.36, 2.38, 0.28, bezelMat!, b.x, signY, b.z + b.d / 2 + 0.16)
          );
          const fFace = new THREE.Mesh(new THREE.PlaneGeometry(signW, 2.1), signMat);
          fFace.position.set(b.x, signY, b.z + b.d / 2 + 0.31);
          this.scene.add(fFace);

          // Back-facing Lightbox Frame + Inset Graphic Face
          this.scene.add(
            this.sharedBox(signW + 0.36, 2.38, 0.28, bezelMat!, b.x, signY, b.z - b.d / 2 - 0.16)
          );
          const bFace = new THREE.Mesh(new THREE.PlaneGeometry(signW, 2.1), signMat);
          bFace.position.set(b.x, signY, b.z - b.d / 2 - 0.31);
          bFace.rotation.y = Math.PI;
          this.scene.add(bFace);

          // Street-facing Side Lightbox Frame + Inset Graphic Face
          const sideW = Math.min(b.d * 0.82, 11.5);
          const sideX = b.x + (b.x > 0 ? -b.w / 2 - 0.16 : b.w / 2 + 0.16);
          const faceOffset = b.x > 0 ? -0.15 : 0.15;
          this.scene.add(this.sharedBox(0.28, 2.38, sideW + 0.36, bezelMat!, sideX, signY, b.z));
          const sFace = new THREE.Mesh(new THREE.PlaneGeometry(sideW, 2.1), signMat);
          sFace.position.set(sideX + faceOffset, signY, b.z);
          sFace.rotation.y = b.x > 0 ? -Math.PI / 2 : Math.PI / 2;
          this.scene.add(sFace);
        });
      }

      // 3D Illuminated Double-Sided Neon Blade Signs with Wall Brackets & Glowing Tube Rim
      if ((b.style === 'commercial' || b.style === 'modern_glass') && b.h >= 16) {
        const neonPresets = [
          { bn: 'ফার্মগেট ফার্মেসী ২৪/৭', en: 'FARMGATE PHARMACY', col: '#06b6d4', bg: '#030712' },
          { bn: 'হাজী বিরিয়ানি হাউস', en: 'HAJI BIRIYANI MOTIJHEEL', col: '#f59e0b', bg: '#180400' },
          { bn: 'সোনালী ব্যাংক এটিএম', en: 'SONALI BANK 24H ATM', col: '#10b981', bg: '#022c22' },
          { bn: 'রূপালী ক্যাফে ও রেস্তোরাঁ', en: 'RUPALI CAFE & RESTORA', col: '#ec4899', bg: '#1f0014' },
          { bn: 'স্টার কাবাব ও সুইটস', en: 'STAR KABAB DHAKA', col: '#ef4444', bg: '#1c0000' },
          { bn: 'গ্র্যান্ড প্লাজা শপিং', en: 'GRAND PLAZA ARCADE', col: '#a855f7', bg: '#090014' },
          { bn: 'মোবাইল ও গ্যাজেট পয়েন্ট', en: 'SMARTPHONE TECH LAB', col: '#38bdf8', bg: '#021526' },
        ];
        const np = neonPresets[Math.abs(Math.round(b.x * 3 + b.z * 7)) % neonPresets.length];
        const neonKey = `neon_face|${np.bn}|${np.col}`;
        let neonMat = this.matCache.get(neonKey) as THREE.MeshBasicMaterial | undefined;
        if (!neonMat) {
          const neonTex = createNeonSignTexture(np.bn, np.en, np.col, np.bg);
          neonMat = new THREE.MeshBasicMaterial({ map: neonTex });
          this.matCache.set(neonKey, neonMat);
        }
        const rimKey = `neon_rim|${np.col}`;
        let rimMat = this.matCache.get(rimKey) as THREE.MeshBasicMaterial | undefined;
        if (!rimMat) {
          rimMat = new THREE.MeshBasicMaterial({ color: np.col });
          this.matCache.set(rimKey, rimMat);
        }

        const sideDir = b.x >= 0 ? -1 : 1;
        const wallX = b.x + (sideDir * b.w) / 2;
        const cabinetCenterX = wallX + sideDir * 1.45;
        const sz = b.z + (b.z >= 0 ? b.d / 2 - 1.2 : -b.d / 2 + 1.2);
        const neonCabMat = new THREE.MeshStandardMaterial({ color: '#0f172a', metalness: 0.8, roughness: 0.28 });

        // Projecting Steel Lightbox Cabinet (2.5m wide x 1.35m tall x 0.24m thick) + Dual Neon Faces
        const cab = new THREE.Mesh(this.boxCache(2.5, 1.38, 0.24), neonCabMat);
        cab.position.set(cabinetCenterX, 5.85, sz);
        const faceN = new THREE.Mesh(new THREE.PlaneGeometry(2.38, 1.26), neonMat);
        faceN.position.set(cabinetCenterX, 5.85, sz + 0.125);
        const faceS = new THREE.Mesh(new THREE.PlaneGeometry(2.38, 1.26), neonMat);
        faceS.position.set(cabinetCenterX, 5.85, sz - 0.125);
        faceS.rotation.y = Math.PI;
        this.scene.add(cab, faceN, faceS);

        // Glowing 3D Neon Edge Tubes wrapping top/bottom/outer lip
        this.scene.add(this.sharedBox(2.56, 0.06, 0.28, rimMat, cabinetCenterX, 6.56, sz));
        this.scene.add(this.sharedBox(2.56, 0.06, 0.28, rimMat, cabinetCenterX, 5.14, sz));
        this.scene.add(this.sharedBox(0.06, 1.44, 0.28, rimMat, cabinetCenterX + sideDir * 1.26, 5.85, sz));

        // Dual Wall Mounting Steel Brackets + Diagonal Support Strut
        const bracketMat = new THREE.MeshStandardMaterial({ color: '#1e293b', metalness: 0.82, roughness: 0.28 });
        [5.35, 6.35].forEach((by) => {
          const arm = new THREE.Mesh(this.boxCache(0.45, 0.1, 0.14), bracketMat);
          arm.position.set(wallX + sideDir * 0.22, by, sz);
          this.scene.add(arm);
        });
        const tieRod = new THREE.Mesh(this.cylCache(0.03, 0.03, 1.7, 6), bracketMat);
        tieRod.position.set(wallX + sideDir * 0.85, 6.95, sz);
        tieRod.rotation.z = sideDir * -0.92;
        this.scene.add(tieRod);
      }

      this.buildingColliders.push({
        minX: b.x - b.w / 2 - 0.6,
        maxX: b.x + b.w / 2 + 0.6,
        minZ: b.z - b.d / 2 - 0.6,
        maxZ: b.z + b.d / 2 + 0.6,
      });
    });

    // Emit the deferred balconies as one instanced draw call per width class.
    balconyPositions.forEach((positions, widthKey) => {
      this.addInstances(
        this.boxCache(parseFloat(widthKey), 0.95, 1.15),
        balconyMat,
        positions
      );
    });

    // Authentic Dhaka Street Details: Black-and-White Striped Road Medians, Iron Divider Grilles,
    // Overhead Tangled Black Electric/Internet Cables with Pole Transformers, DMP Police Boxes & Biriyani Cauldrons
    this.buildAuthenticDhakaStreetInfrastructure();
    this.buildDhakaDistrictScenes();
    this.buildDistant3DSkyline();
    this.buildMohakhaliFlyover();
    this.buildFarmgateElevatedExpressway();
    this.buildMayorHanifFlyover();
    this.buildKurilFlyoverInterchange();
    this.buildDhakaFootOverBridges();
    this.buildMirpurCricketStadium();
    this.buildDhakaMegaShoppingMalls();
    this.buildJamunaFutureParkInterior();
    this.buildHatirjheelArchedBridgeAndPromenade();
    this.buildOldDhakaHeritageDistrict();
    this.buildPurbachalSmartCityAndExpressway();

    // Realistic Multi-Tiered Tropical Dhaka Trees: Krishnachura, Banyan, Radhachura & Coconut Palm
    const trunkMat = new THREE.MeshStandardMaterial({
      map: loadRealTexture('/textures/hardwood2_diffuse.jpg', 1, 3),
      color: '#38281d',
      roughness: 0.92,
    });
    const banyanBaseMat = new THREE.MeshStandardMaterial({
      color: '#1b4332',
      roughness: 0.88,
      flatShading: true,
    });
    const banyanMidMat = new THREE.MeshStandardMaterial({
      color: '#2d6a4f',
      roughness: 0.85,
      flatShading: true,
    });
    const banyanSunMat = new THREE.MeshStandardMaterial({
      color: '#40916c',
      roughness: 0.82,
      flatShading: true,
    });
    const krishnachuraGreenMat = new THREE.MeshStandardMaterial({
      color: '#1b4332',
      roughness: 0.88,
      flatShading: true,
    });
    const krishnachuraScarletMat = new THREE.MeshStandardMaterial({
      color: '#b91c1c',
      roughness: 0.85,
      flatShading: true,
    });
    const krishnachuraOrangeMat = new THREE.MeshStandardMaterial({
      color: '#c2410c',
      roughness: 0.85,
      flatShading: true,
    });
    const radhachuraYellowMat = new THREE.MeshStandardMaterial({
      color: '#eab308',
      roughness: 0.82,
      flatShading: true,
    });
    const radhachuraGreenMat = new THREE.MeshStandardMaterial({
      color: '#22c55e',
      roughness: 0.86,
      flatShading: true,
    });
    const palmTrunkMat = new THREE.MeshStandardMaterial({
      color: '#574636',
      roughness: 0.95,
      flatShading: true,
    });
    const palmFrondMat = new THREE.MeshStandardMaterial({
      color: '#15803d',
      roughness: 0.76,
      side: THREE.DoubleSide,
    });
    const palmCrownMat = new THREE.MeshStandardMaterial({
      color: '#166534',
      roughness: 0.8,
    });
    const coconutMat = new THREE.MeshStandardMaterial({
      color: '#713f12',
      roughness: 0.88,
    });

    const treeSpots = [
      // Dhanmondi Lake, Promenade & Park 32
      [-190, 10], [-190, 35], [-190, -15], [-152, 25], [-152, -10],
      [-215, 60], [-200, -30], [-235, 15], [-245, 45], [-175, 75],
      [-225, -60], [-210, 95], [-180, -50], [-160, 45], [-250, -10],
      // Hatirjheel Promenade & Waterfront
      [195, -25], [195, 15], [245, -25], [245, 15],
      [205, 55], [235, -55], [185, -45], [260, 35], [220, -75],
      [175, 65], [270, -15], [255, 80], [210, 110], [180, -95],
      // Central Farmgate, Airport Road & Manik Mia Avenue
      [-15, -145], [15, -145], [-15, -205], [15, -205],
      [-15, -95], [15, -95], [-15, 95], [15, 95],
      [18, 22], [-22, 22], [22, -22], [-22, -22],
      [-18, -45], [18, -45], [-18, 45], [18, 45],
      [-25, -270], [25, -270], [-25, -340], [25, -340],
      [-28, -420], [28, -420], [-28, -500], [28, -500],
      // Shahbagh, TSC & Curzon Hall Campus Greeneries
      [-35, 160], [35, 160], [-40, 210], [40, 210],
      [-50, 260], [50, 260], [-30, 294], [30, 294],
      // Gulshan Avenue & Banani Roadside
      [130, -120], [175, -120], [130, -180], [175, -180],
      [130, -260], [175, -260], [140, 160], [180, 160],
      // Old Dhaka Bahadur Shah Park & Sadarghat Ghat Edge
      [-45, 520], [45, 520], [-60, 580], [60, 580],
      [-35, 640], [35, 640], [-80, 500], [80, 500],
      // Mirpur & Purbachal Highway Medians
      [-210, -320], [-250, -320], [-210, -400], [-250, -400],
      [320, -220], [360, -220], [400, -220], [440, -220],
    ];

    treeSpots.forEach(([tx, tz], idx) => {
      this.circleColliders.push({
        x: tx,
        z: tz,
        radius: 0.65,
        tag: 'tree',
      });
      const tree = new THREE.Group();
      tree.position.set(tx, 0, tz);

      const treeVariety = idx % 4;

      if (treeVariety === 3) {
        // TROPICAL COCONUT / ROYAL PALM (নারকেল গাছ / সুপারি গাছ) — Smooth curved tapered trunk
        const trunkH = 7.35;
        const curveDir = (idx % 2 === 0 ? 1 : -1) * 0.95;
        const trunkGeo = new THREE.CylinderGeometry(0.14, 0.34, trunkH, 10, 14);
        const posAttr = trunkGeo.attributes.position;
        for (let vi = 0; vi < posAttr.count; vi++) {
          const vy = posAttr.getY(vi) + trunkH / 2;
          const t = Math.max(0, Math.min(1, vy / trunkH));
          // Natural smooth parabolic palm bend + subtle growth-ring ribs
          const bendX = curveDir * (t * t);
          const ribScale = 1 + 0.045 * Math.sin(t * Math.PI * 16);
          posAttr.setX(vi, posAttr.getX(vi) * ribScale + bendX);
          posAttr.setZ(vi, posAttr.getZ(vi) * ribScale);
        }
        trunkGeo.computeVertexNormals();
        const palmTrunkMesh = new THREE.Mesh(trunkGeo, palmTrunkMat);
        palmTrunkMesh.position.set(0, trunkH / 2, 0);
        palmTrunkMesh.castShadow = true;
        tree.add(palmTrunkMesh);

        const currX = curveDir;
        const currY = trunkH;

        // Green crownshaft cylinder
        const crownShaft = new THREE.Mesh(
          new THREE.CylinderGeometry(0.18, 0.19, 0.75, 8),
          palmCrownMat
        );
        crownShaft.position.set(currX, currY + 0.38, 0);
        tree.add(crownShaft);

        // Cluster of coconuts nestled below fronds
        for (let c = 0; c < 5; c++) {
          const cAngle = (c * Math.PI * 2) / 5;
          const nut = new THREE.Mesh(
            new THREE.DodecahedronGeometry(0.2, 1),
            coconutMat
          );
          nut.position.set(
            currX + Math.cos(cAngle) * 0.28,
            currY + 0.25,
            Math.sin(cAngle) * 0.28
          );
          nut.castShadow = true;
          tree.add(nut);
        }

        // Radiating ring of 10 arching drooping palm fronds
        const canopyGroup = new THREE.Group();
        canopyGroup.position.set(currX, currY + 0.72, 0);
        for (let f = 0; f < 10; f++) {
          const fAngle = (f * Math.PI * 2) / 10 + idx * 0.3;
          const frondMesh = new THREE.Mesh(
            new THREE.PlaneGeometry(0.65, 3.4),
            palmFrondMat
          );
          frondMesh.rotation.x = 0.65;
          frondMesh.rotation.y = fAngle;
          frondMesh.position.set(
            Math.cos(fAngle) * 1.35,
            -0.35,
            Math.sin(fAngle) * 1.35
          );
          frondMesh.castShadow = true;
          canopyGroup.add(frondMesh);
        }
        tree.add(canopyGroup);
        this.treeCanopies.push(canopyGroup);
      } else {
        // Standard hardwood trunk with natural taper & spreading boughs
        const trunk = new THREE.Mesh(
          new THREE.CylinderGeometry(0.32, 0.58, 3.4, 10),
          trunkMat
        );
        trunk.position.y = 1.7;
        trunk.castShadow = true;
        trunk.receiveShadow = true;
        tree.add(trunk);

        // 3 spreading structural boughs branching outward
        [
          { rotZ: 0.45, rotY: 0, y: 2.8, len: 1.8 },
          { rotZ: -0.42, rotY: 2.1, y: 2.9, len: 1.7 },
          { rotZ: 0.38, rotY: 4.2, y: 3.0, len: 1.9 },
        ].forEach((b) => {
          const bough = new THREE.Mesh(
            new THREE.CylinderGeometry(0.16, 0.28, b.len, 8),
            trunkMat
          );
          bough.position.y = b.y;
          bough.rotation.y = b.rotY;
          bough.rotation.z = b.rotZ;
          bough.castShadow = true;
          tree.add(bough);
        });

        const canopyGroup = new THREE.Group();

        if (treeVariety === 0) {
          // TROPICAL KRISHNACHURA (Royal Poinciana): Spreading flat umbrella canopy with scarlet floral blossoms
          const umbrella = new THREE.Mesh(
            new THREE.DodecahedronGeometry(2.8, 1),
            krishnachuraGreenMat
          );
          umbrella.scale.set(1.45, 0.48, 1.45);
          umbrella.position.set(0, 4.3, 0);
          umbrella.castShadow = true;
          umbrella.receiveShadow = true;
          canopyGroup.add(umbrella);

          // Side foliage lobes
          [
            [-1.5, 4.1, 0.6, 1.5],
            [1.4, 4.2, -0.7, 1.55],
            [0.2, 4.2, 1.4, 1.4],
          ].forEach(([lx, ly, lz, rad]) => {
            const lobe = new THREE.Mesh(
              new THREE.DodecahedronGeometry(rad, 1),
              krishnachuraGreenMat
            );
            lobe.scale.set(1.2, 0.5, 1.2);
            lobe.position.set(lx, ly, lz);
            lobe.castShadow = true;
            canopyGroup.add(lobe);
          });

          // Layer of delicate scarlet & orange floral blossom clusters across the top canopy surface
          [
            [0.3, 4.65, 0.4, 0.9, krishnachuraScarletMat],
            [-1.2, 4.5, 0.5, 0.85, krishnachuraOrangeMat],
            [1.1, 4.55, -0.6, 0.85, krishnachuraScarletMat],
            [-0.3, 4.6, -1.1, 0.8, krishnachuraOrangeMat],
          ].forEach(([fx, fy, fz, frad, fmat]) => {
            const blossom = new THREE.Mesh(
              new THREE.DodecahedronGeometry(frad as number, 1),
              fmat as THREE.Material
            );
            blossom.scale.set(1.15, 0.32, 1.15);
            blossom.position.set(fx as number, fy as number, fz as number);
            blossom.castShadow = true;
            canopyGroup.add(blossom);
          });
        } else if (treeVariety === 2) {
          // RADHACHURA (Golden Yellow Poinciana): Golden yellow blossoms & lush green foliage
          const umbrella = new THREE.Mesh(
            new THREE.DodecahedronGeometry(2.7, 1),
            radhachuraGreenMat
          );
          umbrella.scale.set(1.4, 0.5, 1.4);
          umbrella.position.set(0, 4.3, 0);
          umbrella.castShadow = true;
          canopyGroup.add(umbrella);

          // Bright golden yellow flower clusters
          [
            [0.2, 4.6, 0.3, 0.95],
            [-1.1, 4.45, 0.4, 0.85],
            [1.0, 4.5, -0.5, 0.85],
            [-0.2, 4.55, -1.0, 0.8],
          ].forEach(([fx, fy, fz, frad]) => {
            const blossom = new THREE.Mesh(
              new THREE.DodecahedronGeometry(frad, 1),
              radhachuraYellowMat
            );
            blossom.scale.set(1.15, 0.34, 1.15);
            blossom.position.set(fx, fy, fz);
            blossom.castShadow = true;
            canopyGroup.add(blossom);
          });
        } else {
          // MAJESTIC DHAKA BANYAN TREE (বটগাছ): Multi-tiered dense dome with aerial prop roots
          const tier1 = new THREE.Mesh(
            new THREE.DodecahedronGeometry(2.9, 1),
            banyanBaseMat
          );
          tier1.scale.set(1.4, 0.52, 1.4);
          tier1.position.set(0, 4.1, 0);
          tier1.castShadow = true;
          tier1.receiveShadow = true;
          canopyGroup.add(tier1);

          const tier2 = new THREE.Mesh(
            new THREE.DodecahedronGeometry(2.3, 1),
            banyanMidMat
          );
          tier2.scale.set(1.2, 0.55, 1.2);
          tier2.position.set(0.2, 5.1, -0.2);
          tier2.castShadow = true;
          canopyGroup.add(tier2);

          const tier3 = new THREE.Mesh(
            new THREE.DodecahedronGeometry(1.6, 1),
            banyanSunMat
          );
          tier3.scale.set(1.0, 0.6, 1.0);
          tier3.position.set(-0.1, 6.0, 0.1);
          tier3.castShadow = true;
          canopyGroup.add(tier3);

          // Hanging aerial prop roots
          [
            [-1.2, 0.8],
            [1.3, -0.6],
            [-0.4, -1.3],
          ].forEach(([rx, rz]) => {
            const propRoot = new THREE.Mesh(
              new THREE.CylinderGeometry(0.04, 0.04, 3.0, 6),
              trunkMat
            );
            propRoot.position.set(rx, 2.2, rz);
            tree.add(propRoot);
          });
        }

        tree.add(canopyGroup);
        this.treeCanopies.push(canopyGroup);
      }

      this.scene.add(tree);
    });
  }

  /**
   * District-level set dressing that makes each Dhaka neighbourhood legible at
   * a glance: the Karwan Bazar wholesale market, rows of waiting cycle
   * rickshaws, CNG queues, and the aerials and rooftop hoardings of Old Dhaka.
   */
  private buildDhakaDistrictScenes() {
    const awningMats = ['#0e7490', '#b91c1c', '#15803d', '#b45309'].map(
      (c) =>
        new THREE.MeshStandardMaterial({
          color: c,
          roughness: 0.82,
          side: THREE.DoubleSide,
        })
    );
    const stallWoodMat = new THREE.MeshStandardMaterial({
      color: '#8a5a2b',
      roughness: 0.88,
    });
    const crateMat = new THREE.MeshStandardMaterial({
      color: '#a16207',
      roughness: 0.75,
    });
    const rickshawBodyMat = new THREE.MeshStandardMaterial({
      color: '#0f766e',
      metalness: 0.3,
      roughness: 0.5,
    });
    const rickshawHoodMat = new THREE.MeshStandardMaterial({
      color: '#111827',
      roughness: 0.7,
    });
    const rickshawArtMat = new THREE.MeshStandardMaterial({
      color: '#e11d48',
      roughness: 0.6,
    });

    const terracottaMat = new THREE.MeshStandardMaterial({
      color: '#b45309',
      roughness: 0.85,
    });

    // --- 1. Karwan Bazar wholesale market: tarpaulin awnings over produce ---
    for (let i = 0; i < 9; i++) {
      const mx = -34 + (i % 3) * 7.5;
      const mz = 46 + Math.floor(i / 3) * 8;
      const stall = new THREE.Group();
      stall.position.set(mx, 0, mz);

      const counter = new THREE.Mesh(this.boxCache(3.2, 0.9, 2.2), stallWoodMat);
      counter.position.y = 0.45;
      counter.castShadow = true;
      stall.add(counter);

      // Sloped corrugated/tarpaulin canopy on four thin legs
      [[-1.4, -0.9], [1.4, -0.9], [-1.4, 0.9], [1.4, 0.9]].forEach(([px, pz]) => {
        const leg = new THREE.Mesh(this.boxCache(0.07, 2.4, 0.07), stallWoodMat);
        leg.position.set(px, 1.2, pz);
        stall.add(leg);
      });
      const awning = new THREE.Mesh(
        this.boxCache(3.6, 0.06, 2.8),
        awningMats[i % awningMats.length]
      );
      awning.position.y = 2.45;
      awning.rotation.x = 0.12;
      awning.castShadow = true;
      stall.add(awning);

      // Stacked produce crates on the counter
      for (let c = 0; c < 4; c++) {
        const crate = new THREE.Mesh(this.boxCache(0.6, 0.3, 0.45), crateMat);
        crate.position.set(-1.05 + c * 0.7, 1.05, 0);
        stall.add(crate);
      }

      this.scene.add(stall);
    }

    // --- 2. Cycle-rickshaw stands (রিকশা স্ট্যান্ড) waiting at kerbsides ---
    const standSpots: Array<[number, number, number]> = [
      [12.5, 30, 0], [12.5, 34.2, 0], [12.5, 38.4, 0],
      [-12.5, -30, Math.PI], [-12.5, -34.2, Math.PI],
      [-62, 172, Math.PI / 2], [-62, 176, Math.PI / 2],
      [40, 150, 0], [44, 150, 0],
    ];
    standSpots.forEach(([rx, rz, ry], ri) => {
      const r = new THREE.Group();
      r.position.set(rx, 0, rz);
      r.rotation.y = ry;

      // Passenger hood, seat body and rear bench
      const hood = new THREE.Mesh(
        this.cylCache(0.72, 0.72, 1.5, 10),
        rickshawHoodMat
      );
      hood.rotation.z = Math.PI / 2;
      hood.scale.set(1, 1, 0.62);
      hood.position.set(0, 1.45, -0.62);
      r.add(hood);

      const seat = new THREE.Mesh(this.boxCache(1.25, 0.5, 1.1), rickshawBodyMat);
      seat.position.set(0, 0.78, -0.45);
      r.add(seat);

      const back = new THREE.Mesh(this.boxCache(1.25, 0.9, 0.16), rickshawArtMat);
      back.position.set(0, 1.2, -1.0);
      r.add(back);

      // Three wheels: two rear, one front
      [-0.62, 0.62].forEach((wx) => {
        const w = new THREE.Mesh(this.cylCache(0.42, 0.42, 0.09, 12), rickshawHoodMat);
        w.rotation.z = Math.PI / 2;
        w.position.set(wx, 0.42, -0.35);
        r.add(w);
      });
      const front = new THREE.Mesh(this.cylCache(0.42, 0.42, 0.09, 12), rickshawHoodMat);
      front.rotation.z = Math.PI / 2;
      front.position.set(0, 0.42, 1.05);
      r.add(front);

      // Handlebar + saddle for the puller
      const bar = new THREE.Mesh(this.boxCache(0.8, 0.07, 0.07), rickshawBodyMat);
      bar.position.set(0, 1.05, 0.85);
      r.add(bar);
      const saddle = new THREE.Mesh(this.boxCache(0.34, 0.12, 0.5), rickshawHoodMat);
      saddle.position.set(0, 0.82, 0.45);
      r.add(saddle);

      this.scene.add(r);
    });

    // --- 3. CNG auto-rickshaw queue idling by the filling stations ---
    const cngGreen = new THREE.MeshStandardMaterial({
      color: '#15803d',
      metalness: 0.4,
      roughness: 0.35,
    });
    const cngGlass = new THREE.MeshPhysicalMaterial({
      color: '#0f172a',
      transparent: true,
      opacity: 0.45,
      roughness: 0.08,
      metalness: 0.2,
    });
    for (let i = 0; i < 4; i++) {
      const g = new THREE.Group();
      g.position.set(19 - i * 3.4, 0, 62);
      const cabin = new THREE.Mesh(this.boxCache(1.5, 1.25, 2.3), cngGreen);
      cabin.position.y = 0.95;
      cabin.castShadow = true;
      g.add(cabin);
      const wind = new THREE.Mesh(this.boxCache(1.42, 0.62, 0.06), cngGlass);
      wind.position.set(0, 1.28, 1.16);
      g.add(wind);
      [-0.78, 0.78].forEach((wx) => {
        const w = new THREE.Mesh(this.cylCache(0.3, 0.3, 0.16, 10), rickshawHoodMat);
        w.rotation.z = Math.PI / 2;
        w.position.set(wx, 0.3, 0.8);
        g.add(w);
        const w2 = w.clone();
        w2.position.z = -0.8;
        g.add(w2);
      });
      this.scene.add(g);
    }

    // --- 4. Old Dhaka rooftop hoardings & clay-pot stacks on shopfronts ---
    for (let i = 0; i < 5; i++) {
      const px = -84 + (i % 2) * 40;
      const pz = 128 + Math.floor(i / 2) * 42;
      // Stacked terracotta pots outside the potters' row (shared material)
      for (let s = 0; s < 5; s++) {
        const pot = new THREE.Mesh(this.cylCache(0.26, 0.16, 0.34, 8), terracottaMat);
        pot.position.set(px + (s % 3) * 0.5, 0.17 + Math.floor(s / 3) * 0.34, pz + (s % 2) * 0.45);
        this.scene.add(pot);
      }
    }
  }

  /**
   * 270+ Genuine 3D Distant Skyline Towers, Corporate High-Rises, Mechanical Crowns,
   * Rooftop Water Tanks & Blinking Red Aviation Obstruction Beacons.
   * Distributed geographically across Dhaka's real landmark districts:
   * Motijheel (Financial), Gulshan-1/2 & Banani (Diplomatic/Corporate), Tejgaon (Media/Ind),
   * Uttara (High-rise), Mirpur (Superblocks) & Keraniganj/Old Dhaka.
   */
  private buildDistant3DSkyline() {
    // Authentic Orthographic 3D Dhaka Architectural Skins & PBR Facades
    const dhakaCommercialTex = loadRealTexture(
      '/textures/dhaka_commercial_tower.jpg',
      2,
      4,
      true
    );
    const dhakaCommercialTexTall = loadRealTexture(
      '/textures/dhaka_commercial_tower.jpg',
      3,
      8,
      true
    );
    const dhakaFacadeTex = loadRealTexture(
      '/textures/dhaka_facade_realistic.jpg',
      2,
      4,
      true
    );
    const dhakaFacadeTexTall = loadRealTexture(
      '/textures/dhaka_facade_realistic.jpg',
      3,
      7,
      true
    );
    const dhakaOldCityTex = loadRealTexture(
      '/textures/dhaka_old_city_facade.jpg',
      2,
      3,
      true
    );
    const dhakaBrickTex = loadRealTexture(
      '/textures/brick_diffuse.jpg',
      3,
      5,
      true
    );
    const brickBump = loadRealTexture(
      '/textures/brick_bump.jpg',
      2,
      3,
      false
    );
    const dhakaShopfrontTex = loadRealTexture(
      '/textures/dhaka_shopfront_arcade.jpg',
      1,
      1,
      true
    );
    const dhakaSidewalkTileTex = loadRealTexture(
      '/textures/dhaka_ground_sidewalk.jpg',
      24,
      24,
      true
    );

    const glassTowerMat = new THREE.MeshStandardMaterial({
      map: dhakaCommercialTex,
      color: '#e0f2fe',
      metalness: 0.85,
      roughness: 0.16,
    });
    const darkGlassMat = new THREE.MeshStandardMaterial({
      map: dhakaCommercialTexTall,
      color: '#cbd5e1',
      metalness: 0.90,
      roughness: 0.12,
    });
    const tealGlassMat = new THREE.MeshStandardMaterial({
      map: dhakaCommercialTex,
      color: '#ccfbf1',
      metalness: 0.80,
      roughness: 0.18,
    });
    const modernSteelMat = new THREE.MeshStandardMaterial({
      map: dhakaCommercialTexTall,
      color: '#f8fafc',
      metalness: 0.65,
      roughness: 0.28,
    });
    const concreteTowerMat = new THREE.MeshStandardMaterial({
      map: dhakaFacadeTex,
      color: '#e2e8f0',
      roughness: 0.65,
      metalness: 0.12,
    });
    const warmStuccoMat = new THREE.MeshStandardMaterial({
      map: dhakaFacadeTexTall,
      color: '#ffedd5',
      roughness: 0.70,
    });
    const dhakaBrickMat = new THREE.MeshStandardMaterial({
      map: dhakaBrickTex,
      bumpMap: brickBump,
      bumpScale: 0.06,
      color: '#a37c68',
      roughness: 0.85,
    });
    const oldDhakaHeritageMat = new THREE.MeshStandardMaterial({
      map: dhakaOldCityTex,
      color: '#fef08a',
      roughness: 0.65,
    });
    const groundShopArcadeMat = new THREE.MeshStandardMaterial({
      map: dhakaShopfrontTex,
      roughness: 0.52,
      metalness: 0.1,
    });
    const sidewalkPlinthMat = new THREE.MeshStandardMaterial({
      map: dhakaSidewalkTileTex,
      roughness: 0.82,
    });
    const mechCrownMat = new THREE.MeshStandardMaterial({
      color: '#1e293b',
      metalness: 0.55,
      roughness: 0.45,
    });
    const balconyLedgeMat = new THREE.MeshStandardMaterial({
      color: '#475569',
      roughness: 0.65,
      metalness: 0.3,
    });
    const spireMat = new THREE.MeshStandardMaterial({
      color: '#f8fafc',
      metalness: 0.92,
      roughness: 0.2,
    });
    const gaziWaterTankMat = new THREE.MeshStandardMaterial({
      color: '#0284c7',
      roughness: 0.42,
    });
    const nationalTankMat = new THREE.MeshStandardMaterial({
      color: '#0369a1',
      roughness: 0.42,
    });
    const beaconMat = new THREE.MeshBasicMaterial({
      color: '#ff1744',
    });

    const beaconGeo = new THREE.SphereGeometry(0.85, 8, 6);

    let seedVal = 1971;
    const rnd = () => {
      seedVal = (seedVal * 9301 + 49297) % 233280;
      return seedVal / 233280;
    };

    const towerRings = [
      { minR: 85, maxR: 240, count: 95, baseH: 26, maxH: 60 },
      { minR: 240, maxR: 450, count: 125, baseH: 36, maxH: 95 },
      { minR: 450, maxR: 750, count: 140, baseH: 52, maxH: 140 },
      { minR: 750, maxR: 1150, count: 130, baseH: 68, maxH: 190 },
      { minR: 1150, maxR: 1600, count: 110, baseH: 80, maxH: 220 },
    ];

    towerRings.forEach((ring) => {
      for (let i = 0; i < ring.count; i++) {
        const angle = (i / ring.count) * Math.PI * 2 + (rnd() - 0.5) * 0.05;
        const radius = ring.minR + rnd() * (ring.maxR - ring.minR);
        const bx = Math.cos(angle) * radius;
        const bz = Math.sin(angle) * radius;

        const width = 22 + rnd() * 26;
        const depth = 22 + rnd() * 26;
        const maxExtent = Math.max(width, depth) * 0.72 + 13.5;

        // Keep all active road corridors and flyovers unobstructed across 5000m metropolitan grid
        const onNsRoad = [0, 14, -170, -380, -480, -580, -780, -950, 220, 440, 640, 840, 950, -70].some(
          (rx) => Math.abs(bx - rx) < maxExtent
        );
        const onEwRoad = [-1400, -1100, -850, -620, -460, -315, -175, 0, 175, 240, 285, 460, 620, 760, 800].some(
          (rz) => Math.abs(bz - rz) < maxExtent
        );
        // Keep Jamuna Future Park Mall & Plaza footprint completely unobstructed
        const onJamunaMall =
          bx + maxExtent > 455 && bx - maxExtent < 585 && bz + maxExtent > -432 && bz - maxExtent < -324;
        // Keep ALL rivers, lakes, and Sadarghat riverfront waterways completely free of skyline buildings
        const onWaterBody =
          (bz + maxExtent > 294 && bz - maxExtent < 456 && Math.abs(bx) < 925) || // Buriganga River
          (bx + maxExtent > 562 && bx - maxExtent < 618 && bz + maxExtent > -605 && bz - maxExtent < 105) || // Balu River
          (bx + maxExtent > 150 && bx - maxExtent < 290 && bz + maxExtent > -90 && bz - maxExtent < 80) || // Hatirjheel Lake
          (bx + maxExtent > -275 && bx - maxExtent < -175 && bz + maxExtent > -45 && bz - maxExtent < 95) || // Dhanmondi Lake
          (bx + maxExtent > 304 && bx - maxExtent < 396 && bz + maxExtent > -164 && bz - maxExtent < -36) || // Gulshan Lake
          (bx + maxExtent > -228 && bx - maxExtent < -132 && bz + maxExtent > -625 && bz - maxExtent < -455); // Uttara Lake
        if (onNsRoad || onEwRoad || onJamunaMall || onWaterBody) continue;

        let deg = ((angle * 180) / Math.PI) % 360;
        if (deg < 0) deg += 360;

        let style: 'motijheel' | 'gulshan' | 'tejgaon' | 'uttara' | 'mirpur' | 'old_dhaka';
        if (deg >= 115 && deg < 155) {
          style = 'motijheel';
        } else if (deg >= 25 && deg < 80) {
          style = 'gulshan';
        } else if (deg >= 80 && deg < 115) {
          style = 'tejgaon';
        } else if (deg >= 315 || deg < 25) {
          style = 'uttara';
        } else if (deg >= 225 && deg < 315) {
          style = 'mirpur';
        } else {
          style = 'old_dhaka';
        }

        let height = ring.baseH + rnd() * (ring.maxH - ring.baseH);

        if (style === 'motijheel' || style === 'gulshan') {
          height *= 1.25;
        }

        let facadeMat: THREE.Material;
        if (style === 'gulshan') {
          facadeMat = rnd() > 0.4 ? glassTowerMat : rnd() > 0.5 ? tealGlassMat : modernSteelMat;
        } else if (style === 'motijheel') {
          facadeMat = rnd() > 0.45 ? darkGlassMat : rnd() > 0.5 ? concreteTowerMat : modernSteelMat;
        } else if (style === 'old_dhaka') {
          facadeMat = rnd() > 0.5 ? oldDhakaHeritageMat : dhakaBrickMat;
        } else if (style === 'mirpur') {
          facadeMat = rnd() > 0.5 ? warmStuccoMat : dhakaBrickMat;
        } else {
          facadeMat = rnd() > 0.5 ? warmStuccoMat : concreteTowerMat;
        }

        const towerMesh = this.sharedBox(width, height, depth, facadeMat, bx, height / 2, bz);
        towerMesh.rotation.y = angle + (rnd() - 0.5) * 0.4;
        towerMesh.castShadow = ring.minR <= 450;
        towerMesh.receiveShadow = true;
        this.scene.add(towerMesh);

        // Ground-Floor Dhaka Shopfront Arcade & Raised Sidewalk Plinth for street-facing buildings
        if (ring.minR <= 450) {
          const groundArcade = this.sharedBox(
            width + 0.26,
            4.1,
            depth + 0.26,
            groundShopArcadeMat,
            bx,
            2.05,
            bz
          );
          groundArcade.rotation.y = towerMesh.rotation.y;
          this.scene.add(groundArcade);

          const podiumCornice = this.sharedBox(
            width + 0.65,
            0.38,
            depth + 0.65,
            mechCrownMat,
            bx,
            4.25,
            bz
          );
          podiumCornice.rotation.y = towerMesh.rotation.y;
          this.scene.add(podiumCornice);

          const sidewalkPlinth = this.sharedBox(
            width + 3.2,
            0.24,
            depth + 3.2,
            sidewalkPlinthMat,
            bx,
            0.12,
            bz
          );
          sidewalkPlinth.rotation.y = towerMesh.rotation.y;
          sidewalkPlinth.receiveShadow = true;
          this.scene.add(sidewalkPlinth);

          // Authentic Bangla Shopfront Signboard in Lightbox Frame aligned to rotated tower facade
          const signIndex = Math.floor(rnd() * 8);
          const signTex = createBanglaSignTexture(signIndex);
          const signMat = new THREE.MeshBasicMaterial({ map: signTex });
          const signW = Math.min(width * 0.78, 12.5);
          const rotY = towerMesh.rotation.y;
          const offDist = depth / 2 + 0.18;
          const sx = bx + Math.sin(rotY) * offDist;
          const sz = bz + Math.cos(rotY) * offDist;

          const signFrame = this.sharedBox(signW + 0.34, 2.28, 0.26, mechCrownMat, sx, 4.2, sz);
          signFrame.rotation.y = rotY;
          const signFace = new THREE.Mesh(new THREE.PlaneGeometry(signW, 2.02), signMat);
          signFace.position.set(
            bx + Math.sin(rotY) * (offDist + 0.14),
            4.2,
            bz + Math.cos(rotY) * (offDist + 0.14)
          );
          signFace.rotation.y = rotY;
          this.scene.add(signFrame, signFace);
        }

        // Rooftop Parapet Ledge (ছাদের রেলিং) so buildings don't have razor-blade raw tops
        const parapet = this.sharedBox(
          width + 0.4,
          0.9,
          depth + 0.4,
          balconyLedgeMat,
          bx,
          height + 0.45,
          bz
        );
        parapet.rotation.y = towerMesh.rotation.y;
        this.scene.add(parapet);

        if (height > 36) {
          const tierW = width * 0.72;
          const tierD = depth * 0.72;
          const tierH = height * 0.24;
          const tierMat = style === 'gulshan' || style === 'motijheel' ? glassTowerMat : mechCrownMat;
          const tierMesh = this.sharedBox(tierW, tierH, tierD, tierMat, bx, height + tierH / 2, bz);
          tierMesh.rotation.y = towerMesh.rotation.y;
          this.scene.add(tierMesh);

          const crownH = 4.5 + rnd() * 3.5;
          const crownMesh = this.sharedBox(tierW * 0.6, crownH, tierD * 0.6, mechCrownMat, bx, height + tierH + crownH / 2, bz);
          crownMesh.rotation.y = towerMesh.rotation.y;
          this.scene.add(crownMesh);

          const totalRoofY = height + tierH + crownH;

          if (height > 62) {
            const spireH = 14 + rnd() * 20;
            const spire = new THREE.Mesh(this.cylCache(0.18, 0.45, spireH, 8), spireMat);
            spire.position.set(bx, totalRoofY + spireH / 2, bz);
            this.scene.add(spire);

            const beacon = new THREE.Mesh(beaconGeo, beaconMat);
            beacon.position.set(bx, totalRoofY + spireH, bz);
            this.scene.add(beacon);
            this.aviationBeacons.push(beacon);
          } else {
            const tankMat = rnd() > 0.5 ? gaziWaterTankMat : nationalTankMat;
            const tank = new THREE.Mesh(this.cylCache(1.5, 1.5, 2.4, 10), tankMat);
            tank.position.set(bx + (rnd() - 0.5) * (tierW * 0.3), totalRoofY + 1.2, bz + (rnd() - 0.5) * (tierD * 0.3));
            this.scene.add(tank);
          }
        } else {
          const tankMat = rnd() > 0.5 ? gaziWaterTankMat : nationalTankMat;
          const tank = new THREE.Mesh(this.cylCache(1.6, 1.6, 2.4, 12), tankMat);
          tank.position.set(bx, height + 1.2, bz);
          this.scene.add(tank);
        }

        if (ring.minR <= 1350) {
          const rot = towerMesh.rotation.y;
          const cosA = Math.abs(Math.cos(rot));
          const sinA = Math.abs(Math.sin(rot));
          const halfX = (width * cosA + depth * sinA) * 0.5;
          const halfZ = (width * sinA + depth * cosA) * 0.5;
          this.buildingColliders.push({
            minX: bx - halfX,
            maxX: bx + halfX,
            minZ: bz - halfZ,
            maxZ: bz + halfZ,
            minY: 0,
            maxY: height,
            tag: 'distant_skyline',
          });
        }
      }
    });
  }

  /**
   * Mohakhali Elevated Flyover (মহাখালী ফ্লাইওভার)
   * 4-lane elevated driveable highway spanning 680m east-west along Z = -175.
   * Elevation: Y = 9.6m (generous 8.4m vertical clearance over all ground streets and traffic)
   * 100m approach ramps on West (X: -340 to -240) and East (X: 240 to 340)
   * 480m main elevated deck (X: -240 to +240)
   * Dual concrete support piers, side crash safety barriers, overhead highway gantry signs.
   */
  private buildMohakhaliFlyover() {
    const deckMat = new THREE.MeshStandardMaterial({
      color: '#1e293b',
      roughness: 0.88,
    });
    const pierMat = new THREE.MeshStandardMaterial({
      color: '#94a3b8',
      roughness: 0.82,
    });
    const barrierMat = new THREE.MeshStandardMaterial({
      color: '#f1f5f9',
      roughness: 0.65,
    });
    const barrierYellowMat = new THREE.MeshStandardMaterial({
      color: '#eab308',
      roughness: 0.6,
    });
    const gantryFrameMat = new THREE.MeshStandardMaterial({
      color: '#0284c7',
      metalness: 0.75,
      roughness: 0.35,
    });
    const stripeWhiteMat = new THREE.MeshBasicMaterial({
      color: '#ffffff',
    });

    const flyoverZ = -175;
    const flyoverW = 13.6;
    const deckElev = 9.6;

    // 1. Main Elevated Span Deck (X: -240 to +240) at Y = 9.6m
    const mainDeck = this.sharedBox(480, 1.2, flyoverW, deckMat, 0, deckElev - 0.6, flyoverZ);
    mainDeck.receiveShadow = true;
    this.scene.add(mainDeck);

    // Elevated Deck Center Striping
    for (let x = -230; x <= 230; x += 12) {
      const stripe = this.sharedBox(6.5, 0.04, 0.28, stripeWhiteMat, x, deckElev + 0.03, flyoverZ);
      this.scene.add(stripe);
    }

    // 2. West Approach Ramp (Ascending from X = -340 to -240, top surface Y: 0 -> 9.6)
    const rampLen = 100;
    const rampSlopeAngle = Math.atan2(deckElev, rampLen);
    const westRamp = new THREE.Mesh(this.boxCache(100.5, 1.2, flyoverW), deckMat);
    westRamp.position.set(-290, deckElev * 0.5 - 0.6, flyoverZ);
    westRamp.rotation.z = rampSlopeAngle;
    westRamp.receiveShadow = true;
    this.scene.add(westRamp);

    // 3. East Approach Ramp (Descending from X = 240 to 340, top surface Y: 9.6 -> 0)
    const eastRamp = new THREE.Mesh(this.boxCache(100.5, 1.2, flyoverW), deckMat);
    eastRamp.position.set(290, deckElev * 0.5 - 0.6, flyoverZ);
    eastRamp.rotation.z = -rampSlopeAngle;
    eastRamp.receiveShadow = true;
    this.scene.add(eastRamp);

    // Solid Concrete Abutments under low-clearance ramp wedges (blocks ground traffic from entering low clearance underside)
    const mWestHead = this.sharedBox(1.6, 4.2, flyoverW, pierMat, -289, 2.1, flyoverZ);
    const mWestStep1 = this.sharedBox(16, 2.8, flyoverW - 0.2, pierMat, -298, 1.4, flyoverZ);
    const mWestStep2 = this.sharedBox(18, 1.4, flyoverW - 0.2, pierMat, -315, 0.7, flyoverZ);
    const mWestStep3 = this.sharedBox(14, 0.5, flyoverW - 0.2, pierMat, -331, 0.25, flyoverZ);
    this.scene.add(mWestHead, mWestStep1, mWestStep2, mWestStep3);
    this.buildingColliders.push({
      minX: -290.5,
      maxX: -288.5,
      minZ: flyoverZ - flyoverW / 2,
      maxZ: flyoverZ + flyoverW / 2,
      minY: 0,
      maxY: 4.5,
      tag: 'mohakhali_ramp_abutment_head',
    });

    const mEastHead = this.sharedBox(1.6, 4.2, flyoverW, pierMat, 289, 2.1, flyoverZ);
    const mEastStep1 = this.sharedBox(16, 2.8, flyoverW - 0.2, pierMat, 298, 1.4, flyoverZ);
    const mEastStep2 = this.sharedBox(18, 1.4, flyoverW - 0.2, pierMat, 315, 0.7, flyoverZ);
    const mEastStep3 = this.sharedBox(14, 0.5, flyoverW - 0.2, pierMat, 331, 0.25, flyoverZ);
    this.scene.add(mEastHead, mEastStep1, mEastStep2, mEastStep3);
    this.buildingColliders.push({
      minX: 288.5,
      maxX: 290.5,
      minZ: flyoverZ - flyoverW / 2,
      maxZ: flyoverZ + flyoverW / 2,
      minY: 0,
      maxY: 4.5,
      tag: 'mohakhali_ramp_abutment_head',
    });

    // 4. Solid Concrete Crash Barriers & Physics Colliders
    // 4.1 Main Elevated Span Crash Barriers (X: -240 to 240) at Y = 10.15
    const northBarrier = this.sharedBox(480, 1.15, 0.45, barrierMat, 0, deckElev + 0.55, flyoverZ - flyoverW / 2 + 0.22);
    this.scene.add(northBarrier);
    this.buildingColliders.push({
      minX: -240,
      maxX: 240,
      minZ: flyoverZ - flyoverW / 2 - 0.65,
      maxZ: flyoverZ - flyoverW / 2 + 0.65,
      minY: 8.5,
      maxY: 12.0,
      tag: 'flyover_barrier',
    });

    const southBarrier = this.sharedBox(480, 1.15, 0.45, barrierMat, 0, deckElev + 0.55, flyoverZ + flyoverW / 2 - 0.22);
    this.scene.add(southBarrier);
    this.buildingColliders.push({
      minX: -240,
      maxX: 240,
      minZ: flyoverZ + flyoverW / 2 - 0.65,
      maxZ: flyoverZ + flyoverW / 2 + 0.65,
      minY: 8.5,
      maxY: 12.0,
      tag: 'flyover_barrier',
    });

    // 4.2 West Ramp Sloped Barriers (X: -340 to -240) Following Incline
    [-flyoverW / 2 + 0.22, flyoverW / 2 - 0.22].forEach((oz) => {
      const bMesh = new THREE.Mesh(this.boxCache(100.5, 1.15, 0.45), barrierMat);
      bMesh.position.set(-290, deckElev * 0.5 - 0.02, flyoverZ + oz);
      bMesh.rotation.z = rampSlopeAngle;
      this.scene.add(bMesh);

      // Segmented height bounds so ground street beneath elevated sections is completely free
      const westRampSegs = [
        { minX: -340, maxX: -315, minY: 0.0, maxY: 3.2 },
        { minX: -315, maxX: -290, minY: 1.8, maxY: 5.6 },
        { minX: -290, maxX: -265, minY: 4.2, maxY: 8.0 },
        { minX: -265, maxX: -240, minY: 6.8, maxY: 10.8 },
      ];
      for (const seg of westRampSegs) {
        this.buildingColliders.push({
          minX: seg.minX,
          maxX: seg.maxX,
          minZ: flyoverZ + oz - 0.65,
          maxZ: flyoverZ + oz + 0.65,
          minY: seg.minY,
          maxY: seg.maxY,
          tag: 'flyover_barrier',
        });
      }
    });

    // 4.3 East Ramp Sloped Barriers (X: 240 to 340) Following Decline
    [-flyoverW / 2 + 0.22, flyoverW / 2 - 0.22].forEach((oz) => {
      const bMesh = new THREE.Mesh(this.boxCache(100.5, 1.15, 0.45), barrierMat);
      bMesh.position.set(290, deckElev * 0.5 - 0.02, flyoverZ + oz);
      bMesh.rotation.z = -rampSlopeAngle;
      this.scene.add(bMesh);

      const eastRampSegs = [
        { minX: 240, maxX: 265, minY: 6.8, maxY: 10.8 },
        { minX: 265, maxX: 290, minY: 4.2, maxY: 8.0 },
        { minX: 290, maxX: 315, minY: 1.8, maxY: 5.6 },
        { minX: 315, maxX: 340, minY: 0.0, maxY: 3.2 },
      ];
      for (const seg of eastRampSegs) {
        this.buildingColliders.push({
          minX: seg.minX,
          maxX: seg.maxX,
          minZ: flyoverZ + oz - 0.65,
          maxZ: flyoverZ + oz + 0.65,
          minY: seg.minY,
          maxY: seg.maxY,
          tag: 'flyover_barrier',
        });
      }
    });

    // Yellow hazard curb trims along main elevated deck barriers (stay within flat X: -232 to +232)
    for (let x = -232; x <= 232; x += 18) {
      const curbTrimN = this.sharedBox(8, 0.25, 0.25, barrierYellowMat, x, deckElev + 0.15, flyoverZ - flyoverW / 2 + 0.45);
      const curbTrimS = this.sharedBox(8, 0.25, 0.25, barrierYellowMat, x, deckElev + 0.15, flyoverZ + flyoverW / 2 - 0.45);
      this.scene.add(curbTrimN);
      this.scene.add(curbTrimS);
    }

    // 5. Dual Support Piers & Crossbeams along the ground (High clearance > 8.0m)
    for (let px = -228; px <= 228; px += 38) {
      if (Math.abs(px) < 18 || Math.abs(px - 220) < 18 || Math.abs(px + 170) < 18) continue;

      [-4.6, 4.6].forEach((pzOffset) => {
        const pier = new THREE.Mesh(this.cylCache(1.05, 1.25, deckElev - 0.6, 12), pierMat);
        pier.position.set(px, (deckElev - 0.6) / 2, flyoverZ + pzOffset);
        pier.castShadow = true;
        this.scene.add(pier);

        this.circleColliders.push({
          x: px,
          z: flyoverZ + pzOffset,
          radius: 1.35,
          tag: 'flyover_pier',
        });
      });

      const pierCap = this.sharedBox(2.6, 1.1, flyoverW + 0.8, pierMat, px, deckElev - 1.1, flyoverZ);
      pierCap.castShadow = true;
      this.scene.add(pierCap);
    }

    // 6. Overhead Directional Highway Sign Gantries
    // Gantry 1: Near West Approach (X = -110)
    const gantry1Group = new THREE.Group();
    gantry1Group.position.set(-110, deckElev, flyoverZ);
    [-flyoverW / 2 + 0.3, flyoverW / 2 - 0.3].forEach((gz) => {
      const leg = new THREE.Mesh(this.boxCache(0.35, 5.8, 0.35), gantryFrameMat);
      leg.position.set(0, 2.9, gz);
      gantry1Group.add(leg);
    });
    const gantry1Beam = new THREE.Mesh(this.boxCache(0.4, 0.5, flyoverW), gantryFrameMat);
    gantry1Beam.position.set(0, 5.8, 0);
    gantry1Group.add(gantry1Beam);

    const sign1Tex = createFlyoverGantryTexture(
      'বিমানবন্দর / উত্তরা / বনানী',
      'AIRPORT / UTTARA / BANANI',
      'মহাখালী বাস টার্মিনাল প্রস্থান',
      'MOHAKHALI BUS TERMINAL EXIT'
    );
    const sign1Board = new THREE.Mesh(
      new THREE.BoxGeometry(0.12, 2.4, 9.2),
      new THREE.MeshBasicMaterial({ map: sign1Tex })
    );
    sign1Board.position.set(-0.25, 4.2, 0);
    gantry1Group.add(sign1Board);
    this.scene.add(gantry1Group);

    // Gantry 2: Near East Approach (X = 110)
    const gantry2Group = new THREE.Group();
    gantry2Group.position.set(110, deckElev, flyoverZ);
    [-flyoverW / 2 + 0.3, flyoverW / 2 - 0.3].forEach((gz) => {
      const leg = new THREE.Mesh(this.boxCache(0.35, 5.8, 0.35), gantryFrameMat);
      leg.position.set(0, 2.9, gz);
      gantry2Group.add(leg);
    });
    const gantry2Beam = new THREE.Mesh(this.boxCache(0.4, 0.5, flyoverW), gantryFrameMat);
    gantry2Beam.position.set(0, 5.8, 0);
    gantry2Group.add(gantry2Beam);

    const sign2Tex = createFlyoverGantryTexture(
      'মিরপুর-১০ / ফার্মগেট',
      'MIRPUR-10 / FARMGATE',
      'গুলশান-২ বাণিজ্যিক এলাকা',
      'GULSHAN-2 COMMERCIAL EXIT'
    );
    const sign2Board = new THREE.Mesh(
      new THREE.BoxGeometry(0.12, 2.4, 9.2),
      new THREE.MeshBasicMaterial({ map: sign2Tex })
    );
    sign2Board.position.set(0.25, 4.2, 0);
    gantry2Group.add(sign2Board);
    this.scene.add(gantry2Group);
  }

  /**
   * Dhaka Elevated Expressway (ঢাকা এলিভেটেড এক্সপ্রেসওয়ে) at Farmgate & Central Spine
   * 4-lane elevated concrete expressway spanning 580m north-south along X = 14.
   * Elevation: Y = 9.2m (clearance 8.0m over ground streets & traffic)
   * On-ramp at Farmgate (Z: -120 to -40, X: 22 to 14)
   * Off-ramp at Farmgate (Z: 40 to 120, X: 14 to 22)
   * Supported by massive hammerhead piers, solid concrete Jersey crash safety barriers,
   * overhead highway gantry signboards, and high-mast LED street lamps.
   */
  private buildFarmgateElevatedExpressway() {
    const deckMat = new THREE.MeshStandardMaterial({
      color: '#1e293b',
      roughness: 0.88,
    });
    const pierMat = new THREE.MeshStandardMaterial({
      color: '#94a3b8',
      roughness: 0.82,
    });
    const barrierMat = new THREE.MeshStandardMaterial({
      color: '#f8fafc',
      roughness: 0.65,
    });
    const barrierYellowMat = new THREE.MeshStandardMaterial({
      color: '#eab308',
      roughness: 0.6,
    });
    const gantryFrameMat = new THREE.MeshStandardMaterial({
      color: '#0284c7',
      metalness: 0.75,
      roughness: 0.35,
    });
    const stripeWhiteMat = new THREE.MeshBasicMaterial({
      color: '#ffffff',
    });
    const lampLightMat = new THREE.MeshBasicMaterial({
      color: '#fef08a',
    });
    this.streetLampBasicMats.push(lampLightMat);

    const flyoverX = 14;
    const flyoverW = 14.2;
    const deckLen = 580; // Z: -340 to +240
    const deckElev = 16.2;

    // 1. Main Elevated Span Deck (Z: -340 to +240) at Y = 16.2 (Flying high above Mohakhali Flyover & Ground traffic)
    const mainDeck = this.sharedBox(flyoverW, 1.2, deckLen, deckMat, flyoverX, deckElev - 0.6, -50);
    mainDeck.receiveShadow = true;
    this.scene.add(mainDeck);

    // Elevated Deck Center Striping (dashed white lane lines)
    for (let z = -330; z <= 230; z += 14) {
      [-3.2, 0, 3.2].forEach((ox) => {
        const stripe = this.sharedBox(0.28, 0.04, 7.5, stripeWhiteMat, flyoverX + ox, deckElev + 0.03, z);
        this.scene.add(stripe);
      });
    }

    // 2. Farmgate Southbound On-Ramp (Z: -160 to -40, top surface Y: 0 -> 16.2)
    const rampLen = 120;
    const onRampSlopeAngle = Math.atan2(deckElev, rampLen);
    const onRampMesh = new THREE.Mesh(this.boxCache(8.4, 1.2, 120.5), deckMat);
    onRampMesh.position.set(18, deckElev * 0.5 - 0.6, -100);
    onRampMesh.rotation.x = -onRampSlopeAngle;
    onRampMesh.receiveShadow = true;
    this.scene.add(onRampMesh);

    // 3. Farmgate Northbound Exit Off-Ramp (Z: 40 to 160, top surface Y: 16.2 -> 0)
    const offRampMesh = new THREE.Mesh(this.boxCache(8.4, 1.2, 120.5), deckMat);
    offRampMesh.position.set(18, deckElev * 0.5 - 0.6, 100);
    offRampMesh.rotation.x = onRampSlopeAngle;
    offRampMesh.receiveShadow = true;
    this.scene.add(offRampMesh);

    // Solid Concrete Abutments under low-clearance ramp wedges (blocks ground traffic from wedging under descending decks)
    const offAbutHead = this.sharedBox(8.4, 4.8, 1.6, pierMat, 18, 2.4, 119);
    const offAbutStep1 = this.sharedBox(8.2, 3.2, 13, pierMat, 18, 1.6, 126);
    const offAbutStep2 = this.sharedBox(8.2, 1.8, 14, pierMat, 18, 0.9, 139);
    const offAbutStep3 = this.sharedBox(8.2, 0.6, 12, pierMat, 18, 0.3, 152);
    this.scene.add(offAbutHead, offAbutStep1, offAbutStep2, offAbutStep3);
    this.buildingColliders.push({
      minX: 13.8,
      maxX: 22.2,
      minZ: 118.0,
      maxZ: 120.0,
      minY: 0,
      maxY: 5.2,
      tag: 'farmgate_offramp_abutment_head',
    });
    this.buildingColliders.push({
      minX: 13.5,
      maxX: 14.3,
      minZ: 120.0,
      maxZ: 158.0,
      minY: 0,
      maxY: 2.2,
      tag: 'farmgate_offramp_abutment_side',
    });
    this.buildingColliders.push({
      minX: 21.7,
      maxX: 22.5,
      minZ: 120.0,
      maxZ: 158.0,
      minY: 0,
      maxY: 2.2,
      tag: 'farmgate_offramp_abutment_side',
    });

    const onAbutHead = this.sharedBox(8.4, 4.8, 1.6, pierMat, 18, 2.4, -119);
    const onAbutStep1 = this.sharedBox(8.2, 3.2, 13, pierMat, 18, 1.6, -126);
    const onAbutStep2 = this.sharedBox(8.2, 1.8, 14, pierMat, 18, 0.9, -139);
    const onAbutStep3 = this.sharedBox(8.2, 0.6, 12, pierMat, 18, 0.3, -152);
    this.scene.add(onAbutHead, onAbutStep1, onAbutStep2, onAbutStep3);
    this.buildingColliders.push({
      minX: 13.8,
      maxX: 22.2,
      minZ: -120.0,
      maxZ: -118.0,
      minY: 0,
      maxY: 5.2,
      tag: 'farmgate_onramp_abutment_head',
    });
    this.buildingColliders.push({
      minX: 13.5,
      maxX: 14.3,
      minZ: -158.0,
      maxZ: -120.0,
      minY: 0,
      maxY: 2.2,
      tag: 'farmgate_onramp_abutment_side',
    });
    this.buildingColliders.push({
      minX: 21.7,
      maxX: 22.5,
      minZ: -158.0,
      maxZ: -120.0,
      minY: 0,
      maxY: 2.2,
      tag: 'farmgate_onramp_abutment_side',
    });

    // 4. Solid Concrete Crash Barriers & Physics Colliders
    // 4.1 Continuous West Edge Crash Barrier (X = 7.12, Z: -340 to +240)
    const westBarrier = this.sharedBox(0.45, 1.25, deckLen, barrierMat, flyoverX - flyoverW / 2 + 0.22, deckElev + 0.62, -50);
    this.scene.add(westBarrier);
    this.buildingColliders.push({
      minX: 6.75,
      maxX: 7.55,
      minZ: -340,
      maxZ: 240,
      minY: 14.5,
      maxY: 19.5,
      tag: 'flyover_barrier',
    });

    // 4.2 East Edge Crash Barriers with Dedicated Openings for On-Ramp and Off-Ramp Merges
    // North Segment: Z: -340 to -160 (ahead of Farmgate on-ramp)
    const eastBarrierN = this.sharedBox(0.45, 1.25, 180, barrierMat, flyoverX + flyoverW / 2 - 0.22, deckElev + 0.62, -250);
    this.scene.add(eastBarrierN);
    this.buildingColliders.push({
      minX: 20.55,
      maxX: 21.35,
      minZ: -340,
      maxZ: -160,
      minY: 14.5,
      maxY: 19.5,
      tag: 'flyover_barrier',
    });

    // Middle Segment: Z: -40 to +40 (between on-ramp merge end and off-ramp diverge start)
    const eastBarrierM = this.sharedBox(0.45, 1.25, 80, barrierMat, flyoverX + flyoverW / 2 - 0.22, deckElev + 0.62, 0);
    this.scene.add(eastBarrierM);
    this.buildingColliders.push({
      minX: 20.55,
      maxX: 21.35,
      minZ: -40,
      maxZ: 40,
      minY: 14.5,
      maxY: 19.5,
      tag: 'flyover_barrier',
    });

    // South Segment: Z: 160 to 240 (past Farmgate off-ramp)
    const eastBarrierS = this.sharedBox(0.45, 1.25, 80, barrierMat, flyoverX + flyoverW / 2 - 0.22, deckElev + 0.62, 200);
    this.scene.add(eastBarrierS);
    this.buildingColliders.push({
      minX: 20.55,
      maxX: 21.35,
      minZ: 160,
      maxZ: 240,
      minY: 14.5,
      maxY: 19.5,
      tag: 'flyover_barrier',
    });

    // 4.3 Outer Guardrails for Farmgate On-Ramp & Off-Ramp
    const onRampOuterGuard = new THREE.Mesh(this.boxCache(0.45, 1.25, 120.5), barrierMat);
    onRampOuterGuard.position.set(22.0, deckElev * 0.5 + 0.02, -100);
    onRampOuterGuard.rotation.x = -onRampSlopeAngle;
    this.scene.add(onRampOuterGuard);

    const onRampSegs = [
      { minZ: -160, maxZ: -130, minY: 0.0, maxY: 5.0 },
      { minZ: -130, maxZ: -100, minY: 3.5, maxY: 9.0 },
      { minZ: -100, maxZ: -70, minY: 7.5, maxY: 13.0 },
      { minZ: -70, maxZ: -40, minY: 11.5, maxY: 17.5 },
    ];
    for (const seg of onRampSegs) {
      this.buildingColliders.push({
        minX: 21.6,
        maxX: 22.45,
        minZ: seg.minZ,
        maxZ: seg.maxZ,
        minY: seg.minY,
        maxY: seg.maxY,
        tag: 'flyover_barrier',
      });
    }

    const offRampOuterGuard = new THREE.Mesh(this.boxCache(0.45, 1.25, 120.5), barrierMat);
    offRampOuterGuard.position.set(22.0, deckElev * 0.5 + 0.02, 100);
    offRampOuterGuard.rotation.x = onRampSlopeAngle;
    this.scene.add(offRampOuterGuard);

    const offRampSegs = [
      { minZ: 40, maxZ: 70, minY: 11.5, maxY: 17.5 },
      { minZ: 70, maxZ: 100, minY: 7.5, maxY: 13.0 },
      { minZ: 100, maxZ: 130, minY: 3.5, maxY: 9.0 },
      { minZ: 130, maxZ: 160, minY: 0.0, maxY: 5.0 },
    ];
    for (const seg of offRampSegs) {
      this.buildingColliders.push({
        minX: 21.6,
        maxX: 22.45,
        minZ: seg.minZ,
        maxZ: seg.maxZ,
        minY: seg.minY,
        maxY: seg.maxY,
        tag: 'flyover_barrier',
      });
    }

    // 4.4 Terminal End Crash Barriers with Warning Reflectors
    const termNorth = this.sharedBox(flyoverW, 1.25, 0.45, barrierMat, flyoverX, deckElev + 0.62, -340);
    this.scene.add(termNorth);
    this.buildingColliders.push({
      minX: flyoverX - flyoverW / 2,
      maxX: flyoverX + flyoverW / 2,
      minZ: -341.0,
      maxZ: -339.0,
      minY: 14.5,
      maxY: 18.5,
      tag: 'flyover_barrier',
    });

    const termSouth = this.sharedBox(flyoverW, 1.25, 0.45, barrierMat, flyoverX, deckElev + 0.62, 240);
    this.scene.add(termSouth);
    this.buildingColliders.push({
      minX: flyoverX - flyoverW / 2,
      maxX: flyoverX + flyoverW / 2,
      minZ: 239.0,
      maxZ: 241.0,
      minY: 14.5,
      maxY: 18.5,
      tag: 'flyover_barrier',
    });

    // Yellow/Black Hazard Curb Trims along highway barriers
    for (let z = -330; z <= 230; z += 20) {
      const curbTrimW = this.sharedBox(0.25, 0.25, 9.5, barrierYellowMat, flyoverX - flyoverW / 2 + 0.45, deckElev + 0.15, z);
      const curbTrimE = this.sharedBox(0.25, 0.25, 9.5, barrierYellowMat, flyoverX + flyoverW / 2 - 0.45, deckElev + 0.15, z);
      this.scene.add(curbTrimW);
      this.scene.add(curbTrimE);
    }

    // 5. Heavy Concrete Hammerhead Piers with Cantilever Arms Spaced Every 36m
    for (let pz = -324; pz <= 228; pz += 36) {
      // Keep crossing corridors completely clear of piers!
      if (Math.abs(pz - (-175)) < 24) continue; // Mohakhali Flyover corridor
      if (Math.abs(pz - 0) < 22) continue;      // Farmgate / Manik Mia intersection
      if (Math.abs(pz - 240) < 24) continue;    // Hanif Flyover corridor

      const pier = new THREE.Mesh(this.cylCache(1.35, 1.55, deckElev - 0.6, 14), pierMat);
      pier.position.set(flyoverX, (deckElev - 0.6) / 2, pz);
      pier.castShadow = true;
      this.scene.add(pier);

      this.circleColliders.push({
        x: flyoverX,
        z: pz,
        radius: 1.6,
        tag: 'flyover_pier',
      });

      const pierCap = this.sharedBox(flyoverW + 0.8, 1.3, 3.2, pierMat, flyoverX, deckElev - 1.2, pz);
      pierCap.castShadow = true;
      this.scene.add(pierCap);
    }

    // 6. Overhead Highway Directional Sign Gantries (Green Boards with White Bold Text)
    const signLocations = [
      { z: -160, b1: 'উত্তরা / বিমানবন্দর / ৩০০ ফিট', e1: 'UTTARA / AIRPORT / 300FT', b2: 'বনানী প্রস্থান', e2: 'BANANI EXIT' },
      { z: -10, b1: 'ঢাকা এলিভেটেড এক্সপ্রেসওয়ে', e1: 'DHAKA ELEVATED EXPRESSWAY', b2: 'ফার্মগেট / তেজগাঁও প্রস্থান', e2: 'FARMGATE / TEJGAON EXIT' },
      { z: 140, b1: 'মহাখালী / বিমানবন্দর লিঙ্ক', e1: 'MOHAKHALI / AIRPORT LINK', b2: 'মতিঝিল / সদরঘাট এক্সপ্রেসওয়ে', e2: 'MOTIJHEEL / SADARGHAT EXPRESS' },
    ];

    signLocations.forEach((loc) => {
      const gantryGroup = new THREE.Group();
      gantryGroup.position.set(flyoverX, deckElev, loc.z);

      [-flyoverW / 2 + 0.4, flyoverW / 2 - 0.4].forEach((gx) => {
        const leg = new THREE.Mesh(this.boxCache(0.38, 6.2, 0.38), gantryFrameMat);
        leg.position.set(gx, 3.1, 0);
        gantryGroup.add(leg);
      });

      const gantryBeam = new THREE.Mesh(this.boxCache(flyoverW, 0.55, 0.4), gantryFrameMat);
      gantryBeam.position.set(0, 6.2, 0);
      gantryGroup.add(gantryBeam);

      const signTex = createFlyoverGantryTexture(loc.b1, loc.e1, loc.b2, loc.e2);
      const signBoard = new THREE.Mesh(
        new THREE.BoxGeometry(10.2, 2.5, 0.12),
        new THREE.MeshStandardMaterial({ map: signTex, roughness: 0.4 })
      );
      signBoard.position.set(0, 4.8, 0);
      gantryGroup.add(signBoard);

      this.scene.add(gantryGroup);
    });

    // 7. Highway Light Poles (Dual Cantilever Cobra-head Lights)
    for (let lz = -310; lz <= 210; lz += 42) {
      const pole = new THREE.Mesh(this.cylCache(0.12, 0.16, 7.5, 8), gantryFrameMat);
      pole.position.set(flyoverX - flyoverW / 2 + 0.35, deckElev + 3.75, lz);
      this.scene.add(pole);

      const luminaire = new THREE.Mesh(this.boxCache(0.35, 0.15, 0.8), lampLightMat);
      luminaire.position.set(flyoverX - flyoverW / 2 + 1.2, deckElev + 7.5, lz);
      this.scene.add(luminaire);
    }
  }

  /**
   * Mayor Mohammad Hanif Flyover (মেয়র মোহাম্মদ হানিফ ফ্লাইওভার)
   * The longest iconic elevated expressway in south Dhaka spanning 1120m along Z = 240.
   * Connects Old Dhaka, Chawkbazar, Sayedabad, Jatrabari, Postogola and Chittagong Highway.
   * Elevation: Y = 11.2m (clearance > 9.5m over ground streets, Mirpur Avenue & Badda Avenue)
   * 120m approach ramps at X = -560 to -440 (West) and X = 440 to 560 (East).
   */
  private buildMayorHanifFlyover() {
    const deckMat = new THREE.MeshStandardMaterial({
      color: '#1e293b',
      roughness: 0.88,
    });
    const pierMat = new THREE.MeshStandardMaterial({
      color: '#94a3b8',
      roughness: 0.82,
    });
    const barrierMat = new THREE.MeshStandardMaterial({
      color: '#f8fafc',
      roughness: 0.65,
    });
    const barrierYellowMat = new THREE.MeshStandardMaterial({
      color: '#eab308',
      roughness: 0.6,
    });
    const gantryFrameMat = new THREE.MeshStandardMaterial({
      color: '#0284c7',
      metalness: 0.75,
      roughness: 0.35,
    });
    const stripeWhiteMat = new THREE.MeshBasicMaterial({ color: '#ffffff' });
    const lampLightMat = new THREE.MeshBasicMaterial({ color: '#fef08a' });
    this.streetLampBasicMats.push(lampLightMat);

    const flyoverZ = 240;
    const flyoverW = 14.2;
    const deckLen = 880; // X: -440 to +440
    const deckElev = 11.2;

    // 1. Main Elevated Span Deck (X: -440 to +440) at Y = 11.2m
    const mainDeck = this.sharedBox(deckLen, 1.2, flyoverW, deckMat, 0, deckElev - 0.6, flyoverZ);
    mainDeck.receiveShadow = true;
    this.scene.add(mainDeck);

    // Elevated Deck Center Striping (dashed white lane lines along X)
    for (let x = -430; x <= 430; x += 14) {
      [-3.2, 0, 3.2].forEach((oz) => {
        const stripe = this.sharedBox(7.5, 0.04, 0.28, stripeWhiteMat, x, deckElev + 0.03, flyoverZ + oz);
        this.scene.add(stripe);
      });
    }

    // 2. West Approach Ramp (X: -560 to -440, top surface Y: 0 -> 11.2, clear of Mirpur Avenue at X = -380)
    const rampLen = 120;
    const westSlopeAngle = Math.atan2(deckElev, rampLen);
    const westRamp = new THREE.Mesh(this.boxCache(120.5, 1.2, flyoverW), deckMat);
    westRamp.position.set(-500, deckElev * 0.5 - 0.6, flyoverZ);
    westRamp.rotation.z = westSlopeAngle;
    westRamp.receiveShadow = true;
    this.scene.add(westRamp);

    // 3. East Approach Ramp (X: 440 to 560, top surface Y: 11.2 -> 0, clear of Badda Avenue at X = 440)
    const eastRamp = new THREE.Mesh(this.boxCache(120.5, 1.2, flyoverW), deckMat);
    eastRamp.position.set(500, deckElev * 0.5 - 0.6, flyoverZ);
    eastRamp.rotation.z = -westSlopeAngle;
    eastRamp.receiveShadow = true;
    this.scene.add(eastRamp);

    // 4. Solid Concrete Crash Barriers & Physics Colliders on North & South Edges
    const northBarrier = this.sharedBox(deckLen, 1.25, 0.45, barrierMat, 0, deckElev + 0.62, flyoverZ - flyoverW / 2 + 0.22);
    this.scene.add(northBarrier);
    this.buildingColliders.push({
      minX: -440,
      maxX: 440,
      minZ: flyoverZ - flyoverW / 2 - 0.65,
      maxZ: flyoverZ - flyoverW / 2 + 0.65,
      minY: 10.0,
      maxY: 13.5,
      tag: 'flyover_barrier',
    });

    const southBarrier = this.sharedBox(deckLen, 1.25, 0.45, barrierMat, 0, deckElev + 0.62, flyoverZ + flyoverW / 2 - 0.22);
    this.scene.add(southBarrier);
    this.buildingColliders.push({
      minX: -440,
      maxX: 440,
      minZ: flyoverZ + flyoverW / 2 - 0.65,
      maxZ: flyoverZ + flyoverW / 2 + 0.65,
      minY: 10.0,
      maxY: 13.5,
      tag: 'flyover_barrier',
    });

    // 4.2 West Ramp Sloped Barriers (X: -560 to -440) Following Incline
    [-flyoverW / 2 + 0.22, flyoverW / 2 - 0.22].forEach((oz) => {
      const bMesh = new THREE.Mesh(this.boxCache(120.5, 1.25, 0.45), barrierMat);
      bMesh.position.set(-500, deckElev * 0.5 + 0.02, flyoverZ + oz);
      bMesh.rotation.z = westSlopeAngle;
      this.scene.add(bMesh);

      const hanifWestSegs = [
        { minX: -560, maxX: -530, minY: 0.0, maxY: 3.8 },
        { minX: -530, maxX: -500, minY: 2.5, maxY: 6.8 },
        { minX: -500, maxX: -470, minY: 5.5, maxY: 9.8 },
        { minX: -470, maxX: -440, minY: 8.5, maxY: 13.0 },
      ];
      for (const seg of hanifWestSegs) {
        this.buildingColliders.push({
          minX: seg.minX,
          maxX: seg.maxX,
          minZ: flyoverZ + oz - 0.65,
          maxZ: flyoverZ + oz + 0.65,
          minY: seg.minY,
          maxY: seg.maxY,
          tag: 'flyover_barrier',
        });
      }
    });

    // 4.3 East Ramp Sloped Barriers (X: 440 to 560) Following Decline
    [-flyoverW / 2 + 0.22, flyoverW / 2 - 0.22].forEach((oz) => {
      const bMesh = new THREE.Mesh(this.boxCache(120.5, 1.25, 0.45), barrierMat);
      bMesh.position.set(500, deckElev * 0.5 + 0.02, flyoverZ + oz);
      bMesh.rotation.z = -westSlopeAngle;
      this.scene.add(bMesh);

      const hanifEastSegs = [
        { minX: 440, maxX: 470, minY: 8.5, maxY: 13.0 },
        { minX: 470, maxX: 500, minY: 5.5, maxY: 9.8 },
        { minX: 500, maxX: 530, minY: 2.5, maxY: 6.8 },
        { minX: 530, maxX: 560, minY: 0.0, maxY: 3.8 },
      ];
      for (const seg of hanifEastSegs) {
        this.buildingColliders.push({
          minX: seg.minX,
          maxX: seg.maxX,
          minZ: flyoverZ + oz - 0.65,
          maxZ: flyoverZ + oz + 0.65,
          minY: seg.minY,
          maxY: seg.maxY,
          tag: 'flyover_barrier',
        });
      }
    });

    // Yellow/Black Hazard Curb Trims along barriers
    for (let x = -430; x <= 430; x += 22) {
      const curbN = this.sharedBox(9.5, 0.25, 0.25, barrierYellowMat, x, deckElev + 0.15, flyoverZ - flyoverW / 2 + 0.45);
      const curbS = this.sharedBox(9.5, 0.25, 0.25, barrierYellowMat, x, deckElev + 0.15, flyoverZ + flyoverW / 2 - 0.45);
      this.scene.add(curbN);
      this.scene.add(curbS);
    }

    // 5. Heavy Concrete Hammerhead Piers Spaced Every 38m (All Crossing Avenues Clear)
    for (let px = -418; px <= 418; px += 38) {
      // Exclude all North-South street corridors to guarantee 100% unobstructed traffic underneath
      if (
        Math.abs(px) < 18 ||
        Math.abs(px - 220) < 18 ||
        Math.abs(px - (-170)) < 18 ||
        Math.abs(px - (-380)) < 18
      ) {
        continue;
      }
      const pier = new THREE.Mesh(this.cylCache(1.35, 1.55, deckElev - 0.6, 14), pierMat);
      pier.position.set(px, (deckElev - 0.6) / 2, flyoverZ);
      pier.castShadow = true;
      this.scene.add(pier);

      this.circleColliders.push({
        x: px,
        z: flyoverZ,
        radius: 1.6,
        tag: 'flyover_pier',
      });

      const pierCap = this.sharedBox(3.2, 1.3, flyoverW + 0.8, pierMat, px, deckElev - 1.2, flyoverZ);
      pierCap.castShadow = true;
      this.scene.add(pierCap);
    }

    // 6. Overhead Highway Directional Sign Gantries
    const signLocations = [
      { x: -180, b1: 'মেয়র মোহাম্মদ হানিফ ফ্লাইওভার', e1: 'MAYOR MOHAMMAD HANIF FLYOVER', b2: 'যাত্রাবাড়ী / সায়েদাবাদ প্রস্থান', e2: 'JATRABARI / SAYEDABAD EXIT' },
      { x: 0, b1: 'পোস্তগোলা / বুড়িগঙ্গা ২য় সেতু লিঙ্ক', e1: 'POSTOGOLA / BURIGANGA 2ND BRIDGE', b2: 'চট্টগ্রাম মহাসড়ক সংযোগ', e2: 'CHITTAGONG HIGHWAY LINK' },
      { x: 180, b1: 'গুলিস্তান / মতিঝিল প্রস্থান', e1: 'GULISTAN / MOTIJHEEL EXIT', b2: 'যাত্রাবাড়ী ইন্টারচেঞ্জ', e2: 'JATRABARI INTERCHANGE' },
    ];

    signLocations.forEach((loc) => {
      const gantryGroup = new THREE.Group();
      gantryGroup.position.set(loc.x, deckElev, flyoverZ);

      [-flyoverW / 2 + 0.4, flyoverW / 2 - 0.4].forEach((gz) => {
        const leg = new THREE.Mesh(this.boxCache(0.38, 6.2, 0.38), gantryFrameMat);
        leg.position.set(0, 3.1, gz);
        gantryGroup.add(leg);
      });

      const gantryBeam = new THREE.Mesh(this.boxCache(0.4, 0.55, flyoverW), gantryFrameMat);
      gantryBeam.position.set(0, 6.2, 0);
      gantryGroup.add(gantryBeam);

      const signTex = createFlyoverGantryTexture(loc.b1, loc.e1, loc.b2, loc.e2);
      const signBoard = new THREE.Mesh(
        new THREE.BoxGeometry(0.12, 2.5, 10.2),
        new THREE.MeshStandardMaterial({ map: signTex, roughness: 0.4 })
      );
      signBoard.position.set(0, 4.8, 0);
      gantryGroup.add(signBoard);

      this.scene.add(gantryGroup);
    });

    // 7. Highway Light Poles
    for (let lx = -330; lx <= 330; lx += 44) {
      const pole = new THREE.Mesh(this.cylCache(0.12, 0.16, 7.5, 8), gantryFrameMat);
      pole.position.set(lx, deckElev + 3.75, flyoverZ - flyoverW / 2 + 0.35);
      this.scene.add(pole);

      const luminaire = new THREE.Mesh(this.boxCache(0.8, 0.15, 0.35), lampLightMat);
      luminaire.position.set(lx, deckElev + 7.5, flyoverZ - flyoverW / 2 + 1.2);
      this.scene.add(luminaire);
    }
  }

  /**
   * Kuril Interchange Flyover (কুড়িল ইন্টারচেঞ্জ ফ্লাইওভার)
   * Multi-directional elevated highway interchange spanning 360m along Z = -315 from X = 360 to 720.
   * Elevates over Airport Road and connects directly into the Purbachal 300 Feet Grand Expressway.
   * Elevation: Y = 11.2m, 4-lane elevated deck with drivable on/off ramps.
   */
  private buildKurilFlyoverInterchange() {
    const deckMat = new THREE.MeshStandardMaterial({
      color: '#1e293b',
      roughness: 0.88,
    });
    const pierMat = new THREE.MeshStandardMaterial({
      color: '#94a3b8',
      roughness: 0.82,
    });
    const barrierMat = new THREE.MeshStandardMaterial({
      color: '#f8fafc',
      roughness: 0.65,
    });
    const barrierYellowMat = new THREE.MeshStandardMaterial({
      color: '#eab308',
      roughness: 0.6,
    });
    const gantryFrameMat = new THREE.MeshStandardMaterial({
      color: '#0284c7',
      metalness: 0.75,
      roughness: 0.35,
    });
    const stripeWhiteMat = new THREE.MeshBasicMaterial({ color: '#ffffff' });
    const lampLightMat = new THREE.MeshBasicMaterial({ color: '#fef08a' });
    this.streetLampBasicMats.push(lampLightMat);

    const flyoverZ = -315;
    const flyoverW = 14.2;
    const deckLen = 360; // X: 360 to 720
    const deckElev = 11.2;

    // 1. Main Elevated Span Deck (X: 360 to 720) at Y = 11.2m
    const mainDeck = this.sharedBox(deckLen, 1.2, flyoverW, deckMat, 540, deckElev - 0.6, flyoverZ);
    mainDeck.receiveShadow = true;
    this.scene.add(mainDeck);

    // Elevated Deck Center Striping
    for (let x = 370; x <= 710; x += 14) {
      [-3.2, 0, 3.2].forEach((oz) => {
        const stripe = this.sharedBox(7.5, 0.04, 0.28, stripeWhiteMat, x, deckElev + 0.03, flyoverZ + oz);
        this.scene.add(stripe);
      });
    }

    // 2. West Approach On-Ramp (X: 280 to 360, top surface Y: 0 -> 11.2)
    const rampLen = 80;
    const slopeAngle = Math.atan2(deckElev, rampLen);
    const westRamp = new THREE.Mesh(this.boxCache(80.5, 1.2, flyoverW), deckMat);
    westRamp.position.set(320, deckElev * 0.5 - 0.6, flyoverZ);
    westRamp.rotation.z = slopeAngle;
    westRamp.receiveShadow = true;
    this.scene.add(westRamp);

    // 3. East Off-Ramp (X: 720 to 800, top surface Y: 11.2 -> 0)
    const eastRamp = new THREE.Mesh(this.boxCache(80.5, 1.2, flyoverW), deckMat);
    eastRamp.position.set(760, deckElev * 0.5 - 0.6, flyoverZ);
    eastRamp.rotation.z = -slopeAngle;
    eastRamp.receiveShadow = true;
    this.scene.add(eastRamp);

    // 4. Outer Concrete Crash Barriers & Physics Colliders
    const northBarrier = this.sharedBox(deckLen, 1.25, 0.45, barrierMat, 540, deckElev + 0.62, flyoverZ - flyoverW / 2 + 0.22);
    this.scene.add(northBarrier);
    this.buildingColliders.push({
      minX: 360,
      maxX: 720,
      minZ: flyoverZ - flyoverW / 2 - 0.65,
      maxZ: flyoverZ - flyoverW / 2 + 0.65,
      minY: 9.5,
      maxY: 13.5,
      tag: 'flyover_barrier',
    });

    const southBarrier = this.sharedBox(deckLen, 1.25, 0.45, barrierMat, 540, deckElev + 0.62, flyoverZ + flyoverW / 2 - 0.22);
    this.scene.add(southBarrier);
    this.buildingColliders.push({
      minX: 360,
      maxX: 720,
      minZ: flyoverZ + flyoverW / 2 - 0.65,
      maxZ: flyoverZ + flyoverW / 2 + 0.65,
      minY: 9.5,
      maxY: 13.5,
      tag: 'flyover_barrier',
    });

    // 4.2 West Ramp Sloped Barriers (X: 280 to 360) Following Incline
    [-flyoverW / 2 + 0.22, flyoverW / 2 - 0.22].forEach((oz) => {
      const bMesh = new THREE.Mesh(this.boxCache(80.5, 1.25, 0.45), barrierMat);
      bMesh.position.set(320, deckElev * 0.5 + 0.02, flyoverZ + oz);
      bMesh.rotation.z = slopeAngle;
      this.scene.add(bMesh);

      const kurilWestSegs = [
        { minX: 280, maxX: 300, minY: 0.0, maxY: 3.5 },
        { minX: 300, maxX: 320, minY: 2.0, maxY: 6.5 },
        { minX: 320, maxX: 340, minY: 5.0, maxY: 9.5 },
        { minX: 340, maxX: 360, minY: 8.0, maxY: 12.8 },
      ];
      for (const seg of kurilWestSegs) {
        this.buildingColliders.push({
          minX: seg.minX,
          maxX: seg.maxX,
          minZ: flyoverZ + oz - 0.65,
          maxZ: flyoverZ + oz + 0.65,
          minY: seg.minY,
          maxY: seg.maxY,
          tag: 'flyover_barrier',
        });
      }
    });

    // 4.3 East Ramp Sloped Barriers (X: 720 to 800) Following Decline
    [-flyoverW / 2 + 0.22, flyoverW / 2 - 0.22].forEach((oz) => {
      const bMesh = new THREE.Mesh(this.boxCache(80.5, 1.25, 0.45), barrierMat);
      bMesh.position.set(760, deckElev * 0.5 + 0.02, flyoverZ + oz);
      bMesh.rotation.z = -slopeAngle;
      this.scene.add(bMesh);

      const kurilEastSegs = [
        { minX: 720, maxX: 740, minY: 8.0, maxY: 12.8 },
        { minX: 740, maxX: 760, minY: 5.0, maxY: 9.5 },
        { minX: 760, maxX: 780, minY: 2.0, maxY: 6.5 },
        { minX: 780, maxX: 800, minY: 0.0, maxY: 3.5 },
      ];
      for (const seg of kurilEastSegs) {
        this.buildingColliders.push({
          minX: seg.minX,
          maxX: seg.maxX,
          minZ: flyoverZ + oz - 0.65,
          maxZ: flyoverZ + oz + 0.65,
          minY: seg.minY,
          maxY: seg.maxY,
          tag: 'flyover_barrier',
        });
      }
    });

    // Yellow/Black Hazard Curb Trims
    for (let x = 370; x <= 710; x += 22) {
      const curbN = this.sharedBox(9.5, 0.25, 0.25, barrierYellowMat, x, deckElev + 0.15, flyoverZ - flyoverW / 2 + 0.45);
      const curbS = this.sharedBox(9.5, 0.25, 0.25, barrierYellowMat, x, deckElev + 0.15, flyoverZ + flyoverW / 2 - 0.45);
      this.scene.add(curbN);
      this.scene.add(curbS);
    }

    // 5. Tall Concrete Interchange Piers Spaced Every 38m (Straddling Balu Suspension Bridge cleanly outside its 22m deck)
    for (let px = 380; px <= 700; px += 38) {
      if (Math.abs(px - 440) < 18 || Math.abs(px - 640) < 22) continue;
      if (px >= 530 && px <= 650) {
        // Twin Straddle Portal Columns outside the 22m Balu Suspension Bridge deck (ZERO obstruction on bridge/river!)
        [-13.0, 13.0].forEach((offsetZ) => {
          const portalCol = new THREE.Mesh(this.cylCache(0.95, 1.15, deckElev - 0.6, 12), pierMat);
          portalCol.position.set(px, (deckElev - 0.6) / 2, flyoverZ + offsetZ);
          portalCol.castShadow = true;
          this.scene.add(portalCol);
        });
        const straddleBeam = this.sharedBox(2.8, 1.5, 28.0, pierMat, px, deckElev - 1.25, flyoverZ);
        straddleBeam.castShadow = true;
        this.scene.add(straddleBeam);
        continue;
      }
      const pier = new THREE.Mesh(this.cylCache(1.4, 1.65, deckElev - 0.6, 14), pierMat);
      pier.position.set(px, (deckElev - 0.6) / 2, flyoverZ);
      pier.castShadow = true;
      this.scene.add(pier);

      this.circleColliders.push({
        x: px,
        z: flyoverZ,
        radius: 1.7,
        tag: 'flyover_pier',
      });

      const pierCap = this.sharedBox(3.4, 1.4, flyoverW + 0.8, pierMat, px, deckElev - 1.2, flyoverZ);
      pierCap.castShadow = true;
      this.scene.add(pierCap);
    }

    // 6. Kuril Interchange Highway Directional Gantries
    const signLocations = [
      { x: 440, b1: 'কুড়িল ইন্টারচেঞ্জ ফ্লাইওভার', e1: 'KURIL INTERCHANGE FLYOVER', b2: 'পূর্বাচল ৩০০ ফিট এক্সপ্রেসওয়ে', e2: 'PURBACHAL 300FT EXPRESSWAY' },
      { x: 620, b1: 'বিমানবন্দর ও উত্তরা লিঙ্ক', e1: 'AIRPORT & UTTARA LINK', b2: 'নিকুঞ্জ ও বারিধারা প্রস্থান', e2: 'NIKUNJA & BARIDHARA EXIT' },
    ];

    signLocations.forEach((loc) => {
      const gantryGroup = new THREE.Group();
      gantryGroup.position.set(loc.x, deckElev, flyoverZ);

      [-flyoverW / 2 + 0.4, flyoverW / 2 - 0.4].forEach((gz) => {
        const leg = new THREE.Mesh(this.boxCache(0.38, 6.2, 0.38), gantryFrameMat);
        leg.position.set(0, 3.1, gz);
        gantryGroup.add(leg);
      });

      const gantryBeam = new THREE.Mesh(this.boxCache(0.4, 0.55, flyoverW), gantryFrameMat);
      gantryBeam.position.set(0, 6.2, 0);
      gantryGroup.add(gantryBeam);

      const signTex = createFlyoverGantryTexture(loc.b1, loc.e1, loc.b2, loc.e2);
      const signBoard = new THREE.Mesh(
        new THREE.BoxGeometry(0.12, 2.5, 10.2),
        new THREE.MeshStandardMaterial({ map: signTex, roughness: 0.4 })
      );
      signBoard.position.set(0, 4.8, 0);
      gantryGroup.add(signBoard);

      this.scene.add(gantryGroup);
    });

    // 7. High-mast LED Street Light Poles
    for (let lx = 370; lx <= 710; lx += 42) {
      const pole = new THREE.Mesh(this.cylCache(0.12, 0.16, 7.5, 8), gantryFrameMat);
      pole.position.set(lx, deckElev + 3.75, flyoverZ - flyoverW / 2 + 0.35);
      this.scene.add(pole);

      const luminaire = new THREE.Mesh(this.boxCache(0.8, 0.15, 0.35), lampLightMat);
      luminaire.position.set(lx, deckElev + 7.5, flyoverZ - flyoverW / 2 + 1.2);
      this.scene.add(luminaire);
    }
  }

  /**
   * Authentic Dhaka Covered Steel-Truss Pedestrian Foot Over Bridges (ফুট ওভার ব্রিজ)
   * Complete with Warren steel lattice cages, arched ribbed roofs, warm LED walkway lighting,
   * dual stepped concrete staircases with stainless handrails on both sidewalks,
   * and steel-framed illuminated commercial advertising billboards with floodlight hoods.
   */
  private buildDhakaFootOverBridges() {
    const steelMat = new THREE.MeshStandardMaterial({
      color: '#0284c7',
      metalness: 0.68,
      roughness: 0.32,
    });
    const darkSteelMat = new THREE.MeshStandardMaterial({
      color: '#0f172a',
      metalness: 0.72,
      roughness: 0.36,
    });
    const chromeRailMat = new THREE.MeshStandardMaterial({
      color: '#e2e8f0',
      metalness: 0.88,
      roughness: 0.16,
    });
    const roofMat = new THREE.MeshStandardMaterial({
      color: '#0369a1',
      roughness: 0.42,
      metalness: 0.25,
    });
    const stairConcreteMat = new THREE.MeshStandardMaterial({
      color: '#94a3b8',
      roughness: 0.82,
    });
    const plinthMat = new THREE.MeshStandardMaterial({
      color: '#475569',
      roughness: 0.88,
    });
    const tactileYellowMat = new THREE.MeshStandardMaterial({
      color: '#facc15',
      roughness: 0.45,
    });
    const ceilingGlowMat = new THREE.MeshBasicMaterial({ color: '#fef9c3' });

    const createFob = (
      bridgeX: number,
      bridgeZ: number,
      spanWidth: number,
      northAdBrand: string,
      northAdBn: string,
      northAdEn: string,
      northAdColor: string,
      southAdBrand: string,
      southAdBn: string,
      southAdEn: string,
      southAdColor: string
    ) => {
      const fobGroup = new THREE.Group();
      fobGroup.position.set(bridgeX, 0, bridgeZ);

      const deckY = 6.2;
      const walkwayW = 3.4;

      // 1. Non-slip Concrete Walkway Deck + Central Yellow Tactile Strip & Curbs
      const floor = this.sharedBox(spanWidth + 3.2, 0.4, walkwayW, stairConcreteMat, 0, deckY, 0);
      floor.receiveShadow = true;
      const tactileLine = this.sharedBox(spanWidth + 2.4, 0.04, 0.24, tactileYellowMat, 0, deckY + 0.21, 0);
      fobGroup.add(floor, tactileLine);

      // 2. Arched Steel Canopy Roof + Exposed Structural Rib Arches & Overhead LED Strip
      const roof = new THREE.Mesh(
        new THREE.CylinderGeometry(walkwayW / 1.65, walkwayW / 1.65, spanWidth + 3.4, 14, 1, false, 0, Math.PI).rotateZ(Math.PI / 2),
        roofMat
      );
      roof.position.set(0, deckY + 2.75, 0);
      roof.castShadow = true;
      fobGroup.add(roof);

      const ledStrip = this.sharedBox(spanWidth - 1.0, 0.08, 0.35, ceilingGlowMat, 0, deckY + 2.65, 0);
      fobGroup.add(ledStrip);

      for (let rx = -spanWidth / 2; rx <= spanWidth / 2 + 0.1; rx += 2.6) {
        const rib = new THREE.Mesh(
          new THREE.TorusGeometry(walkwayW / 1.62, 0.065, 6, 14, Math.PI),
          chromeRailMat
        );
        rib.rotation.y = Math.PI / 2;
        rib.position.set(rx, deckY + 2.75, 0);
        fobGroup.add(rib);
      }

      // 3. Full Steel Warren Lattice Trusses (Chords, Vertical Stanchions, Diagonal Braces & Safety Rails)
      [-walkwayW / 2, walkwayW / 2].forEach((trussZ) => {
        const bottomChord = this.sharedBox(spanWidth + 3.2, 0.16, 0.16, steelMat, 0, deckY + 0.22, trussZ);
        const midRail = this.sharedBox(spanWidth + 3.2, 0.07, 0.07, chromeRailMat, 0, deckY + 1.08, trussZ);
        const topChord = this.sharedBox(spanWidth + 3.2, 0.16, 0.16, steelMat, 0, deckY + 2.72, trussZ);
        fobGroup.add(bottomChord, midRail, topChord);

        const stepX = 2.6;
        for (let x = -spanWidth / 2; x <= spanWidth / 2; x += stepX) {
          const post = new THREE.Mesh(this.boxCache(0.14, 2.65, 0.14), steelMat);
          post.position.set(x, deckY + 1.46, trussZ);
          fobGroup.add(post);

          if (x + stepX <= spanWidth / 2 + 0.05) {
            const diagLen = Math.hypot(stepX, 2.5);
            const diag1 = new THREE.Mesh(this.boxCache(0.08, diagLen, 0.08), steelMat);
            diag1.position.set(x + stepX * 0.5, deckY + 1.46, trussZ);
            diag1.rotation.z = Math.atan2(stepX, 2.5);
            const diag2 = new THREE.Mesh(this.boxCache(0.08, diagLen, 0.08), steelMat);
            diag2.position.set(x + stepX * 0.5, deckY + 1.46, trussZ);
            diag2.rotation.z = -Math.atan2(stepX, 2.5);
            fobGroup.add(diag1, diag2);
          }
        }
      });

      // 4. Sidewalk Support Piers & Real 18-Step Concrete Staircases at BOTH Ends (Z: +1.7 -> +10.2)
      const stairSteps = 18;
      const stairRun = 8.4;
      const stepRun = stairRun / stairSteps;
      const stepRise = (deckY - 0.15) / stairSteps;
      const stairAngle = Math.atan2(deckY, stairRun);
      const stringerLen = Math.hypot(stairRun, deckY);

      [-spanWidth / 2 - 1.15, spanWidth / 2 + 1.15].forEach((sx) => {
        // Heavy Concrete Pier Base & Structural Twin Steel Portal Columns
        const pierFooting = new THREE.Mesh(this.boxCache(2.4, 0.75, 2.4), plinthMat);
        pierFooting.position.set(sx, 0.375, 0);
        const pierCol = new THREE.Mesh(this.cylCache(0.36, 0.42, deckY, 10), steelMat);
        pierCol.position.set(sx, deckY / 2, 0);
        pierCol.castShadow = true;
        fobGroup.add(pierFooting, pierCol);

        // Stepped 3D Concrete Stair Treads descending south along the sidewalk
        for (let s = 0; s < stairSteps; s++) {
          const sy = deckY - (s + 0.5) * stepRise;
          const sz = 1.65 + (s + 0.5) * stepRun;
          const tread = new THREE.Mesh(this.boxCache(2.05, stepRise + 0.14, stepRun + 0.06), stairConcreteMat);
          tread.position.set(sx, sy, sz);
          tread.castShadow = true;
          tread.receiveShadow = true;
          fobGroup.add(tread);
        }

        // Sloped Steel Stringer Side Beams & Tubular Stainless Handrails
        [-1.08, 1.08].forEach((hx) => {
          const stringer = new THREE.Mesh(this.boxCache(0.14, 0.32, stringerLen), steelMat);
          stringer.position.set(sx + hx, deckY * 0.5 - 0.12, 1.65 + stairRun * 0.5);
          stringer.rotation.x = stairAngle;

          const handrail = new THREE.Mesh(this.boxCache(0.08, 0.08, stringerLen + 0.4), chromeRailMat);
          handrail.position.set(sx + hx, deckY * 0.5 + 0.92, 1.65 + stairRun * 0.5);
          handrail.rotation.x = stairAngle;
          fobGroup.add(stringer, handrail);

          for (let p = 0; p <= 4; p++) {
            const frac = p / 4;
            const bal = new THREE.Mesh(this.cylCache(0.035, 0.035, 1.0, 6), chromeRailMat);
            bal.position.set(sx + hx, deckY * (1 - frac) + 0.46, 1.65 + stairRun * frac);
            fobGroup.add(bal);
          }
        });

        // Ground Entry Landing Pad & Safety Yellow Sidewalk Bollards
        const entryPad = this.sharedBox(2.8, 0.18, 2.2, plinthMat, sx, 0.09, 1.65 + stairRun + 0.95);
        fobGroup.add(entryPad);
        [-1.0, 1.0].forEach((bx) => {
          const bollard = new THREE.Mesh(this.cylCache(0.08, 0.09, 0.9, 8), tactileYellowMat);
          bollard.position.set(sx + bx, 0.45, 1.65 + stairRun + 1.85);
          fobGroup.add(bollard);
        });
      });

      // 5. Steel-Framed Illuminated Commercial Ad Billboards + Gooseneck Floodlights
      const adW = spanWidth * 0.86;
      const adH = 2.2;
      const northTex = createFobBillboardTexture(northAdBrand, northAdBn, northAdEn, northAdColor);
      const southTex = createFobBillboardTexture(southAdBrand, southAdBn, southAdEn, southAdColor);

      [
        { z: -walkwayW / 2 - 0.18, rotY: Math.PI, dir: -1, tex: northTex },
        { z: walkwayW / 2 + 0.18, rotY: 0, dir: 1, tex: southTex },
      ].forEach((side) => {
        const frame = new THREE.Mesh(this.boxCache(adW + 0.38, adH + 0.34, 0.18), darkSteelMat);
        frame.position.set(0, deckY + 1.5, side.z);
        frame.castShadow = true;
        const adFace = new THREE.Mesh(
          new THREE.PlaneGeometry(adW, adH),
          new THREE.MeshBasicMaterial({ map: side.tex })
        );
        adFace.position.set(0, deckY + 1.5, side.z + side.dir * 0.10);
        if (side.dir < 0) adFace.rotation.y = Math.PI;
        fobGroup.add(frame, adFace);

        for (let lx = -adW * 0.36; lx <= adW * 0.36 + 0.1; lx += adW * 0.24) {
          const arm = new THREE.Mesh(this.boxCache(0.06, 0.06, 0.72), darkSteelMat);
          arm.position.set(lx, deckY + 2.82, side.z + side.dir * 0.38);
          const lamp = new THREE.Mesh(this.boxCache(0.28, 0.08, 0.18), ceilingGlowMat);
          lamp.position.set(lx, deckY + 2.74, side.z + side.dir * 0.72);
          fobGroup.add(arm, lamp);
        }
      });

      this.scene.add(fobGroup);
    };

    // 1. Farmgate Foot Over Bridge across Airport Highway (Z = -55)
    createFob(
      0,
      -55,
      27,
      'bKash',
      'বিকাশ - অ্যাপ দিয়ে ক্যাশ আউট মাত্র ১৪.৯০ টাকা!',
      'Safe, Fast & Trusted Digital Mobile Money in Bangladesh',
      '#be185d',
      'Grameenphone',
      'গ্রামীণফোন - চলো বহুদূর | শক্তিশালী দেশজুড়ে 4G',
      'Unstoppable Mobile Internet Coverage Anywhere in Bangladesh',
      '#0284c7'
    );

    // 2. Karwan Bazar Central Foot Over Bridge (Z = 48)
    createFob(
      0,
      48,
      26,
      'Nagad',
      'নগদ - সবচেয়ে কম খরচে মুহূর্তেই সেন্ড মানি ও পেমেন্ট!',
      'Fastest Digital Financial Service Across Every District',
      '#c2410c',
      'BRAC Bank',
      'ব্র্যাক ব্যাংক - আস্থা ও সমৃদ্ধির ২৪ ঘণ্টা ব্যাংকিং সেবা',
      'Trusted Banking & SME Loans Built for Modern Dhaka',
      '#0369a1'
    );

    // 3. Shahbagh & TSC Foot Over Bridge (Z = 166, clear of Expressway Off-Ramp toe at Z = 160)
    createFob(
      0,
      166,
      25,
      'Daraz',
      'দারাজ ১১.১১ - সবচেয়ে বড় আন্তর্জাতিক অনলাইন মেগা সেল!',
      'Huge Discounts, Free Delivery & Official Brand Guarantees',
      '#ea580c',
      'PRAN Frooto',
      'প্রাণ ফ্রুটো - খাঁটি আমের রিফ্রেশিং পুষ্টি ও স্বাদ!',
      'Pure Mango Pulp Refreshment for Everyone Everyday',
      '#15803d'
    );

    // 4. Mirpur-10 Circle Foot Over Bridge (X = -380, Z = -115)
    createFob(
      -380,
      -115,
      25,
      'Aarong',
      'আড়ং - ঐতিহ্যে অনন্য বাঙালিয়ানা ও উৎসবের পোশাক!',
      'Authentic Bangladeshi Crafts, Silks, Sarees & Home Decor',
      '#991b1b',
      'Walton',
      'ওয়ালটন - আমাদের পণ্য, দেশের গর্ব | ফ্রিজ, টিভি ও এসি',
      'Innovative Electronics Built Proudly in Bangladesh',
      '#1e40af'
    );
  }

  /**
   * Sher-e-Bangla National Cricket Stadium (মিরপুর শেরে বাংলা জাতীয় ক্রিকেট স্টেডিয়াম)
   * The home of Bangladesh Cricket (BCB) located in Mirpur-10.
   */
  private buildMirpurCricketStadium() {
    const sX = -450;
    const sZ = -320;

    const grassMat = new THREE.MeshStandardMaterial({
      color: '#15803d',
      roughness: 0.85,
    });
    const pitchClayMat = new THREE.MeshStandardMaterial({
      color: '#ca8a04',
      roughness: 0.92,
    });
    const wicketWoodMat = new THREE.MeshStandardMaterial({
      color: '#fef08a',
      roughness: 0.5,
    });
    const tierGreenMat = new THREE.MeshStandardMaterial({
      color: '#166534',
      roughness: 0.72,
    });
    const tierRedMat = new THREE.MeshStandardMaterial({
      color: '#991b1b',
      roughness: 0.72,
    });
    const tierGoldMat = new THREE.MeshStandardMaterial({
      color: '#d97706',
      roughness: 0.72,
    });
    const pavilionMat = new THREE.MeshStandardMaterial({
      color: '#0284c7',
      metalness: 0.75,
      roughness: 0.22,
    });
    const stadiumWallMat = new THREE.MeshStandardMaterial({
      color: '#cbd5e1',
      roughness: 0.75,
    });
    const floodlightLatticeMat = new THREE.MeshStandardMaterial({
      color: '#f8fafc',
      metalness: 0.85,
      roughness: 0.25,
    });
    const halogenGlowMat = new THREE.MeshBasicMaterial({
      color: '#fef08a',
    });

    const stadiumGroup = new THREE.Group();
    stadiumGroup.position.set(sX, 0, sZ);

    // 1. Manicured Central Cricket Outfield Oval
    const outfield = new THREE.Mesh(new THREE.CircleGeometry(58, 36), grassMat);
    outfield.rotation.x = -Math.PI / 2;
    outfield.position.y = 0.08;
    outfield.receiveShadow = true;
    stadiumGroup.add(outfield);

    // 2. Central Clay Wicket Pitch (22 yards)
    const pitch = new THREE.Mesh(this.boxCache(3.2, 0.04, 20.5), pitchClayMat);
    pitch.position.set(0, 0.11, 0);
    stadiumGroup.add(pitch);

    [-9.2, 9.2].forEach((wz) => {
      const crease = this.sharedBox(2.8, 0.02, 0.12, new THREE.MeshBasicMaterial({ color: '#ffffff' }), 0, 0.13, wz);
      stadiumGroup.add(crease);

      [-0.12, 0, 0.12].forEach((sx) => {
        const stump = new THREE.Mesh(this.cylCache(0.025, 0.025, 0.72, 8), wicketWoodMat);
        stump.position.set(sx, 0.48, wz);
        stadiumGroup.add(stump);
      });
      const bail = new THREE.Mesh(this.boxCache(0.32, 0.03, 0.03), wicketWoodMat);
      bail.position.set(0, 0.85, wz);
      stadiumGroup.add(bail);
    });

    // 3. Multi-Tiered Stadium Grandstands
    const tierGeo1 = new THREE.CylinderGeometry(64, 58, 4.2, 36, 1, true);
    const tMesh1 = new THREE.Mesh(tierGeo1, tierGreenMat);
    tMesh1.position.y = 2.1;
    stadiumGroup.add(tMesh1);

    const tierGeo2 = new THREE.CylinderGeometry(71, 64, 4.5, 36, 1, true);
    const tMesh2 = new THREE.Mesh(tierGeo2, tierRedMat);
    tMesh2.position.y = 6.4;
    stadiumGroup.add(tMesh2);

    const tierGeo3 = new THREE.CylinderGeometry(78, 71, 5.0, 36, 1, true);
    const tMesh3 = new THREE.Mesh(tierGeo3, tierGoldMat);
    tMesh3.position.y = 11.1;
    stadiumGroup.add(tMesh3);

    const outerWall = new THREE.Mesh(new THREE.CylinderGeometry(79, 79, 15.5, 36, 1, true), stadiumWallMat);
    outerWall.position.y = 7.75;
    outerWall.castShadow = true;
    stadiumGroup.add(outerWall);

    // 4. Grand 4-Story VIP Pavilion & Media Center (South Stand)
    const pavilion = this.sharedBox(44, 22, 18, pavilionMat, 0, 11, 72);
    pavilion.castShadow = true;
    stadiumGroup.add(pavilion);

    // 5. Electronic Cricket Scoreboard
    const scoreboardTex = createStadiumScoreboardTexture();
    const scoreboardMesh = new THREE.Mesh(
      new THREE.BoxGeometry(18, 9, 0.4),
      new THREE.MeshBasicMaterial({ map: scoreboardTex })
    );
    scoreboardMesh.position.set(0, 21, -72);
    stadiumGroup.add(scoreboardMesh);

    // 6. 6 Colossal Steel Lattice Floodlight Pylons
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2;
      const fx = Math.cos(angle) * 82;
      const fz = Math.sin(angle) * 82;

      const mast = new THREE.Mesh(this.cylCache(0.7, 1.8, 44, 8), floodlightLatticeMat);
      mast.position.set(fx, 22, fz);
      stadiumGroup.add(mast);

      const headFrame = new THREE.Mesh(this.boxCache(9.5, 5.2, 0.8), floodlightLatticeMat);
      headFrame.position.set(fx, 44.5, fz);
      headFrame.lookAt(sX, 10, sZ);
      stadiumGroup.add(headFrame);

      for (let ly = -1.8; ly <= 1.8; ly += 1.2) {
        for (let lx = -3.8; lx <= 3.8; lx += 1.2) {
          const lamp = new THREE.Mesh(this.boxCache(0.85, 0.85, 0.2), halogenGlowMat);
          lamp.position.set(lx, ly, -0.45);
          headFrame.add(lamp);
        }
      }
    }

    this.buildingColliders.push({
      minX: sX - 82,
      maxX: sX + 82,
      minZ: sZ - 82,
      maxZ: sZ + 82,
      tag: 'stadium',
    });

    this.scene.add(stadiumGroup);
  }

  /**
   * Dhaka Signature Mega Shopping Malls:
   * 1. Bashundhara City Shopping Complex (Panthapath) with iconic blue glass dome
   * 2. Jamuna Future Park (Pragati Sarani) with Roman colonnade & theme park skyline
   * 3. Historic New Market with red-brick clock tower
   */
  private buildDhakaMegaShoppingMalls() {
    const glassMat = new THREE.MeshStandardMaterial({
      color: '#0284c7',
      metalness: 0.88,
      roughness: 0.15,
    });
    const marbleMat = new THREE.MeshStandardMaterial({
      color: '#f8fafc',
      roughness: 0.45,
    });
    const terracottaMallMat = new THREE.MeshStandardMaterial({
      color: '#9a3412',
      roughness: 0.75,
    });
    const pillarMat = new THREE.MeshStandardMaterial({
      color: '#ffffff',
      roughness: 0.5,
    });
    const newMarketBrickMat = new THREE.MeshStandardMaterial({
      color: '#b91c1c',
      roughness: 0.82,
    });

    // --- 1. BASHUNDHARA CITY MEGA MALL (Panthapath: X = -170, Z = -75) ---
    const bCityGroup = new THREE.Group();
    bCityGroup.position.set(-170, 0, -75);

    const bPodium = this.sharedBox(74, 44, 64, terracottaMallMat, 0, 22, 0);
    bPodium.castShadow = true;
    bCityGroup.add(bPodium);

    const bUpperGlass = this.sharedBox(56, 14, 48, glassMat, 0, 51, 0);
    bCityGroup.add(bUpperGlass);

    const domeGeo = new THREE.SphereGeometry(13.5, 18, 12, 0, Math.PI * 2, 0, Math.PI / 2);
    const domeMesh = new THREE.Mesh(domeGeo, glassMat);
    domeMesh.position.set(0, 58, 0);
    bCityGroup.add(domeMesh);

    const bCitySignTex = createMallSignboardTexture(
      'বসুন্ধরা সিটি শপিং কমপ্লেক্স',
      'BASHUNDHARA CITY MEGA COMPLEX',
      'STAR CINEPLEX 🎬 | 2000+ FASHION & ELECTRONICS STORES',
      '#0369a1'
    );
    const bSignBoard = new THREE.Mesh(new THREE.BoxGeometry(32, 7.5, 0.4), new THREE.MeshBasicMaterial({ map: bCitySignTex }));
    bSignBoard.position.set(0, 26, 32.3);
    bCityGroup.add(bSignBoard);

    const portico = this.sharedBox(36, 1.2, 14, glassMat, 0, 6.5, 38);
    bCityGroup.add(portico);
    [-15, 15].forEach((px) => {
      const pCol = new THREE.Mesh(this.cylCache(0.6, 0.6, 6.5, 12), pillarMat);
      pCol.position.set(px, 3.25, 44);
      bCityGroup.add(pCol);
    });

    this.buildingColliders.push({
      minX: -170 - 38,
      maxX: -170 + 38,
      minZ: -75 - 34,
      maxZ: -75 + 46,
      tag: 'bashundhara_city',
    });
    this.scene.add(bCityGroup);

    // --- 2. JAMUNA FUTURE PARK (Pragati Sarani / Bashundhara R/A: X = 520, Z = -385) ---
    // Hollow multi-story architectural shell with open glass entrance gates, Roman colonnade,
    // front drop-off plaza, glass curtain facades, skylight dome & rooftop Ferris wheel.
    const MX = this.jfpCenter.x;
    const MZ = this.jfpCenter.z;
    const MW = 112; // X: -56..+56 (464..576)
    const MD = 72;  // Z: -36..+36 (-421..-349)
    const MH = 17.6;

    const jfpGroup = new THREE.Group();
    jfpGroup.position.set(MX, 0, MZ);

    const facadeGlassMat = new THREE.MeshStandardMaterial({
      color: '#38bdf8',
      metalness: 0.72,
      roughness: 0.14,
      transparent: true,
      opacity: 0.42,
    });
    const darkTrimMat = new THREE.MeshStandardMaterial({
      color: '#1e1b4b',
      metalness: 0.55,
      roughness: 0.35,
    });
    const plazaGraniteMat = new THREE.MeshStandardMaterial({
      color: '#cbd5e1',
      roughness: 0.45,
      metalness: 0.08,
    });
    const champagneGoldMat = new THREE.MeshStandardMaterial({
      color: '#eab308',
      metalness: 0.78,
      roughness: 0.24,
    });
    const darkTitaniumMat = new THREE.MeshStandardMaterial({
      color: '#1e293b',
      metalness: 0.72,
      roughness: 0.3,
    });
    const neonVioletMat = new THREE.MeshBasicMaterial({ color: '#c084fc' });
    const neonCyanMat = new THREE.MeshBasicMaterial({ color: '#38bdf8' });

    // Front Drop-Off Marble Plaza (South apron Z: -349 .. -328, clear of Z=-315 road)
    const frontPlaza = this.sharedBox(118, 0.16, 22, plazaGraniteMat, 0, 0.08, 46);
    frontPlaza.receiveShadow = true;
    jfpGroup.add(frontPlaza);

    // Decorative Drop-Off Curb & Driveway Bay Lanes on Plaza Forecourt
    [-16, 16].forEach((lx) => {
      const bayLine = this.sharedBox(14, 0.03, 0.25, champagneGoldMat, lx, 0.17, 54.5);
      jfpGroup.add(bayLine);
    });

    // Twin Flanking Outdoor Plaza Water Fountains (lx = ±28, lz = 45)
    const plazaWaterMat = new THREE.MeshStandardMaterial({
      color: '#0284c7',
      roughness: 0.08,
      metalness: 0.25,
      transparent: true,
      opacity: 0.85,
    });
    [-28, 28].forEach((fx) => {
      const basin = new THREE.Mesh(new THREE.CylinderGeometry(3.5, 3.8, 0.55, 24), marbleMat);
      basin.position.set(fx, 0.43, 45);
      jfpGroup.add(basin);
      const water = new THREE.Mesh(new THREE.CylinderGeometry(3.15, 3.15, 0.2, 24), plazaWaterMat);
      water.position.set(fx, 0.64, 45);
      jfpGroup.add(water);
      const spire = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.65, 1.4, 14), champagneGoldMat);
      spire.position.set(fx, 1.1, 45);
      jfpGroup.add(spire);
      const jet = new THREE.Mesh(
        new THREE.CylinderGeometry(0.1, 0.26, 2.1, 10),
        new THREE.MeshBasicMaterial({ color: '#bae6fd', transparent: true, opacity: 0.72 })
      );
      jet.position.set(fx, 2.4, 45);
      jfpGroup.add(jet);
      this.circleColliders.push({ x: MX + fx, z: MZ + 45, radius: 3.85, tag: 'jfp_plaza_fountain' });
    });

    // Landscaped Royal Palm & Flower Planter Islands along Forecourt
    const outerPalmTrunkMat = new THREE.MeshStandardMaterial({ color: '#78350f', roughness: 0.9 });
    const outerPalmLeafMat = new THREE.MeshStandardMaterial({ color: '#15803d', roughness: 0.68 });
    [-42, -16, 16, 42].forEach((px) => {
      const planter = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.65, 3.2), darkTitaniumMat);
      planter.position.set(px, 0.48, 49.5);
      jfpGroup.add(planter);
      const trunk = new THREE.Mesh(this.cylCache(0.18, 0.26, 4.6, 8), outerPalmTrunkMat);
      trunk.position.set(px, 2.9, 49.5);
      jfpGroup.add(trunk);
      const crown = new THREE.Mesh(new THREE.DodecahedronGeometry(1.65, 0), outerPalmLeafMat);
      crown.scale.set(1.25, 0.6, 1.25);
      crown.position.set(px, 5.3, 49.5);
      jfpGroup.add(crown);
      this.circleColliders.push({ x: MX + px, z: MZ + 49.5, radius: 1.75, tag: 'jfp_plaza_palm' });
    });

    // Wide Crimson Entrance Red Carpet Runner leading into South Gate
    const redCarpetMat = new THREE.MeshStandardMaterial({ color: '#991b1b', roughness: 0.85 });
    const entryCarpet = this.sharedBox(10, 0.04, 18, redCarpetMat, 0, 0.20, 40);
    jfpGroup.add(entryCarpet);

    // Grand Glass & Steel Porte-Cochere Canopy extending over South Drop-Off Entrance
    const porteCanopy = this.sharedBox(22, 0.35, 11.5, facadeGlassMat, 0, 6.2, 42.2);
    jfpGroup.add(porteCanopy);
    const porteFrame = this.sharedBox(22.5, 0.48, 11.8, darkTitaniumMat, 0, 6.45, 42.2);
    jfpGroup.add(porteFrame);
    const porteTrim = this.sharedBox(22.6, 0.14, 11.9, neonVioletMat, 0, 6.18, 42.2);
    jfpGroup.add(porteTrim);
    // Warm recessed ceiling light bars under Porte-Cochere
    [-5, 0, 5].forEach((lx) => {
      jfpGroup.add(this.sharedBox(0.35, 0.08, 9.5, new THREE.MeshBasicMaterial({ color: '#fef9c3' }), lx, 6.0, 42.2));
    });
    // Paired V-Shaped Canopy Support Columns (clear of central walkway)
    [-9.8, 9.8].forEach((cx) => {
      const col = new THREE.Mesh(this.cylCache(0.35, 0.45, 6.1, 12), champagneGoldMat);
      col.position.set(cx, 3.1, 46.8);
      jfpGroup.add(col);
      this.circleColliders.push({ x: MX + cx, z: MZ + 46.8, radius: 0.55, tag: 'jfp_porte_pillar' });
    });

    // Sleek Entrance Security Walk-Through Scanners inside South Gate (wide 5.6m center gap unobstructed)
    [-3.1, 3.1].forEach((sx) => {
      const post = this.sharedBox(0.32, 2.5, 0.65, darkTitaniumMat, sx, 1.5, 34.4);
      const led = this.sharedBox(0.14, 2.1, 0.08, new THREE.MeshBasicMaterial({ color: '#10b981' }), sx, 1.5, 34.76);
      jfpGroup.add(post, led);
    });
    jfpGroup.add(this.sharedBox(6.5, 0.28, 0.65, darkTitaniumMat, 0, 2.85, 34.4));

    // Sleek Chrome Pedestrian-Only Bollards outside South, West & East Gates (blocks cars, lets player walk through!)
    const bollardMat = new THREE.MeshStandardMaterial({ color: '#e2e8f0', metalness: 0.9, roughness: 0.18 });
    [-6, -4, -2, 0, 2, 4, 6].forEach((bx) => {
      const bol = new THREE.Mesh(this.cylCache(0.14, 0.16, 0.95, 10), bollardMat);
      bol.position.set(bx, 0.55, 42.5);
      jfpGroup.add(bol);
      this.circleColliders.push({ x: MX + bx, z: MZ + 42.5, radius: 0.42, tag: 'jfp_bollard' });
    });
    [-4, -1.5, 1.5, 4].forEach((bz) => {
      [-58.5, 58.5].forEach((bx) => {
        const bol = new THREE.Mesh(this.cylCache(0.14, 0.16, 0.95, 10), bollardMat);
        bol.position.set(bx, 0.55, bz);
        jfpGroup.add(bol);
        this.circleColliders.push({ x: MX + bx, z: MZ + bz, radius: 0.42, tag: 'jfp_bollard' });
      });
    });

    // Helper to build perimeter wall with lower marble, panoramic glass & vertical titanium mullions
    const addExteriorWall = (wx: number, wz: number, ww: number, wd: number) => {
      // Ground floor marble wall with champagne-gold plinth trim
      const lower = this.sharedBox(ww, 5.2, wd, marbleMat, wx, 2.6, wz);
      lower.castShadow = true;
      lower.receiveShadow = true;
      jfpGroup.add(lower);
      // Upper curtain glass band (Y: 5.2..16.2)
      const glass = this.sharedBox(ww, 10.6, wd, facadeGlassMat, wx, 10.5, wz);
      jfpGroup.add(glass);
      // Horizontal floor spandrel dividers (1F & 2F exterior expression)
      jfpGroup.add(this.sharedBox(ww + 0.22, 0.42, wd + 0.22, darkTitaniumMat, wx, 5.4, wz));
      jfpGroup.add(this.sharedBox(ww + 0.22, 0.42, wd + 0.22, darkTitaniumMat, wx, 10.55, wz));
      // Vertical curtain-wall mullions
      const isHorizontalWall = ww > wd;
      const span = isHorizontalWall ? ww : wd;
      for (let m = -span / 2 + 5; m <= span / 2 - 5; m += 7.5) {
        const mullion = this.sharedBox(
          isHorizontalWall ? 0.28 : wd + 0.26,
          10.8,
          isHorizontalWall ? wd + 0.26 : 0.28,
          darkTitaniumMat,
          isHorizontalWall ? wx + m : wx,
          10.5,
          isHorizontalWall ? wz : wz + m
        );
        jfpGroup.add(mullion);
      }
      // Top cornice fascia + gold accent trim
      const fascia = this.sharedBox(ww + 0.4, 1.8, wd + 0.4, darkTrimMat, wx, 16.7, wz);
      const corniceGold = this.sharedBox(ww + 0.55, 0.24, wd + 0.55, champagneGoldMat, wx, 17.65, wz);
      jfpGroup.add(fascia, corniceGold);
    };

    // 4 Corner Architectural Chamfered Limestone Piers framing JFP corners
    [
      [-MW / 2, -MD / 2],
      [MW / 2, -MD / 2],
      [-MW / 2, MD / 2],
      [MW / 2, MD / 2],
    ].forEach(([cx, cz]) => {
      const cornerPier = this.sharedBox(3.6, 18.2, 3.6, marbleMat, cx, 9.1, cz);
      const cornerCap = this.sharedBox(4.0, 0.5, 4.0, champagneGoldMat, cx, 18.3, cz);
      jfpGroup.add(cornerPier, cornerCap);
    });

    // North Wall (solid perimeter)
    addExteriorWall(0, -MD / 2, MW, 1.2);
    this.buildingColliders.push({
      minX: MX - MW / 2 - 0.8, maxX: MX + MW / 2 + 0.8,
      minZ: MZ - MD / 2 - 0.8, maxZ: MZ - MD / 2 + 0.8,
      minY: 0, maxY: 22, tag: 'jfp_wall',
    });

    // South Wall (split left & right around 14m wide open South Main Entrance X: -7..+7)
    addExteriorWall(-31.5, MD / 2, 49, 1.2);
    addExteriorWall(31.5, MD / 2, 49, 1.2);
    // Upper header & glass transom over South Main Entrance
    const southPortalGlass = this.sharedBox(14, 10.6, 1.2, facadeGlassMat, 0, 10.5, MD / 2);
    jfpGroup.add(southPortalGlass);
    const southPortalFascia = this.sharedBox(14.6, 2.2, 1.6, darkTrimMat, 0, 16.5, MD / 2);
    jfpGroup.add(southPortalFascia);
    // Retracted open automatic glass door leaves flanking South Entrance
    [-7.6, 7.6].forEach((dx) => {
      const doorLeaf = this.sharedBox(2.4, 4.8, 0.18, facadeGlassMat, dx, 2.5, MD / 2 + 0.2);
      jfpGroup.add(doorLeaf);
    });
    this.buildingColliders.push(
      { minX: MX - MW / 2 - 0.8, maxX: MX - 7.0, minZ: MZ + MD / 2 - 0.8, maxZ: MZ + MD / 2 + 0.8, minY: 0, maxY: 22, tag: 'jfp_wall' },
      { minX: MX + 7.0, maxX: MX + MW / 2 + 0.8, minZ: MZ + MD / 2 - 0.8, maxZ: MZ + MD / 2 + 0.8, minY: 0, maxY: 22, tag: 'jfp_wall' }
    );

    // West & East Walls (each split around 10m open Side Entrance Z: -5..+5)
    [-MW / 2, MW / 2].forEach((wx) => {
      addExteriorWall(wx, -20.5, 1.2, 31);
      addExteriorWall(wx, 20.5, 1.2, 31);
      const sideTransom = this.sharedBox(1.2, 10.6, 10, facadeGlassMat, wx, 10.5, 0);
      jfpGroup.add(sideTransom);
      const sideFascia = this.sharedBox(1.6, 2.2, 10.4, darkTrimMat, wx, 16.5, 0);
      jfpGroup.add(sideFascia);
      this.buildingColliders.push(
        { minX: MX + wx - 0.8, maxX: MX + wx + 0.8, minZ: MZ - MD / 2 - 0.8, maxZ: MZ - 5.0, minY: 0, maxY: 22, tag: 'jfp_wall' },
        { minX: MX + wx - 0.8, maxX: MX + wx + 0.8, minZ: MZ + 5.0, maxZ: MZ + MD / 2 + 0.8, minY: 0, maxY: 22, tag: 'jfp_wall' }
      );
    });

    // Roman Colonnade Pillars along South Frontage (leaving center entrance bay wide open!)
    for (let c = -45; c <= 45; c += 9) {
      if (Math.abs(c) < 5) continue;
      const col = new THREE.Mesh(this.cylCache(1.05, 1.15, 17.5, 14), pillarMat);
      col.position.set(c, 8.75, 41.2);
      col.castShadow = true;
      jfpGroup.add(col);
      this.circleColliders.push({ x: MX + c, z: MZ + 41.2, radius: 1.25, tag: 'jfp_pillar' });
    }
    const colonnadeArch = this.sharedBox(102, 2.6, 6.5, marbleMat, 0, 18.6, 40.2);
    jfpGroup.add(colonnadeArch);

    // Grand Illuminated Jamuna Future Park Signboards (South Main + East/West Wing Facades)
    const jfpSignTex = createMallSignboardTexture(
      'যমুনা ফিউচার পার্ক',
      'JAMUNA FUTURE PARK',
      "SOUTH ASIA'S LARGEST MALL | 300+ SHOPS | FOOD COURT | BLOCKBUSTER CINEMAS",
      '#6b21a8'
    );
    const jfpSignMat = new THREE.MeshBasicMaterial({ map: jfpSignTex });
    const jfpSignBoard = new THREE.Mesh(
      new THREE.BoxGeometry(46, 8.2, 0.45),
      jfpSignMat
    );
    jfpSignBoard.position.set(0, 23.6, 41.5);
    jfpGroup.add(jfpSignBoard);

    [-MW / 2 - 0.65, MW / 2 + 0.65].forEach((sx, idx) => {
      const wingSign = new THREE.Mesh(new THREE.BoxGeometry(0.4, 4.8, 28), jfpSignMat);
      wingSign.position.set(sx, 19.6, 0);
      if (idx === 0) wingSign.rotation.y = Math.PI;
      jfpGroup.add(wingSign);
    });

    // Iconic Glass Atrium Crown Rotunda Archways above South Facade
    [-18, 0, 18].forEach((ax, aIdx) => {
      const crownRib = new THREE.Mesh(
        new THREE.TorusGeometry(aIdx === 1 ? 14 : 9, 0.35, 8, 20, Math.PI),
        aIdx === 1 ? champagneGoldMat : neonVioletMat
      );
      crownRib.position.set(ax, 17.6, 36.2);
      jfpGroup.add(crownRib);
    });

    // Perimeter Roof Slabs around 32m x 24m Central Skylight Atrium Opening
    const roofSlabMat = new THREE.MeshStandardMaterial({ color: '#e2e8f0', roughness: 0.65 });
    [
      { x: -36, z: 0, w: 40, d: MD },
      { x: 36, z: 0, w: 40, d: MD },
      { x: 0, z: -24, w: 32, d: 24 },
      { x: 0, z: 24, w: 32, d: 24 },
    ].forEach((rs) => {
      const rm = this.sharedBox(rs.w, 0.8, rs.d, roofSlabMat, rs.x, MH, rs.z);
      jfpGroup.add(rm);
    });

    // Translucent Glass Skylight over Central Atrium (lets sunlight & sky view in!)
    const atriumSkylight = new THREE.Mesh(
      new THREE.BoxGeometry(32, 0.35, 24),
      new THREE.MeshStandardMaterial({
        color: '#bae6fd',
        roughness: 0.1,
        metalness: 0.3,
        transparent: true,
        opacity: 0.34,
      })
    );
    atriumSkylight.position.set(0, MH + 0.4, 0);
    jfpGroup.add(atriumSkylight);

    // Future Park Iconic Rooftop Amusement Theme Park ("Future World")
    // 1. Anchored Giant Ferris Wheel with Dual A-Frame Support Legs & 12 Passenger Gondolas
    const ferrisHubY = MH + 17.5;
    [-3.2, 3.2].forEach((fz) => {
      [-9.5, 9.5].forEach((lx) => {
        const legLen = Math.hypot(9.5, 17.5);
        const leg = new THREE.Mesh(this.cylCache(0.38, 0.55, legLen, 8), darkTitaniumMat);
        leg.position.set(lx * 0.5, MH + 8.75, -22 + fz);
        leg.rotation.z = lx > 0 ? 0.48 : -0.48;
        jfpGroup.add(leg);
      });
    });
    const ferrisAxle = new THREE.Mesh(this.cylCache(0.7, 0.7, 7.6, 12).rotateX(Math.PI / 2), champagneGoldMat);
    ferrisAxle.position.set(0, ferrisHubY, -22);
    jfpGroup.add(ferrisAxle);

    const ferrisGroup = new THREE.Group();
    ferrisGroup.position.set(0, ferrisHubY, -22);
    const wheelRim = new THREE.Mesh(new THREE.TorusGeometry(15, 0.45, 8, 28), pillarMat);
    const innerRim = new THREE.Mesh(new THREE.TorusGeometry(10, 0.25, 6, 24), neonVioletMat);
    const outerNeonRim = new THREE.Mesh(new THREE.TorusGeometry(15.45, 0.16, 6, 28), neonCyanMat);
    ferrisGroup.add(wheelRim, innerRim, outerNeonRim);
    for (let sp = 0; sp < 12; sp++) {
      const spMesh = new THREE.Mesh(this.boxCache(0.18, 30, 0.18), pillarMat);
      spMesh.rotation.z = (sp / 12) * Math.PI;
      ferrisGroup.add(spMesh);
    }
    const gondolaColors = ['#ef4444', '#f59e0b', '#10b981', '#0ea5e9', '#a855f7', '#ec4899'];
    for (let gIdx = 0; gIdx < 12; gIdx++) {
      const ang = (gIdx / 12) * Math.PI * 2;
      const gPod = new THREE.Group();
      gPod.position.set(Math.cos(ang) * 15, Math.sin(ang) * 15, 0);
      const hanger = new THREE.Mesh(this.boxCache(0.14, 1.1, 0.14), champagneGoldMat);
      hanger.position.y = -0.55;
      const cabin = new THREE.Mesh(
        this.boxCache(1.65, 1.45, 1.4),
        new THREE.MeshStandardMaterial({ color: gondolaColors[gIdx % gondolaColors.length], roughness: 0.35 })
      );
      cabin.position.y = -1.6;
      const cabinWin = new THREE.Mesh(this.boxCache(1.7, 0.55, 1.05), neonCyanMat);
      cabinWin.position.y = -1.45;
      gPod.add(hanger, cabin, cabinWin);
      ferrisGroup.add(gPod);
      this.jfpFerrisGondolas.push(gPod);
    }
    this.jfpFerrisWheel = ferrisGroup;
    jfpGroup.add(ferrisGroup);

    // 2. Rooftop Sky Drop Tower Spire (West Wing)
    const dropTowerX = -38;
    const dropTowerZ = -18;
    const dropSpire = new THREE.Mesh(this.boxCache(1.6, 24, 1.6), darkTitaniumMat);
    dropSpire.position.set(dropTowerX, MH + 12, dropTowerZ);
    const dropCrown = new THREE.Mesh(this.cylCache(0.2, 1.8, 3.2, 8), neonVioletMat);
    dropCrown.position.set(dropTowerX, MH + 25.5, dropTowerZ);
    const dropCar = new THREE.Mesh(
      new THREE.TorusGeometry(2.1, 0.42, 8, 18).rotateX(Math.PI / 2),
      new THREE.MeshBasicMaterial({ color: '#facc15' })
    );
    dropCar.position.set(dropTowerX, MH + 6, dropTowerZ);
    this.jfpDropCar = dropCar;
    jfpGroup.add(dropSpire, dropCrown, dropCar);

    // 3. Rooftop Future World Carousel Pavilion (East Wing)
    const carouselX = 38;
    const carouselZ = -18;
    const carBase = new THREE.Mesh(this.cylCache(6.5, 6.8, 1.0, 18), marbleMat);
    carBase.position.set(carouselX, MH + 0.5, carouselZ);
    const carRoof = new THREE.Mesh(this.cylCache(0.4, 7.2, 3.8, 18), new THREE.MeshStandardMaterial({ color: '#be185d', roughness: 0.35 }));
    carRoof.position.set(carouselX, MH + 5.8, carouselZ);
    const carCol = new THREE.Mesh(this.cylCache(0.55, 0.55, 4.2, 12), champagneGoldMat);
    carCol.position.set(carouselX, MH + 2.8, carouselZ);
    jfpGroup.add(carBase, carRoof, carCol);

    this.scene.add(jfpGroup);

    // --- 3. NEW MARKET HISTORIC ARCHWAY & CLOCK TOWER (X = -170, Z = 220) ---
    const nmGroup = new THREE.Group();
    nmGroup.position.set(-170, 0, 220);

    const tower = this.sharedBox(10, 28, 10, newMarketBrickMat, 0, 14, 0);
    nmGroup.add(tower);

    const gateArch = this.sharedBox(24, 8, 4, newMarketBrickMat, 0, 4, 0);
    nmGroup.add(gateArch);

    const clockFace = new THREE.Mesh(new THREE.CircleGeometry(2.1, 16), new THREE.MeshBasicMaterial({ color: '#fef08a' }));
    clockFace.position.set(0, 22, 5.05);
    nmGroup.add(clockFace);

    this.scene.add(nmGroup);
  }

  /**
   * Jamuna Future Park — Full 3-Floor Walkable Shopping Mall Interior at (520, 0, -385).
   * Features:
   *  - Ground Floor (Y=0.25m): Grand Marble Atrium, Central Water Fountain, Crystal Chandelier,
   *    Panoramic Glass Elevator, 8 Walk-in Anchor Shops (Aarong, Samsung, Yellow, Apex, Ecstasy, Bata, iStore, DBBL ATM)
   *  - Level 1 (Y=5.4m): 8 Walk-in Lifestyle & Tech Shops (Star Tech, Xiaomi, Time Zone, Batighar Books, Walton, Diamond World, Shajgoj, Infinity)
   *  - Level 2 (Y=10.6m): Blockbuster Cinemas, Future World Game Zone & Grand Food Court (KFC, Pizza Hut, Gloria Jean's, Deshi Kacchi) + Dining Terrace
   *  - Walkable Sloped Escalators with architectural floor cutouts & Mall NPCs
   */
  private buildJamunaFutureParkInterior() {
    const MX = this.jfpCenter.x; // 520
    const MZ = this.jfpCenter.z; // -385
    const FLOOR_H = 5.15;
    const Y0 = 0.25;
    const Y1 = Y0 + FLOOR_H;       // 5.40m
    const Y2 = Y0 + FLOOR_H * 2;   // 10.55m
    const MW = 110;
    const MD = 70;

    const g = new THREE.Group();
    g.position.set(MX, 0, MZ);
    this.jfpInteriorGroup = g;

    // Materials
    const creamMarbleMat = new THREE.MeshStandardMaterial({ color: '#f8fafc', roughness: 0.22, metalness: 0.08 });
    const slateTileMat = new THREE.MeshStandardMaterial({ color: '#e2e8f0', roughness: 0.28, metalness: 0.06 });
    const darkBorderTileMat = new THREE.MeshStandardMaterial({ color: '#334155', roughness: 0.35 });
    const shopWallMat = new THREE.MeshStandardMaterial({ color: '#f1f5f9', roughness: 0.55 });
    const shopFloorMat = new THREE.MeshStandardMaterial({ color: '#fffbeb', roughness: 0.3 });
    const clearGlassMat = new THREE.MeshStandardMaterial({
      color: '#bae6fd',
      roughness: 0.08,
      metalness: 0.65,
      transparent: true,
      opacity: 0.36,
    });
    const chromeMat = new THREE.MeshStandardMaterial({ color: '#cbd5e1', metalness: 0.9, roughness: 0.14 });
    const goldMat = new THREE.MeshStandardMaterial({ color: '#eab308', metalness: 0.78, roughness: 0.22 });
    const woodMat = new THREE.MeshStandardMaterial({ color: '#78350f', roughness: 0.72 });
    const redCarpetMat = new THREE.MeshStandardMaterial({ color: '#991b1b', roughness: 0.85 });
    const warmLightStripMat = new THREE.MeshBasicMaterial({ color: '#fef9c3' });

    const makeShopSignTex = (brand: string, sub: string, bg: string, fg = '#ffffff') => {
      const c = document.createElement('canvas');
      c.width = 512;
      c.height = 140;
      const ctx = c.getContext('2d')!;
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, 512, 140);
      ctx.strokeStyle = '#fbbf24';
      ctx.lineWidth = 6;
      ctx.strokeRect(4, 4, 504, 132);
      ctx.fillStyle = fg;
      ctx.font = 'bold 52px Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(brand, 256, 74);
      ctx.fillStyle = '#fde68a';
      ctx.font = 'bold 24px Arial, sans-serif';
      ctx.fillText(sub, 256, 114);
      const tex = new THREE.CanvasTexture(c);
      tex.colorSpace = THREE.SRGBColorSpace;
      return tex;
    };

    const addFloorSlab = (lx: number, fy: number, lz: number, w: number, d: number, mat: THREE.Material) => {
      const slab = this.sharedBox(w, 0.28, d, mat, lx, fy - 0.14, lz);
      slab.receiveShadow = true;
      g.add(slab);
    };

    // ─── 1. GROUND FLOOR SLAB (Y = 0.25m) ─────────────────────────────────
    addFloorSlab(0, Y0, 0, MW, MD, creamMarbleMat);
    // Decorative dark granite atrium border inlay
    addFloorSlab(0, Y0 + 0.015, 0, 32, 26, darkBorderTileMat);
    addFloorSlab(0, Y0 + 0.025, 0, 29, 23, slateTileMat);

    // ─── 2. FIRST FLOOR MEZZANINE (Y = 5.40m) WITH ATRIUM & WEST ESCALATOR WELL ───
    // North & South full-width gallery strips (Z: -35..-11 and +11..+35)
    addFloorSlab(0, Y1, -23, MW, 24, slateTileMat);
    addFloorSlab(0, Y1, 23, MW, 24, slateTileMat);
    // East gallery (X: +14..+55, Z: -11..+11)
    addFloorSlab(34.5, Y1, 0, 41, 22, slateTileMat);
    // West gallery split around West Escalator well (well at X: -25.2..-19.8, Z: -9..+9)
    addFloorSlab(-40.1, Y1, 0, 29.8, 22, slateTileMat);   // X: -55 .. -25.2
    addFloorSlab(-16.9, Y1, 0, 5.8, 22, slateTileMat);    // X: -19.8 .. -14
    addFloorSlab(-22.5, Y1, -10, 5.4, 2, slateTileMat);   // bridge strip north of well
    addFloorSlab(-22.5, Y1, 10, 5.4, 2, slateTileMat);    // bridge strip south of well

    // ─── 3. SECOND FLOOR MEZZANINE (Y = 10.55m) WITH ATRIUM & EAST ESCALATOR WELL ───
    addFloorSlab(0, Y2, -23, MW, 24, slateTileMat);
    addFloorSlab(0, Y2, 23, MW, 24, slateTileMat);
    // West gallery (X: -55..-14, Z: -11..+11)
    addFloorSlab(-34.5, Y2, 0, 41, 22, slateTileMat);
    // East gallery split around East Escalator well (well at X: +19.8..+25.2, Z: -9..+9)
    addFloorSlab(40.1, Y2, 0, 29.8, 22, slateTileMat);    // X: +25.2 .. +55
    addFloorSlab(16.9, Y2, 0, 5.8, 22, slateTileMat);     // X: +14 .. +19.8
    addFloorSlab(22.5, Y2, -10, 5.4, 2, slateTileMat);
    addFloorSlab(22.5, Y2, 10, 5.4, 2, slateTileMat);

    // ─── 4. ATRIUM GLASS SAFETY RAILINGS (1F & 2F) ────────────────────────
    [
      { fy: Y1, minY: 4.5, maxY: 9.8 },
      { fy: Y2, minY: 9.9, maxY: 16.5 },
    ].forEach(({ fy, minY, maxY }) => {
      // North atrium edge (leave center 4m gap at X:-2..+2 for Glass Elevator landing)
      [
        { lx: -8, lz: -11, w: 12, d: 0.25 },
        { lx: 8, lz: -11, w: 12, d: 0.25 },
        { lx: 0, lz: 11, w: 28, d: 0.25 },   // South atrium edge
        { lx: -14, lz: 0, w: 0.25, d: 22 }, // West atrium edge
        { lx: 14, lz: 0, w: 0.25, d: 22 },  // East atrium edge
      ].forEach((r) => {
        const glass = this.sharedBox(r.w, 1.15, r.d, clearGlassMat, r.lx, fy + 0.58, r.lz);
        g.add(glass);
        const rail = this.sharedBox(r.w + 0.1, 0.08, r.d + 0.1, goldMat, r.lx, fy + 1.18, r.lz);
        g.add(rail);
        this.buildingColliders.push({
          minX: MX + r.lx - r.w / 2 - 0.15,
          maxX: MX + r.lx + r.w / 2 + 0.15,
          minZ: MZ + r.lz - r.d / 2 - 0.15,
          maxZ: MZ + r.lz + r.d / 2 + 0.15,
          minY,
          maxY,
          tag: 'jfp_railing',
        });
      });
    });

    // ─── 5. WALKABLE SLOPED ESCALATORS (GF ↔ 1F West, 1F ↔ 2F East) ───────
    const buildEscalator = (lx: number, baseFy: number, dirLabel: string, minYWell: number, maxYWell: number) => {
      const steps = 22;
      const runZ = 18; // Z: +9 (bottom) -> -9 (top)
      for (let s = 0; s < steps; s++) {
        const t = (s + 0.5) / steps;
        const sz = 9 - t * runZ;
        const sy = baseFy + t * FLOOR_H;
        const tread = this.sharedBox(4.4, 0.24, runZ / steps + 0.08, s % 2 === 0 ? chromeMat : darkBorderTileMat, lx, sy - 0.12, sz);
        g.add(tread);
      }
      // Angled glass balustrades & gold handrails
      const slopeAngle = Math.atan2(FLOOR_H, runZ);
      const slopeLen = Math.hypot(runZ, FLOOR_H);
      [-2.35, 2.35].forEach((dx) => {
        const bal = new THREE.Mesh(this.boxCache(0.14, 1.05, slopeLen), clearGlassMat);
        bal.position.set(lx + dx, baseFy + FLOOR_H * 0.5 + 0.52, 0);
        bal.rotation.x = slopeAngle;
        g.add(bal);
        const hr = new THREE.Mesh(this.boxCache(0.22, 0.1, slopeLen + 0.4), goldMat);
        hr.position.set(lx + dx, baseFy + FLOOR_H * 0.5 + 1.05, 0);
        hr.rotation.x = slopeAngle;
        g.add(hr);
        // Side rail collider so player stays smoothly inside escalator lane
        this.buildingColliders.push({
          minX: MX + lx + dx - 0.22,
          maxX: MX + lx + dx + 0.22,
          minZ: MZ - 9.1,
          maxZ: MZ + 9.1,
          minY: minYWell,
          maxY: maxYWell,
          tag: 'jfp_escalator_rail',
        });
      });
      // Illuminated floor badge totem at bottom entry
      const totemSign = new THREE.Mesh(
        new THREE.BoxGeometry(2.6, 0.75, 0.18),
        new THREE.MeshBasicMaterial({ map: makeShopSignTex(dirLabel, 'ESCALATOR / চলন্ত সিঁড়ি', '#4c1d95') })
      );
      totemSign.position.set(lx, baseFy + 2.6, 9.2);
      g.add(totemSign);
    };

    buildEscalator(-22.5, Y0, '▲ TO 1ST FLOOR', 0, 9.8);
    buildEscalator(22.5, Y1, '▲ TO 2ND FLOOR', 4.6, 16.5);

    // ─── 6. CENTRAL GRAND ATRIUM: CASCADING FOUNTAIN, PALMS, KIOSKS, CHANDELIER & ELEVATOR ───
    const fountainRim = new THREE.Mesh(new THREE.CylinderGeometry(4.4, 4.7, 0.58, 28), creamMarbleMat);
    fountainRim.position.set(0, Y0 + 0.29, 0);
    g.add(fountainRim);
    const fountainWater = new THREE.Mesh(
      new THREE.CylinderGeometry(4.0, 4.0, 0.35, 28),
      new THREE.MeshStandardMaterial({ color: '#0ea5e9', roughness: 0.06, metalness: 0.2, transparent: true, opacity: 0.82 })
    );
    fountainWater.position.set(0, Y0 + 0.42, 0);
    g.add(fountainWater);
    const fountainGlowRing = new THREE.Mesh(
      new THREE.TorusGeometry(3.6, 0.08, 6, 28).rotateX(Math.PI / 2),
      new THREE.MeshBasicMaterial({ color: '#38bdf8' })
    );
    fountainGlowRing.position.set(0, Y0 + 0.56, 0);
    g.add(fountainGlowRing);
    const fountainUpperBowl = new THREE.Mesh(new THREE.CylinderGeometry(2.1, 1.1, 0.42, 20), creamMarbleMat);
    fountainUpperBowl.position.set(0, Y0 + 1.45, 0);
    g.add(fountainUpperBowl);
    const fountainPlinth = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 1.3, 1.2, 16), goldMat);
    fountainPlinth.position.set(0, Y0 + 0.85, 0);
    g.add(fountainPlinth);
    const fountainJet = new THREE.Mesh(
      new THREE.CylinderGeometry(0.14, 0.35, 3.2, 12),
      new THREE.MeshBasicMaterial({ color: '#bae6fd', transparent: true, opacity: 0.75 })
    );
    fountainJet.position.set(0, Y0 + 2.6, 0);
    g.add(fountainJet);
    this.createFountainSpraySystem(MX, Y0 + 0.55, MZ, 12, 3.2, 3.6);
    this.circleColliders.push({ x: MX, z: MZ, radius: 4.8, tag: 'jfp_fountain' });

    // Ground-Floor Digital Mall Directory Touch Kiosks flanking South Atrium Entry
    [-10.5, 10.5].forEach((kx) => {
      const kBase = this.sharedBox(1.1, 2.2, 0.45, darkBorderTileMat, kx, Y0 + 1.1, 19.5);
      const kScreen = new THREE.Mesh(
        new THREE.PlaneGeometry(0.92, 1.45),
        new THREE.MeshBasicMaterial({
          map: makeShopSignTex('MALL DIRECTORY', 'GF FASHION • 1F TECH • 2F FOOD & IMAX', '#312e81'),
        })
      );
      kScreen.position.set(kx, Y0 + 1.25, 19.74);
      g.add(kBase, kScreen);
      this.circleColliders.push({ x: MX + kx, z: MZ + 19.5, radius: 0.72, tag: 'jfp_kiosk' });
    });

    // Hanging Colorful Atrium Festival Banners suspended under Skylight
    [
      { lx: -9, lz: -5, title: 'EID GRAND', sub: 'SALE UP TO 50%', bg: '#7e22ce' },
      { lx: 9, lz: -5, title: 'BLOCKBUSTER', sub: '3D IMAX CINEMAS', bg: '#991b1b' },
      { lx: -9, lz: 5, title: 'FUTURE WORLD', sub: 'ARCADE & VR', bg: '#0369a1' },
      { lx: 9, lz: 5, title: 'FOOD COURT', sub: '2ND FLOOR', bg: '#b45309' },
    ].forEach((bn) => {
      const bannerMesh = new THREE.Mesh(
        new THREE.BoxGeometry(2.6, 4.4, 0.08),
        new THREE.MeshBasicMaterial({ map: makeShopSignTex(bn.title, bn.sub, bn.bg) })
      );
      bannerMesh.position.set(bn.lx, 13.8, bn.lz);
      g.add(bannerMesh);
    });

    // Indoor Marble Planters & Tropical Royal Palms in Atrium Corners
    const palmTrunkMat = new THREE.MeshStandardMaterial({ color: '#78350f', roughness: 0.9 });
    const palmLeafMat = new THREE.MeshStandardMaterial({ color: '#15803d', roughness: 0.65 });
    [
      [-10.5, -8.5],
      [10.5, -8.5],
      [-10.5, 8.5],
      [10.5, 8.5],
    ].forEach(([px, pz]) => {
      const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 0.65, 0.9, 12), creamMarbleMat);
      pot.position.set(px, Y0 + 0.45, pz);
      g.add(pot);
      const trunk = new THREE.Mesh(this.cylCache(0.16, 0.22, 3.4, 8), palmTrunkMat);
      trunk.position.set(px, Y0 + 2.2, pz);
      g.add(trunk);
      const crown = new THREE.Mesh(new THREE.DodecahedronGeometry(1.35, 0), palmLeafMat);
      crown.scale.set(1.2, 0.65, 1.2);
      crown.position.set(px, Y0 + 4.0, pz);
      g.add(crown);
      this.circleColliders.push({ x: MX + px, z: MZ + pz, radius: 0.9, tag: 'jfp_palm' });
    });

    // Mall Benches around the Atrium
    [
      { x: -6.8, z: 0, rot: Math.PI / 2 },
      { x: 6.8, z: 0, rot: Math.PI / 2 },
      { x: 0, z: 7.2, rot: 0 },
    ].forEach((b) => {
      const bench = this.sharedBox(2.8, 0.45, 0.75, woodMat, b.x, Y0 + 0.35, b.z);
      bench.rotation.y = b.rot;
      g.add(bench);
    });

    // Suspended Crystal & Gold Atrium Chandelier (rotates gently in animate())
    const chandelier = new THREE.Group();
    chandelier.position.set(0, 14.5, 0);
    [3.8, 2.5, 1.2].forEach((rad, i) => {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(rad, 0.11, 8, 28), goldMat);
      ring.rotation.x = Math.PI / 2;
      ring.position.y = -i * 1.1;
      chandelier.add(ring);
      const glow = new THREE.Mesh(new THREE.TorusGeometry(rad - 0.14, 0.06, 6, 24), warmLightStripMat);
      glow.rotation.x = Math.PI / 2;
      glow.position.y = -i * 1.1;
      chandelier.add(glow);
    });
    const dropCable = new THREE.Mesh(this.cylCache(0.06, 0.06, 3.6, 8), goldMat);
    dropCable.position.y = 1.6;
    chandelier.add(dropCable);
    this.jfpChandelier = chandelier;
    g.add(chandelier);

    // Panoramic Glass Capsule Elevator Shaft & Animated Cabin at North Atrium Edge (localX = 0, localZ = -13.2)
    const elevShaft = new THREE.Mesh(new THREE.BoxGeometry(3.2, 16.5, 3.0), clearGlassMat);
    elevShaft.position.set(0, Y0 + 8.25, -13.2);
    g.add(elevShaft);
    [-1.55, 1.55].forEach((ex) => {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(0.18, 16.5, 0.18), goldMat);
      rail.position.set(ex, Y0 + 8.25, -11.7);
      g.add(rail);
    });
    const elevCabGroup = new THREE.Group();
    elevCabGroup.position.set(0, Y0 + 1.5, -13.2);
    const cabBody = new THREE.Mesh(new THREE.CylinderGeometry(1.3, 1.3, 2.7, 16), clearGlassMat);
    const cabFloor = new THREE.Mesh(new THREE.CylinderGeometry(1.35, 1.35, 0.25, 16), goldMat);
    cabFloor.position.y = -1.3;
    const cabCrown = new THREE.Mesh(new THREE.CylinderGeometry(1.35, 1.35, 0.28, 16), goldMat);
    cabCrown.position.y = 1.35;
    const cabLight = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.8, 0.08, 12), warmLightStripMat);
    cabLight.position.y = 1.18;
    elevCabGroup.add(cabBody, cabFloor, cabCrown, cabLight);
    this.jfpElevatorCab = elevCabGroup;
    g.add(elevCabGroup);
    const elevSign = new THREE.Mesh(
      new THREE.BoxGeometry(3.2, 0.7, 0.14),
      new THREE.MeshBasicMaterial({ map: makeShopSignTex('GLASS ELEVATOR', 'PRESS [E] ALL FLOORS', '#6b21a8') })
    );
    elevSign.position.set(0, Y0 + 3.4, -11.55);
    g.add(elevSign);
    // Register elevator interactable on all 3 floors
    [
      { id: 'jfp_elev_0', y: Y0, fl: 0 },
      { id: 'jfp_elev_1', y: Y1, fl: 1 },
      { id: 'jfp_elev_2', y: Y2, fl: 2 },
    ].forEach((el) => {
      this.jfpInteractables.push({
        id: el.id,
        x: MX,
        y: el.y,
        z: MZ - 10.0,
        floor: el.fl,
        category: 'elevator',
        nameEn: 'Panoramic Glass Elevator',
        nameBn: 'গ্লাস লিফট',
        labelEn: `[E] Ride Glass Elevator (Currently ${el.fl === 0 ? 'Ground' : el.fl === 1 ? '1st Floor' : '2nd Floor'})`,
        labelBn: `[E] গ্লাস লিফটে উঠুন (${el.fl === 0 ? 'নিচতলা' : el.fl === 1 ? '২য় তলা' : '৩য় তলা'})`,
        cost: 0,
      });
    });

    // ─── 7. WALK-IN 3D SHOPS BUILDER ──────────────────────────────────────
    const buildWalkInShop = (opts: {
      id: string;
      lx: number;
      fy: number;
      lz: number;
      w: number;
      d: number;
      facing: 'south' | 'north';
      floor: number;
      brand: string;
      sub: string;
      bg: string;
      category: 'fashion' | 'food' | 'cinema' | 'tech' | 'arcade' | 'atm' | 'books' | 'footwear';
      labelEn: string;
      labelBn: string;
      cost: number;
    }) => {
      const { lx, fy, lz, w, d, facing, floor, brand, sub, bg, category } = opts;
      const sg = new THREE.Group();
      sg.position.set(lx, fy, lz);
      const wallH = FLOOR_H - 0.35;
      const dir = facing === 'south' ? 1 : -1;
      const minY = floor === 0 ? 0 : floor === 1 ? 4.6 : 10.0;
      const maxY = floor === 0 ? 4.5 : floor === 1 ? 9.8 : 16.5;

      // Shop interior light floor
      const sf = this.sharedBox(w - 0.2, 0.06, d - 0.2, shopFloorMat, 0, 0.03, 0);
      sg.add(sf);

      // Back wall & colored feature wall
      const backZ = -dir * (d / 2);
      const backAccentMat = new THREE.MeshStandardMaterial({ color: bg, roughness: 0.55 });
      sg.add(this.sharedBox(w, wallH, 0.3, backAccentMat, 0, wallH / 2, backZ));
      this.buildingColliders.push({
        minX: MX + lx - w / 2, maxX: MX + lx + w / 2,
        minZ: MZ + lz + backZ - 0.25, maxZ: MZ + lz + backZ + 0.25,
        minY, maxY, tag: 'mall_shop',
      });

      // Left & right side partition walls
      [-w / 2, w / 2].forEach((sx) => {
        sg.add(this.sharedBox(0.28, wallH, d, shopWallMat, sx, wallH / 2, 0));
        this.buildingColliders.push({
          minX: MX + lx + sx - 0.22, maxX: MX + lx + sx + 0.22,
          minZ: MZ + lz - d / 2, maxZ: MZ + lz + d / 2,
          minY, maxY, tag: 'mall_shop',
        });
      });

      // Front glass storefront walls with wide 5.2m center walk-in opening
      const frontZ = dir * (d / 2);
      const wingW = (w - 5.2) / 2;
      if (wingW > 0.5) {
        [-w / 2 + wingW / 2, w / 2 - wingW / 2].forEach((wx) => {
          sg.add(this.sharedBox(wingW, 0.9, 0.24, shopWallMat, wx, 0.45, frontZ));
          sg.add(this.sharedBox(wingW, wallH - 1.9, 0.14, clearGlassMat, wx, 0.9 + (wallH - 1.9) / 2, frontZ));
          this.buildingColliders.push({
            minX: MX + lx + wx - wingW / 2, maxX: MX + lx + wx + wingW / 2,
            minZ: MZ + lz + frontZ - 0.22, maxZ: MZ + lz + frontZ + 0.22,
            minY, maxY, tag: 'mall_shop',
          });
        });
      }

      // Header lintel + glowing Brand Signboard
      sg.add(this.sharedBox(w, 1.1, 0.32, backAccentMat, 0, wallH - 0.55, frontZ));
      const signTex = makeShopSignTex(brand, sub, bg);
      const signMesh = new THREE.Mesh(new THREE.BoxGeometry(w * 0.78, 0.98, 0.08), new THREE.MeshBasicMaterial({ map: signTex }));
      signMesh.position.set(0, wallH - 0.55, frontZ + dir * 0.18);
      if (facing === 'north') signMesh.rotation.y = Math.PI;
      sg.add(signMesh);

      // Warm ceiling light bar inside shop
      sg.add(this.sharedBox(w * 0.65, 0.08, 0.5, warmLightStripMat, 0, wallH - 0.18, 0));

      // Interior Checkout Counter (back center)
      const counterZ = -dir * (d * 0.24);
      sg.add(this.sharedBox(4.2, 1.0, 1.0, woodMat, 0, 0.5, counterZ));
      // Cash register / POS monitor on counter
      sg.add(this.sharedBox(0.6, 0.45, 0.3, new THREE.MeshBasicMaterial({ color: '#38bdf8' }), 0.6, 1.22, counterZ));
      this.buildingColliders.push({
        minX: MX + lx - 2.15, maxX: MX + lx + 2.15,
        minZ: MZ + lz + counterZ - 0.55, maxZ: MZ + lz + counterZ + 0.55,
        minY, maxY, tag: 'mall_counter',
      });

      // Category-specific 3D interior merchandise & storefront display props!
      if (category === 'fashion' || category === 'footwear') {
        const colors = ['#ef4444', '#eab308', '#3b82f6', '#ec4899', '#10b981'];
        [-w * 0.3, w * 0.3].forEach((rx, rIdx) => {
          sg.add(this.sharedBox(2.4, 1.6, 0.7, chromeMat, rx, 0.8, 0));
          for (let h = -0.8; h <= 0.8; h += 0.4) {
            const gMat = new THREE.MeshStandardMaterial({ color: colors[(rIdx + Math.round((h + 1) * 3)) % colors.length], roughness: 0.65 });
            sg.add(this.sharedBox(0.28, 0.9, 0.48, gMat, rx + h, 1.05, 0));
          }
          // Illuminated Window Display Mannequin / Shoe Showcase Pedestal near glass window
          sg.add(this.sharedBox(1.1, 0.55, 0.9, creamMarbleMat, rx, 0.28, frontZ - dir * 1.15));
          const mannequinTorso = new THREE.Mesh(
            this.cylCache(0.16, 0.22, 0.95, 8),
            new THREE.MeshStandardMaterial({ color: colors[(rIdx + 2) % colors.length], roughness: 0.5 })
          );
          mannequinTorso.position.set(rx, 1.05, frontZ - dir * 1.15);
          sg.add(mannequinTorso);
        });
      } else if (category === 'tech' || category === 'books') {
        // Wall-mounted glowing LED display gallery on back accent wall
        sg.add(this.sharedBox(w * 0.52, 1.65, 0.12, new THREE.MeshBasicMaterial({ color: category === 'tech' ? '#0ea5e9' : '#f59e0b' }), 0, 2.5, backZ + dir * 0.22));
        [-w * 0.28, w * 0.28].forEach((tx) => {
          sg.add(this.sharedBox(2.6, 0.9, 1.1, chromeMat, tx, 0.45, 0.2 * dir));
          [-0.7, 0, 0.7].forEach((dx) => {
            const scr = this.sharedBox(0.45, 0.08, 0.35, new THREE.MeshBasicMaterial({ color: category === 'tech' ? '#38bdf8' : '#fde68a' }), tx + dx, 0.95, 0.2 * dir);
            sg.add(scr);
          });
        });
      } else if (category === 'arcade') {
        for (let ax = -w * 0.38; ax <= -2; ax += 3.2) {
          sg.add(this.sharedBox(1.1, 2.0, 0.9, new THREE.MeshStandardMaterial({ color: '#4c1d95', roughness: 0.4 }), ax, 1.0, 0.2 * dir));
          sg.add(this.sharedBox(0.85, 0.65, 0.08, new THREE.MeshBasicMaterial({ color: '#22d3ee' }), ax, 1.45, 0.2 * dir + 0.45 * dir));
        }
        // VR Arena Neon Pad & Miniature Bowling Alley on right side of Future World
        sg.add(this.sharedBox(4.8, 0.14, 3.4, new THREE.MeshBasicMaterial({ color: '#a855f7' }), w * 0.22, 0.12, 0.5 * dir));
        sg.add(this.sharedBox(2.2, 0.08, d - 2.4, woodMat, w * 0.38, 0.1, 0));
      } else if (category === 'cinema') {
        // Red velvet theater runner, popcorn kiosk counter & golden movie poster frames
        sg.add(this.sharedBox(4.8, 0.05, d - 1.2, redCarpetMat, 0, 0.07, 0));
        [-10, -5, 5, 10].forEach((px, pIdx) => {
          const pCol = ['#dc2626', '#2563eb', '#d97706', '#7c3aed'][pIdx];
          sg.add(this.sharedBox(2.1, 2.7, 0.14, new THREE.MeshBasicMaterial({ color: pCol }), px, 2.2, backZ + dir * 0.25));
          sg.add(this.sharedBox(2.3, 2.9, 0.08, goldMat, px, 2.2, backZ + dir * 0.18));
        });
        // Brass & red velvet stanchion posts flanking red carpet entrance
        [-2.4, 2.4].forEach((vx) => {
          const post = new THREE.Mesh(this.cylCache(0.06, 0.08, 0.95, 8), goldMat);
          post.position.set(vx, 0.5, frontZ - dir * 1.4);
          sg.add(post);
        });
      } else if (category === 'food') {
        // Illuminated digital overhead menu boards above Food Court service counter
        [-3.5, 0, 3.5].forEach((mx, mIdx) => {
          const menuCol = mIdx === 1 ? '#f59e0b' : '#ef4444';
          sg.add(this.sharedBox(2.8, 1.15, 0.1, new THREE.MeshBasicMaterial({ color: menuCol }), mx, 2.9, counterZ + dir * 0.1));
        });
      } else if (category === 'atm') {
        [-2.2, 2.2].forEach((ax) => {
          sg.add(this.sharedBox(1.1, 1.9, 0.85, new THREE.MeshStandardMaterial({ color: '#065f46', roughness: 0.35 }), ax, 0.95, counterZ));
          sg.add(this.sharedBox(0.75, 0.55, 0.08, new THREE.MeshBasicMaterial({ color: '#34d399' }), ax, 1.35, counterZ + dir * 0.44));
        });
      }

      g.add(sg);

      // Register interaction zone right in front of checkout counter
      this.jfpInteractables.push({
        id: opts.id,
        x: MX + lx,
        y: fy,
        z: MZ + lz + dir * 1.2,
        floor,
        category,
        nameEn: brand,
        nameBn: sub,
        labelEn: opts.labelEn,
        labelBn: opts.labelBn,
        cost: opts.cost,
      });
    };

    // ─── GROUND FLOOR SHOPS (8 Anchor Flagship Stores) ──────────────────────
    buildWalkInShop({
      id: 'jfp_aarong', lx: -42, fy: Y0, lz: -28, w: 17, d: 11, facing: 'south', floor: 0,
      brand: 'AARONG', sub: 'HERITAGE FASHION & CRAFT', bg: '#312e81', category: 'fashion',
      labelEn: '[E] Aarong Flagship — Browse Outfits & Designer Panjabi', labelBn: '[E] আড়ং — নতুন পোশাক ও পাঞ্জাবি দেখুন', cost: 0,
    });
    buildWalkInShop({
      id: 'jfp_samsung', lx: -21, fy: Y0, lz: -28, w: 17, d: 11, facing: 'south', floor: 0,
      brand: 'SAMSUNG', sub: 'GALAXY EXPERIENCE STORE', bg: '#1d4ed8', category: 'tech',
      labelEn: '[E] Samsung Store — Buy Tactical Armor Vest (৳450)', labelBn: '[E] স্যামসাং স্টোর — ট্যাকটিক্যাল বডি আর্মার কিনুন (৳৪৫০)', cost: 450,
    });
    buildWalkInShop({
      id: 'jfp_yellow', lx: 21, fy: Y0, lz: -28, w: 17, d: 11, facing: 'south', floor: 0,
      brand: 'YELLOW', sub: 'BEXIMCO TRENDWEAR', bg: '#ca8a04', category: 'fashion',
      labelEn: '[E] Yellow by Beximco — Open Wardrobe & Style Menu', labelBn: '[E] ইয়েলো — ফ্যাশন ও পোশাক পরিবর্তন করুন', cost: 0,
    });
    buildWalkInShop({
      id: 'jfp_apex', lx: 42, fy: Y0, lz: -28, w: 17, d: 11, facing: 'south', floor: 0,
      brand: 'APEX', sub: 'FOOTWEAR & SNEAKERS', bg: '#991b1b', category: 'footwear',
      labelEn: '[E] Apex Footwear — Fresh Running Sneakers (৳250 • Max Stamina)', labelBn: '[E] এপেক্স — স্প্রিন্ট স্নিকার্স কিনুন (৳২৫০)', cost: 250,
    });

    buildWalkInShop({
      id: 'jfp_ecstasy', lx: -42, fy: Y0, lz: 28, w: 17, d: 11, facing: 'north', floor: 0,
      brand: 'ECSTASY', sub: 'URBAN DHAKA STREETWEAR', bg: '#0f172a', category: 'fashion',
      labelEn: '[E] Ecstasy — Change Outfit & Look', labelBn: '[E] এক্সট্যাসি — স্ট্রিটওয়্যার আউটফিট পরিবর্তন করুন', cost: 0,
    });
    buildWalkInShop({
      id: 'jfp_bata', lx: -21, fy: Y0, lz: 28, w: 17, d: 11, facing: 'north', floor: 0,
      brand: 'BATA MEGA', sub: 'SHOES & BAGS', bg: '#dc2626', category: 'footwear',
      labelEn: '[E] Bata Mega Store — Boost Stamina & Comfort (৳180)', labelBn: '[E] বাটা মেগা স্টোর — নতুন জুতা কিনুন (৳১৮০)', cost: 180,
    });
    buildWalkInShop({
      id: 'jfp_istore', lx: 21, fy: Y0, lz: 28, w: 17, d: 11, facing: 'north', floor: 0,
      brand: 'iSTORE BD', sub: 'APPLE AUTHORIZED & GEAR', bg: '#334155', category: 'tech',
      labelEn: '[E] iStore Tech — Refill Tactical Supplies & Health (৳350)', labelBn: '[E] আইস্টোর টেক — গিয়ার ও হেলথ রিস্টোর (৳৩৫০)', cost: 350,
    });
    buildWalkInShop({
      id: 'jfp_atm', lx: 42, fy: Y0, lz: 28, w: 17, d: 11, facing: 'north', floor: 0,
      brand: 'DBBL ATM', sub: 'FAST TRACK & MALL INFO', bg: '#065f46', category: 'atm',
      labelEn: '[E] DBBL Fast Track ATM — Check Mall Directory & Cash Bonus', labelBn: '[E] ডাচ-বাংলা এটিএম — মল ডিরেক্টরি ও ক্যাশ বোনাস', cost: 0,
    });

    // ─── FIRST FLOOR SHOPS (Y = 5.40m, 8 Lifestyle & Tech Stores) ───────────
    buildWalkInShop({
      id: 'jfp_startech', lx: -42, fy: Y1, lz: -28, w: 17, d: 11, facing: 'south', floor: 1,
      brand: 'STAR TECH', sub: 'GAMING PC & ELECTRONICS', bg: '#0e7490', category: 'tech',
      labelEn: '[E] Star Tech — Tactical Comm Upgrade & Armor (+50 Armor, ৳400)', labelBn: '[E] স্টার টেক — আর্মার ও গিয়ার আপগ্রেড (৳৪০০)', cost: 400,
    });
    buildWalkInShop({
      id: 'jfp_xiaomi', lx: -21, fy: Y1, lz: -28, w: 17, d: 11, facing: 'south', floor: 1,
      brand: 'XIAOMI', sub: 'MI HOME DHAKA', bg: '#ea580c', category: 'tech',
      labelEn: '[E] Mi Home — Smart Band Stamina Boost (৳200)', labelBn: '[E] শাওমি মি হোম — স্মার্টব্যান্ড বুস্ট (৳২০০)', cost: 200,
    });
    buildWalkInShop({
      id: 'jfp_timezone', lx: 21, fy: Y1, lz: -28, w: 17, d: 11, facing: 'south', floor: 1,
      brand: 'TIME ZONE', sub: 'LUXURY SWISS WATCHES', bg: '#451a03', category: 'fashion',
      labelEn: '[E] Time Zone Watches — Luxury Outfit Wardrobe', labelBn: '[E] টাইম জোন — লাক্সারি ঘড়ি ও ফ্যাশন', cost: 0,
    });
    buildWalkInShop({
      id: 'jfp_batighar', lx: 42, fy: Y1, lz: -28, w: 17, d: 11, facing: 'south', floor: 1,
      brand: 'BATIGHAR', sub: 'BANGLA BOOKS & CAFE', bg: '#78350f', category: 'books',
      labelEn: '[E] Batighar Book Cafe — Espresso & Rest (+50 HP & Wanted -1, ৳100)', labelBn: '[E] বাতিঘর বুক ক্যাফে — কফি ও বিশ্রাম (+৫০ হেলথ, ৳১০০)', cost: 100,
    });

    buildWalkInShop({
      id: 'jfp_walton', lx: -42, fy: Y1, lz: 28, w: 17, d: 11, facing: 'north', floor: 1,
      brand: 'WALTON', sub: 'MADE IN BANGLADESH TECH', bg: '#0369a1', category: 'tech',
      labelEn: '[E] Walton Plaza — Power Bank & Supplies (+40 HP, ৳150)', labelBn: '[E] ওয়ালটন প্লাজা — ইলেকট্রনিক্স সাপ্লাই (৳১৫০)', cost: 150,
    });
    buildWalkInShop({
      id: 'jfp_diamond', lx: -21, fy: Y1, lz: 28, w: 17, d: 11, facing: 'north', floor: 1,
      brand: 'DIAMOND WORLD', sub: 'GOLD & BRIDAL JEWELLERY', bg: '#854d0e', category: 'fashion',
      labelEn: '[E] Diamond World — Style & Wardrobe Menu', labelBn: '[E] ডায়মন্ড ওয়ার্ল্ড — শোরুম ভিজিট করুন', cost: 0,
    });
    buildWalkInShop({
      id: 'jfp_shajgoj', lx: 21, fy: Y1, lz: 28, w: 17, d: 11, facing: 'north', floor: 1,
      brand: 'SHAJGOJ', sub: 'BEAUTY & PERFUMES', bg: '#be185d', category: 'fashion',
      labelEn: '[E] Shajgoj Store — Refresh & Style (+30 HP, ৳120)', labelBn: '[E] সাজগোজ — বিউটি ও পারফিউম (৳১২০)', cost: 120,
    });
    buildWalkInShop({
      id: 'jfp_infinity', lx: 42, fy: Y1, lz: 28, w: 17, d: 11, facing: 'north', floor: 1,
      brand: 'INFINITY', sub: 'DESIGNER PANJABI & SAREE', bg: '#581c87', category: 'fashion',
      labelEn: '[E] Infinity Mega Mall — Change Outfit', labelBn: '[E] ইনফিনিটি — পোশাক পরিবর্তন করুন', cost: 0,
    });

    // ─── SECOND FLOOR: BLOCKBUSTER CINEMAS, GAME ZONE & FOOD COURT (Y = 10.55m) ───
    buildWalkInShop({
      id: 'jfp_cinema', lx: -32, fy: Y2, lz: -28, w: 34, d: 11, facing: 'south', floor: 2,
      brand: 'BLOCKBUSTER CINEMAS', sub: '3D IMAX • DHAKA ATTACK 2 • TOOFAN', bg: '#7f1d1d', category: 'cinema',
      labelEn: '[E] Blockbuster Cinemas — Watch Movie (৳200 • Full Heal & Clear Wanted!)', labelBn: '[E] ব্লকবাস্টার সিনেমাস — মুভি দেখুন (৳২০০ • ফুল হেলথ ও ওয়ান্টেড মুক্ত!)', cost: 200,
    });
    buildWalkInShop({
      id: 'jfp_gamezone', lx: 32, fy: Y2, lz: -28, w: 34, d: 11, facing: 'south', floor: 2,
      brand: 'FUTURE WORLD', sub: 'ARCADE • VR • BOWLING ZONE', bg: '#4c1d95', category: 'arcade',
      labelEn: '[E] Future World Game Zone — Play Arcade & VR (৳50 • Max Stamina)', labelBn: '[E] ফিউচার ওয়ার্ল্ড গেম জোন — আর্কেড গেম খেলুন (৳৫০)', cost: 50,
    });

    buildWalkInShop({
      id: 'jfp_kfc', lx: -42, fy: Y2, lz: 28, w: 17, d: 11, facing: 'north', floor: 2,
      brand: 'KFC DHAKA', sub: 'HOT & CRISPY CHICKEN', bg: '#b91c1c', category: 'food',
      labelEn: '[E] KFC Food Court — Crispy Bucket Meal (+80 HP & Stamina, ৳180)', labelBn: '[E] কেএফসি — ক্রিস্পি চিকেন মিল (+৮০ হেলথ, ৳১৮০)', cost: 180,
    });
    buildWalkInShop({
      id: 'jfp_pizzahut', lx: -21, fy: Y2, lz: 28, w: 17, d: 11, facing: 'north', floor: 2,
      brand: 'PIZZA HUT', sub: 'SUPREME PAN PIZZA', bg: '#991b1b', category: 'food',
      labelEn: '[E] Pizza Hut — Cheesy Pan Pizza Feast (+90 HP & +25 Armor, ৳220)', labelBn: '[E] পিৎজা হাট — প্যান পিৎজা ফিস্ট (+৯০ হেলথ, ৳২২০)', cost: 220,
    });
    buildWalkInShop({
      id: 'jfp_gloria', lx: 21, fy: Y2, lz: 28, w: 17, d: 11, facing: 'north', floor: 2,
      brand: "GLORIA JEAN'S", sub: 'SPECIALTY ESPRESSO & CHILLERS', bg: '#451a03', category: 'food',
      labelEn: "[E] Gloria Jean's — Iced Caramel Chiller (+50 HP & Max Stamina, ৳120)", labelBn: "[E] গ্লোরিয়া জিন্স — আইসড কফি ও স্ন্যাকস (+৫০ হেলথ, ৳১২০)", cost: 120,
    });
    buildWalkInShop({
      id: 'jfp_kacchi', lx: 42, fy: Y2, lz: 28, w: 17, d: 11, facing: 'north', floor: 2,
      brand: 'DESHI KACCHI', sub: 'SHAHI MUTTON KACCHI & BORHANI', bg: '#b45309', category: 'food',
      labelEn: '[E] Deshi Kacchi — Royal Kacchi Platter (+100 HP & +50 Armor, ৳250)', labelBn: '[E] দেশি কাচ্চি — শাহী কাচ্চি ও বোরহানি (+১০০ হেলথ, ৳২৫০)', cost: 250,
    });

    // Food Court Dining Tables, Trays & Chairs on 2nd Floor South Gallery
    const chairColors = ['#ef4444', '#f59e0b', '#0ea5e9', '#10b981'];
    [-36, -24, -12, 0, 12, 24, 36].forEach((tx, idx) => {
      const tz = 17;
      const tableTop = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 0.85, 0.08, 12), creamMarbleMat);
      tableTop.position.set(tx, Y2 + 0.85, tz);
      g.add(tableTop);
      const tLeg = new THREE.Mesh(this.cylCache(0.08, 0.12, 0.82, 8), chromeMat);
      tLeg.position.set(tx, Y2 + 0.41, tz);
      g.add(tLeg);
      const tray = this.sharedBox(0.38, 0.04, 0.28, new THREE.MeshStandardMaterial({ color: '#f97316', roughness: 0.4 }), tx - 0.15, Y2 + 0.91, tz + 0.1);
      g.add(tray);
      const cMat = new THREE.MeshStandardMaterial({ color: chairColors[idx % chairColors.length], roughness: 0.55 });
      [
        [1.15, 0],
        [-1.15, 0],
        [0, 1.15],
        [0, -1.15],
      ].forEach(([cx, cz]) => {
        const chair = this.sharedBox(0.45, 0.45, 0.45, cMat, tx + cx, Y2 + 0.23, tz + cz);
        g.add(chair);
      });
    });

    // ─── WARM MALL INTERIOR LIGHTING ────────────────────────────────────────
    const mallAmbient = new THREE.PointLight('#fffbeb', 1.8, 95);
    mallAmbient.position.set(0, 15.5, 0);
    mallAmbient.visible = false;
    g.add(mallAmbient);
    this.jfpLights.push(mallAmbient);
    [
      [0, Y0 + 4.3, 0],
      [0, Y1 + 4.3, 0],
      [0, Y2 + 4.8, 0],
    ].forEach(([lx, ly, lz]) => {
      const pl = new THREE.PointLight('#fef3c7', 1.25, 48);
      pl.position.set(lx, ly, lz);
      pl.visible = false;
      g.add(pl);
      this.jfpLights.push(pl);
    });

    this.scene.add(g);

    // ─── MALL SHOPKEEPERS & SHOPPERS (Multi-floor NPCs inside JFP) ──────────
    const mallNpcs: Array<{
      id: string;
      nameEn: string;
      nameBn: string;
      role: NPCRole;
      lx: number;
      y: number;
      lz: number;
      shirt: string;
      pants: string;
      lineEn: string;
      lineBn: string;
    }> = [
      {
        id: 'mall_npc_guard', nameEn: 'Mall Security Officer', nameBn: 'মল সিকিউরিটি অফিসার', role: 'police_officer',
        lx: 5.5, y: Y0, lz: 33.5, shirt: '#1e3a8a', pants: '#0f172a',
        lineEn: 'Welcome to Jamuna Future Park! Fashion & Electronics on Ground/1st floor, Food Court & Blockbuster Cinemas on 2nd floor!',
        lineBn: 'যমুনা ফিউচার পার্কে স্বাগতম! নিচতলা ও ২য় তলায় শোরুম এবং ৩য় তলায় ফুড কোর্ট ও ব্লকবাস্টার সিনেমাস।',
      },
      {
        id: 'mall_npc_aarong', nameEn: 'Aarong Sales Executive', nameBn: 'আড়ং বিক্রয়কর্মী', role: 'shopkeeper',
        lx: -42, y: Y0, lz: -30.2, shirt: '#312e81', pants: '#1e293b',
        lineEn: 'Looking for Eid Panjabi or Dhaka streetwear? Press [E] at our counter!',
        lineBn: 'নতুন পাঞ্জাবি বা স্ট্রিটওয়্যার খুঁজছেন? কাউন্টারে [E] চাপুন!',
      },
      {
        id: 'mall_npc_samsung', nameEn: 'Samsung Specialist', nameBn: 'স্যামসাং টেক এক্সপার্ট', role: 'office_worker',
        lx: -21, y: Y0, lz: -30.2, shirt: '#1d4ed8', pants: '#0f172a',
        lineEn: 'Galaxy S-series flagships and tactical gear in stock right here!',
        lineBn: 'নতুন গ্যালাক্সি ফোন ও ট্যাকটিক্যাল গিয়ার স্টকে আছে!',
      },
      {
        id: 'mall_npc_shopper1', nameEn: 'NSU Mall Shopper', nameBn: 'এনএসইউ শিক্ষার্থী', role: 'student',
        lx: -8, y: Y0, lz: 8, shirt: '#ec4899', pants: '#1e293b',
        lineEn: 'The central fountain atrium is huge! Take the West escalator up to 1st floor.',
        lineBn: 'সেন্ট্রাল ফোয়ারা চত্বর দারুণ! পশ্চিমের চলন্ত সিঁড়ি দিয়ে ওপরের তলায় যান।',
      },
      {
        id: 'mall_npc_batighar', nameEn: 'Batighar Bookseller', nameBn: 'বাতিঘর বই বিক্রেতা', role: 'shopkeeper',
        lx: 42, y: Y1, lz: -30.2, shirt: '#78350f', pants: '#1e293b',
        lineEn: 'Grab a fresh espresso and browse classic Bengali novels on 1st floor!',
        lineBn: 'গরম কফির সাথে পছন্দের বাংলা বই পড়ে বিশ্রাম নিন!',
      },
      {
        id: 'mall_npc_cinema', nameEn: 'Blockbuster Ticket Attendant', nameBn: 'ব্লকবাস্টার টিকিট কাউন্টার', role: 'shopkeeper',
        lx: -32, y: Y2, lz: -30.2, shirt: '#991b1b', pants: '#0f172a',
        lineEn: 'Dhaka Attack 2 & Toofan IMAX shows starting now! Press [E] to grab a ticket & popcorn.',
        lineBn: 'ঢাকা অ্যাটাক ২ ও তুফান শো চলছে! টিকিট ও পপকর্নের জন্য [E] চাপুন।',
      },
      {
        id: 'mall_npc_kfc', nameEn: 'Food Court Chef', nameBn: 'ফুড কোর্ট শেফ', role: 'street_vendor',
        lx: -42, y: Y2, lz: 30.2, shirt: '#dc2626', pants: '#1e293b',
        lineEn: 'Hot crispy chicken, pizza, and shahi kacchi served fresh on the 2nd floor!',
        lineBn: 'গরম ক্রিস্পি চিকেন, পিৎজা আর কাচ্চি বিরিয়ানি একদম রেডি!',
      },
      {
        id: 'mall_npc_diner', nameEn: 'BracU Food Court Diner', nameBn: 'ফুড কোর্ট ভিজিটর', role: 'student',
        lx: -10, y: Y2, lz: 15.2, shirt: '#f59e0b', pants: '#0f172a',
        lineEn: 'Best view in Dhaka! Try the Deshi Kacchi platter or check out Future World VR behind us.',
        lineBn: 'দারুণ ভিউ! দেশি কাচ্চি আর ফিউচার ওয়ার্ল্ড গেম জোন দারুণ জমেছে।',
      },
      {
        id: 'mall_npc_vr', nameEn: 'Future World Arcade Host', nameBn: 'ফিউচার ওয়ার্ল্ড হোস্ট', role: 'shopkeeper',
        lx: 32, y: Y2, lz: -30.2, shirt: '#7c3aed', pants: '#1e293b',
        lineEn: 'VR arena, bowling & rooftop amusement rides open all day — press [E] to play!',
        lineBn: 'ভিআর এরিনা, বোলিং ও ছাদের অ্যামিউজমেন্ট পার্ক খোলা আছে — [E] চাপুন!',
      },
    ];

    mallNpcs.forEach((mn) => {
      const wx = MX + mn.lx;
      const wz = MZ + mn.lz;
      const npc: NPCEntity = {
        id: mn.id,
        nameEn: mn.nameEn,
        nameBn: mn.nameBn,
        role: mn.role,
        x: wx,
        z: wz,
        homeX: wx,
        homeZ: wz,
        homeY: mn.y,
        rotation: mn.lz < 0 ? 0 : Math.PI,
        shirtColor: mn.shirt,
        pantsColor: mn.pants,
        dialogueEn: [mn.lineEn],
        dialogueBn: [mn.lineBn],
        aiState: 'idle',
        walkTargetX: wx,
        walkTargetZ: wz,
        health: 100,
      };
      this.npcs.push(npc);
      const limbs = createCharacterMesh(mn.shirt, mn.pants, mn.role, false, mn.id, false);
      limbs.group.position.set(wx, mn.y, wz);
      this.scene.add(limbs.group);
      this.npcLimbsMap.set(mn.id, limbs);
    });
  }

  /**
   * Hatirjheel Arched Suspension Bridge & Water Taxi Jetty
   * The iconic landmark of modern Dhaka, connecting Tejgaon, Rampura and Gulshan.
   */
  private buildHatirjheelArchedBridgeAndPromenade() {
    const hx = 220;
    const hz = -5;

    const steelWhiteMat = new THREE.MeshStandardMaterial({
      color: '#f8fafc',
      metalness: 0.85,
      roughness: 0.25,
    });
    const cableMat = new THREE.MeshStandardMaterial({
      color: '#94a3b8',
      metalness: 0.92,
      roughness: 0.15,
    });
    const woodJettyMat = new THREE.MeshStandardMaterial({
      color: '#78350f',
      roughness: 0.85,
    });
    const taxiBoatMat = new THREE.MeshStandardMaterial({
      color: '#0284c7',
      roughness: 0.35,
    });

    const bridgeGroup = new THREE.Group();
    bridgeGroup.position.set(hx, 0, hz);

    [-9.5, 9.5].forEach((ax) => {
      const arch = new THREE.Mesh(
        new THREE.TorusGeometry(58, 0.75, 12, 36, Math.PI),
        steelWhiteMat
      );
      arch.position.set(ax, 0.5, 0);
      arch.rotation.y = Math.PI / 2;
      bridgeGroup.add(arch);

      for (let cz = -50; cz <= 50; cz += 8) {
        const archY = Math.sqrt(Math.max(0, 58 * 58 - cz * cz)) - 42;
        if (archY > 1.2) {
          const cable = new THREE.Mesh(this.cylCache(0.04, 0.04, archY, 6), cableMat);
          cable.position.set(ax, 0.5 + archY / 2, cz);
          bridgeGroup.add(cable);
        }
      }
    });

    const jetty = this.sharedBox(6.5, 0.45, 18, woodJettyMat, -16, 0.25, 0);
    bridgeGroup.add(jetty);

    [-5, 5].forEach((bz) => {
      const boat = new THREE.Mesh(this.boxCache(2.6, 1.1, 6.2), taxiBoatMat);
      boat.position.set(-21, 0.35, bz);
      bridgeGroup.add(boat);
    });

    this.scene.add(bridgeGroup);
  }

  /**
   * Old Dhaka (Puran Dhaka - পুরান ঢাকা) Historic Mughal Citadel & Heritage Market
   * Authentic Mughal architecture and bustling streetlife:
   * 1. Historic Lalbagh Fort (Fort Aurangabad - লালবাগ কেল্লা):
   *    - South Gateway (দক্ষিণ তোরণ): 3-storey grand red terracotta Mughal fortified gateway
   *      with central scalloped multi-foil archway opening (w: 8m, h: 7m), flanked by two 22m octagonal
   *      minarets topped with pillared chhatri kiosks, copper domes, and kalasha finials.
   *    - Courtyard Charbagh gardens with 4 grass quadrants, red brick walkways, and stone fountain pond.
   *    - Tomb of Pari Bibi (পরী বিবির মাজার): raised square marble plinth, central chamber,
   *      ribbed white marble dome (13m), octagonal turrets.
   *    - Fortress rampart walls (কেল্লার প্রাচীর) enclosing the citadel with corner bastions and colliders.
   *    - Historic Mughal cast-iron cannons mounted on wooden carriage wheels.
   * 2. Ahsan Manzil Pink Palace (আহসান মঞ্জিল):
   *    - Waterfront palace facing Buriganga River (X: -10, Z: 312).
   *    - Coral pink / rose terracotta facade, octagonal drum, majestic ribbed central dome (22m).
   *    - Two-storey arcade wings with classical arches, Corinthian fluted columns, balustrades.
   *    - Monumental 14m-wide central ceremonial stone staircase descending to riverfront garden.
   *    - National flag flying on palace flagpole.
   * 3. Chawkbazar & Shakhari Bazar Heritage Market:
   *    - Heritage shophouses with cantilevered wooden verandas, louvered shutters, and red brick textures.
   *    - Shahi Haji Kacchi Biriyani: giant polished brass cauldrons (শাহী ডেগ) wrapped in crimson cloth
   *      over hearth fire with steam particles.
   *    - Bakarkhani tandoori bakery with glowing clay oven and crispy bread stacks.
   *    - Cycle rickshaw workshop with painted rickshaw art plates and parked rickshaws.
   *    - Overhead tangled utility wires & vintage amber street bracket lanterns.
   */
  private buildOldDhakaHeritageDistrict() {
    const mughalBrickMat = new THREE.MeshStandardMaterial({
      map: loadRealTexture('/textures/brick_diffuse.jpg', 3, 3),
      bumpMap: loadRealTexture('/textures/brick_bump.jpg', 3, 3, false),
      bumpScale: 0.08,
      color: '#991b1b',
      roughness: 0.82,
    });
    const marbleWhiteMat = new THREE.MeshStandardMaterial({
      color: '#f8fafc',
      roughness: 0.28,
      metalness: 0.12,
    });
    const ahsanPinkMat = new THREE.MeshStandardMaterial({
      color: '#f472b6',
      roughness: 0.75,
    });
    const ahsanDarkPinkMat = new THREE.MeshStandardMaterial({
      color: '#be185d',
      roughness: 0.78,
    });
    const brassGoldMat = new THREE.MeshStandardMaterial({
      color: '#f59e0b',
      metalness: 0.9,
      roughness: 0.22,
    });
    const copperMat = new THREE.MeshStandardMaterial({
      color: '#b45309',
      metalness: 0.8,
      roughness: 0.35,
    });
    const woodTimberMat = new THREE.MeshStandardMaterial({
      map: loadRealTexture('/textures/hardwood2_diffuse.jpg', 1, 2),
      color: '#573010',
      roughness: 0.88,
    });
    const ironCannonMat = new THREE.MeshStandardMaterial({
      color: '#1e293b',
      metalness: 0.85,
      roughness: 0.3,
    });
    const steamMat = new THREE.MeshBasicMaterial({
      color: '#f8fafc',
      transparent: true,
      opacity: 0.35,
      depthWrite: false,
    });
    const charcoalEmberMat = new THREE.MeshStandardMaterial({
      color: '#ea580c',
      emissive: new THREE.Color('#ea580c'),
      emissiveIntensity: 0.8,
      roughness: 0.9,
    });
    const clothRedMat = new THREE.MeshStandardMaterial({
      color: '#dc2626',
      roughness: 0.92,
    });
    const grassGardenMat = new THREE.MeshStandardMaterial({
      color: '#15803d',
      roughness: 0.9,
    });
    const waterBasinMat = new THREE.MeshStandardMaterial({
      color: '#0e7490',
      roughness: 0.15,
      metalness: 0.7,
    });
    const rickshawArtTex = loadRealTexture(
      '/textures/rickshaw_art_realistic.jpg',
      1,
      1
    );
    const rickshawArtMat = new THREE.MeshStandardMaterial({
      map: rickshawArtTex,
      roughness: 0.5,
    });

    // -----------------------------------------------------------------------
    // 1. HISTORIC LALBAGH FORT COMPLEX (Fort Aurangabad - ১৬৭৮ খ্রিস্টাব্দ)
    // -----------------------------------------------------------------------
    const fortGroup = new THREE.Group();

    // 1.1 South Gateway (প্রধান দক্ষিণ তোরণ - X = -110, Z = 256)
    // Central Arch Gateway structure: two massive flanking pylons with overhead arch span
    const gatePylonLeft = this.sharedBox(6, 15, 8, mughalBrickMat, -118, 7.5, 256);
    const gatePylonRight = this.sharedBox(6, 15, 8, mughalBrickMat, -102, 7.5, 256);
    const gateArchSpan = this.sharedBox(10, 5, 8, mughalBrickMat, -110, 12.5, 256);
    fortGroup.add(gatePylonLeft, gatePylonRight, gateArchSpan);

    // Decorative Mughal Scalloped Arch Profile in Gate Opening
    const archFoil = new THREE.Mesh(this.boxCache(9.6, 0.4, 7.8), marbleWhiteMat);
    archFoil.position.set(-110, 9.8, 256);
    fortGroup.add(archFoil);

    // Flanking 4-Stage Octagonal Minarets (Height: 22m)
    [-122, -98].forEach((mx) => {
      const minaretShaft = new THREE.Mesh(
        this.cylCache(1.4, 1.6, 18, 8),
        mughalBrickMat
      );
      minaretShaft.position.set(mx, 9, 256);
      fortGroup.add(minaretShaft);

      // Cornice Ring
      const ring = new THREE.Mesh(this.cylCache(1.8, 1.8, 0.6, 8), marbleWhiteMat);
      ring.position.set(mx, 18.3, 256);
      fortGroup.add(ring);

      // Pillared Chhatri Kiosk
      for (let p = 0; p < 8; p++) {
        const ang = (p * Math.PI) / 4;
        const pillar = new THREE.Mesh(this.cylCache(0.08, 0.08, 2.4, 6), marbleWhiteMat);
        pillar.position.set(mx + Math.cos(ang) * 1.3, 19.5, 256 + Math.sin(ang) * 1.3);
        fortGroup.add(pillar);
      }

      // Ribbed Copper Dome & Kalasha Finial
      const dome = new THREE.Mesh(this.cylCache(0.1, 1.5, 2.2, 8), copperMat);
      dome.position.set(mx, 21.8, 256);
      fortGroup.add(dome);

      const finial = new THREE.Mesh(this.cylCache(0.04, 0.12, 1.2, 6), brassGoldMat);
      finial.position.set(mx, 23.4, 256);
      fortGroup.add(finial);
    });

    // Parapet Crenellations (কঙ্গুরা) along Gateway Roofline
    for (let c = -14; c <= 14; c += 2) {
      const cren = this.sharedBox(1.2, 1.1, 0.5, mughalBrickMat, -110 + c, 15.5, 252.2);
      fortGroup.add(cren);
    }

    // Heritage Plaque Signboard over Gateway Arch
    const gateSignTex = createHeritageSignboardTexture(
      'ঐতিহাসিক লালবাগ কেল্লা (১৬৭৮)',
      'HISTORIC LALBAGH FORT SOUTH GATE',
      'Mughal Fortress Built by Shaista Khan & Prince Azam',
      '#7f1d1d',
      '#fde047'
    );
    const gateSign = new THREE.Mesh(
      this.boxCache(8.4, 2.4, 0.25),
      new THREE.MeshStandardMaterial({ map: gateSignTex, roughness: 0.4 })
    );
    gateSign.position.set(-110, 12.8, 251.8);
    fortGroup.add(gateSign);

    // Colliders for Gateway Pylons (strictly within Z: 252 to 260, safely clear of Z: 240 road)
    this.buildingColliders.push({
      minX: -122,
      maxX: -115,
      minZ: 252,
      maxZ: 260,
      tag: 'lalbagh_gate_pylon_west',
    });
    this.buildingColliders.push({
      minX: -105,
      maxX: -98,
      minZ: 252,
      maxZ: 260,
      tag: 'lalbagh_gate_pylon_east',
    });

    // 1.2 Lalbagh Fort Rampart Walls (কেল্লার প্রাচীর) & Bastions
    // West Rampart Wall (X: -148, Z: 256 to 275)
    fortGroup.add(this.sharedBox(1.4, 4.2, 19, mughalBrickMat, -148, 2.1, 265.5));
    this.buildingColliders.push({
      minX: -149,
      maxX: -147,
      minZ: 256,
      maxZ: 275,
      tag: 'lalbagh_west_wall',
    });

    // East Rampart Wall (X: -85, Z: 256 to 275 - safely clears X: -70 Chawkbazar road)
    fortGroup.add(this.sharedBox(1.4, 4.2, 19, mughalBrickMat, -85, 2.1, 265.5));
    this.buildingColliders.push({
      minX: -86,
      maxX: -84,
      minZ: 256,
      maxZ: 275,
      tag: 'lalbagh_east_wall',
    });

    // North Rampart Wall (Z: 275, X: -148 to -85 - safely clears Z: 285 Sadarghat road)
    fortGroup.add(this.sharedBox(63, 4.2, 1.4, mughalBrickMat, -116.5, 2.1, 275));
    this.buildingColliders.push({
      minX: -148,
      maxX: -85,
      minZ: 274,
      maxZ: 276,
      tag: 'lalbagh_north_wall',
    });

    // South Rampart Wall segments left and right of gateway
    fortGroup.add(this.sharedBox(26, 4.2, 1.4, mughalBrickMat, -135, 2.1, 256));
    fortGroup.add(this.sharedBox(13, 4.2, 1.4, mughalBrickMat, -91.5, 2.1, 256));
    this.buildingColliders.push({
      minX: -148,
      maxX: -122,
      minZ: 255,
      maxZ: 257,
      tag: 'lalbagh_south_wall_west',
    });
    this.buildingColliders.push({
      minX: -98,
      maxX: -85,
      minZ: 255,
      maxZ: 257,
      tag: 'lalbagh_south_wall_east',
    });

    // Corner Bastions with Copper Domes (safely outside all road corridors)
    [
      [-148, 256],
      [-85, 256],
      [-148, 275],
      [-85, 275],
    ].forEach(([bx, bz]) => {
      const bastion = new THREE.Mesh(this.cylCache(2.2, 2.4, 6, 8), mughalBrickMat);
      bastion.position.set(bx, 3, bz);
      const bDome = new THREE.Mesh(this.cylCache(0.1, 2.3, 2, 8), copperMat);
      bDome.position.set(bx, 7, bz);
      fortGroup.add(bastion, bDome);
      this.circleColliders.push({
        x: bx,
        z: bz,
        radius: 2.4,
        tag: 'lalbagh_bastion',
      });
    });

    // Historic Mughal Cast-Iron Cannons at Entrance
    [
      [-116, 252, -0.2],
      [-104, 252, 0.2],
    ].forEach(([cx, cz, crot]) => {
      const cannon = new THREE.Group();
      cannon.position.set(cx, 0, cz);
      cannon.rotation.y = crot;
      // Barrel
      const barrel = new THREE.Mesh(this.cylCache(0.18, 0.28, 2.6, 10), ironCannonMat);
      barrel.rotation.x = Math.PI / 2 + 0.15;
      barrel.position.set(0, 0.65, 0);
      cannon.add(barrel);
      // Carriage
      const carriage = this.sharedBox(0.9, 0.5, 1.8, woodTimberMat, 0, 0.35, 0);
      cannon.add(carriage);
      // Wooden wheels
      [-0.55, 0.55].forEach((wx) => {
        const wheel = new THREE.Mesh(this.cylCache(0.48, 0.48, 0.12, 12), woodTimberMat);
        wheel.rotation.z = Math.PI / 2;
        wheel.position.set(wx, 0.48, 0);
        cannon.add(wheel);
      });
      fortGroup.add(cannon);
    });

    // 1.3 Tomb of Pari Bibi (পরী বিবির মাজার - X: -110, Z: 265.5)
    // Raised Marble Plinth (16m x 16m x 1.2m)
    const plinth = this.sharedBox(16, 1.2, 16, marbleWhiteMat, -110, 0.6, 265.5);
    fortGroup.add(plinth);

    // Central Tomb Chamber (10m x 10m x 7m)
    const chamber = this.sharedBox(10, 7, 10, marbleWhiteMat, -110, 4.7, 265.5);
    fortGroup.add(chamber);

    // Arched Entrance Portals on 4 Sides
    [
      [0, 5.05],
      [0, -5.05],
      [5.05, 0],
      [-5.05, 0],
    ].forEach(([dx, dz]) => {
      const archFrame = this.sharedBox(
        dx !== 0 ? 0.25 : 3.8,
        5.2,
        dz !== 0 ? 0.25 : 3.8,
        mughalBrickMat,
        -110 + dx,
        3.8,
        265.5 + dz
      );
      fortGroup.add(archFrame);
    });

    // Four Corner Turrets
    [
      [-4.6, -4.6],
      [4.6, -4.6],
      [-4.6, 4.6],
      [4.6, 4.6],
    ].forEach(([tx, tz]) => {
      const turret = new THREE.Mesh(this.cylCache(0.65, 0.75, 9, 8), marbleWhiteMat);
      turret.position.set(-110 + tx, 4.5, 265.5 + tz);
      const tDome = new THREE.Mesh(this.cylCache(0.08, 0.72, 1.2, 8), copperMat);
      tDome.position.set(-110 + tx, 9.6, 265.5 + tz);
      fortGroup.add(turret, tDome);
    });

    // Grand Fluted White Marble Central Dome (Radius: 3.6m, Kalasha Finial: Y = 13.8m)
    const centralDome = new THREE.Mesh(
      this.cylCache(0.2, 3.8, 4.8, 16),
      marbleWhiteMat
    );
    centralDome.position.set(-110, 10.6, 265.5);
    const kalasha = new THREE.Mesh(this.cylCache(0.06, 0.25, 2.2, 8), brassGoldMat);
    kalasha.position.set(-110, 13.8, 265.5);
    fortGroup.add(centralDome, kalasha);

    this.buildingColliders.push({
      minX: -118,
      maxX: -102,
      minZ: 258,
      maxZ: 272,
      tag: 'tomb_of_pari_bibi',
    });

    // Charbagh 4-Quadrant Gardens surrounding the Tomb
    [
      [-128, 248],
      [-92, 248],
      [-128, 276],
      [-92, 276],
    ].forEach(([gx, gz]) => {
      const lawn = new THREE.Mesh(
        new THREE.BoxGeometry(15, 0.14, 15),
        grassGardenMat
      );
      lawn.position.set(gx, 0.07, gz);
      lawn.receiveShadow = true;
      fortGroup.add(lawn);
    });

    // Central Stone Water Basin Pond
    const pond = this.sharedBox(6, 0.45, 6, marbleWhiteMat, -110, 0.22, 247);
    const pondWater = new THREE.Mesh(
      new THREE.PlaneGeometry(5.2, 5.2),
      waterBasinMat
    );
    pondWater.rotation.x = -Math.PI / 2;
    pondWater.position.set(-110, 0.46, 247);
    fortGroup.add(pond, pondWater);

    this.buildingColliders.push({
      minX: -113.1,
      maxX: -106.9,
      minZ: 243.9,
      maxZ: 250.1,
      minY: 0,
      maxY: 2.0,
      tag: 'lalbagh_pond',
    });

    // -----------------------------------------------------------------------
    // 2. AHSAN MANZIL PINK PALACE (আহসান মঞ্জিল - বুড়িগঙ্গা রিভারফ্রন্ট)
    // -----------------------------------------------------------------------
    const ahsanGroup = new THREE.Group();
    const ahx = -36;
    const ahz = 264;

    // Main 2-Storey Palace Body (48m Wide x 18m Deep x 12m Tall)
    const palaceMain = this.sharedBox(48, 12, 18, ahsanPinkMat, ahx, 6, ahz);
    ahsanGroup.add(palaceMain);

    // Architectural Stone Plinth, Inter-Storey Cornice Moulding & Classical Dark Window Bays
    const palacePlinth = this.sharedBox(50, 0.7, 20, marbleWhiteMat, ahx, 0.35, ahz);
    const midCornice = this.sharedBox(49.2, 0.45, 18.8, marbleWhiteMat, ahx, 5.9, ahz);
    const roofCornice = this.sharedBox(49.6, 0.5, 19.0, marbleWhiteMat, ahx, 11.8, ahz);
    ahsanGroup.add(palacePlinth, midCornice, roofCornice);

    const palaceWinMat = new THREE.MeshStandardMaterial({
      color: '#1e293b',
      roughness: 0.2,
      metalness: 0.55,
    });
    for (let wx = -20; wx <= 20; wx += 4) {
      if (Math.abs(wx) < 5) continue;
      [-9.08, 9.08].forEach((wz) => {
        ahsanGroup.add(this.sharedBox(1.8, 3.0, 0.16, palaceWinMat, ahx + wx, 2.8, ahz + wz));
        ahsanGroup.add(this.sharedBox(1.8, 3.0, 0.16, palaceWinMat, ahx + wx, 8.6, ahz + wz));
        ahsanGroup.add(this.sharedBox(2.1, 0.35, 0.24, marbleWhiteMat, ahx + wx, 4.4, ahz + wz));
        ahsanGroup.add(this.sharedBox(2.1, 0.35, 0.24, marbleWhiteMat, ahx + wx, 10.2, ahz + wz));
      });
    }
    // Central Grand Triple-Arch Portico Doors
    ahsanGroup.add(this.sharedBox(5.2, 4.4, 0.25, palaceWinMat, ahx, 2.8, ahz - 9.08));
    ahsanGroup.add(this.sharedBox(5.2, 4.4, 0.25, palaceWinMat, ahx, 8.5, ahz - 9.08));

    // Central Octagonal Drum for Grand Dome
    const octDrum = new THREE.Mesh(this.cylCache(5.2, 5.5, 4.5, 8), ahsanDarkPinkMat);
    octDrum.position.set(ahx, 14.25, ahz);
    ahsanGroup.add(octDrum);

    // Majestic Indo-Saracenic Ribbed Central Dome (Height: 22m)
    const palaceDome = new THREE.Mesh(this.cylCache(0.3, 5.4, 6.5, 16), ahsanPinkMat);
    palaceDome.position.set(ahx, 19.5, ahz);
    const palaceFinial = new THREE.Mesh(
      this.cylCache(0.06, 0.35, 2.6, 8),
      brassGoldMat
    );
    palaceFinial.position.set(ahx, 23.8, ahz);
    ahsanGroup.add(palaceDome, palaceFinial);

    // Colonnaded Front Arcade Wings: Classical Classical Pillars & Archways
    for (let col = -22; col <= 22; col += 4) {
      if (Math.abs(col) < 6) continue; // Central portal
      const pillar1 = new THREE.Mesh(this.cylCache(0.32, 0.36, 5.2, 8), marbleWhiteMat);
      pillar1.position.set(ahx + col, 2.6, ahz - 9.2);
      const pillar2 = new THREE.Mesh(this.cylCache(0.3, 0.34, 5.2, 8), marbleWhiteMat);
      pillar2.position.set(ahx + col, 8.4, ahz - 9.2);
      ahsanGroup.add(pillar1, pillar2);
    }

    // Monumental 14m Wide Ceremonial Stone Flight of Stairs (বিশাল রাজকীয় সিঁড়ি)
    for (let s = 0; s < 10; s++) {
      const step = this.sharedBox(
        14 - s * 0.25,
        0.3,
        1.0,
        marbleWhiteMat,
        ahx,
        0.15 + s * 0.3,
        ahz - 9.5 - (9 - s) * 0.95
      );
      ahsanGroup.add(step);
    }

    // Balustraded Parapet along Roofline
    const balustrade = this.sharedBox(49, 1.2, 0.45, marbleWhiteMat, ahx, 12.6, ahz - 8.8);
    ahsanGroup.add(balustrade);

    // National Flag Flying High on Palace Mast
    const flagPole = new THREE.Mesh(this.cylCache(0.06, 0.08, 16, 8), ironCannonMat);
    flagPole.position.set(ahx - 18, 14, ahz - 8.6);
    const bdFlag = new THREE.Mesh(
      this.boxCache(2.4, 1.4, 0.04),
      new THREE.MeshStandardMaterial({ color: '#15803d', roughness: 0.8 })
    );
    bdFlag.position.set(ahx - 16.7, 21.2, ahz - 8.6);
    const redCircle = new THREE.Mesh(
      this.cylCache(0.48, 0.48, 0.06, 12),
      new THREE.MeshStandardMaterial({ color: '#dc2626', roughness: 0.8 })
    );
    redCircle.rotation.x = Math.PI / 2;
    redCircle.position.set(ahx - 16.7, 21.2, ahz - 8.58);
    ahsanGroup.add(flagPole, bdFlag, redCircle);

    // Heritage Signboard
    const ahsanSignTex = createHeritageSignboardTexture(
      'আহসান মঞ্জিল পিংক প্যালেস',
      'AHSAN MANZIL PALACE MUSEUM',
      'Historic Seat of the Nawabs of Dhaka (Buriganga Riverfront)',
      '#831843',
      '#fde047'
    );
    const ahsanSign = new THREE.Mesh(
      this.boxCache(10.5, 2.4, 0.25),
      new THREE.MeshStandardMaterial({ map: ahsanSignTex, roughness: 0.4 })
    );
    ahsanSign.position.set(ahx, 10.5, ahz - 9.15);
    ahsanGroup.add(ahsanSign);

    this.buildingColliders.push({
      minX: ahx - 25,
      maxX: ahx + 25,
      minZ: ahz - 10,
      maxZ: ahz + 10,
      tag: 'ahsan_manzil_palace',
    });

    // -----------------------------------------------------------------------
    // 3. CHAWKBAZAR & SHAKHARI BAZAR HERITAGE MARKET (X = -70, Z = 140 to 220)
    // -----------------------------------------------------------------------
    const marketGroup = new THREE.Group();

    // 3.1 Shahi Haji Kacchi Biriyani Hearth with Giant Cauldrons (শাহী ডেগ)
    const kacchiPlatform = this.sharedBox(5.8, 0.65, 2.8, mughalBrickMat, -56, 0.32, 155);
    marketGroup.add(kacchiPlatform);

    // 3 Giant Polished Brass Cauldrons Wrapped in Crimson Cloth (লাল শালু মোড়ানো ডেগ)
    [-1.8, 0, 1.8].forEach((dx) => {
      const degGroup = new THREE.Group();
      degGroup.position.set(-56 + dx, 0.65, 155);

      // Wood fire hearth glowing underneath
      const fireEmber = new THREE.Mesh(this.cylCache(0.5, 0.6, 0.25, 8), charcoalEmberMat);
      fireEmber.position.y = 0.12;
      degGroup.add(fireEmber);

      // Red cloth skirt (শালু)
      const clothSkirt = new THREE.Mesh(this.cylCache(0.72, 0.68, 0.55, 12), clothRedMat);
      clothSkirt.position.y = 0.45;
      degGroup.add(clothSkirt);

      // Polished brass upper cauldron (ডেগ)
      const brassDeg = new THREE.Mesh(this.cylCache(0.78, 0.65, 0.6, 12), brassGoldMat);
      brassDeg.position.y = 0.95;
      degGroup.add(brassDeg);

      // Steaming brass lid
      const degLid = new THREE.Mesh(this.cylCache(0.12, 0.8, 0.22, 12), brassGoldMat);
      degLid.position.y = 1.32;
      degGroup.add(degLid);

      // Rising steam puff particles
      for (let s = 0; s < 3; s++) {
        const steam = new THREE.Mesh(this.cylCache(0.15 + s * 0.1, 0.1, 0.3, 6), steamMat);
        steam.position.set(0, 1.6 + s * 0.35, 0);
        degGroup.add(steam);
      }

      marketGroup.add(degGroup);
    });

    // Signboard for Shahi Kacchi Biriyani
    const kacchiSignTex = createHeritageSignboardTexture(
      'শাহী হাজী কাচ্চি বিরিয়ানি ঘর',
      'SHAHI HAJI KACCHI BIRIYANI',
      'Pure Mutton Kacchi with Saffron & Cold Borhani',
      '#991b1b',
      '#facc15'
    );
    const kacchiSign = new THREE.Mesh(
      this.boxCache(4.8, 1.4, 0.16),
      new THREE.MeshStandardMaterial({ map: kacchiSignTex, roughness: 0.4 })
    );
    kacchiSign.position.set(-56, 2.9, 153.8);
    marketGroup.add(kacchiSign);

    this.circleColliders.push({
      x: -56,
      z: 155,
      radius: 2.2,
      tag: 'chawkbazar_kacchi_stall',
    });

    // 3.2 Bakarkhani Tandoori Bakery (Sidewalk at X: -82, Z: 188)
    const tandoorGroup = new THREE.Group();
    tandoorGroup.position.set(-82, 0, 188);

    const tandoorOven = new THREE.Mesh(
      this.cylCache(0.65, 0.8, 1.25, 10),
      new THREE.MeshStandardMaterial({ color: '#78350f', roughness: 0.9 })
    );
    tandoorOven.position.y = 0.62;
    tandoorGroup.add(tandoorOven);

    const glowingOpening = new THREE.Mesh(
      this.cylCache(0.42, 0.42, 0.1, 10),
      charcoalEmberMat
    );
    glowingOpening.position.y = 1.26;
    tandoorGroup.add(glowingOpening);

    // Crispy golden Bakarkhani breads in display baskets
    const breadMat = new THREE.MeshStandardMaterial({ color: '#f59e0b', roughness: 0.7 });
    for (let b = 0; b < 6; b++) {
      const bread = new THREE.Mesh(this.cylCache(0.24, 0.24, 0.05, 8), breadMat);
      bread.position.set(-0.7 + (b % 3) * 0.5, 0.8 + Math.floor(b / 3) * 0.1, 0.6);
      tandoorGroup.add(bread);
    }
    marketGroup.add(tandoorGroup);

    // 3.3 Rickshaw Art Workshop (Pedestrian Plaza at X: -58, Z: 205)
    const garageGroup = new THREE.Group();
    garageGroup.position.set(-58, 0, 205);

    const shedRoof = new THREE.Mesh(
      this.boxCache(6.5, 0.1, 4.2),
      new THREE.MeshStandardMaterial({ color: '#047857', roughness: 0.75 })
    );
    shedRoof.position.set(0, 2.7, 0);
    shedRoof.rotation.z = -0.12;
    garageGroup.add(shedRoof);

    // Display wall of painted Rickshaw Art tin backplates
    for (let r = 0; r < 4; r++) {
      const plate = new THREE.Mesh(this.boxCache(1.1, 0.8, 0.06), rickshawArtMat);
      plate.position.set(-1.8 + r * 1.2, 1.4, 1.8);
      garageGroup.add(plate);
    }
    marketGroup.add(garageGroup);

    // Vintage amber street bracket lanterns
    [
      [-61, 145],
      [-61, 175],
      [-61, 205],
      [-79, 145],
      [-79, 175],
      [-79, 205],
    ].forEach(([lx, lz]) => {
      const lamp = new THREE.Mesh(
        this.boxCache(0.35, 0.55, 0.35),
        new THREE.MeshStandardMaterial({
          color: '#fbbf24',
          emissive: new THREE.Color('#fbbf24'),
          emissiveIntensity: 0.85,
        })
      );
      lamp.position.set(lx, 4.2, lz);
      marketGroup.add(lamp);
    });

    const starBlueMat = new THREE.MeshStandardMaterial({
      color: '#0284c7',
      roughness: 0.32,
      metalness: 0.15,
    });
    const cobbleMat = new THREE.MeshStandardMaterial({
      map: loadRealTexture('/textures/brick_diffuse.jpg', 6, 2),
      roughness: 0.88,
      color: '#94a3b8',
    });
    const darkGraniteMat = new THREE.MeshStandardMaterial({
      color: '#1e293b',
      roughness: 0.35,
      metalness: 0.6,
    });
    const lalkuthiRedMat = new THREE.MeshStandardMaterial({
      map: loadRealTexture('/textures/brick_diffuse.jpg', 4, 4),
      roughness: 0.82,
      color: '#991b1b',
    });
    const blackIronMat = new THREE.MeshStandardMaterial({
      color: '#0f172a',
      metalness: 0.85,
      roughness: 0.3,
    });
    const banyanBarkMat = new THREE.MeshStandardMaterial({
      color: '#451a03',
      roughness: 0.9,
    });
    const banyanLeafMat = new THREE.MeshStandardMaterial({
      color: '#166534',
      roughness: 0.85,
    });
    const wireMat = new THREE.MeshBasicMaterial({ color: '#0f172a' });

    // -----------------------------------------------------------------------
    // 4. HISTORIC STAR MOSQUE (তারা মসজিদ - TARA MASJID, আর্মানিটোলা)
    // -----------------------------------------------------------------------
    const starMosqueGroup = new THREE.Group();
    const mx = -85;
    const mz = 135;

    // Raised white marble plinth (24m x 16m x 0.8m)
    const masjidPlinth = this.sharedBox(24, 0.8, 16, marbleWhiteMat, mx, 0.4, mz);
    starMosqueGroup.add(masjidPlinth);

    // Front Marble Steps
    for (let s = 0; s < 3; s++) {
      const step = this.sharedBox(
        12,
        0.2,
        0.6,
        marbleWhiteMat,
        mx,
        0.1 + s * 0.2,
        mz + 8.3 + s * 0.5
      );
      starMosqueGroup.add(step);
    }

    // Main Prayer Hall Body (20m x 11m x 6.8m)
    const prayerHall = this.sharedBox(20, 6.8, 11, marbleWhiteMat, mx, 4.2, mz - 1);
    starMosqueGroup.add(prayerHall);

    // Colonnaded Front Veranda with 5 Scalloped Multi-Foil Mughal Arches
    for (let col = -8; col <= 8; col += 4) {
      const colMesh = new THREE.Mesh(this.cylCache(0.2, 0.22, 5.0, 8), marbleWhiteMat);
      colMesh.position.set(mx + col, 3.3, mz + 5);
      starMosqueGroup.add(colMesh);
    }
    const archHeader = this.sharedBox(20, 1.2, 0.6, marbleWhiteMat, mx, 6.4, mz + 5);
    starMosqueGroup.add(archHeader);

    // Inlaid Blue Porcelain Star Mosaic Motifs (নীল তারার মোজাইক নকশা)
    [-7, -3.5, 0, 3.5, 7].forEach((sx) => {
      const star = new THREE.Mesh(this.boxCache(0.42, 0.42, 0.08), starBlueMat);
      star.position.set(mx + sx, 6.4, mz + 5.32);
      star.rotation.z = Math.PI / 4;
      starMosqueGroup.add(star);
    });

    // 5 Bulbous Mughal Onion Domes (৫টি মোঘল পেঁয়াজ গম্বুজ)
    // Central Grand Dome
    const centerDrum = new THREE.Mesh(this.cylCache(2.7, 2.7, 1.2, 16), marbleWhiteMat);
    centerDrum.position.set(mx, 8.2, mz - 1);
    const centerDome = new THREE.Mesh(this.cylCache(0.35, 2.8, 4.2, 16), marbleWhiteMat);
    centerDome.position.set(mx, 10.3, mz - 1);
    const centerFinial = new THREE.Mesh(this.cylCache(0.04, 0.18, 2.2, 8), brassGoldMat);
    centerFinial.position.set(mx, 13.5, mz - 1);
    const crescent = new THREE.Mesh(this.cylCache(0.25, 0.25, 0.06, 12), brassGoldMat);
    crescent.rotation.x = Math.PI / 2;
    crescent.position.set(mx, 14.5, mz - 1);
    starMosqueGroup.add(centerDrum, centerDome, centerFinial, crescent);

    // 4 Corner Domes
    [
      [mx - 7, mz - 5],
      [mx + 7, mz - 5],
      [mx - 7, mz + 3],
      [mx + 7, mz + 3],
    ].forEach(([cx, cz]) => {
      const cDrum = new THREE.Mesh(this.cylCache(1.7, 1.7, 0.8, 12), marbleWhiteMat);
      cDrum.position.set(cx, 8.0, cz);
      const cDome = new THREE.Mesh(this.cylCache(0.2, 1.75, 2.8, 12), marbleWhiteMat);
      cDome.position.set(cx, 9.8, cz);
      const cFinial = new THREE.Mesh(this.cylCache(0.03, 0.12, 1.6, 8), brassGoldMat);
      cFinial.position.set(cx, 11.8, cz);
      starMosqueGroup.add(cDrum, cDome, cFinial);
    });

    // 4 Octagonal Corner Minarets with Arched Chhatri Cupolas
    [
      [mx - 10, mz - 6.5],
      [mx + 10, mz - 6.5],
      [mx - 10, mz + 4.5],
      [mx + 10, mz + 4.5],
    ].forEach(([minX, minZ]) => {
      const shaft = new THREE.Mesh(this.cylCache(0.65, 0.72, 14.5, 8), marbleWhiteMat);
      shaft.position.set(minX, 8.05, minZ);
      const gallery = new THREE.Mesh(this.cylCache(0.95, 0.85, 0.45, 8), marbleWhiteMat);
      gallery.position.set(minX, 15.4, minZ);
      const cupolaDome = new THREE.Mesh(this.cylCache(0.1, 0.85, 1.2, 8), marbleWhiteMat);
      cupolaDome.position.set(minX, 17.6, minZ);
      const minFinial = new THREE.Mesh(this.cylCache(0.03, 0.12, 1.2, 8), brassGoldMat);
      minFinial.position.set(minX, 18.8, minZ);
      starMosqueGroup.add(shaft, gallery, cupolaDome, minFinial);

      this.circleColliders.push({
        x: minX,
        z: minZ,
        radius: 1.0,
        tag: 'star_masjid_minaret',
      });
    });

    // Courtyard Ablution Water Pool (ওজুখানা)
    const poolRim = this.sharedBox(8.0, 0.6, 5.5, marbleWhiteMat, mx, 0.3, mz + 14);
    const poolWater = new THREE.Mesh(new THREE.PlaneGeometry(7.2, 4.7), waterBasinMat);
    poolWater.rotation.x = -Math.PI / 2;
    poolWater.position.set(mx, 0.52, mz + 14);
    starMosqueGroup.add(poolRim, poolWater);

    // Heritage Signboard
    const starMosqueSignTex = createHeritageSignboardTexture(
      'ঐতিহাসিক তারা মসজিদ (১৮ শতক)',
      'HISTORIC STAR MOSQUE (TARA MASJID)',
      '5 Ornate Mughal Onion Domes with Porcelain Star Mosaics',
      '#0284c7',
      '#fde047'
    );
    const starMosqueSign = new THREE.Mesh(
      this.boxCache(6.5, 1.6, 0.2),
      new THREE.MeshStandardMaterial({ map: starMosqueSignTex, roughness: 0.4 })
    );
    starMosqueSign.position.set(mx, 3.2, mz + 8.1);
    starMosqueGroup.add(starMosqueSign);

    this.buildingColliders.push({
      minX: mx - 11,
      maxX: mx + 11,
      minZ: mz - 7.5,
      maxZ: mz + 6,
      tag: 'star_masjid_prayer_hall',
    });
    this.buildingColliders.push({
      minX: mx - 4.1,
      maxX: mx + 4.1,
      minZ: mz + 14 - 2.85,
      maxZ: mz + 14 + 2.85,
      minY: 0,
      maxY: 2.0,
      tag: 'star_masjid_pool',
    });

    // -----------------------------------------------------------------------
    // 5. BAHADUR SHAH PARK (ভিক্টোরিয়া পার্ক - ১৮৫৭ সিপাহী বিপ্লব শহীদ স্মৃতিস্তম্ভ)
    // -----------------------------------------------------------------------
    const parkGroup = new THREE.Group();
    const px = -25;
    const pz = 225;

    // Oval Landscaped Park Lawn
    const parkLawn = this.sharedBox(34, 0.18, 26, grassGardenMat, px, 0.09, pz);
    parkGroup.add(parkLawn);

    // Circular Cobblestone Promenade Walking Loop
    const pathRing = new THREE.Mesh(new THREE.RingGeometry(6.5, 9.2, 32), cobbleMat);
    pathRing.rotation.x = -Math.PI / 2;
    pathRing.position.set(px, 0.19, pz);
    parkGroup.add(pathRing);

    // Perimeter Wrought-Iron Railing with Gate Openings
    parkGroup.add(this.sharedBox(14, 1.2, 0.1, blackIronMat, px - 9, 0.7, pz - 13));
    parkGroup.add(this.sharedBox(14, 1.2, 0.1, blackIronMat, px + 9, 0.7, pz - 13));
    parkGroup.add(this.sharedBox(14, 1.2, 0.1, blackIronMat, px - 9, 0.7, pz + 13));
    parkGroup.add(this.sharedBox(14, 1.2, 0.1, blackIronMat, px + 9, 0.7, pz + 13));
    parkGroup.add(this.sharedBox(0.1, 1.2, 10, blackIronMat, px - 17, 0.7, pz - 7));
    parkGroup.add(this.sharedBox(0.1, 1.2, 10, blackIronMat, px - 17, 0.7, pz + 7));
    parkGroup.add(this.sharedBox(0.1, 1.2, 10, blackIronMat, px + 17, 0.7, pz - 7));
    parkGroup.add(this.sharedBox(0.1, 1.2, 10, blackIronMat, px + 17, 0.7, pz + 7));

    // 4 Red Terracotta Brick Gate Pillars with Coach Lanterns
    [
      [px - 2.5, pz - 13],
      [px + 2.5, pz - 13],
      [px - 2.5, pz + 13],
      [px + 2.5, pz + 13],
      [px - 17, pz - 2.5],
      [px - 17, pz + 2.5],
      [px + 17, pz - 2.5],
      [px + 17, pz + 2.5],
    ].forEach(([gx, gz]) => {
      const pMesh = this.sharedBox(1.0, 3.2, 1.0, mughalBrickMat, gx, 1.6, gz);
      const cap = this.sharedBox(1.2, 0.25, 1.2, marbleWhiteMat, gx, 3.32, gz);
      const lantern = new THREE.Mesh(
        this.boxCache(0.35, 0.5, 0.35),
        new THREE.MeshStandardMaterial({
          color: '#fbbf24',
          emissive: new THREE.Color('#fbbf24'),
          emissiveIntensity: 0.85,
        })
      );
      lantern.position.set(gx, 3.7, gz);
      parkGroup.add(pMesh, cap, lantern);
    });

    // Central 1857 Sepoy Revolution Martyrs Memorial Obelisk (১৮৫৭ এর শহীদ স্মৃতিস্তম্ভ)
    const obTier1 = new THREE.Mesh(this.cylCache(3.2, 3.5, 0.45, 8), darkGraniteMat);
    obTier1.position.set(px, 0.32, pz);
    const obTier2 = new THREE.Mesh(this.cylCache(2.4, 2.7, 0.45, 8), darkGraniteMat);
    obTier2.position.set(px, 0.77, pz);
    const obTier3 = new THREE.Mesh(this.cylCache(1.7, 1.9, 0.45, 8), darkGraniteMat);
    obTier3.position.set(px, 1.22, pz);
    parkGroup.add(obTier1, obTier2, obTier3);

    // 4-Sided Tapered Granite Obelisk Shaft (Height: 8.5m)
    const obeliskShaft = this.sharedBox(1.8, 8.5, 1.8, darkGraniteMat, px, 5.5, pz);
    const obeliskPyramid = new THREE.Mesh(this.cylCache(0.02, 1.25, 1.6, 4), darkGraniteMat);
    obeliskPyramid.rotation.y = Math.PI / 4;
    obeliskPyramid.position.set(px, 10.5, pz);
    parkGroup.add(obeliskShaft, obeliskPyramid);

    // Bronze Commemorative Medallions on 4 Faces
    [
      [0, 1.05],
      [0, -1.05],
      [1.05, 0],
      [-1.05, 0],
    ].forEach(([dx, dz]) => {
      const medal = new THREE.Mesh(this.cylCache(0.35, 0.35, 0.08, 12), brassGoldMat);
      if (Math.abs(dx) > 0) medal.rotation.z = Math.PI / 2;
      else medal.rotation.x = Math.PI / 2;
      medal.position.set(px + dx, 3.8, pz + dz);
      parkGroup.add(medal);
    });

    // 2 Ancient Sprawling Banyan Trees (বিশাল বটগাছ)
    [
      [px - 8, pz - 4, 1.3, 7.2],
      [px + 8, pz + 4, 1.2, 6.8],
    ].forEach(([tx, tz, tr, cr]) => {
      const bTrunk = new THREE.Mesh(this.cylCache(tr * 0.85, tr, 5.2, 8), banyanBarkMat);
      bTrunk.position.set(tx, 2.6, tz);
      parkGroup.add(bTrunk);

      // Hanging aerial prop roots
      for (let r = 0; r < 4; r++) {
        const ang = (r * Math.PI) / 2;
        const rx = tx + Math.cos(ang) * (tr + 0.6);
        const rz = tz + Math.sin(ang) * (tr + 0.6);
        const root = new THREE.Mesh(this.cylCache(0.1, 0.12, 4.6, 6), banyanBarkMat);
        root.position.set(rx, 2.3, rz);
        parkGroup.add(root);
      }

      // Sprawling multi-tier canopy
      const can1 = new THREE.Mesh(this.cylCache(cr * 0.8, cr, 1.8, 12), banyanLeafMat);
      can1.position.set(tx, 5.4, tz);
      const can2 = new THREE.Mesh(this.cylCache(cr * 0.5, cr * 0.75, 1.6, 10), banyanLeafMat);
      can2.position.set(tx, 6.8, tz);
      const can3 = new THREE.Mesh(this.cylCache(cr * 0.2, cr * 0.5, 1.4, 8), banyanLeafMat);
      can3.position.set(tx, 8.0, tz);
      parkGroup.add(can1, can2, can3);

      this.circleColliders.push({
        x: tx,
        z: tz,
        radius: tr + 0.5,
        tag: 'bahadur_shah_banyan',
      });
    });

    // 4 Wooden Park Benches along the circular promenade
    [
      [px - 5.5, pz, 0],
      [px + 5.5, pz, Math.PI],
      [px, pz - 5.5, Math.PI / 2],
      [px, pz + 5.5, -Math.PI / 2],
    ].forEach(([bx, bz, brot]) => {
      const bench = new THREE.Group();
      bench.position.set(bx, 0.19, bz);
      bench.rotation.y = brot;
      const seat = this.sharedBox(1.8, 0.1, 0.5, woodTimberMat, 0, 0.45, 0);
      const back = this.sharedBox(1.8, 0.5, 0.08, woodTimberMat, 0, 0.72, -0.22);
      const leg1 = this.sharedBox(0.1, 0.45, 0.45, blackIronMat, -0.75, 0.225, 0);
      const leg2 = this.sharedBox(0.1, 0.45, 0.45, blackIronMat, 0.75, 0.225, 0);
      bench.add(seat, back, leg1, leg2);
      parkGroup.add(bench);
    });

    // Heritage Signboard
    const parkSignTex = createHeritageSignboardTexture(
      'ঐতিহাসিক বাহাদুর শাহ পার্ক',
      'BAHADUR SHAH PARK (VICTORIA PARK)',
      '1857 Sepoy Revolution Martyrs Memorial & Public Garden',
      '#15803d',
      '#facc15'
    );
    const parkSign = new THREE.Mesh(
      this.boxCache(6.2, 1.5, 0.18),
      new THREE.MeshStandardMaterial({ map: parkSignTex, roughness: 0.4 })
    );
    parkSign.position.set(px - 17, 2.5, pz);
    parkSign.rotation.y = Math.PI / 2;
    parkGroup.add(parkSign);

    this.buildingColliders.push({
      minX: px - 2.5,
      maxX: px + 2.5,
      minZ: pz - 2.5,
      maxZ: pz + 2.5,
      tag: 'bahadur_shah_obelisk',
    });

    // -----------------------------------------------------------------------
    // 6. SHANKHARI BAZAR HERITAGE STREET (শাঁখারীবাজার - শতাব্দী প্রাচীন সরু গলি)
    // -----------------------------------------------------------------------
    const shankhariGroup = new THREE.Group();
    const sz = 208;

    // Cobblestone Heritage Alley Slab (X: -112 to -80, Width: 7.5m, branching West off Chawkbazar road)
    const alleyRoad = this.sharedBox(32, 0.1, 7.5, cobbleMat, -96, 0.08, sz);
    const curbNorth = this.sharedBox(32, 0.22, 0.35, mughalBrickMat, -96, 0.18, sz + 3.9);
    const curbSouth = this.sharedBox(32, 0.22, 0.35, mughalBrickMat, -96, 0.18, sz - 3.9);
    shankhariGroup.add(alleyRoad, curbNorth, curbSouth);

    // 8 Historic Narrow Shophouses (প্রাচীন সরু ৩-৪ তলা বাড়ি)
    const shophouses: Array<{
      x: number;
      z: number;
      w: number;
      h: number;
      color: string;
      titleBn: string;
      titleEn: string;
      special: 'shankha' | 'attar' | 'sweets' | 'lassi' | 'generic';
    }> = [
      { x: -108, z: 215.5, w: 5.2, h: 11.5, color: '#facc15', titleBn: 'ঐতিহ্যবাহী শাঁখা শিল্প', titleEn: 'Shankha Artisan Craft', special: 'shankha' },
      { x: -100, z: 215.5, w: 4.8, h: 14.0, color: '#b91c1c', titleBn: 'শাহী আতর ও সুরমা ঘর', titleEn: 'Royal Attar & Oud', special: 'attar' },
      { x: -92, z: 215.5, w: 4.8, h: 12.0, color: '#fb923c', titleBn: 'মরন গোপাল মিষ্টির দোকান', titleEn: 'Moron Gopal Sweets', special: 'sweets' },
      { x: -84, z: 215.5, w: 5.4, h: 13.5, color: '#f472b6', titleBn: 'বিউটি লাচ্ছি ও ফালুদা', titleEn: 'Beauty Lassi (Est. 1922)', special: 'lassi' },
      { x: -108, z: 200.5, w: 5.2, h: 11.0, color: '#6ee7b7', titleBn: 'পুরাতন শঙ্খ ভাণ্ডার', titleEn: 'Conch Heritage', special: 'generic' },
      { x: -100, z: 200.5, w: 4.8, h: 13.5, color: '#f59e0b', titleBn: 'কাশ্মীরি রেশম ও অলংকার', titleEn: 'Silk & Ornaments', special: 'generic' },
      { x: -92, z: 200.5, w: 4.8, h: 12.0, color: '#7dd3fc', titleBn: 'পিতল ও কাঁসা শিল্প', titleEn: 'Brass Handicrafts', special: 'generic' },
      { x: -84, z: 200.5, w: 5.4, h: 14.0, color: '#fed7aa', titleBn: 'ঐতিহাসিক বসতবাড়ি', titleEn: 'Heritage Shophouse', special: 'generic' },
    ];

    shophouses.forEach((s) => {
      const sMat = new THREE.MeshStandardMaterial({ color: s.color, roughness: 0.72 });
      const house = this.sharedBox(s.w, s.h, 7.5, sMat, s.x, s.h / 2, s.z);
      shankhariGroup.add(house);

      // Louvered Window Shutters & Wooden Jharokha Balcony
      const isNorth = s.z > sz;
      const faceZ = isNorth ? s.z - 3.8 : s.z + 3.8;
      const balconyY = 5.2;

      // Wooden Cantilevered Balcony
      const balcony = this.sharedBox(s.w * 0.75, 1.0, 1.1, woodTimberMat, s.x, balconyY, faceZ);
      shankhariGroup.add(balcony);

      // Green louvered window frames
      const windowMat = new THREE.MeshStandardMaterial({ color: '#047857', roughness: 0.6 });
      const win1 = this.sharedBox(1.2, 1.6, 0.1, windowMat, s.x - 1.1, balconyY + 2.8, faceZ);
      const win2 = this.sharedBox(1.2, 1.6, 0.1, windowMat, s.x + 1.1, balconyY + 2.8, faceZ);
      shankhariGroup.add(win1, win2);

      // Ground Floor Interactive Shops
      if (s.special === 'shankha') {
        const bench = this.sharedBox(3.8, 0.9, 1.2, woodTimberMat, s.x, 0.45, isNorth ? faceZ + 0.6 : faceZ - 0.6);
        shankhariGroup.add(bench);
        for (let c = 0; c < 5; c++) {
          const conch = new THREE.Mesh(this.cylCache(0.12, 0.18, 0.28, 8), marbleWhiteMat);
          conch.rotation.z = Math.PI / 2;
          conch.position.set(s.x - 1.2 + c * 0.6, 0.95, isNorth ? faceZ + 0.6 : faceZ - 0.6);
          shankhariGroup.add(conch);
        }
      } else if (s.special === 'sweets') {
        const counter = this.sharedBox(3.6, 0.9, 1.2, woodTimberMat, s.x, 0.45, isNorth ? faceZ + 0.6 : faceZ - 0.6);
        shankhariGroup.add(counter);
        [-0.9, 0, 0.9].forEach((dx, idx) => {
          const tray = new THREE.Mesh(this.cylCache(0.38, 0.38, 0.06, 12), brassGoldMat);
          tray.position.set(s.x + dx, 0.93, isNorth ? faceZ + 0.6 : faceZ - 0.6);
          const sweetMat = new THREE.MeshStandardMaterial({
            color: idx === 0 ? '#f8fafc' : idx === 1 ? '#f59e0b' : '#a16207',
            roughness: 0.5,
          });
          const sweet = new THREE.Mesh(this.cylCache(0.28, 0.3, 0.12, 8), sweetMat);
          sweet.position.set(s.x + dx, 1.0, isNorth ? faceZ + 0.6 : faceZ - 0.6);
          shankhariGroup.add(tray, sweet);
        });
      } else if (s.special === 'lassi') {
        const counter = this.sharedBox(4.2, 0.95, 1.4, woodTimberMat, s.x, 0.47, isNorth ? faceZ + 0.6 : faceZ - 0.6);
        shankhariGroup.add(counter);

        const clayMat = new THREE.MeshStandardMaterial({ color: '#78350f', roughness: 0.92 });
        [-1.1, -0.4].forEach((dx) => {
          const pot = new THREE.Mesh(this.cylCache(0.32, 0.22, 0.55, 10), clayMat);
          pot.position.set(s.x + dx, 1.15, isNorth ? faceZ + 0.6 : faceZ - 0.6);
          const yogurt = new THREE.Mesh(this.cylCache(0.28, 0.28, 0.05, 8), marbleWhiteMat);
          yogurt.position.set(s.x + dx, 1.42, isNorth ? faceZ + 0.6 : faceZ - 0.6);
          shankhariGroup.add(pot, yogurt);
        });

        const roseSyrupMat = new THREE.MeshStandardMaterial({ color: '#e11d48', roughness: 0.2 });
        [0.4, 1.0].forEach((dx) => {
          const glass = new THREE.Mesh(this.cylCache(0.12, 0.08, 0.4, 8), roseSyrupMat);
          glass.position.set(s.x + dx, 1.15, isNorth ? faceZ + 0.6 : faceZ - 0.6);
          shankhariGroup.add(glass);
        });

        const lassiSignTex = createHeritageSignboardTexture(
          'বিউটি লাচ্ছি ও ফালুদা (১৯২২)',
          'BEAUTY LASSI & SPECIAL FALOODA',
          'Famous Old Dhaka Chilled Lassi, Lemon Sherbet & Pista Falooda',
          '#047857',
          '#fde047'
        );
        const lassiSign = new THREE.Mesh(
          this.boxCache(4.6, 1.3, 0.15),
          new THREE.MeshStandardMaterial({ map: lassiSignTex, roughness: 0.4 })
        );
        lassiSign.position.set(s.x, 3.2, faceZ - 0.1);
        shankhariGroup.add(lassiSign);
      }
    });

    // Overhead Tangled Electrical Wire Spiderwebs (তারের জটলা)
    [6.8, 7.8, 8.8].forEach((wy, idx) => {
      const wire = new THREE.Mesh(this.cylCache(0.025, 0.025, 32, 6), wireMat);
      wire.rotation.z = Math.PI / 2;
      wire.position.set(-96, wy - (idx % 2) * 0.35, sz + (idx - 1) * 1.5);
      shankhariGroup.add(wire);
    });

    // Cross-Street Cables & Sakrain Festival Kites (সাকরাইন ঘুড়ি)
    const kiteColors = ['#ef4444', '#facc15', '#06b6d4', '#a855f7', '#22c55e', '#ec4899'];
    [-106, -98, -90, -82].forEach((kx, idx) => {
      const crossWire = new THREE.Mesh(this.cylCache(0.018, 0.018, 14, 4), wireMat);
      crossWire.rotation.x = Math.PI / 2;
      crossWire.position.set(kx, 7.6, sz);
      shankhariGroup.add(crossWire);

      const kMat = new THREE.MeshStandardMaterial({
        color: kiteColors[idx % kiteColors.length],
        roughness: 0.5,
        side: THREE.DoubleSide,
      });
      const kite = new THREE.Mesh(this.boxCache(0.9, 0.9, 0.04), kMat);
      kite.rotation.z = Math.PI / 4;
      kite.rotation.y = (idx % 3) * 0.25;
      kite.position.set(kx, 7.5, sz + (idx % 2 === 0 ? 0.8 : -0.8));
      shankhariGroup.add(kite);
    });

    // Entrance Heritage Signboard for Shankhari Bazar (facing east towards Chawkbazar main street)
    const shankhariSignTex = createHeritageSignboardTexture(
      'ঐতিহাসিক শাঁখারীবাজার',
      'SHANKHARI BAZAR HERITAGE STREET',
      'Centuries-Old Artisan Quarter • Conch Shells & Traditional Sweets',
      '#b45309',
      '#fef08a'
    );
    const shankhariSign = new THREE.Mesh(
      this.boxCache(6.4, 1.6, 0.2),
      new THREE.MeshStandardMaterial({ map: shankhariSignTex, roughness: 0.4 })
    );
    shankhariSign.position.set(-81.5, 3.4, sz);
    shankhariSign.rotation.y = Math.PI / 2;
    shankhariGroup.add(shankhariSign);

    this.buildingColliders.push({
      minX: -112,
      maxX: -80,
      minZ: 211.5,
      maxZ: 219.5,
      tag: 'shankhari_north_shops',
    });
    this.buildingColliders.push({
      minX: -112,
      maxX: -80,
      minZ: 196.5,
      maxZ: 204.5,
      tag: 'shankhari_south_shops',
    });

    // -----------------------------------------------------------------------
    // 7. NORTHBROOK HALL / LALKUTHI (ঐতিহাসিক লালকুঠি - ১৮৭৪, বুড়িগঙ্গা রিভারফ্রন্ট)
    // -----------------------------------------------------------------------
    const lalkuthiGroup = new THREE.Group();
    const lx = -48;
    const lz = 295;

    // Victorian Red Brick Main Hall Body (28m x 9.5m x 14m)
    const lalkuthiMain = this.sharedBox(28, 9.5, 14, lalkuthiRedMat, lx, 4.75, lz);
    lalkuthiGroup.add(lalkuthiMain);

    // Central Clock Tower Turret with Circular Clock Face
    const towerBody = this.sharedBox(5.2, 7.5, 5.2, lalkuthiRedMat, lx, 13.25, lz - 2);
    const clockFace = new THREE.Mesh(this.cylCache(1.1, 1.1, 0.08, 16), marbleWhiteMat);
    clockFace.rotation.x = Math.PI / 2;
    clockFace.position.set(lx, 14.5, lz - 4.65);
    const clockHour = new THREE.Mesh(this.boxCache(0.08, 0.55, 0.04), blackIronMat);
    clockHour.position.set(lx, 14.65, lz - 4.7);
    const clockMin = new THREE.Mesh(this.boxCache(0.06, 0.8, 0.04), blackIronMat);
    clockMin.rotation.z = Math.PI / 3;
    clockMin.position.set(lx + 0.25, 14.5, lz - 4.7);

    // Pyramidal Copper Spire
    const spire = new THREE.Mesh(this.cylCache(0.1, 2.6, 5.2, 4), copperMat);
    spire.rotation.y = Math.PI / 4;
    spire.position.set(lx, 19.5, lz - 2);
    lalkuthiGroup.add(towerBody, clockFace, clockHour, clockMin, spire);

    // Riverfront Colonnaded Veranda with Classical Fluted Columns
    for (let c = -11; c <= 11; c += 4.4) {
      const col = new THREE.Mesh(this.cylCache(0.32, 0.36, 6.2, 8), marbleWhiteMat);
      col.position.set(lx + c, 3.1, lz - 7.2);
      lalkuthiGroup.add(col);
    }

    // Heritage Signboard
    const lalkuthiSignTex = createHeritageSignboardTexture(
      'ঐতিহাসিক নর্থব্রুক হল (লালকুঠি)',
      'NORTHBROOK HALL (LALKUTHI)',
      'Historic 1874 Waterfront Town Hall on the Buriganga River',
      '#7f1d1d',
      '#facc15'
    );
    const lalkuthiSign = new THREE.Mesh(
      this.boxCache(8.5, 2.0, 0.2),
      new THREE.MeshStandardMaterial({ map: lalkuthiSignTex, roughness: 0.4 })
    );
    lalkuthiSign.position.set(lx, 8.5, lz - 7.15);
    lalkuthiGroup.add(lalkuthiSign);

    this.buildingColliders.push({
      minX: lx - 15,
      maxX: lx + 15,
      minZ: lz - 8,
      maxZ: lz + 8,
      tag: 'lalkuthi_northbrook_hall',
    });

    // -----------------------------------------------------------------------
    // 8. OLD DHAKA WELCOME ARCHWAY (ঐতিহ্যবাহী পুরান ঢাকা প্রবেশ তোরণ)
    // -----------------------------------------------------------------------
    const welcomeArchGroup = new THREE.Group();
    const wx = -70;
    const wz = 85;

    // Twin Red Brick Minaret Pylons spanning the road (clear road width: 14m)
    const pylonWest = this.sharedBox(2.4, 8.5, 2.4, mughalBrickMat, wx - 8, 4.25, wz);
    const pylonEast = this.sharedBox(2.4, 8.5, 2.4, mughalBrickMat, wx + 8, 4.25, wz);
    const domeWest = new THREE.Mesh(this.cylCache(0.1, 1.25, 1.8, 8), copperMat);
    domeWest.position.set(wx - 8, 9.4, wz);
    const domeEast = new THREE.Mesh(this.cylCache(0.1, 1.25, 1.8, 8), copperMat);
    domeEast.position.set(wx + 8, 9.4, wz);
    welcomeArchGroup.add(pylonWest, pylonEast, domeWest, domeEast);

    // Overhead Arched Lintel Beam (Clearance height: 6.2m)
    const lintelBeam = this.sharedBox(16.5, 2.2, 2.0, mughalBrickMat, wx, 7.3, wz);
    welcomeArchGroup.add(lintelBeam);

    // Double-Sided Illuminated Heritage Welcome Signboard
    const welcomeSignTex = createHeritageSignboardTexture(
      'ঐতিহ্যবাহী পুরান ঢাকায় স্বাগতম',
      'WELCOME TO HISTORIC PURAN DHAKA',
      'Land of Mughal Forts, Narrow Alleys & World-Famous Kacchi Biriyani',
      '#7f1d1d',
      '#facc15'
    );
    const signNorth = new THREE.Mesh(
      this.boxCache(14.5, 1.8, 0.15),
      new THREE.MeshStandardMaterial({ map: welcomeSignTex, roughness: 0.4 })
    );
    signNorth.position.set(wx, 7.3, wz - 1.08);
    const signSouth = new THREE.Mesh(
      this.boxCache(14.5, 1.8, 0.15),
      new THREE.MeshStandardMaterial({ map: welcomeSignTex, roughness: 0.4 })
    );
    signSouth.rotation.y = Math.PI;
    signSouth.position.set(wx, 7.3, wz + 1.08);
    welcomeArchGroup.add(signNorth, signSouth);

    // Amber Carriage Lanterns
    [-8, 8].forEach((lxPos) => {
      const lamp = new THREE.Mesh(
        this.boxCache(0.4, 0.6, 0.4),
        new THREE.MeshStandardMaterial({
          color: '#fbbf24',
          emissive: new THREE.Color('#fbbf24'),
          emissiveIntensity: 0.9,
        })
      );
      lamp.position.set(wx + lxPos, 4.5, wz + (lxPos < 0 ? -1.3 : 1.3));
      welcomeArchGroup.add(lamp);
    });

    this.buildingColliders.push({
      minX: wx - 9.5,
      maxX: wx - 6.5,
      minZ: wz - 1.5,
      maxZ: wz + 1.5,
      tag: 'old_dhaka_gate_west',
    });
    this.buildingColliders.push({
      minX: wx + 6.5,
      maxX: wx + 9.5,
      minZ: wz - 1.5,
      maxZ: wz + 1.5,
      tag: 'old_dhaka_gate_east',
    });

    this.scene.add(fortGroup);
    this.scene.add(ahsanGroup);
    this.scene.add(marketGroup);
    this.scene.add(starMosqueGroup);
    this.scene.add(parkGroup);
    this.scene.add(shankhariGroup);
    this.scene.add(lalkuthiGroup);
    this.scene.add(welcomeArchGroup);
  }

  /**
   * Purbachal 300 Feet Grand Expressway & Smart City Hub
   * Authentic high-speed highway and food village:
   * 1. Balu River 3-Span Cable-Stayed Suspension Bridge:
   *    - Spanning X = 535 to 645 over the Balu River canal at Z = -315.
   *    - Dual 32m soaring white A-frame suspension pylon towers with stay-cables.
   *    - Cyan & electric blue architectural LED illumination for night cruising.
   *    - Highway crash barriers with yellow reflector studs and gantry sign.
   *    - Balu River waterway under the bridge with realistic water ripples.
   * 2. Purbachal Food Village (পূর্বাচল ফুড ভিলেজ - রাজহাঁস ও চুইঝাল ধাবা):
   *    - 4 rustic open-air thatched dhabas with timber posts and pitched roofs.
   *    - Outdoor dining with wooden picnic tables and rustic string cots (খাটিয়া).
   *    - Outdoor barbecue firepits with glowing red embers and Seekh Kebab skewers.
   *    - Slow-cooked duck curry cauldrons (রাজহাঁসের মাংস ভুনা) and tea tong stalls.
   *    - Glowing neon Bangla signs (হাঁসের মাংস • চুইঝাল • স্পেশাল নান).
   *    - Paved parking lot with parked tuned sports cars and motorbikes.
   * 3. Bangabandhu Bangladesh-China Friendship Exhibition Center (BBCFEC):
   *    - At X = 740 to 860, Z = -240 to -140.
   *    - Massive undulating wave-shaped white aluminium canopy roof (78m x 50m x 26m).
   *    - Curved reflective glass curtain wall facade, steel space-frame colonnade.
   *    - Ceremonial entrance plaza with geometric fountains and Bangladesh flag plaza.
   * 4. 8-Lane Expressway Highway Infrastructure:
   *    - Speed limit radar gantries with digital displays (SPEED LIMIT 100 KM/H).
   *    - Modern double-arm curved highway streetlights with high-lumen LED luminaires.
   *    - Green median with planted date palms and manicured hedges along X = 640.
   */
  private buildPurbachalSmartCityAndExpressway() {
    const whitePylonMat = new THREE.MeshStandardMaterial({
      color: '#f8fafc',
      roughness: 0.22,
      metalness: 0.25,
    });
    const steelCableMat = new THREE.MeshStandardMaterial({
      color: '#cbd5e1',
      metalness: 0.95,
      roughness: 0.15,
    });
    const ledCyanMat = new THREE.MeshStandardMaterial({
      color: '#06b6d4',
      emissive: new THREE.Color('#06b6d4'),
      emissiveIntensity: 0.9,
      roughness: 0.2,
    });
    const ledBlueMat = new THREE.MeshStandardMaterial({
      color: '#2563eb',
      emissive: new THREE.Color('#2563eb'),
      emissiveIntensity: 0.9,
      roughness: 0.2,
    });
    const thatchedRoofMat = new THREE.MeshStandardMaterial({
      color: '#92400e',
      roughness: 0.95,
      flatShading: true,
    });
    const bambooMat = new THREE.MeshStandardMaterial({
      color: '#b45309',
      roughness: 0.82,
    });
    const woodDeckMat = new THREE.MeshStandardMaterial({
      map: loadRealTexture('/textures/hardwood2_diffuse.jpg', 1, 3),
      color: '#78350f',
      roughness: 0.85,
    });
    const khatiyaRopeMat = new THREE.MeshStandardMaterial({
      color: '#d97706',
      roughness: 0.75,
    });
    const bbqEmberMat = new THREE.MeshStandardMaterial({
      color: '#ea580c',
      emissive: new THREE.Color('#ea580c'),
      emissiveIntensity: 0.85,
      roughness: 0.9,
    });
    const bbcfecRoofMat = new THREE.MeshStandardMaterial({
      color: '#ffffff',
      roughness: 0.18,
      metalness: 0.35,
    });
    const reflectiveGlassMat = new THREE.MeshStandardMaterial({
      color: '#0369a1',
      roughness: 0.08,
      metalness: 0.88,
    });
    const barrierMat = new THREE.MeshStandardMaterial({
      color: '#e2e8f0',
      roughness: 0.65,
    });
    const yellowStripeMat = new THREE.MeshStandardMaterial({
      color: '#facc15',
      roughness: 0.45,
    });
    const waterMat = new THREE.MeshStandardMaterial({
      color: '#082f3d',
      normalMap: this.waterNormalTex,
      normalScale: new THREE.Vector2(0.28, 0.28),
      roughness: 0.18,
      metalness: 0.32,
    });

    // -----------------------------------------------------------------------
    // 1. BALU RIVER WATERWAY & 3-SPAN CABLE-STAYED SUSPENSION BRIDGE
    // -----------------------------------------------------------------------
    const bridgeGroup = new THREE.Group();

    // 1.1 Balu River Waterway (Width: 38m, Length: 700m running NS along X: 590)
    const baluRiver = this.createIsotropicWaterMesh(38, 700, waterMat, 22);
    baluRiver.position.set(590, 0.05, -250);
    this.scene.add(baluRiver);

    // River embankment grass strips
    const riverGrassMat = new THREE.MeshStandardMaterial({
      color: '#15803d',
      roughness: 0.9,
    });
    [569, 611].forEach((gx) => {
      const bank = new THREE.Mesh(new THREE.BoxGeometry(4.5, 0.2, 700), riverGrassMat);
      bank.position.set(gx, 0.1, -250);
      this.scene.add(bank);
    });

    // 1.2 Elevated 8-Lane Bridge Deck (X: 535 to 645, Z: -315, Width: 22m, Top Y = 0.80m)
    const baluAsphaltTex = loadRealTexture('/textures/dhaka_asphalt.jpg', 10, 2, true);
    const baluAsphaltMat = new THREE.MeshStandardMaterial({
      map: baluAsphaltTex,
      color: '#334155',
      roughness: 0.88,
    });
    const whiteLaneMat = new THREE.MeshStandardMaterial({ color: '#f8fafc', roughness: 0.55 });

    // Concrete structural underside box girder + dark asphalt wearing surface + sidewalks + smooth approach ramps
    const bridgeUnderside = this.sharedBox(110, 0.66, 22, barrierMat, 590, 0.33, -315);
    const bridgeAsphalt = this.sharedBox(110, 0.14, 19.6, baluAsphaltMat, 590, 0.73, -315);
    const sidewalkN = this.sharedBox(110, 0.22, 1.2, barrierMat, 590, 0.77, -315 - 10.4);
    const sidewalkS = this.sharedBox(110, 0.22, 1.2, barrierMat, 590, 0.77, -315 + 10.4);
    const centerLineN = this.sharedBox(110, 0.02, 0.18, yellowStripeMat, 590, 0.808, -315 - 0.18);
    const centerLineS = this.sharedBox(110, 0.02, 0.18, yellowStripeMat, 590, 0.808, -315 + 0.18);
    bridgeGroup.add(bridgeUnderside, bridgeAsphalt, sidewalkN, sidewalkS, centerLineN, centerLineS);

    for (let sx = 540; sx <= 640; sx += 8) {
      bridgeGroup.add(this.sharedBox(4.0, 0.02, 0.14, whiteLaneMat, sx, 0.808, -315 - 4.8));
      bridgeGroup.add(this.sharedBox(4.0, 0.02, 0.14, whiteLaneMat, sx, 0.808, -315 + 4.8));
    }

    // Smooth 10m approach asphalt ramps at X = 525..535 (west) and X = 645..655 (east)
    const rampPitch = Math.atan2(0.72, 10);
    const westRamp = new THREE.Mesh(this.boxCache(10.2, 0.24, 21.6), baluAsphaltMat);
    westRamp.position.set(530, 0.32, -315);
    westRamp.rotation.z = rampPitch;
    const eastRamp = new THREE.Mesh(this.boxCache(10.2, 0.24, 21.6), baluAsphaltMat);
    eastRamp.position.set(650, 0.32, -315);
    eastRamp.rotation.z = -rampPitch;
    bridgeGroup.add(westRamp, eastRamp);

    // Bridge Side Crash Barriers with Yellow Warning Reflectors
    [-11.2, 11.2].forEach((bz) => {
      const barrier = this.sharedBox(110, 1.1, 0.45, barrierMat, 590, 0.95, -315 + bz);
      bridgeGroup.add(barrier);

      // Guardrail colliders along Balu River 8-Lane Suspension Bridge
      this.buildingColliders.push({
        minX: 535,
        maxX: 645,
        minZ: -315 + bz - 0.35,
        maxZ: -315 + bz + 0.35,
        minY: 0.1,
        maxY: 2.6,
        tag: 'balu_bridge_guardrail',
      });

      // Yellow Reflector Studs along the barrier
      for (let rx = -50; rx <= 50; rx += 8) {
        const stud = new THREE.Mesh(this.boxCache(0.4, 0.2, 0.1), yellowStripeMat);
        stud.position.set(590 + rx, 1.15, -315 + bz + (bz > 0 ? -0.25 : 0.25));
        bridgeGroup.add(stud);
      }
    });

    // 1.3 Dual A-Frame Pylon Towers (West Tower at X = 565, East Tower at X = 615)
    [565, 615].forEach((px) => {
      const pylonGroup = new THREE.Group();
      pylonGroup.position.set(px, 0, -315);

      // Tower Legs angled inward to form soaring A-frame
      [-11, 11].forEach((lz) => {
        const leg = new THREE.Mesh(this.cylCache(0.85, 1.4, 32, 8), whitePylonMat);
        leg.position.set(0, 16, lz);
        leg.rotation.x = lz > 0 ? -0.18 : 0.18;
        pylonGroup.add(leg);

        // Architectural Cyan LED light channel along tower leg
        const ledStrip = new THREE.Mesh(this.boxCache(0.12, 31, 0.15), ledCyanMat);
        ledStrip.position.set(0.9, 16, lz * 0.95);
        ledStrip.rotation.x = lz > 0 ? -0.18 : 0.18;
        pylonGroup.add(ledStrip);
      });

      // Upper Cross-Strut Beam
      const crossStrut = this.sharedBox(1.8, 1.2, 14, whitePylonMat, 0, 18, 0);
      pylonGroup.add(crossStrut);

      // Tower Peak Crown
      const crown = this.sharedBox(2.2, 3.2, 3.6, whitePylonMat, 0, 32, 0);
      const crownBeacon = new THREE.Mesh(this.cylCache(0.15, 0.35, 1.4, 8), ledBlueMat);
      crownBeacon.position.set(0, 34.2, 0);
      pylonGroup.add(crown, crownBeacon);

      // Symmetrical High-Tensile Stay Cables fanning down from Pylon Peak
      for (let c = -42; c <= 42; c += 7) {
        if (Math.abs(c) < 4) continue;
        const targetX = px + c;
        if (targetX < 535 || targetX > 645) continue;

        [-10.8, 10.8].forEach((cz) => {
          const cableLen = Math.hypot(c, 31, cz);
          const cable = new THREE.Mesh(
            this.cylCache(0.045, 0.045, cableLen, 6),
            steelCableMat
          );
          cable.position.set(c / 2, 16, cz / 2);
          cable.lookAt(new THREE.Vector3(c, 0.8, cz));
          cable.rotateX(Math.PI / 2);
          pylonGroup.add(cable);
        });
      }

      bridgeGroup.add(pylonGroup);
    });

    // 1.4 Grand Overhead Highway Gantry Sign
    const gantrySignTex = createFlyoverGantryTexture(
      'পূর্বাচল ৩০০ ফিট এক্সপ্রেসওয়ে',
      'PURBACHAL 300FT GRAND SPEEDWAY',
      'কাঞ্চন সেতু ও ঢাকা বাইপাস',
      'KANCHAN BRIDGE & DHAKA BYPASS'
    );
    const gantryBoard = new THREE.Mesh(
      this.boxCache(14, 3.2, 0.35),
      new THREE.MeshStandardMaterial({ map: gantrySignTex, roughness: 0.35 })
    );
    gantryBoard.position.set(542, 6.2, -315);
    bridgeGroup.add(gantryBoard);

    // Gantry Support Posts
    [-10.8, 10.8].forEach((gz) => {
      const gPost = new THREE.Mesh(this.cylCache(0.35, 0.4, 7.2, 8), barrierMat);
      gPost.position.set(542, 3.6, -315 + gz);
      bridgeGroup.add(gPost);
    });

    this.scene.add(bridgeGroup);

    // -----------------------------------------------------------------------
    // 2. PURBACHAL FOOD VILLAGE (পূর্বাচল ফুড ভিলেজ - রাজহাঁস ও চুইঝাল ধাবা)
    // -----------------------------------------------------------------------
    const foodVillage = new THREE.Group();
    const fvx = 695;
    const fvz = -295;

    // Paved Parking Lot & Outdoor Courtyard
    const foodPlaza = this.sharedBox(64, 0.12, 68, woodDeckMat, fvx, 0.06, fvz);
    foodVillage.add(foodPlaza);

    // 4 Open-Air Thatched Bamboo Dhabas (ছন ও বাঁশের রেস্তোরাঁ)
    [
      { dx: -18, dz: -18, w: 18, d: 14, name: 'রাজহাঁসের মাংস ও চাপ ঘর' },
      { dx: 18, dz: -18, w: 18, d: 14, name: 'পূর্বাচল চুইঝাল ডাইনিং' },
      { dx: -18, dz: 18, w: 18, d: 14, name: '৩০০ ফিট স্পেশাল তন্দুর নান' },
      { dx: 18, dz: 18, w: 18, d: 14, name: 'হাইওয়ে মালাই চা ও ডাব কর্নার' },
    ].forEach((dhaba) => {
      const dhabaGroup = new THREE.Group();
      dhabaGroup.position.set(fvx + dhaba.dx, 0, fvz + dhaba.dz);

      // Raised Wooden Deck
      const deck = this.sharedBox(dhaba.w, 0.4, dhaba.d, woodDeckMat, 0, 0.2, 0);
      dhabaGroup.add(deck);

      // Bamboo Corner Posts
      [
        [-dhaba.w / 2 + 0.6, -dhaba.d / 2 + 0.6],
        [dhaba.w / 2 - 0.6, -dhaba.d / 2 + 0.6],
        [-dhaba.w / 2 + 0.6, dhaba.d / 2 - 0.6],
        [dhaba.w / 2 - 0.6, dhaba.d / 2 - 0.6],
      ].forEach(([px, pz]) => {
        const post = new THREE.Mesh(this.cylCache(0.14, 0.16, 4.2, 8), bambooMat);
        post.position.set(px, 2.1, pz);
        dhabaGroup.add(post);
      });

      // Pitched Thatched Roof (ছন ও বাঁশের চাল)
      const roof = new THREE.Mesh(
        new THREE.ConeGeometry(Math.max(dhaba.w, dhaba.d) * 0.72, 3.2, 4),
        thatchedRoofMat
      );
      roof.rotation.y = Math.PI / 4;
      roof.position.set(0, 5.2, 0);
      dhabaGroup.add(roof);

      foodVillage.add(dhabaGroup);
    });

    // Traditional Bengali String Cots (খাটিয়া) for Open-Air Lounging
    [
      [-10, -6],
      [10, -6],
      [-10, 6],
      [10, 6],
      [0, -18],
      [0, 18],
    ].forEach(([kx, kz]) => {
      const khatiya = new THREE.Group();
      khatiya.position.set(fvx + kx, 0, fvz + kz);

      // Wooden Frame
      const frame = this.sharedBox(2.2, 0.12, 1.3, woodDeckMat, 0, 0.48, 0);
      // Woven Orange Rope Mattress (দড়ি দিয়ে বোনা বিছানা)
      const mat = this.sharedBox(2.0, 0.08, 1.1, khatiyaRopeMat, 0, 0.52, 0);
      khatiya.add(frame, mat);

      // 4 Wooden legs
      [
        [-0.95, -0.5],
        [0.95, -0.5],
        [-0.95, 0.5],
        [0.95, 0.5],
      ].forEach(([lx, lz]) => {
        const leg = new THREE.Mesh(this.cylCache(0.08, 0.08, 0.48, 6), bambooMat);
        leg.position.set(lx, 0.24, lz);
        khatiya.add(leg);
      });
      foodVillage.add(khatiya);
    });

    // Outdoor Barbecue Pits with Glowing Coals (শিক কাবাব ও কয়লার আগুন)
    [-8, 8].forEach((bx) => {
      const bbq = new THREE.Group();
      bbq.position.set(fvx + bx, 0, fvz);

      const pit = this.sharedBox(2.4, 0.75, 1.2, barrierMat, 0, 0.38, 0);
      const ember = new THREE.Mesh(this.boxCache(2.1, 0.15, 0.9), bbqEmberMat);
      ember.position.set(0, 0.78, 0);
      bbq.add(pit, ember);

      // Metal Seekh skewers with grilled meat
      for (let k = -0.8; k <= 0.8; k += 0.35) {
        const skewer = new THREE.Mesh(
          this.cylCache(0.03, 0.03, 1.1, 6),
          new THREE.MeshStandardMaterial({ color: '#78350f', roughness: 0.8 })
        );
        skewer.rotation.x = Math.PI / 2;
        skewer.position.set(k, 0.88, 0);
        bbq.add(skewer);
      }
      foodVillage.add(bbq);
    });

    // Giant Iron Pots for Duck Meat Curry (রাজহাঁসের মাংসের ডেগ)
    [
      [-4, 2],
      [4, 2],
    ].forEach(([dx, dz]) => {
      const pot = new THREE.Mesh(
        this.cylCache(0.65, 0.5, 0.8, 10),
        new THREE.MeshStandardMaterial({ color: '#1e293b', metalness: 0.8 })
      );
      pot.position.set(fvx + dx, 0.5, fvz + dz);
      foodVillage.add(pot);
    });

    // Glowing Neon Signboard for Food Village
    const neonVillageTex = createHeritageSignboardTexture(
      'পূর্বাচল ফুড ভিলেজ',
      'PURBACHAL FOOD VILLAGE',
      'Famous 300ft Duck Curry, Chuijhal & Tandoori Naan',
      '#b45309',
      '#fde047'
    );
    const villageSign = new THREE.Mesh(
      this.boxCache(12.5, 2.6, 0.35),
      new THREE.MeshStandardMaterial({ map: neonVillageTex, roughness: 0.3 })
    );
    villageSign.position.set(fvx, 4.8, fvz - 34);
    foodVillage.add(villageSign);

    this.scene.add(foodVillage);

    // -----------------------------------------------------------------------
    // 3. BANGABANDHU BANGLADESH-CHINA FRIENDSHIP EXHIBITION CENTER (BBCFEC)
    // -----------------------------------------------------------------------
    const bbcfecGroup = new THREE.Group();
    const bx = 800;
    const bz = -190;

    // Grand Undulating Aerodynamic Wave Canopy Roof (78m Wide x 50m Deep x 24m Tall)
    const waveCanopy = this.sharedBox(78, 3.5, 50, bbcfecRoofMat, bx, 22, bz);
    bbcfecGroup.add(waveCanopy);

    // Reflective Tinted Glass Curtain Wall Main Exhibition Hall
    const glassHall = this.sharedBox(72, 19, 44, reflectiveGlassMat, bx, 10, bz);
    bbcfecGroup.add(glassHall);

    // Modern Space-Frame Entrance Colonnade Pillars
    for (let col = -32; col <= 32; col += 8) {
      const pillar = new THREE.Mesh(this.cylCache(0.55, 0.65, 20, 8), whitePylonMat);
      pillar.position.set(bx + col, 10, bz - 24);
      bbcfecGroup.add(pillar);
    }

    // Ceremonial Entrance Plaza (40m x 25m) with Water Fountain Basin
    const plazaMat = new THREE.MeshStandardMaterial({
      color: '#cbd5e1',
      roughness: 0.5,
    });
    const entrancePlaza = this.sharedBox(60, 0.15, 30, plazaMat, bx, 0.08, bz - 38);
    bbcfecGroup.add(entrancePlaza);

    // Geometric Fountain Basin
    const fountainBasin = this.sharedBox(24, 0.6, 12, whitePylonMat, bx, 0.3, bz - 38);
    const fountainWater = new THREE.Mesh(new THREE.PlaneGeometry(22, 10), waterMat);
    fountainWater.rotation.x = -Math.PI / 2;
    fountainWater.position.set(bx, 0.62, bz - 38);
    bbcfecGroup.add(fountainBasin, fountainWater);

    this.buildingColliders.push({
      minX: bx - 12.2,
      maxX: bx + 12.2,
      minZ: bz - 38 - 6.2,
      maxZ: bz - 38 + 6.2,
      minY: 0,
      maxY: 2.5,
      tag: 'bbcfec_fountain',
    });

    // Symmetrical Flagpoles flying national flags
    [-18, -6, 6, 18].forEach((fx) => {
      const pole = new THREE.Mesh(this.cylCache(0.06, 0.08, 14, 6), steelCableMat);
      pole.position.set(bx + fx, 7, bz - 46);
      const flag = new THREE.Mesh(
        this.boxCache(2.2, 1.3, 0.03),
        new THREE.MeshStandardMaterial({ color: '#15803d', roughness: 0.8 })
      );
      flag.position.set(bx + fx + 1.15, 13, bz - 46);
      bbcfecGroup.add(pole, flag);
    });

    // Grand Facade Signboard
    const bbcfecSignTex = createHeritageSignboardTexture(
      'বঙ্গবন্ধু বাংলাদেশ-চীন মৈত্রী প্রদর্শনী কেন্দ্র',
      'BANGLADESH-CHINA FRIENDSHIP EXHIBITION CENTER',
      'Purbachal Smart City International Convention Pavilion',
      '#0369a1',
      '#e0f2fe'
    );
    const bbcfecSign = new THREE.Mesh(
      this.boxCache(16, 2.8, 0.35),
      new THREE.MeshStandardMaterial({ map: bbcfecSignTex, roughness: 0.3 })
    );
    bbcfecSign.position.set(bx, 17.5, bz - 24.2);
    bbcfecGroup.add(bbcfecSign);

    this.buildingColliders.push({
      minX: bx - 40,
      maxX: bx + 40,
      minZ: bz - 26,
      maxZ: bz + 26,
      tag: 'bbcfec_exhibition_hall',
    });

    this.scene.add(bbcfecGroup);

    // -----------------------------------------------------------------------
    // 4. 8-LANE EXPRESSWAY RADAR SPEED TRAP & HIGHWAY STREETLIGHTS
    // -----------------------------------------------------------------------
    const speedwayGroup = new THREE.Group();

    // Overhead Radar Speed Trap Gantry across 8-Lane Expressway at X = 640, Z = -210
    const radarGantry = this.sharedBox(28, 1.4, 1.2, whitePylonMat, 640, 7.8, -210);
    speedwayGroup.add(radarGantry);

    [-13.5, 13.5].forEach((gx) => {
      const post = new THREE.Mesh(this.cylCache(0.35, 0.45, 8.5, 8), whitePylonMat);
      post.position.set(640 + gx, 4.25, -210);
      speedwayGroup.add(post);
    });

    // Digital Speed Limit Display
    const speedSignTex = createHighwaySpeedSignTexture(
      100,
      'সর্বোচ্চ গতিসীমা ১০০ কিমি/ঘণ্টা'
    );
    const speedSign = new THREE.Mesh(
      this.boxCache(4.2, 4.2, 0.25),
      new THREE.MeshStandardMaterial({ map: speedSignTex, roughness: 0.3 })
    );
    speedSign.position.set(640, 7.8, -209.2);
    speedwayGroup.add(speedSign);

    // Modern Double-Arm Curved Highway Streetlights along Median (X = 640)
    for (let lz = -520; lz <= 0; lz += 45) {
      const pole = new THREE.Mesh(this.cylCache(0.18, 0.24, 10.5, 8), whitePylonMat);
      pole.position.set(640, 5.25, lz);
      speedwayGroup.add(pole);

      // Double-arm horizontal crossbar
      const crossbar = this.sharedBox(6.5, 0.15, 0.2, whitePylonMat, 640, 10.4, lz);
      speedwayGroup.add(crossbar);

      // High-lumen LED luminaires
      [-3.1, 3.1].forEach((lx) => {
        const luminaire = new THREE.Mesh(this.boxCache(0.9, 0.18, 0.45), ledCyanMat);
        luminaire.position.set(640 + lx, 10.3, lz);
        speedwayGroup.add(luminaire);
      });
    }

    this.scene.add(speedwayGroup);
  }


  private buildAuthenticDhakaStreetInfrastructure() {
    const blackCurbMat = new THREE.MeshStandardMaterial({
      color: '#0f172a',
      roughness: 0.75,
    });
    const whiteCurbMat = new THREE.MeshStandardMaterial({
      color: '#f8fafc',
      roughness: 0.65,
    });
    const greenGrilleMat = new THREE.MeshStandardMaterial({
      color: '#15803d',
      metalness: 0.65,
      roughness: 0.35,
    });
    const poleMat = new THREE.MeshStandardMaterial({
      color: '#64748b',
      roughness: 0.6,
      metalness: 0.35,
    });
    const wireMat = new THREE.LineBasicMaterial({ color: '#090d16' });
    // Hoisted shared resources for the pole line (was allocated per pole).
    const coilGeo = new THREE.TorusGeometry(0.36, 0.055, 8, 16);
    this.coilGeo = coilGeo;
    const coilMat = new THREE.MeshStandardMaterial({
      color: '#0f172a',
      roughness: 0.8,
    });
    const transformerMat = new THREE.MeshStandardMaterial({
      color: '#475569',
      metalness: 0.55,
      roughness: 0.4,
    });

    // 1. Black-and-White Striped Dhaka Road Medians & Iron Anti-Jaywalking Grilles
    const medianSegmentsZ = [-250, -210, -135, -95, -55, 55, 95, 135, 225];
    medianSegmentsZ.forEach((mz) => {
      for (let i = 0; i < 6; i++) {
        this.scene.add(
          this.sharedBox(
            0.95,
            0.34,
            4.2,
            i % 2 === 0 ? blackCurbMat : whiteCurbMat,
            0,
            0.18,
            mz - 10 + i * 4.2
          )
        );
      }
      const railTop = new THREE.Mesh(
        new THREE.BoxGeometry(0.14, 0.92, 24.5),
        greenGrilleMat
      );
      railTop.position.set(0, 0.72, mz + 0.5);
      this.scene.add(railTop);

      // Add physical obstacle collider for central road median!
      this.buildingColliders.push({
        minX: -0.55,
        maxX: 0.55,
        minZ: mz - 10.2,
        maxZ: mz + 15.2,
        minY: 0.0,
        maxY: 1.4,
        tag: 'road_median',
      });
    });

    // 2. Concrete Utility Poles, Cylindrical Transformers & Tangled Overhead Black Cable Bundles (তারের জট)
    const poleCoords: Array<[number, number]> = [
      [-11, -130],
      [-11, -85],
      [-11, -40],
      [-11, -14],
      [-11, 20],
      [-11, 65],
      [-11, 115],
      [-11, 155],
      [-11, 205],
      [11, -130],
      [11, -85],
      [11, -40],
      [11, -14],
      [11, 20],
      [11, 65],
      [11, 115],
      [11, 155],
      [11, 205],
      [-63, 120],
      [-63, 155],
      [-63, 190],
      [-63, 225],
      [-77, 120],
      [-77, 155],
      [-77, 190],
      [-77, 225],
    ];

    const cablePoints: number[] = [];
    const crossbarPositions: Array<{ x: number; y: number; z: number }> = [];
    const coilPositions: Array<{ x: number; y: number; z: number }> = [];
    poleCoords.forEach(([px, pz], idx) => {
      this.circleColliders.push({
        x: px,
        z: pz,
        radius: 0.45,
        tag: 'utility_pole',
      });
      const pole = new THREE.Mesh(this.cylCache(0.16, 0.22, 8.6, 8), poleMat);
      pole.position.set(px, 4.3, pz);
      pole.castShadow = true;
      this.scene.add(pole);

      crossbarPositions.push({ x: px, y: 7.8, z: pz });

      // Coiled black internet/dish cable loop hanging on the pole (ডিশের তারের কুণ্ডলী)
      coilPositions.push({ x: px, y: 5.8, z: pz + 0.18 });

      // Cylindrical Dhaka Electric Transformer on every 3rd pole
      if (idx % 3 === 0) {
        const transformer = new THREE.Mesh(
          this.cylCache(0.42, 0.42, 1.15, 12),
          transformerMat
        );
        transformer.position.set(px + (px > 0 ? 0.38 : -0.38), 6.5, pz);
        this.scene.add(transformer);
      }

      // Connect sagging catenary overhead black cables to the next pole in the
      // same line. All segments across the whole street are appended to one
      // buffer and drawn as a single LineSegments call (was 4 lines per pole).
      const next = poleCoords[idx + 1];
      if (next && Math.abs(next[0] - px) < 1 && Math.abs(next[1] - pz) < 60) {
        [-0.55, -0.18, 0.18, 0.55].forEach((offsetX, wIdx) => {
          const sag = 0.65 + (wIdx % 2) * 0.38;
          for (let s = 0; s < 10; s++) {
            const t0 = s / 10;
            const t1 = (s + 1) / 10;
            const p0 = new THREE.Vector3(
              px + offsetX,
              7.75 - Math.sin(t0 * Math.PI) * sag - wIdx * 0.14,
              pz + (next[1] - pz) * t0
            );
            const p1 = new THREE.Vector3(
              px + offsetX,
              7.75 - Math.sin(t1 * Math.PI) * sag - wIdx * 0.14,
              pz + (next[1] - pz) * t1
            );
            cablePoints.push(p0.x, p0.y, p0.z, p1.x, p1.y, p1.z);
          }
        });
      }
    });

    this.addInstances(this.boxCache(1.6, 0.12, 0.14), poleMat, crossbarPositions);
    this.addInstances(this.coilGeo, coilMat, coilPositions, true);

    // One merged draw call for every overhead cable strand on the avenue.
    if (cablePoints.length > 0) {
      const cableGeo = new THREE.BufferGeometry();
      cableGeo.setAttribute(
        'position',
        new THREE.Float32BufferAttribute(cablePoints, 3)
      );
      this.scene.add(new THREE.LineSegments(cableGeo, wireMat));
    }

    // 3. Old Dhaka Red-Cloth Wrapped Giant Kacchi Biriyani Cauldron Stalls (হাজী কাচ্চি বিরিয়ানির হাঁড়ি)
    [
      [-62, 162],
      [-78, 188],
      [14, 18],
    ].forEach(([bx, bz]) => {
      const biriyaniStall = new THREE.Group();
      biriyaniStall.position.set(bx, 0, bz);

      const table = new THREE.Mesh(
        new THREE.BoxGeometry(1.8, 0.85, 1.4),
        new THREE.MeshStandardMaterial({ color: '#78350f', roughness: 0.8 })
      );
      table.position.y = 0.42;
      biriyaniStall.add(table);

      // Giant aluminum Biriyani Dekchi wrapped in crimson red cloth (লাল সালু কাপড় মোড়ানো বিরিয়ানির ডেকচি)
      const redWrap = new THREE.Mesh(
        new THREE.SphereGeometry(0.58, 16, 12),
        new THREE.MeshStandardMaterial({ color: '#dc2626', roughness: 0.65 })
      );
      redWrap.scale.set(1, 0.78, 1);
      redWrap.position.set(0, 1.22, 0);
      biriyaniStall.add(redWrap);

      const lid = new THREE.Mesh(
        new THREE.CylinderGeometry(0.42, 0.48, 0.14, 14),
        new THREE.MeshStandardMaterial({
          color: '#e2e8f0',
          metalness: 0.85,
          roughness: 0.2,
        })
      );
      lid.position.set(0, 1.66, 0);
      biriyaniStall.add(lid);

      this.scene.add(biriyaniStall);
    });

    // 4. Dhaka Footpath Vendor Carts (ফুটপাতের হকার) — the clutter that makes a
    //    Dhaka street read as Dhaka: fruit carts, jhalmuri tables and stacked
    //    plastic crates hugging the kerb.
    const cartWoodMat = new THREE.MeshStandardMaterial({
      color: '#7c4a1e',
      roughness: 0.85,
    });
    const cartFrameMat = new THREE.MeshStandardMaterial({
      color: '#475569',
      metalness: 0.6,
      roughness: 0.4,
    });
    const crateMats = ['#dc2626', '#2563eb', '#16a34a', '#f59e0b'].map(
      (c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.6 })
    );
    const vendorSpots: Array<[number, number]> = [
      [13, 24], [13, 52], [13, -20], [13, -64],
      [-13, 34], [-13, -46], [-13, 74], [-13, -92],
      [13, 96], [-66, 150], [-70, 210], [40, 130],
      [95, 60], [-130, 40], [58, -60], [-92, -120],
    ];
    vendorSpots.forEach(([vx, vz], vi) => {
      this.buildingColliders.push({
        minX: vx - 1.2,
        maxX: vx + 1.2,
        minZ: vz - 1.4,
        maxZ: vz + 1.4,
        minY: 0.0,
        maxY: 2.2,
        tag: 'vendor_cart',
      });
      const cart = new THREE.Group();
      cart.position.set(vx, 0, vz);
      cart.rotation.y = (vi % 4) * (Math.PI / 2);

      // Timber cart body + slatted sides
      const body = new THREE.Mesh(
        this.boxCache(1.5, 0.28, 2.3),
        cartWoodMat
      );
      body.position.y = 0.82;
      body.castShadow = true;
      cart.add(body);

      // Steel wheels + axle
      [-0.85, 0.85].forEach((wx) => {
        const wheel = new THREE.Mesh(this.cylCache(0.3, 0.3, 0.1, 12), cartFrameMat);
        wheel.rotation.z = Math.PI / 2;
        wheel.position.set(wx, 0.3, 0.55);
        cart.add(wheel);
      });

      // Stacked produce crates
      for (let c = 0; c < 3; c++) {
        const crate = new THREE.Mesh(
          this.boxCache(0.55, 0.32, 0.42),
          crateMats[(vi + c) % crateMats.length]
        );
        crate.position.set(-0.4 + c * 0.42, 1.12, 0.15);
        crate.castShadow = true;
        cart.add(crate);
      }

      // Bamboo canopy poles + tarpaulin
      const canopyMat = new THREE.MeshStandardMaterial({
        color: '#0e7490',
        roughness: 0.8,
        side: THREE.DoubleSide,
      });
      [[-0.6, -0.9], [0.6, -0.9]].forEach(([px, pz]) => {
        const post = new THREE.Mesh(this.cylCache(0.03, 0.03, 1.5, 6), cartFrameMat);
        post.position.set(px, 1.75, pz);
        cart.add(post);
      });
      const canopy = new THREE.Mesh(
        this.boxCache(1.5, 0.04, 2.2),
        canopyMat
      );
      canopy.position.set(0, 2.5, 0);
      canopy.rotation.x = 0.06;
      cart.add(canopy);

      this.scene.add(cart);
    });

    // 5. Rusted Green Dhaka Roadside Railings along the main avenue (segmented with intersection & crosswalk openings)
    const railingPostMat = new THREE.MeshStandardMaterial({
      color: '#166534',
      metalness: 0.55,
      roughness: 0.45,
    });
    const railingPostPositions: Array<{ x: number; y: number; z: number }> = [];

    // Continuous sections with physical openings at cross streets and zebra crossings
    const railingSections: Array<[number, number]> = [
      [-304, -186], // between Expressway (-315) and Karwan Bazar (-175)
      [-164, -48],  // between Karwan Bazar (-175) and SAARC Fountain Roundabout (-48)
      [9.5, 71],    // between Farmgate (0) and crosswalk (75)
      [79, 151],    // between crosswalk (75) and crosswalk (155)
      [159, 166],   // between crosswalk (155) and Puran Dhaka crossing (175)
      [185, 275],   // between Puran Dhaka (175) and Riverfront road (285)
    ];

    for (const side of [-1, 1]) {
      const railX = side * 11.4;
      railingSections.forEach(([zStart, zEnd]) => {
        const segLen = zEnd - zStart;
        const centerZ = (zStart + zEnd) / 2;

        // Top continuous rail
        const railTop = new THREE.Mesh(this.boxCache(0.1, 0.08, segLen), railingPostMat);
        railTop.position.set(railX, 1.02, centerZ);
        this.scene.add(railTop);

        // Mid continuous rail
        const railMid = new THREE.Mesh(this.boxCache(0.08, 0.06, segLen), railingPostMat);
        railMid.position.set(railX, 0.52, centerZ);
        this.scene.add(railMid);

        // Vertical posts every 3.5m
        for (let rz = zStart; rz <= zEnd; rz += 3.5) {
          railingPostPositions.push({ x: railX, y: 0.52, z: rz });
        }

        // PHYSICAL COLLIDER FOR THE ROADSIDE RAILING!
        this.buildingColliders.push({
          minX: railX - 0.28,
          maxX: railX + 0.28,
          minZ: zStart - 0.15,
          maxZ: zEnd + 0.15,
          minY: 0.0,
          maxY: 1.4,
          tag: 'roadside_railing',
        });
      });
    }

    this.addInstances(
      this.boxCache(0.12, 1.05, 0.12),
      railingPostMat,
      railingPostPositions
    );

    // 6. CNG Filling-Station & Tea-Canopy Clusters at district corners
    const canopyBlueMat = new THREE.MeshStandardMaterial({
      color: '#0369a1',
      metalness: 0.35,
      roughness: 0.4,
    });
    const canopyGreenMat = new THREE.MeshStandardMaterial({
      color: '#15803d',
      metalness: 0.3,
      roughness: 0.45,
    });
    CNG_STATIONS.forEach(({ x: sx, z: sz, isBlue: blue }) => {
      this.cngStationSpots.push({ x: sx, z: sz });
      this.circleColliders.push({
        x: sx,
        z: sz,
        radius: 2.2,
        tag: 'cng_station',
      });
      const grp = new THREE.Group();
      grp.position.set(sx, 0, sz);

      // Four steel columns + flat canopy roof
      [[-3, -2.4], [3, -2.4], [-3, 2.4], [3, 2.4]].forEach(([cx, cz]) => {
        const col = new THREE.Mesh(this.boxCache(0.18, 4.2, 0.18), cartFrameMat);
        col.position.set(cx, 2.1, cz);
        grp.add(col);
      });
      const roof = new THREE.Mesh(
        this.boxCache(7.4, 0.3, 6.2),
        blue ? canopyBlueMat : canopyGreenMat
      );
      roof.position.y = 4.35;
      roof.castShadow = true;
      grp.add(roof);

      // Fuel pumps
      [-1.6, 1.6].forEach((px) => {
        const pump = new THREE.Mesh(this.boxCache(0.7, 1.3, 0.5), cartFrameMat);
        pump.position.set(px, 0.65, 0);
        grp.add(pump);
        const head = new THREE.Mesh(this.boxCache(0.75, 0.35, 0.55), canopyBlueMat);
        head.position.set(px, 1.45, 0);
        grp.add(head);
      });

      this.scene.add(grp);
    });

    // 7. Visible Synchronized 3D Intersection Traffic Signals
    const sigPoleMat = new THREE.MeshStandardMaterial({
      color: '#334155',
      metalness: 0.72,
      roughness: 0.35,
    });
    const sigBoxMat = new THREE.MeshStandardMaterial({
      color: '#0f172a',
      roughness: 0.4,
    });
    this.signalMaterials = {
      nsRed: new THREE.MeshBasicMaterial({ color: '#ef4444' }),
      nsYellow: new THREE.MeshBasicMaterial({ color: '#3f3f46' }),
      nsGreen: new THREE.MeshBasicMaterial({ color: '#22c55e' }),
      ewRed: new THREE.MeshBasicMaterial({ color: '#ef4444' }),
      ewYellow: new THREE.MeshBasicMaterial({ color: '#3f3f46' }),
      ewGreen: new THREE.MeshBasicMaterial({ color: '#22c55e' }),
    };
    const majorSignalX = [-170, 0, 220];
    const majorSignalZ = [-175, 0, 175];
    for (const ix of majorSignalX) {
      for (const iz of majorSignalZ) {
        if (ix === 0 && iz === 0) continue; // Keep Farmgate roundabout open
        [
          [ix + 11.2, iz + 11.2, 0],
          [ix - 11.2, iz - 11.2, Math.PI],
        ].forEach(([px, pz, rotY]) => {
          const sigGrp = new THREE.Group();
          sigGrp.position.set(px, 0, pz);
          sigGrp.rotation.y = rotY;

          const pole = new THREE.Mesh(this.cylCache(0.11, 0.14, 5.4, 8), sigPoleMat);
          pole.position.y = 2.7;
          const arm = new THREE.Mesh(this.boxCache(3.2, 0.12, 0.12), sigPoleMat);
          arm.position.set(-1.5, 5.25, 0);
          const housingNS = new THREE.Mesh(this.boxCache(0.45, 1.35, 0.38), sigBoxMat);
          housingNS.position.set(-2.6, 4.95, 0);
          const rNS = new THREE.Mesh(this.boxCache(0.24, 0.24, 0.42), this.signalMaterials!.nsRed);
          rNS.position.set(-2.6, 5.36, 0);
          const yNS = new THREE.Mesh(this.boxCache(0.24, 0.24, 0.42), this.signalMaterials!.nsYellow);
          yNS.position.set(-2.6, 4.95, 0);
          const gNS = new THREE.Mesh(this.boxCache(0.24, 0.24, 0.42), this.signalMaterials!.nsGreen);
          gNS.position.set(-2.6, 4.54, 0);

          const housingEW = new THREE.Mesh(this.boxCache(0.38, 1.35, 0.45), sigBoxMat);
          housingEW.position.set(0.25, 4.45, 0);
          const rEW = new THREE.Mesh(this.boxCache(0.42, 0.24, 0.24), this.signalMaterials!.ewRed);
          rEW.position.set(0.25, 4.86, 0);
          const yEW = new THREE.Mesh(this.boxCache(0.42, 0.24, 0.24), this.signalMaterials!.ewYellow);
          yEW.position.set(0.25, 4.45, 0);
          const gEW = new THREE.Mesh(this.boxCache(0.42, 0.24, 0.24), this.signalMaterials!.ewGreen);
          gEW.position.set(0.25, 4.04, 0);

          sigGrp.add(
            pole,
            arm,
            housingNS,
            rNS,
            yNS,
            gNS,
            housingEW,
            rEW,
            yEW,
            gEW
          );
          this.scene.add(sigGrp);
        });
      }
    }

    // 8. DMP Speed Camera Radar Poles across Major Corridors
    const camLensMat = new THREE.MeshBasicMaterial({ color: '#38bdf8' });
    SPEED_CAMERAS.forEach(({ x: cx, y: cy, z: cz }) => {
      this.speedCameraSpots.push({ x: cx, y: cy, z: cz });
      const camPole = new THREE.Group();
      camPole.position.set(cx + 8.5, cy, cz);
      const p = new THREE.Mesh(this.cylCache(0.09, 0.12, 5.2, 8), sigPoleMat);
      p.position.y = 2.6;
      const head = new THREE.Mesh(this.boxCache(0.65, 0.42, 0.55), sigBoxMat);
      head.position.set(-0.35, 5.1, 0);
      const lens = new THREE.Mesh(this.boxCache(0.22, 0.22, 0.6), camLensMat);
      lens.position.set(-0.35, 5.1, 0);
      camPole.add(p, head, lens);
      this.scene.add(camPole);
    });

    // 9. Waterfront Marine Fuel Docks (Hatirjheel, Sadarghat, Dhanmondi Lake)
    MARINE_DOCKS.forEach(({ x: mx, z: mz }) => {
      this.cngStationSpots.push({ x: mx, z: mz, isMarine: true });
      const dockPump = new THREE.Group();
      dockPump.position.set(mx, 0.16, mz);
      const body = new THREE.Mesh(this.boxCache(0.75, 1.35, 0.55), canopyGreenMat);
      body.position.y = 0.68;
      const top = new THREE.Mesh(this.boxCache(0.85, 0.25, 0.65), canopyBlueMat);
      top.position.y = 1.45;
      dockPump.add(body, top);
      this.scene.add(dockPump);
    });

    // 10. Knockable Traffic Cones near Intersections & Speed Checkpoints
    const coneMat = new THREE.MeshStandardMaterial({
      color: '#f97316',
      roughness: 0.5,
    });
    const coneBaseMat = new THREE.MeshStandardMaterial({
      color: '#1e293b',
      roughness: 0.75,
    });
    const coneSpots: Array<[number, number]> = [
      [11, -18], [-11, 18], [11, -92], [-11, -92],
      [148, 22], [148, 28], [-164, 10], [212, -10],
    ];
    coneSpots.forEach(([cx, cz]) => {
      const cGrp = new THREE.Group();
      cGrp.position.set(cx, 0, cz);
      const base = new THREE.Mesh(this.boxCache(0.45, 0.08, 0.45), coneBaseMat);
      base.position.y = 0.04;
      const cone = new THREE.Mesh(this.cylCache(0.05, 0.18, 0.65, 8), coneMat);
      cone.position.y = 0.4;
      cGrp.add(base, cone);
      this.scene.add(cGrp);
      this.destructibleProps.push({
        mesh: cGrp,
        origX: cx,
        origZ: cz,
        x: cx,
        z: cz,
        vx: 0,
        vz: 0,
        vy: 0,
        hit: false,
        life: 999,
      });
    });

    // 11. Outdoor City ATM Booths (Farmgate, Motijheel, Gulshan)
    const atmBodyMat = new THREE.MeshStandardMaterial({ color: '#0f172a', roughness: 0.35, metalness: 0.5 });
    const atmScreenMat = new THREE.MeshBasicMaterial({ color: '#38bdf8' });
    STREET_ATMS.forEach(({ x: ax, z: az, nameEn, nameBn }) => {
      this.streetAtmSpots.push({ x: ax, z: az, nameEn, nameBn });
      const atmGrp = new THREE.Group();
      atmGrp.position.set(ax, 0, az);
      const kiosk = new THREE.Mesh(this.boxCache(1.1, 2.2, 0.9), atmBodyMat);
      kiosk.position.y = 1.1;
      const screen = new THREE.Mesh(this.boxCache(0.6, 0.45, 0.94), atmScreenMat);
      screen.position.y = 1.38;
      atmGrp.add(kiosk, screen);
      this.scene.add(atmGrp);
      this.circleColliders.push({ x: ax, z: az, radius: 0.75, tag: 'street_atm' });
    });
  }

  private setupPlayer() {
    const store = useGameStore.getState();
    const charId = store.selectedCharacterId || 'arif';
    const char =
      PLAYABLE_CHARACTERS.find((c) => c.id === charId) ||
      PLAYABLE_CHARACTERS[0];
    const outfit =
      store.outfits.find((o) => o.id === store.equippedOutfitId) ||
      store.outfits[0];

    this.playerLimbs = createCharacterMesh(
      outfit.accentColor || '#0f766e',
      '#1e293b',
      undefined,
      false,
      char.id,
      true,
      char.modelKey
    );
    this.playerLimbs.group.position.copy(this.playerPos);
    this.scene.add(this.playerLimbs.group);
    this.cameraLookTarget.set(
      this.playerPos.x,
      this.playerPos.y + 1.75,
      this.playerPos.z
    );
    this.currentCameraDist = 6.2;
  }

  public switchPlayerCharacter(charId: PlayableCharacterId) {
    const char =
      PLAYABLE_CHARACTERS.find((c) => c.id === charId) ||
      PLAYABLE_CHARACTERS[0];

    // Remove old player group
    if (this.playerLimbs?.group) {
      if (this.playerLimbs.group.parent) {
        this.playerLimbs.group.parent.remove(this.playerLimbs.group);
      }
    }

    const store = useGameStore.getState();
    const outfit =
      store.outfits.find((o) => o.id === store.equippedOutfitId) ||
      store.outfits[0];

    this.playerLimbs = createCharacterMesh(
      outfit.accentColor || '#0f766e',
      '#1e293b',
      undefined,
      false,
      char.id,
      true,
      char.modelKey
    );

    if (this.activeVehicleId) {
      const veh = this.vehicles.find((v) => v.id === this.activeVehicleId);
      const mesh = veh ? this.vehicleMeshes.get(veh.id) : null;
      if (veh && mesh) {
        mesh.add(this.playerLimbs.group);
        setDrivingPose(this.playerLimbs, veh.type, veh.speed, 0, 0, 0.016);
      }
    } else {
      this.playerLimbs.group.position.copy(this.playerPos);
      this.playerLimbs.group.rotation.y = this.playerRotation;
      this.scene.add(this.playerLimbs.group);
    }

    // Reattach active equipped weapon
    updateWeaponAttachment(this.playerLimbs.weaponMesh, store.equippedToolId);
  }

  private spawnInitialVehicles() {
    const presets: Array<{
      type: VehicleType;
      x: number;
      z: number;
      rot: number;
      isTraffic: boolean;
      color: string;
      onFlyover?: boolean;
    }> = [
      { type: 'cng', x: 8.5, z: 12, rot: 0, isTraffic: false, color: '#15803d' },
      { type: 'car', x: 8.6, z: 8, rot: 0, isTraffic: false, color: '#f8fafc' },
      { type: 'car', x: -8.6, z: 10, rot: Math.PI, isTraffic: false, color: '#b91c1c' },
      { type: 'rickshaw', x: 8.5, z: 2, rot: 0, isTraffic: false, color: '#ec4899' },
      { type: 'motorcycle', x: -8.5, z: 4, rot: Math.PI, isTraffic: false, color: '#e11d48' },
      { type: 'bus', x: -15.5, z: 35, rot: 0, isTraffic: false, color: '#b91c1c' },
      { type: 'cng', x: -8.6, z: 22, rot: Math.PI, isTraffic: false, color: '#15803d' },

      { type: 'cng', x: -165, z: 18, rot: 0, isTraffic: true, color: '#15803d' },
      { type: 'rickshaw', x: -68, z: 160, rot: 0, isTraffic: false, color: '#ec4899' },
      { type: 'rickshaw', x: -72, z: 195, rot: Math.PI, isTraffic: true, color: '#f59e0b' },
      { type: 'cng', x: 212, z: 168, rot: Math.PI, isTraffic: false, color: '#15803d' },
      { type: 'car', x: 215, z: -168, rot: 0, isTraffic: false, color: '#38bdf8' },
      { type: 'motorcycle', x: -12, z: -170, rot: Math.PI, isTraffic: false, color: '#f43f5e' },
      { type: 'pickup', x: 88, z: 98, rot: 0, isTraffic: false, color: '#0284c7' },

      { type: 'cng', x: 5.5, z: -60, rot: 0, isTraffic: true, color: '#15803d' },
      { type: 'bus', x: -5.5, z: -110, rot: Math.PI, isTraffic: true, color: '#0f766e' },
      { type: 'car', x: 5.5, z: 85, rot: 0, isTraffic: true, color: '#e2e8f0' },
      { type: 'cng', x: -5.5, z: 130, rot: Math.PI, isTraffic: true, color: '#15803d' },
      { type: 'rickshaw', x: 5.5, z: 210, rot: 0, isTraffic: true, color: '#ec4899' },
      { type: 'bus', x: -5.5, z: -240, rot: Math.PI, isTraffic: true, color: '#b91c1c' },
      { type: 'cng', x: 5.5, z: 165, rot: 0, isTraffic: true, color: '#15803d' },
      { type: 'car', x: -5.5, z: 290, rot: Math.PI, isTraffic: true, color: '#facc15' },
      { type: 'motorcycle', x: 5.5, z: -160, rot: 0, isTraffic: true, color: '#e11d48' },
      { type: 'cng', x: 224, z: -45, rot: 0, isTraffic: true, color: '#15803d' },
      { type: 'car', x: 216, z: 65, rot: Math.PI, isTraffic: true, color: '#f8fafc' },
      { type: 'pickup', x: -166, z: -90, rot: 0, isTraffic: true, color: '#0284c7' },

      { type: 'police', x: 62, z: 5.5, rot: -Math.PI / 2, isTraffic: true, color: '#1e3a8a' },
      { type: 'police', x: 215, z: -95, rot: 0, isTraffic: true, color: '#1e3a8a' },
      { type: 'police', x: -165, z: 110, rot: 0, isTraffic: true, color: '#1e3a8a' },

      // Mirpur-10 & Cricket Stadium Sector Spawns (Avenue at X = -380)
      { type: 'rickshaw', x: -375.5, z: -170, rot: 0, isTraffic: true, color: '#f59e0b' },
      { type: 'cng', x: -384.5, z: -210, rot: Math.PI, isTraffic: true, color: '#15803d' },
      { type: 'bus', x: -375.5, z: -120, rot: 0, isTraffic: true, color: '#b91c1c' },
      { type: 'motorcycle', x: -384.5, z: -175, rot: Math.PI, isTraffic: false, color: '#ef4444' },
      { type: 'police', x: -384.5, z: -260, rot: Math.PI, isTraffic: true, color: '#1e3a8a' },

      // Purbachal 300ft High-Speed Expressway Spawns (Expressway at Z = -315, NS at X = 640)
      { type: 'car', x: 480, z: -320.5, rot: Math.PI / 2, isTraffic: true, color: '#ef4444' },
      { type: 'motorcycle', x: 540, z: -309.5, rot: -Math.PI / 2, isTraffic: true, color: '#f97316' },
      { type: 'car', x: 644, z: -250, rot: 0, isTraffic: false, color: '#38bdf8' },
      { type: 'pickup', x: 420, z: -320.5, rot: Math.PI / 2, isTraffic: true, color: '#0284c7' },

      // Bashundhara R/A & Jamuna Future Park Spawns (Avenue at X = 440)
      { type: 'car', x: 443.5, z: -320, rot: 0, isTraffic: false, color: '#f8fafc' },
      { type: 'cng', x: 436.5, z: -350, rot: Math.PI, isTraffic: true, color: '#15803d' },
      { type: 'motorcycle', x: 443.5, z: -290, rot: 0, isTraffic: true, color: '#10b981' },

      // Uttara North Metro Terminal Spawns (Avenue at X = -170, Runway at Z = -620)
      { type: 'bus', x: -166.5, z: -520, rot: 0, isTraffic: true, color: '#047857' },
      { type: 'cng', x: -173.5, z: -460, rot: Math.PI, isTraffic: true, color: '#15803d' },
      { type: 'police', x: -166.5, z: -580, rot: 0, isTraffic: true, color: '#1e3a8a' },

      // Lalbagh Fort & Chawkbazar Spawns (Roads at X = -170, X = -70, Z = 285)
      { type: 'rickshaw', x: -166.5, z: 270, rot: 0, isTraffic: true, color: '#ec4899' },
      { type: 'rickshaw', x: -173.5, z: 240, rot: Math.PI, isTraffic: true, color: '#f59e0b' },
      { type: 'pickup', x: -67.5, z: 200, rot: 0, isTraffic: false, color: '#d97706' },
      { type: 'rickshaw', x: -110, z: 228, rot: 0, isTraffic: false, color: '#ec4899' },
      { type: 'rickshaw', x: -115, z: 228, rot: 0, isTraffic: false, color: '#f59e0b' },
      { type: 'rickshaw', x: -10, z: 284, rot: 0, isTraffic: false, color: '#10b981' },
      { type: 'car', x: 8, z: 284, rot: 0, isTraffic: false, color: '#f8fafc' },

      // Purbachal Food Village & 300ft Supercar Meet Spawns
      { type: 'car', x: 672, z: -270, rot: Math.PI / 2, isTraffic: false, color: '#dc2626' },
      { type: 'motorcycle', x: 676, z: -270, rot: Math.PI / 2, isTraffic: false, color: '#f97316' },
      { type: 'car', x: 755, z: -190, rot: -Math.PI / 2, isTraffic: false, color: '#0284c7' },
      { type: 'car', x: 644, z: -420, rot: 0, isTraffic: true, color: '#38bdf8' },

      // Keraniganj & Buriganga South Bank Spawns (Highway at Z = 460)
      { type: 'pickup', x: 120, z: 456.5, rot: -Math.PI / 2, isTraffic: true, color: '#475569' },
      { type: 'cng', x: 80, z: 463.5, rot: Math.PI / 2, isTraffic: true, color: '#15803d' },
      { type: 'motorcycle', x: 0, z: 465.0, rot: -Math.PI / 2, isTraffic: false, color: '#06b6d4' },

      // Mohakhali Flyover West Approach Ramp (Z = -175, X = -280)
      { type: 'motorcycle', x: -280, z: -175, rot: Math.PI / 2, isTraffic: false, color: '#e11d48', onFlyover: true },
      { type: 'car', x: -255, z: -175, rot: Math.PI / 2, isTraffic: false, color: '#0ea5e9', onFlyover: true },

      // Mirpur Cricket Stadium Grand Concourse (X = -450, Z = -230)
      { type: 'motorcycle', x: -450, z: -230, rot: 0, isTraffic: false, color: '#16a34a' },
      { type: 'car', x: -435, z: -230, rot: 0, isTraffic: false, color: '#f59e0b' },

      // Bashundhara City Mega Complex (X = -170, Z = -35)
      { type: 'car', x: -170, z: -35, rot: 0, isTraffic: false, color: '#f8fafc' },

      // Jamuna Future Park Drop-off Plaza (X = 516, Z = -333)
      { type: 'motorcycle', x: 516, z: -333, rot: 0, isTraffic: false, color: '#7c3aed' },

      // Boardable Water Taxis & Boats (Hatirjheel Jetty & Sadarghat Launch Pier)
      { type: 'boat', x: 200, z: -12, rot: 0, isTraffic: false, color: '#0284c7' },
      { type: 'boat', x: 24, z: 325, rot: Math.PI / 2, isTraffic: false, color: '#0ea5e9' },
      { type: 'boat', x: -215, z: 25, rot: 0, isTraffic: false, color: '#14b8a6' },
    ];

    presets.forEach((p, idx) => {
      const stats = VEHICLE_STATS[p.type];
      const id = `veh_${idx}_${p.type}`;
      const elev = this.getRoadElevation(p.x, p.z, p.onFlyover ? undefined : 0);
      const isEW = Math.abs(Math.sin(p.rot)) > 0.7;
      const roadAxis: 'ns' | 'ew' = isEW ? 'ew' : 'ns';
      const laneDirection: 1 | -1 = isEW
        ? Math.sin(p.rot) > 0 ? 1 : -1
        : Math.cos(p.rot) >= 0 ? 1 : -1;

      const entity: VehicleEntity = {
        id,
        type: p.type,
        x: p.x,
        y: elev,
        z: p.z,
        rotation: p.rot,
        speed: 0,
        steering: 0,
        health: stats.maxHealth,
        maxHealth: stats.maxHealth,
        color: p.color,
        isTraffic: p.isTraffic,
        isPolice: p.type === 'police',
        plateNumber: `ঢাকা মেট্রো-${11 + (idx % 9)}-${2040 + idx}`,
        roadAxis,
        laneDirection,
      };
      this.vehicles.push(entity);

      const mesh = createVehicleMesh(p.type, p.color, idx, p.isTraffic);
      mesh.position.set(p.x, elev, p.z);
      mesh.rotation.y = p.rot;
      this.scene.add(mesh);
      this.vehicleMeshes.set(id, mesh);
    });
  }

  private spawnInitialNPCs() {
    const storyNPCs: Array<{
      id: string;
      nameEn: string;
      nameBn: string;
      role: NPCRole;
      x: number;
      z: number;
      shirt: string;
      pants: string;
      dialogueEn: string[];
      dialogueBn: string[];
    }> = [
      {
        id: 'npc_uncle_kamal',
        nameEn: 'Uncle Kamal (Tong Cha Seller)',
        nameBn: 'কামাল মামা (চা বিক্রেতা)',
        role: 'tea_seller',
        x: 16,
        z: 14,
        shirt: '#d97706',
        pants: '#f8fafc',
        dialogueEn: [
          'Salaam Arif beta! Drink a hot cup of Malai Cha whenever your health gets low.',
          'Rafiq left clues pointing toward Dhanmondi Lake and Sadarghat Launch Terminal!',
        ],
        dialogueBn: [
          'সালাম আরিফ বাবা! শরীর খারাপ লাগলে মামার দোকানের মালাই চা খেয়ে নিস।',
          'রফিকের ডায়েরির সূত্রগুলো ধানমন্ডি লেক আর সদরঘাটের দিকেই ইঙ্গিত করছে!',
        ],
      },
      {
        id: 'npc_nadia',
        nameEn: 'Nadia Hasan (Journalist)',
        nameBn: 'নাদিয়া হাসান (সাংবাদিক)',
        role: 'story_contact',
        x: -172,
        z: 20,
        shirt: '#be123c',
        pants: '#1e293b',
        dialogueEn: [
          'Dhaka never sleeps, Arif. Every crate at Sadarghat leaves a paper trail in Motijheel.',
          'Stay sharp—if DMP patrol cars spot you causing trouble, head to your Safe House!',
        ],
        dialogueBn: [
          'ঢাকা শহর কখনো ঘুমায় না আরিফ। সদরঘাটের প্রতিটি অবৈধ চালানের হিসাব মতিঝিলে আছে।',
          'সাবধানে থেকো—পুলিশের ধাওয়া খেলে দ্রুত ফার্মগেটের সেফ হাউসে চলে যাবে!',
        ],
      },
      {
        id: 'npc_babu_informant',
        nameEn: 'Babu Bhai (Old Dhaka Informant)',
        nameBn: 'বাবু ভাই (পুরান ঢাকার সোর্স)',
        role: 'rickshaw_puller',
        x: -68,
        z: 166,
        shirt: '#15803d',
        pants: '#78350f',
        dialogueEn: [
          'In Old Dhaka, a Cycle Rickshaw is faster than a sports car through these narrow lanes!',
          'Try the Shahi Kacchi Biriyani right behind me—best in all of Bangladesh!',
        ],
        dialogueBn: [
          'পুরান ঢাকার এই সরু গলিতে প্রাইভেট কারের চেয়ে আমার রিকশাই বেশি দ্রুত চলে ভাই!',
          'পেছনের দোকান থেকে শাহী কাচ্চি বিরিয়ানি খেয়ে দেখেন—পুরো বাংলাদেশের সেরা!',
        ],
      },
      {
        id: 'npc_farhan_banker',
        nameEn: 'Farhan (Motijheel Auditor)',
        nameBn: 'ফারহান (ব্যাংক অডিটর)',
        role: 'office_worker',
        x: 214,
        z: 180,
        shirt: '#1d4ed8',
        pants: '#0f172a',
        dialogueEn: [
          'Half of Motijheel knows about Chairman Sikder’s river syndicate, but nobody dared speak until now.',
        ],
        dialogueBn: [
          'মতিঝিলের অনেকেই সিকদার সিন্ডিকেটের কথা জানে, কিন্তু ভয়ে কেউ মুখ খোলে না।',
        ],
      },
    ];

    storyNPCs.forEach((sn) => {
      const entity: NPCEntity = {
        id: sn.id,
        nameEn: sn.nameEn,
        nameBn: sn.nameBn,
        role: sn.role,
        x: sn.x,
        z: sn.z,
        rotation: 0,
        shirtColor: sn.shirt,
        pantsColor: sn.pants,
        isStoryNPC: true,
        dialogueEn: sn.dialogueEn,
        dialogueBn: sn.dialogueBn,
        aiState: 'idle',
        walkTargetX: sn.x,
        walkTargetZ: sn.z,
        health: 100,
      };
      this.npcs.push(entity);

      const limbs = createCharacterMesh(
        sn.shirt,
        sn.pants,
        sn.role,
        true,
        sn.id,
        false
      );
      limbs.group.position.set(sn.x, 0, sn.z);
      this.scene.add(limbs.group);
      this.npcLimbsMap.set(sn.id, limbs);
    });

    const citizenRoles: Array<{
      role: NPCRole;
      nameEn: string;
      nameBn: string;
      shirt: string;
      pants: string;
      lineEn: string;
      lineBn: string;
    }> = [
      {
        role: 'rickshaw_puller',
        nameEn: 'Rickshaw Puller',
        nameBn: 'রিকশাচালক',
        shirt: '#0284c7',
        pants: '#7c2d12',
        lineEn: 'Mama, where to? Farmgate? Dhanmondi? Hop in!',
        lineBn: 'মামা কই যাইবেন? ফার্মগেট? ধানমন্ডি? ওঠেন!',
      },
      {
        role: 'student',
        nameEn: 'Dhaka University Student',
        nameBn: 'বিশ্ববিদ্যালয় শিক্ষার্থী',
        shirt: '#eab308',
        pants: '#1e293b',
        lineEn: 'Heading to TSC and Dhanmondi Lake for evening tea and adda!',
        lineBn: 'সন্ধ্যায় ধানমন্ডি লেকে বন্ধুদের সাথে আড্ডা আর চা খেতে যাচ্ছি!',
      },
      {
        role: 'office_worker',
        nameEn: 'Motijheel Office Commuter',
        nameBn: 'অফিস যাত্রী',
        shirt: '#f8fafc',
        pants: '#0f172a',
        lineEn: 'The Farmgate bus jam is legendary today! Better take a CNG.',
        lineBn: 'ফার্মগেটের জ্যাম আজকে ভয়াবহ! বাসের চেয়ে সিএনজি নেওয়াই ভালো।',
      },
      {
        role: 'street_vendor',
        nameEn: 'Jhalmuri & Peanut Vendor',
        nameBn: 'ঝালমুড়ি বিক্রেতা',
        shirt: '#16a34a',
        pants: '#334155',
        lineEn: 'Hot spicy Jhalmuri with mustard oil and Naga chili!',
        lineBn: 'সরিষার তেল আর নাগা মরিচ দিয়ে মাখা গরম ঝালমুড়ি!',
      },
      {
        role: 'police_officer',
        nameEn: 'DMP Traffic Sergeant',
        nameBn: 'ট্রাফিক সার্জেন্ট',
        shirt: '#1e3a8a',
        pants: '#0f172a',
        lineEn: 'Keep moving! No illegal parking at the Karwan Bazar signal.',
        lineBn: 'গাড়ি থামাবেন না! সিগন্যাল ক্লিয়ার রাখুন।',
      },
      {
        role: 'shopkeeper',
        nameEn: 'Old Dhaka Haji Merchant',
        nameBn: 'পুরান ঢাকার হাজী ব্যবসায়ী',
        shirt: '#f8fafc',
        pants: '#f1f5f9',
        lineEn: 'Assalamu Alaikum! Finest Chawkbazar spices and attar in Dhaka!',
        lineBn: 'আসসালামু আলাইকুম! চকবাজারের সেরা মসলা ও আতর আমাদের দোকানে!',
      },
      {
        role: 'tea_seller',
        nameEn: 'Farmgate Tong Cha-Wala',
        nameBn: 'ফার্মগেট টং চা বিক্রেতা',
        shirt: '#dc2626',
        pants: '#1e3a8a',
        lineEn: 'Fresh malai milk tea and ginger lemon cha right off the stove!',
        lineBn: 'গরম মালাই চা আর আদা-লেবুর চা, এক কাপ খেয়ে যান ভাই!',
      },
    ];

    const vibrantShirts = [
      '#0284c7',
      '#eab308',
      '#f8fafc',
      '#16a34a',
      '#e11d48',
      '#7c3aed',
      '#ea580c',
      '#0d9488',
      '#be123c',
      '#2563eb',
    ];

    const sidewalkCorridors = [
      { x: 11, zMin: -180, zMax: 240 },
      { x: -11, zMin: -180, zMax: 240 },
      { x: -158, zMin: -80, zMax: 120 },
      { x: 208, zMin: -180, zMax: 210 },
      { x: -62, zMin: 110, zMax: 260 },
      { x: 452, zMin: -420, zMax: -240 },  // Bashundhara & Jamuna Mall
      { x: -158, zMin: -580, zMax: -420 }, // Uttara North
      { x: -368, zMin: -280, zMax: -110 }, // Mirpur-10
      { x: 625, zMin: -390, zMax: -210 },  // Purbachal 300ft
    ];

    for (let i = 0; i < 52; i++) {
      const preset = citizenRoles[i % citizenRoles.length];
      const corr = sidewalkCorridors[i % sidewalkCorridors.length];
      const startZ = corr.zMin + ((i * 37) % (corr.zMax - corr.zMin));
      const targetZ = corr.zMin + (((i + 5) * 53) % (corr.zMax - corr.zMin));
      const uniqueShirt =
        preset.role === 'police_officer'
          ? '#1e3a8a'
          : preset.role === 'shopkeeper'
          ? '#f8fafc'
          : vibrantShirts[i % vibrantShirts.length];

      const id = `npc_cit_${i}`;
      const startX = corr.x + (i % 2 === 0 ? 0.6 : -0.6);
      const npc: NPCEntity = {
        id,
        nameEn: preset.nameEn,
        nameBn: preset.nameBn,
        role: preset.role,
        x: startX,
        z: startZ,
        homeX: startX,
        homeZ: startZ,
        homeY: 0,
        rotation: targetZ > startZ ? 0 : Math.PI,
        shirtColor: uniqueShirt,
        pantsColor: preset.pants,
        dialogueEn: [preset.lineEn],
        dialogueBn: [preset.lineBn],
        aiState: 'walk',
        walkTargetX: corr.x,
        walkTargetZ: targetZ,
        health: 100,
      };
      this.npcs.push(npc);

      const limbs = createCharacterMesh(
        uniqueShirt,
        preset.pants,
        preset.role,
        false
      );
      limbs.group.position.set(npc.x, 0, npc.z);
      this.scene.add(limbs.group);
      this.npcLimbsMap.set(id, limbs);
    }
  }

  private setupMissionMarker() {
    this.missionMarkerGroup = new THREE.Group();

    const beamGeo = new THREE.CylinderGeometry(2.4, 2.4, 28, 20, 1, true);
    const beamMat = new THREE.MeshBasicMaterial({
      color: '#facc15',
      transparent: true,
      opacity: 0.28,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    this.missionBeamMesh = new THREE.Mesh(beamGeo, beamMat);
    this.missionBeamMesh.position.y = 14;
    this.missionMarkerGroup.add(this.missionBeamMesh);

    const ringGeo = new THREE.RingGeometry(2.2, 3.1, 28);
    const ringMat = new THREE.MeshBasicMaterial({
      color: '#fde047',
      side: THREE.DoubleSide,
    });
    this.missionRingMesh = new THREE.Mesh(ringGeo, ringMat);
    this.missionRingMesh.rotation.x = -Math.PI / 2;
    this.missionRingMesh.position.y = 0.18;
    this.missionMarkerGroup.add(this.missionRingMesh);

    this.scene.add(this.missionMarkerGroup);

    // Green Taxi / Boat Fare Destination Beacon
    this.fareMarkerGroup = new THREE.Group();
    const fareBeamGeo = new THREE.CylinderGeometry(1.1, 1.1, 26, 16, 1, true);
    const fareBeamMat = new THREE.MeshBasicMaterial({
      color: '#22c55e',
      transparent: true,
      opacity: 0.28,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const fareBeam = new THREE.Mesh(fareBeamGeo, fareBeamMat);
    fareBeam.position.y = 13;
    const fareRing = new THREE.Mesh(
      new THREE.RingGeometry(2.2, 3.0, 24),
      new THREE.MeshBasicMaterial({ color: '#4ade80', side: THREE.DoubleSide })
    );
    fareRing.rotation.x = -Math.PI / 2;
    fareRing.position.y = 0.2;
    this.fareMarkerGroup.add(fareBeam, fareRing);
    this.fareMarkerGroup.visible = false;
    this.scene.add(this.fareMarkerGroup);
  }

  private setupRainParticles() {
    const count = 700;
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 120;
      positions[i * 3 + 1] = Math.random() * 52;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 120;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const mat = new THREE.PointsMaterial({
      color: '#bae6fd',
      size: 0.42,
      transparent: true,
      opacity: 0.62,
    });

    this.rainSystem = new THREE.Points(geo, mat);
    this.rainSystem.visible = false;
    this.scene.add(this.rainSystem);
  }

  private bindEvents() {
    window.addEventListener('resize', this.onResize);
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);

    const dom = this.renderer.domElement;
    dom.addEventListener('contextmenu', this.onContextMenu);
    dom.addEventListener('mousedown', this.onMouseDown);
    window.addEventListener('mousemove', this.onMouseMove);
    window.addEventListener('mouseup', this.onMouseUp);
  }

  public dispose() {
    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
    }
    const dom = this.renderer.domElement;
    dom?.removeEventListener('contextmenu', this.onContextMenu);
    dom?.removeEventListener('mousedown', this.onMouseDown);
    window.removeEventListener('resize', this.onResize);
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    window.removeEventListener('mousemove', this.onMouseMove);
    window.removeEventListener('mouseup', this.onMouseUp);
    this.renderer.dispose();
  }

  private onContextMenu = (e: MouseEvent) => {
    e.preventDefault();
  };

  private onResize = () => {
    if (!this.container) return;
    const w = this.container.clientWidth;
    const h = Math.max(1, this.container.clientHeight);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  };

  private onMouseDown = (e: MouseEvent) => {
    const store = useGameStore.getState();
    if (store.gamePhase !== 'playing' || store.activeMetroModal) return;
    dhakaAudio.init();

    if (e.button === 2 && !this.activeVehicleId && !this.isSwimming) {
      // Right Mouse Button: Enter Tactical Aim Mode (ADS / High-Ready)
      e.preventDefault();
      this.isAiming = true;
      this.playerRotation = this.cameraYaw + Math.PI;
      return;
    }

    if (e.button === 0) {
      if (this.isAiming && !this.activeVehicleId && !this.isSwimming) {
        this.performMeleeAttack();
        return;
      }
      this.isPointerDragging = true;
      this.pointerDragDist = 0;
      this.lastPointerX = e.clientX;
      this.lastPointerY = e.clientY;
    }
  };

  private onMouseMove = (e: MouseEvent) => {
    if (!this.isPointerDragging && !this.isAiming) return;
    const dx = e.clientX - this.lastPointerX;
    const dy = e.clientY - this.lastPointerY;
    this.pointerDragDist += Math.hypot(dx, dy);
    this.lastPointerX = e.clientX;
    this.lastPointerY = e.clientY;

    const sens = this.isAiming ? 0.0042 : 0.0065;
    this.cameraYaw -= dx * sens;
    this.cameraPitch = Math.max(
      0.08,
      Math.min(1.15, this.cameraPitch + dy * (sens * 0.75))
    );

    if (this.isAiming && !this.activeVehicleId) {
      this.playerRotation = this.cameraYaw + Math.PI;
    }
  };

  private onMouseUp = (e: MouseEvent) => {
    if (e.button === 2) {
      this.isAiming = false;
      return;
    }

    if (
      e.button === 0 &&
      this.isPointerDragging &&
      this.pointerDragDist < 8 &&
      !this.activeVehicleId &&
      useGameStore.getState().gamePhase === 'playing'
    ) {
      this.performMeleeAttack();
    }
    this.isPointerDragging = false;
  };

  private onKeyDown = (e: KeyboardEvent) => {
    const code = e.code;
    this.keys.add(code);

    const store = useGameStore.getState();

    if (code === 'Escape' || code === 'KeyP') {
      if (code === 'Escape' && store.activeMetroModal) {
        store.closeMetroModal();
        return;
      }
      if (store.gamePhase === 'playing') {
        store.setGamePhase('paused', 'map');
      } else if (store.gamePhase === 'paused') {
        store.setGamePhase('playing');
      }
      return;
    }

    if (code === 'KeyM' || code === 'KeyJ') {
      if (store.gamePhase === 'playing') {
        store.setGamePhase('paused', 'missions');
      } else if (store.gamePhase === 'paused' && store.pauseTab === 'missions') {
        store.setGamePhase('playing');
      } else if (store.gamePhase === 'paused') {
        store.setPauseTab('missions');
      }
      return;
    }

    if (code === 'Tab') {
      e.preventDefault();
      if (store.gamePhase === 'playing') {
        store.setGamePhase('paused', 'map');
      } else if (store.gamePhase === 'paused' && store.pauseTab === 'map') {
        store.setGamePhase('playing');
      }
      return;
    }

    if (store.gamePhase !== 'playing' || store.activeMetroModal) return;

    dhakaAudio.init();

    // Instant Weapon & Bangladeshi Local Arm Switching (Hotkeys 1-9, 0, -, and Q to cycle)
    const weaponHotkeyMap: Record<string, number> = {
      Digit1: 0,
      Digit2: 1,
      Digit3: 2,
      Digit4: 3,
      Digit5: 4,
      Digit6: 5,
      Digit7: 6,
      Digit8: 7,
      Digit9: 8,
      Digit0: 9,
      Minus: 10,
    };
    if (!this.activeVehicleId && code in weaponHotkeyMap) {
      const targetWeapon = store.tools[weaponHotkeyMap[code]];
      if (targetWeapon) {
        store.equipTool(targetWeapon.id);
      }
      return;
    }
    if (!this.activeVehicleId && code === 'KeyQ') {
      store.cycleTool(1);
      return;
    }

    if (code === 'KeyF' || code === 'KeyE') {
      this.handlePrimaryInteraction(code === 'KeyF');
    }

    if (code === 'KeyT') {
      this.handleTalkToNPC();
    }

    if (code === 'KeyH') {
      if (this.activeVehicleId) {
        const veh = this.vehicles.find((v) => v.id === this.activeVehicleId);
        if (veh) {
          const stats = VEHICLE_STATS[veh.type];
          dhakaAudio.playHorn(stats.hornType);
          this.hornFlashTimer = 0.28;
          this.alertPedestriansAhead(veh.x, veh.z, veh.rotation);
        }
      } else {
        dhakaAudio.playHorn('bell');
      }
    }

    if (code === 'KeyC' && !this.activeVehicleId && !this.isSwimming) {
      this.isCrouching = !this.isCrouching;
    }

    if (code === 'KeyV') {
      store.cycleCameraMode();
    }

    if (
      (code === 'KeyJ' || code === 'KeyK' || code === 'KeyX') &&
      !this.activeVehicleId &&
      !this.isSwimming
    ) {
      this.performMeleeAttack();
    }

    if (code === 'Space' && !this.activeVehicleId && !this.isSwimming && this.isGrounded) {
      this.playerVelY = 8.2;
      this.isGrounded = false;
      this.isCrouching = false;
      this.playerStamina = Math.max(0, this.playerStamina - 8);
      // Forward vault impulse clears low curbs, medians and vehicle bumpers
      const fX = Math.sin(this.playerRotation);
      const fZ = Math.cos(this.playerRotation);
      this.playerPos.x += fX * 0.35;
      this.playerPos.z += fZ * 0.35;
      dhakaAudio.playSfx('jump');
    }

    if (code === 'KeyZ' && !this.activeVehicleId && !this.isSwimming) {
      this.isAiming = !this.isAiming;
      if (this.isAiming) {
        this.playerRotation = this.cameraYaw + Math.PI;
      }
    }

    if (code === 'KeyG' && this.activeVehicleId) {
      this.startRandomFareJob();
    }

    if (code === 'KeyL') {
      if (this.activeVehicleId) {
        this.headlightsManual =
          this.headlightsManual === null
            ? true
            : this.headlightsManual
            ? false
            : null;
        const modeLabel =
          this.headlightsManual === true
            ? 'ON'
            : this.headlightsManual === false
            ? 'OFF'
            : 'AUTO';
        dhakaAudio.playSfx('ui');
        store.showBanner({
          titleEn: `HEADLIGHTS: ${modeLabel}`,
          titleBn: `হেডলাইট: ${modeLabel}`,
          subtitleEn: 'Press [L] to toggle headlights (On / Off / Auto).',
          subtitleBn: 'হেডলাইট পরিবর্তন করতে [L] চাপুন।',
          tone: 'blue',
        });
      } else if (!this.isSwimming) {
        this.flashlightOn = !this.flashlightOn;
        dhakaAudio.playSfx('ui');
        store.showBanner({
          titleEn: `FLASHLIGHT: ${this.flashlightOn ? 'ON' : 'OFF'}`,
          titleBn: `টর্চলাইট: ${this.flashlightOn ? 'চালু' : 'বন্ধ'}`,
          subtitleEn: 'Press [L] to toggle handheld flashlight.',
          subtitleBn: 'টর্চলাইট চালু/বন্ধ করতে [L] চাপুন।',
          tone: 'blue',
        });
      }
    }

    if (code === 'KeyR') {
      if (this.activeVehicleId) {
        const stations: Array<
          'off' | 'dhaka_folk' | 'gully_beat' | 'hatirjheel_synth'
        > = ['dhaka_folk', 'gully_beat', 'hatirjheel_synth', 'off'];
        const next =
          stations[(stations.indexOf(store.radioStation) + 1) % stations.length];
        store.setRadioStation(next);
      } else if (!this.isSwimming && this.fireCooldown <= 0) {
        const activeTool = store.tools.find((t) => t.id === store.equippedToolId);
        const reloaded = store.reloadCurrentWeapon();
        if (reloaded && activeTool) {
          this.fireCooldown = 1.15;
          this.attackAnimTimer = 0.45;
          store.showBanner({
            titleEn: 'RELOADING...',
            titleBn: 'অস্ত্র রিলোড হচ্ছে...',
            subtitleEn: `${activeTool.nameEn}: Swapping fresh clip (1.1s).`,
            subtitleBn: `${activeTool.nameBn}: নতুন ম্যাগাজিন লোড হচ্ছে।`,
            tone: 'blue',
          });
        }
      }
    }
  };

  private onKeyUp = (e: KeyboardEvent) => {
    this.keys.delete(e.code);
  };

  public triggerTouchAction(
    action: 'interact' | 'horn' | 'attack' | 'jump' | 'camera' | 'fare' | 'lights'
  ) {
    dhakaAudio.init();
    if (action === 'fare' && this.activeVehicleId) {
      this.startRandomFareJob();
      return;
    }
    if (action === 'lights' && this.activeVehicleId) {
      this.headlightsManual =
        this.headlightsManual === null
          ? true
          : this.headlightsManual
          ? false
          : null;
      dhakaAudio.playSfx('ui');
      return;
    }
    if (action === 'interact') {
      const promptType = useGameStore.getState().nearbyPrompt?.type;
      this.handlePrimaryInteraction(promptType === 'vehicle');
    }
    if (action === 'horn') {
      const veh = this.vehicles.find((v) => v.id === this.activeVehicleId);
      if (veh) {
        dhakaAudio.playHorn(VEHICLE_STATS[veh.type].hornType);
        this.alertPedestriansAhead(veh.x, veh.z, veh.rotation);
      } else {
        dhakaAudio.playHorn('bell');
      }
    }
    if (action === 'attack' && !this.isSwimming) this.performMeleeAttack();
    if (action === 'jump' && !this.activeVehicleId && !this.isSwimming && this.isGrounded) {
      this.playerVelY = 8.2;
      this.isGrounded = false;
      this.playerStamina = Math.max(0, this.playerStamina - 8);
      const fX = Math.sin(this.playerRotation);
      const fZ = Math.cos(this.playerRotation);
      this.playerPos.x += fX * 0.35;
      this.playerPos.z += fZ * 0.35;
      dhakaAudio.playSfx('jump');
    }
    if (action === 'camera') {
      useGameStore.getState().cycleCameraMode();
    }
  }

  private spawnImpactSparks(
    x: number,
    y: number,
    z: number,
    colorHex = '#fbbf24',
    scale = 1.0
  ) {
    if (this.hitSparks.length > 26) {
      const old = this.hitSparks.shift();
      if (old) {
        this.scene.remove(old.mesh);
        (old.mesh.material as THREE.Material).dispose();
      }
    }
    const spark = new THREE.Mesh(
      this.sharedSparkGeo,
      new THREE.MeshBasicMaterial({
        color: colorHex,
        transparent: true,
        opacity: 0.95,
      })
    );
    spark.scale.setScalar(scale);
    spark.position.set(x, y, z);
    this.scene.add(spark);
    this.hitSparks.push({ mesh: spark, life: 0.22 });
  }

  private spawnShellCasing(x: number, y: number, z: number) {
    if (this.shellCasings.length > 35) {
      const old = this.shellCasings.shift();
      if (old) this.scene.remove(old.mesh);
    }
    const mesh = new THREE.Mesh(this.casingGeo, this.casingMat);
    mesh.position.set(x, y, z);
    this.scene.add(mesh);

    const rightX = Math.cos(this.playerRotation);
    const rightZ = -Math.sin(this.playerRotation);
    this.shellCasings.push({
      mesh,
      vx: rightX * (2.2 + Math.random() * 0.8) + (Math.random() - 0.5) * 0.35,
      vy: 1.85 + Math.random() * 0.55,
      vz: rightZ * (2.2 + Math.random() * 0.8) + (Math.random() - 0.5) * 0.35,
      rx: 16 * (Math.random() - 0.5),
      ry: 16 * (Math.random() - 0.5),
      rz: 16 * (Math.random() - 0.5),
      life: 3.5,
      bounced: false,
    });
  }

  private spawnMuzzleSmoke(x: number, y: number, z: number) {
    if (this.muzzleSmokePuffs.length > 25) {
      const old = this.muzzleSmokePuffs.shift();
      if (old) this.scene.remove(old.mesh);
    }
    const mesh = new THREE.Mesh(this.smokeGeo, this.smokeMat.clone());
    mesh.position.set(x, y, z);
    this.scene.add(mesh);

    const fwdX = Math.sin(this.playerRotation);
    const fwdZ = Math.cos(this.playerRotation);
    this.muzzleSmokePuffs.push({
      mesh,
      vx: fwdX * 0.55 + (Math.random() - 0.5) * 0.2,
      vy: 0.42 + Math.random() * 0.25,
      vz: fwdZ * 0.55 + (Math.random() - 0.5) * 0.2,
      life: 0.55,
      maxLife: 0.55,
    });
  }

  private spawnBulletHole(x: number, y: number, z: number) {
    if (this.bulletHoles.length > 45) {
      const old = this.bulletHoles.shift();
      if (old) this.scene.remove(old.mesh);
    }
    const mesh = new THREE.Mesh(this.bulletHoleGeo, this.bulletHoleMat);
    mesh.position.set(x, Math.max(0.04, y), z);
    this.scene.add(mesh);
    this.bulletHoles.push({ mesh, life: 25.0 });
  }

  private spawnConcreteDust(x: number, y: number, z: number) {
    this.spawnImpactSparks(x, y, z, '#94a3b8', 0.7);
    this.spawnImpactSparks(x, y + 0.08, z, '#cbd5e1', 0.5);
  }

  private performMeleeAttack() {
    if (this.fireCooldown > 0 || this.isSwimming) return;

    const store = useGameStore.getState();
    const tool =
      store.tools.find((t) => t.id === store.equippedToolId) || store.tools[0];

    // 1. FIREARMS: Deshi Pipe Gun, 9mm Pistol, BD-08 Assault Rifle, 12G Shotgun, Micro-SMG
    if (tool.isFirearm) {
      if (!store.consumeAmmo(tool.id)) {
        dhakaAudio.playSfx('dry_fire');
        store.showBanner({
          titleEn: 'CLIP EMPTY! PRESS [R] TO RELOAD',
          titleBn: 'ম্যাগাজিন খালি! [R] চেপে রিলোড করুন',
          subtitleEn: `${tool.nameEn}: Reserve ammo available.`,
          subtitleBn: `${tool.nameBn}: রিজার্ভ ম্যাগাজিন লোড করতে [R] চাপুন।`,
          tone: 'blue',
        });
        this.fireCooldown = 0.35;
        return;
      }

      const isTanvir = store.selectedCharacterId === 'tanvir';
      this.fireCooldown = (tool.fireRate || 0.22) * (isTanvir ? 0.75 : 1.0);
      this.attackAnimTimer = 0.22;

      // Align Arif with camera aim direction when firing
      this.playerRotation = this.cameraYaw + Math.PI;

      // Realistic muzzle climb & camera kickback (Tanvir Tactical Marksman = zero recoil!)
      if (!isTanvir) {
        this.cameraPitch = Math.max(
          0.08,
          this.cameraPitch - (tool.pellets && tool.pellets > 1 ? 0.042 : 0.022)
        );
        this.cameraTrauma = Math.min(
          0.65,
          this.cameraTrauma + (tool.pellets && tool.pellets > 1 ? 0.26 : 0.14)
        );
      }

      // Synthesized gunshot / shotgun / assault rifle audio
      if (tool.id === 'deshi_pipegun' || tool.id === 'police_shotgun') {
        dhakaAudio.playSfx('shotgun');
      } else if (tool.id === 'bd08_rifle' || tool.id === 'smg_uzi') {
        dhakaAudio.playSfx('rifle');
      } else {
        dhakaAudio.playSfx('gunshot');
      }

      const firedInsideJfp =
        this.playerPos.x >= this.jfpCenter.x - 56 &&
        this.playerPos.x <= this.jfpCenter.x + 56 &&
        this.playerPos.z >= this.jfpCenter.z - 36 &&
        this.playerPos.z <= this.jfpCenter.z + 36;
      if (firedInsideJfp && store.wantedLevel < 2) {
        store.setWantedLevel(2);
        store.showBanner({
          titleEn: '🚨 JFP MALL SECURITY ALERT!',
          titleBn: '🚨 যমুনা ফিউচার পার্ক নিরাপত্তা সতর্কতা!',
          subtitleEn: 'Gunfire inside Jamuna Future Park triggered DMP response!',
          subtitleBn: 'শপিং মলের ভেতরে গুলির শব্দে পুলিশ তল্লাশি শুরু হয়েছে!',
          tone: 'red',
        });
      }

      const muzzleX =
        this.playerPos.x +
        Math.sin(this.playerRotation) * 0.88 -
        Math.cos(this.playerRotation) * 0.25;
      const muzzleY = this.playerPos.y + 1.35;
      const muzzleZ =
        this.playerPos.z +
        Math.cos(this.playerRotation) * 0.88 +
        Math.sin(this.playerRotation) * 0.25;

      // 3D Muzzle Flash + Dynamic PointLight
      this.spawnImpactSparks(muzzleX, muzzleY, muzzleZ, '#facc15', 0.85);
      if (!this.muzzleLight) {
        this.muzzleLight = new THREE.PointLight('#fb923c', 4.5, 14);
        this.scene.add(this.muzzleLight);
      }
      this.muzzleLight.position.set(muzzleX, muzzleY, muzzleZ);
      this.muzzleLight.visible = true;
      this.muzzleLightTimer = 0.06;

      // Spawn spent brass cartridge ejection & barrel smoke
      this.spawnShellCasing(muzzleX, muzzleY, muzzleZ);
      this.spawnMuzzleSmoke(muzzleX, muzzleY, muzzleZ);

      // Spawn 3D Bullet Tracer(s) (Multi-pellet spread for Deshi Pipe Gun & 12G Shotgun)
      const pellets = tool.pellets || 1;
      const spread = pellets > 1 ? 0.14 : 0.018;
      const bulletSpeed = 88;

      for (let p = 0; p < pellets; p++) {
        const yawAngle =
          this.playerRotation + (Math.random() - 0.5) * spread;
        const tracerMat =
          pellets > 1 ? this.tracerMatSpread : this.tracerMatSingle;
        const tracerMesh = new THREE.Mesh(this.tracerGeo, tracerMat);
        tracerMesh.position.set(muzzleX, muzzleY, muzzleZ);
        tracerMesh.rotation.y = yawAngle;
        this.scene.add(tracerMesh);

        this.bulletTracers.push({
          mesh: tracerMesh,
          vx: Math.sin(yawAngle) * bulletSpeed,
          vy: (Math.random() - 0.5) * (pellets > 1 ? 2.8 : 0.4),
          vz: Math.cos(yawAngle) * bulletSpeed,
          life: tool.range / bulletSpeed,
          damage: tool.damage / Math.max(1, pellets * 0.55),
        });
      }

      // Gunshot noise panics nearby pedestrians
      this.alertNearbyPedestrians(this.playerPos.x, this.playerPos.z, 35);
      return;
    }

    // 2. BANGLADESHI LOCAL ARMS & MELEE COMBAT: Combo fighting, Ramda, Chapati, Lathi, Bat, Baton
    if (this.meleeComboTimer > 0) {
      this.meleeComboStep = (this.meleeComboStep + 1) % 3;
    } else {
      this.meleeComboStep = 0;
    }
    this.meleeComboTimer = 0.85;

    const isBlade = tool.id === 'ramda' || tool.id === 'chapati_cleaver';
    const isFists = tool.id === 'fists';
    const isBaton = tool.id === 'stun_baton';

    if (isFists) {
      this.fireCooldown = this.meleeComboStep === 2 ? 0.35 : 0.22;
      this.attackAnimTimer = this.meleeComboStep === 2 ? 0.34 : 0.24;
      dhakaAudio.playSfx('punch_swing');
    } else if (isBlade) {
      this.fireCooldown = 0.34;
      this.attackAnimTimer = 0.35;
      dhakaAudio.playSfx('slash');
    } else if (isBaton) {
      this.fireCooldown = 0.28;
      this.attackAnimTimer = 0.30;
      dhakaAudio.playSfx('ui');
    } else {
      // Cricket bat or bamboo lathi
      this.fireCooldown = 0.38;
      this.attackAnimTimer = 0.38;
      dhakaAudio.playSfx('punch_swing');
    }

    const forwardX = Math.sin(this.playerRotation);
    const forwardZ = Math.cos(this.playerRotation);

    const meleeDmg =
      tool.damage * (store.selectedCharacterId === 'kabir' ? 1.3 : 1.0);

    // Check melee hits on nearby vehicles (sparks & dents)
    for (const veh of this.vehicles) {
      if (Math.abs(veh.y - this.playerPos.y) > 2.8) continue;
      const dx = veh.x - this.playerPos.x;
      const dz = veh.z - this.playerPos.z;
      const distV = Math.hypot(dx, dz);
      if (distV <= tool.range + 1.4) {
        const dot = (dx * forwardX + dz * forwardZ) / Math.max(0.01, distV);
        if (dot < 0.2) continue;

        const isHeavy = this.meleeComboStep === 2 || tool.category === 'local_arm';
        dhakaAudio.playSfx(isBlade ? 'slash' : isHeavy ? 'heavy_hit' : 'hit');
        veh.health = Math.max(0, veh.health - meleeDmg);
        this.spawnImpactSparks(
          (this.playerPos.x + veh.x) * 0.5,
          1.05,
          (this.playerPos.z + veh.z) * 0.5,
          tool.id === 'stun_baton' ? '#38bdf8' : '#fbbf24',
          1.2
        );
        break;
      }
    }

    for (const npc of this.npcs) {
      if (npc.isDead) continue;
      const npcLimbs = this.npcLimbsMap.get(npc.id);
      const npcY = npcLimbs ? npcLimbs.group.position.y : 0;
      if (Math.abs(npcY - this.playerPos.y) > 2.8) continue;
      const dx = npc.x - this.playerPos.x;
      const dz = npc.z - this.playerPos.z;
      const dist = Math.hypot(dx, dz);
      if (dist <= tool.range) {
        const dot = (dx * forwardX + dz * forwardZ) / Math.max(0.01, dist);
        if (dot < 0.25) continue;

        const isHeavy = this.meleeComboStep === 2 || tool.category === 'local_arm';
        if (isBlade) {
          dhakaAudio.playSfx('slash');
        } else if (isHeavy) {
          dhakaAudio.playSfx('heavy_hit');
          dhakaAudio.playSfx('bone_crack');
        } else {
          dhakaAudio.playSfx('hit');
        }
        dhakaAudio.playSfx('pain_grunt');

        // Physical knockback impulse on victim
        const pushDist = isBlade ? 1.6 : isHeavy ? 1.4 : 0.75;
        npc.x += forwardX * pushDist;
        npc.z += forwardZ * pushDist;

        // Arterial blood spray and asphalt pool
        this.spawnDirectionalBloodSpray(npc.x, npcY + 1.15, npc.z, forwardX, forwardZ, isBlade ? 28 : isHeavy ? 18 : 8);
        if (isBlade || (isHeavy && Math.random() < 0.6)) {
          this.spawnBloodDecal(npc.x, npc.z, 1.35, npcY);
        }

        this.spawnImpactSparks(
          npc.x,
          npcY + 1.15,
          npc.z,
          isBlade ? '#ef4444' : isBaton ? '#38bdf8' : '#fbbf24',
          1.25
        );

        if (!npc.isStoryNPC) {
          npc.health -= meleeDmg;
          if (npc.health <= 0 || isBlade) {
            // Fatal Melee Strike: Ragdoll tumble & authentic death collapse
            npc.isDead = true;
            npc.aiState = 'dead';
            npc.health = 0;
            npc.deathTimer = 0.0;
            npc.deathType = 'melee';
            npc.deathVx = forwardX;
            npc.deathVz = forwardZ;
            npc.respawnTimer = npc.isMissionEnemy ? 9999 : 40;
            dhakaAudio.playSfx('death_groan');

            if (npcLimbs) {
              setDeathRagdollPose(npcLimbs, 'melee', 0.05);
            }
            this.spawnBloodDecal(npc.x, npc.z, 1.45, npcY);
            this.spawnImpactSparks(npc.x, npcY + 0.3, npc.z, '#b91c1c', 2.0);
            this.spawnCashDrop(npc.x, npc.z, npc.isMissionEnemy ? 450 : Math.floor(Math.random() * 300 + 100));
            if (!npc.isMissionEnemy) {
              store.setWantedLevel(Math.max(2, store.wantedLevel + 1));
            }
            this.alertNearbyPedestrians(npc.x, npc.z, 28);
          } else {
            // Chance of street retaliation fight-back before fleeing
            if (Math.random() < 0.35) {
              npc.retaliateCooldown = 0.65;
            } else {
              npc.aiState = 'flee';
            }
            store.setWantedLevel(Math.max(1, store.wantedLevel + 1));
          }

          // Bengali voice reaction groan
          const groans = ['উফফ!', 'আহহ!', 'মারিস না ভাই!', 'ওরে বাবারে!', 'বাঁচাও!'];
          const groanText = groans[Math.floor(Math.random() * groans.length)];
          store.showBanner({
            titleEn: `${npc.nameEn}: "${groanText}"`,
            titleBn: `${npc.nameBn}: "${groanText}"`,
            subtitleEn: `Struck by ${tool.nameEn} (Combo #${this.meleeComboStep + 1})`,
            subtitleBn: `${tool.nameBn}-এর মারাত্মক আঘাত!`,
            tone: 'red',
          });
        }
        break;
      }
    }
  }

  private handleTalkToNPC() {
    const store = useGameStore.getState();
    let closest: NPCEntity | null = null;
    let minDist = 5.5;

    for (const npc of this.npcs) {
      const limbs = this.npcLimbsMap.get(npc.id);
      const npcY = limbs ? limbs.group.position.y : 0;
      if (Math.abs(npcY - this.playerPos.y) > 2.8) continue;
      const d = Math.hypot(npc.x - this.playerPos.x, npc.z - this.playerPos.z);
      if (d < minDist) {
        minDist = d;
        closest = npc;
      }
    }

    if (closest) {
      dhakaAudio.playSfx('ui');
      const idx = Math.floor(Math.random() * closest.dialogueEn.length);
      store.setDialogue({
        speakerEn: closest.nameEn,
        speakerBn: closest.nameBn,
        textEn: closest.dialogueEn[idx],
        textBn: closest.dialogueBn[idx] || closest.dialogueEn[idx],
      });
    }
  }

  private handlePrimaryInteraction(preferVehicle: boolean) {
    const store = useGameStore.getState();

    // 0. If seated inside vehicle near a CNG/Marine Fuel pump and pressing [E], refuel in place!
    if (this.activeVehicleId && !preferVehicle) {
      const curVeh = this.vehicles.find((v) => v.id === this.activeVehicleId);
      const nearStation = this.cngStationSpots.find(
        (cs) => Math.hypot(cs.x - this.playerPos.x, cs.z - this.playerPos.z) < 12
      );
      if (curVeh && nearStation && curVeh.type !== 'rickshaw') {
        if (store.spendTaka(100, nearStation.isMarine ? 'Marine Fuel Dock Refuel' : 'CNG Station Refuel & Tune-Up', 'জ্বালানি ও সার্ভিস')) {
          curVeh.health = curVeh.maxHealth;
          curVeh.fuel = 100;
          curVeh.lowFuelWarned = false;
          dhakaAudio.playSfx('pickup');
          store.showBanner({
            titleEn: nearStation.isMarine ? '⚓ PIER FUEL: FULL TANK & HULL REPAIRED!' : '⛽ CNG STATION: FULL TANK & VEHICLE RESTORED!',
            titleBn: nearStation.isMarine ? '⚓ ঘাট ফুয়েল: ফুল ট্যাংক ও নৌকা মেরামত সম্পন্ন!' : '⛽ সিএনজি পাম্প: ফুল গ্যাস ও গাড়ি সার্ভিস সম্পন্ন!',
            subtitleEn: 'Refueled and restored to 100% condition.',
            subtitleBn: 'জ্বালানি ভরা ও ১০০% মেরামত সম্পন্ন হয়েছে।',
            tone: 'green',
          });
          return;
        }
      }
    }

    // 0. If currently riding the Dhaka Metro Rail, [E] / [F] arrives & disembarks at destination
    if (this.metroRide) {
      this.finishMetroRide();
      dhakaAudio.playSfx('ui');
      return;
    }

    // 1. Safe Vehicle Exit
    if (this.activeVehicleId) {
      this.exitCurrentVehicle();
      dhakaAudio.playSfx('ui');
      return;
    }

    // 1.5 Check Jamuna Future Park Mall Shops, Food Court, Cinema, Arcade & Glass Elevator
    if (!preferVehicle) {
      for (const shop of this.jfpInteractables) {
        if (Math.abs(shop.y - this.playerPos.y) > 2.4) continue;
        const d = Math.hypot(shop.x - this.playerPos.x, shop.z - this.playerPos.z);
        if (d < 4.0) {
          this.executeMallShopInteraction(shop);
          return;
        }
      }
    }

    // 2. Check nearby Point of Interest
    for (const poi of POINTS_OF_INTEREST) {
      const d = Math.hypot(poi.x - this.playerPos.x, poi.z - this.playerPos.z);
      if (d < 4.8 && !preferVehicle) {
        this.executePOIInteraction(poi.id);
        return;
      }
    }

    // 2.5 Check nearby Dhaka Metro Rail (MRT) Station Pavilion, Turnstiles, Sidewalk or Platform
    const metroStop = this.findNearbyMetroStation();
    if (metroStop && (!preferVehicle || !this.findNearestEnterableVehicle(5.2))) {
      dhakaAudio.playSfx('metro_chime');
      store.openMetroModal(metroStop.id);
      return;
    }

    if (!preferVehicle) {
      // 2.6 Check nearby CNG Filling Station (Refuel & Quick Repair)
      for (const cs of this.cngStationSpots) {
        const d = Math.hypot(cs.x - this.playerPos.x, cs.z - this.playerPos.z);
        if (d < 6.5) {
          const nearVeh = this.vehicles.find(
            (v) => v.health > 0 && Math.hypot(v.x - cs.x, v.z - cs.z) < 12
          );
          if (store.spendTaka(100, 'CNG Station Refuel & Tune-Up', 'সিএনজি স্টেশন রিফুয়েল ও সার্ভিস')) {
            if (nearVeh) {
              nearVeh.health = nearVeh.maxHealth;
              nearVeh.fuel = 100;
              nearVeh.lowFuelWarned = false;
            }
            this.playerStamina = 100;
            dhakaAudio.playSfx('pickup');
            store.showBanner({
              titleEn: '⛽ CNG STATION: FULL TANK & VEHICLE RESTORED!',
              titleBn: '⛽ সিএনজি পাম্প: ফুল গ্যাস ও গাড়ি সার্ভিস সম্পন্ন!',
              subtitleEn: nearVeh ? 'Nearby vehicle repaired to 100% HP & refueled.' : 'Refreshed at CNG filling station.',
              subtitleBn: 'আশেপাশের গাড়িটি ১০০% মেরামত ও রিফুয়েল করা হয়েছে।',
              tone: 'green',
            });
          }
          return;
        }
      }
      // 2.7 Check Outdoor Street ATM Booth
      for (const atm of this.streetAtmSpots) {
        const d = Math.hypot(atm.x - this.playerPos.x, atm.z - this.playerPos.z);
        if (d < 4.5) {
          if (this.streetAtmCooldown > 0) {
            dhakaAudio.playSfx('ui');
            store.showBanner({
              titleEn: 'ATM TRANSACTION LIMIT REACHED',
              titleBn: 'এটিএম লেনদেন সীমা পূর্ণ হয়েছে',
              subtitleEn: `Please wait ${Math.ceil(this.streetAtmCooldown)}s before next withdrawal.`,
              subtitleBn: `পরবর্তী লেনদেনের জন্য ${Math.ceil(this.streetAtmCooldown)} সেকেন্ড অপেক্ষা করুন।`,
              tone: 'blue',
            });
          } else {
            this.streetAtmCooldown = 25;
            store.addTaka(500, `${atm.nameEn} Cash Withdrawal`, `${atm.nameBn} থেকে নগদ উত্তোলন`);
            store.showBanner({
              titleEn: `🏧 ${atm.nameEn.toUpperCase()}: +৳500`,
              titleBn: `🏧 ${atm.nameBn}: +৳৫০০ উত্তোলন সম্পন্ন`,
              subtitleEn: 'Mobile banking cash withdrawn safely.',
              subtitleBn: 'ব্যাংক কার্ড থেকে নগদ টাকা উত্তোলন সফল হয়েছে।',
              rewardTaka: 500,
              tone: 'green',
            });
          }
          return;
        }
      }
    }

    // 3. Find closest Operational Vehicle on same elevation deck to Enter
    const closestVeh = this.findNearestEnterableVehicle(5.8);

    if (closestVeh) {
      this.ejectDriverFromVehicle(closestVeh);

      this.isSwimming = false;
      this.isCrouching = false;
      this.isAiming = false;
      this.activeVehicleId = closestVeh.id;
      closestVeh.isTraffic = false;
      this.playerLimbs.group.rotation.set(0, 0, 0);
      const mesh = this.vehicleMeshes.get(closestVeh.id);
      if (mesh) {
        (mesh as any).isPlayerDriven = true;
        if (!mesh.userData) mesh.userData = {};
        mesh.userData.noDriver = true;

        let lingering = mesh.getObjectByName('npc_driver');
        while (lingering) {
          lingering.visible = false;
          lingering.parent?.remove(lingering);
          lingering = mesh.getObjectByName('npc_driver');
        }

        mesh.add(this.playerLimbs.group);
      }
      this.playerLimbs.group.visible = true;
      this.cameraYaw = closestVeh.rotation + Math.PI;
      dhakaAudio.playSfx('pickup');

      useGameStore.setState({
        inVehicleId: closestVeh.id,
        currentVehicleType: closestVeh.type,
      });
      return;
    }

    for (const poi of POINTS_OF_INTEREST) {
      const d = Math.hypot(poi.x - this.playerPos.x, poi.z - this.playerPos.z);
      if (d < 5.2) {
        this.executePOIInteraction(poi.id);
        return;
      }
    }

    this.handleTalkToNPC();
  }

  private executeMallShopInteraction(shop: (typeof this.jfpInteractables)[number]) {
    const store = useGameStore.getState();
    dhakaAudio.playSfx('ui');

    if (shop.category === 'elevator') {
      const nextFloor = (shop.floor + 1) % 3;
      const nextY = nextFloor === 0 ? 0.25 : nextFloor === 1 ? 5.4 : 10.55;
      this.playerPos.set(this.jfpCenter.x, nextY, this.jfpCenter.z - 8.5);
      this.playerLimbs.group.position.copy(this.playerPos);
      this.isGrounded = true;
      this.playerVelY = 0;
      store.setMallFloor(nextFloor);
      store.showBanner({
        titleEn:
          nextFloor === 0
            ? '🛗 GROUND FLOOR: FASHION & TECH ATRIUM'
            : nextFloor === 1
            ? '🛗 1ST FLOOR: LIFESTYLE, WATCHES & BOOKS'
            : '🛗 2ND FLOOR: FOOD COURT, CINEMA & GAME ZONE',
        titleBn:
          nextFloor === 0
            ? '🛗 নিচতলা: ফ্যাশন ও টেক অ্যাট্রিয়াম'
            : nextFloor === 1
            ? '🛗 ২য় তলা: লাইফস্টাইল, ঘড়ি ও বই'
            : '🛗 ৩য় তলা: ফুড কোর্ট, ব্লকবাস্টার সিনেমা ও গেম জোন',
        subtitleEn: 'Panoramic Glass Elevator arrived smoothly.',
        subtitleBn: 'গ্লাস লিফট থেকে বের হয়ে শপিং উপভোগ করুন।',
        tone: 'blue',
      });
      return;
    }

    store.openShopModal({
      shopId: shop.id,
      titleEn: shop.nameEn,
      titleBn: shop.nameBn,
      category: shop.category,
      cost: shop.cost,
    });
  }

  private executePOIInteraction(poiId: string) {
    const store = useGameStore.getState();
    const poi = POINTS_OF_INTEREST.find((p) => p.id === poiId);
    if (!poi) return;

    if (poiId === 'poi_bashundhara_jamuna_mall') {
      // Step smoothly through the South glass entrance into the Grand Atrium!
      this.playerPos.set(520, 0.25, -356);
      this.playerRotation = Math.PI;
      this.playerLimbs.group.position.copy(this.playerPos);
      this.playerLimbs.group.rotation.y = this.playerRotation;
      dhakaAudio.playSfx('ui');
      store.showBanner({
        titleEn: '🏬 JAMUNA FUTURE PARK: WELCOME INSIDE!',
        titleBn: 'যমুনা ফিউচার পার্কে স্বাগতম!',
        subtitleEn: 'Ground Floor: Fashion & Tech • West Escalator -> 1F • East Escalator -> 2F Food Court & Cinema',
        subtitleBn: 'নিচতলা: ফ্যাশন ও টেক • চলন্ত সিঁড়ি ও গ্লাস লিফটে ২য় ও ৩য় তলায় যান!',
        tone: 'gold',
      });
      return;
    }

    if (poiId === 'poi_ahsan_manzil_palace') {
      store.healPlayer(100, 100);
      store.setWantedLevel(0);
      store.saveGameToStorage();
      dhakaAudio.playSfx('eat');
      store.showBanner({
        titleEn: 'AHSAN MANZIL: NAWABI PALACE REST (+100 HP & FULL ARMOR)',
        titleBn: 'আহসান মঞ্জিল: নবাবী প্রাসাদে বিশ্রাম (+১০০ হেলথ ও পূর্ণ আর্মার)',
        subtitleEn: 'Historic riverfront breeze from the Buriganga cleared your wanted status!',
        subtitleBn: 'বুড়িগঙ্গার মৃদুমন্দ বাতাসে আপনার সব ক্লান্তি ও পুলিশের ওয়ান্টেড মুছে গেল!',
        tone: 'gold',
      });
      return;
    }

    if (poiId === 'poi_chawkbazar_kacchi_deg') {
      if (
        store.spendTaka(
          260,
          'Chawkbazar Royal Deg Kacchi & Borhani',
          'চকবাজার রয়েল শাহী কাচ্চি ও বোরহানি'
        )
      ) {
        store.healPlayer(100, 60);
        this.playerStamina = 100;
        dhakaAudio.playSfx('eat');
        store.showBanner({
          titleEn: 'ROYAL CHAWKBAZAR KACCHI & BORHANI (+100 HP & +60 ARMOR)',
          titleBn: 'চকবাজার রয়েল শাহী কাচ্চি ও বোরহানি (+১০০ হেলথ ও +৬০ আর্মার)',
          subtitleEn: 'Fragrant saffron rice, tender mutton & chilled spicy borhani!',
          subtitleBn: 'জাফরানি পোলাও, খাসির মাংস আর পুদিনার ঝাঁঝালো বোরহানি!',
          tone: 'gold',
        });
      }
      return;
    }

    if (poiId === 'poi_star_masjid') {
      store.healPlayer(100, 40);
      store.setWantedLevel(0);
      this.playerStamina = 100;
      store.saveGameToStorage();
      dhakaAudio.playSfx('ui');
      store.showBanner({
        titleEn: 'STAR MOSQUE: PEACEFUL PRAYER & REST (+100 HP, WANTED CLEARED)',
        titleBn: 'তারা মসজিদ: নামাজ আদায় ও আত্মিক প্রশান্তি (+১০০ হেলথ, ওয়ান্টেড মুক্ত)',
        subtitleEn: 'The serene 18th-century blue star mosaics brought spiritual peace to Arif.',
        subtitleBn: '১৮ শতকের অপূর্ব নীল তারার কারুকাজ আরিফের মনে প্রশান্তি এনে দিল।',
        tone: 'blue',
      });
      return;
    }

    if (poiId === 'poi_bahadur_shah_park') {
      store.healPlayer(100, 30);
      store.setWantedLevel(0);
      this.playerStamina = 100;
      store.saveGameToStorage();
      dhakaAudio.playSfx('ui');
      store.showBanner({
        titleEn: 'BAHADUR SHAH PARK: 1857 REVOLUTION MEMORIAL REST',
        titleBn: 'বাহাদুর শাহ পার্ক: ১৮৫৭ এর শহীদ স্মৃতিস্তম্ভে বিশ্রাম',
        subtitleEn: 'Rested beneath ancient banyan trees. Game saved and wanted level cleared!',
        subtitleBn: 'প্রাচীন বটবৃক্ষের ছায়ায় বিশ্রাম নিলেন। গেম সেভ ও ওয়ান্টেড মুক্ত!',
        tone: 'green',
      });
      return;
    }

    if (poiId === 'poi_beauty_lassi') {
      if (
        store.spendTaka(
          90,
          'Beauty Lassi & Special Falooda (Est. 1922)',
          'বিউটি লাচ্ছি ও স্পেশাল ফালুদা'
        )
      ) {
        store.healPlayer(75, 20);
        this.playerStamina = 100;
        dhakaAudio.playSfx('drink');
        store.showBanner({
          titleEn: 'BEAUTY LASSI & SPECIAL FALOODA (+75 HP & +50 STAMINA)',
          titleBn: 'বিউটি লাচ্ছি ও স্পেশাল ফালুদা (+৭৫ হেলথ ও +৫০ স্ট্যামিনা)',
          subtitleEn: 'Legendary chilled sweet lassi churned with traditional clay pots since 1922!',
          subtitleBn: '১৯২২ সাল থেকে চলে আসা খাঁটি মাঠার ঠান্ডা লাচ্ছি ও পেস্তা ফালুদা!',
          tone: 'gold',
        });
      }
      return;
    }

    if (poiId === 'poi_shankhari_bazar') {
      if (
        store.spendTaka(
          50,
          'Moron Gopal Heritage Sweets & Shankha Souvenir',
          'মরন গোপালের মিষ্টি ও শাঁখার স্মারক'
        )
      ) {
        store.healPlayer(50, 10);
        this.playerStamina = 100;
        dhakaAudio.playSfx('eat');
        store.showBanner({
          titleEn: 'SHANKHARI BAZAR: MORON GOPAL SWEETS (+50 HP)',
          titleBn: 'শাঁখারীবাজার: মরন গোপালের খাঁটি রসগোল্লা (+৫০ হেলথ)',
          subtitleEn: 'Delightful heritage sweets from the ancient artisan street!',
          subtitleBn: 'প্রাচীন কারুশিল্পের গলির বিখ্যাত রসগোল্লা খেয়ে শক্তি ফিরে পেলেন!',
          tone: 'green',
        });
      }
      return;
    }

    if (poiId === 'poi_lalkuthi_heritage') {
      store.healPlayer(80, 25);
      store.saveGameToStorage();
      dhakaAudio.playSfx('ui');
      store.showBanner({
        titleEn: 'NORTHBROOK HALL (LALKUTHI): RIVERFRONT HERITAGE WALK',
        titleBn: 'নর্থব্রুক হল (লালকুঠি): বুড়িগঙ্গা তীরের ঐতিহাসিক ভ্রমণ',
        subtitleEn: 'Stood before the iconic 1874 red brick Victorian waterfront hall.',
        subtitleBn: '১৮৭৪ সালের ঐতিহাসিক লালকুঠির সামনে দাঁড়িয়ে বুড়িগঙ্গার বাতাস উপভোগ করলেন।',
        tone: 'gold',
      });
      return;
    }

    if (poiId === 'poi_purbachal_bbcfec') {
      store.healPlayer(100, 50);
      store.setWantedLevel(0);
      store.saveGameToStorage();
      store.showBanner({
        titleEn: 'BBCFEC EXHIBITION CENTER VISIT (WANTED LEVEL CLEARED)',
        titleBn: 'বঙ্গবন্ধু প্রদর্শনী কেন্দ্র পরিদর্শন (ওয়ান্টেড লেভেল মুক্ত)',
        subtitleEn: 'Futuristic architectural pavilion in Purbachal Smart City.',
        subtitleBn: 'পূর্বাচল স্মার্ট সিটির আধুনিক আন্তর্জাতিক সম্মেলন কেন্দ্র।',
        tone: 'blue',
      });
      return;
    }

    if (poiId === 'poi_purbachal_bridge') {
      if (
        store.spendTaka(
          500,
          'Purbachal 300ft Supercar Tune',
          'পূর্বাচল হাই-স্পিড কার টিউনিং'
        )
      ) {
        this.spawnPlayerVehicleNear('car');
        store.showBanner({
          titleEn: '300FT SPEEDWAY: SUPERCHARGED CAR SPAWNED',
          titleBn: 'পূর্বাচল ৩০০ ফিট: সুপারচার্জড স্পোর্টস কার প্রস্তুত!',
          subtitleEn: 'Tuned for max acceleration along the 8-lane expressway.',
          subtitleBn: '৮ লেনের মহাসড়কে ফুল স্পিডে চালানোর জন্য প্রস্তুত!',
          tone: 'gold',
        });
      }
      return;
    }

    if (poi.type === 'tea_stall') {
      if (
        store.spendTaka(20, "Kamal Mama's Malai Cha", 'কামাল মামার মালাই চা')
      ) {
        store.healPlayer(35, 0);
        this.playerStamina = 100;
        dhakaAudio.playSfx('drink');
        store.showBanner({
          titleEn: 'FRESH MALAI CHA ENJOYED (+35 HP & STAMINA)',
          titleBn: 'গরম মালাই চা পান করেছেন (+৩৫ হেলথ ও স্ট্যামিনা)',
          subtitleEn: 'Nothing beats Dhaka street tea in a clay cup!',
          subtitleBn: 'মাটির কাপে মামার দোকানের চায়ের জুড়ি নেই!',
          tone: 'green',
        });
      }
    } else if (poi.type === 'fuchka_stall') {
      if (
        store.spendTaka(
          60,
          'Dhanmondi Naga Fuchka & Chotpoti',
          'ধানমন্ডি লেকের নাগা ফুচকা ও চটপটি'
        )
      ) {
        store.healPlayer(65, 10);
        this.playerStamina = 100;
        dhakaAudio.playSfx('eat');
        store.showBanner({
          titleEn: 'NAGA FUCHKA PLATE (+65 HP)',
          titleBn: 'নাগা ফুচকা ও চটপটি (+৬৫ হেলথ)',
          subtitleEn: 'Crispy, spicy, and tangy with tamarind tok!',
          subtitleBn: 'তেঁতুলের টক আর নাগা মরিচের ঝালে দারুণ চাঙ্গা!',
          tone: 'green',
        });
      }
    } else if (poi.type === 'biriyani_shop') {
      if (
        store.spendTaka(
          250,
          'Old Dhaka Shahi Haji Kacchi Biriyani',
          'পুরান ঢাকার শাহী হাজী কাচ্চি বিরিয়ানি'
        )
      ) {
        store.healPlayer(100, 50);
        this.playerStamina = 100;
        dhakaAudio.playSfx('eat');
        store.showBanner({
          titleEn: 'SHAHI KACCHI FEAST (+100 HP & +50 ARMOR)',
          titleBn:
            'শাহী কাচ্চি বিরিয়ানি ও বোরহানি (+১০০ হেলথ ও +৫০ আর্মার)',
          subtitleEn: 'Full health and armor restored in Puran Dhaka style!',
          subtitleBn:
            'পুরান ঢাকার ঐতিহ্যবাহী কাচ্চি খেয়ে পুরোপুরি চাঙ্গা!',
          tone: 'gold',
        });
      }
    } else if (poi.type === 'safe_house') {
      store.healPlayer(100, 40);
      store.setWantedLevel(0);
      store.saveGameToStorage();
      store.showBanner({
        titleEn: 'SAFE HOUSE REST & GAME SAVED',
        titleBn: 'সেফ হাউসে বিশ্রাম ও গেম সেভ সম্পন্ন',
        subtitleEn: 'Wanted level cleared and health restored.',
        subtitleBn: 'ওয়ান্টেড লেভেল মুছে গেছে এবং হেলথ পূর্ণ হয়েছে।',
        tone: 'green',
      });
    } else if (poi.type === 'garage') {
      store.openGarageModal(poi.id);
    } else if (poi.type === 'clothing_shop') {
      store.setGamePhase('paused', 'character');
    } else if (poi.type === 'police_box') {
      if (store.wantedLevel === 0) {
        store.showBanner({
          titleEn: 'CLEAN RECORD AT DMP TRAFFIC BOX',
          titleBn: 'আপনার নামে কোনো ট্রাফিক কেস নেই',
          subtitleEn: 'No active wanted stars to clear.',
          subtitleBn: 'পুলিশের খাতায় আপনার রেকর্ড পরিষ্কার।',
          tone: 'blue',
        });
      } else if (
        store.spendTaka(500, 'Settled DMP Traffic Fine', 'ট্রাফিক জরিমানা পরিশোধ')
      ) {
        store.setWantedLevel(0);
        store.showBanner({
          titleEn: 'TRAFFIC FINES SETTLED — WANTED CLEARED',
          titleBn: 'জরিমানা পরিশোধিত — পুলিশ কেস নিষ্পত্তি হয়েছে',
          subtitleEn: 'DMP Patrol units have called off the pursuit.',
          subtitleBn: 'পুলিশ পেট্রোল ধাওয়া প্রত্যাহার করেছে।',
          tone: 'green',
        });
      }
    } else if (poi.type === 'ferry_ghat') {
      store.healPlayer(25, 0);
      store.showBanner({
        titleEn: 'SADARGHAT LAUNCH TERMINAL',
        titleBn: 'সদরঘাট লঞ্চ টার্মিনাল পন্টুন',
        subtitleEn:
          'Double-decker launches bound for Barishal & Chandpur line the Buriganga.',
        subtitleBn:
          'বুড়িগঙ্গা নদীতে বরিশাল ও চাঁদপুরগামী বিশাল লঞ্চের সারি।',
        tone: 'blue',
      });
    }
  }

  public spawnPlayerVehicleNear(type: VehicleType) {
    const stats = VEHICLE_STATS[type];
    const id = `veh_spawn_${Date.now()}`;
    const vehRadius = Math.max(stats.width, stats.length) * 0.45;

    let spawnX = this.playerPos.x + Math.sin(this.playerRotation) * 4.2;
    let spawnZ = this.playerPos.z + Math.cos(this.playerRotation) * 4.2;

    if (type === 'boat') {
      // Dock water taxis on the nearest water jetty if player isn't already beside water
      const docks = [
        { x: 200, z: -14 },  // Hatirjheel Jetty
        { x: 24, z: 326 },   // Sadarghat Buriganga Pier
        { x: -215, z: 25 },  // Dhanmondi Lake
      ];
      let best = docks[0];
      let bestD = Infinity;
      for (const dk of docks) {
        const d = Math.hypot(dk.x - this.playerPos.x, dk.z - this.playerPos.z);
        if (d < bestD) { bestD = d; best = dk; }
      }
      spawnX = best.x;
      spawnZ = best.z;
    } else if (
      this.isPositionInWater(spawnX, spawnZ) ||
      this.checkWorldObstacle(spawnX, spawnZ, vehRadius, null, this.playerPos.y)
    ) {
      const candidates = [
        [3.5, 0], [-3.5, 0], [0, 3.5], [0, -3.5],
        [4.5, 4.5], [-4.5, 4.5], [4.5, -4.5], [-4.5, -4.5],
        [7.0, 0], [-7.0, 0], [0, 7.0], [0, -7.0],
      ];
      let placed = false;
      for (const [ox, oz] of candidates) {
        const tx = this.playerPos.x + ox;
        const tz = this.playerPos.z + oz;
        if (
          !this.isPositionInWater(tx, tz) &&
          !this.checkWorldObstacle(tx, tz, vehRadius, null, this.playerPos.y)
        ) {
          spawnX = tx;
          spawnZ = tz;
          placed = true;
          break;
        }
      }
      if (!placed && this.isPositionInWater(spawnX, spawnZ)) {
        // Fallback onto Farmgate dry curb if player summoned a land vehicle far offshore
        spawnX = 6;
        spawnZ = 16;
      }
    }

    const spawnElev = type === 'boat' ? 0.35 : this.getRoadElevation(spawnX, spawnZ, this.playerPos.y);
    const entity: VehicleEntity = {
      id,
      type,
      x: spawnX,
      y: spawnElev,
      z: spawnZ,
      rotation: this.playerRotation,
      speed: 0,
      steering: 0,
      health: stats.maxHealth,
      maxHealth: stats.maxHealth,
      color: type === 'cng' ? '#15803d' : type === 'boat' ? '#0284c7' : '#f59e0b',
      isTraffic: false,
      isPolice: type === 'police',
      fuel: 100,
      plateNumber: `ঢাকা মেট্রো-গ ৯৯-${Math.floor(1000 + Math.random() * 8999)}`,
    };
    this.vehicles.push(entity);

    const mesh = createVehicleMesh(type, entity.color, this.vehicles.length, false);
    mesh.position.set(spawnX, spawnElev, spawnZ);
    mesh.rotation.y = entity.rotation;
    this.scene.add(mesh);
    this.vehicleMeshes.set(id, mesh);

    if (type === 'boat') {
      // Automatically place player at the helm of the summoned boat instead of dropping on open water
      this.activeVehicleId = id;
      this.isSwimming = false;
      this.isCrouching = false;
      mesh.add(this.playerLimbs.group);
      this.playerPos.set(spawnX, spawnElev, spawnZ);
      this.cameraYaw = entity.rotation + Math.PI;
      useGameStore.setState({
        inVehicleId: id,
        currentVehicleType: 'boat',
      });
    }
  }

  public startRandomFareJob() {
    const store = useGameStore.getState();
    if (store.activeFareJob) {
      store.cancelFareJob();
      store.showBanner({
        titleEn: 'FARE TRIP CANCELLED',
        titleBn: 'ভাড়ার ট্রিপ বাতিল করা হয়েছে',
        subtitleEn: 'Ready for a new passenger anytime with [G].',
        subtitleBn: 'যেকোনো সময় [G] চেপে নতুন ভাড়া নিতে পারবেন।',
        tone: 'blue',
      });
      return;
    }

    const activeVeh = this.activeVehicleId
      ? this.vehicles.find((v) => v.id === this.activeVehicleId)
      : null;
    if (!activeVeh) return;

    if (activeVeh.type === 'police') {
      dhakaAudio.playSfx('ui');
      store.showBanner({
        titleEn: 'DMP PATROL CRUISER — TAXI FARES DISABLED',
        titleBn: 'পুলিশের গাড়িতে যাত্রী পরিবহন সম্ভব নয়',
        subtitleEn: 'Switch to a CNG, rickshaw, car, bike, or boat for fares.',
        subtitleBn: 'ভাড়া নিতে সিএনজি, রিকশা, কার, বাইক বা নৌকা ব্যবহার করুন।',
        tone: 'red',
      });
      return;
    }

    const isBoat = activeVeh.type === 'boat';
    const rawDestList = isBoat
      ? [
          { nameEn: 'Sadarghat River Terminal', nameBn: 'সদরঘাট লঞ্চ টার্মিনাল', x: 20, z: 320 },
          { nameEn: 'Hatirjheel Amphitheater Pier', nameBn: 'হাতিরঝিল বোট জেটি', x: 200, z: -14 },
          { nameEn: 'Dhanmondi Lake Pier', nameBn: 'ধানমন্ডি লেক ঘাট', x: -215, z: 25 },
        ]
      : [
          { nameEn: 'Jamuna Future Park Plaza', nameBn: 'যমুনা ফিউচার পার্ক গেট', x: 516, z: -333 },
          { nameEn: 'Sadarghat River Terminal', nameBn: 'সদরঘাট লঞ্চ টার্মিনাল', x: 0, z: 295 },
          { nameEn: 'Gulshan-2 Circle', nameBn: 'গুলশান-২ সার্কেল', x: 220, z: -175 },
          { nameEn: 'Motijheel Shapla Chattar', nameBn: 'মতিঝিল শাপলা চত্বর', x: 220, z: 175 },
          { nameEn: 'Dhanmondi Lake Side', nameBn: 'ধানমন্ডি লেক', x: -170, z: 10 },
          { nameEn: 'Uttara North Metro Hub', nameBn: 'উত্তরা নর্থ মেট্রো স্টেশন', x: -16, z: -530 },
        ];
    const destinations = rawDestList.filter(
      (d) => Math.hypot(d.x - this.playerPos.x, d.z - this.playerPos.z) > 100
    );
    const dest = destinations[Math.floor(Math.random() * destinations.length)] || rawDestList[0];
    const dist = Math.hypot(dest.x - this.playerPos.x, dest.z - this.playerPos.z);
    const arifBonus = store.selectedCharacterId === 'arif' ? 1.15 : 1.0;
    const reward = Math.max(450, Math.round(((dist * 1.4 * arifBonus) / 50)) * 50);
    const timeLeft = Math.max(55, Math.round(dist * (isBoat ? 0.28 : 0.22)));
    dhakaAudio.playHorn(VEHICLE_STATS[activeVeh.type].hornType);
    store.startFareJob({
      id: `fare_${Date.now()}`,
      passengerNameEn: isBoat ? 'River Commuter' : 'Dhaka Commuter',
      passengerNameBn: isBoat ? 'নদীপথ যাত্রী' : 'ঢাকার যাত্রী',
      dropNameEn: dest.nameEn,
      dropNameBn: dest.nameBn,
      dropX: dest.x,
      dropZ: dest.z,
      reward,
      timeLeft,
    });
    store.showBanner({
      titleEn: isBoat
        ? `⛵ WATER-TAXI FARE: TO ${dest.nameEn.toUpperCase()}`
        : `🚕 NEW PASSENGER FARE: TO ${dest.nameEn.toUpperCase()}`,
      titleBn: isBoat ? `⛵ নৌ-ট্যাক্সি ভাড়া: ${dest.nameBn}` : `🚕 নতুন ভাড়া: ${dest.nameBn}`,
      subtitleEn: `Reach the green beacon within ${timeLeft}s for ৳${reward}!`,
      subtitleBn: `${timeLeft} সেকেন্ডের মধ্যে সবুজ মার্কারে পৌঁছান — ৳${reward}!`,
      tone: 'green',
    });
  }

  private handleSketchfabSpawn(req: {
    spawnType: string;
    thumbnail: string;
    name: string;
  }) {
    const store = useGameStore.getState();
    const sx = this.playerPos.x + Math.sin(this.playerRotation) * 6.5;
    const sz = this.playerPos.z + Math.cos(this.playerRotation) * 6.5;

    if (req.spawnType === 'hilux_pickup') {
      this.spawnPlayerVehicleNear('pickup');
      store.showBanner({
        titleEn: `SKETCHFAB ASSET SPAWNED: ${req.name}`,
        titleBn: `স্কেচফ্যাব থ্রিডি গাড়ি স্থাপিত: ${req.name}`,
        subtitleEn: 'Press [F] next to the pickup truck to drive!',
        subtitleBn: 'গাড়ির কাছে গিয়ে [F] চেপে চালানো শুরু করুন!',
        tone: 'blue',
      });
      return;
    }

    if (req.spawnType === 'money_stacks') {
      this.spawnCashDrop(sx, sz, 2500);
      store.showBanner({
        titleEn: 'CASH PALLET DROPPED IN DHAKA!',
        titleBn: 'টাকার বান্ডিল ড্রপ করা হয়েছে (+৳২,৫০০)!',
        subtitleEn: 'Walk over the glowing green cash stack to collect it!',
        subtitleBn: 'সবুজ মার্কারের ওপর হেঁটে টাকা সংগ্রহ করুন!',
        tone: 'gold',
      });
      return;
    }

    if (req.spawnType === 'tactical_npc') {
      const id = `npc_sf_${Date.now()}`;
      const npc: NPCEntity = {
        id,
        nameEn: 'Tactical Partner (Sketchfab 3D)',
        nameBn: 'ট্যাকটিক্যাল সহযোগী',
        role: 'story_contact',
        x: sx,
        z: sz,
        rotation: this.playerRotation + Math.PI,
        shirtColor: '#0ea5e9',
        pantsColor: '#0f172a',
        isStoryNPC: true,
        dialogueEn: [
          'Ready for action in Dhaka, Arif! Let’s take down Sikder’s syndicate!',
        ],
        dialogueBn: [
          'ঢাকায় অভিযানের জন্য প্রস্তুত আরিফ! চলুন সিন্ডিকেট ধ্বংস করি!',
        ],
        aiState: 'idle',
        walkTargetX: sx,
        walkTargetZ: sz,
        health: 100,
      };
      this.npcs.push(npc);
      const limbs = createCharacterMesh('#0ea5e9', '#0f172a', 'story_contact', true);
      limbs.group.position.set(sx, 0, sz);
      this.scene.add(limbs.group);
      this.npcLimbsMap.set(id, limbs);
      return;
    }

    const propMesh = createSketchfabAssetPropMesh(req.spawnType, req.thumbnail);
    propMesh.position.set(sx, 0, sz);
    propMesh.rotation.y = this.playerRotation;
    this.scene.add(propMesh);

    store.showBanner({
      titleEn: `3D ASSET PLACED: ${req.name}`,
      titleBn: `থ্রিডি মডেল স্থাপন করা হয়েছে: ${req.name}`,
      subtitleEn: 'Spawned directly in front of Arif in Dhaka City.',
      subtitleBn: 'আরিফের সামনে সফলভাবে স্থাপন করা হয়েছে।',
      tone: 'green',
    });
  }

  private animate = () => {
    this.animFrameId = requestAnimationFrame(this.animate);
    const nowMs = performance.now();
    const rawFrameMs = this.lastRafTime > 0 ? Math.min(100, nowMs - this.lastRafTime) : 16.6;
    this.lastRafTime = nowMs;
    this.perfFrameEma = this.perfFrameEma * 0.94 + rawFrameMs * 0.06;
    this.perfFrameCount++;
    const dt = Math.min(0.05, this.clock.getDelta());

    const store = useGameStore.getState();

    // Auto-adaptive Windows / Integrated-GPU performance governor
    if (!this.perfDegraded && this.perfFrameCount > 90 && this.perfFrameEma > 28) {
      this.perfDegraded = true;
      this.renderer.setPixelRatio(0.85);
      this.sunLight.castShadow = false;
      this.renderer.shadowMap.enabled = false;
      this.camera.far = 1100;
      this.camera.updateProjectionMatrix();
    }

    // Dynamic Graphics Quality Switching (Bug Fix #6)
    if (store.graphicsQuality !== this.lastGraphicsQuality) {
      this.lastGraphicsQuality = store.graphicsQuality;
      const isHigh = store.graphicsQuality === 'high' && !this.perfDegraded;
      this.renderer.setPixelRatio(
        isHigh ? Math.min(window.devicePixelRatio, this.isWindows ? 1.0 : 1.25) : 0.85
      );
      this.renderer.shadowMap.enabled = isHigh;
      this.sunLight.castShadow = isHigh;
      this.camera.far = isHigh ? (this.isWindows ? 1400 : 2000) : 1100;
      this.camera.updateProjectionMatrix();
    }

    // Handle external store requests
    if (store.spawnVehicleRequest) {
      this.spawnPlayerVehicleNear(store.spawnVehicleRequest);
      store.clearEngineRequests();
    }
    if (store.spawnSketchfabRequest) {
      this.handleSketchfabSpawn(store.spawnSketchfabRequest);
      store.clearEngineRequests();
    }
    if (store.customGlbUrlRequest) {
      const url = store.customGlbUrlRequest;
      store.clearEngineRequests();
      loadCustomGLBFromUrl(url, (model) => {
        model.position.set(
          this.playerPos.x + Math.sin(this.playerRotation) * 5,
          0,
          this.playerPos.z + Math.cos(this.playerRotation) * 5
        );
        this.scene.add(model);
        store.showBanner({
          titleEn: 'CUSTOM .GLB 3D MODEL IMPORTED!',
          titleBn: 'কাস্টম .GLB থ্রিডি মডেল ইমপোর্ট সম্পন্ন!',
          subtitleEn: 'Placed directly in front of Arif in the 3D scene.',
          subtitleBn: 'আরিফের সামনে থ্রিডি বিশ্বে স্থাপন করা হয়েছে।',
          tone: 'gold',
        });
      });
    }
    if (store.repairVehicleRequest) {
      const targetVeh =
        (this.activeVehicleId
          ? this.vehicles.find((v) => v.id === this.activeVehicleId)
          : null) ||
        this.vehicles.find(
          (v) => Math.hypot(v.x - this.playerPos.x, v.z - this.playerPos.z) < 8
        );
      if (targetVeh) {
        targetVeh.health = targetVeh.maxHealth;
        targetVeh.fuel = 100;
        targetVeh.lowFuelWarned = false;
      }
      store.clearEngineRequests();
    }
    if (store.resprayVehicleRequest) {
      const newColor = store.resprayVehicleRequest;
      const targetVeh =
        (this.activeVehicleId
          ? this.vehicles.find((v) => v.id === this.activeVehicleId)
          : null) ||
        this.vehicles.find(
          (v) => Math.hypot(v.x - this.playerPos.x, v.z - this.playerPos.z) < 8
        );
      if (targetVeh) {
        targetVeh.color = newColor;
        const vMesh = this.vehicleMeshes.get(targetVeh.id);
        if (vMesh) {
          vMesh.traverse((child) => {
            if (!(child as THREE.Mesh).isMesh) return;
            const m = child as THREE.Mesh;
            if (
              m.name === 'wheel' ||
              m.name === 'contact_shadow' ||
              m.name.startsWith('accent_') ||
              m.name.startsWith('siren_') ||
              m.name.includes('driver')
            ) {
              return;
            }
            const mat = m.material as THREE.MeshPhysicalMaterial | THREE.MeshStandardMaterial;
            if (!mat || Array.isArray(mat) || !('color' in mat)) return;
            if ('clearcoat' in mat && (mat as THREE.MeshPhysicalMaterial).clearcoat > 0.4) {
              mat.color.set(newColor);
            } else if (
              !mat.map &&
              !mat.transparent &&
              mat.opacity >= 0.95 &&
              (mat.metalness ?? 0) <= 0.78 &&
              (mat.color.r > 0.14 || mat.color.g > 0.14 || mat.color.b > 0.14)
            ) {
              mat.color.set(newColor);
            }
          });
        }
        if (store.wantedLevel > 0) {
          store.setWantedLevel(0);
          store.showBanner({
            titleEn: '🎨 PAY & SPRAY: VEHICLE PAINTED — WANTED CLEARED!',
            titleBn: '🎨 গ্যারেজ রঙ সম্পন্ন — পুলিশ কেস মুছে গেছে!',
            subtitleEn: 'Fresh paint threw off DMP patrol units.',
            subtitleBn: 'গাড়ির নতুন রঙ করায় পুলিশ আপনাকে আর চিনতে পারছে না!',
            tone: 'green',
          });
        }
      }
      store.clearEngineRequests();
    }
    if (store.upgradeVehicleRequest) {
      const targetVeh =
        (this.activeVehicleId
          ? this.vehicles.find((v) => v.id === this.activeVehicleId)
          : null) ||
        this.vehicles.find(
          (v) => Math.hypot(v.x - this.playerPos.x, v.z - this.playerPos.z) < 8
        );
      if (targetVeh) {
        if (targetVeh.isUpgraded) {
          store.addTaka(500, 'Upgrade Refund (Already Tuned)', 'ইতিমধ্যে টিউন করা হয়েছে (৳৫০০ ফেরত)');
          store.showBanner({
            titleEn: 'VEHICLE ALREADY TURBO-TUNED',
            titleBn: 'গাড়িটি ইতিমধ্যে টার্বো-টিউন করা হয়েছে',
            subtitleEn: '৳500 refunded — maximum workshop stage installed.',
            subtitleBn: 'সর্বোচ্চ টার্বো টিউনিং আগেই লাগানো আছে (৳৫০০ ফেরত)।',
            tone: 'blue',
          });
        } else {
          targetVeh.isUpgraded = true;
          targetVeh.maxHealth = Math.round(targetVeh.maxHealth * 1.35);
          targetVeh.health = targetVeh.maxHealth;
          this.vehicleSpeedBoostMap.set(targetVeh.id, 1.25);
        }
      }
      store.clearEngineRequests();
    }
    if (store.switchCharacterRequest) {
      const charId = store.switchCharacterRequest;
      store.clearEngineRequests();
      this.lastSelectedCharacterId = charId;
      this.switchPlayerCharacter(charId);
    } else if (store.selectedCharacterId && store.selectedCharacterId !== this.lastSelectedCharacterId) {
      this.lastSelectedCharacterId = store.selectedCharacterId;
      this.switchPlayerCharacter(store.selectedCharacterId);
    }
    if (store.teleportRequest) {
      if (this.metroRide) {
        this.metroRide = null;
        if (this.playerMetroTrainL6) this.playerMetroTrainL6.visible = false;
        if (this.playerMetroTrainL5) this.playerMetroTrainL5.visible = false;
        this.playerLimbs.group.visible = true;
        store.setActiveMetroRide(null);
      }
      const { x, z } = store.teleportRequest;
      const targetElev = this.getRoadElevation(x, z, 0);
      this.playerPos.set(x, targetElev, z);
      this.playerLimbs.group.position.set(x, targetElev, z);
      this.playerLimbs.group.rotation.x = 0;
      this.playerLimbs.group.rotation.z = 0;
      this.isGrounded = true;
      this.isSwimming = false;
      this.isCrouching = false;
      this.isAiming = false;
      this.playerStamina = 100;
      this.playerVelY = 0;
      if (this.activeVehicleId) {
        const v = this.vehicles.find((veh) => veh.id === this.activeVehicleId);
        if (v) {
          v.x = x;
          v.y = targetElev;
          v.z = z;
          v.speed = 0;
          v.waterSubmergeTimer = 0;
          const vMesh = this.vehicleMeshes.get(v.id);
          if (vMesh) {
            vMesh.position.set(x, targetElev, z);
            vMesh.rotation.x = 0;
          }
        }
      }
      store.clearEngineRequests();
    }
    if (store.metroRideRequest) {
      const { fromId, toId } = store.metroRideRequest;
      store.clearEngineRequests();
      this.startMetroRide(fromId, toId);
    }
    if (store.metroDisembarkRequest) {
      store.clearEngineRequests();
      if (this.metroRide) {
        this.finishMetroRide();
      }
    }

    // Update Player Outfit & Weapon Visuals (wait until gltfRoot is loaded so async .GLB never misses tint)
    if (
      this.playerLimbs.gltfRoot &&
      (store.equippedOutfitId !== this.lastEquippedOutfit ||
        store.equippedToolId !== this.lastEquippedTool)
    ) {
      this.lastEquippedOutfit = store.equippedOutfitId;
      this.lastEquippedTool = store.equippedToolId;
      const outfit =
        store.outfits.find((o) => o.id === store.equippedOutfitId) ||
        store.outfits[0];
      tintCharacterOutfit(this.playerLimbs, outfit.shirtColor, outfit.pantsColor, outfit.id);
      updateWeaponAttachment(this.playerLimbs.weaponMesh, store.equippedToolId);
    }

    // Always keep Dhaka lighting, traffic, Metro Rail & NPCs alive in every phase
    this.updateEnvironmentLighting(store.timeOfDay, store.weather, dt);
    this.updateTrafficAndPoliceAI(dt, store.wantedLevel);
    this.updateNPCAI(dt);

    if (store.gamePhase === 'playing') {
      this.worldClockTimer += dt;
      if (this.worldClockTimer >= 0.5) {
        store.tickWorldClock(this.worldClockTimer, this.policeNearby);
        this.worldClockTimer = 0;
      }

      if (this.fireCooldown > 0) {
        this.fireCooldown = Math.max(0, this.fireCooldown - dt);
      }
      if (this.meleeComboTimer > 0) {
        this.meleeComboTimer = Math.max(0, this.meleeComboTimer - dt);
      }

      if (store.isWasted) {
        if (this.activeVehicleId) {
          this.exitCurrentVehicle();
        }
        const deadY = this.playerPos.y < -0.1 ? this.playerPos.y : this.playerPos.y + 0.08;
        this.playerLimbs.group.position.set(this.playerPos.x, deadY, this.playerPos.z);
        this.playerLimbs.group.rotation.x = -Math.PI / 2;
        setDeathRagdollPose(this.playerLimbs, 'gunshot', 1.0);
      } else if (store.isBusted) {
        if (this.activeVehicleId) {
          this.exitCurrentVehicle();
        }
        const activeTool = store.tools.find((t) => t.id === store.equippedToolId);
        const wCat = activeTool?.isFirearm ? (activeTool.id === 'pistol_9mm' || activeTool.id === 'smg_uzi' ? 'pistol' : 'rifle') : activeTool?.category === 'local_arm' ? 'melee' : 'fists';
        setCharacterAnimationState(this.playerLimbs, 'idle', dt, 0, false, 1.0, wCat);
        this.playerLimbs.group.position.set(this.playerPos.x, 0, this.playerPos.z);
        this.playerLimbs.group.rotation.x = 0;
      } else if (this.metroRide) {
        this.updateMetroRide(dt);
      } else if (this.activeVehicleId) {
        this.updateDrivenVehicle(dt);
      } else {
        this.updateOnFootPlayer(dt);
        // Support full-auto firing when holding X / J / K / Space with Firearms
        if (
          this.keys.has('KeyX') ||
          this.keys.has('KeyJ') ||
          this.keys.has('KeyK') ||
          (this.isAiming && this.isPointerDragging && this.pointerDragDist < 4)
        ) {
          const activeTool = store.tools.find(
            (t) => t.id === store.equippedToolId
          );
          if (activeTool?.isFirearm && this.fireCooldown <= 0) {
            this.performMeleeAttack();
          }
        }
      }

      this.updateBulletTracersAndFX(dt);
      this.updateShellCasings(dt);
      this.updateMuzzleSmoke(dt);
      this.updateBulletHoles(dt);
      this.updateCashPickups(dt);
      this.updateSkidDecals(dt);
      this.updateBloodDecals(dt);
      this.updateGlassShards(dt);
      this.updateRadiatorSteam(dt);
      this.updateFountainParticles(dt);
      this.updateMissionAndInteractionChecks(dt);
    } else if (!this.activeVehicleId) {
      const activeTool = store.tools.find((t) => t.id === store.equippedToolId);
      const wCat = activeTool?.isFirearm ? (activeTool.id === 'pistol_9mm' || activeTool.id === 'smg_uzi' ? 'pistol' : 'rifle') : activeTool?.category === 'local_arm' ? 'melee' : 'fists';
      setCharacterAnimationState(this.playerLimbs, 'idle', dt, 0, false, 1.0, wCat);
      this.playerLimbs.group.position.copy(this.playerPos);
      this.playerLimbs.group.rotation.y = this.playerRotation;
    }

    // Wind sway for nearby Dhaka tree foliage canopies (throttled for smooth frame pacing)
    if (!this.perfDegraded && this.treeCanopies.length > 0 && this.perfFrameCount % 2 === 0) {
      const isMonsoon = store.weather === 'monsoon_rain';
      const windTime = this.clock.getElapsedTime() * (isMonsoon ? 2.1 : 1.0);
      const windAmp = isMonsoon ? 2.3 : 1.0;
      const px = this.playerPos.x;
      const pz = this.playerPos.z;
      for (let i = 0; i < this.treeCanopies.length; i++) {
        const canopy = this.treeCanopies[i];
        if (Math.abs(canopy.position.x - px) > 55 || Math.abs(canopy.position.z - pz) > 55) {
          continue;
        }
        const phase = i * 0.42;
        canopy.rotation.x = Math.sin(windTime * 1.5 + phase) * 0.024 * windAmp;
        canopy.rotation.z = Math.cos(windTime * 1.2 + phase) * 0.020 * windAmp;
      }
    }

    // Jamuna Future Park Interior Culling, Lights Culling & Ferris Wheel Animation
    const jfpDist = Math.hypot(
      this.playerPos.x - this.jfpCenter.x,
      this.playerPos.z - this.jfpCenter.z
    );
    if (this.jfpInteriorGroup) {
      this.jfpInteriorGroup.visible = jfpDist < 175;
    }
    const jfpLightsActive = jfpDist < 95;
    for (let i = 0; i < this.jfpLights.length; i++) {
      this.jfpLights[i].visible = jfpLightsActive;
    }
    for (let i = 0; i < this.distantPointLights.length; i++) {
      const dl = this.distantPointLights[i];
      dl.light.visible =
        Math.hypot(this.playerPos.x - dl.x, this.playerPos.z - dl.z) < dl.maxDist;
    }
    if (jfpDist < 260 && this.jfpFerrisWheel) {
      this.jfpFerrisWheel.rotation.z += dt * 0.16;
      const wheelRot = this.jfpFerrisWheel.rotation.z;
      for (let i = 0; i < this.jfpFerrisGondolas.length; i++) {
        this.jfpFerrisGondolas[i].rotation.z = -wheelRot;
      }
      if (this.jfpDropCar) {
        const dropWave = Math.pow(0.5 + 0.5 * Math.sin(performance.now() * 0.0014), 2.2);
        this.jfpDropCar.position.y = 17.6 + 2.6 + dropWave * 19.5;
      }
    }
    if (jfpDist < 140 && this.jfpChandelier) {
      this.jfpChandelier.rotation.y += dt * 0.25;
    }
    const insideJfpNow =
      !this.activeVehicleId &&
      !this.metroRide &&
      this.playerPos.x >= this.jfpCenter.x - 55.5 &&
      this.playerPos.x <= this.jfpCenter.x + 55.5 &&
      this.playerPos.z >= this.jfpCenter.z - 35.5 &&
      this.playerPos.z <= this.jfpCenter.z + 35.5;
    if (jfpDist < 140 && this.jfpElevatorCab) {
      const targetCabY =
        insideJfpNow
          ? (this.playerPos.y >= 8.2 ? 10.55 : this.playerPos.y >= 3.2 ? 5.4 : 0.25) + 1.5
          : 5.4 + Math.sin(performance.now() * 0.0009) * 4.8;
      this.jfpElevatorCab.position.y +=
        (targetCabY - this.jfpElevatorCab.position.y) * Math.min(1, dt * 3.5);
    }
    if (insideJfpNow) {
      const floorIdx = this.playerPos.y >= 8.2 ? 2 : this.playerPos.y >= 3.2 ? 1 : 0;
      if (!this.wasInsideJfp) {
        this.wasInsideJfp = true;
        store.enterMall('jamuna_future_park');
        store.setMallFloor(floorIdx);
        store.showBanner({
          titleEn: '🏬 ENTERED JAMUNA FUTURE PARK',
          titleBn: 'যমুনা ফিউচার পার্কে প্রবেশ করেছেন',
          subtitleEn: 'Explore Ground Floor Fashion & Tech, West Escalator -> 1F, East Escalator -> 2F Food Court & Cinema!',
          subtitleBn: 'দোকানগুলোতে ঢুকে [E] চাপুন অথবা চলন্ত সিঁড়ি ও গ্লাস লিফটে ওপরে উঠুন!',
          tone: 'gold',
        });
      } else if (store.mallFloor !== floorIdx) {
        store.setMallFloor(floorIdx);
      }
    } else if (this.wasInsideJfp) {
      this.wasInsideJfp = false;
      store.exitMall();
    }

    this.updateCamera(dt, store.cameraMode);
    if (this.renderer.shadowMap.enabled && this.perfFrameCount % 3 === 0) {
      this.renderer.shadowMap.needsUpdate = true;
    }
    this.renderer.render(this.scene, this.camera);
  };

  private updateBulletTracersAndFX(dt: number) {
    // 1. Update Muzzle PointLight Flash
    if (this.muzzleLight && this.muzzleLight.visible) {
      this.muzzleLightTimer -= dt;
      if (this.muzzleLightTimer <= 0) {
        this.muzzleLight.visible = false;
      }
    }

    // 2. Update 3D Hit Sparks & Explosions
    for (let i = this.hitSparks.length - 1; i >= 0; i--) {
      const sp = this.hitSparks[i];
      sp.life -= dt;
      sp.mesh.scale.multiplyScalar(1 + dt * 6.5);
      (sp.mesh.material as THREE.MeshBasicMaterial).opacity = Math.max(
        0,
        sp.life * 4.2
      );
      if (sp.life <= 0) {
        this.scene.remove(sp.mesh);
        (sp.mesh.material as THREE.Material).dispose();
        this.hitSparks.splice(i, 1);
      }
    }

    // 3. Update 3D Bullet Tracers & Continuous Ballistic Collisions
    const store = useGameStore.getState();
    for (let i = this.bulletTracers.length - 1; i >= 0; i--) {
      const b = this.bulletTracers[i];
      b.life -= dt;
      const prevX = b.mesh.position.x;
      const prevY = b.mesh.position.y;
      const prevZ = b.mesh.position.z;

      const nx = prevX + b.vx * dt;
      const ny = prevY + b.vy * dt;
      const nz = prevZ + b.vz * dt;
      b.mesh.position.set(nx, ny, nz);

      let hitSomething = false;

      // Swept segment vector [prevX, prevZ] -> [nx, nz]
      const segDx = nx - prevX;
      const segDz = nz - prevZ;
      const segLenSq = segDx * segDx + segDz * segDz;

      // 1. Check NPC Hit FIRST with continuous swept-line collision (prevents tunneling through pedestrians)
      for (const npc of this.npcs) {
        if (npc.isDead) continue;
        const npcLimbs = this.npcLimbsMap.get(npc.id);
        const npcY = npcLimbs ? npcLimbs.group.position.y : 0;
        if (Math.abs(ny - (npcY + 1.0)) > 2.2) continue;

        let t = 0;
        if (segLenSq > 0.0001) {
          t = Math.max(
            0,
            Math.min(
              1,
              ((npc.x - prevX) * segDx + (npc.z - prevZ) * segDz) / segLenSq
            )
          );
        }
        const hitX = prevX + t * segDx;
        const hitZ = prevZ + t * segDz;
        const distN = Math.hypot(npc.x - hitX, npc.z - hitZ);

        if (distN < 1.15) {
          hitSomething = true;
          dhakaAudio.playSfx('hit');
          dhakaAudio.playSfx('pain_grunt');
          dhakaAudio.playSfx('bone_crack');
          this.spawnImpactSparks(hitX, npcY + 1.15, hitZ, '#ef4444', 1.85);

          const bDirX = b.vx / 88;
          const bDirZ = b.vz / 88;
          this.spawnDirectionalBloodSpray(hitX, npcY + 1.25, hitZ, bDirX, bDirZ, 30);
          this.spawnBloodDecal(npc.x, npc.z, 1.5, npcY);

          // Ballistic knockback impulse on victim
          npc.x += bDirX * 1.2;
          npc.z += bDirZ * 1.2;

          if (!npc.isStoryNPC) {
            // Lethal gunshot fatality: pedestrians die from gunshot with authentic ragdoll collapse
            npc.health = 0;
            npc.isDead = true;
            npc.aiState = 'dead';
            npc.deathTimer = 0.0;
            npc.deathType = 'gunshot';
            npc.deathVx = bDirX;
            npc.deathVz = bDirZ;
            npc.respawnTimer = npc.isMissionEnemy ? 9999 : 45;
            dhakaAudio.playSfx('death_groan');

            if (npcLimbs) {
              setDeathRagdollPose(npcLimbs, 'gunshot', 0.05);
            }
            this.spawnImpactSparks(npc.x, npcY + 0.3, npc.z, '#b91c1c', 2.5);
            this.spawnCashDrop(npc.x, npc.z, npc.isMissionEnemy ? 450 : Math.floor(Math.random() * 350 + 150));
            if (!npc.isMissionEnemy) {
              store.setWantedLevel(Math.max(2, store.wantedLevel + 1));
            }
            this.alertNearbyPedestrians(npc.x, npc.z, 35);

            store.showBanner({
              titleEn: npc.isMissionEnemy ? 'SYNDICATE ENFORCER NEUTRALIZED!' : 'PEDESTRIAN KILLED BY GUNSHOT!',
              titleBn: npc.isMissionEnemy ? 'সিন্ডিকেট ক্যাডার পরাস্ত!' : 'গুলির আঘাতে পথচারী নিহত!',
              subtitleEn: `${npc.nameEn} fatally shot. DMP Police in pursuit (Wanted ★)!`,
              subtitleBn: `${npc.nameBn} গুলিবিদ্ধ হয়ে মারা গেছে। পুলিশ তল্লাশি শুরু করেছে!`,
              tone: 'red',
            });
          }
          break;
        }
      }

      // 2. Check Vehicle & Driver Hit (3D elevation-aware)
      if (!hitSomething) {
        for (const veh of this.vehicles) {
          if (veh.id === this.activeVehicleId || veh.y < -1.0) continue;
          if (Math.abs(ny - (veh.y + 0.9)) > 2.2) continue;

          let t = 0;
          if (segLenSq > 0.0001) {
            t = Math.max(
              0,
              Math.min(
                1,
                ((veh.x - prevX) * segDx + (veh.z - prevZ) * segDz) / segLenSq
              )
            );
          }
          const hitX = prevX + t * segDx;
          const hitZ = prevZ + t * segDz;
          const distV = Math.hypot(veh.x - hitX, veh.z - hitZ);

          if (distV < 2.2) {
            hitSomething = true;
            dhakaAudio.playSfx('hit');
            this.spawnImpactSparks(hitX, ny, hitZ, '#fb923c', 1.35);
            veh.health = Math.max(0, veh.health - b.damage);

            // Check if vehicle has an active driver (motorcycle rider, rickshaw puller, CNG driver, etc.)
            const vehMesh = this.vehicleMeshes.get(veh.id);
            const driverObj = vehMesh?.getObjectByName('npc_driver');
            if (driverObj) {
              const isOpenVehicle =
                veh.type === 'motorcycle' ||
                veh.type === 'rickshaw' ||
                veh.type === 'cng';
              if (isOpenVehicle || ny > 0.72) {
                // Driver fatally shot!
                vehMesh?.remove(driverObj);
                dhakaAudio.playSfx('pain_grunt');
                this.spawnBloodDecal(veh.x, veh.z, 1.35, veh.y);
                this.spawnImpactSparks(veh.x, veh.y + 0.8, veh.z, '#ef4444', 2.0);

                const deadDriverId = `dead_driver_${Date.now()}_${Math.floor(
                  Math.random() * 1000
                )}`;
                const deadNPC: NPCEntity = {
                  id: deadDriverId,
                  nameEn: `${VEHICLE_STATS[veh.type].nameEn} Driver`,
                  nameBn: `${VEHICLE_STATS[veh.type].nameBn} চালক`,
                  role: 'citizen',
                  x: veh.x,
                  z: veh.z,
                  rotation: veh.rotation,
                  shirtColor: '#991b1b',
                  pantsColor: '#1e293b',
                  dialogueEn: [],
                  dialogueBn: [],
                  aiState: 'dead',
                  walkTargetX: veh.x,
                  walkTargetZ: veh.z,
                  health: 0,
                  isDead: true,
                  respawnTimer: 45,
                };
                this.npcs.push(deadNPC);

                const deadLimbs = createCharacterMesh(
                  '#991b1b',
                  '#1e293b',
                  'citizen',
                  false
                );
                deadLimbs.group.position.set(veh.x, 0.08, veh.z);
                deadLimbs.group.rotation.x = -Math.PI / 2;
                deadLimbs.group.rotation.y = veh.rotation + Math.PI / 2;
                this.scene.add(deadLimbs.group);
                this.npcLimbsMap.set(deadDriverId, deadLimbs);

                this.spawnCashDrop(
                  veh.x,
                  veh.z,
                  Math.floor(Math.random() * 400 + 200)
                );
                veh.speed = 0;
                veh.isParked = true;
                store.setWantedLevel(Math.max(2, store.wantedLevel + 1));
                this.alertNearbyPedestrians(veh.x, veh.z, 35);

                store.showBanner({
                  titleEn: `${VEHICLE_STATS[
                    veh.type
                  ].nameEn.toUpperCase()} DRIVER SHOT DEAD!`,
                  titleBn: `${VEHICLE_STATS[veh.type].nameBn} চালক গুলিবিদ্ধ হয়ে নিহত!`,
                  subtitleEn:
                    'Vehicle halted on roadway. Police alerted (Wanted ★)!',
                  subtitleBn:
                    'চালকবিহীন যানবাহন রাস্তায় থেমে গেছে। পুলিশ সতর্কাবস্থায়!',
                  tone: 'red',
                });
              }
            }

            if (veh.health <= 0) {
              this.explodeVehicle(veh);
            }
            break;
          }
        }
      }

      // 3. Check Building Obstacle Hit (3D elevation-aware)
      if (!hitSomething && this.checkWorldObstacle(nx, nz, 0.2, null, ny)) {
        this.spawnImpactSparks(nx, ny, nz, '#fde047', 0.9);
        this.spawnConcreteDust(nx, ny, nz);
        this.spawnBulletHole(nx, ny, nz);
        if (Math.random() < 0.35) {
          dhakaAudio.playSfx('ricochet');
        }
        hitSomething = true;
      }

      if (hitSomething || b.life <= 0) {
        this.scene.remove(b.mesh);
        this.bulletTracers.splice(i, 1);
      }
    }
  }

  private updateShellCasings(dt: number) {
    for (let i = this.shellCasings.length - 1; i >= 0; i--) {
      const c = this.shellCasings[i];
      c.life -= dt;
      c.vy -= 9.8 * dt;
      c.mesh.position.x += c.vx * dt;
      c.mesh.position.y += c.vy * dt;
      c.mesh.position.z += c.vz * dt;
      c.mesh.rotation.x += c.rx * dt;
      c.mesh.rotation.y += c.ry * dt;
      c.mesh.rotation.z += c.rz * dt;

      const casingFloor = this.getRoadElevation(c.mesh.position.x, c.mesh.position.z, c.mesh.position.y);
      if (c.mesh.position.y <= casingFloor + 0.02) {
        if (!c.bounced) {
          c.mesh.position.y = casingFloor + 0.02;
          c.vy = -c.vy * 0.38;
          c.vx *= 0.55;
          c.vz *= 0.55;
          c.rx *= 0.5;
          c.rz *= 0.5;
          c.bounced = true;
          dhakaAudio.playSfx('casing_drop');
        } else {
          c.mesh.position.y = casingFloor + 0.015;
          c.vy = 0;
          c.vx = 0;
          c.vz = 0;
        }
      }

      if (c.life <= 0) {
        this.scene.remove(c.mesh);
        this.shellCasings.splice(i, 1);
      }
    }
  }

  private updateMuzzleSmoke(dt: number) {
    for (let i = this.muzzleSmokePuffs.length - 1; i >= 0; i--) {
      const sm = this.muzzleSmokePuffs[i];
      sm.life -= dt;
      sm.mesh.position.x += sm.vx * dt;
      sm.mesh.position.y += sm.vy * dt;
      sm.mesh.position.z += sm.vz * dt;
      const progress = 1 - sm.life / sm.maxLife;
      sm.mesh.scale.setScalar(1 + progress * 2.4);
      (sm.mesh.material as THREE.MeshBasicMaterial).opacity = Math.max(
        0,
        (1 - progress) * 0.42
      );

      if (sm.life <= 0) {
        this.scene.remove(sm.mesh);
        (sm.mesh.material as THREE.Material).dispose();
        this.muzzleSmokePuffs.splice(i, 1);
      }
    }
  }

  private updateBulletHoles(dt: number) {
    for (let i = this.bulletHoles.length - 1; i >= 0; i--) {
      const bh = this.bulletHoles[i];
      bh.life -= dt;
      if (bh.life <= 0) {
        this.scene.remove(bh.mesh);
        this.bulletHoles.splice(i, 1);
      }
    }
  }

  private updateCashPickups(dt: number) {
    const store = useGameStore.getState();
    for (let i = this.cashDrops.length - 1; i >= 0; i--) {
      const drop = this.cashDrops[i];
      drop.mesh.rotation.y += dt * 1.5;
      const d = Math.hypot(
        this.playerPos.x - drop.x,
        this.playerPos.z - drop.z
      );
      if (d < 2.6) {
        this.scene.remove(drop.mesh);
        this.cashDrops.splice(i, 1);
        store.addTaka(
          drop.amount,
          'Collected Syndicate Cash Stack',
          'রাস্তা থেকে নগদ টাকার বান্ডিল সংগ্রহ'
        );
        // Bonus ammunition pickup
        store.addAmmo('pistol_9mm', 12);
        store.addAmmo('bd08_rifle', 25);
        store.addAmmo('police_shotgun', 6);
        store.addAmmo('smg_uzi', 24);

        store.showBanner({
          titleEn: `COLLECTED CASH & AMMO (+৳${drop.amount.toLocaleString()})`,
          titleBn: `নগদ টাকা ও অ্যামো সংগ্রহ করেছেন (+৳${drop.amount.toLocaleString()})`,
          subtitleEn: 'Refilled firearms ammunition & Dhaka Wallet.',
          subtitleBn: 'অস্ত্রের গুলি ও মানিব্যাগে অর্থ যোগ হয়েছে।',
          rewardTaka: drop.amount,
          tone: 'gold',
        });
      }
    }
  }

  private updateSkidDecals(dt: number) {
    for (let i = this.skidDecals.length - 1; i >= 0; i--) {
      const sd = this.skidDecals[i];
      sd.life -= dt;
      (sd.mesh.material as THREE.MeshBasicMaterial).opacity = Math.max(
        0,
        sd.life * 0.065
      );
      if (sd.life <= 0) {
        this.scene.remove(sd.mesh);
        (sd.mesh.material as THREE.Material).dispose();
        this.skidDecals.splice(i, 1);
      }
    }
  }

  private updateBloodDecals(dt: number) {
    for (let i = this.bloodDecals.length - 1; i >= 0; i--) {
      const bd = this.bloodDecals[i];
      bd.life -= dt;
      // Smoothly expand blood pool from 0.18 to full targetRadius over 1.4s
      if (bd.growthProgress < 1.0) {
        bd.growthProgress = Math.min(1.0, bd.growthProgress + dt * 0.85);
        const s = (0.18 + 0.82 * Math.sin((bd.growthProgress * Math.PI) / 2)) * bd.targetRadius;
        bd.mesh.scale.set(s, s, s);
      }
      if (bd.life < 10) {
        (bd.mesh.material as THREE.MeshBasicMaterial).opacity = Math.max(
          0,
          (bd.life / 10) * 0.88
        );
      }
      if (bd.life <= 0) {
        this.scene.remove(bd.mesh);
        (bd.mesh.material as THREE.Material).dispose();
        this.bloodDecals.splice(i, 1);
      }
    }

    // Update arterial spray droplets
    for (let i = this.bloodParticles.length - 1; i >= 0; i--) {
      const p = this.bloodParticles[i];
      p.life += dt;
      if (p.life >= p.maxLife) {
        this.scene.remove(p.mesh);
        this.bloodParticles.splice(i, 1);
        continue;
      }
      p.vy -= 18.0 * dt; // Gravity
      p.mesh.position.x += p.vx * dt;
      p.mesh.position.y += p.vy * dt;
      p.mesh.position.z += p.vz * dt;

      // Splatter onto asphalt
      if (p.mesh.position.y <= 0.086) {
        p.mesh.position.y = 0.086;
        p.vx = 0;
        p.vz = 0;
        p.vy = 0;
      }
    }
  }

  private updateGlassShards(dt: number) {
    for (let i = this.glassShards.length - 1; i >= 0; i--) {
      const gs = this.glassShards[i];
      gs.life -= dt;
      gs.vy -= 18.0 * dt; // Gravity
      gs.mesh.position.x += gs.vx * dt;
      gs.mesh.position.y += gs.vy * dt;
      gs.mesh.position.z += gs.vz * dt;
      gs.mesh.rotation.x += dt * 8;
      gs.mesh.rotation.y += dt * 6;

      const glassFloor = this.getRoadElevation(gs.mesh.position.x, gs.mesh.position.z, gs.mesh.position.y);
      if (gs.mesh.position.y <= glassFloor + 0.08) {
        gs.mesh.position.y = glassFloor + 0.085;
        gs.vy = -gs.vy * 0.3;
        gs.vx *= 0.55;
        gs.vz *= 0.55;
      }

      if (gs.life < 0.6) {
        (gs.mesh.material as THREE.MeshStandardMaterial).opacity = Math.max(
          0,
          (gs.life / 0.6) * 0.88
        );
      }

      if (gs.life <= 0) {
        this.scene.remove(gs.mesh);
        (gs.mesh.material as THREE.Material).dispose();
        this.glassShards.splice(i, 1);
      }
    }
  }

  private updateRadiatorSteam(dt: number) {
    for (let i = this.radiatorSteam.length - 1; i >= 0; i--) {
      const rs = this.radiatorSteam[i];
      rs.life -= dt;
      rs.mesh.position.y += rs.vy * dt;
      rs.mesh.position.x += (Math.random() - 0.5) * dt * 0.8;
      rs.mesh.position.z += (Math.random() - 0.5) * dt * 0.8;
      const progress = 1 - rs.life / rs.maxLife;
      rs.mesh.scale.setScalar(1 + progress * 2.5);
      (rs.mesh.material as THREE.MeshBasicMaterial).opacity = Math.max(
        0,
        (rs.life / rs.maxLife) * 0.6
      );
      if (rs.life <= 0) {
        this.scene.remove(rs.mesh);
        (rs.mesh.material as THREE.Material).dispose();
        this.radiatorSteam.splice(i, 1);
      }
    }
  }

  private createFountainSpraySystem(
    centerX: number,
    poolY: number,
    centerZ: number,
    nozzles: number,
    radius: number,
    sprayHeight: number
  ) {
    const dropsPerNozzle = 28;
    const count = nozzles * dropsPerNozzle + 40;
    const geom = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const velocities = new Float32Array(count * 3);
    const origins = new Float32Array(count * 3);

    let ptr = 0;
    for (let n = 0; n < nozzles; n++) {
      const angle = (n * Math.PI * 2) / nozzles;
      const nx = centerX + Math.cos(angle) * radius;
      const nz = centerZ + Math.sin(angle) * radius;
      const vxBase = -Math.cos(angle) * 2.2;
      const vzBase = -Math.sin(angle) * 2.2;

      for (let d = 0; d < dropsPerNozzle; d++) {
        const spread = (Math.random() - 0.5) * 0.12;
        const ox = nx + spread;
        const oy = poolY + 0.1;
        const oz = nz + spread;
        origins[ptr * 3] = ox;
        origins[ptr * 3 + 1] = oy;
        origins[ptr * 3 + 2] = oz;

        const frac = d / dropsPerNozzle;
        const vy = (sprayHeight * 1.6 + Math.random() * 0.8) * (1 - frac * 0.5);
        velocities[ptr * 3] = vxBase + (Math.random() - 0.5) * 0.4;
        velocities[ptr * 3 + 1] = vy;
        velocities[ptr * 3 + 2] = vzBase + (Math.random() - 0.5) * 0.4;

        positions[ptr * 3] = ox + velocities[ptr * 3] * frac * 0.6;
        positions[ptr * 3 + 1] = oy + vy * frac * 0.6 - 0.5 * 9.8 * (frac * 0.6) ** 2;
        positions[ptr * 3 + 2] = oz + velocities[ptr * 3 + 2] * frac * 0.6;
        ptr++;
      }
    }

    // High vertical center geyser
    for (let c = 0; c < 40; c++) {
      const ox = centerX + (Math.random() - 0.5) * 0.25;
      const oy = poolY + 0.15;
      const oz = centerZ + (Math.random() - 0.5) * 0.25;
      origins[ptr * 3] = ox;
      origins[ptr * 3 + 1] = oy;
      origins[ptr * 3 + 2] = oz;

      const frac = c / 40;
      const vy = sprayHeight * 1.9 + Math.random() * 0.9;
      velocities[ptr * 3] = (Math.random() - 0.5) * 0.7;
      velocities[ptr * 3 + 1] = vy;
      velocities[ptr * 3 + 2] = (Math.random() - 0.5) * 0.7;

      positions[ptr * 3] = ox;
      positions[ptr * 3 + 1] = oy + vy * frac * 0.7 - 0.5 * 9.8 * (frac * 0.7) ** 2;
      positions[ptr * 3 + 2] = oz;
      ptr++;
    }

    geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const mat = new THREE.PointsMaterial({
      color: '#bae6fd',
      size: 0.38,
      map: createFountainWaterDropTexture(),
      transparent: true,
      opacity: 0.75,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    const points = new THREE.Points(geom, mat);
    this.scene.add(points);

    this.fountainParticles.push({
      points,
      velocities,
      origins,
      count,
      poolY,
    });
  }

  private updateFountainParticles(dt: number) {
    const gravity = 9.8;
    for (const f of this.fountainParticles) {
      // Distance culling: skip fountain simulation and GPU buffer upload if player is far away
      if (Math.hypot(f.points.position.x - this.playerPos.x, f.points.position.z - this.playerPos.z) > 130) {
        continue;
      }
      const posAttr = f.points.geometry.attributes.position as THREE.BufferAttribute;
      const pos = posAttr.array as Float32Array;
      const vel = f.velocities;
      const orig = f.origins;

      for (let i = 0; i < f.count; i++) {
        const i3 = i * 3;
        vel[i3 + 1] -= gravity * dt;
        pos[i3] += vel[i3] * dt;
        pos[i3 + 1] += vel[i3 + 1] * dt;
        pos[i3 + 2] += vel[i3 + 2] * dt;

        if (pos[i3 + 1] <= f.poolY) {
          pos[i3] = orig[i3];
          pos[i3 + 1] = orig[i3 + 1];
          pos[i3 + 2] = orig[i3 + 2];
          const isCenter = i >= f.count - 40;
          if (isCenter) {
            vel[i3] = (Math.random() - 0.5) * 0.7;
            vel[i3 + 1] = 6.2 + Math.random() * 2.2;
            vel[i3 + 2] = (Math.random() - 0.5) * 0.7;
          } else {
            const dx = orig[i3] - f.points.position.x;
            const dz = orig[i3 + 2] - f.points.position.z;
            const dist = Math.sqrt(dx * dx + dz * dz) || 1;
            vel[i3] = (-dx / dist) * (1.8 + Math.random() * 0.6);
            vel[i3 + 1] = 4.8 + Math.random() * 1.5;
            vel[i3 + 2] = (-dz / dist) * (1.8 + Math.random() * 0.6);
          }
        }
      }
      posAttr.needsUpdate = true;
    }
  }

  private updateEnvironmentLighting(
    hour: number,
    weather: string,
    dt: number
  ) {
    const isNight = hour < 5.8 || hour > 19.2 || weather === 'night';
    const isGolden =
      (hour >= 16.0 && hour <= 18.8) || weather === 'golden_hour';
    const isRain = weather === 'monsoon_rain';

    let targetSky = DhakaCityEngine.SKY_DAY;
    let sunIntensity = 1.55;
    let ambIntensity = 0.72;

    if (isNight) {
      targetSky = DhakaCityEngine.SKY_NIGHT;
      // Moonlight plus warm sodium street lighting
      sunIntensity = 0.12;
      ambIntensity = 0.34;
    } else if (isRain) {
      targetSky = DhakaCityEngine.SKY_RAIN;
      sunIntensity = 0.6;
      ambIntensity = 0.52;
    } else if (isGolden) {
      targetSky = DhakaCityEngine.SKY_GOLDEN;
      sunIntensity = 1.35;
      ambIntensity = 0.68;
    }

    (this.scene.background as THREE.Color).lerp(targetSky, dt * 2.5);
    if (this.scene.fog instanceof THREE.FogExp2) {
      this.scene.fog.color.lerp(targetSky, dt * 2.5);
      this.scene.fog.density = isRain ? 0.0046 : 0.0019;
    }



    // Dynamic Aviation Hazard Beacon Pulse atop Tall Dhaka Skyline Towers
    if (this.aviationBeacons.length > 0) {
      const showBeacons = isNight || isGolden;
      const beaconBlink = Math.sin(this.clock.getElapsedTime() * 3.8) > 0.2;
      for (let i = 0; i < this.aviationBeacons.length; i++) {
        this.aviationBeacons[i].visible = showBeacons && beaconBlink;
      }
    }

    // Animate water normal ripples
    if (this.waterNormalTex) {
      this.waterNormalTex.offset.x += dt * 0.04;
      this.waterNormalTex.offset.y += dt * 0.025;
    }

    // Real solar arc: the sun rises in the east, peaks at noon and sets in the
    // west, so shadows sweep across the city instead of staying frozen.
    const dayT = THREE.MathUtils.clamp((hour - 6) / 12, 0, 1); // 0=6am, 1=6pm
    const elevation = Math.sin(dayT * Math.PI); // 1 at noon
    const azimuth = Math.PI * (0.15 + dayT * 0.7);
    const radius = 210;
    const sunHeight = isNight ? 24 : 40 + elevation * 170;
    this.sunLight.target.position.set(this.playerPos.x, 0, this.playerPos.z);
    this.sunLight.position.set(
      this.playerPos.x + Math.cos(azimuth) * radius,
      sunHeight,
      this.playerPos.z + Math.sin(azimuth) * radius * 0.75
    );
    this.sunLight.color.set(
      isNight ? '#93b4e8' : isGolden ? '#fb923c' : isRain ? '#94a3b8' : '#fff7d6'
    );
    // Throttle heavy Sky/Material/Streetlamp uniform loops (~10 Hz instead of 60-144 Hz)
    this.envLightTimer += dt;
    if (this.envLightTimer >= 0.1) {
      const envDt = this.envLightTimer;
      this.envLightTimer = 0;

      if (this.sky) {
        const skyUniforms = this.sky.material.uniforms;
        if (isGolden) {
          skyUniforms['turbidity'].value = 8.5;
          skyUniforms['rayleigh'].value = 3.4;
          skyUniforms['mieCoefficient'].value = 0.006;
          skyUniforms['mieDirectionalG'].value = 0.82;
        } else if (isNight) {
          skyUniforms['turbidity'].value = 10.0;
          skyUniforms['rayleigh'].value = 0.35;
          skyUniforms['mieCoefficient'].value = 0.002;
          skyUniforms['mieDirectionalG'].value = 0.7;
        } else {
          skyUniforms['turbidity'].value = 4.2;
          skyUniforms['rayleigh'].value = 1.35;
          skyUniforms['mieCoefficient'].value = 0.003;
          skyUniforms['mieDirectionalG'].value = 0.8;
        }

        const sunPhi = THREE.MathUtils.degToRad(isNight ? 102 : 90 - (sunHeight / 210) * 85);
        const sunTheta = azimuth;
        this.sunPosition.setFromSphericalCoords(1, sunPhi, sunTheta);
        skyUniforms['sunPosition'].value.copy(this.sunPosition);
        this.sky.position.copy(this.playerPos);
      }

      if (this.starField) {
        this.starField.position.copy(this.playerPos);
        const starTarget = isNight ? 0.92 : 0;
        const sMat = this.starField.material as THREE.PointsMaterial;
        sMat.opacity = THREE.MathUtils.lerp(sMat.opacity, starTarget, envDt * 2.5);
        sMat.visible = sMat.opacity > 0.01;
      }

      const nightWindowGlow = isNight ? 1.55 : isGolden ? 0.65 : 0.0;
      for (let i = 0; i < this.buildingEmissiveMats.length; i++) {
        this.buildingEmissiveMats[i].emissiveIntensity = THREE.MathUtils.lerp(
          this.buildingEmissiveMats[i].emissiveIntensity,
          nightWindowGlow,
          envDt * 2.8
        );
      }
      const lampLit = isNight || isRain || isGolden;
      const stdLampIntensity = isNight ? 1.45 : isRain ? 1.05 : isGolden ? 0.75 : 0.06;
      for (let i = 0; i < this.streetLampStdMats.length; i++) {
        this.streetLampStdMats[i].emissiveIntensity = THREE.MathUtils.lerp(
          this.streetLampStdMats[i].emissiveIntensity,
          stdLampIntensity,
          envDt * 3.0
        );
      }
      for (let i = 0; i < this.streetLampBasicMats.length; i++) {
        this.streetLampBasicMats[i].color.set(lampLit ? '#fef08a' : '#475569');
      }
      const hatirTargetIntensity = isNight ? 2.8 : isRain || isGolden ? 1.6 : 0;
      for (let i = 0; i < this.hatirjheelLights.length; i++) {
        this.hatirjheelLights[i].intensity = hatirTargetIntensity;
      }

      if (this.signalMaterials) {
        const sigCycle = (performance.now() * 0.001) % 16;
        const nsGreen = sigCycle < 7.0;
        const nsYellow = sigCycle >= 7.0 && sigCycle < 8.0;
        const ewGreen = sigCycle >= 8.0 && sigCycle < 15.0;
        const ewYellow = sigCycle >= 15.0;
        this.signalMaterials.nsGreen.color.set(nsGreen ? '#22c55e' : '#14532d');
        this.signalMaterials.nsYellow.color.set(nsYellow ? '#facc15' : '#422006');
        this.signalMaterials.nsRed.color.set(!nsGreen && !nsYellow ? '#ef4444' : '#450a0a');
        this.signalMaterials.ewGreen.color.set(ewGreen ? '#22c55e' : '#14532d');
        this.signalMaterials.ewYellow.color.set(ewYellow ? '#facc15' : '#422006');
        this.signalMaterials.ewRed.color.set(!ewGreen && !ewYellow ? '#ef4444' : '#450a0a');
      }
    }

    // Lift the shadow floor at night so wet asphalt keeps some detail instead
    // of crushing to pure black under ACES tone mapping.
    const targetExposure = isNight ? 1.38 : isGolden ? 1.24 : 1.18;
    this.renderer.toneMappingExposure = THREE.MathUtils.lerp(
      this.renderer.toneMappingExposure,
      targetExposure,
      dt * 3
    );

    this.sunLight.intensity = THREE.MathUtils.lerp(
      this.sunLight.intensity,
      sunIntensity,
      dt * (isNight ? 5 : 3)
    );
    this.ambientLight.color.set(
      isNight ? '#ffd9a0' : isGolden ? '#ffe4c4' : '#fffbeb'
    );
    this.ambientLight.intensity = THREE.MathUtils.lerp(
      this.ambientLight.intensity,
      ambIntensity,
      dt * 3
    );

    if (this.groundRoadMat) {
      const targetRough = isRain ? 0.24 : 0.88;
      const targetMetal = isRain ? 0.34 : 0.08;
      this.groundRoadMat.roughness = THREE.MathUtils.lerp(this.groundRoadMat.roughness, targetRough, dt * 2.0);
      this.groundRoadMat.metalness = THREE.MathUtils.lerp(this.groundRoadMat.metalness, targetMetal, dt * 2.0);
    }

    if (isRain) {
      this.lightningTimer -= dt;
      if (this.lightningTimer <= 0) {
        this.lightningTimer = 7.5 + Math.random() * 11;
        this.sunLight.intensity = 4.2;
        this.ambientLight.intensity = 1.65;
        dhakaAudio.playSfx('thunder');
      }
    }

    const insideJfpNow =
      useGameStore.getState().isInsideMall ||
      (this.playerPos.x >= this.jfpCenter.x - 56 &&
        this.playerPos.x <= this.jfpCenter.x + 56 &&
        this.playerPos.z >= this.jfpCenter.z - 36 &&
        this.playerPos.z <= this.jfpCenter.z + 36);

    if (this.heliSearchLight) {
      const wantedNow = useGameStore.getState().wantedLevel;
      const showHeliBeam = wantedNow >= 4 && !insideJfpNow;
      this.heliSearchLight.intensity = showHeliBeam ? 5.5 : 0;
      if (showHeliBeam) {
        const st = performance.now() * 0.0012;
        this.heliSearchLight.position.set(
          this.playerPos.x + Math.cos(st) * 18,
          44,
          this.playerPos.z + Math.sin(st) * 18
        );
        this.heliSearchTarget.position.set(
          this.playerPos.x + Math.sin(st * 1.9) * 5,
          this.playerPos.y,
          this.playerPos.z + Math.cos(st * 1.9) * 5
        );
      }
    }

    dhakaAudio.setRainActive(isRain && !insideJfpNow);

    if (this.rainSystem) {
      this.rainSystem.visible = isRain && !insideJfpNow;
      if (isRain && !insideJfpNow) {
        this.rainSystem.position.set(this.playerPos.x, 0, this.playerPos.z);
        const posAttr = this.rainSystem.geometry.getAttribute(
          'position'
        ) as THREE.BufferAttribute;
        const arr = posAttr.array as Float32Array;
        const dy = 42 * dt;
        for (let i = 1; i < arr.length; i += 3) {
          let y = arr[i] - dy;
          if (y < 0) y = 52;
          arr[i] = y;
        }
        posAttr.needsUpdate = true;
      }
    }

    const t = performance.now() * 0.0015;
    const waveScale = isRain ? 1.8 : 1.0;
    this.launchBoats.forEach((b, idx) => {
      b.position.y = 0.2 + Math.sin(t * waveScale + idx) * (0.14 * waveScale);
      b.rotation.z = Math.sin(t * 0.8 * waveScale + idx) * (0.018 * waveScale);
      if (idx % 2 === 0) {
        const patrolSpan = Math.sin(t * 0.08 + idx * 1.4);
        const dir = Math.cos(t * 0.08 + idx * 1.4);
        b.position.x = patrolSpan * 280;
        b.position.z = 355 + idx * 8;
        b.rotation.y = dir >= 0 ? Math.PI / 2 : -Math.PI / 2;
      }
    });

    // Animate MRT Line-6 Dhaka Metro Rail gliding overhead between Uttara Diabari & Kamalapur
    const px = this.playerPos.x;
    const pz = this.playerPos.z;
    if (this.metroTrainGroup) {
      const trainSpeed = Math.cos(t * 0.05);
      // Sweeps smoothly between Z = -1180 (Uttara Diabari) and Z = +440 (Kamalapur)
      this.metroTrainGroup.position.z = -370 + Math.sin(t * 0.05) * 810;
      this.metroTrainGroup.rotation.y = trainSpeed >= 0 ? 0 : Math.PI;
      this.metroTrainGroup.visible = Math.abs(this.metroTrainGroup.position.z - pz) < 320 && Math.abs(px - (-13.3)) < 260;
    }
    if (this.metroTrainGroup2) {
      const trainSpeed2 = Math.cos(t * 0.05 + Math.PI);
      this.metroTrainGroup2.position.z = -370 + Math.sin(t * 0.05 + Math.PI) * 810;
      this.metroTrainGroup2.rotation.y = trainSpeed2 >= 0 ? 0 : Math.PI;
      this.metroTrainGroup2.visible = Math.abs(this.metroTrainGroup2.position.z - pz) < 320 && Math.abs(px - (-11.1)) < 260;
    }

    // Animate MRT Line-5 Northern Route trains gliding East-West at Y = 17.5m along Z = -198
    if (this.metroTrainLine5East) {
      const line5SpeedEast = Math.cos(t * 0.055);
      // Sweeps smoothly between X = -420 (Mirpur West) and X = +580 (Purbachal Smart City)
      this.metroTrainLine5East.position.x = 80 + Math.sin(t * 0.055) * 500;
      this.metroTrainLine5East.rotation.y = line5SpeedEast >= 0 ? -Math.PI / 2 : Math.PI / 2;
      this.metroTrainLine5East.visible = Math.abs(this.metroTrainLine5East.position.x - px) < 320 && Math.abs(pz - (-199.2)) < 260;
    }
    if (this.metroTrainLine5West) {
      const line5SpeedWest = Math.cos(t * 0.055 + Math.PI);
      this.metroTrainLine5West.position.x = 80 + Math.sin(t * 0.055 + Math.PI) * 500;
      this.metroTrainLine5West.rotation.y = line5SpeedWest >= 0 ? -Math.PI / 2 : Math.PI / 2;
      this.metroTrainLine5West.visible = Math.abs(this.metroTrainLine5West.position.x - px) < 320 && Math.abs(pz - (-196.8)) < 260;
    }

    // Pulse nearby street-level MRT Boarding Portal Rings for instant visibility
    if (this.metroPortalRings.length > 0) {
      const pulse = 1 + Math.sin(t * 3.2) * 0.08;
      for (let i = 0; i < this.metroPortalRings.length; i++) {
        const ring = this.metroPortalRings[i];
        if (Math.abs(ring.position.x - px) < 90 && Math.abs(ring.position.z - pz) < 90) {
          ring.scale.set(pulse, pulse, 1);
        }
      }
    }

    // Play authentic Japanese 4-tone arrival chime when near stations or passing trains
    this.metroChimeTimer += 0.016;
    if (this.metroChimeTimer > 28) {
      const distToLine6 = Math.abs(this.playerPos.x - (-12.2));
      const distToLine5 = Math.abs(this.playerPos.z - (-198));
      if (distToLine6 < 45 || distToLine5 < 45) {
        dhakaAudio.playSfx('metro_chime');
        this.metroChimeTimer = 0;
      }
    }
  }

  private findNearestEnterableVehicle(maxDist: number): VehicleEntity | null {
    let closestVeh: VehicleEntity | null = null;
    let bestDist = maxDist;
    for (const v of this.vehicles) {
      if (v.health <= 0 || v.y < -1.0) continue;
      if (Math.abs(v.y - this.playerPos.y) > 2.6 && !(v.type === 'boat' && this.isSwimming)) continue;
      const d = Math.hypot(v.x - this.playerPos.x, v.z - this.playerPos.z);
      if (d < bestDist) {
        bestDist = d;
        closestVeh = v;
      }
    }
    return closestVeh;
  }

  private findNearbyMetroStation() {
    const px = this.playerPos.x;
    const pz = this.playerPos.z;
    for (const st of METRO_STATIONS) {
      const kx = st.kioskX ?? st.x;
      const kz = st.kioskZ ?? st.z;
      if (Math.hypot(kx - px, kz - pz) < 12.5) return st;
      if (Math.hypot(st.x - px, st.z - pz) < 14.5) return st;
      if (st.line === 'L6' && px >= -25.5 && px <= -2.5 && Math.abs(pz - st.z) <= 34) return st;
      if (st.line === 'L5' && pz >= -214 && pz <= -189 && Math.abs(px - st.x) <= 34) return st;
    }
    return null;
  }

  private startMetroRide(fromId: string, toId: string) {
    const fromSt = METRO_STATIONS.find((s) => s.id === fromId);
    const toSt = METRO_STATIONS.find((s) => s.id === toId);
    if (!fromSt || !toSt || fromSt.id === toSt.id) return;

    if (this.activeVehicleId) {
      this.exitCurrentVehicle();
    }
    this.isSwimming = false;
    this.isCrouching = false;
    this.isAiming = false;
    this.playerVelY = 0;
    this.playerLimbs.group.visible = false;

    const segments: Array<{
      line: 'L6' | 'L5';
      startX: number;
      startZ: number;
      endX: number;
      endZ: number;
      y: number;
      yaw: number;
      length: number;
    }> = [];

    const pushL6Seg = (z1: number, z2: number) => {
      const len = Math.abs(z2 - z1);
      if (len < 0.5) return;
      const southbound = z2 > z1;
      const trackX = southbound ? -13.3 : -11.1;
      const yaw = southbound ? Math.PI : 0;
      segments.push({ line: 'L6', startX: trackX, startZ: z1, endX: trackX, endZ: z2, y: 13.2, yaw, length: len });
    };

    const pushL5Seg = (x1: number, x2: number) => {
      const len = Math.abs(x2 - x1);
      if (len < 0.5) return;
      const eastbound = x2 > x1;
      const trackZ = eastbound ? -199.2 : -196.8;
      const yaw = eastbound ? -Math.PI / 2 : Math.PI / 2;
      segments.push({ line: 'L5', startX: x1, startZ: trackZ, endX: x2, endZ: trackZ, y: 17.48, yaw, length: len });
    };

    if (fromSt.line === 'L6' && toSt.line === 'L6') {
      pushL6Seg(fromSt.z, toSt.z);
    } else if (fromSt.line === 'L5' && toSt.line === 'L5') {
      pushL5Seg(fromSt.x, toSt.x);
    } else if (fromSt.line === 'L6' && toSt.line === 'L5') {
      pushL6Seg(fromSt.z, -198);
      pushL5Seg(-12.2, toSt.x);
    } else {
      pushL5Seg(fromSt.x, -12.2);
      pushL6Seg(-198, toSt.z);
    }

    if (segments.length === 0) {
      this.playerLimbs.group.visible = true;
      return;
    }

    const totalDist = segments.reduce((acc, s) => acc + s.length, 0);
    const first = segments[0];
    this.metroRide = {
      segments,
      segIdx: 0,
      segDist: 0,
      totalDist,
      coveredDist: 0,
      speed: 6.0,
      fromId: fromSt.id,
      toId: toSt.id,
      fromNameEn: fromSt.nameEn,
      fromNameBn: fromSt.nameBn,
      toNameEn: toSt.nameEn,
      toNameBn: toSt.nameBn,
      toX: toSt.kioskX ?? toSt.x,
      toZ: toSt.kioskZ ?? toSt.z,
      lastHudSync: 0,
    };

    this.playerPos.set(first.startX, first.y + 2.4, first.startZ);
    this.currentCameraDist = 21;
    this.cameraYaw = first.yaw + 0.55;
    this.cameraPitch = Math.max(0.24, this.cameraPitch);

    dhakaAudio.playSfx('metro_chime');
    useGameStore.getState().setActiveMetroRide({
      line: first.line,
      fromNameEn: fromSt.nameEn,
      fromNameBn: fromSt.nameBn,
      toNameEn: toSt.nameEn,
      toNameBn: toSt.nameBn,
      progress: 0,
      speedKmh: 22,
      isTransferring: segments.length > 1,
    });
  }

  private updateMetroRide(dt: number) {
    const ride = this.metroRide;
    if (!ride) return;

    const remainingTotal = Math.max(0, ride.totalDist - ride.coveredDist);
    const targetSpeed = remainingTotal < 65 ? Math.max(6.0, (remainingTotal / 65) * 32) : 32;
    ride.speed += (targetSpeed - ride.speed) * Math.min(1, dt * 2.2);

    const step = ride.speed * dt;
    ride.segDist += step;
    ride.coveredDist = Math.min(ride.totalDist, ride.coveredDist + step);

    while (ride.segIdx < ride.segments.length && ride.segDist >= ride.segments[ride.segIdx].length) {
      ride.segDist -= ride.segments[ride.segIdx].length;
      ride.segIdx++;
      if (ride.segIdx < ride.segments.length) {
        dhakaAudio.playSfx('metro_chime');
        this.cameraYaw = ride.segments[ride.segIdx].yaw + 0.55;
      }
    }

    if (ride.segIdx >= ride.segments.length) {
      this.finishMetroRide();
      return;
    }

    const seg = ride.segments[ride.segIdx];
    const t = Math.max(0, Math.min(1, ride.segDist / Math.max(0.01, seg.length)));
    const curX = seg.startX + (seg.endX - seg.startX) * t;
    const curZ = seg.startZ + (seg.endZ - seg.startZ) * t;

    if (this.playerMetroTrainL6 && this.playerMetroTrainL5) {
      const activeTrain = seg.line === 'L6' ? this.playerMetroTrainL6 : this.playerMetroTrainL5;
      const inactiveTrain = seg.line === 'L6' ? this.playerMetroTrainL5 : this.playerMetroTrainL6;
      inactiveTrain.visible = false;
      activeTrain.visible = true;
      activeTrain.position.set(curX, seg.y, curZ);
      activeTrain.rotation.y = seg.yaw;
    }

    this.playerPos.set(curX, seg.y + 2.4, curZ);
    this.playerLimbs.group.position.set(curX, seg.y + 1.0, curZ);

    const now = performance.now();
    if (now - ride.lastHudSync > 85) {
      ride.lastHudSync = now;
      useGameStore.getState().setActiveMetroRide({
        line: seg.line,
        fromNameEn: ride.fromNameEn,
        fromNameBn: ride.fromNameBn,
        toNameEn: ride.toNameEn,
        toNameBn: ride.toNameBn,
        progress: Math.min(1, ride.coveredDist / Math.max(1, ride.totalDist)),
        speedKmh: Math.round(ride.speed * 3.1),
        isTransferring: ride.segments.length > 1 && ride.segIdx === 0,
      });
    }
  }

  private finishMetroRide() {
    const ride = this.metroRide;
    if (!ride) return;

    if (this.playerMetroTrainL6) this.playerMetroTrainL6.visible = false;
    if (this.playerMetroTrainL5) this.playerMetroTrainL5.visible = false;

    const elev = this.getRoadElevation(ride.toX, ride.toZ, 0);
    this.playerPos.set(ride.toX, elev, ride.toZ);
    this.playerLimbs.group.visible = true;
    this.playerLimbs.group.position.set(ride.toX, elev, ride.toZ);
    this.playerLimbs.group.rotation.set(0, this.playerRotation, 0);
    this.isGrounded = true;
    this.isSwimming = false;
    this.playerVelY = 0;
    this.playerStamina = 100;
    this.currentCameraDist = 6.2;

    const { toNameEn, toNameBn, segments } = ride;
    const arrivedLine = segments[segments.length - 1]?.line ?? 'L6';
    this.metroRide = null;

    const store = useGameStore.getState();
    store.setActiveMetroRide(null);
    dhakaAudio.playSfx('metro_chime');
    store.showBanner({
      titleEn: `🚆 ARRIVED: ${toNameEn.toUpperCase()}`,
      titleBn: `🚆 পৌঁছে গেছেন: ${toNameBn}`,
      subtitleEn: `Dhaka Metro Rail (${arrivedLine}) express ride complete.`,
      subtitleBn: 'ঢাকা মেট্রোরেলে এলিভেটেড যাত্রা সম্পন্ন!',
      tone: 'green',
    });
  }

  private updateOnFootPlayer(dt: number) {
    let moveForward = 0;
    let moveRight = 0;

    if (this.keys.has('KeyW') || this.keys.has('ArrowUp')) moveForward += 1;
    if (this.keys.has('KeyS') || this.keys.has('ArrowDown')) moveForward -= 1;
    if (this.keys.has('KeyD') || this.keys.has('ArrowRight')) moveRight += 1;
    if (this.keys.has('KeyA') || this.keys.has('ArrowLeft')) moveRight -= 1;

    const wantsSprint =
      (this.keys.has('ShiftLeft') || this.keys.has('ShiftRight')) &&
      (moveForward !== 0 || moveRight !== 0);
    const isMeher = useGameStore.getState().selectedCharacterId === 'meher';
    const isSprinting = wantsSprint && this.playerStamina > 5;

    if (!this.isSwimming) {
      if (isSprinting) {
        this.playerStamina = Math.max(0, this.playerStamina - (isMeher ? 7.5 : 16) * dt);
      } else {
        this.playerStamina = Math.min(100, this.playerStamina + (isMeher ? 28 : 14) * dt);
      }
    }

    const prevPlayerX = this.playerPos.x;
    const prevPlayerZ = this.playerPos.z;

    const sprintSpeed = isMeher ? 13.0 * 1.15 : 13.0;
    const baseSpeed = this.isSwimming
      ? (isSprinting ? 6.6 : 4.2)
      : this.isCrouching
      ? 4.2
      : isSprinting
      ? sprintSpeed
      : 7.8;
    let targetAnimState: 'idle' | 'walk' | 'run' = 'idle';

    if (moveForward !== 0 || moveRight !== 0) {
      targetAnimState = isSprinting ? 'run' : 'walk';
      const inputAngle = Math.atan2(moveRight, moveForward);
      const targetYaw = this.cameraYaw + Math.PI - inputAngle;

      const diff = normalizeAngle(targetYaw - this.playerRotation);
      this.playerRotation += diff * Math.min(1, dt * 14);

      const vx = Math.sin(this.playerRotation) * baseSpeed * dt;
      const vz = Math.cos(this.playerRotation) * baseSpeed * dt;

      const nextX = this.playerPos.x + vx;
      const nextZ = this.playerPos.z + vz;

      const curElev = this.playerPos.y;
      const elevX = this.getRoadElevation(nextX, this.playerPos.z, curElev);
      const elevZ = this.getRoadElevation(this.playerPos.x, nextZ, curElev);

      // Prevent walking off steep cliffs / elevated decks into empty air (> 2.8m drop) or climbing vertical walls (> 1.35m, or 1.65m when climbing out of water)
      const maxClimb = this.isSwimming ? 1.65 : 1.35;
      const isHighCliffDropX = curElev > 3.5 && curElev - elevX > 2.8;
      const isWallClimbX = elevX - curElev > maxClimb;
      const safeElevX = !isHighCliffDropX && !isWallClimbX;

      const isHighCliffDropZ = curElev > 3.5 && curElev - elevZ > 2.8;
      const isWallClimbZ = elevZ - curElev > maxClimb;
      const safeElevZ = !isHighCliffDropZ && !isWallClimbZ;

      if (safeElevX) {
        this.playerPos.x = clampWorldCoord(nextX);
      }
      if (safeElevZ) {
        this.playerPos.z = clampWorldCoord(nextZ);
      }

      this.walkAnimPhase += dt * (isSprinting ? 15 : 10);

      // Play authentic footstep impact sound on Dhaka asphalt / pavement (or swim strokes in water)
      if (this.isGrounded && !this.isSwimming) {
        this.footstepTimer += dt;
        const stepInterval = isSprinting ? 0.24 : this.isCrouching ? 0.46 : 0.35;
        if (this.footstepTimer >= stepInterval) {
          this.footstepTimer = 0;
          this.footstepRight = !this.footstepRight;
          dhakaAudio.playFootstep(isSprinting ? 'run' : 'walk', this.footstepRight);
          if (
            isSprinting &&
            useGameStore.getState().weather === 'monsoon_rain' &&
            this.playerPos.y < 0.35
          ) {
            this.spawnImpactSparks(this.playerPos.x, 0.05, this.playerPos.z, '#bae6fd', 0.45);
          }
        }
      }
    } else {
      this.walkAnimPhase = 0;
      this.footstepTimer = 0;
    }

    // Resolve any clipping / penetration with obstacle colliders (AABB buildings, medians, flyover barriers, cylinders, and vehicles)
    // Run 2 relaxation passes so tight corners, alleys, and narrow pinches between vehicles/curbs/poles resolve smoothly without sticking
    for (let pass = 0; pass < 2; pass++) {
      const playerY = this.playerPos.y;
      // Ergonomic 0.28m capsule radius fits naturally through alleys, between cars, past railings & curbs
      const pRad = 0.28;

      // 1. AABB Buildings, Wall Dividers & Flyover Barriers (Fast broadphase check)
      for (const b of this.buildingColliders) {
        if (Math.abs(this.playerPos.x - (b.minX + b.maxX) * 0.5) > (b.maxX - b.minX) * 0.5 + 2.0) continue;
        if (Math.abs(this.playerPos.z - (b.minZ + b.maxZ) * 0.5) > (b.maxZ - b.minZ) * 0.5 + 2.0) continue;
        if (b.minY !== undefined && playerY < b.minY - 0.5) continue;
        if (b.maxY !== undefined && playerY > b.maxY + 0.5) continue;

        const clampedX = Math.max(b.minX, Math.min(this.playerPos.x, b.maxX));
        const clampedZ = Math.max(b.minZ, Math.min(this.playerPos.z, b.maxZ));
        const dx = this.playerPos.x - clampedX;
        const dz = this.playerPos.z - clampedZ;
        const distSq = dx * dx + dz * dz;

        if (distSq < pRad * pRad) {
          const thicknessX = b.maxX - b.minX;
          const lengthZ = b.maxZ - b.minZ;
          const isThinX = thicknessX <= lengthZ;

          if (b.tag === 'flyover_barrier') {
            // For flyovers and elevated ramps, resolve strictly towards the valid road surface along the thin axis!
            if (isThinX) {
              const elevEast = this.getRoadElevation(b.maxX + 0.8, this.playerPos.z, playerY);
              const elevWest = this.getRoadElevation(b.minX - 0.8, this.playerPos.z, playerY);
              if (playerY > 2.0) {
                if (elevEast > 2.0 && elevWest < 1.0) {
                  this.playerPos.x = b.maxX + pRad + 0.04;
                  continue;
                } else if (elevWest > 2.0 && elevEast < 1.0) {
                  this.playerPos.x = b.minX - (pRad + 0.04);
                  continue;
                }
              }
              const dWest = Math.abs(this.playerPos.x - b.minX);
              const dEast = Math.abs(this.playerPos.x - b.maxX);
              if (dWest <= dEast) {
                this.playerPos.x = b.minX - (pRad + 0.04);
              } else {
                this.playerPos.x = b.maxX + pRad + 0.04;
              }
              continue;
            } else {
              const elevSouth = this.getRoadElevation(this.playerPos.x, b.maxZ + 0.8, playerY);
              const elevNorth = this.getRoadElevation(this.playerPos.x, b.minZ - 0.8, playerY);
              if (playerY > 2.0) {
                if (elevSouth > 2.0 && elevNorth < 1.0) {
                  this.playerPos.z = b.maxZ + pRad + 0.04;
                  continue;
                } else if (elevNorth > 2.0 && elevSouth < 1.0) {
                  this.playerPos.z = b.minZ - (pRad + 0.04);
                  continue;
                }
              }
              const dNorth = Math.abs(this.playerPos.z - b.minZ);
              const dSouth = Math.abs(this.playerPos.z - b.maxZ);
              if (dNorth <= dSouth) {
                this.playerPos.z = b.minZ - (pRad + 0.04);
              } else {
                this.playerPos.z = b.maxZ + pRad + 0.04;
              }
              continue;
            }
          } else if (b.tag === 'road_median') {
            const dWest = Math.abs(this.playerPos.x - b.minX);
            const dEast = Math.abs(this.playerPos.x - b.maxX);
            if (dWest <= dEast) {
              this.playerPos.x = b.minX - (pRad + 0.04);
            } else {
              this.playerPos.x = b.maxX + (pRad + 0.04);
            }
            continue;
          }

          if (distSq > 0.0001) {
            const dist = Math.sqrt(distSq);
            const push = pRad - dist + 0.03;
            this.playerPos.x += (dx / dist) * push;
            this.playerPos.z += (dz / dist) * push;
          } else {
            const dMinX = this.playerPos.x - b.minX;
            const dMaxX = b.maxX - this.playerPos.x;
            const dMinZ = this.playerPos.z - b.minZ;
            const dMaxZ = b.maxZ - this.playerPos.z;
            const minPen = Math.min(dMinX, dMaxX, dMinZ, dMaxZ);
            if (minPen === dMinX) this.playerPos.x = b.minX - (pRad + 0.04);
            else if (minPen === dMaxX) this.playerPos.x = b.maxX + (pRad + 0.04);
            else if (minPen === dMinZ) this.playerPos.z = b.minZ - (pRad + 0.04);
            else this.playerPos.z = b.maxZ + (pRad + 0.04);
          }
        }
      }

      // 2. Cylindrical Obstacles (Metro Viaduct Pillars, Trees, Utility Poles, SAARC/Shapla Fountain Basins)
      if (playerY < 1.0) {
        for (const c of this.circleColliders) {
          if (Math.abs(this.playerPos.x - c.x) > c.radius + 1.5 || Math.abs(this.playerPos.z - c.z) > c.radius + 1.5) continue;
          const dx = this.playerPos.x - c.x;
          const dz = this.playerPos.z - c.z;
          const distSq = dx * dx + dz * dz;
          const minDist = pRad + c.radius;
          if (distSq < minDist * minDist) {
            const dist = Math.sqrt(distSq) || 0.001;
            this.playerPos.x = c.x + (dx / dist) * (minDist + 0.02);
            this.playerPos.z = c.z + (dz / dist) * (minDist + 0.02);
          }
        }
      }

      // 3. Vehicles in the Street (Buses, Cars, Pickups, CNGs, Rickshaws) using true OBBs
      if (this.vehicles) {
        for (const v of this.vehicles) {
          if (v.id === this.activeVehicleId) continue;
          if (Math.abs(this.playerPos.x - v.x) > 8.0 || Math.abs(this.playerPos.z - v.z) > 8.0) continue;
          const vElev = this.getRoadElevation(v.x, v.z, v.y);
          if (Math.abs(playerY - vElev) > 2.5) continue;

          const oStats = VEHICLE_STATS[v.type];
          // Snug vehicle bounds allow squeezing through realistic traffic gaps without stickiness
          const halfW = oStats.width * 0.40;
          const halfL = oStats.length * 0.44;

          // Transform player coords into vehicle's local frame
          const cosR = Math.cos(v.rotation);
          const sinR = Math.sin(v.rotation);
          const relX = this.playerPos.x - v.x;
          const relZ = this.playerPos.z - v.z;
          const localX = relX * cosR - relZ * sinR;
          const localZ = relX * sinR + relZ * cosR;

          // Closest point on vehicle's local box
          const clampedLX = Math.max(-halfW, Math.min(localX, halfW));
          const clampedLZ = Math.max(-halfL, Math.min(localZ, halfL));
          const dX = localX - clampedLX;
          const dZ = localZ - clampedLZ;
          const distSq = dX * dX + dZ * dZ;

          if (distSq < pRad * pRad) {
            let pushLX = 0;
            let pushLZ = 0;
            if (distSq > 0.0001) {
              const dist = Math.sqrt(distSq);
              const push = pRad - dist + 0.02;
              pushLX = (dX / dist) * push;
              pushLZ = (dZ / dist) * push;
            } else {
              const dLeft = localX - (-halfW);
              const dRight = halfW - localX;
              const dBack = localZ - (-halfL);
              const dFront = halfL - localZ;
              const minPen = Math.min(dLeft, dRight, dBack, dFront);
              if (minPen === dLeft) pushLX = -dLeft - pRad - 0.02;
              else if (minPen === dRight) pushLX = dRight + pRad + 0.02;
              else if (minPen === dBack) pushLZ = -dBack - pRad - 0.02;
              else pushLZ = dFront + pRad + 0.02;
            }

            // Transform local push back to world frame
            this.playerPos.x += pushLX * cosR + pushLZ * sinR;
            this.playerPos.z += -pushLX * sinR + pushLZ * cosR;
          }
        }
      }
    }

    // Active anti-stuck mechanism: if player has movement input but is pinched in a narrow gap between obstacles
    if (moveForward !== 0 || moveRight !== 0) {
      const stepDist = Math.hypot(this.playerPos.x - prevPlayerX, this.playerPos.z - prevPlayerZ);
      if (stepDist < 0.006) {
        this.playerStuckTimer += dt;
        if (this.playerStuckTimer > 0.14) {
          // Slide along open tangent towards camera direction to effortlessly escape pinch points
          const slideYaw = this.cameraYaw + Math.PI;
          this.playerPos.x += Math.sin(slideYaw) * 1.8 * dt;
          this.playerPos.z += Math.cos(slideYaw) * 1.8 * dt;
        }
      } else {
        this.playerStuckTimer = 0;
      }
    } else {
      this.playerStuckTimer = 0;
    }

    const groundElev = this.getRoadElevation(this.playerPos.x, this.playerPos.z, this.playerPos.y);
    if (!this.isGrounded) {
      this.playerPos.y += this.playerVelY * dt;
      this.playerVelY -= 21 * dt;
      if (this.playerPos.y <= groundElev) {
        const impactVel = this.playerVelY;
        this.playerPos.y = groundElev;
        this.playerVelY = 0;
        if (!this.isGrounded) {
          dhakaAudio.playFootstep('land');
        }
        this.isGrounded = true;
        if (impactVel < -14.5 && !this.isPositionInWater(this.playerPos.x, this.playerPos.z)) {
          const fallDmg = Math.min(75, Math.round((-impactVel - 13.0) * 3.5));
          useGameStore.getState().damagePlayer(fallDmg);
          dhakaAudio.playSfx('pain_grunt');
          this.cameraTrauma = Math.min(1.0, this.cameraTrauma + 0.35);
        }
      }
    } else {
      if (this.playerPos.y - groundElev > 0.6) {
        // Player stepped off an edge into air
        this.isGrounded = false;
        this.playerVelY = 0;
      } else {
        // Firmly grounded: continuously keep player precisely on the ground surface (never sink into geometry)
        this.playerPos.y = groundElev;
      }
    }

    // Realistic Swimming & Stamina/Oxygen Mechanic in Deep Water (no regen while submerged)
    if (this.isPositionInWater(this.playerPos.x, this.playerPos.z) && this.playerPos.y <= 0.35) {
      this.isSwimming = true;
      this.isGrounded = true;
      this.isCrouching = false;
      this.isAiming = false;
      this.playerVelY = 0;
      this.playerPos.y = -1.05 + Math.sin(performance.now() * 0.004) * 0.05;
      const swimDrain =
        moveForward === 0 && moveRight === 0
          ? 2.8
          : isSprinting
          ? 14.0
          : 6.5;
      this.playerStamina = Math.max(0, this.playerStamina - swimDrain * dt);
      if (Math.random() < dt * 3.5) {
        this.spawnImpactSparks(this.playerPos.x, 0.05, this.playerPos.z, '#bae6fd', 0.9);
      }
      if (this.playerStamina <= 0) {
        const store = useGameStore.getState();
        if (!store.isWasted) {
          this.spawnImpactSparks(this.playerPos.x, 0.1, this.playerPos.z, '#38bdf8', 4.0);
          dhakaAudio.playSfx('hit');
          store.damagePlayer(999);
          store.showBanner({
            titleEn: 'WASTED: EXHAUSTED & DROWNED',
            titleBn: 'সাঁতারের শক্তি শেষ হয়ে পানিতে ডুবে মৃত্যু!',
            subtitleEn: 'Stamina ran out in deep water. Swim back to pier or board a boat next time!',
            subtitleBn: 'গভীর পানিতে স্ট্যামিনা শেষ হয়ে গেছে। ঘাট বা নৌকায় উঠে পড়ুন!',
            tone: 'red',
          });
        }
      }
    } else {
      this.isSwimming = false;
    }

    // Update Real Skeletal GLTF AnimationMixer & Weapon / Arm Rig
    const storeState = useGameStore.getState();
    const activeTool = storeState.tools.find(
      (t) => t.id === storeState.equippedToolId
    );
    const isFirearm = Boolean(activeTool?.isFirearm);
    const isAimingNow =
      !this.isSwimming &&
      isFirearm &&
      (this.isAiming || this.fireCooldown > 0 || this.attackAnimTimer > 0);

    let weaponCategory: 'fists' | 'melee' | 'pistol' | 'rifle' = 'fists';
    if (activeTool?.isFirearm) {
      if (activeTool.id === 'pistol_9mm' || activeTool.id === 'smg_uzi') {
        weaponCategory = 'pistol';
      } else {
        weaponCategory = 'rifle';
      }
    } else if (activeTool?.category === 'local_arm') {
      weaponCategory = 'melee';
    } else {
      weaponCategory = 'fists';
    }

    if (this.isAiming && !this.isSwimming) {
      this.playerRotation = this.cameraYaw + Math.PI;
    }

    // Gate the gait so feet stay planted: crouch 0.55x, walk 1x, sprint 1.45x.
    const gaitScale = this.isCrouching ? 0.55 : isSprinting ? 1.45 : 1.0;
    const effectiveAnimState = this.isSwimming ? 'swim' : targetAnimState;
    setCharacterAnimationState(
      this.playerLimbs,
      effectiveAnimState,
      dt,
      this.isSwimming ? 0 : this.attackAnimTimer,
      isAimingNow,
      gaitScale,
      weaponCategory,
      this.meleeComboStep
    );

    // Also update fallback capsule limbs if visible
    if (this.isSwimming) {
      const swimPhase = performance.now() * 0.0065;
      this.playerLimbs.leftArm.rotation.x = -1.2 + Math.sin(swimPhase) * 0.85;
      this.playerLimbs.rightArm.rotation.x = -1.2 - Math.sin(swimPhase) * 0.85;
      this.playerLimbs.leftLeg.rotation.x = Math.sin(swimPhase * 1.4) * 0.35;
      this.playerLimbs.rightLeg.rotation.x = -Math.sin(swimPhase * 1.4) * 0.35;
    } else {
      const swing = Math.sin(this.walkAnimPhase) * 0.65;
      this.playerLimbs.leftLeg.rotation.x = swing;
      this.playerLimbs.rightLeg.rotation.x = -swing;
      this.playerLimbs.leftArm.rotation.x = -swing * 0.8;

      if (this.attackAnimTimer > 0) {
        this.attackAnimTimer -= dt;
        this.playerLimbs.rightArm.rotation.x =
          -1.9 + Math.sin(this.attackAnimTimer * 18) * 0.8;
      } else {
        this.playerLimbs.rightArm.rotation.x = swing * 0.8;
      }
    }

    this.playerLimbs.group.scale.y = this.isCrouching ? 0.74 : 1.0;
    this.playerLimbs.group.position.copy(this.playerPos);
    this.playerLimbs.group.rotation.set(0, this.playerRotation, 0);

    // On-foot handheld flashlight beam ([L] toggle)
    if (this.flashlightOn && !this.isSwimming) {
      this.headlightSpot.intensity = 3.2;
      this.headlightSpot.position.set(
        this.playerPos.x + Math.sin(this.playerRotation) * 0.4,
        this.playerPos.y + 1.35,
        this.playerPos.z + Math.cos(this.playerRotation) * 0.4
      );
      this.headlightTarget.position.set(
        this.playerPos.x + Math.sin(this.playerRotation) * 18,
        this.playerPos.y + 0.5,
        this.playerPos.z + Math.cos(this.playerRotation) * 18
      );
    } else {
      this.headlightSpot.intensity = 0;
    }
  }

  private updateVehicleTailLightGlow(
    mesh: THREE.Object3D,
    isBraking: boolean,
    isReversing: boolean,
    steer = 0,
    headlightsOn = true
  ) {
    if (!mesh.userData.tailMatCache) {
      const mats: THREE.MeshBasicMaterial[] = [];
      const headMats: THREE.MeshBasicMaterial[] = [];
      const leftTurns: THREE.MeshBasicMaterial[] = [];
      const rightTurns: THREE.MeshBasicMaterial[] = [];
      mesh.traverse((child) => {
        if (!(child as THREE.Mesh).isMesh) return;
        const mat = (child as THREE.Mesh).material;
        if (!mat || Array.isArray(mat)) return;
        if (child.name === 'accent_taillight') {
          mats.push(mat as THREE.MeshBasicMaterial);
        } else if (child.name === 'accent_headlight') {
          headMats.push(mat as THREE.MeshBasicMaterial);
        } else if (child.name === 'accent_turn_left') {
          leftTurns.push(mat as THREE.MeshBasicMaterial);
        } else if (child.name === 'accent_turn_right') {
          rightTurns.push(mat as THREE.MeshBasicMaterial);
        }
      });
      mesh.userData.tailMatCache = mats;
      mesh.userData.headMatCache = headMats;
      mesh.userData.turnLeftCache = leftTurns;
      mesh.userData.turnRightCache = rightTurns;
    }
    const mats = mesh.userData.tailMatCache as THREE.MeshBasicMaterial[];
    const hex = isReversing ? '#f8fafc' : isBraking ? '#ff1f1f' : '#6b1212';
    for (let i = 0; i < mats.length; i++) {
      mats[i].color.set(hex);
    }
    const headMats = mesh.userData.headMatCache as THREE.MeshBasicMaterial[];
    for (let i = 0; i < headMats.length; i++) {
      headMats[i].color.set(headlightsOn ? '#fef9c3' : '#475569');
      headMats[i].opacity = headlightsOn ? 0.9 : 0.25;
    }
    const blinkOn = Math.floor(performance.now() / 320) % 2 === 0;
    const leftActive = steer > 0.25 && blinkOn;
    const rightActive = steer < -0.25 && blinkOn;
    const leftMats = mesh.userData.turnLeftCache as THREE.MeshBasicMaterial[];
    const rightMats = mesh.userData.turnRightCache as THREE.MeshBasicMaterial[];
    for (let i = 0; i < leftMats.length; i++) {
      leftMats[i].color.set(leftActive ? '#facc15' : '#451a03');
    }
    for (let i = 0; i < rightMats.length; i++) {
      rightMats[i].color.set(rightActive ? '#facc15' : '#451a03');
    }
  }

  private updateDrivenVehicle(dt: number) {
    const veh = this.vehicles.find((v) => v.id === this.activeVehicleId);
    if (!veh) return;

    this.isSwimming = false;
    this.playerStamina = Math.min(100, this.playerStamina + 14 * dt);

    const store = useGameStore.getState();
    const stats = VEHICLE_STATS[veh.type];
    const boostMult = this.vehicleSpeedBoostMap.get(veh.id) ?? 1.0;
    const isTireDamaged = veh.type !== 'boat' && veh.type !== 'rickshaw' && veh.health < veh.maxHealth * 0.25;
    const isSmoking = veh.type !== 'rickshaw' && veh.health < veh.maxHealth * 0.35;
    const damageSpeedMult = isTireDamaged ? 0.68 : isSmoking ? 0.85 : 1.0;
    const accelMult = (store.selectedCharacterId === 'arif' ? 1.2 : 1.0) * boostMult;
    const topSpeed = stats.maxSpeed * boostMult * damageSpeedMult;
    let throttle = 0;
    let steer = 0;

    if (this.keys.has('KeyW') || this.keys.has('ArrowUp')) throttle += 1;
    if (this.keys.has('KeyS') || this.keys.has('ArrowDown')) throttle -= 1;
    if (this.keys.has('KeyA') || this.keys.has('ArrowLeft')) steer += 1;
    if (this.keys.has('KeyD') || this.keys.has('ArrowRight')) steer -= 1;

    // Realistic Fuel / CNG consumption (motorized vehicles & boats)
    if (this.fuelSputterCooldown > 0) this.fuelSputterCooldown -= dt;
    if (veh.type !== 'rickshaw') {
      const curFuel = veh.fuel ?? 100;
      const drainRate = Math.abs(throttle) > 0 ? 0.68 : Math.abs(veh.speed) > 1 ? 0.22 : 0.04;
      veh.fuel = Math.max(0, curFuel - drainRate * dt);
      if (veh.fuel <= 16 && !veh.lowFuelWarned) {
        veh.lowFuelWarned = true;
        const pumpList = veh.type === 'boat' ? MARINE_DOCKS : CNG_STATIONS;
        let nearestName = veh.type === 'boat' ? 'Marine Pier Dock' : 'CNG Station';
        let bestDist = Infinity;
        for (const p of pumpList) {
          const pd = Math.hypot(p.x - veh.x, p.z - veh.z);
          if (pd < bestDist) {
            bestDist = pd;
            nearestName = p.nameEn;
          }
        }
        store.showBanner({
          titleEn: '⛽ LOW CNG / FUEL RESERVE (< 15%)',
          titleBn: '⛽ জ্বালানি প্রায় শেষ (< ১৫%)!',
          subtitleEn: `Nearest pump: ${nearestName} (~${Math.round(bestDist)}m away).`,
          subtitleBn: `নিকটতম পাম্প: ${nearestName} (~${Math.round(bestDist)} মিটার দূরে)।`,
          tone: 'gold',
        });
      }
      if (veh.fuel <= 0) {
        if (throttle > 0 && this.fuelSputterCooldown <= 0) {
          this.fuelSputterCooldown = 1.1;
          dhakaAudio.playSfx('dry_fire');
          store.showBanner({
            titleEn: '⛽ TANK EMPTY — OUT OF FUEL!',
            titleBn: '⛽ জ্বালানি শেষ হয়ে গেছে!',
            subtitleEn: 'Drive or walk to a CNG Station / Marine Pier Dock to refuel.',
            subtitleBn: 'রিফুয়েল করতে সিএনজি স্টেশন বা নৌ ঘাটে যান।',
            tone: 'red',
          });
        }
        throttle = 0; // Engine sputters out of fuel
      }
    }

    // Tire blowout steering pull wobble when heavily damaged
    if (isTireDamaged && Math.abs(veh.speed) > 4.0) {
      steer += Math.sin(performance.now() * 0.008) * 0.35;
    }

    const isDrifting = this.keys.has('Space');
    const isWetAsphalt =
      store.weather === 'monsoon_rain' && veh.type !== 'boat';
    const brakeGrip = isWetAsphalt ? 0.72 : 1.0;

    if (throttle > 0) {
      veh.speed = Math.min(
        topSpeed,
        veh.speed + stats.acceleration * accelMult * dt
      );
    } else if (throttle < 0) {
      if (veh.speed > 0.4) {
        veh.speed = Math.max(0, veh.speed - stats.braking * brakeGrip * dt);
      } else {
        const maxReverse =
          veh.type === 'motorcycle' || veh.type === 'rickshaw'
            ? -3.2
            : -topSpeed * 0.42;
        veh.speed = Math.max(
          maxReverse,
          veh.speed - stats.acceleration * 0.65 * accelMult * dt
        );
      }
    } else {
      veh.speed *= Math.pow(isWetAsphalt ? 0.36 : 0.25, dt);
      if (Math.abs(veh.speed) < 0.15) veh.speed = 0;
    }

    if (isDrifting && Math.abs(veh.speed) > 4.2) {
      veh.speed *= Math.pow(isWetAsphalt ? 0.62 : 0.48, dt);
      this.tireSmokeTimer += dt;
      if (this.tireSmokeTimer > 0.08) {
        this.tireSmokeTimer = 0;
        dhakaAudio.playSfx('skid');
        const rearX = veh.x - Math.sin(veh.rotation) * 1.5;
        const rearZ = veh.z - Math.cos(veh.rotation) * 1.5;
        this.spawnImpactSparks(
          rearX + (Math.random() - 0.5) * 1.2,
          0.14,
          rearZ + (Math.random() - 0.5) * 1.2,
          '#e2e8f0',
          0.7
        );
        this.spawnSkidMark(rearX, rearZ, veh.rotation, veh.y);
      }
    }

    if (Math.abs(veh.speed) > 0.3) {
      const dir = veh.speed >= 0 ? 1 : -1;
      const turnMult = isDrifting ? 1.45 : 1.0;
      const speedFactor = Math.max(0.35, Math.min(1, Math.abs(veh.speed) / 6.5));
      veh.rotation +=
        steer * stats.turnSpeed * turnMult * speedFactor * dir * dt;
    }

    // Vehicle Water Submersion: Boats cruise safely; land vehicles sink over 2.6s so player can bail out!
    if (veh.type !== 'boat' && this.isPositionInWater(veh.x, veh.z) && veh.y <= 1.2) {
      const subTimer = veh.waterSubmergeTimer ?? 0;
      if (subTimer === 0) {
        this.spawnImpactSparks(veh.x, 0.15, veh.z, '#bae6fd', 3.2);
        dhakaAudio.playSfx('hit');
        store.showBanner({
          titleEn: '🌊 VEHICLE TAKING ON WATER — PRESS [F] TO BAIL OUT!',
          titleBn: '🌊 গাড়িতে পানি ঢুকছে — [F] চেপে সাঁতরে বের হন!',
          subtitleEn: 'Jump out before it sinks beneath the surface!',
          subtitleBn: 'গাড়ি সম্পূর্ণ ডুবে যাওয়ার আগেই বের হয়ে পড়ুন!',
          tone: 'red',
        });
      }
      veh.waterSubmergeTimer = subTimer + dt;
      veh.speed *= Math.pow(0.18, dt);
      veh.steering = 0;
      veh.y = -0.35 - Math.min(1, veh.waterSubmergeTimer / 2.6) * 1.85;
      this.playerPos.set(veh.x, veh.y, veh.z);
      const mesh = this.vehicleMeshes.get(veh.id);
      if (mesh) {
        mesh.position.y = veh.y;
        mesh.rotation.x = Math.min(0.35, veh.waterSubmergeTimer * 0.14);
      }
      if (Math.random() < dt * 8) {
        this.spawnImpactSparks(veh.x, 0.08, veh.z, '#bae6fd', 1.4);
      }
      if (veh.waterSubmergeTimer >= 2.6) {
        if (!store.isWasted) {
          this.spawnImpactSparks(veh.x, 0.1, veh.z, '#38bdf8', 4.5);
          dhakaAudio.playSfx('hit');
          store.damagePlayer(999);
          store.showBanner({
            titleEn: 'WASTED: DROWNED IN SUNKEN VEHICLE',
            titleBn: 'ডুবে যাওয়া গাড়িতে প্রাণহানি!',
            subtitleEn: 'Stayed inside submerged vehicle too long.',
            subtitleBn: 'ডুবন্ত গাড়ি থেকে সময়মতো বের হতে পারেননি!',
            tone: 'red',
          });
        }
        this.activeVehicleId = null;
        this.isSwimming = true;
        this.playerLimbs.group.visible = true;
        this.playerPos.set(veh.x, -1.05, veh.z);
        this.playerLimbs.group.position.copy(this.playerPos);
      }
      return;
    } else {
      veh.waterSubmergeTimer = 0;
    }

    const vx = Math.sin(veh.rotation) * veh.speed * dt;
    const vz = Math.cos(veh.rotation) * veh.speed * dt;

    const nextX = veh.x + vx;
    const nextZ = veh.z + vz;

    const nextElev = veh.type === 'boat' ? 0.32 : this.getRoadElevation(nextX, nextZ, veh.y);
    const radius = Math.max(stats.width, stats.length) * 0.45;
    const boatHitsShore = veh.type === 'boat' && !this.isPositionInWater(nextX, nextZ);
    const boatHitsLaunch =
      veh.type === 'boat' &&
      this.launchBoats.some(
        (lb) => Math.abs(nextX - lb.position.x) < 16.5 && Math.abs(nextZ - lb.position.z) < 5.5
      );
    if (!boatHitsShore && !boatHitsLaunch && !this.checkWorldObstacle(nextX, nextZ, radius, veh.id, nextElev)) {
      veh.x = clampWorldCoord(nextX);
      veh.z = clampWorldCoord(nextZ);
    } else if (boatHitsLaunch) {
      dhakaAudio.playSfx('hit');
      this.spawnImpactSparks(nextX, 0.4, nextZ, '#bae6fd', 1.8);
      veh.speed = -veh.speed * 0.35;
    } else if (boatHitsShore) {
      // Gently slide boats along shorelines/piers
      const canSlideX = this.isPositionInWater(nextX, veh.z);
      const canSlideZ = this.isPositionInWater(veh.x, nextZ);
      if (canSlideX) veh.x = clampWorldCoord(nextX);
      else if (canSlideZ) veh.z = clampWorldCoord(nextZ);
      else veh.speed *= 0.2;
    } else {
      // 1. Check if collision is with another vehicle in Dhaka traffic
      let hitVeh: VehicleEntity | null = null;
      for (const ov of this.vehicles) {
        if (ov.id === veh.id) continue;
        const oStats = VEHICLE_STATS[ov.type];
        const oRad = Math.max(oStats.width, oStats.length) * 0.42;
        const dx = nextX - ov.x;
        const dz = nextZ - ov.z;
        const minDist = radius + oRad;
        if (dx * dx + dz * dz < minDist * minDist) {
          hitVeh = ov;
          break;
        }
      }

      if (hitVeh) {
        const oStats = VEHICLE_STATS[hitVeh.type];
        const dx = nextX - hitVeh.x;
        const dz = nextZ - hitVeh.z;
        const d = Math.max(0.1, Math.hypot(dx, dz));
        const nx = dx / d;
        const nz = dz / d;
        const oRad = Math.max(oStats.width, oStats.length) * 0.42;
        const minDist = radius + oRad;

        // Separate vehicles along contact normal
        veh.x = clampWorldCoord(hitVeh.x + nx * (minDist + 0.12));
        veh.z = clampWorldCoord(hitVeh.z + nz * (minDist + 0.12));

        // Knockback impact on other vehicle
        hitVeh.x = clampWorldCoord(hitVeh.x - nx * 0.7);
        hitVeh.z = clampWorldCoord(hitVeh.z - nz * 0.7);
        if (hitVeh.isTraffic) {
          hitVeh.speed = Math.max(hitVeh.speed, 6);
        }

        if (Math.abs(veh.speed) > 4.5) {
          dhakaAudio.playSfx('crash');
          this.cameraTrauma = Math.min(
            1.0,
            this.cameraTrauma + Math.abs(veh.speed) / 12
          );
          const crashX = (veh.x + hitVeh.x) / 2;
          const crashZ = (veh.z + hitVeh.z) / 2;
          this.spawnGlassShatter(crashX, 0.75, crashZ, 20);
          this.spawnRadiatorDamage(crashX, 0.65, crashZ);
          this.spawnImpactSparks(crashX, 0.65, crashZ, '#facc15', 2.2);

          // Subtle physical crumple tilt on high-speed crash
          const vMesh = this.vehicleMeshes.get(veh.id);
          if (vMesh) vMesh.rotation.z += (Math.random() - 0.5) * 0.12;
          const hMesh = this.vehicleMeshes.get(hitVeh.id);
          if (hMesh) hMesh.rotation.z += (Math.random() - 0.5) * 0.12;

          dhakaAudio.playHorn(oStats.hornType);
          veh.health = Math.max(0, veh.health - Math.abs(veh.speed) * 0.5);
          if (Math.abs(veh.speed) > 14.5 && !store.isWasted) {
            const crashMitigation =
              veh.type === 'motorcycle' || veh.type === 'rickshaw' ? 1.0 : 0.6;
            store.damagePlayer(
              Math.round((Math.abs(veh.speed) - 13.0) * 1.35 * crashMitigation)
            );
          }
          if (veh.health <= 0) {
            this.explodeVehicle(veh);
            return;
          }
        } else {
          dhakaAudio.playSfx('hit');
        }
        veh.speed = -veh.speed * 0.35;

        if (hitVeh.isPolice) {
          const curWanted = useGameStore.getState().wantedLevel;
          useGameStore.getState().setWantedLevel(Math.min(5, curWanted + 1));
        }
      } else {
        // 2. Static obstacle hit (railing, median, metro pillar, pole, wall)
        // Check if vehicle can slide along X or Z axis (scraping against railing or curb)
        const canSlideX = !this.checkWorldObstacle(nextX, veh.z, radius, veh.id, nextElev);
        const canSlideZ = !this.checkWorldObstacle(veh.x, nextZ, radius, veh.id, nextElev);

        if (canSlideX && Math.abs(vx) > 0.05) {
          veh.x = clampWorldCoord(nextX);
          veh.speed *= Math.pow(0.68, dt);
        } else if (canSlideZ && Math.abs(vz) > 0.05) {
          veh.z = clampWorldCoord(nextZ);
          veh.speed *= Math.pow(0.68, dt);
        } else {
          // Direct head-on impact into railing, wall or concrete post
          if (Math.abs(veh.speed) > 4.5) {
            dhakaAudio.playSfx('crash');
            this.cameraTrauma = Math.min(
              1.0,
              this.cameraTrauma + Math.abs(veh.speed) / 11
            );
            const frontX = veh.x + Math.sin(veh.rotation) * 1.8;
            const frontZ = veh.z + Math.cos(veh.rotation) * 1.8;
            this.spawnGlassShatter(frontX, 0.75, frontZ, 18);
            this.spawnRadiatorDamage(frontX, 0.7, frontZ);
            this.spawnImpactSparks(frontX, 0.7, frontZ, '#e2e8f0', 2.5);
            veh.health = Math.max(0, veh.health - Math.abs(veh.speed) * 0.55);
            if (Math.abs(veh.speed) > 14.5 && !store.isWasted) {
              const crashMitigation =
                veh.type === 'motorcycle' || veh.type === 'rickshaw' ? 1.0 : 0.6;
              store.damagePlayer(
                Math.round((Math.abs(veh.speed) - 13.0) * 1.45 * crashMitigation)
              );
            }
            if (veh.health <= 0) {
              this.explodeVehicle(veh);
              return;
            }
          } else {
            dhakaAudio.playSfx('hit');
          }
          // Stop forward momentum cleanly instead of vibrating back and forth
          veh.speed = 0;
        }
      }
    }

    this.playerPos.set(veh.x, veh.y, veh.z);
    this.playerRotation = veh.rotation;

    // Position dynamic vehicle headlight cone ahead of car (auto at night/rain, manual [L], or horn flash)
    if (this.hornFlashTimer > 0) this.hornFlashTimer = Math.max(0, this.hornFlashTimer - dt);
    const storeState = useGameStore.getState();
    const isNightOrRain =
      storeState.weather === 'night' ||
      storeState.weather === 'monsoon_rain' ||
      storeState.timeOfDay < 5.8 ||
      storeState.timeOfDay > 19.2;
    const headlightsOn =
      this.headlightsManual !== null ? this.headlightsManual : isNightOrRain || this.hornFlashTimer > 0;
    this.headlightSpot.intensity =
      (headlightsOn ? 3.5 : 0) + (this.hornFlashTimer > 0 ? 1.5 : 0);
    this.headlightSpot.position.set(
      veh.x + Math.sin(veh.rotation) * 1.5,
      1.2,
      veh.z + Math.cos(veh.rotation) * 1.5
    );
    this.headlightTarget.position.set(
      veh.x + Math.sin(veh.rotation) * 24,
      0.1,
      veh.z + Math.cos(veh.rotation) * 24
    );

    if (!this.isPointerDragging && Math.abs(veh.speed) > 2.5) {
      const desiredYaw = veh.rotation + Math.PI;
      const diff = normalizeAngle(desiredYaw - this.cameraYaw);
      this.cameraYaw += diff * Math.min(1, dt * 3.2);
    }

    const mesh = this.vehicleMeshes.get(veh.id);
    const elev =
      veh.type === 'boat'
        ? 0.32 + Math.sin(performance.now() * 0.0032) * 0.06
        : this.getRoadElevation(veh.x, veh.z, veh.y);
    veh.y = elev;
    this.playerPos.set(veh.x, elev, veh.z);

    // Damaged Engine Smoke (< 35% HP)
    if (veh.health < veh.maxHealth * 0.35 && Math.random() < dt * 8) {
      const hoodX = veh.x + Math.sin(veh.rotation) * 1.4;
      const hoodZ = veh.z + Math.cos(veh.rotation) * 1.4;
      this.spawnRadiatorDamage(hoodX, elev + 0.85, hoodZ);
    }

    // DMP Speed Cameras across Dhaka Corridors: > 105 km/h triggers e-challan flash!
    if (this.speedCameraCooldown > 0) this.speedCameraCooldown -= dt;
    const kmhNow = Math.abs(veh.speed) * 2.6;
    if (this.speedCameraCooldown <= 0 && kmhNow > 105 && veh.type !== 'police' && veh.type !== 'boat') {
      const nearCam = this.speedCameraSpots.some(
        (cam) =>
          Math.hypot(veh.x - cam.x, veh.z - cam.z) < 22 &&
          Math.abs(elev - cam.y) < 4.5
      );
      if (nearCam) {
        this.speedCameraCooldown = 25;
        this.spawnImpactSparks(veh.x, elev + 2.2, veh.z, '#ffffff', 3.5);
        dhakaAudio.playSfx('ui');
        if (!store.spendTaka(200, 'DMP Speed Camera E-Challan', 'ডিএমপি স্পিড ক্যামেরা জরিমানা')) {
          store.setWantedLevel(Math.max(1, store.wantedLevel));
        }
        store.showBanner({
          titleEn: `📸 SPEED CAMERA FLASH: ${Math.round(kmhNow)} KM/H (-৳200)`,
          titleBn: `📸 স্পিড ক্যামেরা জরিমানা: ${Math.round(kmhNow)} কিমি/ঘণ্টা (-৳২০০)`,
          subtitleEn: 'DMP Automatic E-Challan issued for overspeeding!',
          subtitleBn: 'অতিরিক্ত গতিতে গাড়ি চালানোর জন্য স্বয়ংক্রিয় জরিমানা!',
          tone: 'red',
        });
      }
    }

    if (mesh) {
      (mesh as any).isPlayerDriven = true;
      if (!mesh.userData) mesh.userData = {};
      mesh.userData.noDriver = true;

      // Purge any lingering or late-loaded npc_driver from this player-driven vehicle (search descendants)
      mesh.traverse((c) => {
        let isPlayerPart = c === this.playerLimbs.group;
        let p: THREE.Object3D | null = c.parent;
        while (p) {
          if (p === this.playerLimbs.group) {
            isPlayerPart = true;
            break;
          }
          p = p.parent;
        }
        if (
          !isPlayerPart &&
          c.name &&
          (c.name === 'npc_driver' ||
            c.name.startsWith('npc_driver') ||
            c.name.includes('driver') ||
            c.name.includes('puller') ||
            c.name.includes('rider'))
        ) {
          c.visible = false;
          if (c.parent) c.parent.remove(c);
        }
      });

      mesh.position.set(veh.x, elev, veh.z);
      mesh.rotation.y = veh.rotation;

      // Realistic longitudinal road slope pitch: vehicles tilt naturally along ramp inclines
      const probeDist = (stats.length || 4.2) * 0.45;
      const fwdX = Math.sin(veh.rotation);
      const fwdZ = Math.cos(veh.rotation);
      const frontY = this.getRoadElevation(veh.x + fwdX * probeDist, veh.z + fwdZ * probeDist, veh.y);
      const backY = this.getRoadElevation(veh.x - fwdX * probeDist, veh.z - fwdZ * probeDist, veh.y);
      const roadPitch = Math.atan2(frontY - backY, probeDist * 2);

      // Motorcycle dynamic body roll, steerable handlebars, exhaust smoke & wheelie physics
      if (veh.type === 'motorcycle') {
        const isWheelie = isDrifting && throttle > 0 && veh.speed > 1.8;
        const targetPitch = isWheelie ? 0.38 : 0;
        this.bikeWheeliePitch += (targetPitch - this.bikeWheeliePitch) * Math.min(1, dt * 7.0);

        const leanTarget =
          -steer * Math.min(1, Math.abs(veh.speed) / 5.2) * 0.44;
        mesh.rotation.z += (leanTarget - mesh.rotation.z) * Math.min(1, dt * 9);
        mesh.rotation.x = -this.bikeWheeliePitch + roadPitch;

        // Front handlebar & fork steering rotation
        const hGroup = mesh.getObjectByName('handlebar_group');
        if (hGroup) {
          hGroup.rotation.y = steer * 0.45;
        }

        // Exhaust smoke puffs when accelerating on motorcycle
        if (throttle > 0 && Math.random() < dt * 12) {
          const rearX = veh.x - Math.sin(veh.rotation) * 0.95 + Math.cos(veh.rotation) * 0.22;
          const rearZ = veh.z - Math.cos(veh.rotation) * 0.95 - Math.sin(veh.rotation) * 0.22;
          this.spawnMuzzleSmoke(rearX, 0.44, rearZ);
        }
      } else if (veh.type === 'boat') {
        mesh.rotation.z = -steer * 0.08 + Math.sin(performance.now() * 0.0025) * 0.025;
        mesh.rotation.x = -Math.min(0.08, Math.abs(veh.speed) * 0.0025);
      } else {
        // Realistic suspension lateral body roll & braking nose-dive for 4-wheelers
        const rollTarget = -steer * Math.min(0.085, Math.abs(veh.speed) * 0.0028);
        const brakeDive = throttle < 0 && veh.speed > 4 ? 0.042 : throttle > 0 ? -0.02 : 0;
        mesh.rotation.z = THREE.MathUtils.lerp(mesh.rotation.z, rollTarget, Math.min(1, dt * 8));
        mesh.rotation.x = roadPitch + brakeDive;
      }

      const isReversing = veh.speed < -0.45 && throttle < 0;
      const isBraking = (throttle < 0 && veh.speed > 0.45) || (isDrifting && Math.abs(veh.speed) > 1.0);
      this.updateVehicleTailLightGlow(mesh, isBraking, isReversing, steer, headlightsOn);

      // Wet-road water spray behind fast wheels in monsoon rain
      if (isWetAsphalt && Math.abs(veh.speed) > 9.0 && Math.random() < dt * 10) {
        const rearX = veh.x - Math.sin(veh.rotation) * 1.5;
        const rearZ = veh.z - Math.cos(veh.rotation) * 1.5;
        this.spawnImpactSparks(rearX, elev + 0.14, rearZ, '#bae6fd', 0.65);
      }

      // Both CarConcept.glb and ferrari.glb hubs use local X as the true axle.
      this.animateVehicleWheels(mesh, veh.speed, dt, steer);

      // Mount the player character into the vehicle group so it follows the vehicle perfectly
      if (this.playerLimbs.group.parent !== mesh) {
        mesh.add(this.playerLimbs.group);
      }

      // Position the player in the exact driver seat in vehicle-local coordinates
      if (veh.type === 'motorcycle') {
        this.playerLimbs.group.position.set(0, 0.22, -0.15);
        this.playerLimbs.group.rotation.set(-this.bikeWheeliePitch, 0, 0);
        this.playerLimbs.group.scale.set(0.92, 0.92, 0.92);
      } else if (veh.type === 'boat') {
        this.playerLimbs.group.position.set(0, 0.72, 1.05);
        this.playerLimbs.group.rotation.set(0, 0, 0);
        this.playerLimbs.group.scale.set(0.9, 0.9, 0.9);
      } else if (veh.type === 'rickshaw') {
        this.playerLimbs.group.position.set(0, 0.22, 0.34);
        this.playerLimbs.group.rotation.set(0, 0, 0);
        this.playerLimbs.group.scale.set(0.88, 0.88, 0.88);
      } else if (veh.type === 'cng') {
        this.playerLimbs.group.position.set(0, 0.08, 0.26);
        this.playerLimbs.group.rotation.set(0, 0, 0);
        this.playerLimbs.group.scale.set(0.74, 0.74, 0.74);
      } else if (veh.type === 'car' || veh.type === 'police') {
        this.playerLimbs.group.position.set(-0.36, -0.68, -0.05);
        this.playerLimbs.group.rotation.set(0, 0, 0);
        this.playerLimbs.group.scale.set(0.44, 0.44, 0.44);
      } else if (veh.type === 'pickup') {
        this.playerLimbs.group.position.set(-0.38, -0.12, 0.35);
        this.playerLimbs.group.rotation.set(0, 0, 0);
        this.playerLimbs.group.scale.set(0.48, 0.48, 0.48);
      } else if (veh.type === 'bus') {
        this.playerLimbs.group.position.set(-0.65, 0.88, 3.8);
        this.playerLimbs.group.rotation.set(0, 0, 0);
        this.playerLimbs.group.scale.set(0.78, 0.78, 0.78);
      }
    } else {
      this.playerLimbs.group.position.set(veh.x, elev + 0.26, veh.z);
      this.playerLimbs.group.rotation.set(-this.bikeWheeliePitch, veh.rotation, 0);
    }

    this.playerLimbs.group.visible = true;

    // Apply realistic driving skeleton pose (gripping handlebars, leaning, pedals)
    setDrivingPose(this.playerLimbs, veh.type, veh.speed, steer, this.bikeWheeliePitch, dt);

    const hasEngineRunning = veh.type === 'rickshaw' || (veh.fuel ?? 100) > 0;
    dhakaAudio.updateEngine(
      hasEngineRunning,
      veh.type,
      veh.speed / Math.max(1, stats.maxSpeed)
    );
  }


  /**
   * Spins all tagged wheels of a vehicle mesh and applies a subtle body roll.
   * Used for AI traffic and police cars so they no longer slide on locked wheels.
   */
  private animateVehicleWheels(
    mesh: THREE.Object3D,
    speed: number,
    dt: number,
    steerInput: number
  ) {
    if (!mesh.userData.wheelCache) {
      const wheels: THREE.Object3D[] = [];
      mesh.traverse((child) => {
        if (child.name === 'wheel') wheels.push(child);
      });
      mesh.userData.wheelCache = wheels;
    }

    const spin = speed * dt * 1.6;
    const steerAngle = THREE.MathUtils.clamp(steerInput, -1, 1) * 0.42;
    const wheels = mesh.userData.wheelCache as THREE.Object3D[];

    for (let i = 0; i < wheels.length; i++) {
      const child = wheels[i];
      child.rotation.x += spin;
      // Front wheels also pivot on their vertical axis while steering.
      if (child.userData.steer && child.userData.steerAxis !== 'z') {
        child.rotation.y = THREE.MathUtils.lerp(
          child.rotation.y,
          steerAngle,
          Math.min(1, dt * 9)
        );
      }
    }
    mesh.rotation.z = THREE.MathUtils.clamp(-steerInput * 0.06, -0.06, 0.06);
  }

  private updateTrafficAndPoliceAI(dt: number, wantedLevel: number) {
    const store = useGameStore.getState();
    this.policeNearby = false;
    if (wantedLevel > 0) {
      for (const v of this.vehicles) {
        if (
          v.isPolice &&
          v.health > 0 &&
          Math.abs(v.y - this.playerPos.y) <= 4.0 &&
          Math.hypot(v.x - this.playerPos.x, v.z - this.playerPos.z) < 55
        ) {
          this.policeNearby = true;
          break;
        }
      }
    }

    // Dynamic Police Backup Spawning at Wanted ★2+
    if (wantedLevel >= 2) {
      this.policeSpawnTimer += dt;
      if (this.policeSpawnTimer > 14) {
        this.policeSpawnTimer = 0;
        let nearbyPoliceCount = 0;
        for (const v of this.vehicles) {
          if (
            v.isPolice &&
            Math.hypot(v.x - this.playerPos.x, v.z - this.playerPos.z) < 140
          ) {
            nearbyPoliceCount++;
          }
        }
        if (nearbyPoliceCount < wantedLevel) {
          this.spawnPoliceCruiserNearPlayer();
          store.showBanner({
            titleEn: 'DMP TACTICAL BACKUP DISPATCHED!',
            titleBn: 'ডিএমপি অতিরিক্ত পুলিশ টহল পাঠানো হয়েছে!',
            subtitleEn: 'High-speed police interceptor approaching!',
            subtitleBn: 'ঘটনাস্থলে দ্রুতগতির পুলিশ পেট্রোল রওনা হয়েছে!',
            tone: 'red',
          });
        }
      }
    }

    const px = this.playerPos.x;
    const pz = this.playerPos.z;

    // Update knockable roadside traffic cones for all moving vehicles & respawn when player leaves
    for (let pi = 0; pi < this.destructibleProps.length; pi++) {
      const prop = this.destructibleProps[pi];
      if (!prop.hit) {
        for (const v of this.vehicles) {
          if (v.health <= 0 || Math.abs(v.speed) < 1.5 || v.y >= 1.5) continue;
          const pd = Math.hypot(prop.x - v.x, prop.z - v.z);
          if (pd < 2.2) {
            prop.hit = true;
            prop.life = 12;
            prop.vx = Math.sin(v.rotation) * Math.max(5, Math.abs(v.speed) * 0.7) + (Math.random() - 0.5) * 3;
            prop.vz = Math.cos(v.rotation) * Math.max(5, Math.abs(v.speed) * 0.7) + (Math.random() - 0.5) * 3;
            prop.vy = 4.2;
            if (v.id === this.activeVehicleId) dhakaAudio.playSfx('hit');
            break;
          }
        }
      } else {
        prop.life -= dt;
        prop.vy -= 14 * dt;
        prop.x += prop.vx * dt;
        prop.z += prop.vz * dt;
        prop.mesh.position.x = prop.x;
        prop.mesh.position.z = prop.z;
        prop.mesh.position.y = Math.max(0.15, prop.mesh.position.y + prop.vy * dt);
        if (prop.mesh.position.y <= 0.16) {
          prop.vy = 0;
          prop.vx *= 0.85;
          prop.vz *= 0.85;
        }
        prop.mesh.rotation.x += 5.5 * dt;
        prop.mesh.rotation.z += 4.2 * dt;
        if (prop.life <= 0) {
          if (Math.hypot(prop.origX - px, prop.origZ - pz) > 85) {
            prop.hit = false;
            prop.x = prop.origX;
            prop.z = prop.origZ;
            prop.vx = 0;
            prop.vz = 0;
            prop.vy = 0;
            prop.life = 999;
            prop.mesh.position.set(prop.origX, 0, prop.origZ);
            prop.mesh.rotation.set(0, 0, 0);
            prop.mesh.visible = true;
          } else {
            prop.mesh.visible = false;
          }
        } else {
          prop.mesh.visible = true;
        }
      }
    }

    for (let vi = this.vehicles.length - 1; vi >= 0; vi--) {
      const veh = this.vehicles[vi];
      if (veh.id === this.activeVehicleId) continue;

      const mesh = this.vehicleMeshes.get(veh.id);
      if (!mesh) continue;

      const distToPlayer = Math.hypot(veh.x - px, veh.z - pz);

      if (veh.health <= 0) {
        veh.wreckTimer = (veh.wreckTimer ?? 0) + dt;
        mesh.visible = distToPlayer < 160;
        if (mesh.visible && veh.wreckTimer < 20 && Math.random() < dt * 5) {
          this.spawnRadiatorDamage(veh.x, veh.y + 0.9, veh.z);
        }
        // Clean up charred wrecks once out of immediate player view after 35s
        if (veh.wreckTimer > 35 && distToPlayer > 45) {
          this.scene.remove(mesh);
          this.vehicleMeshes.delete(veh.id);
          this.vehicles.splice(vi, 1);
        }
        continue;
      }

      if (veh.isParked || !veh.isTraffic) {
        mesh.visible = distToPlayer < 220;
        if (mesh.visible) {
          const elev = veh.type === 'boat' ? 0.32 + Math.sin(performance.now() * 0.003 + veh.x) * 0.05 : this.getRoadElevation(veh.x, veh.z, veh.y);
          veh.y = elev;
          mesh.position.set(veh.x, elev, veh.z);
        }
        continue;
      }

      // Distance culling: hide and streamline distant traffic (> 180m)
      const trafficCullDist = this.perfDegraded ? 145 : 185;
      mesh.visible = distToPlayer < trafficCullDist;
      if (distToPlayer >= trafficCullDist) {
        if (veh.isTraffic && veh.speed > 0) {
          const forwardX = Math.sin(veh.rotation);
          const forwardZ = Math.cos(veh.rotation);
          veh.x += forwardX * veh.speed * dt;
          veh.z += forwardZ * veh.speed * dt;
          if (veh.roadAxis === 'ew') {
            if (veh.x > 1180) veh.x = -1180;
            else if (veh.x < -1180) veh.x = 1180;
          } else {
            if (veh.z > 780) veh.z = -1380;
            else if (veh.z < -1390) veh.z = 780;
          }
          mesh.position.set(veh.x, veh.y, veh.z);
        }
        continue;
      }

      if (veh.isPolice) {
        const redBar = mesh.getObjectByName('siren_red');
        const blueBar = mesh.getObjectByName('siren_blue');
        if (redBar && blueBar) {
          const flash = Math.floor(performance.now() / 160) % 2 === 0;
          redBar.visible = wantedLevel > 0 ? flash : true;
          blueBar.visible = wantedLevel > 0 ? !flash : true;
        }

        // Periodic authentic siren chime during pursuit
        // Flashing police cruiser lights during pursuit
        if (wantedLevel > 0) {
          this.policeSirenTimer += dt;
          if (this.policeSirenTimer > 3.6) {
            this.policeSirenTimer = 0;
          }
        }
      }

      if (this.activeVehicleId) {
        const playerVeh = this.vehicles.find(
          (v) => v.id === this.activeVehicleId
        );
        if (playerVeh) {
          const dist = Math.hypot(veh.x - playerVeh.x, veh.z - playerVeh.z);
          if (dist < 2.85 && Math.abs(playerVeh.speed) > 4) {
            dhakaAudio.playSfx('crash');
            this.cameraTrauma = Math.min(
              1.0,
              this.cameraTrauma + Math.abs(playerVeh.speed) / 12
            );
            const crashX = (veh.x + playerVeh.x) / 2;
            const crashZ = (veh.z + playerVeh.z) / 2;
            this.spawnGlassShatter(crashX, 0.75, crashZ, 16);
            this.spawnRadiatorDamage(crashX, 0.65, crashZ);
            this.spawnImpactSparks(crashX, 0.65, crashZ, '#facc15', 2.0);

            const pushAngle = Math.atan2(
              veh.x - playerVeh.x,
              veh.z - playerVeh.z
            );
            veh.x += Math.sin(pushAngle) * 1.6;
            veh.z += Math.cos(pushAngle) * 1.6;
            playerVeh.speed *= 0.6;

            if (veh.isPolice && wantedLevel < 2) {
              store.setWantedLevel(wantedLevel + 1);
            }
          }
        }
      }

      if (!veh.isTraffic && !(veh.isPolice && wantedLevel > 0)) continue;

      if (this.patrolViolationCooldown > 0) this.patrolViolationCooldown -= dt;

      if (veh.isPolice && wantedLevel === 0 && this.activeVehicleId && this.patrolViolationCooldown <= 0) {
        const playerVeh = this.vehicles.find((v) => v.id === this.activeVehicleId);
        if (playerVeh && playerVeh.type !== 'police' && playerVeh.type !== 'boat') {
          const dPatrol = Math.hypot(veh.x - playerVeh.x, veh.z - playerVeh.z);
          const sameDeck = Math.abs(veh.y - playerVeh.y) < 3.0;
          const playerKmh = Math.abs(playerVeh.speed) * 2.6;
          if (sameDeck && dPatrol < 26 && playerKmh > 95) {
            this.patrolViolationCooldown = 18;
            store.setWantedLevel(1);
            store.showBanner({
              titleEn: `🚔 DMP PATROL: OVER-SPEEDING (${Math.round(playerKmh)} KM/H)`,
              titleBn: `🚔 ডিএমপি টহল: অতিরিক্ত গতি (${Math.round(playerKmh)} কিমি/ঘণ্টা)`,
              subtitleEn: 'Police patrol spotted reckless driving! Wanted Level 1.',
              subtitleBn: 'পুলিশের সামনে বেপরোয়া গতিতে চালানোয় ওয়ান্টেড লেভেল ১!',
              tone: 'red',
            });
          }
        }
      }

      if (veh.isPolice && wantedLevel > 0) {
        const dx = this.playerPos.x - veh.x;
        const dz = this.playerPos.z - veh.z;
        const distToPlayer = Math.hypot(dx, dz);

        if (distToPlayer < 180) {
          const targetAngle = Math.atan2(dx, dz);
          const diff = normalizeAngle(targetAngle - veh.rotation);
          veh.rotation += diff * Math.min(1, dt * 3.0);
          const chaseSpeed = 17 + wantedLevel * 3.4;

          const curElev = this.getRoadElevation(veh.x, veh.z, veh.y);
          const nx = veh.x + Math.sin(veh.rotation) * chaseSpeed * dt;
          const nz = veh.z + Math.cos(veh.rotation) * chaseSpeed * dt;
          const nextElev = this.getRoadElevation(nx, nz, veh.y);

          if (
            !this.isPositionInWater(nx, nz) &&
            Math.abs(nextElev - curElev) <= 2.2 &&
            !this.checkWorldObstacle(nx, nz, 1.4, veh.id, curElev)
          ) {
            veh.x = nx;
            veh.z = nz;
          } else {
            // Intelligent obstacle unstuck: back up cleanly along reverse vector without spinning
            const backX = veh.x - Math.sin(veh.rotation) * 4 * dt;
            const backZ = veh.z - Math.cos(veh.rotation) * 4 * dt;
            if (
              !this.isPositionInWater(backX, backZ) &&
              !this.checkWorldObstacle(backX, backZ, 1.4, veh.id, curElev)
            ) {
              veh.x = backX;
              veh.z = backZ;
            }
            veh.rotation = normalizeAngle(veh.rotation + diff * Math.min(1, dt * 1.5));
          }

          // Police ramming Arif's vehicle (only when on the same vertical level — not below flyovers/malls!)
          const sameVerticalLevel = Math.abs(veh.y - this.playerPos.y) <= 3.5;
          if (this.activeVehicleId && sameVerticalLevel) {
            const playerVeh = this.vehicles.find(
              (v) => v.id === this.activeVehicleId
            );
            if (playerVeh) {
              const d = Math.hypot(veh.x - playerVeh.x, veh.z - playerVeh.z);
              if (d < 3.2) {
                dhakaAudio.playSfx('hit');
                this.spawnImpactSparks(
                  (veh.x + playerVeh.x) * 0.5,
                  0.9,
                  (veh.z + playerVeh.z) * 0.5,
                  '#f59e0b',
                  1.8
                );
                playerVeh.health = Math.max(0, playerVeh.health - 14);
                if (playerVeh.health <= 0) {
                  this.explodeVehicle(playerVeh);
                }
                playerVeh.speed *= 0.75;
                const pushAngle = Math.atan2(
                  playerVeh.x - veh.x,
                  playerVeh.z - veh.z
                );
                playerVeh.x += Math.sin(pushAngle) * 0.8;
                playerVeh.z += Math.cos(pushAngle) * 0.8;
              }
            }
          } else if (sameVerticalLevel && distToPlayer < 3.6) {
            store.damagePlayer(14 * dt);
          }

          // Police Arrest / Busted check when player is stopped & cornered on the same floor/road level
          const isPlayerStopped = this.activeVehicleId
            ? Math.abs(this.vehicles.find((v) => v.id === this.activeVehicleId)?.speed || 0) < 2.0
            : true;
          if (sameVerticalLevel && distToPlayer < 4.8 && isPlayerStopped && !store.isBusted && !store.isWasted) {
            this.policeArrestTimer += dt;
            if (this.policeArrestTimer > 2.2) {
              this.policeArrestTimer = 0;
              store.triggerBusted();
            }
          } else if (distToPlayer > 8.0) {
            this.policeArrestTimer = Math.max(0, this.policeArrestTimer - dt * 2);
          }

          // Armed DMP Police Warning/Pursuit Fire at Wanted ★2+ when on same vertical deck
          if (wantedLevel >= 2 && sameVerticalLevel && distToPlayer < 28 && distToPlayer > 6.0) {
            this.policeFireCooldown -= dt;
            if (this.policeFireCooldown <= 0) {
              this.policeFireCooldown = Math.max(0.85, 2.2 - wantedLevel * 0.25);
              dhakaAudio.playSfx('gunshot');
              this.spawnImpactSparks(veh.x, veh.y + 1.5, veh.z, '#facc15', 0.9);
              if (Math.random() < 0.45) {
                const pVeh = this.activeVehicleId
                  ? this.vehicles.find((pv) => pv.id === this.activeVehicleId)
                  : null;
                const enclosedVeh =
                  pVeh &&
                  (pVeh.type === 'car' ||
                    pVeh.type === 'pickup' ||
                    pVeh.type === 'bus' ||
                    pVeh.type === 'police');
                if (pVeh && enclosedVeh) {
                  pVeh.health = Math.max(0, pVeh.health - 8);
                  store.damagePlayer(2);
                  this.spawnImpactSparks(
                    pVeh.x,
                    pVeh.y + 1.1,
                    pVeh.z,
                    '#facc15',
                    1.2
                  );
                  if (pVeh.health <= 0) {
                    this.explodeVehicle(pVeh);
                  }
                } else {
                  store.damagePlayer(7);
                  this.spawnImpactSparks(
                    this.playerPos.x,
                    this.playerPos.y + 1.1,
                    this.playerPos.z,
                    '#ef4444',
                    1.1
                  );
                }
              }
            }
          }

          const elev = this.getRoadElevation(veh.x, veh.z, veh.y);
          veh.y = elev;
          mesh.position.set(veh.x, elev, veh.z);
          mesh.rotation.y = veh.rotation;
          const pFwdX = Math.sin(veh.rotation);
          const pFwdZ = Math.cos(veh.rotation);
          const pProbeDist = 2.0;
          const pFrontY = this.getRoadElevation(veh.x + pFwdX * pProbeDist, veh.z + pFwdZ * pProbeDist, veh.y);
          const pBackY = this.getRoadElevation(veh.x - pFwdX * pProbeDist, veh.z - pFwdZ * pProbeDist, veh.y);
          mesh.rotation.x = Math.atan2(pFrontY - pBackY, pProbeDist * 2);
          this.animateVehicleWheels(
            mesh,
            chaseSpeed,
            dt,
            Math.max(-1, Math.min(1, diff * 2))
          );
          continue;
        }
      }

      const stats = VEHICLE_STATS[veh.type];
      const cruiseSpeed = stats.maxSpeed * 0.36;

      // Traffic AI: Strictly lock rotation to assigned road axis & lane direction (NEVER spin or turn sideways into medians)
      let targetAngle: number;
      if (veh.roadAxis === 'ew') {
        targetAngle = (veh.laneDirection ?? 1) > 0 ? Math.PI / 2 : -Math.PI / 2;
      } else {
        targetAngle = (veh.laneDirection ?? 1) > 0 ? 0 : Math.PI;
      }
      veh.rotation = targetAngle;

      const forwardX = Math.sin(veh.rotation);
      const forwardZ = Math.cos(veh.rotation);
      const rightX = Math.cos(veh.rotation);
      const rightZ = -Math.sin(veh.rotation);

      let blockedAhead = false;

      // 1. Check distance to player directly ahead in this lane (same road deck)
      const pDx = this.playerPos.x - veh.x;
      const pDz = this.playerPos.z - veh.z;
      const pForward = pDx * forwardX + pDz * forwardZ;
      const pLateral = Math.abs(pDx * rightX + pDz * rightZ);

      if (Math.abs(veh.y - this.playerPos.y) <= 2.5 && pForward > 0.2 && pForward < 8.0 && pLateral < 2.5) {
        blockedAhead = true;
        if (Math.random() < 0.015) {
          dhakaAudio.playHorn(stats.hornType);
        }
      }

      // Fast moving AI vehicle knocks back & damages player on foot if collided
      if (
        !this.activeVehicleId &&
        this.playerTrafficHitCooldown <= 0 &&
        Math.abs(veh.y - this.playerPos.y) <= 2.4 &&
        Math.abs(veh.speed) > 5.0 &&
        distToPlayer < 2.15
      ) {
        this.playerTrafficHitCooldown = 0.85;
        dhakaAudio.playSfx('hit');
        dhakaAudio.playSfx('pain_grunt');
        this.cameraTrauma = Math.min(1.0, this.cameraTrauma + 0.35);
        store.damagePlayer(Math.round(Math.min(22, Math.abs(veh.speed) * 1.1)));
        const knockX = this.playerPos.x + forwardX * 2.2 + rightX * 0.8;
        const knockZ = this.playerPos.z + forwardZ * 2.2 + rightZ * 0.8;
        if (!this.checkBuildingCollision(knockX, knockZ, 0.35, this.playerPos.y)) {
          this.playerPos.x = clampWorldCoord(knockX);
          this.playerPos.z = clampWorldCoord(knockZ);
        }
        veh.speed *= 0.4;
      }

      // 2. Directional forward lane queueing check (same deck, including cross-traffic inside intersections)
      if (!blockedAhead && distToPlayer < 110) {
        for (const otherVeh of this.vehicles) {
          if (otherVeh.id === veh.id) continue;
          if (Math.abs(otherVeh.y - veh.y) > 2.5) continue;
          if (Math.abs(otherVeh.x - veh.x) > 28 || Math.abs(otherVeh.z - veh.z) > 28) continue;
          const dx = otherVeh.x - veh.x;
          const dz = otherVeh.z - veh.z;
          const forwardDist = dx * forwardX + dz * forwardZ;
          const lateralDist = Math.abs(dx * rightX + dz * rightZ);

          const oStats = VEHICLE_STATS[otherVeh.type];
          const isSameAxis = otherVeh.roadAxis === veh.roadAxis;
          const safeFollowDist = (stats.length + oStats.length) * 0.5 + (isSameAxis ? 2.8 : 1.8);
          const latLimit = isSameAxis ? 2.4 : 3.1;

          if (forwardDist > 0.3 && forwardDist < safeFollowDist && lateralDist < latLimit) {
            blockedAhead = true;
            if (Math.random() < 0.008) {
              dhakaAudio.playHorn(stats.hornType);
            }
            break;
          }
        }
      }

      // 3. Static building, median barrier or metro pillar collision directly ahead
      const elev = this.getRoadElevation(veh.x, veh.z, veh.y);
      veh.y = elev;
      if (!blockedAhead) {
        const probeDist = stats.length * 0.5 + 2.2;
        const probeX = veh.x + forwardX * probeDist;
        const probeZ = veh.z + forwardZ * probeDist;

        // Check building colliders (fast broadphase rejection)
        for (const b of this.buildingColliders) {
          if (Math.abs(probeX - (b.minX + b.maxX) * 0.5) > (b.maxX - b.minX) * 0.5 + 2.0) continue;
          if (Math.abs(probeZ - (b.minZ + b.maxZ) * 0.5) > (b.maxZ - b.minZ) * 0.5 + 2.0) continue;
          if (b.minY !== undefined && elev < b.minY) continue;
          if (b.maxY !== undefined && elev > b.maxY) continue;
          if (veh.roadAxis === 'ew' && b.tag === 'road_median') continue;

          if (
            probeX + 1.2 > b.minX &&
            probeX - 1.2 < b.maxX &&
            probeZ + 1.2 > b.minZ &&
            probeZ - 1.2 < b.maxZ
          ) {
            blockedAhead = true;
            break;
          }
        }
      }

      // 3.5 Synchronized Dhaka Intersection Traffic Signal (16s cycle: 7s NS green, 1s clear, 7s EW green, 1s clear)
      if (!blockedAhead && elev < 1.5 && distToPlayer < 130) {
        const sigCycle = (performance.now() * 0.001) % 16;
        const nsGreen = sigCycle < 7.0;
        const ewGreen = sigCycle >= 8.0 && sigCycle < 15.0;
        const isMyGreen = veh.roadAxis === 'ns' ? nsGreen : ewGreen;
        if (!isMyGreen) {
          const majorX = [-170, 0, 220];
          const majorZ = [-175, 0, 175];
          const probeStopX = veh.x + forwardX * (stats.length * 0.5 + 4.5);
          const probeStopZ = veh.z + forwardZ * (stats.length * 0.5 + 4.5);
          const nearFarmgateRoundabout = Math.hypot(probeStopX, probeStopZ) < 22;
          const nearCross =
            !nearFarmgateRoundabout &&
            (veh.roadAxis === 'ns'
              ? majorX.some((mx) => Math.abs(veh.x - mx) < 12) &&
                majorZ.some((mz) => Math.abs(probeStopZ - mz) < 14 && Math.abs(veh.z - mz) > 10)
              : majorZ.some((mz) => Math.abs(veh.z - mz) < 12) &&
                majorX.some((mx) => Math.abs(probeStopX - mx) < 14 && Math.abs(veh.x - mx) > 10));
          if (nearCross) {
            blockedAhead = true;
          }
        }
      }

      // Intersection anti-gridlock rule: If vehicle is currently within an intersection,
      // it must keep moving forward to clear the cross-street box and avoid blocking traffic sideways.
      const isInsideJunction = Math.abs(veh.x) < 14 && Math.abs(veh.z) < 14;
      if (isInsideJunction && blockedAhead && pForward > 4.0) {
        // Only yield if player is directly inches in front; otherwise cruise through junction
        blockedAhead = false;
      }

      // Smooth deceleration to 0 when blocked, or smooth acceleration to cruise speed when clear
      if (blockedAhead) {
        veh.speed = Math.max(0, veh.speed - stats.braking * dt * 2.5);
      } else {
        veh.speed = Math.min(cruiseSpeed, veh.speed + stats.acceleration * dt * 1.2);
        veh.x += forwardX * veh.speed * dt;
        veh.z += forwardZ * veh.speed * dt;
      }

      // Seamless corridor boundary wrapping across expanded 5000m Dhaka world
      if (veh.roadAxis === 'ew' || Math.abs(forwardX) > 0.7) {
        if (forwardX > 0 && veh.x > 1180) {
          veh.x = -1180;
        } else if (forwardX < 0 && veh.x < -1180) {
          veh.x = 1180;
        }
      } else {
        if (forwardZ > 0 && veh.z > 780) {
          veh.z = -1380;
        } else if (forwardZ < 0 && veh.z < -1390) {
          veh.z = 780;
        }
      }

      mesh.position.set(veh.x, elev, veh.z);
      mesh.rotation.y = veh.rotation;
      if (distToPlayer < 95) {
        const tProbeDist = (stats.length || 4.2) * 0.45;
        const tFrontY = this.getRoadElevation(veh.x + forwardX * tProbeDist, veh.z + forwardZ * tProbeDist, veh.y);
        const tBackY = this.getRoadElevation(veh.x - forwardX * tProbeDist, veh.z - forwardZ * tProbeDist, veh.y);
        mesh.rotation.x = Math.atan2(tFrontY - tBackY, tProbeDist * 2);
        this.animateVehicleWheels(mesh, veh.speed, dt, 0);
        const aiHeadlights =
          store.weather === 'night' ||
          store.weather === 'monsoon_rain' ||
          store.timeOfDay < 5.8 ||
          store.timeOfDay > 19.2;
        this.updateVehicleTailLightGlow(mesh, blockedAhead || veh.speed < 0.8, false, 0, aiHeadlights);
      } else {
        mesh.rotation.x = 0;
      }
    }
  }

  private updateNPCAI(dt: number) {
    this.npcAnimFrame++;
    const t = performance.now() * 0.008;
    const store = useGameStore.getState();
    const px = this.playerPos.x;
    const pz = this.playerPos.z;

    for (let i = 0; i < this.npcs.length; i++) {
      const npc = this.npcs[i];
      const limbs = this.npcLimbsMap.get(npc.id);
      if (!limbs) continue;

      const distToPlayer = Math.hypot(npc.x - px, npc.z - pz);

      // Distance culling: hide and streamline distant pedestrians
      const npcCullDist = this.perfDegraded ? 95 : 130;
      limbs.group.visible = distToPlayer < npcCullDist;
      if (distToPlayer >= npcCullDist) {
        if (!npc.isDead && npc.aiState === 'walk') {
          const dx = npc.walkTargetX - npc.x;
          const dz = npc.walkTargetZ - npc.z;
          if (Math.hypot(dx, dz) < 2) {
            const hz = npc.homeZ ?? 0;
            npc.walkTargetZ = npc.walkTargetZ >= hz ? hz - 55 : hz + 55;
            npc.walkTargetX = npc.homeX ?? npc.x;
          } else {
            npc.x += (dx > 0 ? 1 : -1) * 2.0 * dt;
            npc.z += (dz > 0 ? 1 : -1) * 2.0 * dt;
            limbs.group.position.set(npc.x, npc.homeY ?? 0, npc.z);
          }
        }
        continue;
      }

      // Handle Dead Pedestrians with Progressive Ragdoll Collapse & Corpse Persistence
      if (npc.isDead) {
        if (npc.deathTimer === undefined) npc.deathTimer = 0;
        npc.deathTimer += dt;
        const tumbleDur = 0.52;

        if (npc.deathTimer <= tumbleDur) {
          const progress = Math.min(1.0, npc.deathTimer / tumbleDur);
          // Ease in quad for gravity acceleration
          const ease = progress * progress;
          // Smoothly lower torso from standing (1.0m) to ground level (0.08m)
          const fallY = 0.08 + (1.0 - ease) * 0.92;
          // Momentum slide along impact vector
          const slideSpeed = (1.0 - progress) * 2.8;
          if (npc.deathVx && npc.deathVz) {
            npc.x += npc.deathVx * slideSpeed * dt;
            npc.z += npc.deathVz * slideSpeed * dt;
          }
          limbs.group.position.set(npc.x, fallY, npc.z);
          // Pitch down to pavement
          limbs.group.rotation.x = (-Math.PI / 2) * ease;
          if (npc.deathVx && npc.deathVz) {
            limbs.group.rotation.y = Math.atan2(npc.deathVx, npc.deathVz);
          }
          setDeathRagdollPose(limbs, npc.deathType || 'gunshot', progress);
        } else {
          // Corpse is settled at ground level with realistic bone ragdoll posture
          limbs.group.position.set(npc.x, 0.08, npc.z);
          limbs.group.rotation.x = -Math.PI / 2;
          setDeathRagdollPose(limbs, npc.deathType || 'gunshot', 1.0);
          if (!npc.bloodDecalSpawned) {
            npc.bloodDecalSpawned = true;
            this.spawnBloodDecal(npc.x, npc.z, 1.45);
          }
        }

        npc.respawnTimer = (npc.respawnTimer ?? 45) - dt;
        if (npc.respawnTimer <= 0) {
          if (npc.isMissionEnemy) {
            limbs.group.visible = false;
            continue;
          }
          // Revive at original neighborhood / mall floor post
          npc.isDead = false;
          npc.aiState = npc.id.startsWith('mall_npc_') ? 'idle' : 'walk';
          npc.health = 100;
          npc.deathTimer = 0;
          npc.bloodDecalSpawned = false;
          limbs.group.rotation.x = 0;
          limbs.group.rotation.z = 0;
          if (limbs.weaponMesh) limbs.weaponMesh.visible = true;
          npc.x = npc.homeX ?? (Math.random() - 0.5) * 80;
          npc.z = npc.homeZ ?? (Math.random() - 0.5) * 120;
          const ry = npc.homeY ?? 0;
          limbs.group.position.set(npc.x, ry, npc.z);
        }
        continue;
      }

      // Handle Ejected Drivers (tumble flat on the pavement, then stand up and flee)
      if (npc.isEjectedDriver && (npc.ejectedTumbleTimer ?? 0) > 0) {
        npc.ejectedTumbleTimer = (npc.ejectedTumbleTimer ?? 0) - dt;
        limbs.group.position.set(npc.x, 0.08, npc.z);
        limbs.group.rotation.x = -Math.PI / 2;
        if (npc.ejectedTumbleTimer <= 0) {
          limbs.group.rotation.x = 0;
          npc.aiState = 'flee';
          npc.walkTargetX = npc.x + (Math.random() - 0.5) * 80;
          npc.walkTargetZ = npc.z + (Math.random() - 0.5) * 80;
        }
        continue;
      }

      // Handle Pedestrian Retaliation / Mission Enemy Combat
      if (npc.retaliateCooldown !== undefined && npc.retaliateCooldown > 0) {
        const sameElev = Math.abs(limbs.group.position.y - this.playerPos.y) <= 2.6;
        const toPlayerX = this.playerPos.x - npc.x;
        const toPlayerZ = this.playerPos.z - npc.z;
        const pDist = Math.hypot(toPlayerX, toPlayerZ);
        if (sameElev && pDist < 28) {
          npc.retaliateCooldown -= dt;
          npc.rotation = Math.atan2(toPlayerX, toPlayerZ);
          limbs.group.rotation.y = npc.rotation;

          if (npc.isMissionEnemy && pDist > 2.0 && pDist < 24) {
            const nx = npc.x + Math.sin(npc.rotation) * 3.1 * dt;
            const nz = npc.z + Math.cos(npc.rotation) * 3.1 * dt;
            if (!this.checkBuildingCollision(nx, nz, 0.4, limbs.group.position.y)) {
              npc.x = nx;
              npc.z = nz;
              limbs.group.position.set(npc.x, limbs.group.position.y, npc.z);
            }
          }

          if (npc.retaliateCooldown <= 0.35 && npc.retaliateCooldown + dt > 0.35 && sameElev) {
            dhakaAudio.playSfx('punch_swing');
            if (pDist < 2.4) {
              dhakaAudio.playSfx('hit');
              dhakaAudio.playSfx('pain_grunt');
              store.damagePlayer(npc.isMissionEnemy ? 14 : 10);
              this.spawnImpactSparks(this.playerPos.x, this.playerPos.y + 1.15, this.playerPos.z, '#ef4444', 1.2);
              this.cameraTrauma = Math.min(1.0, this.cameraTrauma + 0.25);
            }
          }
          if (npc.retaliateCooldown <= 0) {
            if (npc.isMissionEnemy) {
              npc.retaliateCooldown = 1.6;
            } else {
              npc.aiState = 'flee';
            }
          }
        }
      }

      // Check Fatal Collisions with Player Vehicle (3D elevation-aware)
      if (this.activeVehicleId) {
        const pv = this.vehicles.find((v) => v.id === this.activeVehicleId);
        const npcY = limbs.group.position.y;
        if (pv && Math.abs(pv.speed) > 4.5 && Math.abs(npcY - pv.y) <= 2.5) {
          const d = Math.hypot(npc.x - pv.x, npc.z - pv.z);
          if (d < 2.3 && !npc.isDead) {
            const impactSpeed = Math.abs(pv.speed);

            if (impactSpeed > 5.5 && !npc.isStoryNPC) {
              // FATAL HIT - Pedestrian killed in realistic road accident!
              npc.isDead = true;
              npc.aiState = 'dead';
              npc.health = 0;
              npc.deathTimer = 0.0;
              npc.deathType = 'vehicle';
              const launchAngle = pv.rotation + (Math.random() - 0.5) * 0.35;
              npc.deathVx = Math.sin(launchAngle);
              npc.deathVz = Math.cos(launchAngle);
              npc.respawnTimer = 45;

              // Launch pedestrian forward along vehicle trajectory with physics momentum
              const launchDist = Math.min(10, impactSpeed * 0.65);
              npc.x += Math.sin(launchAngle) * launchDist;
              npc.z += Math.cos(launchAngle) * launchDist;

              setDeathRagdollPose(limbs, 'vehicle', 0.1);

              // Authentic crash audio & visceral camera trauma
              dhakaAudio.playSfx('crash');
              dhakaAudio.playSfx('hit');
              dhakaAudio.playSfx('bone_crack');
              dhakaAudio.playSfx('death_groan');
              this.cameraTrauma = Math.min(1.0, this.cameraTrauma + 0.45);

              // Arterial blood spray & expanding blood pool
              this.spawnDirectionalBloodSpray(npc.x, npcY + 0.8, npc.z, npc.deathVx, npc.deathVz, 36);
              this.spawnBloodDecal(npc.x, npc.z, 1.6, npcY);
              this.spawnImpactSparks(npc.x, npcY + 0.25, npc.z, '#7f1d1d', 3.0);
              this.spawnImpactSparks(npc.x, npcY + 0.45, npc.z, '#b91c1c', 2.2);
              this.spawnGlassShatter(
                pv.x + Math.sin(pv.rotation) * 1.8,
                pv.y + 0.75,
                pv.z + Math.cos(pv.rotation) * 1.8,
                12
              );

              // Spawn collectible cash drop from pedestrian
              this.spawnCashDrop(
                npc.x + (Math.random() - 0.5) * 1.2,
                npc.z + (Math.random() - 0.5) * 1.2,
                Math.floor(Math.random() * 350 + 150)
              );

              // Police escalation: Vehicular Manslaughter
              store.setWantedLevel(Math.max(2, store.wantedLevel + 1));
              store.showBanner({
                titleEn: 'FATAL VEHICLE ACCIDENT!',
                titleBn: 'মারাত্মক সড়ক দুর্ঘটনা!',
                subtitleEn:
                  'Pedestrian casualty reported! DMP Patrol units dispatched (Wanted ★).',
                subtitleBn:
                  'দুর্ঘটনায় পথচারীর মৃত্যু! ট্রাফিক পুলিশ তল্লাশি শুরু করেছে।',
                tone: 'red',
              });

              // Alert nearby pedestrians to flee in terror
              this.alertNearbyPedestrians(npc.x, npc.z, 28);
            } else {
              dhakaAudio.playSfx('hit');
              // Non-fatal knockback
              npc.aiState = 'flee';
              const away = Math.atan2(npc.x - pv.x, npc.z - pv.z);
              npc.x += Math.sin(away) * 3.2;
              npc.z += Math.cos(away) * 3.2;
              this.spawnImpactSparks(npc.x, 0.6, npc.z, '#ef4444', 1.2);
              if (store.wantedLevel === 0) {
                store.setWantedLevel(1);
              }
            }
          }
        }
      }

      // Check Fatal Collisions with AI Traffic Vehicles (3D elevation-aware)
      const npcElevNow = limbs.group.position.y;
      for (const tv of this.vehicles) {
        if (tv.id === this.activeVehicleId) continue;
        if (Math.abs(npcElevNow - tv.y) > 2.5) continue;
        if (Math.abs(npc.x - tv.x) > 10 || Math.abs(npc.z - tv.z) > 10) continue;
        if (Math.abs(tv.speed) > 6.5) {
          const d = Math.hypot(npc.x - tv.x, npc.z - tv.z);
          if (d < 2.0 && !npc.isDead && !npc.isStoryNPC) {
            npc.isDead = true;
            npc.aiState = 'dead';
            npc.health = 0;
            npc.deathTimer = 0.0;
            npc.deathType = 'vehicle';
            const fX = Math.sin(tv.rotation);
            const fZ = Math.cos(tv.rotation);
            npc.deathVx = fX;
            npc.deathVz = fZ;
            npc.respawnTimer = 40;
            setDeathRagdollPose(limbs, 'vehicle', 0.1);
            dhakaAudio.playSfx('bone_crack');
            dhakaAudio.playSfx('death_groan');
            this.spawnDirectionalBloodSpray(npc.x, npcElevNow + 0.6, npc.z, fX, fZ, 24);
            this.spawnBloodDecal(npc.x, npc.z, 1.35, npcElevNow);
            this.spawnImpactSparks(npc.x, 0.25, npc.z, '#b91c1c', 2.0);
            this.spawnCashDrop(npc.x, npc.z, 200);
            dhakaAudio.playSfx('hit');
            this.alertNearbyPedestrians(npc.x, npc.z, 22);
            break;
          }
        }
      }

      if (npc.isDead) continue;

      if (npc.aiState === 'idle') {
        setCharacterAnimationState(limbs, 'idle', dt);
        const d = Math.hypot(
          this.playerPos.x - npc.x,
          this.playerPos.z - npc.z
        );
        if (d < 8) {
          npc.rotation = Math.atan2(
            this.playerPos.x - npc.x,
            this.playerPos.z - npc.z
          );
          limbs.group.rotation.y = npc.rotation;
        }
        continue;
      }

      const isRainingNow = store.weather === 'monsoon_rain';
      if (!npc.isStoryNPC && !npc.isEjectedDriver) {
        ensureNpcUmbrella(limbs, isRainingNow, npc.x + npc.z);
      } else if (limbs.umbrella) {
        limbs.umbrella.visible = false;
      }

      const isFleeing = npc.aiState === 'flee';
      let speed = isFleeing ? 6.5 : isRainingNow ? 3.1 : 2.3;

      // Crosswalk wait at major signalized intersections (excluding open Farmgate roundabout)
      if (!isFleeing && distToPlayer < 95 && Math.hypot(npc.x, npc.z) > 22) {
        const sigCycle = (performance.now() * 0.001) % 16;
        const ewActive = sigCycle >= 8.0 && sigCycle < 15.0;
        const nsActive = sigCycle < 7.0;
        const majorX = [-170, 0, 220];
        const majorZ = [-175, 0, 175];
        const nearCurbEW = ewActive && majorZ.some((mz) => Math.abs(npc.z - mz) > 8.5 && Math.abs(npc.z - mz) < 12.5) && majorX.some((mx) => Math.abs(npc.x - mx) < 11);
        const nearCurbNS = nsActive && majorX.some((mx) => Math.abs(npc.x - mx) > 8.5 && Math.abs(npc.x - mx) < 12.5) && majorZ.some((mz) => Math.abs(npc.z - mz) < 11);
        if (nearCurbEW || nearCurbNS) {
          speed = 0;
        }
      }

      const shouldAnimate = distToPlayer < 60 || (i + this.npcAnimFrame) % 2 === 0;
      if (shouldAnimate) {
        setCharacterAnimationState(limbs, speed === 0 ? 'idle' : isFleeing ? 'run' : 'walk', dt * (distToPlayer < 60 ? 1.0 : 2.0));
      }

      const dx = npc.walkTargetX - npc.x;
      const dz = npc.walkTargetZ - npc.z;
      const dist = Math.hypot(dx, dz);

      if (dist < 1.5) {
        const hz = npc.homeZ ?? 0;
        npc.walkTargetZ = npc.walkTargetZ >= hz ? hz - 55 : hz + 55;
        npc.walkTargetX = npc.homeX ?? npc.x;
        if (npc.aiState === 'flee') npc.aiState = 'walk';
      } else {
        npc.rotation = Math.atan2(dx, dz);
        const nx = npc.x + Math.sin(npc.rotation) * speed * dt;
        const nz = npc.z + Math.cos(npc.rotation) * speed * dt;

        // Check vehicle obstacle clearance (fast broadphase rejection)
        let blockedByVehicle = false;
        for (const veh of this.vehicles) {
          if (Math.abs(nx - veh.x) > 12 || Math.abs(nz - veh.z) > 12) continue;
          const vDist = Math.hypot(nx - veh.x, nz - veh.z);
          const vStats = VEHICLE_STATS[veh.type];
          const clearance = Math.max(vStats.width, vStats.length) * 0.48 + 0.6;
          if (vDist < clearance) {
            blockedByVehicle = true;
            const detourAngle = Math.atan2(nx - veh.x, nz - veh.z);
            npc.walkTargetX = npc.x + Math.sin(detourAngle) * 8;
            npc.walkTargetZ = npc.z + Math.cos(detourAngle) * 8;
            break;
          }
        }

        if (!blockedByVehicle && !this.isPositionInWater(nx, nz) && !this.checkBuildingCollision(nx, nz, 0.45)) {
          npc.x = nx;
          npc.z = nz;
        } else {
          // Divert around buildings, flyover pillars, water & obstacles
          const hz = npc.homeZ ?? 0;
          npc.walkTargetX = (npc.homeX ?? npc.x) + (Math.random() - 0.5) * 12;
          npc.walkTargetZ = npc.z >= hz ? hz - 40 : hz + 40;
        }
      }

      // Keep pedestrians outside vehicle bounding boxes so nobody clips through car bodies or roofs
      for (const veh of this.vehicles) {
        if (Math.abs(npc.x - veh.x) > 10 || Math.abs(npc.z - veh.z) > 10) continue;
        const vDist = Math.hypot(npc.x - veh.x, npc.z - veh.z);
        const vStats = VEHICLE_STATS[veh.type];
        const minRadius = Math.max(vStats.width, vStats.length) * 0.48 + 0.45;
        if (vDist < minRadius && vDist > 0.001) {
          const pushAngle = Math.atan2(npc.x - veh.x, npc.z - veh.z);
          const pushDist = minRadius - vDist + 0.08;
          npc.x += Math.sin(pushAngle) * pushDist;
          npc.z += Math.cos(pushAngle) * pushDist;
        }
      }

      const swing = Math.sin(t + npc.x) * 0.48;
      limbs.leftLeg.rotation.x = swing;
      limbs.rightLeg.rotation.x = -swing;
      limbs.leftArm.rotation.x = -swing * 0.6;
      limbs.rightArm.rotation.x = swing * 0.6;

      limbs.group.position.set(npc.x, 0, npc.z);
      limbs.group.rotation.y = npc.rotation;
    }

    // Modulate crowd murmur & people talking density based on nearby pedestrians
    let nearbyPedCount = 0;
    let closestPedDist = 999;
    for (const npc of this.npcs) {
      if (npc.isDead) continue;
      const d = Math.hypot(npc.x - this.playerPos.x, npc.z - this.playerPos.z);
      if (d < 30) nearbyPedCount++;
      if (d < closestPedDist) closestPedDist = d;
    }

    const crowdDensity = Math.min(1.0, nearbyPedCount / 4);
    dhakaAudio.setCrowdDensity(crowdDensity);

    // Periodically play authentic Bengali street vendor / passerby callouts when near pedestrians
    this.streetChatterTimer += dt;
    if (this.streetChatterTimer > 8.5 && closestPedDist < 14) {
      this.streetChatterTimer = 0;
      if (Math.random() < 0.65) {
        const r = Math.random();
        if (r < 0.30) dhakaAudio.playStreetCallout('vendor');
        else if (r < 0.55) dhakaAudio.playStreetCallout('conductor');
        else if (r < 0.78) dhakaAudio.playStreetCallout('rickshaw');
        else dhakaAudio.playStreetCallout('pedestrian');
      }
    }
  }

  private updateMissionAndInteractionChecks(dt: number) {
    const store = useGameStore.getState();

    const allMissions = [...STORY_MISSIONS, ...SIDE_MISSIONS];
    const activeMission = allMissions.find(
      (m) => m.id === store.activeMissionId
    );

    // Active Dhaka Fare Side-Job Timer & Drop-off Completion
    if (store.activeFareJob) {
      store.tickFareJob(dt);
      const job = useGameStore.getState().activeFareJob;
      if (job) {
        if (this.fareMarkerGroup) {
          this.fareMarkerGroup.visible = true;
          const dropY = this.getRoadElevation(job.dropX, job.dropZ, 0);
          this.fareMarkerGroup.position.set(job.dropX, dropY, job.dropZ);
        }
        const dJob = Math.hypot(this.playerPos.x - job.dropX, this.playerPos.z - job.dropZ);
        if (dJob < 13) {
          store.completeFareJob();
          dhakaAudio.playSfx('mission_complete');
        }
      } else if (this.fareMarkerGroup) {
        this.fareMarkerGroup.visible = false;
      }
    } else if (this.fareMarkerGroup) {
      this.fareMarkerGroup.visible = false;
    }

    if (activeMission) {
      const step = activeMission.steps[store.activeMissionStepIndex];
      if (step) {
        this.missionMarkerGroup.visible = true;
        this.missionMarkerGroup.position.set(step.targetX, 0, step.targetZ);
        this.missionRingMesh.rotation.z += dt * 1.8;

        // Spawn hostile Syndicate Enforcers on combat mission steps!
        if (
          this.lastMissionEnemyStepId !== step.id &&
          (step.id === 'm9_s2' || step.id === 'm4_s2' || step.id === 'm10_s2')
        ) {
          this.lastMissionEnemyStepId = step.id;
          for (let e = 0; e < 3; e++) {
            const ang = (e / 3) * Math.PI * 2;
            const ex = step.targetX + Math.cos(ang) * 5.5;
            const ez = step.targetZ + Math.sin(ang) * 5.5;
            const eid = `mission_enemy_${step.id}_${e}`;
            if (!this.npcs.some((n) => n.id === eid)) {
              const eNpc: NPCEntity = {
                id: eid,
                nameEn: 'Syndicate Enforcer',
                nameBn: 'সিন্ডিকেট সশস্ত্র ক্যাডার',
                role: 'police_officer',
                x: ex,
                z: ez,
                homeX: ex,
                homeZ: ez,
                homeY: step.id === 'm9_s2' ? 0.25 : 0,
                rotation: ang + Math.PI,
                shirtColor: '#7f1d1d',
                pantsColor: '#0f172a',
                dialogueEn: ['Drop your weapon! Nobody interferes with Chairman Sikder!'],
                dialogueBn: ['অস্ত্র নামাও! সিকদারের কাজে কেউ বাধা দিতে পারবে না!'],
                aiState: 'idle',
                walkTargetX: ex,
                walkTargetZ: ez,
                health: 95,
                retaliateCooldown: 1.4,
                isMissionEnemy: true,
              };
              this.npcs.push(eNpc);
              const eLimbs = createCharacterMesh('#7f1d1d', '#0f172a', 'citizen', false, eid, false);
              eLimbs.group.position.set(ex, step.id === 'm9_s2' ? 0.25 : 0, ez);
              this.scene.add(eLimbs.group);
              this.npcLimbsMap.set(eid, eLimbs);
            }
          }
        }

        const distToTarget = Math.hypot(
          this.playerPos.x - step.targetX,
          this.playerPos.z - step.targetZ
        );

        if (step.id === 'm1_s2' && this.activeVehicleId) {
          store.advanceMissionStep();
        } else if (distToTarget <= step.radius && step.id !== 'm1_s2') {
          store.advanceMissionStep();
        }
      } else {
        this.missionMarkerGroup.visible = false;
      }
    } else if (store.customWaypoint) {
      this.missionMarkerGroup.visible = true;
      this.missionMarkerGroup.position.set(
        store.customWaypoint.x,
        0,
        store.customWaypoint.z
      );
    } else {
      this.missionMarkerGroup.visible = false;
    }

    if (this.streetAtmCooldown > 0) this.streetAtmCooldown = Math.max(0, this.streetAtmCooldown - dt);
    if (this.playerTrafficHitCooldown > 0) this.playerTrafficHitCooldown = Math.max(0, this.playerTrafficHitCooldown - dt);

    this.telemetryTimer += dt;
    if (this.telemetryTimer < 0.15) return;
    this.telemetryTimer = 0;

    let district: DistrictId = 'farmgate';
    for (const d of DISTRICTS) {
      if (
        this.playerPos.x >= d.bounds.minX &&
        this.playerPos.x <= d.bounds.maxX &&
        this.playerPos.z >= d.bounds.minZ &&
        this.playerPos.z <= d.bounds.maxZ
      ) {
        district = d.id;
        break;
      }
    }

    const activeVeh = this.activeVehicleId
      ? this.vehicles.find((v) => v.id === this.activeVehicleId) || null
      : null;

    let vehicleGear = 'P';
    if (activeVeh) {
      if (activeVeh.type === 'boat') {
        vehicleGear =
          activeVeh.speed < -0.35
            ? 'R'
            : activeVeh.speed > 0.35
            ? 'FWD'
            : 'N';
      } else if (Math.abs(activeVeh.speed) < 0.35) {
        vehicleGear = 'N';
      } else if (activeVeh.speed < -0.35) {
        vehicleGear = 'R';
      } else {
        const ratio =
          Math.abs(activeVeh.speed) /
          Math.max(1, VEHICLE_STATS[activeVeh.type].maxSpeed);
        vehicleGear = String(Math.min(5, Math.max(1, Math.ceil(ratio * 5))));
      }
    }

    const speedKmh = activeVeh ? Math.round(Math.abs(activeVeh.speed) * 2.6) : 0;
    const vehHp = activeVeh ? Math.round(activeVeh.health) : 100;
    const vehFuel = activeVeh ? Math.round(activeVeh.fuel ?? 100) : 100;
    const stam = Math.round(this.playerStamina);
    const telemetryKey = `${Math.round(this.playerPos.x * 2)}|${Math.round(this.playerPos.z * 2)}|${Math.round(this.playerRotation * 10)}|${district}|${this.activeVehicleId ?? ''}|${speedKmh}|${vehHp}|${vehFuel}|${vehicleGear}|${stam}|${this.isSwimming ? 1 : 0}`;
    if (telemetryKey !== this.lastTelemetryKey) {
      this.lastTelemetryKey = telemetryKey;
      store.updateTelemetry({
        x: this.playerPos.x,
        z: this.playerPos.z,
        rotation: this.playerRotation,
        district,
        inVehicleId: this.activeVehicleId,
        vehicleType: activeVeh ? activeVeh.type : null,
        speedKmh,
        vehicleHealth: vehHp,
        vehicleMaxHealth: activeVeh ? activeVeh.maxHealth : 100,
        vehicleFuel: vehFuel,
        vehicleGear,
        stamina: stam,
        isSwimming: this.isSwimming,
      });
    }

    if (this.metroRide) {
      store.setNearbyPrompt(null);
      return;
    }

    if (this.activeVehicleId) {
      const nearStation = this.cngStationSpots.find(
        (cs) => Math.hypot(cs.x - this.playerPos.x, cs.z - this.playerPos.z) < 12
      );
      if (nearStation && activeVeh && activeVeh.type !== 'rickshaw') {
        store.setNearbyPrompt({
          type: 'poi',
          id: 'cng_station',
          labelEn: nearStation.isMarine
            ? '[E] Marine Fuel Dock: Refuel & Repair Boat — ৳100'
            : '[E] CNG Station: Refuel & Repair Vehicle — ৳100',
          labelBn: nearStation.isMarine
            ? '[E] নৌ ঘাট ফুয়েল: ট্যাংক ফুল ও মেরামত — ৳১০০'
            : '[E] সিএনজি পাম্প: গ্যাস ও গাড়ি মেরামত — ৳১০০',
        });
      } else {
        store.setNearbyPrompt(null);
      }
      return;
    }

    let prompt: NearbyPrompt | null = null;

    for (const shop of this.jfpInteractables) {
      if (Math.abs(shop.y - this.playerPos.y) > 2.4) continue;
      const d = Math.hypot(shop.x - this.playerPos.x, shop.z - this.playerPos.z);
      if (d < 4.0) {
        prompt = {
          type: 'mall_shop',
          id: shop.id,
          labelEn: shop.labelEn,
          labelBn: shop.labelBn,
        };
        break;
      }
    }

    if (!prompt) {
      for (const poi of POINTS_OF_INTEREST) {
        const d = Math.hypot(poi.x - this.playerPos.x, poi.z - this.playerPos.z);
        if (d < 4.8) {
          prompt = {
            type: 'poi',
            id: poi.id,
            labelEn: `[E] ${poi.actionLabelEn}`,
            labelBn: `[E] ${poi.actionLabelBn}`,
          };
          break;
        }
      }
    }

    if (!prompt) {
      const st = this.findNearbyMetroStation();
      if (st) {
        prompt = {
          type: 'poi',
          id: st.id,
          labelEn: `[E / F] Ride Dhaka Metro Rail (${st.nameEn}) — ৳${st.fare}`,
          labelBn: `[E / F] ঢাকা মেট্রোরেলে উঠুন (${st.nameBn}) — ৳${st.fare}`,
        };
      }
    }

    if (!prompt) {
      for (const cs of this.cngStationSpots) {
        const d = Math.hypot(cs.x - this.playerPos.x, cs.z - this.playerPos.z);
        if (d < 6.5) {
          prompt = {
            type: 'poi',
            id: 'cng_station',
            labelEn: '[E] CNG Station: Refuel & Repair Nearby Vehicle — ৳100',
            labelBn: '[E] সিএনজি পাম্প: গ্যাস ও গাড়ি মেরামত — ৳১০০',
          };
          break;
        }
      }
    }

    if (!prompt) {
      for (const atm of this.streetAtmSpots) {
        const d = Math.hypot(atm.x - this.playerPos.x, atm.z - this.playerPos.z);
        if (d < 4.5) {
          prompt = {
            type: 'poi',
            id: 'street_atm',
            labelEn: `[E] ${atm.nameEn}: Withdraw ৳500 Quick Cash`,
            labelBn: `[E] ${atm.nameBn}: ৳৫০০ নগদ উত্তোলন`,
          };
          break;
        }
      }
    }

    if (!prompt) {
      for (const v of this.vehicles) {
        if (v.health <= 0) continue;
        const d = Math.hypot(v.x - this.playerPos.x, v.z - this.playerPos.z);
        if (d < 5.2) {
          const stats = VEHICLE_STATS[v.type];
          prompt = {
            type: 'vehicle',
            id: v.id,
            labelEn: `[F] Drive ${stats.nameEn} (${v.plateNumber})`,
            labelBn: `[F] চালান: ${stats.nameBn} (${v.plateNumber})`,
          };
          break;
        }
      }
    }

    if (!prompt) {
      for (const npc of this.npcs) {
        const limbs = this.npcLimbsMap.get(npc.id);
        const npcY = limbs ? limbs.group.position.y : 0;
        if (Math.abs(npcY - this.playerPos.y) > 2.6) continue;
        const d = Math.hypot(
          npc.x - this.playerPos.x,
          npc.z - this.playerPos.z
        );
        if (d < 4.5) {
          prompt = {
            type: 'npc',
            id: npc.id,
            labelEn: `[T] Talk to ${npc.nameEn}`,
            labelBn: `[T] কথা বলুন: ${npc.nameBn}`,
          };
          break;
        }
      }
    }

    store.setNearbyPrompt(prompt);
  }

  private updateCamera(
    dt: number,
    mode: 'third_person' | 'far_chase' | 'hood_close'
  ) {
    const isRidingMetro = Boolean(this.metroRide);
    const isDriving = Boolean(this.activeVehicleId);
    const isInsideJfp =
      !isRidingMetro &&
      !isDriving &&
      this.playerPos.x >= this.jfpCenter.x - 56 &&
      this.playerPos.x <= this.jfpCenter.x + 56 &&
      this.playerPos.z >= this.jfpCenter.z - 36 &&
      this.playerPos.z <= this.jfpCenter.z + 36;

    let desiredDist = isRidingMetro ? 21.0 : isDriving ? 9.2 : isInsideJfp ? 4.4 : 6.2;
    let heightOffset = isRidingMetro ? 4.6 : isDriving ? 2.4 : isInsideJfp ? 1.68 : 1.75;

    if (!isRidingMetro && !isDriving && this.isAiming) {
      desiredDist = 3.6;
      heightOffset = 1.62;
    } else if (mode === 'far_chase') {
      desiredDist = isRidingMetro ? 28.0 : isDriving ? 13.5 : isInsideJfp ? 5.6 : 9.0;
      heightOffset = isRidingMetro ? 6.0 : isDriving ? 3.4 : isInsideJfp ? 1.85 : 2.3;
    } else if (mode === 'hood_close') {
      desiredDist = isRidingMetro ? 14.0 : isDriving ? 5.6 : isInsideJfp ? 3.4 : 4.0;
      heightOffset = isRidingMetro ? 3.2 : isDriving ? 1.8 : 1.55;
    }

    let targetX = this.playerPos.x;
    const targetY = this.playerPos.y + heightOffset;
    let targetZ = this.playerPos.z;

    // Tactical Over-The-Shoulder Camera Offset when Aiming on Foot
    if (!isDriving && this.isAiming) {
      const shoulderX = Math.cos(this.cameraYaw) * 0.46;
      const shoulderZ = -Math.sin(this.cameraYaw) * 0.46;
      targetX += shoulderX;
      targetZ += shoulderZ;
    }

    // Camera Collision Avoidance: Test ONLY against large solid buildings (never thin street poles/metro pillars)
    const testCamX =
      targetX +
      Math.sin(this.cameraYaw) * Math.cos(this.cameraPitch) * desiredDist;
    const testCamZ =
      targetZ +
      Math.cos(this.cameraYaw) * Math.cos(this.cameraPitch) * desiredDist;

    let occluded = false;
    if (!isRidingMetro) {
      for (const b of this.buildingColliders) {
        if (b.tag === 'road_median') continue;
        if (b.tag === 'flyover_barrier') continue;
        if (isInsideJfp && (b.tag === 'jfp_wall' || b.tag === 'jfp_railing' || b.tag === 'jfp_escalator_rail')) continue;
        if (b.minY !== undefined && targetY < b.minY) continue;
        if (b.maxY !== undefined && targetY > b.maxY) continue;
        if (
          testCamX + 0.6 > b.minX &&
          testCamX - 0.6 < b.maxX &&
          testCamZ + 0.6 > b.minZ &&
          testCamZ - 0.6 < b.maxZ
        ) {
          occluded = true;
          break;
        }
      }
    }

    if (occluded) {
      // Never pull camera closer than 4.5m outdoors (or 3.2m inside shops) — prevents clipping through body
      const safeDist = Math.max(isInsideJfp ? 3.2 : 4.5, desiredDist * 0.6);
      this.currentCameraDist = Math.min(this.currentCameraDist, safeDist);
    } else {
      // Smoothly ease back out to full distance without jumping or oscillating
      this.currentCameraDist +=
        (desiredDist - this.currentCameraDist) * Math.min(1, dt * 5.0);
    }

    const camX =
      targetX +
      Math.sin(this.cameraYaw) *
        Math.cos(this.cameraPitch) *
        this.currentCameraDist;
    const minCamY = this.isSwimming
      ? Math.max(0.85, this.playerPos.y + 1.45)
      : this.playerPos.y + 0.9;
    let camY = Math.max(
      minCamY,
      targetY + Math.sin(this.cameraPitch) * this.currentCameraDist
    );
    if (isInsideJfp) {
      const inAtriumShaft =
        Math.abs(camX - this.jfpCenter.x) < 14 &&
        Math.abs(targetZ - this.jfpCenter.z) < 11;
      const floorCeiling =
        this.playerPos.y >= 8.2 ? 17.0 : this.playerPos.y >= 3.2 ? 10.1 : 5.0;
      if (!inAtriumShaft) {
        camY = Math.min(camY, floorCeiling);
      } else {
        camY = Math.min(camY, 17.0);
      }
    }
    const camZ =
      targetZ +
      Math.cos(this.cameraYaw) *
        Math.cos(this.cameraPitch) *
        this.currentCameraDist;

    // Reuse persistent vector to eliminate GC churn and stutter
    this.cameraTargetPos.set(camX, camY, camZ);
    this.camera.position.lerp(this.cameraTargetPos, Math.min(1, dt * 14));

    // Realistic camera trauma / screen shake on violent collision impacts
    if (this.cameraTrauma > 0.001) {
      const shake = this.cameraTrauma * this.cameraTrauma;
      this.camera.position.x += (Math.random() - 0.5) * 1.8 * shake;
      this.camera.position.y += (Math.random() - 0.5) * 1.2 * shake;
      this.camera.position.z += (Math.random() - 0.5) * 1.8 * shake;
      this.cameraTrauma = Math.max(0, this.cameraTrauma - dt * 2.8);
    }

    // Smooth camera look target in unison with position to eliminate angular jitter
    this.cameraLookTarget.x +=
      (targetX - this.cameraLookTarget.x) * Math.min(1, dt * 18);
    this.cameraLookTarget.y +=
      (targetY - this.cameraLookTarget.y) * Math.min(1, dt * 18);
    this.cameraLookTarget.z +=
      (targetZ - this.cameraLookTarget.z) * Math.min(1, dt * 18);
    this.camera.lookAt(this.cameraLookTarget);
  }

  /**
   * Returns vertical ground/road elevation at world coordinates (X, Z).
   * Supports seamless transition onto elevated Dhaka flyovers, highway approach ramps, and bridges
   * while preserving ground level for pedestrians and vehicles passing underneath.
   */
  public getRoadElevation(x: number, z: number, currentY?: number): number {
    const expDeckElev = 16.2;

    // -1. Jamuna Future Park 3-Floor Shopping Mall & Escalators (X: 464..576, Z: -421..-349)
    const jx = x - this.jfpCenter.x;
    const jz = z - this.jfpCenter.z;
    if (Math.abs(jx) <= 56 && Math.abs(jz) <= 36) {
      const Y0 = 0.25;
      const FLOOR_H = 5.15;
      const Y1 = Y0 + FLOOR_H;     // 5.40m
      const Y2 = Y0 + FLOOR_H * 2; // 10.55m

      // West Escalator (GF Y0 <-> 1F Y1): localX in [-25.0, -20.0], localZ in [-9, +9]
      if (jx >= -25.0 && jx <= -20.0 && jz >= -9.0 && jz <= 9.0) {
        const t = (9.0 - jz) / 18.0;
        const rampY = Y0 + FLOOR_H * Math.max(0, Math.min(1, t));
        if (currentY !== undefined && currentY >= 8.2) {
          return Y2; // 2F gallery walks over West escalator well
        }
        if (currentY === undefined || Math.abs(currentY - rampY) <= 2.35) {
          return rampY;
        }
        return Y0;
      }

      // East Escalator (1F Y1 <-> 2F Y2): localX in [+20.0, +25.0], localZ in [-9, +9]
      if (jx >= 20.0 && jx <= 25.0 && jz >= -9.0 && jz <= 9.0) {
        const t = (9.0 - jz) / 18.0;
        const rampY = Y1 + FLOOR_H * Math.max(0, Math.min(1, t));
        if (currentY !== undefined && currentY >= 3.0 && Math.abs(currentY - rampY) <= 2.35) {
          return rampY;
        }
        return Y0;
      }

      // Open Central Atrium Void (|jx| < 13.8 && |jz| < 10.8): no 1F/2F floor slab!
      const inAtriumVoid = Math.abs(jx) < 13.8 && Math.abs(jz) < 10.8;
      if (!inAtriumVoid && currentY !== undefined) {
        if (currentY >= 8.2) return Y2;
        if (currentY >= 3.2) return Y1;
      }
      return Y0;
    }
    // Jamuna Future Park South Drop-off Marble Plaza Apron
    if (Math.abs(jx) <= 59 && jz > 36 && jz <= 57) {
      return 0.16;
    }

    // 0. High Elevated Structures (Y >= 12.0m) - Priority for top-level Expressway
    if (currentY !== undefined && currentY >= 12.0) {
      if (Math.abs(x - 14) <= 7.1 && z >= -340 && z <= 240) {
        return expDeckElev;
      }
    }

    // 0.5 Walkable Pedestrian Covered Foot Over Bridges & Metro Station Interiors/Escalators
    // Evaluated BEFORE Expressway Ramps (Section 1) so East sidewalk staircases at X~14 are never clamped to Y=0 underneath!
    const fobs: Array<{ bx: number; bz: number; halfSpan: number }> = [
      { bx: 0, bz: -55, halfSpan: 13.5 },
      { bx: 0, bz: 48, halfSpan: 13.0 },
      { bx: 0, bz: 166, halfSpan: 12.5 },
      { bx: -380, bz: -115, halfSpan: 12.5 },
    ];
    for (const f of fobs) {
      const lx = x - f.bx;
      const lz = z - f.bz;
      if (Math.abs(lx) <= f.halfSpan + 3.0 && lz >= -2.2 && lz <= 12.4 && (currentY === undefined || currentY < 9.5)) {
        // Overhead covered walkway deck (Y = 6.40m)
        if (Math.abs(lz) <= 1.75 && Math.abs(lx) <= f.halfSpan + 1.65) {
          if (currentY === undefined || (currentY >= 3.8 && currentY <= 9.2)) {
            return 6.40;
          }
        }
        // West & East stepped staircases + ground entry pads along both sidewalks
        const onSideStair =
          Math.abs(lx - -(f.halfSpan + 1.15)) <= 1.35 ||
          Math.abs(lx - (f.halfSpan + 1.15)) <= 1.35;
        if (onSideStair && lz >= 1.65 && lz <= 12.3) {
          if (lz > 10.05) {
            if (currentY === undefined || currentY <= 2.2) return 0.18;
          } else {
            const t = Math.max(0, Math.min(1, (10.05 - lz) / 8.4));
            const stairElev = 0.42 + t * (6.38 - 0.42);
            if (currentY === undefined || (Math.abs(currentY - stairElev) <= 2.8 && currentY <= 9.2) || stairElev <= 1.5) {
              return stairElev;
            }
          }
        }
      }
    }

    // 0.6 Walkable Metro Rail Entry Kiosks, Escalators, Upper Concourse Halls & Train Platforms (L6 & L5)
    for (const stInt of this.metroStationInteriors) {
      const idx = stInt.inX2 - stInt.inX1;
      const idz = stInt.inZ2 - stInt.inZ1;
      const iLenSq = idx * idx + idz * idz;
      if (iLenSq > 0.1) {
        const rawT = ((x - stInt.inX1) * idx + (z - stInt.inZ1) * idz) / iLenSq;
        if (rawT >= -0.05 && rawT <= 1.05) {
          const t = Math.max(0, Math.min(1, rawT));
          const ipx = stInt.inX1 + idx * t;
          const ipz = stInt.inZ1 + idz * t;
          if (Math.hypot(x - ipx, z - ipz) <= stInt.inHalfW) {
            const stairY = stInt.inY1 + (stInt.inY2 - stInt.inY1) * t;
            if (currentY !== undefined && Math.abs(currentY - stairY) <= 2.4 && currentY >= stInt.inY1 - 1.5) {
              return stairY;
            }
          }
        }
      }
      if (
        x >= stInt.platMinX &&
        x <= stInt.platMaxX &&
        z >= stInt.platMinZ &&
        z <= stInt.platMaxZ &&
        currentY !== undefined &&
        currentY >= stInt.platY - 1.6 &&
        currentY <= stInt.platY + 3.0
      ) {
        return stInt.platY;
      }
      if (
        x >= stInt.concourseMinX &&
        x <= stInt.concourseMaxX &&
        z >= stInt.concourseMinZ &&
        z <= stInt.concourseMaxZ &&
        currentY !== undefined &&
        currentY >= stInt.concourseY - 2.0 &&
        currentY <= stInt.concourseY + 2.5
      ) {
        return stInt.concourseY;
      }
    }
    for (const esc of this.metroEscalators) {
      if (
        x >= esc.landMinX &&
        x <= esc.landMaxX &&
        z >= esc.landMinZ &&
        z <= esc.landMaxZ &&
        (currentY === undefined || (currentY >= esc.landY - 3.2 && currentY <= esc.landY + 2.5))
      ) {
        return esc.landY;
      }
      if (Math.abs(x - esc.kioskX) <= esc.kioskHalfX && Math.abs(z - esc.kioskZ) <= esc.kioskHalfZ) {
        if (currentY === undefined || currentY <= 2.2) {
          return 0.22;
        }
      }
      const dx = esc.x2 - esc.x1;
      const dz = esc.z2 - esc.z1;
      const lenSq = dx * dx + dz * dz;
      if (lenSq > 0.1) {
        const rawT = ((x - esc.x1) * dx + (z - esc.z1) * dz) / lenSq;
        if (rawT >= -0.03 && rawT <= 1.03) {
          const t = Math.max(0, Math.min(1, rawT));
          const px = esc.x1 + dx * t;
          const pz = esc.z1 + dz * t;
          if (Math.hypot(x - px, z - pz) <= esc.halfWidth) {
            const rampElev = esc.y1 + (esc.y2 - esc.y1) * t;
            if (currentY === undefined || (Math.abs(currentY - rampElev) <= 2.6 && currentY <= esc.y2 + 1.5) || rampElev <= 1.2) {
              return rampElev;
            }
          }
        }
      }
    }

    // 1. Dhaka Elevated Expressway On/Off Ramps (Farmgate)
    // Farmgate Southbound On-Ramp (Z: -160 to -40, X: 13.5 to 22.5)
    if (z >= -160 && z <= -40 && x >= 13.2 && x <= 22.8) {
      const t = (z - (-160)) / 120;
      const rampElev = expDeckElev * Math.max(0, Math.min(1, t));
      if (currentY !== undefined && currentY < 2.0 && rampElev > 2.5) {
        return 0; // Ground traffic passing underneath approach
      }
      if (currentY === undefined || Math.abs(currentY - rampElev) <= 2.8 || rampElev <= 0.6) {
        return rampElev;
      }
    }
    // Farmgate Northbound Exit Off-Ramp (Z: 40 to 160, X: 13.5 to 22.5)
    if (z >= 40 && z <= 160 && x >= 13.2 && x <= 22.8) {
      const t = 1 - (z - 40) / 120;
      const rampElev = expDeckElev * Math.max(0, Math.min(1, t));
      if (currentY !== undefined && currentY < 2.0 && rampElev > 2.5) {
        return 0; // Ground traffic passing underneath approach
      }
      if (currentY === undefined || Math.abs(currentY - rampElev) <= 2.8 || rampElev <= 0.6) {
        return rampElev;
      }
    }

    // 2. Mohakhali Elevated Flyover (Z = -175, road width = 13.6m, Y = 9.6m)
    if (Math.abs(z - (-175)) <= 6.8) {
      // West Approach Ramp (-340m to -240m)
      if (x >= -340 && x < -240) {
        const t = (x - (-340)) / 100;
        const rampElev = 9.6 * Math.max(0, Math.min(1, t));
        if (currentY !== undefined && currentY < 2.0 && rampElev > 2.5) {
          return 0; // Ground traffic passing underneath west approach
        }
        if (currentY === undefined || Math.abs(currentY - rampElev) <= 2.8 || rampElev <= 0.6) {
          return rampElev;
        }
      }
      // East Approach Ramp (240m to 340m)
      if (x > 240 && x <= 340) {
        const t = 1 - (x - 240) / 100;
        const rampElev = 9.6 * Math.max(0, Math.min(1, t));
        if (currentY !== undefined && currentY < 2.0 && rampElev > 2.5) {
          return 0; // Ground traffic passing underneath east approach
        }
        if (currentY === undefined || Math.abs(currentY - rampElev) <= 2.8 || rampElev <= 0.6) {
          return rampElev;
        }
      }
      // Main Elevated Flyover Deck (-240m to +240m) at Y = 9.6m
      if (x >= -240 && x <= 240) {
        if (currentY !== undefined && (currentY < 4.5 || currentY > 13.0)) {
          // Pass-through: ground street passing freely under flyover (clearance > 8.0m)
          return 0;
        }
        return 9.6;
      }
    }

    // 3. Dhaka Elevated Expressway Main Deck (when not caught above)
    if (Math.abs(x - 14) <= 7.1 && z >= -340 && z <= 240) {
      if (currentY !== undefined && currentY < 11.5) {
        if (Math.abs(z - (-175)) <= 6.8) return 9.6; // Mohakhali Flyover underneath
        if (Math.abs(z - 240) <= 7.1) return 11.2;   // Hanif Flyover underneath
        return 0; // Ground street passing under Expressway
      }
      return expDeckElev;
    }

    // 4. Mayor Mohammad Hanif Flyover (Z = 240, width 14.2m, Y = 11.2m)
    if (Math.abs(z - 240) <= 7.1) {
      // West Approach Ramp (X: -560 to -440, clear of Mirpur-10 Avenue at X = -380)
      if (x >= -560 && x < -440) {
        const t = (x - (-560)) / 120;
        const rampElev = 11.2 * Math.max(0, Math.min(1, t));
        if (currentY !== undefined && currentY < 2.0 && rampElev > 2.5) {
          return 0; // Ground street passing under approach ramp
        }
        if (currentY === undefined || Math.abs(currentY - rampElev) <= 2.8 || rampElev <= 0.6) {
          return rampElev;
        }
      }
      // East Approach Ramp (X: 440 to 560, clear of Badda Avenue at X = 440)
      if (x > 440 && x <= 560) {
        const t = 1 - (x - 440) / 120;
        const rampElev = 11.2 * Math.max(0, Math.min(1, t));
        if (currentY !== undefined && currentY < 2.0 && rampElev > 2.5) {
          return 0; // Ground street passing under approach ramp
        }
        if (currentY === undefined || Math.abs(currentY - rampElev) <= 2.8 || rampElev <= 0.6) {
          return rampElev;
        }
      }
      // Main Elevated Span Deck (X: -440 to +440) at Y = 11.2m
      if (x >= -440 && x <= 440) {
        if (currentY !== undefined && (currentY < 5.5 || currentY > 13.5)) {
          // Ground street passing under with generous > 9.5m clearance
          return 0;
        }
        return 11.2;
      }
    }

    // 5. Kuril Interchange Flyover (Z = -315, width 14.2m, Y = 11.2m)
    if (Math.abs(z - (-315)) <= 7.1) {
      // West Approach On-Ramp (X: 280 to 360)
      if (x >= 280 && x < 360) {
        const t = (x - 280) / 80;
        const rampElev = 11.2 * Math.max(0, Math.min(1, t));
        if (currentY !== undefined && currentY < 2.0 && rampElev > 2.5) {
          return 0;
        }
        if (currentY === undefined || Math.abs(currentY - rampElev) <= 2.8 || rampElev <= 0.6) {
          return rampElev;
        }
      }
      // East Off-Ramp (X: 720 to 800)
      if (x > 720 && x <= 800) {
        const t = 1 - (x - 720) / 80;
        const rampElev = 11.2 * Math.max(0, Math.min(1, t));
        if (currentY !== undefined && currentY < 2.0 && rampElev > 2.5) {
          return 0;
        }
        if (currentY === undefined || Math.abs(currentY - rampElev) <= 2.8 || rampElev <= 0.6) {
          return rampElev;
        }
      }
      if (x >= 360 && x <= 720) {
        if (currentY !== undefined && currentY < 5.5) {
          // Over Balu River Suspension Bridge (X: 525..655), let Section 9 return bridge elevation (Y = 0.80m + ramps)
          if (x < 525 || x > 655) {
            return 0; // Entity is on 300ft ground expressway under Kuril interchange
          }
        } else {
          return 11.2;
        }
      }
    }

    // 6. Buriganga River Bridges with Continuous Smooth Approach Ramps (Z: 265 to 480)
    if (z >= 265 && z <= 480) {
      // Central First Buriganga Bridge (China-Bangladesh Friendship Bridge at X = 0)
      if (Math.abs(x - 0) <= 12.5) {
        if (z < 285 || z > 460) return 0.08;
        const t = (z - 285) / 175;
        const archElev = 0.08 + 2.75 * Math.sin(t * Math.PI);
        return archElev;
      }

      // Check all North-South arterial bridge crossings spanning Buriganga
      const bRoad = DhakaCityEngine.NS_ROADS.find(
        (r) => r.zMax >= 450 && r.zMin <= 300 && Math.abs(x - r.x) <= r.width / 2 + 2.0
      );
      if (bRoad) {
        // 6.1 North Approach Ramp (Z: 265 to 285, smoothly ascending 0.08 -> 1.0)
        if (z >= 265 && z < 285) {
          const t = (z - 265) / 20;
          return 0.08 + t * 0.92;
        }
        // 6.2 Level River Span Deck (Z: 285 to 460 at Y = 1.0)
        if (z >= 285 && z <= 460) {
          return 1.0;
        }
        // 6.3 South Approach Ramp (Z: 460 to 480, smoothly descending 1.0 -> 0.08)
        if (z > 460 && z <= 480) {
          const t = (480 - z) / 20;
          return 0.08 + t * 0.92;
        }
      }
    }

    // 7. Buriganga River Promenade & Sadarghat Embankment (Z: 288 to 303.5, natural curb Y = 0.16m)
    // Only on pedestrian promenade segments, NOT across ANY active road bridge corridor!
    if (z >= 288 && z <= 303.5 && Math.abs(x) <= 950) {
      const onBridgeRoad = DhakaCityEngine.NS_ROADS.some(
        (r) => r.zMax >= 310 && r.zMin <= 290 && Math.abs(x - r.x) <= r.width / 2 + 2.5
      );
      if (onBridgeRoad) {
        // Return smooth bridge elevation for the road corridor rather than abrupt step
        if (Math.abs(x) <= 12.5) {
          const t = (z - 285) / 175;
          return 0.08 + 2.75 * Math.sin(t * Math.PI);
        }
        return 1.0;
      }
      return 0.16; // Pedestrian embankment promenade at natural curb elevation
    }

    // 8. Hatirjheel Tied-Arch Bridge Deck (X: 210..230, Z: -52.5..42.5 at Y = 0.50m) with smooth 5m approach ramps
    if (x >= 210 && x <= 230 && z >= -57.5 && z <= 47.5) {
      if (z < -52.5) {
        const t = (z - (-57.5)) / 5;
        return 0.08 + t * 0.42;
      }
      if (z > 42.5) {
        const t = (47.5 - z) / 5;
        return 0.08 + t * 0.42;
      }
      return 0.50;
    }

    // 9. Balu River 8-Lane Suspension Bridge Deck at Purbachal (X: 535..645, Z: -326..-304 at Y = 0.80m) with smooth 10m ramps
    if (Math.abs(z - (-315)) <= 11.0 && x >= 525 && x <= 655 && (currentY === undefined || currentY < 5.5)) {
      if (x < 535) {
        const t = (x - 525) / 10;
        return 0.08 + t * 0.72;
      }
      if (x > 645) {
        const t = (655 - x) / 10;
        return 0.08 + t * 0.72;
      }
      return 0.80;
    }

    // 10. Elevated Monument & Exhibition Plazas (Shaheed Minar red altar, BBCFEC entrance plaza)
    if (x >= -45.5 && x <= -30.5 && z >= 53 && z <= 63) {
      return 0.80;
    }
    if (x >= 770 && x <= 830 && z >= -243 && z <= -213) {
      return 0.16;
    }

    return 0;
  }

  private checkBuildingCollision(
    x: number,
    z: number,
    radius: number,
    elev = 0
  ): boolean {
    for (const b of this.buildingColliders) {
      if (b.minY !== undefined && elev < b.minY) continue;
      if (b.maxY !== undefined && elev > b.maxY) continue;
      // Road medians should only block if the center of entity is directly straddling the median,
      // not when driving in the lane with a large bounding sphere!
      const effectiveRadius = b.tag === 'road_median' ? Math.min(radius, 0.25) : radius;
      if (
        x + effectiveRadius > b.minX &&
        x - effectiveRadius < b.maxX &&
        z + effectiveRadius > b.minZ &&
        z - effectiveRadius < b.maxZ
      ) {
        return true;
      }
    }
    if (elev < 1.0) {
      for (const c of this.circleColliders) {
        const dx = x - c.x;
        const dz = z - c.z;
        const r = radius + c.radius;
        if (dx * dx + dz * dz < r * r) {
          return true;
        }
      }
    }
    return false;
  }

  // Checks Building Colliders, Obstacle Circles, Road Railings, Medians, Water Basins, and Other Vehicles!
  private checkWorldObstacle(
    x: number,
    z: number,
    radius: number,
    ignoreVehicleId?: string | null,
    elev = 0
  ): boolean {
    if (this.checkBuildingCollision(x, z, radius, elev)) return true;

    // Dynamic vehicle obstacles (other cars, buses, CNGs, police cruisers) using true oriented bounding boxes (OBBs)
    if (this.vehicles) {
      for (const otherVeh of this.vehicles) {
        if (ignoreVehicleId && otherVeh.id === ignoreVehicleId) continue;
        if (otherVeh.y < -1.0) continue; // Sunken vehicles underwater do not block surface boats/swimmers
        const otherElev = this.getRoadElevation(otherVeh.x, otherVeh.z, otherVeh.y);
        if (Math.abs(elev - otherElev) > 2.5) continue; // Separated vertical levels
        const oStats = VEHICLE_STATS[otherVeh.type];

        // Exact OBB collision check in the vehicle's local frame
        const cosR = Math.cos(otherVeh.rotation);
        const sinR = Math.sin(otherVeh.rotation);
        const relX = x - otherVeh.x;
        const relZ = z - otherVeh.z;
        const localX = relX * cosR - relZ * sinR;
        const localZ = relX * sinR + relZ * cosR;

        const halfW = oStats.width * 0.48;
        const halfL = oStats.length * 0.48;

        const clampedX = Math.max(-halfW, Math.min(localX, halfW));
        const clampedZ = Math.max(-halfL, Math.min(localZ, halfL));

        const diffX = localX - clampedX;
        const diffZ = localZ - clampedZ;

        if (diffX * diffX + diffZ * diffZ < radius * radius) {
          return true;
        }
      }
    }

    return false;
  }
}

function normalizeAngle(a: number): number {
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
}

function clampWorldCoord(v: number): number {
  return Math.max(-1800, Math.min(1800, v));
}
