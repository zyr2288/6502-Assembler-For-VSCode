import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";
import { Config, ProjectConfig } from "../Config";
import { AutoUpperCaseRegex } from "../MyConst";
import { GlobalVar, Project } from "../GlobalVar";
import { Helper } from "./Helper";
import { MyError } from "../MyError";
import { BaseAnalyse } from "../Base/BaseAnalyse";
import { Utils } from "../Utils/Utils";
import Language from "../Language";
import { ExpressionUtils } from "../Utils/ExpressionUtils";
import { MarkScope } from "../Data/Mark";
import { Macro } from "../Data/Macro";
import { ConfigFile, ExtensionCommandNames, FileExtension } from "./HelperConst";
import { CompileAllText, GetAsmResult, WriteIntoToFile, WriteToFile } from "../AsmLine/Compile";

export class HelperUtils {

	private static statusBarItem: vscode.StatusBarItem;
	private static freshThreadId: NodeJS.Timeout;
	private static freshTime = 1000;
	private static lastFreshFile: vscode.TextDocumentChangeEvent[] = [];
	static legend = new vscode.SemanticTokensLegend(["class"]);
	private static message = {
		/**所有错误，key为文件index */
		errors: <{ [key: string]: vscode.Diagnostic[] }>{},
		/**所有错误集合 */
		errorCollection: vscode.languages.createDiagnosticCollection(FileExtension.language),
		/**输出结果 */
		output: vscode.window.createOutputChannel("temp")
	};
	private static fileChangeName = false;

	//#region 读取配置文件
	static ReadConfig() {

		if (!vscode.workspace.workspaceFolders)
			return;

		let temp = vscode.workspace.workspaceFolders[0];
		let tempPath = `${temp.uri.fsPath}${path.sep}.vscode`;
		if (!fs.existsSync(tempPath))
			fs.mkdirSync(tempPath);

		let config = vscode.Uri.file(path.join(tempPath, ConfigFile));
		if (!fs.existsSync(config.fsPath)) {
			let data = JSON.stringify(Config.defaultConfig);
			fs.writeFileSync(config.fsPath, data, { encoding: "utf8" });
			Config.config = Config.defaultConfig;
		} else {
			Config.config = JSON.parse(fs.readFileSync(config.fsPath, { encoding: "utf8" }));
		}
	}
	//#endregion 读取配置文件

	//#region 回车自动大写与文本重新读取
	/**
	 * 回车自动大写与文本重新读取
	 * @param event 文档改变事件
	 */
	static DocumentChange(event: vscode.TextDocumentChangeEvent) {

		if (event.document.languageId != "asm6502")
			return;

		// 这里用来自动大写
		let total = event.contentChanges.length - 1;
		event.contentChanges.forEach((value) => {
			if (value.text.includes("\n")) {
				let lineNumber = value.range.start.line + total;
				total--;
				let content = event.document.lineAt(lineNumber).text;
				let regex = new RegExp(AutoUpperCaseRegex, "i");
				let match = regex.exec(content);
				if (match != null) {
					let range = new vscode.Range(lineNumber, match.index, lineNumber, match.index + match[0].length);
					let editor = <vscode.TextEditor>vscode.window.activeTextEditor;
					editor.edit((ee) => {
						// @ts-ignore 目前只能替换一个，原因未知
						ee.replace(range, match[0].toUpperCase());
					});
				}
			}
		});

		// 刷新文本内容
		let project = HelperUtils.GetFileProject(event.document.uri.fsPath);
		if (!project)
			return;

		let index = HelperUtils.lastFreshFile.findIndex((value) => {
			return value.document.uri.fsPath == event.document.uri.fsPath;
		});
		if (index < 0)
			HelperUtils.lastFreshFile.push(event);

		clearTimeout(HelperUtils.freshThreadId);
		HelperUtils.freshThreadId = setTimeout(() => {
			HelperUtils.lastFreshFile.forEach((value) => {
				HelperUtils.RefreshFile(event.document.uri.fsPath, event.document.getText());
			});
		}, HelperUtils.freshTime);
	}
	//#endregion 回车自动大写与文本重新读取

