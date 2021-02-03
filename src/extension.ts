import * as vscode from 'vscode';
import { Helper } from './Core/Helper/Helper';
import Language from './i18n';

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	Language.Init();

	// 状态栏提示
	let statusBarItem: vscode.StatusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left);
	statusBarItem.text = ` $(sync~spin) ${Language.Info.LoadingPlugin}`;
	statusBarItem.show();

	Helper.HelperInit();

	statusBarItem.text = ` $(check) ${Language.Info.PluginLoaded}`;
	setTimeout(() => {
		statusBarItem.hide();
	}, 1000);
}

// this method is called when your extension is deactivated
export function deactivate() { }
