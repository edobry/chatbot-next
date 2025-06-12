"use client";

import { useChat } from "@ai-sdk/react";
import type { ToolInvocation, UIMessage } from "ai";
import clsx from "clsx";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
    faPaperPlane,
    faPerson,
    faRobot,
    faRotateLeft,
    faSpinner,
    faStop,
    faChevronDown,
    faChevronRight,
    faHourglass,
    } from "@fortawesome/free-solid-svg-icons";
import { useAutoScroll } from "~/app/util";
import { forwardRef, useState } from "react";

import { api } from "~/trpc/react";
import type { Model, ModelDefs } from "../api/chat/models";
import { modelDefs } from "../api/chat/models";

function ToolCall({ invocation }: { invocation: ToolInvocation }) {
    return (
        <div className="flex flex-col gap-2">
            <div className="italic">
                Called tool{" "}
                <span className="not-italic font-bold">
                    {invocation.toolName}
                </span>{" "}
                with{" "}
                <span className="not-italic font-bold">
                    {Object.entries(invocation.args)
                        .map(
                            ([key, value]) => `${key}: ${JSON.stringify(value)}`
                        )
                        .join(", ")}
                </span>
            </div>
            {invocation.state !== "result" ? (
                <div className="italic">...</div>
            ) : (
                <div className="italic">
                    Result:{" "}
                    <span className="not-italic font-bold">
                        {JSON.stringify(invocation.result)}
                    </span>
                </div>
            )}
        </div>
    );
}

type ReasoningUIPart = {
    type: "reasoning";
    /**
     * The reasoning text.
     */
    reasoning: string;
    details: Array<
        | {
              type: "text";
              text: string;
              signature?: string;
          }
        | {
              type: "redacted";
              data: string;
          }
    >;
};
function Reasoning({ details, startExpanded }: Pick<ReasoningUIPart, "details"> & { startExpanded: boolean }) {
    const [reasoningExpanded, setReasoningExpanded] = useState(startExpanded);

    const [userExpanded, setUserExpanded] = useState(false);

    const shouldBeExpanded = userExpanded ? reasoningExpanded : startExpanded;

    return (
        <div className="p-2 italic bg-gray-200 border-2 border-gray-300 rounded-md">
            {/* biome-ignore lint/a11y/useKeyWithClickEvents: <explanation> */}
            <div
                className="flex flex-row items-center w-full gap-2 mb-2 text-sm font-bold cursor-pointer"
                onClick={() => {
                    setReasoningExpanded(!reasoningExpanded);
                    setUserExpanded(true);
                }}
            >
                Reasoning
                {shouldBeExpanded ? (
                    <FontAwesomeIcon icon={faChevronDown} />
                ) : (
                    <FontAwesomeIcon icon={faChevronRight} />
                )}
            </div>
            {shouldBeExpanded && (
                <div className="p-2">
                    {details
                        .map((detail) =>
                            detail.type === "text" ? detail.text : detail.data
                        )
                        .join("\n")}
                </div>
            )}
        </div>
    );
}

function MessagePart({ part, numParts }: { part: UIMessage["parts"][number], numParts: number }) {
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
                        return <Reasoning startExpanded={numParts <= 2} details={part.details} />;
                    default:
                        return JSON.stringify(part);
                }
            })()}
        </div>
    );
}

const Message = forwardRef<
    HTMLDivElement,
    { message: UIMessage; reload: () => void }
>(({ message, reload }, ref) => {
    const isUser = message.role === "user";

    const roleClass = clsx(
        {
            "msg-role-user": isUser,
            "msg-role-ai": !isUser,
        },
        "font-bold text-gray-600 text-sm"
    );

    const annotations = (message.annotations || []).filter(x => x).reduce<Record<string, string>>((acc, annotation) => {
        if(!annotation) {
            return acc;
        }
        const x =  {
            ...(acc),
            ...(annotation as Record<string, string>)
        } as Record<string, string>;
        return x;
    }, {});

    const model = annotations.model;

    return (
        <div>
            <div
                key={message.id}
                className="flex flex-col gap-4 p-3 whitespace-pre-wrap bg-gray-100 border border-gray-200 rounded-md"
                ref={ref}
            >
                <div className={roleClass}>
                    {isUser ? (
                        <>
                            <FontAwesomeIcon icon={faPerson} /> You
                        </>
                    ) : (
                        <>
                            <FontAwesomeIcon icon={faRobot} /> AI{" "}
                            {model && (
                                <div className="float-right rounded-md border-1 border-gray-300 bg-gray-200 p-[5px] text-gray-500 text-xs">
                                    {message.parts.some(
                                        (part) => part.type === "reasoning"
                                    ) && "🧠 "}
                                    {model}
                                </div>
                            )}
                        </>
                    )}
                </div>
                {message.parts.length === 0 ||
                (message.parts.length === 1 &&
                    message.parts[0]?.type === "step-start") ? (
                    <div className="flex flex-row items-center gap-3 italic">
                        Thinking...
                        <FontAwesomeIcon icon={faSpinner} spin />
                    </div>
                ) : (
                    message.parts.map((part, index) => {
                        return (
                            <MessagePart
                                key={`${message.id}-${index}`}
                                part={part}
                                numParts={message.parts.length}
                            />
                        );
                    })
                )}
            </div>
            <div className="flex flex-row justify-end gap-2 pt-2 pr-1">
                {!isUser && (
                    <button
                        type="button"
                        onClick={() => reload()}
                        className="text-gray-400 hover:text-gray-700"
                    >
                        <FontAwesomeIcon icon={faRotateLeft} />
                    </button>
                )}
            </div>
        </div>
    );
});

