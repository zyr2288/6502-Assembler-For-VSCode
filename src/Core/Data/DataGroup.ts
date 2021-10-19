import Language from "../../i18n";
import { GlobalVar } from "../GlobalVar";
import { TagDataGroup, Word } from "../Interface";
import { MyError } from "../MyError";
import { Marks, MarkScope } from "./Mark";

export class DataGroup {

	memberIds: number[] = [];
	memberWords: TagDataGroup[] = [];
	fileIndex = 0;

	AddMember(member: Word, globalVar: GlobalVar, option: { fileIndex: number, lineNumber: number }) {
		let markScope = globalVar.marks.CheckMarkType(member.text);
		if (markScope == MarkScope.Nameless) {
			let err = new MyError(Language.ErrorMessage.DataGroupDontSupportNamelessLabel);
			err.SetPosition({
				fileIndex: option.fileIndex, lineNumber: option.lineNumber,
				startPosition: member.startColumn, length: member.text.length
			});
			MyError.PushError(err);
			return;
		}
		let id = globalVar.marks.GetMarkId(member.text, markScope, option);
		this.memberIds.push(id);
	}

	FindIndex(marks: Marks, text: Word, index: number, option: { fileIndex: number, lineNumber: number }): number | undefined {
		let markScope = marks.CheckMarkType(text.text);
		if (markScope == MarkScope.Nameless) {
			let err = new MyError(Language.ErrorMessage.DataGroupDontSupportNamelessLabel);
			err.SetPosition({
				fileIndex: option.fileIndex, lineNumber: option.lineNumber,
				startPosition: text.startColumn, length: text.text.length
			});
			MyError.PushError(err);
			return;
		}
		let id = marks.GetMarkId(text.text, markScope, { fileIndex: this.fileIndex });
		for (let i = 0; i < this.memberIds.length; i++) {
			if (this.memberIds[i] != id)
				continue;

			if (index == 0) {
				return i;
			}

			index--;
		}
		return;
	}
}