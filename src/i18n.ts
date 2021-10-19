interface ErrorMessage {
	MarkIllegal: string;
	MarkMiss: string;
	MarkAlreadyExists: string;
	MarkIsDefined: string;
	BracketsMiss: string;
	MarkMissBtOps: string;

	DontSupportMultiArray: string;
	DataGroupDontSupportNamelessLabel: string;

	ExpressionError: string;
	ExpressionMiss: string;

	CannotComputeExpression: string;
	MarkDontSupportArray: string;
	DontSupportParameters: string;
	CommandMiss: string;
	ParametersError: string;
	FileIsNotExist: string;
	EntryFileIsNotExist: string;
	SetStartAddress: string;
	AddressError: string;
	AddressTypeError: string;
	AddressOutofRange: string;
	MacroIsNotExist: string;
	MacroIsExist: string;
	MacroNotSupportCommand: string;
	MacroNotSupportTempMark: string;
	CommandNotSupportMark: string;
	NotMatchEnd: string;
	MacroParamtersNotMatch: string;
	ValueOutOfRange: string;
}

interface Info {
	ParamtersCount: string;
	Output: string;
	Compiling: string;
	CompileError: string;
	Finished: string;
	LoadingPlugin: string;
	PluginLoaded: string;
}

export default class Language {

	// @ts-ignore
	static readonly ErrorMessage: ErrorMessage = {};
	// @ts-ignore
	static readonly Info: Info = {};

	static Init() {
		// @ts-ignore
		let config: { locale: string, availableLanguages: any } = JSON.parse(process.env.VSCODE_NLS_CONFIG);
		for (let key in Language._errorMessage) {
			// @ts-ignore
			Language.ErrorMessage[key] = Language._errorMessage[key][config.locale];
		}

		for (let key in Language._info) {
			// @ts-ignore
			Language.Info[key] = Language._info[key][config.locale];
		}
	}

	private static readonly _errorMessage = {
		/**标签{{0}}命名不正确 */
		MarkIllegal: {
			"en": "Label \"{{0}}\" illegal",
			"zh-cn": "标签\"{{0}}\"命名不正确"
		},
		/**找不到标签"{{0}}"" */
		MarkMiss: {
			"en": "Label \"{{0}}\" do not found",
			"zh-cn": "找不到标签\"{{0}}\""
		},
		/**标签"{{0}}"已存在 */
		MarkAlreadyExists: {
			"en": "Label \"{{0}}\" already exist",
			"zh-cn": "标签\"{{0}}\"已存在",
		},
		/**标签"{{0}}"已定义为常量 */
		MarkIsDefined: {
			"en": "Label \"{{0}}\" already defined",
			"zh-cn": "标签\"{{0}}\"已定义为常量",
		},
		/**括号缺失 */
		BracketsMiss: {
			"en": "Bracket missing",
			"zh-cn": "括号缺失",
		},
		/**运算符之间缺失标记 */
		MarkMissBtOps: {
			"en": "Expression error",
			"zh-cn": "运算符之间缺失标记"
		},

		/**表达式错误 */
		ExpressionError: {
			"en": "Expression error",
			"zh-cn": "表达式错误"
		},
		/**请输入参数或表达式 */
		ExpressionMiss: {
			"en": "Expression is empty",
			"zh-cn": "请输入参数或表达式"
		},
		/**无法计算表达式 */
		CannotComputeExpression: {
			"en": "",
			"zh-cn": "无法计算表达式"
		},

		/**命令不支持参数 */
		DontSupportParameters: {
			"en": "",
			"zh-cn": "命令不支持参数"
		},

		DontSupportMultiArray: {
			"en": "",
			"zh-cn": "不支持数组"
		},
		DataGroupDontSupportNamelessLabel: {
			"en": "",
			"zh-cn": "数据组不支持临时标签"
		},

		/**找不到匹配指令 */
		CommandMiss: {
			"en": "",
			"zh-cn": "找不到匹配指令"
		},
		/**参数错误 */
		ParametersError: {
			"en": "",
			"zh-cn": "参数错误"
		},

		/**文件"{{0}}"不存在 */
		FileIsNotExist: {
			"en": "",
			"zh-cn": "文件\"{{0}}\"不存在"
		},
		/**入口文件"{{0}}"不存在 */
		EntryFileIsNotExist: {
			"en": "",
			"zh-cn": "入口文件\"{{0}}\"不存在"
		},
		/**请设定编译起始地址 */
		SetStartAddress: {
			"en": "",
			"zh-cn": "请设定编译起始地址"
		},
		/**设定地址错误 */
		AddressError: {
			"en": "",
			"zh-cn": "设定地址错误"
		},
		/**寻址方式错误 */
		AddressTypeError: {
			"en": "",
			"zh-cn": "寻址方式错误"
		},
		/**地址越界 */
		AddressOutofRange: {
			"en": "",
			"zh-cn": "地址越界"
		},

		/**找不到函数"{{0}}" */
		MacroIsNotExist: {
			"en": "",
			"zh-cn": "找不到函数\"{{0}}\""
		},
		/**函数已存在"{{0}}" */
		MacroIsExist: {
			"en": "",
			"zh-cn": "函数\"{{0}}\"已定义"
		},
		/**函数内不支持命令"{{0}}" */
		MacroNotSupportCommand: {
			"en": "",
			"zh-cn": "函数内不支持命令\"{{0}}\""
		},
		/**函数内不支持临时标签 */
		MacroNotSupportTempMark: {
			"en": "",
			"zh-cn": "函数内不支持临时标签"
		},
		/**该编译器命令前不支持标签 */
		CommandNotSupportMark: {
			"en": "",
			"zh-cn": "该编译器命令前不支持标签"
		},
		/**找不到匹配的"{{0}}" */
		NotMatchEnd: {
			"en": "",
			"zh-cn": "找不到匹配的\"{{0}}\""
		},
		/**参数个数不匹配，应该为{{0}} */
		MacroParamtersNotMatch: {
			"en": "",
			"zh-cn": "参数个数不匹配，应该为\"{{0}}\""
		},

		/**"{{0}}"的结果值超出范围 */
		ValueOutOfRange: {
			"en": "",
			"zh-cn": "\"{{0}}\"的结果值超出范围"
		},
	};

	private static readonly _info = {
		/**参数个数为"{{0}}" */
		ParamtersCount: {
			"en": "",
			"zh-cn": "参数个数为\"{{0}}\"",
		},
		/**文件"{{0}}"，第"{{1}}"行 */
		Output: {
			"en": "",
			"zh-cn": "文件\"{{0}}\"，第\"{{1}}\"行",
		},

		/**编译中 */
		Compiling: {
			"en": "",
			"zh-cn": "编译中",
		},
		/**编译有错误 */
		CompileError: {
			"en": "",
			"zh-cn": "编译有错误",
		},
		/**编译完成 */
		Finished: {
			"en": "",
			"zh-cn": "编译完成",
		},

		/**6502插件载入中 */
		LoadingPlugin: {
			"en": "",
			"zh-cn": "6502插件载入中",
		},
		/**6502插件载入完成 */
		PluginLoaded: {
			"en": "",
			"zh-cn": "6502插件载入完成",
		},

	};
}