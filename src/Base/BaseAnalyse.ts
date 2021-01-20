import * as fs from "fs";
import { MarkScope } from "../Data/Mark";
import { GlobalVar } from "../GlobalVar";
import { Word } from "../Interface";
import Language from "../Language";
import { Asm6502Regex, AsmCommandRegex } from "../MyConst";
import { MyError } from "../MyError";
import { AsmUtils } from "../Utils/AsmUtils";
import { Utils } from "../Utils/Utils";
import { BaseLine, BaseLineType, BaseParams, InCommand } from "./BaseLine";

/**不允许表达式为空 */
const CheckExpressionEmpty = [
	".HEX", ".DBG", ".DWG", ".DB", ".DW",
	".IF", ".ELSEIF", ".IFDEF", ".IFNDEF",
	".DEF", ".ORG", ".BASE",
	".INCLUDE", ".INCBIN",
	".REPEAT", ".MACRO", ".MSG"
];

/**不允许有表达式 */
const CheckHasExpression = [
	".ELSE", ".ENDIF", "ENDM", "ENDR", "ENDD"
];

/**不允许有标签 */
const CheckCommandNoMark = [
	".DEF", ".ORG", ".BASE", ".MACRO", ".ENDIF", "ENDM", "ENDR", "ENDD"
];

/**检查是否已忽略却出现的命令 */
const CheckIgnoreCommand = {
	match: [".ENDD", ".ENDIF", ".ENDM"],
	err: [".DBG/.DWG", ".IF/.IFDEF/.IFNDEF", ".MACRO"]
}


export class BaseAnalyse {

	//#region 基础分析
	/**
	 * 基础分析
	 * @param globalVar 全局变量
	 * @param filePath 文件路径
	 * @param context 文件内容
	 */
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
	//#endregion 基础分析

	//#region 进阶分析
	/**
	 * 进阶分析
	 * @param baseLines 所有行
	 */
	static MainAnalyse(baseLines: BaseLine[]) {
		if (MyError.isError)
			return;


	}
	//#endregion 进阶分析

