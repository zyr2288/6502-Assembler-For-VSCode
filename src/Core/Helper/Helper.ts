import * as vscode from "vscode";
import * as fs from "fs";
import { Config } from "../Config";
import { BaseLine } from "../Base/BaseLine";
import { Project } from "../GlobalVar";
import { BaseAnalyse } from "../Base/BaseAnalyse";
import { MyError } from "../MyError";
import { HelperUtils } from "./HelperUtils";
import { FileExtension } from "./HelperConst";
import { Completion } from "./Completion";

export class Helper {
	private static error = {
		/**所有错误，key为文件index */
		errors: <{ [key: string]: vscode.Diagnostic[] }>{},
		/**所有错误集合 */
		errorCollection: vscode.languages.createDiagnosticCollection("asm6502")
	};

	static projects: Project[] = [];

	static async HelperInit() {

		HelperUtils.ReadConfig();
		HelperUtils.BingdingMessageEvent();

		MyError.BindingErrorEvent(Helper.UpdateError, Helper.ClearAllError);

		Helper.projects = [];

		for (let i = 0; i < Config.config.projects.length; i++) {
			if (!vscode.workspace.workspaceFolders)
				continue;

			let filter = HelperUtils.GetConfigFiles(i);

			let files = await vscode.workspace.findFiles(filter.includes, filter.excludes);
			let project = new Project();
			MyError.UpdateErrorFilePaths(project.globalVar.filePaths);
			let baseLines: BaseLine[] = [];
			for (let j = 0; j < files.length; j++) {
				let index = vscode.workspace.textDocuments.findIndex((value) => {
					return value.uri.fsPath == files[j].fsPath
				});
				let text = "";
				if (index < 0) {
					text = fs.readFileSync(files[j].fsPath, { encoding: "utf8" });
				} else {
					text = vscode.workspace.textDocuments[index].getText();
				}
				let temp = BaseAnalyse.BaseAnalyse(project.globalVar, files[j].fsPath, text);
				baseLines = baseLines.concat(temp);
			}

			BaseAnalyse.MainAnalyse(project.globalVar, baseLines);
			MyError.UpdateError();
			Helper.projects[i] = project;
		}

		// 更新折叠信息
		vscode.languages.registerFoldingRangeProvider(FileExtension, { provideFoldingRanges: HelperUtils.ProvideFoldingRanges });

		// 智能提示
		if (Config.config.suggestion) {
			Completion.Init();
			vscode.languages.registerCompletionItemProvider(FileExtension, { provideCompletionItems: Completion.ProvideCompletionItem }, ".", ":");
		}

		// 自动大写与文件更新
		vscode.workspace.onDidChangeTextDocument(HelperUtils.DocumentChange);
		// 查找定义
		vscode.languages.registerDefinitionProvider(FileExtension, { provideDefinition: HelperUtils.FindDefinition });
		// 鼠标停留提示
		vscode.languages.registerHoverProvider(FileExtension, { provideHover: HelperUtils.HoverHelp });
		// 自定义高亮
		vscode.languages.registerDocumentSemanticTokensProvider(
			FileExtension,
			{ provideDocumentSemanticTokens: HelperUtils.ProvideDocumentSemanticTokens },
			HelperUtils.legend
		);

		HelperUtils.CreateFileWatcher();
		HelperUtils.RegisterMyCommand();
	}

	//#region 更新错误提示
	/**
	 * 更新错误提示
	 * @param globalVar 全局变量
	 * @param error 要更新的错误
	 */
	private static UpdateError(error: MyError) {
		let range = new vscode.Range(error.lineNumber, error.startPosition, error.lineNumber, error.startPosition + error.length);
		if (!Helper.error.errors[error.filePath])
			Helper.error.errors[error.filePath] = [];

		Helper.error.errors[error.filePath].push(new vscode.Diagnostic(range, error.message));
		let fileUri = vscode.Uri.file(error.filePath);
		Helper.error.errorCollection.set(fileUri, Helper.error.errors[error.filePath]);
	}
	//#endregion 更新错误提示

	//#region 清除错误
	/**
	 * 清除错误
	 * @param filePath 文件路径
	 */
	private static ClearAllError(filePath?: string) {
		if (!filePath) {
			Helper.error.errors = {};
			Helper.error.errorCollection.clear();
		} else if (Helper.error.errors[filePath]) {
			Helper.error.errors[filePath] = [];
			let uri = vscode.Uri.file(filePath);
			Helper.error.errorCollection.delete(uri);
		}
	}
	//#endregion 清除错误

}