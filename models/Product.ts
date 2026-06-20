import mongoose, { Schema, type Document } from 'mongoose'

export interface IProduct extends Document {
  name: string
  price: number
  createdAt: Date
  updatedAt: Date
}

const ProductSchema = new Schema<IProduct>(
  {
    name: { type: String, required: true },
    price: { type: Number, required: true },
  },
  { timestamps: true }
)

export default mongoose.models.Product || mongoose.model<IProduct>('Product', ProductSchema)
