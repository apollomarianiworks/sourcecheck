import Scanner from "@/components/Scanner";
import Footer from "@/components/Footer";
import PlatformOverview from "@/components/PlatformOverview";
import WorkspaceLayout from "@/components/workspace/WorkspaceLayout";

export default function HomePage() {
  return (
    <WorkspaceLayout>
      <main className="max-w-page mx-auto px-4 md:px-6 py-4 md:py-6">
        <Scanner />
        <PlatformOverview />
        <Footer />
      </main>
    </WorkspaceLayout>
  );
}
