import * as vscode from 'vscode';
import { Helper } from './Core/Helper/Helper';

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	// 状态栏提示
	let statusBarItem: vscode.StatusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left);
	statusBarItem.text = " $(sync~spin) 6502插件载入中";
	statusBarItem.show();

	Helper.HelperInit();

	statusBarItem.text = " $(check) 6502插件载入完毕";
	setTimeout(() => {
		statusBarItem.hide();
	}, 1000);

}

// this method is called when your extension is deactivated
export function deactivate() { }
