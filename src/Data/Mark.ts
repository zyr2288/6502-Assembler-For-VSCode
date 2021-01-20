import { GlobalVar } from "../GlobalVar";
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
	markFiles: number[][] = [];
	/**临时标记 */
	tempMarks: { [fileIndex: number]: Mark[] } = {};

	//#region 添加标记
	/**
	 * 添加标记
	 * @param text 要添加的文本
	 * @param option 选项
	 */
	AddMark(
		text: Word,
		filePaths: string[],
		option: { fileIndex: number, lineNumber: number, markScope?: MarkScope, value?: number, comment?: string }
	): Mark | undefined {
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

		let marks = this.SplitMarksAndAdd(markText, filePaths, option);
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

		if (this.marks[markId].childrenIDs.length != 0) {
			this.marks[markId].type = MarkType.None;
		} else {
			while (true) {
				let parentId = this.marks[markId].parentId;						// 查找父级ID
				if (!this.marks[parentId])
					break;

				let index = this.marks[parentId].childrenIDs.indexOf(markId);	// 父级标签中子集位置
				if (index >= 0)
					this.marks[parentId].childrenIDs.splice(index, 1);			// 删除标签

				delete this.marks[markId];										// 删除子标签
				markId = parentId;

				if (!this.marks[markId] || this.marks[markId].childrenIDs.length != 0 || this.marks[markId].type != MarkType.None)
					break;
			}
		}
	}
	//#endregion 删除标记

	//#region 删除某个文件ID内的所有Mark
	/**
	 * 删除某个文件ID内的所有Mark
	 * @param fileIndex 文件ID
	 */
	DeleteFileMarks(fileIndex: number) {
		if (!this.markFiles[fileIndex])
			return;

		let marks = this.markFiles[fileIndex];
		for (let i = 0; i < marks.length; i++) {
			this.DeleteMark(marks[i]);
		}
	}
	//#endregion 删除某个文件ID内的所有Mark

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
	 * @param text 要分割的文本
	 * @param filePaths 所有文本，用作报错
	 * @param option 选项，分别是fileIndex和lineNumber
	 * @returns 最后一个Mark和ID
	 */
	private SplitMarksAndAdd(
		text: Word,
		filePaths: string[],
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
			tempText += words[i].text;
			let id = this.GetMarkId(tempText, scope, option);
			if (!this.marks[id]) {
				if (this.CheckMarkIllegal(words[i])) {
					let error = new MyError(Language.ErrorMessage.MarkIllegal, words[i].text);
					error.SetPosition({
						filePath: filePaths[option.fileIndex], lineNumber: option.lineNumber,
						startPosition: words[i].startColumn, length: words[i].text.length
					});
					MyError.PushError(error);
				}

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
				this.marks[id] = mark;
				tempMarks.push(mark);
			} else {
				if (i == words.length - 1) {
					if (this.marks[id].type != MarkType.None) {
						let error = new MyError(Language.ErrorMessage.MarkAlreadyExists, words[i].text);
						error.SetPosition({
							filePath: filePaths[option.fileIndex], lineNumber: option.lineNumber,
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

		for (let i = 0; i < tempMarks.length - 1; i++) {
			if (!tempMarks[i].childrenIDs.includes(tempMarks[i + 1].id)) {
				tempMarks[i].childrenIDs.push(tempMarks[i + 1].id);
			}
		}

		return tempMarks[tempMarks.length - 1];
	}
	//#endregion 分割标签属性并添加

}