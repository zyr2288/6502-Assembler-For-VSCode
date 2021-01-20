import * as vscode from "vscode";
import * as path from "path";
import { Word } from "../Interface";


/**工具类 */
export class Utils {

	//#region 文本是否为空
	/**
	 * 文本是否为空
	 * @param text 要检测的文本
	 * @returns true为空白字符串
	 */
	static StringIsEmpty(text: string) {
		if (!text || text.trim() == "")
			return true;

		return false;
	}
	//#endregion 文本是否为空

	//#region 去除文本两端的空白
	/**
	 * 去除文本两端的空白
	 * @param text 要处理的文本
	 * @param startColumn 文本位置
	 */
	static StringTrim(text: string, startColumn: number = 0): Word {
		let match = /^\s+/.exec(text);
		if (match == null)
			return { text: text.trim(), startColumn: startColumn };

		let temp = text.substring(match.index);
		return { text: temp.trim(), startColumn: match[0].length + startColumn };
	}
	//#endregion 去除文本两端的空白

	//#region 用正则表达式分割字符串
	/**
	 * 分割文本
	 * @param regex 用于分割的正则表达式
	 * @param times 分割次数，0为无限次
	 * @param text 文本呢
	 * @param startColumn 文本起始位置
	 */
	static SplitWithRegex(regex: RegExp, times: number, text: string, startColumn: number = 0): Word[] {
		let result: Word[] = [];
		let match;
		let index = 0;
		let start = 0;
		while ((match = regex.exec(text)) && (index < times || times == 0)) {
			let left = text.substring(start, match.index);
			result.push({ text: left, startColumn: start + startColumn });
			start = match.index + match[0].length;
			index++;
		}

		let end = text.substring(start);
		result.push({ text: end, startColumn: start + startColumn });

		return result;
	}
	//#endregion 用正则表达式分割字符串

	//#region 将文本格式化
	/**
	 * 将文本格式化
	 * @param text 要格式化的文本
	 * @param params 格式化内容
	 */
	static StringFormat(text: string, ...params: string[]): string {
		for (let i = 0; i < params.length; i++) {
			text = text.replace("{{" + i + "}}", params[i]);
		}
		return text;
	}
	//#endregion 将文本格式化

	//#region 比较多个字符串，参数大写，输入会自动转换大写
	/**
	 * 比较多个字符串，参数大写，输入会自动转换大写
	 * @param input 输入的字符串
	 * @param param 要匹配的所有字符串
	 * @returns 是否相等
	 */
	static CompareString(input: string, ...param: string[]): boolean {
		if (Utils.StringIsEmpty(input) || param.length == 0)
			return false;

		return param.indexOf(input.toUpperCase()) > -1;
	}
	//#endregion 比较多个字符串，参数大写，输入会自动转换大写

	/***** 文件工具 *****/

	//#region 获取文件路径Uri
	/**
	 * 获取文件路径Uri
	 * @param target 目标相对或绝对路径
	 * @param basePath 拼接的基础路径
	 */
	static GetFilePath(target:string, basePath:string) {
		if (/^([a-zA-Z]\:)?\//.test(target)) {
			return vscode.Uri.file(target);
		} else {
			return vscode.Uri.file(
				path.join(path.dirname(basePath), target)
			);
		}
	}
	//#endregion 获取文件路径Uri

}