import * as vscode from 'vscode';

export class WorkspaceService {

    /**
     * Returns the root folder of the currently
     * opened VS Code workspace.
     */
    getWorkspaceRoot(): string | undefined {

        const workspaceFolder =
            vscode.workspace.workspaceFolders?.[0];

        return workspaceFolder?.uri.fsPath;
    }

    /**
     * Returns files inside the workspace.
     *
     * This intentionally ignores common dependency
     * and version-control directories.
     */
    async getWorkspaceFiles(): Promise<string[]> {

        const files =
            await vscode.workspace.findFiles(
                '**/*',
                '**/{node_modules,.git,dist,out}/**'
            );

        return files.map(
            file => file.fsPath
        );
    }

    /**
     * Reads the contents of a workspace file.
     */
    async readFile(
        filePath: string
    ): Promise<string> {

        const uri =
            vscode.Uri.file(filePath);

        const data =
            await vscode.workspace.fs.readFile(uri);

        return Buffer.from(data).toString('utf8');
    }
}