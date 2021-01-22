import { CompileType } from "../GlobalVar";
import { MyParameters, Word } from "../Interface";
import Language from "../Language";
import { MyError } from "../MyError";
import { ExpressionUtils } from "../Utils/ExpressionUtils";
import { AsmLineCommandCommonTag } from "./AsmLine";

export function ComAnalyse(params: MyParameters) {
	let asmLine = params.allAsmLine[params.index];
	let command: Word = asmLine.tag.command;
	switch (command.text) {
		case ".ORG": {
			let tag: AsmLineCommandCommonTag = asmLine.tag;
			Command_Org(tag.expression, params);
			break;
		}
	}
}

//#region ORG 命令
function Command_Org(expression: Word, params: MyParameters) {
	let asmLine = params.allAsmLine[params.index];
	let option = { globalVar: params.globalVar, fileIndex: asmLine.fileIndex, lineNumber: asmLine.lineNumber };

	params.globalVar.compileType = CompileType.LastTime;
	let result = <number | null>ExpressionUtils.GetExpressionResult(expression, option);
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
