import { GlobalVar } from "../GlobalVar";

export const FileExtension = { scheme: "file", language: "asm6502", extension: ".65s" };
export enum ExtensionCommandNames {
	/**获取文件路径 */
	GetThisFilePath = "GetThisFilePath",
	/**编译当前文件 */
	CompliteThis = "6502extension.compliteThis",
	/**编译主文件 */
	CompliteMain = "6502extension.compliteMain",
}
/**一个工程类 */
export class Project {
	globalVar: GlobalVar = new GlobalVar();

	FindFileIndex(file: string, add: boolean): number {
		let index = this.globalVar.filePaths.indexOf(file);
		if (index < 0 && add) {
			this.globalVar.filePaths.push(file);
		}
		return index;
	}
}