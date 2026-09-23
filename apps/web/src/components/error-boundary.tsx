import { Component, type ReactNode } from 'react';
import '@/styles/globals.css';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Home, RefreshCw } from 'lucide-react';

interface Props {
    children: ReactNode;
}
interface State {
    error: Error | null;
}

/** Catches render crashes so a broken subtree shows a recover screen, not a
 * blank window. Recovery is a full reload — cheapest reliable reset. */
export class ErrorBoundary extends Component<Props, State> {
    state: State = { 
        error: null,
    }

    static getDerivedStateFromError(error: Error): Partial<State> {
        return { error };
    }

    componentDidCatch(error: Error) {
        console.error('xTunes crashed:', error);
    }

    render() {
        if (!this.state.error) return this.props.children;

        return (
            <div className="bg-[url('/grid/grid-light.svg')] dark:bg-[url('/grid/grid-dark.svg')] bg-background">
                <div className="mx-auto flex h-screen flex-col items-center justify-center">
                    <div className="w-96 rounded-lg border bg-card p-4 shadow-sm transition hover:shadow-lg sm:p-6">
                        <div className="mb-3 flex flex-col space-y-3 border-b pb-3">
                            <AlertTriangle className="text-destructive" size={22} />
                            <h3 className="text-xl font-medium">Something went wrong.</h3>
                        </div>
                        <div className="mb-1 flex flex-col space-y-2 pb-3">
                            <p className="text-sm text-muted-foreground font-bold">Error:</p>

                            {this.state.error.message && (
                                <textarea
                                    className="mt-3 h-16 w-full resize-none rounded-sm bg-destructive/5 p-2 text-sm/relaxed text-destructive focus:outline-none focus:ring-0"
                                    value={this.state.error.message}
                                    readOnly
                                />
                            )}
                        </div>
                        <div className="mt-4 flex items-center space-x-1">
                            <Button
                                variant={"secondary"}
                                onClick={() => {
                                    window.location.href = "/"
                                }}
                            >
                                <Home />
                                <span>Home</span>
                            </Button>
                            <Button
                                variant={"secondary"}
                                onClick={() => {
                                    window.location.reload();
                                }}
                            >
                                <RefreshCw/>
                                <span>Reload</span>
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }
}
