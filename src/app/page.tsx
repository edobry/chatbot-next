import { HydrateClient, api } from "~/trpc/server";
import Chat from "./_components/Chat";

export default async function Home() {
    void api.model.list.prefetch();
    
    return (
        <HydrateClient>
            <div className="flex h-screen flex-col items-center justify-center">
                <Chat />
            </div>
        </HydrateClient>
    );
}
