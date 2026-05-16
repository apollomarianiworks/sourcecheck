import type { Metadata } from "next";
import CollectionView from "./collection-view";

export const metadata: Metadata = {
  title: "Collection",
  description: "A research collection — saved evidence, notes, and claims for one topic.",
};

interface Props { params: Promise<{ collectionId: string }>; }

export default async function CollectionPage({ params }: Props) {
  const { collectionId } = await params;
  return (
    <main className="max-w-page mx-auto px-4 md:px-6 py-6 md:py-8">
      <CollectionView collectionId={collectionId} />
    </main>
  );
}
