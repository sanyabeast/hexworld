import { DirectionalLight, Group, TextureLoader, EquirectangularReflectionMapping, SRGBColorSpace, HemisphereLight, Fog, FogExp2, Color, Light, Scene, AmbientLight } from "three";
import { Lensflare, LensflareElement } from "three/examples/jsm/objects/LensFlare"
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';
import { rgbeLoader, textureLoader } from "./loaders";
import { featureLevel, state } from "./state";
import { clamp, lerp } from "./utils";
import { throttle } from "lodash";

const _envUpdateRateLimit = 15


interface IFlareData {
    texture: string
    size: number
    distance: number
    color: any
}


const flaresTable = [
    {
        texture: 'assets/flares/lensflare0.png',
        size: 700,
        distance: 0,
        color: 0xFFFFFF,
    },
    {
        texture: 'assets/flares/lensflare3.png',
        size: 60,
        distance: 0.6,
        color: 0xFFFFFF,
    },
    {
        texture: 'assets/flares/lensflare3.png',
        size: 70,
        distance: 0.7,
        color: 0xFFFFFF,
    },
    {
        texture: 'assets/flares/lensflare3.png',
        size: 120,
        distance: 0.9,
        color: 0xFFFFFF,
    },
    {
        texture: 'assets/flares/lensflare3.png',
        size: 70,
        distance: 1,
        color: 0xFFFFFF,
    }
]

export class Environment extends Group {
    sun: DirectionalLight = null
    ambient: AmbientLight = null
    fog: FogExp2 = null
    daytime: number = 0.9
    dayspeed: number = 1 / 2048
    sunRotationRadius: number = state.worldHeight * 32
    sunElevation: number = 2
    minSunIntensity: number = -0.5
    maxSunIntensity: number = 0.5

    minAmbIntensity: number = 0.01
    maxAmbIntensity: number = 0.5

    constructor({ scene, camera, renderer }) {
        super()

        this.fog = new FogExp2(new Color(0x777777), 0.005)

        if (featureLevel > 0) {
            scene.fog = this.fog
        }

        let sun = this.sun = new DirectionalLight(0xfffeee, 1)
        sun.position.set(0.5, 1, -0.5);
        scene.add(sun)

        if (featureLevel > 0) {
            Environment.addFlares(sun, scene)
        }

        if (featureLevel == 0) {
            this.ambient = new AmbientLight(0xffffff, 0.2)
            scene.add(this.ambient)
        }

        // Create the lens flare object

        let envMap = rgbeLoader.load('assets/hdr/quarry.hdr', () => {
            envMap.mapping = EquirectangularReflectionMapping;
            envMap.colorSpace = SRGBColorSpace;

            scene.background = envMap;
            scene.environment = envMap;
            scene.backgroundIntensity = 1
            scene.backgroundBlurriness = 1
        });

        this.update = throttle(this.update.bind(this), 1000 / _envUpdateRateLimit)
        this.update(0)
    }

    update(frameDelta: number) {
        let sunHeight = clamp(Math.sin(this.daytime * Math.PI * 2) + 0.5, -1, 1)
        let backgroundIntensity = clamp(sunHeight + 0.1, 0, 1)

        let angle = this.daytime * Math.PI * 2;
        let sunX = Math.cos(angle) * this.sunRotationRadius;
        let sunZ = Math.sin(angle) * this.sunRotationRadius;
        this.sun.intensity = clamp(lerp(this.minSunIntensity, this.maxSunIntensity, clamp(sunHeight, 0, 1)), 0, 1)

        this.sun.position.set(sunX, sunHeight * this.sunRotationRadius * this.sunElevation, sunZ);
        if (featureLevel > 0) {
            (this.sun as any).flare.position.copy(this.sun.position);
        }


        (state.scene as any).backgroundIntensity = backgroundIntensity;

        if (featureLevel > 0) {
            let envMapIntensity = lerp(this.minAmbIntensity, this.maxAmbIntensity, clamp(sunHeight, 0, 1))
            state.scene.traverse((object: any) => {
                if (object.isMesh) {
                    object.material.envMapIntensity = envMapIntensity
                }
            })
        } else {
            let ambIntensity = lerp(this.minAmbIntensity, this.maxAmbIntensity, clamp(sunHeight, 0, 1))
            this.ambient.intensity = ambIntensity
        }


        this.daytime += this.dayspeed * frameDelta
    }

    static addFlares(light: Light, scene: Scene, count: number = 5) {
        const lensflare = new Lensflare();
        flaresTable.forEach((flareData, index) => {
            if (index < count) {
                const lensFlareTexture = textureLoader.load(flareData.texture);
                lensflare.addElement(new LensflareElement(lensFlareTexture, flareData.size, flareData.distance, new Color(0xffffff)));
                // lensflare.position.copy(light.position);
                console.log(lensflare)
            }
        })

        scene.add(lensflare);
        (light as any).flare = lensflare
    }
}