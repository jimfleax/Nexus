import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";

const schema = new mongoose.Schema({ name: String });
schema.pre("deleteMany", function () {
  console.log("deleteMany hook triggered! options:", this.getOptions());
});
const Model = mongoose.model("TestModel", schema);

async function run() {
  const mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
  const session = await mongoose.startSession();
  session.startTransaction();

  await Model.deleteMany({ name: "foo" }, { session });

  await session.abortTransaction();
  session.endSession();
  await mongoose.disconnect();
  await mongod.stop();
}
run().catch(console.error);