	//#region 刷新指定文件内的已定义变量
	/**
	 * 刷新指定文件内的已定义变量
	 * @param name 文件名
	 */
	static RefreshFile(fileName: string, context: string) {
		let project = HelperUtils.GetFileProject(fileName);
		if (!project)
			return;

		MyError.ClearFileError(project.project.globalVar.filePaths[project.index]);

		project.project.globalVar.marks.DeleteFileMarks(project.index);

		let lines = BaseAnalyse.BaseAnalyse(project.project.globalVar, fileName, context);
		BaseAnalyse.MainAnalyse(project.project.globalVar, lines);
		MyError.UpdateError();
	}
	//#endregion 刷新指定文件内的已定义变量

	//#region 获取定义变量所在位置
	/**
	 * 获取定义变量所在位置
	 * @param document 文档
	 * @param position 文档光标位置
	 * @param token 
	 */
	static FindDefinition(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken): vscode.Location[] {

		let result: vscode.Location[] = [];
		let text = HelperUtils.CommentRemove(document.lineAt(position.line).text);
		let range = HelperUtils.GetMarkWord(text, position.character);

		// 如果是文件路径信息
		if (range.type == 1) {
			let tempPath = path.dirname(document.uri.fsPath);
			let uri = vscode.Uri.file(path.join(tempPath, range.text));
			result.push(new vscode.Location(uri, new vscode.Range(0, 0, 0, 0)));
			return result;
		}

		// 如果是变量信息
		let project = HelperUtils.GetFileProject(document.uri.fsPath);
		if (!project)
			return [];

		let option = { fileIndex: project.index, lineNumber: position.line }
		let vari = project.project.globalVar.marks.FindMark(range.text, option);
		if (!vari)
			return [];

		let temp = new vscode.Location(
			vscode.Uri.file(project.project.globalVar.filePaths[vari.fileIndex]),
			new vscode.Range(vari.lineNumber, vari.text.startColumn, vari.lineNumber, vari.text.startColumn + vari.text.text.length)
		);
		result.push(temp);
		return result;
	}
	//#endregion 获取定义变量所在位置

	//#region 消息推送事件
	/**
	 * 消息推送事件
	 */
	static BingdingMessageEvent() {
		GlobalVar.BindingMessageEvent((message: string, filePath: string, lineNumber: number) => {
			HelperUtils.message.output.appendLine(Utils.StringFormat(Language.Info.Output, filePath, lineNumber.toString()));
			HelperUtils.message.output.appendLine(message);
			HelperUtils.message.output.appendLine("==========");
			HelperUtils.message.output.show();
		});
	}
	//#endregion 消息推送事件

	//#region 设置折叠信息
	/**
	 * 设置折叠信息
	 * @param document 
	 * @param context 
	 * @param token 
	 */
	static ProvideFoldingRanges(document: vscode.TextDocument, context: vscode.FoldingContext, token: vscode.CancellationToken): vscode.ProviderResult<vscode.FoldingRange[]> {
		let result: vscode.FoldingRange[] = [];
		let lineCount = document.lineCount;

		let start: number[] = [];

		for (let i = 0; i < lineCount; i++) {
			let text = document.lineAt(i).text;
			if (text.includes(";+")) {
				start.push(i);
			} else if (text.includes(";-")) {
				if (start.length > 0) {
					result.push({ start: <number>start.pop(), end: i });
				}
			}
		}

		return result;
	}
	//#endregion 设置折叠信息

