import { Tool } from './Tool';
import { WorkspaceService } from '../WorkspaceService';

export class ListFilesTool implements Tool {

    name = 'list_files';

    description =
        'Lists files in the current VS Code workspace.';

    constructor(
        private readonly workspaceService: WorkspaceService
    ) {}

    async execute(
        args: Record<string, unknown>
    ): Promise<string> {

        const files =
            await this.workspaceService.getWorkspaceFiles();

        if (files.length === 0) {
            return 'No workspace files found.';
        }

        return files.join('\n');
    }
}