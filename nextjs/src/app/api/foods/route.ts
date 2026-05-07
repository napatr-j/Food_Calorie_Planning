import { NextRequest, NextResponse } from 'next/server'
import { getAllFoods } from '@/lib/db'
import { imageUrl } from '@/lib/utils'

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const search = searchParams.get('search') ?? ''
  const sortBy = searchParams.get('sort_by') ?? 'name'
  const foods = await getAllFoods(sortBy, search)
  return NextResponse.json(foods.map(f => ({ ...f, image_url: imageUrl(f.image_path) })))
}
