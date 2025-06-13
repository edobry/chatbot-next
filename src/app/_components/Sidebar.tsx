import type { UIMessage } from "ai";

const ChatItem = ({ chat }: { chat: Chat }) => {
	return (
		<div className="cursor-pointer rounded-md bg-gray-200 p-5 hover:bg-gray-300">
			{chat.name}
		</div>
	);
};

type Chat = {
	id: string;
	name: string;
	messages: UIMessage[];
};

const chats = [
	{
		id: "1",
		name: "Chat1",
		messages: [],
	},
	{
		id: "2",
		name: "Chat2",
		messages: [],
	},
	{
		id: "3",
		name: "Chat3",
		messages: [],
	},
];

export default function Sidebar() {
	return (
		<div className="flex h-full w-full flex-col gap-10 border-gray-300 border-r-2 bg-gray-100 p-5">
			<h2 className="text-center font-bold text-2xl text-gray-600">Chats</h2>
			<div className="flex flex-col gap-3 text-center">
				{chats.map((chat) => (
					<ChatItem key={chat.id} chat={chat} />
				))}
			</div>
		</div>
	);
}
