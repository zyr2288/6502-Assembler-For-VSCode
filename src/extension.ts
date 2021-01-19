// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { GlobalVar } from './GlobalVar';
import { Helper } from './Helper/Helper';

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	Helper.HelperInit();

	// The command has been defined in the package.json file
	// Now provide the implementation of the command with registerCommand`
	// The commandId parameter must match the command field in package.json
	let disposable = vscode.commands.registerCommand('6502-assembler.helloWorld', () => {
		// The code you place here will be executed every time your command is executed

		// let globalVar = new GlobalVar();
		// globalVar.marks.AddMark({ text: "aa.bb", startColumn: 0 }, { fileIndex: 0, lineNumber: 0 });
		// globalVar.marks.AddMark({ text: "aa.bb.cc", startColumn: 0 }, { fileIndex: 0, lineNumber: 0 });
		// globalVar.marks.AddMark({ text: "aa.bb.dd", startColumn: 0 }, { fileIndex: 0, lineNumber: 0 });
		// globalVar.marks.AddMark({ text: "aa.cd", startColumn: 0 }, { fileIndex: 0, lineNumber: 0 });
		// globalVar.marks.DeleteMark(92518606);		// aa.bb
		// globalVar.marks.DeleteMark(-1147165312);	// aa.bb.cc
		// globalVar.marks.DeleteMark(-1147165280);	// aa.bb.dd
		// globalVar.marks.DeleteMark(92518639);		// aa.bb.dd
	});

	context.subscriptions.push(disposable);


}

// this method is called when your extension is deactivated
export function deactivate() { }
