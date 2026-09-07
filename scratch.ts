import Fastify from "fastify";
import {
  serializerCompiler,
  validatorCompiler,
  ZodTypeProvider,
} from "fastify-type-provider-zod";
import { z } from "zod";
import { safeArrayResponse } from "@nexus/shared";

async function main() {
  const fastify = Fastify({
    logger: false,
  }).withTypeProvider<ZodTypeProvider>();
  fastify.setValidatorCompiler(validatorCompiler);
  fastify.setSerializerCompiler(serializerCompiler);

  const ProjectSchema = z.object({
    id: z.string(),
    name: z.string(),
  });

  fastify.get(
    "/",
    {
      schema: {
        response: {
          200: z.array(ProjectSchema),
        },
      },
    },
    async () => {
      const raw = [
        { id: "1", name: "test" },
        { id: 2, name: "bad" },
      ];
      return safeArrayResponse(ProjectSchema).parse(raw);
    },
  );

  await fastify.ready();
  const res = await fastify.inject({ method: "GET", url: "/" });
  console.log(res.statusCode, res.json());
}
main().catch(console.error);
