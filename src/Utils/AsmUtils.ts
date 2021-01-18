import { Word } from "../Interface";
import { AddressRegex, AddressType } from "../MyConst";
import { Utils } from "./Utils";

export class AsmUtils {

	//#region 分析编译指令的寻址方式和表达式
	/**
	 * 分析编译指令的寻址方式和表达式
	 * @param text 要分析的文本
	 * @param startColumn 文本起始位置
	 */
	static GetAddressType(text: string, startColumn = 0): { addressType: AddressType[], instruction: Word, expression?: Word } {
		let words = Utils.SplitWithRegex(/\s+/g, 1, text, startColumn);
		let addressType: AddressType[] = [];
		let expression: Word | undefined;
		let match: RegExpExecArray | null;
		if (words[1]) {
			// 分析寻址方式
			while (true) {
				// LDA #nn
				if (match = new RegExp(AddressRegex.Immediate).exec(words[1].text)) {
					expression = { text: match[0], startColumn: match.index + words[1].startColumn };
					addressType.push(AddressType.Immediate);
					break;
				}

				// LDA (nn,X)
				if (match = new RegExp(AddressRegex.Indirect_X, "g").exec(words[1].text)) {
					expression = { text: match[0], startColumn: match.index + words[1].startColumn };
					addressType.push(AddressType.Indirect_X);
					break;
				}

				// LDA (nn),Y
				if (match = new RegExp(AddressRegex.Indirect_Y, "g").exec(words[1].text)) {
					expression = { text: match[0], startColumn: match.index + words[1].startColumn };
					addressType.push(AddressType.Indirect_Y);
					break;
				}

				// LDA nn,X 或 LDA nnnn,X
				if (match = new RegExp(AddressRegex.XOffset, "g").exec(words[1].text)) {
					expression = { text: match[0], startColumn: match.index + words[1].startColumn };
					addressType.push(AddressType.ZeroPage_X);
					addressType.push(AddressType.Absolute_X);
					break;
				}

				// LDA nn,Y 或 LDA nnnn,Y
				if (match = new RegExp(AddressRegex.YOffset, "g").exec(words[1].text)) {
					expression = { text: match[0], startColumn: match.index + words[1].startColumn };
					addressType.push(AddressType.ZeroPage_Y);
					addressType.push(AddressType.Absolute_Y);
					break;
				}

				// LDA (nnnn)
				if (match = new RegExp(AddressRegex.Indirect, "g").exec(words[1].text)) {
					expression = { text: match[0], startColumn: match.index + words[1].startColumn };
					addressType.push(AddressType.Indirect);
					break;
				}

				// LDA nn 或 LDA nnnn 或 BCC nn
				addressType.push(AddressType.ZeroPage);
				addressType.push(AddressType.Absolute);
				addressType.push(AddressType.Conditional);
				expression = words[1];
				break;
			}
		} else {
			// 单操作
			addressType.push(AddressType.Implied);
		}
		let instruction: Word = Utils.StringTrim(words[0].text.toUpperCase(), words[0].startColumn);
		return {
			addressType: addressType,
			instruction: instruction,
			expression: expression
		};
	}
	//#endregion 分析编译指令的寻址方式和表达式

}