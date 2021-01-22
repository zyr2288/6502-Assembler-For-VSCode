import { BaseAnalyse } from "../Base/BaseAnalyse";
import { Project } from "../GlobalVar";
import { CompileType, MyParameters } from "../Interface";
import { MyError } from "../MyError";
import { AsmUtils } from "../Utils/AsmUtils";
import { AsmLine } from "./AsmLine";
import { AsmLineAnalyse } from "./AsmLineAnalyse";

export function CompileAllText(text: string, filePath: string): AsmLine[] {
	MyError.ClearAllError();

	let project = new Project();
	MyError.UpdateErrorFilePaths(project.globalVar.filePaths);
	let params: MyParameters = { globalVar: project.globalVar, allAsmLine: [], index: 0 };
	project.globalVar.isCompile = true;

	let baseLines = BaseAnalyse.BaseAnalyse(params.globalVar, filePath, text);
	BaseAnalyse.MainAnalyse(params.globalVar, baseLines);

	if (MyError.isError)
		return [];

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
			AsmLineAnalyse(params);
			i = params.index;
			if (MyError.isError) {
				return [];
			}
		}
	}

	return params.allAsmLine;
}