	//#region 鼠标停留获取变量信息
	/**
	 * 当鼠标移动到变量上的提示
	 * @param document 文档
	 * @param position 鼠标位置
	 * @param token 
	 */
	static HoverHelp(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken): vscode.Hover {
		let result: vscode.MarkdownString[] = [];

		let text = HelperUtils.CommentRemove(document.lineAt(position.line).text);

		let range = HelperUtils.GetMarkWord(text, position.character);
		if (range.type != 0)
			return new vscode.Hover(result);

		let resultValue = ExpressionUtils.CheckNumber(range.text);
		if (!resultValue) {
			let project = HelperUtils.GetFileProject(document.uri.fsPath);
			if (!project)
				return new vscode.Hover(result);

			let option = { fileIndex: project.index, lineNumber: position.line };
			let vari = project.project.globalVar.marks.FindMark(range.text, option);
			if (vari) {
				if (vari.comment)
					result.push(new vscode.MarkdownString("**" + vari.comment.trim() + "**"));

				if (vari.scope == MarkScope.Macro) {
					result.push(
						new vscode.MarkdownString(Utils.StringFormat(Language.Info.ParamtersCount, (<Macro>vari.tag).parametersCount.toString()))
					);
					return new vscode.Hover(result);
				}

				if (vari.value != undefined) {
					resultValue = vari.value;
				}
			}
		}

		if (resultValue != null) {
			// 2进制的运算
			let length = 0;
			let temp = <number>resultValue;
			do {
				length += 8;
				temp >>= 8;
			} while (temp > 0)
			let bin = HelperUtils.StringPadLeft((<number>resultValue).toString(2), length, "0").split("");
			for (let i = 0; i < length / 4; i++)
				bin.splice(4 * i + i, 0, " ");

			// 结果放入2进制
			result.push(new vscode.MarkdownString(`BIN: \`@${bin.join("").substring(1)}\``));

			// 结果放入10进制
			result.push(new vscode.MarkdownString(`DEC: \`${(<number>resultValue).toString()}\``));

			// 结果放入16进制
			result.push(new vscode.MarkdownString(`HEX: \`$${(<number>resultValue).toString(16).toUpperCase()}\``));
		}

		return new vscode.Hover(result);
	}
	//#endregion 鼠标停留获取变量信息

	//#region 自定义高亮
	/**
	 * 自定义高亮
	 * @param document 
	 * @param token 
	 */
	static ProvideDocumentSemanticTokens(document: vscode.TextDocument, token: vscode.CancellationToken): vscode.ProviderResult<vscode.SemanticTokens> {
		let project = HelperUtils.GetFileProject(document.fileName);
		if (!project)
			return;

		if (!project.project.globalVar.marks.macroRegex)
			return;

		const tokensBuilder = new vscode.SemanticTokensBuilder(HelperUtils.legend);

		let regex = new RegExp(project.project.globalVar.marks.macroRegex, "g");
		let match: RegExpExecArray | null;
		let text = document.getText();
		while (match = regex.exec(text)) {
			let word = Utils.StringTrim(match[0], match.index);
			let start = document.positionAt(word.startColumn);
			let end = document.positionAt(word.startColumn + word.text.length);
			tokensBuilder.push(new vscode.Range(start, end), "class");
		}
		return tokensBuilder.build();
	}
	//#endregion 自定义高亮

	//#region 注册自定义命令
	/**
	 * 注册自定义命令
	 */
	static RegisterMyCommand() {

		//#region 绑定命令编译本文件
		vscode.commands.registerCommand(ExtensionCommandNames.CompliteThis, async () => {
			if (!vscode.window.activeTextEditor)
				return;

			HelperUtils.ShowStatueBar(`$(sync~spin) ${Language.Info.Compiling}`);
			HelperUtils.ReadConfig();

			let text = vscode.window.activeTextEditor.document.getText();
			let filePath = vscode.window.activeTextEditor.document.uri;


			let lines = CompileAllText(text, filePath.fsPath);
			let writeToFile = Config.ReadProperty("", "singleFile", "outFile");
			if (writeToFile) {
				WriteToFile(lines, writeToFile);
			}

			let copy = Config.ReadProperty(false, "singleFile", "copyCodeToClipboard");
			if (copy) {
				vscode.env.clipboard.writeText(Utils.ByteToString(GetAsmResult(lines)));
			}

			let showText = MyError.isError ? ` $(alert) ${Language.Info.CompileError}` : ` $(check) ${Language.Info.Finished}`;
			HelperUtils.ShowStatueBar(showText, 3000);
		});
		//#endregion 绑定命令编译本文件

		//#region 绑定命令编译主文件
		vscode.commands.registerCommand(ExtensionCommandNames.CompliteMain, async () => {
			if (!vscode.workspace.workspaceFolders)
				return;

			HelperUtils.ShowStatueBar("$(sync~spin) 编译中");
			HelperUtils.ReadConfig();

			let projects: ProjectConfig[] = Config.ReadProperty([], "projects");
			let needName = projects.length > 1;
			let result = "";
			for (let i = 0; i < projects.length; i++) {
				if (Utils.StringIsEmpty(projects[i].entry))
					continue;

				let uri = Utils.GetFilePath(projects[i].entry, vscode.workspace.workspaceFolders[0].uri.fsPath);
				if (!fs.existsSync(uri.fsPath)) {
					let err = Utils.StringFormat(Language.ErrorMessage.EntryFileIsNotExist, uri.fsPath);
					vscode.window.showErrorMessage(err);
					continue;
				}

				let text = fs.readFileSync(uri.fsPath, { encoding: "utf8" });

				let lines = CompileAllText(text, uri.fsPath);
				if (projects[i].outFile)
					WriteToFile(lines, projects[i].outFile);

				if (projects[i].patchFile)
					WriteIntoToFile(lines, projects[i].patchFile);

				if (projects[i].copyCodeToClipboard) {
					if (needName)
						result += `${projects[i].name}:\r\n`;

					result += `${Utils.ByteToString(GetAsmResult(lines))}\r\n`;
				}
			}

			if (!Utils.StringIsEmpty(result))
				vscode.env.clipboard.writeText(result);

			let showText = MyError.isError ? " $(alert) 编译有错误" : " $(check) 编译成功";
			HelperUtils.ShowStatueBar(showText, 3000);
		});
		//#endregion 绑定命令编译主文件

	}
	//#endregion 注册自定义命令

