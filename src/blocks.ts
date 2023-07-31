import { BoxGeometry, CylinderGeometry, InstancedBufferGeometry, Object3D } from "three"
import { state } from "./state"
import { Chunk } from "./chunk"

let _blocksCounter = 0
let _blockManager: BlockManager = null

export type FSiblingIteratee = (dx: number, dy: number, dz: number, sibling: Block) => void

export type FBlocksGridIteratee = (x: number, y: number, z: number, block?: Block) => void
export type FBlocksGridIterateeXZ = (x: number, z: number) => void

export type FChunkGridIteratee = (x: number, y: number, z: number, block?: Block) => void
export type FChunkGridIterateeXZ = (x: number, z: number) => void

export enum BlockShape {
    Cube,
    Prism6
}

export enum BlockType {
    None,
    Gravel,
    Rock,
    Dirt,
    Sand,
    Bedrock,
    Water,
    Pumpkin
}

export interface IBlockTable {
    [x: string]: {
        tile: number[],
        light?: boolean
    }
}

export const blockTable: IBlockTable = {
    [BlockType.None]: {
        tile: [0, 0],
    },
    [BlockType.Gravel]: {
        tile: [0, 0]
    },
    [BlockType.Rock]: {
        tile: [0, 1]
    },
    [BlockType.Dirt]: {
        tile: [2, 0],
    },
    [BlockType.Sand]: {
        tile: [2, 1]
    },
    [BlockType.Bedrock]: {
        tile: [1, 1]
    },
    [BlockType.Water]: {
        tile: [15, 13]
    },
    [BlockType.Pumpkin]: {
        tile: [8, 7],
        light: true
    }
}

export class Block {
    static getShapeGeometry(): InstancedBufferGeometry {
        switch (state.blockShape) {
            case BlockShape.Prism6: {
                let g = new CylinderGeometry(1, 1, 1, 6) as any as InstancedBufferGeometry
                g.scale(1 / 1.732, 1, 1 / 1.5);
                return g;
            }
            default: {
                let g = new BoxGeometry(1, 1, 1) as any as InstancedBufferGeometry
                g.translate(0, 0.5, 0)
                return g
            }
        }
    }


    bx: number = null
    by: number = null
    bz: number = null
    bid: string = null
    btype: BlockType = BlockType.None
    // instanceIndex: number = null
    lightness: number = 1
    serial: number = null
    needsUpdate: boolean = true

    get tileX(): number {
        return blockTable[this.btype].tile[0]
    }

    get tileY(): number {
        return blockTable[this.btype].tile[1]
    }

    get isLightSource(): boolean {
        return blockTable[this.btype].light === true
    }

    constructor({ x, y, z, chunk, lightness, blockType }) {

        // if (_blockManager.getBlockAt(x, y, z)) {
        //     // return BlocksManager.getBlockAt(x, y, z)
        // }

        this.bx = x;
        this.by = y;
        this.bz = z;
        this.bid = _blockManager.getBlockId(x, y, z);

        this.serial = _blocksCounter
        _blocksCounter++

        _blockManager.setBlock(this)
        this.update({ lightness, blockType })
        this.needsUpdate = true
    }

    kill() {
        delete _blockManager.blocks[this.bid]
    }

    iterateSiblings(distance: number = 1, iteratee: FSiblingIteratee) {
        distance = Math.round(distance)
        for (let x = -distance; x <= distance; x++) {
            for (let y = -distance; y <= distance; y++) {
                for (let z = -distance; z <= distance; z++) {
                    iteratee(x, y, z, _blockManager.getBlockAt(x + this.bx, y + this.by, z + this.bz))
                }
            }
        }
    }
    update({ lightness, blockType }): boolean {
        let changed = (lightness !== this.lightness) || (blockType !== this.btype)
        this.lightness = lightness
        this.btype = blockType
        this.needsUpdate = changed
        return changed
    }
}


export class BlockManager {

    static instance: BlockManager = null
    static getInstance(): BlockManager {
        if (BlockManager.instance === null) {
            BlockManager.instance = new BlockManager()
        }

        return BlockManager.instance
    }

    blocks: {
        [x: string]: Block
    } = {}

    constructor() {
        _blockManager = this
    }

    setBlock(block: Block): void {
        this.blocks[block.bid] = block
    }
    removeBlock(block: Block) {
        delete this.blocks[block.bid]
    }
    getBlockAt(x: number, y: number, z: number): Block {
        return this.blocks[this.getBlockId(x, y, z)]
    }
    getBlockId(...args: number[]): string {
        return args.join('_')
    }
    getMostElevatedBlockAt(x: number, z: number): Block {
        let r: Block = null

        for (let i = 0; i < state.worldHeight; i++) {
            let b = this.getBlockAt(x, i, z)
            if (b) {
                r = b
            }
        }

        return r
    }
    getElevationAt(x: number, z: number): number {
        let r: number = 0

        for (let i = 0; i < state.worldHeight; i++) {
            let b = this.getBlockAt(x, i, z)
            if (b) {
                r = i
            }
        }

        return r
    }


    get maxBlocksPerChunk(): number {
        return state.chunkSize * state.chunkSize * state.worldHeight
    }

    // iterateGrid(fx: number, fy: number, fz: number, tx: number, ty: number, tz: number, iteratee: FBlocksGridIteratee) {
    //     for (let z = fz; z < tz; z++) {
    //         for (let x = fx; x < tx; x++) {
    //             for (let y = fy; y < ty; y++) {
    //                 iteratee(x, y, z, this.getBlockAt(x, y, z))
    //             }
    //         }
    //     }
    // }

    iterateGridXZ(fx: number, fz: number, tx: number, tz: number, iteratee: FBlocksGridIterateeXZ) {
        for (let z = fz; z < tz; z++) {
            for (let x = fx; x < tx; x++) {
                iteratee(x, z)
            }
        }
    }

    traverseChunk(cx: number, cz: number, iteratee: FChunkGridIteratee) {
        // this.iterateGrid(
        //     cx * state.chunkSize,
        //     0,
        //     cz * state.chunkSize,
        //     cx * state.chunkSize + state.chunkSize,
        //     state.worldHeight,
        //     cz * state.chunkSize + state.chunkSize,
        //     iteratee
        // );

        for (let z = 0; z < state.chunkSize; z++) {
            for (let x = 0; x < state.chunkSize; x++) {
                for (let y = 0; y < state.worldHeight; y++) {
                    iteratee(x + (cx * state.chunkSize), y, z + (cz * state.chunkSize), this.getBlockAt(x + (cx * state.chunkSize), y, z + (cz * state.chunkSize)))
                }
            }
        }
    }

    traverseChunk2D(cx: number, cz: number, iteratee: FChunkGridIterateeXZ) {
        this.iterateGridXZ(
            cx * state.chunkSize,
            cz * state.chunkSize,
            cx * state.chunkSize + state.chunkSize,
            cz * state.chunkSize + state.chunkSize,
            iteratee
        );
    }

    markBlocksUpdated(cx: number, cz: number): void {
        blockManager.traverseChunk(cx, cz, (x, y, z, block) => {
            if (block) {
                block.needsUpdate = false
            }
        })
    }


    countBlocksNeedUpdate(cx: number, cz: number): number {
        let i = 0;
        blockManager.traverseChunk(cx, cz, (x, y, z, block) => {
            if (block && block.needsUpdate) {
                i++
            }
        })
        return i
    }

}


export const blockManager: BlockManager = BlockManager.getInstance()