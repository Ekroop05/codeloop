import * as vscode from 'vscode';

export class CodeLoopViewProvider implements vscode.WebviewViewProvider {

    public static readonly viewType = 'codeloop.chat';

    constructor(
        private readonly extensionUri: vscode.Uri
    ) {}

    public resolveWebviewView(
        webviewView: vscode.WebviewView
    ): void {

        webviewView.webview.options = {
            enableScripts: true
        };

        webviewView.webview.html = this.getHtml();
    }

    private getHtml(): string {
        return `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">

                <style>
                    body {
                        padding: 12px;
                        font-family: var(--vscode-font-family);
                        color: var(--vscode-foreground);
                    }

                    h2 {
                        margin-top: 0;
                    }

                    .subtitle {
                        color: var(--vscode-descriptionForeground);
                        font-size: 12px;
                        margin-bottom: 20px;
                    }

                    textarea {
                        width: 100%;
                        box-sizing: border-box;
                        resize: vertical;
                        min-height: 80px;
                        padding: 8px;
                        color: var(--vscode-input-foreground);
                        background: var(--vscode-input-background);
                        border: 1px solid var(--vscode-input-border);
                        border-radius: 4px;
                        font-family: inherit;
                    }

                    button {
                        margin-top: 8px;
                        width: 100%;
                        padding: 7px;
                        border: none;
                        border-radius: 4px;
                        cursor: pointer;
                        color: var(--vscode-button-foreground);
                        background: var(--vscode-button-background);
                    }

                    button:hover {
                        background: var(--vscode-button-hoverBackground);
                    }

                    .response {
                        margin-top: 20px;
                        padding: 10px;
                        border-radius: 4px;
                        background: var(--vscode-textBlockQuote-background);
                        border: 1px solid var(--vscode-textBlockQuote-border);
                        white-space: pre-wrap;
                    }
                </style>
            </head>

            <body>

                <h2>CodeLoop</h2>

                <div class="subtitle">
                    Local-first AI coding agent
                </div>

                <textarea
                    id="prompt"
                    placeholder="Ask CodeLoop..."
                ></textarea>

                <button id="send">
                    Send
                </button>

                <div
                    id="response"
                    class="response"
                >
                    Ready.
                </div>

                <script>

                    const vscode = acquireVsCodeApi();

                    const prompt =
                        document.getElementById('prompt');

                    const send =
                        document.getElementById('send');

                    const response =
                        document.getElementById('response');

                    send.addEventListener('click', () => {

                        const message = prompt.value.trim();

                        if (!message) {
                            return;
                        }

                        response.textContent =
                            'Message received by CodeLoop: ' + message;

                        vscode.postMessage({
                            type: 'chat',
                            prompt: message
                        });

                    });

                </script>

            </body>
            </html>
        `;
    }
}