import * as fs from "fs";
import { TaskGroup } from "vscode";
import { DataGroup } from "../Data/DataGroup";
import { Macro } from "../Data/Macro";
import { CompileType } from "../GlobalVar";
import { MyParameters, Word } from "../Interface";
import Language from "../Language";
import { MyError } from "../MyError";
import { AsmUtils } from "../Utils/AsmUtils";
import { ExpressionUtils } from "../Utils/ExpressionUtils";
import { Utils } from "../Utils/Utils";
import { AsmLine, AsmLineCommandCommonTag, AsmLineCommandDxGTag, AsmLineCommandMacroTag } from "./AsmLine";

export function ComAnalyse(params: MyParameters) {
	let asmLine = params.allAsmLine[params.index];
	let command: Word = asmLine.tag.command;
	switch (command.text) {
		case ".BASE": {
			let tag: AsmLineCommandCommonTag = asmLine.tag;
			Command_Base(tag.expression, params);
			break;
		}

		case ".ORG": {
			let tag: AsmLineCommandCommonTag = asmLine.tag;
			Command_Org(tag.expression, params);
			break;
		}

		case ".INCBIN": {
			let tag: AsmLineCommandCommonTag = asmLine.tag;
			Command_Incbin(tag.expression, params);
			break;
		}

		case ".DBG":
		case ".DWG":
			Command_DXG(params, command.text);
			break;

		case ".MACRO":
			Command_Macro(asmLine);
			break;

		case ".IF":
			Command_If(params);
			break;

		case ".IFDEF":
		case ".IFNDEF":
			Command_Ifdef_IfNdef(params);
			break;

		case ".REPEAT":
			Command_Repeat(params);
			break;

		default:
			let err = new MyError(Language.ErrorMessage.CommandMiss);
			err.SetPosition({
				fileIndex: asmLine.fileIndex, lineNumber: asmLine.lineNumber,
				startPosition: command.startColumn, length: command.text.length
			});
			MyError.PushError(err);
			break;
	}
}

//#region BASE 命令
function Command_Base(expression: Word, params: MyParameters) {
	let option = {
		globalVar: params.globalVar,
		fileIndex: params.allAsmLine[params.index].fileIndex,
		lineNumber: params.allAsmLine[params.index].lineNumber
	};
	let result = ExpressionUtils.GetExpressionResult(expression, option, "Number");
	if (result == null) {
		return;
	} else if (result < 0) {
		let error = new MyError(Language.ErrorMessage.AddressError);
		error.SetPosition({
			fileIndex: option.fileIndex, lineNumber: option.lineNumber,
			startPosition: expression.startColumn, length: expression.text.length
		});
		MyError.PushError(error);
		return;
	}

	if (!params.globalVar.address) {
		let error = new MyError(Language.ErrorMessage.SetStartAddress);
		error.SetPosition({
			fileIndex: option.fileIndex, lineNumber: option.lineNumber,
			startPosition: expression.startColumn, length: expression.text.length
		});
		return;
	}

	params.globalVar.baseAddress = result;
	params.globalVar.baseAddressOffset = params.globalVar.baseAddress - params.globalVar.address;
	params.allAsmLine[params.index].isFinished = true;
}
//#endregion BASE 命令

//#region ORG 命令
function Command_Org(expression: Word, params: MyParameters) {
	let asmLine = params.allAsmLine[params.index];
	let option = { globalVar: params.globalVar, fileIndex: asmLine.fileIndex, lineNumber: asmLine.lineNumber };

	params.globalVar.compileType = CompileType.LastTime;
	let result = ExpressionUtils.GetExpressionResult(expression, option, "Number");
	params.globalVar.compileType = CompileType.FirstTime;

	if (result == null) {
		return;
	} else if (result < 0) {
		let error = new MyError(Language.ErrorMessage.AddressError);
		error.SetPosition({
			fileIndex: asmLine.fileIndex, lineNumber: asmLine.lineNumber,
			startPosition: expression.startColumn, length: expression.text.length
		});
		MyError.PushError(error);
		return;
	}

	if (params.globalVar.address) {
		params.globalVar.baseAddress += result - params.globalVar.address
	}

	params.globalVar.address = result;
	params.globalVar.baseAddressOffset = params.globalVar.baseAddress - params.globalVar.address;
	asmLine.isFinished = true;

}
//#endregion ORG 命令

