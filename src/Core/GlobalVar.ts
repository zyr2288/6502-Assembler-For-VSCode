import { Marks } from "./Data/Mark";

export enum CompileType {
	FirstTime, CenterTime, LastTime
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

/**全局变量 */
export class GlobalVar {

	/**所有消息时间 */
	private static messageEvent: ((message: string, filePath: string, lineNumber: number) => void)[] = [];

	/**绑定Message事件 */
	static BindingMessageEvent(event: (message: string, filePath: string, lineNumber: number) => void) {
		if (!this.messageEvent.includes(event))
			GlobalVar.messageEvent.push(event);
	}

	/**推送消息 */
	static PushMessage(message: string, filePath: string, lineNumber: number) {
		GlobalVar.messageEvent.forEach(value => {
			value(message, filePath, lineNumber);
		});
	}

	/**编译地址 */
	address?: number;
	/**基础地址 */
	baseAddress: number = 0;
	/**地址偏移 */
	baseAddressOffset: number = 0;
	/**所有文件路径 */
	filePaths: string[] = [];
	/**所有标记 */
	marks: Marks = new Marks();
	/**是否是编译状态 */
	isCompile: boolean = false;
	/**编译状态，0为第一次，2为最后一次 */
	compileType: CompileType = CompileType.FirstTime;
	/**编译最大次数 */
	compileTimesMax: number = 2;

	//#region 获取文件索引
	/**
	 * 获取文件索引
	 * @param filePath 文件路径
	 * @param add 是否添加，默认添加
	 */
	GetFileIndex(filePath: string, add = true): number {
		let index = this.filePaths.indexOf(filePath);
		if (index >= 0)
			return index;

		if (add) {
			for (let i = 0; i < this.filePaths.length; i++) {
				if (!this.filePaths[i]) {
					this.filePaths[i] = filePath;
					return i;
				}
			}

			this.filePaths.push(filePath);
			return this.filePaths.length - 1;
		} else {
			return -1;
		}
	}
	//#endregion 获取文件索引

	//#region 地址增加长度
	/**
	 * 地址增加长度
	 * @param length 长度
	 */
	AddressAdd(length: number) {
		if (this.address != undefined) {
			this.address += length;
			this.baseAddress += length;
		}
	}
	//#endregion 地址增加长度

}