export default function Chat() {
    const [models] = api.model.list.useSuspenseQuery();

    if (Object.keys(models).length === 0) {
        return <div>No models found</div>;
    }

    const [model, setModel] = useState<Model>("openai:default");

    const {
        messages,
        input,
        handleInputChange,
        handleSubmit,
        status,
        stop,
        reload,
    } = useChat({
        maxSteps: 10,
        sendExtraMessageFields: true,
        body: {
            model,
        },
    });

    const { containerRef, handleScroll } = useAutoScroll();

    return (
        <div
            id="chatbox"
            className="m-auto flex h-[80vh] min-w-xl max-w-xl flex-col overflow-hidden rounded-md border-2 border-gray-300"
        >
            <h2 className="p-3 text-2xl font-bold text-center text-gray-600 bg-gray-200">
                Chatbot
            </h2>
            <div className="flex flex-col flex-1 min-h-0">
                <div
                    id="messages"
                    className="flex-1 min-h-0 px-3 pb-4 overflow-y-scroll"
                    ref={containerRef}
                    onScroll={handleScroll}
                >
                    <div className="flex flex-col gap-4 pt-2">
                        {messages.map((message) => (
                            <Message
                                key={message.id}
                                message={message}
                                reload={reload}
                            />
                        ))}
                        {status === "submitted" && (
                            <div className="flex flex-row justify-center gap-2 pt-2 pr-1">
                                <FontAwesomeIcon icon={faSpinner} spin />
                            </div>
                        )}
                    </div>
                </div>
                <ChatInput
                    model={model}
                    setModel={setModel}
                    models={models}
                    input={input}
                    handleInputChange={handleInputChange}
                    handleSubmit={handleSubmit}
                    status={status}
                    stop={stop}
                />
            </div>
        </div>
    );
}

function ChatInput({
    models,
    model,
    setModel,
    input,
    handleInputChange,
    handleSubmit,
    status,
    stop,
}: {
    models: ModelDefs;
    model: Model;
    setModel: (model: Model) => void;
    input: string;
    handleInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    handleSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
    status: string;
    stop: () => void;
}) {
    return (
        <form onSubmit={handleSubmit} className="flex flex-col gap-2 p-2">
            <input
                value={input}
                onChange={handleInputChange}
                placeholder="sup?"
                className="flex-1 w-full p-2 border-2 border-gray-300 rounded-md"
            />
            <div className="flex flex-row items-end justify-end gap-2">
                <select
                    className="h-full p-2 border-2 border-gray-300 rounded-md"
                    value={model}
                    onChange={(e) => setModel(e.target.value as Model)}
                >
                    {Object.entries(models).map(([provider, modelMap]) => (
                        <optgroup key={provider} label={provider}>
                            {Object.entries(modelMap).map(([modelClass, name]) => {
                                const providerDef = modelDefs[provider as keyof typeof modelDefs];
                                const modelDef = providerDef?.models[modelClass as keyof typeof providerDef.models];
                                const hasReasoning = modelDef?.reasoning;
                                return (
                                    <option key={modelClass} value={`${provider}:${modelClass}`}>
                                        {provider}: {modelClass}{hasReasoning && " 🧠"}
                                    </option>
                                );
                            })}
                        </optgroup>
                    ))}
                </select>
                {status === "ready" ? (
                    <button
                        type="submit"
                        className="p-2 border-2 border-gray-300 rounded-md size-12"
                    >
                        <FontAwesomeIcon icon={faPaperPlane} />
                    </button>
                ) : (["submitted", "streaming"].includes(status) ? (
                    <button
                        type="button"
                        onClick={stop}
                        className="p-2 border-2 border-gray-300 rounded-md size-12"
                    >
                        <FontAwesomeIcon icon={faStop} />
                    </button>
                ) : (
                    <button
                        type="button"
                        className="p-2 border-2 border-gray-300 rounded-md size-12"
                    >
                        <FontAwesomeIcon icon={faHourglass} spin />
                    </button>
                ))}
            </div>
        </form>
    );
}
