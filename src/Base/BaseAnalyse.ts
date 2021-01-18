import { MarkScope } from "../Data/Mark";
import { GlobalVar } from "../GlobalVar";
import Language from "../Language";
import { Asm6502Regex, AsmCommandRegex } from "../MyConst";
import { MyError } from "../MyError";
import { AsmUtils } from "../Utils/AsmUtils";
import { Utils } from "../Utils/Utils";
import { BaseLine, BaseLineType, BaseParams, InCommand } from "./BaseLine";

export class BaseAnalyse {

	/**基础分析 */
	static BaseAnalyse(globalVar: GlobalVar, filePath: string, context: string): BaseLine[] {

		let params: BaseParams = { globalVar: globalVar, allLines: <BaseLine[]>[], index: 0, inCommand: InCommand.None };
		let fileIndex = globalVar.GetFileIndex(filePath);
		params.allLines = BaseAnalyse.SplitAllText(context, fileIndex);

		for (let j = 0; j < params.allLines.length; j++) {
			params.index = j;
			BaseAnalyse.Analyse(params);
			j = params.index;
		}
		return params.allLines;
	}

	static MainAnalyse(baseLines: BaseLine[]) {

	}

	//#region 基础分割与分析
	/**
	 * 基础分割与分析
	 * @param params 基础参数
	 */
	private static Analyse(params: BaseParams) {
		let baseLine: BaseLine = params.allLines[params.index];
		// 汇编指令
		let match = new RegExp(Asm6502Regex, "ig").exec(baseLine.text.text);
		if (match) {
			baseLine.lineType = BaseLineType.Instrument;
			this.GetMark(match.index, params);
			let tempText = Utils.StringTrim(baseLine.text.text.substring(match.index), match.index + baseLine.text.startColumn);
			let temp = AsmUtils.GetAddressType(tempText.text, tempText.startColumn);
			baseLine.addressType = temp.addressType;
			baseLine.expression = temp.expression;
			if (baseLine.expression && Utils.StringIsEmpty(baseLine.expression.text)) {
				delete baseLine.expression;
			}
			baseLine.comOrOp = temp.instruction;
			return;
		}

		// 编译器指令
		match = new RegExp(AsmCommandRegex, "ig").exec(baseLine.text.text);
		if (match) {
			baseLine.lineType = BaseLineType.Command;
			this.GetMark(match.index, params);
			baseLine.comOrOp = Utils.StringTrim(match[0], baseLine.text.startColumn + match.index);
			baseLine.comOrOp.text = baseLine.comOrOp.text.toUpperCase();
			baseLine.expression = Utils.StringTrim(
				baseLine.text.text.substring(match[0].length + match.index),
				match[0].length + match.index + baseLine.text.startColumn
			);
			if (Utils.StringIsEmpty(baseLine.expression.text)) {
				delete baseLine.expression;
			}
			// this.CommandAnalyse(params);
			return;
		}

		// xx = yy 形式
		if (baseLine.text.text.includes("=")) {
			baseLine.lineType = BaseLineType.Assign;
			let tempPart = Utils.SplitWithRegex(/\s*\=\s*/g, 1, baseLine.text.text, baseLine.text.startColumn);
			let tempMark = tempPart[0];
			baseLine.expression = tempPart[1];
			if (baseLine.expression && Utils.StringIsEmpty(baseLine.expression.text)) {
				baseLine.expression = undefined;
				let err = new MyError(Language.ErrorMessage.ExpressionMiss);
				err.SetPosition({
					fileIndex: baseLine.fileIndex, lineNumber: baseLine.lineNumber,
					startPosition: baseLine.text.startColumn, length: baseLine.text.text.length
				});
				MyError.PushError(err);
				return;
			}
			let option = { globalVar: params.globalVar, fileIndex: baseLine.fileIndex, lineNumber: baseLine.lineNumber };
			// ExpressionUtils.CheckExpressionCurrect(baseLine.expression, option);
			// let mark = MarkUtils.FindMark(params.globalVar, tempMark, option);
			// if (mark) {
			// 	if (mark.type == MarkType.Defined) {
			// 		let err = new MyError(Language.ErrorMessage.MarkIsDefined, tempMark.text);
			// 		err.SetPosition({
			// 			filePath: params.globalVar.filePaths[this.fileIndex], lineNumber: this.lineNumber,
			// 			startPosition: tempMark.startColumn, length: tempMark.text.length
			// 		});
			// 		MyError.PushError(err);
			// 	}
			// } else {
			// 	this.mark = MarkUtils.AddMark(params.globalVar, tempMark, option);
			// 	if (this.mark)
			// 		this.mark.type = MarkType.Variable;
			// }

			return;
		}
	}
	//#endregion 基础分割与分析

	//#region 分割所有文本
	/**
	 * 分割所有文本
	 * @param allText 所有文本
	 * @param fileIndex 文件索引
	 */
	static SplitAllText(allText: string, fileIndex: number): BaseLine[] {
		let allLine = allText.split(/\r?\n/);
		let result: BaseLine[] = [];
		let part: string[] = [];
		for (let i = 0; i < allLine.length; i++) {
			part = allLine[i].split(/;[\+|\-]?/g, 2);
			if (Utils.StringIsEmpty(part[0]))
				continue;

			let line: BaseLine = {
				fileIndex: fileIndex,
				lineNumber: i,
				text: Utils.StringTrim(part[0]),
				lineType: BaseLineType.None,
			};

			if (part.length == 2)
				line.comment = part[1];

			result.push(line);
		}
		return result;
	}
	//#endregion 分割所有文本

	//#region 获取标签
	/**
	 * 获取标签
	 * @param subIndex 分割下标
	 * @param params 参数
	 */
	private static GetMark(subIndex: number, params: BaseParams) {
		let baseLine: BaseLine = params.allLines[params.index];
		let mark = Utils.StringTrim(baseLine.text.text.substring(0, subIndex), baseLine.text.startColumn);
		let option = {
			fileIndex: baseLine.fileIndex, lineNumber: baseLine.lineNumber,
			comment: baseLine.comment, markScope: <MarkScope | undefined>undefined
		};

		if (params.inCommand == InCommand.Macro)
			option.markScope = MarkScope.Macro;

		if (!Utils.StringIsEmpty(mark.text)) {
			baseLine.mark = params.globalVar.marks.AddMark(mark, option);
		}

		// if (option.markScope == MarkScope.Macro && baseLine.mark)
		// params.globalVar.marks.RemoveMark(this.mark, params.globalVar);
	}
	//#endregion 获取标签
}