	//#region 监视文件变动
	/**
	 * 监视文件变动
	 */
	static CreateFileWatcher(): void {

		// 文件改名函数顺序 onDidRenameFiles -> onDidCreate -> onDidDelete

		let watcher = vscode.workspace.createFileSystemWatcher(`**/*${FileExtension.extension}`, false, false, false);
		vscode.workspace.onDidRenameFiles(e => {
			HelperUtils.fileChangeName = true;
			e.files.forEach(value => {
				if (path.extname(value.newUri.fsPath) == FileExtension.extension && path.extname(value.oldUri.fsPath) == FileExtension.extension) {
					Helper.projects.forEach(project => {
						let temp = project.globalVar.filePaths.indexOf(value.oldUri.fsPath);
						if (temp >= 0) {
							project.globalVar.filePaths[temp] = value.newUri.fsPath;
						}
					});
				}
			})
		});

		// 监视增加文件
		watcher.onDidCreate(async (fileUri) => {
			if (HelperUtils.fileChangeName)
				return;

			HelperUtils.ReadConfig();
			Helper.projects.forEach(async (value, index) => {
				let filter = HelperUtils.GetConfigFiles(index);
				let files = await vscode.workspace.findFiles(filter.includes, filter.excludes);
				files = files.filter(value => {
					return value.fsPath == fileUri.fsPath;
				});
				value.globalVar.GetFileIndex(fileUri.fsPath);
			});
		});

		watcher.onDidChange((fileUri) => {
			if (!vscode.workspace.workspaceFolders)
				return;

			let config = Utils.GetFilePath(`.vscode${path.sep}${ConfigFile}`, vscode.workspace.workspaceFolders[0].uri.fsPath);
			if(fileUri.fsPath != config.fsPath)
				return;

			Helper.HelperInit();
		});

		// 监视删除文件
		watcher.onDidDelete((fileUri) => {
			if (HelperUtils.fileChangeName) {
				HelperUtils.fileChangeName = false;
				return;
			}

			HelperUtils.ReadConfig();
			Helper.projects.forEach(value => {
				let index = value.globalVar.GetFileIndex(fileUri.fsPath, false);
				if (index != -1) {
					value.globalVar.marks.DeleteFileMarks(index);
					delete value.globalVar.filePaths[index];
				}
			});
		});
	}
	//#endregion 监视文件变动

	/***** 工具 *****/

	//#region 获取文件筛选
	/**
	 * 获取文件筛选
	 * @param projectIndex 项目索引
	 */
	static GetConfigFiles(projectIndex: number) {
		let temp: string[] = Config.ReadProperty(["**/*.65s"], "projects", projectIndex, "includes");

		let includes = "";
		temp.forEach(value => {
			if (!Utils.StringIsEmpty(value)) {
				includes += value.trim() + ",";
			}
		});
		includes = "{" + includes.substring(0, includes.length - 1) + "}";

		temp = Config.ReadProperty([], "projects", projectIndex, "excludes");
		let excludes = "";
		temp.forEach(value => {
			if (!Utils.StringIsEmpty(value)) {
				excludes += value.trim() + ",";
			}
		});
		excludes = "{" + excludes.substring(0, excludes.length - 1) + "}";

		return { includes: includes, excludes: excludes };
	}
	//#endregion 获取文件筛选

