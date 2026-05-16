import WorkspaceSidebar from "./WorkspaceSidebar";

export default function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-[calc(100vh-3rem)] bg-page">
      <WorkspaceSidebar />
      <div className="min-w-0 flex-1">
        {children}
      </div>
    </div>
  );
}
