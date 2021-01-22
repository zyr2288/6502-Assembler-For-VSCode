import { Mark } from "../Data/Mark";
import { GlobalVar } from "../GlobalVar";
import { TagDataGroup, Word } from "../Interface";
import Language from "../Language";
import { AddressType } from "../MyConst";
import { MyError } from "../MyError";

export interface AsmLineInstrumentTag {
	instrument: Word;
	expression?: Word;
	addressType: AddressType[];
}

export interface AsmLineCommandCommonTag {
	command: Word;
	expression: Word;
}

export interface AsmLineCommandDxTag {
	command: Word;
	part: Word[];
}

export interface AsmLineCommandDxGTag {
	command: Word;
	parts: TagDataGroup[];
}

export interface AsmLineCommandMacroTag {
	mark: Mark;
	command: Word;
	lines: AsmLine[];
}

/**编译行类型 */
export enum AsmLineType { None, Instrument, Command, Assign, Macro }

/**用于编译的行 */
export class AsmLine {

	address: number = -1;
	baseAddress: number = 0;
	text: Word = { text: "", startColumn: 0 };
	lineType: AsmLineType = AsmLineType.None;
	fileIndex: number = -1;
	lineNumber: number = -1;
	isFinished: boolean = false;
	mark?: Mark;
	result?: number[];
	resultLength: number = 0;
	tag?: any;

	//#region 设定起始地址
	/**
	 * 设定起始地址
	 * @param globalVar 全局变量
	 * @returns false为设置失败
	 */
	SetAddress(globalVar: GlobalVar): boolean {
		if (globalVar.address == undefined || globalVar.address < 0) {
			let err = new MyError(Language.ErrorMessage.SetStartAddress);
			err.SetPosition({
				fileIndex: this.fileIndex, lineNumber: this.lineNumber,
				startPosition: this.text.startColumn, length: this.text.text.length
			});
			MyError.PushError(err);
			return false;
		}

		if (this.address >= 0)
			return true;

		this.address = globalVar.address;
		this.baseAddress = globalVar.baseAddress;
		return true;
	}
	//#endregion 设定起始地址

	SetResult(code: number, op: number) {
		// @ts-ignore
		this.result[0] = code;
		switch (this.resultLength) {
			case 3:
				// @ts-ignore
				this.result[2] = (address >> 8) & 0xFF;
			case 2:
				// @ts-ignore
				this.result[1] = address & 0xFF;
				break;
		}
	}

}