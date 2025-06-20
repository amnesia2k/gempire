import { createId } from "@paralleldrive/cuid2";
import { db } from "../db";
import { products } from "../db/product-schema";
import cloudinary from "../utils/cloudinary";
import { productImages } from "../db/product-images-schema";
import { category } from "../db/category-schema";
import { eq } from "drizzle-orm";
import { slugify } from "../utils/slugify";

type Input = {
  name: string;
  description?: string;
  price: number;
  unit: number;
  categoryId: string;
  files: Express.Multer.File[];
};

export const createProductWithImages = async ({
  name,
  description,
  price,
  unit,
  categoryId,
  files,
}: Input) => {
  if (
    !name ||
    !description ||
    !price ||
    !unit ||
    !files?.length ||
    !categoryId
  ) {
    throw new Error("All fields and at least one image are required.");
  }

  const [existingCategory] = await db
    .select()
    .from(category)
    .where(eq(category._id, categoryId));

  if (!existingCategory) {
    throw new Error("Invalid categoryId: Category not found");
  }

  const [newProduct] = await db
    .insert(products)
    .values({
      _id: createId(),
      name,
      slug: slugify(name),
      description,
      price: price.toString(),
      unit,
      categoryId,
    })
    .returning();

  const uploadedUrls: string[] = [];

  for (const file of files) {
    const url = await new Promise<string>((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: "products",
          width: 600,
          height: 600,
        },
        (err, result) => {
          if (err || !result) return reject(err);
          resolve(result.secure_url);
        }
      );

      uploadStream.end(file.buffer);
    });

    uploadedUrls.push(url);
  }

  const imageRows = await db
    .insert(productImages)
    .values(
      uploadedUrls.map((url) => ({
        _id: createId(),
        productId: newProduct._id,
        imageUrl: url,
      }))
    )
    .returning();

  return {
    product: newProduct,
    images: imageRows,
  };
};
