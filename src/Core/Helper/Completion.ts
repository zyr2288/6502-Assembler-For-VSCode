import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";
import { AssemblerCommands, AutoUpperCaseRegex, IgnoreCommaRegex, InstrumentTable } from "../MyConst";
import { ExtensionCommandNames, FileExtension } from "./HelperConst";
import { GlobalVar } from "../GlobalVar";
import { MarkScope } from "../Data/Mark";
import { HelperUtils } from "./HelperUtils";
import { Macro } from "../Data/Macro";
import { Utils } from "../Utils/Utils";
import { DataGroup } from "../Data/DataGroup";

const InstrumentWithoutExpression = [
	"TXA", "TAX", "TYA", "TAY", "TXS", "TSX",
	"CLC", "SEC", "CLD", "SED", "CLV", "CLI", "SEI",
	"PHA", "PLA", "PHP", "PLP",
	"INX", "INY", "DEX", "DEY",
	"NOP",
	"RTS", "RTI", "BRK"
]

const InMacroCommand = [
	".IF", ".IFDEF", ".IFNDEF", "ELSEIF", "ELSE", "ENDIF",
	".HEX", ".DB", ".DW",
	".REPEAT", ".ENDR",
	".MSG"
]

enum CompletionType {
	/**无提示 */
	None,
	/**基础提示 */
	Base,
	/**为自定义标记 */
	Mark
}

enum RangeType { None, DataGroup, Macro }

export class Completion extends vscode.CompletionItem {

	/**所有编译器指令 */
	private static commandSuggestion: Completion[] = [];
	/**在Macro内支持的编译器指令 */
	private static inMacroCommand: Completion[] = [];
	/**所有汇编指令 */
	private static instrumentSuggestion: Completion[] = [];
	/**文件路径 */
	static filePathSuggestion: { findPath: boolean, items: Completion[] } = { findPath: false, items: [] };

	//#region 智能提示初始化
	/**
	 * 智能提示初始化
	 */
	static Init() {

		// 添加汇编指令
		for (let key in InstrumentTable) {
			let item = new Completion(key, vscode.CompletionItemKind.Keyword);
			if (InstrumentWithoutExpression.includes(key)) {
				item.insertText = new vscode.SnippetString(`${key}\n`);
			} else {
				item.insertText = new vscode.SnippetString(`${key} `);
			}
			item.sortText = "1";
			Completion.instrumentSuggestion.push(item);
		}

		// 添加命令
		for (let i = 0; i < AssemblerCommands.length; i++) {
			let item = new Completion(AssemblerCommands[i], vscode.CompletionItemKind.Method);
			switch (AssemblerCommands[i]) {
				case ".INCBIN":
					item.insertText = new vscode.SnippetString(AssemblerCommands[i] + " \"${1:}\"");
					item.command = {
						title: "运行相对路径智能提示",
						command: ExtensionCommandNames.GetThisFilePath,
						arguments: [false]
					};
					break;
				case ".INCLUDE":
					item.insertText = new vscode.SnippetString(AssemblerCommands[i] + " \"${1:}\"");
					item.command = {
						title: "运行相对路径智能提示",
						command: ExtensionCommandNames.GetThisFilePath,
						arguments: [true]
					};
					break;
				case ".DBG":
				case ".DWG":
					item.insertText = new vscode.SnippetString(AssemblerCommands[i] + " ${1:name}\n${2:}\n.ENDD");
					break;
				case ".IF":
				case ".IFDEF":
				case ".IFNDEF":
					item.insertText = new vscode.SnippetString(AssemblerCommands[i] + " ${1:}\n${2:}\n.ENDIF");
					break;
				case ".REPEAT":
					item.insertText = new vscode.SnippetString(AssemblerCommands[i] + " ${1:}\n${2:}\n.ENDR");
					break;
				case ".MACRO":
					item.insertText = new vscode.SnippetString(AssemblerCommands[i] + " ${1:}\n${2:}\n.ENDM");
					break;
				case ".BASE":
				case ".ORG":
				case ".MSG":
				case ".DEF":
				case ".DB":
				case ".DW":
				case ".HEX":
					item.insertText = new vscode.SnippetString(AssemblerCommands[i] + " ");
					break;
			}
			item.sortText = "1";
			Completion.commandSuggestion.push(item);
			if (InMacroCommand.includes(AssemblerCommands[i]))
				Completion.inMacroCommand.push(item);
		}

		// 注册查找路径命令
		vscode.commands.registerTextEditorCommand(ExtensionCommandNames.GetThisFilePath, (editor, edit, filterFile: boolean, basePath?: string) => {
			Completion.filePathSuggestion.findPath = true;
			if (!basePath)
				basePath = path.dirname(editor.document.uri.fsPath);

			if (!vscode.workspace.workspaceFolders)
				return;

			Completion.filePathSuggestion.items = [];

			// 如果是不是根目录，则添加上一级的
			if (vscode.workspace.workspaceFolders[0].uri.fsPath != basePath) {
				let item = new Completion(`..${path.sep}`);
				item.sortText = "0";
				item.command = {
					title: "运行相对路径智能提示",
					command: ExtensionCommandNames.GetThisFilePath,
					arguments: [filterFile, path.join(basePath, "..")]
				}
				Completion.filePathSuggestion.items.push(item);
			}

			let files = fs.readdirSync(basePath);

			// 如果在同一级文件夹，则排除本文件
			if (path.dirname(editor.document.uri.fsPath) == basePath) {
				let thisFileName = path.basename(editor.document.uri.fsPath);
				let index = files.indexOf(thisFileName);
				if (index >= 0)
					files.splice(index, 1);
			}

			for (let i = 0; i < files.length; i++) {
				let item = new Completion(`${files[i]}`);
				let tempPath = path.join(basePath, files[i]);
				if (fs.statSync(tempPath).isDirectory()) {
					item.kind = vscode.CompletionItemKind.Folder;
					item.insertText = `${files[i]}\\`;
					item.sortText = "1";
					item.command = {
						title: "运行相对路径智能提示",
						command: ExtensionCommandNames.GetThisFilePath,
						arguments: [filterFile, tempPath]
					}
				} else if (filterFile && path.extname(files[i]) != FileExtension.extension) {
					continue;
				} else {
					item.kind = vscode.CompletionItemKind.File;
					item.sortText = "2";
				}
				item.range = new vscode.Range(editor.selection.active, editor.selection.active);
				Completion.filePathSuggestion.items.push(item);
			}
			vscode.commands.executeCommand("editor.action.triggerSuggest");
		});
	}
	//#endregion 智能提示初始化

