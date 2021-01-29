import * as fs from "fs";
import * as vscode from "vscode";
import { BaseAnalyse } from "../Base/BaseAnalyse";
import { Config } from "../Config";
import { Project } from "../GlobalVar";
import { CompileType, MyParameters } from "../Interface";
import Language from "../Language";
import { MyError } from "../MyError";
import { AsmUtils } from "../Utils/AsmUtils";
import { Utils } from "../Utils/Utils";
import { AsmLine } from "./AsmLine";
import { AsmLineAnalyse } from "./AsmLineAnalyse";

//#region 编译所有文本
/**
 * 编译所有文本
 * @param text 文本
 * @param filePath 文件路径
 */
export function CompileAllText(text: string, filePath: string): AsmLine[] {
	MyError.ClearAllError();

	let project = new Project();
	MyError.UpdateErrorFilePaths(project.globalVar.filePaths);

	project.globalVar.compileTimesMax = Config.ReadProperty(2, "compileTimes");

	let params: MyParameters = { globalVar: project.globalVar, allAsmLine: [], index: 0 };
	project.globalVar.isCompile = true;

	let baseLines = BaseAnalyse.BaseAnalyse(params.globalVar, filePath, text);
	BaseAnalyse.MainAnalyse(params.globalVar, baseLines);

	if (MyError.isError) {
		MyError.UpdateError();
		return [];
	}

	for (let compileTimes = 0; compileTimes < params.globalVar.compileTimesMax; compileTimes++) {

		// 确定编译次数类型
		if (compileTimes == 0)
			params.globalVar.compileType = CompileType.FirstTime;
		else if (compileTimes == params.globalVar.compileTimesMax - 1)
			params.globalVar.compileType = CompileType.LastTime;
		else
			params.globalVar.compileType = CompileType.CenterTime;

		if (params.globalVar.compileType == CompileType.FirstTime) {
			for (let i = 0; i < baseLines.length; i++) {
				let temp = AsmUtils.ConvertToAsmLine(baseLines[i]);
				if (temp == null)
					continue;

				params.allAsmLine.push(temp);
			}
		}

		for (let i = 0; i < params.allAsmLine.length; i++) {
			if (params.allAsmLine[i].isFinished)
				continue;

			params.index = i;
			console.log(params.allAsmLine[i]);

			AsmLineAnalyse(params);
			i = params.index;
			if (MyError.isError) {
				MyError.UpdateError();
				return [];
			}
		}
	}

	return params.allAsmLine;
}
//#endregion 编译所有文本

//#region 获取所有Asm结果
export function GetAsmResult(asmLine: AsmLine[]) {
	let temp = GetAllAsmByteResult(asmLine);
	let buffer: number[] = [];
	for (let i = 0; i < temp.length; i++) {
		if (temp[i] === undefined) {
			buffer[i] = 0;
		} else {
			buffer[i] = temp[i];
		}
	}
	return buffer;
}
//#endregion 获取所有Asm结果

//#region 直接生成一个文件
/**
 * 直接生成一个文件
 * @param asmLine 所有编译行
 * @param filePath 文件路径
 */
export function WriteToFile(asmLine: AsmLine[], filePath: string) {
	if (Utils.StringIsEmpty(filePath) || !vscode.workspace.workspaceFolders)
		return;

	let uri = Utils.GetFilePath(filePath, vscode.workspace.workspaceFolders[0].uri.fsPath);
	let result = GetAsmResult(asmLine);
	let binary = new Uint8Array(result);
	let fileOpenId = fs.openSync(uri.fsPath, "w");
	fs.writeSync(fileOpenId, binary, 0, binary.length, 0);
}
//#endregion 直接生成一个文件

//#region 嵌入一个文件
/**
 * 嵌入一个文件
 * @param asmLine 所有编译行
 * @param filePath 文件路径
 */
export function WriteIntoToFile(asmLine: AsmLine[], filePath: string) {
	if (Utils.StringIsEmpty(filePath) || !vscode.workspace.workspaceFolders)
		return;

	let uri = Utils.GetFilePath(filePath, vscode.workspace.workspaceFolders[0].uri.fsPath);
	let temp = GetAllAsmByteResult(asmLine);
	if (!fs.existsSync(uri.fsPath)) {
		let err = new MyError(Language.ErrorMessage.FileIsNotExist, uri.fsPath);
		MyError.PushError(err);
		return;
	}

	let buffer = new Uint8Array(fs.readFileSync(uri.fsPath));
	for (let i = 0; i < temp.length; i++) {
		if (temp[i] == undefined)
			continue;

		buffer[i] = temp[i];
	}
	fs.writeFileSync(uri.fsPath, buffer);
}
//#endregion 嵌入一个文件

//#region 将所有AsmLine结果导出
function GetAllAsmByteResult(asmLines: AsmLine[]) {
	let result: number[] = [];

	for (let i = 0; i < asmLines.length; i++) {
		if (!asmLines[i].result)
			continue;

		for (let j = 0; j < (<number[]>asmLines[i].result).length; j++)
			result[asmLines[i].baseAddress + j] = (<number[]>asmLines[i].result)[j];

	}
	return result;
}
//#endregion 将所有AsmLine结果导出
