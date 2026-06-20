import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import Product from '@/models/Product'
import { z } from 'zod'

const createProductSchema = z.object({
  name: z.string().min(1).max(200),
  price: z.number().positive(),
})

export async function GET() {
  try {
    await connectDB()
    const products = await Product.find({})
    return NextResponse.json(products)
  } catch {
    return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    await connectDB()
    const body = await request.json()
    const parsed = createProductSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
    }
    const product = await Product.create(parsed.data)
    return NextResponse.json(product, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Failed to add product' }, { status: 500 })
  }
}
