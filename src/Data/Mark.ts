import { Word } from "../Interface";
import Language from "../Language";
import { TempMarkReg } from "../MyConst";
import { MyError } from "../MyError";
import { Utils } from "../Utils/Utils";

/**标签作用域 */
export enum MarkScope { None, Global, Local, Macro }
/**标签类型 */
export enum MarkType { None, Defined, Variable }

//#region 单个标签
/**单个标签 */
export interface Mark {
	/**标签ID */
	id: number;
	/**父级ID */
	parentId: number;
	/**子标记ID */
	childrenIDs: number[];
	/**文件编号 */
	fileIndex: number;
	/**行号 */
	lineNumber: number;
	/**作用域 */
	scope: MarkScope;
	/**类型 */
	type: MarkType;
	/**字符 */
	text: Word;
	/**注释 */
	comment?: string;
	/**附加项 */
	tag?: any;
	/**值 */
	value?: number;
}
//#endregion 单个标签

/**所有标签类 */
export class Marks {

	/**所有标记 */
	marks: { [markId: number]: Mark } = {};
	/**文件内的标记ID */
	markFiles: { [fileIndex: number]: number[] } = [];
	/**临时标记 */
	tempMarks: { [fileIndex: number]: Mark[] } = {};

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
		let regex = new RegExp(TempMarkReg, "g").exec(markText.text);
		if (regex) {
			let text = markText.text.substring(regex.index + regex[0].length);

			if (!Utils.StringIsEmpty(text) &&
				this.CheckMarkIllegal({ text: text, startColumn: markText.startColumn + regex[0].length }))
				return;

			let mark: Mark = {
				id: this.GetMarkId(markText.text, MarkScope.Local, option),
				parentId: -1,
				childrenIDs: [],
				fileIndex: option.fileIndex,
				lineNumber: option.lineNumber,
				text: { startColumn: markText.startColumn, text: markText.text },
				type: MarkType.Defined,
				scope: MarkScope.Local,
			}

			if (!this.tempMarks[option.fileIndex])
				this.tempMarks[option.fileIndex] = [];

			if (option.value != undefined)
				mark.value = option.value;

			this.tempMarks[option.fileIndex].push(mark);
			return;
		}

		let marks = this.SplitMarksAndAdd(markText, option);
		return marks;
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
		let regex = new RegExp(TempMarkReg, "g").exec(markText.text);
		if (regex) {
			let count = regex[0][0] == "+" ? regex[0].length : -regex[0].length;
			let id = this.GetMarkId(text, MarkScope.Local, option);
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

		let id = this.GetMarkId(text, markScope, option);
		if (!this.marks[id] || this.marks[id].type == MarkType.None)
			return;

		return this.marks[id];
	}
	//#endregion 查询标记

	//#region 删除标记
	/**
	 * 删除标记
	 * @param markId 标记ID
	 */
	DeleteMark(markId: number) {
		if (!this.marks[markId])
			return;

		let index = this.markFiles[this.marks[markId].fileIndex].indexOf(this.marks[markId].id);
		if (index >= 0)
			this.markFiles[this.marks[markId].fileIndex].splice(index, 1);
		
		let mark = this.marks[markId];
		if (this.marks[markId].childrenIDs.length != 0) {
			this.marks[markId].type = MarkType.None;
		} else {
			delete this.marks[markId];
		}
	}
	//#endregion 删除标记

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
	GetMarkId(text: string, markScope: MarkScope, option: { fileIndex: number, lineNumber?: number }): number {
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
				hash = ((hash << 5) - hash) + option.fileIndex;
				break;
		}

		return hash;
	}
	//#endregion 获取标签ID

	//#region 分割标签属性并添加
	/**
	 * 分割标签属性并添加
	 * @param globalVar 全局变量
	 * @param text 要分割的文本
	 * @param option 选项，分别是fileIndex和lineNumber
	 * @returns 最后一个Mark和ID
	 */
	private SplitMarksAndAdd(
		text: Word,
		option: { fileIndex: number, lineNumber: number, value?: number, comment?: string, markScope?: MarkScope }
	): Mark {
		let words = Utils.SplitWithRegex(/\./g, 0, text.text, text.startColumn);
		let tempText = "";
		let scope = MarkScope.Global;
		let topParentId = -1;
		if (Utils.StringIsEmpty(words[0].text)) {
			words.splice(0, 1);
			scope = MarkScope.Local;
			tempText = ".";
			topParentId = this.GetMarkId("", scope, option)
		}

		if (option.markScope)
			scope = option.markScope;

		let tempMarks: Mark[] = [];
		for (let i = 0; i < words.length; i++) {
			if (this.CheckMarkIllegal(words[i])) {
				let error = new MyError(Language.ErrorMessage.MarkIllegal, words[i].text);
				error.SetPosition({
					fileIndex: option.fileIndex, lineNumber: option.lineNumber,
					startPosition: words[i].startColumn, length: words[i].text.length
				});
				MyError.PushError(error);
			}

			tempText += words[i].text;
			let id = this.GetMarkId(tempText, scope, option);
			if (!this.marks[id]) {
				let mark: Mark = {
					id: id,
					parentId: -1,
					childrenIDs: [],
					fileIndex: option.fileIndex,
					lineNumber: option.lineNumber,
					type: MarkType.None,
					scope: scope,
					text: words[i],
				};

				if (i == words.length - 1) {
					mark.type = MarkType.Defined;
					mark.comment = option.comment;
					mark.value = option.value;
					if (!this.markFiles[option.fileIndex])
						this.markFiles[option.fileIndex] = [];

					if (!this.markFiles[option.fileIndex].includes(mark.id))
						this.markFiles[option.fileIndex].push(mark.id);
				}
				tempMarks.push(mark);
			} else {
				if (i == words.length - 1) {
					if (this.marks[id].type != MarkType.None) {
						let error = new MyError(Language.ErrorMessage.MarkAlreadyExists, words[i].text);
						error.SetPosition({
							fileIndex: option.fileIndex, lineNumber: option.lineNumber,
							startPosition: words[i].startColumn, length: words[i].text.length
						});
						MyError.PushError(error);
					} else {
						this.marks[id].value = option.value;
						this.marks[id].type = MarkType.Defined;
					}
				}
				tempMarks.push(this.marks[id]);
			}
			tempText += ".";
		}

		// 设定其父级ID
		for (let i = 0; i < tempMarks.length; i++) {
			if (i == 0) {
				tempMarks[i].parentId = topParentId;
				continue;
			}
			tempMarks[i].parentId = tempMarks[i - 1].id;
		}

		// for (let i = 0; i < tempMarks.length; i++) {
		// 	let id = tempMarks[i].id;
		// 	if (!this.marks[id]) {
		// 		this.marks[id] = tempMarks[i];
		// 	}
		// }

		return tempMarks[tempMarks.length - 1];
	}
	//#endregion 分割标签属性并添加

}