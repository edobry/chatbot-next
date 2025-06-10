import { streamText, tool, type UIMessage } from "ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";

export const maxDuration = 30;

export async function POST(req: Request) {
    const { messages } = await req.json() as { messages: UIMessage[] };

    console.log(messages);

    const result = streamText({
        model: openai("gpt-4o"),
        messages,
        tools: {
            random: tool({
                description: "Generate a random number between 0 and 100",
                parameters: z.object({
                    min: z.number(),
                    max: z.number(),
                }),
                execute: async ({ min, max }) => {
                    console.log("Executing random tool", { min, max });
                    await new Promise((resolve) => setTimeout(resolve, 3000));
                    return Math.floor(Math.random() * (max - min + 1)) + min;
                },
            }),
        },
        onError: (error) => {
            if (error.error instanceof Error) {
                console.error(error.error.message);
            }
            throw error.error;
        },
    });

    return result.toDataStreamResponse();
}
