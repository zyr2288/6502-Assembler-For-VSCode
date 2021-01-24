import * as vscode from 'vscode';
import { CompileAllText, GetAsmResult } from './Core/AsmLine/Compile';
import { Helper } from './Core/Helper/Helper';
import { MyError } from './Core/MyError';
import { Utils } from "./Core/Utils/Utils"

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	Helper.HelperInit();

	let disposable = vscode.commands.registerCommand('6502-assembler.helloWorld', () => {
		if (!vscode.window.activeTextEditor)
			return;

		let text = vscode.window.activeTextEditor.document.getText();
		let filePath = vscode.window.activeTextEditor.document.uri.fsPath;

		let lines = CompileAllText(text, filePath)
		MyError.UpdateError();
		vscode.env.clipboard.writeText(Utils.ByteToString(GetAsmResult(lines)));
	});

	context.subscriptions.push(disposable);

}

// this method is called when your extension is deactivated
export function deactivate() { }
