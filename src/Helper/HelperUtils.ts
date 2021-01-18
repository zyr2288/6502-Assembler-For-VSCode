import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";
import { Config } from "../Config";

export class HelperUtils {
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
}