//#region INCBIN 命令
function Command_Incbin(expression: Word, params: MyParameters) {
	let asmLine = params.allAsmLine[params.index];
	if (!/^".+"$/.test(expression.text)) {
		let error = new MyError(Language.ErrorMessage.ParametersError);
		error.SetPosition({
			fileIndex: asmLine.fileIndex, lineNumber: asmLine.lineNumber,
			startPosition: expression.startColumn, length: expression.text.length
		});
		MyError.PushError(error);
		return;
	}

	let path = { text: expression.text.substring(1, expression.text.length - 1), startColumn: expression.startColumn + 1 };
	let uri = Utils.GetFilePath(path.text, params.globalVar.filePaths[asmLine.fileIndex]);

	if (!fs.existsSync(uri.fsPath)) {
		let error = new MyError(Language.ErrorMessage.FileIsNotExist, path.text);
		error.SetPosition({
			fileIndex: asmLine.fileIndex, lineNumber: asmLine.lineNumber,
			startPosition: path.startColumn, length: path.text.length
		});
		MyError.PushError(error);
		return;
	}

	if (!asmLine.result)
		asmLine.result = [];

	fs.readFileSync(uri.path).forEach(
		// @ts-ignore
		value => asmLine.result.push(value)
	);

	asmLine.resultLength = asmLine.result.length;
	asmLine.isFinished = true;
	params.globalVar.AddressAdd(asmLine.resultLength);
}
//#endregion INCBIN 命令

//#region DBG/DWG 命令
function Command_DXG(params: MyParameters, type: ".DBG" | ".DWG") {

	let asmLine = params.allAsmLine[params.index];
	asmLine.SetAddress(params.globalVar);

	let length = type == ".DBG" ? 1 : 2;
	let max = type == ".DBG" ? 0x100 : 0x10000;

	let datagroup = new DataGroup();
	let tag: AsmLineCommandDxGTag = asmLine.tag;
	let option = {
		globalVar: params.globalVar,
		fileIndex: asmLine.fileIndex,
		lineNumber: asmLine.lineNumber,
		macro: params.macro
	};

	let isNotFinished = false;
	asmLine.result = [];
	let loop = 0;
	for (; loop < tag.parts.length; loop++) {
		datagroup.AddMember(tag.parts[loop].word, params.globalVar, option);
		let mark = params.globalVar.marks.FindMark(tag.parts[loop].word.text, option)
		if (isNotFinished || !mark || mark.value == undefined) {
			isNotFinished = true;
			break;
		}

		if (mark.value >= max) {
			let err = new MyError(Language.ErrorMessage.MarkMiss, tag.parts[loop].word.text);
			err.SetPosition({
				fileIndex: asmLine.fileIndex, lineNumber: tag.parts[loop].lineNumber,
				startPosition: tag.parts[loop].word.startColumn, length: tag.parts[loop].word.text.length
			});
			MyError.PushError(err);
			isNotFinished = false;
			break;
		}

		switch (length) {
			case 2:
				asmLine.result.push((mark.value >> 8) & 0xFF);
			case 1:
				asmLine.result.push(mark.value & 0xFF);
				break;
		}
	}

	if (isNotFinished) {
		if (params.globalVar.compileType == CompileType.LastTime) {
			let err = new MyError(Language.ErrorMessage.MarkMiss, tag.parts[loop].word.text);
			err.SetPosition({
				fileIndex: asmLine.fileIndex, lineNumber: tag.parts[loop].lineNumber,
				startPosition: tag.parts[loop].word.startColumn, length: tag.parts[loop].word.text.length
			});
			MyError.PushError(err);
		}
	} else {
		asmLine.isFinished = true;
	}

	asmLine.resultLength = tag.parts.length * length;
	params.globalVar.AddressAdd(asmLine.resultLength);
}
//#endregion DBG/DWG 命令

//#region MACRO 命令
function Command_Macro(asmLine: AsmLine) {
	let tag: AsmLineCommandMacroTag = asmLine.tag;
	let macro: Macro = tag.mark.tag;
	macro.asmLines = tag.lines;
	asmLine.isFinished = true;
}
//#endregion MACRO 命令

//#region IF 命令
function Command_If(params: MyParameters) {
	let index = params.index;
	let conditionLine: number[] = [index];
	let stack = 0;
	let notEnd = true;
	while (index < params.allAsmLine.length - 1) {
		index++;
		let tag: AsmLineCommandCommonTag = params.allAsmLine[index].tag;
		if (!tag || !tag.command)
			continue;

		if (Utils.CompareString(tag.command.text, ".IF", ".IFDEF", ".IFNDEF")) {
			stack++;
			continue;
		}

		if (Utils.CompareString(tag.command.text, ".ELSEIF") && notEnd) {
			if (stack == 0)
				conditionLine.push(index);

			continue;
		}

		if (Utils.CompareString(tag.command.text, ".ELSE")) {
			if (stack == 0) {
				notEnd = false;
				conditionLine.push(index);
			}

			continue;
		}

		if (Utils.CompareString(tag.command.text, ".ENDIF")) {
			if (stack == 0) {
				conditionLine.push(index);
				break;
			}
			stack--;
		}
	}

	params.globalVar.compileType = CompileType.LastTime;
	let option = { globalVar: params.globalVar, fileIndex: params.allAsmLine[params.index].fileIndex, lineNumber: params.index, macro: params.macro };
	let loop = 0;
	let result: boolean | null = false;
	for (; loop < conditionLine.length; loop++) {
		let tag: AsmLineCommandCommonTag = params.allAsmLine[conditionLine[loop]].tag;
		if (Utils.CompareString(tag.command.text, ".IF", ".ELSEIF")) {
			result = ExpressionUtils.GetExpressionResult(tag.expression, option, "Boolean");
			if (result == null)
				return;
		} else if (Utils.CompareString(tag.command.text, ".ELSE")) {
			result = true;
		}

		if (result)
			break;
	}
	GetConditionLines(loop, conditionLine, params.allAsmLine);
	params.globalVar.compileType = CompileType.FirstTime;
	params.index--;
}
//#endregion IF 命令

