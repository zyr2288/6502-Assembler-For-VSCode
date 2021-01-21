import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";
import { Config } from "../Config";
import { AutoUpperCaseRegex } from "../MyConst";
import { Project } from "../GlobalVar";
import { Helper } from "./Helper";
import { MyError } from "../MyError";
import { BaseAnalyse } from "../Base/BaseAnalyse";

export class HelperUtils {

	private static freshThreadId: NodeJS.Timeout;
	private static freshTime = 1000;
	private static lastFreshFile: vscode.TextDocumentChangeEvent[] = [];

	//#region 读取配置文件
	static ReadConfig() {

		if (!vscode.workspace.workspaceFolders)
			return;

		let temp = vscode.workspace.workspaceFolders[0];
		let config = vscode.Uri.file(path.join(temp.uri.fsPath, "6502-project.json"));
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

		project.project.globalVar.marks.DeleteFileMarks(project.project.globalVar.GetFileIndex(fileName));

		let lines = BaseAnalyse.BaseAnalyse(project.project.globalVar, fileName, context);
		BaseAnalyse.MainAnalyse(project.project.globalVar, lines);
		MyError.UpdateError();
	}
	//#endregion 刷新指定文件内的已定义变量

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

}