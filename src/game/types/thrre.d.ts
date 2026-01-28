import * as THREE from 'three'

declare module 'three' {
    interface Mesh {
        original_material?: THREE.Material | THREE.Material[]
    }
}