import {
	AsmLine,
	AsmLineInstrumentTag,
	AsmLineType,
	AsmLineCommandCommonTag,
	AsmLineCommandDxTag,
	AsmLineCommandDxGTag,
	AsmLineCommandMacroTag,
	AsmLineMacroTag
} from "../AsmLine/AsmLine";
import { BaseLine, BaseLineType } from "../Base/BaseLine";
import { Mark } from "../Data/Mark";
import { Word } from "../Interface";
import { AddressRegex, AddressType } from "../MyConst";
import { Utils } from "./Utils";

export class AsmUtils {

	//#region 分析编译指令的寻址方式和表达式
	/**
	 * 分析编译指令的寻址方式和表达式
	 * @param text 要分析的文本
	 * @param startColumn 文本起始位置
	 */
	static GetAddressType(text: string, startColumn = 0): { addressType: AddressType[], instruction: Word, expression?: Word } {
		let words = Utils.SplitWithRegex(/\s+/g, 1, text, startColumn);
		let addressType: AddressType[] = [];
		let expression: Word | undefined;
		let match: RegExpExecArray | null;
		if (words[1]) {
			// 分析寻址方式
			while (true) {
				// LDA #nn
				if (match = new RegExp(AddressRegex.Immediate).exec(words[1].text)) {
					expression = { text: match[0], startColumn: match.index + words[1].startColumn };
					addressType.push(AddressType.Immediate);
					break;
				}

				// LDA (nn,X)
				if (match = new RegExp(AddressRegex.Indirect_X, "g").exec(words[1].text)) {
					expression = { text: match[0], startColumn: match.index + words[1].startColumn };
					addressType.push(AddressType.Indirect_X);
					break;
				}

				// LDA (nn),Y
				if (match = new RegExp(AddressRegex.Indirect_Y, "g").exec(words[1].text)) {
					expression = { text: match[0], startColumn: match.index + words[1].startColumn };
					addressType.push(AddressType.Indirect_Y);
					break;
				}

				// LDA nn,X 或 LDA nnnn,X
				if (match = new RegExp(AddressRegex.XOffset, "g").exec(words[1].text)) {
					expression = { text: match[0], startColumn: match.index + words[1].startColumn };
					addressType.push(AddressType.ZeroPage_X);
					addressType.push(AddressType.Absolute_X);
					break;
				}

				// LDA nn,Y 或 LDA nnnn,Y
				if (match = new RegExp(AddressRegex.YOffset, "g").exec(words[1].text)) {
					expression = { text: match[0], startColumn: match.index + words[1].startColumn };
					addressType.push(AddressType.ZeroPage_Y);
					addressType.push(AddressType.Absolute_Y);
					break;
				}

				// LDA (nnnn)
				if (match = new RegExp(AddressRegex.Indirect, "g").exec(words[1].text)) {
					expression = { text: match[0], startColumn: match.index + words[1].startColumn };
					addressType.push(AddressType.Indirect);
					break;
				}

				// LDA nn 或 LDA nnnn 或 BCC nn
				addressType.push(AddressType.ZeroPage);
				addressType.push(AddressType.Absolute);
				addressType.push(AddressType.Conditional);
				expression = words[1];
				break;
			}
		} else {
			// 单操作
			addressType.push(AddressType.Implied);
		}
		let instruction: Word = Utils.StringTrim(words[0].text.toUpperCase(), words[0].startColumn);
		return {
			addressType: addressType,
			instruction: instruction,
			expression: expression
		};
	}
	//#endregion 分析编译指令的寻址方式和表达式

	//#region 转换基础行成为编译行
	/**
	 * 转换基础行成为编译行
	 * @param baseLine 基础行
	 */
	static ConvertToAsmLine(baseLine: BaseLine): AsmLine {
		let asmLine = new AsmLine();
		asmLine.fileIndex = baseLine.fileIndex;
		asmLine.lineNumber = baseLine.lineNumber;
		asmLine.text = baseLine.text;
		asmLine.mark = baseLine.mark;
		switch (baseLine.lineType) {

			//#region 汇编指令
			case BaseLineType.Instrument: {
				asmLine.lineType = AsmLineType.Instrument;
				asmLine.mark = baseLine.mark;
				let tag: AsmLineInstrumentTag = {
					instrument: <Word>baseLine.comOrOp,
					expression: baseLine.expression,
					addressType: <AddressType[]>baseLine.addressType
				};
				asmLine.tag = tag;
			}
			//#endregion 汇编指令

			//#region 表达式
			case BaseLineType.Assign: {
				asmLine.lineType = AsmLineType.Assign;
				asmLine.tag = baseLine.expression;
			}
			//#endregion 表达式

			//#region 各种命令
			case BaseLineType.Command: {
				asmLine.lineType = AsmLineType.Command;
				switch (baseLine.comOrOp?.text) {

					case ".DBG":
					case ".DWG": {
						let tag: AsmLineCommandDxGTag = {
							command: baseLine.comOrOp,
							parts: baseLine.tag
						}
						asmLine.tag = tag;
						break;
					}

					case ".DB":
					case ".DW": {
						let tag: AsmLineCommandDxTag = {
							command: baseLine.comOrOp,
							part: baseLine.tag
						};
						asmLine.tag = tag;
						break;
					}

					case ".MACRO": {
						let result: AsmLine[] = [];
						let baseLines: BaseLine[] = baseLine.tag;
						baseLines.forEach(value => {
							result.push(AsmUtils.ConvertToAsmLine(value));
						});
						let tag: AsmLineCommandMacroTag = {
							mark: <Mark>baseLine.mark,
							command: <Word>baseLine.comOrOp,
							lines: result
						};
						asmLine.tag = tag;
						break;
					}

					default: {
						asmLine.mark = baseLine.mark;
						let tag: AsmLineCommandCommonTag = {
							command: <Word>baseLine.comOrOp,
							expression: <Word>baseLine.expression
						}
						asmLine.tag = tag;
						break;
					}
				}
				break;
			}
			//#endregion 各种命令

			//#region 自定义函数
			case BaseLineType.Macro: {
				asmLine.lineType = AsmLineType.Macro;
				let tag:AsmLineMacroTag = {
					mark: baseLine.mark,
					command: <Word>baseLine.comOrOp,
					params: baseLine.tag
				}
				asmLine.tag = tag;
				break;
			}
			//#endregion 自定义函数

			//#region 只有标签
			case BaseLineType.OnlyMark: {
				asmLine.lineType = AsmLineType.OnlyMark;
				break;
			}
			//#endregion 只有标签

		}
		return asmLine;
	}
	//#endregion 转换基础行成为编译行

}