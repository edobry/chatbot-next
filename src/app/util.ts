import { useLayoutEffect, useRef } from "react";

export function useAutoScroll() {
    const containerRef = useRef<HTMLDivElement>(null);
    const shouldAutoScroll = useRef(true);
    const lastScrollHeight = useRef(0);

    useLayoutEffect(() => {
        const el = containerRef.current;
        if (!el) return;

        // If content grew and user wants auto-scroll, scroll to bottom
        if (el.scrollHeight > lastScrollHeight.current && shouldAutoScroll.current) {
            el.scrollTop = el.scrollHeight;
        }
        
        lastScrollHeight.current = el.scrollHeight;
    });

    const handleScroll = () => {
        const el = containerRef.current;
        if (!el) return;
        
        // User is at bottom if they're within 5px of the end
        shouldAutoScroll.current = el.scrollHeight - el.scrollTop - el.clientHeight < 5;
    };

    return { containerRef, handleScroll };
}