	//#region 智能提示
	/**
	 * 智能提示
	 * @param document 文档
	 * @param position 位置
	 * @param token 
	 * @param context 触发的条件
	 */
	static ProvideCompletionItem(
		document: vscode.TextDocument,
		position: vscode.Position,
		token: vscode.CancellationToken,
		context: vscode.CompletionContext
	): vscode.ProviderResult<vscode.CompletionItem[] | vscode.CompletionList> {
		let lineText = document.lineAt(position.line).text;
		let beforeText = lineText.substring(0, position.character);

		if (Completion.filePathSuggestion.findPath) {
			Completion.filePathSuggestion.findPath = false;
			return { items: Completion.filePathSuggestion.items };
		}

		// 之前如果有注释
		if (beforeText.includes(";"))
			return { items: [] };

		// 之前如果是汇编指令并且有逗号
		if (new RegExp(IgnoreCommaRegex, "ig").test(beforeText))
			return { items: [] };

		/**之前或之后的文本 */
		let text = HelperUtils.GetMarkWord(beforeText, position.character);
		if (/[@\$]/g.test(text.text))
			return { items: [] };

		// 获取项目
		let project = HelperUtils.GetFileProject(document.uri.fsPath);
		if (!project)
			return { items: [] };

		let helper = { type: CompletionType.None, macroName: <string | undefined>undefined };
		let temp = Completion.GetRange(document.getText(), document.offsetAt(position));
		if (temp.rangeType == RangeType.DataGroup) {
			helper.type = CompletionType.Mark;
		} else {
			helper.macroName = temp.macroName;
			helper.type = Completion.GetCommand(beforeText);
		}

		return Completion.GetCompletionList(text.text, position, helper, project.project.globalVar, project.index, context.triggerCharacter);
	}
	//#endregion 智能提示

