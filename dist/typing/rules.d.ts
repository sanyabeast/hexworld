import { BlockType } from "./blocks";
export declare enum EBlockReplacingStrategy {
    DontReplace = 0,
    Replace = 1,
    OnlyReplace = 2,
    Stack = 3
}
export interface IBlockPlacement {
    blockType: BlockType;
    offset: number[];
}
export interface IBlocksGenerationRule {
    structure: IBlockPlacement[];
    create: IBlockCreationRule[];
}
export declare enum EBlockCreationSource {
    Constant = 0,
    Simplex = 1,
    Perlin = 2
}
export interface IBlockCreationSourceParams {
    seed?: number;
    scale?: number;
    iterations?: number;
    scaleStep?: number;
    multiplier?: number;
    addent?: number;
}
export interface IBlockCreationLevels {
    min: number;
    max: number;
}
export interface IBlockCreationRule {
    source: EBlockCreationSource;
    params: IBlockCreationSourceParams;
    replace: EBlockReplacingStrategy;
    levels: IBlockCreationLevels[];
}
export declare const rules: IBlocksGenerationRule[];
