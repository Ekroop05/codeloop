import { Tool } from './Tool';

export class ToolRegistry {

    private readonly tools =
        new Map<string, Tool>();

    register(tool: Tool): void {
        this.tools.set(
            tool.name,
            tool
        );
    }

    get(
        name: string
    ): Tool | undefined {
        return this.tools.get(name);
    }

    getAll(): Tool[] {
        return Array.from(
            this.tools.values()
        );
    }

    getToolDescriptions(): string {

        return this.getAll()
            .map(
                tool =>
                    `- ${tool.name}: ${tool.description}`
            )
            .join('\n');
    }
}