"use client";

import { useChat } from "@ai-sdk/react";
import type { UIMessage } from "ai";

const Part = (part: UIMessage["parts"][number] ) => {
    switch (part.type) {
        case "text":
            return part.text;
        case "reasoning":
            return `Reasoning: ${part.reasoning}`;
        default:
            return "";
    }
}

function MessagePart({ part }: { part: UIMessage["parts"][number] }) {
    return (
        <div>
            <div className="flex flex-row gap-2">
                <span className="whitespace-pre-wrap">{part.type}</span>
                <span className="whitespace-pre-wrap">{Part(part)}</span>
            </div>
        </div>
    )
}

function Chat() {
    const { messages, input, handleInputChange, handleSubmit } = useChat();

    return (
        <div
            id="chatbox"
            className="m-auto flex h-[80vh] max-w-lg flex-col overflow-hidden rounded-md border-2 border-gray-300"
        >
            <h2 className="flex-shrink-0 bg-gray-200 p-3 text-center font-bold text-2xl text-gray-600">
                Chatbot
            </h2>
            <div className="flex min-h-0 flex-1 flex-col p-2">
                <div id="messages" className="min-h-0 flex-1 overflow-y-auto px-3 pb-4">
                    <div className="flex flex-col gap-4">
                        {messages.map((message) => (
                            <div key={message.id} className="whitespace-pre-wrap">
                                {message.role === "user" ? "You" : "AI"}:{" "}
                                {message.parts.map((part, index) => {
                                    return (
                                        <MessagePart
                                            key={`${message.id}-${index}`}
                                            part={part}
                                        />
                                    );
                                })}
                            </div>
                        ))}
                    </div>
                </div>
                <form
                    onSubmit={handleSubmit}
                    className="flex flex-shrink-0 flex-row gap-2 pt-2"
                >
                    <input
                        value={input}
                        onChange={handleInputChange}
                        placeholder="sup?"
                        className="w-full flex-1 rounded-md border-2 border-gray-300 p-2"
                    />
                    <button
                        type="submit"
                        className="rounded-md border-2 border-gray-300 p-2"
                    >
                        Send
                    </button>
                </form>
            </div>
        </div>
    );
}

export default function Home() {
	return (
		<div className="flex flex-col items-center justify-center h-screen">
			<Chat />
		</div>
	);
}
