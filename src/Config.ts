export class Config {
	static readonly defaultConfig = {
		compileTimes: 2,
		suggestion: true,
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

	/**
	 * 读取配置文件属性
	 * @param key 配置文件属性
	 */
	static ReadProperty(index: number, key: string): any {
		if (!Config.config.projects[index])
			return;

		// @ts-ignore
		if (!Config.config.projects[index][key]) {
			// @ts-ignore
			return Config.defaultConfig.projects[0][key];
		} else {
			// @ts-ignore
			return Config.config.projects[index][key];
		}
	}
}