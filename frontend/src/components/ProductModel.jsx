import React, { useRef, useMemo } from 'react';
import { useGLTF, Decal, useTexture } from '@react-three/drei';
import * as THREE from 'three';

export default function ProductModel({ productType, modelUrl, color, designUrl, decalPos, decalRot, decalScale }) {
  // Load the 3D model (always loads shirt_baked as fallback for hooks, but we might not use it)
  const { scene } = useGLTF(modelUrl);
  
  // Clone the scene so we can mutate the material color without affecting other instances
  const clonedScene = useMemo(() => scene.clone(), [scene]);
  
  // Apply color to all meshes in the model
  useMemo(() => {
    clonedScene.traverse((child) => {
      if (child.isMesh) {
        // Retain original textures/roughness but change the base color
        child.material = child.material.clone();
        child.material.color.set(color);
        child.material.needsUpdate = true;
      }
    });
  }, [clonedScene, color]);
  
  // If there's a design URL, create a texture
  const decalTexture = useTexture(designUrl || 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII='); // tiny transparent 1x1 png fallback
  decalTexture.anisotropy = 16;
  
  // Find the primary mesh to apply the decal to. 
  // In a real scenario, you'd find a specific mesh by name (e.g. "TShirt_Mesh")
  let targetMesh = null;
  clonedScene.traverse((child) => {
    if (child.isMesh && !targetMesh) {
      targetMesh = child;
    }
  });

  // -----------------------------------------------------
  // Custom Primitives for Cap and Hoodie
  // -----------------------------------------------------
  if (productType === 'Cap') {
    return (
      <group position={[0, -0.1, 0]}>
        {/* Crown */}
        <mesh position={[0, 0, 0]}>
           <sphereGeometry args={[0.3, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
           <meshStandardMaterial color={color} roughness={0.8} />
           {designUrl && (
             <Decal
               position={[decalPos.x, decalPos.y + 0.1, decalPos.z + 0.15]}
               rotation={[decalRot.x, decalRot.y, decalRot.z]}
               scale={[decalScale.x, decalScale.y, decalScale.z]}
               map={decalTexture}
             />
           )}
        </mesh>
        
        {/* Brim (Flattened Hemisphere pointing forward) */}
        <mesh position={[0, -0.02, 0.15]} scale={[1.05, 0.2, 1.2]} rotation={[-0.1, 0, 0]}>
           <sphereGeometry args={[0.3, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
           <meshStandardMaterial color={color} roughness={0.8} />
        </mesh>
        
        {/* Button */}
        <mesh position={[0, 0.3, 0]}>
           <sphereGeometry args={[0.04, 16, 16]} />
           <meshStandardMaterial color={color} roughness={0.8} />
        </mesh>
      </group>
    );
  }

  if (productType === 'Hoodie') {
    return (
      <group position={[0, -0.1, 0]}>
        {/* Torso (Tapered cylinder) */}
        <mesh position={[0, 0, 0]} scale={[1, 1, 0.6]}>
           <cylinderGeometry args={[0.28, 0.38, 0.8, 32]} />
           <meshStandardMaterial color={color} roughness={0.9} />
           {designUrl && (
             <Decal
               position={[decalPos.x, decalPos.y + 0.1, decalPos.z + 0.35]}
               rotation={[decalRot.x, decalRot.y, decalRot.z]}
               scale={[decalScale.x, decalScale.y, decalScale.z]}
               map={decalTexture}
             />
           )}
        </mesh>
        
        {/* Sleeves (Tapered, starting from shoulders) */}
        <mesh position={[-0.35, 0.15, 0]} rotation={[0, 0, -0.5]}>
           <cylinderGeometry args={[0.12, 0.08, 0.65, 16]} />
           <meshStandardMaterial color={color} roughness={0.9} />
        </mesh>
        <mesh position={[0.35, 0.15, 0]} rotation={[0, 0, 0.5]}>
           <cylinderGeometry args={[0.12, 0.08, 0.65, 16]} />
           <meshStandardMaterial color={color} roughness={0.9} />
        </mesh>
        
        {/* Hood (Resting down on the back/neck like a Torus) */}
        <mesh position={[0, 0.38, -0.05]} rotation={[1.5, 0, 0]} scale={[1, 1, 1.2]}>
           <torusGeometry args={[0.16, 0.08, 16, 32, Math.PI * 1.5]} />
           <meshStandardMaterial color={color} roughness={0.9} />
        </mesh>
        <mesh position={[0, 0.38, -0.1]} rotation={[1.5, 0, 0]} scale={[1, 1, 1.2]}>
           <sphereGeometry args={[0.18, 16, 16]} />
           <meshStandardMaterial color={color} roughness={0.9} />
        </mesh>
        
        {/* Pocket */}
        <mesh position={[0, -0.25, 0.23]} rotation={[0.05, 0, 0]}>
           <boxGeometry args={[0.35, 0.2, 0.02]} />
           <meshStandardMaterial color={color} roughness={0.9} />
        </mesh>
      </group>
    );
  }

  // -----------------------------------------------------
  // T-Shirt Logic (Original GLB)
  // -----------------------------------------------------
  return (
    <group dispose={null}>
      <primitive object={clonedScene} />
      
      {/* We apply the Decal to the target mesh */}
      {targetMesh && designUrl && (
        <mesh geometry={targetMesh.geometry} position={targetMesh.position} rotation={targetMesh.rotation} scale={targetMesh.scale}>
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
          <Decal
            position={[decalPos.x, decalPos.y, decalPos.z]}
            rotation={[decalRot.x, decalRot.y, decalRot.z]}
            scale={[decalScale.x, decalScale.y, decalScale.z]}
            map={decalTexture}
          />
        </mesh>
      )}
    </group>
  );
}

// Ensure Drei can preload the standard models (placeholder URLs)
useGLTF.preload('https://raw.githubusercontent.com/pmndrs/drei-assets/master/shirt_baked.glb'); // Actually, let's just make sure this doesn't crash if it 404s
