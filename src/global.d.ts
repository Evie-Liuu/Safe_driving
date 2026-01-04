/// <reference types="@react-three/fiber" />
/// <reference types="react" />

import { Object3DNode } from '@react-three/fiber'
import * as THREE from 'three'
import type { ReactElement } from 'react'

declare global {
  namespace JSX {
    type Element = ReactElement

    interface IntrinsicElements {
      // Groups
      group: Object3DNode<THREE.Group, typeof THREE.Group>
      scene: Object3DNode<THREE.Scene, typeof THREE.Scene>

      // Meshes
      mesh: Object3DNode<THREE.Mesh, typeof THREE.Mesh>

      // Geometries
      boxGeometry: Object3DNode<THREE.BoxGeometry, typeof THREE.BoxGeometry>
      sphereGeometry: Object3DNode<THREE.SphereGeometry, typeof THREE.SphereGeometry>
      planeGeometry: Object3DNode<THREE.PlaneGeometry, typeof THREE.PlaneGeometry>
      cylinderGeometry: Object3DNode<THREE.CylinderGeometry, typeof THREE.CylinderGeometry>

      // Materials
      meshStandardMaterial: Object3DNode<THREE.MeshStandardMaterial, typeof THREE.MeshStandardMaterial>
      meshBasicMaterial: Object3DNode<THREE.MeshBasicMaterial, typeof THREE.MeshBasicMaterial>

      // Lights
      ambientLight: Object3DNode<THREE.AmbientLight, typeof THREE.AmbientLight>
      directionalLight: Object3DNode<THREE.DirectionalLight, typeof THREE.DirectionalLight>
      hemisphereLight: Object3DNode<THREE.HemisphereLight, typeof THREE.HemisphereLight>

      // Helpers
      gridHelper: Object3DNode<THREE.GridHelper, typeof THREE.GridHelper>

      // Others
      primitive: Object3DNode<THREE.Object3D, typeof THREE.Object3D> & {
        object: THREE.Object3D
      }
      fog: Object3DNode<THREE.Fog, typeof THREE.Fog>
      color: Object3DNode<THREE.Color, typeof THREE.Color>
    }
  }
}

export {}
