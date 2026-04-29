import { notFound } from "next/navigation";
import PublishingCategoryGallery from "@/components/publishing/PublishingCategoryGallery";
import { getPublishingCategory } from "@/lib/publishingCatalog";

interface PublishingCategoryPageProps {
  params: Promise<{
    category: string;
  }>;
}

export default async function PublishingCategoryPage({ params }: PublishingCategoryPageProps) {
  const { category } = await params;

  if (!getPublishingCategory(category)) {
    notFound();
  }

  return <PublishingCategoryGallery categorySlug={category} />;
}
