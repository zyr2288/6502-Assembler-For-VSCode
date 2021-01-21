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

export interface TagDataGroup {
	lineNumber: number;
	word: Word;
}