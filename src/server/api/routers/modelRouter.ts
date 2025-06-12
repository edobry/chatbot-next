import { createTRPCRouter, publicProcedure } from "../trpc";
import { providers } from "~/app/api/chat/route";

export const modelRouter = createTRPCRouter({
    list: publicProcedure.query(async ({ ctx }) => {
        return providers;
    }),
});
