import { GlobalVar } from "../GlobalVar";
import { Word } from "../Interface";
import { Marks, MarkScope } from "./Mark";

export class DataGroup {
	private memberIds: number[] = [];

	AddMember(member: Word, globalVar: GlobalVar, option: { fileIndex: number, lineNumber: number }) {
		let id = globalVar.marks.GetMarkId(member.text, MarkScope.Global, option);
		this.memberIds.push(id);
	}

	FindIndex(marks: Marks, member: string, index: number): number | undefined {
		let id = marks.GetMarkId(member, MarkScope.Global, { fileIndex: 0 });
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