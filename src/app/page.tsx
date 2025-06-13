import { HydrateClient, api } from "~/trpc/server";
import Chat from "./_components/Chat";
import Sidebar from "./_components/Sidebar";

export default async function Home() {
	void api.model.list.prefetch();

	return (
		<HydrateClient>
			<div className="flex flex-row w-screen h-screen overflow-hidden">
				<div className="w-1/6">
					<Sidebar />
				</div>
				<div className="flex w-5/6 h-full flex-col">
					<Chat />
				</div>
			</div>
		</HydrateClient>
	);
}
