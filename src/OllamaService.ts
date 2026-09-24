export class OllamaService {

    private readonly baseUrl =
        'http://localhost:11434';

    private readonly model =
        'qwen2.5-coder:7b';

    async chat(
        prompt: string
    ): Promise<string> {

        const response = await fetch(
            `${this.baseUrl}/api/chat`,
            {
                method: 'POST',

                headers: {
                    'Content-Type': 'application/json'
                },

                body: JSON.stringify({
                    model: this.model,

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
}