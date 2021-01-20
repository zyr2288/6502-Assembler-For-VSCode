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