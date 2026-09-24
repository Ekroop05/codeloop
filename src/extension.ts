import * as vscode from 'vscode';
import { CodeLoopViewProvider } from './CodeLoopViewProvider';

export function activate(
    context: vscode.ExtensionContext
) {
    console.log('CodeLoop is now active.');

    const provider =
        new CodeLoopViewProvider(
            context.extensionUri
        );

    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider(
            CodeLoopViewProvider.viewType,
            provider
        )
    );
}

export function deactivate() {}