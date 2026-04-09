export default function DashboardGrid({ children }) {
  return (
    <main className="container mx-auto px-4 py-6 md:py-10">
      {/* 
        Flexible grid system: 
        - 1 column on mobile
        - 2 columns on tablet
        - 4 columns on desktop
      */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {children}
      </div>
    </main>
  );
}
