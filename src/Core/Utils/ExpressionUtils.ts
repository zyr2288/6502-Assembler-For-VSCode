import { GlobalVar } from "../GlobalVar";
import { CompileType, ReplaceMark, Word } from "../Interface";
import Language from "../../i18n";
import { Mark, MarkScope } from "../Data/Mark";
import { TempMarkReg } from "../MyConst";
import { MyError } from "../MyError";
import { Utils } from "./Utils";
import { Macro } from "../Data/Macro";

enum ExpressionPartType {
	/**普通标记 */
	Mark,
	/**表达式 */
	Expression,
	/**运算符 */
	Operation,
	/**当前行地址 */
	Address,
	/**字符串 */
	String,
	/**获取高位或低位的运算 */
	GetAndValue,
	/**数字 */
	Number,
	/**要替换的标签 */
	ReplaceMark
}

interface ExpressionPart {
	partType: ExpressionPartType
	tag: Word | ExpressionPart[];
}

interface GetExpressionResultType {
	"number": number;
	"boolean": boolean;
	"string": string;
}

export class ExpressionUtils {

	//#region 检查表达式正误
	/**
	 * 检查表达式正误
	 * @param text 检查的表达式
	 * @param option 选项
	 * @returns false为错误
	 */
	static CheckExpressionCurrect(
		text: Word,
		option: { globalVar: GlobalVar, fileIndex: number, lineNumber: number, replaceMark?: ReplaceMark[] }
	): boolean {
		try {
			let result = ExpressionUtils.SplitExpression(text.text, text.startColumn);
			if (!ExpressionUtils.CheckExpression(result.result, text.startColumn))
				return false;

			return ExpressionUtils.CheckExpressionMark(result.result, option);
		} catch (error) {
			let err = <MyError>error;
			err.SetPosition({ fileIndex: option.fileIndex, lineNumber: option.lineNumber });
			MyError.PushError(err);
			return false;
		}
	}
	//#endregion 检查表达式正误

	//#region 获取表达式结果
	/**
	 * 获取表达式结果
	 * @param text 要获取的表达式
	 * @param option 选项，globalVar, fileIndex, lineNumber, replaceMark
	 * @param ignoreUnknowValue 是否忽略已知变量但未知值
	 */
	static GetExpressionResult<K extends keyof GetExpressionResultType>(
		text: Word,
		option: { globalVar: GlobalVar, fileIndex: number, lineNumber: number, macro?: Macro },
		resultType: K,
		ignoreUnknowValue = false
	): GetExpressionResultType[K] | null {
		try {
			let result = ExpressionUtils.SplitExpression(text.text, text.startColumn);
			if (!result.result || !ExpressionUtils.CheckExpression(result.result, text.startColumn))
				return null;

			let value = <GetExpressionResultType[K]>ExpressionUtils.GetExpressionValue(result.result, option, ignoreUnknowValue);
			if (value == null)
				return value;

			if (typeof (value) == resultType)
				return value;

			return null;
		} catch (error) {
			return null;
		}
	}
	//#endregion 获取表达式结果

	//#region 检查表达式中的Mark是否存在
	/**
	 * 检查表达式中的Mark是否存在
	 * @param exps 表达式所有部分
	 * @param option 选项 globalVar, fileIndex, lineNumber
	 * @returns 是否有错误
	 */
	private static CheckExpressionMark(
		exps: ExpressionPart[],
		option: { globalVar: GlobalVar, fileIndex: number, lineNumber: number, macro?: Macro }
	): boolean {
		let isError = false;
		for (let i = 0; i < exps.length; i++) {
			switch (exps[i].partType) {
				case ExpressionPartType.Mark:
					let word = <Word>exps[i].tag;
					let mark = option.globalVar.marks.FindMark(word.text, option);
					if (!mark || mark.scope == MarkScope.Macro) {
						let error = new MyError(Language.ErrorMessage.MarkMiss, word.text);
						error.SetPosition({
							fileIndex: option.fileIndex, lineNumber: option.lineNumber,
							startPosition: word.startColumn, length: word.text.length
						});
						MyError.PushError(error);
						isError = true;
					}
					break;
				case ExpressionPartType.Expression:
					let parts = <ExpressionPart[]>exps[i].tag
					isError = ExpressionUtils.CheckExpressionMark(parts, option);
					break;
			}
		}
		return isError;
	}
	//#endregion 检查表达式中的Mark是否存在