	//#region 获取帮助
	/**
	 * 获取帮助
	 * @param prefix 前缀
	 * @param position 光标位置
	 * @param helperType 帮助类型
	 * @param globalVar 全局变量
	 * @param fileIndex 文件索引
	 * @param trigger 触发字符
	 */
	private static GetCompletionList(
		prefix: string,
		position: vscode.Position,
		helperType: { type: CompletionType, macroName?: string },
		globalVar: GlobalVar,
		fileIndex: number,
		trigger?: string
	): vscode.ProviderResult<vscode.CompletionItem[] | vscode.CompletionList> {
		let result: Completion[] = [];
		let option = { fileIndex: fileIndex, lineNumber: position.line };
		if (helperType.type == CompletionType.None) {
			return { items: [] };
		} else if (helperType.type == CompletionType.Base) {
			switch (trigger) {
				case ".":
					if (helperType.macroName) {
						result = Completion.CopyCompletions(Completion.inMacroCommand);
					} else {
						result = Completion.CopyCompletions(Completion.commandSuggestion);
					}
					break;
				default:
					result = Completion.CopyCompletions(Completion.instrumentSuggestion);
					break;
			}
			for (let i = 0; i < globalVar.marks.macroNames.length; i++) {
				let item = new Completion(globalVar.marks.macroNames[i], vscode.CompletionItemKind.Property);
				let vari = globalVar.marks.FindMark(globalVar.marks.macroNames[i], option);
				item.detail = vari?.comment;
				item.sortText = "0";
				result.push(item);
			}
			return { items: result };
		}

		// 自定义函数部分
		if (helperType.macroName) {
			let mark = globalVar.marks.FindMark(helperType.macroName, option);
			if (mark && mark.tag) {
				let macro: Macro = mark.tag;
				macro.parameters.forEach(value => {
					let item = new Completion(value.text.text, vscode.CompletionItemKind.Property);
					result.push(item);
				});
			}
		}

		let scope = prefix.startsWith(".") ? MarkScope.Local : MarkScope.Global;

		// 数据组部分
		if (trigger == ":") {
			let part = Utils.SplitWithRegex(/:/g, 0, prefix);
			part.splice(part.length - 1, 1);
			let data: DataGroup | undefined = undefined;
			if (part.length >= 1) {
				let id = globalVar.marks.GetMarkId(part[0].text, scope, option);
				data = globalVar.marks.marks[id].tag;
			}

			if (!data)
				return { items: [] };

			let temp = new Set(data.memberIds);
			temp.forEach(value => {
				if (globalVar.marks.marks[value]) {
					let item = new Completion(globalVar.marks.marks[value].text.text, vscode.CompletionItemKind.EnumMember);
					let datas = data?.memberIds.filter(dataValue => { return dataValue == value });
					if (datas && datas.length > 1) {
						let temp = "";
						for (let i = 0; i < datas.length; i++)
							temp += `${i},`;

						temp = temp.substring(0, temp.length - 1);
						item.insertText = new vscode.SnippetString(`${globalVar.marks.marks[value].text.text}:\${1|${temp}|}`);
					}
					result.push(item);
				}
			});
			return { items: result };
		}


		prefix = prefix.substring(0, prefix.lastIndexOf("."));
		let id = globalVar.marks.GetMarkId(prefix, scope, option);
		if (!globalVar.marks.marks[id])
			return { items: result };

		let markIDs = globalVar.marks.marks[id].childrenIDs;
		for (let i = 0; i < markIDs.length; i++) {
			let item = new Completion(globalVar.marks.marks[markIDs[i]].text.text, vscode.CompletionItemKind.Field);				// 显示的文本
			switch (trigger) {
				case ".":
					item.label = `${globalVar.marks.marks[markIDs[i]].text.text}`;
					item.filterText = `.${globalVar.marks.marks[markIDs[i]].text.text}`;
					item.insertText = `.${globalVar.marks.marks[markIDs[i]].text.text}`;
					item.range = new vscode.Range(position.line, position.character - 1, position.line, position.character);
					break;
			}
			item.detail = globalVar.marks.marks[markIDs[i]].comment;
			result.push(item);
		}

		return { items: result };
	}
	//#endregion 获取帮助

	/***********/

	//#region 获取区间
	/**
	 * 获取区间
	 * @param text 所有文本
	 * @param position 位置
	 */
	private static GetRange(text: string, position: number) {
		let result = { rangeType: RangeType.None, macroName: <string | undefined>undefined };

		let regex = /(?<=\.D[BW]G.*\r?\n)(.*\r?\n)*?(?=.*\.ENDD)/ig;
		let match: RegExpExecArray | null;
		while (match = regex.exec(text)) {
			if (position >= match.index && position < match.index + match[0].length) {
				result.rangeType = RangeType.DataGroup;
				return result;
			}
		}

		regex = /(?<=\.MACRO\s+(.*)\s+.*\r?\n)(.*\r?\n)*?(?=.*\.ENDM)/ig;
		while (match = regex.exec(text)) {
			if (position >= match.index && position < match.index + match[0].length) {
				result.rangeType = RangeType.Macro;
				result.macroName = match[1];
				return result;
			}
		}

		return result;
	}
	//#endregion 获取区间

	//#region 获取之前文本匹配的命令
	/**
	 * 获取之前文本匹配的命令
	 * @param prefix 之前的所有文本
	 */
	private static GetCommand(prefix: string): CompletionType {
		let match = new RegExp(AutoUpperCaseRegex, "ig").exec(prefix)
		if (!match) {
			if (prefix.includes("="))		// 若没有命令且前有等号
				return CompletionType.Mark;

			return CompletionType.Base;
		}

		let command = match[0].trim().toUpperCase();
		switch (command) {
			case ".DEF": {
				let temp = prefix.substring(match.index + match[0].length);
				if (/^.+\s+/g.test(temp)) {
					return CompletionType.Mark;
				} else {
					return CompletionType.None;
				}
			}
			case ".HEX":
				return CompletionType.None;
			default:
				return CompletionType.Mark;
		}
	}
	//#endregion 获取之前文本匹配的命令

	//#region 复制Completion数组
	private static CopyCompletions(items: Completion[]) {
		let result: Completion[] = [];
		items.forEach((value) => {
			result.push(value.Copy());
		});
		return result;
	}
	//#endregion 复制Completion数组

	//#region 复制一个帮助
	/**
	 * 复制一个帮助
	 */
	Copy(): Completion {
		let item = new Completion(this.label, this.kind);
		item.sortText = this.sortText;
		item.filterText = this.filterText;
		item.insertText = this.insertText;
		item.detail = this.detail;
		item.command = this.command;

		return item;
	}
	//#endregion 复制一个帮助

}