import { connectDB } from "@/lib/mongodb";
import Product from "@/models/Product";

// GET all products
export async function GET() {
  try {
    await connectDB();
    const products = await Product.find({});
    return Response.json(products);
  } catch (error) {
    return Response.json({ error: "Failed to fetch products" }, { status: 500 });
  }
}

// POST new product
export async function POST(req) {
  try {
    await connectDB();
    const { name, price } = await req.json();
    const newProduct = await Product.create({ name, price });
    return Response.json(newProduct);
  } catch (error) {
    return Response.json({ error: "Failed to add product" }, { status: 500 });
  }
}