	//#region 分割表达式
	/**
	 * 分割表达式
	 * @param text 要分割的字符串
	 * @param startPos 字符串起始位置
	 * @param canUseArray 是否允许使用数组
	 */
	private static SplitExpression(text: string, startPos: number): { result: ExpressionPart[], loop: number } {
		let result: ExpressionPart[] = [];
		let markStart = 0;
		let loop = 0;
		let index = 0;
		let error;

		let regex = new RegExp(TempMarkReg).exec(text);
		if (regex) {
			result.push({ partType: ExpressionPartType.Mark, tag: { text: text, startColumn: startPos } });
			return { result: result, loop: loop };
		}

		for (; loop < text.length; loop++) {
			switch (text[loop]) {
				case "+":
				case "-":
				case "*":
				case "/":
				case "^":
					ExpressionUtils.AddResultMark(result, text, markStart, loop, startPos);
					result.push({ partType: ExpressionPartType.Operation, tag: { text: text[loop], startColumn: loop + startPos } });
					markStart = loop + 1;
					break;
				case ">":
				case "<":
				case "=":
					ExpressionUtils.AddResultMark(result, text, markStart, loop, startPos);
					if (loop + 1 < text.length) {
						if (text[loop] == text[loop + 1]) {
							result.push({ partType: ExpressionPartType.Operation, tag: { text: text[loop] + text[loop], startColumn: loop + startPos } });
							loop++;
							markStart = loop + 1;
							break;
						} else if (text[loop + 1] == "=") {
							result.push({ partType: ExpressionPartType.Operation, tag: { text: text[loop] + "=", startColumn: loop + startPos } });
							loop++;
							markStart = loop + 1;
							break;
						}
					}

					result.push({ partType: ExpressionPartType.Operation, tag: { text: text[loop], startColumn: loop + startPos } });
					markStart = loop + 1;
					break;
				case "&":
				case "|":
					ExpressionUtils.AddResultMark(result, text, markStart, loop, startPos);
					if (text[loop + 1] && text[loop + 1]) {
						result.push({ partType: ExpressionPartType.Operation, tag: { text: text[loop] + text[loop], startColumn: loop + startPos } });
						markStart = loop + 2;
						loop++;
					} else {
						result.push({ partType: ExpressionPartType.Operation, tag: { text: text[loop], startColumn: loop + startPos } });
						markStart = loop + 1;
					}
					break;
				case "(":
					// ExpressionUtils.AddResultMark(result, text, markStart, loop, startPos);

					index = ExpressionUtils.FindNextPatch(")", "(", text, loop + 1);
					if (index < 0) {
						let error = new MyError(Language.ErrorMessage.BracketsMiss);
						error.SetPosition({ startPosition: loop, length: 1 });
						throw error;
					} else {
						let mark: ExpressionPart = { partType: ExpressionPartType.Mark, tag: { text: text.substring(markStart, loop), startColumn: markStart + startPos } };
						if ((<Word>mark.tag).text.length != 0) {
							result.push(mark);
							markStart += (<Word>mark.tag).text.length;
						}

						let temp = ExpressionUtils.SplitExpression(text.substring(loop + 1, index), loop + 1);
						result.push({ partType: ExpressionPartType.Expression, tag: temp.result });
						loop += temp.loop + 1;
						markStart += temp.loop + 2;
					}
					break;
				case ")":
				case "]":
					error = new MyError(Language.ErrorMessage.BracketsMiss);
					error.SetPosition({ startPosition: loop, length: 1 });
					throw error;
				case "[":
					error = new MyError(Language.ErrorMessage.DontSupportMultiArray);
					error.SetPosition({ startPosition: loop, length: 1 });
					throw error;
				default:
					break;
			}
		}
		ExpressionUtils.AddResultMark(result, text, markStart, loop, startPos);
		return { result: result, loop: loop };
	}
	//#endregion 分割表达式

