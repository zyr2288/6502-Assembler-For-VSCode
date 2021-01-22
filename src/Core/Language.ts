export default class Language {
	static readonly ErrorMessage = {
		/**标签{{0}}命名不正确 */
		MarkIllegal: "标签\"{{0}}\"命名不正确",
		/**找不到标签"{{0}}"" */
		MarkMiss: "找不到标签\"{{0}}\"",
		/**标签"{{0}}"已存在 */
		MarkAlreadyExists: "标签\"{{0}}\"已存在",
		/**标签"{{0}}"已定义为常量 */
		MarkIsDefined: "标签\"{{0}}\"已定义为常量",
		/**括号缺失 */
		BracketsMiss: "括号缺失",
		/**运算符之间缺失标记 */
		MarkMissBtOps: "运算符之间缺失标记",
		/**不支持多维数组 */
		DontSupportMultiArray: "不支持多维数组",

		/**表达式错误 */
		ExpressionError: "表达式错误",
		/**请输入参数或表达式 */
		ExpressionMiss: "请输入参数或表达式",
		/**无法计算表达式 */
		CannotComputeExpression: "无法计算表达式",

		/**标记"{{0}}"已定义成非数组 */
		MarkDontSupportArray: "标记\"{{0}}\"已定义成非数组",
		/**命令不支持参数 */
		DontSupportParameters: "命令不支持参数",
		/**找不到匹配指令 */
		CommandMiss: "找不到匹配指令",
		/**参数错误 */
		ParametersError: "参数错误",

		/**文件"{{0}}"不存在 */
		FileIsNotExist: "文件\"{{0}}\"不存在",

		/**请设定编译起始地址 */
		SetStartAddress: "请设定编译起始地址",
		/**设定地址错误 */
		AddressError: "设定地址错误",
		/**寻址方式错误 */
		AddressTypeError: "寻址方式错误",
		/**地址越界 */
		AddressOutofRange: "地址越界",

		/**找不到函数"{{0}}" */
		MacroIsNotExist: "找不到函数\"{{0}}\"",
		/**函数已存在"{{0}}" */
		MacroIsExist: "函数\"{{0}}\"已定义",
		/**函数内不支持命令"{{0}}" */
		MacroNotSupportCommand: "函数内不支持命令\"{{0}}\"",
		/**函数内不支持临时标签 */
		MacroNotSupportTempMark: "函数内不支持临时标签",
		/**该编译器命令前不支持标签 */
		CommandNotSupportMark: "该编译器命令前不支持标签",
		/**找不到匹配的"{{0}}" */
		NotMatchEnd: "找不到匹配的\"{{0}}\"",
		/**参数个数不匹配，应该为{{0}} */
		MacroParamtersNotMatch: "参数个数不匹配，应该为\"{{0}}\"",

		/**"{{0}}"的结果值超出范围 */
		ValueOutOfRange: "\"{{0}}\"的结果值超出范围",
	};

	static readonly Info = {
		/**参数个数为"{{0}}" */
		ParamtersCount: "参数个数为\"{{0}}\""
	};
}