import mongoose from "mongoose";
/**
 * Function to connect the mongoDB database
 */
const connectDB = async () => {
  try {
    // connect to the DB using the connection string
    const connect = await mongoose.connect(process.env.DB_STRING);
    console.log(
      "DB connected",
      connect.connection.host,
      connect.connection.name
    );
  } catch (err) {
    console.log(err);
    process.exit(1);
  }
};

export default connectDB;