	//#region 检查表达式是否有误
	/**
	 * 检查表达式是否有误
	 * @param expressionPart 所有表达式
	 */
	private static CheckExpression(expressionPart: ExpressionPart[], start = 0): boolean {
		let isNumber = true;
		for (let i = 0; i < expressionPart.length; i++) {
			switch (expressionPart[i].partType) {
				/**标记 */
				case ExpressionPartType.Mark: {
					let word = (<Word>expressionPart[i].tag);
					if (!isNumber) {
						let error = new MyError(Language.ErrorMessage.ExpressionError);
						error.SetPosition({ startPosition: word.startColumn, length: word.text.length });
						throw error;
					}

					if (/^".*"$/g.test(word.text)) {
						expressionPart[i].partType = ExpressionPartType.String;
						break;
					}

					let num = ExpressionUtils.CheckNumber(word.text);
					if (num != null) {
						word.text = num.toString();
						expressionPart[i].partType = ExpressionPartType.Number;
					}
					start = word.startColumn + word.text.length;
					break;
				}

				/**操作符 */
				case ExpressionPartType.Operation: {
					let word = (<Word>expressionPart[i].tag);
					if (isNumber) {
						switch (word.text) {
							case ">":
							case "<":
								expressionPart[i].partType = ExpressionPartType.GetAndValue;
								isNumber = false;
								break;
							case "*":
								expressionPart[i].partType = ExpressionPartType.Address;
								break;
							case "-":
								isNumber = false;
								break;

							default:
								let error = new MyError(Language.ErrorMessage.MarkMissBtOps)
								error.SetPosition({ startPosition: word.startColumn, length: word.text.length });
								throw error;
						}
					}
					start = word.startColumn + word.text.length;
					break;
				}

				/**表达式 */
				case ExpressionPartType.Expression: {
					if (!isNumber) {
						let error = new MyError(Language.ErrorMessage.MarkMissBtOps);
						error.SetPosition({ startPosition: start, length: 0 });
						throw error;
					}

					ExpressionUtils.CheckExpression(<ExpressionPart[]>expressionPart[i].tag)
					break;
				}

			}

			isNumber = !isNumber;
		}

		if (isNumber) {
			let error = new MyError(Language.ErrorMessage.MarkMissBtOps);
			error.SetPosition({ startPosition: start, length: 0 });
			throw error;
		}

		return true;
	}
	//#endregion 检查表达式是否有误

