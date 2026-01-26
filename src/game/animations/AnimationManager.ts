import { GLTFLoader } from 'three-stdlib'
import type { GLTF } from 'three-stdlib'

/**
 * Manager for handling shared animations
 * Pre-loads and caches animations to avoid loading duplications and runtime delays
 */
export class AnimationManager {
    private static instance: AnimationManager
    private animationCache: Map<string, GLTF> = new Map()
    private loader: GLTFLoader

    constructor() {
        this.loader = new GLTFLoader()
    }

    public static getInstance(): AnimationManager {
        if (!AnimationManager.instance) {
            AnimationManager.instance = new AnimationManager()
        }
        return AnimationManager.instance
    }

    /**
     * Load a list of animation URLs
     */
    public async loadAnimations(urls: string[]): Promise<void> {
        // Filter out duplicates and already loaded animations
        const uniqueUrls = [...new Set(urls)].filter(url => !this.animationCache.has(url))

        if (uniqueUrls.length === 0) return

        console.log(`[AnimationManager] 📥 Pre-loading ${uniqueUrls.length} animations...`)

        const loadPromises = uniqueUrls.map(url => this.loadSingleAnimation(url))

        await Promise.all(loadPromises)

        console.log(`[AnimationManager] ✅ All animations loaded. Cache size: ${this.animationCache.size}`)
    }

    /**
     * Load a single animation file
     */
    private loadSingleAnimation(url: string): Promise<void> {
        return new Promise((resolve, reject) => {
            this.loader.load(
                url,
                (gltf) => {
                    this.animationCache.set(url, gltf)
                    console.log(`[AnimationManager] ✅ Cached: ${url}`)
                    resolve()
                },
                undefined,
                (error) => {
                    console.error(`[AnimationManager] ❌ Failed to load: ${url}`, error)
                    // Resolve anyway to not break Promise.all
                    resolve()
                }
            )
        })
    }

    /**
     * Get a cached animation
     */
    public getAnimation(url: string): GLTF | undefined {
        return this.animationCache.get(url)
    }

    /**
     * Check if an animation is loaded
     */
    public hasAnimation(url: string): boolean {
        return this.animationCache.has(url)
    }

    /**
     * Clear cache
     */
    public dispose(): void {
        this.animationCache.clear()
    }
}
