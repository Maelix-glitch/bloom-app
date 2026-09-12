import React from "react";

export class StoryErrorBoundary extends React.Component<{ children: React.ReactNode; fallback?: React.ReactNode }, { hasError: boolean; error: any }> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }
  componentDidCatch(error: any, info: any) {
    console.error("Story crash:", error, info);
  }
  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback ?? (
          <div className="fixed inset-0 z-[100] grid place-items-center bg-black p-6 text-center">
            <div className="max-w-[320px] rounded-2xl bg-[#1c1c1e] border border-[#2c2c2e] p-6">
              <p className="text-[16px] font-semibold text-white">Something went wrong</p>
              <p className="mt-2 text-[13px] text-[#a8a8a8]">Tap to go back</p>
              <button
                type="button"
                onClick={() => this.setState({ hasError: false, error: null })}
                className="mt-4 w-full rounded-full bg-white py-2.5 text-[14px] font-semibold text-black"
              >
                Try again
              </button>
            </div>
          </div>
        )
      );
    }
    return this.props.children;
  }
}
