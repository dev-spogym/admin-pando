import { Suspense } from "react";
import { notFound } from "next/navigation";
import PublishingCategoryGallery from "@/components/publishing/PublishingCategoryGallery";
import { getPublishingCategory } from "@/lib/publishingCatalog";

interface ClientPreviewCategoryPageProps {
  params: Promise<{
    category: string;
  }>;
}

export default async function ClientPreviewCategoryPage({ params }: ClientPreviewCategoryPageProps) {
  const { category } = await params;

  if (!getPublishingCategory(category)) {
    notFound();
  }

  return (
    <Suspense>
      <PublishingCategoryGallery categorySlug={category} basePath="/client-preview" publicView />
    </Suspense>
  );
}
