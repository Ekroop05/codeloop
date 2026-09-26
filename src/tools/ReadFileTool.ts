import { Tool } from './Tool';
import { WorkspaceService } from '../WorkspaceService';

export class ReadFileTool implements Tool {

    name = 'read_file';

    description =
        'Reads the contents of a file in the current VS Code workspace.';

    constructor(
        private readonly workspaceService: WorkspaceService
    ) {}

    async execute(
        args: Record<string, unknown>
    ): Promise<string> {

        const filePath = args.path;

        if (typeof filePath !== 'string') {
            throw new Error(
                'read_file requires a "path" argument.'
            );
        }

        return await this.workspaceService.readFile(
            filePath
        );
    }
}