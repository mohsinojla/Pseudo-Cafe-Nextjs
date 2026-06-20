// scripts/seed.js
import "dotenv/config.js";  // <-- loads .env.local automatically
import { connectDB } from "../lib/mongodb.js";
import Product from "../models/Product.js";

const seedProducts = async () => {
  await connectDB();
  await Product.deleteMany();

  await Product.insertMany([
    { name: "Pepperoni Pizza", price: 12 },
    { name: "Veggie Delight", price: 10 },
    { name: "BBQ Chicken", price: 14 },
  ]);

  console.log("✅ Data seeded");
  process.exit();
};

seedProducts();