	//#region 获取计算中的标记的值
	private static GetExpressionValue(
		expressionParts: ExpressionPart[],
		option: { globalVar: GlobalVar, fileIndex: number, lineNumber: number, macro?: Macro },
		ignoreUnknowValue = false
	): any {
		let tempWord = { beforeStr: "", centerStr: "", afterStr: "", canUse: true };
		let temp: number | null = null;
		let tempMark: Mark | undefined;
		let result = { resultStr: "", isError: false };
		for (let i = 0; i < expressionParts.length; i++) {
			switch (expressionParts[i].partType) {
				case ExpressionPartType.String:
					tempWord.centerStr = (<Word>expressionParts[i].tag).text;
					break;
				case ExpressionPartType.Address:
					if (option.globalVar.address != undefined) {
						tempWord.centerStr = option.globalVar.address.toString();
					} else {
						return null;
					}
					break;
				case ExpressionPartType.GetAndValue:
					if ((<Word>expressionParts[i].tag).text == ">") {
						tempWord.beforeStr = "((";
						tempWord.afterStr = ") >> 8 & 0xFF)";
					} else {
						tempWord.beforeStr = "((";
						tempWord.afterStr = ") & 0xFF)";
					}
					tempWord.canUse = false;
					break;
				case ExpressionPartType.Mark:
					tempMark = option.globalVar.marks.FindMark((<Word>expressionParts[i].tag).text, option);
					if (!tempMark) {
						if (option.globalVar.compileType == CompileType.LastTime) {
							let word = <Word>expressionParts[i].tag;
							let error = new MyError(Language.ErrorMessage.MarkMiss, word.text);
							error.SetPosition({
								fileIndex: option.fileIndex, lineNumber: option.lineNumber,
								startPosition: word.startColumn, length: word.text.length
							});
							MyError.PushError(error);
						}
						return null;
					} else if (tempMark.value == undefined) {
						// Mark存在但不计算值
						if (ignoreUnknowValue) {
							result.isError = true;
							continue;
						}
						let word = <Word>expressionParts[i].tag;
						if (option.globalVar.compileType == CompileType.LastTime) {
							let error = new MyError(Language.ErrorMessage.MarkMiss, word.text);
							error.SetPosition({
								fileIndex: option.fileIndex, lineNumber: option.lineNumber,
								startPosition: word.startColumn, length: word.text.length
							});
							MyError.PushError(error);
						}
						result.isError = true;
					} else {
						tempWord.centerStr = (<number>tempMark.value).toString();
					}
					break;
				case ExpressionPartType.Operation:
				case ExpressionPartType.Number:
					tempWord.centerStr = (<Word>expressionParts[i].tag).text;
					break;
				case ExpressionPartType.Expression:
					temp = <number | null>ExpressionUtils.GetExpressionValue(<ExpressionPart[]>expressionParts[i].tag, option);
					if (temp == null)
						return null

					tempWord.centerStr = temp.toString();
					break;
			}
			if (tempWord.canUse) {
				result.resultStr += tempWord.beforeStr + tempWord.centerStr + tempWord.afterStr;
				tempWord.beforeStr = tempWord.centerStr = tempWord.afterStr = "";
			}
			tempWord.canUse = true;
		}

		if (result.isError)
			return null;

		try {
			return eval(result.resultStr);
		} catch (e) {
			let error = new MyError(Language.ErrorMessage.CannotComputeExpression);
			MyError.PushError(error);
			return null;
		}


	}
	//#endregion 获取计算中的标记的值

	//#region 查找嵌套的符号位置
	/**
	 * 查找嵌套的符号位置
	 * @param match 要匹配的符号
	 * @param leftMatch 左边的对应，用于计算层次
	 * @param input 输入的字符串
	 * @param start 要查找的字符串起始位置
	 */
	private static FindNextPatch(match: string, leftMatch: string, input: string, start: number) {
		let result = -1;
		let deep = 0;
		for (let i = start; i < input.length; i++) {
			if (input[i] == leftMatch) {
				deep++;
			} else if (input[i] == match) {
				if (deep != 0) {
					deep--;
				} else {
					result = i;
					break;
				}
			}
		}
		return result;
	}
	//#endregion 查找嵌套的符号位置

	//#region 增加标记
	/**
	 * 增加标记
	 * @param text 文本
	 * @param markStart 截取文本的起始位置
	 * @param markEnd 截取文本结束位置
	 * @param startColumn 文本起始偏移
	 */
	private static AddResultMark(result: ExpressionPart[], text: string, markStart: number, markEnd: number, startColumn: number) {
		let mark = Utils.StringTrim(text.substring(markStart, markEnd), markStart + startColumn);
		if (mark.text != "") {
			result.push({ partType: ExpressionPartType.Mark, tag: mark });
		}
	}
	//#endregion 增加标记

	//#region 检查数字
	/**
	 * 检查数字
	 * @param text 检查数字
	 * @returns 返回数字，否则返回null
	 */
	static CheckNumber(text: string): number | null {
		let match: RegExpMatchArray | null;
		if (match = /^\$[0-9a-fA-F]+$/.exec(text)) {
			return parseInt(match[0].substring(1), 16);
		} else if (match = /^@[01]+$/.exec(text)) {
			return parseInt(match[0].substring(1), 2);
		} else if (/^[0-9]+$/.test(text)) {
			return parseInt(text);
		}
		return null;
	}
	//#endregion 检查数字

}