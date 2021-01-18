import { Word } from "../Interface";

/**自定义函数 */
export class Macro {
	/**所有参数，包括临时标签 */
	parameters: Word[] = [];
	/**输入的参数个数 */
	parametersCount: number = 0;
}