import { Component, ReactNode } from "react";
import { ErrorState } from "@/components/ErrorState";
import { PageShell } from "@/components/PageShell";

type Props = { children: ReactNode };
type State = { error: Error | null };

/**
 * Catches render-time failures anywhere under the app shell so a thrown
 * error shows the standard error state instead of a blank white screen.
 * Remounts its subtree when the user retries.
 */
export class RouteErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error) {
    // Surfaced to the platform's runtime-error stream.
    console.error("Route render failed:", error);
  }

  private reset = () => this.setState({ error: null });

  render() {
    if (this.state.error) {
      return (
        <PageShell>
          <ErrorState
            title="something broke"
            description="This screen didn't load. Try again — if it keeps happening, restart the app."
            onRetry={this.reset}
          />
        </PageShell>
      );
    }
    return this.props.children;
  }
}
