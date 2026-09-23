import {
    useEffect,
    useRef,
    type DependencyList,
    type RefObject,
} from 'react';

interface UseAutoScrollOptions {
    bottomRef: RefObject<HTMLElement | null>;
    dependencies: DependencyList;
    threshold?: number;
}

type ScrollParent = HTMLElement | Window;

function isHTMLElement(
    value: ScrollParent
): value is HTMLElement {
    return value instanceof HTMLElement;
}

function getScrollParent(element: HTMLElement): ScrollParent {

    let parent = element.parentElement;

    while (parent) {

        const styles = window.getComputedStyle(parent);

        const overflowY = styles.overflowY;

        const isScrollable =
            overflowY === 'auto' ||
            overflowY === 'scroll' ||
            overflowY === 'overlay';

        if (
            isScrollable &&
            parent.scrollHeight > parent.clientHeight
        ) {
            return parent;
        }

        parent = parent.parentElement;
    }

    return window;
}

function getDistanceFromBottom(
    scrollParent: ScrollParent
): number {
    if (!isHTMLElement(scrollParent)) {
        const documentHeight = Math.max(
            document.documentElement.scrollHeight,
            document.body?.scrollHeight ?? 0
        );

        return (
            documentHeight -
            window.scrollY -
            window.innerHeight
        );
    }

    return (
        scrollParent.scrollHeight -
        scrollParent.scrollTop -
        scrollParent.clientHeight
    );
}

export function useAutoScroll({
    bottomRef,
    dependencies,
    threshold = 150,
}: UseAutoScrollOptions) {

    const isAtBottomRef = useRef(true);

    const scrollParentRef = useRef<ScrollParent | null>(null);

    /**
     * Detect which element actually controls the scroll.
     * It can be:
     *
     * - an internal scroll container
     * - the document/window
     */
    useEffect(() => {

        const bottomElement = bottomRef.current;

        if (!bottomElement) {
            return;
        }

        const scrollParent = getScrollParent(bottomElement);

        scrollParentRef.current = scrollParent;

        const handleScroll = () => {

            const distanceFromBottom =
                getDistanceFromBottom(scrollParent);

            isAtBottomRef.current =
                distanceFromBottom <= threshold;
        };

        handleScroll();

        if (scrollParent === window) {

            window.addEventListener(
                'scroll',
                handleScroll,
                { passive: true }
            );

            return () => {

                window.removeEventListener(
                    'scroll',
                    handleScroll
                );

            };

        }

        scrollParent.addEventListener(
            'scroll',
            handleScroll,
            { passive: true }
        );

        return () => {

            scrollParent.removeEventListener(
                'scroll',
                handleScroll
            );

        };

    }, [bottomRef, threshold]);

    /**
     * When messages change, follow the bottom only if
     * the user was already near the bottom.
     */
    useEffect(() => {

        const bottomElement = bottomRef.current;

        if (
            !bottomElement ||
            !isAtBottomRef.current
        ) {
            return;
        }

        requestAnimationFrame(() => {

            const scrollParent =
                scrollParentRef.current;

            /**
             * No inner scroll container:
             * scroll the document to the sentinel.
             */
            if (
                !scrollParent ||
                !isHTMLElement(scrollParent)
            ) {

                bottomElement.scrollIntoView({
                    behavior: 'auto',
                    block: 'end',
                    inline: 'nearest',
                });

                return;
            }

            /**
             * Inner scroll container.
             */
            scrollParent.scrollTo({
                top: scrollParent.scrollHeight,
                behavior: 'auto',
            });

        });

    }, [bottomRef, dependencies]);

}