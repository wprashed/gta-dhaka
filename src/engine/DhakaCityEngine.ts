import * as THREE from 'three';
import {
  DISTRICTS,
  POINTS_OF_INTEREST,
  SIDE_MISSIONS,
  STORY_MISSIONS,
  VEHICLE_STATS,
} from '../data/dhakaWorldData';
import {
  DistrictId,
  NPCEntity,
  NPCRole,
  VehicleEntity,
  VehicleType,
} from '../types/game';
import {
  CharacterLimbs,
  createBurigangaLaunchMesh,
  createCharacterMesh,
  createSketchfabAssetPropMesh,
  createStreetStallMesh,
  createVehicleMesh,
  loadCustomGLBFromUrl,
  setCharacterAnimationState,
  tintCharacterOutfit,
  updateWeaponAttachment,
} from './dhakaModels';
import {
  createBanglaSignTexture,
  createBuildingFacadeTexture,
  createHighwaySignTexture,
  loadRealTexture,
} from './dhakaTextures';
import { NearbyPrompt, useGameStore } from '../store/useGameStore';
import { dhakaAudio } from '../audio/dhakaAudioEngine';

interface BuildingCollider {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
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
  private skyDomeMesh!: THREE.Mesh;
  private waterNormalTex!: THREE.Texture;
  private rainSystem: THREE.Points | null = null;
  private hatirjheelLights: THREE.PointLight[] = [];
  private lastGraphicsQuality: 'high' | 'low' = 'high';