//#region IFDEF/IFNDEF 命令
function Command_Ifdef_IfNdef(params: MyParameters) {
	let index = params.index;
	let conditionLine: number[] = [index];
	let stack = 0;
	while (index < params.allAsmLine.length - 1) {
		index++;
		let tag: AsmLineCommandCommonTag = params.allAsmLine[index].tag;
		if (!tag || !tag.command)
			continue;

		if (Utils.CompareString(tag.command.text, ".IF", ".IFDEF", ".IFNDEF")) {
			stack++;
			continue;
		}

		if (Utils.CompareString(tag.command.text, ".ELSE")) {
			if (stack == 0) {
				conditionLine.push(index);
			}

			continue;
		}

		if (Utils.CompareString(tag.command.text, ".ENDIF")) {
			if (stack == 0) {
				conditionLine.push(index);
				break;
			}
			stack--;
		}
	}

	params.globalVar.compileType = CompileType.LastTime;
	let option = { globalVar: params.globalVar, fileIndex: params.allAsmLine[params.index].fileIndex, lineNumber: params.index, macro: params.macro };
	let loop = 0;
	let result: number = 1;
	for (; loop < conditionLine.length; loop++) {
		let tag: AsmLineCommandCommonTag = params.allAsmLine[conditionLine[loop]].tag;
		if (Utils.CompareString(tag.command.text, ".IFDEF", ".IFNDEF")) {
			// @ts-ignore
			result = (tag.command.text == ".IFDEF") ^ (!!params.globalVar.marks.FindMark(tag.expression.text, option));
		} else if (Utils.CompareString(tag.command.text, ".ELSE")) {
			result = 0;
		}

		if (!result)
			break;
	}
	GetConditionLines(loop, conditionLine, params.allAsmLine);
	params.globalVar.compileType = CompileType.FirstTime;
	params.index--;
}
//#endregion IFDEF/IFNDEF 命令

//#region REPEAT 命令
function Command_Repeat(params: MyParameters) {
	let startLine = params.index;
	let endLine = 0;
	let stack = 0;
	let index = params.index;
	while (index < params.allAsmLine.length - 1) {
		index++;
		let tag: AsmLineCommandCommonTag = params.allAsmLine[index].tag;
		if (!tag || !tag.command)
			continue;

		if (tag.command.text == ".REPEAT") {
			stack++;
			continue;
		}

		if (Utils.CompareString(tag.command.text, ".ENDR")) {
			if (stack == 0) {
				endLine = index;
				break;
			}
			stack--;
		}
	}

	let tag: AsmLineCommandCommonTag = params.allAsmLine[startLine].tag;
	let temp = params.allAsmLine.splice(startLine, endLine - startLine + 1);
	temp = temp.splice(1, temp.length - 2);
	params.index--;

	params.globalVar.compileType = CompileType.LastTime;
	let option = { globalVar: params.globalVar, fileIndex: params.allAsmLine[params.index].fileIndex, lineNumber: params.index, macro: params.macro };
	let result = ExpressionUtils.GetExpressionResult(tag.expression, option, "Number");
	params.globalVar.compileType = CompileType.FirstTime;
	if (result == null)
		return;

	for (let i = 0; i < result; i++) {
		AsmUtils.InsertAsmLines(params.allAsmLine, params.index + 1, temp);
	}
}
//#endregion REPEAT 命令

/***** 工具方法 *****/

//#region 判断用的截取
/**
 * 判断用的截取
 * @param conditionIndex 所有判断行的索引
 * @param result 判断结果
 * @param allLines 所有编译行
 */
function GetConditionLines(index: number, conditionIndex: number[], allLines: AsmLine[]) {
	let temp = allLines.splice(conditionIndex[0], conditionIndex[conditionIndex.length - 1] - conditionIndex[0] + 1);
	if (index >= conditionIndex.length - 1)
		return;

	let startLine = conditionIndex[index] - conditionIndex[0] + 1;
	let length = conditionIndex[index + 1] - conditionIndex[index] - 1;
	temp = temp.splice(startLine, length);
	AsmUtils.InsertAsmLines(allLines, conditionIndex[0], temp);
}
//#endregion 判断用的截取
