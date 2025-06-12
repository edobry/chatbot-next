import { createTRPCRouter, publicProcedure } from "../trpc";
import { generateProviders } from "~/app/api/chat/models";

export const modelRouter = createTRPCRouter({
    list: publicProcedure.query(async ({ ctx }) => {
        return generateProviders();
    }),
});
