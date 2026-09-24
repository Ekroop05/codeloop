import * as vscode from 'vscode';
import { OllamaService } from './OllamaService';

export class CodeLoopViewProvider implements vscode.WebviewViewProvider {

    public static readonly viewType = 'codeloop.chat';

    private readonly ollamaService: OllamaService;

    constructor(
        private readonly extensionUri: vscode.Uri
    ) {
        this.ollamaService = new OllamaService();
    }

    public resolveWebviewView(
        webviewView: vscode.WebviewView
    ): void {

        webviewView.webview.options = {
            enableScripts: true
        };

        webviewView.webview.html = this.getHtml();

        webviewView.webview.onDidReceiveMessage(
            async (message) => {

                if (message.type !== 'chat') {
                    return;
                }

                try {

                    const response =
                        await this.ollamaService.chat(
                            message.prompt
                        );

                    webviewView.webview.postMessage({
                        type: 'response',
                        response
                    });

                } catch (error) {

                    const errorMessage =
                        error instanceof Error
                            ? error.message
                            : 'Unknown Ollama error';

                    webviewView.webview.postMessage({
                        type: 'error',
                        error: errorMessage
                    });
                }
            }
        );
    }

    private getHtml(): string {
        return `
            <!DOCTYPE html>

            <html lang="en">

            <head>

                <meta charset="UTF-8">

                <style>

                    * {
                        box-sizing: border-box;
                    }

                    body {
                        margin: 0;
                        padding: 12px;

                        height: 100vh;

                        display: flex;
                        flex-direction: column;

                        font-family:
                            var(--vscode-font-family);

                        color:
                            var(--vscode-foreground);
                    }

                    /* Header */

                    .header {
                        margin-bottom: 12px;
                    }

                    .title {
                        font-size: 18px;
                        font-weight: 600;
                    }

                    .subtitle {
                        margin-top: 3px;

                        font-size: 11px;

                        color:
                            var(
                                --vscode-descriptionForeground
                            );
                    }

                    /* Chat */

                    .chat {
                        flex: 1;

                        overflow-y: auto;

                        padding: 4px 0 12px;
                    }

                    .message {
                        margin-bottom: 12px;

                        padding: 9px 10px;

                        border-radius: 6px;

                        white-space: pre-wrap;

                        word-wrap: break-word;

                        line-height: 1.4;
                    }

                    .user {
                        background:
                            var(
                                --vscode-textCodeBlock-background
                            );

                        border-left:
                            3px solid
                            var(
                                --vscode-textLink-foreground
                            );
                    }

                    .agent {
                        background:
                            var(
                                --vscode-textBlockQuote-background
                            );

                        border-left:
                            3px solid
                            var(
                                --vscode-descriptionForeground
                            );
                    }

                    .label {
                        margin-bottom: 4px;

                        font-size: 10px;

                        font-weight: 600;

                        text-transform: uppercase;

                        color:
                            var(
                                --vscode-descriptionForeground
                            );
                    }

                    /* Input */

                    .input-area {
                        padding-top: 10px;

                        border-top:
                            1px solid
                            var(--vscode-panel-border);
                    }

                    textarea {
                        width: 100%;

                        min-height: 70px;
                        max-height: 180px;

                        padding: 8px;

                        resize: vertical;

                        color:
                            var(--vscode-input-foreground);

                        background:
                            var(--vscode-input-background);

                        border:
                            1px solid
                            var(--vscode-input-border);

                        border-radius: 4px;

                        font-family: inherit;

                        outline: none;
                    }

                    textarea:focus {
                        border-color:
                            var(--vscode-focusBorder);
                    }

                    /* Buttons */

                    .actions {
                        display: flex;

                        gap: 6px;

                        margin-top: 6px;
                    }

                    button {
                        flex: 1;

                        padding: 7px;

                        border: none;

                        border-radius: 4px;

                        cursor: pointer;

                        color:
                            var(
                                --vscode-button-foreground
                            );

                        background:
                            var(
                                --vscode-button-background
                            );
                    }

                    button:hover {
                        background:
                            var(
                                --vscode-button-hoverBackground
                            );
                    }

                    button.secondary {
                        color:
                            var(
                                --vscode-button-secondaryForeground
                            );

                        background:
                            var(
                                --vscode-button-secondaryBackground
                            );
                    }

                    button.secondary:hover {
                        background:
                            var(
                                --vscode-button-secondaryHoverBackground
                            );
                    }

                    button:disabled {
                        opacity: 0.6;

                        cursor: default;
                    }

                    /* Empty state */

                    .empty {
                        margin-top: 40px;

                        text-align: center;

                        font-size: 12px;

                        color:
                            var(
                                --vscode-descriptionForeground
                            );
                    }

                </style>

            </head>


            <body>

                <div class="header">

                    <div class="title">
                        CodeLoop
                    </div>

                    <div class="subtitle">
                        Local-first AI coding agent
                    </div>

                </div>


                <div
                    id="chat"
                    class="chat"
                >

                    <div
                        id="empty"
                        class="empty"
                    >
                        Start a conversation with CodeLoop.
                    </div>

                </div>


                <div class="input-area">

                    <textarea
                        id="prompt"
                        placeholder="Ask CodeLoop..."
                    ></textarea>


                    <div class="actions">

                        <button id="send">
                            Send
                        </button>


                        <button
                            id="clear"
                            class="secondary"
                        >
                            Clear
                        </button>

                    </div>

                </div>


                <script>

                    const vscode =
                        acquireVsCodeApi();


                    const chat =
                        document.getElementById(
                            'chat'
                        );


                    const prompt =
                        document.getElementById(
                            'prompt'
                        );


                    const send =
                        document.getElementById(
                            'send'
                        );


                    const clear =
                        document.getElementById(
                            'clear'
                        );


                    function addMessage(
                        role,
                        text
                    ) {

                        const empty =
                            document.getElementById(
                                'empty'
                            );


                        if (empty) {
                            empty.remove();
                        }


                        const message =
                            document.createElement(
                                'div'
                            );


                        message.className =
                            'message ' + role;


                        const label =
                            document.createElement(
                                'div'
                            );


                        label.className =
                            'label';


                        label.textContent =
                            role === 'user'
                                ? 'You'
                                : 'CodeLoop';


                        const content =
                            document.createElement(
                                'div'
                            );


                        content.textContent =
                            text;


                        message.appendChild(
                            label
                        );

                        message.appendChild(
                            content
                        );


                        chat.appendChild(
                            message
                        );


                        chat.scrollTop =
                            chat.scrollHeight;
                    }


                    function sendMessage() {

                        const message =
                            prompt.value.trim();


                        if (!message) {
                            return;
                        }


                        addMessage(
                            'user',
                            message
                        );


                        prompt.value = '';


                        send.disabled = true;


                        vscode.postMessage({

                            type: 'chat',

                            prompt: message

                        });
                    }


                    send.addEventListener(
                        'click',
                        sendMessage
                    );


                    prompt.addEventListener(
                        'keydown',
                        (event) => {

                            if (
                                event.key === 'Enter' &&
                                !event.shiftKey
                            ) {

                                event.preventDefault();

                                sendMessage();
                            }
                        }
                    );


                    clear.addEventListener(
                        'click',
                        (event) => {

                            event.preventDefault();

                            event.stopPropagation();


                            prompt.value = '';


                            chat.innerHTML = '';


                            const emptyMessage =
                                document.createElement(
                                    'div'
                                );


                            emptyMessage.id =
                                'empty';


                            emptyMessage.className =
                                'empty';


                            emptyMessage.textContent =
                                'Start a conversation with CodeLoop.';


                            chat.appendChild(
                                emptyMessage
                            );
                        }
                    );


                    window.addEventListener(
                        'message',
                        (event) => {

                            const message =
                                event.data;


                            if (
                                message.type ===
                                'response'
                            ) {

                                addMessage(
                                    'agent',
                                    message.response
                                );

                                send.disabled =
                                    false;

                                return;
                            }


                            if (
                                message.type ===
                                'error'
                            ) {

                                addMessage(
                                    'agent',
                                    'Error: ' +
                                    message.error
                                );

                                send.disabled =
                                    false;
                            }

                        }
                    );

                </script>

            </body>

            </html>
        `;
    }
}