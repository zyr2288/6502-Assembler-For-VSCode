// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { CompileAllText } from './Core/AsmLine/Compile';
import { Helper } from './Core/Helper/Helper';
import { MyError } from './Core/MyError';

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	Helper.HelperInit();

	let disposable = vscode.commands.registerCommand('6502-assembler.helloWorld', () => {
		if (!vscode.window.activeTextEditor)
			return;

		let text = vscode.window.activeTextEditor.document.getText();
		let filePath = vscode.window.activeTextEditor.document.uri.fsPath;

		CompileAllText(text, filePath)
		MyError.UpdateError();
	});

	context.subscriptions.push(disposable);


}

// this method is called when your extension is deactivated
export function deactivate() { }
