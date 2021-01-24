import { AsmLine } from "../AsmLine/AsmLine";
import { Word } from "../Interface";
import { Utils } from "../Utils/Utils";
import { Mark } from "./Mark";

/**自定义函数 */
export class Macro {
	/**所有参数，包括临时标签 */
	parameters: Mark[] = [];
	/**参数的ID */
	private parameterIds: number[] = [];
	/**输入的参数个数 */
	parametersCount: number = 0;
	/**函数所有行 */
	asmLines: AsmLine[] = [];

	//#region 增加一个参数
	/**
	 * 增加一个参数
	 * @returns true为添加成功
	 */
	AddParameter(mark: Mark, id: number): boolean {
		if (this.parameterIds.indexOf(id) < 0) {
			this.parameterIds.push(id);
			this.parameters.push(mark);
			return true;
		}

		return false;
	}
	//#endregion 增加一个参数

	//#region 用ID查找某个参数
	/**
	 * 查找参数
	 * @param id 参数ID
	 */
	FindParameter(id: number): Mark | undefined {
		let index = this.parameterIds.indexOf(id);
		if (index < 0)
			return;

		return this.parameters[index];
	}
	//#endregion 用ID查找某个参数

	//#region 创建一个副本，用于分析
	GetMacro(): Macro {
		let macro = new Macro();
		macro.parameters = Utils.DeepClone(this.parameters);
		macro.parameterIds = Utils.DeepClone(this.parameterIds);
		macro.parametersCount = this.parametersCount;
		this.asmLines.forEach(value => {
			macro.asmLines.push(value.Copy());
		});

		macro.asmLines.forEach(value => {
			if (value.mark) {
				let mark = macro.FindParameter(value.mark.id);
				if (mark)
					value.mark = mark;
			}
		});
		return macro;
	}
	//#endregion 创建一个副本，用于分析

}