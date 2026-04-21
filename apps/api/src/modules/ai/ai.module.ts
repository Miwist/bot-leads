import { Module } from "@nestjs/common";
import { TimewebAiService } from "./timeweb-ai.service";

@Module({
  providers: [TimewebAiService],
  exports: [TimewebAiService],
})
export class AiModule {}
