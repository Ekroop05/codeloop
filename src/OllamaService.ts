export interface OllamaModel {
    name: string;
    size?: number;
    modified_at?: string;
}

interface OllamaTagsResponse {
    models?: OllamaModel[];
}

export class OllamaService {

    private readonly baseUrl =
        'http://localhost:11434';

    async chat(
        prompt: string,
        model: string
    ): Promise<string> {

        const response = await fetch(
            `${this.baseUrl}/api/chat`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model,
                    messages: [
                        {
                            role: 'user',
                            content: prompt
                        }
                    ],
                    stream: false
                })
            }
        );

        if (!response.ok) {
            throw new Error(
                `Ollama request failed: ${
                    response.status
                } ${response.statusText}`
            );
        }

        const data =
            await response.json() as {
                message?: {
                    content?: string;
                };
            };

        return data.message?.content ?? '';
    }

    async getModels(): Promise<OllamaModel[]> {

        const response =
            await fetch(
                `${this.baseUrl}/api/tags`
            );

        if (!response.ok) {
            throw new Error(
                `Unable to get Ollama models: ${
                    response.status
                } ${response.statusText}`
            );
        }

        const data =
            await response.json() as OllamaTagsResponse;

        return data.models ?? [];
    }
}