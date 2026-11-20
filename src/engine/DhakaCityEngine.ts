import * as THREE from 'three';
import {
  DHAKA_GAME_LOCATIONS,
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
  private horizonMesh!: THREE.Mesh;
  private waterNormalTex!: THREE.Texture;
  private groundMat!: THREE.MeshStandardMaterial;
  private rainSystem: THREE.Points | null = null;
  private hatirjheelLights: THREE.PointLight[] = [];
  private streetlampLights: THREE.PointLight[] = [];
  private lastGraphicsQuality: 'high' | 'low' = 'high';

  // World Collision Boxes, Pickups & Live Dhaka Metro Train
  private buildingColliders: BuildingCollider[] = [];
  private cashDrops: CashPickupDrop[] = [];
  private metroTrainGroup: THREE.Group | null = null;

  // Player Character State
  private playerLimbs!: CharacterLimbs;
  private playerPos = new THREE.Vector3(10, 0, 18);
  private playerVelY = 0;
  private playerRotation = 0;
  private playerStamina = 100;
  private isGrounded = true;
  private isCrouching = false;
  private attackAnimTimer = 0;
  private walkAnimPhase = 0;
  private lastStepTime = 0;
  private lastEquippedOutfit = '';
  private lastEquippedTool = '';

  // Combat, Firearms & Particle FX
  private muzzleFlashLight!: THREE.PointLight;
  private muzzleFlashTimer = 0;
  private bulletTracers: Array<{ line: THREE.Line; life: number; maxLife: number }> = [];
  private impactSparks: Array<{ mesh: THREE.Mesh; vel: THREE.Vector3; life: number; maxLife: number }> = [];
  private shellCasings: Array<{ mesh: THREE.Mesh; vel: THREE.Vector3; life: number }> = [];
  private skidMarks: Array<{ mesh: THREE.Mesh; life: number }> = [];
  public isAimingDownSights = false;
  private nitroActive = false;
  private policeSirenTimer = 0;
  private ambientSoundTimer = 0;

  // Camera State
  private cameraYaw = 0;
  private cameraPitch = 0.32;
  private isPointerDragging = false;
  private lastPointerX = 0;
  private lastPointerY = 0;
  private pointerDownStartX = 0;
  private pointerDownStartY = 0;

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
    this.scene.background = new THREE.Color('#1e293b');
    this.scene.fog = new THREE.FogExp2('#1e293b', 0.0022);

    this.camera = new THREE.PerspectiveCamera(
      60,
      container.clientWidth / Math.max(1, container.clientHeight),
      0.4,
      620
    );

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
    });
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
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
    this.sunLight.shadow.mapSize.width = 2048;
    this.sunLight.shadow.mapSize.height = 2048;
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

    // Dynamic Muzzle Flash Point Light
    this.muzzleFlashLight = new THREE.PointLight('#ffea75', 0, 16);
    this.scene.add(this.muzzleFlashLight);

    // 360° Realistic Dhaka Sunset Sky Dome
    const skyTex = loadRealTexture('/textures/dhaka_sky_sunset.jpg', 1, 1, true);
    const skyGeo = new THREE.SphereGeometry(490, 32, 20);
    const skyMat = new THREE.MeshBasicMaterial({
      map: skyTex,
      side: THREE.BackSide,
       fog: false,
    });
    this.skyDomeMesh = new THREE.Mesh(skyGeo, skyMat);
    this.scene.add(this.skyDomeMesh);

    // 360° Photorealistic Dhaka Rooftop Twilight Skyline Horizon Cylinder
    const horizonTex = loadRealTexture(
      '/dhaka_locations/dhaka_rooftop_twilight.png',
      4,
      1,
      true
    );
    const horizonGeo = new THREE.CylinderGeometry(475, 475, 180, 32, 1, true);
    const horizonMat = new THREE.MeshBasicMaterial({
      map: horizonTex,
      side: THREE.BackSide,
      transparent: true,
      opacity: 0.88,
      fog: false,
    });
    this.horizonMesh = new THREE.Mesh(horizonGeo, horizonMat);
    this.horizonMesh.position.y = 55;
    this.scene.add(this.horizonMesh);
  }

  private buildDhakaWorld() {
    // 1. Realistic Textured Urban Ground Plane
    const asphaltBaseTex = loadRealTexture(
      '/textures/dhaka_asphalt.jpg',
      65,
      65,
      true
    );
    const groundGeo = new THREE.PlaneGeometry(920, 920);
    groundGeo.rotateX(-Math.PI / 2);
    this.groundMat = new THREE.MeshStandardMaterial({
      map: asphaltBaseTex,
      color: '#475569',
      roughness: 0.88,
    });
    const ground = new THREE.Mesh(groundGeo, this.groundMat);
    ground.receiveShadow = true;
    this.scene.add(ground);

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
      new THREE.PlaneGeometry(920, 150),
      waterMat
    );
    buriganga.rotation.x = -Math.PI / 2;
    buriganga.position.set(0, 0.06, 375);
    this.scene.add(buriganga);

    const embankment = new THREE.Mesh(
      new THREE.BoxGeometry(760, 1.2, 14),
      new THREE.MeshStandardMaterial({
        map: loadRealTexture('/textures/brick_diffuse.jpg', 35, 1),
        color: '#94a3b8',
        roughness: 0.85,
      })
    );
    embankment.position.set(0, 0.4, 296);
    embankment.receiveShadow = true;
    this.scene.add(embankment);

    [-65, 12, 95].forEach((lx) => {
      const launch = createBurigangaLaunchMesh();
      launch.position.set(lx, 0.2, 318);
      launch.rotation.y = Math.PI / 2 + (lx === 12 ? -0.12 : 0.05);
      this.scene.add(launch);
      this.launchBoats.push(launch);
    });

    const hatirjheelWater = new THREE.Mesh(
      new THREE.PlaneGeometry(115, 155),
      waterMat
    );
    hatirjheelWater.rotation.x = -Math.PI / 2;
    hatirjheelWater.position.set(220, 0.05, -5);
    this.scene.add(hatirjheelWater);

    const dhanmondiWater = new THREE.Mesh(
      new THREE.PlaneGeometry(85, 125),
      waterMat
    );
    dhanmondiWater.rotation.x = -Math.PI / 2;
    dhanmondiWater.position.set(-225, 0.05, 25);
    this.scene.add(dhanmondiWater);

    // 3. Realistic Asphalt Road Strips with Anisotropic Texture Mapping
    const roadTex = loadRealTexture('/textures/dhaka_asphalt.jpg', 4, 40, true);
    const roadMat = new THREE.MeshStandardMaterial({
      map: roadTex,
      color: '#334155',
      roughness: 0.72,
      metalness: 0.12,
    });
    const yellowLineMat = new THREE.MeshBasicMaterial({ color: '#facc15' });
    const curbMat = new THREE.MeshStandardMaterial({
      color: '#e2e8f0',
      roughness: 0.65,
    });

    const createRoadStrip = (
      x: number,
      z: number,
      width: number,
      length: number,
      isNorthSouth: boolean
    ) => {
      const rMesh = new THREE.Mesh(
        new THREE.PlaneGeometry(width, length),
        roadMat
      );
      rMesh.rotation.x = -Math.PI / 2;
      rMesh.position.set(x, 0.08, z);
      rMesh.receiveShadow = true;
      this.scene.add(rMesh);

      const divider = new THREE.Mesh(
        new THREE.PlaneGeometry(
          isNorthSouth ? 0.35 : width,
          isNorthSouth ? length : 0.35
        ),
        yellowLineMat
      );
      divider.rotation.x = -Math.PI / 2;
      divider.position.set(x, 0.095, z);
      this.scene.add(divider);

      // BRTA Standard Dashed White Lane Lines
      const laneOffset = isNorthSouth ? width * 0.26 : length * 0.26;
      [-laneOffset, laneOffset].forEach((lOff) => {
        const span = isNorthSouth ? length : width;
        const dashCount = Math.floor(span / 6.5);
        for (let d = 0; d < dashCount; d++) {
          const dash = new THREE.Mesh(
            new THREE.PlaneGeometry(
              isNorthSouth ? 0.24 : 2.4,
              isNorthSouth ? 2.4 : 0.24
            ),
            new THREE.MeshBasicMaterial({
              color: '#f8fafc',
              side: THREE.DoubleSide,
            })
          );
          dash.rotation.x = -Math.PI / 2;
          const pos = d * 6.5 - span / 2 + 3.2;
          dash.position.set(
            isNorthSouth ? x + lOff : x + pos,
            0.092,
            isNorthSouth ? z + pos : z + lOff
          );
          this.scene.add(dash);
        }
      });

      if (isNorthSouth) {
        [-width / 2 - 0.6, width / 2 + 0.6].forEach((offsetX) => {
          const curb = new THREE.Mesh(
            new THREE.BoxGeometry(1.2, 0.22, length),
            curbMat
          );
          curb.position.set(x + offsetX, 0.11, z);
          this.scene.add(curb);
        });
      } else {
        [-length / 2 - 0.6, length / 2 + 0.6].forEach((offsetZ) => {
          const curb = new THREE.Mesh(
            new THREE.BoxGeometry(width, 0.22, 1.2),
            curbMat
          );
          curb.position.set(x, 0.11, z + offsetZ);
          this.scene.add(curb);
        });
      }
    };

    createRoadStrip(0, -10, 18, 610, true);
    createRoadStrip(-170, -10, 16, 610, true);
    createRoadStrip(220, -10, 18, 610, true);
    createRoadStrip(-70, 185, 11, 210, true);

    createRoadStrip(0, -315, 680, 18, false);
    createRoadStrip(0, -175, 680, 16, false);
    createRoadStrip(0, 0, 680, 18, false);
    createRoadStrip(0, 175, 680, 16, false);
    createRoadStrip(0, 285, 680, 15, false);

    // 4. Landmarks, Sketchfab Billboards & Buildings
    this.buildHatirjheelBridge();
    this.buildMotijheelShaplaMonument();
    this.buildMetroViaductPillars();
    this.buildDistrictHighwaySigns();
    this.buildMosqueLandmarks();
    this.buildPointsOfInterestMeshes();
    this.buildCityDistrictBuildings();
    this.buildSketchfabGtaLandmarks();
    this.buildDhakaStreetAtmosphere();
    this.buildDhakaUrbanMicroDetails();
  }

  private buildSketchfabGtaLandmarks() {
    // Place giant illuminated billboards using the authentic Dhaka location concept arts from stitch_dhaka_city_game_ui
    const billboardLocations = [
      { x: 24, z: -22, tex: '/dhaka_locations/kawran_bazar.png', rot: -0.4 },
      { x: -25, z: 24, tex: '/dhaka_locations/chawkbazar.png', rot: 0.5 },
      { x: 202, z: -158, tex: '/dhaka_locations/gulshan_2.png', rot: -0.3 },
      { x: 202, z: 158, tex: '/dhaka_locations/motijheel.png', rot: 0.3 },
      { x: 202, z: -40, tex: '/dhaka_locations/hatirjheel.png', rot: 0.2 },
      { x: 12, z: 275, tex: '/dhaka_locations/sadarghat.png', rot: 0.0 },
      { x: -65, z: 120, tex: '/dhaka_locations/ahsan_manzil.png', rot: 0.4 },
      { x: -180, z: 25, tex: '/dhaka_locations/curzon_hall.png', rot: -0.5 },
      { x: 110, z: -280, tex: '/dhaka_locations/dhaka_rooftop_twilight.png', rot: 0.8 },
      { x: -95, z: 195, tex: '/dhaka_locations/lalbagh_fort.png', rot: -0.2 },
      { x: -245, z: -220, tex: '/dhaka_locations/gabtoli.png', rot: 0.6 },
      { x: -45, z: 245, tex: '/dhaka_locations/shakhari_bazar.png', rot: 0.2 },
      { x: 85, z: -160, tex: '/dhaka_locations/tejgaon.png', rot: -0.6 },
      { x: -210, z: -85, tex: '/dhaka_locations/tuned_cng_auto_rickshaw.png', rot: 0.9 },
      { x: 145, z: 65, tex: '/dhaka_locations/dmp_riot_interceptor.png', rot: -0.1 },
      { x: 260, z: -250, tex: '/dhaka_locations/midnight_street_rally.png', rot: -0.8 },
    ];

    billboardLocations.forEach((b) => {
      const mesh = createSketchfabAssetPropMesh('billboard', b.tex);
      mesh.position.set(b.x, 0, b.z);
      mesh.rotation.y = b.rot;
      this.scene.add(mesh);
    });

    // Spawn 3D Photorealistic Dhaka Landmark Pavilions for ALL 16 authentic Dhaka locations
    DHAKA_GAME_LOCATIONS.forEach((loc) => {
      const mesh = createSketchfabAssetPropMesh(
        'dhaka_landmark_building',
        loc.image
      );
      // Orient landmark to face towards the nearest roadway
      const rot = Math.atan2(-loc.x, -loc.z) * 0.35;
      mesh.position.set(loc.x, 0, loc.z);
      mesh.rotation.y = rot;
      this.scene.add(mesh);
      this.buildingColliders.push({
        minX: loc.x - 14,
        maxX: loc.x + 14,
        minZ: loc.z - 11,
        maxZ: loc.z + 11,
      });
    });

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

  private buildDhakaStreetAtmosphere() {
    const concreteMat = new THREE.MeshStandardMaterial({
      color: '#94a3b8',
      roughness: 0.85,
    });
    const cableMat = new THREE.MeshBasicMaterial({ color: '#09090b' });
    const dividerMat = new THREE.MeshStandardMaterial({
      color: '#eab308',
      roughness: 0.65,
    });
    const stripeMat = new THREE.MeshBasicMaterial({ color: '#09090b' });
    const greenFenceMat = new THREE.MeshStandardMaterial({
      color: '#15803d',
      wireframe: true,
    });

    // 1. Concrete Utility Poles with Tangled Overhead Cables (Dhaka signature streetscape)
    const poleZList = [-260, -195, -130, -65, 25, 95, 165, 235];
    const polePositions: THREE.Vector3[] = [];

    poleZList.forEach((pz) => {
      [-10.2, 10.2].forEach((px) => {
        const pole = new THREE.Group();
        pole.position.set(px, 0, pz);

        // Concrete pole mast
        const mast = new THREE.Mesh(
          new THREE.CylinderGeometry(0.18, 0.24, 8.5, 8),
          concreteMat
        );
        mast.position.y = 4.25;
        mast.castShadow = true;
        pole.add(mast);

        // Crossarms
        const crossarm = new THREE.Mesh(
          new THREE.BoxGeometry(1.8, 0.12, 0.12),
          concreteMat
        );
        crossarm.position.set(0, 7.8, 0);
        pole.add(crossarm);

        // Streetlamp extending over avenue
        const armDir = px > 0 ? -1 : 1;
        const lampArm = new THREE.Mesh(
          new THREE.CylinderGeometry(0.04, 0.04, 1.6, 8).rotateZ(
            (Math.PI / 3) * armDir
          ),
          concreteMat
        );
        lampArm.position.set(armDir * 0.7, 7.3, 0);
        pole.add(lampArm);

        const lampCone = new THREE.Mesh(
          new THREE.ConeGeometry(0.32, 0.22, 10),
          new THREE.MeshStandardMaterial({ color: '#334155', metalness: 0.85 })
        );
        lampCone.position.set(armDir * 1.35, 6.8, 0);
        pole.add(lampCone);

        const bulb = new THREE.Mesh(
          new THREE.SphereGeometry(0.12, 8, 8),
          new THREE.MeshBasicMaterial({ color: '#fef08a' })
        );
        bulb.position.set(armDir * 1.35, 6.68, 0);
        pole.add(bulb);

        const lampLight = new THREE.PointLight('#fef08a', 0.85, 22);
        lampLight.position.set(px + armDir * 1.35, 6.6, pz);
        this.scene.add(lampLight);
        this.streetlampLights.push(lampLight);

        // Transformer box on some poles
        if (Math.abs(pz) % 3 === 0) {
          const trans = new THREE.Mesh(
            new THREE.BoxGeometry(0.7, 0.9, 0.6),
            new THREE.MeshStandardMaterial({ color: '#475569', metalness: 0.8 })
          );
          trans.position.set(0.35, 5.2, 0);
          pole.add(trans);
        }

        this.scene.add(pole);
        polePositions.push(new THREE.Vector3(px, 7.8, pz));
      });
    });

    // String tangled drooping electrical cables between poles
    for (let i = 0; i < polePositions.length - 2; i += 2) {
      // Along left side
      this.createDroopingCable(
        polePositions[i],
        polePositions[i + 2],
        cableMat,
        0.85
      );
      // Along right side
      this.createDroopingCable(
        polePositions[i + 1],
        polePositions[i + 3],
        cableMat,
        0.9
      );
      // Cross-street tangled cables
      if (i % 4 === 0) {
        this.createDroopingCable(
          polePositions[i],
          polePositions[i + 3],
          cableMat,
          1.4
        );
      }
    }

    // 2. Concrete Road Dividers with Hazard Stripes & Green Median Mesh along Main Avenue
    const dividerSegments = [
      { startZ: -290, endZ: -185 },
      { startZ: -160, endZ: -15 },
      { startZ: 15, endZ: 160 },
      { startZ: 190, endZ: 275 },
    ];

    dividerSegments.forEach((seg) => {
      const len = seg.endZ - seg.startZ;
      const centerZ = (seg.startZ + seg.endZ) / 2;

      // Concrete median kerb
      const kerb = new THREE.Mesh(
        new THREE.BoxGeometry(0.75, 0.45, len),
        dividerMat
      );
      kerb.position.set(0, 0.22, centerZ);
      this.scene.add(kerb);

      // Black chevron stripes at intervals
      const stripeCount = Math.floor(len / 4);
      for (let s = 0; s < stripeCount; s++) {
        const stripe = new THREE.Mesh(
          new THREE.BoxGeometry(0.78, 0.46, 0.4),
          stripeMat
        );
        stripe.position.set(0, 0.22, seg.startZ + s * 4 + 2);
        this.scene.add(stripe);
      }

      // Green anti-glare mesh fence on median
      const fence = new THREE.Mesh(
        new THREE.BoxGeometry(0.12, 0.85, len),
        greenFenceMat
      );
      fence.position.set(0, 0.85, centerZ);
      this.scene.add(fence);
    });

    // 3. Authentic BRTA White Zebra Crossings at Intersections
    [-175, 0, 175].forEach((crossZ) => {
      for (let x = -8; x <= 8; x += 1.4) {
        const stripe = new THREE.Mesh(
          new THREE.PlaneGeometry(0.75, 5.2),
          new THREE.MeshBasicMaterial({
            color: '#f8fafc',
            side: THREE.DoubleSide,
          })
        );
        stripe.rotation.x = -Math.PI / 2;
        stripe.position.set(x, 0.04, crossZ);
        this.scene.add(stripe);
      }
    });
  }

  private buildDhakaUrbanMicroDetails() {
    // 1. Cast-Iron DWASA Manhole Covers (ঢাকা ওয়াসা ম্যানহোল)
    const manholeMat = new THREE.MeshStandardMaterial({
      color: '#334155',
      metalness: 0.88,
      roughness: 0.45,
    });
    const manholeRimMat = new THREE.MeshStandardMaterial({
      color: '#1e293b',
      roughness: 0.85,
    });

    const manholePositions: Array<[number, number]> = [
      [3.2, -80],
      [-3.2, -45],
      [4.5, 30],
      [-4.2, 95],
      [3.8, 150],
      [-166, -60],
      [-173, 40],
      [216, -110],
      [223, 75],
    ];

    manholePositions.forEach(([mx, mz]) => {
      const rim = new THREE.Mesh(
        new THREE.RingGeometry(0.52, 0.62, 16).rotateX(-Math.PI / 2),
        manholeRimMat
      );
      rim.position.set(mx, 0.086, mz);
      this.scene.add(rim);

      const cover = new THREE.Mesh(
        new THREE.CircleGeometry(0.5, 16).rotateX(-Math.PI / 2),
        manholeMat
      );
      cover.position.set(mx, 0.088, mz);
      this.scene.add(cover);
    });

    // 2. Yellow Box Junctions at Major Intersections (Farmgate z: 0, Motijheel z: 175)
    const yellowLineMat = new THREE.MeshBasicMaterial({ color: '#facc15' });
    [0, 175, -175].forEach((jz) => {
      const boxW = 18;
      const boxH = 18;
      const border = new THREE.LineSegments(
        new THREE.EdgesGeometry(
          new THREE.PlaneGeometry(boxW, boxH).rotateX(-Math.PI / 2)
        ),
        new THREE.LineBasicMaterial({ color: '#facc15', linewidth: 3 })
      );
      border.position.set(0, 0.085, jz);
      this.scene.add(border);

      for (let i = -7; i <= 7; i += 3.5) {
        const diag1 = new THREE.Mesh(
          new THREE.PlaneGeometry(0.24, 22)
            .rotateX(-Math.PI / 2)
            .rotateY(Math.PI / 4),
          yellowLineMat
        );
        diag1.position.set(i * 0.7, 0.086, jz);
        this.scene.add(diag1);

        const diag2 = new THREE.Mesh(
          new THREE.PlaneGeometry(0.24, 22)
            .rotateX(-Math.PI / 2)
            .rotateY(-Math.PI / 4),
          yellowLineMat
        );
        diag2.position.set(i * 0.7, 0.086, jz);
        this.scene.add(diag2);
      }
    });

    // 3. Black-and-Yellow Striped Dhaka Speedbreakers (স্পিড ব্রেকার)
    const speedbumpMatYellow = new THREE.MeshStandardMaterial({
      color: '#eab308',
      roughness: 0.6,
    });
    const speedbumpMatBlack = new THREE.MeshStandardMaterial({
      color: '#09090b',
      roughness: 0.8,
    });

    [-115, -45, 65, 135].forEach((bumpZ) => {
      const bumpW = 16.5;
      const segments = Math.floor(bumpW / 1.2);
      for (let s = 0; s < segments; s++) {
        const segX = -bumpW / 2 + s * 1.2 + 0.6;
        const bump = new THREE.Mesh(
          new THREE.CylinderGeometry(0.18, 0.18, 1.15, 8).rotateZ(Math.PI / 2),
          s % 2 === 0 ? speedbumpMatYellow : speedbumpMatBlack
        );
        bump.scale.set(1, 0.45, 1);
        bump.position.set(segX, 0.11, bumpZ);
        this.scene.add(bump);
      }
    });

    // 4. Reflective Monsoon Water Puddles on Road Gutters
    const puddleMat = new THREE.MeshStandardMaterial({
      color: '#0284c7',
      roughness: 0.06,
      metalness: 0.92,
      transparent: true,
      opacity: 0.68,
    });

    const puddlePositions: Array<[number, number, number, number]> = [
      [7.5, -35, 3.2, 1.8],
      [-7.8, -95, 2.8, 2.2],
      [7.2, 55, 3.5, 2.4],
      [-7.5, 115, 4.0, 1.9],
      [-162, 15, 3.0, 2.5],
      [227, -25, 3.2, 2.0],
    ];

    puddlePositions.forEach(([px, pz, pw, ph]) => {
      const puddle = new THREE.Mesh(
        new THREE.PlaneGeometry(pw, ph).rotateX(-Math.PI / 2),
        puddleMat
      );
      puddle.position.set(px, 0.088, pz);
      this.scene.add(puddle);
    });

    // 5. DMP Police Checkpost Barricades (ডিএমপি পুলিশ চেকপোস্ট ব্যারিকেড)
    const barricadeWhiteMat = new THREE.MeshStandardMaterial({
      color: '#f8fafc',
      roughness: 0.5,
    });
    const barricadeRedMat = new THREE.MeshStandardMaterial({
      color: '#dc2626',
      roughness: 0.4,
    });
    const ironLegMat = new THREE.MeshStandardMaterial({
      color: '#0f172a',
      metalness: 0.85,
      roughness: 0.3,
    });

    const checkpostCoords: Array<[number, number, number]> = [
      [5.5, -145, 0.1],
      [-5.5, -145, -0.1],
      [6.5, 205, -0.15],
      [-6.5, 205, 0.15],
      [215, -65, Math.PI / 2],
    ];

    checkpostCoords.forEach(([bx, bz, brot]) => {
      const barricade = new THREE.Group();
      barricade.position.set(bx, 0, bz);
      barricade.rotation.y = brot;

      [-1.4, 1.4].forEach((lx) => {
        const leg = new THREE.Mesh(
          new THREE.CylinderGeometry(0.04, 0.04, 1.25, 8),
          ironLegMat
        );
        leg.position.set(lx, 0.6, 0);
        barricade.add(leg);

        const foot = new THREE.Mesh(
          new THREE.BoxGeometry(0.08, 0.04, 0.72),
          ironLegMat
        );
        foot.position.set(lx, 0.02, 0);
        barricade.add(foot);
      });

      [0.55, 0.95].forEach((plankY, pIdx) => {
        const plank = new THREE.Mesh(
          new THREE.BoxGeometry(3.1, 0.22, 0.06),
          pIdx === 0 ? barricadeRedMat : barricadeWhiteMat
        );
        plank.position.set(0, plankY, 0);
        barricade.add(plank);

        for (let c = -1.2; c <= 1.2; c += 0.5) {
          const chev = new THREE.Mesh(
            new THREE.BoxGeometry(0.2, 0.23, 0.07),
            pIdx === 0 ? barricadeWhiteMat : barricadeRedMat
          );
          chev.position.set(c, plankY, 0);
          barricade.add(chev);
        }
      });

      this.scene.add(barricade);
      this.buildingColliders.push({
        minX: bx - 1.6,
        maxX: bx + 1.6,
        minZ: bz - 0.5,
        maxZ: bz + 0.5,
      });
    });
  }

  private createDroopingCable(
    p1: THREE.Vector3,
    p2: THREE.Vector3,
    mat: THREE.Material,
    droopAmount = 0.8
  ) {
    const mid = p1.clone().add(p2).multiplyScalar(0.5);
    mid.y -= droopAmount;

    const curve = new THREE.QuadraticBezierCurve3(p1, mid, p2);
    const points = curve.getPoints(12);
    const geo = new THREE.BufferGeometry().setFromPoints(points);
    const line = new THREE.Line(geo, mat);
    this.scene.add(line);
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
  }

  private buildMotijheelShaplaMonument() {
    // 1. 3D Motijheel Shapla Chattar (শাপলা চত্বর — Water Lily Monument)
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

    for (let z = -290; z <= 140; z += 45) {
      if (Math.abs(z) < 18 || Math.abs(z + 175) < 18) continue;
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
      new THREE.BoxGeometry(5.2, 1.2, 450),
      concreteMat
    );
    girder.position.set(-10.5, 12.6, -75);
    girder.castShadow = true;
    this.scene.add(girder);

    // Farmgate Elevated Metro Station Canopy (ফার্মগেট মেট্রো স্টেশন) right near spawn
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
    stationCanopy.position.set(-10.5, 15.2, -32);
    this.scene.add(stationCanopy);

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
      } else if (poi.type === 'fuchka_stall') {
        const stall = createStreetStallMesh('fuchka_stall');
        stall.position.set(poi.x - 2.5, 0, poi.z + 1.8);
        this.scene.add(stall);
      }
    });
  }

  private buildCityDistrictBuildings() {
    const brickBump = loadRealTexture('/textures/brick_bump.jpg', 2, 3, false);

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
      // Farmgate & Karwan Bazar Commercial Blocks
      { x: 34, z: 32, w: 18, d: 18, h: 24, style: 'commercial', color: '#cbd5e1', signIndex: 0 },
      { x: -38, z: 34, w: 20, d: 16, h: 20, style: 'commercial', color: '#fde68a', signIndex: 1 },
      { x: -38, z: -32, w: 18, d: 18, h: 22, style: 'residential', color: '#e2e8f0', signIndex: 2 },
      { x: 42, z: -36, w: 22, d: 18, h: 30, style: 'modern_glass', color: '#0ea5e9', signIndex: 3 },
      { x: 85, z: 35, w: 20, d: 20, h: 26, style: 'commercial', color: '#cbd5e1', signIndex: 4 },
      { x: -85, z: -38, w: 22, d: 18, h: 21, style: 'residential', color: '#fed7aa', signIndex: 5 },

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
    ];

    buildingBlocks.forEach((b) => {
      const facadeTex = createBuildingFacadeTexture(b.style, b.color);
      const mat = new THREE.MeshStandardMaterial({
        map: facadeTex,
        bumpMap: b.style === 'old_dhaka' ? brickBump : null,
        bumpScale: 0.08,
        roughness: b.style === 'modern_glass' ? 0.2 : 0.65,
        metalness: b.style === 'modern_glass' ? 0.65 : 0.15,
      });

      const mesh = new THREE.Mesh(new THREE.BoxGeometry(b.w, b.h, b.d), mat);
      mesh.position.set(b.x, b.h / 2, b.z);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      this.scene.add(mesh);

      const tank = new THREE.Mesh(
        new THREE.CylinderGeometry(1.3, 1.3, 2.3, 12),
        new THREE.MeshStandardMaterial({
          color: b.x % 2 === 0 ? '#0284c7' : '#1e293b',
          roughness: 0.4,
        })
      );
      tank.position.set(b.x + b.w * 0.22, b.h + 1.15, b.z - b.d * 0.22);
      this.scene.add(tank);

      // Second rooftop Gazi water tank + parapet wall for authentic Dhaka skyline
      const tank2 = new THREE.Mesh(
        new THREE.CylinderGeometry(1.0, 1.0, 1.9, 12),
        new THREE.MeshStandardMaterial({ color: '#0369a1', roughness: 0.45 })
      );
      tank2.position.set(b.x - b.w * 0.22, b.h + 0.95, b.z + b.d * 0.18);
      this.scene.add(tank2);

      // Stacked Multi-Floor Bangla Commercial Signboards (Ground, 2nd & 3rd Floor)
      if (b.signIndex !== undefined) {
        const signW = Math.min(b.w * 0.86, 12.5);
        [0, 1, 2].forEach((tier) => {
          if (tier === 2 && b.h < 18) return;
          const signTex = createBanglaSignTexture((b.signIndex! + tier * 3) % 8);
          const signMat = new THREE.MeshBasicMaterial({ map: signTex });
          const signY = 4.0 + tier * 3.4;

          // Front-facing Bangla Signboard
          const frontSign = new THREE.Mesh(
            new THREE.BoxGeometry(signW, 2.2, 0.32),
            signMat
          );
          frontSign.position.set(b.x, signY, b.z + b.d / 2 + 0.22);
          this.scene.add(frontSign);

          // Back-facing Bangla Signboard
          const backSign = new THREE.Mesh(
            new THREE.BoxGeometry(signW, 2.2, 0.32),
            signMat
          );
          backSign.position.set(b.x, signY, b.z - b.d / 2 - 0.22);
          this.scene.add(backSign);

          // Street-facing Side Bangla Signboard
          const sideSign = new THREE.Mesh(
            new THREE.BoxGeometry(0.32, 2.2, Math.min(b.d * 0.82, 11.5)),
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

    // Authentic Dhaka Street Details: Black-and-White Striped Road Medians, Iron Divider Grilles,
    // Overhead Tangled Black Electric/Internet Cables with Pole Transformers, DMP Police Boxes & Biriyani Cauldrons
    this.buildAuthenticDhakaStreetInfrastructure();

    // Multi-layered Tropical Krishnachura & Banyan Trees
    const trunkMat = new THREE.MeshStandardMaterial({
      map: loadRealTexture('/textures/hardwood2_diffuse.jpg'),
      roughness: 0.85,
    });
    const greenLeafMat = new THREE.MeshStandardMaterial({
      color: '#15803d',
      roughness: 0.65,
    });
    const krishnachuraMat = new THREE.MeshStandardMaterial({
      color: '#ea580c',
      roughness: 0.6,
    });

    const treeSpots = [
      [-190, 10], [-190, 35], [-190, -15], [-152, 25], [-152, -10],
      [195, -25], [195, 15], [245, -25], [245, 15],
      [-15, -145], [15, -145], [-15, -205], [15, -205],
      [18, 22], [-22, 22], [22, -22],
    ];

    treeSpots.forEach(([tx, tz], idx) => {
      const tree = new THREE.Group();
      tree.position.set(tx, 0, tz);
      const trunk = new THREE.Mesh(
        new THREE.CylinderGeometry(0.28, 0.45, 3.8, 10),
        trunkMat
      );
      trunk.position.y = 1.9;
      tree.add(trunk);

      const leafMat = idx % 3 === 0 ? krishnachuraMat : greenLeafMat;
      [
        [0, 4.6, 0, 2.3],
        [-1.1, 4.1, 0.6, 1.6],
        [1.1, 4.2, -0.5, 1.65],
      ].forEach(([lx, ly, lz, rad]) => {
        const crown = new THREE.Mesh(
          new THREE.IcosahedronGeometry(rad, 2),
          leafMat
        );
        crown.position.set(lx, ly, lz);
        crown.castShadow = true;
        tree.add(crown);
      });
      this.scene.add(tree);
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

    // 1. Black-and-White Striped Dhaka Road Medians & Iron Anti-Jaywalking Grilles
    const medianSegmentsZ = [-250, -210, -135, -95, -55, 55, 95, 135, 225];
    medianSegmentsZ.forEach((mz) => {
      for (let i = 0; i < 6; i++) {
        const block = new THREE.Mesh(
          new THREE.BoxGeometry(0.95, 0.34, 4.2),
          i % 2 === 0 ? blackCurbMat : whiteCurbMat
        );
        block.position.set(0, 0.18, mz - 10 + i * 4.2);
        this.scene.add(block);
      }
      const railTop = new THREE.Mesh(
        new THREE.BoxGeometry(0.14, 0.92, 24.5),
        greenGrilleMat
      );
      railTop.position.set(0, 0.72, mz + 0.5);
      this.scene.add(railTop);
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

    poleCoords.forEach(([px, pz], idx) => {
      const pole = new THREE.Mesh(
        new THREE.CylinderGeometry(0.16, 0.22, 8.6, 8),
        poleMat
      );
      pole.position.set(px, 4.3, pz);
      pole.castShadow = true;
      this.scene.add(pole);

      const crossbar = new THREE.Mesh(
        new THREE.BoxGeometry(1.6, 0.12, 0.14),
        poleMat
      );
      crossbar.position.set(px, 7.8, pz);
      this.scene.add(crossbar);

      // Coiled black internet/dish cable loop hanging on the pole (ডিশের তারের কুণ্ডলী)
      const coil = new THREE.Mesh(
        new THREE.TorusGeometry(0.36, 0.055, 8, 16),
        new THREE.MeshStandardMaterial({ color: '#0f172a', roughness: 0.8 })
      );
      coil.position.set(px, 5.8, pz + 0.18);
      this.scene.add(coil);

      // Cylindrical Dhaka Electric Transformer on every 3rd pole
      if (idx % 3 === 0) {
        const transformer = new THREE.Mesh(
          new THREE.CylinderGeometry(0.42, 0.42, 1.15, 12),
          new THREE.MeshStandardMaterial({
            color: '#475569',
            metalness: 0.55,
            roughness: 0.4,
          })
        );
        transformer.position.set(px + (px > 0 ? 0.38 : -0.38), 6.5, pz);
        this.scene.add(transformer);
      }

      // Connect sagging catenary overhead black cables to the next pole in the same line
      const next = poleCoords[idx + 1];
      if (next && Math.abs(next[0] - px) < 1 && Math.abs(next[1] - pz) < 60) {
        [-0.55, -0.18, 0.18, 0.55].forEach((offsetX, wIdx) => {
          const pts: THREE.Vector3[] = [];
          const sag = 0.65 + (wIdx % 2) * 0.38;
          for (let s = 0; s <= 10; s++) {
            const t = s / 10;
            const wx = px + offsetX;
            const wz = pz + (next[1] - pz) * t;
            const wy = 7.75 - Math.sin(t * Math.PI) * sag - wIdx * 0.14;
            pts.push(new THREE.Vector3(wx, wy, wz));
          }
          const lineGeo = new THREE.BufferGeometry().setFromPoints(pts);
          const wire = new THREE.Line(lineGeo, wireMat);
          this.scene.add(wire);
        });
      }
    });

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
      { type: 'cng', x: 5, z: 10, rot: -Math.PI / 2, isTraffic: false, color: '#15803d' },
      { type: 'cng', x: -7, z: 6, rot: 0, isTraffic: false, color: '#15803d' },
      { type: 'rickshaw', x: 12, z: 4, rot: Math.PI, isTraffic: false, color: '#ec4899' },
      { type: 'motorcycle', x: -12, z: -6, rot: Math.PI / 2, isTraffic: false, color: '#e11d48' },
      { type: 'car', x: 14, z: -10, rot: -Math.PI / 2, isTraffic: false, color: '#f8fafc' },
      { type: 'bus', x: -5, z: 32, rot: Math.PI, isTraffic: false, color: '#0f766e' },

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
    window.addEventListener('wheel', this.onWheel, { passive: true });

    const dom = this.renderer.domElement;
    dom.addEventListener('contextmenu', (e) => e.preventDefault());
    dom.addEventListener('mousedown', this.onMouseDown);
    window.addEventListener('mousemove', this.onMouseMove);
    window.addEventListener('mouseup', this.onMouseUp);
  }

  public dispose() {
    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
    }
    window.removeEventListener('resize', this.onResize);
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    window.removeEventListener('wheel', this.onWheel);
    window.removeEventListener('mousemove', this.onMouseMove);
    window.removeEventListener('mouseup', this.onMouseUp);
    this.renderer.dispose();
  }

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

    if (e.button === 0) {
      this.isPointerDragging = true;
      this.lastPointerX = e.clientX;
      this.lastPointerY = e.clientY;
      this.pointerDownStartX = e.clientX;
      this.pointerDownStartY = e.clientY;
    } else if (e.button === 2) {
      if (!this.activeVehicleId) {
        this.isAimingDownSights = true;
      }
    }
  };

  private onMouseMove = (e: MouseEvent) => {
    if (!this.isPointerDragging) return;
    const dx = e.clientX - this.lastPointerX;
    const dy = e.clientY - this.lastPointerY;
    this.lastPointerX = e.clientX;
    this.lastPointerY = e.clientY;

    this.cameraYaw -= dx * 0.0065;
    this.cameraPitch = Math.max(
      0.12,
      Math.min(1.15, this.cameraPitch + dy * 0.005)
    );
  };

  private onMouseUp = (e: MouseEvent) => {
    if (e.button === 2) {
      this.isAimingDownSights = false;
      return;
    }

    this.isPointerDragging = false;
    const store = useGameStore.getState();
    if (store.gamePhase !== 'playing') return;

    const dragDist = Math.hypot(
      e.clientX - this.pointerDownStartX,
      e.clientY - this.pointerDownStartY
    );
    if (dragDist < 6 && !this.activeVehicleId) {
      this.performAttackOrFire();
    }
  };

  private onWheel = (e: WheelEvent) => {
    const store = useGameStore.getState();
    if (store.gamePhase !== 'playing') return;
    if (this.activeVehicleId) return;
    store.cycleWeapon(e.deltaY > 0 ? 1 : -1);
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

    if (code === 'KeyM') {
      if (store.gamePhase === 'playing') {
        store.setGamePhase('paused', 'map');
      } else if (store.gamePhase === 'paused') {
        store.setGamePhase('playing');
      }
      return;
    }

    if (store.gamePhase !== 'playing') return;

    dhakaAudio.init();

    // 1-0 Hotkey Weapon Selector (1-9, and 0 for 10th weapon)
    if (code.startsWith('Digit')) {
      const digitVal = parseInt(code.replace('Digit', ''), 10);
      const idx = digitVal === 0 ? 9 : digitVal - 1;
      const unlocked = store.tools.filter((t) => t.unlocked);
      if (idx >= 0 && idx < unlocked.length) {
        store.equipTool(unlocked[idx].id);
      }
      return;
    }

    if (code === 'KeyQ') {
      if (!this.activeVehicleId) store.cycleWeapon(-1);
      return;
    }

    if (code === 'KeyX') {
      if (!this.activeVehicleId) store.cycleWeapon(1);
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
        }
      } else {
        dhakaAudio.playHorn('bell');
      }
    }

    if (code === 'KeyC' && !this.activeVehicleId) {
      this.isCrouching = !this.isCrouching;
    }

    if (code === 'KeyZ' && !this.activeVehicleId) {
      this.isAimingDownSights = !this.isAimingDownSights;
    }

    if (code === 'KeyV') {
      store.cycleCameraMode();
    }

    if ((code === 'KeyJ' || code === 'KeyK') && !this.activeVehicleId) {
      this.performAttackOrFire();
    }

    if (code === 'Space' && !this.activeVehicleId && this.isGrounded) {
      if (this.isAimingDownSights) {
        // Tactical combat dive & roll when aiming down sights
        this.playerVelY = 3.8;
        const rollDirX = -Math.sin(this.playerRotation) * 7.2;
        const rollDirZ = -Math.cos(this.playerRotation) * 7.2;
        this.playerPos.x = clampWorldCoord(this.playerPos.x + rollDirX * 0.18);
        this.playerPos.z = clampWorldCoord(this.playerPos.z + rollDirZ * 0.18);
        this.spawnImpactSparks(
          new THREE.Vector3(this.playerPos.x, 0.1, this.playerPos.z),
          '#94a3b8',
          6
        );
      } else {
        this.playerVelY = 7.8;
      }
      this.isGrounded = false;
      this.isCrouching = false;
      dhakaAudio.playSfx('jump');
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
        store.reloadActiveWeapon();
      }
    }
  };

  private onKeyUp = (e: KeyboardEvent) => {
    this.keys.delete(e.code);
  };

  public triggerTouchAction(
    action: 'interact' | 'horn' | 'attack' | 'jump' | 'camera' | 'aim'
  ) {
    dhakaAudio.init();
    if (action === 'interact') {
      const store = useGameStore.getState();
      if (store.nearbyPrompt?.type === 'npc') {
        this.handleTalkToNPC();
      } else if (store.nearbyPrompt?.type === 'poi') {
        this.executePOIInteraction(store.nearbyPrompt.id);
      } else {
        this.handlePrimaryInteraction(true);
      }
    }
    if (action === 'horn') {
      const veh = this.vehicles.find((v) => v.id === this.activeVehicleId);
      dhakaAudio.playHorn(veh ? VEHICLE_STATS[veh.type].hornType : 'bell');
    }
    if (action === 'attack') this.performAttackOrFire();
    if (action === 'aim' && !this.activeVehicleId) {
      this.isAimingDownSights = !this.isAimingDownSights;
    }
    if (action === 'jump' && !this.activeVehicleId && this.isGrounded) {
      this.playerVelY = 7.8;
      this.isGrounded = false;
      dhakaAudio.playSfx('jump');
    }
    if (action === 'camera') {
      useGameStore.getState().cycleCameraMode();
    }
  }

  public performAttackOrFire() {
    if (this.activeVehicleId) return;
    const store = useGameStore.getState();
    const tool =
      store.tools.find((t) => t.id === store.equippedToolId) || store.tools[0];

    if (tool.isGun) {
      const res = store.fireActiveWeapon();
      if (!res.canFire) return;

      this.attackAnimTimer = 0.28;
      dhakaAudio.playSfx(tool.sound as any);

      // Camera recoil kickback
      this.cameraPitch = Math.min(
        1.15,
        this.cameraPitch + tool.recoilStrength * 0.035
      );
      this.cameraYaw += (Math.random() - 0.5) * tool.recoilStrength * 0.015;

      // Find muzzle world position
      const muzzleObj = this.playerLimbs.weaponMesh.getObjectByName('muzzle');
      const muzzlePos = new THREE.Vector3();
      if (muzzleObj) {
        muzzleObj.getWorldPosition(muzzlePos);
      } else {
        muzzlePos.set(
          this.playerPos.x + Math.sin(this.playerRotation) * 0.65,
          this.playerPos.y + 1.25,
          this.playerPos.z + Math.cos(this.playerRotation) * 0.65
        );
      }

      // 3D Muzzle Flash Point Light
      this.muzzleFlashLight.position.copy(muzzlePos);
      this.muzzleFlashLight.intensity = 6.2;
      this.muzzleFlashTimer = 0.07;

      // Spawn Brass Shell Casing Ejection
      const shellGeo = new THREE.CylinderGeometry(0.012, 0.012, 0.045, 8);
      shellGeo.rotateZ(Math.PI / 2);
      const shellMat = new THREE.MeshStandardMaterial({
        color: '#facc15',
        metalness: 0.9,
        roughness: 0.2,
      });
      const shellMesh = new THREE.Mesh(shellGeo, shellMat);
      shellMesh.position.copy(muzzlePos);
      this.scene.add(shellMesh);
      const rightDir = new THREE.Vector3(
        Math.cos(this.playerRotation) * (2.2 + Math.random() * 0.8),
        1.8 + Math.random() * 1.2,
        -Math.sin(this.playerRotation) * (2.2 + Math.random() * 0.8)
      );
      this.shellCasings.push({ mesh: shellMesh, vel: rightDir, life: 1.2 });

      // Pellets / Shotgun Spread (Tightened under Precision ADS)
      const adsSpreadMult = this.isAimingDownSights ? 0.35 : 1.0;
      const pellets = tool.pelletsPerShot || 1;
      for (let p = 0; p < pellets; p++) {
        const spreadX =
          (Math.random() - 0.5) * (tool.category === 'shotgun' ? 0.16 : 0.02) * adsSpreadMult;
        const spreadY =
          (Math.random() - 0.5) * (tool.category === 'shotgun' ? 0.12 : 0.02) * adsSpreadMult;

        const dirX = Math.sin(this.playerRotation) + spreadX;
        const dirY = Math.tan(this.cameraPitch - 0.32) + spreadY;
        const dirZ = Math.cos(this.playerRotation);
        const rayDir = new THREE.Vector3(dirX, dirY, dirZ).normalize();

        this.processBulletHit(
          muzzlePos,
          rayDir,
          tool.range,
          tool.damage / pellets,
          tool.nameEn,
          tool.nameBn
        );
      }
    } else {
      // Melee attack (Ramda, Chapati, Cricket Bat, Bamboo Lathi, Fists)
      this.attackAnimTimer = 0.35;
      dhakaAudio.playSfx(tool.sound as any);

      for (const npc of this.npcs) {
        const dist = Math.hypot(
          npc.x - this.playerPos.x,
          npc.z - this.playerPos.z
        );
        if (dist <= tool.range) {
          dhakaAudio.playSfx('hit');
          npc.health -= tool.damage;
          this.spawnImpactSparks(
            new THREE.Vector3(npc.x, 1.2, npc.z),
            '#ef4444',
            6
          );

          if (!npc.isStoryNPC) {
            npc.aiState = 'flee';
            store.setWantedLevel(Math.min(5, store.wantedLevel + 1));
            store.showBanner({
              titleEn: `STREET CLASH: ${tool.nameEn.toUpperCase()}`,
              titleBn: `${tool.nameBn} দিয়ে আক্রমণ!`,
              subtitleEn: 'Witnesses alerted Karwan Bazar DMP Patrol!',
              subtitleBn: 'প্রত্যক্ষদর্শীরা টহল পুলিশকে খবর দিয়েছে!',
              tone: 'red',
            });
          }
          break;
        }
      }
    }
  }

  private processBulletHit(
    start: THREE.Vector3,
    dir: THREE.Vector3,
    maxRange: number,
    damage: number,
    weaponNameEn: string,
    weaponNameBn: string
  ) {
    const store = useGameStore.getState();
    let closestDist = maxRange;
    let hitType: 'npc' | 'vehicle' | 'building' | 'none' = 'none';
    let hitNPC: NPCEntity | null = null;
    let hitVehicle: VehicleEntity | null = null;

    // Check NPCs
    for (const npc of this.npcs) {
      const toNpc = new THREE.Vector3(
        npc.x - start.x,
        1.1 - start.y,
        npc.z - start.z
      );
      const proj = toNpc.dot(dir);
      if (proj > 0.5 && proj < closestDist) {
        const perpDist = toNpc.clone().sub(dir.clone().multiplyScalar(proj)).length();
        if (perpDist < 0.7) {
          closestDist = proj;
          hitType = 'npc';
          hitNPC = npc;
        }
      }
    }

    // Check Vehicles
    for (const veh of this.vehicles) {
      if (veh.id === this.activeVehicleId) continue;
      const toVeh = new THREE.Vector3(
        veh.x - start.x,
        0.8 - start.y,
        veh.z - start.z
      );
      const proj = toVeh.dot(dir);
      if (proj > 0.5 && proj < closestDist) {
        const perpDist = toVeh.clone().sub(dir.clone().multiplyScalar(proj)).length();
        if (perpDist < 1.4) {
          closestDist = proj;
          hitType = 'vehicle';
          hitVehicle = veh;
          hitNPC = null;
        }
      }
    }

    // Check Buildings
    for (const b of this.buildingColliders) {
      for (let s = 1; s * 1.5 < closestDist; s++) {
        const testX = start.x + dir.x * (s * 1.5);
        const testZ = start.z + dir.z * (s * 1.5);
        if (
          testX >= b.minX &&
          testX <= b.maxX &&
          testZ >= b.minZ &&
          testZ <= b.maxZ
        ) {
          closestDist = s * 1.5;
          hitType = 'building';
          hitNPC = null;
          hitVehicle = null;
          break;
        }
      }
    }

    const hitPoint = start.clone().add(dir.clone().multiplyScalar(closestDist));

    // Spawn Bullet Tracer Line
    const tracerGeo = new THREE.BufferGeometry().setFromPoints([
      start,
      hitPoint,
    ]);
    const tracerMat = new THREE.LineBasicMaterial({
      color: '#fef08a',
      transparent: true,
      opacity: 0.9,
    });
    const tracerLine = new THREE.Line(tracerGeo, tracerMat);
    this.scene.add(tracerLine);
    this.bulletTracers.push({
      line: tracerLine,
      life: 0.08,
      maxLife: 0.08,
    });

    if (hitType === 'npc' && hitNPC) {
      hitNPC.health -= damage;
      this.spawnImpactSparks(hitPoint, '#ef4444', 8);
      dhakaAudio.playSfx('hit');

      if (!hitNPC.isStoryNPC) {
        hitNPC.aiState = 'flee';
        store.setWantedLevel(Math.min(5, store.wantedLevel + 2));
        store.showBanner({
          titleEn: `GUNFIRE REPORTED: ${weaponNameEn.toUpperCase()}`,
          titleBn: `${weaponNameBn} থেকে গুলি চালানো হয়েছে!`,
          subtitleEn: 'DMP Riot Interceptors mobilized in this district!',
          subtitleBn: 'ডিএমপি রায়ট পেট্রোল টিম তল্লাশি শুরু করেছে!',
          tone: 'red',
        });
      }
      if (hitNPC.health <= 0) {
        this.spawnCashDrop(hitNPC.x, hitNPC.z, 500 + Math.floor(Math.random() * 800));
      }
    } else if (hitType === 'vehicle' && hitVehicle) {
      hitVehicle.health = Math.max(0, hitVehicle.health - damage * 0.85);
      this.spawnImpactSparks(hitPoint, '#facc15', 10);
      dhakaAudio.playSfx('hit');

      if (hitVehicle.isPolice) {
        store.setWantedLevel(Math.min(5, store.wantedLevel + 2));
        dhakaAudio.playHorn('siren');
      }
    } else if (hitType === 'building') {
      this.spawnImpactSparks(hitPoint, '#94a3b8', 6);
      if (Math.random() > 0.4) {
        dhakaAudio.playSfx('ricochet');
      }
    }
  }

  public spawnImpactSparks(pos: THREE.Vector3, color = '#facc15', count = 6) {
    const sparkGeo = new THREE.BoxGeometry(0.045, 0.045, 0.045);
    const sparkMat = new THREE.MeshBasicMaterial({ color });
    for (let i = 0; i < count; i++) {
      const mesh = new THREE.Mesh(sparkGeo, sparkMat);
      mesh.position.copy(pos);
      this.scene.add(mesh);
      const vel = new THREE.Vector3(
        (Math.random() - 0.5) * 6,
        Math.random() * 5 + 1.2,
        (Math.random() - 0.5) * 6
      );
      this.impactSparks.push({ mesh, vel, life: 0.22, maxLife: 0.22 });
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
      const textEn = closest.dialogueEn[idx];
      const textBn = closest.dialogueBn[idx] || textEn;
      store.setDialogue({
        speakerEn: closest.nameEn,
        speakerBn: closest.nameBn,
        textEn,
        textBn,
      });

      // Browser Web Speech Synthesis for NPC Bengali & English dialogue
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        try {
          window.speechSynthesis.cancel();
          const spokenText = store.language === 'bn' ? textBn : textEn;
          const utt = new SpeechSynthesisUtterance(spokenText);
          utt.lang = store.language === 'bn' ? 'bn-BD' : 'en-US';
          utt.rate = 1.05;
          utt.pitch = 1.0;
          utt.volume = Math.max(0.2, store.sfxVolume ?? 0.8);
          window.speechSynthesis.speak(utt);
        } catch {}
      }
    }
  }

  private handlePrimaryInteraction(preferVehicle: boolean) {
    const store = useGameStore.getState();

    // 1. Safe Vehicle Exit (Bug Fix: test 4 exit offsets so player never clips into walls!)
    if (this.activeVehicleId) {
      const veh = this.vehicles.find((v) => v.id === this.activeVehicleId);
      if (veh) {
        // Check if stopped near Dholaikhal Garage for Pay-n-Spray service
        for (const poi of POINTS_OF_INTEREST) {
          if (poi.type === 'garage') {
            const d = Math.hypot(poi.x - veh.x, poi.z - veh.z);
            if (d < 7.5 && !preferVehicle) {
              this.executePOIInteraction(poi.id);
              return;
            }
          }
        }

        veh.speed = 0;
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
          if (!this.checkWorldObstacle(tx, tz, 0.6)) {
            safeX = tx;
            safeZ = tz;
            break;
          }
        }
        this.playerPos.set(safeX, 0, safeZ);
        this.playerLimbs.group.scale.y = 1.0;
        this.playerLimbs.group.rotation.set(0, this.playerRotation, 0);
        this.playerLimbs.group.visible = true;
        this.playerLimbs.group.position.copy(this.playerPos);
      }
      this.activeVehicleId = null;
      this.headlightSpot.intensity = 0;
      dhakaAudio.updateEngine(false, null, 0);
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
      this.activeVehicleId = closestVeh.id;
      closestVeh.isTraffic = false;
      this.playerLimbs.group.visible = false;
      this.cameraYaw = closestVeh.rotation + Math.PI;
      dhakaAudio.playSfx('pickup');

      if (closestVeh.isPolice && store.wantedLevel === 0) {
        store.setWantedLevel(2);
        store.showBanner({
          titleEn: 'COMMANDEERED DMP PATROL VEHICLE!',
          titleBn: 'ডিএমপি পুলিশের গাড়ি দখল করেছেন!',
          subtitleEn: 'Police dispatch alerted — Wanted Level 2!',
          subtitleBn: 'পুলিশ কন্ট্রোল রুম সতর্ক হয়েছে — ওয়ান্টেড লেভেল ২!',
          tone: 'red',
        });
      }
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
        store.showBanner({
          titleEn: 'FRESH MALAI CHA ENJOYED (+35 HP)',
          titleBn: 'গরম মালাই চা পান করেছেন (+৩৫ হেলথ)',
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
      if (this.activeVehicleId) {
        const veh = this.vehicles.find((v) => v.id === this.activeVehicleId);
        if (veh) {
          if (
            store.spendTaka(
              350,
              'Dholaikhal Pay-n-Spray Workshop',
              'ধোলাইখাল পেই-অ্যান্ড-স্প্রে গ্যারেজ'
            )
          ) {
            veh.health = veh.maxHealth;
            // Pick a new vibrant Dhaka custom paint livery
            const colors = [
              '#16a34a',
              '#dc2626',
              '#2563eb',
              '#d97706',
              '#7c3aed',
              '#0d9488',
              '#e11d48',
              '#334155',
              '#f8fafc',
            ];
            veh.color = colors[Math.floor(Math.random() * colors.length)];

            // Update mesh materials
            const meshGroup = this.vehicleMeshes.get(veh.id);
            if (meshGroup) {
              meshGroup.traverse((child) => {
                if (child instanceof THREE.Mesh && child.material) {
                  const mats = Array.isArray(child.material)
                    ? child.material
                    : [child.material];
                  for (const m of mats) {
                    if (
                      m instanceof THREE.MeshStandardMaterial &&
                      m.color.getHex() !== 0x111827 &&
                      m.color.getHex() !== 0xffffff
                    ) {
                      m.color.set(veh.color);
                    }
                  }
                }
              });
            }

            store.setWantedLevel(0);
            dhakaAudio.playSfx('ui');
            store.showBanner({
              titleEn: 'PAY-N-SPRAY: VEHICLE REPAIRED & RESPRAYED!',
              titleBn: 'ধোলাইখাল গ্যারেজ: গাড়ি মেরামত ও রঙ করা হয়েছে!',
              subtitleEn: 'Vehicle restored to 100% and Police heat cleared!',
              subtitleBn:
                'গাড়ি সম্পূর্ণ মেরামত হয়েছে এবং পুলিশ কেস প্রত্যাহার করা হয়েছে!',
              tone: 'gold',
            });
          }
          return;
        }
      }

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
    const spawnX = this.playerPos.x + 3.8;
    const spawnZ = this.playerPos.z + 2.5;

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
        isHigh ? Math.min(window.devicePixelRatio, 2) : 1
      );
      this.renderer.shadowMap.enabled = isHigh;
      this.camera.far = isHigh ? 620 : 340;
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
      if (this.activeVehicleId) {
        const v = this.vehicles.find((veh) => veh.id === this.activeVehicleId);
        if (v) {
          v.x = x;
          v.z = z;
          v.speed = 0;
          const mesh = this.vehicleMeshes.get(v.id);
          if (mesh) {
            mesh.position.set(x, 0, z);
          }
        }
      }
      store.clearEngineRequests();
    }

    // Update Player Outfit & Weapon Visuals
    if (
      store.equippedOutfitId !== this.lastEquippedOutfit ||
      store.equippedToolId !== this.lastEquippedTool
    ) {
      this.lastEquippedOutfit = store.equippedOutfitId;
      this.lastEquippedTool = store.equippedToolId;
      const outfit =
        store.outfits.find((o) => o.id === store.equippedOutfitId) ||
        store.outfits[0];
      tintCharacterOutfit(
        this.playerLimbs,
        outfit.shirtColor,
        outfit.pantsColor,
        outfit.id === 'puran_dhaka_lungi'
      );
      updateWeaponAttachment(this.playerLimbs.weaponMesh, store.equippedToolId);

      // Adjust weapon mounting position for realistic grip
      if (store.equippedToolId === 'type56_ak' || store.equippedToolId === 'katta') {
        this.playerLimbs.weaponMesh.position.set(0.18, 0.95, 0.38);
        this.playerLimbs.weaponMesh.rotation.set(-0.25, 0.15, 0);
      } else if (
        store.equippedToolId === 'shutter_pistol' ||
        store.equippedToolId === 'pipe_gun' ||
        store.equippedToolId === 'tt_pistol'
      ) {
        this.playerLimbs.weaponMesh.position.set(0.24, 0.98, 0.35);
        this.playerLimbs.weaponMesh.rotation.set(0, 0, 0);
      } else {
        this.playerLimbs.weaponMesh.position.set(0.28, 0.92, 0.22);
        this.playerLimbs.weaponMesh.rotation.set(0, 0, 0);
      }
    }

    // Update Gunfire Muzzle Flash & Particle Systems
    if (this.muzzleFlashTimer > 0) {
      this.muzzleFlashTimer -= dt;
      if (this.muzzleFlashTimer <= 0) {
        this.muzzleFlashLight.intensity = 0;
      }
    }

    // Bullet Tracers
    for (let i = this.bulletTracers.length - 1; i >= 0; i--) {
      const t = this.bulletTracers[i];
      t.life -= dt;
      (t.line.material as THREE.LineBasicMaterial).opacity = t.life / t.maxLife;
      if (t.life <= 0) {
        this.scene.remove(t.line);
        t.line.geometry.dispose();
        this.bulletTracers.splice(i, 1);
      }
    }

    // Impact Sparks
    for (let i = this.impactSparks.length - 1; i >= 0; i--) {
      const s = this.impactSparks[i];
      s.life -= dt;
      s.mesh.position.addScaledVector(s.vel, dt);
      s.vel.y -= 19 * dt;
      s.mesh.scale.setScalar(Math.max(0.01, s.life / s.maxLife));
      if (s.life <= 0 || s.mesh.position.y <= 0) {
        this.scene.remove(s.mesh);
        s.mesh.geometry.dispose();
        this.impactSparks.splice(i, 1);
      }
    }

    // Brass Shell Casings Physics
    for (let i = this.shellCasings.length - 1; i >= 0; i--) {
      const c = this.shellCasings[i];
      c.life -= dt;
      c.mesh.position.addScaledVector(c.vel, dt);
      c.vel.y -= 16 * dt;
      c.mesh.rotation.x += dt * 14;
      c.mesh.rotation.y += dt * 12;
      if (c.mesh.position.y <= 0.02) {
        c.mesh.position.y = 0.02;
        c.vel.set(0, 0, 0);
      }
      if (c.life <= 0) {
        this.scene.remove(c.mesh);
        c.mesh.geometry.dispose();
        this.shellCasings.splice(i, 1);
      }
    }

    // Road Skid Marks Decay
    for (let i = this.skidMarks.length - 1; i >= 0; i--) {
      const sm = this.skidMarks[i];
      sm.life -= dt;
      (sm.mesh.material as THREE.MeshBasicMaterial).opacity = Math.min(
        0.55,
        sm.life / 6
      );
      if (sm.life <= 0) {
        this.scene.remove(sm.mesh);
        sm.mesh.geometry.dispose();
        this.skidMarks.splice(i, 1);
      }
    }

    if (store.gamePhase === 'playing') {
      store.tickWorldClock(dt);
      this.updateEnvironmentLighting(store.timeOfDay, store.weather, dt);

      if (this.activeVehicleId) {
        this.updateDrivenVehicle(dt);
      } else {
        this.updateOnFootPlayer(dt);
      }

      this.updateTrafficAndPoliceAI(dt, store.wantedLevel);
      this.updateNPCAI(dt);
      this.updateCashPickups(dt);
      this.updateMissionAndInteractionChecks(dt);

      this.ambientSoundTimer += dt;
      if (this.ambientSoundTimer > 15) {
        this.ambientSoundTimer = 0;
        const isNearRiver = this.playerPos.z > 210;
        dhakaAudio.playDistantAmbientSound(
          isNearRiver ? 'boat_horn' : 'rickshaw_bell'
        );
      }
    }

    this.updateCamera(dt, store.cameraMode);
    this.renderer.render(this.scene, this.camera);
  };

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
        store.showBanner({
          titleEn: `COLLECTED CASH STACK (+৳${drop.amount.toLocaleString()})`,
          titleBn: `টাকার বান্ডিল সংগ্রহ করেছেন (+৳${drop.amount.toLocaleString()})`,
          subtitleEn: 'Added to Arif’s Dhaka Wallet.',
          subtitleBn: 'আপনার মানিব্যাগে যোগ হয়েছে।',
          rewardTaka: drop.amount,
          tone: 'gold',
        });
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

    let targetSky = new THREE.Color('#38bdf8');
    let sunIntensity = 1.55;
    let ambIntensity = 0.72;

    if (isNight) {
      targetSky = new THREE.Color('#090d16');
      sunIntensity = 0.25;
      ambIntensity = 0.38;
    } else if (isRain) {
      targetSky = new THREE.Color('#334155');
      sunIntensity = 0.6;
      ambIntensity = 0.52;
    } else if (isGolden) {
      targetSky = new THREE.Color('#ea580c');
      sunIntensity = 1.35;
      ambIntensity = 0.68;
    }

    (this.scene.background as THREE.Color).lerp(targetSky, dt * 2.5);
    if (this.scene.fog instanceof THREE.FogExp2) {
      this.scene.fog.color.lerp(targetSky, dt * 2.5);
      this.scene.fog.density = isRain ? 0.0046 : 0.0019;
    }

    // Center Sky Dome on player and modulate brightness
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

    if (this.horizonMesh) {
      this.horizonMesh.position.set(this.playerPos.x, 55, this.playerPos.z);
      (this.horizonMesh.material as THREE.MeshBasicMaterial).color.lerp(
        isNight
          ? new THREE.Color('#334155')
          : isGolden
          ? new THREE.Color('#ffffff')
          : new THREE.Color('#cbd5e1'),
        dt * 2
      );
    }

    // Animate water normal ripples
    if (this.waterNormalTex) {
      this.waterNormalTex.offset.x += dt * 0.04;
      this.waterNormalTex.offset.y += dt * 0.025;
    }

    this.sunLight.intensity = THREE.MathUtils.lerp(
      this.sunLight.intensity,
      sunIntensity,
      dt * 3
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
        for (let i = 0; i < posAttr.count; i++) {
          let y = posAttr.getY(i) - 42 * dt;
          if (y < 0) y = 52;
          posAttr.setY(i, y);
        }
        posAttr.needsUpdate = true;
      }
    }

    const t = performance.now() * 0.0015;
    this.launchBoats.forEach((b, idx) => {
      b.position.y = 0.2 + Math.sin(t + idx) * 0.14;
      b.rotation.z = Math.sin(t * 0.8 + idx) * 0.018;
    });

    // Dynamic Monsoon Wet Asphalt Gloss & Specular Reflections
    if (this.groundMat) {
      const targetRoughness = isRain ? 0.22 : 0.88;
      const targetMetalness = isRain ? 0.58 : 0.08;
      const targetColor = isRain
        ? new THREE.Color('#1e293b')
        : new THREE.Color('#475569');
      this.groundMat.roughness = THREE.MathUtils.lerp(
        this.groundMat.roughness,
        targetRoughness,
        dt * 2
      );
      this.groundMat.metalness = THREE.MathUtils.lerp(
        this.groundMat.metalness,
        targetMetalness,
        dt * 2
      );
      this.groundMat.color.lerp(targetColor, dt * 2);
    }

    // Streetlamp Illumination at Evening & Night
    const streetlampTarget = isNight || isGolden ? 1.0 : 0.0;
    this.streetlampLights.forEach((light) => {
      light.intensity = THREE.MathUtils.lerp(
        light.intensity,
        streetlampTarget,
        dt * 3
      );
    });

    // Animate MRT Line-6 Dhaka Metro Rail gliding overhead between Uttara, Farmgate & Motijheel
    if (this.metroTrainGroup) {
      this.metroTrainGroup.position.z = -75 + Math.sin(t * 0.32) * 165;
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
      const targetYaw = this.cameraYaw + Math.PI + inputAngle;

      const diff = normalizeAngle(targetYaw - this.playerRotation);
      this.playerRotation += diff * Math.min(1, dt * 14);

      const vx = Math.sin(this.playerRotation) * baseSpeed * dt;
      const vz = Math.cos(this.playerRotation) * baseSpeed * dt;

      const nextX = this.playerPos.x + vx;
      const nextZ = this.playerPos.z + vz;

      if (!this.checkWorldObstacle(nextX, this.playerPos.z, 0.55)) {
        this.playerPos.x = clampWorldCoord(nextX);
      }
      if (!this.checkWorldObstacle(this.playerPos.x, nextZ, 0.55)) {
        this.playerPos.z = clampWorldCoord(nextZ);
      }

      this.walkAnimPhase += dt * (isSprinting ? 15 : 10);
      if (Date.now() - this.lastStepTime > (isSprinting ? 270 : 410)) {
        this.lastStepTime = Date.now();
        dhakaAudio.playFootstep();
        if (isSprinting) {
          this.spawnImpactSparks(
            new THREE.Vector3(this.playerPos.x, 0.05, this.playerPos.z),
            '#e2e8f0',
            2
          );
        }
      }
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
        dhakaAudio.playFootstep();
        this.spawnImpactSparks(
          new THREE.Vector3(this.playerPos.x, 0.05, this.playerPos.z),
          '#94a3b8',
          4
        );
      }
    }

    // Update Real Skeletal GLTF AnimationMixer with firearm aiming and weapon stance
    const store = useGameStore.getState();
    setCharacterAnimationState(
      this.playerLimbs,
      targetAnimState,
      dt,
      store.equippedToolId,
      this.attackAnimTimer > 0 || this.isAimingDownSights
    );

    // Also update fallback capsule limbs if visible
    const swing = Math.sin(this.walkAnimPhase) * 0.65;
    this.playerLimbs.leftLeg.rotation.x = swing;
    this.playerLimbs.rightLeg.rotation.x = -swing;
    if (this.isAimingDownSights) {
      this.playerLimbs.rightArm.rotation.x = -1.6;
      this.playerLimbs.leftArm.rotation.x = -1.35;
    } else {
      this.playerLimbs.leftArm.rotation.x = -swing * 0.8;
    }

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
      if (veh.speed > 1) {
        veh.speed = Math.max(0, veh.speed - stats.braking * dt);
      } else {
        veh.speed = Math.max(
          -stats.maxSpeed * 0.42,
          veh.speed - stats.acceleration * 0.7 * dt
        );
      }
    } else {
      veh.speed *= Math.pow(0.25, dt);
      if (Math.abs(veh.speed) < 0.15) veh.speed = 0;
    }

    if (isDrifting && Math.abs(veh.speed) > 4) {
      veh.speed *= Math.pow(0.45, dt);
    }

    if (Math.abs(veh.speed) > 0.3) {
      const dir = veh.speed >= 0 ? 1 : -1;
      const turnMult = isDrifting ? 1.45 : 1.0;
      const speedFactor = Math.min(1, Math.abs(veh.speed) / 8);
      veh.rotation +=
        steer * stats.turnSpeed * turnMult * speedFactor * dir * dt;
    }

    const vx = Math.sin(veh.rotation) * veh.speed * dt;
    const vz = Math.cos(veh.rotation) * veh.speed * dt;

    const nextX = veh.x + vx;
    const nextZ = veh.z + vz;

    const radius = Math.max(stats.width, stats.length) * 0.45;
    if (!this.checkWorldObstacle(nextX, nextZ, radius)) {
      veh.x = clampWorldCoord(nextX);
      veh.z = clampWorldCoord(nextZ);
    } else {
      if (Math.abs(veh.speed) > 12) {
        dhakaAudio.playSfx('hit');
        veh.health = Math.max(15, veh.health - Math.abs(veh.speed) * 0.45);
      }
      veh.speed = -veh.speed * 0.35;

      // Obstacle Unstuck Repulsion Push (Bug Fix)
      for (const b of this.buildingColliders) {
        const cx = (b.minX + b.maxX) / 2;
        const cz = (b.minZ + b.maxZ) / 2;
        const dist = Math.hypot(veh.x - cx, veh.z - cz);
        if (
          dist > 0.05 &&
          dist < radius + Math.max(b.maxX - b.minX, b.maxZ - b.minZ) * 0.55
        ) {
          veh.x += ((veh.x - cx) / dist) * 0.45;
          veh.z += ((veh.z - cz) / dist) * 0.45;
          break;
        }
      }
    }

    // Drifting tire smoke & sparks
    if (isDrifting && Math.abs(veh.speed) > 4.2) {
      this.spawnImpactSparks(
        new THREE.Vector3(
          veh.x - Math.sin(veh.rotation) * 1.5,
          0.12,
          veh.z - Math.cos(veh.rotation) * 1.5
        ),
        '#cbd5e1',
        2
      );
    }

    // Nitro Boost on Shift key
    const wantsNitro =
      (this.keys.has('ShiftLeft') || this.keys.has('ShiftRight')) &&
      this.playerStamina > 5 &&
      Math.abs(veh.speed) > 2.0;
    this.nitroActive = wantsNitro;

    if (wantsNitro) {
      this.playerStamina = Math.max(0, this.playerStamina - dt * 26);
      veh.speed = Math.min(
        stats.maxSpeed * 1.48,
        veh.speed + stats.acceleration * 2.2 * dt
      );

      // Cyan nitro flame particles
      const flameDirZ = -Math.cos(veh.rotation) * (stats.length * 0.52);
      const flameDirX = -Math.sin(veh.rotation) * (stats.length * 0.52);
      this.spawnImpactSparks(
        new THREE.Vector3(veh.x + flameDirX, 0.35, veh.z + flameDirZ),
        '#00e5ff',
        3
      );
    } else {
      this.playerStamina = Math.min(100, this.playerStamina + dt * 10);
    }

    // Asphalt Skid Marks when drifting or hard braking
    if (
      (isDrifting && Math.abs(veh.speed) > 3.6) ||
      (throttle < 0 && veh.speed > 7.5)
    ) {
      const skidGeo = new THREE.PlaneGeometry(0.35, 1.1).rotateX(-Math.PI / 2);
      const skidMat = new THREE.MeshBasicMaterial({
        color: '#09090b',
        transparent: true,
        opacity: 0.55,
        depthWrite: false,
      });
      const skidMesh = new THREE.Mesh(skidGeo, skidMat);
      skidMesh.position.set(veh.x, 0.022, veh.z);
      skidMesh.rotation.y = veh.rotation;
      this.scene.add(skidMesh);
      this.skidMarks.push({ mesh: skidMesh, life: 10 });
      if (this.skidMarks.length > 70) {
        const old = this.skidMarks.shift();
        if (old) {
          this.scene.remove(old.mesh);
          old.mesh.geometry.dispose();
        }
      }
    }

    // Burnout tire smoke when applying throttle while holding handbrake
    if (throttle > 0 && isDrifting && Math.abs(veh.speed) < 3.5) {
      const rearZ = -Math.cos(veh.rotation) * (stats.length * 0.45);
      const rearX = -Math.sin(veh.rotation) * (stats.length * 0.45);
      this.spawnImpactSparks(
        new THREE.Vector3(veh.x + rearX, 0.18, veh.z + rearZ),
        '#e2e8f0',
        3
      );
    }

    // Engine damage smoke puff and fire sparks when damaged
    if (veh.health < 60) {
      this.spawnImpactSparks(
        new THREE.Vector3(
          veh.x + Math.sin(veh.rotation) * 1.4,
          0.9,
          veh.z + Math.cos(veh.rotation) * 1.4
        ),
        veh.health < 30 ? '#0f172a' : '#475569',
        veh.health < 30 ? 2 : 1
      );
      if (veh.health < 25) {
        this.spawnImpactSparks(
          new THREE.Vector3(
            veh.x + Math.sin(veh.rotation) * 1.4,
            0.8,
            veh.z + Math.cos(veh.rotation) * 1.4
          ),
          '#f97316',
          2
        );
      }
    }

    this.playerPos.set(veh.x, 0, veh.z);
    this.playerRotation = veh.rotation;

    // Show character seated on motorcycle with realistic riding stance & dynamic cornering lean
    if (veh.type === 'motorcycle') {
      this.playerLimbs.group.visible = true;
      const seatOffset = 0.22;
      this.playerLimbs.group.position.set(
        veh.x - Math.sin(veh.rotation) * seatOffset,
        0.35,
        veh.z - Math.cos(veh.rotation) * seatOffset
      );
      this.playerLimbs.group.rotation.y = veh.rotation;
      this.playerLimbs.group.scale.y = 0.85;
      const vMesh = this.vehicleMeshes.get(veh.id);
      if (vMesh) {
        this.playerLimbs.group.rotation.z = vMesh.rotation.z;
      }
    } else {
      this.playerLimbs.group.visible = false;
    }

    // Position dynamic vehicle headlight cone ahead of car
    this.headlightSpot.intensity = 3.2;
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

      // Realistic Vehicle Suspension Dynamics (Pitch on accel/brake, Roll/Banking on turns)
      const speedNorm = Math.abs(veh.speed) / Math.max(1, stats.maxSpeed);
      const pitchAngle =
        (throttle > 0 ? -0.04 : throttle < 0 ? 0.065 : 0) *
        Math.min(1, speedNorm * 1.5);
      mesh.rotation.x = pitchAngle;
      const rollFactor = veh.type === 'motorcycle' ? 0.35 : 0.12;
      mesh.rotation.z = -steer * speedNorm * rollFactor;

      // Authentic Dhaka CNG 4-Stroke Engine Idle Thrum & Vibration
      if (veh.type === 'cng' && Math.abs(veh.speed) < 1.0) {
        const vibTime = Date.now() * 0.038;
        mesh.position.y = Math.sin(vibTime) * 0.012;
        mesh.rotation.z += Math.sin(vibTime * 1.1) * 0.007;
      }

      // Rotate vehicle wheels proportional to speed and steer front wheels / cockpit steering wheel
      mesh.traverse((child) => {
        if (child.name === 'wheel') {
          child.rotation.x += veh.speed * dt * 1.6;
          // Front steering wheels
          if (child.position.z > 0.4) {
            child.rotation.y = steer * 0.44;
          }
        }
        if (child.name === 'steering_wheel') {
          child.rotation.z = -steer * 0.9;
        }
      });
    }

    dhakaAudio.updateEngine(
      true,
      veh.type,
      veh.speed / Math.max(1, stats.maxSpeed)
    );
  }

  private updateTrafficAndPoliceAI(dt: number, wantedLevel: number) {
    const store = useGameStore.getState();

    for (const veh of this.vehicles) {
      if (veh.id === this.activeVehicleId) continue;

      const mesh = this.vehicleMeshes.get(veh.id);
      if (!mesh) continue;

      if (veh.isPolice) {
        const redBar = mesh.getObjectByName('siren_red');
        const blueBar = mesh.getObjectByName('siren_blue');
        if (redBar && blueBar) {
          const flash = Math.floor(performance.now() / 160) % 2 === 0;
          redBar.visible = wantedLevel > 0 ? flash : true;
          blueBar.visible = wantedLevel > 0 ? !flash : true;
        }

        if (wantedLevel > 0) {
          const distToPlayer = Math.hypot(
            veh.x - this.playerPos.x,
            veh.z - this.playerPos.z
          );
          if (distToPlayer < 45) {
            this.policeSirenTimer -= dt;
            if (this.policeSirenTimer <= 0) {
              dhakaAudio.playHorn('siren');
              this.policeSirenTimer = 1.8;
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
            dhakaAudio.playSfx('hit');
            const pushAngle = Math.atan2(
              veh.x - playerVeh.x,
              veh.z - playerVeh.z
            );
            veh.x += Math.sin(pushAngle) * 1.4;
            veh.z += Math.cos(pushAngle) * 1.4;
            playerVeh.speed *= 0.65;

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

        if (distToPlayer < 160) {
          const targetAngle = Math.atan2(dx, dz);
          const diff = normalizeAngle(targetAngle - veh.rotation);
          veh.rotation += diff * Math.min(1, dt * 2.8);
          const chaseSpeed = 16 + wantedLevel * 3.2;

          const nx = veh.x + Math.sin(veh.rotation) * chaseSpeed * dt;
          const nz = veh.z + Math.cos(veh.rotation) * chaseSpeed * dt;

          if (!this.checkWorldObstacle(nx, nz, 1.4)) {
            veh.x = nx;
            veh.z = nz;
          } else {
            veh.rotation += 0.9;
          }

          if (distToPlayer < 3.6 && !this.activeVehicleId) {
            store.damagePlayer(12 * dt);
          }

          mesh.position.set(veh.x, 0, veh.z);
          mesh.rotation.y = veh.rotation;

          mesh.traverse((child) => {
            if (child.name === 'wheel') {
              child.rotation.x += chaseSpeed * dt * 1.6;
            }
          });
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
        continue;
      }

      const nx = veh.x + Math.sin(veh.rotation) * cruiseSpeed * dt;
      const nz = veh.z + Math.cos(veh.rotation) * cruiseSpeed * dt;

      if (
        Math.abs(nx) > 340 ||
        nz > 282 ||
        nz < -335 ||
        this.checkWorldObstacle(nx, nz, 1.5)
      ) {
        veh.rotation = normalizeAngle(veh.rotation + Math.PI);
      } else {
        veh.x = nx;
        veh.z = nz;
      }

      mesh.position.set(veh.x, 0, veh.z);
      mesh.rotation.y = veh.rotation;

      mesh.traverse((child) => {
        if (child.name === 'wheel') {
          child.rotation.x += cruiseSpeed * dt * 1.6;
        }
      });
    }
  }

  private updateNPCAI(dt: number) {
    const t = performance.now() * 0.008;
    const store = useGameStore.getState();

    for (const npc of this.npcs) {
      const limbs = this.npcLimbsMap.get(npc.id);
      if (!limbs) continue;

      if (this.activeVehicleId) {
        const pv = this.vehicles.find((v) => v.id === this.activeVehicleId);
        if (pv && Math.abs(pv.speed) > 8) {
          const d = Math.hypot(npc.x - pv.x, npc.z - pv.z);
          if (d < 2.1 && !npc.isStoryNPC) {
            dhakaAudio.playSfx('hit');
            npc.aiState = 'flee';
            const away = Math.atan2(npc.x - pv.x, npc.z - pv.z);
            npc.x += Math.sin(away) * 3.2;
            npc.z += Math.cos(away) * 3.2;
            if (store.wantedLevel === 0) {
              store.setWantedLevel(1);
              store.showBanner({
                titleEn: 'RECKLESS DRIVING REPORTED!',
                titleBn: 'বেপরোয়া গাড়ি চালানোর অভিযোগ!',
                subtitleEn:
                  'DMP Traffic Police are investigating (Wanted ★1).',
                subtitleBn:
                  'ট্রাফিক পুলিশ বিষয়টি তদন্ত করছে (ওয়ান্টেড ★১)।',
                tone: 'red',
              });
            }
          }
        }
      }

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
        npc.x += Math.sin(npc.rotation) * speed * dt;
        npc.z += Math.cos(npc.rotation) * speed * dt;
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
    if (this.telemetryTimer < 0.065) return;
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
      isAimingDownSights: this.isAimingDownSights,
      isNitroActive: this.nitroActive,
    });

    // Real-time exploration discovery for all 16 authentic Dhaka locations
    for (const loc of DHAKA_GAME_LOCATIONS) {
      const distToLoc = Math.hypot(
        loc.x - this.playerPos.x,
        loc.z - this.playerPos.z
      );
      if (distToLoc < 38) {
        store.discoverLocation(loc.id);
      }
    }

    if (this.activeVehicleId) {
      let vehPrompt: NearbyPrompt | null = null;
      for (const poi of POINTS_OF_INTEREST) {
        if (poi.type === 'garage') {
          const d = Math.hypot(
            poi.x - this.playerPos.x,
            poi.z - this.playerPos.z
          );
          if (d < 7.5) {
            vehPrompt = {
              type: 'poi',
              id: poi.id,
              labelEn: '[E] Dholaikhal Pay-n-Spray (Repair & Respray - ৳350)',
              labelBn: '[E] ধোলাইখাল গ্যারেজ (মেরামত ও নতুন রঙ - ৳৩৫০)',
            };
            break;
          }
        }
      }
      store.setNearbyPrompt(vehPrompt);
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

    let dist = isDriving ? 9.2 : 6.2;
    let heightOffset = isDriving ? 2.4 : 1.75;

    if (this.isAimingDownSights && !isDriving) {
      dist = 2.4;
      heightOffset = 1.45;
    } else if (mode === 'far_chase') {
      dist = isDriving ? 13.5 : 9.0;
      heightOffset = isDriving ? 3.4 : 2.3;
    } else if (mode === 'hood_close') {
      dist = isDriving ? 0.65 : 2.1;
      heightOffset = isDriving ? 1.15 : 1.55;
    }

    let targetX = this.playerPos.x;
    let targetY = this.playerPos.y + heightOffset;
    let targetZ = this.playerPos.z;

    // Nitro speed camera vibration
    if (this.nitroActive && isDriving) {
      targetX += (Math.random() - 0.5) * 0.08;
      targetY += (Math.random() - 0.5) * 0.06;
    }

    // Continuous Raycast Camera Collision Check against Buildings & Walls
    const cosPitch = Math.cos(this.cameraPitch);
    const sinPitch = Math.sin(this.cameraPitch);
    const dirX = Math.sin(this.cameraYaw) * cosPitch;
    const dirY = sinPitch;
    const dirZ = Math.cos(this.cameraYaw) * cosPitch;

    let safeDist = dist;
    const stepSize = 0.35;
    const totalSteps = Math.ceil(dist / stepSize);

    for (let i = 1; i <= totalSteps; i++) {
      const testD = i * stepSize;
      const testX = targetX + dirX * testD;
      const testZ = targetZ + dirZ * testD;
      if (this.checkBuildingCollision(testX, testZ, 0.5)) {
        safeDist = Math.max(1.15, testD - 0.45);
        break;
      }
    }

    const camX = targetX + dirX * safeDist;
    const camY = Math.max(1.1, targetY + dirY * safeDist);
    const camZ = targetZ + dirZ * safeDist;

    this.camera.position.lerp(
      new THREE.Vector3(camX, camY, camZ),
      Math.min(1, dt * 15)
    );
    this.camera.lookAt(targetX, targetY, targetZ);

    // Dynamic High-Speed Sprint & Driving Camera FOV Widening
    const wantsSprint =
      (this.keys.has('ShiftLeft') || this.keys.has('ShiftRight')) &&
      this.playerStamina > 5;
    const currentVehSpeed = this.activeVehicleId
      ? Math.abs(
          this.vehicles.find((v) => v.id === this.activeVehicleId)?.speed || 0
        )
      : 0;
    const isHighSpeed = this.activeVehicleId
      ? currentVehSpeed > 16
      : wantsSprint;
    let targetFov = 60;
    if (this.isAimingDownSights && !isDriving) {
      targetFov = 38;
    } else if (this.nitroActive && isDriving) {
      targetFov = 75;
    } else if (isHighSpeed) {
      targetFov = 67;
    }

    if (Math.abs(this.camera.fov - targetFov) > 0.05) {
      this.camera.fov = THREE.MathUtils.lerp(
        this.camera.fov,
        targetFov,
        dt * 8
      );
      this.camera.updateProjectionMatrix();
    }
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
    return false;
  }

  // Checks both Building Colliders AND Water Basins (allowing Hatirjheel Bridge passage!)
  private checkWorldObstacle(x: number, z: number, radius: number): boolean {
    if (this.checkBuildingCollision(x, z, radius)) return true;

    // Buriganga River Southern Boundary
    if (z + radius > 294) return true;

    // Dhanmondi Lake Water Boundary (-265..-183, -35..85)
    if (x > -265 && x < -183 && z > -35 && z < 85) return true;

    // Hatirjheel Lake Water Boundary (165..275, -80..70), EXCEPT on the Bridge Deck (X = 208..232) or Central Causeway (Z = -10..10)
    if (x > 165 && x < 275 && z > -80 && z < 70) {
      const onBridge = x >= 208 && x <= 232;
      const onCauseway = z >= -10 && z <= 10;
      if (!onBridge && !onCauseway) return true;
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
  return Math.max(-365, Math.min(365, v));
}
