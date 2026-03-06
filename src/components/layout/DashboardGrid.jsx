export default function DashboardGrid({ children }) {
  return (
    <main className="container mx-auto px-4 py-8">
      {/* 
        This is a flexible grid system. Responsive by default.
        1 column on mobile, 2 on medium, 3 or more on large screens depending on content.
      */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {children}
      </div>
    </main>
  );
}
