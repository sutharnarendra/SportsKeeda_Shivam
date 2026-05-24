import { useRef, useState, useEffect, useCallback } from 'react';
import { Canvas } from '@react-three/fiber';
import { Environment, ContactShadows, OrbitControls } from '@react-three/drei';
import { useLocation } from 'react-router-dom';
import Parallettes from './Parallettes';
import { useSceneStore } from '../../store/sceneStore';

/**
 * Main Three.js Scene — Full-screen background canvas
 * Handles the assembly animation timing and renders the 3D product
 */
export default function Scene({ onAssemblyComplete }) {
  const [assemblyProgress, setAssemblyProgress] = useState(0);
  const [isAssembled, setIsAssembled] = useState(false);
  const animFrameRef = useRef(null);
  const startTimeRef = useRef(null);
  const setAssembled = useSceneStore((state) => state.setAssembled);
  const location = useLocation();

  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const ASSEMBLY_DURATION = 9500; // 9.5 seconds majestic creation journey

  const animate = useCallback((timestamp) => {
    if (!startTimeRef.current) startTimeRef.current = timestamp;
    const elapsed = timestamp - startTimeRef.current;
    const progress = Math.min(elapsed / ASSEMBLY_DURATION, 1);

    setAssemblyProgress(progress);

    if (progress < 1) {
      animFrameRef.current = requestAnimationFrame(animate);
    } else {
      setIsAssembled(true);
      setAssembled(true);
      onAssemblyComplete?.();
    }
  }, [onAssemblyComplete, setAssembled]);

  // Handle logo (restart) and home (skip) clicks
  useEffect(() => {
    if (location.state?.restartAnimation) {
      // Clear location state first so it doesn't loop
      window.history.replaceState({}, document.title);

      // Reset animation states
      setIsAssembled(false);
      setAssembled(false);
      setAssemblyProgress(0);
      startTimeRef.current = null;

      // Re-trigger assembly animation
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = requestAnimationFrame(animate);
    } else if (location.state?.skipAnimation) {
      // Clear location state
      window.history.replaceState({}, document.title);

      // Instantly finish animation
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      setIsAssembled(true);
      setAssembled(true);
      setAssemblyProgress(1);
    }
  }, [location.state, animate, setAssembled]);

  useEffect(() => {
    // Only run initial auto-assembly if not skipped or restarted by location state
    if (location.state?.skipAnimation || location.state?.restartAnimation) return;

    const timeout = setTimeout(() => {
      animFrameRef.current = requestAnimationFrame(animate);
    }, 400);

    return () => {
      clearTimeout(timeout);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [animate, location.state]);

  return (
    <Canvas
      camera={{
        position: isMobile ? [4, 3.2, 5.5] : [3, 2.5, 4],
        fov: isMobile ? 52 : 40,
        near: 0.1,
        far: 100,
      }}
      shadows
      dpr={[1, 2]}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: isAssembled ? 'auto' : 'none',
      }}
      gl={{
        antialias: true,
        alpha: true,
        powerPreference: 'high-performance',
      }}
    >
      {/* Ambient light for base illumination */}
      <ambientLight intensity={0.4} color="#FDF8F3" />

      {/* Main directional light (warm sunlight) */}
      <directionalLight
        position={[5, 8, 5]}
        intensity={1.2}
        color="#FFF5E6"
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-camera-near={0.5}
        shadow-camera-far={30}
        shadow-camera-left={-5}
        shadow-camera-right={5}
        shadow-camera-top={5}
        shadow-camera-bottom={-5}
      />

      {/* Fill light from opposite side */}
      <directionalLight
        position={[-3, 4, -3]}
        intensity={0.4}
        color="#E8D5C0"
      />

      {/* Rim light for premium edge highlight */}
      <pointLight
        position={[0, 3, -5]}
        intensity={0.3}
        color="#D4A574"
      />

      {/* The parallettes model */}
      <Parallettes
        assemblyProgress={assemblyProgress}
        isAssembled={isAssembled}
      />

      {/* Contact shadows on the ground */}
      <ContactShadows
        position={[0, -0.3, 0]}
        opacity={0.25}
        scale={8}
        blur={2.5}
        far={4}
        color="#5C3D2E"
      />

      {/* Environment lighting (studio preset) */}
      <Environment preset="studio" />

      {/* Orbit controls — only after assembly */}
      {isAssembled && (
        <OrbitControls
          enablePan={false}
          enableZoom={false}
          autoRotate={false}
          maxPolarAngle={Math.PI / 2}
          minPolarAngle={Math.PI / 4}
          dampingFactor={0.05}
          enableDamping
        />
      )}
    </Canvas>
  );
}
