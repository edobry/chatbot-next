"use client";

import { useChat } from "@ai-sdk/react";
import type { UIMessage } from "ai";
import clsx from "clsx";

function MessagePart({ part }: { part: UIMessage["parts"][number] }) {
    const partClass = clsx({
        "msg-part-text": part.type === "text",
        "msg-part-reasoning": part.type === "reasoning",
    });

    return (
        <span className={`whitespace-pre-wrap ${partClass}`}>
            {(() => {
                switch (part.type) {
                    case "text":
                        return part.text;
                    case "reasoning":
                        return `Reasoning: ${part.reasoning}`;
                    default:
                        return "";
                }
            })()}
        </span>
    );
}

function Chat() {
    const { messages, input, handleInputChange, handleSubmit } = useChat();

    return (
        <div
            id="chatbox"
            className="m-auto flex h-[80vh] min-w-md max-w-xl flex-col overflow-hidden rounded-md border-2 border-gray-300"
        >
            <h2 className="flex-shrink-0 bg-gray-200 p-3 text-center font-bold text-2xl text-gray-600">
                Chatbot
            </h2>
            <div className="flex min-h-0 flex-1 flex-col">
                <div
                    id="messages"
                    className="min-h-0 flex-1 overflow-y-auto px-3 pb-4"
                >
                    <div className="flex flex-col gap-4 pt-2">
                        {messages.map((message) => {
                            const isUser = message.role === "user";
                            const role = isUser ? "You" : "AI";

                            const roleClass = clsx(
                                {
                                    "msg-role-user": isUser,
                                    "msg-role-ai": !isUser,
                                },
                                "font-bold text-gray-600 text-sm"
                            );

                            return (
                                <div
                                    key={message.id}
                                    className="flex flex-col gap-2 whitespace-pre-wrap rounded-md border border-gray-200 bg-gray-100 p-3"
                                >
                                    <div className={roleClass}>{role}</div>
                                    {message.parts.map((part, index) => {
                                        return (
                                            <MessagePart
                                                key={`${message.id}-${index}`}
                                                part={part}
                                            />
                                        );
                                    })}
                                </div>
                            );
                        })}
                    </div>
                </div>
                <form
                    onSubmit={handleSubmit}
                    className="flex flex-shrink-0 flex-row gap-2 p-2"
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
