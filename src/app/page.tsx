"use client";

import { useChat } from "@ai-sdk/react";
import type { ToolInvocation, UIMessage } from "ai";
import clsx from "clsx";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPaperPlane, faStop } from "@fortawesome/free-solid-svg-icons";
import { useAutoScroll } from "./util";
import { forwardRef, useRef, useEffect } from "react";

function ToolCall({ invocation }: { invocation: ToolInvocation }) {
    return (
        <div className="flex flex-col gap-2">
            <div className="italic">
                Called tool {" "}
                <span className="font-bold not-italic">
                    {invocation.toolName}
                </span>{" "}
                with {" "}
                <span className="font-bold not-italic">
                    {Object.entries(invocation.args).map(([key, value]) =>
                        `${key}: ${JSON.stringify(value)}`).join(", ")}
                </span>
            </div>
            {invocation.state !== "result" ? (
                <div className="italic">
                    ...
                </div>
            ) : (
                <div className="italic">
                    Result:{" "}
                    <span className="font-bold not-italic">
                        {JSON.stringify(invocation.result)}
                    </span>
                </div>
            )}
        </div>
    );
}

function MessagePart({ part }: { part: UIMessage["parts"][number] }) {
    if (part.type === "step-start") {
        return;
    }

    const partClass = clsx({
        "msg-part-text": part.type === "text",
        "msg-part-reasoning": part.type === "reasoning",
        "msg-part-tool": part.type === "tool-invocation",
    });

    return (
        <div className={`whitespace-pre-wrap ${partClass}`}>
            {(() => {
                switch (part.type) {
                    case "text":
                        return part.text;
                    case "tool-invocation":
                        return <ToolCall invocation={part.toolInvocation} />;
                    case "reasoning":
                        return `Reasoning: ${part.reasoning}`;
                    default:
                        return JSON.stringify(part);
                }
            })()}
        </div>
    );
}

const Message = forwardRef<HTMLDivElement, { message: UIMessage }>(({ message }, ref) => {
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
            className="flex flex-col gap-4 whitespace-pre-wrap rounded-md border border-gray-200 bg-gray-100 p-3"
            ref={ref}
        >
            <div className={roleClass}>{role}</div>
            {message.parts.length === 1 && message.parts[0]?.type === "step-start" ? (
                <div className="italic">Thinking...</div>
            ) : (
                message.parts.map((part, index) => {
                return (
                    <MessagePart
                        key={`${message.id}-${index}`}
                        part={part}
                    />
                    );
                })
            )}
        </div>
    );
});

function Chat() {
    const { messages, input, handleInputChange, handleSubmit, status, stop } = useChat({
        maxSteps: 10,
    });

    const { containerRef, handleScroll } = useAutoScroll();

    return (
        <div
            id="chatbox"
            className="m-auto flex h-[80vh] min-w-xl max-w-xl flex-col overflow-hidden rounded-md border-2 border-gray-300"
        >
            <h2 className="bg-gray-200 p-3 text-center font-bold text-2xl text-gray-600">
                Chatbot
            </h2>
            <div className="flex min-h-0 flex-1 flex-col">
                <div
                    id="messages"
                    className="min-h-0 flex-1 overflow-y-scroll px-3 pb-4"
                    ref={containerRef}
                    onScroll={handleScroll}
                >
                    <div className="flex flex-col gap-4 pt-2">
                        {messages.map((message, i) => (
                            <Message key={message.id} message={message} />
                        ))}
                    </div>
                </div>
                <form
                    onSubmit={handleSubmit}
                    className="flex flex-row gap-2 p-2"
                >
                    <input
                        value={input}
                        onChange={handleInputChange}
                        placeholder="sup?"
                        className="w-full flex-1 rounded-md border-2 border-gray-300 p-2"
                    />
                    {status === "ready" && (
                        <button
                            type="submit"
                            className="size-12 rounded-md border-2 border-gray-300 p-2"
                        >
                            <FontAwesomeIcon icon={faPaperPlane} />
                        </button>
                    )}
                    {["submitted", "streaming"].includes(status) && (
                        <button
                            type="button"
                            onClick={stop}
                            className="size-12 rounded-md border-2 border-gray-300 p-2"
                        >
                            <FontAwesomeIcon icon={faStop} />
                        </button>
                    )}
                </form>
            </div>
        </div>
    );
}

export default function Home() {
    return (
        <div className="flex h-screen flex-col items-center justify-center">
            <Chat />
        </div>
    );
}
