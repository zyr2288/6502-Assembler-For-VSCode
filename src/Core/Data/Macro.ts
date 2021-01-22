import { AsmLine } from "../AsmLine/AsmLine";
import { Word } from "../Interface";
import { Mark } from "./Mark";

/**自定义函数 */
export class Macro {
	/**所有参数，包括临时标签 */
	private parameters: Mark[] = [];
	/**参数的ID */
	private parameterIds: number[] = [];
	/**输入的参数个数 */
	parametersCount: number = 0;
	/**函数所有行 */
	asmLines: AsmLine[] = [];

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

	GetAllParameter(): Word[] {
		let words: Word[] = [];
		this.parameters.forEach(value => {
			words.push(value.text);
		});
		return words;
	}
}