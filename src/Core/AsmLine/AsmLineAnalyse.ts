import { Macro } from "../Data/Macro";
import { Mark } from "../Data/Mark";
import { GlobalVar } from "../GlobalVar";
import { CompileType, MyParameters, Word } from "../Interface";
import Language from "../Language";
import { AddressLength, AddressType, ConfidentAddressValue, InstrumentTable } from "../MyConst";
import { MyError } from "../MyError";
import { ExpressionUtils } from "../Utils/ExpressionUtils";
import { AsmLine, AsmLineInstrumentTag, AsmLineMacroTag, AsmLineType } from "./AsmLine";
import { ComAnalyse } from "./ComAnalyse";

export function AsmLineAnalyse(params: MyParameters) {
	let asmLine = params.allAsmLine[params.index];
	switch (asmLine.lineType) {
		case AsmLineType.None:
			console.log("AsmLineType.None");
			console.log(asmLine);
			break;
		case AsmLineType.OnlyMark:
			(<Mark>asmLine.mark).value = params.globalVar.address;
			break;
		case AsmLineType.Assign:
			AnalyseAssign(params.globalVar, asmLine, params.macro)
			break;
		case AsmLineType.Instrument:
			AnalyseInstrument(params.globalVar, asmLine, params.macro);
			break;
		case AsmLineType.Command:
			ComAnalyse(params);
			break;
		case AsmLineType.Macro:
			AnalyseMacro(asmLine, params);
			break;
	}
}

//#region 分析表达式
/**
 * 分析表达式
 * @param globalVar 全局变量
 * @param asmLine 单行编译信息
 * @param macro 自定义函数
 */
function AnalyseAssign(globalVar: GlobalVar, asmLine: AsmLine, macro?: Macro) {
	let tag: Word = asmLine.tag;
	let option = { globalVar: globalVar, fileIndex: asmLine.fileIndex, lineNumber: asmLine.lineNumber, macro: macro };
	let result = <number | null>ExpressionUtils.GetExpressionResult(tag, option);
	if (result != null)
		(<Mark>asmLine.mark).value = result;
}
//#endregion 分析表达式

//#region 分析汇编指令
/**
 * 分析汇编指令
 * @param globalVar 全局变量
 * @param asmLine 单行编译内容
 */
function AnalyseInstrument(globalVar: GlobalVar, asmLine: AsmLine, macro?: Macro) {
	if (!asmLine.SetAddress(globalVar))
		return;

	let tag: AsmLineInstrumentTag = asmLine.tag;

	if (tag.addressType[0] == AddressType.Implied) {
		// 如果是单操作
		let tempResult: number = InstrumentTable[tag.instrument.text][AddressType.Implied];
		if (tempResult == -1) {
			let error = new MyError(Language.ErrorMessage.AddressTypeError);
			error.SetPosition({
				fileIndex: asmLine.fileIndex, lineNumber: asmLine.lineNumber,
				startPosition: tag.instrument.startColumn, length: tag.instrument.text.length
			});
			return;
		}
		asmLine.result = [tempResult];
		asmLine.resultLength = 1;
		asmLine.isFinished = true;
		globalVar.AddressAdd(asmLine.resultLength);
	} else if (tag.expression) {
		let option = { globalVar: globalVar, fileIndex: asmLine.fileIndex, lineNumber: asmLine.lineNumber, macro: macro };
		let exResult = <number | null>ExpressionUtils.GetExpressionResult(tag.expression, option);

		if (!exResult) {
			if (globalVar.compileType == CompileType.LastTime)
				return;

			asmLine.result = [];
			asmLine.resultLength = GetAddressTypeMaxLength(tag.addressType);
			globalVar.AddressAdd(asmLine.resultLength);
		} else {
			let findType: AddressType = AddressType.NULL;
			let opCode: number = 0;
			for (let i = 0; i < tag.addressType.length; i++) {
				let type = tag.addressType[i];
				opCode = InstrumentTable[tag.instrument.text][type];
				if (opCode == -1)
					continue;

				let addLength = AddressLength[type];
				if (((addLength == 2 && exResult < 0x100) ||
					(addLength == 3 && exResult < 0x10000) ||
					(type == AddressType.Conditional)) &&
					(asmLine.result ? asmLine.resultLength == addLength : true)) {

					if (!asmLine.result)
						asmLine.result = [];

					asmLine.resultLength = addLength;
					findType = type;
					break;
				}
			}

			switch (findType) {
				case AddressType.NULL:
					let error = new MyError(Language.ErrorMessage.AddressTypeError);
					error.SetPosition({
						fileIndex: asmLine.fileIndex, lineNumber: asmLine.lineNumber,
						startPosition: tag.expression.startColumn, length: tag.expression.text.length
					});
					MyError.PushError(error);
					return;

				case AddressType.Conditional:
					exResult = exResult - asmLine.address - 2;
					if (exResult > ConfidentAddressValue.Max || exResult < ConfidentAddressValue.Min) {
						let error = new MyError(Language.ErrorMessage.AddressOutofRange);
						error.SetPosition({
							fileIndex: asmLine.fileIndex, lineNumber: asmLine.lineNumber,
							startPosition: tag.expression.startColumn, length: tag.expression.text.length
						});
						MyError.PushError(error);
					}
					break;

			}

			asmLine.SetResult(opCode, exResult);
			globalVar.AddressAdd(asmLine.resultLength);
			asmLine.isFinished = true;
		}
	}
}
//#endregion 分析汇编指令

//#region 分析自定义函数
function AnalyseMacro(asmLine: AsmLine, params: MyParameters) {
	let tag: AsmLineMacroTag = asmLine.tag;
	let option = { globalVar: params.globalVar, fileIndex: asmLine.fileIndex, lineNumber: asmLine.lineNumber, macro: params.macro };
	let macro = (<Mark>params.globalVar.marks.FindMark(tag.command.text, option));

}
//#endregion 分析自定义函数

//#region 获取兼容的最大寻址长度
function GetAddressTypeMaxLength(addressTypes: AddressType[]): number {
	let max: number | null = null;
	for (let i = 0; i < addressTypes.length; i++) {
		if (max == null || max < AddressLength[addressTypes[i]])
			max = AddressLength[addressTypes[i]];
	}
	return <number>max;
}
//#endregion 获取兼容的最大寻址长度


