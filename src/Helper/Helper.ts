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
}