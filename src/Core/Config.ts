export interface ProjectConfig {
	name: string;
	entry: string;
	includes: string;
	excludes: string;
	outFile: string;
	patchFile: string;
	copyCodeToClipboard: boolean;
}

export class Config {
	static readonly defaultConfig = {
		compileTimes: 2,
		suggestion: true,
		singleFile: { outFile: "", copyCodeToClipboard: false },
		projects: [{
			name: "project1",
			entry: "main.65s",
			includes: "{**/*.65s}",
			excludes: "{}",
			outFile: "",
			patchFile: "",
			copyCodeToClipboard: false
		}]
	};

	static config = {
		compileTimes: 2,
		suggestion: true,
		singleFile: { outFile: "", copyCodeToClipboard: false },
		projects: [{
			name: "project1",
			entry: "main.65s",
			includes: "{**/*.65s}",
			excludes: "{}",
			outFile: "",
			patchFile: "",
			copyCodeToClipboard: false
		}]
	};

	//#region 读取配置文件属性
	/**
	 * 读取配置文件属性
	 * @param defaultValue 返回的默认值
	 * @param keys 配置文件属性，层集关系
	 */
	static ReadProperty(defaultValue: any, ...keys: (string | number)[]): any {
		let temp = Config.config;
		for (let i = 0; i < keys.length; i++) {
			// @ts-ignore
			temp = temp[keys[i]];
			if (temp == undefined)
				return defaultValue;
		}
		// @ts-ignore
		return temp;
	}
	//#endregion 读取配置文件属性

}