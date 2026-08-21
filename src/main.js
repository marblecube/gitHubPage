import './style.css';
import * as THREE from 'three';

// --- Setup Scene, Camera, Renderer ---
const canvas = document.querySelector('#bg');
const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.z = 50;

const renderer = new THREE.WebGLRenderer({
  canvas: canvas,
  alpha: true, // Transparent background
  antialias: true
});
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.autoClear = false; // We will handle clearing manually

// Skyline Scene & Camera (Stationary)
const skylineScene = new THREE.Scene();
const skylineCamera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
skylineCamera.position.z = 50;

// --- Fireworks System ---
// To make it look cool, we'll use a lot of particles and simple physics.
const fireworks = [];
const gravity = new THREE.Vector3(0, -0.05, 0);

const particleTexture = createParticleTexture();

function createParticleTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 32;
  canvas.height = 32;
  const context = canvas.getContext('2d');
  
  const gradient = context.createRadialGradient(16, 16, 0, 16, 16, 16);
  gradient.addColorStop(0, 'rgba(255,255,255,1)');
  gradient.addColorStop(0.2, 'rgba(255,255,255,0.8)');
  gradient.addColorStop(0.5, 'rgba(255,255,255,0.2)');
  gradient.addColorStop(1, 'rgba(0,0,0,0)');
  
  context.fillStyle = gradient;
  context.fillRect(0, 0, 32, 32);
  
  return new THREE.CanvasTexture(canvas);
}

function createMoonTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  
  // Base moon color
  ctx.fillStyle = '#ffffee';
  ctx.fillRect(0, 0, 256, 256);
  
  // Craters (darker spots)
  ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
  for(let i=0; i<30; i++) {
    const r = Math.random() * 20 + 5;
    const x = Math.random() * 256;
    const y = Math.random() * 256;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  
  // Larger mare (dark seas)
  ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
  for(let i=0; i<5; i++) {
    const r = Math.random() * 40 + 20;
    const x = Math.random() * 256;
    const y = Math.random() * 256;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  
  return new THREE.CanvasTexture(canvas);
}

class Firework {
  constructor() {
    this.state = 'climbing';
    
    // Bias spawn positions to the edges to avoid hiding the center UI text too much
    if (Math.random() < 0.75) {
      // 75% of the time, spawn on the left or right edges
      if (Math.random() > 0.5) {
        this.startX = 25 + Math.random() * 35; // 25 to 60 (Right)
      } else {
        this.startX = -60 + Math.random() * 35; // -60 to -25 (Left)
      }
    } else {
      // 25% of the time, allow spawning in the center
      this.startX = (Math.random() - 0.5) * 50; // -25 to 25 (Center)
    }
    this.startZ = (Math.random() - 0.5) * 40 - 20;
    this.targetY = Math.random() * 20 + 10; // Target explosion height
    this.currentY = -40; // Start at the bottom
    
    // Base color for this firework
    this.color = new THREE.Color();
    this.color.setHSL(Math.random(), 1.0, 0.5 + Math.random() * 0.3); // Bright colors
    
    // Create the rocket (a single bright particle)
    this.rocketGeometry = new THREE.BufferGeometry();
    this.rocketGeometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array([this.startX, this.currentY, this.startZ]), 3));
    this.rocketGeometry.setAttribute('color', new THREE.BufferAttribute(new Float32Array([this.color.r, this.color.g, this.color.b]), 3));
    
    this.rocketMaterial = new THREE.PointsMaterial({
      size: 3.5,
      map: particleTexture,
      transparent: true,
      opacity: 1,
      vertexColors: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    
    this.rocket = new THREE.Points(this.rocketGeometry, this.rocketMaterial);
    scene.add(this.rocket);
    
    this.rocketVelocityY = Math.random() * 0.3 + 1.2;
  }
  
  explode() {
    this.state = 'exploding';
    scene.remove(this.rocket);
    this.rocketGeometry.dispose();
    this.rocketMaterial.dispose();
    
    this.geometry = new THREE.BufferGeometry();
    this.trailGeometry = new THREE.BufferGeometry();
    this.particleCount = 400 + Math.random() * 600;
    
    const positions = new Float32Array(this.particleCount * 3);
    const colors = new Float32Array(this.particleCount * 3);
    const trailPositions = new Float32Array(this.particleCount * 6);
    const trailColors = new Float32Array(this.particleCount * 6);
    
    this.velocities = [];
    
    for (let i = 0; i < this.particleCount; i++) {
      positions[i * 3] = this.startX;
      positions[i * 3 + 1] = this.currentY;
      positions[i * 3 + 2] = this.startZ;

      // Add randomness to color per particle
      const r = this.color.r + (Math.random() * 0.2 - 0.1);
      const g = this.color.g + (Math.random() * 0.2 - 0.1);
      const b = this.color.b + (Math.random() * 0.2 - 0.1);
      
      colors[i * 3] = r;
      colors[i * 3 + 1] = g;
      colors[i * 3 + 2] = b;

      // Trail setup (2 vertices per line segment)
      trailPositions[i * 6] = this.startX;
      trailPositions[i * 6 + 1] = this.currentY;
      trailPositions[i * 6 + 2] = this.startZ;
      trailPositions[i * 6 + 3] = this.startX;
      trailPositions[i * 6 + 4] = this.currentY;
      trailPositions[i * 6 + 5] = this.startZ;
      
      // Streaks more on the white side, tips more colorful
      trailColors[i * 6] = 1.0;
      trailColors[i * 6 + 1] = 1.0;
      trailColors[i * 6 + 2] = 1.0;
      trailColors[i * 6 + 3] = r;
      trailColors[i * 6 + 4] = g;
      trailColors[i * 6 + 5] = b;

      // Spherical explosion velocity
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 2 - 1);
      const speed = Math.random() * 0.4 + 0.1; // Slower, tighter initial explosion speed
      
      this.velocities.push(new THREE.Vector3(
        speed * Math.sin(phi) * Math.cos(theta),
        speed * Math.sin(phi) * Math.sin(theta),
        speed * Math.cos(phi)
      ));
    }
    
    this.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    this.trailGeometry.setAttribute('position', new THREE.BufferAttribute(trailPositions, 3));
    this.trailGeometry.setAttribute('color', new THREE.BufferAttribute(trailColors, 3));

    this.material = new THREE.PointsMaterial({
      size: 2.5,
      map: particleTexture,
      transparent: true,
      opacity: 1,
      vertexColors: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    
    this.trailMaterial = new THREE.LineBasicMaterial({
      transparent: true,
      opacity: 1,
      vertexColors: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    this.points = new THREE.Points(this.geometry, this.material);
    this.lines = new THREE.LineSegments(this.trailGeometry, this.trailMaterial);
    
    this.group = new THREE.Group();
    this.group.add(this.points);
    this.group.add(this.lines);
    scene.add(this.group);
    
    this.fallVelocityY = 0;
    this.holdTimer = 0;
    this.life = 1.0;
    this.explosionTimer = 1.0;
  }

  update() {
    if (this.state === 'climbing') {
      this.currentY += this.rocketVelocityY;
      this.rocketVelocityY -= 0.015; // slight gravity on rocket
      this.rocketGeometry.attributes.position.array[1] = this.currentY;
      this.rocketGeometry.attributes.position.needsUpdate = true;
      
      // Explode when velocity is near zero or hit target Y
      if (this.rocketVelocityY <= 0 || this.currentY >= this.targetY) {
        this.explode();
      }
      return true;
    } 
    
    if (this.state === 'exploding' || this.state === 'fading') {
      this.explosionTimer -= 0.004; // Constantly decreases from the moment of explosion
      if (this.explosionTimer < 0) this.explosionTimer = 0;

      if (this.state === 'fading') {
        this.life -= 0.005; // Extremely slow fade out speed
        this.material.opacity = this.life;
        this.trailMaterial.opacity = this.life; 
      } else {
        this.holdTimer++;
        if (this.holdTimer > 120) { // Hold even longer before fading opacity
          this.state = 'fading';
        }
      }

      const positions = this.geometry.attributes.position.array;
      const trailPositions = this.trailGeometry.attributes.position.array;
      
      for (let i = 0; i < this.velocities.length; i++) {
        if (this.state === 'exploding') {
          this.velocities[i].multiplyScalar(0.97); // Gentler drag, slower drift
        } else {
          this.velocities[i].multiplyScalar(0.98);
        }
        
        // Update current position (outer tip)
        positions[i * 3] += this.velocities[i].x;
        positions[i * 3 + 1] += this.velocities[i].y;
        positions[i * 3 + 2] += this.velocities[i].z;

        // Comet tail shrinks continuously as they expand
        let tailMultiplier = 15.0 * this.explosionTimer;

        // Inner point of the streak (tail)
        trailPositions[i * 6] = positions[i * 3] - this.velocities[i].x * tailMultiplier;
        trailPositions[i * 6 + 1] = positions[i * 3 + 1] - this.velocities[i].y * tailMultiplier;
        trailPositions[i * 6 + 2] = positions[i * 3 + 2] - this.velocities[i].z * tailMultiplier;

        // Outer point of the streak (tip)
        trailPositions[i * 6 + 3] = positions[i * 3];
        trailPositions[i * 6 + 4] = positions[i * 3 + 1];
        trailPositions[i * 6 + 5] = positions[i * 3 + 2];
      }
      this.geometry.attributes.position.needsUpdate = true;
      this.trailGeometry.attributes.position.needsUpdate = true;
      
      if (this.state === 'fading') return this.life > 0;
      return true;
    }
  }

  destroy() {
    if (this.state === 'climbing') {
      scene.remove(this.rocket);
      this.rocketGeometry.dispose();
      this.rocketMaterial.dispose();
    } else {
      scene.remove(this.group);
      this.geometry.dispose();
      this.material.dispose();
      this.trailGeometry.dispose();
      this.trailMaterial.dispose();
    }
  }
}

// --- Starfield (Background) ---
const starGeometry = new THREE.BufferGeometry();
const starCount = 1500;
const starPositions = new Float32Array(starCount * 3);
for(let i=0; i<starCount; i++) {
  starPositions[i * 3] = (Math.random() - 0.5) * 800; // x: wide coverage
  starPositions[i * 3 + 1] = (Math.random() - 0.5) * 400 + 50; // y: fill entire vertical space
  starPositions[i * 3 + 2] = -150 - Math.random() * 200; // z: far background
}
starGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
const starMaterial = new THREE.PointsMaterial({
  color: 0xffffff,
  size: 0.8,
  transparent: true,
  opacity: 0.6 // Reduced intensity
});
const stars = new THREE.Points(starGeometry, starMaterial);
scene.add(stars);

// --- Skyline & Environment ---
const skyline = new THREE.Group();

// Add lighting so StandardMaterial works and creates depth
const ambientLight = new THREE.AmbientLight(0xffffff, 0.7); // Lightened
skylineScene.add(ambientLight);
const directionalLight = new THREE.DirectionalLight(0x88bbff, 2.0); // Lightened
directionalLight.position.set(-50, 100, 50);
skylineScene.add(directionalLight);

const treeMaterial = new THREE.MeshStandardMaterial({ color: 0x0a140a, roughness: 1.0 }); // Slightly lighter green

const numBuildings = 80;
// Calculate exactly where the bottom of the screen is at z=0 for FOV 75 and distance 50
const frustumHeight = 2 * Math.tan((75 / 2) * (Math.PI / 180)) * 50;
const bottomY = -frustumHeight / 2;

// Lighter building color palette
const buildingColors = [0x22222a, 0x2a2a34, 0x242630, 0x2f2f3f, 0x282834];



// --- Add Moon ---
const moonTexture = createMoonTexture();
const moonGeo = new THREE.CircleGeometry(20, 64);
const moonMat = new THREE.MeshBasicMaterial({ color: 0xffffff, map: moonTexture });
const moon = new THREE.Mesh(moonGeo, moonMat);
moon.position.set(45, 30, -250); // Off-center, up and to the right
scene.add(moon);

const blinkingLights = [];
const slowBlinkingLights = [];

// Window Helper
function addWindowsToBuilding(building, width, height, depth, prob = null) {
  if (prob === null) prob = Math.random() * 0.6 + 0.1; // 10% to 70% lit (irregular)
  
  // Pick a base window color for this building
  const winColors = [0xffdd66, 0xfff0cc, 0xffaa44, 0xddeeff];
  const baseColor = winColors[Math.floor(Math.random() * winColors.length)];
  const windowMaterial = new THREE.MeshBasicMaterial({ color: baseColor });
  
  const winW = 0.3;
  const winH = 0.5;
  const marginX = 0.5;
  const marginY = 0.8;
  
  const cols = Math.floor(width / (winW + marginX));
  const rows = Math.floor(height / (winH + marginY));
  
  const startX = -((cols * (winW + marginX)) / 2) + (winW + marginX)/2;
  const startY = -((rows * (winH + marginY)) / 2) + (winH + marginY)/2;

  const winGeo = new THREE.PlaneGeometry(winW, winH);

  for (let r = 1; r < rows - 1; r++) { 
    for (let c = 1; c < cols - 1; c++) { 
      if (Math.random() < prob) { 
        const win = new THREE.Mesh(winGeo, windowMaterial);
        win.position.z = depth / 2 + 0.02; 
        win.position.x = startX + c * (winW + marginX);
        win.position.y = startY + r * (winH + marginY);
        building.add(win);
      }
    }
  }
}

const allBuildings = [];
// Add Buildings
for (let i = 0; i < numBuildings; i++) {
  const width = Math.random() * 8 + 6;
  const height = Math.random() * 15 + 5; // Max height 20 (stays in bottom 30%)
  const depth = Math.random() * 10 + 5;
  
  const geometry = new THREE.BoxGeometry(width, height, depth);
  const color = buildingColors[Math.floor(Math.random() * buildingColors.length)];
  const buildingMaterial = new THREE.MeshStandardMaterial({ 
    color: color, 
    roughness: 0.8,
    metalness: 0.1
  });
  
  const building = new THREE.Mesh(geometry, buildingMaterial);
  
  // Position along the bottom edge exactly
  building.position.x = (Math.random() - 0.5) * 200;
  building.position.y = bottomY + height / 2; 
  building.position.z = (Math.random() - 0.5) * 15 - 5;
  
  // Add wireframe edges for sharp definition
  const edges = new THREE.EdgesGeometry(geometry);
  const line = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: 0x222233, transparent: true, opacity: 0.5 }));
  building.add(line);

  // Roof details (HVAC blocks)
  if (Math.random() > 0.5) {
    const detailWidth = width * (Math.random() * 0.4 + 0.2);
    const detailHeight = Math.random() * 3 + 1;
    const detailDepth = depth * (Math.random() * 0.4 + 0.2);
    const topGeo = new THREE.BoxGeometry(detailWidth, detailHeight, detailDepth);
    const topMesh = new THREE.Mesh(topGeo, buildingMaterial);
    topMesh.position.y = height / 2 + detailHeight / 2;
    building.add(topMesh);
  }

  // Roof doors (A few roof entry doors protruding)
  if (Math.random() < 0.15) { 
    const doorShedGeo = new THREE.BoxGeometry(1.5, 2, 1.5);
    const doorShed = new THREE.Mesh(doorShedGeo, buildingMaterial);
    doorShed.position.y = height / 2 + 1;
    doorShed.position.x = (Math.random() - 0.5) * (width - 2);
    building.add(doorShed);
  }

  // Antennas & blinking lights (no more than 5%)
  if (Math.random() < 0.05) {
    const numPipes = Math.floor(Math.random() * 3) + 1;
    for(let p=0; p<numPipes; p++) {
      const antGeo = new THREE.CylinderGeometry(0.05, 0.05, Math.random() * 4 + 2);
      const antMesh = new THREE.Mesh(antGeo, new THREE.MeshStandardMaterial({color: 0x333344}));
      antMesh.position.y = height / 2 + antGeo.parameters.height / 2;
      antMesh.position.x = (Math.random() - 0.5) * (width - 1);
      building.add(antMesh);
      
      // Blinking light of various colors
      const lColors = [0xff0000, 0x00ff00, 0x0000ff, 0xffff00];
      const lCol = lColors[Math.floor(Math.random() * lColors.length)];
      const antLightGeo = new THREE.SphereGeometry(0.15, 8, 8);
      const antLightMesh = new THREE.Mesh(antLightGeo, new THREE.MeshBasicMaterial({color: lCol}));
      antLightMesh.position.y = height / 2 + antGeo.parameters.height;
      antLightMesh.position.x = antMesh.position.x;
      building.add(antLightMesh);
      
      const pLight = new THREE.PointLight(lCol, 2.0, 15);
      pLight.position.copy(antLightMesh.position);
      building.add(pLight);
      
      if (Math.random() > 0.5) {
        blinkingLights.push(pLight);
      } else {
        slowBlinkingLights.push(pLight);
      }
    }
  }

  // Fire escapes on the side
  if (Math.random() < 0.15) { 
    const feGroup = new THREE.Group();
    const balconyGeo = new THREE.BoxGeometry(0.6, 0.05, 2.0);
    const feMat = new THREE.MeshStandardMaterial({color: 0x111111, metalness: 0.8});
    
    let lastBalconyY = null;
    const side = Math.random() > 0.5 ? 1 : -1;
    for(let y = 3; y < height - 3; y += 3) {
      const balcony = new THREE.Mesh(balconyGeo, feMat);
      balcony.position.set(side * (width / 2 + 0.3), -height/2 + y, 1.0);
      feGroup.add(balcony);
      if (lastBalconyY !== null) {
        const stairCurve = new THREE.LineCurve3(
          new THREE.Vector3(side * (width / 2 + 0.3), -height/2 + y, 1.0 - 0.8),
          new THREE.Vector3(side * (width / 2 + 0.3), -height/2 + lastBalconyY, 1.0 + 0.8)
        );
        const stairGeo = new THREE.BufferGeometry().setFromPoints(stairCurve.getPoints(2));
        const stairLine = new THREE.Line(stairGeo, new THREE.LineBasicMaterial({color: 0x111111}));
        feGroup.add(stairLine);
      }
      lastBalconyY = y;
    }
    building.add(feGroup);
  }
  
  // Add a grid of windows
  addWindowsToBuilding(building, width, height, depth);
  
  allBuildings.push({mesh: building, w: width, h: height, d: depth});
  skyline.add(building);
}

// Add clotheslines between adjacent buildings
allBuildings.sort((a,b) => a.mesh.position.x - b.mesh.position.x);
for (let i = 0; i < allBuildings.length - 1; i++) {
  const b1 = allBuildings[i];
  const b2 = allBuildings[i+1];
  
  // Only connect if they are close enough
  const dist = b2.mesh.position.x - b1.mesh.position.x;
  if (dist > (b1.w/2 + b2.w/2) && dist < (b1.w/2 + b2.w/2 + 8) && Math.random() < 0.4) {
    // String clothesline
    const pt1 = new THREE.Vector3(b1.mesh.position.x + b1.w/2, bottomY + b1.h - 2, b1.mesh.position.z + 1);
    const pt2 = new THREE.Vector3(b2.mesh.position.x - b2.w/2, bottomY + b2.h - 2, b2.mesh.position.z + 1);
    
    // Dip in the middle
    const midX = (pt1.x + pt2.x) / 2;
    const midY = Math.min(pt1.y, pt2.y) - (dist * 0.2);
    const midZ = (pt1.z + pt2.z) / 2;
    
    const curve = new THREE.QuadraticBezierCurve3(pt1, new THREE.Vector3(midX, midY, midZ), pt2);
    const lineGeo = new THREE.BufferGeometry().setFromPoints(curve.getPoints(10));
    const lineMat = new THREE.LineBasicMaterial({color: 0x000000});
    const clothesLine = new THREE.Line(lineGeo, lineMat);
    skyline.add(clothesLine);
    
    // Add hanging clothes
    const clothesColors = [0xff4444, 0x44ff44, 0x4444ff, 0xffffff, 0xffff44];
    for (let c = 1; c <= 4; c++) {
      const t = c / 5;
      const pos = curve.getPoint(t);
      const clothGeo = new THREE.PlaneGeometry(0.3, 0.4);
      const clothMat = new THREE.MeshBasicMaterial({
        color: clothesColors[Math.floor(Math.random() * clothesColors.length)], 
        side: THREE.DoubleSide
      });
      const cloth = new THREE.Mesh(clothGeo, clothMat);
      cloth.position.copy(pos);
      cloth.position.y -= 0.2; // hang down
      skyline.add(cloth);
    }
  }
}

// --- Prominent Water Tower Building ---
// Add one specific, prominent building in the foreground to hold the water tower
const wtBldgWidth = 8;
const wtBldgHeight = 16; // Taller than background buildings, but fits in 30%
const wtBldgDepth = 8;
const wtBldgGeo = new THREE.BoxGeometry(wtBldgWidth, wtBldgHeight, wtBldgDepth);
const wtBldgMat = new THREE.MeshStandardMaterial({ 
  color: 0x2f2f3f, 
  roughness: 0.8,
  metalness: 0.1
});
const wtBldg = new THREE.Mesh(wtBldgGeo, wtBldgMat);

// Position it prominently in the foreground, off to the left side
wtBldg.position.x = -35;
wtBldg.position.y = bottomY + wtBldgHeight / 2;
wtBldg.position.z = 8; // Very foreground (in front of other buildings)

// Edges
const wtEdges = new THREE.EdgesGeometry(wtBldgGeo);
const wtLine = new THREE.LineSegments(wtEdges, new THREE.LineBasicMaterial({ color: 0x222233, transparent: true, opacity: 0.5 }));
wtBldg.add(wtLine);

// The Water Tower Group
const wtGroup = new THREE.Group();

// Legs (much bigger)
const legsGeo = new THREE.CylinderGeometry(1.0, 1.0, 3.0, 8);
const legsMat = new THREE.MeshStandardMaterial({color: 0x333344, wireframe: true});
const legs = new THREE.Mesh(legsGeo, legsMat);
legs.position.y = 3.0 / 2;
wtGroup.add(legs);

// Tank
const tankGeo = new THREE.CylinderGeometry(2.0, 2.0, 3.0, 12);
const tankMat = new THREE.MeshStandardMaterial({color: 0x6a4a3a, roughness: 1.0}); // Brighter rust
const tank = new THREE.Mesh(tankGeo, tankMat);
tank.position.y = 3.0 + 3.0 / 2;
wtGroup.add(tank);

// Roof
const roofGeo = new THREE.ConeGeometry(2.2, 1.2, 12);
const roofMat = new THREE.MeshStandardMaterial({color: 0x1a1a1a});
const roof = new THREE.Mesh(roofGeo, roofMat);
roof.position.y = 3.0 + 3.0 + 1.2 / 2;
wtGroup.add(roof);

// Glowing red aviation light at the very top
const wtLightMeshGeo = new THREE.SphereGeometry(0.3, 8, 8);
const wtLightMeshMat = new THREE.MeshBasicMaterial({color: 0xff3333});
const wtLightMesh = new THREE.Mesh(wtLightMeshGeo, wtLightMeshMat);
wtLightMesh.position.y = 3.0 + 3.0 + 1.2;
wtGroup.add(wtLightMesh);

const wtLight = new THREE.PointLight(0xff0000, 5.0, 20); // Stronger light
wtLight.position.copy(wtLightMesh.position);
wtGroup.add(wtLight);
blinkingLights.push(wtLight);

wtGroup.position.y = wtBldgHeight / 2;
wtBldg.add(wtGroup);
addWindowsToBuilding(wtBldg, wtBldgWidth, wtBldgHeight, wtBldgDepth, 0.85); // Lots of windows!

// Add fire escapes and extra lit windows to the right side (x = width/2)
const feGroup = new THREE.Group();
const balconyGeo = new THREE.BoxGeometry(0.8, 0.1, 2.5);
const feMat = new THREE.MeshStandardMaterial({color: 0x111111, metalness: 0.8});
const wtSideWinGeo = new THREE.PlaneGeometry(0.3, 0.5);
const wtWinMat = new THREE.MeshBasicMaterial({ color: 0xffdd66 });

let lastBalconyY = null;
for(let y = 3; y < wtBldgHeight - 3; y += 4) {
  // Fire escape balcony
  const balcony = new THREE.Mesh(balconyGeo, feMat);
  balcony.position.set(wtBldgWidth / 2 + 0.4, -wtBldgHeight/2 + y, 1.0);
  feGroup.add(balcony);
  
  // Diagonal stair to the previous balcony
  if (lastBalconyY !== null) {
    const stairCurve = new THREE.LineCurve3(
      new THREE.Vector3(wtBldgWidth / 2 + 0.4, -wtBldgHeight/2 + y, 1.0 - 1.0),
      new THREE.Vector3(wtBldgWidth / 2 + 0.4, -wtBldgHeight/2 + lastBalconyY, 1.0 + 1.0)
    );
    const stairGeo = new THREE.BufferGeometry().setFromPoints(stairCurve.getPoints(2));
    const stairLine = new THREE.Line(stairGeo, new THREE.LineBasicMaterial({color: 0x111111}));
    feGroup.add(stairLine);
  }
  lastBalconyY = y;
}
wtBldg.add(feGroup);

// Side Windows for water tower building
for(let y = 2; y < wtBldgHeight - 2; y += 1.5) {
  for(let z = -2; z <= 2; z += 1.2) {
    if(Math.random() < 0.95) { // Almost fully lit side
      const win = new THREE.Mesh(wtSideWinGeo, wtWinMat);
      win.rotation.y = Math.PI / 2;
      win.position.set(wtBldgWidth / 2 + 0.02, -wtBldgHeight/2 + y, z);
      wtBldg.add(win);
    }
  }
}

skyline.add(wtBldg);

// --- Prominent Pigeon Coop Building ---
const pcBldgWidth = 10;
const pcBldgHeight = 12;
const pcBldgDepth = 8;
const pcBldgGeo = new THREE.BoxGeometry(pcBldgWidth, pcBldgHeight, pcBldgDepth);
const pcBldgMat = new THREE.MeshStandardMaterial({ color: 0x3a3a44, roughness: 0.9 });
const pcBldg = new THREE.Mesh(pcBldgGeo, pcBldgMat);

pcBldg.position.x = -12; // Middle-left
pcBldg.position.y = bottomY + pcBldgHeight / 2;
pcBldg.position.z = 10; // Very foreground

const pcEdges = new THREE.EdgesGeometry(pcBldgGeo);
const pcLine = new THREE.LineSegments(pcEdges, new THREE.LineBasicMaterial({ color: 0x222233, transparent: true, opacity: 0.5 }));
pcBldg.add(pcLine);

// Pigeon Coop Group
const pcGroup = new THREE.Group();

// The shack
const coopGeo = new THREE.BoxGeometry(3.5, 2.5, 2.5);
const coopMat = new THREE.MeshStandardMaterial({color: 0x5c4033, roughness: 1.0}); // Brown wood
const coop = new THREE.Mesh(coopGeo, coopMat);
coop.position.set(-1.5, 1.25, 0);
pcGroup.add(coop);

// Shack roof (slanted)
const coopRoofGeo = new THREE.BoxGeometry(3.8, 0.2, 2.8);
const coopRoofMat = new THREE.MeshStandardMaterial({color: 0x222222});
const coopRoof = new THREE.Mesh(coopRoofGeo, coopRoofMat);
coopRoof.position.set(-1.5, 2.6, 0);
coopRoof.rotation.z = -0.1;
pcGroup.add(coopRoof);

// Door on the side facing center
const doorGeo = new THREE.BoxGeometry(0.1, 1.6, 1.0); 
const doorMat = new THREE.MeshStandardMaterial({color: 0x331100, roughness: 1.0}); // Dark wood
const door = new THREE.Mesh(doorGeo, doorMat);
door.position.set(0.26, 0.8, 0); // Attached to right side of shack (local x: -1.5 + 1.75 = 0.25)
pcGroup.add(door);

// A pole to hang the lights from
const poleGeo = new THREE.CylinderGeometry(0.05, 0.05, 3.0);
const poleMat = new THREE.MeshStandardMaterial({color: 0x222222});
const pole = new THREE.Mesh(poleGeo, poleMat);
pole.position.set(3.0, 1.5, 0);
pcGroup.add(pole);

// Hanging lights string
const stringCurve = new THREE.QuadraticBezierCurve3(
  new THREE.Vector3(-0.5, 2.3, 0.5), // Shack attach point
  new THREE.Vector3(1.2, 1.6, 0.5), // Dip
  new THREE.Vector3(3.0, 2.8, 0)  // Pole attach point
);
const stringGeo = new THREE.BufferGeometry().setFromPoints(stringCurve.getPoints(10));
const stringMat = new THREE.LineBasicMaterial({color: 0x000000});
const stringLine = new THREE.Line(stringGeo, stringMat);
pcGroup.add(stringLine);

// 4 bulbs along the string
const bulbGeo = new THREE.SphereGeometry(0.12, 8, 8);
const bulbMat = new THREE.MeshBasicMaterial({color: 0xffeeaa}); // Warm yellow
for(let i = 1; i <= 4; i++) {
  const t = i / 5;
  const pos = stringCurve.getPoint(t);
  
  const bulb = new THREE.Mesh(bulbGeo, bulbMat);
  bulb.position.copy(pos);
  bulb.position.y -= 0.1; // hang slightly below string
  pcGroup.add(bulb);
  
  // Light source for the bulb
  const pLight = new THREE.PointLight(0xffeeaa, 1.0, 12);
  pLight.position.copy(bulb.position);
  pcGroup.add(pLight);
}

pcGroup.position.y = pcBldgHeight / 2;
pcBldg.add(pcGroup);
addWindowsToBuilding(pcBldg, pcBldgWidth, pcBldgHeight, pcBldgDepth, 0.6);
skyline.add(pcBldg);

// --- Prominent Radio Tower Building ---
// Add another specific building on the right side
const rtBldgWidth = 6;
const rtBldgHeight = 18; // Very tall, but fits in 30%
const rtBldgDepth = 6;
const rtBldgGeo = new THREE.BoxGeometry(rtBldgWidth, rtBldgHeight, rtBldgDepth);
const rtBldgMat = new THREE.MeshStandardMaterial({ 
  color: 0x242630, 
  roughness: 0.8,
  metalness: 0.1
});
const rtBldg = new THREE.Mesh(rtBldgGeo, rtBldgMat);

rtBldg.position.x = 35; // Right side
rtBldg.position.y = bottomY + rtBldgHeight / 2;
rtBldg.position.z = 5; // Foreground

const rtEdges = new THREE.EdgesGeometry(rtBldgGeo);
const rtLine = new THREE.LineSegments(rtEdges, new THREE.LineBasicMaterial({ color: 0x222233, transparent: true, opacity: 0.5 }));
rtBldg.add(rtLine);

// The Radio Tower Group
const rtGroup = new THREE.Group();

// Main spire with red aviation light
const spireGeo = new THREE.CylinderGeometry(0.1, 0.6, 6.0, 8);
const spireMat = new THREE.MeshStandardMaterial({color: 0x222233});
const spire = new THREE.Mesh(spireGeo, spireMat);
spire.position.y = 6.0 / 2;
rtGroup.add(spire);

const rtLightMeshGeo = new THREE.SphereGeometry(0.2, 8, 8);
const rtLightMeshMat = new THREE.MeshBasicMaterial({color: 0xff3333});
const rtLightMesh = new THREE.Mesh(rtLightMeshGeo, rtLightMeshMat);
rtLightMesh.position.y = 6.0;
rtGroup.add(rtLightMesh);

const rtLight = new THREE.PointLight(0xff0000, 5.0, 20);
rtLight.position.copy(rtLightMesh.position);
rtGroup.add(rtLight);
slowBlinkingLights.push(rtLight);

// Two tall poles
const rtPoleGeo = new THREE.CylinderGeometry(0.1, 0.4, 7.0, 8);
const rtPoleMat = new THREE.MeshStandardMaterial({color: 0x222233});

const pole1 = new THREE.Mesh(rtPoleGeo, rtPoleMat);
pole1.position.set(-1.5, 7.0 / 2, 0);
rtGroup.add(pole1);

const pole2 = new THREE.Mesh(rtPoleGeo, rtPoleMat);
pole2.position.set(1.5, 7.0 / 2, 0);
rtGroup.add(pole2);

// Antenna dish in the middle
const dishGeo = new THREE.SphereGeometry(0.8, 8, 8, 0, Math.PI);
const dishMat = new THREE.MeshStandardMaterial({color: 0x444455});
const dish = new THREE.Mesh(dishGeo, dishMat);
dish.rotation.x = Math.PI / 4;
dish.position.y = 1.0;
rtGroup.add(dish);

// Blue blinking lights at the tips (slow blink)
const blueLightMeshGeo = new THREE.SphereGeometry(0.2, 8, 8);
const blueLightMeshMat = new THREE.MeshBasicMaterial({color: 0x3388ff}); // Bright blue

const lightMesh1 = new THREE.Mesh(blueLightMeshGeo, blueLightMeshMat);
lightMesh1.position.set(-1.5, 7.0, 0);
rtGroup.add(lightMesh1);

const light1 = new THREE.PointLight(0x3388ff, 5.0, 20);
light1.position.copy(lightMesh1.position);
rtGroup.add(light1);
slowBlinkingLights.push(light1);

const lightMesh2 = new THREE.Mesh(blueLightMeshGeo, blueLightMeshMat);
lightMesh2.position.set(1.5, 7.0, 0);
rtGroup.add(lightMesh2);

const light2 = new THREE.PointLight(0x3388ff, 5.0, 20);
light2.position.copy(lightMesh2.position);
rtGroup.add(light2);
slowBlinkingLights.push(light2);

rtGroup.position.y = rtBldgHeight / 2;
rtBldg.add(rtGroup);
addWindowsToBuilding(rtBldg, rtBldgWidth, rtBldgHeight, rtBldgDepth, 0.3); // Fewer windows
skyline.add(rtBldg);

// Add Trees
const numTrees = 50;
for (let i = 0; i < numTrees; i++) {
  const treeSize = Math.random() * 1.5 + 1;
  const treeGeo = new THREE.SphereGeometry(treeSize, 8, 8);
  const tree = new THREE.Mesh(treeGeo, treeMaterial);
  tree.position.x = (Math.random() - 0.5) * 200;
  tree.position.y = bottomY + treeSize - 0.5; // Sit on the bottom
  tree.position.z = (Math.random() - 0.5) * 5 + 5; // Slightly closer than buildings
  skyline.add(tree);
}
skylineScene.add(skyline);

// Add Traffic (Cars)
const traffic = [];
const tailLightMaterial = new THREE.MeshBasicMaterial({ color: 0xff1111 }); // Red
const headLightMaterial = new THREE.MeshBasicMaterial({ color: 0xffffdd }); // White/Yellow
const carGeometry = new THREE.BoxGeometry(0.6, 0.3, 0.1);

for(let i=0; i<40; i++) {
  const isGoingRight = Math.random() > 0.5;
  const car = new THREE.Mesh(carGeometry, isGoingRight ? headLightMaterial : tailLightMaterial);
  
  car.position.x = (Math.random() - 0.5) * 200;
  // Position traffic low to the ground
  car.position.y = bottomY + Math.random() * 1.0 + 0.2; 
  car.position.z = Math.random() * 2 + 8; // In front of buildings/trees
  
  skylineScene.add(car);
  traffic.push({
    mesh: car,
    speed: (Math.random() * 0.15 + 0.05) * (isGoingRight ? 1 : -1)
  });
}

// Mouse parallax removed



// --- Animation Loop ---
let lastFireworkTime = 0;

function animate(time) {
  requestAnimationFrame(animate);

  // Camera is completely stationary

  // Blink aviation lights
  const blinkState = Math.sin(time * 0.005) > 0;
  blinkingLights.forEach(light => {
    light.intensity = blinkState ? 5.0 : 0.5;
  });

  // Slow blink blue lights
  const slowBlinkState = Math.sin(time * 0.0015) > 0;
  slowBlinkingLights.forEach(light => {
    light.intensity = slowBlinkState ? 5.0 : 0.5;
  });

  // Spawn new fireworks (reduced frequency)
  if (time - lastFireworkTime > (Math.random() * 1800 + 1460)) {
    fireworks.push(new Firework());

    lastFireworkTime = time;
  }

  // Update fireworks
  for (let i = fireworks.length - 1; i >= 0; i--) {
    if (!fireworks[i].update()) {
      fireworks[i].destroy();
      fireworks.splice(i, 1);
    }
  }

  // Update traffic
  traffic.forEach(car => {
    car.mesh.position.x += car.speed;
    // Wrap around screen (approximate view width is 100 on each side)
    if (car.mesh.position.x > 120) car.mesh.position.x = -120;
    if (car.mesh.position.x < -120) car.mesh.position.x = 120;
  });

  renderer.clear();
  renderer.render(scene, camera);
  renderer.clearDepth();
  renderer.render(skylineScene, skylineCamera);
}

animate(0);

// --- Handle Resize ---
window.addEventListener('resize', () => {
  const aspect = window.innerWidth / window.innerHeight;
  camera.aspect = aspect;
  camera.updateProjectionMatrix();
  skylineCamera.aspect = aspect;
  skylineCamera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// Interactive buttons
document.querySelector('.btn-commercial').addEventListener('click', () => {
  // Burst of fireworks!
  for(let i=0; i<5; i++) {
    setTimeout(() => {
      fireworks.push(new Firework());

    }, i * 150);
  }
});

document.querySelector('.btn-creative').addEventListener('click', () => {
  // A huge firework!
  const fw = new Firework();
  fw.material.size = 3.0; // Make particles bigger
  fireworks.push(fw);

});