  // World Collision Boxes, Cylinders, Pickups & Live Dhaka Metro Train
  private buildingColliders: BuildingCollider[] = [];
  private circleColliders: CircleCollider[] = [];
  private cashDrops: CashPickupDrop[] = [];
  private metroTrainGroup: THREE.Group | null = null;
  private skidDecals: Array<{ mesh: THREE.Mesh; life: number }> = [];
  private bloodDecals: Array<{ mesh: THREE.Mesh; life: number }> = [];
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
  private lastEquippedOutfit = '';
  private lastEquippedTool = '';

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
      1350
    );

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
      stencil: false,
    });
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.35));
    this.renderer.shadowMap.enabled = true;
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
    this.sunLight.shadow.mapSize.width = 1024;
    this.sunLight.shadow.mapSize.height = 1024;
    this.sunLight.shadow.bias = -0.0004;
    this.sunLight.shadow.camera.near = 10;
    this.sunLight.shadow.camera.far = 480;
    const d = 180;
    this.sunLight.shadow.camera.left = -d;
    this.sunLight.shadow.camera.right = d;
    this.sunLight.shadow.camera.top = d;
    this.sunLight.shadow.camera.bottom = -d;
    this.scene.add(this.sunLight);

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

    // 360° Realistic Dhaka Sunset Sky Dome + Real-Time PBR Environment Reflections
    const skyTex = loadRealTexture('/textures/dhaka_sky_sunset.jpg', 1, 1, true);
    skyTex.mapping = THREE.EquirectangularReflectionMapping;
    this.scene.environment = skyTex;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.18;

    const skyGeo = new THREE.SphereGeometry(1100, 32, 20);
    const skyMat = new THREE.MeshBasicMaterial({
      map: skyTex,
      side: THREE.BackSide,
      fog: false,
    });
    this.skyDomeMesh = new THREE.Mesh(skyGeo, skyMat);
    this.scene.add(this.skyDomeMesh);
  }

  private buildDhakaWorld() {
    // 1. Authentic Dhaka Interlocking Terracotta & Concrete Footpath Plaza Ground Skin
    const dhakaSidewalkBaseTex = loadRealTexture(
      '/textures/dhaka_ground_sidewalk.jpg',
      200,
      200,
      true
    );
    const groundGeo = new THREE.PlaneGeometry(2800, 2800);
    groundGeo.rotateX(-Math.PI / 2);
    const groundMat = new THREE.MeshStandardMaterial({
      map: dhakaSidewalkBaseTex,
      color: '#e2e8f0',
      roughness: 0.84,
    });
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
      12,
      12,
      false
    );
    const waterMat = new THREE.MeshStandardMaterial({
      color: '#0e7490',
      normalMap: this.waterNormalTex,
      normalScale: new THREE.Vector2(0.45, 0.45),
      roughness: 0.14,
      metalness: 0.75,
    });

    const buriganga = new THREE.Mesh(
      new THREE.PlaneGeometry(1800, 150),
      waterMat
    );
    buriganga.rotation.x = -Math.PI / 2;
    buriganga.position.set(0, 0.06, 375);
    this.scene.add(buriganga);

    const embankment = new THREE.Mesh(
      new THREE.BoxGeometry(1800, 1.2, 14),
      new THREE.MeshStandardMaterial({
        map: loadRealTexture('/textures/brick_diffuse.jpg', 60, 1),
        color: '#94a3b8',
        roughness: 0.85,
      })
    );
    embankment.position.set(0, 0.4, 296);
    embankment.receiveShadow = true;
    this.scene.add(embankment);

    [-180, -65, 12, 95, 220].forEach((lx) => {
      const launch = createBurigangaLaunchMesh();
      launch.position.set(lx, 0.2, 318);
      launch.rotation.y = Math.PI / 2 + (lx === 12 ? -0.12 : 0.05);
      this.scene.add(launch);
      this.launchBoats.push(launch);
    });

    const hatirjheelWater = new THREE.Mesh(
      new THREE.PlaneGeometry(130, 160),
      waterMat
    );
    hatirjheelWater.rotation.x = -Math.PI / 2;
    hatirjheelWater.position.set(220, 0.05, -5);
    this.scene.add(hatirjheelWater);

    const dhanmondiWater = new THREE.Mesh(
      new THREE.PlaneGeometry(90, 130),
      waterMat
    );
    dhanmondiWater.rotation.x = -Math.PI / 2;
    dhanmondiWater.position.set(-225, 0.05, 25);
    this.scene.add(dhanmondiWater);

    // Gulshan-Baridhara Diplomatic Lake
    const gulshanWater = new THREE.Mesh(
      new THREE.PlaneGeometry(110, 240),
      waterMat
    );
    gulshanWater.rotation.x = -Math.PI / 2;
    gulshanWater.position.set(330, 0.05, -210);
    this.scene.add(gulshanWater);

    // Uttara Sector 7 Lake
    const uttaraWater = new THREE.Mesh(
      new THREE.PlaneGeometry(85, 160),
      waterMat
    );
    uttaraWater.rotation.x = -Math.PI / 2;
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
    const curbMat = new THREE.MeshStandardMaterial({
      color: '#cbd5e1',
      roughness: 0.65,
    });
    const zebraStripeMat = new THREE.MeshStandardMaterial({
      color: '#f8fafc',
      roughness: 0.55,
    });

    const nsRoads = [
      // Central National Spine: Airport Highway -> Farmgate -> Sadarghat & Buriganga
      { x: 0, width: 20, zMin: -700, zMax: 440 },
      // Dhanmondi / Asad Gate / Agargaon Avenue
      { x: -170, width: 16, zMin: -680, zMax: 440 },
      // Mirpur 10 Circle & Sher-e-Bangla Stadium Avenue
      { x: -380, width: 18, zMin: -680, zMax: 440 },
      // Gabtoli & Kalyanpur Bus Expressway
      { x: -580, width: 18, zMin: -680, zMax: 440 },
      // Gulshan Avenue & Motijheel Financial Spine
      { x: 220, width: 18, zMin: -680, zMax: 440 },
      // Badda / Rampura / Bashundhara Link Avenue
      { x: 440, width: 18, zMin: -680, zMax: 440 },
      // Purbachal 300 Feet Grand Expressway
      { x: 640, width: 22, zMin: -560, zMax: 220 },
      // Old Dhaka Chawkbazar Historical Street
      { x: -70, width: 12, zMin: 80, zMax: 330 },
    ];

    const ewRoads = [
      // Uttara North & Airport Runway Road
      { z: -620, width: 18, xMin: -680, xMax: 680 },
      // Uttara South & Airport Terminal Boulevard
      { z: -460, width: 18, xMin: -680, xMax: 680 },
      // Banani / Airport Flyover & 300ft Entry
      { z: -315, width: 18, xMin: -680, xMax: 680 },
      // Mirpur 10 / Mohakhali Flyover / Gulshan-2
      { z: -175, width: 16, xMin: -680, xMax: 680 },
      // Manik Mia Avenue / Farmgate / Karwan Bazar
      { z: 0, width: 20, xMin: -680, xMax: 680 },
      // Shahbagh / TSC / Motijheel Commercial District
      { z: 175, width: 16, xMin: -680, xMax: 680 },
      // Lalbagh Fort / Chawkbazar / Sadarghat Riverfront
      { z: 285, width: 16, xMin: -680, xMax: 680 },
      // Buriganga 2nd Bridge / Postogola / Keraniganj Highway
      { z: 440, width: 18, xMin: -680, xMax: 680 },
    ];

    // Build seamless junction patches at every intersection point
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
          const segLen = c.zMin - curZ;
          const centerZ = (curZ + c.zMin) / 2;
          const rMesh = new THREE.Mesh(
            new THREE.PlaneGeometry(ns.width, segLen),
            nsRoadMat
          );
          rMesh.rotation.x = -Math.PI / 2;
          rMesh.position.set(ns.x, 0.08, centerZ);
          rMesh.receiveShadow = true;
          this.scene.add(rMesh);

          // Divider stops before intersection
          const divLen = Math.max(1, segLen - 6);
          const divider = new THREE.Mesh(
            new THREE.PlaneGeometry(0.35, divLen),
            yellowLineMat
          );
          divider.rotation.x = -Math.PI / 2;
          divider.position.set(ns.x, 0.095, centerZ);
          this.scene.add(divider);

          // Curbs strictly along segment length (never entering cross street)
          [-ns.width / 2 - 0.55, ns.width / 2 + 0.55].forEach((ox) => {
            this.scene.add(
              this.sharedBox(
                1.1,
                0.22,
                segLen,
                curbMat,
                ns.x + ox,
                0.11,
                centerZ
              )
            );
          });

          // Zebra crosswalk entering cross street
          addZebraCrossing(ns.x, c.zMin - 1.8, true, ns.width);
        }
        curZ = c.zMax;
        // Zebra crosswalk leaving cross street
        addZebraCrossing(ns.x, curZ + 1.8, true, ns.width);
      });

      if (ns.zMax > curZ + 3) {
        const segLen = ns.zMax - curZ;
        const centerZ = (curZ + ns.zMax) / 2;
        const rMesh = new THREE.Mesh(
          new THREE.PlaneGeometry(ns.width, segLen),
          nsRoadMat
        );
        rMesh.rotation.x = -Math.PI / 2;
        rMesh.position.set(ns.x, 0.08, centerZ);
        rMesh.receiveShadow = true;
        this.scene.add(rMesh);

        const divLen = Math.max(1, segLen - 4);
        const divider = new THREE.Mesh(
          new THREE.PlaneGeometry(0.35, divLen),
          yellowLineMat
        );
        divider.rotation.x = -Math.PI / 2;
        divider.position.set(ns.x, 0.095, centerZ);
        this.scene.add(divider);

        [-ns.width / 2 - 0.55, ns.width / 2 + 0.55].forEach((ox) => {
          this.scene.add(
            this.sharedBox(
              1.1,
              0.22,
              segLen,
              curbMat,
              ns.x + ox,
              0.11,
              centerZ
            )
          );
        });
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
          const segLen = c.xMin - curX;
          const centerX = (curX + c.xMin) / 2;
          const rMesh = new THREE.Mesh(
            new THREE.PlaneGeometry(segLen, ew.width),
            ewRoadMat
          );
          rMesh.rotation.x = -Math.PI / 2;
          rMesh.position.set(centerX, 0.08, ew.z);
          rMesh.receiveShadow = true;
          this.scene.add(rMesh);

          const divLen = Math.max(1, segLen - 6);
          const divider = new THREE.Mesh(
            new THREE.PlaneGeometry(divLen, 0.35),
            yellowLineMat
          );
          divider.rotation.x = -Math.PI / 2;
          divider.position.set(centerX, 0.095, ew.z);
          this.scene.add(divider);

          [-ew.width / 2 - 0.55, ew.width / 2 + 0.55].forEach((oz) => {
            this.scene.add(
              this.sharedBox(
                segLen,
                0.22,
                1.1,
                curbMat,
                centerX,
                0.11,
                ew.z + oz
              )
            );
          });

          // Zebra crosswalk entering cross street
          addZebraCrossing(c.xMin - 1.8, ew.z, false, ew.width);
        }
        curX = c.xMax;
        // Zebra crosswalk leaving cross street
        addZebraCrossing(curX + 1.8, ew.z, false, ew.width);
      });

      if (ew.xMax > curX + 3) {
        const segLen = ew.xMax - curX;
        const centerX = (curX + ew.xMax) / 2;
        const rMesh = new THREE.Mesh(
          new THREE.PlaneGeometry(segLen, ew.width),
          ewRoadMat
        );
        rMesh.rotation.x = -Math.PI / 2;
        rMesh.position.set(centerX, 0.08, ew.z);
        rMesh.receiveShadow = true;
        this.scene.add(rMesh);

        const divLen = Math.max(1, segLen - 4);
        const divider = new THREE.Mesh(
          new THREE.PlaneGeometry(divLen, 0.35),
          yellowLineMat
        );
        divider.rotation.x = -Math.PI / 2;
        divider.position.set(centerX, 0.095, ew.z);
        this.scene.add(divider);

        [-ew.width / 2 - 0.55, ew.width / 2 + 0.55].forEach((oz) => {
          this.scene.add(
            this.sharedBox(
              segLen,
              0.22,
              1.1,
              curbMat,
              centerX,
              0.11,
              ew.z + oz
            )
          );
        });
      }
    });

    // 4. Landmarks, Sketchfab Billboards & Buildings
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
    // 1. Giant Illuminated Dhaka Bangla Commercial Billboards (Replacing generic GTA thumbnails)
    const billboardLocations = [
      { x: 24, z: -22, signIdx: 0, rot: -0.4 },
      { x: -25, z: 24, signIdx: 3, rot: 0.5 },
      { x: 202, z: -158, signIdx: 5, rot: -0.3 },
      { x: 202, z: 158, signIdx: 7, rot: 0.3 },
    ];

    billboardLocations.forEach((b) => {
      this.circleColliders.push({
        x: b.x,
        z: b.z,
        radius: 0.6,
        tag: 'billboard_pole',
      });
      const poleGroup = new THREE.Group();
      poleGroup.position.set(b.x, 0, b.z);
      poleGroup.rotation.y = b.rot;

      const pole = new THREE.Mesh(
        new THREE.CylinderGeometry(0.28, 0.36, 9.2, 12),
        new THREE.MeshStandardMaterial({ color: '#334155', metalness: 0.75 })
      );
      pole.position.y = 4.6;
      poleGroup.add(pole);

      const board = new THREE.Mesh(
        new THREE.BoxGeometry(9.6, 4.4, 0.42),
        new THREE.MeshBasicMaterial({ map: createBanglaSignTexture(b.signIdx) })
      );
      board.position.y = 9.4;
      poleGroup.add(board);

      this.scene.add(poleGroup);
    });

    // 2. Iconic Karwan Bazar SAARC Fountain (সার্ক ফোয়ারা - কারওয়ান বাজার মোড়)
    this.circleColliders.push({
      x: 0,
      z: -28,
      radius: 4.3,
      tag: 'saarc_fountain',
    });
    const saarcFountain = new THREE.Group();
    saarcFountain.position.set(0, 0, -28);

    const brickTex = loadRealTexture('/textures/brick_diffuse.jpg', 3, 1, true);
    const fountainPool = new THREE.Mesh(
      new THREE.CylinderGeometry(3.8, 4.1, 0.75, 24),
      new THREE.MeshStandardMaterial({ map: brickTex, color: '#b91c1c', roughness: 0.7 })
    );
    fountainPool.position.y = 0.38;
    saarcFountain.add(fountainPool);

    const poolWater = new THREE.Mesh(
      new THREE.CylinderGeometry(3.4, 3.4, 0.78, 24),
      new THREE.MeshStandardMaterial({
        color: '#0284c7',
        roughness: 0.12,
        metalness: 0.65,
      })
    );
    poolWater.position.y = 0.4;
    saarcFountain.add(poolWater);

    // Steel SAARC Fountain Crown Rings & Water Jets
    const steelMat = new THREE.MeshStandardMaterial({
      color: '#e2e8f0',
      metalness: 0.9,
      roughness: 0.15,
    });
    for (let i = 0; i < 8; i++) {
      const angle = (i * Math.PI) / 4;
      const arch = new THREE.Mesh(
        new THREE.TorusGeometry(2.1, 0.08, 10, 24, Math.PI),
        steelMat
      );
      arch.position.set(Math.cos(angle) * 0.8, 0.75, Math.sin(angle) * 0.8);
      arch.rotation.y = angle;
      saarcFountain.add(arch);
    }
    const centerSpire = new THREE.Mesh(
      new THREE.CylinderGeometry(0.18, 0.45, 4.6, 16),
      steelMat
    );
    centerSpire.position.y = 2.6;
    saarcFountain.add(centerSpire);
    this.scene.add(saarcFountain);

    // 3. Elevated Farmgate Metro Rail Station (ফার্মগেট মেট্রোরেল স্টেশন - MRT Line-6) right at Spawn!
    const farmgateStation = new THREE.Group();
    farmgateStation.position.set(0, 0, 28);

    const concourseSlab = new THREE.Mesh(
      new THREE.BoxGeometry(15.5, 1.1, 34),
      new THREE.MeshStandardMaterial({ color: '#cbd5e1', roughness: 0.6 })
    );
    concourseSlab.position.y = 6.8;
    concourseSlab.castShadow = true;
    farmgateStation.add(concourseSlab);

    // Iconic Curved Green-and-White Dhaka Metro Station Vaulted Canopy Roof
    const stationRoof = new THREE.Mesh(
      new THREE.CylinderGeometry(
        8.4,
        8.4,
        36,
        24,
        1,
        false,
        -Math.PI / 2.3,
        (Math.PI * 2) / 2.3
      )
        .rotateZ(Math.PI / 2)
        .rotateY(Math.PI / 2),
      new THREE.MeshStandardMaterial({
        color: '#047857',
        metalness: 0.45,
        roughness: 0.3,
        side: THREE.DoubleSide,
      })
    );
    stationRoof.scale.set(1, 0.42, 1);
    stationRoof.position.y = 10.6;
    stationRoof.castShadow = true;
    farmgateStation.add(stationRoof);

    // Farmgate Station Name Boards on both North and South ends
    [-17.2, 17.2].forEach((sz) => {
      const stSign = new THREE.Mesh(
        new THREE.BoxGeometry(11.5, 1.35, 0.25),
        new THREE.MeshBasicMaterial({ map: createBanglaSignTexture(3) })
      );
      stSign.position.set(0, 9.8, sz);
      farmgateStation.add(stSign);
    });
    this.scene.add(farmgateStation);

    // 4. Baitul Mukarram National Mosque (বায়তুল মোকাররম জাতীয় মসজিদ) in Paltan/Motijheel West
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

  private spawnSkidMark(x: number, z: number, rotation: number) {
    if (this.skidDecals.length > 50) {
      const old = this.skidDecals.shift();
      if (old) this.scene.remove(old.mesh);
    }
    const skidGeo = this.boxCache(0.32, 0.015, 1.35);
    const skidMat = new THREE.MeshBasicMaterial({
      color: '#0f172a',
      transparent: true,
      opacity: 0.55,
    });
    const mesh = new THREE.Mesh(skidGeo, skidMat);
    mesh.position.set(x, 0.02, z);
    mesh.rotation.y = rotation;
    this.scene.add(mesh);
    this.skidDecals.push({ mesh, life: 8.5 });
  }

  private spawnBloodDecal(x: number, z: number) {
    if (this.bloodDecals.length > 40) {
      const old = this.bloodDecals.shift();
      if (old) this.scene.remove(old.mesh);
    }
    const radius = 1.0 + Math.random() * 0.7;
    const geo = new THREE.CircleGeometry(radius, 14);
    geo.rotateX(-Math.PI / 2);
    const mat = new THREE.MeshBasicMaterial({
      color: '#4a0808',
      transparent: true,
      opacity: 0.85,
      depthWrite: false,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, 0.088, z);
    this.scene.add(mesh);
    this.bloodDecals.push({ mesh, life: 60.0 });
  }

  private spawnGlassShatter(x: number, y: number, z: number, count = 22) {
    const shardGeo = new THREE.TetrahedronGeometry(0.09, 0);
    const shardMat = new THREE.MeshStandardMaterial({
      color: '#e0f2fe',
      roughness: 0.15,
      metalness: 0.85,
      transparent: true,
      opacity: 0.88,
    });
    for (let i = 0; i < count; i++) {
      const mesh = new THREE.Mesh(shardGeo, shardMat);
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
    const steamGeo = new THREE.DodecahedronGeometry(0.24, 0);
    const steamMat = new THREE.MeshBasicMaterial({
      color: '#cbd5e1',
      transparent: true,
      opacity: 0.65,
    });
    for (let i = 0; i < 4; i++) {
      const mesh = new THREE.Mesh(steamGeo, steamMat);
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
    // Buriganga River channel (between Sadarghat embankment z=305 and Keraniganj z=435)
    if (z > 305 && z < 435) {
      // Bridges spanning Buriganga:
      // 1. Central Buriganga Bridge (x: 0, width 20)
      if (x >= -12 && x <= 12) return false;
      // 2. Babubazar / Dhanmondi South Bridge (x: -170, width 16)
      if (x >= -180 && x <= -160) return false;
      // 3. Postogola Bridge (x: 220, width 18)
      if (x >= 210 && x <= 230) return false;
      // 4. Mirpur / Gabtoli River Bridge (x: -580, width 18)
      if (x >= -592 && x <= -568) return false;
      // Walkable Sadarghat launch terminal pontoon & gangways
      const onSadarghatJetty = x >= -40 && x <= 40 && z <= 325;
      if (onSadarghatJetty) return false;
      return true;
    }
    // Dhanmondi Lake
    if (x > -265 && x < -183 && z > -35 && z < 85) return true;
    // Hatirjheel Lake (except bridge deck & central causeway)
    if (x > 165 && x < 275 && z > -80 && z < 70) {
      const onBridge = x >= 208 && x <= 232;
      const onCauseway = z >= -10 && z <= 10;
      if (!onBridge && !onCauseway) return true;
    }
    // Gulshan-Baridhara Lake
    if (x > 280 && x < 380 && z > -290 && z < -130) return true;
    // Uttara Sector 7 Lake
    if (x > -220 && x < -140 && z > -600 && z < -480) return true;
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
  }

  public exitCurrentVehicle() {
    if (!this.activeVehicleId) return;
    const veh = this.vehicles.find((v) => v.id === this.activeVehicleId);
    if (veh) {
      const candidateOffsets = [
        [-Math.cos(veh.rotation) * 2.4, Math.sin(veh.rotation) * 2.4],
        [Math.cos(veh.rotation) * 2.4, -Math.sin(veh.rotation) * 2.4],
        [-Math.sin(veh.rotation) * 3.2, -Math.cos(veh.rotation) * 3.2],
        [Math.sin(veh.rotation) * 3.2, Math.cos(veh.rotation) * 3.2],
      ];
      let safeX = veh.x;
      let safeZ = veh.z;
      for (const [ox, oz] of candidateOffsets) {
        const tx = veh.x + ox;
        const tz = veh.z + oz;
        if (!this.checkWorldObstacle(tx, tz, 0.6, veh.id)) {
          safeX = tx;
          safeZ = tz;
          break;
        }
      }
      this.playerPos.set(safeX, 0, safeZ);
      this.playerLimbs.group.visible = true;
      this.playerLimbs.group.position.copy(this.playerPos);
      this.playerLimbs.group.scale.set(1.0, 1.0, 1.0);
      this.playerLimbs.group.rotation.set(0, this.playerRotation, 0);
      this.playerLimbs.leftArm.rotation.set(0, 0, 0);
      this.playerLimbs.rightArm.rotation.set(0, 0, 0);
      this.playerLimbs.leftLeg.rotation.set(0, 0, 0);
      this.playerLimbs.rightLeg.rotation.set(0, 0, 0);
      if (this.playerLimbs.rpmRig) {
        const rig = this.playerLimbs.rpmRig;
        if (rig.leftUpLeg) rig.leftUpLeg.bone.quaternion.copy(rig.leftUpLeg.rest);
        if (rig.rightUpLeg) rig.rightUpLeg.bone.quaternion.copy(rig.rightUpLeg.rest);
        if (rig.leftLeg) rig.leftLeg.bone.quaternion.copy(rig.leftLeg.rest);
        if (rig.rightLeg) rig.rightLeg.bone.quaternion.copy(rig.rightLeg.rest);
        if (rig.leftArm) rig.leftArm.bone.quaternion.copy(rig.leftArm.rest);
        if (rig.rightArm) rig.rightArm.bone.quaternion.copy(rig.rightArm.rest);
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
      // Find driver model in top-level or descendants
      const driverObj = mesh.getObjectByName('npc_driver');
      if (driverObj) {
        hadDriver = true;
        driverObj.visible = false;
        driverObj.parent?.remove(driverObj);
      }
    }

    // If it was traffic or had a driver, drop the driver out onto the street!
    if (veh.isTraffic || hadDriver) {
      const ejectSide = veh.type === 'bus' ? -2.2 : -1.6; // Driver door / side of bike
      const ejectAngle = veh.rotation + Math.PI / 2;
      const dropX = clampWorldCoord(veh.x + Math.sin(ejectAngle) * ejectSide);
      const dropZ = clampWorldCoord(veh.z + Math.cos(ejectAngle) * ejectSide);

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
      droppedLimbs.group.position.set(dropX, 0.08, dropZ);
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
    const x = Math.abs(this.playerPos.x) < 30 ? (Math.random() > 0.5 ? 4.5 : -4.5) : this.playerPos.x;
    const z = clampWorldCoord(this.playerPos.z + offsetZ);
    const entity: VehicleEntity = {
      id,
      type: 'police',
      x,
      y: 0,
      z,
      rotation: offsetZ > 0 ? Math.PI : 0,
      speed: 16,
      steering: 0,
      health: stats.maxHealth,
      maxHealth: stats.maxHealth,
      color: '#1e3a8a',
      isTraffic: true,
      isPolice: true,
      plateNumber: `ডিএমপি-${Math.floor(Math.random() * 80 + 10)}-${Math.floor(Math.random() * 8000 + 1000)}`,
    };
    this.vehicles.push(entity);
    const mesh = createVehicleMesh('police', '#1e3a8a');
    mesh.position.set(x, 0, z);
    this.scene.add(mesh);
    this.vehicleMeshes.set(id, mesh);
    dhakaAudio.playHorn('siren');
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
      tag: 'bridge_rail_west',
    });
    this.buildingColliders.push({
      minX: 229.6,
      maxX: 230.8,
      minZ: -52.5,
      maxZ: 42.5,
      tag: 'bridge_rail_east',
    });
  }

  private buildMotijheelShaplaMonument() {
    // 1. 3D Motijheel Shapla Chattar (শাপলা চত্বর — Water Lily Monument)
    this.circleColliders.push({
      x: 220,
      z: 175,
      radius: 7.5,
      tag: 'shapla_chattar',
    });
    const shaplaGroup = new THREE.Group();
    shaplaGroup.position.set(220, 0.1, 175);

    const curbRing = new THREE.Mesh(
      new THREE.CylinderGeometry(6.8, 7.2, 0.55, 28),
      new THREE.MeshStandardMaterial({ color: '#facc15', roughness: 0.5 })
    );
    curbRing.position.y = 0.28;
    shaplaGroup.add(curbRing);

    const waterPool = new THREE.Mesh(
      new THREE.CylinderGeometry(6.1, 6.1, 0.65, 28),
      new THREE.MeshPhysicalMaterial({
        color: '#0d9488',
        roughness: 0.15,
        clearcoat: 0.9,
      })
    );
    waterPool.position.y = 0.35;
    shaplaGroup.add(waterPool);

    const stem = new THREE.Mesh(
      new THREE.CylinderGeometry(0.85, 1.35, 5.2, 16),
      new THREE.MeshStandardMaterial({ color: '#15803d', roughness: 0.4 })
    );
    stem.position.y = 2.9;
    shaplaGroup.add(stem);

    const petalMat = new THREE.MeshStandardMaterial({
      color: '#ffffff',
      emissive: '#fef08a',
      emissiveIntensity: 0.22,
      roughness: 0.25,
    });

    // Outer & Inner rings of sculpted 3D Water Lily (Shapla) petals
    for (let ring = 0; ring < 2; ring++) {
      const count = ring === 0 ? 10 : 8;
      const radius = ring === 0 ? 1.55 : 0.95;
      const tilt = ring === 0 ? 0.58 : 0.32;
      for (let i = 0; i < count; i++) {
        const angle = (i * Math.PI * 2) / count + ring * 0.3;
        const petal = new THREE.Mesh(
          new THREE.ConeGeometry(0.78, 3.2, 8),
          petalMat
        );
        petal.position.set(
          Math.cos(angle) * radius,
          5.8 + ring * 0.45,
          Math.sin(angle) * radius
        );
        petal.rotation.z = -Math.cos(angle) * tilt;
        petal.rotation.x = Math.sin(angle) * tilt;
        shaplaGroup.add(petal);
      }
    }

    const stamen = new THREE.Mesh(
      new THREE.SphereGeometry(0.75, 14, 14),
      new THREE.MeshBasicMaterial({ color: '#facc15' })
    );
    stamen.position.y = 6.5;
    shaplaGroup.add(stamen);
    this.scene.add(shaplaGroup);

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

    for (let z = -580; z <= 220; z += 45) {
      if (
        Math.abs(z) < 18 ||
        Math.abs(z + 175) < 18 ||
        Math.abs(z + 315) < 18 ||
        Math.abs(z + 460) < 18
      )
        continue;
      this.circleColliders.push({
        x: -10.5,
        z,
        radius: 1.35,
        tag: 'metro_pillar',
      });
      const pier = new THREE.Mesh(
        new THREE.CylinderGeometry(1.1, 1.25, 11.5, 12),
        concreteMat
      );
      pier.position.set(-10.5, 5.75, z);
      pier.castShadow = true;
      this.scene.add(pier);

      const cap = new THREE.Mesh(
        new THREE.BoxGeometry(6.5, 1.4, 3.2),
        concreteMat
      );
      cap.position.set(-10.5, 11.5, z);
      this.scene.add(cap);
    }

    const girder = new THREE.Mesh(
      new THREE.BoxGeometry(5.2, 1.2, 840),
      concreteMat
    );
    girder.position.set(-10.5, 12.6, -180);
    girder.castShadow = true;
    this.scene.add(girder);

    // Farmgate & Uttara North Elevated Metro Station Canopies
    [-32, -540].forEach((sz) => {
      const stationCanopy = new THREE.Mesh(
        new THREE.CylinderGeometry(6.8, 6.8, 38, 12, 1, false, 0, Math.PI).rotateX(
          Math.PI / 2
        ),
        new THREE.MeshStandardMaterial({
          color: '#0f766e',
          metalness: 0.4,
          roughness: 0.3,
          side: THREE.DoubleSide,
        })
      );
      stationCanopy.position.set(-10.5, 15.2, sz);
      this.scene.add(stationCanopy);
    });

    // Build Animated 4-Coach MRT Line-6 Dhaka Metro Rail Train (ঢাকা মেট্রোরেল)
    const trainGroup = new THREE.Group();
    const coachBodyMat = new THREE.MeshPhysicalMaterial({
      color: '#f8fafc',
      metalness: 0.35,
      roughness: 0.2,
      clearcoat: 0.8,
    });
    const greenStripeMat = new THREE.MeshBasicMaterial({ color: '#16a34a' });
    const redDotMat = new THREE.MeshBasicMaterial({ color: '#dc2626' });
    const winMat = new THREE.MeshBasicMaterial({ color: '#bae6fd' });

    for (let c = 0; c < 4; c++) {
      const cz = c * 11.2 - 16.8;
      const coach = new THREE.Mesh(
        new THREE.BoxGeometry(3.1, 3.1, 10.4),
        coachBodyMat
      );
      coach.position.set(0, 1.65, cz);
      coach.castShadow = true;
      trainGroup.add(coach);

      const stripe = new THREE.Mesh(
        new THREE.BoxGeometry(3.16, 0.48, 10.44),
        greenStripeMat
      );
      stripe.position.set(0, 1.55, cz);
      trainGroup.add(stripe);

      const redStripe = new THREE.Mesh(
        new THREE.BoxGeometry(3.18, 0.16, 10.46),
        redDotMat
      );
      redStripe.position.set(0, 1.32, cz);
      trainGroup.add(redStripe);

      const windows = new THREE.Mesh(
        new THREE.BoxGeometry(3.15, 0.78, 9.2),
        winMat
      );
      windows.position.set(0, 2.15, cz);
      trainGroup.add(windows);
    }

    trainGroup.position.set(-10.5, 13.2, -25);
    this.metroTrainGroup = trainGroup;
    this.scene.add(trainGroup);
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
      metalness: 0.6,
    });
    const canopyMat = new THREE.MeshStandardMaterial({
      color: '#15803d',
      roughness: 0.4,
    });

    signs.forEach((s, idx) => {
      const g = new THREE.Group();
      g.position.set(s.x, 0, s.z);

      const leftPole = new THREE.Mesh(
        new THREE.CylinderGeometry(0.22, 0.22, 7.5, 8),
        poleMat
      );
      leftPole.position.set(-7.8, 3.75, 0);
      g.add(leftPole);

      const rightPole = new THREE.Mesh(
        new THREE.CylinderGeometry(0.22, 0.22, 7.5, 8),
        poleMat
      );
      rightPole.position.set(7.8, 3.75, 0);
      g.add(rightPole);

      // Iconic Dhaka Pedestrian Foot-Overbridge Deck & Green Canopy Roof at Farmgate & Karwan Bazar
      if (idx < 2) {
        const walkway = new THREE.Mesh(
          new THREE.BoxGeometry(16.2, 0.35, 2.4),
          poleMat
        );
        walkway.position.set(0, 5.2, 0);
        g.add(walkway);

        const roof = new THREE.Mesh(
          new THREE.BoxGeometry(16.4, 0.18, 2.8),
          canopyMat
        );
        roof.position.set(0, 7.6, 0);
        g.add(roof);
      }

      const tex = createHighwaySignTexture(s.titleBn, s.titleEn, s.sub);
      const board = new THREE.Mesh(
        new THREE.BoxGeometry(14.5, 3.0, 0.28),
        new THREE.MeshBasicMaterial({ map: tex })
      );
      board.position.set(0, 6.6, 0);
      g.add(board);

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

      // Old Dhaka (Puran Dhaka) Dense Heritage Blocks
      { x: -42, z: 125, w: 15, d: 15, h: 14, style: 'old_dhaka', color: '#fca5a5', signIndex: 0 },
      { x: -42, z: 150, w: 15, d: 16, h: 16, style: 'old_dhaka', color: '#fcd34d', signIndex: 2 },
      { x: -42, z: 215, w: 16, d: 16, h: 13, style: 'old_dhaka', color: '#fdba74', signIndex: 5 },
      { x: -98, z: 135, w: 16, d: 16, h: 15, style: 'old_dhaka', color: '#f9a8d4', signIndex: 6 },
      { x: -98, z: 235, w: 18, d: 15, h: 14, style: 'old_dhaka', color: '#fde047', signIndex: 0 },
      { x: 35, z: 135, w: 18, d: 18, h: 18, style: 'old_dhaka', color: '#fed7aa', signIndex: 4 },
      { x: 35, z: 225, w: 20, d: 16, h: 16, style: 'commercial', color: '#cbd5e1', signIndex: 7 },

      // Motijheel Financial Skyscrapers
      { x: 145, z: 135, w: 24, d: 24, h: 46, style: 'modern_glass', color: '#1e40af', signIndex: 3 },
      { x: 145, z: 220, w: 22, d: 22, h: 42, style: 'modern_glass', color: '#0369a1', signIndex: 3 },
      { x: 265, z: 135, w: 24, d: 24, h: 52, style: 'modern_glass', color: '#0f172a', signIndex: 7 },
      { x: 265, z: 220, w: 22, d: 20, h: 38, style: 'commercial', color: '#94a3b8', signIndex: 1 },

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
      { x: -440, z: -175, w: 34, d: 26, h: 32, style: 'commercial', color: '#3b82f6', signIndex: 6 },
      { x: -500, z: -175, w: 30, d: 24, h: 26, style: 'residential', color: '#fef08a', signIndex: 2 },
      { x: -440, z: -250, w: 36, d: 28, h: 36, style: 'commercial', color: '#10b981', signIndex: 1 },
      { x: -500, z: -250, w: 32, d: 26, h: 28, style: 'residential', color: '#fed7aa', signIndex: 5 },
      { x: -380, z: -250, w: 28, d: 24, h: 30, style: 'residential', color: '#e2e8f0', signIndex: 0 },

      // Purbachal 300ft Expressway & Food Hub
      { x: 620, z: -250, w: 38, d: 26, h: 28, style: 'modern_glass', color: '#06b6d4', signIndex: 7 },
      { x: 560, z: -250, w: 32, d: 24, h: 24, style: 'commercial', color: '#f59e0b', signIndex: 4 },
      { x: 620, z: -175, w: 34, d: 26, h: 26, style: 'commercial', color: '#ec4899', signIndex: 3 },
      { x: 560, z: -175, w: 30, d: 22, h: 22, style: 'residential', color: '#a7f3d0', signIndex: 1 },
      { x: 500, z: -250, w: 28, d: 24, h: 26, style: 'commercial', color: '#6366f1', signIndex: 6 },

      // Bashundhara R/A & Jamuna Future Park Mega Complex
      { x: 440, z: -320, w: 46, d: 36, h: 42, style: 'modern_glass', color: '#0284c7', signIndex: 7 },
      { x: 380, z: -320, w: 32, d: 28, h: 34, style: 'commercial', color: '#e0e7ff', signIndex: 2 },
      { x: 440, z: -400, w: 36, d: 30, h: 38, style: 'modern_glass', color: '#38bdf8', signIndex: 3 },
      { x: 380, z: -400, w: 30, d: 26, h: 30, style: 'residential', color: '#fde68a', signIndex: 5 },

      // Uttara North & Metro Depot (Sector 18)
      { x: -160, z: -540, w: 36, d: 28, h: 32, style: 'modern_glass', color: '#0ea5e9', signIndex: 4 },
      { x: -220, z: -540, w: 32, d: 26, h: 28, style: 'residential', color: '#e2e8f0', signIndex: 0 },
      { x: -280, z: -540, w: 30, d: 24, h: 26, style: 'residential', color: '#bbf7d0', signIndex: 2 },
      { x: -160, z: -460, w: 32, d: 24, h: 30, style: 'commercial', color: '#f43f5e', signIndex: 6 },

      // Lalbagh Heritage & Chawkbazar Old Dhaka
      { x: -170, z: 285, w: 26, d: 22, h: 22, style: 'old_dhaka', color: '#fb923c', signIndex: 5 },
      { x: -230, z: 285, w: 24, d: 20, h: 20, style: 'old_dhaka', color: '#fde047', signIndex: 1 },
      { x: -170, z: 350, w: 26, d: 22, h: 24, style: 'old_dhaka', color: '#f87171', signIndex: 4 },
      { x: -230, z: 350, w: 24, d: 20, h: 22, style: 'old_dhaka', color: '#fed7aa', signIndex: 2 },

      // Keraniganj & Buriganga South Bank Industrial & Garments
      { x: -60, z: 450, w: 34, d: 28, h: 24, style: 'commercial', color: '#64748b', signIndex: 0 },
      { x: 60, z: 450, w: 36, d: 28, h: 26, style: 'commercial', color: '#475569', signIndex: 3 },
      { x: -140, z: 450, w: 32, d: 26, h: 22, style: 'residential', color: '#cbd5e1', signIndex: 7 },
      { x: 140, z: 450, w: 32, d: 26, h: 22, style: 'residential', color: '#94a3b8', signIndex: 5 },
      { x: 0, z: 520, w: 40, d: 30, h: 24, style: 'commercial', color: '#334155', signIndex: 1 },
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
      1,
      2,
      true
    );
    const dhakaOldCityTex = loadRealTexture(
      '/textures/dhaka_old_city_facade.jpg',
      1,
      2,
      true
    );
    const dhakaSidewalkTileTex = loadRealTexture(
      '/textures/dhaka_ground_sidewalk.jpg',
      6,
      6,
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

    const balconyPositions = new Map<
      string,
      Array<{ x: number; y: number; z: number }>
    >();
    buildingBlocks.forEach((b) => {
      // Select authentic orthographic 3D Dhaka architectural facade texture by district style
      const facadeTex =
        b.style === 'old_dhaka'
          ? dhakaOldCityTex
          : b.style === 'commercial'
          ? dhakaCommercialTex
          : b.style === 'residential'
          ? dhakaRealFacadeTex
          : createBuildingFacadeTexture(b.style, b.color);

      const tint =
        b.style === 'modern_glass' ||
        b.style === 'commercial' ||
        b.style === 'old_dhaka'
          ? '#ffffff'
          : b.color;
      const facadeKey = `facade|${b.style}|${tint}|${facadeTex.uuid}`;
      let mat = this.matCache.get(facadeKey) as THREE.MeshStandardMaterial | undefined;
      if (!mat) {
        mat = new THREE.MeshStandardMaterial({
          map: facadeTex,
          color: tint,
          bumpMap: brickBump,
          bumpScale: b.style === 'modern_glass' ? 0.02 : 0.07,
          roughness: b.style === 'modern_glass' ? 0.14 : 0.54,
          metalness: b.style === 'modern_glass' ? 0.76 : 0.16,
        });
        this.matCache.set(facadeKey, mat);
      }

      const mesh = new THREE.Mesh(this.boxCache(b.w, b.h, b.d), mat);
      mesh.position.set(b.x, b.h / 2, b.z);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      this.scene.add(mesh);

      // Ground-Floor Authentic Dhaka Shopfront Arcade Skin (বিরিয়ানি হাউস | ড্রাগ ফার্মেসী)
      // Shared materials: one instance per style instead of one per building.
      const arcadeMat =
        b.style === 'old_dhaka' ? oldArcadeMat : shopArcadeMat;
      const groundArcade = this.sharedBox(
        b.w + 0.24,
        4.1,
        b.d + 0.24,
        arcadeMat,
        b.x,
        2.05,
        b.z
      );
      this.scene.add(groundArcade);

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
      const parapet = this.sharedBox(
        b.w + 0.4,
        0.9,
        b.d + 0.4,
        balconyMat,
        b.x,
        b.h + 0.45,
        b.z
      );
      this.scene.add(parapet);

      // 3D Protruding Dhaka Apartment Balconies (বারান্দা) on upper floors.
      // Deferred: collected per building width and instanced after the loop.
      if (b.style !== 'modern_glass') {
        for (let fy = 7.5; fy < b.h - 2.5; fy += 3.8) {
          const key = (b.w * 0.72).toFixed(2);
          if (!balconyPositions.has(key)) balconyPositions.set(key, []);
          balconyPositions.get(key)!.push({
            x: b.x,
            y: fy,
            z: b.z + (b.z > 0 ? -b.d / 2 - 0.3 : b.d / 2 + 0.3),
          });
        }
      }

      // Rooftop Gazi water tanks — shared geometry, two shared materials.
      const tank = new THREE.Mesh(
        this.boxCache(2.6, 2.3, 2.6),
        b.x % 2 === 0 ? tankBlueMat : tankSlateMat
      );
      tank.position.set(b.x + b.w * 0.22, b.h + 1.15, b.z - b.d * 0.22);
      this.scene.add(tank);

      // Second rooftop tank for the authentic Dhaka skyline
      const tank2 = new THREE.Mesh(
        this.boxCache(2.0, 1.9, 2.0),
        tankDarkMat
      );
      tank2.position.set(b.x - b.w * 0.22, b.h + 0.95, b.z + b.d * 0.18);
      this.scene.add(tank2);

      // Stacked Multi-Floor Bangla Commercial Signboards (Ground, 2nd & 3rd Floor)
      if (b.signIndex !== undefined) {
        const signW = Math.min(b.w * 0.86, 12.5);
        [0, 1, 2].forEach((tier) => {
          if (tier === 2 && b.h < 18) return;
          const signTexIdx = (b.signIndex! + tier * 3) % 8;
          // One material per sign artwork, reused by every board showing it.
          const signKey = `sign|${signTexIdx}`;
          let signMat = this.matCache.get(signKey) as THREE.MeshBasicMaterial | undefined;
          if (!signMat) {
            signMat = new THREE.MeshBasicMaterial({
              map: createBanglaSignTexture(signTexIdx),
            });
            this.matCache.set(signKey, signMat);
          }
          const signY = 4.0 + tier * 3.4;

          // Front-facing Bangla Signboard
          this.scene.add(
            this.sharedBox(
              signW,
              2.2,
              0.32,
              signMat,
              b.x,
              signY,
              b.z + b.d / 2 + 0.22
            )
          );

          // Back-facing Bangla Signboard
          this.scene.add(
            this.sharedBox(
              signW,
              2.2,
              0.32,
              signMat,
              b.x,
              signY,
              b.z - b.d / 2 - 0.22
            )
          );

          // Street-facing Side Bangla Signboard
          const sideSign = new THREE.Mesh(
            this.boxCache(0.32, 2.2, Math.min(b.d * 0.82, 11.5)),
            signMat
          );
          sideSign.position.set(
            b.x + (b.x > 0 ? -b.w / 2 - 0.22 : b.w / 2 + 0.22),
            signY,
            b.z
          );
          this.scene.add(sideSign);
        });
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

    // Realistic Multi-Tiered Tropical Dhaka Trees: Krishnachura (কৃষ্ণচূড়া) & Banyan (বটগাছ)
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

    const treeSpots = [
      // Dhanmondi Lake & Park
      [-190, 10], [-190, 35], [-190, -15], [-152, 25], [-152, -10],
      [-215, 60], [-200, -30], [-235, 15],
      // Hatirjheel Promenade & Gulshan Greenery
      [195, -25], [195, 15], [245, -25], [245, 15],
      [205, 55], [235, -55], [185, -45],
      // Central Farmgate, Airport Road & Manik Mia Avenue
      [-15, -145], [15, -145], [-15, -205], [15, -205],
      [-15, -95], [15, -95], [-15, 95], [15, 95],
      [18, 22], [-22, 22], [22, -22], [-22, -22],
      // Shahbagh, TSC & Curzon Hall Campus Greeneries
      [-35, 160], [35, 160], [-40, 210], [40, 210],
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

      // Flared natural tree trunk with organic taper
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

      const isKrishnachura = idx % 2 === 0;

      if (isKrishnachura) {
        // TROPICAL KRISHNACHURA (Royal Poinciana): Spreading flat umbrella canopy with scarlet floral blossoms
        const umbrella = new THREE.Mesh(
          new THREE.DodecahedronGeometry(2.8, 1),
          krishnachuraGreenMat
        );
        umbrella.scale.set(1.45, 0.48, 1.45);
        umbrella.position.set(0, 4.3, 0);
        umbrella.castShadow = true;
        umbrella.receiveShadow = true;
        tree.add(umbrella);

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
          tree.add(lobe);
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
          tree.add(blossom);
        });
      } else {
        // MAJESTIC DHAKA BANYAN TREE (বটগাছ): Multi-tiered dense dome with aerial prop roots
        // Tier 1 (Low dense canopy)
        const tier1 = new THREE.Mesh(
          new THREE.DodecahedronGeometry(2.9, 1),
          banyanBaseMat
        );
        tier1.scale.set(1.4, 0.52, 1.4);
        tier1.position.set(0, 4.1, 0);
        tier1.castShadow = true;
        tier1.receiveShadow = true;
        tree.add(tier1);

        // Tier 2 (Mid canopy)
        const tier2 = new THREE.Mesh(
          new THREE.DodecahedronGeometry(2.3, 1),
          banyanMidMat
        );
        tier2.scale.set(1.2, 0.55, 1.2);
        tier2.position.set(0.2, 5.1, -0.2);
        tier2.castShadow = true;
        tree.add(tier2);

        // Tier 3 (Sun-kissed crown)
        const tier3 = new THREE.Mesh(
          new THREE.DodecahedronGeometry(1.6, 1),
          banyanSunMat
        );
        tier3.scale.set(1.0, 0.6, 1.0);
        tier3.position.set(-0.1, 6.0, 0.1);
        tier3.castShadow = true;
        tree.add(tier3);

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
    const glassTowerMat = new THREE.MeshStandardMaterial({
      color: '#0284c7',
      metalness: 0.88,
      roughness: 0.15,
    });
    const darkGlassMat = new THREE.MeshStandardMaterial({
      color: '#0f172a',
      metalness: 0.92,
      roughness: 0.12,
    });
    const tealGlassMat = new THREE.MeshStandardMaterial({
      color: '#0f766e',
      metalness: 0.82,
      roughness: 0.18,
    });
    const modernSteelMat = new THREE.MeshStandardMaterial({
      color: '#cbd5e1',
      metalness: 0.75,
      roughness: 0.32,
    });
    const concreteTowerMat = new THREE.MeshStandardMaterial({
      color: '#64748b',
      roughness: 0.78,
    });
    const warmStuccoMat = new THREE.MeshStandardMaterial({
      color: '#e2e8f0',
      roughness: 0.82,
    });
    const dhakaBrickMat = new THREE.MeshStandardMaterial({
      color: '#b45309',
      roughness: 0.85,
    });
    const mechCrownMat = new THREE.MeshStandardMaterial({
      color: '#1e293b',
      metalness: 0.5,
      roughness: 0.5,
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
      { minR: 430, maxR: 560, count: 92, baseH: 42, maxH: 120 },
      { minR: 560, maxR: 700, count: 96, baseH: 52, maxH: 148 },
      { minR: 700, maxR: 880, count: 88, baseH: 68, maxH: 180 },
    ];

    towerRings.forEach((ring) => {
      for (let i = 0; i < ring.count; i++) {
        const angle = (i / ring.count) * Math.PI * 2 + (rnd() - 0.5) * 0.05;
        const radius = ring.minR + rnd() * (ring.maxR - ring.minR);
        const bx = Math.cos(angle) * radius;
        const bz = Math.sin(angle) * radius;

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

        const width = 22 + rnd() * 26;
        const depth = 22 + rnd() * 26;
        let height = ring.baseH + rnd() * (ring.maxH - ring.baseH);

        if (style === 'motijheel' || style === 'gulshan') {
          height *= 1.25;
        }

        let facadeMat: THREE.Material;
        if (style === 'gulshan') {
          facadeMat = rnd() > 0.4 ? glassTowerMat : rnd() > 0.5 ? tealGlassMat : modernSteelMat;
        } else if (style === 'motijheel') {
          facadeMat = rnd() > 0.45 ? darkGlassMat : rnd() > 0.5 ? concreteTowerMat : modernSteelMat;
        } else if (style === 'mirpur' || style === 'old_dhaka') {
          facadeMat = rnd() > 0.5 ? dhakaBrickMat : warmStuccoMat;
        } else {
          facadeMat = rnd() > 0.5 ? warmStuccoMat : concreteTowerMat;
        }

        const towerMesh = this.sharedBox(width, height, depth, facadeMat, bx, height / 2, bz);
        towerMesh.rotation.y = angle + (rnd() - 0.5) * 0.4;
        this.scene.add(towerMesh);

        if (height > 55) {
          const tierW = width * 0.72;
          const tierD = depth * 0.72;
          const tierH = height * 0.28;
          const tierMat = style === 'gulshan' || style === 'motijheel' ? glassTowerMat : mechCrownMat;
          const tierMesh = this.sharedBox(tierW, tierH, tierD, tierMat, bx, height + tierH / 2, bz);
          tierMesh.rotation.y = towerMesh.rotation.y;
          this.scene.add(tierMesh);

          const crownH = 5.5 + rnd() * 4;
          const crownMesh = this.sharedBox(tierW * 0.6, crownH, tierD * 0.6, mechCrownMat, bx, height + tierH + crownH / 2, bz);
          crownMesh.rotation.y = towerMesh.rotation.y;
          this.scene.add(crownMesh);

          const totalRoofY = height + tierH + crownH;

          if (height > 75) {
            const spireH = 14 + rnd() * 22;
            const spire = new THREE.Mesh(this.cylCache(0.18, 0.45, spireH, 8), spireMat);
            spire.position.set(bx, totalRoofY + spireH / 2, bz);
            this.scene.add(spire);

            const beacon = new THREE.Mesh(beaconGeo, beaconMat);
            beacon.position.set(bx, totalRoofY + spireH, bz);
            this.scene.add(beacon);
            this.aviationBeacons.push(beacon);
          } else {
            const tankMat = rnd() > 0.5 ? gaziWaterTankMat : nationalTankMat;
            const tank = new THREE.Mesh(this.cylCache(1.8, 1.8, 2.6, 12), tankMat);
            tank.position.set(bx + (rnd() - 0.5) * (tierW * 0.3), totalRoofY + 1.3, bz + (rnd() - 0.5) * (tierD * 0.3));
            this.scene.add(tank);
          }
        } else {
          const tankMat = rnd() > 0.5 ? gaziWaterTankMat : nationalTankMat;
          const tank = new THREE.Mesh(this.cylCache(1.6, 1.6, 2.4, 12), tankMat);
          tank.position.set(bx, height + 1.2, bz);
          this.scene.add(tank);
        }

        if (ring.minR <= 440) {
          this.buildingColliders.push({
            minX: bx - width / 2 - 2,
            maxX: bx + width / 2 + 2,
            minZ: bz - depth / 2 - 2,
            maxZ: bz + depth / 2 + 2,
            tag: 'distant_skyline',
          });
        }
      }
    });
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
      [-164, -36],  // between Karwan Bazar (-175) and SAARC Fountain (-28)
      [-20, -9.5],  // between SAARC Fountain (-28) and Farmgate intersection (0)
      [9.5, 71],    // between Farmgate (0) and crosswalk (75)
      [79, 151],    // between crosswalk (75) and crosswalk (155)
      [159, 166],   // between crosswalk (155) and Puran Dhaka crossing (175)
      [185, 275],   // between Puran Dhaka (175) and Riverfront road (285)
    ];

    for (const side of [-1, 1]) {
      const railX = side * 9.6;
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
    const stationSpots: Array<[number, number, boolean]> = [
      [24, 64, true], [-24, -70, false], [70, 130, true],
      [150, 92, false], [-120, 118, true], [-200, -80, false],
    ];
    stationSpots.forEach(([sx, sz, blue]) => {
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
  }

  private setupPlayer() {
    this.playerLimbs = createCharacterMesh(
      '#0f766e',
      '#1e293b',
      undefined,
      false,
      'arif',
      true
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

  private spawnInitialVehicles() {
    const presets: Array<{
      type: VehicleType;
      x: number;
      z: number;
      rot: number;
      isTraffic: boolean;
      color: string;
    }> = [
      { type: 'cng', x: 3.5, z: 10, rot: Math.PI, isTraffic: false, color: '#15803d' },
      { type: 'car', x: 6.8, z: 8, rot: Math.PI, isTraffic: false, color: '#f8fafc' },
      { type: 'car', x: -6.5, z: 10, rot: Math.PI, isTraffic: false, color: '#b91c1c' },
      { type: 'rickshaw', x: 5.2, z: 3, rot: Math.PI, isTraffic: false, color: '#ec4899' },
      { type: 'motorcycle', x: -6.8, z: 4, rot: Math.PI, isTraffic: false, color: '#e11d48' },
      { type: 'bus', x: -4.2, z: -6, rot: Math.PI, isTraffic: false, color: '#b91c1c' },
      { type: 'cng', x: -7, z: 22, rot: 0, isTraffic: false, color: '#15803d' },

      { type: 'cng', x: -165, z: 18, rot: 0, isTraffic: true, color: '#15803d' },
      { type: 'rickshaw', x: -68, z: 160, rot: 0, isTraffic: false, color: '#ec4899' },
      { type: 'rickshaw', x: -72, z: 195, rot: Math.PI, isTraffic: true, color: '#f59e0b' },
      { type: 'cng', x: 212, z: 168, rot: Math.PI, isTraffic: false, color: '#15803d' },
      { type: 'car', x: 215, z: -168, rot: 0, isTraffic: false, color: '#38bdf8' },
      { type: 'motorcycle', x: -12, z: -170, rot: Math.PI / 2, isTraffic: false, color: '#f43f5e' },
      { type: 'pickup', x: 88, z: 98, rot: 0, isTraffic: false, color: '#0284c7' },

      { type: 'cng', x: 4, z: -60, rot: 0, isTraffic: true, color: '#15803d' },
      { type: 'bus', x: -4, z: -110, rot: Math.PI, isTraffic: true, color: '#0f766e' },
      { type: 'car', x: 4, z: 85, rot: 0, isTraffic: true, color: '#e2e8f0' },
      { type: 'cng', x: -4, z: 130, rot: Math.PI, isTraffic: true, color: '#15803d' },
      { type: 'rickshaw', x: 5, z: 210, rot: 0, isTraffic: true, color: '#ec4899' },
      { type: 'bus', x: -60, z: 4, rot: Math.PI / 2, isTraffic: true, color: '#b91c1c' },
      { type: 'cng', x: 75, z: -4, rot: -Math.PI / 2, isTraffic: true, color: '#15803d' },
      { type: 'car', x: 145, z: 4, rot: Math.PI / 2, isTraffic: true, color: '#facc15' },
      { type: 'motorcycle', x: -115, z: -4, rot: -Math.PI / 2, isTraffic: true, color: '#e11d48' },
      { type: 'cng', x: 224, z: -45, rot: 0, isTraffic: true, color: '#15803d' },
      { type: 'car', x: 216, z: 65, rot: Math.PI, isTraffic: true, color: '#f8fafc' },
      { type: 'pickup', x: -166, z: -90, rot: 0, isTraffic: true, color: '#0284c7' },

      { type: 'police', x: 62, z: -10, rot: -Math.PI / 2, isTraffic: true, color: '#1e3a8a' },
      { type: 'police', x: 215, z: -95, rot: 0, isTraffic: true, color: '#1e3a8a' },
      { type: 'police', x: -165, z: 110, rot: 0, isTraffic: true, color: '#1e3a8a' },

      // Mirpur-10 & Cricket Stadium Sector Spawns (Avenue at X = -380)
      { type: 'rickshaw', x: -376.5, z: -170, rot: 0, isTraffic: true, color: '#f59e0b' },
      { type: 'cng', x: -383.5, z: -210, rot: Math.PI, isTraffic: true, color: '#15803d' },
      { type: 'bus', x: -376.5, z: -120, rot: 0, isTraffic: true, color: '#b91c1c' },
      { type: 'motorcycle', x: -383.5, z: -175, rot: Math.PI, isTraffic: false, color: '#ef4444' },
      { type: 'police', x: -383.5, z: -260, rot: Math.PI, isTraffic: true, color: '#1e3a8a' },

      // Purbachal 300ft High-Speed Expressway Spawns (Expressway at Z = -315, NS at X = 640)
      { type: 'car', x: 480, z: -318.5, rot: -Math.PI / 2, isTraffic: true, color: '#ef4444' },
      { type: 'motorcycle', x: 540, z: -311.5, rot: Math.PI / 2, isTraffic: true, color: '#f97316' },
      { type: 'car', x: 644, z: -250, rot: 0, isTraffic: false, color: '#38bdf8' },
      { type: 'pickup', x: 420, z: -311.5, rot: Math.PI / 2, isTraffic: true, color: '#0284c7' },

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

      // Keraniganj & Buriganga South Bank Spawns (Highway at Z = 440)
      { type: 'pickup', x: 120, z: 436.5, rot: -Math.PI / 2, isTraffic: true, color: '#475569' },
      { type: 'cng', x: 80, z: 443.5, rot: Math.PI / 2, isTraffic: true, color: '#15803d' },
      { type: 'motorcycle', x: 0, z: 436.5, rot: -Math.PI / 2, isTraffic: false, color: '#06b6d4' },
    ];

    presets.forEach((p, idx) => {
      const stats = VEHICLE_STATS[p.type];
      const id = `veh_${idx}_${p.type}`;
      const entity: VehicleEntity = {
        id,
        type: p.type,
        x: p.x,
        y: 0,
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
      };
      this.vehicles.push(entity);

      const mesh = createVehicleMesh(p.type, p.color, idx);
      mesh.position.set(p.x, 0, p.z);
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
    ];

    for (let i = 0; i < 40; i++) {
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
      const npc: NPCEntity = {
        id,
        nameEn: preset.nameEn,
        nameBn: preset.nameBn,
        role: preset.role,
        x: corr.x + (i % 2 === 0 ? 0.6 : -0.6),
        z: startZ,
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
  }

  private setupRainParticles() {
    const count = 1400;
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 140;
      positions[i * 3 + 1] = Math.random() * 55;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 140;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const mat = new THREE.PointsMaterial({
      color: '#bae6fd',
      size: 0.35,
      transparent: true,
      opacity: 0.65,
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
    if (store.gamePhase !== 'playing') return;
    dhakaAudio.init();

    if (e.button === 2 && !this.activeVehicleId) {
      // Right Mouse Button: Enter Tactical Aim Mode (ADS / High-Ready)
      e.preventDefault();
      this.isAiming = true;
      this.playerRotation = this.cameraYaw + Math.PI;
      return;
    }

    if (e.button === 0) {
      if (this.isAiming && !this.activeVehicleId) {
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

    if (store.gamePhase !== 'playing') return;

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
    if (code in weaponHotkeyMap) {
      const targetWeapon = store.tools[weaponHotkeyMap[code]];
      if (targetWeapon) {
        store.equipTool(targetWeapon.id);
      }
      return;
    }
    if (code === 'KeyQ') {
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
          this.alertPedestriansAhead(veh.x, veh.z, veh.rotation);
        }
      } else {
        dhakaAudio.playHorn('bell');
      }
    }

    if (code === 'KeyC' && !this.activeVehicleId) {
      this.isCrouching = !this.isCrouching;
    }

    if (code === 'KeyV') {
      store.cycleCameraMode();
    }

    if (
      (code === 'KeyJ' || code === 'KeyK' || code === 'KeyX') &&
      !this.activeVehicleId
    ) {
      this.performMeleeAttack();
    }

    if (code === 'Space' && !this.activeVehicleId && this.isGrounded) {
      this.playerVelY = 7.8;
      this.isGrounded = false;
      this.isCrouching = false;
      dhakaAudio.playSfx('jump');
    }

    if (code === 'KeyZ' && !this.activeVehicleId) {
      this.isAiming = !this.isAiming;
      if (this.isAiming) {
        this.playerRotation = this.cameraYaw + Math.PI;
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
      } else {
        const activeTool = store.tools.find((t) => t.id === store.equippedToolId);
        const reloaded = store.reloadCurrentWeapon();
        if (reloaded && activeTool) {
          store.showBanner({
            titleEn: 'WEAPON RELOADED',
            titleBn: 'অস্ত্র রিলোড সম্পন্ন',
            subtitleEn: `${activeTool.nameEn}: Fresh clip ready.`,
            subtitleBn: `${activeTool.nameBn}: তাজা ম্যাগাজিন প্রস্তুত।`,
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
    action: 'interact' | 'horn' | 'attack' | 'jump' | 'camera'
  ) {
    dhakaAudio.init();
    if (action === 'interact') this.handlePrimaryInteraction(true);
    if (action === 'horn') {
      const veh = this.vehicles.find((v) => v.id === this.activeVehicleId);
      if (veh) {
        dhakaAudio.playHorn(VEHICLE_STATS[veh.type].hornType);
        this.alertPedestriansAhead(veh.x, veh.z, veh.rotation);
      } else {
        dhakaAudio.playHorn('bell');
      }
    }
    if (action === 'attack') this.performMeleeAttack();
    if (action === 'jump' && !this.activeVehicleId && this.isGrounded) {
      this.playerVelY = 7.8;
      this.isGrounded = false;
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
    const spark = new THREE.Mesh(
      new THREE.DodecahedronGeometry(0.24 * scale, 0),
      new THREE.MeshBasicMaterial({
        color: colorHex,
        transparent: true,
        opacity: 0.95,
      })
    );
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
    if (this.fireCooldown > 0) return;

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

      this.fireCooldown = tool.fireRate || 0.22;
      this.attackAnimTimer = 0.22;

      // Align Arif with camera aim direction when firing
      this.playerRotation = this.cameraYaw + Math.PI;

      // Realistic muzzle climb & camera kickback
      this.cameraPitch = Math.max(
        0.08,
        this.cameraPitch - (tool.pellets && tool.pellets > 1 ? 0.042 : 0.022)
      );
      this.cameraTrauma = Math.min(
        0.65,
        this.cameraTrauma + (tool.pellets && tool.pellets > 1 ? 0.26 : 0.14)
      );

      // Synthesized gunshot / shotgun / assault rifle audio
      if (tool.id === 'deshi_pipegun' || tool.id === 'police_shotgun') {
        dhakaAudio.playSfx('shotgun');
      } else if (tool.id === 'bd08_rifle' || tool.id === 'smg_uzi') {
        dhakaAudio.playSfx('rifle');
      } else {
        dhakaAudio.playSfx('gunshot');
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

    // Check melee hits on nearby vehicles (sparks & dents)
    for (const veh of this.vehicles) {
      const dx = veh.x - this.playerPos.x;
      const dz = veh.z - this.playerPos.z;
      const distV = Math.hypot(dx, dz);
      if (distV <= tool.range + 1.4) {
        const dot = (dx * forwardX + dz * forwardZ) / Math.max(0.01, distV);
        if (dot < 0.2) continue;

        const isHeavy = this.meleeComboStep === 2 || tool.category === 'local_arm';
        dhakaAudio.playSfx(isBlade ? 'slash' : isHeavy ? 'heavy_hit' : 'hit');
        veh.health = Math.max(0, veh.health - tool.damage);
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
      const dx = npc.x - this.playerPos.x;
      const dz = npc.z - this.playerPos.z;
      const dist = Math.hypot(dx, dz);
      if (dist <= tool.range) {
        const dot = (dx * forwardX + dz * forwardZ) / Math.max(0.01, dist);
        if (dot < 0.25) continue;

        const isHeavy = this.meleeComboStep === 2 || tool.category === 'local_arm';
        dhakaAudio.playSfx(isBlade ? 'slash' : isHeavy ? 'heavy_hit' : 'hit');
        dhakaAudio.playSfx('pain_grunt');

        // Physical knockback impulse on victim
        const pushDist = isBlade ? 1.6 : isHeavy ? 1.4 : 0.75;
        npc.x += forwardX * pushDist;
        npc.z += forwardZ * pushDist;

        // Blood puddle decal on road for blade or heavy punch
        if (isBlade || (isHeavy && Math.random() < 0.6)) {
          this.spawnBloodDecal(npc.x, npc.z);
        }

        this.spawnImpactSparks(
          npc.x,
          1.15,
          npc.z,
          isBlade ? '#ef4444' : isBaton ? '#38bdf8' : '#fbbf24',
          1.25
        );

        if (!npc.isStoryNPC) {
          npc.health -= tool.damage;
          if (npc.health <= 0 || isBlade) {
            // Fatal Melee Strike
            npc.isDead = true;
            npc.aiState = 'dead';
            npc.health = 0;
            npc.respawnTimer = 35;
            const limbs = this.npcLimbsMap.get(npc.id);
            if (limbs) {
              limbs.group.position.set(npc.x, 0.08, npc.z);
              limbs.group.rotation.x = -Math.PI / 2;
            }
            this.spawnImpactSparks(npc.x, 0.3, npc.z, '#b91c1c', 2.0);
            this.spawnCashDrop(npc.x, npc.z, Math.floor(Math.random() * 300 + 100));
            store.setWantedLevel(Math.max(2, store.wantedLevel + 1));
            this.alertNearbyPedestrians(npc.x, npc.z, 25);
          } else {
            npc.aiState = 'flee';
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

    // 1. Safe Vehicle Exit
    if (this.activeVehicleId) {
      this.exitCurrentVehicle();
      dhakaAudio.playSfx('ui');
      return;
    }

    // 2. Check nearby Point of Interest
    for (const poi of POINTS_OF_INTEREST) {
      const d = Math.hypot(poi.x - this.playerPos.x, poi.z - this.playerPos.z);
      if (d < 4.8 && !preferVehicle) {
        this.executePOIInteraction(poi.id);
        return;
      }
    }

    // 3. Find closest Vehicle to Enter
    let closestVeh: VehicleEntity | null = null;
    let bestDist = 5.8;
    for (const v of this.vehicles) {
      const d = Math.hypot(v.x - this.playerPos.x, v.z - this.playerPos.z);
      if (d < bestDist) {
        bestDist = d;
        closestVeh = v;
      }
    }

    if (closestVeh) {
      this.ejectDriverFromVehicle(closestVeh);

      this.activeVehicleId = closestVeh.id;
      closestVeh.isTraffic = false;
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

  private executePOIInteraction(poiId: string) {
    const store = useGameStore.getState();
    const poi = POINTS_OF_INTEREST.find((p) => p.id === poiId);
    if (!poi) return;

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
      if (
        store.spendTaka(
          400,
          'Dholaikhal Garage Tune & CNG Spawn',
          'ধোলাইখাল গ্যারেজ টিউনিং'
        )
      ) {
        this.spawnPlayerVehicleNear('cng');
        store.showBanner({
          titleEn: 'DHOLAIKHAL GARAGE: FRESH TUNED CNG READY',
          titleBn: 'ধোলাইখাল গ্যারেজ: নতুন টিউন করা সিএনজি প্রস্তুত!',
          subtitleEn: 'Repaired and parked right outside the workshop.',
          subtitleBn: 'গ্যারেজের সামনে আপনার গাড়ি প্রস্তুত করা হয়েছে।',
          tone: 'blue',
        });
      }
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

    if (this.checkWorldObstacle(spawnX, spawnZ, vehRadius)) {
      const candidates = [
        [3.5, 0], [-3.5, 0], [0, 3.5], [0, -3.5],
        [3, 3], [-3, 3], [3, -3], [-3, -3],
      ];
      for (const [ox, oz] of candidates) {
        const tx = this.playerPos.x + ox;
        const tz = this.playerPos.z + oz;
        if (!this.checkWorldObstacle(tx, tz, vehRadius)) {
          spawnX = tx;
          spawnZ = tz;
          break;
        }
      }
    }

    const entity: VehicleEntity = {
      id,
      type,
      x: spawnX,
      y: 0,
      z: spawnZ,
      rotation: this.playerRotation,
      speed: 0,
      steering: 0,
      health: stats.maxHealth,
      maxHealth: stats.maxHealth,
      color: type === 'cng' ? '#15803d' : '#f59e0b',
      isTraffic: false,
      isPolice: type === 'police',
      plateNumber: `ঢাকা মেট্রো-গ ৯৯-${Math.floor(1000 + Math.random() * 8999)}`,
    };
    this.vehicles.push(entity);

    const mesh = createVehicleMesh(type, entity.color, this.vehicles.length);
    mesh.position.set(spawnX, 0, spawnZ);
    mesh.rotation.y = entity.rotation;
    this.scene.add(mesh);
    this.vehicleMeshes.set(id, mesh);
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
    const dt = Math.min(0.05, this.clock.getDelta());

    const store = useGameStore.getState();

    // Dynamic Graphics Quality Switching (Bug Fix #6)
    if (store.graphicsQuality !== this.lastGraphicsQuality) {
      this.lastGraphicsQuality = store.graphicsQuality;
      const isHigh = store.graphicsQuality === 'high';
      this.renderer.setPixelRatio(
        isHigh ? Math.min(window.devicePixelRatio, 1.35) : 1
      );
      this.renderer.shadowMap.enabled = isHigh;
      this.camera.far = isHigh ? 1350 : 900;
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
      if (this.activeVehicleId) {
        const v = this.vehicles.find((veh) => veh.id === this.activeVehicleId);
        if (v) v.health = v.maxHealth;
      }
      store.clearEngineRequests();
    }
    if (store.teleportRequest) {
      const { x, z } = store.teleportRequest;
      this.playerPos.set(x, 0, z);
      this.playerLimbs.group.position.set(x, 0, z);
      this.playerLimbs.group.rotation.x = 0;
      this.playerLimbs.group.rotation.z = 0;
      if (this.activeVehicleId) {
        const v = this.vehicles.find((veh) => veh.id === this.activeVehicleId);
        if (v) {
          v.x = x;
          v.z = z;
          v.speed = 0;
        }
      }
      store.clearEngineRequests();
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
      tintCharacterOutfit(this.playerLimbs, outfit.shirtColor, outfit.pantsColor);
      updateWeaponAttachment(this.playerLimbs.weaponMesh, store.equippedToolId);
    }

    // Always keep Dhaka lighting, traffic, Metro Rail & NPCs alive in every phase
    this.updateEnvironmentLighting(store.timeOfDay, store.weather, dt);
    this.updateTrafficAndPoliceAI(dt, store.wantedLevel);
    this.updateNPCAI(dt);

    if (store.gamePhase === 'playing') {
      this.worldClockTimer += dt;
      if (this.worldClockTimer >= 0.22) {
        store.tickWorldClock(this.worldClockTimer);
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
        this.playerLimbs.group.position.set(this.playerPos.x, 0.08, this.playerPos.z);
        this.playerLimbs.group.rotation.x = -Math.PI / 2;
      } else if (store.isBusted) {
        if (this.activeVehicleId) {
          this.exitCurrentVehicle();
        }
        setCharacterAnimationState(this.playerLimbs, 'idle', dt);
        this.playerLimbs.group.position.set(this.playerPos.x, 0, this.playerPos.z);
        this.playerLimbs.group.rotation.x = 0;
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
      this.updateMissionAndInteractionChecks(dt);
    } else if (!this.activeVehicleId) {
      setCharacterAnimationState(this.playerLimbs, 'idle', dt);
      this.playerLimbs.group.position.copy(this.playerPos);
      this.playerLimbs.group.rotation.y = this.playerRotation;
    }

    this.updateCamera(dt, store.cameraMode);
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
          this.spawnImpactSparks(hitX, 1.15, hitZ, '#ef4444', 1.85);
          this.spawnBloodDecal(npc.x, npc.z);

          // Ballistic knockback impulse on victim
          npc.x += (b.vx / 88) * 0.95;
          npc.z += (b.vz / 88) * 0.95;

          if (!npc.isStoryNPC) {
            // Lethal gunshot fatality: pedestrians die from gunshot
            npc.health = 0;
            npc.isDead = true;
            npc.aiState = 'dead';
            npc.respawnTimer = 45;

            const limbs = this.npcLimbsMap.get(npc.id);
            if (limbs) {
              limbs.group.position.set(npc.x, 0.08, npc.z);
              limbs.group.rotation.x = -Math.PI / 2;
              limbs.group.rotation.z = Math.random() * Math.PI * 2;
            }
            this.spawnImpactSparks(npc.x, 0.3, npc.z, '#b91c1c', 2.5);
            this.spawnCashDrop(npc.x, npc.z, Math.floor(Math.random() * 350 + 150));
            store.setWantedLevel(Math.max(2, store.wantedLevel + 1));
            this.alertNearbyPedestrians(npc.x, npc.z, 35);

            store.showBanner({
              titleEn: 'PEDESTRIAN KILLED BY GUNSHOT!',
              titleBn: 'গুলির আঘাতে পথচারী নিহত!',
              subtitleEn: `${npc.nameEn} fatally shot. DMP Police in pursuit (Wanted ★)!`,
              subtitleBn: `${npc.nameBn} গুলিবিদ্ধ হয়ে মারা গেছে। পুলিশ তল্লাশি শুরু করেছে!`,
              tone: 'red',
            });
          }
          break;
        }
      }

      // 2. Check Vehicle & Driver Hit
      if (!hitSomething) {
        for (const veh of this.vehicles) {
          if (veh.id === this.activeVehicleId) continue;

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
                this.spawnBloodDecal(veh.x, veh.z);
                this.spawnImpactSparks(veh.x, 0.8, veh.z, '#ef4444', 2.0);

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

      // 3. Check Building Obstacle Hit (Sparks, Concrete Dust, Bullet Hole Decal, Ricochet)
      if (!hitSomething && this.checkWorldObstacle(nx, nz, 0.2)) {
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

      if (c.mesh.position.y <= 0.02) {
        if (!c.bounced) {
          c.mesh.position.y = 0.02;
          c.vy = -c.vy * 0.38;
          c.vx *= 0.55;
          c.vz *= 0.55;
          c.rx *= 0.5;
          c.rz *= 0.5;
          c.bounced = true;
          dhakaAudio.playSfx('casing_drop');
        } else {
          c.mesh.position.y = 0.015;
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
        this.skidDecals.splice(i, 1);
      }
    }
  }

  private updateBloodDecals(dt: number) {
    for (let i = this.bloodDecals.length - 1; i >= 0; i--) {
      const bd = this.bloodDecals[i];
      bd.life -= dt;
      if (bd.life < 10) {
        (bd.mesh.material as THREE.MeshBasicMaterial).opacity = Math.max(
          0,
          (bd.life / 10) * 0.85
        );
      }
      if (bd.life <= 0) {
        this.scene.remove(bd.mesh);
        this.bloodDecals.splice(i, 1);
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

      if (gs.mesh.position.y <= 0.08) {
        gs.mesh.position.y = 0.085;
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
        this.radiatorSteam.splice(i, 1);
      }
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

    // Center Sky Dome and Skyline Horizon Ring on player and modulate brightness
    if (this.skyDomeMesh) {
      this.skyDomeMesh.position.set(this.playerPos.x, 0, this.playerPos.z);
      (this.skyDomeMesh.material as THREE.MeshBasicMaterial).color.lerp(
        isNight
          ? new THREE.Color('#1e293b')
          : isGolden
          ? new THREE.Color('#ffffff')
          : new THREE.Color('#e0f2fe'),
        dt * 2
      );
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
    this.sunLight.position.set(
      Math.cos(azimuth) * radius,
      sunHeight,
      Math.sin(azimuth) * radius * 0.75
    );
    this.sunLight.color.set(
      isNight ? '#93b4e8' : isGolden ? '#fb923c' : isRain ? '#94a3b8' : '#fff7d6'
    );
    // Shadows get softer and shorter near noon, long at dawn/dusk.
    if (this.sunLight.shadow) {
      this.sunLight.shadow.radius = isNight ? 6 : isGolden ? 3.2 : 1.6;
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

    if (this.rainSystem) {
      this.rainSystem.visible = isRain;
      if (isRain) {
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
    this.launchBoats.forEach((b, idx) => {
      b.position.y = 0.2 + Math.sin(t + idx) * 0.14;
      b.rotation.z = Math.sin(t * 0.8 + idx) * 0.018;
    });

    // Animate MRT Line-6 Dhaka Metro Rail gliding overhead between Uttara, Farmgate & Motijheel
    if (this.metroTrainGroup) {
      const trainSpeed = Math.cos(t * 0.15);
      this.metroTrainGroup.position.z = -180 + Math.sin(t * 0.15) * 360;
      this.metroTrainGroup.rotation.y = trainSpeed >= 0 ? 0 : Math.PI;
    }
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
    const isSprinting = wantsSprint && this.playerStamina > 5;

    if (isSprinting) {
      this.playerStamina = Math.max(0, this.playerStamina - 16 * dt);
    } else {
      this.playerStamina = Math.min(100, this.playerStamina + 14 * dt);
    }

    const baseSpeed = this.isCrouching ? 4.2 : isSprinting ? 13.0 : 7.8;
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

      if (!this.checkWorldObstacle(nextX, this.playerPos.z, 0.48, this.activeVehicleId)) {
        this.playerPos.x = clampWorldCoord(nextX);
      }
      if (!this.checkWorldObstacle(this.playerPos.x, nextZ, 0.48, this.activeVehicleId)) {
        this.playerPos.z = clampWorldCoord(nextZ);
      }

      this.walkAnimPhase += dt * (isSprinting ? 15 : 10);
    } else {
      this.walkAnimPhase = 0;
    }

    if (!this.isGrounded) {
      this.playerPos.y += this.playerVelY * dt;
      this.playerVelY -= 21 * dt;
      if (this.playerPos.y <= 0) {
        this.playerPos.y = 0;
        this.playerVelY = 0;
        this.isGrounded = true;
      }
    }

    // Update Real Skeletal GLTF AnimationMixer & Weapon / Arm Rig
    const storeState = useGameStore.getState();
    const activeTool = storeState.tools.find(
      (t) => t.id === storeState.equippedToolId
    );
    const isFirearm = Boolean(activeTool?.isFirearm);
    const isAimingNow =
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

    if (this.isAiming) {
      this.playerRotation = this.cameraYaw + Math.PI;
    }

    // Gate the gait so feet stay planted: crouch 0.55x, walk 1x, sprint 1.45x.
    const gaitScale = this.isCrouching ? 0.55 : isSprinting ? 1.45 : 1.0;
    setCharacterAnimationState(
      this.playerLimbs,
      targetAnimState,
      dt,
      this.attackAnimTimer,
      isAimingNow,
      gaitScale,
      weaponCategory,
      this.meleeComboStep
    );

    // Also update fallback capsule limbs if visible
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

    this.playerLimbs.group.scale.y = this.isCrouching ? 0.74 : 1.0;
    this.playerLimbs.group.position.copy(this.playerPos);
    this.playerLimbs.group.rotation.y = this.playerRotation;
  }

  private updateDrivenVehicle(dt: number) {
    const veh = this.vehicles.find((v) => v.id === this.activeVehicleId);
    if (!veh) return;

    const stats = VEHICLE_STATS[veh.type];
    let throttle = 0;
    let steer = 0;

    if (this.keys.has('KeyW') || this.keys.has('ArrowUp')) throttle += 1;
    if (this.keys.has('KeyS') || this.keys.has('ArrowDown')) throttle -= 1;
    if (this.keys.has('KeyA') || this.keys.has('ArrowLeft')) steer += 1;
    if (this.keys.has('KeyD') || this.keys.has('ArrowRight')) steer -= 1;

    const isDrifting = this.keys.has('Space');

    if (throttle > 0) {
      veh.speed = Math.min(
        stats.maxSpeed,
        veh.speed + stats.acceleration * dt
      );
    } else if (throttle < 0) {
      if (veh.speed > 0.4) {
        veh.speed = Math.max(0, veh.speed - stats.braking * dt);
      } else {
        veh.speed = Math.max(
          -stats.maxSpeed * 0.42,
          veh.speed - stats.acceleration * 0.65 * dt
        );
      }
    } else {
      veh.speed *= Math.pow(0.25, dt);
      if (Math.abs(veh.speed) < 0.15) veh.speed = 0;
    }

    if (isDrifting && Math.abs(veh.speed) > 4.2) {
      veh.speed *= Math.pow(0.48, dt);
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
        this.spawnSkidMark(rearX, rearZ, veh.rotation);
      }
    }

    if (Math.abs(veh.speed) > 0.3) {
      const dir = veh.speed >= 0 ? 1 : -1;
      const turnMult = isDrifting ? 1.45 : 1.0;
      const speedFactor = Math.max(0.35, Math.min(1, Math.abs(veh.speed) / 6.5));
      veh.rotation +=
        steer * stats.turnSpeed * turnMult * speedFactor * dir * dt;
    }

    // Vehicle Water Submersion Rescue
    if (this.isPositionInWater(veh.x, veh.z)) {
      veh.speed *= 0.85;
      if (Math.abs(veh.speed) < 2.5) {
        dhakaAudio.playSfx('hit');
        this.spawnImpactSparks(veh.x, 0.2, veh.z, '#38bdf8', 2.8);
        const store = useGameStore.getState();
        store.showBanner({
          titleEn: 'VEHICLE SUBMERGED IN WATER!',
          titleBn: 'গাড়ি পানিতে নিমজ্জিত!',
          subtitleEn: 'Ejected safely to the riverbank.',
          subtitleBn: 'তীরে নিরাপদ স্থানে পৌঁছে দেওয়া হয়েছে।',
          tone: 'red',
        });
        this.activeVehicleId = null;
        this.playerLimbs.group.visible = true;
        this.playerPos.set(veh.x > 0 ? 155 : -175, 0, veh.z > 200 ? 285 : 0);
        this.playerLimbs.group.position.copy(this.playerPos);
        return;
      }
    }

    const vx = Math.sin(veh.rotation) * veh.speed * dt;
    const vz = Math.cos(veh.rotation) * veh.speed * dt;

    const nextX = veh.x + vx;
    const nextZ = veh.z + vz;

    const radius = Math.max(stats.width, stats.length) * 0.45;
    if (!this.checkWorldObstacle(nextX, nextZ, radius, veh.id)) {
      veh.x = clampWorldCoord(nextX);
      veh.z = clampWorldCoord(nextZ);
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
        const canSlideX = !this.checkWorldObstacle(nextX, veh.z, radius, veh.id);
        const canSlideZ = !this.checkWorldObstacle(veh.x, nextZ, radius, veh.id);

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

    this.playerPos.set(veh.x, 0, veh.z);
    this.playerRotation = veh.rotation;

    // Position dynamic vehicle headlight cone ahead of car (only at night/rain)
    const storeState = useGameStore.getState();
    const isNightOrRain =
      storeState.weather === 'night' ||
      storeState.weather === 'monsoon_rain' ||
      storeState.timeOfDay < 5.8 ||
      storeState.timeOfDay > 19.2;
    this.headlightSpot.intensity = isNightOrRain ? 3.5 : 0;
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
    if (mesh) {
      mesh.position.set(veh.x, 0, veh.z);
      mesh.rotation.y = veh.rotation;

      // Motorcycle dynamic body roll / leaning when turning at speed
      if (veh.type === 'motorcycle') {
        const leanTarget =
          -steer * Math.min(1, Math.abs(veh.speed) / 5.5) * 0.32;
        mesh.rotation.z += (leanTarget - mesh.rotation.z) * Math.min(1, dt * 9);
      } else {
        mesh.rotation.z = 0;
      }

      // Both CarConcept.glb and ferrari.glb hubs use local X as the true axle.
      this.animateVehicleWheels(mesh, veh.speed, dt, steer);
    }

    // Visibly mount and pose the player as the active driver behind the wheel / handlebars!
    this.playerLimbs.group.visible = true;

    if (veh.type === 'motorcycle') {
      const backOffset = -0.16;
      const seatY = 0.52;
      const px = veh.x + Math.sin(veh.rotation) * backOffset;
      const pz = veh.z + Math.cos(veh.rotation) * backOffset;
      this.playerLimbs.group.position.set(px, seatY, pz);
      this.playerLimbs.group.rotation.set(
        0,
        veh.rotation,
        mesh ? mesh.rotation.z : 0
      );
      this.playerLimbs.group.scale.set(0.85, 0.85, 0.85);

      this.playerLimbs.leftArm.rotation.set(0.72, 0.22, -0.42);
      this.playerLimbs.rightArm.rotation.set(0.72, -0.22, 0.42);
      this.playerLimbs.leftLeg.rotation.set(1.05, 0.22, -0.2);
      this.playerLimbs.rightLeg.rotation.set(1.05, -0.22, 0.2);
    } else if (veh.type === 'rickshaw') {
      const px = veh.x + Math.sin(veh.rotation) * 0.34;
      const pz = veh.z + Math.cos(veh.rotation) * 0.34;
      this.playerLimbs.group.position.set(px, 0.38, pz);
      this.playerLimbs.group.rotation.set(0, veh.rotation, 0);
      this.playerLimbs.group.scale.set(0.88, 0.88, 0.88);

      this.playerLimbs.leftArm.rotation.set(0.55, 0.2, -0.35);
      this.playerLimbs.rightArm.rotation.set(0.55, -0.2, 0.35);
      const pedal = performance.now() * 0.008 * (veh.speed || 0.6);
      this.playerLimbs.leftLeg.rotation.set(
        Math.sin(pedal) * 0.4 + 0.5,
        0.1,
        0
      );
      this.playerLimbs.rightLeg.rotation.set(
        Math.sin(pedal + Math.PI) * 0.4 + 0.5,
        -0.1,
        0
      );
    } else if (veh.type === 'cng') {
      const px = veh.x + Math.sin(veh.rotation) * 0.28;
      const pz = veh.z + Math.cos(veh.rotation) * 0.28;
      this.playerLimbs.group.position.set(px, 0.26, pz);
      this.playerLimbs.group.rotation.set(0, veh.rotation, 0);
      this.playerLimbs.group.scale.set(0.82, 0.82, 0.82);

      this.playerLimbs.leftArm.rotation.set(0.5, 0.2, -0.3);
      this.playerLimbs.rightArm.rotation.set(0.5, -0.2, 0.3);
      this.playerLimbs.leftLeg.rotation.set(0.95, 0.2, 0);
      this.playerLimbs.rightLeg.rotation.set(0.95, -0.2, 0);
    } else if (veh.type === 'car' || veh.type === 'police') {
      const sideAngle = veh.rotation + Math.PI / 2;
      const px =
        veh.x - Math.sin(sideAngle) * 0.36 + Math.sin(veh.rotation) * 0.08;
      const pz =
        veh.z - Math.cos(sideAngle) * 0.36 + Math.cos(veh.rotation) * 0.08;
      this.playerLimbs.group.position.set(px, 0.22, pz);
      this.playerLimbs.group.rotation.set(0, veh.rotation, 0);
      this.playerLimbs.group.scale.set(0.74, 0.74, 0.74);

      this.playerLimbs.leftArm.rotation.set(0.48, 0.2, -0.25);
      this.playerLimbs.rightArm.rotation.set(0.48, -0.2, 0.25);
      this.playerLimbs.leftLeg.rotation.set(1.1, 0.15, 0);
      this.playerLimbs.rightLeg.rotation.set(1.1, -0.15, 0);
    } else if (veh.type === 'pickup') {
      const sideAngle = veh.rotation + Math.PI / 2;
      const px =
        veh.x - Math.sin(sideAngle) * 0.42 + Math.sin(veh.rotation) * 0.35;
      const pz =
        veh.z - Math.cos(sideAngle) * 0.42 + Math.cos(veh.rotation) * 0.35;
      this.playerLimbs.group.position.set(px, 0.46, pz);
      this.playerLimbs.group.rotation.set(0, veh.rotation, 0);
      this.playerLimbs.group.scale.set(0.78, 0.78, 0.78);

      this.playerLimbs.leftArm.rotation.set(0.48, 0.2, -0.25);
      this.playerLimbs.rightArm.rotation.set(0.48, -0.2, 0.25);
      this.playerLimbs.leftLeg.rotation.set(1.1, 0.15, 0);
      this.playerLimbs.rightLeg.rotation.set(1.1, -0.15, 0);
    } else if (veh.type === 'bus') {
      const sideAngle = veh.rotation + Math.PI / 2;
      const px =
        veh.x - Math.sin(sideAngle) * 0.65 + Math.sin(veh.rotation) * 3.8;
      const pz =
        veh.z - Math.cos(sideAngle) * 0.65 + Math.cos(veh.rotation) * 3.8;
      this.playerLimbs.group.position.set(px, 1.15, pz);
      this.playerLimbs.group.rotation.set(0, veh.rotation, 0);
      this.playerLimbs.group.scale.set(0.86, 0.86, 0.86);

      this.playerLimbs.leftArm.rotation.set(0.5, 0.2, -0.3);
      this.playerLimbs.rightArm.rotation.set(0.5, -0.2, 0.3);
      this.playerLimbs.leftLeg.rotation.set(1.0, 0.15, 0);
      this.playerLimbs.rightLeg.rotation.set(1.0, -0.15, 0);
    }

    if (this.playerLimbs.rpmRig) {
      const rig = this.playerLimbs.rpmRig;
      const axisX = new THREE.Vector3(1, 0, 0);
      const tmpQuat = new THREE.Quaternion();
      tmpQuat.setFromAxisAngle(axisX, 1.05);
      if (rig.leftUpLeg)
        rig.leftUpLeg.bone.quaternion.copy(rig.leftUpLeg.rest).multiply(tmpQuat);
      if (rig.rightUpLeg)
        rig.rightUpLeg.bone.quaternion.copy(rig.rightUpLeg.rest).multiply(tmpQuat);
      tmpQuat.setFromAxisAngle(axisX, -1.15);
      if (rig.leftLeg)
        rig.leftLeg.bone.quaternion.copy(rig.leftLeg.rest).multiply(tmpQuat);
      if (rig.rightLeg)
        rig.rightLeg.bone.quaternion.copy(rig.rightLeg.rest).multiply(tmpQuat);
      tmpQuat.setFromAxisAngle(axisX, 0.48);
      if (rig.leftArm)
        rig.leftArm.bone.quaternion.copy(rig.leftArm.rest).multiply(tmpQuat);
      if (rig.rightArm)
        rig.rightArm.bone.quaternion.copy(rig.rightArm.rest).multiply(tmpQuat);
    }

    dhakaAudio.updateEngine(
      true,
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

    for (const veh of this.vehicles) {
      if (veh.id === this.activeVehicleId) continue;

      const mesh = this.vehicleMeshes.get(veh.id);
      if (!mesh) continue;
      if (veh.isParked) continue;

      if (veh.isPolice) {
        const redBar = mesh.getObjectByName('siren_red');
        const blueBar = mesh.getObjectByName('siren_blue');
        if (redBar && blueBar) {
          const flash = Math.floor(performance.now() / 160) % 2 === 0;
          redBar.visible = wantedLevel > 0 ? flash : true;
          blueBar.visible = wantedLevel > 0 ? !flash : true;
        }

        // Periodic authentic siren chime during pursuit
        if (wantedLevel > 0) {
          this.policeSirenTimer += dt;
          if (this.policeSirenTimer > 3.6) {
            this.policeSirenTimer = 0;
            if (
              Math.hypot(veh.x - this.playerPos.x, veh.z - this.playerPos.z) < 130
            ) {
              dhakaAudio.playHorn('siren');
            }
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

      if (veh.isPolice && wantedLevel > 0) {
        const dx = this.playerPos.x - veh.x;
        const dz = this.playerPos.z - veh.z;
        const distToPlayer = Math.hypot(dx, dz);

        if (distToPlayer < 180) {
          const targetAngle = Math.atan2(dx, dz);
          const diff = normalizeAngle(targetAngle - veh.rotation);
          veh.rotation += diff * Math.min(1, dt * 3.0);
          const chaseSpeed = 17 + wantedLevel * 3.4;

          const nx = veh.x + Math.sin(veh.rotation) * chaseSpeed * dt;
          const nz = veh.z + Math.cos(veh.rotation) * chaseSpeed * dt;

          if (!this.checkWorldObstacle(nx, nz, 1.4, veh.id)) {
            veh.x = nx;
            veh.z = nz;
          } else {
            // Intelligent obstacle unstuck: back up cleanly along reverse vector without spinning
            const backX = veh.x - Math.sin(veh.rotation) * 4 * dt;
            const backZ = veh.z - Math.cos(veh.rotation) * 4 * dt;
            if (!this.checkWorldObstacle(backX, backZ, 1.4, veh.id)) {
              veh.x = backX;
              veh.z = backZ;
            }
            veh.rotation = normalizeAngle(veh.rotation + diff * Math.min(1, dt * 1.5));
          }

          // Police ramming Arif's vehicle
          if (this.activeVehicleId) {
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
          } else if (distToPlayer < 3.6) {
            store.damagePlayer(14 * dt);
          }

          // Police Arrest / Busted check when player is stopped & cornered
          const isPlayerStopped = this.activeVehicleId
            ? Math.abs(this.vehicles.find((v) => v.id === this.activeVehicleId)?.speed || 0) < 2.0
            : true;
          if (distToPlayer < 4.8 && isPlayerStopped && !store.isBusted && !store.isWasted) {
            this.policeArrestTimer += dt;
            if (this.policeArrestTimer > 2.2) {
              this.policeArrestTimer = 0;
              store.triggerBusted();
            }
          } else if (distToPlayer > 8.0) {
            this.policeArrestTimer = Math.max(0, this.policeArrestTimer - dt * 2);
          }

          mesh.position.set(veh.x, 0, veh.z);
          mesh.rotation.y = veh.rotation;
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

      const distToPlayer = Math.hypot(
        veh.x - this.playerPos.x,
        veh.z - this.playerPos.z
      );
      if (distToPlayer < 6.5) {
        if (Math.random() < 0.015) {
          dhakaAudio.playHorn(stats.hornType);
        }
        veh.speed = 0;
        this.animateVehicleWheels(mesh, 0, dt, 0);
        continue;
      }

      // Traffic forward lane queueing check (eliminates overlapping pileups)
      let blockedAhead = false;
      const forwardX = Math.sin(veh.rotation);
      const forwardZ = Math.cos(veh.rotation);

      for (const otherVeh of this.vehicles) {
        if (otherVeh.id === veh.id) continue;
        const dx = otherVeh.x - veh.x;
        const dz = otherVeh.z - veh.z;
        const d2 = dx * dx + dz * dz;
        if (d2 < 64) {
          const dist = Math.sqrt(d2);
          const dot = (dx * forwardX + dz * forwardZ) / Math.max(0.01, dist);
          if (dot > 0.45) {
            blockedAhead = true;
            break;
          }
        }
      }

      if (blockedAhead) {
        if (Math.random() < 0.006) {
          dhakaAudio.playHorn(stats.hornType);
        }
        veh.speed = 0;
        this.animateVehicleWheels(mesh, 0, dt, 0);
        continue; // Wait behind car ahead in lane
      }

      const nx = veh.x + Math.sin(veh.rotation) * cruiseSpeed * dt;
      const nz = veh.z + Math.cos(veh.rotation) * cruiseSpeed * dt;

      // Check boundary or obstacle ahead - pass veh.id to avoid self-collision!
      const isBlocked =
        Math.abs(nx) > 740 ||
        nz > 450 ||
        nz < -690 ||
        this.checkWorldObstacle(nx, nz, 1.4, veh.id);

      if (isBlocked) {
        // Clean 180° road lane reversal - NEVER spin continuously!
        veh.rotation = normalizeAngle(veh.rotation + Math.PI);
        veh.x += Math.sin(veh.rotation) * 1.5;
        veh.z += Math.cos(veh.rotation) * 1.5;
      } else {
        veh.x = nx;
        veh.z = nz;
      }
      mesh.position.set(veh.x, 0, veh.z);
      mesh.rotation.y = veh.rotation;
      this.animateVehicleWheels(mesh, cruiseSpeed, dt, 0);
      this.animateVehicleWheels(mesh, cruiseSpeed, dt, 0);
    }
  }

  private updateNPCAI(dt: number) {
    const t = performance.now() * 0.008;
    const store = useGameStore.getState();

    for (const npc of this.npcs) {
      const limbs = this.npcLimbsMap.get(npc.id);
      if (!limbs) continue;

      // Handle Dead Pedestrians (flat on the ground with respawn countdown)
      if (npc.isDead) {
        limbs.group.position.set(npc.x, 0.08, npc.z);
        limbs.group.rotation.x = -Math.PI / 2;
        npc.respawnTimer = (npc.respawnTimer ?? 35) - dt;
        if (npc.respawnTimer <= 0) {
          // Revive as a new pedestrian
          npc.isDead = false;
          npc.aiState = 'walk';
          npc.health = 100;
          limbs.group.rotation.x = 0;
          npc.x = (Math.random() - 0.5) * 80;
          npc.z = (Math.random() - 0.5) * 120;
          limbs.group.position.set(npc.x, 0, npc.z);
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

      // Check Fatal Collisions with Player Vehicle
      if (this.activeVehicleId) {
        const pv = this.vehicles.find((v) => v.id === this.activeVehicleId);
        if (pv && Math.abs(pv.speed) > 4.5) {
          const d = Math.hypot(npc.x - pv.x, npc.z - pv.z);
          if (d < 2.3 && !npc.isDead) {
            const impactSpeed = Math.abs(pv.speed);

            if (impactSpeed > 5.5 && !npc.isStoryNPC) {
              // FATAL HIT - Pedestrian killed in realistic road accident!
              npc.isDead = true;
              npc.aiState = 'dead';
              npc.health = 0;
              npc.respawnTimer = 40;

              // Launch pedestrian forward along vehicle trajectory with physics momentum
              const launchDist = Math.min(12, impactSpeed * 0.85);
              const launchAngle = pv.rotation + (Math.random() - 0.5) * 0.35;
              npc.x += Math.sin(launchAngle) * launchDist;
              npc.z += Math.cos(launchAngle) * launchDist;

              limbs.group.position.set(npc.x, 0.08, npc.z);
              limbs.group.rotation.x = -Math.PI / 2;
              limbs.group.rotation.z = Math.random() * Math.PI * 2;

              // Authentic crash audio & visceral camera trauma
              dhakaAudio.playSfx('crash');
              dhakaAudio.playSfx('hit');
              this.cameraTrauma = Math.min(1.0, this.cameraTrauma + 0.45);

              // Expanding dark crimson blood decal pool on the asphalt
              this.spawnBloodDecal(npc.x, npc.z);

              // Blood splatter & cracked glass debris
              this.spawnImpactSparks(npc.x, 0.25, npc.z, '#7f1d1d', 3.0);
              this.spawnImpactSparks(npc.x, 0.45, npc.z, '#b91c1c', 2.2);
              this.spawnGlassShatter(
                pv.x + Math.sin(pv.rotation) * 1.8,
                0.75,
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

      // Check Fatal Collisions with AI Traffic Vehicles
      for (const tv of this.vehicles) {
        if (tv.id === this.activeVehicleId) continue;
        if (Math.abs(tv.speed) > 6.5) {
          const d = Math.hypot(npc.x - tv.x, npc.z - tv.z);
          if (d < 2.0 && !npc.isDead && !npc.isStoryNPC) {
            npc.isDead = true;
            npc.aiState = 'dead';
            npc.health = 0;
            npc.respawnTimer = 35;
            limbs.group.position.set(npc.x, 0.08, npc.z);
            limbs.group.rotation.x = -Math.PI / 2;
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

      const isFleeing = npc.aiState === 'flee';
      const speed = isFleeing ? 6.5 : 2.3;
      setCharacterAnimationState(limbs, isFleeing ? 'run' : 'walk', dt);

      const dx = npc.walkTargetX - npc.x;
      const dz = npc.walkTargetZ - npc.z;
      const dist = Math.hypot(dx, dz);

      if (dist < 1.5) {
        npc.walkTargetZ = -npc.walkTargetZ;
        if (npc.aiState === 'flee') npc.aiState = 'walk';
      } else {
        npc.rotation = Math.atan2(dx, dz);
        const nx = npc.x + Math.sin(npc.rotation) * speed * dt;
        const nz = npc.z + Math.cos(npc.rotation) * speed * dt;
        if (!this.checkBuildingCollision(nx, nz, 0.45)) {
          npc.x = nx;
          npc.z = nz;
        } else {
          // Divert around buildings, flyover pillars & obstacles
          npc.walkTargetX = npc.x + (Math.random() - 0.5) * 16;
          npc.walkTargetZ = -npc.walkTargetZ;
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
  }

  private updateMissionAndInteractionChecks(dt: number) {
    const store = useGameStore.getState();

    const allMissions = [...STORY_MISSIONS, ...SIDE_MISSIONS];
    const activeMission = allMissions.find(
      (m) => m.id === store.activeMissionId
    );

    if (activeMission) {
      const step = activeMission.steps[store.activeMissionStepIndex];
      if (step) {
        this.missionMarkerGroup.visible = true;
        this.missionMarkerGroup.position.set(step.targetX, 0, step.targetZ);
        this.missionRingMesh.rotation.z += dt * 1.8;

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

    this.telemetryTimer += dt;
    if (this.telemetryTimer < 0.09) return;
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

    store.updateTelemetry({
      x: this.playerPos.x,
      z: this.playerPos.z,
      rotation: this.playerRotation,
      district,
      inVehicleId: this.activeVehicleId,
      vehicleType: activeVeh ? activeVeh.type : null,
      speedKmh: activeVeh ? Math.round(Math.abs(activeVeh.speed) * 2.6) : 0,
      vehicleHealth: activeVeh ? Math.round(activeVeh.health) : 100,
      vehicleMaxHealth: activeVeh ? activeVeh.maxHealth : 100,
      stamina: Math.round(this.playerStamina),
    });

    if (this.activeVehicleId) {
      store.setNearbyPrompt(null);
      return;
    }

    let prompt: NearbyPrompt | null = null;

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

    if (!prompt) {
      for (const v of this.vehicles) {
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
    const isDriving = Boolean(this.activeVehicleId);

    let desiredDist = isDriving ? 9.2 : 6.2;
    let heightOffset = isDriving ? 2.4 : 1.75;

    if (!isDriving && this.isAiming) {
      desiredDist = 3.6;
      heightOffset = 1.62;
    } else if (mode === 'far_chase') {
      desiredDist = isDriving ? 13.5 : 9.0;
      heightOffset = isDriving ? 3.4 : 2.3;
    } else if (mode === 'hood_close') {
      desiredDist = isDriving ? 5.6 : 4.0;
      heightOffset = isDriving ? 1.8 : 1.55;
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
    for (const b of this.buildingColliders) {
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

    if (occluded) {
      const safeDist = desiredDist * 0.52;
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
    const camY = Math.max(
      1.1,
      targetY + Math.sin(this.cameraPitch) * this.currentCameraDist
    );
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

  private checkBuildingCollision(
    x: number,
    z: number,
    radius: number
  ): boolean {
    for (const b of this.buildingColliders) {
      if (
        x + radius > b.minX &&
        x - radius < b.maxX &&
        z + radius > b.minZ &&
        z - radius < b.maxZ
      ) {
        return true;
      }
    }
    for (const c of this.circleColliders) {
      const dx = x - c.x;
      const dz = z - c.z;
      const r = radius + c.radius;
      if (dx * dx + dz * dz < r * r) {
        return true;
      }
    }
    return false;
  }

  // Checks Building Colliders, Obstacle Circles, Road Railings, Medians, Water Basins, and Other Vehicles!
  private checkWorldObstacle(
    x: number,
    z: number,
    radius: number,
    ignoreVehicleId?: string | null
  ): boolean {
    if (this.checkBuildingCollision(x, z, radius)) return true;

    // Dynamic vehicle obstacles (other cars, buses, CNGs, police cruisers)
    if (this.vehicles) {
      for (const otherVeh of this.vehicles) {
        if (ignoreVehicleId && otherVeh.id === ignoreVehicleId) continue;
        const oStats = VEHICLE_STATS[otherVeh.type];
        const otherRadius = Math.max(oStats.width, oStats.length) * 0.42;
        const dx = x - otherVeh.x;
        const dz = z - otherVeh.z;
        const minDist = radius + otherRadius;
        if (dx * dx + dz * dz < minDist * minDist) {
          return true;
        }
      }
    }

    // Check Water Boundaries across expanded Dhaka metropolitan (Buriganga, Hatirjheel, Dhanmondi, Gulshan, Uttara lakes)
    if (this.isPositionInWater(x, z)) return true;

    return false;
  }
}

function normalizeAngle(a: number): number {
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
}

function clampWorldCoord(v: number): number {
  return Math.max(-780, Math.min(780, v));
}
