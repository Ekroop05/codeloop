export interface ToolDecision {
    tool: string;
    args: Record<string, unknown>;
}

export class ToolDecisionParser {

    parse(
        response: string
    ): ToolDecision | null {

        /*
         * Format 1:
         *
         * <tool_call>
         * {
         *   "tool": "read_file",
         *   "args": {
         *     "path": "..."
         *   }
         * }
         * </tool_call>
         */

        const toolCallMatch =
            response.match(
                /<tool_call>\s*([\s\S]*?)\s*<\/tool_call>/i
            );

        if (toolCallMatch) {

            const decision =
                this.parseJson(
                    toolCallMatch[1]
                );

            if (decision) {
                return decision;
            }
        }

        /*
         * Format 2:
         *
         * ```json
         * {
         *   "tool": "read_file",
         *   "args": {
         *     "path": "..."
         *   }
         * }
         * ```
         */

        const markdownJsonMatch =
            response.match(
                /```(?:json)?\s*([\s\S]*?)\s*```/i
            );

        if (markdownJsonMatch) {

            const decision =
                this.parseJson(
                    markdownJsonMatch[1]
                );

            if (decision) {
                return decision;
            }
        }

        /*
         * Format 3:
         *
         * Raw JSON response.
         */

        const trimmed =
            response.trim();

        if (
            trimmed.startsWith('{') &&
            trimmed.endsWith('}')
        ) {

            const decision =
                this.parseJson(trimmed);

            if (decision) {
                return decision;
            }
        }

        return null;
    }

    private parseJson(
        jsonText: string
    ): ToolDecision | null {

        try {

            const parsed =
                JSON.parse(jsonText);

            if (
                typeof parsed !== 'object' ||
                parsed === null
            ) {
                return null;
            }

            const tool =
                (parsed as {
                    tool?: unknown;
                }).tool;

            const args =
                (parsed as {
                    args?: unknown;
                }).args;

            if (
                typeof tool !== 'string' ||
                typeof args !== 'object' ||
                args === null ||
                Array.isArray(args)
            ) {
                return null;
            }

            return {
                tool,
                args:
                    args as Record<
                        string,
                        unknown
                    >
            };

        } catch {

            return null;
        }
    }
}