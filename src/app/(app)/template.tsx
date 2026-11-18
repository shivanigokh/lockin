// Re-mounts on every navigation, so each new screen plays the entrance animation.
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="screen-in">{children}</div>;
}
