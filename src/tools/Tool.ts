export interface Tool {
    name: string;
    description: string;

    execute(
        args: Record<string, unknown>
    ): Promise<string>;
}