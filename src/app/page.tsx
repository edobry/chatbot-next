import { HydrateClient, api } from "~/trpc/server";
import Chat from "./_components/Chat";

export default async function Home() {
	void api.model.list.prefetch();

	return (
		<HydrateClient>
			<div className="flex h-screen w-screen flex-row">
				<div className="w-1/6">
					<Sidebar />
				</div>
				<div className="flex w-5/6 flex-col">
					<Chat />
				</div>
			</div>
		</HydrateClient>
	);
}
