import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

/**
 * Procedural Wood & Bark Texture Generator
 * Computes high-fidelity, high-performance textures directly on the client side:
 * - 'bark': Rough, furrowed tree bark with dark brown crevices and light grey-green moss/lichen spots.
 * - 'linear': Polished premium dark mahogany linear grain.
 * - 'rings': Polished premium end-grain growth rings.
 * - 'raw_linear': Unpolished light sapwood linear grain.
 * - 'raw_rings': Unpolished light sapwood end-grain rings.
 */
function createProceduralWoodTexture(type = 'linear') {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = type === 'linear' || type === 'raw_linear' || type === 'bark' ? 256 : 512;
  const ctx = canvas.getContext('2d');

  if (type === 'bark') {
    ctx.fillStyle = '#2A1711';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = '#120806';
    for (let i = 0; i < 30; i++) {
      ctx.beginPath();
      let x = Math.random() * canvas.width;
      ctx.lineWidth = 4 + Math.random() * 8;
      ctx.globalAlpha = 0.4 + Math.random() * 0.4;
      ctx.moveTo(x, 0);
      for (let y = 0; y <= canvas.height; y += 20) {
        ctx.lineTo(x + Math.sin(y * 0.05) * 6, y);
      }
      ctx.stroke();
    }

    ctx.fillStyle = '#737C63';
    ctx.globalAlpha = 0.25;
    for (let i = 0; i < 180; i++) {
      const rx = Math.random() * canvas.width;
      const ry = Math.random() * canvas.height;
      const rad = 2 + Math.random() * 5;
      ctx.beginPath();
      ctx.arc(rx, ry, rad, 0, 2 * Math.PI);
      ctx.fill();
    }

    ctx.strokeStyle = '#3D261C';
    ctx.lineWidth = 1;
    ctx.globalAlpha = 0.3;
    for (let i = 0; i < 50; i++) {
      let x = Math.random() * canvas.width;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x + (Math.random() - 0.5) * 15, canvas.height);
      ctx.stroke();
    }
  } else if (type === 'linear') {
    const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
    grad.addColorStop(0, '#36140E');
    grad.addColorStop(0.3, '#4A1C14');
    grad.addColorStop(0.7, '#2F0F0A');
    grad.addColorStop(1, '#3B1710');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = '#1F0603';
    ctx.lineWidth = 1;
    for (let i = 0; i < 45; i++) {
      ctx.beginPath();
      let y = Math.random() * canvas.height;
      let amp = 4 + Math.random() * 8;
      let freq = 0.01 + Math.random() * 0.015;
      ctx.globalAlpha = 0.15 + Math.random() * 0.25;
      ctx.moveTo(0, y);
      for (let x = 0; x <= canvas.width; x += 10) {
        ctx.lineTo(x, y + Math.sin(x * freq) * amp + (Math.random() - 0.5) * 1.5);
      }
      ctx.stroke();
    }
  } else if (type === 'raw_linear') {
    ctx.fillStyle = '#E5C6A0';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = '#C9AA82';
    ctx.lineWidth = 1;
    for (let i = 0; i < 30; i++) {
      ctx.beginPath();
      let y = Math.random() * canvas.height;
      ctx.globalAlpha = 0.25 + Math.random() * 0.25;
      ctx.moveTo(0, y);
      for (let x = 0; x <= canvas.width; x += 15) {
        ctx.lineTo(x, y + Math.sin(x * 0.01) * 3);
      }
      ctx.stroke();
    }
  } else if (type === 'raw_rings') {
    ctx.fillStyle = '#DEC099';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const cx = canvas.width / 2;
    const cy = canvas.height * 1.15;
    ctx.lineWidth = 1.5;
    for (let r = 20; r < 600; r += 12) {
      ctx.strokeStyle = '#C0A078';
      ctx.globalAlpha = 0.25 + Math.random() * 0.25;
      ctx.beginPath();
      for (let theta = Math.PI; theta <= 2 * Math.PI; theta += 0.04) {
        const rad = r + Math.sin(theta * 6) * (r * 0.01);
        ctx.lineTo(cx + Math.cos(theta) * rad * 1.25, cy + Math.sin(theta) * rad);
      }
      ctx.stroke();
    }
  } else {
    ctx.fillStyle = '#32100A';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const cx = canvas.width / 2;
    const cy = canvas.height * 1.15;

    ctx.lineWidth = 1.8;
    for (let r = 20; r < 600; r += 10) {
      ctx.strokeStyle = r % 30 === 0 ? '#1E0502' : '#4E1D15';
      ctx.globalAlpha = 0.18 + Math.random() * 0.32;
      ctx.beginPath();
      for (let theta = Math.PI; theta <= 2 * Math.PI; theta += 0.04) {
        const rad = r + Math.sin(theta * 6) * (r * 0.015) + (Math.random() - 0.5) * 1.2;
        ctx.lineTo(cx + Math.cos(theta) * rad * 1.25, cy + Math.sin(theta) * rad);
      }
      ctx.stroke();
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

const RUBBER_COLOR = '#111111';

/**
 * Sub-component to render the engraved gold slot, emblem, and active laser beam for a specific side (front/back face)
 */
function LogoOnSide({ zSign, progress, isEngraving }) {
  const rotationY = zSign === -1 ? Math.PI : 0;

  // Load bicep.png directly with original colours — no processing
  const logoTexture = useMemo(() => {
    const loader = new THREE.TextureLoader();
    const texture = loader.load('/images/bicep.png', (tex) => {
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.needsUpdate = true;
    });
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.wrapS = THREE.ClampToEdgeWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    return texture;
  }, []);

  return (
    <group rotation={[0, rotationY, 0]}>
      {/* Pure logo displayed directly on the wood surface */}
      {progress > 0.1 && (
        <mesh
          position={[0, 0.02, 0.09]}
          scale={[progress, progress, 1]}
          renderOrder={1}
        >
          <planeGeometry args={[0.18, 0.18]} />
          <meshBasicMaterial
            map={logoTexture}
            transparent
            depthWrite={false}
            side={THREE.DoubleSide}
          />
        </mesh>
      )}

      {/* Active Laser Beam during engraving phase */}
      {isEngraving && progress < 0.99 && (
        <group>
          {/* Red laser beam shooting down */}
          <mesh position={[0, 0.61, 0.084]}>
            <cylinderGeometry args={[0.0025, 0.0025, 1.2, 8]} />
            <meshBasicMaterial color="#FF1A00" transparent opacity={0.9} toneMapped={false} />
          </mesh>
          <mesh position={[0, 0.61, 0.084]}>
            <cylinderGeometry args={[0.006, 0.006, 1.2, 8]} />
            <meshBasicMaterial color="#FF6600" transparent opacity={0.35} blending={THREE.AdditiveBlending} toneMapped={false} />
          </mesh>

          {/* Hot vaporizing plasma spark landing dot */}
          <mesh position={[0, 0.02, 0.092]}>
            <sphereGeometry args={[0.008, 16, 16]} />
            <meshBasicMaterial color="#FFFFFF" toneMapped={false} />
          </mesh>
          <mesh position={[0, 0.02, 0.092]}>
            <sphereGeometry args={[0.018, 16, 16]} />
            <meshBasicMaterial color="#FFCC00" transparent opacity={0.6} blending={THREE.AdditiveBlending} toneMapped={false} />
          </mesh>

          {/* Glowing dynamic heat pointlight */}
          <pointLight
            position={[0, 0.02, 0.1]}
            color="#FF4500"
            intensity={1.5}
            distance={0.4}
            decay={2}
          />
        </group>
      )}
    </group>
  );
}

/**
 * Laser Engraved Gold Emblem with local active laser beams on BOTH front and back faces
 */
function LaserLogo({ progress, isEngraving }) {
  return (
    <group>
      {/* Outward Face Only — no logo on the inward side where the bar connects */}
      <LogoOnSide zSign={1} progress={progress} isEngraving={isEngraving} />
    </group>
  );
}

/**
 * Single foot stand block with varnishing cross-fade & holographic nano-wireframe synthesis
 */
function FootBlock({
  position,
  animationOffset = [0, 0, 0],
  opacity = 1,
  rotation = [0, 0, 0],
  paintProgress = 0,
  logoProgress = 0,
  isEngraving = false,
  woodTextureRaw,
  woodTexturePolished,
  assemblyProgress = 0,
  logoTexture,
}) {
  const geometry = useMemo(() => {
    const shape = new THREE.Shape();
    const w = 0.28;
    const hBase = 0.24;
    const hTotal = 0.36;
    const wTop = 0.16;

    shape.moveTo(-w, 0);
    shape.lineTo(w, 0);
    shape.lineTo(w, hBase);
    shape.lineTo(wTop, hTotal);
    shape.lineTo(-wTop, hTotal);
    shape.lineTo(-w, hBase);
    shape.closePath();

    const extrudeSettings = {
      depth: 0.14,
      bevelEnabled: true,
      bevelThickness: 0.012,
      bevelSize: 0.012,
      bevelSegments: 4,
    };

    const geo = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    geo.center();
    return geo;
  }, []);

  // Golden holographic wireframe opacity (dissolves as solid wood forms)
  const holoOpacity = useMemo(() => {
    if (assemblyProgress < 0.25) return 0;
    if (assemblyProgress >= 0.44) return 0;
    return Math.sin((assemblyProgress - 0.25) / 0.19 * Math.PI) * 0.85;
  }, [assemblyProgress]);

  return (
    <group
      position={[
        position[0] + animationOffset[0],
        position[1] + animationOffset[1],
        position[2] + animationOffset[2],
      ]}
      rotation={rotation}
    >
      {/* 🚀 Holographic Golden Nano-Wireframe Synthesis */}
      {holoOpacity > 0.01 && (
        <mesh geometry={geometry}>
          <meshBasicMaterial
            color="#FFB84D"
            wireframe
            transparent
            opacity={holoOpacity}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
      )}

      {/* 1. Raw Wood */}
      {paintProgress < 1.0 && (
        <mesh geometry={geometry} castShadow receiveShadow>
          <meshStandardMaterial
            map={woodTextureRaw}
            roughness={0.9}
            metalness={0.02}
            transparent
            opacity={opacity * (1.0 - paintProgress)}
          />
        </mesh>
      )}

      {/* 2. Painted Mahogany */}
      {paintProgress > 0.0 && (
        <mesh geometry={geometry} castShadow receiveShadow>
          <meshStandardMaterial
            map={woodTexturePolished}
            roughness={0.16}
            metalness={0.06}
            envMapIntensity={1.6}
            transparent
            opacity={opacity * paintProgress}
          />
        </mesh>
      )}

      <mesh position={[-0.18, -0.18, 0]} castShadow>
        <boxGeometry args={[0.08, 0.016, 0.12]} />
        <meshStandardMaterial color={RUBBER_COLOR} roughness={0.9} transparent={opacity < 1} opacity={opacity} />
      </mesh>
      <mesh position={[0.18, -0.18, 0]} castShadow>
        <boxGeometry args={[0.08, 0.016, 0.12]} />
        <meshStandardMaterial color={RUBBER_COLOR} roughness={0.9} transparent={opacity < 1} opacity={opacity} />
      </mesh>

      {paintProgress > 0.3 && (
        <LaserLogo progress={logoProgress} isEngraving={isEngraving} />
      )}
    </group>
  );
}

/**
 * Cylindrical connector bar with varnishing & nano synthesis
 */
function Bar({
  position,
  animationOffset = [0, 0, 0],
  opacity = 1,
  length = 1.12,
  paintProgress = 0,
  woodTextureRaw,
  woodTexturePolished,
  emissiveIntensity = 0,
  assemblyProgress = 0,
}) {
  const holoOpacity = useMemo(() => {
    if (assemblyProgress < 0.25) return 0;
    if (assemblyProgress >= 0.44) return 0;
    return Math.sin((assemblyProgress - 0.25) / 0.19 * Math.PI) * 0.85;
  }, [assemblyProgress]);

  return (
    <group
      position={[
        position[0] + animationOffset[0],
        position[1] + animationOffset[1],
        position[2] + animationOffset[2],
      ]}
      rotation={[0, 0, Math.PI / 2]}
    >
      {/* 🚀 Holographic Golden Nano-Wireframe Synthesis */}
      {holoOpacity > 0.01 && (
        <mesh>
          <cylinderGeometry args={[0.0705, 0.0705, length, 16]} />
          <meshBasicMaterial
            color="#FFB84D"
            wireframe
            transparent
            opacity={holoOpacity}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
      )}

      {/* 1. Raw Bar */}
      {paintProgress < 1.0 && (
        <mesh castShadow receiveShadow>
          <cylinderGeometry args={[0.07, 0.07, length, 32]} />
          <meshStandardMaterial
            map={woodTextureRaw}
            roughness={0.85}
            metalness={0.02}
            transparent
            opacity={opacity * (1.0 - paintProgress)}
          />
        </mesh>
      )}

      {/* 2. Painted Bar */}
      {paintProgress > 0.0 && (
        <mesh castShadow receiveShadow>
          <cylinderGeometry args={[0.07, 0.07, length, 32]} />
          <meshStandardMaterial
            map={woodTexturePolished}
            roughness={0.2}
            metalness={0.04}
            envMapIntensity={1.8}
            emissive="#D4A574"
            emissiveIntensity={emissiveIntensity + (1.0 - paintProgress) * 0.1}
            transparent
            opacity={opacity * paintProgress}
          />
        </mesh>
      )}
    </group>
  );
}

/**
 * Single rigid wood parallette
 */
function SingleParallette({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  assemblyProgress = 1,
  phaseStart = 0,
  phaseEnd = 0.5,
  paintProgress = 0,
  logoProgress = 0,
  isEngraving = false,
  woodTextureLinear,
  woodTextureRings,
  woodTextureRawLinear,
  woodTextureRawRings,
  logoTexture,
}) {
  const BAR_LENGTH = 1.0;
  const HALF_BAR = BAR_LENGTH / 2;
  const barY = 0.22;

  const localState = useMemo(() => {
    const pGlobal = assemblyProgress;

    let p = 0;
    if (pGlobal > phaseStart) {
      p = Math.min((pGlobal - phaseStart) / (phaseEnd - phaseStart), 1);
    }

    const easedP = 1 - Math.pow(1 - p, 3);
    const pStands = Math.min(easedP / 0.5, 1);
    const pBar = easedP > 0.5 ? Math.min((easedP - 0.5) / 0.5, 1) : 0;

    let pulse = 0;
    if (easedP > 0.8 && easedP <= 1.0) {
      pulse = Math.sin((easedP - 0.8) / 0.2 * Math.PI) * 0.7;
    }

    return {
      leftOffset: [-(1 - pStands) * 2.0, (1 - pStands) * 1.5, 0],
      leftOpacity: Math.min(pStands * 2, 1),

      rightOffset: [(1 - pStands) * 2.0, (1 - pStands) * 1.5, 0],
      rightOpacity: Math.min(pStands * 2, 1),

      barOffset: [0, (1 - pBar) * 2.0, -(1 - pBar) * 1.5],
      barOpacity: Math.min(pBar * 2, 1),
      barPulse: pulse,
    };
  }, [assemblyProgress, phaseStart, phaseEnd]);

  return (
    <group position={position} rotation={rotation}>
      <FootBlock
        position={[-HALF_BAR, 0.18, 0]}
        rotation={[0, -Math.PI / 2, 0]}
        animationOffset={localState.leftOffset}
        opacity={localState.leftOpacity}
        paintProgress={paintProgress}
        logoProgress={logoProgress}
        isEngraving={isEngraving}
        woodTextureRaw={woodTextureRawRings}
        woodTexturePolished={woodTextureRings}
        assemblyProgress={assemblyProgress}
        logoTexture={logoTexture}
      />
      <FootBlock
        position={[HALF_BAR, 0.18, 0]}
        rotation={[0, Math.PI / 2, 0]}
        animationOffset={localState.rightOffset}
        opacity={localState.rightOpacity}
        paintProgress={paintProgress}
        logoProgress={logoProgress}
        isEngraving={isEngraving}
        woodTextureRaw={woodTextureRawRings}
        woodTexturePolished={woodTextureRings}
        assemblyProgress={assemblyProgress}
        logoTexture={logoTexture}
      />
      <Bar
        position={[0, barY, 0]}
        length={BAR_LENGTH + 0.12}
        animationOffset={localState.barOffset}
        opacity={localState.barOpacity}
        paintProgress={paintProgress}
        woodTextureRaw={woodTextureRawLinear}
        woodTexturePolished={woodTextureLinear}
        emissiveIntensity={localState.barPulse}
        assemblyProgress={assemblyProgress}
      />
    </group>
  );
}

/**
 * Premium Matte-Black Packaging Box with Gold Borders & Branding
 * Scaled up to be grander, and mathematically aligned so the parallettes rest perfectly on top of it.
 */
function PackagingBox({ position, opacity = 1 }) {
  return (
    <group position={position}>
      {/* Box Casing */}
      <mesh castShadow receiveShadow>
        <boxGeometry args={[2.4, 0.42, 1.6]} />
        <meshStandardMaterial
          color="#121212"
          roughness={0.75}
          metalness={0.15}
          transparent={opacity < 1}
          opacity={opacity}
        />
      </mesh>
      {/* Gold Foil Top Border Outlines */}
      <mesh position={[0, 0.211, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[2.3, 1.5]} />
        <meshStandardMaterial
          color="#D4A574"
          roughness={0.2}
          metalness={0.8}
          transparent={opacity < 1}
          opacity={opacity * 0.45}
          wireframe
        />
      </mesh>
      {/* Golden Foil Branding Text Plate */}
      <mesh position={[0, 0.212, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.4, 0.16]} />
        <meshStandardMaterial
          color="#D4A574"
          roughness={0.25}
          metalness={0.7}
          transparent={opacity < 1}
          opacity={opacity}
        />
      </mesh>
    </group>
  );
}

/**
 * Full Cinematic Showcase & Elegant Craftsmanship/Nano Synthesis Journey
 * 0.00 -> 0.20: Rugged Forest Log hovers and spins organically
 * 0.20 -> 0.34: Bark splits in two and peels away. Sapwood core reveals a glowing golden nano-honeycomb grid.
 * 0.34 -> 0.44: Golden Scanning Sweep Ring travels across unpolished wireframes to materialize solid wood.
 * 0.44 -> 0.64: Elegant staggered vector assembly (snapping in with glowing joints).
 * 0.64 -> 0.76: Varnishing wave paints light wood to rich dark mahogany.
 * 0.76 -> 0.86: Elegant Scanning Red Lasers engrave gold branding emblem.
 * 0.86 -> 1.00: Luxury packaging box rises and finished body drops to settle gracefully.
 */
export default function Parallettes({
  assemblyProgress = 1,
  isAssembled = true,
}) {
  const groupRef = useRef();
  const timeRef = useRef(0);

  // Procedural textures
  const woodTextureLinear = useMemo(() => createProceduralWoodTexture('linear'), []);
  const woodTextureRings = useMemo(() => createProceduralWoodTexture('rings'), []);
  const woodTextureRawLinear = useMemo(() => createProceduralWoodTexture('raw_linear'), []);
  const woodTextureRawRings = useMemo(() => createProceduralWoodTexture('raw_rings'), []);
  const barkTexture = useMemo(() => createProceduralWoodTexture('bark'), []);

  // Premium Vector Flexing Bicep Muscle Logo Canvas Texture (matching user image perfectly!)
  const logoTexture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    // Clear transparent background
    ctx.clearRect(0, 0, 512, 512);

    // Draw outer golden circular frame
    ctx.lineWidth = 14;
    ctx.strokeStyle = '#E2BA8F'; // Premium burnished gold foil
    ctx.beginPath();
    ctx.arc(256, 256, 225, 0, Math.PI * 2);
    ctx.stroke();

    // Draw flexing bicep arm muscle silhouette
    ctx.fillStyle = '#E2BA8F';
    ctx.beginPath();

    // Deltoid base at the bottom left
    ctx.moveTo(140, 270);

    // Deltoid curving up to rounded bicep peak (bulge)
    ctx.bezierCurveTo(150, 195, 200, 150, 260, 150); 

    // Bicep peak curving down to inner elbow bend/crease
    ctx.bezierCurveTo(285, 150, 310, 170, 320, 200); 

    // Inner forearm joint going up-right to wrist
    ctx.bezierCurveTo(330, 230, 350, 230, 370, 210); 

    // Forearm side rising up-left to hand/clenched fist
    ctx.bezierCurveTo(395, 190, 385, 130, 335, 100); 

    // Clenched fist fingers tucked in (flexing strength)
    ctx.bezierCurveTo(305, 100, 295, 120, 305, 140); 
    ctx.bezierCurveTo(315, 150, 330, 150, 340, 145); 

    // Outer forearm curve curving down-right to elbow joint
    ctx.bezierCurveTo(420, 105, 445, 215, 385, 280); 

    // Elbow curving down-left to tricep base back to deltoid
    ctx.bezierCurveTo(355, 315, 310, 315, 270, 315); 
    ctx.bezierCurveTo(200, 315, 140, 305, 140, 270); 

    ctx.closePath();
    ctx.fill();

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.ClampToEdgeWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    return texture;
  }, []);

  // Showcases slow continuous floating rotation after final packaging
  useFrame((state, delta) => {
    if (!groupRef.current) return;
    if (isAssembled) {
      timeRef.current += delta;
      groupRef.current.rotation.y = timeRef.current * 0.12;
      groupRef.current.position.y = -0.2 + Math.sin(timeRef.current * 0.7) * 0.04;
    }
  });

  const tiltAngle = useMemo(() => Math.asin(0.29 / 1.0), []);
  const topParallettePos = useMemo(() => [0, 0.145, -0.4785], []);

  // Programmatically perturbed organic geometries for 100% realism
  const perturbedLogGeometry = useMemo(() => {
    const geom = new THREE.CylinderGeometry(0.23, 0.24, 1.12, 32, 10);
    const pos = geom.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      const z = pos.getZ(i);
      if (Math.abs(y) < 0.55) {
        const angle = Math.atan2(z, x);
        const noise = (Math.sin(y * 8) * 0.015) + (Math.sin(angle * 6) * 0.008);
        pos.setX(i, x + Math.cos(angle) * noise);
        pos.setZ(i, z + Math.sin(angle) * noise);
      }
    }
    geom.computeVertexNormals();
    return geom;
  }, []);

  const perturbedBarkLeftGeom = useMemo(() => {
    const geom = new THREE.CylinderGeometry(0.245, 0.255, 1.14, 32, 10, true, 0, Math.PI);
    const pos = geom.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      const z = pos.getZ(i);
      if (Math.abs(y) < 0.56) {
        const angle = Math.atan2(z, x);
        const noise = (Math.sin(y * 8) * 0.015) + (Math.sin(angle * 6) * 0.008);
        pos.setX(i, x + Math.cos(angle) * noise);
        pos.setZ(i, z + Math.sin(angle) * noise);
      }
    }
    geom.computeVertexNormals();
    return geom;
  }, []);

  const perturbedBarkRightGeom = useMemo(() => {
    const geom = new THREE.CylinderGeometry(0.245, 0.255, 1.14, 32, 10, true, Math.PI, Math.PI);
    const pos = geom.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      const z = pos.getZ(i);
      if (Math.abs(y) < 0.56) {
        const angle = Math.atan2(z, x);
        const noise = (Math.sin(y * 8) * 0.015) + (Math.sin(angle * 6) * 0.008);
        pos.setX(i, x + Math.cos(angle) * noise);
        pos.setZ(i, z + Math.sin(angle) * noise);
      }
    }
    geom.computeVertexNormals();
    return geom;
  }, []);

  // ══════════════════════════════════════════════════
  // Detailed Cinematic Timeline Journey calculations (0.0 -> 1.0)
  // ══════════════════════════════════════════════════
  const stages = useMemo(() => {
    const p = assemblyProgress;

    // Phase 1 & 2: Rugged Forest Log & Stripping Bark (0.00 -> 0.34)
    const logActive = p < 0.34;

    // Bark peeling rotation/translation
    let peelProgress = 0;
    if (p >= 0.18) {
      peelProgress = Math.min((p - 0.18) / 0.16, 1.0);
    }
    const barkLeftRot = -peelProgress * 1.6;
    const barkRightRot = peelProgress * 1.6;
    const barkOffset = peelProgress * 1.8; // peels outward and drops
    const logCoreScale = p <= 0.20 ? 1.0 : p >= 0.32 ? 0.0 : 1.0 - (p - 0.20) / 0.12;
    const logPulse = p >= 0.18 && p <= 0.32 ? Math.sin((p - 0.18) / 0.14 * Math.PI) * 4.0 : 0;

    // Phase 3: Sanding/Materialization Ring Sweep (0.32 -> 0.66)
    // Ring sweeps from Z=1.0 down to Z=-0.24 (center of assembly) and stops there, then fades out gently!
    const sandingActive = p >= 0.32 && p < 0.66;
    
    // Sweeps from 1.0 to -0.24 from p=0.32 to 0.48
    const tSweep = Math.min(Math.max((p - 0.32) / 0.16, 0), 1.0);
    const sandingRingZ = 1.0 - tSweep * 1.24; // Stops exactly at -0.24!
    
    // Fades out from p=0.48 to 0.66
    const sandingOpacity = p <= 0.48 ? 1.0 : Math.max(0, 1.0 - (p - 0.48) / 0.18);

    // Phase 4: Staggered Assembly (0.44 -> 0.64)
    const pAssemblyActive = p >= 0.24;

    // Phase 5: Varnishing Wave (0.64 -> 0.76)
    const paintProgress = p <= 0.64 ? 0.0 : p >= 0.76 ? 1.0 : (p - 0.64) / 0.12;

    // Phase 6: Active Laser branding (0.76 -> 0.86)
    const isEngraving = p >= 0.76 && p < 0.86;
    const logoProgress = p <= 0.76 ? 0.0 : p >= 0.86 ? 1.0 : (p - 0.76) / 0.10;

    // Phase 7: Luxury Packaging Box Placement (0.86 -> 1.00)
    const pBoxSlide = p <= 0.86 ? 0.0 : p >= 0.98 ? 1.0 : (p - 0.86) / 0.12;
    const boxY = -1.8 + pBoxSlide * 1.59; // Rises from floor y = -1.8 to -0.21 (top face sits exactly at y = 0.0)
    const boxOpacity = pBoxSlide;
    const paralletteDropY = 0.03 + (1.0 - pBoxSlide) * 0.18; // Drops elegantly to rest with a premium micro-gap of 0.03 above the box

    // Nano-Machine Vector Connection Beams Opacity (active during early assembly phase)
    const nanoBeamsActive = p >= 0.38 && p < 0.54;
    const nanoBeamsOpacity = nanoBeamsActive ? Math.sin((p - 0.38) / 0.16 * Math.PI) * 0.6 : 0;

    return {
      logActive,
      barkLeftRot,
      barkRightRot,
      barkOffset,
      logCoreScale,
      logPulse,
      sandingActive,
      sandingRingZ,
      sandingOpacity,
      pAssemblyActive,
      paintProgress,
      isEngraving,
      logoProgress,
      boxY,
      boxOpacity,
      paralletteDropY,
      nanoBeamsActive,
      nanoBeamsOpacity,
    };
  }, [assemblyProgress]);

  return (
    <group ref={groupRef} scale={2.1} position={[0, -0.2, 0]}>

      {/* ═══ PHASE 1 & 2: RUGGED FOREST LOG & PEELING BARK STRIPS ═══ */}
      {stages.logActive && (
        <group position={[0, 0.05, -0.24]} rotation={[0, assemblyProgress * Math.PI * 2, 0]}>
          {/* Inner Glowing Sapwood Core with elegant Nano-Grid structure */}
          {stages.logCoreScale > 0.01 && (
            <group scale={stages.logCoreScale}>
              <mesh geometry={perturbedLogGeometry}>
                <meshStandardMaterial
                  map={woodTextureRawLinear}
                  roughness={0.9}
                  emissive="#FF9933"
                  emissiveIntensity={stages.logPulse}
                />
              </mesh>
              {/* Elegant golden holographic grid wrapped inside log */}
              <mesh geometry={perturbedLogGeometry}>
                <meshBasicMaterial
                  color="#FFB84D"
                  wireframe
                  transparent
                  opacity={stages.logPulse * 0.15}
                  blending={THREE.AdditiveBlending}
                />
              </mesh>
            </group>
          )}

          {/* Left Peeling Bark shell */}
          <group position={[-stages.barkOffset * 0.5, -stages.barkOffset * 0.6, 0]} rotation={[0, 0, stages.barkLeftRot]}>
            <mesh geometry={perturbedBarkLeftGeom} castShadow>
              <meshStandardMaterial
                map={barkTexture}
                roughness={0.95}
                bumpMap={barkTexture}
                bumpScale={0.05}
                transparent
                opacity={1.0 - stages.barkOffset * 0.5}
              />
            </mesh>
            {/* Top sapwood cut half-ring */}
            <mesh position={[0, 0.56, 0]} rotation={[Math.PI / 2, 0, 0]}>
              <circleGeometry args={[0.25, 16, 0, Math.PI]} />
              <meshStandardMaterial map={woodTextureRawRings} roughness={0.9} transparent opacity={1.0 - stages.barkOffset * 0.5} />
            </mesh>
          </group>

          {/* Right Peeling Bark shell */}
          <group position={[stages.barkOffset * 0.5, -stages.barkOffset * 0.6, 0]} rotation={[0, 0, stages.barkRightRot]}>
            <mesh geometry={perturbedBarkRightGeom} castShadow>
              <meshStandardMaterial
                map={barkTexture}
                roughness={0.95}
                bumpMap={barkTexture}
                bumpScale={0.05}
                transparent
                opacity={1.0 - stages.barkOffset * 0.5}
              />
            </mesh>
            <mesh position={[0, 0.56, 0]} rotation={[Math.PI / 2, 0, 0]}>
              <circleGeometry args={[0.25, 16, Math.PI, Math.PI]} />
              <meshStandardMaterial map={woodTextureRawRings} roughness={0.9} transparent opacity={1.0 - stages.barkOffset * 0.5} />
            </mesh>
          </group>
        </group>
      )}

      {/* ═══ PHASE 3: GOLDEN NANO-SCANNING & MATERIALIZATION RING ═══ */}
      {stages.sandingActive && (
        <group>
          {/* Double outer scanner rings */}
          <mesh position={[0, 0.24, stages.sandingRingZ]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.8, 0.015, 8, 48]} />
            <meshBasicMaterial color="#FFB84D" transparent opacity={stages.sandingOpacity} toneMapped={false} />
          </mesh>
          <mesh position={[0, 0.24, stages.sandingRingZ - 0.05]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.78, 0.005, 8, 48]} />
            <meshBasicMaterial color="#FF9933" transparent opacity={stages.sandingOpacity} toneMapped={false} />
          </mesh>
        </group>
      )}

      {/* ═══ ELEGANT NANO-MACHINE VECTOR CONNECTION BEAMS ═══ */}
      {stages.nanoBeamsActive && (
        <group>
          {/* Bottom parallette connection lasers */}
          <mesh position={[-0.25, 0.18, 0]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.002, 0.002, 0.5, 8]} />
            <meshBasicMaterial color="#FFD700" transparent opacity={stages.nanoBeamsOpacity} />
          </mesh>
          <mesh position={[0.25, 0.18, 0]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.002, 0.002, 0.5, 8]} />
            <meshBasicMaterial color="#FFD700" transparent opacity={stages.nanoBeamsOpacity} />
          </mesh>
          {/* Top parallette connection lasers */}
          <mesh position={[0, 0.18, -0.4785]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.002, 0.002, 0.5, 8]} />
            <meshBasicMaterial color="#FFD700" transparent opacity={stages.nanoBeamsOpacity} />
          </mesh>
        </group>
      )}



      {/* ═══ COMBINED RIGID PARALLETTE STRUCTURE ═══ */}
      {stages.pAssemblyActive && (
        <group position={[0, stages.paralletteDropY, 0]}>

          {/* Bottom Parallette */}
          <SingleParallette
            position={[0, 0, 0]}
            rotation={[0, 0, 0]}
            assemblyProgress={assemblyProgress}
            phaseStart={0.38}
            phaseEnd={0.52}
            paintProgress={stages.paintProgress}
            logoProgress={stages.logoProgress}
            isEngraving={stages.isEngraving}
            woodTextureLinear={woodTextureLinear}
            woodTextureRings={woodTextureRings}
            woodTextureRawLinear={woodTextureRawLinear}
            woodTextureRawRings={woodTextureRawRings}
            logoTexture={logoTexture}
          />

          {/* Top Parallette */}
          <SingleParallette
            position={topParallettePos}
            rotation={[-tiltAngle, Math.PI / 2, 0]}
            assemblyProgress={assemblyProgress}
            phaseStart={0.52}
            phaseEnd={0.66}
            paintProgress={stages.paintProgress}
            logoProgress={stages.logoProgress}
            isEngraving={stages.isEngraving}
            woodTextureLinear={woodTextureLinear}
            woodTextureRings={woodTextureRings}
            woodTextureRawLinear={woodTextureRawLinear}
            woodTextureRawRings={woodTextureRawRings}
            logoTexture={logoTexture}
          />

        </group>
      )}

      {/* ═══ PHASE 7: PREMIUM PACKAGING BOX ═══ */}
      {stages.boxOpacity > 0.01 && (
        <PackagingBox
          position={[0, stages.boxY, -0.24]}
          opacity={stages.boxOpacity}
        />
      )}

      {/* Ground shadows catcher */}
      {isAssembled && (
        <mesh
          rotation={[-Math.PI / 2, 0, 0]}
          position={[0, -0.425, -0.4]}
          receiveShadow
        >
          <planeGeometry args={[2.5, 2.5]} />
          <shadowMaterial opacity={0.15} />
        </mesh>
      )}

    </group>
  );
}
