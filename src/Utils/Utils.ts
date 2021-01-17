import { Word } from "../Interface";

export class Utils {

	//#region 文本是否为空
	/**
	 * 文本是否为空
	 * @param text 要检测的文本
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
}