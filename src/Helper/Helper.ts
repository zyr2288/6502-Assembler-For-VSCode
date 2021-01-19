import * as vscode from "vscode";
import * as fs from "fs";
import { Config } from "../Config";
import { BaseLine } from "../Base/BaseLine";
import { Project } from "../GlobalVar";
import { BaseAnalyse } from "../Base/BaseAnalyse";
import { MyError } from "../MyError";
import { HelperUtils } from "./HelperUtils";

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

		MyError.BindingErrorEvent(Helper.UpdateError, Helper.ClearAllError);

		for (let i = 0; i < Config.config.projects.length; i++) {
			if (!vscode.workspace.workspaceFolders)
				continue;

			let includes = Config.ReadProperty(i, "includes");
			let excludes = Config.ReadProperty(i, "excludes");
			let files = await vscode.workspace.findFiles(includes, excludes);

			let project = new Project();
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

			BaseAnalyse.MainAnalyse(baseLines);
			MyError.UpdateError();
			Helper.projects[i] = project;
		}
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