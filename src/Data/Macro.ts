import { Word } from "../Interface";

/**自定义函数 */
export class Macro {
	/**所有参数，包括临时标签 */
	private parameters: Word[] = [];
	/**参数的ID */
	private parameterIds: number[] = [];
	/**输入的参数个数 */
	parametersCount: number = 0;

	/**
	 * 增加一个参数
	 * @returns true为添加成功
	 */
	AddParameter(mark: Word, id: number): boolean {
		if (this.parameterIds.indexOf(id) < 0) {
			this.parameterIds.push(id);
			this.parameters.push(mark);
			return true;
		}

		return false;
	}
}