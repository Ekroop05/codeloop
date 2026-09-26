import * as vscode from 'vscode';
import * as path from 'path';

export class WorkspaceService {

    getWorkspaceRoot(): string | undefined {
        const workspaceFolder =
            vscode.workspace.workspaceFolders?.[0];

        return workspaceFolder?.uri.fsPath;
    }

    async getWorkspaceFiles(): Promise<string[]> {
        const files =
            await vscode.workspace.findFiles(
                '**/*',
                '**/{node_modules,.git,dist,out,target}/**'
            );

        return files.map(
            file => file.fsPath
        );
    }

    async readFile(
        filePath: string
    ): Promise<string> {

        const workspaceRoot =
            this.getWorkspaceRoot();

        if (!workspaceRoot) {
            throw new Error(
                'No VS Code workspace is open.'
            );
        }

        const resolvedPath =
            path.isAbsolute(filePath)
                ? filePath
                : path.join(
                    workspaceRoot,
                    filePath
                );

        const uri =
            vscode.Uri.file(resolvedPath);

        const data =
            await vscode.workspace.fs.readFile(uri);

        return Buffer.from(data).toString('utf8');
    }
}