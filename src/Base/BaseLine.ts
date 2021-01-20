import { Mark } from "../Data/Mark";
import { GlobalVar } from "../GlobalVar";
import { Word } from "../Interface";
import { AddressType } from "../MyConst";

/**基础行类型 */
export enum BaseLineType {
	/**无 */
	None,
	/**编译指令 */
	Instrument,
	/**编译器命令 */
	Command,
	/**赋值 */
	Assign,
	/**只有Mark */
	OnlyMark,
	/**自定义函数 */
	Macro
}

export enum InCommand { None, Macro }

export interface BaseLine {
	text: Word;
	lineType: BaseLineType;
	fileIndex: number;
	lineNumber: number;
	mark?: Mark;
	comOrOp?: Word;
	expression?: Word;
	addressType?: AddressType[];
	tag?: any;
	comment?: string;
	ignore: boolean;
}

export interface BaseParams {
	globalVar: GlobalVar;
	allLines: BaseLine[];
	index: number;
	inCommand: InCommand;
}