	//#region 基础分割与分析
	/**
	 * 基础分割与分析
	 * @param params 基础参数
	 */
	private static Analyse(params: BaseParams) {
		let baseLine: BaseLine = params.allLines[params.index];
		if (baseLine.ignore)
			return;

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
			BaseAnalyse.CommandBaseAnayse(params);
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
					filePath: params.globalVar.filePaths[baseLine.fileIndex], lineNumber: baseLine.lineNumber,
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

	/***** 初步命令检查 *****/

	//#region 命令初步分析
	/**
	 * 命令初步分析
	 * @param params 基础参数
	 */
	private static CommandBaseAnayse(params: BaseParams) {
		if (BaseAnalyse.CheckCommandIllegal(params.globalVar.filePaths, params.allLines[params.index]))
			return;

		if (BaseAnalyse.CheckCommandMatch(params))
			return;

		let baseLine = params.allLines[params.index];
		let exp = <Word>baseLine.expression;
		let option = { fileIndex: baseLine.fileIndex, lineNumber: baseLine.fileIndex, comment: baseLine.comment, markScope: <MarkScope | undefined>undefined };
		switch (baseLine.comOrOp?.text) {

			//#region DEF 命令
			case ".DEF": {
				let part = Utils.SplitWithRegex(/\s+/g, 1, exp.text, exp.startColumn);
				baseLine.mark = params.globalVar.marks.AddMark(part[0], params.globalVar.filePaths, option);
				if (part.length != 2) {
					let err = new MyError(Language.ErrorMessage.ExpressionMiss);
					err.SetPosition({
						filePath: params.globalVar.filePaths[baseLine.fileIndex], lineNumber: baseLine.lineNumber,
						startPosition: (<Word>baseLine.comOrOp).startColumn, length: (<Word>baseLine.comOrOp).text.length
					});
					MyError.PushError(err);
					baseLine.ignore = true;
					break;
				}
				baseLine.expression = part[1];
				break;
			}
			//#endregion DEF 命令

			//#region INCLUDE/INCBIN 命令
			case ".INCLUDE":
			case ".INCBIN": {
				if (!exp.text.startsWith("\"") || !exp.text.endsWith("\"")) {
					let err = new MyError(Language.ErrorMessage.ExpressionError);
					err.SetPosition({
						filePath: params.globalVar.filePaths[baseLine.fileIndex], lineNumber: baseLine.lineNumber,
						startPosition: exp.startColumn, length: exp.text.length
					});
					MyError.PushError(err);
					baseLine.ignore = true;
					return;
				}

				let path = exp.text.substring(1, exp.text.length - 1);
				let filePath = Utils.GetFilePath(path, params.globalVar.filePaths[baseLine.fileIndex]);
				if (!fs.existsSync(filePath.fsPath)) {
					let err = new MyError(Language.ErrorMessage.FileIsNotExist, path);
					err.SetPosition({
						filePath: params.globalVar.filePaths[baseLine.fileIndex], lineNumber: baseLine.lineNumber,
						startPosition: exp.startColumn, length: exp.text.length
					});
					MyError.PushError(err);
					baseLine.ignore = true;
					return;
				}

				if (baseLine.comOrOp.text == ".INCLUDE" && params.globalVar.isCompile) {
					let allText = fs.readFileSync(filePath.fsPath, { encoding: "utf8" });
					let index = params.globalVar.GetFileIndex(filePath.fsPath);
					let baseLines = BaseAnalyse.SplitAllText(allText, index);

					params.allLines.splice(params.index, 1);

					for (let i = baseLines.length - 1; i >= 0; i--)
						params.allLines.splice(params.index, 0, baseLines[i]);

					params.index--;
				}
				break;
			}
			//#endregion INCLUDE/INCBIN 命令

		}

	}
	//#endregion 命令初步分析

	//#region 检查标签是否合理
	/**
	 * 检查标签是否合理
	 * @param baseLine 当前行
	 * @returns true为有错误
	 */
	private static CheckCommandIllegal(filePaths: string[], baseLine: BaseLine): boolean {
		let temp = (<Word>baseLine.comOrOp).text;
		// 检查命令必须有参数的命令
		if (!baseLine.expression && CheckExpressionEmpty.includes(temp)) {
			let error = new MyError(Language.ErrorMessage.ExpressionMiss);
			error.SetPosition({
				filePath: filePaths[baseLine.fileIndex], lineNumber: baseLine.lineNumber,
				startPosition: (<Word>baseLine.comOrOp).startColumn, length: temp.length
			});
			MyError.PushError(error);
			return true;
		}

		// 检查不包含参数的命令
		if (baseLine.expression && CheckHasExpression.includes(temp)) {
			let error = new MyError(Language.ErrorMessage.DontSupportParameters);
			error.SetPosition({
				filePath: filePaths[baseLine.fileIndex], lineNumber: baseLine.lineNumber,
				startPosition: (<Word>baseLine.comOrOp).startColumn, length: temp.length
			});
			MyError.PushError(error);
			return true;
		}

		// 不支持标签的命令
		if (baseLine.mark && CheckCommandNoMark.includes(temp)) {
			let error = new MyError(Language.ErrorMessage.CommandNotSupportMark);
			error.SetPosition({
				filePath: filePaths[baseLine.fileIndex], lineNumber: baseLine.lineNumber,
				startPosition: baseLine.mark.text.startColumn, length: baseLine.mark.text.text.length
			});
			MyError.PushError(error);
			return true;
		}

		// 本应该忽略的标签却监测到
		let index = 0;
		if ((index = CheckIgnoreCommand.match.indexOf((<Word>baseLine.comOrOp).text)) >= 0) {
			let error = new MyError(Language.ErrorMessage.NotMatchEnd, CheckIgnoreCommand.err[index]);
			error.SetPosition({
				filePath: filePaths[baseLine.fileIndex], lineNumber: baseLine.lineNumber,
				startPosition: (<Word>baseLine.comOrOp).startColumn, length: (<Word>baseLine.comOrOp).text.length
			});
			MyError.PushError(error);
		}

		return false;
	}
	//#endregion 检查标签是否合理

	//#region 检查标签的匹配
	/**
	 * 检查标签的匹配
	 * @param params 基本参数
	 * @returns 是否有错误，true为有错误
	 */
	private static CheckCommandMatch(params: BaseParams): boolean {
		let baseLine = params.allLines[params.index];
		let isError = false;
		switch (baseLine.comOrOp?.text) {

			//#region DBG/DWG 命令
			case ".DBG":
			case ".DWG": {
				let match = BaseAnalyse.FindNextMatch(params.allLines, baseLine.fileIndex, params.index, "(^|\\s+)(\\.ENDD)(\\s+|$)");
				if (Utils.CompareString(match.match.text, ".ENDD")) {
					BaseAnalyse.CheckCommandNoMarkAndExpression(params.globalVar.filePaths, params.allLines[match.index], match.match);
					params.allLines.splice(match.index, 1);
					baseLine.tag = params.allLines.splice(params.index, match.index - params.index - 1);
				} else {
					let err = new MyError(Language.ErrorMessage.NotMatchEnd, ".ENDD");
					err.SetPosition({
						filePath: params.globalVar.filePaths[baseLine.fileIndex], lineNumber: baseLine.lineNumber,
						startPosition: (<Word>baseLine.comOrOp).startColumn, length: (<Word>baseLine.comOrOp).text.length
					});
					MyError.PushError(err);
					isError = true;
				}
				break;
			}
			//#endregion DBG/DWG 命令

			//#region MACRO 命令
			case ".MACRO": {
				let index = params.index + 1;
				while (true) {
					let match = BaseAnalyse.FindNextMatch(
						params.allLines,
						baseLine.fileIndex,
						index,
						"(^|\\s+)(\\.D[BW]G|\\.MACRO|\\.INC(LUDE|BIN)|\\.DEF|\\.ENDM)(\\s+|$)");

					if (match.index < 0) {
						let err = new MyError(Language.ErrorMessage.NotMatchEnd, ".ENDM");
						err.SetPosition({
							filePath: params.globalVar.filePaths[baseLine.fileIndex], lineNumber: baseLine.lineNumber,
							startPosition: (<Word>baseLine.comOrOp).startColumn, length: (<Word>baseLine.comOrOp).text.length
						});
						MyError.PushError(err);
						params.index = Math.abs(match.index);
						baseLine.tag = params.allLines.splice(params.index + 1);		// 将所有内容放入Tag
						isError = true;
						break;
					}

					if (Utils.CompareString(match.match.text, ".DBG", ".DWG", ".INCLUDE", ".INCBIN", ".DEF", ".MACRO")) {
						let err = new MyError(Language.ErrorMessage.MacroNotSupportCommand, match.match.text.toUpperCase());
						err.SetPosition({
							filePath: params.globalVar.filePaths[baseLine.fileIndex],
							lineNumber: params.allLines[match.index].lineNumber,
							startPosition: match.match.startColumn,
							length: match.match.text.length
						});
						MyError.PushError(err);
						params.allLines[match.index].ignore = true;
						isError = true;
						index++;
						continue;
					}

					if (Utils.CompareString(match.match.text, ".ENDM")) {
						// 直接检查有无问题，然后删除
						BaseAnalyse.CheckCommandNoMarkAndExpression(params.globalVar.filePaths, params.allLines[match.index], match.match);
						params.allLines.splice(match.index, 1);

						// 将所有内容放入Tag，不删除最后一行
						baseLine.tag = params.allLines.splice(params.index + 1, match.index - params.index - 1);
						break;
					}
				}
				baseLine.ignore = isError;
				break;
			}
			//#endregion MACRO 命令

			//#region IF/IFDEF/IFNDEF命令
			case ".IF":
			case ".IFDEF":
			case ".IFNDEF": {
				let index = params.index + 1;
				let stack = 0;
				while (true) {
					let match = BaseAnalyse.FindNextMatch(
						params.allLines,
						baseLine.fileIndex,
						index,
						"(^|\\s+)(\\.IF|\\.IF[N]?DEF|\\.ENDIF)(\\s+|$)");

					if (match.index < 0) {
						let err = new MyError(Language.ErrorMessage.NotMatchEnd, ".ENDIF");
						err.SetPosition({
							filePath: params.globalVar.filePaths[baseLine.fileIndex], lineNumber: baseLine.lineNumber,
							startPosition: (<Word>baseLine.comOrOp).startColumn, length: (<Word>baseLine.comOrOp).text.length
						});
						MyError.PushError(err);
						isError = true;
						break;
					}

					if (Utils.CompareString(match.match.text, ".IF", ".IFDEF", ".IFNDEF")) {
						stack++;
						index++;
						continue;
					}

					if (Utils.CompareString(match.match.text, ".ENDIF")) {
						if (stack != 0) {
							stack--;
							index++;
							continue;
						}
						BaseAnalyse.CheckCommandNoMarkAndExpression(params.globalVar.filePaths, params.allLines[match.index], match.match);
						// 这里不删除.ENDIF 遇到.ENDIF直接忽略
						params.allLines[match.index].ignore = true;
						break;
					}
				}
				baseLine.ignore = isError;
				break;
			}
			//#endregion IF/IFDEF/IFNDEF命令

			//#region REPEAT命令
			case ".REPEAT": {
				let index = params.index + 1;
				let stack = 0;
				while (true) {
					let match = BaseAnalyse.FindNextMatch(
						params.allLines,
						baseLine.fileIndex,
						index,
						"(^|\\s+)(\\.REPEAT|\\.ENDR)(\\s+|$)");

					if (match.index < 0) {
						let err = new MyError(Language.ErrorMessage.NotMatchEnd, ".ENDR");
						err.SetPosition({
							filePath: params.globalVar.filePaths[baseLine.fileIndex], lineNumber: baseLine.lineNumber,
							startPosition: (<Word>baseLine.comOrOp).startColumn, length: (<Word>baseLine.comOrOp).text.length
						});
						MyError.PushError(err);
						isError = true;
						break;
					}

					if (Utils.CompareString(match.match.text, ".REPEAT")) {
						stack++;
						index++;
						continue;
					}

					if (Utils.CompareString(match.match.text, ".ENDR")) {
						if (stack != 0) {
							stack--;
							index++;
							continue;
						}

						BaseAnalyse.CheckCommandNoMarkAndExpression(params.globalVar.filePaths, params.allLines[match.index], match.match);
						params.allLines[match.index].ignore = true;
						break;
					}
				}
				break;
			}
			//#endregion REPEAT命令

		}
		return isError;
	}
	//#endregion 检查标签的匹配

	/***** 辅助方法 *****/

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
				ignore: false,
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
			baseLine.mark = params.globalVar.marks.AddMark(mark, params.globalVar.filePaths, option);
		}

