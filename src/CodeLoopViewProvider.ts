import * as vscode from 'vscode';
import { OllamaService } from './OllamaService';
import { WorkspaceService } from './WorkspaceService';
import { ToolRegistry } from './tools/ToolRegistry';
import { ListFilesTool } from './tools/ListFilesTool';
import { ReadFileTool } from './tools/ReadFileTool';
import { ToolDecisionParser } from './tools/ToolDecisionParser';
export class CodeLoopViewProvider
    implements vscode.WebviewViewProvider {

    public static readonly viewType =
        'codeloop.chat';

    private readonly ollamaService:
        OllamaService;

    private readonly workspaceService:
        WorkspaceService;

    private readonly toolRegistry:
        ToolRegistry;
    
    private readonly toolDecisionParser:
    ToolDecisionParser;
    constructor(
        private readonly extensionUri: vscode.Uri
    ) {
        this.ollamaService =
            new OllamaService();

        this.workspaceService =
            new WorkspaceService();

        this.toolRegistry =
            new ToolRegistry();
        
        this.toolDecisionParser =
            new ToolDecisionParser();

        this.toolRegistry.register(
            new ListFilesTool(
                this.workspaceService
            )
        );

        this.toolRegistry.register(
            new ReadFileTool(
                this.workspaceService
            )
        );
    }

    public resolveWebviewView(
        webviewView: vscode.WebviewView
    ): void {

        webviewView.webview.options = {
            enableScripts: true
        };

        webviewView.webview.html =
            this.getHtml();

        webviewView.webview.onDidReceiveMessage(
            async (message) => {

                if (message.type !== 'chat') {
                    return;
                }

                /*
                 * Execute the list_files tool.
                 */

                if (message.prompt === '/list-files') {

                    try {

                        const tool =
                            this.toolRegistry.get(
                                'list_files'
                            );

                        if (!tool) {
                            throw new Error(
                                'list_files tool is not registered.'
                            );
                        }

                        const result =
                            await tool.execute({});

                        webviewView.webview.postMessage({
                            type: 'response',
                            response: result
                        });

                    } catch (error) {

                        const errorMessage =
                            error instanceof Error
                                ? error.message
                                : 'Tool execution failed';

                        webviewView.webview.postMessage({
                            type: 'error',
                            error: errorMessage
                        });
                    }

                    return;
                }

                /*
                 * Execute the read_file tool.
                 *
                 * Usage:
                 * /read-file <absolute-file-path>
                 */

                if (
                    message.prompt.startsWith(
                        '/read-file '
                    )
                ) {

                    try {

                        const filePath =
                            message.prompt.substring(
                                '/read-file '.length
                            ).trim();

                        if (!filePath) {
                            throw new Error(
                                'Please provide a file path.'
                            );
                        }

                        const tool =
                            this.toolRegistry.get(
                                'read_file'
                            );

                        if (!tool) {
                            throw new Error(
                                'read_file tool is not registered.'
                            );
                        }

                        const result =
                            await tool.execute({
                                path: filePath
                            });

                        webviewView.webview.postMessage({
                            type: 'response',
                            response: result
                        });

                    } catch (error) {

                        const errorMessage =
                            error instanceof Error
                                ? error.message
                                : 'Tool execution failed';

                        webviewView.webview.postMessage({
                            type: 'error',
                            error: errorMessage
                        });
                    }

                    return;
                }

                /*
                 * Automatic tool-aware Ollama chat.
                 *
                 * The model can request a registered tool by
                 * returning a <tool_call> block. CodeLoop
                 * executes the tool and sends the result back
                 * to Ollama until the model produces a normal
                 * final answer.
                 */

                try {

                    const workspaceRoot =
                        this.workspaceService
                            .getWorkspaceRoot();

                    const toolDescriptions =
                        this.toolRegistry
                            .getToolDescriptions();

                    const systemPrompt = `
You are CodeLoop, a local-first AI coding agent running inside VS Code.

You have read-only access to the current VS Code workspace.

Workspace root:
${workspaceRoot ?? 'No workspace open'}

Available tools:
${toolDescriptions}

IMPORTANT TOOL RULES:

1. Never invent the contents of a source file.
2. If the user's request requires information from a file,
   use the read_file tool before answering.
3. If you need to inspect the workspace structure,
   use the list_files tool.
4. Use paths relative to the workspace root.
5. When requesting a tool, respond ONLY with this format:

<tool_call>
{
  "tool": "tool_name",
  "args": {
    "argument": "value"
  }
}
</tool_call>

Example:

<tool_call>
{
  "tool": "read_file",
  "args": {
    "path": "backend/src/main/java/com/vms/service/BookingService.java"
  }
}
</tool_call>

6. After receiving a tool result, use the actual result
   to answer the user's request.
7. Do not claim that you modified, created, or deleted files.
8. If the available tool results do not contain enough
   information, say what information is missing instead
   of inventing it.
`;

                    let conversationPrompt = `
${systemPrompt}

User request:
${message.prompt}
`;

                    let finalResponse = '';

                    const maxToolCalls = 5;

                    for (
                        let attempt = 0;
                        attempt < maxToolCalls;
                        attempt++
                    ) {

                        const response =
                            await this.ollamaService.chat(
                                conversationPrompt
                            );

                        const decision =
                            this.toolDecisionParser.parse(
                                response
                            );

                        /*
                         * No tool call means the model has
                         * produced the final answer.
                         */

                        if (!decision) {

                            finalResponse =
                                response;

                            break;
                        }

                        /*
                         * Look up the requested tool.
                         */

                        const tool =
                            this.toolRegistry.get(
                                decision.tool
                            );

                        if (!tool) {

                            conversationPrompt += `

Assistant requested an unavailable tool:
${response}

Tool error:
The tool "${decision.tool}" is not registered.

Available tools:
${toolDescriptions}

Choose an available tool or provide the final answer.
`;

                            continue;
                        }

                        try {

                            const toolResult =
                                await tool.execute(
                                    decision.args
                                );

                            conversationPrompt += `

Assistant tool request:
${response}

Tool result from ${decision.tool}:
${toolResult}

Now continue the user's task using the actual tool result.
If another file is required, request another tool.
Otherwise provide the final answer.
`;

                        } catch (error) {

                            const errorMessage =
                                error instanceof Error
                                    ? error.message
                                    : 'Tool execution failed';

                            conversationPrompt += `

Assistant tool request:
${response}

Tool error from ${decision.tool}:
${errorMessage}

Do not invent the missing information.
Continue the task if possible.
`;
                        }
                    }

                    /*
                     * Prevent an empty response if the model
                     * keeps requesting tools for all attempts.
                     */

                    if (!finalResponse) {

                        finalResponse =
                            'CodeLoop reached the maximum number of tool calls without producing a final answer.';
                    }

                    webviewView.webview.postMessage({
                        type: 'response',
                        response: finalResponse
                    });

                } catch (error) {

                    const errorMessage =
                        error instanceof Error
                            ? error.message
                            : 'Unknown CodeLoop error';

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