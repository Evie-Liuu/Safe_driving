import { GLTFLoader, DRACOLoader } from 'three-stdlib'

/**
 * Shared GLTF/DRACO loader singleton
 *
 * CRITICAL: Using a single DRACOLoader instance prevents WebAssembly memory exhaustion.
 * Each DRACOLoader instance creates its own WASM decoder, and multiple instances
 * competing for memory causes "Out of memory: Cannot allocate Wasm memory" errors.
 */
class SharedLoaderManager {
    private static instance: SharedLoaderManager
    private gltfLoader: GLTFLoader
    private dracoLoader: DRACOLoader

    private constructor() {
        // Create single DRACO loader instance
        this.dracoLoader = new DRACOLoader()
        this.dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/')

        // Create GLTF loader with DRACO support
        this.gltfLoader = new GLTFLoader()
        this.gltfLoader.setDRACOLoader(this.dracoLoader)
    }

    public static getInstance(): SharedLoaderManager {
        if (!SharedLoaderManager.instance) {
            SharedLoaderManager.instance = new SharedLoaderManager()
        }
        return SharedLoaderManager.instance
    }

    /**
     * Get the shared GLTFLoader with DRACO support
     */
    public getLoader(): GLTFLoader {
        return this.gltfLoader
    }

    /**
     * Get the shared DRACOLoader (rarely needed directly)
     */
    public getDracoLoader(): DRACOLoader {
        return this.dracoLoader
    }

    /**
     * Dispose of the loaders (call on app unmount)
     */
    public dispose(): void {
        this.dracoLoader.dispose()
    }
}

// Export singleton accessor
export const getSharedLoader = () => SharedLoaderManager.getInstance().getLoader()
export const getSharedDracoLoader = () => SharedLoaderManager.getInstance().getDracoLoader()
export const disposeSharedLoader = () => SharedLoaderManager.getInstance().dispose()
