export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F5F5F5] px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <a href="/"><span className="text-2xl font-bold text-[#1D9E75]">Launchfast</span><span className="text-2xl font-bold text-[#1A1A1A]">.id</span></a>
        </div>
        {children}
      </div>
    </div>
  )
}