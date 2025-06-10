import { streamText, type UIMessage } from "ai";
import { openai } from "@ai-sdk/openai";

export const maxDuration = 30;

export async function POST(req: Request) {
    const { messages } = await req.json() as { messages: UIMessage[] };

    console.log(messages);

    const result = streamText({
        model: openai("gpt-4o"),
        messages,
        onError: (error) => {
            if (error.error instanceof Error) {
                console.error(error.error.message);
            }
            throw error.error;
        }
    });

    return result.toDataStreamResponse();
}
