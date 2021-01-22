import { AsmLine } from "./AsmLine/AsmLine";
import { Macro } from "./Data/Macro";
import { GlobalVar } from "./GlobalVar";

export interface Word {
	text: string;
	startColumn: number;
}

export enum CompileType {
	FirstTime, CenterTime, LastTime
}

export interface ReplaceMark {
	text: Word;
	expression?: Word;
}


export interface MyParameters {
	globalVar: GlobalVar;
	allAsmLine: AsmLine[];
	index: number;
	macro?: Macro;
}

export interface TagDataGroup {
	lineNumber: number;
	word: Word;
}

