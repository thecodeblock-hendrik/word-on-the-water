/** The one centred column of the video pages, at most 640px wide. */
export function VideoColumn({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto grid max-w-[672px] gap-4 py-6 pl-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))] md:py-12">
      {children}
    </div>
  );
}
