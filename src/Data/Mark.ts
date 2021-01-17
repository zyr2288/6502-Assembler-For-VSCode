import { Word } from "../Interface";
import { Utils } from "../Utils/Utils";

/**标签作用域 */
export enum MarkScope { None, Global, Local, Macro }
/**标签类型 */
export enum MarkType { None, Defined, Variable }

/**单个标签 */
export interface Mark {
	id: number;
	fileIndex: number;
	lineNumber: number;
	scope: MarkScope;
	type: MarkType;
	text: Word;
	comment?: string;
	tag?: any;
	value?: number;
}

/**所有标签类 */
export class Marks {
	marks: { [key: number]: Mark } = {};
	tempMarks: { [key: number]: Mark[] } = {};

	//#region 添加标记
	/**
	 * 添加标记
	 * @param text 要添加的文本
	 * @param option 选项
	 */
	AddMark(text: Word, option: { fileIndex: number, lineNumber: number, markScope?: MarkScope, value?: number, comment?: string }): Mark | undefined {
		if (Utils.StringIsEmpty(text.text))
			return;

		let markText = Utils.StringTrim(text.text, text.startColumn);
		// 增加临时变量
		let regex = /^(\\++|\\-+)/g.exec(markText.text);
		if (regex) {
			let text = markText.text.substring(regex.index + regex[0].length);

			if (!Utils.StringIsEmpty(text) &&
				this.CheckMarkIllegal({ text: text, startColumn: markText.startColumn + regex[0].length }))
				return;

			let mark: Mark = {
				fileIndex: option.fileIndex,
				lineNumber: option.lineNumber,
				text: { startColumn: markText.startColumn, text: markText.text },
				type: MarkType.Defined,
				scope: MarkScope.Local,
				id: this.GetMarkId(markText.text, MarkScope.Local, option.fileIndex)
			}

			if (!this.tempMarks[option.fileIndex])
				this.tempMarks[option.fileIndex] = [];

			if (option.value != undefined)
				mark.value = option.value;

			this.tempMarks[option.fileIndex].push(mark);
			return;
		}
	}
	//#endregion 添加标记

	//#region 查询标记
	/**
	 * 查询标记
	 * @param text 
	 * @param option 
	 */
	FindMark(text: string, option: { fileIndex: number, lineNumber: number, markScope?: MarkScope }): Mark | undefined {
		if (Utils.StringIsEmpty(text))
			return;

		let markText = Utils.StringTrim(text);
		// 增加临时变量
		let regex = /^(\\++|\\-+)/g.exec(markText.text);
		if (regex) {
			let count = regex[0][0] == "+" ? regex[0].length : -regex[0].length;
			let id = this.GetMarkId(text, MarkScope.Local, option.fileIndex);
			let marks = this.tempMarks[option.fileIndex];
			let temp = marks.filter(value => {
				return value.id == id && (count > 0 ? value.lineNumber > <number>option.lineNumber : value.lineNumber < (<number>option.lineNumber));
			});
			if (temp.length == 0)
				return;

			temp = temp.sort((a, b) => a.lineNumber - b.lineNumber);
			return count > 0 ? temp[0] : temp[temp.length - 1];
		}

		let markScope = text.startsWith(".") ? MarkScope.Local : MarkScope.Global;
		if (option.markScope)
			markScope = option.markScope;

		let id = this.GetMarkId(text, markScope, <number>option.fileIndex);
		if (!this.marks[id] || this.marks[id].type == MarkType.None)
			return;

		return this.marks[id];
	}
	//#endregion 查询标记

	//#region 检查文本是否符合标记
	/**
	 * 检查文本是否符合标记
	 * @param text 要检查的文本
	 * @returns 是否错误，True为错误
	 */
	CheckMarkIllegal(text: Word): boolean {
		if (Utils.StringIsEmpty(text.text))
			return true;

		if (/(^\d)|\+|\-|\*|\/|\=|"|\$|!|@|#|~|\,|\s|\[|\]|\(|\)/g.test(text.text)) {
			return true;
		}
		return false;
	}
	//#endregion 检查文本是否符合标记

	//#region 获取标签ID
	/**
	 * 获取标签ID
	 * @param text 标签文本
	 * @param markScope 标签作用域
	 * @param fileIndex 文件索引
	 */
	GetMarkId(text: string, markScope: MarkScope, fileIndex: number, lineNumber?: number): number {
		if (Utils.StringIsEmpty(text) && markScope == MarkScope.Global)
			return -1;

		let hash = 0;
		for (let i = 0; i < text.length; i++)
			hash = ((hash << 5) - hash) + text.charCodeAt(i);

		switch (markScope) {
			case MarkScope.Macro:
				// @ts-ignore
				hash = ((hash << 5) - hash) + markScope;
				break;
			case MarkScope.Local:
				hash = ((hash << 5) - hash) + fileIndex;
				break;
		}

		return hash;
	}
	//#endregion 获取标签ID

}