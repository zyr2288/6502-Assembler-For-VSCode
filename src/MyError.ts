import { Utils } from "./Utils/Utils"

export class MyError {

	static isError = false;
	static errors: { id: number, error: MyError, isNew: boolean }[] = [];
	static bindingEvents: ((error: MyError) => void)[] = [];
	static clearEvents: ((filePath?: string) => void)[] = [];

	//#region 提交错误
	/**
	 * 提交错误
	 * @param error 错误
	 */
	static PushError(error: MyError) {
		MyError.isError = true;
		let id = error.GetErrorId();
		let temp = MyError.errors.find((value) => value.id != 0 && value.id == id);
		if (!temp) {
			MyError.errors.push({ id: id, error: error, isNew: true });
		}
	}
	//#endregion 提交错误

	//#region 更新所有新的错误
	/**
	 * 更新所有新的错误
	 * @param option 选项
	 */
	static UpdateError(option?: { filePath?: string, lineNumber?: number, startPosition?: number, length?: number }) {
		for (let i = 0; i < MyError.errors.length; i++) {
			if (!MyError.errors[i].isNew)
				continue;

			MyError.errors[i].isNew = false;
			MyError.errors[i].error.SetPosition(option);
			MyError.errors[i].id = MyError.errors[i].error.GetErrorId();
			for (let j = 0; j < this.bindingEvents.length; j++) {
				this.bindingEvents[j](MyError.errors[i].error);
			}
		}
	}
	//#endregion 更新所有新的错误

	//#region 绑定错误相关事件
	/**
	 * 绑定错误相关事件
	 * @param bindingError 更新错误事件
	 * @param clearError 清除错误事件
	 */
	static BindingErrorEvent(bindingError: (error: MyError) => void, clearError: (filePath?: string) => void) {
		if (!MyError.bindingEvents.includes(bindingError))
			MyError.bindingEvents.push(bindingError);

		if (!MyError.clearEvents.includes(clearError))
			MyError.clearEvents.push(clearError);

	}
	//#endregion 绑定错误相关事件

	//#region 清除单个文件的所有错误
	/**
	 * 清除单个文件的所有错误
	 * @param filePath 要清除错误的文件
	 */
	static ClearFileError(filePath: string) {
		let indexs = [];
		MyError.errors.forEach((value, index) => {
			if (value.error.filePath == filePath) {
				indexs.push(index);
			}
		});

		if (indexs.length != 0) {
			for (let j = 0; j < this.bindingEvents.length; j++) {
				this.clearEvents[j](filePath);
			}
		}

		for (let i = indexs.length - 1; i >= 0; i--)
			MyError.errors.splice(i, 1);
	}
	//#endregion 清除单个文件的所有错误

	//#region 清除所有错误
	/**
	 * 清除所有错误
	 */
	static ClearAllError() {
		MyError.isError = false;
		MyError.errors = [];
		for (let i = 0; i < MyError.clearEvents.length; i++)
			this.clearEvents[i]();
	}
	//#endregion 清除所有错误

	message: string;
	filePath = "";
	lineNumber = -1;
	startPosition = -1;
	length = 0;

	constructor(message: string, ...params: string[]) {
		this.message = Utils.StringFormat(message, ...params);
	}

	SetPosition(option?: { filePath?: string, lineNumber?: number, startPosition?: number, length?: number }) {
		if (option?.filePath != undefined)
			this.filePath = option.filePath;

		if (option?.lineNumber != undefined)
			this.lineNumber = option.lineNumber;

		if (option?.startPosition != undefined)
			this.startPosition = option.startPosition;

		if (option?.length != undefined)
			this.length = option.length;

	}

	private GetErrorId(): number {
		let hash = 0;
		if (!this.filePath || this.lineNumber == -1 || this.startPosition == -1 || this.length == 0)
			return 0;

		for (let i = 0; i < this.filePath.length; i++)
			hash = ((hash << 5) - hash) + this.filePath.charCodeAt(i);

		hash = ((hash << 5) - hash) + this.lineNumber;
		hash = ((hash << 5) - hash) + this.startPosition;
		hash = ((hash << 5) - hash) + this.length;
		return hash;
	}

}