	//#region 获取文件所在的工程
	/**
	 * 获取文件所在的工程
	 * @param name 文件名称
	 * @returns project工程，index文件index
	 */
	static GetFileProject(name: string): { project: Project, index: number } | undefined {
		for (let i = 0; i < Helper.projects.length; i++) {
			let index = Helper.projects[i].FindFileIndex(name, false);
			if (index > -1)
				return { project: Helper.projects[i], index: index };
		}
		return;
	}
	//#endregion 获取文件所在的工程

	//#region 获取光标内的内的文本
	/**
	 * 获取光标内的内的文本
	 * @param text 文本
	 * @param pos 位置
	 * @returns 起始位置、长度、类型(0变量，1文件路径)
	 */
	static GetMarkWord(line: string, position: number): { startColumn: number, text: string, type: number } {
		let preMatch = /(^|\s+)\.INC(LUDE|BIN)\s+".+"/i.exec(line);
		if (preMatch != null) {
			let index = preMatch[0].indexOf("\"");
			return {
				startColumn: preMatch.index + index,
				text: preMatch[0].substring(index + 1, preMatch[0].length - 1),
				type: 1
			};
		}

		let reg = new RegExp(AutoUpperCaseRegex);
		let match = reg.exec(line.substring(0, position));

		let reg2 = new RegExp(AutoUpperCaseRegex);
		let match2 = reg2.exec(line);

		let temp: RegExpMatchArray | null;
		if (match2 && position <= match2.index && (temp = /^\s*(\++|\-+)/.exec(line.substring(0, match2.index))) != null) {
			// 临时变量
			return { startColumn: <number>temp.index, text: temp[0], type: 0 };
		} else if (match && (temp = /^\s*(\++|\-+)/.exec(line.substring(match.index + match[0].length))) != null) {
			// 临时变量
			return { startColumn: match.index + match[0].length, text: temp[0], type: 0 };
		} else {
			let left = line.substring(0, position).split("").reverse().join("");		//翻转
			let right = line.substring(position);

			let m1 = <RegExpExecArray>/\s+|\<|\>|\+|\-|\*|\/|\,|\(|\)|\=|\#|$/g.exec(left);
			let m2 = <RegExpExecArray>/\s+|\<|\>|\+|\-|\*|\/|\,|\(|\)|\=|\#|$/g.exec(right);

			let leftIndex = left.length - m1.index + 1;
			left = left.substring(0, m1.index).split("").reverse().join("");
			line = left + right.substring(0, m2.index);

			return { startColumn: leftIndex, text: line, type: 0 };
		}

	}
	//#endregion 获取光标内的内的文本

	//#region 移除注释
	/**
	 * 移除注释
	 * @param text 要分析的字符串
	 * @returns 已移除注释的字符串
	 */
	static CommentRemove(text: string): string {
		let index = text.indexOf(";");
		if (index >= 0)
			return text.substring(0, index);

		return text;
	}
	//#endregion 移除注释

	//#region 给字符串左边补足位
	/**
	 * 给字符串左边补足位
	 * @param source 要补位的字符串
	 * @param total 要补的总数
	 * @param pad 要补充的字符串
	 */
	private static StringPadLeft(source: string, total: number, pad: string) {
		return (Array(total).join(pad) + source).slice(-total);
	}
	//#endregion 给字符串左边补足位

	//#region 状态栏显示条目
	/**
	 * 状态栏显示条目
	 * @param text 显示的文本
	 * @param timer 显示时间，0为一直显示
	 */
	static ShowStatueBar(text: string, timer: number = 0): void {
		if (!this.statusBarItem)
			this.statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left);

		this.statusBarItem.text = text;
		this.statusBarItem.show();

		if (timer > 0)
			setTimeout(() => this.statusBarItem.hide(), timer);
	}
	//#endregion 状态栏显示条目

}