		// if (option.markScope == MarkScope.Macro && baseLine.mark)
		// params.globalVar.marks.RemoveMark(this.mark, params.globalVar);
	}
	//#endregion 获取标签

	//#region 查找匹配行
	/**
	 * 查找匹配行
	 * @param allLines 所有行
	 * @param findIndex 文件索引
	 * @param matchReg 匹配的Reg
	 * @param leftReg 入栈Reg
	 */
	private static FindNextMatch(allLines: BaseLine[], fileIndex: number, findIndex: number, matchReg: string): { index: number, match: Word } {
		let loop = findIndex;
		let stack = 0;
		for (; loop < allLines.length; loop++) {
			if (fileIndex != allLines[loop].fileIndex)
				return { index: -loop, match: { text: "", startColumn: 0 } };

			let match = new RegExp(matchReg, "ig").exec(allLines[loop].text.text);
			if (match) {
				if (stack == 0)
					return { index: loop, match: Utils.StringTrim(match[0], match.index + allLines[loop].text.startColumn) };
				else
					stack--;
			}
		}
		return { index: -(--loop), match: { text: "", startColumn: 0 } };
	}
	//#endregion 查找匹配行

	//#region 简单检查行内容
	private static CheckCommandNoMarkAndExpression(filePath: string[], baseLine: BaseLine, command: Word): void {
		let left = baseLine.text.text.substring(0, command.startColumn - baseLine.text.startColumn);
		let right = baseLine.text.text.substring(command.text.length + command.startColumn - baseLine.text.startColumn);
		let result = true;
		if (!Utils.StringIsEmpty(left)) {
			let err = new MyError(Language.ErrorMessage.CommandNotSupportMark);
			err.SetPosition({
				filePath: filePath[baseLine.fileIndex], lineNumber: baseLine.lineNumber,
				startPosition: command.startColumn, length: command.text.length
			});
			MyError.PushError(err);
		}

		if (!Utils.StringIsEmpty(right)) {
			let err = new MyError(Language.ErrorMessage.DontSupportParameters);
			err.SetPosition({
				filePath: filePath[baseLine.fileIndex], lineNumber: baseLine.lineNumber,
				startPosition: command.startColumn, length: command.text.length
			});
			MyError.PushError(err);
		}

	}
	//#endregion 简单检查行内容

}

